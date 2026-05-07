"""
AI Prediction Service for Bullseye.

Loads trained models and generates predictions with explainability.
Supports auto-training for unseen symbols on first request.
"""

import os
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
import joblib
from datetime import datetime

from app.services.ml.models.xgboost_model import XGBoostPredictor
from app.services.ml.models.lstm_model import LSTMPredictor
from app.services.ml.feature_engineering import PriceActionFeatures, TechnicalSignals
from app.services.market_providers.upstox import UpstoxProvider
from app.services.symbol_resolver import get_instrument_key
from app.services.indicators import sma, ema, rsi, macd

MODEL_DIR = 'app/services/ml/trained_models'
INFERENCE_DAYS = 120   # Daily candles fetched for inference (≥ sequence_length + feature warmup)
TRAIN_DAYS    = 200   # Daily candles used when auto-training


class PredictionService:
    """
    Real-time prediction service with auto-training support.
    """

    def __init__(self, model_dir: str = MODEL_DIR):
        self.model_dir = model_dir
        self.models_cache: Dict = {}
        self.scalers_cache: Dict = {}

    # ──────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────

    def _model_exists(self, symbol: str, model_type: str) -> bool:
        if model_type == 'xgboost':
            path = f"{self.model_dir}/xgboost_{symbol}.json"
        else:
            path = f"{self.model_dir}/lstm_{symbol}.keras"
        scaler = f"{self.model_dir}/scaler_{symbol}.pkl"
        return os.path.exists(path) and os.path.exists(scaler)

    def _load_model(self, symbol: str, model_type: str = 'xgboost'):
        cache_key = f"{symbol}_{model_type}"
        if cache_key in self.models_cache:
            return self.models_cache[cache_key]

        if model_type == 'xgboost':
            model_path = f"{self.model_dir}/xgboost_{symbol}.json"
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"No XGBoost model for {symbol}.")
            model = XGBoostPredictor()
            model.load_model(model_path)
        elif model_type == 'lstm':
            model_path = f"{self.model_dir}/lstm_{symbol}.keras"
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"No LSTM model for {symbol}.")
            model = LSTMPredictor()
            model.load_model(model_path)
        else:
            raise ValueError(f"Unknown model type: {model_type}")

        self.models_cache[cache_key] = model
        return model

    def _load_scaler(self, symbol: str):
        if symbol in self.scalers_cache:
            return self.scalers_cache[symbol]
        scaler_path = f"{self.model_dir}/scaler_{symbol}.pkl"
        if not os.path.exists(scaler_path):
            raise FileNotFoundError(f"No scaler for {symbol}.")
        scaler = joblib.load(scaler_path)
        self.scalers_cache[symbol] = scaler
        return scaler

    # ──────────────────────────────────────────────
    # Auto-training
    # ──────────────────────────────────────────────

    async def _auto_train(self, symbol: str) -> None:
        """Train XGBoost + LSTM for a symbol on-demand."""
        from app.services.ml.train_pipeline import train_models_for_symbol
        from app.services.instrument_registry import load_instruments

        print(f"🔧 Auto-training models for {symbol} (this may take ~30s)…")
        load_instruments()
        await train_models_for_symbol(symbol, days=TRAIN_DAYS, save_dir=self.model_dir)

        # Invalidate stale cache entries for this symbol
        for mtype in ('xgboost', 'lstm'):
            self.models_cache.pop(f"{symbol}_{mtype}", None)
        self.scalers_cache.pop(symbol, None)
        print(f"✅ Auto-training complete for {symbol}")

    # ──────────────────────────────────────────────
    # Data fetching — DAILY candles (same as training)
    # ──────────────────────────────────────────────

    async def _fetch_recent_data(self, symbol: str, periods: int = INFERENCE_DAYS) -> pd.DataFrame:
        """
        Fetch recent DAILY candles and compute indicators.
        Using daily resolution ensures we always have enough rows for sequences.
        """
        instrument_key = get_instrument_key(symbol)

        upstox = UpstoxProvider()
        raw_candles = await upstox.fetch_candles(
            instrument_key=instrument_key,
            resolution='D',        # ← Daily, same as training
            limit=periods,
        )

        if not raw_candles:
            raise ValueError(f"No market data available for {symbol}.")

        df = pd.DataFrame(raw_candles)
        df['time'] = pd.to_datetime(df['time'], unit='ms')
        df = df.set_index('time').sort_index()

        closes = df['close'].tolist()
        df['rsi']           = rsi(closes, period=14)
        df['sma']           = sma(closes, period=14)
        df['ema_9']         = ema(closes, period=9)
        df['ema_21']        = ema(closes, period=21)
        macd_line, macd_sig, macd_hist = macd(closes)
        df['macd']          = macd_line
        df['macd_signal']   = macd_sig
        df['macd_histogram']= macd_hist

        return df

    # ──────────────────────────────────────────────
    # Feature preparation
    # ──────────────────────────────────────────────

    def _prepare_features(self, df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
        df = PriceActionFeatures.add_all_features(df)
        df = TechnicalSignals.add_all_signals(df)
        df = df.replace([np.inf, -np.inf], np.nan).dropna()

        exclude_cols = ['open', 'high', 'low', 'close', 'volume']
        feature_cols = [c for c in df.columns if c not in exclude_cols]

        # Use the last row (most recent market state)
        X = df[feature_cols].iloc[-1:].values
        return X, feature_cols

    # ──────────────────────────────────────────────
    # Signal generation (explainability)
    # ──────────────────────────────────────────────

    def _generate_signals(self, df: pd.DataFrame, prediction: int) -> List[str]:
        signals = []
        latest = df.iloc[-1]

        rsi_val = latest.get('rsi')
        if rsi_val is not None:
            if rsi_val < 30:
                signals.append(f"RSI oversold ({rsi_val:.1f}) — Bullish signal")
            elif rsi_val > 70:
                signals.append(f"RSI overbought ({rsi_val:.1f}) — Bearish signal")
            else:
                signals.append(f"RSI neutral ({rsi_val:.1f})")

        ema_9 = latest.get('ema_9')
        ema_21 = latest.get('ema_21')
        if ema_9 is not None and ema_21 is not None:
            if ema_9 > ema_21:
                signals.append("EMA bullish crossover (9 > 21)")
            else:
                signals.append("EMA bearish crossover (9 < 21)")

        macd_val = latest.get('macd')
        macd_sig = latest.get('macd_signal')
        if macd_val is not None and macd_sig is not None:
            signals.append("MACD bullish (above signal)" if macd_val > macd_sig
                           else "MACD bearish (below signal)")

        if latest.get('volume_spike') == 1:
            signals.append("Unusual volume spike detected")

        trend = latest.get('trend_strength')
        if trend is not None and abs(trend) > 2:
            direction = "uptrend" if trend > 0 else "downtrend"
            signals.append(f"Strong {direction} ({trend:.1f}%)")

        return signals

    # ──────────────────────────────────────────────
    # Main prediction entry point
    # ──────────────────────────────────────────────

    async def predict(self, symbol: str, model_type: str = 'xgboost') -> Dict:
        """
        Generate a prediction for any NSE symbol.
        Auto-trains the model if it hasn't been trained yet.
        """
        os.makedirs(self.model_dir, exist_ok=True)

        # ── Auto-train if models are missing ──────────────────
        if not self._model_exists(symbol, model_type):
            await self._auto_train(symbol)

        # ── Load model + scaler ───────────────────────────────
        model  = self._load_model(symbol, model_type)
        scaler = self._load_scaler(symbol)

        # ── Fetch data & build features ───────────────────────
        df = await self._fetch_recent_data(symbol)
        X, feature_names = self._prepare_features(df)

        # ── Scale ──────────────────────────────────────────────
        X_scaled = scaler.transform(X)

        # ── Predict ────────────────────────────────────────────
        prediction = int(model.predict(X_scaled)[0])   # -1, 0, or 1
        confidence = float(model.get_confidence(X_scaled)[0])

        prediction_label = {-1: 'DOWN', 0: 'SIDEWAYS', 1: 'UP'}[prediction]

        # ── Expected move ──────────────────────────────────────
        df_feat = PriceActionFeatures.add_all_features(
            df.replace([np.inf, -np.inf], np.nan).dropna()
        )
        volatility = float(df_feat['volatility'].iloc[-1]) if 'volatility' in df_feat.columns else 1.0
        expected_move = volatility * prediction
        expected_move_str = f"{expected_move:+.2f}%" if prediction != 0 else "~0%"

        signals = self._generate_signals(df, prediction)
        current_price = float(df['close'].iloc[-1])

        return {
            'symbol':         symbol.upper(),
            'prediction':     prediction_label,
            'confidence':     round(confidence, 2),
            'expected_move':  expected_move_str,
            'current_price':  round(current_price, 2),
            'signals':        signals,
            'model_used':     model_type,
            'timestamp':      datetime.now().isoformat(),
            'model_version':  '1.0',
        }


# ── Singleton ──────────────────────────────────────────────────────────────────
_prediction_service: PredictionService | None = None


def get_prediction_service() -> PredictionService:
    global _prediction_service
    if _prediction_service is None:
        _prediction_service = PredictionService()
    return _prediction_service