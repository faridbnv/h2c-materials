// The build, end to end, without the bundle and the pages (WP-20): rebuild the clean SQLite reconstruction from the CSV tables,
// read the tables back out of it in `_ord` order, check them, compile, extend (the old estimate stage, unchanged), validate,
// and write db.json, reference.json and the validation report. This is build/src/index.js, stages 1 to 6, on the new
// foundation; the bundle (stage 7) and the pages (stage 8) are the old ones, until WP-24 and the page work replace them.
//
//   reconstruct  CSV tables -> a fresh in-memory SQLite database, verified     @atlas/data rebuild (WP-09)
//   check        the schema gate's cross-column checks on the rows read        schema-gate.ts
//   load         SQLite -> the row objects the compiler reads                    load.ts
//   compile .. validate                                                         pipeline.ts
//   contract     db.json and reference.json against schema/*.schema.json         contract.ts
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TableName } from '@atlas/data';
import { DataInputError, buildInMemory } from '@atlas/data/rebuild';
import { exportTable } from '@atlas/data/storage';
import { contractIssues } from './contract.ts';
import { loadReference, loadSheets, snapshotDate, workbookFrom } from './load.ts';
import { buildDatabase, stopwatch } from './pipeline.ts';
import type { Stopwatch } from './pipeline.ts';
import { polymerEnvironmentReportLines } from './polymer-environment.ts';
import { compileReference } from './reference.ts';
import { RELEASE_INPUTS, releaseIdentity } from './release.ts';
import { checkTables, gateTablesOf, loadSchemas } from './schema-gate.ts';
import type { Dyn, Issue, Sheet } from './types.ts';
import { estimateReportLines } from './estimate-adapter.ts';
import { formatReport } from './validate.ts';

const here = dirname(fileURLToPath(import.meta.url));
/** The project this package is in: packages/build/src -> the repository root. */
export const PROJECT_ROOT = resolve(here, '../../..');

export interface RunOptions {
  /** The project to build: its data/, schema/ and the files the release identity digests. Defaults to the repository. */
  projectRoot?: string;
  /** Where the tables and manifest are, when not <projectRoot>/data (a temporary copy of the tables, for parity). */
  dataDir?: string;
  /** Where db.json, reference.json and validation-report.md are written; null writes nothing. */
  outDir: string | null;
  /** The core database alone, without the estimate stage. */
  estimates?: boolean;
  /** Stop after the report (npm run validate). */
  validateOnly?: boolean;
  /** The build date to stamp (an ISO date); defaults to SOURCE_DATE_EPOCH, else the commit date. */
  buildDate?: string;
  log?: (line: string) => void;
}

export interface RunResult {
  /**
   * No error issue and no failure to reconstruct or to pass the schema gate. A build that failed before the compiler ran has no
   * `db`; one that failed validation has its (unvalidated) `db` and `ok: false`, and writes only its report.
   */
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  db: Dyn | null;
  reference: Dyn | null;
  /** Wall time in ms: the reconstruction, then the load and each stage of the pipeline. */
  timing: Record<string, number>;
  files: { dbJson: string; referenceJson: string } | null;
}

/** The build date is the source's date, not the clock's, so the same commit builds the same bytes on any day. */
export function buildDate(projectRoot: string = PROJECT_ROOT): string {
  // As the old build: where git cannot say (no repository, no git), today's date. A build that must repeat sets SOURCE_DATE_EPOCH.
  if (process.env.SOURCE_DATE_EPOCH) return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString().slice(0, 10);
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs'], { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * The release a build is: its tables, the schema, the rules and the engine, by content (D96). The old build digested the project
 * it ran in; a build of another data directory (parity's --tables-dir) must digest THOSE tables, or its release names data it did
 * not build. The digest reads paths relative to a root, so for another data directory the root is a view of the project with
 * `data` pointing at it (links only; nothing is copied or written in the project).
 */
function releaseOf(projectRoot: string, dataDir: string): Dyn {
  if (dataDir === join(projectRoot, 'data')) return releaseIdentity(projectRoot);
  const view = mkdtempSync(join(tmpdir(), 'h2c-release-view-'));
  try {
    const tops = new Set(Object.values(RELEASE_INPUTS).flat().map((path) => path.split('/')[0] ?? path));
    for (const top of tops) symlinkSync(top === 'data' ? dataDir : join(projectRoot, top), join(view, top), 'dir');
    return releaseIdentity(view);
  } finally {
    rmSync(view, { recursive: true, force: true });
  }
}

/** The schema gate over the loaded tables. Its own function, so the schemas, vocabularies and per-record wrappers it builds are garbage the moment it returns, not live heap for the estimate stage. */
function schemaGate(projectRoot: string, sheets: Map<TableName, Sheet>, notCanonical: ReadonlySet<string>): Issue[] {
  const { tables: schemas, vocab } = loadSchemas(join(projectRoot, 'schema'));
  return checkTables(gateTablesOf(sheets), schemas, vocab, { isCanonical: (name) => !notCanonical.has(name) });
}

function failed(errors: Issue[], timing: Record<string, number>): RunResult {
  return { ok: false, errors, warnings: [], db: null, reference: null, timing, files: null };
}

interface TablesRead {
  /** Every table, in `_ord` order. */
  sheets: Map<TableName, Sheet>;
  /** The generic reference rows (reference.csv with its envelopes). */
  referenceRows: Dyn[];
  /** The tables whose file is not their canonical text. */
  notCanonical: Set<string>;
}

/** The tables of the data directory, read from a fresh reconstruction. */
function readTables(dataDir: string, timed: Stopwatch): TablesRead {
  const { db: sqlite, inputs } = timed('reconstruct', () => buildInMemory(dataDir));
  try {
    const sheets = timed('load', () => loadSheets(sqlite));
    const notCanonical = new Set<string>([...inputs.tables.values()].filter((input) => exportTable(sqlite, input.table) !== input.bytes.toString('utf8')).map((input) => input.table));
    return { sheets, referenceRows: loadReference(sqlite), notCanonical };
  } finally {
    sqlite.close();
  }
}

export function runBuild(options: RunOptions): RunResult {
  const projectRoot = options.projectRoot ?? PROJECT_ROOT;
  const dataDir = options.dataDir ?? join(projectRoot, 'data');
  const log = options.log ?? (() => undefined);
  const withEstimates = options.estimates ?? true;
  const build = options.buildDate ?? buildDate(projectRoot);
  const timing: Record<string, number> = {};
  const timed = stopwatch(timing);
  // A failed build must not leave the last good build's files in the output directory to be mistaken for its own.
  if (options.outDir !== null) for (const file of ['db.json', 'reference.json', 'validation-report.md']) rmSync(join(options.outDir, file), { force: true });

  // The clean reconstruction: any table that is not the schema's, the manifest's, or satisfies a constraint stops here, and
  // every problem found is listed (never a partial database). Everything the later stages need is read out of it in this
  // one step and the database is closed, so the parsed CSV and the SQLite file are not alive while the estimate stage runs.
  let read: TablesRead;
  try {
    read = readTables(dataDir, timed);
  } catch (error) {
    if (!(error instanceof DataInputError)) throw error;
    return failed(error.problems.map((message): Issue => ({ level: 'error', code: 'RECONSTRUCT', where: dataDir, message })), timing);
  }
  const { sheets, referenceRows, notCanonical } = read;
  const wb = workbookFrom(sheets);

  // The schema gate, on the rows as the compiler will read them. SCHEMA-FORMAT compares each table's export from the
  // reconstruction with the file's own bytes.
  const issues: Issue[] = timed('check', () => schemaGate(projectRoot, sheets, notCanonical));
  if (issues.some((i) => i.level === 'error')) return failed(issues.filter((i) => i.level === 'error'), timing);

  const snapshot = snapshotDate(wb.Method?.rows ?? []);
  const built = buildDatabase(wb, { snapshot, build, estimates: withEstimates });
  Object.assign(timing, built.timing);
  const { db } = built;
  issues.push(...built.issues);
  // What this build is, by its content rather than its date (D96): every scenario, link and export carries it.
  const release = timed('release', () => releaseOf(projectRoot, dataDir));
  db.meta.release = release;

  const reference = compileReference(referenceRows, issues, 'data/tables/reference.csv', db.registry);
  issues.push(...contractIssues({ db, reference }));

  const report = formatReport(db, reference, issues, {
    snapshot, build,
    sections: { polymerEnvironment: polymerEnvironmentReportLines(db), estimates: withEstimates ? estimateReportLines(db) : [] },
  });
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warn');
  log(`release ${release.id} (data ${snapshot})`);
  log(`materials ${db.meta.counts.materials}  measurements ${db.meta.counts.measurements}  profiles ${db.meta.counts.profiles}  reference ${reference.meta.count}`);
  log(`errors ${errors.length}   warnings ${warnings.length}`);
  log(`stages  ${Object.entries(timing).map(([name, ms]) => `${name} ${ms} ms`).join('   ')}`);
  for (const e of errors.slice(0, 20)) log(`  ERROR  [${e.code}] ${e.where}: ${e.message}`);
  for (const w of warnings.slice(0, 10)) log(`  warn   [${w.code}] ${w.where}: ${w.message}`);

  let files: RunResult['files'] = null;
  if (options.outDir !== null) {
    mkdirSync(options.outDir, { recursive: true });
    writeFileSync(join(options.outDir, 'validation-report.md'), report);
    if (errors.length === 0 && !options.validateOnly) {
      const dbJson = join(options.outDir, 'db.json');
      const referenceJson = join(options.outDir, 'reference.json');
      writeFileSync(dbJson, JSON.stringify(db));
      writeFileSync(referenceJson, JSON.stringify(reference));
      files = { dbJson, referenceJson };
    }
  }
  return { ok: errors.length === 0, errors, warnings, db, reference, timing, files };
}
