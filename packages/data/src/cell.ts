/**
 * A cell that may hold a missing-state word instead of a value: a value, or the word, never both and never a
 * word read as a value. Mirrors the database's `<column>` + `<column>_state` pair (research datamodel section 2).
 * The words are the six in schema/vocab/missing-states.csv; each column lists the ones it accepts.
 */
export type Cell<T, Word extends string> = { readonly value: T } | { readonly missing: Word };

export function isMissing<T, Word extends string>(cell: Cell<T, Word>): cell is { readonly missing: Word } {
  return 'missing' in cell;
}
