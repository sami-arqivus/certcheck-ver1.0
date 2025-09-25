
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ValidationStatusProps {
  isMatch: boolean;
  message: string;
}

const ValidationStatus = ({ isMatch, message }: ValidationStatusProps) => {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        {isMatch ? (
          <CheckCircle className="w-20 h-20 text-green-400 animate-bounce-subtle" />
        ) : (
          <XCircle className="w-20 h-20 text-red-400 animate-pulse" />
        )}
      </div>
      
      <h2 className={`text-3xl font-bold mb-2 ${
        isMatch ? 'text-green-400' : 'text-red-400'
      }`}>
        {isMatch ? 'MATCH' : 'NO MATCH'}
      </h2>
      
      <p className="text-gray-300 text-lg">
        {message}
      </p>
    </div>
  );
};

export default ValidationStatus;
