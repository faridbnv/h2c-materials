// npm run build:next -- [--out <dir>] [--data-dir <dir>] [--no-estimates] [--validate-only]
//
// The new build (WP-20): the old build's load, normalize, compile and validate stages in TypeScript, reading the clean SQLite
// reconstruction. Writes <out>/db.json, <out>/reference.json and <out>/validation-report.md (default dist/next; nothing outside
// --out is written, so it can run beside the old build). Exit 0 when the database validates, 1 when the tables do not
// reconstruct, fail the schema gate or the database does not validate, 64 for a bad command line.
import { join } from 'node:path';
import { PROJECT_ROOT, runBuild } from './build.ts';

const SWITCHES = new Set<string>(['--no-estimates', '--validate-only']);
const VALUED = new Set<string>(['--out', '--data-dir']);

/** The flags given, or a usage error (exit 64) naming the problem: an unknown flag, a missing value, a flag twice, a stray argument. */
function parseArgs(argv: readonly string[]): Map<string, string | true> {
  const given = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] ?? '';
    const isSwitch = SWITCHES.has(token);
    if (!isSwitch && !VALUED.has(token)) usage(token.startsWith('--') ? `unknown flag ${token}` : `unexpected argument "${token}" (flags only)`);
    if (given.has(token)) usage(`${token} given twice`);
    if (isSwitch) { given.set(token, true); continue; }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) usage(`${token} needs a value`);
    given.set(token, value);
    i++;
  }
  return given;
}

function usage(message: string): never {
  console.error(`build: ${message}; known: ${[...SWITCHES, ...VALUED].join(', ')}`);
  process.exit(64);
}

const given = parseArgs(process.argv.slice(2));
const valueOf = (flag: string): string | undefined => {
  const value = given.get(flag);
  return typeof value === 'string' ? value : undefined;
};

const dataDir = valueOf('--data-dir');
const result = runBuild({
  outDir: valueOf('--out') ?? join(PROJECT_ROOT, 'dist', 'next'),
  ...(dataDir === undefined ? {} : { dataDir }),
  estimates: !given.has('--no-estimates'),
  validateOnly: given.has('--validate-only'),
  log: (line) => console.log(line),
});
if (!result.ok) {
  if (result.db === null) {
    const reconstruct = result.errors.some((e) => e.code === 'RECONSTRUCT');
    console.error(reconstruct ? '\nBuild failed: the data tables do not reconstruct.' : '\nBuild failed: the data tables failed the schema gate.');
    for (const e of result.errors.slice(0, 50)) console.error(`  ERROR  [${e.code}] ${e.where}: ${e.message}`);
    if (result.errors.length > 50) console.error(`  ... and ${result.errors.length - 50} more (${result.errors.length} in all)`);
  } else {
    console.error(`\nBuild failed: the database did not validate (${result.errors.length} error(s); the report is in the output directory).`);
  }
  process.exit(1);
}
