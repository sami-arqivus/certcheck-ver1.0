import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Shield, Sparkles, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import backgroundImage from '../assets/dashboard-bg.jpg';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      // Validate token on component mount
      validateToken(tokenFromUrl);
    } else {
      toast({
        title: "Invalid Reset Link",
        description: "No reset token found in the URL",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [searchParams, navigate, toast]);

  const validateToken = async (resetToken: string) => {
    try {
      const response = await axios.get(`https://localhost/validate-reset-token?token=${resetToken}`);
      // const response = await axios.get(`/validate-reset-token?token=${resetToken}`);
      if (response.data.valid) {
        setIsValidToken(true);
      } else {
        setIsValidToken(false);
        toast({
          title: "Invalid or Expired Link",
          description: "This password reset link is invalid or has expired. Please request a new one.",
          variant: "destructive",
        });
        setTimeout(() => navigate('/forgot-password'), 3000);
      }
    } catch (error: any) {
      console.error("Token validation error:", error);
      setIsValidToken(false);
      toast({
        title: "Invalid Reset Link",
        description: "Unable to validate reset token",
        variant: "destructive",
      });
      setTimeout(() => navigate('/forgot-password'), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        title: "Error",
        description: "No reset token found",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirm password do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // const response = await axios.post('/api/reset-password/', {
      //   token: token,
      //   new_password: newPassword
      // }, {
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      // });
      
      const response = await axios.post('https://localhost/api/reset-password/', {
        token: token,
        new_password: newPassword
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        toast({
          title: "Password Reset Successful!",
          description: "Your password has been updated successfully. You can now log in with your new password.",
        });
        
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error: any) {
      console.error("Password reset error:", error.response?.data || error.message);
      toast({
        title: "Reset Failed",
        description: error.response?.data?.detail || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while validating token
  if (isValidToken === null) {
    return (
      <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden safe-area-all"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm"></div>
        <Card className="w-full max-w-md mx-auto shadow-elegant bg-gradient-card backdrop-blur-xl border-border/20 relative z-10">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-foreground/80">Validating reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render form if token is invalid
  if (!isValidToken) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden safe-area-all"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm"></div>
        <Card className="w-full max-w-md mx-auto shadow-elegant bg-gradient-card backdrop-blur-xl border-border/20 relative z-10">
          <CardContent className="text-center p-8 space-y-4">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Invalid Reset Link</h2>
            <p className="text-foreground/80">This password reset link is invalid or has expired.</p>
            <Button 
              onClick={() => navigate('/forgot-password')}
              className="bg-gradient-primary hover:shadow-glow text-primary-foreground"
            >
              Request New Reset Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden safe-area-all"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm"></div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-primary/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      <Card className="w-full max-w-md mx-auto shadow-elegant bg-gradient-card backdrop-blur-xl border-border/20 animate-fade-in relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto mb-4 relative">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-primary animate-bounce" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Reset Password
            </CardTitle>
            <CardDescription className="text-foreground/80 text-base sm:text-lg px-2 sm:px-0">
              Enter your new password below
            </CardDescription>
            <div className="w-20 h-1 bg-gradient-primary rounded-full mx-auto"></div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-foreground font-medium">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  minLength={8}
                  className="bg-gradient-card border-border/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30 pr-12 transition-all duration-300 hover:bg-gradient-card"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  minLength={8}
                  className={cn(
                    "bg-gradient-card border-border/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30 pr-12 transition-all duration-300 hover:bg-gradient-card",
                    confirmPassword && newPassword && newPassword !== confirmPassword && "border-destructive focus:border-destructive",
                    confirmPassword && newPassword && newPassword === confirmPassword && "border-green-500 focus:border-green-500"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                {confirmPassword && newPassword && newPassword === confirmPassword && (
                  <CheckCircle className="absolute right-10 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
              </div>
              {confirmPassword && newPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:shadow-glow text-primary-foreground font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-foreground/80 hover:text-foreground transition-colors duration-200"
              >
                Back to Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;