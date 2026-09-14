// The one API for changing data tables from a script: load, find, set, append, save.
//
//   import { openTables } from './scripts/data/table-io.mjs';
//   const db = openTables();
//   db.set('measurements', 'V000539', 'Normalized value', '4.3');
//   db.append('sources', { SourceID: 'X-NEW', ... });
//   db.save();          // writes canonical CSV, refreshes data/manifest.json, returns the change log
//
// Rows keep their file order; appends go to the end. Nothing is deleted: retire a record instead.

import { writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, writeCsv } from '../../build/src/csv.js';
import { loadSchemas, buildManifest } from '../../build/src/schema.js';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function openTables(root = projectRoot) {
  const dataDir = join(root, 'data');
  const { tables: schemas } = loadSchemas(join(root, 'schema'));
  const tables = {};
  for (const name of Object.keys(schemas)) {
    const { header, records } = readCsv(join(dataDir, 'tables', `${name}.csv`));
    tables[name] = { header, rows: records.map((r) => r.values), dirty: false };
  }
  const changes = [];
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
    /** Next free ID for a table. For grades pass the MaterialID; `study: true` gives the next -R# grade. */
    nextId(name, { materialId, study = false } = {}) {
      return nextId(name, table(name).rows.map((r) => r[pkOf(name)]), { materialId, study });
    },
    changes: () => [...changes],
    save() {
      for (const [name, t] of Object.entries(tables)) {
        if (t.dirty) writeCsv(join(dataDir, 'tables', `${name}.csv`), t.header, t.rows);
        t.dirty = false;
      }
      const parsed = Object.fromEntries(Object.keys(tables).map((n) => [n, readCsv(join(dataDir, 'tables', `${n}.csv`))]));
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
};

export function nextId(name, ids, { materialId, study = false } = {}) {
  if (name === 'grades') {
    if (!/^M\d{3}$/.test(materialId ?? '')) throw new Error('grades: pass the MaterialID (e.g. M020) to get its next GradeID');
    const base = `G${materialId.slice(1)}-`;
    const re = study ? /^G\d{3}-R(\d+)$/ : /^G\d{3}-(\d{2})$/;
    const n = Math.max(0, ...ids.filter((id) => id.startsWith(base)).map((id) => Number(re.exec(id)?.[1] ?? 0))) + 1;
    return study ? `${base}R${n}` : `${base}${String(n).padStart(2, '0')}`;
  }
  const f = ID_FORMATS[name];
  if (!f) throw new Error(`${name}: IDs are chosen by hand (no numeric sequence)`);
  const re = new RegExp(`^${f.prefix}(\\d{${f.width}})$`);
  const n = Math.max(0, ...ids.map((id) => Number(re.exec(id)?.[1] ?? 0))) + 1;
  return `${f.prefix}${String(n).padStart(f.width, '0')}`;
}
