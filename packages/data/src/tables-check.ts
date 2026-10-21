import type { TABLE_COLUMNS, TableName } from './generated/columns.ts';
import type { Rows } from './generated/rows.ts';

/**
 * Compile-time proof that the row type of every table has exactly the columns the schema lists: a column added to or
 * lost from one generated file and not the other fails `tsc`, and the message names the table.
 */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Mismatched = { readonly [T in TableName]: Same<keyof Rows[T], (typeof TABLE_COLUMNS)[T][number]> extends true ? never : T }[TableName];

export const tablesMatch: [Mismatched] extends [never] ? true : { readonly mismatchedTables: Mismatched } = true;
