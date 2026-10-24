// The table's order (WP-26): the sort of the selector's results, ported from the old table (app/js/ui/table.js sortRows, sortWithinGroup,
// sortValue, rankOf) as a function of plain data. It is DOM-free and Node-free, so the engine's listing order (context.ts) and the page's
// table both run this one function, and the parity harness proves it equal to the old page's own on the old side (the ties surface).
//
// The columns a table shows are the page's business (the registry and the labels name them); this order needs only each visible column's
// key and kind, which the caller gives in `state.columns`. The engine's own order is the one a page opens on: by name.
import { GROUP, GROUP_ORDER } from './port/constraints.ts';

/** A visible column, as far as the order goes: its key and its kind (name, headline, price, print, needs, state, pin, text). */
export interface TableColumn { readonly key: string; readonly kind: string }

interface PrintWindow { readonly min?: number | null; readonly max?: number | null; readonly hi?: number | null }
interface SortHeadline { readonly known?: boolean; readonly value?: number; readonly missing?: string; readonly estimate?: { readonly centre?: number | null; readonly lo?: number | null; readonly hi?: number | null } | null }

/** A material as the order reads it. */
export interface SortMaterial {
  readonly id: string;
  readonly name?: unknown;
  readonly headline?: Readonly<Record<string, SortHeadline | undefined>>;
  readonly print?: Readonly<Record<string, PrintWindow | undefined>> | null;
  readonly gates?: { readonly abrasive?: string; readonly drying?: string };
  readonly [field: string]: unknown;
}

/** The part of an evaluation that decides where a row stands. */
export interface SortEvaluation {
  readonly materialId: string;
  readonly verdict?: string;
  readonly group?: string;
  readonly likely?: boolean;
  readonly shortfall?: number;
}

/** A row of the table: the material and the evaluation that decides where it stands. */
export interface TableRow { readonly material: SortMaterial; readonly evaluation: SortEvaluation }

/** Each row's rank under the scenario's goal (indices.js rankingFor's byMaterial), or null when it ranks by nothing: the one ranking every lens reads (D102). */
export type Ranks = ReadonlyMap<string, { readonly value: number }>;

/** The part of the page's state the order reads (main.js `state`): what was asked, the sort, the visible columns, the ranks, whether estimates show. */
export interface TableState {
  readonly scenario: { readonly unknownPolicy: unknown; readonly constraints?: readonly object[] };
  readonly sort: { readonly key: string; readonly dir: 'asc' | 'desc' };
  readonly columns: readonly TableColumn[];
  readonly ranks: Ranks | null;
  readonly showEstimates: boolean;
  readonly sortOverride: boolean;
}

/** The state a page opens on, as far as the order goes: sorted by name, ascending, no column chosen by hand. */
export const defaultTableState = (scenario: TableState['scenario'], ranks: Ranks | null, showEstimates: boolean): TableState => ({
  scenario, sort: { key: 'name', dir: 'asc' }, columns: [{ key: 'name', kind: 'name' }], ranks, showEstimates, sortOverride: false,
});

const STATE_ORDER: Readonly<Record<string, number>> = { PASS: 0, INDETERMINATE: 1, UNKNOWN: 2, FAIL: 3 };

/**
 * What a row sorts by in a column, and whether that is an estimate. With estimates shown, a row whose cell shows an
 * estimate sorts by it, the headline's estimated centre, where it had always sunk below every measured row: sorted by
 * stiffness, the list put OBC's ~0.009-0.20 GPa after the stiffest carbon-fibre grades. An estimated print window sorts by
 * its top, as a published window does. With estimates hidden nothing estimated counts, as before.
 */
export function sortValue(row: TableRow, col: TableColumn, showEstimates = false): { value: number | string | null; estimated: boolean } {
  const m = row.material;
  if (col.kind === 'headline' || col.kind === 'price') {
    const h = m.headline?.[col.key];
    if (h?.known && h.value !== undefined) return { value: h.value, estimated: false };
    const e = showEstimates ? h?.estimate : null;
    const centre = !e ? null : Number.isFinite(e.centre) ? (e.centre ?? null)
      : Number.isFinite(e.lo) && Number.isFinite(e.hi) ? ((e.lo ?? 0) + (e.hi ?? 0)) / 2 : null;
    return { value: centre, estimated: centre !== null };
  }
  if (col.kind === 'print') {
    const window = m.print?.[col.key];
    const published = window?.max ?? window?.min;
    if (typeof published === 'number' && Number.isFinite(published)) return { value: published, estimated: false };
    // The same estimates the cells show: a nozzle or bed window, or a chamber band where no chamber window is published.
    const est = !showEstimates ? null
      : col.key === 'nozzleC' ? m.print?.['nozzleEstimate'] : col.key === 'bedC' ? m.print?.['bedEstimate']
      : col.key === 'chamberC' ? m.print?.['chamberEstimate'] : null;
    return typeof est?.hi === 'number' && Number.isFinite(est.hi) ? { value: est.hi, estimated: true } : { value: null, estimated: false };
  }
  if (col.kind === 'needs') {
    return { value: (m.gates?.abrasive === 'requires-hardened' ? 2 : 0) + (m.gates?.drying === 'required' ? 1 : 0), estimated: false };
  }
  if (col.kind === 'state') return { value: STATE_ORDER[row.evaluation.verdict ?? ''] ?? 9, estimated: false };
  const own = m[col.key];
  return { value: typeof own === 'string' || typeof own === 'number' ? own : '', estimated: false };
}

/**
 * The rows in the order the table shows them, so an export matches what was on screen. Missing values sort last in both
 * directions rather than reading as zero; a measured value comes before an estimate of the same value in both, because
 * the measurement is the firmer answer.
 */
function sortWithinGroup(rows: readonly TableRow[], state: TableState): TableRow[] {
  // Ranked by a goal (D83): by the median index of each material's passing products, best first; a material with no
  // value for the index follows, by name. A column order chosen afterwards takes over the rows; the goal and its ranks stay.
  const { ranks } = state;
  if (ranks && !state.sortOverride) {
    return [...rows].sort((a, b) => (ranks.get(b.material.id)?.value ?? -Infinity) - (ranks.get(a.material.id)?.value ?? -Infinity)
      || String(a.material.name).localeCompare(String(b.material.name)));
  }
  const { sort } = state;
  const col = state.columns.find((c) => c.key === sort.key) ?? state.columns[0];
  if (!col) return [...rows];
  const { showEstimates } = state;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, col, showEstimates), bv = sortValue(b, col, showEstimates);
    if (av.value === null && bv.value === null) return 0;
    if (av.value === null) return 1;
    if (bv.value === null) return -1;
    const d = typeof av.value === 'string' || typeof bv.value === 'string' ? String(av.value).localeCompare(String(bv.value)) : av.value - bv.value;
    if (d === 0) return av.estimated === bv.estimated ? 0 : av.estimated ? 1 : -1;
    return sort.dir === 'desc' ? -d : d;
  });
}

/**
 * The groups' order for the table and its exports (D137, D155): meets every requirement, one check away, not enough data,
 * unlikely to meet, hidden, fail; ranks themselves do not change. Inside "Not enough data" the likely ones
 * come first, then the nearest by the shortfall of the product that represents each; every other group keeps the
 * column's order.
 */
export function sortRows(rows: readonly TableRow[], state: TableState): TableRow[] {
  const sorted = sortWithinGroup(rows, state);
  if (state.scenario.unknownPolicy !== 'exploration' || !state.scenario.constraints?.length) return sorted;
  const order = new Map<string, number>(GROUP_ORDER.map((g, i) => [g, i]));
  const at = (e: SortEvaluation): number => order.get(e.group ?? '') ?? 0;
  const near = (a: number, b: number): number => (a < b ? -1 : a > b ? 1 : 0);
  return sorted.sort((a, b) => at(a.evaluation) - at(b.evaluation)
    || (a.evaluation.group === GROUP.NOT_ENOUGH ? (Number(!!b.evaluation.likely) - Number(!!a.evaluation.likely)) || near(a.evaluation.shortfall ?? 0, b.evaluation.shortfall ?? 0) : 0));
}
