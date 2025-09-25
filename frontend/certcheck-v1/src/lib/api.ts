// import axios from 'axios';
// import { Capacitor } from '@capacitor/core';

// // API client that works across web, iOS, and Android
// class ApiClient {
//   private baseURL: string = '';

//   constructor() {
//     this.initializeBaseURL();
//   }

//   private initializeBaseURL() {
//     // Check if we're in production (EC2)
//     if (import.meta.env.PROD) {
//       this.baseURL = 'http://54.159.160.253';
//       return;
//     }

//     // Development environment - platform specific
//     const platform = Capacitor.getPlatform();
    
//     switch (platform) {
//       case 'android':
//         // Android emulator uses 10.0.2.2 to access host localhost
//         this.baseURL = 'http://10.0.2.2';
//         break;
//       case 'ios':
//         // iOS simulator can use localhost directly
//         this.baseURL = 'http://localhost';
//         break;
//       case 'web':
//       default:
//         // Web browser uses relative URLs or localhost
//         this.baseURL = window.location.protocol + '//' + window.location.host;
//         break;
//     }
//   }

//   getBaseURL(): string {
//     return this.baseURL;
//   }

//   // Create axios instance with proper base URL
//   createAxiosInstance() {
//     return axios.create({
//       baseURL: this.baseURL,
//       timeout: 30000,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });
//   }

//   // Convenience methods for common requests
//   async get(url: string, config?: any) {
//     const axiosInstance = this.createAxiosInstance();
//     return axiosInstance.get(url, config);
//   }

//   async post(url: string, data?: any, config?: any) {
//     const axiosInstance = this.createAxiosInstance();
//     return axiosInstance.post(url, data, config);
//   }

//   async put(url: string, data?: any, config?: any) {
//     const axiosInstance = this.createAxiosInstance();
//     return axiosInstance.put(url, data, config);
//   }

//   async delete(url: string, config?: any) {
//     const axiosInstance = this.createAxiosInstance();
//     return axiosInstance.delete(url, config);
//   }

//   // Get full URL for a given endpoint
//   getFullURL(endpoint: string): string {
//     return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
//   }
// }

// // Export singleton instance
// export const apiClient = new ApiClient();

// // Export default axios instance for backward compatibility
// export default apiClient.createAxiosInstance();




import axios from 'axios';
import { Capacitor } from '@capacitor/core';

class ApiClient {
  private baseURL: string = '';

  constructor() {
    this.initializeBaseURL();
  }

  private initializeBaseURL() {
    // Use environment variable for API URL, fallback to relative path
    const envApiUrl = import.meta.env.VITE_API_URL;

    if (envApiUrl) {
      this.baseURL = envApiUrl;
      return;
    }

    // Fallback logic based on platform
    const platform = Capacitor.getPlatform();

    switch (platform) {
      case 'android':
        // Android emulator uses 10.0.2.2 for host localhost
        this.baseURL = 'https://10.0.2.2';
        break;
      case 'ios':
        // iOS simulator uses localhost
        this.baseURL = 'https://localhost';
        break;
      case 'web':
      default:
        // Web: Use relative path to inherit protocol/host
        this.baseURL = '/';
        break;
    }
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  createAxiosInstance() {
    return axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async get(url: string, config?: any) {
    const axiosInstance = this.createAxiosInstance();
    return axiosInstance.get(url, config);
  }

  async post(url: string, data?: any, config?: any) {
    const axiosInstance = this.createAxiosInstance();
    return axiosInstance.post(url, data, config);
  }

  async put(url: string, data?: any, config?: any) {
    const axiosInstance = this.createAxiosInstance();
    return axiosInstance.put(url, data, config);
  }

  async delete(url: string, config?: any) {
    const axiosInstance = this.createAxiosInstance();
    return axiosInstance.delete(url, config);
  }

  getFullURL(endpoint: string): string {
    return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  }
}

export const apiClient = new ApiClient();
export default apiClient.createAxiosInstance();