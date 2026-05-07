import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { PredictionResponse } from '../types/prediction';
import { ConfidenceMeter } from './ConfidenceMeter';

interface PredictionCardProps {
  prediction: PredictionResponse;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  const getPredictionIcon = () => {
    switch (prediction.prediction) {
      case 'UP':
        return <ArrowUp className="w-12 h-12 text-green-500" />;
      case 'DOWN':
        return <ArrowDown className="w-12 h-12 text-red-500" />;
      case 'SIDEWAYS':
        return <Minus className="w-12 h-12 text-gray-500" />;
    }
  };

  const getPredictionColor = () => {
    switch (prediction.prediction) {
      case 'UP':
        return 'text-green-500';
      case 'DOWN':
        return 'text-red-500';
      case 'SIDEWAYS':
        return 'text-gray-500';
    }
  };

  const getBgColor = () => {
    switch (prediction.prediction) {
      case 'UP':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'DOWN':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'SIDEWAYS':
        return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className={`rounded-xl border-2 p-6 ${getBgColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {prediction.symbol}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ₹{prediction.current_price.toLocaleString('en-IN', { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })}
          </p>
        </div>
        <div className="flex flex-col items-end">
          {getPredictionIcon()}
        </div>
      </div>

      {/* Prediction */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-2">
          <span className={`text-4xl font-bold ${getPredictionColor()}`}>
            {prediction.prediction}
          </span>
          <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            {prediction.expected_move}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Expected movement in next 10 candles (~50 minutes)
        </p>
      </div>

      {/* Confidence Meter */}
      <ConfidenceMeter 
        confidence={prediction.confidence} 
        prediction={prediction.prediction}
      />

      {/* Metadata */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Model: {prediction.model_used.toUpperCase()}</span>
          <span>
            {new Date(prediction.timestamp).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
};