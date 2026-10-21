// npm run build:next -- [--out <dir>] [--data-dir <dir>] [--no-estimates] [--validate-only]
//
// The new build (WP-20): the old build's load, normalize, compile and validate stages in TypeScript, reading the clean SQLite
// reconstruction. Writes <out>/db.json, <out>/reference.json and <out>/validation-report.md (default dist/next; nothing outside
// --out is written, so it can run beside the old build). Exit 0 when the database validates, 1 when it does not.
import { join } from 'node:path';
import { PROJECT_ROOT, runBuild } from './build.ts';

const FLAGS = new Set<string>(['--out', '--data-dir', '--no-estimates', '--validate-only']);
const args = process.argv.slice(2);
const flagValue = (name: string): string | undefined => {
  const at = args.indexOf(name);
  if (at < 0) return undefined;
  const value = args[at + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`${name} needs a value`);
  return value;
};
const unknown = args.filter((a) => a.startsWith('--') && !FLAGS.has(a));
if (unknown.length) {
  console.error(`build: unknown flag ${unknown.join(', ')}; known: ${[...FLAGS].join(', ')}`);
  process.exit(64);
}

const dataDir = flagValue('--data-dir');
const result = runBuild({
  outDir: flagValue('--out') ?? join(PROJECT_ROOT, 'dist', 'next'),
  ...(dataDir === undefined ? {} : { dataDir }),
  estimates: !args.includes('--no-estimates'),
  validateOnly: args.includes('--validate-only'),
  log: (line) => console.log(line),
});
if (!result.ok) {
  console.error(result.db === null ? '\nBuild failed: the data tables do not reconstruct.' : '\nBuild failed: the database did not validate.');
  if (result.db === null) for (const e of result.errors.slice(0, 50)) console.error(`  ERROR  [${e.code}] ${e.where}: ${e.message}`);
  process.exit(1);
}
