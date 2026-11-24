import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// changeOrigin desligado: o Host original precisa chegar à API, que o compara
// com o Origin das requisições para se defender de CSRF.
const apiProxy = {
  '/api': { target: 'http://localhost:3000', changeOrigin: false },
  '/socket.io': { target: 'http://localhost:3000', changeOrigin: false, ws: true },
};

export default defineConfig({
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // A API e o socket nunca devem cair no fallback da casca do app.
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],
      },
      manifest: {
        name: 'Food Stack',
        short_name: 'Food Stack',
        theme_color: '#ea580c',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
});
