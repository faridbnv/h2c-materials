// The editor interface is built to static files that the local service serves from an allow-list (server/service.ts). Nothing inline:
// the page's Content-Security-Policy allows scripts and styles from the service's own address only.
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2023',
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
  },
});
