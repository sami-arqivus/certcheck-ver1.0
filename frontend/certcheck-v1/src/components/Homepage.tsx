import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthenticatedLayout from './AuthenticatedLayout';

const Homepage = () => {
  const navigate = useNavigate();

  return (
    <AuthenticatedLayout>
      <Card className="bg-gradient-card backdrop-blur-md border border-border/20 shadow-elegant max-w-4xl mx-auto">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Welcome to Your Dashboard
          </CardTitle>
          <p className="text-foreground/80">
            Choose from the options below to get started
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Button
              onClick={() => navigate('/certificate')}
              className="h-32 bg-gradient-primary hover:shadow-glow text-primary-foreground flex flex-col items-center justify-center space-y-3 transition-all duration-300 transform hover:scale-105"
            >
              <Upload className="h-8 w-8" />
              <span className="text-lg font-semibold">Upload CSCS card</span>
            </Button>

            <Button
              onClick={() => navigate('/verified-cards')}
              className="h-32 bg-gradient-primary hover:shadow-glow text-primary-foreground flex flex-col items-center justify-center space-y-3 transition-all duration-300 transform hover:scale-105"
            >
              <CreditCard className="h-8 w-8" />
              <span className="text-lg font-semibold">Check Verified Cards</span>
            </Button>

            <Button
              onClick={() => navigate('/updates')}
              className="h-32 bg-gradient-primary hover:shadow-glow text-primary-foreground flex flex-col items-center justify-center space-y-3 transition-all duration-300 transform hover:scale-105"
            >
              <Upload className="h-8 w-8" />
              <span className="text-lg font-semibold">Updates</span>
            </Button>

          </div>
        </CardContent>
      </Card>
    </AuthenticatedLayout>
  );
};

export default Homepage;