#!/usr/bin/env node
// Generates the typed view of the data model from its one authority, schema/ (WP-06; 02 section 8).
//
//   npm run types:gen      write the three generated files
//   npm run types:check    regenerate into a temporary directory, fail if a committed file differs, then run tsc
//
// Reads schema/tables/*.schema.json (Frictionless-style: fields, types, constraints, references, missing words,
// uniqueKeys) and schema/vocab/*.csv. Writes:
//
//   packages/data/src/generated/columns.ts   table names, column lists, SQL names, per-column facts
//   packages/data/src/generated/rows.ts      vocabulary unions and one decoded row type per table
//   db/generated/schema.sql                  SQLite STRICT DDL (PRIMARY KEY, UNIQUE, FOREIGN KEY, CHECK)
//   packages/data/src/generated/db-shape.ts  runtime shapes of dist/db.json, from schema/db.schema.json (read only)
//
// Conventions (research/understand/datamodel.md sections 2 and 6):
//   - A column that declares missing words is stored as a pair: the value (NULL when a word stands in) and
//     <column>_state (the word). CHECK ((value IS NULL) = (state IS NOT NULL)) for a required column. In TypeScript the
//     pair is Cell<T, Word> = { value } | { missing }, so a word can never be read as a number or text.
//   - A column that declares no missing word is plain: NOT NULL when required, nullable (blank cell) when not.
//   - Raw text is kept as TEXT, byte for byte; nothing is normalised on the way in.
//   - A keyless table (primaryKey null) gets its uniqueKeys as UNIQUE constraints.
//   - A list column keeps its ';'-joined text (the exporter's convention); child tables come with WP-09.
//   - A polymorphic reference (several target tables) and the grade-owns-record rule are not foreign keys here.
//   - A pattern becomes GLOB where it can, exactly where possible. A GLOB that is weaker than the pattern says so in
//     the file header; the build's schema checker (build/src/schema.js) still enforces the full pattern.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, realpathSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './rulings-check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, '../..');

export const OUTPUTS = {
  columns: 'packages/data/src/generated/columns.ts',
  rows: 'packages/data/src/generated/rows.ts',
  sql: 'db/generated/schema.sql',
  dbShape: 'packages/data/src/generated/db-shape.ts',
};

// ---------------------------------------------------------------- reading

/** The schema file for every table, in file-name order. */
export function loadTables(root) {
  const dir = join(root, 'schema/tables');
  return readdirSync(dir).filter((f) => f.endsWith('.schema.json')).sort().map((f) => {
    const schema = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    return { name: f.replace(/\.schema\.json$/, ''), ...schema };
  });
}

/** Every vocabulary file: { stem: [values in file order] }. */
export function loadVocab(root) {
  const dir = join(root, 'schema/vocab');
  const vocab = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.csv')).sort()) {
    const rows = parseCsv(readFileSync(join(dir, f), 'utf8').replace(/^﻿/, '')).filter((r) => r.length && r[0] !== '');
    const [header, ...body] = rows;
    if (header?.[0] !== 'Value') throw new Error(`schema/vocab/${f}: first column must be "Value"`);
    vocab[f.replace(/\.csv$/, '')] = body.map((r) => r[0]);
  }
  return vocab;
}

// ---------------------------------------------------------------- names

/** The SQL name of a CSV column. Same rule as scripts/data/sqlite.mjs (a test keeps them equal). */
export function sqlName(header) {
  const name = String(header)
    .normalize('NFKD').replace(/\p{M}+/gu, '')
    .replace(/°\s*C/gi, ' c').replace(/±/g, ' pm').replace(/%/g, ' pct')
    .replace(/³/g, '3').replace(/²/g, '2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!name) throw new Error(`Column "${header}" has no SQL name`);
  return /^\d/.test(name) ? `c_${name}` : name;
}

const words = (stem) => stem.split(/[-_]/).filter(Boolean);
const pascal = (stem) => words(stem).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
const screaming = (stem) => words(stem).join('_').toUpperCase();
function singular(w) {
  if (/(ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
  if (/ies$/.test(w)) return `${w.slice(0, -3)}y`;
  if (/(us|ss)$/.test(w) || !w.endsWith('s')) return w;
  return w.slice(0, -1);
}
const vocabType = (stem) => { const w = words(stem); return pascal([...w.slice(0, -1), singular(w.at(-1))].join('-')); };
const ts = (s) => JSON.stringify(s);
const tsKey = (s) => (/^[A-Za-z_$][\w$]*$/.test(s) ? s : ts(s));
const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sqlId = (s) => `"${s.replace(/"/g, '""')}"`;
const isSoleKey = (pk, name) => pk.length === 1 && pk[0] === name;
const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- patterns -> GLOB

const GLOB_META = new Set(['*', '?', '[']);
const MAX_ALTERNATIVES = 64;

/**
 * Translate a schema pattern into GLOB alternatives. Supports the subset the schemas use: ^ $, literals, \d, \S, ., [..]
 * classes, groups, |, ?, +, * and {n} / {n,m}. Returns { globs, exact }, or null when the pattern is outside the subset
 * (the generator then fails loudly rather than skipping a constraint).
 */
export function patternToGlob(source) {
  if (!source.startsWith('^')) return null;
  const anchoredEnd = source.endsWith('$');
  const src = source.slice(1, anchoredEnd ? -1 : undefined);
  let i = 0;
  let exact = true;
  const product = (a, b) => {
    const out = a.flatMap((x) => b.map((y) => x + y));
    if (out.length > MAX_ALTERNATIVES) throw new RangeError('too many alternatives');
    return out;
  };

  function alternation() {
    const out = [...sequence()];
    while (src[i] === '|') { i++; out.push(...sequence()); }
    return out;
  }
  function sequence() {
    let acc = [''];
    while (i < src.length && src[i] !== '|' && src[i] !== ')') acc = product(acc, quantified(atom()));
    return acc;
  }
  function atom() {
    const c = src[i++];
    if (c === '(') {
      if (src.startsWith('?:', i)) i += 2;
      const inner = alternation();
      if (src[i++] !== ')') throw new SyntaxError('unclosed group');
      return inner;
    }
    if (c === '[') {
      const end = src.indexOf(']', i);
      if (end < 0) throw new SyntaxError('unclosed class');
      const body = src.slice(i, end);
      i = end + 1;
      return [`[${body}]`];
    }
    if (c === '.') return ['?'];
    if (c === '\\') {
      const e = src[i++];
      if (e === 'd') return ['[0-9]'];
      if (e === 'S') { exact = false; return ['[^ ]']; }
      if (/[A-Za-z0-9]/.test(e)) throw new SyntaxError(`unsupported escape \\${e}`);
      return [GLOB_META.has(e) ? `[${e}]` : e];
    }
    if ('*+?{}()|'.includes(c)) throw new SyntaxError(`unexpected ${c}`);
    return [GLOB_META.has(c) ? `[${c}]` : c];
  }
  function quantified(alts) {
    const q = src[i];
    const repeat = (min, max) => {
      const out = min === 0 ? [''] : [];
      let power = [''];
      for (let n = 1; n <= max; n++) {
        power = product(power, alts);
        if (n >= min) out.push(...power);
      }
      return out;
    };
    if (q === '?') { i++; return ['', ...alts]; }
    if (q === '+' || q === '*') {
      i++;
      if (alts.length === 1 && alts[0] === '?') return [q === '+' ? '?*' : '*'];
      exact = false;
      return q === '+' ? alts.map((a) => `${a}*`) : ['*'];
    }
    if (q === '{') {
      const m = /^\{(\d+)(,(\d*))?\}/.exec(src.slice(i));
      if (!m) throw new SyntaxError('unsupported quantifier');
      i += m[0].length;
      const min = Number(m[1]);
      if (m[2] === undefined) return repeat(min, min);
      if (m[3] === '') { exact = false; return repeat(min, min).map((x) => `${x}*`); }
      return repeat(min, Number(m[3]));
    }
    return alts;
  }

  try {
    const globs = [...new Set(alternation().map((g) => (anchoredEnd ? g : `${g}*`)))];
    if (i !== src.length) return null;
    return { globs, exact };
  } catch (e) {
    if (e instanceof SyntaxError || e instanceof RangeError) return null;
    throw e;
  }
}

// ---------------------------------------------------------------- ID types

/**
 * The template-literal type for an identifier pattern like ^M\d{3}$ (`M${number}`) or the grade ID's G\d{3}-... form
 * (`G${number}-${string}`). Distinct per prefix, so a MaterialID cannot be passed where a GradeID is wanted, and no
 * cast is needed to make one. Null for any other pattern.
 */
export function idTemplate(pattern) {
  const simple = /^\^([A-Za-z]+)\\d(?:\{\d+(?:,\d*)?\})\$$/.exec(pattern);
  if (simple) return `\`${simple[1]}\${number}\``;
  const grade = /^\^([A-Za-z]+)\\d\{\d+\}-\(/.exec(pattern);
  return grade ? `\`${grade[1]}\${number}-\${string}\`` : null;
}

const idAlias = (fieldName) => fieldName.replace(/ID$/, 'Id');

// ---------------------------------------------------------------- model

/**
 * Columns whose vocabulary holds a missing-state word as an ordinary value without declaring it in the field's "missing"
 * list, so the generated type lets the word be read as a value. These 12 exist in the schema today (type-design review,
 * WP-06 finding 1). Each needs the owner's choice: declare the word as missing (the column becomes a Cell) or confirm it
 * is a real value there. The generator refuses any NEW column of this kind; this list may only shrink.
 */
const VALUE_WORD_COLUMNS = new Set([
  'coverage.Status', 'headline_definitions.Direction', 'headline_definitions.Notch', 'measurements.Operator',
  'measurements.Normalized unit', 'measurements.Data status', 'measurements.Specimen type', 'measurements.Direction',
  'measurements.Notch', 'page_context.Direction', 'plausibility_windows.Normalized unit', 'properties.Units',
]);

/** Everything the three outputs need to know about one column, decided once. */
function describeField(table, field, vocab) {
  const missing = field.missing ?? [];
  const c = field.constraints ?? {};
  const vocabName = field.type === 'list' ? field.item?.vocabulary : field.vocabulary;
  if (vocabName && !vocab[vocabName]) throw new Error(`${table}.${field.name}: unknown vocabulary "${vocabName}"`);
  const withoutMissing = (values) => values.filter((v) => !missing.includes(v));
  // `enumValues` is the schema's own enum; `allowed` is what a CHECK may accept: that enum, else the vocabulary's values.
  const enumValues = c.enum === undefined ? null : withoutMissing(c.enum);
  const vocabAllowed = vocabName && field.type !== 'list' ? withoutMissing(vocab[vocabName]) : null;
  for (const word of missing) if (!vocab['missing-states'].includes(word)) throw new Error(`${table}.${field.name}: "${word}" is not a word of schema/vocab/missing-states.csv`);
  const allowedValues = c.enum ?? (vocabName && field.type !== 'list' ? vocab[vocabName] : (vocabName ? vocab[vocabName] : []));
  const leaks = allowedValues.filter((v) => vocab['missing-states'].includes(v) && !missing.includes(v));
  if (leaks.length && !VALUE_WORD_COLUMNS.has(`${table}.${field.name}`)) {
    throw new Error(`${table}.${field.name}: ${leaks.map(ts).join(', ')} is a missing-state word that this column accepts as an ordinary value. Declare it in the field's "missing" list so it becomes a Cell, or add the column to VALUE_WORD_COLUMNS with the owner's reason.`);
  }
  return {
    name: field.name,
    sql: sqlName(field.name),
    type: field.type,
    role: field.role ?? '',
    required: c.required === true,
    unique: c.unique === true,
    missing,
    vocabName: vocabName ?? null,
    vocabValues: vocabName ? vocab[vocabName] : [],
    enumValues,
    allowed: enumValues ?? vocabAllowed,
    pattern: c.pattern ?? null,
    minimum: c.minimum ?? null,
    maximum: c.maximum ?? null,
    reference: field.reference && !Array.isArray(field.reference) && field.type !== 'list' ? field.reference : null,
    polymorphic: Array.isArray(field.reference),
    paired: missing.length > 0,
    idTemplate: !field.reference && c.pattern && field.type === 'string' && /ID$/.test(field.name) ? idTemplate(c.pattern) : null,
  };
}

function buildModel(root) {
  const tables = loadTables(root);
  const vocab = loadVocab(root);
  const model = tables.map((t) => {
    const columns = t.fields.map((f) => describeField(t.name, f, vocab));
    const sqlNames = new Set();
    for (const col of columns) {
      for (const n of col.paired ? [col.sql, `${col.sql}_state`] : [col.sql]) {
        if (sqlNames.has(n)) throw new Error(`${t.name}: SQL name "${n}" is made by two columns`);
        sqlNames.add(n);
      }
    }
    const pk = t.primaryKey == null ? [] : [].concat(t.primaryKey);
    for (const k of pk) if (!columns.some((c) => c.name === k)) throw new Error(`${t.name}: primaryKey "${k}" is not a column`);
    const uniqueKeys = t.uniqueKeys ?? [];
    return { name: t.name, title: t.title, columns, pk, uniqueKeys };
  });
  const byName = new Map(model.map((t) => [t.name, t]));
  for (const t of model) {
    for (const col of t.columns) {
      if (!col.reference) continue;
      const parent = byName.get(col.reference.table);
      const target = parent?.columns.find((c) => c.name === col.reference.field);
      if (!target) throw new Error(`${t.name}.${col.name}: references unknown ${col.reference.table}.${col.reference.field}`);
      const isKey = isSoleKey(parent.pk, target.name) || target.unique
        || parent.uniqueKeys.some((k) => k.length === 1 && k[0] === target.name);
      if (!isKey) throw new Error(`${t.name}.${col.name}: ${parent.name}.${target.name} is not a primary or unique key, so SQLite cannot enforce the foreign key`);
    }
  }
  const aliases = new Map();
  for (const t of model) {
    for (const col of t.columns) {
      if (!col.idTemplate) continue;
      const alias = idAlias(col.name);
      if (aliases.has(alias) && aliases.get(alias) !== col.idTemplate) throw new Error(`${t.name}.${col.name}: ID type ${alias} is defined twice, differently`);
      aliases.set(alias, col.idTemplate);
    }
  }
  // A foreign key takes the ID type of the column it points to, however many references away that is.
  const aliasOf = (col) => {
    if (col.idTemplate) return idAlias(col.name);
    if (!col.reference) return null;
    return aliasOf(byName.get(col.reference.table).columns.find((c) => c.name === col.reference.field));
  };
  for (const t of model) {
    for (const col of t.columns) {
      col.idAlias = aliasOf(col);
    }
  }
  return { model, vocab, aliases };
}

// ---------------------------------------------------------------- columns.ts

const BANNER = 'GENERATED by `npm run types:gen` from schema/. Do not edit: `npm run types:check` fails when it is stale.';

function renderColumns({ model }) {
  const out = [`// ${BANNER}`, ''];
  out.push('export const TABLE_NAMES = [', ...model.map((t) => `  ${ts(t.name)},`), '] as const;');
  out.push('export type TableName = (typeof TABLE_NAMES)[number];', '');
  out.push('/** The columns of each table, in the schema\'s canonical order, under their CSV header names. */');
  out.push('export const TABLE_COLUMNS = {');
  for (const t of model) out.push(`  ${tsKey(t.name)}: [${t.columns.map((c) => ts(c.name)).join(', ')}],`);
  out.push('} as const;', '');
  out.push(
    'export type ColumnType = \'string\' | \'number\' | \'integer\' | \'boolean\' | \'date\' | \'list\';',
    '',
    '/** What the schema says about one column. `sqlName` is the column in db/generated/schema.sql; a column that declares missing words',
    ' *  also has `<sqlName>_state` there. */',
    'export interface ColumnInfo {',
    '  readonly name: string;',
    '  readonly sqlName: string;',
    '  readonly type: ColumnType;',
    '  readonly role: string;',
    '  readonly required: boolean;',
    '  readonly missing: readonly string[];',
    '}',
    '',
    'export interface TableInfo {',
    '  readonly primaryKey: readonly string[];',
    '  readonly uniqueKeys: readonly (readonly string[])[];',
    '  readonly columns: readonly ColumnInfo[];',
    '}',
    '',
    'export const TABLES = {');
  for (const t of model) {
    out.push(`  ${tsKey(t.name)}: {`);
    out.push(`    primaryKey: [${t.pk.map(ts).join(', ')}],`);
    out.push(`    uniqueKeys: [${t.uniqueKeys.map((k) => `[${k.map(ts).join(', ')}]`).join(', ')}],`);
    out.push('    columns: [');
    for (const c of t.columns) {
      out.push(`      { name: ${ts(c.name)}, sqlName: ${ts(c.sql)}, type: ${ts(c.type)}, role: ${ts(c.role)}, required: ${c.required}, missing: [${c.missing.map(ts).join(', ')}] },`);
    }
    out.push('    ],', '  },');
  }
  out.push('} as const satisfies Record<TableName, TableInfo>;', '');
  return out.join('\n');
}

// ---------------------------------------------------------------- rows.ts

function renderRows({ model, vocab, aliases }) {
  const typeNames = new Map();
  for (const stem of Object.keys(vocab)) {
    const name = vocabType(stem);
    if (typeNames.has(name)) throw new Error(`Vocabulary types "${stem}" and "${typeNames.get(name)}" are both named ${name}`);
    typeNames.set(name, stem);
  }
  const out = [`// ${BANNER}`, '', "import type { Cell } from '../cell.ts';", ''];

  out.push('// Vocabularies: one file in schema/vocab each, values in file order.');
  for (const [stem, values] of Object.entries(vocab)) {
    out.push(`export const ${screaming(stem)} = [${values.map(ts).join(', ')}] as const;`);
    out.push(`export type ${vocabType(stem)} = (typeof ${screaming(stem)})[number];`);
  }
  out.push('');

  out.push('// Identifiers: one type per kind of ID, so a MaterialID cannot stand where a GradeID is wanted.');
  for (const [alias, template] of aliases) out.push(`export type ${alias} = ${template};`);
  out.push('');

  out.push('/** Every table\'s row as the engine reads it: a cell that declares missing words is a Cell, a blank optional cell is null. */');
  for (const t of model) {
    out.push(`export interface ${pascal(t.name)}Row {`);
    for (const c of t.columns) out.push(`  readonly ${tsKey(c.name)}: ${fieldType(c)};`);
    out.push('}', '');
  }
  out.push('export interface Rows {', ...model.map((t) => `  readonly ${tsKey(t.name)}: ${pascal(t.name)}Row;`), '}', '');
  out.push('export type Row<T extends keyof Rows> = Rows[T];', '');
  return out.join('\n');
}

function fieldType(c) {
  let base;
  if (c.type === 'boolean') base = 'boolean';
  else if (c.type === 'number' || c.type === 'integer') base = 'number';
  else if (c.type === 'list') base = `readonly ${c.vocabName ? vocabType(c.vocabName) : 'string'}[]`;
  else if (c.idAlias) base = c.idAlias;
  else if (c.enumValues) base = c.enumValues.map(ts).join(' | ');
  else if (c.vocabName) {
    const overlap = c.missing.filter((w) => c.vocabValues.includes(w));
    base = overlap.length ? `Exclude<${vocabType(c.vocabName)}, ${overlap.map(ts).join(' | ')}>` : vocabType(c.vocabName);
  } else base = 'string';
  const value = c.paired ? `Cell<${base}, ${c.missing.map(ts).join(' | ')}>` : base;
  return c.required ? value : `${value} | null`;
}

// ---------------------------------------------------------------- schema.sql

const SQL_TYPE = { string: 'TEXT', date: 'TEXT', list: 'TEXT', number: 'REAL', integer: 'INTEGER', boolean: 'INTEGER' };

function globCheck(col, pattern, weaker) {
  const g = patternToGlob(pattern);
  if (!g) throw new Error(`Pattern ${pattern} (column ${col}) is outside the GLOB translator's subset`);
  if (!g.exact) weaker.push(pattern);
  return g.globs.map((x) => `${sqlId(col)} GLOB ${sqlStr(x)}`).join(' OR ');
}

function renderColumnSql(t, c, weaker) {
  const valueNotNull = c.required && !c.paired;
  const parts = [sqlId(c.sql), SQL_TYPE[c.type]];
  if (valueNotNull) parts.push('NOT NULL');
  const isPrimaryKey = isSoleKey(t.pk, c.name);
  if (isPrimaryKey) parts.push('PRIMARY KEY');
  if (c.unique && !isPrimaryKey) parts.push('UNIQUE');
  if (c.reference) parts.push(`REFERENCES ${sqlId(c.reference.table)} (${sqlId(sqlName(c.reference.field))})`);
  const checks = [];
  if (c.type === 'boolean') checks.push(`${sqlId(c.sql)} IN (0, 1)`);
  if (c.allowed) {
    if (!c.allowed.length) throw new Error(`${t.name}.${c.name}: nothing is allowed after the missing words are removed`);
    checks.push(`${sqlId(c.sql)} IN (${c.allowed.map(sqlStr).join(', ')})`);
  }
  if (c.pattern && c.type !== 'list') checks.push(`(${globCheck(c.sql, c.pattern, weaker)})`);
  if (c.minimum !== null) checks.push(`${sqlId(c.sql)} >= ${c.minimum}`);
  if (c.maximum !== null) checks.push(`${sqlId(c.sql)} <= ${c.maximum}`);
  // A NULL value passes its own CHECK; the pair CHECK below decides whether NULL is allowed.
  for (const check of checks) parts.push(`CHECK (${check})`);
  const lines = [parts.join(' ')];
  if (c.paired) lines.push(`${sqlId(`${c.sql}_state`)} TEXT CHECK (${sqlId(`${c.sql}_state`)} IN (${c.missing.map(sqlStr).join(', ')}))`);
  return lines;
}

function renderSql({ model }) {
  const weaker = [];
  const body = [];
  for (const t of model) {
    const lines = t.columns.flatMap((c) => renderColumnSql(t, c, weaker));
    const tableLevel = [];
    if (t.pk.length > 1) tableLevel.push(`PRIMARY KEY (${t.pk.map((k) => sqlId(sqlName(k))).join(', ')})`);
    for (const key of t.uniqueKeys) tableLevel.push(`UNIQUE (${key.map((k) => sqlId(sqlName(k))).join(', ')})`);
    const optionalPair = t.columns.find((x) => x.paired && !x.required);
    if (optionalPair) throw new Error(`${t.name}.${optionalPair.name}: an optional column with missing words has no pairing rule yet; make it required or extend the generator`);
    for (const c of t.columns.filter((x) => x.paired && x.required)) {
      tableLevel.push(`CHECK ((${sqlId(c.sql)} IS NULL) = (${sqlId(`${c.sql}_state`)} IS NOT NULL))`);
    }
    body.push(`-- ${oneLine(t.title)}`, `CREATE TABLE ${sqlId(t.name)} (`);
    body.push([...lines, ...tableLevel].map((l) => `  ${l}`).join(',\n'), ') STRICT;', '');
  }
  const head = [
    `-- ${BANNER}`,
    '-- SQLite STRICT tables. Load with PRAGMA foreign_keys = ON. Raw text is kept as TEXT; a column that declares missing words',
    '-- is a value plus <column>_state. A NULL value with no state is a blank optional cell.',
    '-- Not here yet (WP-09): _ord row-order columns, child tables for list columns, the grade-owns-record composite key.',
  ];
  const weak = [...new Set(weaker)];
  if (weak.length) head.push('-- GLOB cannot say these patterns exactly, so their CHECK is weaker (the build still checks the full pattern):', ...weak.map((p) => `--   ${p}`));
  return [...head, '', ...body].join('\n');
}

// ---------------------------------------------------------------- db-shape.ts

/** A $ref ("#/$defs/x" or any other JSON pointer) as an identifier. */
const refName = (ref) => ref.replace(/^#\/(\$defs\/)?/, '').replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));

/** JSON Schema node -> code for a Shape (packages/data/src/shape.ts). Keywords it does not use (pattern, minimum) are left to Ajv. */
function shapeCode(node, indent, refs) {
  const pad = '  '.repeat(indent);
  if (node === true || node === undefined || Object.keys(node).length === 0) return 'json';
  if (node.$ref) {
    refs.add(node.$ref);
    return `${refName(node.$ref)}Shape`;
  }
  if (node.const !== undefined) return `lit(${ts(node.const)})`;
  if (node.enum) {
    const nulls = node.enum.includes(null);
    const lits = node.enum.filter((v) => v !== null);
    const code = `lit(${lits.map(ts).join(', ')})`;
    return nulls ? `union(nul, ${code})` : code;
  }
  const variants = node.oneOf ?? node.anyOf;
  if (variants) {
    const parts = variants.map((v) => shapeCode(v, indent + 1, refs));
    return parts.length === 1 ? parts[0] : `union(\n${parts.map((x) => `${pad}  ${x}`).join(',\n')},\n${pad})`;
  }
  const type = node.type ?? (node.properties ? 'object' : undefined);
  if (Array.isArray(type)) {
    const parts = type.map((t) => shapeCode({ ...node, type: t }, indent + 1, refs));
    return `union(${parts.join(', ')})`;
  }
  switch (type) {
    case 'string': return 'str';
    case 'number': return 'num';
    case 'integer': return 'int';
    case 'boolean': return 'bool';
    case 'null': return 'nul';
    case 'array': return `arr(${shapeCode(node.items, indent, refs)})`;
    case 'object': {
      const props = Object.entries(node.properties ?? {});
      if (!props.length) return node.additionalProperties && node.additionalProperties !== true ? `record(${shapeCode(node.additionalProperties, indent, refs)})` : 'record(json)';
      const required = new Set(node.required ?? []);
      const field = ([k, v]) => `${pad}    ${tsKey(k)}: ${shapeCode(v, indent + 2, refs)},`;
      const block = (list) => (list.length ? `{\n${list.map(field).join('\n')}\n${pad}  }` : '{}');
      const open = node.additionalProperties === false ? '' : ', { open: true }';
      return `obj(${block(props.filter(([k]) => required.has(k)))}, ${block(props.filter(([k]) => !required.has(k)))}${open})`;
    }
    default: return 'json';
  }
}

function renderDbShape(root) {
  const schema = JSON.parse(readFileSync(join(root, 'schema/db.schema.json'), 'utf8'));
  const resolveRef = (ref) => ref.slice(2).split('/').reduce((n, k) => n?.[k], schema);
  const emitted = [];
  const done = new Set();
  const visiting = new Set();
  const emit = (name, node) => {
    if (done.has(name)) return;
    if (visiting.has(name)) throw new Error(`schema/db.schema.json: ${name} refers to itself`);
    visiting.add(name);
    const refs = new Set();
    const code = shapeCode(node, 0, refs);
    for (const ref of refs) emit(refName(ref), resolveRef(ref));
    visiting.delete(name);
    done.add(name);
    emitted.push(`export const ${name}Shape = ${code};`);
  };
  for (const [name, node] of Object.entries(schema.$defs ?? {})) emit(refName(name), node);

  const required = new Set(schema.required ?? []);
  const sections = Object.entries(schema.properties);
  for (const [key, node] of sections) emit(`${key}Section`, node);

  const top = (list) => `{\n${list.map(([k]) => `  ${tsKey(k)}: ${k}SectionShape,`).join('\n')}\n}`;
  const body = [
    `export const dbShape = obj(${top(sections.filter(([k]) => required.has(k)))}, ${top(sections.filter(([k]) => !required.has(k)))});`,
  ];
  return [
    `// ${BANNER}`,
    '// Source: schema/db.schema.json (the JSON Schema of dist/db.json, owned by main). Structure and primitive kinds only; the',
    "// build's Ajv pass still checks patterns and minimums.",
    '',
    "import { arr, bool, int, json, lit, nul, num, obj, record, str, union } from '../shape.ts';",
    '',
    ...emitted,
    '',
    ...body,
    '',
  ].join('\n');
}

// ---------------------------------------------------------------- driver

/** The three generated files for the schema under `root`: { relative path: text }. */
export function generate(root = REPO) {
  const built = buildModel(root);
  return {
    [OUTPUTS.columns]: renderColumns(built),
    [OUTPUTS.rows]: renderRows(built),
    [OUTPUTS.sql]: renderSql(built),
    [OUTPUTS.dbShape]: renderDbShape(root),
  };
}

function writeAll(files, base) {
  for (const [rel, text] of Object.entries(files)) {
    const path = join(base, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
}

/** Regenerate into a temporary directory and compare with the committed files. Returns the stale paths. */
export function staleFiles(root = REPO) {
  const tmp = mkdtempSync(join(tmpdir(), 'types-gen-'));
  try {
    const files = generate(root);
    writeAll(files, tmp);
    return Object.keys(files).filter((rel) => {
      const committed = join(root, rel);
      return !existsSync(committed) || readFileSync(committed, 'utf8') !== readFileSync(join(tmp, rel), 'utf8');
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  if (process.argv.includes('--check')) {
    const stale = staleFiles();
    if (stale.length) {
      console.error(`types:check: stale generated files (run \`npm run types:gen\` and commit):\n${stale.map((f) => `  ${f}`).join('\n')}`);
      process.exit(1);
    }
    console.log(`types:check: ${Object.keys(OUTPUTS).length} generated files are current`);
  } else {
    writeAll(generate(), REPO);
    console.log(`types:gen: wrote ${Object.values(OUTPUTS).join(', ')}`);
  }
}
