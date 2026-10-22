// The whole materials/ folder from a compiled database: every material page the page rule admits with its Products page and
// its stub, the index, the method page and the shared assets (the old build's stage 8, app/pages/stage.js, in TypeScript).
// `renderPages` is pure; `writeSite` puts the files in place and `checkBudgets` holds them to budget.ts.
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { PAGE_BUDGET } from './budget.ts';
import { readAssets } from './assets.ts';
import type { Loose } from './loose.ts';
import { pageEnv, renderSite } from './render.ts';
import { PAGES_DIR } from './facts/page-rule.ts';

export type SiteFile = readonly [path: string, text: string];

export interface SiteOptions {
  /** The bundled page script (assets.ts bundleScripts). Without it the assets are left out, as the snapshot's renders leave them. */
  readonly script?: string;
  /** Where the pages' links to the selector point; `null` leaves the link out. Default: the selector's stable address. */
  readonly selectorHref?: string | null;
  /** Render only these materials (their Overview and Products pages, and the assets). */
  readonly only?: readonly string[];
  /** Where assets/ and the page scripts are read from (default: this package). */
  readonly packageRoot?: string;
}

export interface Site {
  readonly files: readonly SiteFile[];
  readonly stats: Loose;
}

export function renderPages(db: Loose, options: SiteOptions = {}): Site {
  const assets = options.script === undefined ? null : readAssets(options.script, options.packageRoot);
  const env = pageEnv(db, { assets, ...(options.selectorHref === undefined ? {} : { selectorHref: options.selectorHref }) });
  if (options.only) env.only = [...options.only];
  const { files, stats } = renderSite(db, env);
  return { files, stats };
}

/** The budget a file is held to, by its path relative to the output folder: an Overview, the index or the method page, a Products page, a records stub, an asset. */
function budgetOf(path: string): { kind: string; raw: number; gzip?: number } | null {
  if (path.endsWith('/assets/pages.css')) return { kind: 'stylesheet', ...PAGE_BUDGET.css };
  if (path.endsWith('/assets/page.js')) return { kind: 'script', ...PAGE_BUDGET.script };
  if (path.endsWith('-products.html')) return { kind: 'Products page', ...PAGE_BUDGET.products };
  if (path.endsWith('-records.html')) return { kind: 'records stub', ...PAGE_BUDGET.records };
  if (path.endsWith('.html')) return { kind: 'page', ...PAGE_BUDGET.main };
  return null;
}

export interface BudgetFindings {
  readonly warn: readonly string[];
  readonly fail: readonly string[];
  readonly total: number;
}

/** Each file against its budget: a warning over it, a failure over twice it, and the set's total. */
export function checkBudgets(files: readonly SiteFile[]): BudgetFindings {
  const warn: string[] = [];
  const fail: string[] = [];
  const kb = (n: number): string => `${(n / 1024).toFixed(0)} KB`;
  let total = 0;
  for (const [path, text] of files) {
    const bytes = Buffer.byteLength(text);
    total += bytes;
    const b = budgetOf(path);
    if (!b) continue;
    const sizes: [string, number, number | undefined][] = [['raw', bytes, b.raw]];
    if (b.gzip !== undefined) sizes.push(['gzipped', gzipSync(text, { level: 9 }).length, b.gzip]);
    for (const [what, size, limit] of sizes) {
      if (limit === undefined || size <= limit) continue;
      (size > 2 * limit ? fail : warn).push(`${path} (${b.kind}) is ${kb(size)} ${what}, over its budget of ${kb(limit)}`);
    }
  }
  if (total > PAGE_BUDGET.set.raw) (total > 2 * PAGE_BUDGET.set.raw ? fail : warn).push(`the pages together are ${kb(total)}, over their budget of ${kb(PAGE_BUDGET.set.raw)}`);
  return { warn, fail, total };
}

/** True while a process of that number runs (a folder an interrupted run left is removed only when it has ended). */
function running(pid: number): boolean {
  if (pid === process.pid) return true;
  try { process.kill(pid, 0); return true; } catch (e) { return e instanceof Error && 'code' in e && e.code === 'EPERM'; }
}

/** Write the files to a folder of this process's own, then put it in place of <out>/materials, so no page of an earlier run survives and no reader sees half a folder. */
export function writeSite(out: string, files: readonly SiteFile[]): void {
  mkdirSync(out, { recursive: true });
  for (const name of readdirSync(out)) {
    const pid = /^\.materials-(?:old-)?(\d+)$/.exec(name)?.[1];
    if (pid && !running(Number(pid))) rmSync(join(out, name), { recursive: true, force: true });
  }
  const tmp = join(out, `.${PAGES_DIR}-${process.pid}`);
  const old = join(out, `.${PAGES_DIR}-old-${process.pid}`);
  const target = join(out, PAGES_DIR);
  rmSync(tmp, { recursive: true, force: true });
  for (const [path, text] of files) {
    if (!path.startsWith(`${PAGES_DIR}/`)) throw new Error(`pages: ${path} is not under ${PAGES_DIR}/`);
    const file = join(tmp, path.slice(PAGES_DIR.length + 1));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
  }
  rmSync(old, { recursive: true, force: true });
  if (existsSync(target)) renameSync(target, old);
  renameSync(tmp, target);
  rmSync(old, { recursive: true, force: true });
}
