import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: false,
    // {
    //   host: 'localhost',
    //   protocol: 'ws',
    //   port: 80,
    //   clientPort: 80, // Explicitly set client-side WebSocket port
    //   timeout: 30000, // Increase timeout for WebSocket connection
    //   path: '/hmr',
    // },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild:{
    target:'esnext',
  },
}));
