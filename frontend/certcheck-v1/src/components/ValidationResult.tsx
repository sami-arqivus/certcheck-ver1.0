
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Shield, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthenticatedLayout from './AuthenticatedLayout';
import ValidationStatus from './ValidationStatus';
import ConfidenceScore from './ConfidenceScore';
import VerificationDetails from './VerificationDetails';
import CSCSVerificationDialog from './CSCSVerificationDialog';

const ValidationResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Default result in case location.state.result is missing
  const result = location.state?.result || {
    verified: false,
    distance: 1,
    threshold: 0.5,
    model: 'Unknown',
    detector_backend: 'Unknown',
    facial_areas: { img1: {}, img2: {} },
    error: 'No result available'
  };

  // Map backend response to component variables
  const isMatch = result.verified;
  // Calculate confidence as a percentage: lower distance = higher confidence
  const confidence = Math.min(Math.max((1 - result.distance / result.threshold) * 100, 0), 100);
  const message = result.error || (isMatch 
    ? 'Identity verification successful!' 
    : 'Identity verification failed. The images do not match closely enough.');

  const handleStartOver = () => {
    navigate('/upload');
  };

  return (
    <AuthenticatedLayout showDashboard={false}>
      <div className="animate-fade-in">
        <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 relative">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse-glow">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-yellow-400 animate-bounce-subtle" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Validation Result
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <ValidationStatus isMatch={isMatch} message={message} />
            <ConfidenceScore confidence={confidence} />
            <VerificationDetails result={result} />

            {/* Action Buttons */}
            <div className="space-y-3">
              {isMatch ? (
                <Button
                  onClick={() => navigate('/home')}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Take me to Dashboard
                </Button>
              ) : (
                <Button
                  onClick={handleStartOver}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Start New Verification
                </Button>
              )}
            </div>

            {/* Security Note */}
            <div className="text-center text-xs text-gray-400 mt-4 p-3 bg-black/20 rounded-lg border border-white/10">
              <p>🔒 Your biometric data is processed securely and not stored permanently.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default ValidationResult;
