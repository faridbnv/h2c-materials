// Bundle: one self-contained HTML file.
//
// No CDN at runtime, per guardrail 10: the selector must work from a local file, a shared drive or
// static hosting, offline, after distribution. Dependency versions are pinned in package.json.
//
// The compiled database is embedded gzipped and base64-encoded, then inflated at boot with
// DecompressionStream. Raw it is 3 MB, almost all of it repeated condition strings; gzipped it is
// under 200 KB. The library, not the data, is what costs size here.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build as esbuild } from 'esbuild';

const escapeForScript = (s) => s.replace(/<\/script/gi, '<\\/script');

async function bundleApp(appRoot) {
  const result = await esbuild({
    entryPoints: [join(appRoot, 'js/main.js')],
    bundle: true, format: 'iife', target: ['es2022'], minify: true,
    write: false, legalComments: 'none',
    // Plotly is provided as a global by the inlined library above this script.
    define: {},
  });
  return result.outputFiles[0].text;
}

export async function bundle({ projectRoot, buildRoot, db, reference, meta }) {
  const appRoot = join(projectRoot, 'app');
  const html = readFileSync(join(appRoot, 'index.html'), 'utf8');
  const css = readFileSync(join(appRoot, 'css/app.css'), 'utf8');
  const plotly = readFileSync(join(buildRoot, 'node_modules/plotly.js-dist-min/plotly.min.js'), 'utf8');
  const app = await bundleApp(appRoot);

  const pack = (obj) => gzipSync(Buffer.from(JSON.stringify(obj), 'utf8'), { level: 9 }).toString('base64');

  // Always replace with a FUNCTION, never a string. A string replacement interprets $&, $`, $'
  // and $1 as substitution patterns, and minified library source is full of such sequences.
  // Passing the payload as a string here scatters the matched placeholder through the output.
  const put = (haystack, needle, replacement) => {
    if (!haystack.includes(needle)) throw new Error(`bundle: placeholder not found: ${needle}`);
    return haystack.replace(needle, () => replacement);
  };

  let out = html;
  out = put(out, '<link rel="stylesheet" href="css/app.css">', `<style>\n${css}\n</style>`);
  out = put(out, '<script src="js/main.js" type="module"></script>', [
    `<script type="application/octet-stream" id="db-data" data-encoding="gzip+base64">${pack(db)}</script>`,
    `<script type="application/octet-stream" id="reference-data" data-encoding="gzip+base64">${pack(reference)}</script>`,
    `<script>${escapeForScript(plotly)}</script>`,
    `<script>${escapeForScript(app)}</script>`,
  ].join('\n'));
  out = put(out, '<title>H2C Material Selector</title>',
    `<title>H2C Material Selector</title>\n<meta name="generator" content="H2C selector build ${meta.build}, database snapshot ${meta.snapshot}">`);

  // The placeholder must be gone exactly once, and no fragment of it may survive anywhere.
  if (out.includes('js/main.js') || out.includes('css/app.css')) {
    throw new Error('bundle: a source path survived into the output, so a replacement misfired');
  }

  const name = `H2C_Material_Selector_${meta.snapshot}.html`;
  mkdirSync(join(projectRoot, 'dist'), { recursive: true });
  const path = join(projectRoot, 'dist', name);
  writeFileSync(path, out);
  return { path, bytes: Buffer.byteLength(out) };
}
