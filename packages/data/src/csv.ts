// Canonical CSV for the data tables, read and written the way build/src/csv.js does (WP-09), with no dependency:
// RFC 4180 quoting only where a value needs it (a quote, a comma or a line feed), UTF-8 without a byte-order mark, LF line
// endings, a trailing newline, an empty field for a missing value. A cell is trimmed text; an empty cell is null, never "".
//
// The reader normalises exactly as the old one does (trim, empty to null), so anything non-canonical in a file (a space
// around a value, CRLF, quotes where none are needed, a blank line) is lost on the way in and the written text then differs
// from the file: that difference is how `db:roundtrip` detects a hand edit that is not canonical.

export interface CsvRecord {
  /** One entry per header column; null for an empty cell. */
  readonly cells: readonly (string | null)[];
  /** The 1-based file line the record starts on, for error messages. */
  readonly line: number;
}

export interface ParsedCsv {
  readonly header: readonly string[];
  readonly records: readonly CsvRecord[];
}

export class CsvError extends Error {
  constructor(label: string, line: number, message: string) {
    super(`${label}:${line}: ${message}`);
    this.name = 'CsvError';
  }
}

const QUOTE = 0x22;
const COMMA = 0x2c;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;

/** Split text into raw records of raw fields (no trimming), each with its starting line. Strict about quotes. */
function* rawRecords(text: string, label: string): Generator<{ fields: string[]; line: number }> {
  const n = text.length;
  let i = 0;
  let line = 1;
  while (i < n) {
    const startLine = line;
    const fields: string[] = [];
    for (;;) {
      let value: string;
      if (text.charCodeAt(i) === QUOTE) {
        // A quoted field runs to the closing quote; "" inside stands for one quote.
        i++;
        value = '';
        for (;;) {
          const close = text.indexOf('"', i);
          if (close < 0) throw new CsvError(label, startLine, 'a quoted field is never closed');
          value += text.slice(i, close);
          if (text.charCodeAt(close + 1) === QUOTE) { value += '"'; i = close + 2; continue; }
          i = close + 1;
          break;
        }
        line += value.split('\n').length - 1;
        if (i < n && text.charCodeAt(i) !== COMMA && text.charCodeAt(i) !== LINE_FEED) {
          const crlf = text.charCodeAt(i) === CARRIAGE_RETURN && text.charCodeAt(i + 1) === LINE_FEED;
          throw new CsvError(label, line, crlf ? 'CRLF line endings; canonical files use LF' : `a closing quote is followed by ${JSON.stringify(text[i])}, not a comma or a line end`);
        }
      } else {
        let j = i;
        for (; j < n; j++) {
          const c = text.charCodeAt(j);
          if (c === COMMA || c === LINE_FEED) break;
          if (c === QUOTE) throw new CsvError(label, line, 'a quote inside an unquoted field');
        }
        value = text.slice(i, j);
        i = j;
      }
      fields.push(value);
      if (i >= n) { yield { fields, line: startLine }; return; } // the last record has no final newline
      const separator = text.charCodeAt(i);
      i++;
      if (separator === LINE_FEED) { yield { fields, line: startLine }; line++; break; }
    }
  }
}

/** Parse canonical (or nearly canonical) CSV text. `label` names the input in error messages. */
export function parseCsv(text: string, label: string): ParsedCsv {
  if (text.charCodeAt(0) === 0xfeff) throw new CsvError(label, 1, 'starts with a byte-order mark; save as UTF-8 without BOM');
  let header: string[] | null = null;
  const records: CsvRecord[] = [];
  for (const { fields, line } of rawRecords(text, label)) {
    if (header === null) { header = fields.map((h) => h.trim()); continue; }
    if (fields.length !== header.length) throw new CsvError(label, line, `a record has ${fields.length} field(s), the header has ${header.length}`);
    const cells = fields.map((f) => { const v = f.trim(); return v === '' ? null : v; });
    // The old reader drops a record whose every cell is empty; so does this one (a canonical file has none).
    if (cells.some((c) => c !== null)) records.push({ cells, line });
  }
  if (header === null) throw new CsvError(label, 1, 'empty file, expected a header row');
  return { header, records };
}

/** Quote a field the way csv-stringify does: only when it holds a quote, a comma or a line feed. */
function field(value: string | null): string {
  if (value === null || value === '') return '';
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Canonical CSV text for a header and rows of cells (null for an empty cell). */
export function csvText(header: readonly string[], rows: Iterable<readonly (string | null)[]>): string {
  const lines = [header.map(field).join(',')];
  for (const row of rows) lines.push(row.map(field).join(','));
  return `${lines.join('\n')}\n`;
}
