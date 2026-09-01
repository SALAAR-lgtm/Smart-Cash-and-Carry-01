import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // host 0.0.0.0 is REQUIRED — it lets Qasim's phone reach this dev server
    // over Tailscale at http://100.98.5.62:5173
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/images': 'http://localhost:4000',
    },
  },
});
