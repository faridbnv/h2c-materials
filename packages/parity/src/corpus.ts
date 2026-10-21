// Corpus v0: scenarios only (outputs are always computed, on the current snapshot). Built from the sources the old tool
// already uses: the six landing-page templates in the snapshot's modes (scripts/snapshot.mjs), the 138-case decision census
// (docs/audits/2026-10-18-screening-build/decision-census.mjs), and a seeded replay of 1,000 random multi-requirement
// scenarios (the LCG generator of test/screening.test.js, seed 7, plus the state options ui-fuzz draws).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { canon } from './canon.ts';
import { REPO_ROOT } from './engine-copy.ts';
import type { Corpus, CorpusCase, CorpusScenario } from './types.ts';

export const CORPUS_PATH = join(REPO_ROOT, 'parity', 'corpus', 'v0.json');
export const RANDOM_SEED = 7;
export const RANDOM_COUNT = 1000;

const scenario = (constraints: object[], o: Partial<CorpusScenario> = {}): CorpusScenario => ({
  constraints, unknownPolicy: 'strict', useEstimates: false, evidence: 'comparable', moisture: 'dry', anneal: false, annealMaxC: null, ...o,
});
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The four modes of build/snapshot/templates.csv, plus Explore with estimates in the other states the page offers. */
const TEMPLATE_MODES: [string, Partial<CorpusScenario>][] = [
  ['strict', { unknownPolicy: 'strict' }],
  ['strict-anneal', { unknownPolicy: 'strict', anneal: true }],
  ['explore', { unknownPolicy: 'exploration', useEstimates: false }],
  ['explore-estimates', { unknownPolicy: 'exploration', useEstimates: true }],
  ['explore-estimates-anneal-conditioned', { unknownPolicy: 'exploration', useEstimates: true, anneal: true, moisture: 'conditioned' }],
];

export function templateCases(templates: { name: string; constraints: object[] }[]): CorpusCase[] {
  return templates.flatMap((t) => TEMPLATE_MODES.map(([mode, o]): CorpusCase => ({
    id: `template/${slug(t.name)}/${mode}`, group: 'template', name: `${t.name} / ${mode}`, scenario: scenario(t.constraints, o),
  })));
}

/** The census' 18 template cases and 120 single-requirement sweeps, each with estimates on and off. */
export function censusCases(templates: { name: string; constraints: object[] }[]): CorpusCase[] {
  const base: { name: string; scenario: CorpusScenario }[] = [];
  for (const t of templates) {
    for (const [mode, unknownPolicy, useEstimates] of [['leave out', 'strict', false], ['include', 'exploration', false], ['include + estimates', 'exploration', true]] as const) {
      base.push({ name: `${t.name} / ${mode}`, scenario: scenario(t.constraints, { unknownPolicy, useEstimates }) });
    }
  }
  const limits: Record<string, number[]> = { density: [900, 1250, 1500], tensileModulusXY: [2, 3, 5], tensileStrengthXY: [20, 50, 100], elongationXY: [5, 20, 100], hdt045: [60, 90, 120] };
  for (const [property, values] of Object.entries(limits)) {
    for (const value of values) for (const evidence of ['comparable', 'as-published'] as const) for (const moisture of ['dry', 'conditioned'] as const) for (const anneal of [false, true]) {
      base.push({
        name: `${property} >= ${value} / ${evidence} / ${moisture} / anneal ${anneal ? 'allowed' : 'not allowed'}`,
        scenario: scenario([{ kind: 'numeric', property, operator: '>=', value }], { unknownPolicy: 'exploration', useEstimates: true, evidence, moisture, anneal }),
      });
    }
  }
  if (base.length !== 138) throw new Error(`the decision census has 138 cases, built ${base.length}`);
  return base.flatMap((b, i) => (['on', 'off'] as const).map((est): CorpusCase => ({
    id: `census/${String(i + 1).padStart(3, '0')}/estimates-${est}`, group: 'census', name: `${b.name} / estimates ${est}`,
    scenario: { ...structuredClone(b.scenario), useEstimates: est === 'on' },
  })));
}

/**
 * The screening test's generator (test/screening.test.js, "structural invariants hold over random multi-requirement
 * scenarios"): the same LCG, seed and constraint kinds; thresholds sit on evidence edges half the time. Each scenario
 * also draws the mode and the D99 state options from the same stream.
 */
export function randomCases(db: { materials: any[]; meta: any }, count = RANDOM_COUNT, seed = RANDOM_SEED): CorpusCase[] {
  const mats = db.materials.filter((m) => !m.familyEntry);
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = <T,>(a: T[]): T => { const v = a[Math.floor(rnd() * a.length)]; if (v === undefined) throw new Error('corpus: pick from an empty list'); return v; };
  const ranges: Record<string, [number, number]> = { density: [800, 1800], tensileModulusXY: [0.01, 12], tensileStrengthXY: [5, 170], elongationXY: [1, 700], hdt045: [40, 270], priceCADkg: [20, 300] };
  const cats = Object.keys(db.meta.environmentCategories);
  const statuses = [...new Set(mats.map((m) => m.h2cStatus))];
  const edges = Object.fromEntries(Object.keys(ranges).map((k) => [k, mats.flatMap((m) => {
    const h = m.headline[k];
    return [h?.value, h?.interval?.lo, h?.interval?.hi, h?.estimate?.plausible?.lo, h?.estimate?.plausible?.hi, h?.loadBracket?.hi];
  }).filter(Number.isFinite)])) as Record<string, number[]>;
  const gen = (): object => {
    const kind = pick(['numeric', 'numeric', 'numeric', 'gate', 'facet', 'environment', 'evidence']);
    if (kind === 'numeric') {
      const p = pick(Object.keys(ranges)); const range = ranges[p]; const edge = edges[p];
      if (!range || !edge) throw new Error(`corpus: no range for ${p}`);
      const [a, b] = range;
      const value = rnd() < 0.5 && edge.length ? pick(edge) : a + rnd() * (b - a);
      return { kind, property: p, operator: pick(['>=', '<=', '>', '<']), value, mandatory: rnd() > 0.1 };
    }
    if (kind === 'gate') return pick([{ kind, gate: 'scope' }, { kind, gate: 'nozzle' }, { kind, gate: 'bed' }, { kind, gate: 'chamber' }, { kind, gate: 'abrasive', hardenedAvailable: rnd() > 0.5 }, { kind, gate: 'buyable', inStock: rnd() > 0.5 }, { kind, gate: 'dryingKnown' }, { kind, gate: 'h2cStatus', in: statuses.filter(() => rnd() > 0.4) }].filter((g: any) => !g.in || g.in.length));
    if (kind === 'facet') return pick([{ kind, facet: 'supportMaterial', equals: false }, { kind, facet: 'reinforcement', in: [pick(['carbon-fibre', 'glass-fibre', 'unfilled'])] }, { kind, facet: 'flexible', equals: rnd() > 0.5 }]);
    if (kind === 'environment') return { kind, category: pick(cats) };
    return { kind, exactGrade: rnd() > 0.5, noConflicts: rnd() > 0.5 };
  };
  const out: CorpusCase[] = [];
  for (let i = 0; i < count; i++) {
    const constraints = Array.from({ length: 1 + Math.floor(rnd() * 4) }, gen);
    const mode = pick(['strict', 'exploration', 'exploration+estimates']);
    const anneal = rnd() < 0.3;
    const annealMaxC = anneal && rnd() < 0.4 ? pick([60, 80, 90, 100, 120, 150]) : null;
    const moisture = rnd() < 0.15 ? 'conditioned' : 'dry';
    const evidence = rnd() < 0.2 ? 'as-published' : 'comparable';
    out.push({
      id: `random/${String(i + 1).padStart(4, '0')}`, group: 'random', name: `random scenario ${i + 1} (seed ${seed})`,
      scenario: scenario(constraints, { unknownPolicy: mode === 'strict' ? 'strict' : 'exploration', useEstimates: mode === 'exploration+estimates', evidence, moisture, anneal, annealMaxC }),
    });
  }
  return out;
}

export const digestOfCases = (cases: readonly CorpusCase[]): string => `sha256:${createHash('sha256').update(canon(cases)).digest('hex')}`;

export async function buildCorpus(db: { materials: any[]; meta: any }): Promise<Corpus> {
  const { TEMPLATES } = await import(pathToFileURL(join(REPO_ROOT, 'app', 'js', 'ui', 'templates.js')).href);
  const cases = [...templateCases(TEMPLATES), ...censusCases(TEMPLATES), ...randomCases(db)];
  const counts = Object.fromEntries(['template', 'census', 'random'].map((g) => [g, cases.filter((c) => c.group === g).length]));
  return {
    corpus: 'v0', version: 1, generatedFrom: { release: db.meta.release?.id ?? null, snapshot: db.meta.snapshot ?? null },
    seed: RANDOM_SEED, digest: digestOfCases(cases), counts: { ...counts, total: cases.length }, cases,
  };
}

/** Reads a corpus and checks it is what the harness expects: unique ids, every scenario field explicit. */
export function loadCorpus(path: string = CORPUS_PATH): Corpus {
  const c = JSON.parse(readFileSync(path, 'utf8')) as Corpus;
  const seen = new Set<string>();
  for (const k of c.cases) {
    if (seen.has(k.id)) throw new Error(`corpus ${c.corpus}: duplicate case id ${k.id}`);
    seen.add(k.id);
    const s = k.scenario;
    if (!Array.isArray(s?.constraints) || !['strict', 'exploration'].includes(s.unknownPolicy) || typeof s.useEstimates !== 'boolean'
      || typeof s.anneal !== 'boolean' || !(s.annealMaxC === null || typeof s.annealMaxC === 'number') || !['comparable', 'as-published'].includes(s.evidence) || !['dry', 'conditioned'].includes(s.moisture)) {
      throw new Error(`corpus ${c.corpus}: case ${k.id} has an incomplete scenario`);
    }
  }
  if (c.cases.length === 0) throw new Error(`corpus ${c.corpus} is empty`);
  if (digestOfCases(c.cases) !== c.digest) throw new Error(`corpus ${c.corpus}: the case list does not match its digest (truncated or edited by hand? rebuild with npm run parity:corpus)`);
  for (const [g, n] of Object.entries(c.counts)) {
    const actual = g === 'total' ? c.cases.length : c.cases.filter((k) => k.group === g).length;
    if (actual !== n) throw new Error(`corpus ${c.corpus}: counts say ${n} ${g} cases, the file holds ${actual}`);
  }
  return c;
}

export const writeCorpus = (c: Corpus, path: string = CORPUS_PATH): void => writeFileSync(path, `${JSON.stringify(c, null, 1)}\n`);
