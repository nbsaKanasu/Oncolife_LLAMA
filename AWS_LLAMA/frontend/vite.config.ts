import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    // No explicit define needed for import.meta.env if using standard Vite .env files,
    // but defining process.env for compatibility if needed.
    define: {
      'process.env.AWS_API_URL': JSON.stringify(env.AWS_API_URL)
    }
  };
});