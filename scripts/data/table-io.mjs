// The one API for changing data tables from a script: load, find, set, append, save.
//
//   import { openTables } from './scripts/data/table-io.mjs';
//   const db = openTables();
//   db.set('measurements', 'V000539', 'Normalized value', '4.3');
//   db.append('sources', { SourceID: 'X-NEW', ... });
//   db.save();          // writes canonical CSV, refreshes data/manifest.json, returns the change log
//
// Rows keep their file order; appends go to the end. Nothing is deleted: retire a record instead.

import { writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, writeCsv, csvText } from '../../build/src/csv.js';
import { loadSchemas, buildManifest } from '../../build/src/schema.js';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function openTables(root = projectRoot, { allowMissing = false } = {}) {
  const dataDir = join(root, 'data');
  const { tables: schemas } = loadSchemas(join(root, 'schema'));
  const tables = {};
  for (const name of Object.keys(schemas)) {
    const path = join(dataDir, 'tables', `${name}.csv`);
    if (allowMissing && !existsSync(path)) continue;
    const { header, records } = readCsv(path);
    tables[name] = { header, rows: records.map((r) => r.values), dirty: false };
  }
  const changes = [];
  const removals = [];
  const pkOf = (name) => schemas[name].primaryKey;
  const table = (name) => {
    if (!tables[name]) throw new Error(`No table "${name}"; tables: ${Object.keys(tables).join(', ')}`);
    return tables[name];
  };

  const api = {
    schemas,
    tables: () => Object.keys(tables),
    header: (name) => [...table(name).header],
    rows: (name) => table(name).rows,
    find(name, id) {
      return table(name).rows.find((r) => r[pkOf(name)] === id) ?? null;
    },
    get(name, id) {
      const row = api.find(name, id);
      if (!row) throw new Error(`${name}: no row with ${pkOf(name)} ${id}`);
      return row;
    },
    set(name, id, field, value, { expect } = {}) {
      const t = table(name);
      if (!t.header.includes(field)) throw new Error(`${name}: no column "${field}"`);
      const row = api.get(name, id);
      const before = row[field];
      if (expect !== undefined && before !== expect) throw new Error(`${name} ${id} ${field}: expected "${expect}", found "${before}"; the data moved since this change was written`);
      const after = value == null || value === '' ? null : String(value).trim();
      if (before === after) return false;
      row[field] = after;
      t.dirty = true;
      changes.push({ table: name, record: id, action: 'Edited', field, before, after });
      return true;
    },
    /**
     * Edit the one row whose fields equal `match`, for a table without a primary key (headlines: MaterialID and
     * HeadlineKey, with Use). Refuses when no row or several match, and, as set does, when the value moved.
     */
    update(name, match, field, value, { expect } = {}) {
      const t = table(name);
      if (!t.header.includes(field)) throw new Error(`${name}: no column "${field}"`);
      const rows = t.rows.filter((r) => Object.entries(match).every(([k, v]) => r[k] === v));
      const label = Object.values(match).join(' | ');
      if (rows.length !== 1) throw new Error(`${name}: ${rows.length} rows match ${label}; update edits exactly one`);
      const [row] = rows;
      const before = row[field];
      if (expect !== undefined && before !== expect) throw new Error(`${name} ${label} ${field}: expected "${expect}", found "${before}"; the data moved since this change was written`);
      const after = value == null || value === '' ? null : String(value).trim();
      if (before === after) return false;
      row[field] = after;
      t.dirty = true;
      changes.push({ table: name, record: label, action: 'Edited', field, before, after });
      return true;
    },
    append(name, row) {
      const t = table(name);
      const unknown = Object.keys(row).filter((k) => !t.header.includes(k));
      if (unknown.length) throw new Error(`${name}: unknown columns ${unknown.join(', ')}`);
      const id = row[pkOf(name)];
      if (id != null && api.find(name, id)) throw new Error(`${name}: ${pkOf(name)} ${id} already exists`);
      const clean = Object.fromEntries(t.header.map((h) => [h, row[h] == null || row[h] === '' ? null : String(row[h]).trim()]));
      t.rows.push(clean);
      t.dirty = true;
      changes.push({ table: name, record: id, action: 'Added', field: null, before: null, after: null });
      return clean;
    },
    /** Add a column after `after` (or at the end), filling each row with fill(row). Structural: update the schema too. */
    addColumn(name, column, { after = null, fill = () => null } = {}) {
      const t = table(name);
      if (t.header.includes(column)) throw new Error(`${name}: column "${column}" already exists`);
      const at = after == null ? t.header.length : t.header.indexOf(after) + 1;
      if (after != null && at === 0) throw new Error(`${name}: no column "${after}"`);
      t.header.splice(at, 0, column);
      for (const r of t.rows) {
        const v = fill(r);
        r[column] = v == null || v === '' ? null : String(v).trim();
      }
      t.dirty = true;
      changes.push({ table: name, record: '(column)', action: 'Added', field: column, before: null, after: null });
    },
    /** Remove a column. Only for a migration that moved its content elsewhere; data is never dropped silently. */
    dropColumn(name, column) {
      const t = table(name);
      if (!t.header.includes(column)) throw new Error(`${name}: no column "${column}"`);
      t.header = t.header.filter((h) => h !== column);
      for (const r of t.rows) delete r[column];
      t.dirty = true;
      changes.push({ table: name, record: '(column)', action: 'Removed', field: column, before: null, after: null });
    },
    /**
     * Remove a record, which is allowed only where the build derives it instead (D72). Both `migration` and `where`
     * are required and go to data/review/removed-records.csv, because a record may leave only with a written account
     * of where it went; the pre-commit hook and CI read that ledger and refuse every removal it does not name.
     */
    remove(name, id, { migration, where } = {}) {
      if (!migration || !where) throw new Error(`${name} ${id}: remove needs { migration, where }; a record leaves only with a ledger row saying which migration moved it and where it went`);
      const t = table(name);
      const i = t.rows.findIndex((r) => r[pkOf(name)] === id);
      if (i < 0) throw new Error(`${name}: no row with ${pkOf(name)} ${id}`);
      t.rows.splice(i, 1);
      t.dirty = true;
      removals.push({ Table: name, Record: id, Migration: migration, Where: where });
      changes.push({ table: name, record: id, action: 'Removed', field: null, before: null, after: null });
    },
    /** Create a new table. Structural: add schema/tables/<name>.schema.json in the same change. */
    createTable(name, header, rows = []) {
      if (tables[name]) throw new Error(`Table "${name}" already exists`);
      tables[name] = { header: [...header], rows: rows.map((r) => Object.fromEntries(header.map((h) => [h, r[h] == null || r[h] === '' ? null : String(r[h]).trim()]))), dirty: true };
      changes.push({ table: name, record: '(table)', action: 'Added', field: null, before: null, after: null });
    },
    /** Next free ID for a table. For grades pass the MaterialID; `study: true` gives the next -R# grade. */
    nextId(name, { materialId, study = false } = {}) {
      return nextId(name, table(name).rows.map((r) => r[pkOf(name)]), { materialId, study });
    },
    changes: () => [...changes],
    save() {
      if (removals.length) {
        const path = join(root, 'data/review/removed-records.csv');
        const header = ['Table', 'Record', 'Migration', 'Where'];
        const existing = existsSync(path) ? readCsv(path).records.map((r) => r.values) : [];
        writeFileSync(path, csvText(header, [...existing, ...removals]));
      }
      for (const [name, t] of Object.entries(tables)) {
        if (t.dirty) writeCsv(join(dataDir, 'tables', `${name}.csv`), t.header, t.rows);
        t.dirty = false;
      }
      const parsed = Object.fromEntries(Object.keys(tables).map((n) => [n, readCsv(join(dataDir, 'tables', `${n}.csv`))]));
      // A table can exist without a schema only mid-migration; every committed table has one.
      writeFileSync(join(dataDir, 'manifest.json'), JSON.stringify(buildManifest(dataDir, parsed), null, 2) + '\n');
      return api.changes();
    },
  };
  return api;
}

const ID_FORMATS = {
  materials: { prefix: 'M', width: 3 },
  profiles: { prefix: 'P', width: 4 },
  measurements: { prefix: 'V', width: 6 },
  evidence: { prefix: 'Q', width: 5 },
  prices: { prefix: 'CA', width: 4 },
  coverage: { prefix: 'C', width: 5 },
  polymer_environment: { prefix: 'PB', width: 5 },
};

export function nextId(name, ids, { materialId, study = false } = {}) {
  if (name === 'grades') {
    if (!/^M\d{3}$/.test(materialId ?? '')) throw new Error('grades: pass the MaterialID (e.g. M020) to get its next GradeID');
    const base = `G${materialId.slice(1)}-`;
    const re = study ? /^G\d{3}-R(\d+)$/ : /^G\d{3}-(\d{2,3})$/;
    const n = Math.max(0, ...ids.filter((id) => id.startsWith(base)).map((id) => Number(re.exec(id)?.[1] ?? 0))) + 1;
    // Two digits to 99, three from 100: a generic material collects one grade per manufacturer.
    return study ? `${base}R${n}` : `${base}${String(n).padStart(2, '0')}`;
  }
  const f = ID_FORMATS[name];
  if (!f) throw new Error(`${name}: IDs are chosen by hand (no numeric sequence)`);
  const re = new RegExp(`^${f.prefix}(\\d{${f.width}})$`);
  const n = Math.max(0, ...ids.map((id) => Number(re.exec(id)?.[1] ?? 0))) + 1;
  return `${f.prefix}${String(n).padStart(f.width, '0')}`;
}
