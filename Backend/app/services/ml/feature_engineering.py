import pandas as pd
import numpy as np
from ta.volatility import AverageTrueRange  # pip install ta

class PriceActionFeatures:
    """
    Extract market microstructure features.
    
    Portfolio Note: This demonstrates understanding of:
    - Market dynamics beyond basic indicators
    - Feature engineering for time series
    - Domain knowledge in trading
    """
    
    @staticmethod
    def add_returns(df: pd.DataFrame) -> pd.DataFrame:
        """Add various return calculations"""
        df = df.copy()
        
        # Simple returns
        df['return_1'] = df['close'].pct_change(1) * 100  # 1-candle return
        df['return_5'] = df['close'].pct_change(5) * 100  # 5-candle return
        
        # Log returns (better for ML - more normalized)
        df['log_return'] = np.log(df['close'] / df['close'].shift(1)) * 100
        
        return df
    
    @staticmethod
    def add_volatility(df: pd.DataFrame, window: int = 14) -> pd.DataFrame:
        """Add volatility measures"""
        df = df.copy()
        
        # Rolling standard deviation of returns
        df['volatility'] = df['return_1'].rolling(window).std()
        
        # Average True Range (industry standard)
        atr = AverageTrueRange(
            high=df['high'],
            low=df['low'],
            close=df['close'],
            window=window
        )
        df['atr'] = atr.average_true_range()
        
        # Normalized ATR (% of price)
        df['atr_pct'] = (df['atr'] / df['close']) * 100
        
        return df
    
    @staticmethod
    def add_trend_structure(df: pd.DataFrame, window: int = 20) -> pd.DataFrame:
        """Detect higher highs, lower lows, trend strength"""
        df = df.copy()
        
        # Rolling max/min
        df['rolling_high'] = df['high'].rolling(window).max()
        df['rolling_low'] = df['low'].rolling(window).min()
        
        # Higher High detection (bullish structure)
        df['higher_high'] = (
            (df['high'] > df['rolling_high'].shift(1))
        ).astype(int)
        
        # Lower Low detection (bearish structure)
        df['lower_low'] = (
            (df['low'] < df['rolling_low'].shift(1))
        ).astype(int)
        
        # Trend strength (distance from rolling mean as %)
        rolling_mean = df['close'].rolling(window).mean()
        df['trend_strength'] = ((df['close'] - rolling_mean) / rolling_mean) * 100
        
        return df
    
    @staticmethod
    def add_momentum(df: pd.DataFrame) -> pd.DataFrame:
        """Momentum indicators"""
        df = df.copy()
        
        # Rate of Change (ROC)
        df['roc_5'] = ((df['close'] - df['close'].shift(5)) / df['close'].shift(5)) * 100
        df['roc_10'] = ((df['close'] - df['close'].shift(10)) / df['close'].shift(10)) * 100
        
        # Momentum (simple price difference)
        df['momentum'] = df['close'] - df['close'].shift(5)
        
        return df
    
    @staticmethod
    def add_volume_features(df: pd.DataFrame, window: int = 20) -> pd.DataFrame:
        """Volume-based features"""
        df = df.copy()
        
        # Volume moving average
        df['volume_ma'] = df['volume'].rolling(window).mean()
        
        # Volume spike detection
        df['volume_spike'] = (
            df['volume'] > (df['volume_ma'] * 1.5)
        ).astype(int)
        
        # Volume trend
        df['volume_trend'] = df['volume'].pct_change(5) * 100
        
        # Price-Volume correlation (shows conviction)
        df['price_volume_corr'] = df['close'].rolling(window).corr(df['volume'])
        
        return df
    
    @classmethod
    def add_all_features(cls, df: pd.DataFrame) -> pd.DataFrame:
        """Apply all price action features"""
        df = cls.add_returns(df)
        df = cls.add_volatility(df)
        df = cls.add_trend_structure(df)
        df = cls.add_momentum(df)
        df = cls.add_volume_features(df)
        
        return df


# USAGE:
"""
from services.ml.feature_engineering import PriceActionFeatures

df = upstox_provider.fetch_candles('SBIN', '5minute')
df = PriceActionFeatures.add_all_features(df)

print(df.columns)
# Now you have: volatility, atr, higher_high, trend_strength, volume_spike, etc.
"""

class TechnicalSignals:
    """
    Convert raw indicators into binary/categorical signals.
    
    Portfolio Note: Shows you understand feature engineering
    and can create meaningful inputs for ML models.
    """
    
    @staticmethod
    def rsi_signals(df: pd.DataFrame) -> pd.DataFrame:
        """Convert RSI values into signals"""
        df = df.copy()
        
        # Assuming you have 'rsi' column from your indicators.py
        df['rsi_oversold'] = (df['rsi'] < 30).astype(int)   # Bullish signal
        df['rsi_overbought'] = (df['rsi'] > 70).astype(int)  # Bearish signal
        df['rsi_neutral'] = ((df['rsi'] >= 30) & (df['rsi'] <= 70)).astype(int)
        
        # RSI momentum (is RSI trending up/down?)
        df['rsi_momentum'] = df['rsi'].diff()
        
        return df
    
    @staticmethod
    def ema_signals(df: pd.DataFrame) -> pd.DataFrame:
        """EMA crossover signals"""
        df = df.copy()
        
        # Assuming you have ema_9, ema_21 columns
        # Bullish: fast EMA > slow EMA
        df['ema_bullish_cross'] = (df['ema_9'] > df['ema_21']).astype(int)
        
        # Detect fresh crossovers (changed in last candle)
        df['ema_fresh_cross_up'] = (
            (df['ema_9'] > df['ema_21']) & 
            (df['ema_9'].shift(1) <= df['ema_21'].shift(1))
        ).astype(int)
        
        df['ema_fresh_cross_down'] = (
            (df['ema_9'] < df['ema_21']) & 
            (df['ema_9'].shift(1) >= df['ema_21'].shift(1))
        ).astype(int)
        
        # Distance between EMAs (strength of trend)
        df['ema_distance'] = ((df['ema_9'] - df['ema_21']) / df['ema_21']) * 100
        
        return df
    
    @staticmethod
    def macd_signals(df: pd.DataFrame) -> pd.DataFrame:
        """MACD signals (if you have MACD indicator)"""
        df = df.copy()
        
        # Assuming you have 'macd' and 'macd_signal' columns
        if 'macd' in df.columns and 'macd_signal' in df.columns:
            # MACD above signal line = bullish
            df['macd_bullish'] = (df['macd'] > df['macd_signal']).astype(int)
            
            # MACD crossover
            df['macd_cross_up'] = (
                (df['macd'] > df['macd_signal']) & 
                (df['macd'].shift(1) <= df['macd_signal'].shift(1))
            ).astype(int)
            
            # MACD histogram
            df['macd_histogram'] = df['macd'] - df['macd_signal']
        
        return df
    
    @classmethod
    def add_all_signals(cls, df: pd.DataFrame) -> pd.DataFrame:
        """Apply all signal features"""
        df = cls.rsi_signals(df)
        df = cls.ema_signals(df)
        df = cls.macd_signals(df)
        
        return df