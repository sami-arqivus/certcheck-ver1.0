// import type { CapacitorConfig } from '@capacitor/cli';

// const config: CapacitorConfig = {
//   appId: 'app.certcheck.certcheckv1',
//   appName: 'certcheck-v1',
//   webDir: 'dist',
//   server: {
//     cleartext: true
//   },
//   plugins: {
//     SplashScreen: {
//       launchShowDuration: 2000,
//       backgroundColor: '#000000',
//       showSpinner: false,
//       splashFullScreen: true,
//       splashImmersive: true
//     },
//     StatusBar: {
//       style: 'DARK',
//       backgroundColor: '#000000'
//     }
//   },
//   ios: {
//     contentInset: 'automatic',
//     server: {
//       url: 'http://localhost/login',
//       cleartext: true
//     }
//   },
//   android: {
//     allowMixedContent: true,
//     captureInput: true,
//     server: {
//       url: 'http://10.0.2.2/login',
//       cleartext: true
//     }
//   }
// };

// export default config;



import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.VITE_APP_ENV === 'development';
const protocol = process.env.VITE_SERVER_PROTOCOL || 'https';
const host = process.env.VITE_SERVER_HOST || 'localhost';
const port = process.env.VITE_SERVER_PORT || '443';
const allowCleartext = process.env.VITE_ALLOW_CLEARTEXT === 'true';
const allowMixedContent = process.env.VITE_ALLOW_MIXED_CONTENT === 'true';

const config: CapacitorConfig = {
  appId: 'app.certcheck.certcheckv1',
  appName: 'certcheck-v1',
  webDir: 'dist',  // Matches Vite's build output
  server: {
    cleartext: allowCleartext,  // HTTP allowed in dev, not prod
    ...(isDev ? { url: `${protocol}://${host}:${port}` } : {}),  // Live reload in dev
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
    },
  },
  ios: {
    contentInset: 'automatic',
    ...(isDev ? {
      server: {
        url: `${protocol}://${host}:${port}/login`,  // iOS simulator live reload
        cleartext: allowCleartext,
      },
    } : {}),
  },
  android: {
    allowMixedContent: allowMixedContent,  // Allow in dev, not prod
    captureInput: true,
    ...(isDev ? {
      server: {
        url: `${protocol}://${host}:${port}/login`,  // Android emulator live reload
        cleartext: allowCleartext,
      },
    } : {}),
  },
};

export default config;