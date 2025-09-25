import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp, AlertCircle } from 'lucide-react';

const BulkVerify = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileUp className="w-6 h-6 text-primary" />
            <span>Bulk Card Verification</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-12">
            <div className="mb-6">
              <AlertCircle className="h-16 w-16 text-amber-500 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Bulk Verification Temporarily Unavailable
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              The bulk verification feature is currently being updated to resolve authentication issues 
              with the vision API. We're working on a more reliable solution.
            </p>
            <div className="space-y-4">
              <Button
                onClick={() => window.location.href = '/dashboard/verify-card'}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                Use Manual Verification Instead
              </Button>
              <div className="text-sm text-gray-500">
                <p>• Upload one file at a time using the manual verification</p>
                <p>• Results can be downloaded as .txt files</p>
                <p>• Bulk verification will be available in the next update</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkVerify;