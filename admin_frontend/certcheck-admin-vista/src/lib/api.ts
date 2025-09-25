import axios from 'axios';

// Get API base URL from environment variables
const getBaseURL = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Use environment variable if available, otherwise use current origin
    const envApiUrl = import.meta.env.VITE_API_URL;
    if (envApiUrl) {
      return envApiUrl;
    }
    
    // Fallback to current origin for relative URLs
    return window.location.origin;
  }
  
  // Server-side fallback
  return import.meta.env.VITE_API_URL || 'https://54.159.160.253';
};

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('certcheck_token') || 
                   document.cookie
                     .split('; ')
                     .find(row => row.startsWith('certcheck_token='))
                     ?.split('=')[1];
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      if (typeof window !== 'undefined') {
        localStorage.removeItem('certcheck_token');
        localStorage.removeItem('certcheck_user');
        document.cookie = 'certcheck_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'certcheck_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
