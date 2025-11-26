import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Removing 'resolve.alias' to rely on standard relative paths (./ and ../)
  // This prevents issues with Node types or misconfigured aliases in certain environments.
});