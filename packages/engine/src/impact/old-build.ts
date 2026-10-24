// The old build's core compile, loaded and never edited (build/src/load.js, pipeline.js). The impact preview runs it on a
// staged copy of the tables: no estimate stage unless asked, no cache, no files written outside the staging directory.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from '../old-engine.ts';

export interface BuildIssue {
  readonly level: string;
  readonly code: string;
  readonly where: string;
  readonly message: string;
}

/** The tables as the compiler reads them, by sheet name. Only the Method sheet is read here, for the snapshot date. */
export interface Workbook {
  readonly Method: { readonly rows: unknown };
}

export interface BuildOptions {
  readonly snapshot: string;
  readonly build: string;
  readonly estimates: boolean;
  readonly cache: boolean;
}

export interface OldBuild {
  loadTables(dataDir: string): Workbook;
  snapshotDate(methodRows: unknown): string;
  buildDatabase(wb: Workbook, options: BuildOptions): { readonly db: { readonly meta: Readonly<Record<string, unknown>> }; readonly issues: readonly BuildIssue[] };
}

export async function loadOldBuild(buildRoot: string = join(REPO_ROOT, 'build', 'src')): Promise<OldBuild> {
  const load = (file: string) => import(pathToFileURL(join(buildRoot, file)).href);
  const [{ loadTables, snapshotDate }, { buildDatabase }] = await Promise.all([load('load.js'), load('pipeline.js')]);
  return { loadTables, snapshotDate, buildDatabase };
}
