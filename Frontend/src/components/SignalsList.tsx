import React from 'react';
import { TrendingUp, TrendingDown, Activity, Volume2 } from 'lucide-react';

interface SignalsListProps {
  signals: string[];
}

export const SignalsList: React.FC<SignalsListProps> = ({ signals }) => {
  const getIcon = (signal: string) => {
    if (signal.toLowerCase().includes('bullish') || signal.toLowerCase().includes('uptrend')) {
      return <TrendingUp className="w-5 h-5 text-green-500" />;
    }
    if (signal.toLowerCase().includes('bearish') || signal.toLowerCase().includes('downtrend')) {
      return <TrendingDown className="w-5 h-5 text-red-500" />;
    }
    if (signal.toLowerCase().includes('volume')) {
      return <Volume2 className="w-5 h-5 text-blue-500" />;
    }
    return <Activity className="w-5 h-5 text-gray-500" />;
  };

  const getSignalColor = (signal: string) => {
    if (signal.toLowerCase().includes('bullish') || signal.toLowerCase().includes('uptrend')) {
      return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
    }
    if (signal.toLowerCase().includes('bearish') || signal.toLowerCase().includes('downtrend')) {
      return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
    }
    return 'border-l-gray-500 bg-gray-50 dark:bg-gray-800/50';
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Trading Signals
      </h3>
      
      {signals.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No signals available
        </p>
      ) : (
        <div className="space-y-2">
          {signals.map((signal, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${getSignalColor(signal)}`}
            >
              <div className="mt-0.5">
                {getIcon(signal)}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                {signal}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};