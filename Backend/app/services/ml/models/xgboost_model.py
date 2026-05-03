import xgboost as xgb
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Optional
import joblib
from sklearn.metrics import classification_report, confusion_matrix
import json

class XGBoostPredictor:
    """
    XGBoost model for stock prediction.
    
    Why XGBoost for Trading?
    - Handles non-linear relationships
    - Feature importance built-in (explainability)
    - Fast training and inference
    - Robust to overfitting with proper tuning
    - Industry standard for tabular data
    
    Portfolio Note: XGBoost is used by major hedge funds and
    is the go-to model for financial predictions.
    """
    
    def __init__(self, params: Optional[Dict] = None):
        """
        Initialize XGBoost model.
        
        Args:
            params: Custom hyperparameters (optional)
        """
        # Default hyperparameters (tuned for financial data)
        self.default_params = {
            'objective': 'multi:softmax',  # Multiclass classification
            'num_class': 3,                # UP (1), SIDEWAYS (0), DOWN (-1) + offset
            'max_depth': 6,                # Prevents overfitting
            'learning_rate': 0.1,          # Conservative learning
            'n_estimators': 200,           # Number of trees
            'subsample': 0.8,              # Row sampling (prevents overfitting)
            'colsample_bytree': 0.8,       # Feature sampling
            'reg_alpha': 0.1,              # L1 regularization
            'reg_lambda': 1.0,             # L2 regularization
            'random_state': 42,
            'eval_metric': 'mlogloss',     # Multiclass log loss
            'early_stopping_rounds': 20,   # Stop if no improvement
            'verbose': 0
        }
        
        # Override with custom params if provided
        if params:
            self.default_params.update(params)
        
        self.model = None
        self.feature_names = None
        self.is_trained = False
    
    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None,
        feature_names: Optional[list] = None
    ) -> Dict:
        """
        Train XGBoost model.
        
        Args:
            X_train: Training features
            y_train: Training labels
            X_val: Validation features (optional but recommended)
            y_val: Validation labels
            feature_names: List of feature names
        
        Returns:
            Training history dict
        """
        print("🚀 Training XGBoost model...")
        
        # Convert targets from {-1, 0, 1} to {0, 1, 2} (XGBoost requirement)
        y_train_shifted = y_train + 1
        y_val_shifted = y_val + 1 if y_val is not None else None
        
        self.feature_names = feature_names
        
        # Create DMatrix (XGBoost's internal data structure)
        dtrain = xgb.DMatrix(X_train, label=y_train_shifted, feature_names=feature_names)
        
        # Validation set for early stopping
        evals = []
        if X_val is not None and y_val is not None:
            dval = xgb.DMatrix(X_val, label=y_val_shifted, feature_names=feature_names)
            evals = [(dtrain, 'train'), (dval, 'validation')]
        else:
            evals = [(dtrain, 'train')]
        
        # Train model
        evals_result = {}
        self.model = xgb.train(
            params=self.default_params,
            dtrain=dtrain,
            num_boost_round=self.default_params['n_estimators'],
            evals=evals,
            evals_result=evals_result,
            early_stopping_rounds=self.default_params.get('early_stopping_rounds'),
            verbose_eval=False
        )
        
        self.is_trained = True
        
        print(f"✅ Training complete!")
        print(f"   Best iteration: {self.model.best_iteration}")
        print(f"   Best score: {self.model.best_score:.4f}")
        
        return evals_result
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Predict class labels.
        
        Returns:
            Array of predictions {-1, 0, 1}
        """
        if not self.is_trained:
            raise ValueError("Model not trained yet!")
        
        dtest = xgb.DMatrix(X, feature_names=self.feature_names)
        predictions_shifted = self.model.predict(dtest)
        
        # Convert back from {0, 1, 2} to {-1, 0, 1}
        predictions = predictions_shifted - 1
        
        return predictions.astype(int)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predict class probabilities.
        
        Returns:
            Array of shape (n_samples, 3) with probabilities for each class
        """
        if not self.is_trained:
            raise ValueError("Model not trained yet!")
        
        # Temporarily change objective to get probabilities
        original_objective = self.model.attr('objective')
        
        dtest = xgb.DMatrix(X, feature_names=self.feature_names)
        
        # Get probabilities
        self.model.set_param({'objective': 'multi:softprob'})
        probs = self.model.predict(dtest)
        self.model.set_param({'objective': original_objective})
        
        return probs
    
    def get_confidence(self, X: np.ndarray) -> np.ndarray:
        """
        Get confidence score (max probability) for each prediction.
        
        Returns:
            Array of confidence scores [0-100]%
        """
        probs = self.predict_proba(X)
        confidence = np.max(probs, axis=1) * 100
        return confidence
    
    def get_feature_importance(self, importance_type: str = 'gain') -> pd.DataFrame:
        """
        Get feature importance scores.
        
        Args:
            importance_type: 'gain', 'weight', or 'cover'
                - gain: average gain of splits using the feature
                - weight: number of times feature is used
                - cover: average coverage of splits
        
        Returns:
            DataFrame sorted by importance
        """
        if not self.is_trained:
            raise ValueError("Model not trained yet!")
        
        importance_dict = self.model.get_score(importance_type=importance_type)
        
        # Convert to DataFrame
        importance_df = pd.DataFrame([
            {'feature': k, 'importance': v}
            for k, v in importance_dict.items()
        ]).sort_values('importance', ascending=False)
        
        return importance_df
    
    def save_model(self, filepath: str):
        """Save trained model to disk"""
        if not self.is_trained:
            raise ValueError("Cannot save untrained model!")
        
        # Save XGBoost model
        self.model.save_model(filepath)
        
        # Save metadata
        metadata = {
            'feature_names': self.feature_names,
            'params': self.default_params
        }
        
        metadata_path = filepath.replace('.json', '_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✅ Model saved to {filepath}")
        print(f"✅ Metadata saved to {metadata_path}")
    
    def load_model(self, filepath: str):
        """Load trained model from disk"""
        # Load model
        self.model = xgb.Booster()
        self.model.load_model(filepath)
        
        # Load metadata
        metadata_path = filepath.replace('.json', '_metadata.json')
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        self.feature_names = metadata['feature_names']
        self.default_params = metadata['params']
        self.is_trained = True
        
        print(f"✅ Model loaded from {filepath}")


# USAGE EXAMPLE:
"""
from services.ml.models.xgboost_model import XGBoostPredictor

# Initialize model
xgb_model = XGBoostPredictor()

# Train
history = xgb_model.train(X_train, y_train, X_val, y_val, feature_names)

# Predict
predictions = xgb_model.predict(X_test)
probabilities = xgb_model.predict_proba(X_test)
confidence = xgb_model.get_confidence(X_test)

# Feature importance
importance_df = xgb_model.get_feature_importance()
print(importance_df.head(10))

# Save
xgb_model.save_model('trained_models/xgboost_reliance.json')
"""