// The schema gate's checks on the rows the build read (WP-20). The old build/src/schema.js checked the CSV files before
// anything was compiled; the new build reads the clean SQLite reconstruction, which already refuses a file that is not the
// schema's columns, its manifest's rows and digest, STRICT types, CHECK constraints and foreign keys. What SQLite does not
// say is the cross-column part, and this carries it over with the old codes and words: a list cell's items (empty, repeated,
// not in their vocabulary, not a reference), an ID written into a sentence that points at nothing (embeddedReferences), the
// unique combinations, and every declared range, pattern and vocabulary again. The checks run on the rows as the compiler
// reads them, so a disagreement between the two is found here, not in a verdict.
//
// What it no longer does: read the CSV files (the reconstruction did), and compare the manifest (the reconstruction does:
// readInputs). The canonical-form check (SCHEMA-FORMAT) is kept as `isCanonical`, which the caller answers from the
// reconstruction's own export of each table.
//
// The checks are build/src/schema.js's `checkData`, line for line.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readCsv } from './csv.ts';
import type { Dyn, Issue, Sheet, SheetRow } from './types.ts';

const NUMBER_RE = /^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/;
const INTEGER_RE = /^-?\d+$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function loadSchemas(schemaDir: string): { tables: Dyn; vocab: Dyn } {
  const tables: Dyn = {};
  for (const f of readdirSync(join(schemaDir, 'tables')).filter((f) => f.endsWith('.schema.json')).sort()) {
    tables[basename(f, '.schema.json')] = JSON.parse(readFileSync(join(schemaDir, 'tables', f), 'utf8'));
  }
  const vocab: Dyn = {};
  for (const f of readdirSync(join(schemaDir, 'vocab')).filter((f) => f.endsWith('.csv')).sort()) {
    const { records } = readCsv(join(schemaDir, 'vocab', f));
    vocab[basename(f, '.csv')] = new Map<Dyn, Dyn>(records.map((r) => [r.values.Value, r.values.Meaning]));
  }
  return { tables, vocab };
}

function isDate(v: string): boolean {
  const m = DATE_RE.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return d.getUTCFullYear() === +m[1]! && d.getUTCMonth() === +m[2]! - 1 && d.getUTCDate() === +m[3]!;
}

/** A reference declaration is one `{ table, field }` or a list of them; always the list. */
function refs(reference: Dyn): Dyn[] {
  if (!reference) return [];
  return Array.isArray(reference) ? reference : [reference];
}

/** Split a list cell into its items. */
export function listItems(value: Dyn, delimiter = ';'): string[] {
  return String(value).split(delimiter).map((s) => s.trim()).filter(Boolean);
}

/** One table as the gate reads it: its header and its rows in file order, each with the line it came from. */
interface GateTable {
  header: string[];
  records: { values: SheetRow; line: number }[];
}

/** The loaded sheets as the gate reads them, by table name, the rows as the compiler will read them. */
export function gateTablesOf(sheets: ReadonlyMap<string, Sheet>): Record<string, GateTable> {
  return Object.fromEntries([...sheets].map(([name, sheet]) => [name, { header: sheet.header, records: sheet.rows.map((values) => ({ values, line: values.__row })) }]));
}

/**
 * Check every table against its schema. `tables[name]` is { header, records: [{ values, line }] }, the rows in file order;
 * a table the schema declares and `tables` lacks is SCHEMA-TABLE. Returns the issues in the build's { level, code, where,
 * message } shape. `isCanonical(name)` says whether the table's canonical text equals the file's.
 */
export function checkTables(tables: Dyn, schemas: Dyn, vocab: Dyn, { isCanonical }: { isCanonical?: (table: string) => boolean } = {}): Issue[] {
  const issues: Issue[] = [];
  const error = (code: Dyn, where: Dyn, message: Dyn) => issues.push({ level: 'error', code, where, message });
  for (const name of Object.keys(schemas)) {
    if (!tables[name]) error('SCHEMA-TABLE', `data/tables/${name}.csv`, `missing; schema/tables/${name}.schema.json declares it`);
  }

  // Values per referenced key, built once.
  const keyValues = new Map<Dyn, Dyn>();
  const valuesOf = (table: Dyn, field: Dyn) => {
    const k = `${table}.${field}`;
    if (!keyValues.has(k)) keyValues.set(k, new Set<Dyn>((tables[table]?.records ?? []).map((r: Dyn) => r.values[field])));
    return keyValues.get(k);
  };

  for (const [name, schema] of Object.entries<Dyn>(schemas)) {
    const t = tables[name];
    if (!t) continue;
    const file = `data/tables/${name}.csv`;
    const declared = schema.fields.map((f: Dyn) => f.name);

    const extra = t.header.filter((h: Dyn) => !declared.includes(h));
    const absent = declared.filter((h: Dyn) => !t.header.includes(h));
    for (const h of extra) error('SCHEMA-COLUMN', `${file}:1`, `column "${h}" is not declared in schema/tables/${name}.schema.json`);
    for (const h of absent) error('SCHEMA-COLUMN', `${file}:1`, `column "${h}" is declared in the schema but missing from the file`);
    if (!extra.length && !absent.length && declared.join('\u0000') !== t.header.join('\u0000')) {
      error('SCHEMA-COLUMN', `${file}:1`, `columns are not in schema order: ${declared.join(', ')}`);
    }

    const pk = schema.primaryKey;
    const at = (rec: Dyn) => `${file}:${rec.line}`;
    const label = (rec: Dyn) => (pk && rec.values[pk] ? `${rec.values[pk]} ` : '');

    for (const field of schema.fields) {
      if (!t.header.includes(field.name)) continue;
      const c = field.constraints ?? {};
      const missing = new Set<Dyn>(field.missing ?? []);
      for (const m of missing) if (!vocab['missing-states']?.has(m)) error('SCHEMA-DECLARATION', `schema/tables/${name}.schema.json`, `field "${field.name}" allows "${m}", which is not in schema/vocab/missing-states.csv`);
      if (field.vocabulary && !vocab[field.vocabulary]) { error('SCHEMA-DECLARATION', `schema/tables/${name}.schema.json`, `field "${field.name}" names vocabulary "${field.vocabulary}", but schema/vocab/${field.vocabulary}.csv does not exist`); continue; }
      const seen = new Map<Dyn, Dyn>();

      for (const rec of t.records) {
        const v = rec.values[field.name];
        const bad = (code: Dyn, msg: Dyn) => error(code, at(rec), `${label(rec)}${field.name} ${msg}`);
        if (v == null) { if (c.required) bad('SCHEMA-REQUIRED', 'is empty; write the value or an explicit missing state'); continue; }
        if (c.unique) {
          if (seen.has(v)) bad('SCHEMA-UNIQUE', `"${v}" repeats line ${seen.get(v)}; it must be unique`);
          else seen.set(v, rec.line);
        }
        if (missing.has(v)) continue;

        if (field.type === 'list') {
          const items = listItems(v, field.delimiter ?? ';');
          if (!items.length) bad('SCHEMA-LIST', 'is an empty list');
          const dup = items.filter((x, i) => items.indexOf(x) !== i);
          if (dup.length) bad('SCHEMA-LIST', `lists ${[...new Set<Dyn>(dup)].join(', ')} more than once`);
          for (const item of items) {
            if (field.item?.vocabulary && !vocab[field.item.vocabulary]?.has(item)) bad('SCHEMA-VOCABULARY', `item "${item}" is not in schema/vocab/${field.item.vocabulary}.csv`);
            else if (field.item?.pattern && !new RegExp(field.item.pattern).test(item)) bad('SCHEMA-PATTERN', `item "${item}" does not match ${field.item.pattern}`);
            else if (field.item?.reference && !refs(field.item.reference).some((r) => valuesOf(r.table, r.field).has(item))) {
              bad('SCHEMA-REFERENCE', `item "${item}" is not a ${refs(field.item.reference).map((r) => `${r.field} in ${r.table}.csv`).join(' or ')}`);
            }
          }
          continue;
        }

        if (field.type === 'number' && !NUMBER_RE.test(v)) { bad('SCHEMA-TYPE', `"${v}" is not a number${missing.size ? ` or one of: ${[...missing].join(', ')}` : ''}`); continue; }
        if (field.type === 'integer' && !INTEGER_RE.test(v)) { bad('SCHEMA-TYPE', `"${v}" is not a whole number`); continue; }
        if (field.type === 'date' && !isDate(v)) { bad('SCHEMA-TYPE', `"${v}" is not a YYYY-MM-DD date`); continue; }
        if (field.type === 'boolean') {
          const t0 = field.trueValues ?? ['true'], f0 = field.falseValues ?? ['false'];
          if (!t0.includes(v) && !f0.includes(v)) { bad('SCHEMA-TYPE', `"${v}" is not one of ${[...t0, ...f0].join(', ')}`); continue; }
        }
        if ((field.type === 'number' || field.type === 'integer')) {
          if (c.minimum != null && Number(v) < c.minimum) bad('SCHEMA-RANGE', `${v} is below the minimum ${c.minimum}`);
          if (c.maximum != null && Number(v) > c.maximum) bad('SCHEMA-RANGE', `${v} is above the maximum ${c.maximum}`);
        }
        if (c.pattern && !new RegExp(c.pattern).test(v)) bad('SCHEMA-PATTERN', `"${v}" does not match ${c.pattern}`);
        if (c.enum && !c.enum.includes(v)) bad('SCHEMA-VOCABULARY', `"${v}" is not one of: ${c.enum.join(', ')}`);
        if (field.vocabulary && !vocab[field.vocabulary].has(v)) bad('SCHEMA-VOCABULARY', `"${v}" is not in schema/vocab/${field.vocabulary}.csv`);
        for (const e of field.embeddedReferences ?? []) {
          for (const [token] of v.matchAll(new RegExp(e.pattern, 'g'))) {
            if (!valuesOf(e.table, e.field).has(token)) bad('SCHEMA-REFERENCE', `mentions "${token}", which is not a ${e.field} in ${e.table}.csv`);
          }
        }
        if (field.reference && !refs(field.reference).some((r) => valuesOf(r.table, r.field).has(v))) {
          bad('SCHEMA-REFERENCE', `"${v}" is not a ${refs(field.reference).map((r) => `${r.field} in ${r.table}.csv`).join(' or ')}`);
        }
      }
    }

    for (const keys of schema.uniqueKeys ?? []) {
      const seen = new Map<Dyn, Dyn>();
      for (const rec of t.records) {
        const k = keys.map((f: Dyn) => rec.values[f]).join('\u0000');
        if (seen.has(k)) error('SCHEMA-UNIQUE', at(rec), `${label(rec)}(${keys.join(', ')}) repeats line ${seen.get(k)}; the combination must be unique`);
        else seen.set(k, rec.line);
      }
    }

    if (isCanonical && !isCanonical(name)) error('SCHEMA-FORMAT', file, 'is not in canonical CSV format; run `npm run data:fmt`');
  }

  return issues;
}
