#!/usr/bin/env node
// Migration m49: "Standard / load" is the source's own words and holds 301 spellings in this snapshot for a few
// dozen tests: "ISO 527, GB/T 1040", "ISO527,GB/T1040", "ISO 527-2/50", "ISO 527 (testing speed 5 mm/min)",
// "D 638". Nothing could be asked of it — which Charpy results are comparable, how many products test to ASTM
// rather than ISO — and the only typed thing ever read out of it was the HDT load (D49).
//
// Standards is the typed list beside it: the standards a row names, at family level, in one spelling each, checked
// against normalize/standards.js on every build (PARSE-MISMATCH). It is a list because a sheet naming "ISO 527,
// GB/T 1040" tested to both, and saying so is not a list stuffed in a cell: each item is a vocabulary value the
// schema checks, as properties.csv Units already are.
//
// 2,307 of 2,645 rows name at least one standard. The rest name none, and the column says so rather than guessing:
// 76 are Not published; 42 are a fatigue study's own staircase method; about 80 are a melt-flow or water-absorption
// condition the sheet prints where a standard would go ("210 °C, 2.16 kg"), which is what that sheet publishes.
//
// About 90 rows carry a fragment of the neighbouring column instead, from the original extraction: "Modulus",
// "Transition Temperature", "ter Absorption Rate 25 °C, 55% RH". Those are a transcription defect, and the fix is
// to re-read each source (D35), not to guess here; they read as no standard, exactly as they should, and the
// backlog is named in docs/audits/2026-09-17-model-freeze/README.md.
//
// npm run build:diff: measurements[].standards added on every row.
import { fileURLToPath } from 'node:url';
import { readStandards } from '../../build/src/normalize/standards.js';
import { openTables, projectRoot } from '../data/table-io.mjs';

export function migrate(t) {
  if (t.header('measurements').includes('Standards')) return;
  t.addColumn('measurements', 'Standards', {
    after: 'Standard / load',
    fill: (r) => readStandards(r['Standard / load']).join('; ') || 'Not published',
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}`);
  const rows = t.rows('measurements');
  const named = rows.filter((r) => r.Standards !== 'Not published').length;
  console.log(`${named} of ${rows.length} measurements name a standard; ${rows.length - named} name none.`);
}
