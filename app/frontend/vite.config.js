import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Tailwind v4 uses a Vite plugin — no tailwind.config.js, no postcss.config,
  // no content globs. It scans the source automatically.
  plugins: [react(), tailwindcss()],
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
