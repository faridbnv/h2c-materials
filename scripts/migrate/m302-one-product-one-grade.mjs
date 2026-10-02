#!/usr/bin/env node
// Migration m302 (2026-10-02): one product, one grade (OPEN-PROBLEMS §13, §14, §16, §28; the owner's decision of 2026-10-02).
//
// Twenty-nine products sat on two grades, one per sheet revision or language: PolyLite ASA V5.3 beside Polymaker ASA
// V6.0, purefil's German and English sheets, PolyFlex TPU95 V5.1 beside V5.5, and the rest. m281 put each pair under one
// Shared formulation key, but each still counted as a product of its own in its material's spread, its median, its range
// and its "N of M pass". The owner took the recommendation of 2026-10-02: merge each pair into the grade of the newest
// revision of the maker's own sheet (the English one where two languages are one revision), as m174 and m193 did, rather
// than retire the copy and lose its listings and profiles. Every record filed under the copy (measurements, profiles,
// evidence, prices, coverage) moves to the kept grade with its ID, a source that named the copy names the kept grade, and
// the copy's grade retires with the reason.
//
// A Claude Sonnet reader confirmed each pair on both sheets (m302-one-product-one-grade.csv: the reason and a quote of
// each, checked here on its cached sheet); the pairs it would not merge stay apart: FILAFLEX Foamy's two sheets give two
// non-foamed materials (95A and 85A), SIDDAMENT's "ASA Carbon Fiber" and "ASA CF" print different tables, and Polymaker's
// PLA Pro V6.0 rewrote PolyLite PLA Pro V5.6's description and changed its values. SUNLU TPU (G039-51) is SUNLU TPU 95A
// on SUNLU's own 2024-06 sheet ("Product Name:TPU", Shore 95) and the 95A product page, its values a re-test.
//
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m302-one-product-one-grade.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';
import { typedOf } from './m290-profile-settings.mjs';
import { reviewFields } from '../../build/src/typed-values.js';

const MIGRATION = 'm302';
const DATE = '2026-10-02';
const here = dirname(fileURLToPath(import.meta.url));
const t = openTables();
const TABLES = ['measurements', 'profiles', 'evidence', 'prices', 'coverage'];
const RENAME = { 'G001-148': ['PolyLite CosPLA', 'PolyLite CosPLA Version B'] };

let moved = 0, retired = 0, withdrawn = 0, keyed = 0, named = 0;
/**
 * A source that names the retired grade names the kept one (AUDIT-SOURCE-SCOPE): the ID alone is replaced, the ID inside
 * a note ("G039-03 (re-filed 2026-09-13 from G044-02)", "M092 / G092-01") keeps its note and says what it was.
 */
function sourcesNameKept(e) {
  const token = new RegExp(`\\b${e.retire}\\b(?!-)(?! until ${MIGRATION})`);
  for (const s of t.rows('sources').filter((x) => token.test(x['Applicable grades'] ?? ''))) {
    const list = s['Applicable grades'].split(/;\s*/).map((g) => (g === e.retire ? e.keep : token.test(g) ? `${g.replace(token, e.keep)} (${e.retire} until ${MIGRATION})` : g));
    t.set('sources', s.SourceID, 'Applicable grades', [...new Set(list)].join('; '), { expect: s['Applicable grades'], migration: MIGRATION });
    named++;
  }
}
for (const e of rowsOf(join(here, `${MIGRATION}-one-product-one-grade.csv`))) {
  const keep = t.get('grades', e.keep), old = t.get('grades', e.retire);
  if (old.Status === 'retired') { sourcesNameKept(e); continue; }
  if (keep.Status !== 'active' || old.Status !== 'active') throw new Error(`${MIGRATION}: ${e.keep} and ${e.retire} must both be active`);
  if (keep.MaterialID !== old.MaterialID) throw new Error(`${MIGRATION}: ${e.keep} and ${e.retire} are different materials`);
  onSheet(t, e.source_keep, e.quote_keep, MIGRATION);
  onSheet(t, e.source_retire, e.quote_retire, MIGRATION);
  // A pin is one per product and headline: two on one product after the merge would stop the build.
  const ids = new Set(t.rows('measurements').filter((m) => m.GradeID === e.retire).map((m) => m.MeasurementID));
  const pinned = t.rows('headlines').filter((h) => ids.has(h.MeasurementID));
  if (pinned.length) throw new Error(`${MIGRATION}: ${e.retire} carries pins ${pinned.map((h) => h.HeadlineKey).join(', ')}; settle them first`);
  for (const table of TABLES) {
    const pk = t.schemas[table].primaryKey;
    for (const r of t.rows(table).filter((x) => x.GradeID === e.retire)) {
      t.set(table, r[pk], 'GradeID', e.keep, { expect: e.retire, migration: MIGRATION });
      moved++;
    }
  }
  sourcesNameKept(e);
  t.set('grades', e.retire, 'Status', 'retired', { expect: 'active', migration: MIGRATION });
  t.set('grades', e.retire, 'Selected-grade rationale', `Retired ${DATE} (${MIGRATION}) in favour of ${e.keep}, the same product, and its records moved there with their IDs: ${e.reason}`, { expect: old['Selected-grade rationale'], migration: MIGRATION });
  retired++;
}
// A merged product's sheets may disagree on the chamber: where one profile was declared enclosed by D93 because its own
// sheet asks for an enclosure and states no temperature, and another sheet of the same product states its chamber, that
// statement decides (PROCESS-ENCLOSED) and the declaration goes (PolyLite ABS V5.3's "Room temperature - 90 (˚C)" beside
// Polymaker ABS V6.0's "Closure chamber | Needed").
const kept = new Set(rowsOf(join(here, `${MIGRATION}-one-product-one-grade.csv`)).map((e) => e.keep));
for (const p of t.rows('profiles')) {
  if (!kept.has(p.GradeID) || p.Profile === 'Retired duplicate record' || p['Chamber state'] !== 'enclosed') continue;
  const states = t.rows('profiles').some((x) => x !== p && x.GradeID === p.GradeID && x.Profile !== 'Retired duplicate record' && !['unknown', 'enclosed'].includes(x['Chamber state']));
  if (!states) continue;
  const fields = reviewFields(p);
  if (!fields || [...fields].some((c) => !['Chamber state', 'Chamber requirement'].includes(c))) throw new Error(`${MIGRATION}: ${p.ProfileID}'s review explains more than its D93 chamber; settle it by hand`);
  const typed = typedOf(p);
  for (const c of ['Chamber state', 'Chamber requirement']) t.set('profiles', p.ProfileID, c, typed[c], { expect: p[c], migration: MIGRATION });
  t.set('profiles', p.ProfileID, 'Parse review', 'Not applicable', { expect: p['Parse review'], migration: MIGRATION });
  withdrawn++;
}
// PolyLite CosPLA Version B's V5.5 sheet (G001-148) prints PolyLite PLA Pro V5.6's table and read it as a twin; its
// V5.3 sheet, merged here, prints its own physical and thermal rows (density 1220, melting 150 °C, Vicat 62.7 °C), so the
// product holds values of its own and takes the key its V5.3 sheet had (GRADE-KEY-PRODUCTS).
{
  const g = t.get('grades', 'G001-148');
  const own = 'S-POLYCN-Polylite-CosPLA-Version-B-EN-V5-3-20240123';
  if (g['Shared formulation key'] !== own) {
    t.set('grades', 'G001-148', 'Shared formulation key', own, { expect: 'S-POLYCN-TDS-Polymaker-PolyLite-PLA-Pro-V5-6-2026-01-05-EN', migration: MIGRATION });
    keyed++;
  }
}
for (const [id, [from, to]] of Object.entries(RENAME)) {
  const g = t.get('grades', id);
  if (g['Product name'] === to) continue;
  t.set('grades', id, 'Product name', to, { expect: from, migration: MIGRATION });
  t.set('grades', id, 'Selected-grade rationale', `${g['Selected-grade rationale']} Named "${to}" since ${DATE} (${MIGRATION}): its sheets name Version B, and Version A (G001-28) is another formula.`, { expect: g['Selected-grade rationale'], migration: MIGRATION });
}
if (moved || retired || withdrawn || keyed || named) t.save();
console.log(`${MIGRATION}: ${retired} grade(s) merged into the product's kept grade; ${moved} record(s) moved with their IDs; ${named} source(s) naming the kept grade; ${withdrawn} D93 declaration(s) withdrawn`);
