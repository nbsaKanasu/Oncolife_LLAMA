import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Securely pass environment variables to the client
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.AWS_API_URL': JSON.stringify(env.AWS_API_URL)
    }
  };
});