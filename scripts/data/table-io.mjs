// The one API for changing data tables from a script: load, find, set, append, save.
//
//   import { openTables } from './scripts/data/table-io.mjs';
//   const db = openTables();
//   db.set('measurements', 'V000539', 'Normalized value', '4.3');
//   db.append('sources', { SourceID: 'X-NEW', ... });
//   db.save();          // writes canonical CSV, refreshes data/manifest.json, returns the change log
//
// Rows keep their file order; appends go to the end. Nothing is deleted: retire a record instead.
//
// A save is one change to several files, and it happens whole or is finished by whoever comes next (A04, the review of
// 2026-09-27). Written file by file, a save that stopped part-way left some tables new and the rest old, and a second
// script that had read the same tables could save over the first one's work without knowing it was there. So:
//
//   1. Recover. A save a previous process left part-way is finished first (recoverSave, below).
//   2. Lock. data/manifest.json, and every file this save replaces, must still be what openTables read (or what
//      stageFile saw). A second writer that saved in between moved the manifest; this save is refused, writing
//      nothing, rather than overwrite what that one wrote.
//   3. Stage. Every file the save writes (each changed table, the removed-records ledger, any file a caller staged with
//      it, and the new manifest) is written whole under data/.save/<token>/.
//   4. Commit. The journal, data/.save-journal.json, names each staged file, where it goes and its digest. It appears
//      whole or not at all (written aside, then linked into place, which fails while another save holds one), and from
//      that moment the new world is decided.
//   5. Promote. Each staged file is renamed over the one it replaces, the manifest last; then the journal goes.
//
// A rename replaces one file atomically, and nothing renames several at once, so a save can still stop between two of
// them. What the journal adds is that the stop is recoverable: the staged files were complete before the journal
// named them, so the next openTables (or data:fmt) finishes the renames and the world is the new one, whole. A save
// that stops before the journal leaves the old world untouched. A save with nothing to write writes nothing.

import { closeSync, constants, copyFileSync, existsSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, parseCsvText, csvText } from '../../build/src/csv.js';
import { loadSchemas, buildManifest, TABLE_ORDER } from '../../build/src/schema.js';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Where a save stages its files and writes its journal, relative to the root it saves. */
export const SAVE_JOURNAL = 'data/.save-journal.json';
export const SAVE_STAGING = 'data/.save';
const REMOVED = 'data/review/removed-records.csv';
const MANIFEST = 'data/manifest.json';
const tableFile = (name) => `data/tables/${name}.csv`;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** A file's digest, or null where there is no file: "absent" is a state the lock compares like any other. */
const digestOf = (path) => (existsSync(path) ? sha256(readFileSync(path)) : null);
const posix = (path) => path.split(sep).join('/');

export function openTables(root = projectRoot, { allowMissing = false } = {}) {
  recoverSave(root);
  const dataDir = join(root, 'data');
  const { tables: schemas } = loadSchemas(join(root, 'schema'));
  const tables = {};
  // What this api read, file by file: the pre-image a save must find still in place before it replaces anything.
  const base = new Map([[MANIFEST, digestOf(join(root, MANIFEST))], [REMOVED, digestOf(join(root, REMOVED))]]);
  for (const name of Object.keys(schemas)) {
    const path = join(root, tableFile(name));
    if (allowMissing && !existsSync(path)) { base.set(tableFile(name), null); continue; }
    const bytes = readFileSync(path);
    const { header, records } = parseCsvText(bytes.toString('utf8'), path);
    tables[name] = { header, rows: records.map((r) => r.values), dirty: false };
    base.set(tableFile(name), sha256(bytes));
  }
  const changes = [];
  const removals = [];
  const staged = new Map();
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
    /**
     * Edit one cell of the row with primary key `id`. Changing the primary key itself (a misspelled reference name,
     * m148) is the record leaving under one key and arriving under another: it needs `migration`, and writes the
     * ledger row the data diff reads (D72), naming the key it now has.
     */
    set(name, id, field, value, { expect, migration } = {}) {
      const t = table(name);
      if (!t.header.includes(field)) throw new Error(`${name}: no column "${field}"`);
      const row = api.get(name, id);
      const before = row[field];
      if (expect !== undefined && before !== expect) throw new Error(`${name} ${id} ${field}: expected "${expect}", found "${before}"; the data moved since this change was written`);
      const after = value == null || value === '' ? null : String(value).trim();
      if (before === after) return false;
      if (field === pkOf(name)) {
        if (!migration) throw new Error(`${name} ${id}: ${field} is the primary key; re-keying it needs { migration }, which writes its ledger row`);
        if (api.find(name, after)) throw new Error(`${name}: ${field} ${after} already exists`);
        removals.push({ Table: name, Record: before, Migration: migration, Where: `re-keyed: the same row is now ${after}` });
      }
      row[field] = after;
      t.dirty = true;
      changes.push({ table: name, record: id, action: 'Edited', field, before, after });
      return true;
    },
    /**
     * Edit the one row whose fields equal `match`, for a table without a primary key (headlines: MaterialID and
     * HeadlineKey, with Use). Refuses when no row or several match, and, as set does, when the value moved.
     *
     * A field of the table's first unique key is the row's identity, so re-pointing it (a printing citation that goes
     * with its profile to another material, m141) is the row leaving under one key and arriving under another. It
     * needs `migration`, and writes the ledger row the data diff reads (D72), naming the key it now has.
     */
    update(name, match, field, value, { expect, migration } = {}) {
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
      const key = !pkOf(name) && schemas[name].uniqueKeys?.[0];
      if (key?.includes(field)) {
        if (!migration) throw new Error(`${name} ${label}: ${field} is part of the row's key; re-pointing it needs { migration }, which writes its ledger row`);
        const keyOf = (r) => key.map((f) => r[f]).join(' | ');
        const from = keyOf(row);
        const to = keyOf({ ...row, [field]: after });
        removals.push({ Table: name, Record: from, Migration: migration, Where: `re-pointed: the same row is now ${to}` });
      }
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
    /**
     * Remove the one row whose fields equal `match`, for a table without a primary key (headlines), under the same
     * rule as remove: a ledger row names the migration and where it went. The ledger names the row as the data diff
     * does, by the table's first unique key ("M001 | hdt045 | V000008").
     */
    removeWhere(name, match, { migration, where } = {}) {
      const label = Object.values(match).join(' | ');
      if (!migration || !where) throw new Error(`${name} ${label}: removeWhere needs { migration, where }`);
      const t = table(name);
      const hits = t.rows.filter((r) => Object.entries(match).every(([k, v]) => r[k] === v));
      if (hits.length !== 1) throw new Error(`${name}: ${hits.length} rows match ${label}; removeWhere removes exactly one`);
      const [row] = hits;
      const record = (schemas[name].uniqueKeys?.[0] ?? t.header).map((f) => row[f]).join(' | ');
      t.rows.splice(t.rows.indexOf(row), 1);
      t.dirty = true;
      removals.push({ Table: name, Record: record, Migration: migration, Where: where });
      changes.push({ table: name, record, action: 'Removed', field: null, before: null, after: null });
    },
    /** Create a new table. Structural: add schema/tables/<name>.schema.json in the same change. */
    createTable(name, header, rows = []) {
      if (tables[name]) throw new Error(`Table "${name}" already exists`);
      tables[name] = { header: [...header], rows: rows.map((r) => Object.fromEntries(header.map((h) => [h, r[h] == null || r[h] === '' ? null : String(r[h]).trim()]))), dirty: true };
      if (!base.has(tableFile(name))) base.set(tableFile(name), digestOf(join(root, tableFile(name))));
      changes.push({ table: name, record: '(table)', action: 'Added', field: null, before: null, after: null });
    },
    /**
     * A file beside the tables that changes with them (the acceptance baseline and the import ledger an applied batch
     * writes), written by the next save in the same transaction, and refused with it if the file moves before then.
     * The path is absolute or relative to the root; a table, the manifest and the removed-records ledger are the
     * save's own and are not staged this way.
     */
    stageFile(path, text) {
      const rel = posix(relative(root, resolve(root, path)));
      if (rel === MANIFEST || rel === REMOVED || rel.startsWith('data/tables/')) throw new Error(`${rel} is written by save itself; change it through the table api`);
      const was = staged.get(rel);
      staged.set(rel, { text: String(text), base: was ? was.base : digestOf(resolve(root, rel)) });
    },
    /** Next free ID for a table. For grades pass the MaterialID; `study: true` gives the next -R# grade. */
    nextId(name, { materialId, study = false } = {}) {
      return nextId(name, table(name).rows.map((r) => r[pkOf(name)]), { materialId, study });
    },
    changes: () => [...changes],
    /**
     * Write every changed table, the ledger rows of what was removed, the files staged with them and a fresh manifest,
     * as one transaction (the protocol at the head of this file). Returns the change log. `failAfter` (stop after that
     * many renames) and `failBeforeCommit` exist for the tests that interrupt a save; nothing else passes them.
     */
    save({ failAfter, failBeforeCommit = false } = {}) {
      recoverSave(root);
      const dirty = Object.keys(tables).filter((n) => tables[n].dirty);
      if (!dirty.length && !removals.length && !staged.size) return api.changes();
      const replaced = [MANIFEST, ...dirty.map(tableFile), ...(removals.length ? [REMOVED] : []), ...staged.keys()];
      const expected = (rel) => (staged.has(rel) ? staged.get(rel).base : base.get(rel) ?? null);
      const moved = (ours = new Map()) => replaced.filter((rel) => ![expected(rel), ours.get(rel)].includes(digestOf(resolve(root, rel))));
      const refuse = (files) => new Error(`${files.join(', ')} changed since these tables were opened: another writer saved in between. `
        + 'Nothing was written; open the tables again and re-run the change on what is there now.');
      const before = moved();
      if (before.length) throw refuse(before);

      const token = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}-${randomBytes(3).toString('hex')}`;
      const stageRel = `${SAVE_STAGING}/${token}`;
      const stageDir = join(root, stageRel);
      const files = [];
      const put = (stagedRel, to, text) => {
        writeDurably(join(root, stagedRel), text);
        files.push({ staged: stagedRel, to, sha256: sha256(Buffer.from(text, 'utf8')) });
      };
      try {
        if (removals.length) {
          const header = ['Table', 'Record', 'Migration', 'Where'];
          const path = join(root, REMOVED);
          const existing = existsSync(path) ? readCsv(path).records.map((r) => r.values) : [];
          put(`${stageRel}/review/removed-records.csv`, REMOVED, csvText(header, [...existing, ...removals]));
        }
        [...staged].forEach(([rel, { text }], i) => put(`${stageRel}/files/${i}`, rel, text));
        const texts = Object.fromEntries(dirty.map((n) => [n, csvText(tables[n].header, tables[n].rows)]));
        for (const n of dirty) put(`${stageRel}/tables/${n}.csv`, tableFile(n), texts[n]);
        // The manifest of the world after the save: a changed table as staged, the rest as they stand. It is built by
        // the one function data:fmt and the gate use, so a save and a format agree to the byte. A table can exist
        // without a schema only mid-migration; every committed table has one.
        const fresh = buildManifest(stageDir, Object.fromEntries(dirty.map((n) => [n, parseCsvText(texts[n], tableFile(n))])));
        const kept = buildManifest(dataDir, Object.fromEntries(Object.keys(tables).filter((n) => !tables[n].dirty).map((n) => [n, readCsv(join(root, tableFile(n)))])));
        const order = Object.keys(tables).sort((a, b) => TABLE_ORDER.indexOf(a) - TABLE_ORDER.indexOf(b));
        const manifest = { ...fresh, tables: Object.fromEntries(order.map((n) => [n, fresh.tables[n] ?? kept.tables[n]])) };
        put(`${stageRel}/manifest.json`, MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
        if (failBeforeCommit) throw new Error('save interrupted before its journal was written (test hook)');
      } catch (e) {
        if (!failBeforeCommit) removeStaging(root, token);
        throw e;
      }

      const journal = { note: 'A save of the data tables in progress (scripts/data/table-io.mjs). The next openTables or npm run data:fmt completes it.', token, files };
      commit(root, journal);
      // The lock again, now that this save holds the journal: a writer that promoted between the first look and the
      // commit is caught here, before anything is renamed. A file already this save's own was renamed by a process that
      // found the journal and finished it, which is this save going ahead.
      const after = moved(new Map(files.map((f) => [f.to, f.sha256])));
      if (after.length) { release(root, token); removeStaging(root, token); throw refuse(after); }
      promote(root, journal, { failAfter });

      // This api now stands on what it wrote, and may save again.
      for (const f of files) base.set(f.to, f.sha256);
      for (const n of Object.keys(tables)) tables[n].dirty = false;
      removals.length = 0;
      staged.clear();
      return api.changes();
    },
  };
  return api;
}

/** Write a file and flush it to disk before returning: a staged file is complete before any journal names it. */
function writeDurably(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const fd = openSync(path, 'w');
  try { writeFileSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
}

/**
 * Take the journal: written aside and linked into place, so it appears whole, and only while no other save holds one.
 * A journal already there is a save in progress or one that stopped; it is finished first, and since every save
 * writes the manifest, this one's lock then fails and it is refused rather than written over that one.
 */
function commit(root, journal) {
  const path = join(root, SAVE_JOURNAL);
  const aside = `${path}.${journal.token}`;
  writeDurably(aside, JSON.stringify(journal, null, 2) + '\n');
  // A file system without hard links still refuses a second journal, though a reader could then see one half-written.
  const take = () => { try { linkSync(aside, path); } catch (e) { if (!['EPERM', 'ENOTSUP', 'ENOSYS'].includes(e.code)) throw e; copyFileSync(aside, path, constants.COPYFILE_EXCL); } };
  try {
    for (let attempt = 0; ; attempt++) {
      try { take(); return; } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        if (attempt > 0) throw new Error(`${SAVE_JOURNAL} is held by another save; nothing was written`);
        recoverSave(root);
      }
    }
  } finally {
    rmSync(aside, { force: true });
  }
}

/** Remove the journal if it is still this save's. */
function release(root, token) {
  const path = join(root, SAVE_JOURNAL);
  try { if (JSON.parse(readFileSync(path, 'utf8')).token === token) unlinkSync(path); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}

function removeStaging(root, token) {
  rmSync(join(root, SAVE_STAGING, token), { recursive: true, force: true });
  try { rmdirSync(join(root, SAVE_STAGING)); } catch { /* another save's folder is still there, or none was made */ }
}

/** Replace `to` with `from`: a rename, or where the two are on different volumes a copy renamed into place. */
function move(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  try { renameSync(from, to); } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    const near = `${to}.${process.pid}.moving`;
    copyFileSync(from, near);
    renameSync(near, to);
    unlinkSync(from);
  }
}

/**
 * Rename every staged file the journal names over its destination, then drop the journal. A file already renamed is
 * found in place by its digest and passed over, so finishing a promotion twice, or two processes finishing it at once,
 * ends in the same world. A staged file or a destination that is neither what the journal recorded stops the recovery
 * and names it: that is a world someone changed by hand in the middle of a save, and guessing would be worse.
 */
function promote(root, journal, { failAfter } = {}) {
  journal.files.forEach((f, i) => {
    if (failAfter === i) throw new Error(`save interrupted after ${i} of ${journal.files.length} renames (test hook)`);
    const from = resolve(root, f.staged), to = resolve(root, f.to);
    if (existsSync(from)) {
      if (digestOf(from) !== f.sha256) throw new Error(`${f.staged} is not the file ${SAVE_JOURNAL} recorded; the interrupted save cannot be finished`);
      move(from, to);
    } else if (digestOf(to) !== f.sha256) {
      throw new Error(`${SAVE_JOURNAL} names ${f.to}, and neither its staged copy nor the file itself is the one it recorded; the interrupted save cannot be finished`);
    }
  });
  if (failAfter === journal.files.length) throw new Error(`save interrupted after all ${journal.files.length} renames, before its journal was removed (test hook)`);
  release(root, journal.token);
  removeStaging(root, journal.token);
}

/**
 * Finish a save that stopped after its journal was written: the new world, whole. Returns the journal it finished, or
 * null. Without a journal, a staging folder more than an hour old is a save that never committed, and is removed.
 */
export function recoverSave(root = projectRoot) {
  const path = join(root, SAVE_JOURNAL);
  if (!existsSync(path)) {
    const dir = join(root, SAVE_STAGING);
    if (existsSync(dir)) {
      for (const token of readdirSync(dir)) {
        if (Date.now() - statSync(join(dir, token)).mtimeMs > 3600e3) removeStaging(root, token);
      }
    }
    return null;
  }
  let journal;
  try { journal = JSON.parse(readFileSync(path, 'utf8')); } catch (e) {
    throw new Error(`${SAVE_JOURNAL} cannot be read (${e.message}); it is linked into place whole, so this is damage, not an interrupted save`);
  }
  promote(root, journal);
  return journal;
}

const ID_FORMATS = {
  materials: { prefix: 'M', width: 3 },
  profiles: { prefix: 'P', width: 4 },
  measurements: { prefix: 'V', width: 6 },
  evidence: { prefix: 'Q', width: 5 },
  prices: { prefix: 'CA', width: 4 },
  coverage: { prefix: 'C', width: 5 },
  polymer_environment: { prefix: 'PB', width: 5 },
  print_guide: { prefix: 'PG', width: 3 },
  page_context: { prefix: 'PC', width: 5 },
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
