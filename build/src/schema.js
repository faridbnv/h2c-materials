// Schema check: the declared contract for every data table, enforced before anything is compiled.
//
// Each table has schema/tables/<table>.schema.json (Frictionless Table Schema vocabulary, plus a
// `role` per field and a few extensions noted below). Controlled vocabularies live in
// schema/vocab/<name>.csv. This module checks structure only: columns, types, required values,
// patterns, vocabularies, uniqueness and references. What the data means (ownership, citations,
// comparability) stays in validate.js.
//
// Field extensions to Frictionless:
//   role        key | canonical | raw | editorial | derived | prose   (documentation; see DATA-MODEL.md)
//   missing     explicit missing-state words accepted instead of a value (schema/vocab/missing-states.csv)
//   vocabulary  name of a schema/vocab/<name>.csv file; the value must be one of its Value column
//   spellings   "many": more than one spelling of a value is legitimate here, because different publishers name
//               their own products; VOCAB-NEAR-DUPLICATE leaves the column alone
//   reference   { table, field } or a list of them; the value must exist in one of them
//   type "list" a ";"-separated list; `item` holds the pattern/reference each element must satisfy
//   embeddedReferences  [{ pattern, table, field }]: prose that mentions identifiers; every match of
//               the pattern must exist, so an ID written into a sentence cannot go stale silently

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, basename } from 'node:path';
import { readCsv, csvText } from './csv.js';

const NUMBER_RE = /^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/;
const INTEGER_RE = /^-?\d+$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Every table, in the order a reader meets them: the records, then what explains and relates them. A table missing here
// sorted first, so the review workbook opened on chamber bands and family members instead of materials.
export const TABLE_ORDER = ['materials', 'grades', 'profiles', 'profile_notes', 'measurements', 'fatigue_tests', 'evidence', 'polymer_environment', 'prices', 'sources', 'coverage', 'method', 'reference', 'reference_envelopes',
  'headlines', 'material_links', 'properties', 'headline_definitions', 'polymers', 'plausibility_windows', 'chamber_bands', 'family_entries', 'family_members'];

export function loadSchemas(schemaDir) {
  const tables = {};
  for (const f of readdirSync(join(schemaDir, 'tables')).filter((f) => f.endsWith('.schema.json')).sort()) {
    tables[basename(f, '.schema.json')] = JSON.parse(readFileSync(join(schemaDir, 'tables', f), 'utf8'));
  }
  const vocab = {};
  for (const f of readdirSync(join(schemaDir, 'vocab')).filter((f) => f.endsWith('.csv')).sort()) {
    const { records } = readCsv(join(schemaDir, 'vocab', f));
    vocab[basename(f, '.csv')] = new Map(records.map((r) => [r.values.Value, r.values.Meaning]));
  }
  return { tables, vocab };
}

function isDate(v) {
  const m = DATE_RE.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

const refs = (reference) => (reference ? (Array.isArray(reference) ? reference : [reference]) : []);

/** Split a list cell into its items. */
export function listItems(value, delimiter = ';') {
  return String(value).split(delimiter).map((s) => s.trim()).filter(Boolean);
}

/**
 * Check every table against its schema. Returns { issues, tables } where tables[name] is the parsed
 * CSV ({ header, records, text }). Issues use the build's { level, where, message } shape.
 */
export function checkData(dataDir, schemaDir, { formatting = true, manifest = true } = {}) {
  const { tables: schemas, vocab } = loadSchemas(schemaDir);
  const issues = [];
  const error = (code, where, message) => issues.push({ level: 'error', code, where, message });
  const tables = {};

  for (const [name, schema] of Object.entries(schemas)) {
    const path = join(dataDir, 'tables', `${name}.csv`);
    if (!existsSync(path)) { error('SCHEMA-TABLE', `data/tables/${name}.csv`, `missing; schema/tables/${name}.schema.json declares it`); continue; }
    tables[name] = readCsv(path);
  }
  for (const f of readdirSync(join(dataDir, 'tables')).filter((f) => f.endsWith('.csv'))) {
    if (!schemas[basename(f, '.csv')]) error('SCHEMA-TABLE', `data/tables/${f}`, 'has no schema in schema/tables/; every table must be declared');
  }

  // Values per referenced key, built once.
  const keyValues = new Map();
  const valuesOf = (table, field) => {
    const k = `${table}.${field}`;
    if (!keyValues.has(k)) keyValues.set(k, new Set((tables[table]?.records ?? []).map((r) => r.values[field])));
    return keyValues.get(k);
  };

  for (const [name, schema] of Object.entries(schemas)) {
    const t = tables[name];
    if (!t) continue;
    const file = `data/tables/${name}.csv`;
    const declared = schema.fields.map((f) => f.name);

    const extra = t.header.filter((h) => !declared.includes(h));
    const absent = declared.filter((h) => !t.header.includes(h));
    for (const h of extra) error('SCHEMA-COLUMN', `${file}:1`, `column "${h}" is not declared in schema/tables/${name}.schema.json`);
    for (const h of absent) error('SCHEMA-COLUMN', `${file}:1`, `column "${h}" is declared in the schema but missing from the file`);
    if (!extra.length && !absent.length && declared.join('\u0000') !== t.header.join('\u0000')) {
      error('SCHEMA-COLUMN', `${file}:1`, `columns are not in schema order: ${declared.join(', ')}`);
    }

    const pk = schema.primaryKey;
    const at = (rec) => `${file}:${rec.line}`;
    const label = (rec) => (pk && rec.values[pk] ? `${rec.values[pk]} ` : '');

    for (const field of schema.fields) {
      if (!t.header.includes(field.name)) continue;
      const c = field.constraints ?? {};
      const missing = new Set(field.missing ?? []);
      for (const m of missing) if (!vocab['missing-states']?.has(m)) error('SCHEMA-DECLARATION', `schema/tables/${name}.schema.json`, `field "${field.name}" allows "${m}", which is not in schema/vocab/missing-states.csv`);
      if (field.vocabulary && !vocab[field.vocabulary]) { error('SCHEMA-DECLARATION', `schema/tables/${name}.schema.json`, `field "${field.name}" names vocabulary "${field.vocabulary}", but schema/vocab/${field.vocabulary}.csv does not exist`); continue; }
      const seen = new Map();

      for (const rec of t.records) {
        const v = rec.values[field.name];
        const bad = (code, msg) => error(code, at(rec), `${label(rec)}${field.name} ${msg}`);
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
          if (dup.length) bad('SCHEMA-LIST', `lists ${[...new Set(dup)].join(', ')} more than once`);
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
      const seen = new Map();
      for (const rec of t.records) {
        const k = keys.map((f) => rec.values[f]).join('\u0000');
        if (seen.has(k)) error('SCHEMA-UNIQUE', at(rec), `${label(rec)}(${keys.join(', ')}) repeats line ${seen.get(k)}; the combination must be unique`);
        else seen.set(k, rec.line);
      }
    }

    if (formatting) {
      const canonical = csvText(t.header, t.records.map((r) => r.values));
      if (canonical !== t.text) error('SCHEMA-FORMAT', file, 'is not in canonical CSV format; run `npm run data:fmt`');
    }
  }

  if (manifest) issues.push(...checkManifest(dataDir, tables));
  return { issues, tables, schemas, vocab };
}

export function buildManifest(dataDir, tables) {
  const out = { note: 'Row count and SHA-256 of every data table. Written by `npm run data:fmt`; checked by `npm run data:check` and the build.', tables: {} };
  for (const name of Object.keys(tables).sort((a, b) => TABLE_ORDER.indexOf(a) - TABLE_ORDER.indexOf(b))) {
    const bytes = readFileSync(join(dataDir, 'tables', `${name}.csv`));
    out.tables[name] = { rows: tables[name].records.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  return out;
}

function checkManifest(dataDir, tables) {
  const path = join(dataDir, 'manifest.json');
  if (!existsSync(path)) return [{ level: 'error', code: 'SCHEMA-MANIFEST', where: 'data/manifest.json', message: 'missing; run `npm run data:fmt`' }];
  const stored = JSON.parse(readFileSync(path, 'utf8'));
  const fresh = buildManifest(dataDir, tables);
  const stale = Object.keys({ ...stored.tables, ...fresh.tables }).filter((k) => JSON.stringify(stored.tables[k]) !== JSON.stringify(fresh.tables[k]));
  return stale.length
    ? [{ level: 'error', code: 'SCHEMA-MANIFEST', where: 'data/manifest.json', message: `is stale for ${stale.join(', ')}; run \`npm run data:fmt\` and commit the manifest with the data` }]
    : [];
}
