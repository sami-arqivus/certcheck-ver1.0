import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';    
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';


interface User {
  id: string;
  firstName: string;
  lastName: string;
  employeeid: string;
  email: string;
  dateOfBirth: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = Cookies.get('certcheck_token');
    const storedUser = Cookies.get('certcheck_user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        Cookies.remove('certcheck_token');
        Cookies.remove('certcheck_user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await axios.post('https://54.159.160.253/admin-login', {
        username : email,
        password,
      });

      // const response = await axios.post('/admin-login', {
      //   username : email,
      //   password,
      // });
      
      const token = response.data.token;
      const user = {
        id: response.data.admin_id,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        employeeid: response.data.employee_id,
        email: response.data.email,
        dateOfBirth: response.data.date_of_birth,
      };
      // const { token, user } = response.data;
      
      console.log('Login response:', response.data);
      // console.log('Parsed user:', user);
      console.log('name:', user.firstName, user.lastName);
      console.log('Parsed token:', token);
      // Store in cookies
      Cookies.set('certcheck_token', token, { expires: 7 });
      Cookies.set('certcheck_user', JSON.stringify(user), { expires: 7 });
      
      setToken(token);
      setUser(user);
      
      toast({
        title: "Login Successful",
        description: "Welcome to CertCheck Admin Dashboard",
      });
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: "Invalid credentials or server error",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    Cookies.remove('certcheck_token');
    Cookies.remove('certcheck_user');
    setToken(null);
    setUser(null);
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
  };

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};