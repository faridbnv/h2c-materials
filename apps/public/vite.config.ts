// Vite 8 multi-page build of the public view. Relative base by default, so one build works under any sub-path
// (pack 02 section 6.3); H2C_BASE sets an absolute one to test a deployment path. The page names its release inline:
// the placeholder in the HTML is replaced with the release identity (remake/tools/release-id.mjs) at build time.
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { releaseIdentity } from '../../remake/tools/release-id.mjs';

const here = (file: string): string => fileURLToPath(new URL(file, import.meta.url));
const release = process.env['H2C_RELEASE'] ?? releaseIdentity().id;

export default defineConfig({
  root: here('.'),
  base: process.env['H2C_BASE'] ?? './',
  plugins: [
    vue(),
    { name: 'h2c-release', transformIndexHtml: (html) => html.replaceAll('__H2C_RELEASE__', release) },
  ],
  // Where a material's own page lives, relative to this view: beside it on the preview and the live site (materials/<id>.html).
  define: { __MATERIAL_PAGES__: JSON.stringify(process.env['H2C_MATERIAL_PAGES'] ?? '../materials/') },
  build: {
    outDir: process.env['H2C_OUT'] ?? here('dist'),
    emptyOutDir: true,
    rollupOptions: { input: { index: here('index.html'), material: here('material.html') } },
  },
});
