"""
AI Prediction Service for Bullseye.

Loads trained models and generates predictions with explainability.
"""

import os
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
import joblib
from datetime import datetime

from app.services.ml.models.xgboost_model import XGBoostPredictor
from app.services.ml.models.lstm_model import LSTMPredictor
from app.services.ml.dataset_builder import MLDatasetBuilder
from app.services.ml.feature_engineering import PriceActionFeatures, TechnicalSignals
from app.services.market_providers.upstox import UpstoxProvider
from app.services.symbol_resolver import get_instrument_key
from app.services.indicators import sma, ema, rsi, macd


class PredictionService:
    """
    Real-time prediction service.
    
    Portfolio Note: This is production-ready ML inference pipeline
    with model loading, caching, and explainability.
    """
    
    def __init__(self, model_dir: str = 'app/services/ml/trained_models'):
        self.model_dir = model_dir
        self.models_cache = {}  # Cache loaded models
        self.scalers_cache = {}  # Cache scalers
        
    def _load_model(self, symbol: str, model_type: str = 'xgboost'):
        """
        Load trained model from disk (with caching).
        
        Args:
            symbol: Stock symbol
            model_type: 'xgboost' or 'lstm'
        
        Returns:
            Loaded model
        """
        cache_key = f"{symbol}_{model_type}"
        
        # Check cache
        if cache_key in self.models_cache:
            return self.models_cache[cache_key]
        
        # Load from disk
        if model_type == 'xgboost':
            model_path = f"{self.model_dir}/xgboost_{symbol}.json"
            if not os.path.exists(model_path):
                raise FileNotFoundError(
                    f"Model not found: {model_path}. "
                    f"Train the model first using: python -m app.services.ml.train_pipeline"
                )
            
            model = XGBoostPredictor()
            model.load_model(model_path)
            
        elif model_type == 'lstm':
            model_path = f"{self.model_dir}/lstm_{symbol}.keras"
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model not found: {model_path}")
            
            model = LSTMPredictor()
            model.load_model(model_path)
        
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        # Cache it
        self.models_cache[cache_key] = model
        
        return model
    
    def _load_scaler(self, symbol: str):
        """Load scaler from disk (with caching)"""
        if symbol in self.scalers_cache:
            return self.scalers_cache[symbol]
        
        scaler_path = f"{self.model_dir}/scaler_{symbol}.pkl"
        if not os.path.exists(scaler_path):
            raise FileNotFoundError(f"Scaler not found: {scaler_path}")
        
        scaler = joblib.load(scaler_path)
        self.scalers_cache[symbol] = scaler
        
        return scaler
    
    async def _fetch_recent_data(self, symbol: str, periods: int = 100) -> pd.DataFrame:
        """
        Fetch recent candles and compute indicators.
        
        Args:
            symbol: Stock symbol
            periods: Number of candles to fetch
        
        Returns:
            DataFrame with OHLCV + indicators
        """
        # Get instrument key
        instrument_key = get_instrument_key(symbol)
        
        # Fetch candles
        upstox = UpstoxProvider()
        raw_candles = await upstox.fetch_candles(
            instrument_key=instrument_key,
            resolution='5',
            limit=periods
        )
        
        if not raw_candles:
            raise ValueError(f"No data available for {symbol}")
        
        # Convert to DataFrame
        df = pd.DataFrame(raw_candles)
        df['time'] = pd.to_datetime(df['time'], unit='ms')
        df = df.set_index('time').sort_index()
        
        # Add indicators
        closes = df['close'].tolist()
        
        df['rsi'] = rsi(closes, period=14)
        df['sma'] = sma(closes, period=14)
        df['ema_9'] = ema(closes, period=9)
        df['ema_21'] = ema(closes, period=21)
        
        macd_line, macd_signal, macd_hist = macd(closes)
        df['macd'] = macd_line
        df['macd_signal'] = macd_signal
        df['macd_histogram'] = macd_hist
        
        return df
    
    def _prepare_features(self, df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
        """
        Prepare features for prediction (same pipeline as training).
        
        Args:
            df: DataFrame with OHLCV + indicators
        
        Returns:
            (features_array, feature_names)
        """
        # Add price action features
        df = PriceActionFeatures.add_all_features(df)
        
        # Add technical signals
        df = TechnicalSignals.add_all_signals(df)
        
        # Drop NaN rows
        df = df.replace([np.inf, -np.inf], np.nan).dropna()
        
        # Select features (same as training)
        exclude_cols = ['open', 'high', 'low', 'close', 'volume']
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        
        # Get last row (most recent data)
        X = df[feature_cols].iloc[-1:].values
        
        return X, feature_cols
    
    def _generate_signals(self, df: pd.DataFrame, prediction: int) -> List[str]:
        """
        Generate human-readable trading signals.
        
        This is the EXPLAINABILITY part - WHY did the model predict this?
        
        Args:
            df: DataFrame with indicators
            prediction: Model prediction (-1, 0, 1)
        
        Returns:
            List of signal strings
        """
        signals = []
        
        # Get latest values
        latest = df.iloc[-1]
        
        # RSI signals
        rsi_val = latest.get('rsi')
        if rsi_val is not None:
            if rsi_val < 30:
                signals.append(f"RSI oversold ({rsi_val:.1f}) - Bullish signal")
            elif rsi_val > 70:
                signals.append(f"RSI overbought ({rsi_val:.1f}) - Bearish signal")
            else:
                signals.append(f"RSI neutral ({rsi_val:.1f})")
        
        # EMA crossover
        ema_9 = latest.get('ema_9')
        ema_21 = latest.get('ema_21')
        if ema_9 is not None and ema_21 is not None:
            if ema_9 > ema_21:
                signals.append("EMA bullish crossover (9 > 21)")
            else:
                signals.append("EMA bearish crossover (9 < 21)")
        
        # MACD
        macd_val = latest.get('macd')
        macd_sig = latest.get('macd_signal')
        if macd_val is not None and macd_sig is not None:
            if macd_val > macd_sig:
                signals.append("MACD bullish (above signal)")
            else:
                signals.append("MACD bearish (below signal)")
        
        # Volume
        volume_spike = latest.get('volume_spike')
        if volume_spike == 1:
            signals.append("Unusual volume spike detected")
        
        # Trend strength
        trend_strength = latest.get('trend_strength')
        if trend_strength is not None:
            if abs(trend_strength) > 2:
                direction = "uptrend" if trend_strength > 0 else "downtrend"
                signals.append(f"Strong {direction} ({trend_strength:.1f}%)")
        
        return signals
    
    async def predict(
        self, 
        symbol: str, 
        model_type: str = 'xgboost'
    ) -> Dict:
        """
        Generate prediction for a symbol.
        
        Args:
            symbol: Stock symbol (e.g., 'RELIANCE')
            model_type: 'xgboost' or 'lstm'
        
        Returns:
            Prediction dict with all details
        """
        # Load model and scaler
        model = self._load_model(symbol, model_type)
        scaler = self._load_scaler(symbol)
        
        # Fetch recent data
        df = await self._fetch_recent_data(symbol, periods=100)
        
        # Prepare features
        X, feature_names = self._prepare_features(df)
        
        # Scale features
        X_scaled = scaler.transform(X)
        
        # Get prediction
        prediction = model.predict(X_scaled)[0]  # -1, 0, or 1
        confidence = model.get_confidence(X_scaled)[0]  # 0-100
        
        # Map prediction to label
        prediction_map = {
            -1: 'DOWN',
            0: 'SIDEWAYS',
            1: 'UP'
        }
        prediction_label = prediction_map[prediction]
        
        # Estimate expected move (based on historical volatility)
        volatility = df['volatility'].iloc[-1] if 'volatility' in df.columns else 1.0
        expected_move = volatility * (1 if prediction == 1 else -1 if prediction == -1 else 0)
        expected_move_str = f"{expected_move:+.2f}%" if prediction != 0 else "~0%"
        
        # Generate signals (explainability)
        signals = self._generate_signals(df, prediction)
        
        # Current price
        current_price = df['close'].iloc[-1]
        
        return {
            'symbol': symbol.upper(),
            'prediction': prediction_label,
            'confidence': round(float(confidence), 2),
            'expected_move': expected_move_str,
            'current_price': round(float(current_price), 2),
            'signals': signals,
            'model_used': model_type,
            'timestamp': datetime.now().isoformat(),
            'model_version': '1.0'
        }


# Singleton instance
_prediction_service = None

def get_prediction_service() -> PredictionService:
    """Get singleton prediction service instance"""
    global _prediction_service
    if _prediction_service is None:
        _prediction_service = PredictionService()
    return _prediction_service