import type { MissingState } from './generated/rows.ts';

/**
 * A cell that may hold a missing-state word instead of a value: a value, or the word, never both (the two variants
 * exclude each other) and never a word read as a value. Mirrors the database's `<column>` + `<column>_state` pair
 * (research datamodel section 2). `Word` is limited to the six words of schema/vocab/missing-states.csv; each
 * generated column lists the ones it accepts. Only a decoder should build one (`present`, `absent`).
 */
export type Cell<T, Word extends MissingState> =
  | { readonly value: T; readonly missing?: never }
  | { readonly missing: Word; readonly value?: never };

export const present = <T>(value: T): { readonly value: T } => ({ value });
export const absent = <Word extends MissingState>(missing: Word): { readonly missing: Word } => ({ missing });

export function isMissing<T, Word extends MissingState>(cell: Cell<T, Word>): cell is { readonly missing: Word; readonly value?: never } {
  return cell.missing !== undefined;
}

/** The value, or undefined when a word stands in its place. Never a default such as 0. */
export function valueOf<T, Word extends MissingState>(cell: Cell<T, Word>): T | undefined {
  return cell.missing === undefined ? cell.value : undefined;
}
