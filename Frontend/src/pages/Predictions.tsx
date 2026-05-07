import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Brain, 
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { PredictionService } from '../services/predictionService';
import { PredictionResponse, ModelType } from '../types/prediction';
import { PredictionCard } from '../components/PredictionCard';
import { SignalsList } from '../components/SignalsList';

export const Predictions: React.FC = () => {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [model, setModel] = useState<ModelType>('xgboost');
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Popular symbols
  const popularSymbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN'];

  // Fetch prediction
  const fetchPrediction = async () => {
    if (!symbol.trim()) {
      setError('Please enter a symbol');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await PredictionService.getPrediction(symbol.toUpperCase(), model);
      setPrediction(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prediction');
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  // Check available models
  const checkAvailableModels = async () => {
    try {
      const models = await PredictionService.getAvailableModels(symbol.toUpperCase());
      setAvailableModels(models.models);
    } catch (err) {
      console.error('Failed to fetch available models:', err);
    }
  };

  // Auto-fetch on symbol change
  useEffect(() => {
    if (symbol) {
      checkAvailableModels();
    }
  }, [symbol]);

  // Handle enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchPrediction();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Predictions
            </h1>
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Get AI-powered market predictions with explainable signals
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                How it works
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Our AI analyzes 40+ features including RSI, EMA, MACD, price action, 
                volume patterns, and market microstructure to predict the next 10 candles 
                (~50 minutes). Predictions are updated in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Symbol Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stock Symbol
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., RELIANCE"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AI Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as ModelType)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="xgboost">XGBoost (Fast & Accurate)</option>
                <option value="lstm">LSTM (Deep Learning)</option>
              </select>
            </div>

            {/* Predict Button */}
            <div className="flex items-end">
              <button
                onClick={fetchPrediction}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    Get Prediction
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Popular Symbols */}
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Popular:
            </p>
            <div className="flex flex-wrap gap-2">
              {popularSymbols.map((sym) => (
                <button
                  key={sym}
                  onClick={() => setSymbol(sym)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full transition-colors"
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Available Models Info */}
          {availableModels.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Available models for {symbol}: {availableModels.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Prediction Failed
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  {error}
                </p>
                {error.includes('Model not trained') && (
                  <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                    💡 Tip: Train the model first using: 
                    <code className="ml-1 px-2 py-0.5 bg-red-100 dark:bg-red-900 rounded">
                      python -m app.services.ml.train_pipeline
                    </code>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Prediction Results */}
        {prediction && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Prediction Card */}
            <div className="lg:col-span-1">
              <PredictionCard prediction={prediction} />
            </div>

            {/* Right: Signals */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <SignalsList signals={prediction.signals} />
                
                {/* Disclaimer */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    ⚠️ Disclaimer: AI predictions are for informational purposes only. 
                    Not financial advice. Past performance doesn't guarantee future results. 
                    Always do your own research before trading.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!prediction && !loading && !error && (
          <div className="text-center py-16">
            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No Prediction Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              Enter a symbol and click "Get Prediction" to see AI analysis
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Predictions;