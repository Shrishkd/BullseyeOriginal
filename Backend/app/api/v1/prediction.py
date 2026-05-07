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
        description="Model to use: 'xgboost' (recommended) or 'lstm'"
    ),
    user=Depends(get_current_user),
):
    """
    Get AI-powered prediction for any NSE stock symbol.

    **Auto-training:** If no model exists for the symbol, it is trained
    automatically on the first request (~30 s for XGBoost, ~60 s for LSTM).
    Subsequent requests for the same symbol are fast (model is cached).

    **Response example:**
```json
    {
      "symbol": "HDFCBANK",
      "prediction": "UP",
      "confidence": 71.3,
      "expected_move": "+1.05%",
      "current_price": 1742.50,
      "signals": ["RSI neutral (52.3)", "EMA bullish crossover (9 > 21)"],
      "model_used": "xgboost",
      "timestamp": "2026-05-07T15:00:00"
    }
```
    """
    try:
        svc = get_prediction_service()
        result = await svc.predict(symbol.upper(), model_type=model)
        return result

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")


@router.get("/{symbol}/models")
async def get_available_models(
    symbol: str,
    user=Depends(get_current_user),
):
    """Check which models are trained for a symbol."""
    import os
    model_dir = 'app/services/ml/trained_models'
    sym = symbol.upper()

    return {
        "symbol":           sym,
        "xgboost_trained":  os.path.exists(f"{model_dir}/xgboost_{sym}.json"),
        "lstm_trained":     os.path.exists(f"{model_dir}/lstm_{sym}.keras"),
        "scaler_available": os.path.exists(f"{model_dir}/scaler_{sym}.pkl"),
        "note": (
            "If a model is not trained it will be auto-trained on the first "
            "prediction request for that symbol."
        ),
    }