import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login, isLoading, user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [captchaValue, setCaptchaValue] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaValue) {
      alert('Please complete the CAPTCHA');
      return;
    }

    setLoginLoading(true);
    const success = await login(formData.email, formData.password);
    setLoginLoading(false);
    
    if (success) {
      // Navigation will be handled by the auth context
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-gradient-card shadow-admin-lg border-0">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-admin-glow">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                CertCheck Admin
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Sign in to access the admin dashboard
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@certcheck.com"
                  className="h-11 bg-background border-border focus:border-admin-accent focus:ring-admin-accent/20"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="h-11 bg-background border-border focus:border-admin-accent focus:ring-admin-accent/20 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-center">
                <ReCAPTCHA
                  sitekey="6LdFvmwrAAAAAKpkCBg-CUmt0U75NZD3aGdEW8po"
                  onChange={setCaptchaValue}
                  theme="light"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-primary hover:opacity-90 text-white font-medium shadow-admin-md hover:shadow-admin-lg transition-all duration-200"
                disabled={loginLoading || isLoading}
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;