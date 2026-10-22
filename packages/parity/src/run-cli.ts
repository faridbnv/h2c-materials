// The parity CLI itself (cli.ts is a stub that installs the crash handlers first, then loads this). See the header of cli.ts for the flags and exit codes.
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkDb } from '@atlas/data';
import { exitCode, runParity } from './compare.ts';
import { coreSufficiencyHook, runCoreSufficiency } from './core-sufficiency.ts';
import { installCoreHook } from './core-hook.ts';
import { MILESTONE_REPLAYS, PR_REPLAYS, engineCorpusCases, mutationCases } from './corpora.ts';
import { loadCorpus } from './corpus.ts';
import { REPO_ROOT, copyEngine } from './engine-copy.ts';
import { FAULTS } from './faults.ts';
import type { Fault } from './faults.ts';
import { digestOfLinks, hashesInPages, historicLinks } from './historic-links.ts';
import { linkUnits, runLinks } from './links.ts';
import { formatMutate, runMutate } from './mutate.ts';
import { createNewAdapter, createNewPlaceholder } from './new-adapter.ts';
import { createOld, createOldAdapter, defaultDbPath, readDb } from './old-adapter.ts';
import type { Db } from './old-adapter.ts';
import { BuildFailed, buildInCopy, buildNew, compareBuilds } from './p-build.ts';
import type { BuiltRelease } from './p-build.ts';
import { comparePages, readPages } from './p-pages.ts';
import type { PageNames, PageSet } from './p-pages.ts';
import { formatReport, formatSurface, overallStatus, seconds } from './report.ts';
import { cannotCompare } from './surface.ts';
import { TIE_SAMPLE_MILESTONE, TIE_SAMPLE_PR, TIE_SEED, checkFirstWins, permuteProductOrder, tieSample } from './ties.ts';
import { BUILD_CASE, TRANSITION_KINDS, buildTransition, loadTransitions, partOf, settleSurface } from './transitions.ts';
import { SURFACES } from './types.ts';
import type { Adapter, Corpus, CorpusCase, ParityReport, Status, Surface, SurfaceReport, TransitionFile } from './types.ts';
import { getOrCreate } from './util.ts';

/** Flags that stand alone, and flags that take one value. Anything else is a usage error. */
const SWITCHES = ['noop', 'new', 'placeholder', 'list-faults', 'allow-partial', 'milestone', 'mutate'];
const VALUED = ['fault', 'transitions', 'corpus', 'db', 'only', 'json', 'emit-transition', 'id', 'kind', 'ruling', 'description', 'surface', 'tables-dir'];

class UsageError extends Error {}

type Flags = Map<string, string | true>;

/** The flags given, or a UsageError naming the problem. */
function parseArgs(argv: readonly string[]): Flags {
  const given: Flags = new Map();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (!token.startsWith('-')) throw new UsageError(`unexpected argument "${token}" (flags only; a value follows the flag that takes one)`);
    const name = token.startsWith('--') ? token.slice(2) : '';
    const isSwitch = SWITCHES.includes(name);
    if (!isSwitch && !VALUED.includes(name)) throw new UsageError(`unknown flag ${token}`);
    if (given.has(name)) throw new UsageError(`${token} given twice`);
    if (isSwitch) { given.set(name, true); continue; }
    const value = argv[i + 1];
    if (value === undefined) throw new UsageError(`${token} needs a value`);
    if (value.startsWith('-')) throw new UsageError(`${token} needs a value, but the next argument is the flag ${value}`);
    if (value === '') throw new UsageError(`${token} needs a value, and an empty one is not a value`);
    given.set(name, value);
    i++;
  }
  return given;
}

/** The value of a flag that takes one, or undefined when it was not given. */
function flagValue(given: Flags, name: string): string | undefined {
  const value = given.get(name);
  return typeof value === 'string' ? value : undefined;
}

const MODES = ['noop', 'fault', 'new', 'placeholder'] as const;
type Mode = (typeof MODES)[number];

/** What a run covers and how, decided from the flags before anything runs. */
interface RunPlan {
  mode: Mode;
  fault: Fault | undefined;
  milestone: boolean;
  only: string | undefined;
  surfaces: Surface[];
  tablesDir: string | undefined;
  allowPartial: boolean;
  dbPath: string;
}

/** Whether the second side is the new one (the wrapper, or the placeholder that stands for "not wired"). */
const isNewSide = (plan: RunPlan): boolean => plan.mode === 'new' || plan.mode === 'placeholder';

const DEFAULT_SURFACES: readonly Surface[] = ['engine', 'ties', 'links', 'build', 'pages'];

/** The surfaces a run covers, in the order they run. */
function resolveSurfaces(flag: string | undefined, hasOnly: boolean, isFault: boolean): Surface[] {
  if (flag === undefined) return hasOnly || isFault ? ['engine'] : [...DEFAULT_SURFACES];
  const asked = new Set<Surface>();
  for (const name of flag === 'all' ? DEFAULT_SURFACES : flag.split(',')) {
    const surface = SURFACES.find((s) => s === name);
    if (!surface) throw new UsageError(`unknown surface "${name}"; known: ${SURFACES.join(', ')}, or all`);
    if (asked.has(surface)) throw new UsageError(`surface "${name}" given twice`);
    asked.add(surface);
  }
  return SURFACES.filter((s) => asked.has(s));
}

/** The plan for these flags, or a UsageError for flags that do not fit together. */
function planRun(given: Flags): RunPlan {
  const modes = MODES.filter((m) => given.has(m));
  if (modes.length > 1) throw new UsageError('choose one of --noop, --fault <name>, --new, --placeholder');
  const mode = modes[0] ?? 'new';
  if (mode === 'noop' && given.has('transitions')) throw new UsageError('--noop must be exactly zero; transitions are not accepted with it');
  const faultName = flagValue(given, 'fault');
  const fault = mode === 'fault' ? FAULTS.find((f) => f.name === faultName) : undefined;
  if (mode === 'fault' && !fault) throw new UsageError(`unknown fault "${faultName}"; known: ${FAULTS.map((f) => f.name).join(', ')}`);
  if (given.has('emit-transition') && mode === 'noop') throw new UsageError('refusing to write a transition from a noop run');
  const milestone = given.has('milestone');
  if (milestone && mode === 'fault') throw new UsageError('--milestone is a size for --noop or --new; a fault is replayed over the self-test cases');
  const only = flagValue(given, 'only');
  const surfaces = resolveSurfaces(flagValue(given, 'surface'), only !== undefined, mode === 'fault');
  if (mode === 'fault' && surfaces.some((s) => s === 'build' || s === 'pages')) throw new UsageError('a fault is planted in the engine; build and pages do not run it (use --surface engine,ties,links)');
  const tablesArg = flagValue(given, 'tables-dir');
  const tablesDir = tablesArg ? resolve(tablesArg) : undefined;
  if (tablesDir !== undefined) {
    if (surfaces.some((s) => s !== 'build' && s !== 'pages')) throw new UsageError('--tables-dir applies to the build and pages surfaces only: use --surface build,pages (the engine, ties and links read dist/db.json)');
    if (!existsSync(tablesDir) || !statSync(tablesDir).isDirectory()) throw new UsageError(`--tables-dir ${tablesArg}: not a directory`);
  }
  if (given.has('emit-transition')) transitionKind(given);
  return { mode, fault, milestone, only, surfaces, tablesDir, allowPartial: given.has('allow-partial'), dbPath: flagValue(given, 'db') ?? defaultDbPath() };
}

/** What a run records as it goes: the reports of its checks, the time each took, and the sections it prints. */
class RunLog {
  readonly parity: { name: string; report: ParityReport }[] = [];
  readonly surfaceReports: SurfaceReport[] = [];
  readonly timings: { surface: string; ms: number }[] = [];

  section(title: string, text: string): void {
    console.log(`== ${title} ==\n${text}`);
  }

  addParity(name: string, report: ParityReport, title: string): void {
    this.parity.push({ name, report });
    this.section(title, formatReport(report));
  }

  addSurface(report: SurfaceReport, title: string): void {
    this.surfaceReports.push(report);
    this.section(title, formatSurface(report));
  }

  async timed<T>(name: string, work: () => Promise<T>): Promise<T> {
    const started = performance.now();
    try {
      return await work();
    } finally {
      this.timings.push({ surface: name, ms: performance.now() - started });
    }
  }
}

const pageNamesOf = (db: Db): PageNames => ({ release: String(db.meta?.release?.id ?? ''), build: String(db.meta?.build ?? '') });

/** One run: its plan and inputs, what it records, and the old builds and pages its surfaces share (each made at most once). */
class Run {
  readonly plan: RunPlan;
  readonly corpus: Corpus;
  readonly baseDb: Db;
  /** The engine corpus of this run, before any selection. */
  readonly allCases: CorpusCase[];
  /** Every case a transition may name: the milestone corpus, which holds the pull-request corpus. */
  readonly transitionCaseIds: ReadonlySet<string>;
  readonly transitions: TransitionFile[] | undefined;
  readonly log = new RunLog();
  private readonly builds = new Map<'first' | 'second', Promise<BuiltRelease>>();
  private newBuilt: Promise<BuiltRelease> | null = null;
  private distPageSet: PageSet | null = null;

  constructor(plan: RunPlan, corpus: Corpus, baseDb: Db, transitions: TransitionFile[] | undefined) {
    this.plan = plan;
    this.corpus = corpus;
    this.baseDb = baseDb;
    this.allCases = engineCorpusCases(corpus, baseDb, plan.milestone);
    // A transition is measured at the milestone size and must stay valid in a pull-request run, which asks the first 1,000 of the same cases.
    this.transitionCaseIds = new Set((plan.milestone ? this.allCases : engineCorpusCases(corpus, baseDb, true)).map((c) => c.id));
    this.transitions = transitions;
  }

  /** The cases the engine and core surfaces replay: all of them, or those whose id starts with --only. */
  selectedCases(): CorpusCase[] {
    const { only } = this.plan;
    return only ? this.allCases.filter((c) => c.id.startsWith(only)) : this.allCases;
  }

  /** The second side for a db: a second copy of old, old with the fault, the old engine behind the typed wrapper (the new side, WP-11), or a placeholder that answers nothing. */
  async secondSide(db: Db): Promise<Adapter> {
    const { mode, fault } = this.plan;
    if (mode === 'noop') return createOldAdapter({ name: 'old (second copy)', db, engineDir: copyEngine([]) });
    if (fault) return createOldAdapter({ name: `old + fault ${fault.name}`, db, engineDir: copyEngine(fault.patches) });
    if (mode === 'placeholder') return createNewPlaceholder();
    // The wrapper reads the typed db and stages its own engine, with the port switch applied: nothing is shared with the old side.
    const typed = checkDb(db);
    if (!typed.ok) throw new Error(`the db does not satisfy the typed contract of @atlas/data: ${typed.problems.slice(0, 5).join('; ')}`);
    return createNewAdapter({ db: typed.db });
  }

  /**
   * The new side's engine on the database the new build wrote, so that a deliberate change in the build reaches the answers
   * (a transition lists it); on a build that changes nothing this is the database the old side reads.
   */
  async secondSideOnNewBuild(): Promise<Adapter> {
    const built = await this.newBuild();
    return this.secondSide(readDb(built.dbPath));
  }

  /** The old build, made on first use. A build that fails rejects with BuildFailed. */
  build(which: 'first' | 'second'): Promise<BuiltRelease> {
    return getOrCreate(this.builds, which, () => {
      const { tablesDir } = this.plan;
      const buildDate = typeof this.baseDb.meta?.build === 'string' ? this.baseDb.meta.build : undefined;
      const started = buildInCopy({
        label: which === 'first' ? 'old build' : 'old build, second copy',
        ...(tablesDir ? { tablesDir } : {}), ...(buildDate ? { buildDate } : {}),
      });
      // Started early, awaited later: a rejection before anyone awaits it is not a crash; the awaiting surface reports it.
      started.catch(() => undefined);
      return started;
    });
  }

  /** The new build (WP-20), made on first use from the same tables as the old one it is compared with. */
  newBuild(): Promise<BuiltRelease> {
    if (this.newBuilt) return this.newBuilt;
    const { tablesDir } = this.plan;
    const buildDate = typeof this.baseDb.meta?.build === 'string' ? this.baseDb.meta.build : undefined;
    const started = buildNew({ label: 'new build (packages/build, SQLite reconstruction)', ...(tablesDir ? { tablesDir } : {}), ...(buildDate ? { buildDate } : {}) });
    started.catch(() => undefined);
    this.newBuilt = started;
    return started;
  }

  /** The new build takes about as long as the old one; it starts with the others, and the build surface awaits it. */
  startNewBuild(): void {
    void this.newBuild();
    if (this.plan.tablesDir) void this.build('first');
  }

  /** The builds take 25 to 45 s in another process, so they start now and the surface that needs one awaits it. */
  startBuilds(): void {
    void this.build('second');
    if (this.plan.tablesDir) void this.build('first');
  }

  /** The pages of the build already in dist/, read once. */
  distPages(): PageSet {
    this.distPageSet ??= readPages(join(dirname(this.plan.dbPath), 'materials'), 'old pages (dist/materials)', pageNamesOf(this.baseDb));
    return this.distPageSet;
  }
}

function showProgress(done: number, total: number): void {
  if (done % 100 === 0 || done === total) process.stdout.write(`\r  ${done}/${total} cases`);
}

async function runEngine(run: Run): Promise<void> {
  const { plan, log } = run;
  const cases = run.selectedCases();
  const before = await createOld(readDb(plan.dbPath));
  let after: Adapter;
  try {
    after = plan.mode === 'new' ? await run.secondSideOnNewBuild() : await run.secondSide(readDb(plan.dbPath));
  } catch (e) {
    if (!(e instanceof BuildFailed)) throw e;
    log.addSurface(cannotCompare({ surface: 'engine', unit: 'case', before: 'old', after: 'new' }, 'after', `the new build did not finish, so the new engine had no database: ${e.message}`), 'engine');
    return;
  }
  const interactive = process.stdout.isTTY;
  const here = run.transitions ? partOf(run.transitions, (d) => d.case !== BUILD_CASE) : undefined;
  const report = await log.timed('engine', () => runParity({
    corpusName: run.corpus.corpus, cases, knownCaseIds: new Set(run.allCases.map((c) => c.id)), transitionCaseIds: run.transitionCaseIds, before, after,
    ...(here ? { transitions: here } : {}), ...(interactive ? { onProgress: showProgress } : {}),
  }));
  if (interactive) process.stdout.write('\r');
  log.addParity('engine', report, `engine (${cases.length} of ${run.allCases.length} cases)`);
}

async function runTies(run: Run): Promise<void> {
  const { plan, log } = run;
  const sample = tieSample(run.corpus.cases, plan.milestone ? TIE_SAMPLE_MILESTONE : TIE_SAMPLE_PR);
  const permuted = (): Db => permuteProductOrder(readDb(plan.dbPath), TIE_SEED);
  const before = await createOldAdapter({ name: 'old (products reordered)', db: permuted() });
  const after = await run.secondSide(permuted());
  // Both sides read the same data here, so only a transition written for this corpus applies.
  const forTies = run.transitions?.filter((f) => f.corpus === 'ties');
  const report = await log.timed('ties', () => runParity({ corpusName: 'ties', cases: sample, before, after, ...(forTies ? { transitions: forTies } : {}) }));
  log.addParity('ties', report, `ties: both sides on a db whose product orders are permuted (seed ${TIE_SEED}, ${sample.length} cases)`);
  const rule = await log.timed('ties-rule', () => checkFirstWins({ cases: sample, base: readDb(plan.dbPath), permutedDb: permuted(), permuted: after, beforeName: before.name }));
  log.addSurface(rule, 'ties: the first-wins rule');
}

async function runLinkChecks(run: Run): Promise<void> {
  const { plan, log } = run;
  const { TEMPLATES } = await import(pathToFileURL(join(REPO_ROOT, 'app', 'js', 'ui', 'templates.js')).href);
  const links = historicLinks(TEMPLATES);
  // The back-links on the built pages are links too. No pages, or pages with no back-link to the selector, is not "no differences".
  let pageHashes: string[] = [];
  let pageProblem: string | null = null;
  const pagesDir = join(dirname(plan.dbPath), 'materials');
  if (!existsSync(pagesDir)) pageProblem = `no material pages in ${pagesDir} (npm run build writes them; npm run build:diff removes them)`;
  else {
    pageHashes = hashesInPages(run.distPages().html);
    if (pageHashes.length === 0) pageProblem = 'no page links back to the selector, so there is nothing to open (did the renderer change its links?)';
  }
  const before = await createOld(readDb(plan.dbPath));
  const after = await run.secondSide(readDb(plan.dbPath));
  const checked = await log.timed('links', () => runLinks({ units: linkUnits(links, pageHashes), before, after }));
  const { openings } = checked;
  if (pageProblem !== null) {
    openings.notComputable.push({ case: 'links', record: 'page links', tier: null, field: null, side: 'before', reason: `the back-links on the built pages were not checked: ${pageProblem}` });
    if (openings.status === 'zero') openings.status = 'not-computable';
  }
  openings.notes.push(`corpus ${digestOfLinks(links)}; ${pageHashes.length} distinct back-links read off the built pages`);
  log.addSurface(openings, 'links: each link opened by both decoders');
  if (checked.replay) log.addParity('links', checked.replay, `links: the ${checked.replayCases} distinct questions they ask, answered by both engines`);
}

/**
 * P-build, new side (WP-20): the old build's db.json (the one in dist/, or with --tables-dir an old build of those tables) against
 * the new build of the same tables, path by path. Either build failing is its own outcome, never zero.
 */
async function runNewBuild(run: Run, head: { surface: Surface; unit: string }): Promise<void> {
  const { plan, log } = run;
  try {
    const fresh = await log.timed('build-new', () => run.newBuild());
    const old = plan.tablesDir ? await log.timed('build-old', () => run.build('first')) : null;
    const report = await log.timed('build', () => compareBuilds(
      old ? { path: old.dbPath, label: old.label } : { path: plan.dbPath, label: 'old build (dist/db.json)' },
      { path: fresh.dbPath, label: fresh.label },
    ));
    report.notes.push(`new build ${seconds(fresh.seconds * 1000)}${old ? `, old ${seconds(old.seconds * 1000)}` : ''}`);
    if (plan.tablesDir) report.notes.push(`both sides were built from the tables in ${plan.tablesDir}`);
    const here = run.transitions ? partOf(run.transitions, (d) => d.case === BUILD_CASE) : [];
    log.addSurface(settleSurface(report, here, BUILD_CASE), 'build: db.json, path by path');
  } catch (e) {
    if (!(e instanceof BuildFailed)) throw e;
    log.addSurface(cannotCompare({ ...head, before: 'old', after: 'new' }, 'both', `a build did not finish, so nothing was compared: ${e.message}`), 'build');
  }
}

/** P-build and P-pages: the old build compared with a second build (or, with --tables-dir, with a first one made from the same tables). */
async function runBuildOrPages(run: Run, surface: 'build' | 'pages'): Promise<void> {
  const { plan, log } = run;
  const head = { surface, unit: surface === 'build' ? 'value' : 'page' };
  if (plan.mode === 'new' && surface === 'build') {
    await runNewBuild(run, head);
    return;
  }
  if (isNewSide(plan)) {
    // The placeholder answers nothing by design; the new pages are WP-24's.
    const wiring = surface === 'build' ? 'build' : 'pages (WP-24)';
    const report = cannotCompare({ ...head, before: 'old', after: 'new (not wired yet)' }, 'after', `the new ${wiring} ${surface === 'build' ? 'is the placeholder' : 'are not wired yet'}; nothing was compared`);
    log.addSurface(report, surface);
    return;
  }
  try {
    // With --tables-dir both sides build from those tables; without it the first side is the build already in dist/.
    const second = await log.timed(`${surface}-build`, () => run.build('second'));
    const first = plan.tablesDir ? await log.timed(`${surface}-build-first`, () => run.build('first')) : null;
    if (surface === 'build') {
      const report = await log.timed('build', () => compareBuilds(
        first ? { path: first.dbPath, label: first.label } : { path: plan.dbPath, label: 'old build (dist/db.json)' },
        { path: second.dbPath, label: second.label },
      ));
      report.notes.push(`second build ${seconds(second.seconds * 1000)}${first ? `, first ${seconds(first.seconds * 1000)}` : ''}`);
      if (plan.tablesDir) report.notes.push(`both sides were built from the tables in ${plan.tablesDir}: this shows that those tables build the same twice, not what they change (npm run build:diff shows that)`);
      log.addSurface(report, 'build: db.json, path by path');
      return;
    }
    if (!second.materialsDir) throw new BuildFailed(`${second.label} wrote no material pages`);
    if (first && !first.materialsDir) throw new BuildFailed(`${first.label} wrote no material pages`);
    const left = first?.materialsDir ? readPages(first.materialsDir, first.label, pageNamesOf(readDb(first.dbPath))) : run.distPages();
    const right = readPages(second.materialsDir, second.label, pageNamesOf(readDb(second.dbPath)));
    log.addSurface(await log.timed('pages', async () => comparePages(left, right)), 'pages: the visible text of every material page');
  } catch (e) {
    if (!(e instanceof BuildFailed)) throw e;
    // The old build could not answer for these tables: its own outcome, never zero.
    log.addSurface(cannotCompare({ ...head, before: 'old', after: 'old (second copy)' }, 'both', `a build did not finish, so nothing was compared: ${e.message}`), surface);
  }
}

async function runCore(run: Run): Promise<void> {
  installCoreHook();
  const { plan, log } = run;
  const full = await createOld(readDb(plan.dbPath));
  const result = await log.timed('core', () => runCoreSufficiency({ cases: run.selectedCases(), full, db: readDb(plan.dbPath) }));
  if (result.kind === 'parity') log.addParity('core', result.report, 'core sufficiency');
  else log.addSurface(result.report, 'core sufficiency (WP-25 hook)');
  if (!coreSufficiencyHook()) console.log('(core: no hook is registered yet, so this check is not computable by design)');
}

async function runSurface(run: Run, surface: Surface): Promise<void> {
  switch (surface) {
    case 'engine': return runEngine(run);
    case 'ties': return runTies(run);
    case 'links': return runLinkChecks(run);
    case 'build':
    case 'pages': return runBuildOrPages(run, surface);
    case 'core': return runCore(run);
  }
}

/** The mutation self-test: every fault into a temporary copy, each of which the comparison must name. */
async function mainMutate(given: Flags): Promise<number> {
  for (const bad of ['noop', 'new', 'fault', 'milestone', 'surface', 'tables-dir', 'only', 'transitions', 'emit-transition', 'allow-partial', 'corpus']) {
    if (given.has(bad)) throw new UsageError(`--mutate runs alone; --${bad} does not apply (it uses its own cases)`);
  }
  const cases = mutationCases(loadCorpus());
  console.log(`parity:mutate over ${cases.length} cases per fault`);
  const result = await runMutate({
    cases, dbPath: flagValue(given, 'db') ?? defaultDbPath(),
    onFault: (row) => console.log(`  ${row.caught ? 'caught' : 'MISSED'} ${row.fault} (${row.seconds.toFixed(1)}s)`),
  });
  console.log(formatMutate(result));
  const json = flagValue(given, 'json');
  if (json !== undefined) writeFileSync(json, `${JSON.stringify(result, null, 1)}\n`);
  // A fault that reached a real engine file makes everything after it meaningless: a crash of the self-test, not a verdict.
  if (!result.engineUntouched) throw new Error('a fault changed a real engine file under app/js/engine; the self-test is void');
  return result.caught === result.total ? 0 : 3;
}

/** The kind named by --kind (science when none), or a UsageError: the kind decides which tiers a transition may list. */
function transitionKind(given: Flags): (typeof TRANSITION_KINDS)[number] {
  const asked = flagValue(given, 'kind') ?? 'science';
  const kind = TRANSITION_KINDS.find((k) => k === asked);
  if (!kind) throw new UsageError(`--kind "${asked}": known kinds are ${TRANSITION_KINDS.join(', ')}`);
  return kind;
}

/** Why a transition file cannot be written from these reports, or '' when it can. */
function transitionRefusal(places: readonly { name: string; status: Status; notComputable: number; partial: boolean; truncated: boolean }[], allowPartial: boolean): string {
  for (const p of places) {
    if (p.status !== 'differs' && p.status !== 'zero') return `${p.name} having status ${p.status}`;
    if (p.notComputable) return `${p.name} having not-computable places`;
    if (p.truncated) return `${p.name} having more differences than the report keeps`;
    if (p.partial && !allowPartial) return `a partial ${p.name} run (add --allow-partial)`;
  }
  return places.some((p) => p.status === 'differs') ? '' : 'a run with no difference to list';
}

/**
 * Write the differences of the engine and of P-build as one transition file (run it with --transitions pointing at a folder
 * with none, so the differences are not already accounted for). False, after saying why on stderr, when this run may not be the source of one.
 */
function emitTransition(given: Flags, path: string, run: Run): boolean {
  const engine = run.log.parity.find((p) => p.name === 'engine')?.report;
  if (!engine) throw new UsageError('--emit-transition needs the engine surface');
  const build = run.log.surfaceReports.find((r) => r.surface === 'build');
  const places = [
    { name: 'engine', status: engine.status, notComputable: engine.notComputable.length, partial: engine.partial, truncated: false },
    ...(build ? [{ name: 'build', status: build.status, notComputable: build.notComputable.length, partial: false, truncated: build.truncated }] : []),
  ];
  const why = transitionRefusal(places, run.plan.allowPartial);
  if (why) {
    console.error(`parity: refusing to write a transition from ${why}`);
    return false;
  }
  const transition = buildTransition({
    id: flagValue(given, 'id') ?? 'unnamed', kind: transitionKind(given),
    description: flagValue(given, 'description') ?? '', ruling: flagValue(given, 'ruling') ?? '',
    corpus: run.corpus.corpus, differences: [...engine.differences, ...(build?.differences ?? [])],
  });
  writeFileSync(path, `${JSON.stringify(transition, null, 1)}\n`);
  console.log(`transition written: ${path} (${transition.differences.length} differences, ${transition.digest})`);
  return true;
}

function printSummary(log: RunLog, wallMs: number): void {
  console.log('== summary ==');
  const rows = [
    ...log.parity.map(({ name, report: r }) => ({ name, status: r.status, what: `${r.casesCompared} of ${r.casesSelected} cases compared, ${r.differences.length} differences` })),
    ...log.surfaceReports.map((r) => ({ name: r.surface, status: r.status, what: `${r.unitsCompared} ${r.unit}s compared, ${r.differenceCount} differences` })),
  ];
  for (const row of rows) console.log(`  ${row.name.padEnd(8)} ${row.status.padEnd(15)} ${row.what}`);
  console.log(`  timings: ${log.timings.map((t) => `${t.surface} ${seconds(t.ms)}`).join(', ')}; setup + run wall time: ${seconds(wallMs)}`);
}

function writeJson(path: string, run: Run, status: Status, wallMs: number): void {
  const { plan, log } = run;
  const report = {
    status, mode: plan.mode, milestone: plan.milestone, surfaces: plan.surfaces,
    parity: Object.fromEntries(log.parity.map((p) => [p.name, p.report])), surfaceReports: log.surfaceReports, timings: log.timings, wallMs: Math.round(wallMs),
  };
  writeFileSync(path, `${JSON.stringify(report, null, 1)}\n`);
}

/** The process exit code for a finished run: the status, adjusted for the self-tests (noop, fault) and for a partial run. */
function exitCodeFor(run: Run, status: Status): number {
  const { plan, log } = run;
  let code = exitCode(status);
  if (plan.mode === 'noop' && status !== 'zero') {
    console.error('NOOP FAILED: old against a copy of itself must be exactly zero differences');
    code = code || 1;
  }
  if (plan.fault) {
    const parityDifferences = log.parity.flatMap((p) => p.report.differences);
    const unanswered = log.parity.reduce((n, p) => n + p.report.casesNotComputable, 0);
    if (unanswered > 0) {
      console.error(`FAULT NOT CAUGHT: ${unanswered} case(s) could not be answered by one side, so the differences found cannot be trusted as the fault's`);
      code = 3;
    } else if (parityDifferences.length + log.surfaceReports.reduce((n, r) => n + r.differences.length, 0) === 0) {
      console.error(`FAULT NOT CAUGHT: ${plan.fault.name} produced no difference; the harness is blind to it`);
      code = 3;
    } else {
      const tiers = new Set(parityDifferences.map((d) => d.tier));
      const missed = plan.fault.expect.filter((t) => !tiers.has(t));
      const moved = new Set(log.parity.flatMap((p) => p.report.movedRecords)).size;
      // Caught: its own code, 5, so a caught fault is not read as "differs" (1) or as a crash (70). With --transitions the
      // transition decides (0 or 1); a not-computable run keeps 2.
      if (missed.length) code = 3;
      else if (!run.transitions && code === 1) code = 5;
      console.log(`fault ${plan.fault.name}: caught, ${moved} record(s) moved, tiers hit: ${[...tiers].join(', ')}${missed.length ? ` (expected also: ${missed.join(', ')})` : ''}`);
    }
  }
  if (log.parity.some((p) => p.report.partial) && !plan.allowPartial && code === 0) {
    console.error('PARTIAL RUN: a selection (--only) cannot show the corpus is clean; add --allow-partial to accept it');
    code = 4;
  }
  return code;
}

async function main(argv: readonly string[]): Promise<number> {
  const given = parseArgs(argv);
  if (given.has('list-faults')) {
    for (const f of FAULTS) console.log(`${f.name.padEnd(20)} ${f.expect.join('+').padEnd(20)} ${f.description}`);
    return 0;
  }
  if (given.has('mutate')) return mainMutate(given);

  const plan = planRun(given);
  const corpus = loadCorpus(flagValue(given, 'corpus'));
  const t0 = performance.now();
  const baseDb = readDb(plan.dbPath);
  console.log(`db: release ${baseDb.meta?.release?.id ?? '?'}, snapshot ${baseDb.meta?.snapshot ?? '?'}; corpus ${corpus.corpus} built from release ${corpus.generatedFrom.release ?? '?'}`);
  console.log(`mode: ${plan.mode}${plan.fault ? ` ${plan.fault.name}` : ''}${plan.milestone ? `, milestone (${MILESTONE_REPLAYS} replays; per PR ${PR_REPLAYS})` : ''}; surfaces: ${plan.surfaces.join(', ')}`);

  // Transitions apply to a real comparison, not to the self-tests, unless asked for.
  const transitionDir = flagValue(given, 'transitions') ?? (isNewSide(plan) ? join(REPO_ROOT, 'parity', 'transitions') : undefined);
  const run = new Run(plan, corpus, baseDb, transitionDir ? loadTransitions(transitionDir) : undefined);
  if (!isNewSide(plan) && plan.surfaces.some((s) => s === 'build' || s === 'pages')) run.startBuilds();
  if (plan.mode === 'new' && (plan.surfaces.includes('build') || plan.surfaces.includes('engine'))) run.startNewBuild();

  for (const surface of plan.surfaces) await runSurface(run, surface);

  const status = overallStatus([...run.log.parity.map((p) => p.report.status), ...run.log.surfaceReports.map((s) => s.status)]);
  const wallMs = performance.now() - t0;
  printSummary(run.log, wallMs);
  const jsonPath = flagValue(given, 'json');
  if (jsonPath) writeJson(jsonPath, run, status, wallMs);
  const transitionPath = flagValue(given, 'emit-transition');
  if (transitionPath && !emitTransition(given, transitionPath, run)) return 64;

  const code = exitCodeFor(run, status);
  // The last line says what the exit code says: a partial run is not "zero", and a fault that was not caught is not its status.
  console.log(`RESULT: ${code === 4 ? 'partial' : code === 3 ? 'fault-not-caught' : status}`);
  return code;
}

/** Run the CLI for these arguments and return its exit code. A usage error is 64 and says why; anything else escapes to the caller (70). */
export async function runCli(argv: readonly string[]): Promise<number> {
  try {
    return await main(argv);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    console.error(`parity: ${err.message}`);
    return 64;
  }
}
