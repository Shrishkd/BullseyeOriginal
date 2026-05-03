import pandas as pd
import numpy as np
from typing import Literal

class TargetBuilder:
    """
    Creates target variables for ML training.
    
    Portfolio Note: This shows you understand supervised learning
    and can engineer proper prediction targets.
    """
    
    def __init__(
        self, 
        lookahead_candles: int = 10,  # Look 10 candles ahead (~50 min on 5-min data)
        method: Literal['return', 'quantile'] = 'quantile'
    ):
        """
        Args:
            lookahead_candles: How many candles ahead to predict
            method: 'return' (threshold-based) or 'quantile' (balanced classes)
        """
        self.lookahead = lookahead_candles
        self.method = method
    
    def create_target_return(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate future return percentage.
        
        Formula: (future_close - current_close) / current_close * 100
        """
        df = df.copy()
        
        # Shift close price backwards to get future price
        df['future_close'] = df['close'].shift(-self.lookahead)
        
        # Calculate return percentage
        df['future_return'] = (
            (df['future_close'] - df['close']) / df['close'] * 100
        )
        
        return df
    
    def create_target_labels(
        self, 
        df: pd.DataFrame,
        up_threshold: float = 0.5,    # +0.5% = UP
        down_threshold: float = -0.5   # -0.5% = DOWN
    ) -> pd.DataFrame:
        """
        Create classification labels: UP (1), SIDEWAYS (0), DOWN (-1)
        
        WARNING: Fixed thresholds can create imbalanced datasets.
        Prefer quantile method for portfolio projects.
        """
        df = self.create_target_return(df)
        
        if self.method == 'return':
            # Threshold-based labeling
            df['target'] = 0  # Default SIDEWAYS
            df.loc[df['future_return'] > up_threshold, 'target'] = 1   # UP
            df.loc[df['future_return'] < down_threshold, 'target'] = -1  # DOWN
            
        elif self.method == 'quantile':
            # Drop lookahead NaNs BEFORE qcut — astype(int) can't handle NaN Categorical
            df = df.dropna(subset=['future_return'])
            
            # Quantile-based labeling (BETTER for balanced classes)
            df['target'] = pd.qcut(
                df['future_return'], 
                q=3, 
                labels=[-1, 0, 1],  # DOWN, SIDEWAYS, UP
                duplicates='drop'
            )
            df['target'] = df['target'].astype(int)
        
        # Drop rows where we can't calculate future return (covers 'return' method)
        df = df.dropna(subset=['future_return', 'target'])
        
        return df
    
    def get_class_distribution(self, df: pd.DataFrame) -> dict:
        """Check if classes are balanced (important for ML)"""
        if 'target' not in df.columns:
            raise ValueError("Target not created yet. Run create_target_labels() first")
        
        dist = df['target'].value_counts(normalize=True).to_dict()
        return {
            'DOWN (-1)': dist.get(-1, 0),
            'SIDEWAYS (0)': dist.get(0, 0),
            'UP (1)': dist.get(1, 0)
        }


# USAGE EXAMPLE:
"""
from services.ml.target_builder import TargetBuilder

# Fetch your OHLCV data
df = upstox_provider.fetch_candles('RELIANCE', '5minute')

# Create targets
target_builder = TargetBuilder(lookahead_candles=10, method='quantile')
df_with_targets = target_builder.create_target_labels(df)

# Check balance
print(target_builder.get_class_distribution(df_with_targets))
# Output: {'DOWN (-1)': 0.33, 'SIDEWAYS (0)': 0.34, 'UP (1)': 0.33} ✅ Balanced!
"""