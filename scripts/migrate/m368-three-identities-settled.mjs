#!/usr/bin/env node
// Migration m368 (2026-10-05): three identity questions the owner left to Claude to judge from the documents and the
// makers' sites (D130; OPEN-PROBLEMS §28 and §29; the owner's answer of 2026-10-05: "couldn't you judge based on the info
// and internet?"). Claude Sonnet researchers read the cached sheets and the makers' pages; Claude Opus decided.
//
// - eSUN eSilk-PLA (G001-76) is eSUN PLA-Silk (G008-02): the 2021 eSilk-PLA sheet ("shinny and silk luster texture ...
//   modified from PLA material") and the 2024 PLA-Silk sheet ("a silky luster and texture ... modified based on PLA
//   material") print the same density (1.21), melt flow (4.8), heat deflection (50 °C) and print window (190-230 °C,
//   bed 45-60 °C), and retailers sell the two names in one colour range. It was filed under plain PLA. It is one product
//   held on two grades, so it merges into PLA-Silk's grade (m302's shape): the 2021 sheet's values were measured on
//   injection-moulded bars and its profile and listing move with their IDs, and G001-76 retires naming G008-02.
// - purefil POM (G087-01, the product page) and "Polyoxymethylen (POM)" (G087-04, the English sheet) are one product:
//   purefil's one POM page links the German and English sheets, which print the same values, and its POM category lists
//   that one product. G087-04 holds the sheet's values, so G087-01's profile and statements move to it and G087-01
//   retires.
// - Fiberlogy FiberFlex Aero (G134-01) was filed as CPE-LW from its sheet's boilerplate ("CPE ANTIBAC filament"). Its
//   table is FiberFlex 40D's value for value, "for the unfoamed material"; FiberFlex 40D's safety data sheet names a
//   copolyester elastomer; Fiberlogy's page calls Aero "a foamable filament from the elastomer family"; Aero's own
//   safety data sheet names no polymer. So it is filed under TPC / TPEE as an inferred filing (D106: the grade says so),
//   with a Variant, since foaming particles make its values its own. CPE-LW holds no other product and becomes an
//   alias of TPC / TPEE (m141's shape), its live coverage findings superseded.
// Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m368-three-identities-settled.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { moveGrade } from '../data/records.mjs';

const MIGRATION = 'm368';
const DATE = '2026-10-05';
const NA = 'Not applicable';
const t = openTables();
const TABLES = ['measurements', 'profiles', 'evidence', 'prices', 'coverage'];
let moved = 0, retired = 0, refiled = 0, aliased = 0;

/** A source that names the retired grade names the kept one (AUDIT-SOURCE-SCOPE), as m302 does. */
function sourcesNameKept(retire, keep) {
  const token = new RegExp(`\\b${retire}\\b(?!-)(?! until ${MIGRATION})`);
  for (const s of t.rows('sources').filter((x) => token.test(x['Applicable grades'] ?? ''))) {
    const list = s['Applicable grades'].split(/;\s*/).map((g) => (g === retire ? keep : token.test(g) ? `${g.replace(token, keep)} (${retire} until ${MIGRATION})` : g));
    t.set('sources', s.SourceID, 'Applicable grades', [...new Set(list)].join('; '), { expect: s['Applicable grades'], migration: MIGRATION });
  }
}

/** One product held on two grades: every record of the retired grade moves to the kept one with its ID (m302, D123). */
function merge(retire, keep, reason) {
  const old = t.get('grades', retire);
  if (old.Status === 'retired') return;
  if (t.get('grades', keep).MaterialID !== old.MaterialID) moved += moveGrade(t, retire, t.get('grades', keep).MaterialID, { migration: MIGRATION });
  const ids = new Set(t.rows('measurements').filter((m) => m.GradeID === retire).map((m) => m.MeasurementID));
  if (t.rows('headlines').some((h) => ids.has(h.MeasurementID))) throw new Error(`${MIGRATION}: ${retire} carries a pin; settle it first`);
  for (const table of TABLES) {
    const pk = t.schemas[table].primaryKey;
    for (const r of t.rows(table).filter((x) => x.GradeID === retire)) {
      if (r.MaterialID && r.MaterialID !== t.get('grades', keep).MaterialID) t.set(table, r[pk], 'MaterialID', t.get('grades', keep).MaterialID, { expect: r.MaterialID, migration: MIGRATION });
      t.set(table, r[pk], 'GradeID', keep, { expect: retire, migration: MIGRATION });
      moved++;
    }
  }
  sourcesNameKept(retire, keep);
  t.set('grades', retire, 'Status', 'retired', { expect: 'active', migration: MIGRATION });
  t.set('grades', retire, 'Selected-grade rationale', `Retired ${DATE} (${MIGRATION}) in favour of ${keep}, the same product, and its records moved there with their IDs: ${reason}`, { expect: old['Selected-grade rationale'], migration: MIGRATION });
  retired++;
}

// eSUN eSilk-PLA is eSUN PLA-Silk.
onCachedSheet(t, 'S-PEBA-eSUN-eSilk-PLA-Filament-TDS-V4-0', 'The model has shinny and silk luster texture', MIGRATION);
onCachedSheet(t, 'S-ESUN-PLA-Silk-TDS-2025-06-19', 'The model has a silky luster and texture', MIGRATION);
merge('G001-76', 'G008-02', 'eSUN\'s 2021 "eSilk-PLA" sheet (V4.0) and its 2024 "PLA-Silk" sheet (V1.0) describe one silk-finish PLA ("shinny and silk luster texture"; "a silky luster and texture") and print the same density, melt flow, heat deflection and print window; the 2021 sheet\'s mechanical values were measured on injection-moulded bars. It was filed under plain PLA.');

// purefil POM is one product.
onCachedSheet(t, 'R-FABRU-PUREFIL-3519-Material-data-sheet-POM-purefil', 'Polyoxymethylen (POM)', MIGRATION);
merge('G087-01', 'G087-04', 'purefil sells one POM filament ("purefil POM", article 100213); its product page, which G087-01 was recorded from, links the German and English sheets, which print the same values, and G087-04 holds the English sheet\'s.');

// POM's makers, counted again: "Fabru" was G087-01's spelling of Fabru / purefil (COVERAGE-UNTRUE).
{
  const c = t.get('coverage', 'C01237');
  if (c.Status === 'Resolved') {
    const id = t.nextId('coverage');
    t.append('coverage', { CoverageID: id, MaterialID: 'M087', GradeID: NA, Domain: 'Grades', Status: 'Resolved', 'Manufacturer count': '3',
      Finding: `3 distinct manufacturer(s) documented against target 3: Fabru / purefil, Grupa Azoty, Yousu. Recounted ${DATE} (${MIGRATION}) after purefil POM's two grades became one ("Fabru" and "Fabru / purefil" are one maker).` }, { migration: MIGRATION });
    t.set('coverage', 'C01237', 'Finding', `Superseded by ${id} (${DATE}; was "Resolved"): ${c.Finding}`, { expect: c.Finding, migration: MIGRATION });
    t.set('coverage', 'C01237', 'Status', 'Superseded', { expect: 'Resolved', migration: MIGRATION });
    t.set('coverage', 'C01237', 'Manufacturer count', NA, { expect: c['Manufacturer count'], migration: MIGRATION });
    moved++;
  }
}

// FiberFlex Aero is a foaming copolyester elastomer by inference; CPE-LW becomes an alias of TPC / TPEE.
onCachedSheet(t, 'R-FIBERLOGY-FIBERLOGY-FIBERFLEX-AERO-TDS-1', 'The parameters listed above apply to the unfoamed', MIGRATION);
const aero = t.get('grades', 'G134-01');
if (aero.MaterialID === 'M134') {
  refiled += moveGrade(t, 'G134-01', 'M046', { migration: MIGRATION });
  t.set('grades', 'G134-01', 'Variant', 'lightweight additive', { expect: aero.Variant, migration: MIGRATION });
  t.set('grades', 'G134-01', 'Composition / filler', `Inferred filing (${MIGRATION}, ${DATE}): no document names FiberFlex Aero's polymer. Its sheet's "CPE ANTIBAC filament" is boilerplate; its table is FiberFlex 40D's value for value "for the unfoamed material", and FiberFlex 40D's safety data sheet names a copolyester elastomer; Fiberlogy's page calls Aero "a foamable filament from the elastomer family". Heat-activated foaming particles make it a Variant: its values stay its own.`, { expect: aero['Composition / filler'], migration: MIGRATION });
  const m = t.get('materials', 'M134');
  const why = `CPE-LW held one product, Fiberlogy FiberFlex Aero, filed here from its sheet's boilerplate ("CPE ANTIBAC filament"); its table is FiberFlex 40D's, a copolyester elastomer, so it is filed under TPC / TPEE as an inferred filing (${MIGRATION}, D130).`;
  t.set('materials', 'M134', 'Scope', 'Family entry', { expect: m.Scope, migration: MIGRATION });
  t.set('materials', 'M134', 'Identity notes', `CPE-LW is an alias of TPC / TPEE since ${DATE} (${MIGRATION}): ${why}`, { expect: m['Identity notes'], migration: MIGRATION });
  t.append('family_entries', { MaterialID: 'M134', Kind: 'alias', Why: why }, { migration: MIGRATION });
  t.append('family_members', { FamilyMaterialID: 'M134', MemberMaterialID: 'M046' }, { migration: MIGRATION });
  const live = t.rows('coverage').filter((x) => x.MaterialID === 'M134' && !['Not applicable', 'Superseded'].includes(x.Status));
  for (const domain of [...new Set(live.map((c) => c.Domain))]) {
    const olds = live.filter((c) => c.Domain === domain);
    const id = t.nextId('coverage');
    t.append('coverage', { CoverageID: id, MaterialID: 'M134', GradeID: NA, Domain: domain, Status: 'Not applicable', 'Manufacturer count': NA, Finding: `Alias since ${DATE} (${MIGRATION}): no product of its own. ${why}` }, { migration: MIGRATION });
    for (const old of olds) {
      t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${id} (${DATE}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding, migration: MIGRATION });
      t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status, migration: MIGRATION });
      if (old['Manufacturer count'] !== NA) t.set('coverage', old.CoverageID, 'Manufacturer count', NA, { expect: old['Manufacturer count'], migration: MIGRATION });
    }
  }
  aliased++;
}

if (moved || retired || refiled || aliased) t.save();
console.log(`${MIGRATION}: ${retired} grade(s) merged into the product's kept grade (${moved} record(s) moved with their IDs); FiberFlex Aero filed under TPC / TPEE (${refiled} record(s)); ${aliased} material(s) made an alias`);
