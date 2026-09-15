// Record-level comparison of two versions of the data tables, matched by primary key.
import { parseCsvText } from '../../build/src/csv.js';

export function rowsOf(text) {
  if (text == null) return { header: [], rows: [] };
  const { header, records } = parseCsvText(text);
  return { header, rows: records.map((r) => r.values) };
}

/**
 * readVersion(side, table) returns the CSV text of a table on side 'from' or 'to' (null if absent).
 * Returns [{ table, record, action: Added | Removed | Edited, field, before, after }].
 */
export function diffTables(schemas, readVersion) {
  const log = [];
  for (const [name, schema] of Object.entries(schemas)) {
    const a = rowsOf(readVersion('from', name)), b = rowsOf(readVersion('to', name));
    // A link table has no single key; its first unique key identifies a row. A table may also declare an identity
    // (headlines: MaterialID, HeadlineKey, Use): a row that is alone with its identity on both sides is the same record
    // with an edited field, so replacing a headline's value measurement is an edit, not a deletion and an addition.
    const uniqueOf = (r) => (schema.uniqueKeys?.[0] ?? a.header).map((f) => r[f]).join(' | ');
    const identityOf = (r) => schema.identity.map((f) => r[f]).join(' | ');
    const counts = (rows) => { const c = new Map(); for (const r of rows) c.set(identityOf(r), (c.get(identityOf(r)) ?? 0) + 1); return c; };
    const [ca, cb] = schema.identity && !schema.primaryKey ? [counts(a.rows), counts(b.rows)] : [];
    const keyOf = schema.primaryKey ? (r) => r[schema.primaryKey]
      : ca ? (r) => (ca.get(identityOf(r)) === 1 && cb.get(identityOf(r)) === 1 ? identityOf(r) : uniqueOf(r))
      : uniqueOf;
    if (a.header.length && b.header.length) {
      for (const h of b.header.filter((h) => !a.header.includes(h))) log.push({ table: name, record: '(column)', action: 'Added', field: h, before: null, after: null });
      for (const h of a.header.filter((h) => !b.header.includes(h))) log.push({ table: name, record: '(column)', action: 'Removed', field: h, before: null, after: null });
    }
    const before = new Map(a.rows.map((r) => [keyOf(r), r]));
    const after = new Map(b.rows.map((r) => [keyOf(r), r]));
    for (const [id, r] of after) {
      const old = before.get(id);
      if (!old) { log.push({ table: name, record: id, action: 'Added', field: null, before: null, after: null }); continue; }
      for (const h of b.header) {
        if (a.header.includes(h) && (old[h] ?? null) !== (r[h] ?? null)) log.push({ table: name, record: id, action: 'Edited', field: h, before: old[h], after: r[h] });
      }
    }
    for (const id of before.keys()) if (!after.has(id)) log.push({ table: name, record: id, action: 'Removed', field: null, before: null, after: null });
  }
  return log;
}
