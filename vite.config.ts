import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// A short version stamp shown in the parents' corner, so we can tell which
// build a phone is running.
function buildStamp(): string {
  let sha = (process.env.GITHUB_SHA || '').slice(0, 7);
  if (!sha) {
    try { sha = execSync('git rev-parse --short HEAD').toString().trim(); } catch { sha = 'local'; }
  }
  return `${sha} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

// Served from https://<owner>.github.io/<repo>/ : every path is relative.
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(buildStamp()) },
  build: { target: 'es2020', chunkSizeWarningLimit: 2000 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered in src/core/update.ts
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
        // Only Vite's own hashed bundles (assets/index-<hash>.js and .css) may skip
        // revision checks. Art, audio and assets/index.json keep their names when
        // they change, so they need a revision, or installed phones never fetch the
        // new versions (new art showed as magenta boxes, new music never played).
        dontCacheBustURLsMatching: /^assets\/index-[\w-]+\.(js|css)$/,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [],
      },
    }),
  ],
});
