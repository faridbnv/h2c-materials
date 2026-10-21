// The labels the build's modules share (WP-20, stage C, label step).
//
// The build assembles its database one record at a time, adding fields as the stages go, and its shape is the contract of
// schema/db.schema.json: it is checked once, at the end, by Ajv (contract.ts) and by @atlas/data's `checkDb`. Inside the
// stages a record is therefore `Dyn`, and this step labels names, parameters and the stage boundaries, not every field.
// Tightening a record's type is its own later step, one module at a time, under P-build.

/**
 * A record or value the build builds up field by field (a compiled measurement, a product, a headline, a rule table row).
 * One recorded escape from the checker (remake/types-ratchet.json), standing for the many that were `any` implicitly.
 */
export type Dyn = any;

/** A build finding: the code names the rule (build rules.ts), `where` names the record, `message` says what is wrong. */
export interface Issue {
  level: 'error' | 'warn' | 'info';
  code: string;
  where: string;
  message: string;
  [extra: string]: Dyn;
}

/**
 * One row of a data table as the compiler reads it: every column's trimmed text (null for an empty cell), plus where the
 * row came from (`__file`, `__row`) and the numbers its cells spell (`__numbers`).
 */
export interface SheetRow {
  __file: string;
  __row: number;
  __numbers: Record<string, number>;
  [column: string]: Dyn;
}

/** A table: its header and rows, in file order (`_ord` order when the rows come from the reconstruction). */
export interface Sheet {
  header: string[];
  rows: SheetRow[];
}

/** The tables by the sheet name the compiler addresses them by ("Print setup", "Properties", ...). */
export type Workbook = Record<string, Sheet>;
