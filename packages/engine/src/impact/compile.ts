// The old build's core compile of a staged snapshot, made into the typed Db the engine reads.
//
// The compiled database goes through JSON and the typed contract check (@atlas/data checkDb) before the engine sees it,
// which is the shape the page receives from dist/db.json: nothing the compile left as `undefined` or shared by reference
// reaches the engine. The release is a preview's: the first 12 hex characters of the staged tables' digest.
import { checkDb } from '@atlas/data';
import type { Db } from '@atlas/data';
import type { ReleaseId } from '@atlas/domain';
import { releaseIdOf } from '../guards.ts';
import { loadOldBuild } from './old-build.ts';
import type { OldBuild } from './old-build.ts';
import { ImpactRefusal } from './stage.ts';
import type { StagedSnapshot } from './stage.ts';

let build: Promise<OldBuild> | undefined;

/** A preview's release: the first 12 hex characters of the staged tables' digest. */
export const previewRelease = (snapshot: StagedSnapshot): ReleaseId => releaseIdOf(snapshot.digest.slice(0, 12));

export interface CompileOptions {
  /** Run the estimate stage too (about 20 s). Without it the database is the core alone, which must validate on its own. */
  readonly estimates: boolean;
}

export async function compileSnapshot(snapshot: StagedSnapshot, options: CompileOptions): Promise<Db> {
  const old = await (build ??= loadOldBuild());
  const wb = old.loadTables(`${snapshot.dir}/data`);
  const { db, issues } = old.buildDatabase(wb, { snapshot: old.snapshotDate(wb.Method.rows), build: 'preview', estimates: options.estimates, cache: false });
  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length) {
    throw new ImpactRefusal(`the data does not build: ${errors.slice(0, 5).map((e) => `[${e.code}] ${e.where}: ${e.message}`).join('; ')}${errors.length > 5 ? ` (and ${errors.length - 5} more)` : ''}`);
  }
  const stamped = { ...db, meta: { ...db.meta, release: { id: previewRelease(snapshot), digest: snapshot.digest, inputs: { data: snapshot.digest } } } };
  const checked = checkDb(JSON.parse(JSON.stringify(stamped)));
  if (!checked.ok) throw new ImpactRefusal(`the compiled database does not satisfy the typed contract: ${checked.problems.slice(0, 5).join('; ')}`);
  return checked.db;
}
