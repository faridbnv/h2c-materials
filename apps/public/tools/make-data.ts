// The data of one release for the public view: results of one template, and one shard per material (pack 02 section 6.1).
//
// Source of truth: the committed CSV tables. The new build (packages/build, WP-20 and WP-21) rebuilds them from nothing into
// SQLite (WP-09), which refuses damaged data, compiles them and applies the estimate stage. The typed database that comes out
// goes through packages/engine, so every verdict, count and reason on the page is the engine's own, in its own words. Nothing
// here words an answer. The same database is cut into the release's parts (shards.ts): core, estimates, reference, detail.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkDb } from '@atlas/data';
import type { Db } from '@atlas/data';
import { buildInMemory } from '@atlas/data/rebuild';
import type { Evaluation, RequirementResult, ScenarioConstraint } from '@atlas/domain';
import { createContext, scenarioFrom } from '@atlas/engine';
import type { EngineOutput } from '@atlas/engine';
import { loadImpactCases } from '@atlas/engine/impact';
import type { Best, MaterialFile, MaterialLine, ProductCounts, ProductLine, RequirementLine, ResultFile, Verdict } from '../src/model.ts';
import { VERDICTS } from '../src/model.ts';
import { makeShards } from './shards.ts';
import type { PartsManifest } from './shards.ts';

/** The template this first slice shows, and the question of the parity corpus that asks it in the strict mode. */
export const TEMPLATE_NAME = 'Outdoor structural part';
export const CASE_ID = 'template/outdoor-structural-part/strict';

/** What the release identity says about the inputs; stamped into the database the engine reads. */
export interface ReleaseStamp {
  readonly id: string;
  readonly digest: string;
  readonly inputs: Readonly<Record<string, string>>;
}

export interface MadeData {
  /** Path under data/<release>/ to the file's text. */
  readonly files: ReadonlyMap<string, string>;
  /** What the engine said, kept for the caller's own checks. */
  readonly output: EngineOutput;
  readonly reconstruction: { readonly tables: number; readonly rows: number; readonly checks: number };
  /** The parts of the release (core, estimates, reference, detail), described for the manifest. Their files are in `files`. */
  readonly parts: PartsManifest;
}

// The old words layer, imported read-only and never edited: the template's own sentences and the requirement pills' wording.
interface OldTemplate { readonly name: string; readonly description: string; readonly notChecked: string }
interface OldTemplates { readonly TEMPLATES: readonly OldTemplate[] }
interface OldLabels { describeConstraint(constraint: object): string }
interface OldRegistry { useRegistry(registry: Db['registry']): void }

const oldCode = async <T>(file: string): Promise<T> => import(new URL(`../../../app/js/ui/${file}`, import.meta.url).href);

// The new build (packages/build), loaded by path: this tool belongs to the interface level, whose type check does not cover the build's code.
interface BuildResult { readonly ok: boolean; readonly errors: readonly { readonly code: string; readonly where: string; readonly message: string }[]; readonly db: { readonly meta: object } | null; readonly reference: unknown }
interface NewBuild { runBuild(options: { projectRoot: string; outDir: null; estimates: boolean }): BuildResult }
const newBuild = async (): Promise<NewBuild> => import(new URL('../../../packages/build/src/index.ts', import.meta.url).href);

const isVerdict = (word: string): word is Verdict => VERDICTS.some((v) => v === word);
function verdictOf(word: string, where: string): Verdict {
  if (!isVerdict(word)) throw new Error(`${where}: the engine said ${word}, which this view has no word for`);
  return word;
}

/** Which database the parts are cut from: the new build's (the release), or the old build's dist/db.json (the browser suite's check that the page draws what the old page drew, on the same data). */
export type DatabaseSource = 'new' | 'old';

/** The old build's database, read whole: an object with a meta, or a throw naming what is wrong. */
function oldDatabase(root: string): { readonly meta: object } {
  const parsed: unknown = JSON.parse(readFileSync(join(root, 'dist', 'db.json'), 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || !('meta' in parsed) || typeof parsed.meta !== 'object' || parsed.meta === null) throw new Error('dist/db.json is not a database: run npm run build');
  return { ...parsed, meta: parsed.meta };
}

/** The new build of the tables, with the estimate stage, as the typed database stamped with the release; and the reference set beside it. */
async function compiledDatabase(root: string, stamp: ReleaseStamp, source: DatabaseSource): Promise<{ db: Db; reference: unknown; reconstruction: MadeData['reconstruction'] }> {
  // The count of what the rebuild verified, for the manifest. The build below reconstructs the same tables again; this is cheap.
  const rebuilt = buildInMemory(join(root, 'data'));
  const reconstruction = { tables: rebuilt.report.tables.length, rows: rebuilt.report.rows, checks: rebuilt.report.checks.length };
  rebuilt.db.close();
  const built = (await newBuild()).runBuild({ projectRoot: root, outDir: null, estimates: true });
  if (!built.ok || built.db === null || built.reference === null) {
    throw new Error(`the data does not build: ${built.errors.slice(0, 5).map((e) => `[${e.code}] ${e.where}: ${e.message}`).join('; ')}`);
  }
  // The old build's own database, when asked: the same typed contract, the same stamp. Its medians are the old build's (the reprint transition, 2026-10-21,
  // moved them in the new one), which is what the old page drew; a page that draws the same on it has changed nothing but the transition.
  const base = source === 'old' ? oldDatabase(root) : built.db;
  const stamped = { ...base, meta: { ...base.meta, release: { id: stamp.id, digest: stamp.digest, inputs: stamp.inputs } } };
  const checked = checkDb(JSON.parse(JSON.stringify(stamped)));
  if (!checked.ok) throw new Error(`the compiled database does not satisfy the typed contract: ${checked.problems.slice(0, 3).join('; ')}`);
  return { db: checked.db, reference: built.reference, reconstruction };
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(what);
  return value;
}

export async function makeData(root: string, stamp: ReleaseStamp, source: DatabaseSource = 'new'): Promise<MadeData> {
  const [{ TEMPLATES }, labels, registry] = await Promise.all([oldCode<OldTemplates>('templates.js'), oldCode<OldLabels>('labels.js'), oldCode<OldRegistry>('registry.js')]);
  const template = TEMPLATES.find((t) => t.name === TEMPLATE_NAME);
  if (!template) throw new Error(`no template called ${TEMPLATE_NAME}`);
  const asked = loadImpactCases().find((c) => c.id === CASE_ID);
  if (!asked) throw new Error(`the parity corpus has no question ${CASE_ID}`);

  const { db, reference, reconstruction } = await compiledDatabase(root, stamp, source);
  registry.useRegistry(db.registry);
  const scenario = scenarioFrom(asked.question, db.meta);
  const output = createContext(db, scenario).run({ rankings: false });
  if (output.release !== stamp.id) throw new Error(`the engine answered release ${output.release}, not ${stamp.id}`);

  const nameOf = new Map(db.materials.map((m) => [m.id, m.name]));
  const labelOf = new Map(db.grades.map((g) => [g.id, `${g.manufacturer} ${g.product}`]));
  const rankOf = new Map(output.rows.filter((r) => r.productId === undefined).map((r) => [r.materialId, r.listingRank]));
  const describe = (c: object): string => labels.describeConstraint(c);
  const lineOf = (r: RequirementResult): RequirementLine => ({ requirement: describe(r.constraint), status: r.status, reason: r.reason });

  const bestOf = (e: Evaluation): Best | null => {
    if (e.gradeId === undefined) return null;
    return { gradeId: e.gradeId, label: required(labelOf.get(e.gradeId), `${e.materialId}: its best product ${e.gradeId} is not in the database`) };
  };
  const countsOf = (e: Evaluation): ProductCounts | null => e.counts ?? null;
  const nameFor = (id: string): string => required(nameOf.get(id), `${id}: no such material`);

  const materials: MaterialLine[] = output.evaluations.map((e) => ({
    materialId: e.materialId, name: nameFor(e.materialId), verdict: verdictOf(e.verdict, e.materialId), group: e.group, screened: e.screened,
    listingRank: required(rankOf.get(e.materialId), `${e.materialId}: no listing place`), products: countsOf(e), best: bestOf(e),
  }));
  materials.sort((a, b) => a.listingRank - b.listingRank);

  const result: ResultFile = {
    kind: 'result', release: stamp.id, snapshot: db.meta.snapshot,
    template: { name: template.name, description: template.description, notChecked: template.notChecked, caseId: asked.id },
    requirements: scenario.constraints.map((c: ScenarioConstraint) => ({ text: describe(c), mandatory: c.mandatory !== false })),
    counts: output.counts, materials,
  };

  const files = new Map<string, string>([['result.json', JSON.stringify(result)]]);
  for (const e of output.evaluations) {
    const products: ProductLine[] = (e.products ?? []).map((p) => ({
      gradeId: p.gradeId, label: required(labelOf.get(p.gradeId), `${e.materialId}: its product ${p.gradeId} is not in the database`), verdict: verdictOf(p.verdict, p.gradeId), group: p.group, results: p.results.map(lineOf),
    }));
    const file: MaterialFile = {
      kind: 'material', release: stamp.id, materialId: e.materialId, name: nameFor(e.materialId), verdict: verdictOf(e.verdict, e.materialId), group: e.group,
      groupReason: e.groupReason, counts: countsOf(e), best: bestOf(e), results: e.results.map(lineOf), products,
    };
    files.set(`material/${e.materialId}.json`, JSON.stringify(file));
  }
  const shards = makeShards(db, reference, stamp.id);
  for (const [path, text] of shards.files) {
    if (files.has(path)) throw new Error(`${path} is both a view file and a part of the release`);
    files.set(path, text);
  }
  return { files, output, reconstruction, parts: shards.manifest };
}
