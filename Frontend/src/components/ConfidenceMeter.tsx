import React from 'react';

interface ConfidenceMeterProps {
  confidence: number; // 0-100
  prediction: 'UP' | 'DOWN' | 'SIDEWAYS';
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ 
  confidence, 
  prediction 
}) => {
  const getColor = () => {
    if (prediction === 'UP') return '#10b981'; // green
    if (prediction === 'DOWN') return '#ef4444'; // red
    return '#6b7280'; // gray
  };

  const getLabel = () => {
    if (confidence >= 80) return 'Very High';
    if (confidence >= 60) return 'High';
    if (confidence >= 40) return 'Moderate';
    return 'Low';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Confidence
        </span>
        <span className="text-sm font-bold" style={{ color: getColor() }}>
          {confidence.toFixed(1)}% - {getLabel()}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div
          className="h-3 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${confidence}%`,
            backgroundColor: getColor(),
          }}
        />
      </div>
    </div>
  );
};