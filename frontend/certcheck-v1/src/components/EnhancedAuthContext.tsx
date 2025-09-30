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

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  verification_status?: number;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (tokens: TokenResponse, isNewRegistration?: boolean) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  isLoading: boolean;
  expiringCards: ExpiringCard[];
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getTokenExpiry = (token: string): number => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch {
    return 0;
  }
};

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

const refreshAccessToken = async (refreshToken: string): Promise<TokenResponse> => {
  const response = await apiClient.post('/refresh-token', {
    refresh_token: refreshToken
  });
  return response.data;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('access_token')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('refresh_token')
  );
  const [expiringCards, setExpiringCards] = useState<ExpiringCard[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery<User, Error>({
    queryKey: ['user', accessToken],
    queryFn: () => fetchUser(accessToken!),
    enabled: !!accessToken,
    retry: false,
    meta: {
      onError: (error: any) => {
        if (error.response?.status === 401) {
          // Try to refresh token
          if (refreshToken) {
            refreshAccessToken().then((success) => {
              if (!success) {
                toast({
                  title: 'Session Expired',
                  description: 'Your session has expired. Please log in again.',
                  variant: 'destructive',
                });
                logout();
              }
            });
          } else {
            toast({
              title: 'Session Expired',
              description: 'Your session has expired. Please log in again.',
              variant: 'destructive',
            });
            logout();
          }
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
    queryKey: ['expiry-check', accessToken],
    queryFn: () => checkExpiryDates(accessToken!),
    enabled: !!accessToken && !!user,
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

  const refreshAccessToken = async (): Promise<boolean> => {
    if (!refreshToken) return false;
    
    try {
      const tokens = await refreshAccessToken(refreshToken);
      
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
      
      setAccessToken(tokens.access_token);
      setRefreshToken(tokens.refresh_token);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return false;
    }
  };

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!accessToken) return;

    const tokenExpiry = getTokenExpiry(accessToken);
    const refreshTime = tokenExpiry - 5 * 60 * 1000; // 5 minutes before expiry

    if (refreshTime > Date.now()) {
      const timeout = setTimeout(() => {
        refreshAccessToken();
      }, refreshTime - Date.now());

      return () => clearTimeout(timeout);
    }
  }, [accessToken]);

  // API interceptor for automatic token refresh
  useEffect(() => {
    const interceptor = apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && refreshToken) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            // Retry the original request
            return apiClient.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => apiClient.interceptors.response.eject(interceptor);
  }, [refreshToken]);

  const login = (tokens: TokenResponse, isNewRegistration?: boolean) => {
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    setAccessToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);
    
    if (isNewRegistration) {
      toast({
        title: "Welcome to CertCheck!!!",
        description: "Let's get you verified!",
      });
    }
  };

  const logout = async () => {
    // Call logout endpoint to blacklist token
    if (accessToken) {
      try {
        await apiClient.post('/logout', {}, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setRefreshToken(null);
    queryClient.invalidateQueries({ queryKey: ['user'] });
    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully.',
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      accessToken, 
      refreshToken, 
      login, 
      logout, 
      refreshAccessToken, 
      isLoading, 
      expiringCards 
    }}>
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
