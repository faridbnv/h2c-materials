// The table's order, from the table itself (app/js/ui/table.js sortRows, imported read-only and never edited): by group in the
// exploration mode with requirements, and inside a group by the default sort of the live table, the material's name (or the
// goal's rank when the scenario ranks by one). The engine does not guess this order and does not copy it: it asks the function
// the page uses, with the state a page opens on, and the parity harness asks the same function on the old side.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { RawContext, RawEvaluation, RawMaterial } from './old-engine.ts';
import { REPO_ROOT } from './paths.ts';

/** A row of the table: the material and the evaluation that decides where it stands. */
export interface TableRow { readonly material: RawMaterial; readonly evaluation: RawEvaluation }

/** The part of the page's state that sortRows reads (main.js `state`): what was asked, the sort, the columns, the context. */
export interface TableState {
  readonly scenario: { readonly unknownPolicy: string; readonly constraints: readonly object[]; readonly rankBy?: string | null };
  readonly sort: { readonly key: string; readonly dir: 'asc' | 'desc' };
  readonly columnSet: string;
  readonly ctx: RawContext;
  readonly sortOverride: boolean;
}

/** The state the page opens on, as far as the order goes: sorted by name, ascending, the properties columns, no column chosen by hand. */
export const defaultTableState = (scenario: TableState['scenario'], ctx: RawContext): TableState => ({
  scenario, sort: { key: 'name', dir: 'asc' }, columnSet: 'properties', ctx, sortOverride: false,
});

interface OldTable { sortRows(rows: readonly TableRow[], state: TableState): TableRow[] }

const loaded: OldTable = await import(pathToFileURL(join(REPO_ROOT, 'app', 'js', 'ui', 'table.js')).href);

/** The rows in the order the live table shows them by default. A copy: `rows` is not changed. */
export function sortRows(rows: readonly TableRow[], state: TableState): TableRow[] {
  return loaded.sortRows(rows, state);
}
