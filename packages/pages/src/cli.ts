// Writes the material pages from a compiled database.
//
//   node packages/pages/src/cli.ts --db <db.json> --out <dir> [--only M001,M020] [--selector <href>] [--no-selector]
//
// <dir>/materials/ gets every page the page rule admits (Overview, Products page, records stub), the index, the method page
// and assets/ (pages.css, page.js, the font licences): the files the old build's stage 8 writes. The folder is replaced as a
// whole. Pages link to the selector at its stable address (`../`); --selector gives another, --no-selector none. A page, the
// stylesheet or the script over twice its budget (budget.ts) is an error; over its budget, a warning.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bundleScripts } from './assets.ts';
import { checkBudgets, renderPages, writeSite } from './site.ts';
import type { SiteOptions } from './site.ts';

interface Args { db: string; out: string; only?: string[]; selectorHref?: string | null }

function parse(argv: readonly string[]): Args {
  const args: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = (): string => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--db') args.db = resolve(value());
    else if (a === '--out') args.out = resolve(value());
    else if (a === '--only') args.only = value().split(',').filter(Boolean);
    else if (a === '--selector') args.selectorHref = value();
    else if (a === '--no-selector') args.selectorHref = null;
    else throw new Error(`unknown argument ${a ?? ''}`);
  }
  if (!args.db || !args.out) throw new Error('usage: node packages/pages/src/cli.ts --db <db.json> --out <dir> [--only M001,M020] [--selector <href> | --no-selector]');
  return args as Args;
}

async function main(argv: readonly string[]): Promise<number> {
  const args = parse(argv);
  const db = JSON.parse(readFileSync(args.db, 'utf8'));
  const t0 = performance.now();
  const options: { -readonly [K in keyof SiteOptions]: SiteOptions[K] } = { script: await bundleScripts() };
  if (args.only) options.only = args.only;
  if (args.selectorHref !== undefined) options.selectorHref = args.selectorHref;
  const { files, stats } = renderPages(db, options);
  if (args.only) for (const id of args.only) if (!stats.perPage.some((p: { id: string }) => p.id === id)) console.warn(`${id}: no page (not a material the page rule admits).`);
  const { warn, fail, total } = checkBudgets(files);
  for (const w of warn) console.log(`  warn   [PAGE-BUDGET] ${w}`);
  if (fail.length) {
    for (const f of fail) console.error(`  ERROR  [PAGE-BUDGET] ${f}, more than twice it`);
    return 1;
  }
  writeSite(args.out, files);
  const mb = (total / 1024 / 1024).toFixed(1);
  console.log(`pages  ${stats.pages} Overviews, ${stats.recordsPages} Products pages, the index and the method page, ${mb} MB in all, in ${Math.round(performance.now() - t0)} ms, into ${resolve(args.out, 'materials')}`);
  return 0;
}

process.exitCode = await main(process.argv.slice(2)).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  return 1;
});
