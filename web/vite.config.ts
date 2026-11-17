import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['halogen-creamlike-likely.ngrok-free.dev'],
    proxy: { '/api': 'http://localhost:3001' },
  },
});
