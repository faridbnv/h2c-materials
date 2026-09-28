#!/usr/bin/env node
// Migration m202 (2026-09-27): the heat deflection load Spectrum's Product Portfolio 2024 prints beside the figures its
// data sheets print without one (GOALS C3 and C4, method step 2; the research package of 2026-09-26, P0-COND-03-002).
//
// m155 left Spectrum's heat deflections standing without their load where the sheet names only its standard
// ("ISO 75-1/-2", "D648"), and phase 6's search found nothing on Spectrum's site that said more (OPEN-PROBLEMS §15).
// The research package of 2026-09-26 found Spectrum's own Product Portfolio 2024 (a new source,
// R-SPECTRUM-PORTFOLIO-2024; staged from the package's copy, ledger witness for the PA6 Low Warp sheet), whose
// comparison table prints, per product, "HDT A - 85°C" or "HDT B - 70°C": the ISO 75 method letter, which names the
// load (A 1.8 MPa, B 0.45 MPa; D65). The research found it for PA6 Low Warp; the same table settles three more rows
// whose sheet prints the same figure and no load.
//
// As m180 did with QIDI's guide: each product is pinned to its row of the table, the row's figure must equal the
// figure the product's own sheet prints, and only a row whose load is Not published is written. The sheet's own words
// stay in Standard / load; the typed load is the portfolio's, and Parse review says so. Rows the table marks "**
// annealed" are not among them. The table's layout sets the figures of a row on the line above its product's name,
// and the reviewer read the rendered page (p. 4) to pair them.
//
// The reader is an AI agent (claude-opus-5.5, agent reviewer), not a person. A re-run is a no-op, and a run after the
// data moved stops.
//
//   node scripts/migrate/m202-spectrum-portfolio-heat-deflection-loads.mjs

import { existsSync, readFileSync } from 'node:fs';
import { openTables } from '../data/table-io.mjs';
import { cacheDir, cachedText, sha256 } from '../lib/pdf-text.mjs';
import { correct } from './source-edits.mjs';

const migration = 'm202-spectrum-portfolio-heat-deflection-loads';
const date = '2026-09-27';
const NA = 'Not applicable';
const NP = 'Not published';
const READER = 'Read by an AI agent (claude-opus-5.5, agent reviewer), not a person.';
const t = openTables();

const PORTFOLIO = {
  SourceID: 'R-SPECTRUM-PORTFOLIO-2024',
  Publisher: 'Spectrum',
  Title: '3D Printing Filament Manufacturer PRODUCT PORTFOLIO',
  Revision: '2024',
  'Publication date': NP,
  'Access date': '2026-09-26',
  'Source class': 'Manufacturer product page or guide',
  'Source note': "Spectrum's own comparison of its filaments, one row per product: print window, density, and a heat deflection labelled with its ISO 75 method letter (\"HDT A - 85°C\", \"HDT B - 70°C\"), the figures its data sheets print, some without the load. Found by the research package of 2026-09-26 (P0-COND-03).",
  'Citation role': 'corroboration',
  URL: 'https://spectrumfilaments.com/wp-content/uploads/2024/02/spectrum-portfolio-2024-en.pdf',
  Locator: 'p. 4: the filament comparison table, HDT column',
  'Applicable grades': NA,
  'Access state': 'retrieved',
  'Access note': 'Fetched from its URL on 2026-09-26 by the Codex research agents (research package of 2026-09-26, P0-COND-03) and staged from their saved copy by digest (ingest:witness --from); not fetched again.',
  SHA256: '4fb78715b81997ecd11b61d8b84393e1bfc6fe096ed35fc50ac062073c96cd74',
};
// The product each row is, pinned: the grade, the row the table prints for it, and the product's own row it settles.
const PRODUCTS = [
  { grade: 'G049-03', name: 'PA6 Low Warp', printed: 'HDT B - 60°C', measurement: 'V002994' },
  { grade: 'G027-05', name: 'Smart ABS', printed: 'HDT A - 85°C', measurement: 'V003008' },
  { grade: 'G031-03', name: 'ASA 275', printed: 'HDT A - 86°C', measurement: 'V002808' },
  { grade: 'G020-11', name: 'rPETG', printed: 'HDT B - 70°C', measurement: 'V003089' },
];
const LOAD = { A: '1.8', B: '0.45' };

let changed = 0;
const tally = new Map();
const count = (k, n = 1) => { if (n) { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; } };
const left = [];

const existing = t.find('sources', PORTFOLIO.SourceID);
if (!existing) { t.append('sources', PORTFOLIO); count('the portfolio registered'); }
else if (existing.SHA256 !== PORTFOLIO.SHA256) throw new Error(`${migration}: ${PORTFOLIO.SourceID} holds ${existing.SHA256}; the data moved`);
const path = cacheDir('sources/by-sha', `${PORTFOLIO.SHA256}.pdf`);
if (!existsSync(path) || sha256(readFileSync(path)) !== PORTFOLIO.SHA256) throw new Error(`${migration}: the portfolio is not cached at ${PORTFOLIO.SHA256}; stage it first (npm run ingest:witness -- --from ...)`);
const text = cachedText(PORTFOLIO.SHA256);
if (!text) throw new Error(`${migration}: no cached text for the portfolio; extract it first`);
const norm = (s) => String(s).normalize('NFKC').replace(/\s+/g, ' ').trim();
const P4 = text.pages.find((p) => p.page === 4).lines.map((l) => norm(typeof l === 'string' ? l : l.text));

const applicable = new Set();
for (const p of PRODUCTS) {
  // The product's name opens its line; its figures are on that line or the one above.
  const i = P4.findIndex((l) => l === p.name || l.startsWith(`${p.name} `));
  if (i < 0) throw new Error(`${migration}: p. 4 prints no row named "${p.name}"`);
  const [line] = [P4[i], P4[i - 1]].filter((l) => l.includes(p.printed));
  if (!line) throw new Error(`${migration}: p. 4 does not print "${p.printed}" beside "${p.name}"`);
  const [, letter, figure] = p.printed.match(/^HDT ([AB]) - (\d+)°C$/);
  const m = t.get('measurements', p.measurement);
  const g = t.get('grades', p.grade);
  if (m.GradeID !== p.grade || m.SourceID !== g.SourceID || m.Property !== 'HDT') throw new Error(`${migration}: ${p.measurement} is not ${p.grade}'s own heat deflection`);
  if (Number(m['Raw numeric']) !== Number(figure)) { left.push(`${p.measurement} (the sheet prints ${m['Raw numeric']} °C; the portfolio ${figure} °C)`); continue; }
  applicable.add(`${g.MaterialID} / ${g.GradeID}`);
  if (m['Test load MPa'] === LOAD[letter]) continue;
  if (m['Test load MPa'] !== NP) { left.push(`${p.measurement} (the sheet states ${m['Test load MPa']} MPa)`); continue; }
  count(`${p.name}: heat deflection at ${LOAD[letter]} MPa (method ${letter})`, correct(t, {
    source: m.SourceID, ids: [p.measurement], migration, date,
    set: { 'Test load MPa': [NP, LOAD[letter]], 'Parse review': [NA, `The raw text is the sheet's own ("${m['Standard / load']}") and states no load, so the parser reads none; the typed ${LOAD[letter]} MPa is ISO 75 method ${letter}, which Spectrum's Product Portfolio 2024 prints for this figure (${PORTFOLIO.SourceID}, p. 4, "${p.name} ... ${p.printed}"). Read by an AI agent (${migration}).`] },
    note: `Spectrum's Product Portfolio 2024 (${PORTFOLIO.SourceID}), p. 4, prints "${p.printed}" in ${p.name}'s row of its comparison table: the figure this row holds, from the product's own sheet, which prints it without the load. ISO 75 method ${letter} is ${LOAD[letter]} MPa (D65). ${READER}`,
  }));
}
const reg = t.get('sources', PORTFOLIO.SourceID);
const grades = [...applicable].sort().join('; ') || NA;
if (reg['Applicable grades'] !== grades) { t.set('sources', PORTFOLIO.SourceID, 'Applicable grades', grades, { expect: reg['Applicable grades'] }); count('the portfolio names the products it settles'); }

if (changed) t.save();
for (const [k, n] of [...tally].sort()) console.log(`  ${n}\t${k}`);
if (left.length) console.log(`  left as they were:\n    ${left.join('\n    ')}`);
console.log(`${migration}: ${changed} change(s)`);
