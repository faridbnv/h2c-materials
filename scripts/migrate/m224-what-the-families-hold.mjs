#!/usr/bin/env node
// Migration m224 (2026-09-28): the sentences that still named what m223 changed (GOALS C2; D106).
//
// The owner asked whether everything m223 changed is also said correctly. An agent read every current-state text for
// the names m223 retired, and these still said the old thing:
//
// - TPU's family entry named "TPU, hardness not stated" among its members, and did not name TPU-LW, which took its
//   place when m223 made it a family entry of its own (materials.csv, and its eight coverage findings).
// - The family entries' coverage findings list their members, and none named its "maker-undisclosed" home, which m142
//   added on 2026-09-25, nor TPE's TPS (m142) and TPV (m223). Each is superseded by one that names them, never edited.
// - PA66 said only that no PA66 filament sheet was found, though two products are filed there since m223, inferred.
// - Heat deflection's Not applicable reason named "TPE polymer not stated" among the elastomers it leaves out; TPV is
//   one of them since m223.
// - Research limitations counted PA66 among the identities with no exact-grade profile, and POM among those with no
//   mechanical, heat deflection or chamber value; POM's products have all three since Tarfuse POM and batch b34.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m224-what-the-families-hold.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm224-what-the-families-hold';
const date = '2026-09-28';
const NA = 'Not applicable';
const t = openTables();
let changed = 0;
const name = (id) => t.get('materials', id)['Original name'];
const set = (table, id, column, before, after) => {
  const now = t.get(table, id)[column];
  if (now === after) return;
  if (now !== before) throw new Error(`${migration}: ${table} ${id} ${column} moved: ${now}`);
  t.set(table, id, column, after, { expect: before });
  changed++;
};

// ------------------------------------------------------------------------------------------------ TPU's members
const TPU_WAS = 'TPU is a family entry for TPU 85A class and softer, TPU 90A class, TPU 95A class, TPU harder than 95A, TPU, hardness not stated since 2026-09-25 (m141-product-lines-and-tpu-hardness): ';
const TPU_NOW = 'TPU is a family entry for TPU 85A class and softer, TPU 90A class, TPU 95A class and TPU harder than 95A since 2026-09-25 (m141-product-lines-and-tpu-hardness), and for TPU-LW since 2026-09-28, in place of TPU, hardness not stated, which is a family entry of its own (m223-what-the-makers-say-it-is): ';
{
  const notes = t.get('materials', 'M039')['Identity notes'];
  if (!notes.startsWith(TPU_NOW)) {
    if (!notes.startsWith(TPU_WAS)) throw new Error(`${migration}: M039 Identity notes moved: ${notes}`);
    set('materials', 'M039', 'Identity notes', notes, TPU_NOW + notes.slice(TPU_WAS.length));
  }
}

// ------------------------------------------------------------------------------------------------ the family entries' findings
// What each family entry's coverage findings say it holds: every member in family_members.csv, by name.
const FAMILIES = {
  M039: ['Family entry since 2026-09-25 (m141-product-lines-and-tpu-hardness): no product of its own. TPU is a family entry for TPU 85A class and softer, TPU 90A class, TPU 95A class, TPU harder than 95A, TPU, hardness not stated.',
    'Family entry since 2026-09-25 (m141-product-lines-and-tpu-hardness): no product of its own. TPU is a family entry for TPU 85A class and softer, TPU 90A class, TPU 95A class and TPU harder than 95A, and since 2026-09-28 for TPU-LW, in place of TPU, hardness not stated, which is a family entry of its own (m223-what-the-makers-say-it-is).'],
  M044: ['Family entry since 2026-09-13: no product of its own. TPE is a family entry for thermoplastic elastomers: TPU (all grades), PEBA, TPC / TPEE, OBC.',
    'Family entry since 2026-09-13: no product of its own. TPE is a family entry for thermoplastic elastomers: TPU (all grades: TPU 85A class and softer, TPU 90A class, TPU 95A class, TPU harder than 95A), PEBA, TPC / TPEE, OBC; since 2026-09-25 also TPS, and TPE, maker-undisclosed elastomer, for the products whose makers do not disclose which (D87, D106); since 2026-09-28 also TPV (m223-what-the-makers-say-it-is).'],
  M047: ['Family entry since 2026-09-13: no product of its own. PA is a family entry for unfilled aliphatic polyamides: PA6, PA6/66, PA66, PA12, PA612.',
    'Family entry since 2026-09-13: no product of its own. PA is a family entry for unfilled aliphatic polyamides: PA6, PA6/66, PA66, PA12, PA612; since 2026-09-25 also Nylon, maker-undisclosed polyamide, for the products whose makers do not disclose which (D87, D106).'],
  M062: ['Family entry since 2026-09-13: no product of its own. PA-CF is a family entry for carbon-fibre polyamides: PA6-CF, PA66-CF, PA12-CF, PA612-CF, PAHT-CF.',
    'Family entry since 2026-09-13: no product of its own. PA-CF is a family entry for carbon-fibre polyamides: PA6-CF, PA66-CF, PA12-CF, PA612-CF, PAHT-CF; since 2026-09-25 also Nylon-CF, maker-undisclosed polyamide, for the products whose makers do not disclose which (D87, D106).'],
  M063: ['Family entry since 2026-09-13: no product of its own. PA-GF is a family entry for glass-fibre polyamides: PA6-GF, PA12-GF, PA612-GF.',
    'Family entry since 2026-09-13: no product of its own. PA-GF is a family entry for glass-fibre polyamides: PA6-GF, PA12-GF, PA612-GF; since 2026-09-25 also Nylon-GF, maker-undisclosed polyamide, for the products whose makers do not disclose which (D87, D106).'],
};
for (const [family, [was, now]] of Object.entries(FAMILIES)) {
  // The sentence names every member, and nothing that is not one.
  const members = t.rows('family_members').filter((r) => r.FamilyMaterialID === family).map((r) => name(r.MemberMaterialID));
  const missing = members.filter((m) => !now.includes(m));
  if (missing.length) throw new Error(`${migration}: ${family}'s finding does not name ${missing.join(', ')}`);
  for (const old of t.rows('coverage').filter((c) => c.MaterialID === family && c.Status === NA && c.Finding === was)) {
    const id = t.nextId('coverage');
    t.append('coverage', { CoverageID: id, MaterialID: family, GradeID: NA, Domain: old.Domain, Status: NA, 'Manufacturer count': NA, Finding: now });
    t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${id} (${date}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
    changed++;
  }
}

// ------------------------------------------------------------------------------------------------ PA66
const PA66_WAS = 'Pure PA66 filament TDS not located; PA6/66 copolymer is not a substitute.';
const PA66_INFERRED = 'Two products are filed here since 2026-09-28 by the owner\'s ruling on the best evidence, each marked inferred on its grade (R225, R226, D106): Yousu Nylon, whose safety data sheet names PA66 while its melting point is a PA6\'s, and Spectrum ThermaTech PA, for which Spectrum names no polyamide and two retailers name PA6/6.';
set('materials', 'M055', 'Limitations', PA66_WAS, `No product recorded here has a technical data sheet that names PA66; PA6/66 copolymer is not a substitute. ${PA66_INFERRED}`);
set('materials', 'M055', 'Identity notes', PA66_WAS, `${PA66_WAS} ${PA66_INFERRED} The resin reference G055-R1 (Zytel 101L) stays the estimates' anchor (m223-what-the-makers-say-it-is).`);

// ------------------------------------------------------------------------------------------------ heat deflection
{
  const reason = t.get('headline_definitions', 'hdt045')['Not applicable reason'];
  const was = '(TPS, TPE polymer not stated; D87)', now = '(TPS, TPV, and TPE, maker-undisclosed elastomer; D87, D106)';
  if (!reason.includes(now)) {
    if (!reason.includes(was)) throw new Error(`${migration}: hdt045's Not applicable reason moved: ${reason}`);
    set('headline_definitions', 'hdt045', 'Not applicable reason', reason, reason.replace(was, now));
  }
}

// ------------------------------------------------------------------------------------------------ research limitations
{
  const rule = t.get('method', 'Research limitations')['Definition / rule'];
  const was = 'Rare PA66, PA66-CF, unfilled PA612 and PA612-GF lack verified exact-grade technical profiles in this sample; POM has an exact product page but no mechanical, HDT or chamber values.';
  const now = 'PA66-CF, unfilled PA612 and PA612-GF lack verified exact-grade technical profiles in this sample, and PA66\'s two products are filed by inference (R225, R226).';
  if (!rule.includes(now)) {
    if (!rule.includes(was)) throw new Error(`${migration}: Research limitations moved: ${rule}`);
    set('method', 'Research limitations', 'Definition / rule', rule, rule.replace(was, now));
  }
}

if (changed) t.save();
console.log(`${migration}: ${changed} change(s)`);
