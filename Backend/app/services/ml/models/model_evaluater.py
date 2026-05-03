import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix
)
from typing import Dict, Tuple

class ModelEvaluator:
    """
    Comprehensive model evaluation for trading predictions.
    
    Portfolio Note: Shows you understand:
    - Beyond just accuracy (precision/recall matter)
    - Trading-specific metrics
    - Model comparison methodology
    """
    
    @staticmethod
    def evaluate_classification(
        y_true: np.ndarray, 
        y_pred: np.ndarray,
        class_names: list = ['DOWN', 'SIDEWAYS', 'UP']
    ) -> Dict:
        """
        Comprehensive classification metrics.
        
        Returns:
            Dictionary with all metrics
        """
        # Convert {-1, 0, 1} to {0, 1, 2} for sklearn
        y_true_shifted = y_true + 1
        y_pred_shifted = y_pred + 1
        
        # Basic metrics
        accuracy = accuracy_score(y_true_shifted, y_pred_shifted)
        precision = precision_score(y_true_shifted, y_pred_shifted, average='weighted')
        recall = recall_score(y_true_shifted, y_pred_shifted, average='weighted')
        f1 = f1_score(y_true_shifted, y_pred_shifted, average='weighted')
        
        # Per-class metrics
        report = classification_report(
            y_true_shifted, y_pred_shifted,
            target_names=class_names,
            output_dict=True
        )
        
        # Confusion matrix
        cm = confusion_matrix(y_true_shifted, y_pred_shifted)
        
        return {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'classification_report': report,
            'confusion_matrix': cm
        }
    
    @staticmethod
    def trading_metrics(
        y_true: np.ndarray,
        y_pred: np.ndarray,
        returns: np.ndarray  # Actual returns from target_builder
    ) -> Dict:
        """
        Trading-specific performance metrics.
        
        These matter more than accuracy for real trading!
        
        Args:
            y_true: True labels {-1, 0, 1}
            y_pred: Predicted labels {-1, 0, 1}
            returns: Actual future returns (%)
        
        Returns:
            Dict with trading metrics
        """
        # Directional accuracy (did we get UP/DOWN right?)
        # Ignore SIDEWAYS for this metric
        directional_mask = (y_true != 0)
        if directional_mask.sum() > 0:
            directional_accuracy = accuracy_score(
                y_true[directional_mask],
                y_pred[directional_mask]
            )
        else:
            directional_accuracy = 0.0
        
        # Win rate (% of profitable predictions)
        # Assume we trade in predicted direction
        trade_returns = []
        for true_label, pred_label, actual_return in zip(y_true, y_pred, returns):
            if pred_label == 1:  # Predicted UP -> go long
                trade_returns.append(actual_return)
            elif pred_label == -1:  # Predicted DOWN -> go short
                trade_returns.append(-actual_return)
            # If predicted SIDEWAYS (0), don't trade
        
        trade_returns = np.array(trade_returns)
        
        if len(trade_returns) > 0:
            win_rate = (trade_returns > 0).sum() / len(trade_returns)
            avg_return = trade_returns.mean()
            total_return = trade_returns.sum()
            
            # Sharpe-like ratio (risk-adjusted return)
            sharpe = avg_return / trade_returns.std() if trade_returns.std() > 0 else 0
        else:
            win_rate = 0.0
            avg_return = 0.0
            total_return = 0.0
            sharpe = 0.0
        
        # UP prediction metrics (precision for longs)
        up_mask = (y_pred == 1)
        if up_mask.sum() > 0:
            up_precision = (y_true[up_mask] == 1).sum() / up_mask.sum()
        else:
            up_precision = 0.0
        
        # DOWN prediction metrics (precision for shorts)
        down_mask = (y_pred == -1)
        if down_mask.sum() > 0:
            down_precision = (y_true[down_mask] == -1).sum() / down_mask.sum()
        else:
            down_precision = 0.0
        
        return {
            'directional_accuracy': directional_accuracy,
            'win_rate': win_rate,
            'avg_return_per_trade': avg_return,
            'total_return': total_return,
            'sharpe_ratio': sharpe,
            'up_prediction_precision': up_precision,
            'down_prediction_precision': down_precision,
            'n_trades': len(trade_returns)
        }
    
    @staticmethod
    def print_evaluation(metrics: Dict, trading_metrics: Dict = None):
        """Pretty print evaluation results"""
        print("\n" + "="*60)
        print("📊 MODEL EVALUATION RESULTS")
        print("="*60)
        
        print(f"\n🎯 Classification Metrics:")
        print(f"  ├─ Accuracy:  {metrics['accuracy']:.2%}")
        print(f"  ├─ Precision: {metrics['precision']:.2%}")
        print(f"  ├─ Recall:    {metrics['recall']:.2%}")
        print(f"  └─ F1 Score:  {metrics['f1_score']:.2%}")
        
        print(f"\n📈 Per-Class Performance:")
        for class_name in ['DOWN', 'SIDEWAYS', 'UP']:
            if class_name in metrics['classification_report']:
                report = metrics['classification_report'][class_name]
                print(f"  {class_name:>8} → Precision: {report['precision']:.2%}, "
                      f"Recall: {report['recall']:.2%}, "
                      f"F1: {report['f1-score']:.2%}")
        
        print(f"\n🔀 Confusion Matrix:")
        print(f"              Predicted →")
        print(f"  Actual ↓    DOWN   SIDE    UP")
        cm = metrics['confusion_matrix']
        for i, label in enumerate(['DOWN', 'SIDE', 'UP']):
            print(f"  {label:>8}   {cm[i][0]:>5} {cm[i][1]:>6} {cm[i][2]:>6}")
        
        if trading_metrics:
            print(f"\n💰 Trading Performance:")
            print(f"  ├─ Directional Accuracy: {trading_metrics['directional_accuracy']:.2%}")
            print(f"  ├─ Win Rate:             {trading_metrics['win_rate']:.2%}")
            print(f"  ├─ Avg Return/Trade:     {trading_metrics['avg_return_per_trade']:.2f}%")
            print(f"  ├─ Total Return:         {trading_metrics['total_return']:.2f}%")
            print(f"  ├─ Sharpe Ratio:         {trading_metrics['sharpe_ratio']:.3f}")
            print(f"  ├─ UP Precision:         {trading_metrics['up_prediction_precision']:.2%}")
            print(f"  ├─ DOWN Precision:       {trading_metrics['down_prediction_precision']:.2%}")
            print(f"  └─ Number of Trades:     {trading_metrics['n_trades']}")
        
        print("\n" + "="*60)


# USAGE:
"""
from services.ml.models.model_evaluator import ModelEvaluator

evaluator = ModelEvaluator()

# Get predictions
y_pred = model.predict(X_test)

# Evaluate
metrics = evaluator.evaluate_classification(y_test, y_pred)
trading = evaluator.trading_metrics(y_test, y_pred, future_returns_test)

# Print
evaluator.print_evaluation(metrics, trading)
"""