#!/usr/bin/env node
// Migration m18: classes that let the data lint tell deliberate records from defects (B4, 2026-09-14).
//
// - sources.csv gains "Citation role" (schema/vocab/citation-roles.csv). A source is cited by default; one kept to
//   corroborate, to register scope or ownership, as provenance, or recorded as not retrieved says so, and the lint
//   stops asking why nothing cites it (13 sources).
// - coverage gains the status "Superseded": an earlier finding a later row for the same material and domain
//   replaces, kept as an audit trail and left out of the views and the coverage checks. The five exact copies and
//   eight findings a later, more specific row restates are superseded.
// - C01173 said Flashforge ASA-GF10's swapped flexural rows were not entered; m16 entered them with the swap noted.
// - Two locators m16 wrote with a doubled space.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { writeCsv } from '../../build/src/csv.js';

export const ROLES = [
  ['cited', 'Records cite it; nothing else is needed.'],
  ['corroboration', 'Consulted to confirm or explain records that cite another source; no value is transcribed from it.'],
  ['register', 'Records scope, ownership, availability or prices in a catalogue rather than property values.'],
  ['provenance', 'Where earlier records came from; kept as history.'],
  ['not-retrieved', 'Could not be retrieved; nothing was entered from it.'],
];

export const SOURCE_ROLES = {
  'B-GUIDE': 'corroboration', 'R-BAMBU-GUIDE-202609': 'corroboration', 'D-PRUSA': 'corroboration', 'R-POLYMAKER-WIKI-HTPLAGF': 'corroboration',
  'R-STRATASYS-ULTEM9085': 'corroboration', 'R-MDPI-FATIGUE': 'corroboration', 'R-BASF-PCGF30-PRODUCT': 'corroboration',
  'R-BAMBU-CA-CATALOG-20260913': 'register', 'R-AIRTECH-KIMYA-PORTFOLIO': 'register', 'R-AIRTECH-KIMYA-ACQUISITION': 'register',
  'LOCAL-XLSM': 'provenance',
  'R-POLYMAKER-COPE-TDS-V5-4': 'not-retrieved', 'R-FIBERON-PETGF15-PAGE': 'not-retrieved',
};

/** Superseded row -> [expected status, the row that replaces it]. */
export const SUPERSEDED = {
  C01132: ['Not applicable', 'C00495'], C01153: ['Not applicable', 'C00527'], C01157: ['Not applicable', 'C00666'],
  C01158: ['Not applicable', 'C00676'], C01159: ['Not applicable', 'C00686'],
  C00009: ['Gap', 'C01113'], C00012: ['Resolved', 'C01114'], C00034: ['Resolved', 'C01111'], C00827: ['Gap', 'C01112'],
  C00831: ['Gap', 'C01116'], C00959: ['Evidence recorded', 'C01135'], C00694: ['Evidence recorded', 'C01187'], C00402: ['Limited comparability', 'C01173'],
};

const C01173 = ['Spectrum ASA-X GF10 mechanical and HDT values are injection moulded (TDS footnote); IPCON and Flashforge values are printed. Flashforge labels its flexural rows the wrong way round; not entered.',
  'Spectrum ASA-X GF10 mechanical, impact and HDT values are injection moulded (TDS footnote); IPCON and Flashforge values are printed. Flashforge labels its flexural rows the wrong way round; they are entered by value, with the swap noted (m16), and its X-Z results carry no direction.'];

const NA = 'Not applicable';
const insertVocab = (path, value, meaning) => {
  const lines = readFileSync(path, 'utf8').trimEnd().split('\n');
  if (lines.some((l) => l.startsWith(`${value},`))) return;
  const at = lines.findIndex((l, i) => i > 0 && l.localeCompare(value) > 0);
  lines.splice(at < 0 ? lines.length : at, 0, `${value},${meaning.includes(',') ? `"${meaning}"` : meaning}`);
  writeFileSync(path, `${lines.join('\n')}\n`);
};

export function migrate(t, root = projectRoot) {
  writeCsv(join(root, 'schema/vocab/citation-roles.csv'), ['Value', 'Meaning'], ROLES.map(([Value, Meaning]) => ({ Value, Meaning })));
  insertVocab(join(root, 'schema/vocab/coverage-status.csv'), 'Superseded', 'An earlier finding replaced by a later row for the same material and domain; kept as an audit trail.');

  const schemaPath = join(root, 'schema/tables/sources.schema.json');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  if (!schema.fields.some((f) => f.name === 'Citation role')) {
    schema.fields.splice(schema.fields.findIndex((f) => f.name === 'Source class') + 1, 0, {
      name: 'Citation role', type: 'string', role: 'editorial', vocabulary: 'citation-roles', constraints: { required: true },
      description: 'Why the source is registered: cited by records, or kept to corroborate, to register scope or prices, as provenance, or recorded as not retrieved.',
    });
    writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
    t.schemas.sources = schema;
  }
  if (!('Citation role' in t.rows('sources')[0])) t.addColumn('sources', 'Citation role', { after: 'Source class', fill: () => 'cited' });
  for (const [id, role] of Object.entries(SOURCE_ROLES)) {
    const row = t.get('sources', id);
    if (row['Citation role'] !== role) t.set('sources', id, 'Citation role', role, { expect: 'cited' });
  }

  for (const [id, [status, by]] of Object.entries(SUPERSEDED)) {
    const row = t.get('coverage', id);
    if (row.Status === 'Superseded') continue;
    t.set('coverage', id, 'Status', 'Superseded', { expect: status });
    t.set('coverage', id, 'Finding', `Superseded by ${by} (2026-09-14; was "${status}"): ${row.Finding}`, { expect: row.Finding });
  }
  if (t.get('coverage', 'C01173').Finding !== C01173[1]) t.set('coverage', 'C01173', 'Finding', C01173[1], { expect: C01173[0] });

  for (const id of ['V002188', 'V002189']) {
    const loc = t.get('measurements', id).Locator;
    if (/ {2}/.test(loc)) t.set('measurements', id, 'Locator', loc.replace(/ {2,}/g, ' '), { expect: loc });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record ?? ''} ${c.field ?? ''}`);
}
