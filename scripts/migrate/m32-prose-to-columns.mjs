#!/usr/bin/env node
// Migration m32: two facts the build read out of prose become columns, and a dead duplicate column goes.
//
// - coverage.csv Manufacturer count. The validator took the count from a Grades finding's first words with
//   /^(\d+) distinct manufacturer\(s\)/, so the five findings written "1 distinct manufacturer" (m25 among them) were
//   never checked. The count is now a column, checked against the grades; the words are checked against the column.
// - prices.csv Quarantined. A listing was quarantined by starting its Regular price basis with "Quarantined".
// - materials.csv Original category equalled Family in all 103 rows and nothing read it.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';

export function migrate(t) {
  if (!t.header('coverage').includes('Manufacturer count')) {
    t.addColumn('coverage', 'Manufacturer count', { after: 'Status', fill: (r) => {
      const n = r.Domain === 'Grades' && r.Status !== 'Superseded' && /^(\d+) distinct manufacturer/.exec(r.Finding ?? '');
      return n ? n[1] : 'Not applicable';
    } });
  }
  if (!t.header('prices').includes('Quarantined')) {
    t.addColumn('prices', 'Quarantined', { after: 'Regular price basis', fill: (r) => (/^quarantined\b/i.test(r['Regular price basis'] ?? '') ? 'TRUE' : 'FALSE') });
  }
  if (t.header('materials').includes('Original category')) {
    const differ = t.rows('materials').filter((m) => m['Original category'] !== m.Family);
    if (differ.length) throw new Error(`m32: Original category differs from Family for ${differ.map((m) => m.MaterialID).join(', ')}; nothing dropped`);
    t.dropColumn('materials', 'Original category');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}`);
}
