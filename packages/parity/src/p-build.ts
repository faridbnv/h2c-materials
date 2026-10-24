// P-build (pack 07 section 5.2): the compiled database, db.json, compared path by path.
//
// This reuses the old `npm run build:diff` (scripts/build-diff.mjs) and never edits it: the same diffJson
// (scripts/data/db-diff.mjs), the same exclusions (meta.build, a date, and meta.release, which names the inputs rather than
// what they built), and the same way of building a second tree, in a temporary copy of the project. What is new is that the
// copy may be fed a different tables directory, so a build can be asked "what do THESE tables compile to?" without touching
// data/tables.
//
// The real data/, schema/, app/ and build/ are only copied FROM. A build that fails is "not computable" for that side, never
// an empty database and never zero.
//
// WP-20 adds the other side: `buildNew` runs the new build (packages/build, which reads the clean SQLite reconstruction of the
// same tables) into a temporary directory. It writes nothing outside that directory, so it needs no copy of the project.
import { spawn } from 'node:child_process';
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { canon } from './canon.ts';
import { REPO_ROOT, makeTempDir } from './engine-copy.ts';
import { SurfaceBuilder, clipWithDigest } from './surface.ts';
import type { Difference, SurfaceReport } from './types.ts';

/** A build that did not finish: the reason is the end of its own output. */
export class BuildFailed extends Error {}

export interface BuiltRelease {
  /** The temporary project the build ran in. */
  dir: string;
  dbPath: string;
  /** dist/materials of that project, or null when the build wrote no pages. */
  materialsDir: string | null;
  label: string;
  seconds: number;
}

export interface BuildOptions {
  label: string;
  /** A directory of table CSVs to build from instead of data/tables. The manifest is regenerated for it, in the copy. */
  tablesDir?: string;
  /** The build date to stamp (an ISO date), so two builds on different days agree. Defaults to today's. */
  buildDate?: string;
  /** Build the material pages too (stage 8). Default true. */
  pages?: boolean;
}

const COPIED = ['schema', 'app', 'data'];

/** Run the old build in a temporary copy of the project. Takes about 25 s with the pages. */
export async function buildInCopy(opts: BuildOptions): Promise<BuiltRelease> {
  const dir = makeTempDir('h2c-parity-build-');
  const started = performance.now();
  // build/src, mappings and the two manifests are COPIED (the build locates the project from its own file path, so a link
  // would send it back to the real tree); node_modules is linked, because it is large and is only read.
  cpSync(join(REPO_ROOT, 'build', 'src'), join(dir, 'build', 'src'), { recursive: true });
  cpSync(join(REPO_ROOT, 'build', 'mappings'), join(dir, 'build', 'mappings'), { recursive: true });
  for (const f of ['package.json', 'package-lock.json']) cpSync(join(REPO_ROOT, 'build', f), join(dir, 'build', f));
  const modules = join(REPO_ROOT, 'build', 'node_modules');
  if (!existsSync(modules)) throw new BuildFailed('build/node_modules is missing: run npm ci --prefix build');
  symlinkSync(modules, join(dir, 'build', 'node_modules'), 'dir');
  for (const d of COPIED) cpSync(join(REPO_ROOT, d), join(dir, d), { recursive: true });
  for (const f of ['package.json', 'package-lock.json']) cpSync(join(REPO_ROOT, f), join(dir, f));

  if (opts.tablesDir) {
    rmSync(join(dir, 'data', 'tables'), { recursive: true, force: true });
    cpSync(opts.tablesDir, join(dir, 'data', 'tables'), { recursive: true });
    await refreshManifest(dir);
  }

  const date = opts.buildDate ?? new Date().toISOString().slice(0, 10);
  const args = ['build/src/index.js', ...(opts.pages === false ? ['--no-pages'] : [])];
  const run = await runBuild(dir, args, { H2C_NO_BUILD_CACHE: '1', SOURCE_DATE_EPOCH: String(Date.parse(`${date}T00:00:00Z`) / 1000) });
  if (run.status !== 0) {
    const tail = run.output.split('\n').filter((l) => /ERROR|failed|Error/.test(l)).slice(0, 12).join('\n');
    throw new BuildFailed(`the build of "${opts.label}" exited ${String(run.status)}${tail ? `:\n${tail}` : ''}`);
  }
  const dbPath = join(dir, 'dist', 'db.json');
  if (!existsSync(dbPath)) throw new BuildFailed(`the build of "${opts.label}" wrote no dist/db.json`);
  const materialsDir = join(dir, 'dist', 'materials');
  return { dir, dbPath, materialsDir: existsSync(materialsDir) ? materialsDir : null, label: opts.label, seconds: (performance.now() - started) / 1000 };
}

export interface NewBuildOptions {
  label: string;
  /** A directory of table CSVs to build from instead of data/tables (a manifest is written for it, in a temporary data directory). */
  tablesDir?: string;
  /** The build date to stamp (an ISO date), so builds on different days agree. Defaults to today's. */
  buildDate?: string;
  /** Extra arguments for the build's own CLI (--no-estimates). */
  args?: readonly string[];
  /**
   * The folder the estimate stage may keep its cache in. Without it the build runs the stage cold (--no-estimate-cache), so that P-build
   * compares what the stage COMPUTES with the old build's database, never what an earlier run left behind.
   */
  estimateCache?: string;
}

/**
 * The new build (packages/build): its CLI as a child process, writing db.json into a temporary directory. The reconstruction it
 * reads is made from `data/` (or from a temporary data directory holding `tablesDir`), in memory, so nothing in the project is
 * written and no copy of the project is needed. A build that fails is a BuildFailed, never an empty database.
 */
export async function buildNew(opts: NewBuildOptions): Promise<BuiltRelease> {
  const dir = makeTempDir('h2c-parity-newbuild-');
  const started = performance.now();
  let dataDir = join(REPO_ROOT, 'data');
  if (opts.tablesDir) {
    dataDir = join(dir, 'data');
    cpSync(opts.tablesDir, join(dataDir, 'tables'), { recursive: true });
    await refreshManifest(dir, join(REPO_ROOT, 'build', 'src'));
  }
  const out = join(dir, 'out');
  const date = opts.buildDate ?? new Date().toISOString().slice(0, 10);
  const cache = opts.estimateCache === undefined ? ['--no-estimate-cache'] : ['--estimate-cache', opts.estimateCache];
  const args = ['--disable-warning=ExperimentalWarning', 'packages/build/src/cli.ts', '--out', out, '--data-dir', dataDir, ...cache, ...(opts.args ?? [])];
  const run = await runBuild(REPO_ROOT, args, { SOURCE_DATE_EPOCH: String(Date.parse(`${date}T00:00:00Z`) / 1000) });
  if (run.status !== 0) {
    const tail = run.output.split('\n').filter((l) => /ERROR|failed|Error/.test(l)).slice(0, 12).join('\n');
    throw new BuildFailed(`the build of "${opts.label}" exited ${String(run.status)}${tail ? `:\n${tail}` : ''}`);
  }
  const dbPath = join(out, 'db.json');
  if (!existsSync(dbPath)) throw new BuildFailed(`the build of "${opts.label}" wrote no db.json`);
  return { dir, dbPath, materialsDir: null, label: opts.label, seconds: (performance.now() - started) / 1000 };
}

export interface RenderedPages {
  /** The folder the pages were written to (its materials/ is what the old build writes to dist/materials). */
  materialsDir: string;
  label: string;
  seconds: number;
}

/**
 * The new pages (packages/pages, WP-24): its CLI as a child process, rendering the pages of a compiled database into a temporary
 * directory. Nothing in the project is written. A render that fails is a BuildFailed, never an empty set of pages.
 */
export async function renderNewPages(opts: { dbPath: string; label: string }): Promise<RenderedPages> {
  const dir = makeTempDir('h2c-parity-newpages-');
  const started = performance.now();
  const run = await runBuild(REPO_ROOT, ['--disable-warning=ExperimentalWarning', 'packages/pages/src/cli.ts', '--db', opts.dbPath, '--out', dir], {});
  if (run.status !== 0) {
    const tail = run.output.split('\n').filter((l) => /ERROR|failed|Error|error/.test(l)).slice(0, 12).join('\n');
    throw new BuildFailed(`the page renderer of "${opts.label}" exited ${String(run.status)}${tail ? `:\n${tail}` : ''}`);
  }
  const materialsDir = join(dir, 'materials');
  if (!existsSync(materialsDir)) throw new BuildFailed(`the page renderer of "${opts.label}" wrote no materials folder`);
  return { materialsDir, label: opts.label, seconds: (performance.now() - started) / 1000 };
}

/** The old build as a child process, asynchronously, so two builds (or a build and a comparison) can run side by side. */
function runBuild(cwd: string, args: string[], env: Record<string, string>): Promise<{ status: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    // Only the end matters (the errors are last), and a build prints little; keep the last 200 KB so nothing grows without bound.
    const keep = (chunk: Buffer) => { output = (output + chunk.toString('utf8')).slice(-200_000); };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    // A harness that exits early (a crash, a usage error after the start) must not leave a build running behind it.
    const stop = () => { child.kill(); };
    process.once('exit', stop);
    child.on('error', reject);
    child.on('close', (status) => { process.off('exit', stop); resolve({ status, output }); });
  });
}

/** data/manifest.json for a tables directory that is not the committed one, written in the COPY with the old build's own function. */
async function refreshManifest(dir: string, buildSrc: string = join(dir, 'build', 'src')): Promise<void> {
  const { buildManifest } = await import(pathToFileURL(join(buildSrc, 'schema.js')).href);
  const { readCsv } = await import(pathToFileURL(join(buildSrc, 'csv.js')).href);
  const dataDir = join(dir, 'data');
  const tables = Object.fromEntries(readdirSync(join(dataDir, 'tables')).filter((f) => f.endsWith('.csv')).map((f) => [f.slice(0, -4), readCsv(join(dataDir, 'tables', f))]));
  writeFileSync(join(dataDir, 'manifest.json'), `${JSON.stringify(buildManifest(dataDir, tables), null, 2)}\n`);
}

interface PathDifference {
  path: string;
  before: unknown;
  after: unknown;
}

/** The database as build:diff compares it: parsed, with the two meta keys build:diff leaves out removed. */
function readComparableDb(path: string): Record<string, unknown> {
  const db: Record<string, unknown> = JSON.parse(readFileSync(path, 'utf8'));
  const meta = db.meta;
  if (typeof meta === 'object' && meta !== null) {
    Reflect.deleteProperty(meta, 'build');
    Reflect.deleteProperty(meta, 'release');
  }
  return db;
}

/** How many values a database holds (leaves), so "zero differences" says how much was compared. */
function countValues(v: unknown): number {
  if (typeof v !== 'object' || v === null) return 1;
  let n = 0;
  for (const x of Array.isArray(v) ? v : Object.values(v)) n += countValues(x);
  return n;
}

const shortValue = (v: unknown): string => (v === undefined ? '<absent>' : clipWithDigest(canon(v)));

/** `db.materials[M001].headline.density.value` is the record `materials[M001]`, the field `headline.density.value`. */
function split(path: string): { record: string; field: string } {
  const m = /^db\.([^.[]+(?:\[[^\]]*\])?)\.?(.*)$/.exec(path);
  return m ? { record: m[1] ?? path, field: m[2] || '(whole)' } : { record: path, field: '(whole)' };
}

/** The ids of a top-level list whose every element has a string id, or null for any other value. */
function idsOf(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const ids: string[] = [];
  for (const e of v) {
    const id: unknown = typeof e === 'object' && e !== null ? Reflect.get(e, 'id') : undefined;
    if (typeof id !== 'string') return null;
    ids.push(id);
  }
  return ids;
}

/**
 * What diffJson cannot see in a list of records keyed by id: it pairs records by id, so a list in another ORDER, or with a record
 * twice, compares equal. The order of db.materials is the engine's candidate and listing order, so both are differences.
 */
function idSequenceDifferences(left: Record<string, unknown>, right: Record<string, unknown>): Difference[] {
  const out: Difference[] = [];
  for (const key of Object.keys(left)) {
    const a = idsOf(left[key]);
    const b = idsOf(right[key]);
    if (!a || !b) continue;
    for (const [side, ids] of [['before', a], ['after', b]] as const) {
      const seen = new Set<string>();
      const twice = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
      if (twice.length) out.push({ case: 'build', record: key, tier: 'evidence', field: '(duplicate ids)', before: side === 'before' ? twice.slice(0, 5).join(', ') : '<none>', after: side === 'after' ? twice.slice(0, 5).join(', ') : '<none>' });
    }
    const inB = new Set(b);
    const inA = new Set(a);
    const commonA = a.filter((id) => inB.has(id));
    const commonB = b.filter((id) => inA.has(id));
    const at = commonA.findIndex((id, i) => id !== commonB[i]);
    if (at >= 0) out.push({ case: 'build', record: key, tier: 'evidence', field: '(order)', before: `position ${at + 1}: ${commonA[at]}`, after: `position ${at + 1}: ${commonB[at]}` });
  }
  return out;
}

/** Compare two compiled databases path by path. Both are read here, so neither is shared with another check. */
export async function compareBuilds(before: { path: string; label: string }, after: { path: string; label: string }): Promise<SurfaceReport> {
  const b = new SurfaceBuilder({ surface: 'build', before: before.label, after: after.label, unit: 'value' });
  const { diffJson }: { diffJson: (a: unknown, b: unknown, root: string) => PathDifference[] } = await import(pathToFileURL(join(REPO_ROOT, 'scripts', 'data', 'db-diff.mjs')).href);
  const left = readComparableDb(before.path);
  const right = readComparableDb(after.path);
  b.units = Math.max(countValues(left), countValues(right));
  const diffs = diffJson(left, right, 'db');
  const groups = new Map<string, number>();
  for (const d of diffs) {
    const { record, field } = split(d.path);
    b.add({ case: 'build', record, tier: 'evidence', field, before: shortValue(d.before), after: shortValue(d.after) });
    const shape = d.path.replace(/\[[^\]]+\]/g, '[]');
    groups.set(shape, (groups.get(shape) ?? 0) + 1);
  }
  for (const d of idSequenceDifferences(left, right)) b.add(d);
  // diffJson pairs records by id and reads an object's keys as a set, so it cannot see a changed key order, a nested list in
  // another order or a nested record twice. The database is also compared as written: the same parsed content in the same
  // order serializes to the same text (a build is meant to be byte for byte the other's, apart from the two stamps).
  if (b.count === 0 && JSON.stringify(left) !== JSON.stringify(right)) {
    b.add({ case: 'build', record: '(whole database)', tier: 'evidence', field: '(serialized form: key order, list order or a repeated record)', before: clipWithDigest(JSON.stringify(left)), after: clipWithDigest(JSON.stringify(right)) });
  }
  b.notes.push(`db.json compared path by path (meta.build and meta.release left out, as build:diff does): ${b.units} values`);
  for (const [shape, n] of [...groups].sort((p, q) => q[1] - p[1]).slice(0, 12)) b.notes.push(`${String(n).padStart(6)}  ${shape}`);
  return b.finish();
}
