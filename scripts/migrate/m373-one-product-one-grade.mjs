#!/usr/bin/env node
// Migration m373 (2026-10-05): nine products held on two grades each, one per sheet revision or name, become one grade
// each (check round 3, D131; OPEN-PROBLEMS §15 and §16; build/reports/duplicates/judgements.md, judged by Claude Opus
// on the evidence a Claude Sonnet researcher quoted from the cached sheets).
//
// A product held twice counts twice in its material's spread (the median and range a material row shows). Each pair
// below is one product: a maker's sheet revised, re-tested on ISO bars, renamed, or published as a PDF and a page.
// - MatterHackers "Build Series PLA" and "MH Build Series PLA", and the same two names for PETG: every value alike; the
//   newer sheets ("MH Build Series ...") add the test methods and a date, and MatterHackers' store sells the PETG as
//   "MH Build Series PETG".
// - Polymaker "PolyMax™ PETG-ESD" and "Fiberon™ PETG-ESD": one description ("offers electrostatic discharge (ESD) safety
//   with improved toughness") and one table, moved from one brand to the other.
// - Siraya Tech "Fibreheart PAHT CF (PPA based)" is the web page of "Fibreheart PPA-CF": its own heading and values.
// - SUNLU's old "Product Information" sheets and its 2026 ISO sheets for ASA ("UV/rain/heat resistant, suitable for
//   outdoor use") and WOOD ("Contains 20% real wood fibers" / "PLA with a wood-like texture"): one product re-tested,
//   with the same glass transition, melting and decomposition temperatures; and "Silk PLA+", whose 2026 ISO sheet is
//   registered on a grade with no values (G008-19), beside the old sheet's grade "PLA+ (Silk PLA+)".
// - eSUN "PLA Basic": three sheets (2024, 2025, 2026) for one entry-level PLA, with the same characteristics and
//   applications; eSUN restarts its version numbers with each template.
// Each merges as m302 and m368 merged: the newer sheet's grade is kept (for Silk PLA+, the grade that holds values), every
// record of the other moves there with its ID, the sources name the kept grade, and the other is retired naming it.
// Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m373-one-product-one-grade.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm373';
const DATE = '2026-10-05';
const t = openTables();
const TABLES = ['measurements', 'profiles', 'evidence', 'prices', 'coverage'];
let moved = 0, retired = 0, copies = 0;

/** A source that names the retired grade names the kept one (AUDIT-SOURCE-SCOPE), as m302 and m368 do. */
function sourcesNameKept(retire, keep) {
  const token = new RegExp(`\\b${retire}\\b(?!-)(?! until ${MIGRATION})`);
  for (const s of t.rows('sources').filter((x) => token.test(x['Applicable grades'] ?? ''))) {
    const list = s['Applicable grades'].split(/;\s*/).map((g) => (g === retire ? keep : token.test(g) ? `${g.replace(token, keep)} (${retire} until ${MIGRATION})` : g));
    t.set('sources', s.SourceID, 'Applicable grades', [...new Set(list)].join('; '), { expect: s['Applicable grades'], migration: MIGRATION });
  }
}

/** One product held on two grades: every record of the retired grade moves to the kept one with its ID (m302, D123). */
function merge(retire, keep, quotes, reason) {
  const old = t.get('grades', retire);
  if (old.Status === 'retired') return;
  if (t.get('grades', keep).MaterialID !== old.MaterialID) throw new Error(`${MIGRATION}: ${retire} and ${keep} are filed under two materials`);
  for (const [sid, quote] of quotes) onCachedSheet(t, sid, quote, MIGRATION);
  const ids = new Set(t.rows('measurements').filter((m) => m.GradeID === retire).map((m) => m.MeasurementID));
  if (t.rows('headlines').some((h) => ids.has(h.MeasurementID))) throw new Error(`${MIGRATION}: ${retire} carries a pin; settle it first`);
  for (const table of TABLES) {
    const pk = t.schemas[table].primaryKey;
    for (const r of t.rows(table).filter((x) => x.GradeID === retire)) {
      t.set(table, r[pk], 'GradeID', keep, { expect: retire, migration: MIGRATION });
      moved++;
    }
  }
  sourcesNameKept(retire, keep);
  t.set('grades', retire, 'Status', 'retired', { expect: 'active', migration: MIGRATION });
  t.set('grades', retire, 'Selected-grade rationale', `Retired ${DATE} (${MIGRATION}) in favour of ${keep}, the same product, and its records moved there with their IDs: ${reason}`, { expect: old['Selected-grade rationale'], migration: MIGRATION });
  retired++;
}

merge('G001-123', 'G001-130', [['R-MATTERHACKERS-PRO-SERIES-vQ0bKO', 'Commercial name: MatterHackers Build Series PLA'], ['R-MATTERHACKERS-PRO-SERIES-d0cX8m', 'MH Build Series PLA is an affordable PLA filament']],
  'MatterHackers\' "Build Series PLA" sheet and its newer "MH Build Series PLA" sheet print the same values (density 1.25, HDT 56 °C, flexural modulus 3600 MPa); the newer one adds the test methods and a date.');
merge('G020-50', 'G020-55', [['R-MATTERHACKERS-PRO-SERIES-BBz11b', 'Commercial name: MatterHackers Build Series PETG'], ['D-MATTERHACKERS-MH-BUILD-PETG-2-85MM-PAGE', 'MH Build Series PETG Filament']],
  'MatterHackers\' "Build Series PETG" and "MH Build Series PETG" sheets print the same values, and its store sells the product as "MH Build Series PETG".');
merge('G026-02', 'G026-05', [['S-POLYCN-PolyMax-PETG-ESD-TDS-V5-3', 'PolyMax™ PETG-ESD offers electrostatic discharge (ESD) safety with improved'], ['R-POLYMAKER-FIBERON-TDS-FIBERON-PETG-ESD-V1-1-EN-1', 'Fiberon™ PETG-ESD offers electrostatic discharge']],
  'Polymaker moved its PETG-ESD from the PolyMax brand (sheet V5.3) to Fiberon (V1.1): one description and one table (density 1.24, Tg 77 °C, Young\'s modulus 1983 MPa X-Y).');
merge('G070-09', 'G070-02', [['D-SIRAYA-siraya-tech-fibreheart-paht-cf-ppa-based-tds', 'PPA-CF'], ['D-SIRAYA-Fibreheart-PPA-CF-TDS', 'Fibreheart PPA-CF']],
  'Siraya Tech\'s web page "Fibreheart PAHT CF (PPA based)" is headed "Siraya Tech Fibreheart PPA-CF TDS" and prints the PDF\'s values (density 1.2, Tg 80 °C, HDT 192 °C annealed).');
merge('G031-27', 'G031-08', [['R-SUNLU-SUNLU-ASA-Purple', 'UV/rain/heat resistant, suitable for outdoor use'], ['R-SUNLU-7d61617c-7540-4ae2-88d3-a0d206e5d801', 'Product Name: ASA']],
  'SUNLU\'s "Self-restraint ASA" Product Information sheet and its 2026 ISO sheet for ASA (SL-TE-WI-059) describe one outdoor ASA with the same Tg 108, Tm 120 and decomposition 392 °C; the newer sheet re-tested it on ISO bars.');
merge('G014-10', 'G014-03', [['R-SUNLU-PLA-WOOD', 'Contains 20% real wood fibers with woody texture and'], ['R-SUNLU-9ecc53a5-f50a-4687-97fc-fab43b1db35b', 'Product Name: WOOD']],
  'SUNLU\'s "PLA Wood" Product Information sheet and its 2026 ISO sheet for WOOD (SL-TE-WI-092) describe one wood-filled PLA with the same Tg 60, Tm 164 and decomposition 355 °C.');
merge('G008-19', 'G008-15', [['R-SUNLU-SILK-PLA', 'Product Information Silk PLA+'], ['R-SUNLU-91c03fbc-a5c0-4711-b3ae-10d0efd19f27', 'Product Name: Silk PLA+']],
  'SUNLU\'s Silk PLA+ is held on its old Product Information sheet\'s grade ("PLA+ (Silk PLA+)", with its values) and on the grade its 2026 ISO sheet is registered on, which holds no values.');
merge('G001-94', 'G001-83', [['S-PEBA-PLA-Basic-TDS-EN', 'This is an entry-level 3D printing filament designed for enthusiasts and beginners'], ['S-PEBA-PLA-Basic-TDS-EN-2026-6-5', 'This is an entry-level 3D printing filament designed for enthusiasts and beginners']],
  'eSUN\'s 2025 and 2026 "PLA Basic" sheets print the same description, characteristics and applications for one entry-level PLA; the 2026 sheet re-tested it.');
merge('G001-97', 'G001-83', [['S-PEBA-PLA-Basic-TDS-V1-2024-08-07', 'A low-cost basic printing consumable based on modified PLA'], ['S-PEBA-PLA-Basic-TDS-EN-2026-6-5', 'PLA-Basic']],
  'eSUN\'s 2024 "PLA Basic" sheet (V1.0) is the first of three sheets for one entry-level PLA: the same density 1.24 and flexural strength 101.2 MPa as the 2025 sheet, and the same characteristics and applications as the 2026 one.');

// A page filed on both grades left two copies of its profile on the kept one (PROFILE-DUPLICATE, D120): the moved copy
// is retired, naming the one that stays.
for (const [copy, stays] of [['P1875', 'P1878']]) {
  const p = t.get('profiles', copy);
  if (p.Profile === 'Retired duplicate record') continue;
  const kept = t.get('profiles', stays);
  if (p.GradeID !== kept.GradeID || p.SourceID !== kept.SourceID) throw new Error(`${MIGRATION}: ${copy} and ${stays} are not one product's profiles from one page`);
  t.set('profiles', copy, 'Profile', 'Retired duplicate record', { expect: p.Profile, migration: MIGRATION });
  t.set('profiles', copy, 'Locator', `Retired duplicate of ${stays} (D120): MatterHackers' MH Build Series PLA page was filed on both of the product's grades, merged here; ${p.Locator}`, { expect: p.Locator, migration: MIGRATION });
  copies++;
}

if (moved || retired || copies) t.save();
console.log(`${MIGRATION}: ${retired} grade(s) merged into the product's kept grade (${moved} record(s) moved with their IDs); ${copies} copied profile(s) retired`);
