// npm run parity:host -- --ci <db.json> [--local <db.json>]
//
// A local check at milestone exits (pack 07 section 5.8; WP-20): this machine's build of a commit against the CI build of the same
// commit. Two machines can differ in a few estimate leaves with no answer different (the estimate stage's float arithmetic and the
// ICU collation behind `localeCompare` depend on the runtime), and this is where that shows. Releases are built only in CI on the
// pinned Node and linux-x64; this check says how far a Mac build is from one.
//
//   --ci <file>      the db.json the CI build of the same commit made (download it from the run; the check does not fetch)
//   --local <file>   this machine's db.json; without it, the new build (packages/build) is run now into a temporary directory
//
// Exit: 0 identical path by path, 1 differs (the differences are listed), 2 not computable (no CI db.json given, a file missing, or
// a build that did not finish); 64 bad usage. It never reports zero without having compared two databases.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BuildFailed, buildNew, compareBuilds } from './p-build.ts';
import { exitCode } from './compare.ts';
import { formatSurface } from './report.ts';
import { cannotCompare } from './surface.ts';
import { readDb } from './old-adapter.ts';
import type { SurfaceReport } from './types.ts';

const VALUED = ['ci', 'local'];
const given = new Map<string, string>();
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
  const flag = argv[i]?.replace(/^--/, '') ?? '';
  const value = argv[i + 1];
  if (!VALUED.includes(flag) || argv[i]?.startsWith('--') !== true || value === undefined || value.startsWith('-')) {
    console.error(`parity:host: usage: --ci <db.json> [--local <db.json>] (got ${argv.join(' ') || 'nothing'})`);
    process.exit(64);
  }
  if (given.has(flag)) { console.error(`parity:host: --${flag} given twice`); process.exit(64); }
  given.set(flag, resolve(value));
}

const head = { surface: 'build', before: 'CI build of this commit', after: 'this machine', unit: 'value' } as const;
async function run(): Promise<SurfaceReport> {
  const ci = given.get('ci');
  if (ci === undefined) return cannotCompare(head, 'before', 'no CI db.json was given (--ci <file>): nothing to compare this machine with');
  if (!existsSync(ci)) return cannotCompare(head, 'before', `the CI db.json ${ci} does not exist`);
  let local = given.get('local');
  if (local === undefined) {
    const built = await buildNew({ label: 'this machine', buildDate: String(readDb(ci).meta?.build ?? new Date().toISOString().slice(0, 10)) });
    local = built.dbPath;
  } else if (!existsSync(local)) {
    return cannotCompare(head, 'after', `the local db.json ${local} does not exist`);
  }
  const report = await compareBuilds({ path: ci, label: head.before }, { path: local, label: head.after });
  report.notes.push(`this machine: Node ${process.versions.node}, ICU ${process.versions.icu}, ${process.platform} ${process.arch}`);
  return report;
}

function finish(report: SurfaceReport): never {
  console.log(formatSurface(report));
  console.log(`RESULT: ${report.status}`);
  process.exit(exitCode(report.status));
}

try {
  finish(await run());
} catch (e) {
  if (!(e instanceof BuildFailed)) throw e;
  finish(cannotCompare(head, 'after', `the local build did not finish: ${e.message}`));
}
