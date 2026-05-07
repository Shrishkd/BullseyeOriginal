"""
Prediction API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Literal

from app.api.deps import get_current_user
from app.services.ml.prediction_service import get_prediction_service

router = APIRouter(prefix="/predict", tags=["AI Predictions"])


@router.get("/{symbol}")
async def get_prediction(
    symbol: str,
    model: Literal['xgboost', 'lstm'] = Query(
        'xgboost',
        description="Model to use for prediction"
    ),
    user=Depends(get_current_user)
):
    """
    Get AI-powered prediction for a stock symbol.
    
    **Features:**
    - Predicts UP / DOWN / SIDEWAYS
    - Confidence score (0-100%)
    - Expected price movement
    - Explainable signals (WHY this prediction)
    
    **Example:**
    GET /api/predict/RELIANCE?model=xgboost

    **Response:**
```json
    {
      "symbol": "RELIANCE",
      "prediction": "UP",
      "confidence": 82.5,
      "expected_move": "+1.2%",
      "current_price": 2845.50,
      "signals": [
        "RSI oversold (28.5) - Bullish signal",
        "EMA bullish crossover (9 > 21)",
        "MACD bullish (above signal)"
      ],
      "model_used": "xgboost",
      "timestamp": "2026-05-03T18:00:00"
    }
```
    """
    try:
        prediction_service = get_prediction_service()
        result = await prediction_service.predict(symbol.upper(), model_type=model)
        return result
    
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Model not trained for {symbol}. Train it first using the training pipeline."
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction error: {str(e)}"
        )


@router.get("/{symbol}/models")
async def get_available_models(
    symbol: str,
    user=Depends(get_current_user)
):
    """
    Check which models are available for a symbol.
    
    Returns:
```json
    {
      "symbol": "RELIANCE",
      "models": ["xgboost", "lstm"],
      "scaler_available": true
    }
```
    """
    import os
    
    model_dir = 'app/services/ml/trained_models'
    
    available_models = []
    
    # Check XGBoost
    if os.path.exists(f"{model_dir}/xgboost_{symbol}.json"):
        available_models.append("xgboost")
    
    # Check LSTM
    if os.path.exists(f"{model_dir}/lstm_{symbol}.keras"):
        available_models.append("lstm")
    
    # Check scaler
    scaler_available = os.path.exists(f"{model_dir}/scaler_{symbol}.pkl")
    
    return {
        "symbol": symbol.upper(),
        "models": available_models,
        "scaler_available": scaler_available
    }