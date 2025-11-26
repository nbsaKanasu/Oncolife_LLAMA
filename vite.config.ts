import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' means load all env vars, regardless of prefix (needed for Vercel's API_KEY).
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Securely pass the API_KEY to the client
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});