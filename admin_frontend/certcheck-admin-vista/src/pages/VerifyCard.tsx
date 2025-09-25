import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
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

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleManualSubmit = async () => {
    if (!manualDetails.scheme || !manualDetails.registrationNumber || !manualDetails.lastName) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setManualLoading(true);
    try {
      const token = Cookies.get('certcheck_token');
      const response = await axios.post('/tasks_scheduling/admin_validate_cscs_card/', {
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

      const { result } = response.data;
      setTaskResult(result);
      toast({
        title: result.success ? "Verification Successful" : "Verification Failed",
        description: result.success
          ? "Card details verified successfully."
          : result.message || "No active cards found.",
        variant: result.success ? "default" : "destructive",
      });

      // Reset form
      setManualDetails({
        scheme: '',
        registrationNumber: '',
        lastName: ''
      });
    } catch (error: any) {
      console.error('Failed to submit manual verification:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to submit manual verification.",
        variant: "destructive",
      });
    } finally {
      setManualLoading(false);
    }
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
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number *</Label>
                  <Input
                    id="registrationNumber"
                    value={manualDetails.registrationNumber}
                    onChange={(e) => setManualDetails(prev => ({ ...prev, registrationNumber: e.target.value }))}
                    placeholder="Enter registration number"
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
                />
              </div>
              
              <div className="flex items-start space-x-2 p-3 bg-muted/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Please ensure all details are accurate. Verification may take a few moments.
                </p>
              </div>
              
              <Button 
                onClick={handleManualSubmit} 
                disabled={manualLoading}
                className="w-full bg-gradient-primary hover:opacity-90 text-white"
              >
                {manualLoading ? "Processing..." : "Submit for Verification"}
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