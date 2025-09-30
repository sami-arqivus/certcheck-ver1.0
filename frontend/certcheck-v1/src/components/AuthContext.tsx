
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  date_of_birth: string;
}

interface ExpiringCard {
  name: string;
  reg_no: string;
  card_type: string;
  date_of_expiration: string;
  scheme_name: string;
  qualifications: string;
}

interface ExpiryCheckResponse {
  cards_data: ExpiringCard[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, isNewRegistration?: boolean) => void;
  logout: () => void;
  isLoading: boolean;
  expiringCards: ExpiringCard[];
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchUser = async (token: string): Promise<User> => {
  console.log('🔍 fetchUser called with token:', token);
  console.log('🔍 Token length:', token.length);
  console.log('🔍 apiClient baseURL:', apiClient.getBaseURL());
  console.log('🔍 Full URL will be:', `${apiClient.getBaseURL()}/user/me`);
  
  try {
    const response = await apiClient.get('/user/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('✅ fetchUser success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ fetchUser error:', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ Error headers:', error.response?.headers);
    throw error;
  }
};

const checkExpiryDates = async (token: string): Promise<ExpiryCheckResponse> => {
  const response = await apiClient.get('/backend/expiry-check/', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [expiringCards, setExpiringCards] = useState<ExpiringCard[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery<User, Error>({
    queryKey: ['user', token],
    queryFn: () => fetchUser(token!),
    enabled: !!token,
    retry: false,
    meta: {
      onError: (error: any) => {
        if (error.response?.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive',
          });
          logout();
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load user data.',
            variant: 'destructive',
          });
        }
      }
    }
  });

  const { data: expiryData } = useQuery<ExpiryCheckResponse, Error>({
    queryKey: ['expiry-check', token],
    queryFn: () => checkExpiryDates(token!),
    enabled: !!token && !!user,
    retry: false,
  });

  useEffect(() => {
    if (expiryData?.cards_data) {
      setExpiringCards(expiryData.cards_data);
      
      if (expiryData.cards_data.length > 0) {
        toast({
          title: 'Cards Expiring Soon!',
          description: `You have ${expiryData.cards_data.length} card${expiryData.cards_data.length > 1 ? 's' : ''} expiring within 60 days. Check notifications for details.`,
          variant: 'destructive',
        });
      }
    }
  }, [expiryData, toast]);

  const login = (newToken: string, isNewRegistration?: boolean) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    
    if (isNewRegistration) {
      toast({
        title: "Welcome to CertCheck!!!",
        description: "Let's get you verified!",
      });
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    queryClient.invalidateQueries({ queryKey: ['user'] });
    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully.',
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, expiringCards }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
