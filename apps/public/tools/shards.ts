// The parts of one release (pack 02 section 6.1 and 9.6), cut from the compiled database with the estimate stage applied:
//
//   core.json             CORE_FIELDS of the database: everything any answer reads (the engine's input)
//   estimates.json        the estimate stage's overlay cut to ESTIMATE_FIELDS: what Explore with estimates reads on top of the core
//   reference.json        the Ashby reference set
//   detail/<M>.json       one material's records and the sources they cite: drawer, pages, brief, export. Never read by a decision.
//
// Every part names its release, and every source address in a part has been through publicUrl (owner ruling R3 C): a path on the
// owner's machine is never published. The page checks a part's shape and release before it uses it (src/parts.ts).
import { createHash } from 'node:crypto';
import type { Db } from '@atlas/data';
import { CORE_FIELDS, ESTIMATE_FIELDS } from '@atlas/domain';
import { omitRecord, overlayOf, pruneOverlay, pruneRecord, publicize } from '@atlas/publish/shards';
import type { FieldSpec, Obj } from '@atlas/publish/shards';

export type PartName = 'core' | 'estimates' | 'reference';

export interface PartInfo { readonly path: string; readonly sha256: string; readonly bytes: number }

/** What a build says about the parts it wrote: the manifest of 02 section 9.6, for the smoke test and the tools (the page never fetches it). */
export interface PartsManifest {
  readonly release: string;
  readonly files: {
    readonly core: PartInfo;
    readonly estimates: PartInfo & { readonly status: 'available' | 'withheld' };
    readonly reference: PartInfo;
    readonly detail: { readonly pattern: string; readonly count: number };
  };
}

export interface Shards {
  /** Path under data/<release>/ to the file's text. */
  readonly files: ReadonlyMap<string, string>;
  readonly manifest: PartsManifest;
}

const rowsOf = (db: Obj, section: string): Obj[] => {
  const rows = db[section];
  return Array.isArray(rows) ? rows.filter((row): row is Obj => typeof row === 'object' && row !== null) : [];
};

function groupBy(rows: readonly Obj[], key: string): Map<string, Obj[]> {
  const out = new Map<string, Obj[]>();
  for (const row of rows) {
    const k = row[key];
    if (typeof k !== 'string') continue;
    const list = out.get(k);
    if (list) list.push(row);
    else out.set(k, [row]);
  }
  return out;
}

/** The source IDs a field names: one ID, a list, or (a profile's h2cSourceId) several in one cell separated by a semicolon. */
const idsIn = (value: unknown): string[] => (typeof value === 'string' ? value.split(';').map((s) => s.trim()).filter(Boolean) : Array.isArray(value) ? value.flatMap(idsIn) : []);

/** The per-material records of the database, indexed once. A material's detail is these, plus the sources they cite. */
function detailIndex(db: Obj) {
  const sections = ['grades', 'measurements', 'profiles', 'evidence', 'coverage', 'prices', 'knowHow', 'polymerEvidence'] as const;
  const byMaterial = new Map(sections.map((s) => [s, groupBy(rowsOf(db, s), 'materialId')]));
  const sources = new Map(rowsOf(db, 'sources').map((s) => [String(s['id']), s]));
  const polymers = new Map(rowsOf(db, 'polymers').map((p) => [String(p['id']), p]));
  const environment = groupBy(rowsOf(db, 'polymerEnvironment'), 'polymerId');
  return { sections, byMaterial, sources, polymers, environment };
}

/**
 * A row the core carries part of, as the detail carries the rest: its ID and what the core does not hold. The page joins the two by ID
 * (parts.ts joinDetail), so no field is downloaded twice and none is lost (tests/remake/shards.test.mjs proves the join is the row).
 */
const restOf = (row: Obj, spec: FieldSpec | undefined): Obj => ({ id: row['id'], ...(spec === undefined ? row : omitRecord(row, spec)) });

const CORE_SECTION: Readonly<Record<string, FieldSpec | undefined>> = { grades: CORE_FIELDS.grades, measurements: CORE_FIELDS.measurements, evidence: CORE_FIELDS.evidence, coverage: CORE_FIELDS.coverage, polymerEvidence: CORE_FIELDS.polymerEvidence };

function detailOf(material: Obj, index: ReturnType<typeof detailIndex>, release: string): Obj {
  const id = String(material['id']);
  const records: Obj = { material: restOf(material, CORE_FIELDS.materials) };
  const cited = new Set<string>();
  for (const section of index.sections) {
    const rows = index.byMaterial.get(section)?.get(id) ?? [];
    records[section] = rows.map((row) => restOf(row, CORE_SECTION[section]));
    for (const row of rows) for (const key of ['sourceId', 'h2cSourceId', 'sourceIds']) for (const s of idsIn(row[key])) cited.add(s);
  }
  const polymerId = typeof material['estimateIdentity'] === 'string' ? material['estimateIdentity'] : String(material['basePolymer'] ?? '');
  const polymer = index.polymers.get(polymerId);
  if (polymer) {
    records['polymer'] = polymer;
    for (const s of idsIn(polymer['sourceId'])) cited.add(s);
  }
  const environment = index.environment.get(polymerId) ?? [];
  records['polymerEnvironment'] = environment;
  for (const row of environment) for (const s of idsIn(row['sourceId'])) cited.add(s);
  // A source a record cites but the database does not hold is a build fault, not a gap to skip over.
  records['sources'] = [...cited].sort().map((s) => {
    const source = index.sources.get(s);
    if (!source) throw new Error(`${id} cites source ${s}, which the database does not hold`);
    return source;
  });
  return { kind: 'detail', release, materialId: id, records: publicize(records) };
}

const info = (path: string, text: string): PartInfo => ({ path, sha256: createHash('sha256').update(text).digest('hex'), bytes: Buffer.byteLength(text) });

/**
 * The parts of the release, as files. `db` is the compiled database with the estimate stage applied and the release stamped in its
 * meta; `reference` is the Ashby reference set the build wrote beside it.
 */
export function makeShards(db: Db, reference: unknown, release: string): Shards {
  if (db.meta.release?.id !== release) throw new Error(`the database is release ${db.meta.release?.id ?? 'unstamped'}, not ${release}`);
  const files = new Map<string, string>();
  const text = (path: string, value: unknown): string => {
    const json = JSON.stringify(value);
    files.set(path, json);
    return json;
  };

  const core = text('core.json', publicize({ kind: 'core', release, model: pruneRecord(db, CORE_FIELDS) }));
  const meta: Obj = db.meta; // an open object: the build adds estimateWithheld where the model failed its calibration check
  const withheld = meta['estimateWithheld'] ?? null;
  const status = withheld === null ? 'available' : 'withheld';
  const estimates = text('estimates.json', publicize({ kind: 'estimates', release, status, withheld, overlay: pruneOverlay(overlayOf(db), ESTIMATE_FIELDS) }));
  const referenceText = text('reference.json', publicize({ kind: 'reference', release, reference }));

  const index = detailIndex(db);
  const materials = rowsOf(db, 'materials');
  for (const material of materials) text(`detail/${String(material['id'])}.json`, detailOf(material, index, release));

  return {
    files,
    manifest: {
      release,
      files: {
        core: info(`data/${release}/core.json`, core),
        estimates: { ...info(`data/${release}/estimates.json`, estimates), status },
        reference: info(`data/${release}/reference.json`, referenceText),
        detail: { pattern: `data/${release}/detail/{materialId}.json`, count: materials.length },
      },
    },
  };
}
