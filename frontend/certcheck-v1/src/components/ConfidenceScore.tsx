
import React from 'react';

interface ConfidenceScoreProps {
  confidence: number;
}

const ConfidenceScore = ({ confidence }: ConfidenceScoreProps) => {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex justify-between items-center mb-2">
        <span className="text-white font-medium">Confidence Score</span>
        <span className="text-blue-300 font-bold">{Math.round(confidence)}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div 
          className={`h-3 rounded-full transition-all duration-1000 ${
            confidence >= 70 ? 'bg-green-500' :
            confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  );
};

export default ConfidenceScore;
