export interface PredictionResponse {
  symbol: string;
  prediction: 'UP' | 'DOWN' | 'SIDEWAYS';
  confidence: number;
  expected_move: string;
  current_price: number;
  signals: string[];
  model_used: 'xgboost' | 'lstm';
  timestamp: string;
  model_version: string;
}

export interface AvailableModels {
  symbol: string;
  models: string[];
  scaler_available: boolean;
}

export type ModelType = 'xgboost' | 'lstm';