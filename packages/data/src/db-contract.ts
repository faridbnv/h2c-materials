import { dbShape } from './generated/db-shape.ts';
import type { Infer } from './shape.ts';

/**
 * The typed contract of the old build-to-app data shape: `dist/db.json`, what the old build writes and the old
 * interface reads. The structure comes from schema/db.schema.json through `npm run types:gen` (that file is owned by
 * `main` and is not edited here); `dbShape` is both the TypeScript type and the runtime check, so they cannot disagree.
 * It checks structure and primitive kinds with every key closed; patterns and minimums stay with the build's Ajv pass.
 */
export type Db = Infer<typeof dbShape>;
export type DbSection = keyof Db;

export type Material = Db['materials'][number];
export type Grade = Db['grades'][number];
export type Measurement = Db['measurements'][number];
export type Profile = Db['profiles'][number];
export type Source = Db['sources'][number];
export type Price = Db['prices'][number];

/** The sections a db.json must have; the others (`conversions`, `chamberNeed`, ...) appear when their table has rows. */
export const REQUIRED_SECTIONS = [
  'meta', 'materials', 'grades', 'measurements', 'profiles', 'printGuide', 'evidence', 'knowHow',
  'prices', 'fxRates', 'sources', 'coverage', 'method', 'polymers', 'registry',
] as const satisfies readonly DbSection[];

export type DbCheck =
  | { readonly ok: true; readonly db: Db }
  | { readonly ok: false; readonly problems: readonly string[] };

/** Check a value that came from outside (parsed JSON) against the contract. Reports problems; never throws. */
export function checkDb(value: unknown): DbCheck {
  const problems: string[] = [];
  if (dbShape.check(value, 'db', problems)) return { ok: true, db: value };
  return { ok: false, problems };
}

/** Parse the text of a db.json and check it. */
export function parseDb(text: string): DbCheck {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { ok: false, problems: [`db: not JSON (${error instanceof Error ? error.message : String(error)})`] };
  }
  return checkDb(value);
}
