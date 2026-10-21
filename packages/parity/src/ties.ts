// Tie-shuffle (pack 07 section 5.4): "reversing two tied products must change the answer exactly where the old engine's
// first-wins rule makes it change". The order of a material's products is data (grades.csv order, materials[].gradeIds); among
// products the engine judges equal, the FIRST one in that order represents the material.
//
// Two checks, both on a copy of the db whose product orders are permuted by a seed:
//   parity   old and the other side answer the permuted db and must agree on everything (run by the caller with runParity).
//   rule     the other side's answer for each material's representative product equals the first-wins prediction. The
//            prediction comes from the OLD engine: a temporary copy of it with one read-only probe line records, for every
//            material, which products tie for best. Under any order the representative must be the tied product that comes
//            first in that order. A side that prefers the last one, or sorts, or iterates differently, is named.
import { canon } from './canon.ts';
import { compareRecordSets, emptyComparison } from './compare.ts';
import { copyEngine } from './engine-copy.ts';
import type { Patch } from './engine-copy.ts';
import { createOldAdapter } from './old-adapter.ts';
import type { Db } from './old-adapter.ts';
import { SurfaceBuilder } from './surface.ts';
import type { Adapter, CorpusCase, NormalizedCase, SurfaceReport } from './types.ts';
import { seededRandom, sha256Hex, shuffled } from './util.ts';

/** Pinned (tests/parity/ties.test.mjs): the same seed gives the same permutation on every machine. */
export const TIE_SEED = 20261021;

/** How many cases of each group the tie-shuffle replays: every template case, and a seeded sample of the rest. */
export interface TieSampleSize {
  template: number;
  census: number;
  random: number;
}
export const TIE_SAMPLE_PR: TieSampleSize = { template: 30, census: 40, random: 40 };
export const TIE_SAMPLE_MILESTONE: TieSampleSize = { template: 30, census: 138, random: 300 };

/** A seeded sample of the corpus, kept in corpus order so ids and reports are stable. */
export function tieSample(cases: readonly CorpusCase[], size: TieSampleSize, seed: number = TIE_SEED): CorpusCase[] {
  const out: CorpusCase[] = [];
  for (const group of ['template', 'census', 'random'] as const) {
    const pool = cases.filter((c) => c.group === group);
    const want = Math.min(size[group], pool.length);
    const chosen = new Set(shuffled(pool.map((_, i) => i), seededRandom(seed + group.length * 7919)).slice(0, want));
    out.push(...pool.filter((_, i) => chosen.has(i)));
  }
  return out;
}

const seedFor = (seed: number, materialId: string): number => parseInt(sha256Hex(`${seed}:${materialId}`).slice(0, 8), 16);

/**
 * A copy of the db whose materials list their products in a seeded permutation. A material with two or more products is
 * always moved (a permutation equal to the original is rotated by one), so every such material really changes order.
 */
export function permuteProductOrder(db: Db, seed: number = TIE_SEED): Db {
  const materials = db.materials.map((m: Record<string, unknown>) => {
    const ids = Array.isArray(m.gradeIds) ? m.gradeIds.filter((g): g is string => typeof g === 'string') : [];
    if (ids.length < 2) return m;
    let order = shuffled(ids, seededRandom(seedFor(seed, String(m.id))));
    if (order.every((g, i) => g === ids[i])) order = [...ids.slice(1), ...ids.slice(0, 1)];
    return { ...m, gradeIds: order };
  });
  return { ...db, materials };
}

const PROBE_KEY = '__h2cTieProbe';

/** The instrumented copy of the old engine: after the material's representative is chosen, it reports the products tied with it. */
export const TIE_PROBE: Patch = {
  file: 'constraints.js',
  find: '  const best = judged.reduce((a, b) => (compareGroups(b.e, a.e) < 0 ? b : a));\n  const { measuredMisses, ...grouping }',
  replace: '  const best = judged.reduce((a, b) => (compareGroups(b.e, a.e) < 0 ? b : a));\n'
    + `  globalThis.${PROBE_KEY}?.(material.id, judged.filter((x) => compareGroups(x.e, best.e) === 0).map((x) => x.grade.id));\n`
    + '  const { measuredMisses, ...grouping }',
};

/** For each case, the old engine's answer on the original product order and the products it found tied for best, per material. */
async function forEachProbedCase(cases: readonly CorpusCase[], db: Db, onCase: (c: CorpusCase, ties: Map<string, string[]>, answer: NormalizedCase) => Promise<void>): Promise<void> {
  const probe = await createOldAdapter({ name: 'old (tie probe)', db, engineDir: copyEngine([TIE_PROBE]) });
  try {
    for (const c of cases) {
      const ties = new Map<string, string[]>();
      Reflect.set(globalThis, PROBE_KEY, (id: string, tied: string[]) => { ties.set(id, tied); });
      const answer = await probe.evaluate(c);
      await onCase(c, ties, answer);
    }
  } finally {
    Reflect.deleteProperty(globalThis, PROBE_KEY);
  }
}

/** Per material, the one product that represents it: what the first-wins rule predicts, and what the side under test answered. */
type RepresentativeRecords = Record<string, { decision: Record<string, string> }>;

const gradeOf = (n: NormalizedCase, materialId: string): unknown => {
  if (n.outcome !== 'computed') return undefined;
  const rec = n.records[`material:${materialId}`];
  return rec?.decision?.gradeId;
};

/**
 * The first-wins rule against `permuted`, the side under test answering the permuted db. `base` is the unpermuted db the
 * oracle (the old engine) reads; `permutedDb` is the permutation that side was given, to know the order it saw.
 */
export async function checkFirstWins(opts: {
  cases: readonly CorpusCase[]; base: Db; permutedDb: Db; permuted: Adapter; beforeName: string;
}): Promise<SurfaceReport> {
  const b = new SurfaceBuilder({ surface: 'ties', before: `${opts.beforeName} (first-wins prediction)`, after: opts.permuted.name, unit: 'material' });
  const position = new Map<string, Map<string, number>>();
  for (const m of opts.permutedDb.materials) {
    const ids: unknown[] = Array.isArray(m.gradeIds) ? m.gradeIds : [];
    position.set(String(m.id), new Map(ids.map((g, i) => [String(g), i])));
  }
  let tiesMoved = 0, tiedMaterials = 0;
  await forEachProbedCase(opts.cases, opts.base, async (c, ties, answer) => {
    if (answer.outcome !== 'computed') { b.cannot(c.id, 'before', `the oracle could not answer: ${answer.reason}`); return; }
    const seen = await opts.permuted.evaluate(c);
    if (seen.outcome !== 'computed') { b.cannot(c.id, 'after', seen.reason); return; }
    const cmp = emptyComparison();
    const predictedRecords: RepresentativeRecords = {};
    const observedRecords: RepresentativeRecords = {};
    // Every material the engine gave a representative product must have been seen by the probe, or the oracle has a hole.
    for (const key of Object.keys(answer.records)) {
      const materialId = key.startsWith('material:') ? key.slice('material:'.length) : null;
      if (materialId !== null && gradeOf(answer, materialId) != null && !ties.has(materialId)) b.cannot(`${c.id} ${materialId}`, 'before', 'the probe did not see this material, so its representative product has no prediction');
    }
    for (const [materialId, tied] of ties) {
      const order = position.get(materialId);
      const first = tied[0];
      if (!order || first === undefined) { b.cannot(`${c.id} ${materialId}`, 'both', 'a material the oracle judged has no product order'); continue; }
      const representative = gradeOf(answer, materialId);
      if (representative !== first) throw new Error(`internal: the probe's first tied product ${first} is not the old engine's representative ${String(representative)} for ${materialId}`);
      const missing = tied.filter((grade) => !order.has(grade));
      if (missing.length) { b.cannot(`${c.id} ${materialId}`, 'both', `tied product(s) ${missing.join(', ')} are not in the permuted product order`); continue; }
      const placeOf = (grade: string): number => order.get(grade) ?? Infinity;
      const predicted = tied.reduce((earliest, grade) => (placeOf(grade) < placeOf(earliest) ? grade : earliest), first);
      if (tied.length > 1) {
        tiedMaterials++;
        if (predicted !== first) tiesMoved++;
      }
      b.units++;
      predictedRecords[`material:${materialId}`] = { decision: { representative: predicted } };
      observedRecords[`material:${materialId}`] = { decision: { representative: String(gradeOf(seen, materialId)) } };
    }
    compareRecordSets(c.id, predictedRecords, observedRecords, cmp);
    for (const d of cmp.differences) b.add({ ...d, field: 'representative product (first wins)' });
  });
  b.notes.push(`${opts.cases.length} cases; ${tiedMaterials} material-cases with products tied for best, ${tiesMoved} of them where the permuted order must change the representative`);
  if (tiesMoved === 0) b.cannot(null, 'both', 'the sample holds no tied products whose order changed, so this check proved nothing');
  return b.finish();
}

/** The digest of a permutation for a list of materials: pinned in a test against a fixed, made-up db (not the real data). */
export const digestOfPermutation = (db: Db, seed: number = TIE_SEED): string =>
  `sha256:${sha256Hex(canon(permuteProductOrder(db, seed).materials.map((m: Record<string, unknown>) => [m.id, m.gradeIds])))}`;
