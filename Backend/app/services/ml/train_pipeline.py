"""
Complete training pipeline for Bullseye AI.

This script:
1. Fetches market data
2. Builds ML dataset
3. Trains XGBoost and LSTM models
4. Evaluates both models
5. Saves best model

Run: python -m app.services.ml.train_pipeline
"""

import sys
import os
from pathlib import Path
import asyncio

# Fix Unicode/emoji output on Windows console
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Load .env so UPSTOX_ACCESS_TOKEN and other secrets are available
from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent.parent / ".env")

import pandas as pd
import numpy as np
from datetime import datetime

# Import your existing services
from app.services.market_providers.upstox import UpstoxProvider
from app.services.symbol_resolver import get_instrument_key
from app.services.indicators import sma, ema, rsi, macd
from app.services.ml.dataset_builder import MLDatasetBuilder
from app.services.ml.models.xgboost_model import XGBoostPredictor
from app.services.ml.models.lstm_model import LSTMPredictor
from app.services.ml.models.model_evaluator import ModelEvaluator


class MarketDataFetchError(RuntimeError):
    """Raised when a symbol cannot provide enough market data for training."""


async def fetch_and_prepare_data(symbol: str, days: int = 60) -> pd.DataFrame:
    """
    Fetch historical data and add technical indicators.
    
    Args:
        symbol: Stock symbol (e.g., 'RELIANCE')
        days: Number of days of historical data
    
    Returns:
        DataFrame with OHLCV + indicators
    """
    print("📥 Fetching market data...")
    
    # Get instrument key
    instrument_key = get_instrument_key(symbol)
    
    # Fetch candles
    upstox = UpstoxProvider()
    
    # Use daily candles for historical training data (60 days)
    # Resolution '5' maps to intraday-only endpoint (today's data only)
    # Resolution 'D' uses the historical endpoint with full date range
    raw_candles = await upstox.fetch_candles(
        instrument_key=instrument_key,
        resolution='D',  # Daily candles for historical training
        limit=days       # Fetch exactly as many days as requested
    )
    
    if not raw_candles:
        raise MarketDataFetchError(f"No data fetched for {symbol}")
    
    print(f"   ✅ Fetched {len(raw_candles)} candles")
    
    # Convert to DataFrame
    df = pd.DataFrame(raw_candles)
    df['time'] = pd.to_datetime(df['time'], unit='ms')
    df = df.set_index('time').sort_index()
    
    print(f"   ✅ Date range: {df.index[0]} to {df.index[-1]}")
    
    # ============================================================
    # Add Technical Indicators
    # ============================================================
    print("   ├─ Computing technical indicators...")
    
    closes = df['close'].tolist()
    
    # RSI
    rsi_vals = rsi(closes, period=14)
    df['rsi'] = rsi_vals
    
    # SMA
    sma_vals = sma(closes, period=14)
    df['sma'] = sma_vals
    
    # EMA (9 and 21 for crossover signals)
    ema_9_vals = ema(closes, period=9)
    ema_21_vals = ema(closes, period=21)
    df['ema_9'] = ema_9_vals
    df['ema_21'] = ema_21_vals
    
    # MACD
    macd_line, macd_signal, macd_hist = macd(closes)
    df['macd'] = macd_line
    df['macd_signal'] = macd_signal
    df['macd_histogram'] = macd_hist
    
    print(f"   ✅ Added indicators: RSI, SMA, EMA(9,21), MACD")
    
    return df


async def train_models_for_symbol(
    symbol: str,
    days: int = 60,
    save_dir: str = 'app/services/ml/trained_models'
):
    """
    Complete training pipeline for a symbol.
    
    Args:
        symbol: Stock symbol (e.g., 'RELIANCE')
        days: Historical data to fetch
        save_dir: Where to save trained models
    """
    print(f"\n{'='*70}")
    print(f"🚀 BULLSEYE AI - MODEL TRAINING PIPELINE")
    print(f"{'='*70}")
    print(f"Symbol: {symbol}")
    print(f"Training Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}\n")
    
    # ============================================================
    # STEP 1: Fetch Market Data
    # ============================================================
    print("📥 STEP 1: Fetching market data...")
    
    df = await fetch_and_prepare_data(symbol, days)
    
    # ============================================================
    # STEP 2: Build ML Dataset
    # ============================================================
    print("\n📊 STEP 2: Building ML dataset...")
    
    dataset_builder = MLDatasetBuilder()
    df_ml = dataset_builder.build_dataset(df, include_technical=True)
    
    # ============================================================
    # STEP 3: Train-Val-Test Split
    # ============================================================
    print("\n✂️  STEP 3: Splitting dataset...")
    
    train_df, val_df, test_df = dataset_builder.prepare_train_test_split(
        df_ml,
        test_size=0.15,
        validation_size=0.15
    )
    
    # Get feature matrices
    X_train, y_train, features = dataset_builder.get_feature_target_split(train_df)
    X_val, y_val, _ = dataset_builder.get_feature_target_split(val_df)
    X_test, y_test, _ = dataset_builder.get_feature_target_split(test_df)
    
    # Save scaler
    os.makedirs(save_dir, exist_ok=True)
    dataset_builder.save_scaler(f'{save_dir}/scaler_{symbol}.pkl')
    
    # Get actual returns for trading metrics
    future_returns_test = test_df['future_return'].values
    
    # ============================================================
    # STEP 4: Train XGBoost Model
    # ============================================================
    print("\n" + "="*70)
    print("🎯 STEP 4: Training XGBoost Model")
    print("="*70)
    
    xgb_model = XGBoostPredictor()
    xgb_history = xgb_model.train(
        X_train, y_train,
        X_val, y_val,
        feature_names=features
    )
    
    # Evaluate XGBoost
    print("\n📊 XGBoost Evaluation:")
    y_pred_xgb = xgb_model.predict(X_test)
    
    evaluator = ModelEvaluator()
    xgb_metrics = evaluator.evaluate_classification(y_test, y_pred_xgb)
    xgb_trading = evaluator.trading_metrics(y_test, y_pred_xgb, future_returns_test)
    
    evaluator.print_evaluation(xgb_metrics, xgb_trading)
    
    # Feature importance
    print("\n🔍 Top 10 Most Important Features (XGBoost):")
    importance_df = xgb_model.get_feature_importance()
    print(importance_df.head(10).to_string(index=False))
    
    # Save XGBoost
    xgb_model.save_model(f'{save_dir}/xgboost_{symbol}.json')
    
    # ============================================================
    # STEP 5: Train LSTM Model
    # ============================================================
    print("\n" + "="*70)
    print("🧠 STEP 5: Training LSTM Model")
    print("="*70)
    
    lstm_model = LSTMPredictor(
        sequence_length=20,
        lstm_units=[64, 32],
        dropout=0.2
    )
    
    lstm_history = lstm_model.train(
        X_train, y_train,
        X_val, y_val,
        feature_names=features,
        epochs=50,
        batch_size=32,
        verbose=1
    )
    
    # Evaluate LSTM
    print("\n📊 LSTM Evaluation:")
    y_pred_lstm = lstm_model.predict(X_test)
    
    lstm_metrics = evaluator.evaluate_classification(y_test, y_pred_lstm)
    lstm_trading = evaluator.trading_metrics(y_test, y_pred_lstm, future_returns_test)
    
    evaluator.print_evaluation(lstm_metrics, lstm_trading)
    
    # Save LSTM
    lstm_model.save_model(f'{save_dir}/lstm_{symbol}.keras')
    
    # ============================================================
    # STEP 6: Model Comparison
    # ============================================================
    print("\n" + "="*70)
    print("⚖️  MODEL COMPARISON")
    print("="*70)
    
    comparison = pd.DataFrame({
        'Metric': [
            'Accuracy',
            'F1 Score',
            'Directional Accuracy',
            'Win Rate',
            'Avg Return/Trade',
            'Total Return',
            'Sharpe Ratio'
        ],
        'XGBoost': [
            f"{xgb_metrics['accuracy']:.2%}",
            f"{xgb_metrics['f1_score']:.2%}",
            f"{xgb_trading['directional_accuracy']:.2%}",
            f"{xgb_trading['win_rate']:.2%}",
            f"{xgb_trading['avg_return_per_trade']:.2f}%",
            f"{xgb_trading['total_return']:.2f}%",
            f"{xgb_trading['sharpe_ratio']:.3f}"
        ],
        'LSTM': [
            f"{lstm_metrics['accuracy']:.2%}",
            f"{lstm_metrics['f1_score']:.2%}",
            f"{lstm_trading['directional_accuracy']:.2%}",
            f"{lstm_trading['win_rate']:.2%}",
            f"{lstm_trading['avg_return_per_trade']:.2f}%",
            f"{lstm_trading['total_return']:.2f}%",
            f"{lstm_trading['sharpe_ratio']:.3f}"
        ]
    })
    
    print("\n" + comparison.to_string(index=False))
    
    # ============================================================
    # STEP 7: Save Training Report
    # ============================================================
    print("\n📝 Saving training report...")
    
    report = {
        'symbol': symbol,
        'training_date': datetime.now().isoformat(),
        'data_info': {
            'total_samples': len(df_ml),
            'train_samples': len(train_df),
            'val_samples': len(val_df),
            'test_samples': len(test_df),
            'n_features': len(features)
        },
        'xgboost': {
            'metrics': {k: float(v) if isinstance(v, (np.floating, np.integer)) else v 
                       for k, v in xgb_metrics.items() if k not in ['classification_report', 'confusion_matrix']},
            'trading': {k: float(v) for k, v in xgb_trading.items()}
        },
        'lstm': {
            'metrics': {k: float(v) if isinstance(v, (np.floating, np.integer)) else v 
                       for k, v in lstm_metrics.items() if k not in ['classification_report', 'confusion_matrix']},
            'trading': {k: float(v) for k, v in lstm_trading.items()}
        }
    }
    
    import json
    with open(f'{save_dir}/training_report_{symbol}.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"   ✅ Report saved to {save_dir}/training_report_{symbol}.json")
    
    print("\n" + "="*70)
    print("✅ TRAINING COMPLETE!")
    print("="*70)
    
    return {
        'xgb_model': xgb_model,
        'lstm_model': lstm_model,
        'dataset_builder': dataset_builder,
        'report': report
    }


def main():
    """Main entry point - runs async training pipeline"""
    
    # ============================================================
    # CRITICAL: Load NSE instrument registry
    # ============================================================
    from app.services.instrument_registry import load_instruments
    
    print("🔄 Loading NSE instrument registry...")
    try:
        load_instruments()
        print("✅ Instrument registry loaded\n")
    except Exception as e:
        print(f"❌ Failed to load instrument registry: {e}")
        print("   Make sure you have internet connection to download NSE instruments")
        return
    
    # ============================================================
    # Train models
    # ============================================================
    symbols = ['RELIANCE', 'TCS', 'INFY']  # Add your symbols
    
    for symbol in symbols:
        try:
            # Run async function
            asyncio.run(train_models_for_symbol(symbol, days=60))
        except MarketDataFetchError as e:
            print(f"Skipping {symbol}: {e}")
            continue
        except Exception as e:
            print(f"❌ Error training {symbol}: {e}")
            import traceback
            traceback.print_exc()
            continue


if __name__ == '__main__':
    main()
