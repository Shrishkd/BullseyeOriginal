import pandas as pd
import numpy as np
from typing import Tuple, List
from sklearn.preprocessing import StandardScaler
import joblib

from .target_builder import TargetBuilder
from .feature_engineering import PriceActionFeatures, TechnicalSignals

class MLDatasetBuilder:
    """
    Complete ML pipeline: Raw OHLCV → ML-ready dataset
    
    Portfolio Note: This is the integration layer that shows
    you can build end-to-end ML systems.
    """
    
    def __init__(self):
        self.target_builder = TargetBuilder(lookahead_candles=10, method='quantile')
        self.scaler = StandardScaler()
        self.feature_columns = None
    
    def build_dataset(
        self, 
        df: pd.DataFrame,
        include_technical: bool = True,
        include_sentiment: bool = False
    ) -> pd.DataFrame:
        """
        Build complete dataset with all features.
        
        Args:
            df: Raw OHLCV data
            include_technical: Add RSI, EMA signals
            include_sentiment: Add sentiment features (if available)
        
        Returns:
            DataFrame with features + target
        """
        print("📊 Building ML dataset...")
        
        # 1. Add price action features
        print("  ├─ Adding price action features...")
        df = PriceActionFeatures.add_all_features(df)
        
        # 2. Add technical signals (if indicators already computed)
        if include_technical:
            print("  ├─ Adding technical signals...")
            df = TechnicalSignals.add_all_signals(df)
        
        # 3. Add sentiment (if you have sentiment_score column)
        if include_sentiment and 'sentiment_score' in df.columns:
            print("  ├─ Including sentiment features...")
            # Already have sentiment_score from your news API
            pass
        
        # 4. Create target variable
        print("  ├─ Creating target variable...")
        df = self.target_builder.create_target_labels(df)
        
        # 5. Clean dataset
        print("  ├─ Cleaning dataset...")
        df = self._clean_dataset(df)
        
        print(f"  └─ ✅ Dataset ready: {len(df)} samples, {len(df.columns)} features")
        
        return df
    
    def _clean_dataset(self, df: pd.DataFrame) -> pd.DataFrame:
        """Remove NaN, inf values, ensure data quality"""
        initial_rows = len(df)
        
        # Replace inf with NaN
        df = df.replace([np.inf, -np.inf], np.nan)
        
        # Drop rows with NaN
        df = df.dropna()
        
        dropped = initial_rows - len(df)
        if dropped > 0:
            print(f"    ⚠️  Dropped {dropped} rows with missing/invalid data")
        
        return df
    
    def prepare_train_test_split(
        self, 
        df: pd.DataFrame,
        test_size: float = 0.2,
        validation_size: float = 0.1
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        TIME-SERIES AWARE SPLIT (CRITICAL!)
        
        Don't use sklearn train_test_split - it shuffles data!
        For time series: train on past, test on future.
        
        Returns:
            train_df, validation_df, test_df
        """
        # Sort by time (ensure chronological order)
        df = df.sort_index()
        
        n = len(df)
        
        # Calculate split indices
        train_end = int(n * (1 - test_size - validation_size))
        val_end = int(n * (1 - test_size))
        
        train_df = df.iloc[:train_end]
        val_df = df.iloc[train_end:val_end]
        test_df = df.iloc[val_end:]
        
        print(f"📊 Dataset split:")
        print(f"  ├─ Train: {len(train_df)} samples ({train_df.index[0]} to {train_df.index[-1]})")
        print(f"  ├─ Validation: {len(val_df)} samples")
        print(f"  └─ Test: {len(test_df)} samples ({test_df.index[0]} to {test_df.index[-1]})")
        
        return train_df, val_df, test_df
    
    def get_feature_target_split(
        self, 
        df: pd.DataFrame,
        scale_features: bool = True
    ) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """
        Split into X (features) and y (target).
        
        Returns:
            X, y, feature_names
        """
        # Define features to exclude
        exclude_cols = [
            'target', 'future_return', 'future_close',  # Target related
            'open', 'high', 'low', 'close', 'volume',   # Raw OHLCV (keep derived features)
        ]
        
        # Select feature columns
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        
        self.feature_columns = feature_cols  # Save for later use
        
        X = df[feature_cols].values
        y = df['target'].values
        
        # Scale features (important for some models)
        if scale_features:
            X = self.scaler.fit_transform(X)
        
        print(f"📊 Feature matrix shape: X={X.shape}, y={y.shape}")
        print(f"📊 Features used: {len(feature_cols)}")
        
        return X, y, feature_cols
    
    def save_scaler(self, filepath: str = 'models/scaler.pkl'):
        """Save fitted scaler for production use"""
        joblib.dump(self.scaler, filepath)
        print(f"✅ Scaler saved to {filepath}")
    
    def load_scaler(self, filepath: str = 'models/scaler.pkl'):
        """Load scaler for inference"""
        self.scaler = joblib.load(filepath)
        print(f"✅ Scaler loaded from {filepath}")


# COMPLETE USAGE EXAMPLE:
"""
from services.ml.dataset_builder import MLDatasetBuilder

# 1. Fetch data
df = upstox_provider.fetch_candles('RELIANCE', '5minute', days=30)

# 2. Build dataset
dataset_builder = MLDatasetBuilder()
df_ml = dataset_builder.build_dataset(df, include_technical=True)

# 3. Split into train/val/test
train_df, val_df, test_df = dataset_builder.prepare_train_test_split(df_ml)

# 4. Get X, y for training
X_train, y_train, features = dataset_builder.get_feature_target_split(train_df)
X_val, y_val, _ = dataset_builder.get_feature_target_split(val_df, scale_features=True)

# 5. Save scaler for production
dataset_builder.save_scaler('models/scaler.pkl')

# Now you're ready to train models!
"""