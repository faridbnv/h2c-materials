// What a refusal means, in words for the person (05 section 11.4: errors appear inline in plain language and say what to do next).
import type { RefusalCode } from '@atlas/domain/contracts';
import type { EditorRefusalCode } from '../shared/api.ts';

const WORDS: Readonly<Record<RefusalCode | EditorRefusalCode, string>> = {
  'opid-invalid': 'The editor could not make a unique number for this correction. Try again.',
  'opid-conflict': 'This correction was already saved with different content. Reload the page and look at your drafts.',
  'unsupported-kind': 'This kind of change is not available in the editor yet.',
  'writer-locked': 'Another program is writing to this workspace, for example the command line. Close it and try again.',
  'stale-base': 'The data this workspace was built from has moved. Restart the editor, which rebuilds the workspace and re-applies your drafts, then correct again.',
  stale: 'This value changed after you opened it. Compare the three columns below.',
  'expectation-empty': 'The editor lost track of the values you saw. Reload the page and try again.',
  'expectation-partial': 'The editor lost track of the values you saw. Reload the page and try again.',
  'unknown-target': 'That record or column is not in this workspace.',
  'not-canonical': 'A value is empty or has spaces at its ends. Remove the spaces, or type the value.',
  'no-change': 'The new values are the same as the current ones, so there is nothing to save.',
  'delete-refused': 'A record keeps its identifier, and nothing is ever deleted.',
  'schema-violation': 'The database does not accept one of these values for its column (a wrong type, or a word the column does not allow).',
  'reference-missing': 'A value points at a record that does not exist.',
  'cells-not-together': 'The printed value, its number and the normalized value must change together. Fill all three.',
  'missing-as-number': 'A normalized number cannot rest on a printed value that says "Not published" or "Not applicable".',
  'unit-mismatch': 'The normalized unit does not belong to this property.',
  'ownership-mismatch': 'This product does not belong to this material.',
  'evidence-missing': 'A correction needs its source page, a locator and the quote.',
  'source-not-retrieved': 'This source was never retrieved, so a value cannot be checked against it.',
  'source-hash-mismatch': 'The digest of this source does not match the one recorded for it.',
  'evidence-source-mismatch': 'This record cites another source than the one you quoted.',
  'quote-not-on-page': 'This quote is not on that page of the source. Pick the words on the page, or choose the page they are on.',
  'value-not-printed': 'The new value is not a number of its own in the quoted line, or the line prints it in more than one role. Quote the line that prints it.',
  'ruling-missing': 'A rule row must cite a ruling that exists.',
  'rule-row-not-alone': 'A rule row must travel alone in its change set.',
  'notes-id-token': 'Notes say what was corrected and when, and never name a change set or a migration.',
  'not-for-command': 'The editor does not change that table or column this way. Use the command line, which has a command for it.',
  'duplicate-key': 'A record with this identifier, or the same observation, is already there.',
  'duplicate-of-invalid': 'A repeated record must name the one it repeats, and say why.',
  'successor-invalid': 'The record that replaces this one is missing, is the same record, or is retired itself.',
  'role-id-mismatch': 'A product\'s role has to agree with its identifier: study and reference products end in -R and a numbered product is a procurement one.',
  'reviewer-missing': 'A cell that says who reviewed a row must also say whether the reviewer is a person or an agent.',
  'schema-patch-invalid': 'That change to the data model is not valid. The command line says what is wrong with it.',
  'source-unavailable': 'The source document is not on this computer. You can read this record but cannot check a quote against the page, so a correction cannot be made here.',
  'bad-request': 'The editor could not read that request.',
  'not-found': 'That is no longer there.',
  'export-refused': 'The review could not be prepared.',
  busy: 'The workspace is in use. Try again in a moment.',
  'restart-needed': 'The editor could not open the workspace again. Stop it and start it again (npm run editor): your drafts and backups are safe on disk.',
};

export const explain = (code: RefusalCode | EditorRefusalCode): string => WORDS[code];

/** Whether the text is a plain number the form may calculate with. */
export const isPlainNumber = (text: string): boolean => /^-?\d+(\.\d+)?$/.test(text.trim());

/** raw x factor as the data prints a number: up to 12 significant digits, no trailing zeros, no exponent for ordinary sizes. */
export function scaled(raw: string, factor: string): string | null {
  if (!isPlainNumber(raw) || !isPlainNumber(factor)) return null;
  const value = Number((Number(raw) * Number(factor)).toPrecision(12));
  return Number.isFinite(value) ? String(value) : null;
}

export function when(iso: string | null): string {
  if (iso === null) return 'never';
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? iso : at.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const VALUE_ORDER = ['Raw value', 'Raw numeric', 'Normalized value'];

const rankOf = (name: string): number => {
  const position = VALUE_ORDER.indexOf(name);
  return position < 0 ? VALUE_ORDER.length : position;
};

/** Column names in the order a person reads a value: the printed value, its number, the normalized value, then the rest. */
export const ordered = (names: readonly string[]): string[] => [...names].sort((a, b) => rankOf(a) - rankOf(b) || a.localeCompare(b));

/** A value as printed, with its unit unless the printed text already carries it. */
export const withUnit = (value: string | null | undefined, unit: string | null | undefined): string =>
  value != null && unit != null && unit !== '' && !value.includes(unit) ? `${value} ${unit}` : value ?? '';
