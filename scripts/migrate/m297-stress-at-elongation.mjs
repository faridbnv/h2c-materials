#!/usr/bin/env node
// Migration m297 (2026-10-02): a stress a sheet states at an elongation is not a strength (D122; OPEN-PROBLEMS §11,
// "Stresses at a stated elongation have no property").
//
// Elastomer sheets print the stress their bar carries at 100, 200 and 300 % elongation (an elastomer's "100 % modulus"),
// and Fiberlogy's FiberFlex Aero at 5 and 10 % strain. With no property for it, the import filed each as Tensile strength
// (endpoint unspecified), and where a sheet printed no other strength the rule made it the product's in-plane strength:
// QIDI PEBA 95A's "tensile stress at 100% (X-Y) ISO 527", 9.17 MPa, was its comparable XY tensile strength, and decided.
// The owner took the recommendation on 2026-10-02: one property per stated elongation (properties.csv), which no headline
// reads, so the value is recorded and shown and never compared with a strength. The import's lexicon reads the label so
// from now on (scripts/ingest/lexicon/property-labels.csv).
//
// Every row whose Locator names a stress or strength at a stated percentage moves, retired duplicates included, so that
// no record keeps the wrong property. Each Locator is the sheet's own label (checked against the cached sheet here).
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m297-stress-at-elongation.mjs
import { openTables } from '../data/table-io.mjs';
import { onSheet } from './m277-m279-sweep-shared.mjs';
import { withNote } from './source-edits.mjs';

const MIGRATION = 'm297';
const FROM = 'Tensile strength (endpoint unspecified)';
const LABEL = /^p\. \d+: (?:tensile )?(?:stress|strength)\s*(?:at|@)\s*(\d+)\s*%(?!\s*infill)/i;
const IDS = ['V002770', 'V005546', 'V005547', 'V007463', 'V007464', 'V007465', 'V008146', 'V008147', 'V008148', 'V009157', 'V009158',
  'V009159', 'V009168', 'V009169', 'V009170', 'V009983', 'V009984', 'V009985', 'V009991', 'V009992', 'V009993', 'V010106', 'V010107',
  'V010108', 'V010374'];

const t = openTables();
const DESCRIPTION = {
  5: 'The stress a tensile bar carries at 5 % elongation, as a sheet prints it ("Tensile Strength @ 5% Strain"). Not a strength: no headline reads it, and it is never compared with one (D122).',
  100: 'The stress a tensile bar carries at 100 % elongation: an elastomer\'s "100 % modulus" (ISO 37, ASTM D412, or ISO 527 on an elastomer). Not a strength: no headline reads it (D122).',
};
let added = 0;
for (const at of [5, 10, 100, 200, 300]) {
  const name = `Tensile stress at ${at} % elongation`;
  if (t.rows('properties').some((p) => p.Property === name)) continue;
  t.append('properties', { Property: name, Domain: 'mechanical', Units: 'MPa', 'Applies to': null, 'Not applicable reason': null,
    Description: DESCRIPTION[at] ?? `The stress a tensile bar carries at ${at} % elongation. Not a strength: no headline reads it (D122).`, 'Replaced by': null }, { migration: MIGRATION });
  added++;
}
const properties = new Set(t.rows('properties').map((p) => p.Property));
let moved = 0;
for (const id of IDS) {
  const m = t.get('measurements', id);
  const at = LABEL.exec(m.Locator)?.[1];
  if (!at) throw new Error(`${MIGRATION}: ${id}'s Locator "${m.Locator}" names no stress at an elongation`);
  const to = `Tensile stress at ${at} % elongation`;
  if (!properties.has(to)) throw new Error(`${MIGRATION}: properties.csv has no "${to}"`);
  if (m.Property === to) continue;
  if (m.Property !== FROM) throw new Error(`${MIGRATION}: ${id} is ${m.Property}, expected ${FROM}; the data moved since this migration was written`);
  onSheet(t, m.SourceID, m.Locator.replace(/^p\. \d+: /, '').replace(/\s+(ISO|ASTM)\b.*$/, '').replace(/\s*\((X-Y)\)/, ''), MIGRATION);
  t.set('measurements', id, 'Property', to, { expect: FROM, migration: MIGRATION });
  t.set('measurements', id, 'Notes', withNote(m.Notes, `Re-filed 2026-10-02 (${MIGRATION}) from ${FROM}: the sheet labels it a stress at ${at} % elongation, which is not a strength (D122).`), { expect: m.Notes, migration: MIGRATION });
  moved++;
}
// Every row of the table that names a stress at an elongation is one of these.
const missed = t.rows('measurements').filter((m) => m.Property === FROM && LABEL.test(m.Locator));
if (missed.length) throw new Error(`${MIGRATION}: ${missed.map((m) => m.MeasurementID).join(', ')} name a stress at an elongation and are not listed`);
if (moved || added) t.save();
console.log(`${MIGRATION}: ${added} propert(ies) added; ${moved} measurement(s) re-filed as a stress at a stated elongation`);
