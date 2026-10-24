// Vite 8 multi-page build of the public view. Relative base by default, so one build works under any sub-path
// (pack 02 section 6.3); H2C_BASE sets an absolute one to test a deployment path. The page names its release inline:
// the placeholder in the HTML is replaced with the release identity (remake/tools/release-id.mjs) at build time, and the
// stale-shell guard (guard.inline.js) is put in beside it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { releaseIdentity } from '../../remake/tools/release-id.mjs';
import { RELOAD_LABEL, STALE_BODY, STALE_HEADING } from './src/stale-copy.ts';

const here = (file: string): string => fileURLToPath(new URL(file, import.meta.url));
const release = process.env['H2C_RELEASE'] ?? releaseIdentity().id;
// The stale-shell guard runs inline in every page (it must run when the page's own scripts cannot); its words come from stale-copy.ts.
const literal = (text: string): string => JSON.stringify(text).replaceAll('<', '\\u003c');
const guard = readFileSync(here('guard.inline.js'), 'utf8')
  .replace(/\/\*[^]*?\*\//g, '') // its comments explain the source; the page does not carry them
  .replace(/^[ \t]*\/\/.*\n/gm, '')
  .replace('__H2C_STALE_HEADING__', () => literal(STALE_HEADING))
  .replace('__H2C_STALE_BODY__', () => literal(STALE_BODY))
  .replace('__H2C_RELOAD__', () => literal(RELOAD_LABEL));

export default defineConfig({
  root: here('.'),
  base: process.env['H2C_BASE'] ?? './',
  plugins: [
    vue(),
    { name: 'h2c-release', transformIndexHtml: (html) => html.replaceAll('__H2C_RELEASE__', release).replace('__H2C_GUARD__', () => guard) },
  ],
  // Where a material's own page lives, relative to this view: beside it on the preview and the live site (materials/<id>.html).
  define: { __MATERIAL_PAGES__: JSON.stringify(process.env['H2C_MATERIAL_PAGES'] ?? '../materials/') },
  build: {
    outDir: process.env['H2C_OUT'] ?? here('dist'),
    emptyOutDir: true,
    rolldownOptions: {
      input: { index: here('index.html'), material: here('material.html') },
      output: {
        // Where the code goes (the strict boot budget, pack 02 section 11). A module that the first screen and a lens both import is emitted whole, with every export
        // either uses, so a lens-only export in a shared module is carried by the first screen: the lens-only pieces are modules of their own and sit in a chunk the
        // first screen never loads (lens-support); and the engine's modules, which the first screen and the lenses share, are one chunk rather than a dozen small ones,
        // which compress badly and each cost a request.
        codeSplitting: { groups: [{ name: 'lens-support', test: /packages\/(engine\/src\/port\/(pareto|coverage-matrix)|pages\/src\/facts\/axis-pairs)\.ts$/, priority: 10 }, { name: 'engine', test: /(packages\/engine\/src\/(?!port\/(workspace|pareto|coverage-matrix))|packages\/pages\/src\/facts\/(registry|axes)\.ts|selector\/templates\.ts)/, priority: 5 }] },
      },
    },
  },
});
