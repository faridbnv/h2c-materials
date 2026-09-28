#!/usr/bin/env node
// Migration m203 (2026-09-27): the density colorFabb's product pages give its two lightweight PETs, foamed and not
// (GOALS C3, method step 2; the research package of 2026-09-26, P1-VALUES-ROOT-003, 004, 007 and 008).
//
// PET-LW (M141) had no density: its two sheets print none, and density is what a lightweight filament is for. The
// maker's product pages, fetched by the research package of 2026-09-26 and staged from its copies, print one line:
//
//   LW-PET NATURAL        "Density: 1,31 g/cm^3 (non activated density) 0,52 g/cm^3 (maximum activated density)"
//   LW-PET FLEX NATURAL   "Density: 1,30 g/cm^3(non activated density) 0,52 g/cm^3(maximum activated density)"
//
// D95 judges these products foamed, as they are meant to be printed, and records the unfoamed value beside it as
// printed off the product's recipe (m197 did so for their tensile table). The same reading here: the maximum activated
// density is the foamed part's, and the non-activated density is the part printed without foaming. The page does not
// say how either was measured, and the foamed figure is the lightest the maker says the foam reaches, not the density
// of the bar m197's foamed stiffness was measured on (260 °C, 60 % flow); the notes say so.
//
// The pages are registered here as sources of the two products, with the rows m205 (the makers' sites) gives them.
// Every figure is checked on the page's text, and the page's bytes against the digest. The reader is an AI agent
// (claude-opus-5.5, agent reviewer), not a person. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m203-colorfabb-lightweight-pet-density.mjs

import { existsSync, readFileSync } from 'node:fs';
import { openTables, nextId } from '../data/table-io.mjs';
import { cacheDir, cachedText, sha256 } from '../lib/pdf-text.mjs';

const migration = 'm203-colorfabb-lightweight-pet-density';
const date = '2026-09-27';
const NA = 'Not applicable';
const NP = 'Not published';
const READER = 'Read by an AI agent (claude-opus-5.5, agent reviewer), not a person.';
const t = openTables();

const NOTE = "The maker's own product page, searched for what it says about the product (the makers' sites, research package of 2026-09-26); what it says is the maker's marketing text.";
const ACCESS = 'Fetched from its URL on 2026-09-26 by the Codex research agents (research package of 2026-09-26) and staged from their saved copy by digest (ingest:witness --from); not fetched again.';
const page = (SourceID, Title, URL, grade, SHA256) => ({
  SourceID, Publisher: 'colorFabb', Title, Revision: NP, 'Publication date': NP, 'Access date': '2026-09-26', 'Source class': 'Manufacturer product page or guide',
  'Source note': NOTE, 'Citation role': 'cited', URL, Locator: 'Product page', 'Applicable grades': grade, 'Access state': 'retrieved', 'Access note': ACCESS, SHA256,
});
const PRODUCTS = [
  { grade: 'G141-01', source: page('D-COLORFABB-LW-PET-NATURAL-PAGE', 'LW-PET NATURAL', 'https://colorfabb.com/lw-pet-natural', 'G141-01', '608f3a2c763bbb4068dc3e2f547c82b793fdc05411ae39b5eea03cc0e6f1edd0'),
    line: 'Density: 1,31 g/cm^3 (non activated density) 0,52 g/cm^3 (maximum activated density)', unfoamed: '1,31' },
  { grade: 'G141-02', source: page('D-COLORFABB-LW-PET-FLEX-NATURAL-PAGE', 'LW-PET FLEX NATURAL', 'https://colorfabb.com/lw-pet-flex-natural', 'G141-02', '2e78dcea5a5db3fd816d157708072fad95869c3ae2b656c3c3be612dbef0c2f6'),
    line: 'Density: 1,30 g/cm^3(non activated density) 0,52 g/cm^3(maximum activated density)', unfoamed: '1,30' },
];

let changed = 0;
const tally = new Map();
const count = (k) => { tally.set(k, (tally.get(k) ?? 0) + 1); changed++; };
const norm = (s) => String(s).normalize('NFKC').replace(/\s+/g, ' ').trim();
const rows = () => t.rows('measurements');

for (const p of PRODUCTS) {
  const s = p.source;
  const held = t.find('sources', s.SourceID);
  if (held && held.SHA256 !== s.SHA256) throw new Error(`${migration}: ${s.SourceID} holds ${held.SHA256}; the data moved`);
  const path = cacheDir('sources/by-sha', `${s.SHA256}.html`);
  if (!existsSync(path) || sha256(readFileSync(path)) !== s.SHA256) throw new Error(`${migration}: ${s.SourceID} is not cached at ${s.SHA256}; stage it first (npm run ingest:witness -- --from ...)`);
  const text = cachedText(s.SHA256);
  if (!text) throw new Error(`${migration}: no cached text for ${s.SourceID}`);
  if (!text.pages[0].lines.some((l) => norm(typeof l === 'string' ? l : l.text) === norm(p.line))) throw new Error(`${migration}: ${s.SourceID} no longer prints "${p.line}"`);
  if (!held) { t.append('sources', s); count('product pages registered'); }

  const g = t.get('grades', p.grade);
  const add = (figure, specimen, parameters, locator, why) => {
    if (rows().some((r) => r.SourceID === s.SourceID && r.Locator === locator && r['Data status'] !== 'Retired duplicate record')) return;
    const value = figure.replace(',', '.');
    const row = {
      MeasurementID: nextId('measurements', rows().map((r) => r.MeasurementID)), MaterialID: g.MaterialID, GradeID: p.grade, Property: 'Density',
      'Raw value': `${figure} g/cm^3`, 'Raw unit': 'g/cm³', 'Raw numeric': value, 'Raw uncertainty ±': NA, 'Raw upper bound': NA, Operator: '=',
      'Conversion factor': '1000', 'Normalized value': String(Math.round(Number(value) * 1000)), 'Normalized uncertainty ±': NA, 'Normalized upper bound': NA,
      'Normalized unit': 'kg/m³', 'Data status': 'Published value', 'Specimen type': specimen, Direction: NA, 'Moisture condition': NP, 'Moisture state': 'not-stated',
      'Post-processing': NP, 'Post-processing state': 'not-stated', 'Anneal °C': NA, 'Anneal h': NA, 'Test temperature': NP, 'Test temperature °C': NP,
      'Standard / load': NP, Standards: NP, 'Test load MPa': NA, Notch: NA, 'Specimen / print parameters': parameters, SourceID: s.SourceID, Locator: locator,
      Notes: `Added ${date} (${migration}): the product page prints "${p.line}". ${why} ${READER}`, 'Parse review': NA,
    };
    const header = t.header('measurements');
    for (const k of header) if (row[k] == null) throw new Error(`${migration}: ${locator} has no ${k}`);
    t.append('measurements', Object.fromEntries(header.map((k) => [k, row[k]])));
    count('densities');
  };
  add('0,52', 'Printed part', 'maximum activated density: the part foamed as far as the maker says it foams', 'p. 1: Density (maximum activated density)',
    "The foamed product's density, as it is meant to be printed (D95): the lightest the maker says the foam reaches, not the density of the bar m197's foamed stiffness was measured on (260 °C, 60 % flow), which the sheet does not give. The page does not say how it was measured.");
  add(p.unfoamed, "Printed off the product's recipe", 'non activated density: printed without foaming', 'p. 1: Density (non activated density)',
    "The part printed without foaming, recorded beside the foamed value and never the product's (D95, as m197 recorded the unfoamed tensile column). The page does not say how it was measured.");
}
if (changed) t.save();
for (const [k, n] of [...tally].sort()) console.log(`  ${n}\t${k}`);
console.log(`${migration}: ${changed} change(s)`);
