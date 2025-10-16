import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // Load environment variables
  const apiUrl = process.env.VITE_AGENTIC_API_URL || 'http://localhost:3000/api';
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: mode === 'development' ? {
        // Only proxy in development mode
        // Extract the path from the API URL for proxying
        [new URL(apiUrl).pathname]: {
          target: apiUrl.replace(new URL(apiUrl).pathname, ''),
          changeOrigin: true,
        },
      } : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
