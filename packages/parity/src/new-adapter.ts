// The new-side adapter (WP-11): the old engine behind the typed wrapper (@atlas/engine), normalized the way old-adapter.ts
// normalizes the engine itself. The wrapper's answer is read as a consumer reads it: requirements matched by `constraintId`
// (never `===` on an object), decisions from the RowResult rows, everything else from the typed evaluations. The fields the
// wrapper adds (`constraintId`, `reasonCode`) are not in the old answer and are left out of the comparison, so a zero
// means the wrapper loses nothing and changes nothing. Their own tests cover them (tests/parity/engine-wrapper.test.mjs).
import { createContext, loadOldEngine, scenarioFrom } from '@atlas/engine';
import type { EngineOutput, OldEngine } from '@atlas/engine';
import type { ConstraintId, RequirementResult, RowResult } from '@atlas/domain';
import type { Db } from '@atlas/data';
import { canon, composite } from './canon.ts';
import { atom } from './old-adapter.ts';
import type { Adapter, CorpusCase, NormalizedCase, RecordFacts, Value } from './types.ts';

export interface NewAdapterOptions {
  name?: string;
  /** The typed db (checkDb). The adapter does not copy it, so give each adapter its own parse. */
  db: Db;
  /** Directory of the engine files to wrap; a byte copy gives fresh module instances. Defaults to the in-tree engine. */
  engineDir?: string;
  /** What the wrapper's answer goes through before it is read. A structured clone proves nothing depends on object identity. */
  transport?: (output: EngineOutput) => EngineOutput;
}

/** What the wrapper adds beside the old answer; not compared here. */
const ADDED = new Set(['constraintId', 'reasonCode']);

/** The fields of an evaluation and of a product that are read by name; every other field is carried as `extra.<name>`. */
const HANDLED_EVALUATION_FIELDS = new Set(['materialId', 'verdict', 'group', 'likely', 'groupReason', 'shortfall', 'eligible', 'needsVerification',
  'usesEstimate', 'usesPolymer', 'screened', 'screenedBy', 'results', 'unresolved', 'heldBy', 'failedBy', 'share', 'counts',
  'someFail', 'products', 'gradeId', 'state', 'failed']);
const HANDLED_PRODUCT_FIELDS = new Set(['gradeId', 'verdict', 'group', 'likely', 'groupReason', 'screened', 'failedBy', 'state', 'results', 'variant', 'admitted', 'states']);

function requirementKind(c: RequirementResult['constraint']): unknown {
  switch (c.kind) {
    case 'numeric': return c.property;
    case 'gate': return c.gate;
    case 'facet': return c.facet;
    case 'environment': return c.category;
    case 'evidence':
    case 'treatment':
      return c.kind;
  }
}

function requireConstraintId(r: RequirementResult): ConstraintId {
  if (r.constraintId === undefined) throw new Error(`a result of "${r.criterion}" carries no constraintId`);
  return r.constraintId;
}

/** The result as the old engine wrote it: without the fields the wrapper adds. */
const withoutAdded = (r: RequirementResult): Record<string, unknown> => Object.fromEntries(Object.entries(r).filter(([k]) => !ADDED.has(k)));

export async function createNewAdapter(opts: NewAdapterOptions): Promise<Adapter> {
  const { db } = opts;
  const engine = await loadOldEngine(opts.engineDir);
  const name = opts.name ?? 'new (wrapper)';
  const transport = opts.transport ?? ((o: EngineOutput) => o);

  function normalize(c: CorpusCase): NormalizedCase {
    const scenario = scenarioFrom(structuredClone(c.scenario), db.meta, engine);
    const out = transport(createContext(db, scenario, { engine }).run());
    const position = new Map(out.constraintIds.map((id, i) => [id, i]));

    // A requirement inside a composite value is written by its place in the scenario, as old-adapter's identity map does.
    const standIn = new Map<ConstraintId, object>(out.constraintIds.map((id) => [id, {}]));
    const identity = new Map<object, string>([...standIn].map(([id, placeholder]) => [placeholder, `c${position.get(id)}`]));
    const legacy = (r: RequirementResult): Record<string, unknown> => ({ ...withoutAdded(r), constraint: standIn.get(requireConstraintId(r)) ?? r.constraint });

    const reqKey = (r: RequirementResult, used: Set<string>): string => {
      const id = requireConstraintId(r);
      const i = position.get(id);
      const k = requirementKind(r.constraint);
      let base: string;
      if (i !== undefined) base = `c${i}:${k}`;
      else if (id === 'treatment') base = 'treatment';
      else base = `ext:${k}:${r.criterion}`;
      let key = base;
      for (let n = 2; used.has(key); n++) key = `${i !== undefined ? base : key.replace(/#\d+$/, '')}#${n}`;
      used.add(key);
      return key;
    };

    const reqFacts = (r: RequirementResult, reason: string): RecordFacts => {
      const evidence: Record<string, Value> = {};
      const wording: Record<string, Value> = {};
      for (const [k, v] of Object.entries(r)) {
        if (k === 'constraint' || ADDED.has(k)) continue;
        if (k === 'reason') wording.reason = reason;
        else if (k === 'criterion') wording.criterion = atom(v);
        else evidence[k] = atom(v);
      }
      evidence.constraintBody = composite(r.constraint);
      return { evidence, wording };
    };
    const withoutWords = (r: RequirementResult) => {
      const { reason: _reason, criterion: _criterion, ...rest } = legacy(r);
      return { ...rest, constraint: canon(r.constraint) };
    };

    const rowOf = new Map<string, RowResult>(out.rows.map((row) => [row.productId === undefined ? row.materialId : `${row.materialId}/${row.productId}`, row]));
    const ranks = new Map<string, Record<string, Value>>();
    const rankOf = (materialId: string): Record<string, Value> => {
      const own = ranks.get(materialId) ?? {};
      ranks.set(materialId, own);
      return own;
    };
    for (const ranking of out.rankings) {
      for (const { materialId, place } of ranking.places) rankOf(materialId)[`rank.${ranking.index}`] = place;
      for (const materialId of ranking.unranked) rankOf(materialId)[`rank.${ranking.index}`] = 'unranked';
    }

    const records: Record<string, RecordFacts> = {};
    const put = (key: string, facts: RecordFacts): void => {
      if (Object.hasOwn(records, key)) throw new Error(`two records share the key ${key}`);
      records[key] = facts;
    };
    const rowFor = (key: string): RowResult => {
      const row = rowOf.get(key);
      if (!row) throw new Error(`the wrapper gave no row for ${key}`);
      return row;
    };
    const listOf = <T>(xs: readonly T[] | undefined, f: (x: T) => unknown) => composite((xs ?? []).map(f));
    const stateFields = (st: object | undefined): Record<string, Value> =>
      Object.fromEntries(Object.entries(st ?? {}).filter(([k]) => k !== 'id').map(([k, v]) => [`state.${k}`, atom(v)]));
    // A requirement's records, from the row that holds them: its requirements, and the reason entry beside each.
    const putRequirements = (row: RowResult, prefix: string): void => {
      const used = new Set<string>();
      row.requirements.forEach((r, i) => {
        const entry = row.reasons[i];
        if (!entry) throw new Error(`${row.materialId}: requirement ${i} has no reason entry`);
        put(`${prefix}/${reqKey(r, used)}`, reqFacts(r, entry.text));
      });
      if (row.reasons.length !== row.requirements.length) throw new Error(`${row.materialId}: ${row.reasons.length} reasons for ${row.requirements.length} requirements`);
    };

    records.case = {
      decision: {
        'counts.pass': out.counts.pass, 'counts.fail': out.counts.fail, 'counts.unknown': out.counts.unknown, 'counts.screened': out.counts.screened,
        'counts.total': out.counts.total, candidates: composite(out.candidates),
      },
    };

    for (const e of out.evaluations) {
      const id = e.materialId;
      const row = rowFor(id);
      const decision: Record<string, Value> = {
        verdict: row.verdict, eligible: e.eligible, screened: e.screened, share: e.share,
        group: row.group, likely: row.likely, gradeId: row.best, 'state.id': e.state?.id, listingRank: row.listingRank,
        ...(e.counts
          ? { 'counts.products': e.counts.products, 'counts.pass': row.counts.pass, 'counts.fail': row.counts.fail, 'counts.untested': row.counts.untested, 'counts.screened': e.counts.screened }
          : { counts: null }),
        ...ranks.get(id),
      };
      const presentation: Record<string, Value> = {
        shortfall: e.shortfall, someFail: e.someFail, needsVerification: e.needsVerification, usesEstimate: e.usesEstimate,
        usesPolymer: e.usesPolymer, failed: e.failed === undefined ? undefined : composite(e.failed.map(legacy), identity), ...stateFields(e.state),
        productOrder: listOf(e.products, (p) => p.gradeId),
      };
      for (const [k, v] of Object.entries(e)) if (!HANDLED_EVALUATION_FIELDS.has(k)) presentation[`extra.${k}`] = atom(v);
      const unresolved = e.unresolved ?? [];
      put(`material:${id}`, {
        decision, presentation,
        evidence: {
          'unresolved.keys': composite(unresolved.map((r) => reqKey(r, new Set()))),
          // heldBy holds the criteria as words (strings); the old normalizer keys each one as a requirement it cannot find.
          'heldBy.keys': listOf(e.heldBy, () => 'ext:none:'),
          unresolved: listOf(unresolved, withoutWords), heldBy: listOf(e.heldBy, (r) => r),
          'failedBy.count': e.failedBy.length,
        },
        wording: {
          groupReason: e.groupReason, screenedBy: atom(e.screenedBy), failedBy: atom(e.failedBy),
          'unresolved.reasons': listOf(unresolved, (r) => r.reason), 'heldBy.reasons': listOf(e.heldBy, (r) => r),
        },
      });
      putRequirements(row, `mreq:${id}`);

      for (const p of e.products ?? []) {
        const prow = rowFor(`${id}/${p.gradeId}`);
        const pres: Record<string, Value> = { variant: p.variant, ...stateFields(p.state), admitted: atom(p.admitted), states: atom(p.states) };
        for (const [k, v] of Object.entries(p)) if (!HANDLED_PRODUCT_FIELDS.has(k)) pres[`extra.${k}`] = atom(v);
        put(`product:${id}/${p.gradeId}`, {
          decision: { verdict: prow.verdict, group: prow.group, likely: prow.likely, screened: p.screened, 'state.id': prow.stateId },
          presentation: pres,
          wording: { groupReason: p.groupReason, failedBy: atom(p.failedBy) },
        });
        putRequirements(prow, `req:${id}/${p.gradeId}`);
      }
    }
    return { caseId: c.id, outcome: 'computed', records };
  }

  return {
    name,
    evaluate(c) {
      try {
        return normalize(c);
      } catch (err) {
        return { caseId: c.id, outcome: 'not-computable', reason: `${name}: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  };
}

/** The not-computable stand-in, for the harness' own tests: a new side that cannot answer must exit 2, never 0. */
export const createNewPlaceholder = (): Adapter => ({
  name: 'new (placeholder)',
  evaluate: (c) => ({ caseId: c.id, outcome: 'not-computable', reason: 'a placeholder new side: it answers nothing' }),
});
