import numpy as np
import pandas as pd
from typing import Tuple, Optional, List
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, callbacks
from tensorflow.keras.models import Sequential, load_model
import json

class LSTMPredictor:
    """
    LSTM model for sequential stock prediction.
    
    Why LSTM for Trading?
    - Captures temporal dependencies (market has memory)
    - Learns price patterns and sequences
    - Better for momentum and trend following
    - Handles variable-length sequences
    
    Portfolio Note: Shows you understand:
    - Deep learning for time series
    - Recurrent neural networks
    - Sequence modeling
    
    Trade-off vs XGBoost:
    + Better at capturing temporal patterns
    - Slower to train
    - Needs more data
    - Less interpretable
    """
    
    def __init__(
        self,
        sequence_length: int = 20,  # Look at last 20 candles
        n_features: int = None,     # Will be set during training
        lstm_units: List[int] = [64, 32],  # Two LSTM layers
        dropout: float = 0.2,
        learning_rate: float = 0.001
    ):
        """
        Initialize LSTM model.
        
        Args:
            sequence_length: How many past candles to look at
            n_features: Number of input features (auto-detected)
            lstm_units: List of LSTM layer sizes
            dropout: Dropout rate (prevents overfitting)
            learning_rate: Adam optimizer learning rate
        """
        self.sequence_length = sequence_length
        self.n_features = n_features
        self.lstm_units = lstm_units
        self.dropout = dropout
        self.learning_rate = learning_rate
        
        self.model = None
        self.feature_names = None
        self.is_trained = False
    
    def _create_sequences(
        self, 
        X: np.ndarray, 
        y: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Convert tabular data to sequences.
        
        For each sample, look at last `sequence_length` candles.
        
        Example:
            If sequence_length = 20:
            - To predict candle 20: use candles 0-19
            - To predict candle 21: use candles 1-20
            - etc.
        
        Returns:
            X_seq: (n_samples, sequence_length, n_features)
            y_seq: (n_samples,)
        """
        X_seq, y_seq = [], []
        
        for i in range(self.sequence_length, len(X)):
            # Get sequence of past candles
            X_seq.append(X[i - self.sequence_length:i])
            y_seq.append(y[i])
        
        return np.array(X_seq), np.array(y_seq)
    
    def _build_model(self, n_features: int):
        """
        Build LSTM architecture.
        
        Architecture:
        - Input: (sequence_length, n_features)
        - LSTM layers with dropout
        - Dense output layer
        """
        model = Sequential(name='LSTM_Stock_Predictor')
        
        # First LSTM layer (return sequences for stacking)
        model.add(layers.LSTM(
            units=self.lstm_units[0],
            return_sequences=len(self.lstm_units) > 1,
            input_shape=(self.sequence_length, n_features)
        ))
        model.add(layers.Dropout(self.dropout))
        
        # Additional LSTM layers
        for i, units in enumerate(self.lstm_units[1:], 1):
            return_seq = i < len(self.lstm_units) - 1
            model.add(layers.LSTM(units=units, return_sequences=return_seq))
            model.add(layers.Dropout(self.dropout))
        
        # Output layer (3 classes: DOWN, SIDEWAYS, UP)
        model.add(layers.Dense(3, activation='softmax'))
        
        # Compile
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=self.learning_rate),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None,
        feature_names: Optional[list] = None,
        epochs: int = 50,
        batch_size: int = 32,
        verbose: int = 1
    ) -> dict:
        """
        Train LSTM model.
        
        Args:
            X_train: Training features (2D)
            y_train: Training labels
            X_val: Validation features (optional)
            y_val: Validation labels
            feature_names: List of feature names
            epochs: Training epochs
            batch_size: Batch size
            verbose: Verbosity (0=silent, 1=progress bar, 2=one line per epoch)
        
        Returns:
            Training history
        """
        print("🚀 Training LSTM model...")
        
        # Guard: sequence_length must be < len(X_train) to produce any sequences
        if len(X_train) <= self.sequence_length:
            new_seq_len = max(2, len(X_train) // 2)
            print(f"  ⚠️  Not enough data for sequence_length={self.sequence_length} "
                  f"(only {len(X_train)} samples). Reducing to {new_seq_len}.")
            self.sequence_length = new_seq_len
        
        # Convert to sequences
        print(f"  ├─ Creating sequences (length={self.sequence_length})...")
        X_train_seq, y_train_seq = self._create_sequences(X_train, y_train)
        
        if len(X_train_seq) == 0:
            raise ValueError(
                f"No sequences created — training set ({len(X_train)} rows) is too small "
                f"for sequence_length={self.sequence_length}. Fetch more data."
            )
        
        # Shift labels from {-1, 0, 1} to {0, 1, 2}
        y_train_seq = y_train_seq + 1
        
        # Prepare validation data
        validation_data = None
        if X_val is not None and y_val is not None:
            X_val_seq, y_val_seq = self._create_sequences(X_val, y_val)
            if len(X_val_seq) > 0:
                y_val_seq = y_val_seq + 1
                validation_data = (X_val_seq, y_val_seq)
            else:
                print(f"  ⚠️  Validation set too small for sequences — skipping validation.")
        
        # Auto-detect number of features
        self.n_features = X_train_seq.shape[2]
        self.feature_names = feature_names
        
        print(f"  ├─ Training data shape: {X_train_seq.shape}")
        print(f"  ├─ Features: {self.n_features}")
        
        # Build model
        print(f"  ├─ Building LSTM architecture...")
        self.model = self._build_model(self.n_features)
        
        # Callbacks
        callback_list = [
            # Early stopping
            callbacks.EarlyStopping(
                monitor='val_loss' if validation_data else 'loss',
                patience=10,
                restore_best_weights=True,
                verbose=1
            ),
            # Reduce learning rate on plateau
            callbacks.ReduceLROnPlateau(
                monitor='val_loss' if validation_data else 'loss',
                factor=0.5,
                patience=5,
                min_lr=1e-6,
                verbose=1
            )
        ]
        
        # Train
        print(f"  ├─ Training for up to {epochs} epochs...")
        history = self.model.fit(
            X_train_seq, y_train_seq,
            validation_data=validation_data,
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callback_list,
            verbose=verbose
        )
        
        self.is_trained = True
        
        print(f"✅ Training complete!")
        print(f"   Final train loss: {history.history['loss'][-1]:.4f}")
        if validation_data:
            print(f"   Final val loss: {history.history['val_loss'][-1]:.4f}")
        
        return history.history
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Predict class labels.
        
        Returns:
            Array of predictions {-1, 0, 1}
        """
        if not self.is_trained:
            raise ValueError("Model not trained yet!")
        
        # Convert to sequences
        X_seq, _ = self._create_sequences(X, np.zeros(len(X)))
        
        if len(X_seq) == 0:
            print(f"  ⚠️  Test set ({len(X)} rows) too small for sequences "
                  f"(length={self.sequence_length}). Returning SIDEWAYS (0) for all.")
            return np.zeros(len(X), dtype=int)
        
        # Predict
        predictions_shifted = self.model.predict(X_seq, verbose=0)
        predictions_shifted = np.argmax(predictions_shifted, axis=1)
        
        # Convert back from {0, 1, 2} to {-1, 0, 1}
        predictions = predictions_shifted - 1
        
        return predictions.astype(int)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predict class probabilities.
        
        Returns:
            Array of shape (n_samples, 3) with probabilities
        """
        if not self.is_trained:
            raise ValueError("Model not trained yet!")
        
        # Convert to sequences
        X_seq, _ = self._create_sequences(X, np.zeros(len(X)))
        
        # Predict probabilities
        probs = self.model.predict(X_seq, verbose=0)
        
        return probs
    
    def get_confidence(self, X: np.ndarray) -> np.ndarray:
        """Get confidence scores"""
        probs = self.predict_proba(X)
        confidence = np.max(probs, axis=1) * 100
        return confidence
    
    def save_model(self, filepath: str):
        """Save trained model"""
        if not self.is_trained:
            raise ValueError("Cannot save untrained model!")
        
        # Save Keras model
        self.model.save(filepath)
        
        # Save metadata
        metadata = {
            'sequence_length': self.sequence_length,
            'n_features': self.n_features,
            'lstm_units': self.lstm_units,
            'dropout': self.dropout,
            'learning_rate': self.learning_rate,
            'feature_names': self.feature_names
        }
        
        metadata_path = filepath.replace('.h5', '_metadata.json').replace('.keras', '_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✅ Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained model"""
        # Load Keras model
        self.model = load_model(filepath)
        
        # Load metadata
        metadata_path = filepath.replace('.h5', '_metadata.json').replace('.keras', '_metadata.json')
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        self.sequence_length = metadata['sequence_length']
        self.n_features = metadata['n_features']
        self.lstm_units = metadata['lstm_units']
        self.dropout = metadata['dropout']
        self.learning_rate = metadata['learning_rate']
        self.feature_names = metadata['feature_names']
        self.is_trained = True
        
        print(f"✅ Model loaded from {filepath}")


# USAGE EXAMPLE:
"""
from services.ml.models.lstm_model import LSTMPredictor

# Initialize
lstm_model = LSTMPredictor(sequence_length=20, lstm_units=[64, 32])

# Train
history = lstm_model.train(
    X_train, y_train, 
    X_val, y_val,
    feature_names=features,
    epochs=50,
    batch_size=32
)

# Predict
predictions = lstm_model.predict(X_test)
confidence = lstm_model.get_confidence(X_test)

# Save
lstm_model.save_model('trained_models/lstm_reliance.keras')
"""