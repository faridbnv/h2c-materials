// The old-side adapter: runs the in-tree old engine (app/js/engine, read-only) on a db.json and normalizes what it says.
// The context is built the way the page does (app/js/main.js buildContext and recompute) and the way
// scripts/trace.mjs pageContext, the decision census and the snapshot do. A test pins it to trace.mjs pageContext.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canon, notComputable } from './canon.ts';
import type { EngineModules } from './engine-copy.ts';
import { ENGINE_DIR, REPO_ROOT, copyEngine, loadEngine } from './engine-copy.ts';
import type { Patch } from './engine-copy.ts';
import type { Adapter, Atom, CorpusCase, NormalizedCase, RecordFacts, Value } from './types.ts';

type Rows = Record<string, any>[];
type Db = Record<string, any> & { materials: Rows; grades: Rows; measurements: Rows; evidence: Rows; coverage: Rows; polymerEvidence?: Rows };

export const defaultDbPath = (): string => join(REPO_ROOT, 'dist', 'db.json');
export const readDb = (path: string = defaultDbPath()): Db => JSON.parse(readFileSync(path, 'utf8')) as Db;

const groupBy = (rows: Rows, key = 'materialId'): Map<string, Rows> => {
  const m = new Map<string, Rows>();
  for (const r of rows) (m.get(r[key]) ?? m.set(r[key], []).get(r[key])!).push(r);
  return m;
};
const byId = (rows: Rows): Map<string, Record<string, any>> => new Map(rows.map((r) => [r.id, r]));

/** Where a field lands. Everything that is not named here is compared as evidence (requirements) or presentation (rows). */
/** The result shapes the adapter knows. A key it does not know throws, so nothing a new engine version returns is dropped unseen. */
function exactKeys(o: object, known: string[], what: string): void {
  const extra = Object.keys(o).filter((k) => !known.includes(k));
  if (extra.length) throw new Error(`${what} has unexpected key(s) ${extra.join(', ')}: teach the adapter to compare them`);
}

const WORDING_FIELDS = new Set(['reason', 'criterion']);

/** A composite becomes a canonical string; an atom stays an atom so numbers meet Object.is. */
const atom = (v: unknown, identity?: Map<object, string>): Value =>
  (v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? (v as Atom) : canon(v, identity));

export interface OldAdapterOptions {
  /** Name shown in reports. */
  name: string;
  /** Parsed db. Each adapter must own its copy (read it again, or structuredClone), so object identity is never shared. */
  db: Db;
  /** Directory holding the engine files. Defaults to the real in-tree engine; a copy gives a fresh module instance. */
  engineDir?: string;
}

export async function createOldAdapter(opts: OldAdapterOptions): Promise<Adapter> {
  const { db } = opts;
  const engine: EngineModules = await loadEngine(opts.engineDir ?? ENGINE_DIR);
  const { runSelection, GROUP_ORDER, TREATMENT } = engine.constraints;
  const { productsByMaterial } = engine.products;
  const { INDICES, rankingFor } = engine.indices;
  const mats = db.materials.filter((m) => !m.familyEntry);
  const base = {
    db,
    measurementsByMaterial: groupBy(db.measurements),
    evidenceByMaterial: groupBy(db.evidence),
    polymerEvidenceByMaterial: groupBy(db.polymerEvidence ?? []),
    coverageByMaterial: groupBy(db.coverage),
    productsByMaterial: productsByMaterial(db),
    measurementById: byId(db.measurements),
    gradeById: byId(db.grades),
  };
  const groupRank = new Map<string, number>((GROUP_ORDER as string[]).map((g, i) => [g, i]));

  const contextFor = (s: CorpusCase['scenario']) => {
    const useEstimates = s.unknownPolicy === 'exploration' && s.useEstimates !== false;
    return {
      ...base, unknownPolicy: s.unknownPolicy, useEstimates, showEstimates: useEstimates, evidence: s.evidence ?? 'comparable',
      anneal: s.anneal === true, annealMaxC: s.annealMaxC ?? null, moisture: s.moisture === 'conditioned' ? 'conditioned' : 'dry',
    };
  };

  function normalize(c: CorpusCase): NormalizedCase {
    const scenario = structuredClone(c.scenario);
    const constraints = scenario.constraints as Record<string, any>[];
    const identity = new Map<object, string>(constraints.map((x, i) => [x, `c${i}`]));
    const ctx = contextFor(scenario);
    const selection = runSelection(mats, constraints, ctx);
    exactKeys(selection, ['evaluations', 'counts', 'candidates'], 'runSelection result');
    const { evaluations, counts, candidates } = selection;
    const matOf = new Map<string, Record<string, any>>(mats.map((m) => [m.id, m]));

    // The key of a requirement: its position in the scenario and what it asks, so two requirements on one property differ.
    const reqKey = (r: Record<string, any>, used: Set<string>): string => {
      const i = constraints.indexOf(r.constraint);
      const k = r.constraint ? (r.constraint.kind === 'numeric' ? r.constraint.property : r.constraint.kind === 'gate' ? r.constraint.gate
        : r.constraint.kind === 'facet' ? r.constraint.facet : r.constraint.kind === 'environment' ? r.constraint.category : r.constraint.kind) : 'none';
      let key = i >= 0 ? `c${i}:${k}` : r.constraint === TREATMENT ? 'treatment' : `ext:${k}:${r.criterion ?? ''}`;
      for (let n = 2; used.has(key); n++) key = `${i >= 0 ? `c${i}:${k}` : key.replace(/#\d+$/, '')}#${n}`;
      used.add(key);
      return key;
    };

    const records: Record<string, RecordFacts> = {};
    const put = (key: string, facts: RecordFacts) => {
      if (Object.hasOwn(records, key)) throw new Error(`two records share the key ${key}`);
      records[key] = facts;
    };
    const reqFacts = (r: Record<string, any>): RecordFacts => {
      const evidence: Record<string, Value> = {};
      const wording: Record<string, Value> = {};
      for (const [k, v] of Object.entries(r)) {
        if (k === 'constraint') continue;
        (WORDING_FIELDS.has(k) ? wording : evidence)[k] = atom(v, identity);
      }
      // What the requirement asked, by content (the key carries only its position): an engine that altered it must show.
      evidence.constraintBody = r.constraint === undefined ? undefined : canon(r.constraint);
      return { evidence, wording };
    };

    // The listing order the table uses (ui/table.js sortRows): by group; inside "not enough data", likely first, then nearest.
    const order = evaluations.map((_: unknown, i: number) => i);
    if (scenario.unknownPolicy === 'exploration' && constraints.length) {
      const at = (e: any) => groupRank.get(e.group) ?? 0;
      const near = (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0);
      order.sort((i: number, j: number) => {
        const a = evaluations[i], b = evaluations[j];
        return at(a) - at(b) || (a.group === 'not-enough-data' ? (Number(!!b.likely) - Number(!!a.likely)) || near(a.shortfall ?? 0, b.shortfall ?? 0) : 0);
      });
    }
    const listingRank = new Map<string, number>(order.map((idx: number, place: number) => [evaluations[idx].materialId, place + 1]));

    const rows = evaluations.map((e: any) => ({ material: matOf.get(e.materialId), evaluation: e }));
    const places = new Map<string, Record<string, Value>>();
    for (const index of INDICES) {
      const ranking = rankingFor(rows, ctx, index);
      if (!ranking) continue;
      exactKeys(ranking, ['index', 'order', 'byMaterial', 'unranked'], 'rankingFor result');
      for (const [id, r] of ranking.byMaterial as Map<string, { place: number }>) (places.get(id) ?? places.set(id, {}).get(id)!)[`rank.${index.id}`] = r.place;
      for (const u of ranking.unranked as { materialId: string }[]) (places.get(u.materialId) ?? places.set(u.materialId, {}).get(u.materialId)!)[`rank.${index.id}`] = 'unranked';
    }

    records.case = {
      decision: {
        'counts.pass': counts.pass, 'counts.fail': counts.fail, 'counts.unknown': counts.unknown, 'counts.screened': counts.screened,
        'counts.total': counts.total, candidates: canon(candidates.map((e: any) => e.materialId)),
      },
    };

    const HANDLED = new Set(['materialId', 'verdict', 'group', 'likely', 'groupReason', 'shortfall', 'eligible', 'needsVerification',
      'usesEstimate', 'usesPolymer', 'screened', 'screenedBy', 'results', 'unresolved', 'heldBy', 'failedBy', 'share', 'counts',
      'someFail', 'products', 'gradeId', 'state', 'failed']);
    const withoutWords = (r: Record<string, any>) => { const { reason: _r, criterion: _c, ...rest } = r; return { ...rest, constraint: r.constraint === undefined ? undefined : canon(r.constraint) }; };
    const stateFields = (st: Record<string, any> | undefined): Record<string, Value> =>
      Object.fromEntries(Object.entries(st ?? {}).filter(([k]) => k !== 'id').map(([k, v]) => [`state.${k}`, atom(v)]));
    const listOf = (xs: any[] | undefined, f: (x: any) => unknown) => canon((xs ?? []).map(f));

    for (const e of evaluations) {
      const id = e.materialId as string;
      const decision: Record<string, Value> = {
        verdict: e.verdict, eligible: e.eligible, screened: e.screened, share: e.share,
        group: e.group, likely: e.likely, gradeId: e.gradeId, 'state.id': e.state?.id, listingRank: listingRank.get(id),
        ...Object.fromEntries(Object.entries(e.counts ?? {}).map(([k, v]) => [`counts.${k}`, v as Value])),
        ...(e.counts ? {} : { counts: null }),
        ...places.get(id),
      };
      const presentation: Record<string, Value> = {
        shortfall: e.shortfall, someFail: e.someFail, needsVerification: e.needsVerification, usesEstimate: e.usesEstimate,
        usesPolymer: e.usesPolymer, failed: atom(e.failed, identity), ...stateFields(e.state),
        productOrder: listOf(e.products, (p) => p.gradeId),
      };
      for (const [k, v] of Object.entries(e)) if (!HANDLED.has(k)) presentation[`extra.${k}`] = atom(v, identity);
      const used = new Set<string>();
      const unresolvedKeys = (e.unresolved ?? []).map((r: any) => reqKey(r, new Set()));
      put(`material:${id}`, {
        decision, presentation,
        evidence: {
          'unresolved.keys': canon(unresolvedKeys),
          'heldBy.keys': listOf(e.heldBy, (r) => reqKey(r, new Set())),
          unresolved: listOf(e.unresolved, withoutWords), heldBy: listOf(e.heldBy, (r) => (typeof r === 'object' && r ? withoutWords(r) : r)),
          'failedBy.count': (e.failedBy ?? []).length,
        },
        wording: {
          groupReason: e.groupReason, screenedBy: atom(e.screenedBy), failedBy: atom(e.failedBy),
          'unresolved.reasons': listOf(e.unresolved, (r) => r.reason), 'heldBy.reasons': listOf(e.heldBy, (r) => r.reason ?? r),
        },
      });
      for (const r of e.results ?? []) put(`mreq:${id}/${reqKey(r, used)}`, reqFacts(r));

      for (const p of e.products ?? []) {
        const pid = `${id}/${p.gradeId}`;
        const pres: Record<string, Value> = { variant: p.variant, ...stateFields(p.state), admitted: atom(p.admitted), states: atom(p.states) };
        for (const [k, v] of Object.entries(p)) {
          if (!['gradeId', 'verdict', 'group', 'likely', 'groupReason', 'screened', 'failedBy', 'state', 'results', 'variant', 'admitted', 'states'].includes(k)) pres[`extra.${k}`] = atom(v, identity);
        }
        put(`product:${pid}`, {
          decision: { verdict: p.verdict, group: p.group, likely: p.likely, screened: p.screened, 'state.id': p.state?.id },
          presentation: pres,
          wording: { groupReason: p.groupReason, failedBy: atom(p.failedBy) },
        });
        const pused = new Set<string>();
        for (const r of p.results ?? []) put(`req:${pid}/${reqKey(r, pused)}`, reqFacts(r));
      }
    }
    return { caseId: c.id, outcome: 'computed', records };
  }

  return {
    name: opts.name,
    evaluate(c) {
      try {
        return normalize(c);
      } catch (err) {
        // A case this engine cannot answer is reported as such, with the reason; it is never an empty or zero answer.
        return { caseId: c.id, outcome: 'not-computable', reason: `${opts.name}: ${(err as Error).message}` };
      }
    },
  };
}

/** The in-tree old engine on the current db. */
export const createOld = (db: Db = readDb()): Promise<Adapter> => createOldAdapter({ name: 'old', db });

/** A second, independently loaded copy of old: fresh module instances from a temp copy of the engine, and its own parse of the db. */
export const createOldCopy = (patches: readonly Patch[] = [], name = 'old-copy', db: Db = readDb()): Promise<Adapter> =>
  createOldAdapter({ name, db, engineDir: copyEngine(patches) });

export { notComputable };
