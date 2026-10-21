// Build the public view: the data of one release from the engine, then the Vite site, into one folder that can be served
// from any sub-path (npm run build:next, or the preview's assembly step).
//
//   node apps/public/tools/build.ts [--out DIR] [--base BASE] [--material-pages URL]
//
// --base is Vite's base: relative ('./') by default; an absolute one (/h2c-material-temp-page/v3/) is for testing a deployment path.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { build } from 'vite';
import { releaseIdentity } from '../../../remake/tools/release-id.mjs';
import { isMain } from '../../../remake/tools/wp-lib.mjs';
import type { Counts } from '../src/model.ts';
import { TEMPLATE_NAME, makeData } from './make-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..', '..');

export interface BuildOptions {
  readonly outDir: string;
  /** Vite's base. Relative by default. */
  readonly base?: string | undefined;
  /** Where a material's own page lives, relative to the view. */
  readonly materialPages?: string | undefined;
}

export interface Built { readonly release: string; readonly outDir: string; readonly counts: Counts }

export async function buildSite(options: BuildOptions): Promise<Built> {
  const outDir = resolve(options.outDir);
  const identity = releaseIdentity(root);
  const made = await makeData(root, identity);

  // The Vite config reads these; a setting left over from an earlier build in this process must not leak into this one.
  const settings = { H2C_RELEASE: identity.id, H2C_OUT: outDir, H2C_MATERIAL_PAGES: options.materialPages, H2C_BASE: options.base };
  for (const [name, value] of Object.entries(settings)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  await build({ configFile: join(here, '..', 'vite.config.ts'), logLevel: 'warn' });

  const dataDir = join(outDir, 'data', identity.id);
  for (const [path, text] of made.files) {
    mkdirSync(dirname(join(dataDir, path)), { recursive: true });
    writeFileSync(join(dataDir, path), text);
  }
  // For tools and the smoke test; the page never reads it.
  writeFileSync(join(outDir, 'release.json'), JSON.stringify({
    release: identity.id, runtime: identity.runtime, template: TEMPLATE_NAME,
    counts: made.output.counts, dataFiles: made.files.size, reconstruction: made.reconstruction,
  }, null, 2) + '\n');
  return { release: identity.id, outDir, counts: made.output.counts };
}

if (isMain(import.meta.url)) {
  const { values } = parseArgs({ options: { out: { type: 'string', default: join(here, '..', 'dist') }, base: { type: 'string' }, 'material-pages': { type: 'string' } } });
  const t0 = performance.now();
  buildSite({ outDir: values.out, base: values.base, materialPages: values['material-pages'] }).then((built) => {
    const c = built.counts;
    console.log(`public view: release ${built.release}, ${c.pass} meet, ${c.fail} fail, ${c.unknown} unsettled of ${c.total}; ${((performance.now() - t0) / 1000).toFixed(1)} s -> ${built.outDir}`);
  }, (error: unknown) => {
    console.error(`build:next failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
