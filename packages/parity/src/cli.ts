// npm run parity -- [--noop | --fault <name> | --new | --placeholder | --mutate] [--milestone] [--surface <list>] [--tables-dir <dir>]
//                   [--transitions <dir>] [--corpus <file>] [--db <file>] [--only <prefix>] [--json <file>]
//   (no mode)       old against the new side: on the engine surface, the old engine behind the typed wrapper (@atlas/engine, WP-11)
//   --new           the same, said out loud. Build and pages stay "not computable" until WP-20 and WP-24 wire them
//   --placeholder   old against a new side that answers nothing: must report "not computable", exit 2 (a self-test)
//   --noop          old against a second, independently loaded copy of old; must be exactly 0 differences
//   --fault <name>  old against a temporary copy of the engine with one fault injected; must report differences (exit 5)
//   --mutate        all nine faults, one after the other, into temporary copies (npm run parity:mutate); 0 when 9 of 9 are caught
//   --milestone     the milestone size: 5,000 seeded replays (v0 has 1,000), the census, a larger tie-shuffle sample
//   --surface <list>  comma-separated: engine, ties, links, build, pages (all five by default), core (WP-25 hook, never default)
//   --tables-dir <dir>  build P-build and P-pages from this directory of table CSVs instead of data/tables (in a temporary copy)
//   --list-faults   the faults
//   --emit-transition <file> --id <id> --kind <k> --ruling <text> --description <text>  write the observed differences as a transition file
//   --allow-partial  accept a run over a selection (--only); without it a partial run exits 4 even when it shows zero
// With --only and no --surface, only the engine runs (a selection is a local check, never a pass).
// Only the flags above exist. An unknown flag, a stray argument, a repeated flag, or a flag used as another flag's value is a
// usage error (64); it is never ignored.
// Exit: 0 zero, or matches its transitions; 1 differs; 2 not computable; 3 a fault was injected and NOT caught (harness blind);
// 4 partial run without --allow-partial; 5 a fault was injected and caught (the self-test passed; with --transitions the
// transition decides: 0 or 1); 64 bad usage; 70 the tool itself crashed (an uncaught error: a bug or a missing build, never a verdict).
// 1 means only "differs": nothing else exits 1, not even a crash. The last line of a run is the one RESULT: line.
// A crash is not a verdict: whatever escapes exits 70 with the error on stderr, never 1 (differs) and never 0. The handlers are
// installed before anything else is loaded, so a module that fails to load (a syntax error, a missing export) is a crash too.
function crash(err: unknown): never {
  console.error(`parity: internal error, exit 70 (a bug or a missing build, not a verdict): ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  process.exit(70);
}
process.on('uncaughtException', crash);
process.on('unhandledRejection', crash);

try {
  const { runCli } = await import('./run-cli.ts');
  process.exit(await runCli(process.argv.slice(2)));
} catch (err) {
  crash(err);
}
