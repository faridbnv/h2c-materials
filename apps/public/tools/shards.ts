// The parts of one release (pack 02 section 6.1 and 9.6), cut from the compiled database with the estimate stage applied:
//
//   core.json             CORE_FIELDS of the database: everything any answer reads (the engine's input), and VIEW_FIELDS, what the table and
//                         the rail print beside it (src/view-fields.ts), with the release's view facts (src/view-facts.ts) next to the model
//   estimates.json        the estimate stage's overlay cut to ESTIMATE_FIELDS: what Explore with estimates reads on top of the core
//   shared.json           what every material's drawer reads and no material owns: the filament guide's rows, the method's rules, the topics makers are asked on
//   reference.json        the Ashby reference set, and the rest of every material's headline values (the core carries the ones a decision and the table read; the chart
//                         lenses, parallel lines, coverage and compare read them all, and fetch this part when first opened)
//   detail/<M>.json       one material's records and the sources they cite: drawer, pages, brief, export. Never read by a decision.
//
// Every part names its release, and every source address in a part has been through publicUrl (owner ruling R3 C): a path on the
// owner's machine is never published. The page checks a part's shape and release before it uses it (src/parts.ts).
import { createHash } from 'node:crypto';
import type { Db } from '@atlas/data';
import { CORE_FIELDS, ESTIMATE_FIELDS } from '@atlas/domain';
import { mergeSpecs, omitRecord, overlayOf, pruneOverlay, pruneRecord, publicize } from '@atlas/publish/shards';
import type { FieldSpec, Obj } from '@atlas/publish/shards';
import { VIEW_FIELDS } from '../src/view-fields.ts';
import { viewFactsOf } from './view-facts.ts';

export type PartName = 'core' | 'estimates' | 'reference' | 'shared';

export interface PartInfo { readonly path: string; readonly sha256: string; readonly bytes: number }

/** What a build says about the parts it wrote: the manifest of 02 section 9.6, for the smoke test and the tools (the page never fetches it). */
export interface PartsManifest {
  readonly release: string;
  readonly files: {
    readonly core: PartInfo;
    readonly estimates: PartInfo & { readonly status: 'available' | 'withheld' };
    readonly reference: PartInfo;
    readonly shared: PartInfo;
    readonly detail: { readonly pattern: string; readonly count: number };
  };
}

export interface Shards {
  /** Path under data/<release>/ to the file's text. */
  readonly files: ReadonlyMap<string, string>;
  readonly manifest: PartsManifest;
}

/** A pointer from a material's prose to an evidence record (the facts layer's EVIDENCE_POINTER). */
const EVIDENCE_POINTER = /\bQ\d{5}\b/g;

const isRecord = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value);

/** A section of the database: its rows. A section that is not a list of records is a build fault, not an empty section. */
const rowsOf = (db: Obj, section: string): Obj[] => {
  const rows = db[section];
  if (!Array.isArray(rows)) throw new Error(`the database's ${section} is not a list`);
  return rows.map((row: unknown, i): Obj => {
    if (!isRecord(row)) throw new Error(`${section}[${i}] is not a record`);
    return row;
  });
};

/** The rows by the text of `key`. A row without one would be in no group, so in no detail: it throws, naming the row. */
function groupBy(rows: readonly Obj[], key: string, section: string): Map<string, Obj[]> {
  const out = new Map<string, Obj[]>();
  for (const row of rows) {
    const k = row[key];
    if (typeof k !== 'string') throw new Error(`${section} ${String(row['id'])} has no ${key}, so no detail would carry it`);
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
  const materialIds = new Set(rowsOf(db, 'materials').map((m) => String(m['id'])));
  const byMaterial = new Map(sections.map((s) => [s, groupBy(rowsOf(db, s), 'materialId', s)]));
  // Every row of a section lands in some material's detail: the groups add up to the section, or a row would be left out of every shard.
  for (const section of sections) {
    const groups = byMaterial.get(section) ?? new Map<string, Obj[]>();
    const orphan = [...groups].find(([id]) => !materialIds.has(id));
    if (orphan) throw new Error(`${section} ${String(orphan[1][0]?.['id'])} is on material ${orphan[0]}, which the database does not hold`);
  }
  const sources = new Map(rowsOf(db, 'sources').map((s) => [String(s['id']), s]));
  const evidenceById = new Map(rowsOf(db, 'evidence').map((e) => [String(e['id']), e]));
  const polymers = new Map(rowsOf(db, 'polymers').map((p) => [String(p['id']), p]));
  const environment = groupBy(rowsOf(db, 'polymerEnvironment'), 'polymerId', 'polymerEnvironment');
  const unheld = [...environment].find(([id]) => !polymers.has(id));
  if (unheld) throw new Error(`polymerEnvironment ${String(unheld[1][0]?.['id'])} is on polymer ${unheld[0]}, which the database does not hold`);
  return { sections, byMaterial, sources, polymers, environment, evidenceById };
}

/**
 * A row the core carries part of, as the detail carries the rest: its ID and what the core does not hold. The page joins the two by ID
 * (parts.ts joinDetail), so no field is downloaded twice and none is lost (tests/remake/shards.test.mjs proves the join is the row).
 */
const restOf = (row: Obj, spec: FieldSpec | undefined): Obj => ({ id: row['id'], ...(spec === undefined ? row : omitRecord(row, spec)) });

/**
 * A declaration's own keys include what its wildcard names: a key with a spec of its own is read by that spec alone (pruneRecord), so when two
 * declarations are merged, the engine's `*` over the headlines must be folded into the keys the view names, or those keys lose the engine's fields.
 */
export function foldWildcards(spec: FieldSpec): FieldSpec {
  if (spec === true) return spec;
  const star = spec['*'];
  return Object.fromEntries(Object.entries(spec).map(([key, child]) => [key, foldWildcards(star !== undefined && key !== '*' ? mergeSpecs(star, child) : child)]));
}

/** What the core part carries: what the engine reads and what the first screen prints. The detail part carries the rest of each row, so no field is downloaded twice. */
export const PUBLISHED_CORE_FIELDS: FieldSpec = foldWildcards(mergeSpecs(CORE_FIELDS, VIEW_FIELDS));
const section = (name: string): FieldSpec | undefined => (typeof PUBLISHED_CORE_FIELDS === 'object' ? PUBLISHED_CORE_FIELDS[name] : undefined);
const CORE_SECTION: Readonly<Record<string, FieldSpec | undefined>> = { grades: section('grades'), measurements: section('measurements'), evidence: section('evidence'), coverage: section('coverage'), polymerEvidence: section('polymerEvidence') };

function detailOf(material: Obj, index: ReturnType<typeof detailIndex>, release: string): Obj {
  const id = String(material['id']);
  const records: Obj = { material: restOf(material, section('materials')) };
  const cited = new Set<string>();
  for (const section of index.sections) {
    const rows = index.byMaterial.get(section)?.get(id) ?? [];
    records[section] = rows.map((row) => restOf(row, CORE_SECTION[section]));
    for (const row of rows) for (const key of ['sourceId', 'h2cSourceId', 'sourceIds']) for (const s of idsIn(row[key])) cited.add(s);
  }
  // The family's guidance a material's Best uses and Limitations point to is another material's evidence (E.g. PLA's, for a PLA blend): the drawer
  // resolves each pointer, so the records come with this material, whoever owns them, and so do their sources. The core carries part of each;
  // like every row of a section, this one is the rest of it.
  const evidenceRows = records['evidence'];
  if (!Array.isArray(evidenceRows)) throw new Error(`${id}: its evidence was not collected`);
  const own = new Set(evidenceRows.map((row: Obj) => String(row['id'])));
  const pointed = [...new Set([material['bestUses'], material['limitations']].flatMap((text) => String(text ?? '').match(EVIDENCE_POINTER) ?? []))]
    .filter((pointer) => !own.has(pointer)).sort();
  for (const pointer of pointed) {
    const row = index.evidenceById.get(pointer);
    if (!row) continue; // a pointer to nothing is listed by the drawer, not dropped (resolvePointers)
    evidenceRows.push(restOf(row, section('evidence')));
    for (const key of ['sourceId', 'h2cSourceId', 'sourceIds']) for (const s of idsIn(row[key])) cited.add(s);
  }
  // The estimate identity names a row of polymers (the build requires it to); a material with none is looked up by its base polymer, and
  // may have no row (20 of the 175 today: an excluded engineering polymer, a blend), which is the material's state, not a fault.
  const identity = material['estimateIdentity'];
  const polymerId = typeof identity === 'string' ? identity : String(material['basePolymer'] ?? '');
  const polymer = index.polymers.get(polymerId);
  if (typeof identity === 'string' && !polymer) throw new Error(`${id} names polymer ${identity}, which the database does not hold`);
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

  const core = text('core.json', publicize({ kind: 'core', release, model: pruneRecord(db, PUBLISHED_CORE_FIELDS), facts: viewFactsOf(db) }));
  const meta: Obj = db.meta; // an open object: the build adds estimateWithheld where the model failed its calibration check
  const withheld = meta['estimateWithheld'] ?? null;
  const status = withheld === null ? 'available' : 'withheld';
  const estimates = text('estimates.json', publicize({ kind: 'estimates', release, status, withheld, overlay: pruneOverlay(overlayOf(db), ESTIMATE_FIELDS) }));
  // The rest of each material's headline, as the detail carries the rest of its records: the page joins it to the core's (publish/shards applyHeadlines).
  const materialsSpec = section('materials');
  const headlines = Object.fromEntries(rowsOf(db, 'materials').map((material) => {
    const rest = omitRecord(material, materialsSpec ?? true);
    return [String(material['id']), isRecord(rest?.['headline']) ? rest['headline'] : {}];
  }));
  const referenceText = text('reference.json', publicize({ kind: 'reference', release, reference, headlines }));
  const index = detailIndex(db);
  // The documents the filament guide's rows cite are not any one material's records, so no detail part holds them; the drawer names them in its sentences.
  const guideSources = [...new Set(rowsOf(db, 'printGuide').flatMap((row) => ['sourceId', 'h2cSourceId', 'sourceIds'].flatMap((key) => idsIn(row[key]))))].sort().map((sourceId) => {
    const source = index.sources.get(sourceId);
    if (!source) throw new Error(`the filament guide cites source ${sourceId}, which the database does not hold`);
    return source;
  });
  const sharedText = text('shared.json', publicize({ kind: 'shared', release, tables: { printGuide: db.printGuide, method: db.method }, sources: guideSources, knowHow: meta['knowHow'] ?? null, registry: { comparisons: db.registry.comparisons, properties: db.registry.properties, relations: db.registry.relations } }));

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
        shared: info(`data/${release}/shared.json`, sharedText),
        detail: { pattern: `data/${release}/detail/{materialId}.json`, count: materials.length },
      },
    },
  };
}
