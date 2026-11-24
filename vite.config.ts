import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Served from https://<owner>.github.io/<repo>/ : every path is relative.
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 2000 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      manifest: {
        name: 'فاعل خير',
        short_name: 'فاعل خير',
        lang: 'ar',
        dir: 'rtl',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f3dfb4',
        theme_color: '#f3dfb4',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-180.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        // Precache every file so the game runs with no connection after the first load.
        globPatterns: ['**/*.{js,css,html,json,webp,png,jpg,svg,woff2,m4a,txt}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [],
      },
    }),
  ],
});
