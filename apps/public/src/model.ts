// The data files of one release (data/<release>/...json), as the generator writes them and the page reads them.
// The page checks what it receives (parseResult, parseMaterial): a file that is not this shape is refused, never half shown.
import { GROUP_ORDER, STATUSES } from '@atlas/domain';
import type { Group, Status } from '@atlas/domain';

export type Verdict = 'PASS' | 'FAIL' | 'UNKNOWN';
export const VERDICTS: readonly Verdict[] = ['PASS', 'FAIL', 'UNKNOWN'];

export interface Counts { readonly pass: number; readonly fail: number; readonly unknown: number; readonly screened: number; readonly total: number }
export interface ProductCounts { readonly products: number; readonly pass: number; readonly fail: number; readonly untested: number; readonly screened: number }
export interface Best { readonly gradeId: string; readonly label: string }
/** How many materials fall in a group. */
export interface GroupCount { readonly group: Group; readonly count: number }

export interface MaterialLine {
  readonly materialId: string;
  readonly name: string;
  readonly verdict: Verdict;
  readonly group: Group;
  /** Hidden by a screen (a property that does not apply, an estimate): counted apart in the engine's counts. */
  readonly screened: boolean;
  readonly listingRank: number;
  /** Null: the material has no product on record and was judged on its own headline. */
  readonly products: ProductCounts | null;
  readonly best: Best | null;
}

export interface ResultFile {
  readonly kind: 'result';
  readonly release: string;
  /** The date of the data (the snapshot the release was built from). */
  readonly snapshot: string;
  readonly template: { readonly name: string; readonly description: string; readonly notChecked: string; readonly caseId: string };
  /** The requirements the template asks, in the words of the selector's own requirement pills. */
  readonly requirements: readonly { readonly text: string; readonly mandatory: boolean }[];
  /** The engine's own counts for this scenario. The page tallies the rows and refuses a file where the two differ. */
  readonly counts: Counts;
  readonly materials: readonly MaterialLine[];
}

export interface RequirementLine { readonly requirement: string; readonly status: Status; readonly reason: string }
export interface ProductLine {
  readonly gradeId: string;
  readonly label: string;
  readonly verdict: Verdict;
  readonly group: Group;
  readonly results: readonly RequirementLine[];
}
export interface MaterialFile {
  readonly kind: 'material';
  readonly release: string;
  readonly materialId: string;
  readonly name: string;
  readonly verdict: Verdict;
  readonly group: Group;
  readonly groupReason: string;
  readonly counts: ProductCounts | null;
  readonly best: Best | null;
  /** The material's own results: all there is for a material with no product on record. */
  readonly results: readonly RequirementLine[];
  readonly products: readonly ProductLine[];
}

/** A file that is not the shape the page expects. */
export class DataShapeError extends Error {
  constructor(what: string, problem: string) {
    super(`${what}: ${problem}`);
    this.name = 'DataShapeError';
  }
}

type Rec = Readonly<Record<string, unknown>>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

function rec(v: unknown, where: string): Rec {
  if (!isRec(v)) throw new DataShapeError(where, 'not an object');
  return v;
}
function str(r: Rec, key: string, where: string): string {
  const v = r[key];
  if (typeof v !== 'string') throw new DataShapeError(where, `"${key}" is not text`);
  return v;
}
function num(r: Rec, key: string, where: string): number {
  const v = r[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new DataShapeError(where, `"${key}" is not a number`);
  return v;
}
function bool(r: Rec, key: string, where: string): boolean {
  const v = r[key];
  if (typeof v !== 'boolean') throw new DataShapeError(where, `"${key}" is not true or false`);
  return v;
}
function list(r: Rec, key: string, where: string): readonly unknown[] {
  const v = r[key];
  if (!Array.isArray(v)) throw new DataShapeError(where, `"${key}" is not a list`);
  return v;
}
function oneOf<T extends string>(words: readonly T[], r: Rec, key: string, where: string): T {
  const v = str(r, key, where);
  const hit = words.find((w) => w === v);
  if (hit === undefined) throw new DataShapeError(where, `"${key}" is "${v}", not one of ${words.join(', ')}`);
  return hit;
}
function nullable<T>(v: unknown, read: (r: Rec) => T, where: string): T | null {
  return v === null ? null : read(rec(v, where));
}

const productCounts = (r: Rec, where: string): ProductCounts => ({
  products: num(r, 'products', where), pass: num(r, 'pass', where), fail: num(r, 'fail', where), untested: num(r, 'untested', where), screened: num(r, 'screened', where),
});
const best = (r: Rec, where: string): Best => ({ gradeId: str(r, 'gradeId', where), label: str(r, 'label', where) });
const requirementLine = (v: unknown, where: string): RequirementLine => {
  const r = rec(v, where);
  return { requirement: str(r, 'requirement', where), status: oneOf(STATUSES, r, 'status', where), reason: str(r, 'reason', where) };
};

export function parseResult(value: unknown): ResultFile {
  const where = 'the results file';
  const r = rec(value, where);
  if (r.kind !== 'result') throw new DataShapeError(where, 'is not a results file');
  const template = rec(r.template, `${where} template`);
  const counts = rec(r.counts, `${where} counts`);
  return {
    kind: 'result', release: str(r, 'release', where), snapshot: str(r, 'snapshot', where),
    template: { name: str(template, 'name', where), description: str(template, 'description', where), notChecked: str(template, 'notChecked', where), caseId: str(template, 'caseId', where) },
    requirements: list(r, 'requirements', where).map((v) => {
      const q = rec(v, `${where} requirement`);
      return { text: str(q, 'text', where), mandatory: bool(q, 'mandatory', where) };
    }),
    counts: { pass: num(counts, 'pass', where), fail: num(counts, 'fail', where), unknown: num(counts, 'unknown', where), screened: num(counts, 'screened', where), total: num(counts, 'total', where) },
    materials: list(r, 'materials', where).map((v): MaterialLine => {
      const m = rec(v, `${where} material`);
      return {
        materialId: str(m, 'materialId', where), name: str(m, 'name', where), verdict: oneOf(VERDICTS, m, 'verdict', where), group: oneOf(GROUP_ORDER, m, 'group', where),
        screened: bool(m, 'screened', where), listingRank: num(m, 'listingRank', where), products: nullable(m.products, (c) => productCounts(c, where), where), best: nullable(m.best, (b) => best(b, where), where),
      };
    }),
  };
}

export function parseMaterial(value: unknown): MaterialFile {
  const where = 'a material file';
  const r = rec(value, where);
  if (r.kind !== 'material') throw new DataShapeError(where, 'is not a material file');
  return {
    kind: 'material', release: str(r, 'release', where), materialId: str(r, 'materialId', where), name: str(r, 'name', where),
    verdict: oneOf(VERDICTS, r, 'verdict', where), group: oneOf(GROUP_ORDER, r, 'group', where), groupReason: str(r, 'groupReason', where),
    counts: nullable(r.counts, (c) => productCounts(c, where), where), best: nullable(r.best, (b) => best(b, where), where),
    results: list(r, 'results', where).map((v) => requirementLine(v, where)),
    products: list(r, 'products', where).map((v): ProductLine => {
      const p = rec(v, `${where} product`);
      return {
        gradeId: str(p, 'gradeId', where), label: str(p, 'label', where), verdict: oneOf(VERDICTS, p, 'verdict', where), group: oneOf(GROUP_ORDER, p, 'group', where),
        results: list(p, 'results', where).map((q) => requirementLine(q, where)),
      };
    }),
  };
}
