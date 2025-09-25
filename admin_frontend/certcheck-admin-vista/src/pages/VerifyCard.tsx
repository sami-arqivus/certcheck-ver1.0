import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { FileText, AlertCircle, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api';
import Cookies from 'js-cookie';

interface ValidationRequest {
  scheme: string;
  registration_number: string;
  last_name: string;
  first_name: string | null;
  expiry_date: string | null;
  hse_tested: boolean | null;
  role: string | null;
}

const VerifyCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [manualDetails, setManualDetails] = useState({
    scheme: '',
    registrationNumber: '',
    lastName: ''
  });
  const [manualLoading, setManualLoading] = useState(false);
  const [taskResult, setTaskResult] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'submitting' | 'processing' | 'completed' | 'failed'>('idle');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Reset verification state when form is cleared
  const resetVerificationState = () => {
    setVerificationStatus('idle');
    setTaskResult(null);
    setCurrentTaskId(null);
  };

  const handleManualSubmit = async () => {
    if (!manualDetails.scheme || !manualDetails.registrationNumber || !manualDetails.lastName) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple submissions
    if (verificationStatus === 'submitting' || verificationStatus === 'processing') {
      return;
    }

    setManualLoading(true);
    setVerificationStatus('submitting');
    setTaskResult(null);
    
    try {
      const token = Cookies.get('certcheck_token');
      const response = await apiClient.post('/tasks_scheduling/admin_validate_cscs_card/', {
        scheme: manualDetails.scheme,
        registration_number: manualDetails.registrationNumber,
        last_name: manualDetails.lastName,
        first_name: null,
        expiry_date: null,
        hse_tested: null,
        role: null
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const { status, task_id, message } = response.data;
      
      if (status === 'SUBMITTED' && task_id) {
        setCurrentTaskId(task_id);
        setVerificationStatus('processing');
        toast({
          title: "Verification Started",
          description: "Validation is in progress. Please wait...",
          variant: "default",
        });
        
        // Poll for results
        await pollForResult(task_id, token);
      } else if (status === 'PENDING') {
        setCurrentTaskId(task_id);
        setVerificationStatus('processing');
        toast({
          title: "Verification Already Running",
          description: message,
          variant: "default",
        });
      } else {
        throw new Error(message || 'Unknown response');
      }

    } catch (error: any) {
      console.error('Failed to submit manual verification:', error);
      setVerificationStatus('failed');
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to submit manual verification.",
        variant: "destructive",
      });
    } finally {
      setManualLoading(false);
    }
  };

  const pollForResult = async (taskId: string, token: string) => {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;
    
    const poll = async (): Promise<void> => {
      try {
        const response = await apiClient.get(`/tasks_scheduling/admin_validate_cscs_card/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const { status, result, message } = response.data;
        
        if (status === 'SUCCESS') {
          setTaskResult(result);
          setVerificationStatus('completed');
          toast({
            title: result.success ? "Verification Successful" : "Verification Failed",
            description: result.success
              ? "Card details verified successfully."
              : result.message || "No active cards found.",
            variant: result.success ? "default" : "destructive",
          });
          
          // Reset form after successful completion
          if (result.success) {
            setManualDetails({
              scheme: '',
              registrationNumber: '',
              lastName: ''
            });
            // Reset verification state after a delay to show success
            setTimeout(() => {
              resetVerificationState();
            }, 3000);
          }
          return;
        } else if (status === 'FAILURE') {
          setVerificationStatus('failed');
          throw new Error(message || 'Task failed');
        } else if (status === 'PENDING' || status === 'RECEIVED' || status === 'STARTED') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000); // Poll every 10 seconds
          } else {
            setVerificationStatus('failed');
            throw new Error('Verification timed out. Please try again.');
          }
        } else {
          setVerificationStatus('failed');
          throw new Error(`Unexpected status: ${status}`);
        }
      } catch (error: any) {
        console.error('Polling error:', error);
        setVerificationStatus('failed');
        toast({
          title: "Error",
          description: error.message || "Failed to get verification result.",
          variant: "destructive",
        });
        setManualLoading(false);
      }
    };
    
    await poll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">Verify Card</h1>
      </div>

      <Card className="bg-gradient-card shadow-admin-md border-0">
        <CardHeader>
          <CardTitle>Card Verification</CardTitle>
          <CardDescription>
            Enter details to verify a card
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" className="w-full">
            <TabsContent value="manual" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheme">Scheme *</Label>
                  <Input
                    id="scheme"
                    value={manualDetails.scheme}
                    onChange={(e) => setManualDetails(prev => ({ ...prev, scheme: e.target.value }))}
                    placeholder="Enter scheme name"
                    disabled={verificationStatus === 'submitting' || verificationStatus === 'processing'}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number *</Label>
                  <Input
                    id="registrationNumber"
                    value={manualDetails.registrationNumber}
                    onChange={(e) => setManualDetails(prev => ({ ...prev, registrationNumber: e.target.value }))}
                    placeholder="Enter registration number"
                    disabled={verificationStatus === 'submitting' || verificationStatus === 'processing'}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={manualDetails.lastName}
                  onChange={(e) => setManualDetails(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter last name"
                  disabled={verificationStatus === 'submitting' || verificationStatus === 'processing'}
                />
              </div>
              
              {/* Status indicator */}
              {verificationStatus !== 'idle' && (
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                  {verificationStatus === 'submitting' && (
                    <>
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      <p className="text-sm text-blue-600">Submitting verification request...</p>
                    </>
                  )}
                  {verificationStatus === 'processing' && (
                    <>
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                      <p className="text-sm text-amber-600">Verification in progress. Please wait...</p>
                    </>
                  )}
                  {verificationStatus === 'completed' && (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <p className="text-sm text-green-600">Verification completed!</p>
                    </>
                  )}
                  {verificationStatus === 'failed' && (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <p className="text-sm text-red-600">Verification failed. Please try again.</p>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-start space-x-2 p-3 bg-muted/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Please ensure all details are accurate. Verification may take a few moments.
                </p>
              </div>
              
              <Button 
                onClick={handleManualSubmit} 
                disabled={verificationStatus === 'submitting' || verificationStatus === 'processing'}
                className="w-full bg-gradient-primary hover:opacity-90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verificationStatus === 'submitting' && (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                )}
                {verificationStatus === 'processing' && (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                )}
                {verificationStatus === 'idle' && "Submit for Verification"}
                {verificationStatus === 'completed' && "Submit for Verification"}
                {verificationStatus === 'failed' && "Try Again"}
              </Button>

              {/* Display task result */}
              {taskResult && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h3 className="text-lg font-semibold">Verification Result</h3>
                  {taskResult.success ? (
                    <div>
                      <p className="text-green-600">Card verification successful!</p>
                      {taskResult.cards_data && (
                        <pre className="mt-2 text-sm text-muted-foreground">
                          {JSON.stringify(taskResult.cards_data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-600">{taskResult.message || "No active cards found."}</p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyCard;