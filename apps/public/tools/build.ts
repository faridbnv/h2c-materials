// Build the public view: the data of one release from the engine, then the Vite site, into one folder that can be served
// from any sub-path (npm run build:next, or the preview's assembly step).
//
//   node apps/public/tools/build.ts [--out DIR] [--base BASE] [--material-pages URL] [--selector-stub NAME]... [--pages]
//
// --base is Vite's base: relative ('./') by default; an absolute one (/h2c-material-temp-page/v3/) is for testing a deployment path.
// --pages renders the material pages (packages/pages) from the same database into <out>/materials/.
// --selector-stub NAME writes a redirect stub under that old release-stamped selector name (H2C_Material_Selector_<date>_<id>.html).
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { build } from 'vite';
import { releaseIdentity } from '../../../remake/tools/release-id.mjs';
import { writeStubs } from '../../../remake/tools/site-pages.mjs';
import { isMain } from '../../../remake/tools/wp-lib.mjs';
import type { Counts } from '../src/model.ts';
import { REQUIRES } from '../src/parts.ts';
import { TEMPLATE_NAME, makeData } from './make-data.ts';
import type { DatabaseSource } from './make-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..', '..');

export interface BuildOptions {
  readonly outDir: string;
  /** Vite's base. Relative by default. */
  readonly base?: string | undefined;
  /** Where a material's own page lives, relative to the view. */
  readonly materialPages?: string | undefined;
  /** Old release-stamped selector names to leave a redirect stub under. */
  readonly selectorStubs?: readonly string[] | undefined;
  /** The database the parts are cut from: the new build's (the default), or the old build's dist/db.json, for the browser suite's same-data check. */
  readonly database?: DatabaseSource | undefined;
  /** Render the material pages (packages/pages) from the same new-build database the parts are cut from, into <outDir>/materials/. New database only. */
  readonly pages?: boolean | undefined;
}

export interface Built { readonly release: string; readonly outDir: string; readonly counts: Counts }

/** The material pages of a compiled database, by the page renderer's own CLI, into <outDir>/materials/. They link to the selector at its stable address (../). */
function renderMaterialPages(db: object, outDir: string): void {
  const scratch = mkdtempSync(join(tmpdir(), 'h2c-view-pages-'));
  try {
    const dbPath = join(scratch, 'db.json');
    writeFileSync(dbPath, JSON.stringify(db));
    const run = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', join(root, 'packages/pages/src/cli.ts'), '--db', dbPath, '--out', join(scratch, 'site')], { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
    if (run.status !== 0) throw new Error(`the material pages did not render (exit ${String(run.status)})`);
    if (!existsSync(join(scratch, 'site', 'materials'))) throw new Error('the page renderer wrote no materials folder');
    cpSync(join(scratch, 'site', 'materials'), join(outDir, 'materials'), { recursive: true });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export async function buildSite(options: BuildOptions): Promise<Built> {
  const outDir = resolve(options.outDir);
  const identity = releaseIdentity(root);
  const made = await makeData(root, identity, options.database ?? 'new');

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
  if (options.pages) {
    if (made.pagesDb === null) throw new Error('--pages needs the new build\'s database (the default)');
    renderMaterialPages(made.pagesDb, outDir);
  }
  if (options.selectorStubs?.length) writeStubs(outDir, { selectorNames: options.selectorStubs });
  // For tools and the smoke test; the page never reads it (it knows what its modes need: src/parts.ts).
  writeFileSync(join(outDir, 'release.json'), JSON.stringify({
    release: identity.id, runtime: identity.runtime, template: TEMPLATE_NAME,
    counts: made.output.counts, dataFiles: made.files.size, reconstruction: made.reconstruction,
    files: made.parts.files, requires: REQUIRES,
    // The chunks this build made, so that a deploy can keep exactly these for a page cached before the next one (preview-assemble stage).
    assets: readdirSync(join(outDir, 'assets')).sort(),
  }, null, 2) + '\n');
  return { release: identity.id, outDir, counts: made.output.counts };
}

if (isMain(import.meta.url)) {
  const { values } = parseArgs({ options: { out: { type: 'string', default: join(here, '..', 'dist') }, base: { type: 'string' }, 'material-pages': { type: 'string' }, 'selector-stub': { type: 'string', multiple: true }, database: { type: 'string' }, pages: { type: 'boolean' } } });
  if (values.database !== undefined && values.database !== 'new' && values.database !== 'old') throw new Error(`--database takes new or old, not "${values.database}"`);
  const t0 = performance.now();
  buildSite({ outDir: values.out, base: values.base, materialPages: values['material-pages'], selectorStubs: values['selector-stub'], database: values.database, pages: values.pages }).then((built) => {
    const c = built.counts;
    console.log(`public view: release ${built.release}, ${c.pass} meet, ${c.fail} fail, ${c.unknown} unsettled of ${c.total}; ${((performance.now() - t0) / 1000).toFixed(1)} s -> ${built.outDir}`);
  }, (error: unknown) => {
    console.error(`build:next failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
