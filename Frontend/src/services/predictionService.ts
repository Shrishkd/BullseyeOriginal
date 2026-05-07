import { PredictionResponse, AvailableModels, ModelType } from '../types/prediction';

const API_BASE_URL = 'http://localhost:8000/api';

export class PredictionService {
  private static getAuthToken(): string {
    return localStorage.getItem('bullseye_token') || '';  
  }

  private static getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`,
    };
  }

  /**
   * Get AI prediction for a symbol
   */
  static async getPrediction(
    symbol: string, 
    model: ModelType = 'xgboost'
  ): Promise<PredictionResponse> {
    const response = await fetch(
      `${API_BASE_URL}/predict/${symbol}?model=${model}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get prediction');
    }

    return response.json();
  }

  /**
   * Check available models for a symbol
   */
  static async getAvailableModels(symbol: string): Promise<AvailableModels> {
    const response = await fetch(
      `${API_BASE_URL}/predict/${symbol}/models`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch available models');
    }

    return response.json();
  }
}