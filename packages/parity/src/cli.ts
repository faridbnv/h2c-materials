// npm run parity -- [--noop | --fault <name> | --new] [--transitions <dir>] [--corpus <file>] [--db <file>] [--only <prefix>] [--json <file>]
//   (no mode)       old against the new-side adapter (a placeholder until WP-11: reports "not computable", exit 2)
//   --noop          old against a second, independently loaded copy of old; must be exactly 0 differences
//   --fault <name>  old against a temporary copy of the engine with one fault injected; must report differences (exit 5)
//   --list-faults   the faults
//   --emit-transition <file> --id <id> --kind <k> --ruling <text> --description <text>  write the observed differences as a transition file
//   --allow-partial  accept a run over a selection (--only); without it a partial run exits 4 even when it shows zero
// Only the flags above exist. An unknown flag, a stray argument, a repeated flag, or a flag used as another flag's value is a
// usage error (64); it is never ignored.
// Exit: 0 zero, or matches its transitions; 1 differs; 2 not computable; 3 a fault was injected and NOT caught (harness blind);
// 4 partial run without --allow-partial; 5 a fault was injected and caught (the self-test passed; with --transitions the
// transition decides: 0 or 1); 64 bad usage; 70 the tool itself crashed (an uncaught error: a bug or a missing build, never a verdict).
// 1 means only "differs": nothing else exits 1, not even a crash.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exitCode, runParity } from './compare.ts';
import { loadCorpus } from './corpus.ts';
import { REPO_ROOT, copyEngine } from './engine-copy.ts';
import { FAULTS, faultByName } from './faults.ts';
import { createNewPlaceholder } from './new-adapter.ts';
import { createOld, createOldAdapter, readDb } from './old-adapter.ts';
import { formatReport } from './report.ts';
import { buildTransition, loadTransitions } from './transitions.ts';

/** Flags that stand alone, and flags that take one value. Anything else is a usage error. */
const SWITCHES = ['noop', 'new', 'list-faults', 'allow-partial'];
const VALUED = ['fault', 'transitions', 'corpus', 'db', 'only', 'json', 'emit-transition', 'id', 'kind', 'ruling', 'description'];

class UsageError extends Error {}

/** The flags given, or a UsageError naming the problem. */
function parseArgs(argv: readonly string[]): Map<string, string | true> {
  const given = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (!token.startsWith('-')) throw new UsageError(`unexpected argument "${token}" (flags only; a value follows the flag that takes one)`);
    const name = token.startsWith('--') ? token.slice(2) : '';
    if (!SWITCHES.includes(name) && !VALUED.includes(name)) throw new UsageError(`unknown flag ${token}`);
    if (given.has(name)) throw new UsageError(`${token} given twice`);
    if (SWITCHES.includes(name)) { given.set(name, true); continue; }
    const value = argv[i + 1];
    if (value === undefined) throw new UsageError(`${token} needs a value`);
    if (value.startsWith('-')) throw new UsageError(`${token} needs a value, but the next argument is the flag ${value}`);
    given.set(name, value);
    i++;
  }
  return given;
}

async function main(argv: readonly string[]): Promise<number> {
  const given = parseArgs(argv);
  const flag = (n: string) => given.has(n);
  const val = (n: string): string | undefined => { const v = given.get(n); return typeof v === 'string' ? v : undefined; };

  if (flag('list-faults')) {
    for (const f of FAULTS) console.log(`${f.name.padEnd(18)} ${f.expect.join('+').padEnd(20)} ${f.description}`);
    return 0;
  }

  const modes = ['noop', 'fault', 'new'].filter((m) => flag(m));
  if (modes.length > 1) throw new UsageError('choose one of --noop, --fault <name>, --new');
  const mode = modes[0] ?? 'new';
  if (mode === 'noop' && flag('transitions')) throw new UsageError('--noop must be exactly zero; transitions are not accepted with it');
  if (mode === 'fault' && !FAULTS.some((f) => f.name === val('fault'))) throw new UsageError(`unknown fault "${val('fault')}"; known: ${FAULTS.map((x) => x.name).join(', ')}`);
  if (flag('emit-transition') && mode === 'noop') throw new UsageError('refusing to write a transition from a noop run');

  const corpus = loadCorpus(val('corpus'));
  const only = val('only');
  const cases = only ? corpus.cases.filter((c) => c.id.startsWith(only)) : corpus.cases;
  const dbPath = val('db');
  const allowPartial = flag('allow-partial');

  const t0 = performance.now();
  const dbBefore = readDb(dbPath);
  console.log(`db: release ${dbBefore.meta?.release?.id ?? '?'}, snapshot ${dbBefore.meta?.snapshot ?? '?'}; corpus ${corpus.corpus} built from release ${corpus.generatedFrom.release ?? '?'}`);
  const before = await createOld(dbBefore);
  let after;
  let fault;
  if (mode === 'noop') {
    // A second old: its own parse of the db, and a fresh copy of the engine files, so no module instance or object is shared.
    after = await createOldAdapter({ name: 'old (second copy)', db: readDb(dbPath), engineDir: copyEngine([]) });
  } else if (mode === 'fault') {
    fault = faultByName(val('fault') ?? '');
    after = await createOldAdapter({ name: `old + fault ${fault.name}`, db: readDb(dbPath), engineDir: copyEngine(fault.patches) });
  } else after = createNewPlaceholder();

  // Transitions apply to a real comparison, not to the self-tests, unless asked for.
  const transitionDir = val('transitions') ?? (mode === 'new' ? join(REPO_ROOT, 'parity', 'transitions') : undefined);
  const transitions = transitionDir ? loadTransitions(transitionDir) : undefined;

  const report = await runParity({
    corpusName: corpus.corpus, cases, knownCaseIds: new Set(corpus.cases.map((c) => c.id)), before, after, ...(transitions ? { transitions } : {}),
    ...(process.stdout.isTTY ? { onProgress: (d: number, n: number) => { if (d % 100 === 0 || d === n) process.stdout.write(`\r  ${d}/${n} cases`); } } : {}),
  });
  if (process.stdout.isTTY) process.stdout.write('\r');
  console.log(formatReport(report));
  console.log(`setup + run wall time: ${((performance.now() - t0) / 1000).toFixed(1)}s`);

  const json = val('json');
  if (json) writeFileSync(json, `${JSON.stringify(report, null, 1)}\n`);
  const emit = val('emit-transition');
  if (emit) {
    const why = report.status !== 'differs' ? `a run whose status is ${report.status}` : report.notComputable.length ? 'a run with not-computable places' : report.partial && !allowPartial ? 'a partial run (add --allow-partial)' : '';
    if (why) { console.error(`parity: refusing to write a transition from ${why}`); return 64; }
    const t = buildTransition({
      id: val('id') ?? 'unnamed', kind: (val('kind') ?? 'science') as never, description: val('description') ?? '', ruling: val('ruling') ?? '',
      corpus: corpus.corpus, differences: report.differences,
    });
    writeFileSync(emit, `${JSON.stringify(t, null, 1)}\n`);
    console.log(`transition written: ${emit} (${t.differences.length} differences, ${t.digest})`);
  }

  let code = exitCode(report.status);
  if (mode === 'noop' && report.status !== 'zero') { console.error('NOOP FAILED: old against a copy of itself must be exactly zero differences'); code = code || 1; }
  if (mode === 'fault') {
    if (report.differences.length === 0) {
      console.error(`FAULT NOT CAUGHT: ${fault!.name} produced no difference; the harness is blind to it`);
      code = 3;
    } else {
      const tiers = new Set(report.differences.map((d) => d.tier));
      const missed = fault!.expect.filter((t) => !tiers.has(t));
      // Caught: its own code, 5, so a caught fault is not read as "differs" (1) or as a crash (70). With --transitions the
      // transition decides (0 or 1); a not-computable run keeps 2.
      if (missed.length) code = 3;
      else if (!transitions && code === 1) code = 5;
      console.log(`fault ${fault!.name}: caught, ${report.movedRecords.length} record(s) moved, tiers hit: ${[...tiers].join(', ')}${missed.length ? ` (expected also: ${missed.join(', ')})` : ''}`);
    }
  }
  if (report.partial && !allowPartial && code === 0) {
    console.error('PARTIAL RUN: a selection (--only) cannot show the corpus is clean; add --allow-partial to accept it');
    code = 4;
  }
  return code;
}

// A crash is not a verdict: whatever escapes main exits 70 with the error on stderr, never 1 (differs) and never 0.
const crash = (err: unknown): never => {
  console.error(`parity: internal error, exit 70 (a bug or a missing build, not a verdict): ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  process.exit(70);
};
process.on('uncaughtException', crash);
process.on('unhandledRejection', crash);

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err: unknown) => {
    if (err instanceof UsageError) { console.error(`parity: ${err.message}`); process.exit(64); }
    return crash(err);
  },
);
