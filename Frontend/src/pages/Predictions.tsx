import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Brain,
  AlertCircle,
  Sparkles,
  Info,
  Clock,
} from 'lucide-react';
import { PredictionService } from '../services/predictionService';
import { PredictionResponse, ModelType } from '../types/prediction';
import { PredictionCard } from '../components/PredictionCard';
import { SignalsList } from '../components/SignalsList';

const popularSymbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'WIPRO', 'BAJFINANCE'];

export const Predictions: React.FC = () => {
  const [symbol, setSymbol]           = useState('RELIANCE');
  const [model, setModel]             = useState<ModelType>('xgboost');
  const [prediction, setPrediction]   = useState<PredictionResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // {xgboost_trained, lstm_trained} from /models endpoint
  const [modelStatus, setModelStatus] = useState<{
    xgboost_trained: boolean;
    lstm_trained: boolean;
  } | null>(null);

  // ── fetch model availability ────────────────────────────────────────────────
  const checkModels = async (sym: string) => {
    try {
      const res = await PredictionService.getAvailableModels(sym.toUpperCase());
      // backend returns { xgboost_trained, lstm_trained, ... }
      setModelStatus({
        xgboost_trained: (res as any).xgboost_trained ?? res.models?.includes('xgboost') ?? false,
        lstm_trained:    (res as any).lstm_trained    ?? res.models?.includes('lstm')    ?? false,
      });
    } catch {
      setModelStatus(null);
    }
  };

  useEffect(() => {
    if (symbol.trim().length > 1) checkModels(symbol);
  }, [symbol]);

  // ── fetch prediction ────────────────────────────────────────────────────────
  const fetchPrediction = async () => {
    if (!symbol.trim()) { setError('Please enter a symbol'); return; }

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const result = await PredictionService.getPrediction(symbol.toUpperCase(), model);
      setPrediction(result);
      // refresh model status after a possible auto-train
      checkModels(symbol);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prediction');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchPrediction();
  };

  // is this the first-ever prediction for this symbol (model not yet trained)?
  const isFirstTrain =
    model === 'xgboost' && modelStatus !== null && !modelStatus.xgboost_trained;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Predictions</h1>
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
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">How it works</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Our AI analyzes 40+ features including RSI, EMA, MACD, price action, volume patterns,
                and market microstructure to predict the next 10 candles (~50 minutes).
                <strong> New symbols are auto-trained on first request (~15–30 s).</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Symbol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stock Symbol
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., HDFCBANK"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AI Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as ModelType)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="xgboost">XGBoost — fast, auto-trains any symbol</option>
                <option value="lstm">LSTM — deep learning, must be pre-trained</option>
              </select>
            </div>

            {/* Button */}
            <div className="flex items-end">
              <button
                onClick={fetchPrediction}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {isFirstTrain ? 'Training model…' : 'Analyzing…'}
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
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Popular:</p>
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

          {/* Model status badges */}
          {modelStatus !== null && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 flex-wrap text-xs">
              <span className={`px-2 py-1 rounded-full font-medium ${
                modelStatus.xgboost_trained
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
              }`}>
                XGBoost: {modelStatus.xgboost_trained ? '✓ trained' : '⚡ will auto-train'}
              </span>
              <span className={`px-2 py-1 rounded-full font-medium ${
                modelStatus.lstm_trained
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                LSTM: {modelStatus.lstm_trained ? '✓ trained' : '✗ not trained'}
              </span>
            </div>
          )}
        </div>

        {/* First-train notice */}
        {loading && isFirstTrain && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-pulse" />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  First-time training for {symbol}
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-0.5">
                  Fetching 200 days of data and training XGBoost model. This takes ~15–30 seconds.
                  Future predictions for this symbol will be instant.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">Prediction Failed</h3>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {prediction && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <PredictionCard prediction={prediction} />
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <SignalsList signals={prediction.signals} />
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

        {/* Empty state */}
        {!prediction && !loading && !error && (
          <div className="text-center py-16">
            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No Prediction Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              Enter any NSE symbol and click "Get Prediction"
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Predictions;