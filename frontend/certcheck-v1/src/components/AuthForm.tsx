
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, Shield, Sparkles, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import backgroundImage from '../assets/dashboard-bg.jpg';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if this is login or register based on route
  useEffect(() => {
    setIsLogin(location.pathname === '/login' || location.pathname === '/');
    setIsForgotPassword(location.pathname === '/forgot-password');
  }, [location.pathname]);

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recaptchaToken) {
      toast({
        title: "reCAPTCHA Required",
        description: "Please complete the reCAPTCHA verification",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // const response = await axios.post('/forgot-password/', {
      //   email,
      //   recaptcha_token: recaptchaToken
      // }, {
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      // });

      
      const response = await axios.post('https://localhost/forgot-password/', {
        email,
        recaptcha_token: recaptchaToken
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        toast({
          title: "Reset Email Sent!",
          description: "If an account with this email exists, you'll receive password reset instructions in your email.",
        });
        // Navigate back to login after successful reset request
        navigate('/login');
      }
    } catch (error: any) {
      console.error("Forgot password error:", error.response?.data || error.message);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle forgot password separately
    if (isForgotPassword) {
      return handleForgotPassword(e);
    }
    
    if (!recaptchaToken) {
      toast({
        title: "reCAPTCHA Required",
        description: "Please complete the reCAPTCHA verification",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/user-login' : '/user-register';
      const payload = isLogin
        ? { username: email, password, recaptcha_token: recaptchaToken }
        : { 
            username: email, 
            password, 
            first_name: firstName, 
            last_name: lastName, 
            date_of_birth: dateOfBirth ? format(dateOfBirth, 'yyyy-MM-dd') : '',
            recaptcha_token: recaptchaToken
          };

          // const response = await axios.post(endpoint, payload, {
          //   headers: {
          //     'Content-Type': 'application/json',
          //   },
          // });

      const response = await axios.post(`https://localhost${endpoint}`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200 && response.data.token) {
        login(response.data.token, !isLogin);
        if (isLogin) {
          toast({
            title: "Success!",
            description: "Welcome to CertCheck",
          });
        }
        
        // Check verification status for users
        if (isLogin && response.data.verification_status) {
          console.log("User is verified:", response.data.verification_status);
          console.log("Navigating to home page");
          navigate('/home');
        } else {
          navigate('/upload');
        }
      }
    } catch (error: any) {
      console.error("Authentication error:", error.response?.data || error.message);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              CertCheck
            </CardTitle>
            <CardDescription className="text-foreground/80 text-base sm:text-lg px-2 sm:px-0">
              {isForgotPassword 
                ? 'Enter your email to receive password reset instructions' 
                : (isLogin ? 'Welcome back to your verification hub' : 'Join the next generation of identity verification')
              }
            </CardDescription>
            <div className="w-20 h-1 bg-gradient-primary rounded-full mx-auto"></div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {!isLogin && !isForgotPassword && (
              <>
                 <div className="space-y-2">
                   <Label htmlFor="firstName" className="text-foreground font-medium">First Name</Label>
                   <Input
                     id="firstName"
                     type="text"
                     value={firstName}
                     onChange={(e) => setFirstName(e.target.value)}
                     placeholder="Enter your first name"
                     required={!isLogin}
                     className="bg-gradient-card border-border/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30 transition-all duration-300 hover:bg-gradient-card"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="lastName" className="text-foreground font-medium">Last Name</Label>
                   <Input
                     id="lastName"
                     type="text"
                     value={lastName}
                     onChange={(e) => setLastName(e.target.value)}
                     placeholder="Enter your last name"
                     required={!isLogin}
                     className="bg-gradient-card border-border/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30 transition-all duration-300 hover:bg-gradient-card"
                   />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="dateOfBirth" className="text-foreground font-medium">Date of Birth</Label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                       <Button
                         variant="outline"
                         className={cn(
                           "w-full justify-start text-left font-normal bg-gradient-card border-border/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30 transition-all duration-300 hover:bg-gradient-card",
                           !dateOfBirth && "text-muted-foreground"
                         )}
                       >
                         {dateOfBirth ? format(dateOfBirth, "MMMM dd, yyyy") : <span>Pick your date of birth</span>}
                         <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                       </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0 z-50 bg-background border shadow-lg" align="start">
                       <div className="p-3 space-y-3">
                         {/* Year and Month Selection */}
                         <div className="flex gap-2">
                           <Select
                             value={dateOfBirth ? dateOfBirth.getFullYear().toString() : ""}
                             onValueChange={(value) => {
                               const year = parseInt(value);
                               const newDate = dateOfBirth ? new Date(dateOfBirth) : new Date(year, 0, 1);
                               newDate.setFullYear(year);
                               setDateOfBirth(newDate);
                             }}
                           >
                             <SelectTrigger className="w-[100px] bg-background">
                               <SelectValue placeholder="Year" />
                             </SelectTrigger>
                             <SelectContent className="max-h-[200px] bg-background border shadow-lg z-50">
                               {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                 <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           
                           <Select
                             value={dateOfBirth ? dateOfBirth.getMonth().toString() : ""}
                             onValueChange={(value) => {
                               const month = parseInt(value);
                               const newDate = dateOfBirth ? new Date(dateOfBirth) : new Date(2000, month, 1);
                               newDate.setMonth(month);
                               setDateOfBirth(newDate);
                             }}
                           >
                             <SelectTrigger className="w-[120px] bg-background">
                               <SelectValue placeholder="Month" />
                             </SelectTrigger>
                             <SelectContent className="bg-background border shadow-lg z-50">
                               {['January', 'February', 'March', 'April', 'May', 'June', 
                                 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                                 <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </div>
                         
                          {/* Calendar */}
                          <Calendar
                            mode="single"
                            selected={dateOfBirth}
                            onSelect={setDateOfBirth}
                            month={dateOfBirth || new Date(1990, 0)}
                            onMonthChange={(month) => {
                              setDateOfBirth(dateOfBirth ? new Date(dateOfBirth.getFullYear(), month.getMonth(), dateOfBirth.getDate()) : month);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            className="pointer-events-auto"
                          />
                          
                           {/* Okay button */}
                           <div className="flex justify-end pt-2 border-t border-border/20">
                             <Button
                               size="sm"
                               onClick={() => setDatePickerOpen(false)}
                               className="bg-primary hover:shadow-glow text-primary-foreground"
                               disabled={!dateOfBirth}
                             >
                               Okay
                             </Button>
                           </div>
                       </div>
                     </PopoverContent>
                   </Popover>
                 </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="bg-gradient-card border-border/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30 transition-all duration-300 hover:bg-gradient-card"
              />
            </div>
            
            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="bg-gradient-card border-border/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30 pr-12 transition-all duration-300 hover:bg-gradient-card"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            {/* reCAPTCHA */}
            <div className="flex justify-center scale-75 sm:scale-100 origin-center" >
              <ReCAPTCHA
                sitekey="6LdFvmwrAAAAAKpkCBg-CUmt0U75NZD3aGdEW8po"
                onChange={handleRecaptchaChange}
                theme="dark"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:shadow-glow text-primary-foreground font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              disabled={isLoading || !recaptchaToken}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isForgotPassword ? 'Sending reset email...' : (isLogin ? 'Verifying...' : 'Creating account...')}
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  {isForgotPassword ? 'Send Reset Email' : (isLogin ? 'Sign In' : 'Create Account')}
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center space-y-3">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-primary hover:text-primary/80 font-medium transition-all duration-200 hover:underline decoration-2 underline-offset-4"
              >
                ← Back to Sign In
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate(isLogin ? '/register' : '/login')}
                  className="text-primary hover:text-primary/80 font-medium transition-all duration-200 hover:underline decoration-2 underline-offset-4"
                >
                  {isLogin ? "New to CertCheck? Create an account" : "Already verified? Sign in"}
                </button>
                {isLogin && (
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-muted-foreground hover:text-primary font-medium transition-all duration-200 hover:underline decoration-2 underline-offset-4 text-sm"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              🔒 Protected by enterprise-grade encryption
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;
