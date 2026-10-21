// How a CSV table maps onto its lossless SQLite table and back (WP-09; db/generated/storage.sql, pack 04 section 4.2).
//
// One rule per kind of column, decided from the generated column facts (TABLES), so nothing here is hand-listed per table:
//   typed column (number, integer, boolean)   stored as <sql>_text, the exact text; <sql> and <sql>_state are generated
//   text column that declares missing words   <sql> holds the value (NULL when a word stands in), <sql>_state the word
//   any other column                          <sql> holds the exact text (NULL for an empty cell)
// Every identifier below comes from the generated allow-list (TABLE_NAMES, TABLES); every value is a bound parameter.
import { TABLE_NAMES, TABLES } from './generated/columns.ts';
import type { ColumnInfo, TableName } from './generated/columns.ts';
import type { Db, Param, Row } from './driver.ts';
import { csvText } from './csv.ts';

export const quoteIdent = (name: string): string => `"${name.replaceAll('"', '""')}"`;

/** Whether `name` is a table of the schema (the type guard that avoids a cast from the generated list). */
export function isTableName(name: string): name is TableName {
  return TABLE_NAMES.some((table) => table === name);
}

/** The number of rows in a table or view. */
export function countRows(db: Db, relation: string): number {
  return Number(db.prepare(`SELECT count(*) AS n FROM ${quoteIdent(relation)}`).get()?.n);
}

const TYPED = new Set(['number', 'integer', 'boolean']);

type Layout =
  | { readonly kind: 'text'; readonly column: ColumnInfo; readonly sql: string }
  | { readonly kind: 'word'; readonly column: ColumnInfo; readonly sql: string; readonly state: string; readonly words: ReadonlySet<string> }
  | { readonly kind: 'typed'; readonly column: ColumnInfo; readonly sql: string };

function layoutOf(column: ColumnInfo): Layout {
  if (TYPED.has(column.type)) return { kind: 'typed', column, sql: `${column.sqlName}_text` };
  if (column.missing.length) return { kind: 'word', column, sql: column.sqlName, state: `${column.sqlName}_state`, words: new Set(column.missing) };
  return { kind: 'text', column, sql: column.sqlName };
}

/** The SQL expression that gives a column's exact text: the stored text, or the missing-state word when one stands in. */
const textOf = (layout: Layout): string => (layout.kind === 'word' ? `COALESCE(${quoteIdent(layout.state)}, ${quoteIdent(layout.sql)})` : quoteIdent(layout.sql));

/** The stored columns a cell is kept in: one, or for a column that declares missing words the value and its missing-state word. */
const storedColumns = (layout: Layout): string[] => (layout.kind === 'word' ? [layout.sql, layout.state] : [layout.sql]);

/** What to store for a cell, in the order of `storedColumns`. */
function storedValues(layout: Layout, cell: string | null): Param[] {
  if (layout.kind !== 'word') return [cell];
  const isWord = cell !== null && layout.words.has(cell);
  return [isWord ? null : cell, isWord ? cell : null];
}

function layoutNamed(table: TableName, columnName: string): Layout {
  const column = TABLES[table].columns.find((c) => c.name === columnName);
  if (!column) throw new Error(`${table} has no column "${columnName}"`);
  return layoutOf(column);
}

/** The SQL expression for the exact text of one column of a table (for a WHERE on a key). */
export const textExpression = (table: TableName, columnName: string): string => textOf(layoutNamed(table, columnName));

/**
 * The stored columns one cell is written to, as [SQL column, bound value] pairs, by the same rule `encode` uses: a typed
 * column's exact text, or a text column's value and its missing-state word. Identifiers come from the generated list.
 */
export function assignmentsOf(table: TableName, columnName: string, cell: string | null): readonly (readonly [string, Param])[] {
  const layout = layoutNamed(table, columnName);
  const values = storedValues(layout, cell);
  return storedColumns(layout).map((column, k): [string, Param] => [column, values[k] ?? null]);
}

export interface TableStorage {
  readonly table: TableName;
  /** The CSV header, in the schema's order. */
  readonly header: readonly string[];
  /** INSERT with one `?` per stored column: `_ord` first, then the cells in header order. */
  readonly insertSql: string;
  /** SELECT of the exact text of every cell, in header order, rows in `_ord` order. Column k is aliased `c<k>`. */
  readonly selectSql: string;
  /** The same SELECT for the one row whose `_ord` is the parameter. */
  readonly selectRowSql: string;
  /** The values to bind for one CSV record (cells in header order), after its `_ord`. */
  encode(ord: number, cells: readonly (string | null)[]): Param[];
}

const cache = new Map<TableName, TableStorage>();

export function storageOf(table: TableName): TableStorage {
  const known = cache.get(table);
  if (known) return known;
  const layouts = TABLES[table].columns.map(layoutOf);
  const stored = ['_ord', ...layouts.flatMap(storedColumns)];
  const select = layouts.map((l, k) => `${textOf(l)} AS c${k}`);
  const storage: TableStorage = {
    table,
    header: layouts.map((l) => l.column.name),
    insertSql: `INSERT INTO ${quoteIdent(table)} (${stored.map(quoteIdent).join(', ')}) VALUES (${stored.map(() => '?').join(', ')})`,
    selectSql: `SELECT ${select.join(', ')} FROM ${quoteIdent(table)} ORDER BY _ord`,
    selectRowSql: `SELECT ${select.join(', ')} FROM ${quoteIdent(table)} WHERE _ord = ?`,
    encode(ord, cells) {
      return [ord, ...layouts.flatMap((layout, k) => storedValues(layout, cells[k] ?? null))];
    },
  };
  cache.set(table, storage);
  return storage;
}

/** Whether a CSV header is exactly the schema's columns for `table`, in order. */
export function headerMatches(table: TableName, header: readonly string[]): boolean {
  const want = storageOf(table).header;
  return header.length === want.length && header.every((name, k) => name === want[k]);
}

/** The cells of a selected row, in header order. A cell that is not text or NULL is a storage fault and throws. */
function cellsOfRow(table: TableName, header: readonly string[], row: Row): (string | null)[] {
  return header.map((name, k) => {
    const value = row[`c${k}`];
    if (value === null || typeof value === 'string') return value;
    throw new Error(`${table}.${name}: SQLite returned ${typeof value} where exact text was stored`);
  });
}

/** The cells of the one record at `ord`, or null when there is none. */
export function readRow(db: Db, table: TableName, ord: number): (string | null)[] | null {
  const { selectRowSql, header } = storageOf(table);
  const row = db.prepare(selectRowSql).get(ord);
  return row === undefined ? null : cellsOfRow(table, header, row);
}

/** Every record of a table as its cells, in file order. A cell that is not text or NULL is a storage fault and throws. */
export function* readCells(db: Db, table: TableName): Generator<(string | null)[]> {
  const { selectSql, header } = storageOf(table);
  for (const row of db.prepare(selectSql).iterate()) yield cellsOfRow(table, header, row);
}

/** The canonical CSV text of a table, exactly as the file holds it. */
export function exportTable(db: Db, table: TableName): string {
  return csvText(storageOf(table).header, readCells(db, table));
}
