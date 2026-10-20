#!/usr/bin/env node
// Migration m476 (2026-10-20): the homes the owner's rulings decide for products already registered (items 9 and 10;
// D176). Read by Claude Opus 5.5 (the round's materials-science track) on the cached sheets and page images, beside
// Claude Sonnet readers' fetch of the makers' documents (docs/audits/2026-10-20-owner-rulings/science/DECISIONS-MEMO.md).
//
// - Markforged Onyx ESD, the fourth column of the registered Composites sheet that batch b43 left out ("names no
//   additive its filing accepts"): "Onyx ESD is a static dissipative safe variant of Onyx", "a micro carbon fiber filled
//   nylon", with a surface resistance of 10^5 - 10^7 Ω. A nylon whose maker names no polyamide, with an ESD formulation:
//   PA-ESD (M064), the nylon ESD material (R239). Its column enters as Onyx's did (m362): ten values.
// - Nanovia ISTROFLEX stays where it is, in TPE, maker-undisclosed elastomer (M167), with what its documents say recorded
//   on its grade. Its safety data sheet (b49) calls it a "Modified Polyester alloy and oyster shell powder" with a glass
//   transition of -32 °C; its page, "a biodegradable flexible FFF filament (Shore 44D / 93A)", compostable to EN 13432,
//   with a Vicat of 91 °C: a compostable polyester of PBAT's kind (BASF's ecoflex: Vicat 91 °C), rubbery at room
//   temperature. Filing it under PBAT (M133) was tried and not kept: PBAT sits among the rigid specialty polymers, where
//   heat deflection applies and is estimated, and a 60 MPa, Shore 93A product would have been estimated to hold 0.45 MPa
//   at about 66 °C, a rigid bar's figure a rubber of this stiffness cannot reach (its bar softens below the test's
//   threshold at room temperature). As a rubber of undisclosed polymer it is answered as one (R232).
// - Fabru's Polyvinylchlorid weich 94A (PVC-P): "ein flexibles 3D-Druckmaterial ... gummiähnliche Eigenschaften ... Die
//   Shore Härte beträgt 94A", with 366 % elongation at break and a density of 1.269 g/cm³. A plasticiser lowers PVC's
//   glass transition below room temperature, and the small PVC crystallites hold the chains as a thermoplastic
//   elastomer's hard blocks do: at Shore 94A it is a rubber (Gent's relation puts 94A near 0.04 GPa), where rigid PVC
//   (Fillamentum Vinyl 303, Shore 78D) is a 2 to 4 GPa glass. A material of its own, PVC-P (M178), under Flexible
//   Elastomers, not estimated (R233, R234); the rubber limit is extended to it in m477. It was a product of PVC (M135),
//   estimated there at 0.2 to 8.7 GPa.
// - Spectrum PET-G HT100 moved to CPE in m474; its ruling is written here (R235).
// Each quote is checked on the cached sheet. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m476-held-sheets-homes.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables, projectRoot, nextId } from '../../scripts/data/table-io.mjs';
import { moveGrade, recountGrades } from '../../scripts/data/records.mjs';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';
import { settleFindings } from '../../scripts/lib/source-edits.mjs';
import { readCsv, csvText } from '../../build/src/csv.js';

const MIGRATION = 'm476';
const DATE = '2026-10-20';
const NP = 'Not published', NA = 'Not applicable';
const BY = 'claude-opus-5.5 (the owner\'s rulings, materials-science track)';
const t = openTables();
let n = 0;

// ---- Onyx ESD -------------------------------------------------------------------------------------------------------
const MF = 'R-MARKFORGED-CompositesMaterialDatasheet';
onSheet(t, MF, 'Composite Base Test (ASTM) Onyx Onyx FR Onyx ESD Nylon | Tensile Modulus (GPa) D638 2.4 3.0 4.2 1.7 | Tensile Stress at Yield (MPa) D638 40 41 52 51 | Tensile Stress at Break (MPa) D638 37 40 50 36 | Tensile Strain at Break (%) D638 25 18 25 150 | Flexural Strength (MPa) D790 71 71 83 50 | Flexural Modulus (GPa) D790 3.0 3.6 3.7 1.4 | Heat Deflection Temp ( C) D648 B 145 145 138 41 | Izod Impact - notched (J/m) D256-10 A 330 — 44 110 | Density (g/cm ) — 1.2 1.2 1.2 1.1 | Onyx ESD is a static dissipative safe variant of Onyx | Onyx is a micro carbon fiber filled nylon | Surface Resistance (Ω) ANSI/ESD STM11.11', MF);
let esd = t.rows('grades').find((g) => g.Manufacturer === 'Markforged' && g['Product name'] === 'Onyx ESD');
if (!esd) {
  const id = nextId('grades', t.rows('grades').map((g) => g.GradeID), { materialId: 'M064' });
  const onyx = t.get('grades', 'G165-02');
  t.append('grades', {
    ...onyx, GradeID: id, MaterialID: 'M064', 'Product name': 'Onyx ESD', 'Shared formulation key': `${MF}-OnyxESD`,
    'Composition / filler': '"Onyx ESD is a static dissipative safe variant of Onyx" and "Onyx is a micro carbon fiber filled nylon" (p. 2, as the sheet states it); its surface resistance is 10^5 - 10^7 Ω (p. 1). The sheet names no polyamide; Markforged\'s safety data sheet lists carbon (9.9 to 15 %) and carbon black (8 to 12 %) and no polymer (the owner\'s rulings, R239).',
    'Selected-grade rationale': `Documented commercial formulation; traceable manufacturer evidence (the owner's rulings, ${DATE}, ${MIGRATION})`,
  });
  esd = t.get('grades', id);
  n++;
}
const ESD_PARAMS = 'Onyx ESD column; Composite Base table; plastic test plaques printed with full infill (p. 1); tensile ASTM D638 type I or IV beams, flexural 3-pt bending 4.5 in (L) x 0.4 in (W) x 0.12 in (H)';
const ESD_NOTE = `Added ${DATE} (${MIGRATION}): published in the source, never transcribed: the Onyx ESD column of the Composite Base table, which batch b43 left out for want of a home (the owner's rulings, D176, R239), read on the cached text and the page image by Claude Opus 5.5. The sheet states no print orientation for the Composite Base table.`;
const ONYX = [
  ['V014493', '4.2', '4.2', 'p. 1: Tensile Modulus (GPa), Onyx ESD'],
  ['V014496', '52', '52', 'p. 1: Tensile Stress at Yield (MPa), Onyx ESD'],
  ['V014499', '50', '50', 'p. 1: Tensile Stress at Break (MPa), Onyx ESD'],
  ['V014502', '25', '25', 'p. 1: Tensile Strain at Break (%), Onyx ESD'],
  ['V014505', '83', '83', 'p. 1: Flexural Strength (MPa), Onyx ESD'],
  ['V014508', '3.7', '3.7', 'p. 1: Flexural Modulus (GPa), Onyx ESD'],
  ['V014511', '138', '138', 'p. 1: Heat Deflection Temp (°C), Onyx ESD'],
  ['V014514', '44', '44', 'p. 1: Izod Impact - notched (J/m), Onyx ESD'],
  ['V014516', '1.2', '1200', 'p. 1: Density (g/cm3), Onyx ESD'],
];
for (const [like, raw, norm, locator] of ONYX) {
  if (t.rows('measurements').some((m) => m.SourceID === MF && m.Locator === locator)) continue;
  const tpl = t.get('measurements', like);
  if (tpl.GradeID !== 'G165-02') throw new Error(`${MIGRATION}: ${like} is not Onyx's`);
  const footnote = /Footnote 1/.test(tpl.Notes) ? ` ${tpl.Notes.slice(tpl.Notes.indexOf('Footnote 1')).replace(' The sheet states no print orientation for the Composite Base table.', '')}` : '';
  t.append('measurements', {
    ...tpl, MeasurementID: nextId('measurements', t.rows('measurements').map((m) => m.MeasurementID)), MaterialID: 'M064', GradeID: esd.GradeID,
    'Raw value': raw, 'Raw numeric': raw, 'Normalized value': norm, 'Specimen / print parameters': ESD_PARAMS, Locator: locator,
    Notes: `${ESD_NOTE}${footnote}`,
  });
  n++;
}
{
  const locator = 'p. 1: Surface Resistance (Ω), Onyx ESD';
  if (!t.rows('measurements').some((m) => m.SourceID === MF && m.Locator === locator)) {
    const tpl = t.get('measurements', 'V014516');
    t.append('measurements', {
      ...tpl, MeasurementID: nextId('measurements', t.rows('measurements').map((m) => m.MeasurementID)), MaterialID: 'M064', GradeID: esd.GradeID,
      Property: 'Surface resistivity', 'Raw value': '10^5 - 10^7', 'Raw unit': 'Ω', 'Raw numeric': '100000', 'Raw upper bound': '10000000',
      'Conversion factor': '1', 'Normalized value': '100000', 'Normalized upper bound': '10000000', 'Normalized unit': 'Ω',
      'Data status': 'Published value (transcription corrected)', 'Specimen type': 'Printed specimen',
      'Standard / load': 'ANSI/ESD STM11.11', Standards: 'Not published', 'Specimen / print parameters': 'Onyx ESD column; footnote 3: "Surface resistance measured on multiple part surfaces using recommended print settings by an accredited third party test facility."',
      Locator: locator,
      Notes: `${ESD_NOTE} The page prints the range as 10 to the 5th and 10 to the 7th power; the text layer sets the exponents on the line above ("3 5 7" over "10 - 10"), so the number is the page image's.`,
    });
    n++;
  }
}
{
  const s = t.get('sources', MF);
  if (!s['Applicable grades'].split(/;\s*/).includes(esd.GradeID)) { t.set('sources', MF, 'Applicable grades', `${s['Applicable grades']}; ${esd.GradeID}`, { expect: s['Applicable grades'], migration: MIGRATION }); n++; }
}
if (recountGrades(t, 'M064', { migration: MIGRATION, date: DATE, because: 'after Markforged Onyx ESD joined it' })) n++;

// ---- ISTROFLEX ------------------------------------------------------------------------------------------------------
onSheet(t, 'R-NANOVIA-ISTROFLEX-SDS', 'Modified Polyester alloy and oyster shell powder | Tg -32', MIGRATION);
onSheet(t, 'R-NANOVIA-ISTROFLEX', 'biodegradable flexible FFF filament (Shore 44D / 93A) | Compostable according to norm EN 13432 | VICAT 91', MIGRATION);
{
  const g = t.get('grades', 'G167-12');
  if (!g['Composition / filler'].startsWith('"Modified Polyester alloy')) {
    if (g.MaterialID !== 'M167') throw new Error(`${MIGRATION}: G167-12 is not in M167`);
    t.set('grades', 'G167-12', 'Composition / filler', '"Modified Polyester alloy and oyster shell powder" (R-NANOVIA-ISTROFLEX-SDS, p. 1); "a heavy polymer, based on biodegradable monomers and cosmetic grade oyster shells" (R-NANOVIA-ISTROFLEX, as printed). A compostable polyester alloy with a glass transition of -32 °C (its safety data sheet) and a Vicat of 91 °C, PBAT\'s kind by those figures; Nanovia names no polymer, and it stays in the maker-undisclosed elastomer home as the rubber it is, Shore 44D / 93A (the owner\'s rulings, 2026-10-20, R232, D176). Its density, 1.55 g/cm³ on the page and 1.34 on the safety data sheet, is above an unfilled elastomer\'s: the oyster-shell load is a declared dense filler (D57, R095).', { expect: g['Composition / filler'], migration: MIGRATION });
    n++;
  }
}

// ---- PVC-P ----------------------------------------------------------------------------------------------------------
onSheet(t, 'R-FABRU-PUREFIL-7782-Materialdatenblatt-PVC-P-purefil', 'PVC-Weich Filament ist ein flexibles 3D-Druckmaterial | gummiähnliche Eigenschaften | Die Shore Härte beträgt 94A | Reissdehnung (ISO 527) 366 % | flexible Schläuche, Dichtungen | geschlossenen 3D-Druckern mit integriertem Aktivkohlefilter', MIGRATION);
const PVCP = {
  MaterialID: 'M178', 'Original name': 'PVC-P', Family: 'Flexible Elastomers', 'H2C status': 'Theoretical',
  'Best uses': 'Flexible hoses, seals and rubber-like parts are the maker\'s proposed applications (purefil PVC-P: "flexible Schläuche, Dichtungen und Gummiteile").',
  Limitations: 'No polymers.csv row, so nothing is estimated; heat deflection does not apply to it. Its maker asks for an enclosed printer with an activated-carbon filter: PVC can decompose in the nozzle if it dwells there too long or runs too hot.',
  'Full name': 'Plasticised polyvinyl chloride (PVC-P)', Scope: 'H2C-relevant', Abbreviation: 'PVC-P', 'Base polymer': 'PVC-P',
  'Estimate identity': NA, 'Modifier / filler': 'Unfilled / unspecified', 'Variant class': NA, Role: 'Structural / functional / appearance',
  'Identity notes': 'A material of its own since 2026-10-20 (the owner\'s rulings, R233, D176), as ISO 1043 names plasticised PVC apart from the rigid one (PVC-U): a plasticiser lowers PVC\'s glass transition below room temperature, and the small PVC crystallites then hold the chains as a thermoplastic elastomer\'s hard blocks do, so a Shore A rated PVC-P is a rubber where rigid PVC is a 2 to 4 GPa glass. purefil\'s "Polyvinylchlorid weich 94A (PVC-P)" is "ein flexibles 3D-Druckmaterial" with "gummiähnliche Eigenschaften", Shore 94A and 366 % elongation at break. Under Flexible Elastomers, where a reader looks for a rubber, and not estimated (no polymers.csv row; a plasticised compound\'s figures follow its plasticiser content). It was a product of PVC (M135) until then, estimated there at 0.2 to 8.7 GPa.',
};
{
  const existing = t.rows('materials').find((m) => m['Original name'] === 'PVC-P');
  if (!existing) {
    if (t.find('materials', PVCP.MaterialID)) throw new Error(`${MIGRATION}: ${PVCP.MaterialID} is taken; renumber`);
    t.append('materials', PVCP);
    n++;
  }
  const g = t.get('grades', 'G135-01');
  if (g.MaterialID === 'M135') {
    moveGrade(t, 'G135-01', 'M178', { migration: MIGRATION });
    t.set('grades', 'G135-01', 'Composition / filler', '"PVC-Weich Filament ist ein flexibles 3D-Druckmaterial, das sich durch seine Weichheit und Elastizität auszeichnet ... flexible und gummiähnliche Eigenschaften ... Die Shore Härte beträgt 94A." (p. 1, as the sheet states it): a plasticised PVC (PVC-P), filed as a material of its own (the owner\'s rulings, 2026-10-20, R234, D176).', { expect: NP, migration: MIGRATION });
    const m135 = t.get('materials', 'M135');
    t.set('materials', 'M135', 'Identity notes', `${m135['Identity notes']} Since 2026-10-20 (${MIGRATION}, R233, D176) purefil's PVC-P, the sheet this identity was first read from, is a material of its own (PVC-P, M178), and PVC holds the rigid PVC (Fillamentum Vinyl 303, Shore 78D).`, { expect: m135['Identity notes'], migration: MIGRATION });
    for (const id of ['M135', 'M178']) recountGrades(t, id, { migration: MIGRATION, date: DATE, because: 'after purefil PVC-P became a material of its own' });
    for (const s of t.rows('sources').filter((x) => String(x['Applicable grades']).includes('M135 / G135-01'))) {
      t.set('sources', s.SourceID, 'Applicable grades', s['Applicable grades'].replace('M135 / G135-01', 'M178 / G135-01'), { expect: s['Applicable grades'], migration: MIGRATION });
    }
    n++;
  }
}

// ---- The findings the moves settle --------------------------------------------------------------------------------
{
  const { added, dropped } = settleFindings(t, {
    date: DATE,
    drop: [{ Code: 'MEAS-PHYSICS-WINDOW', Record: 'V005617' }],
  });
  n += added + dropped;
}

if (n) t.save();

// ---- The rulings ----------------------------------------------------------------------------------------------------
const RULINGS = [
  ['R232', 'material', 'ISTROFLEX', 'M167', 'The owner\'s rulings of 2026-10-20 (D176), on R205\'s evidence: Nanovia\'s safety data sheet, "Modified Polyester alloy and oyster shell powder" with a glass transition of -32 °C; its page, compostable to EN 13432, Shore 44D / 93A, Vicat 91 °C: a compostable polyester of PBAT\'s kind, which Nanovia does not name. It stays in TPE, maker-undisclosed elastomer: a 60 MPa, Shore 93A product is a rubber, and filed under PBAT, a rigid specialty polymer here, it would be estimated a heat deflection no rubber of its stiffness has. No biodegradable-polyester home is made for it.'],
  ['R233', 'new-material', 'PVC-P', 'PVC-P × Unfilled / unspecified', 'The owner\'s rulings of 2026-10-20 (D176): a plasticised PVC is a material of its own (ISO 1043 PVC-P), under Flexible Elastomers, not estimated; the rubber limit (CL01) names it (m477).'],
  ['R234', 'material', 'Polyvinylchlorid weich 94A (PVC-P)', 'M178', 'The owner\'s rulings of 2026-10-20 (D176): purefil\'s sheet says "flexibles 3D-Druckmaterial", "gummiähnliche Eigenschaften", Shore 94A: PVC-P, not the rigid PVC (M135).'],
  ['R235', 'material', 'PET-G HT100', 'M089', 'The owner\'s rulings of 2026-10-20 (D176; m474): Spectrum\'s "co-polyester based filament", 1.18 g/cm³ and an HDT B of 94 °C, is a higher-glass-transition copolyester of the Tritan or Amphora HT kind, not a PETG (1.22 to 1.30 g/cm³, glass transition near 80 °C); CPE holds that kind (colorFabb HT, Fiberlogy CPE HT). No variant class: it is another copolyester, not a PETG something changed.'],
  ['R239', 'material', 'Onyx ESD', 'M064', 'The owner\'s rulings of 2026-10-20 (D176): "a static dissipative safe variant of Onyx", "a micro carbon fiber filled nylon", surface resistance 10^5 - 10^7 Ω; Markforged names no polyamide (its safety data sheet lists carbon and carbon black only). Filed by its ESD formulation in PA-ESD, the nylon ESD material, where a reader asking for an ESD-safe nylon finds it.'],
];
const RULINGS_FILE = join(projectRoot, 'docs/audits/2026-09-18-v2-import/rulings/rulings.csv');
{
  const { header, records } = readCsv(RULINGS_FILE);
  const rows = records.map((r) => r.values);
  let r = 0;
  for (const [Ruling, Kind, Subject, Value, Reason] of RULINGS) {
    const there = rows.find((x) => x.Ruling === Ruling);
    if (there) { if (there.Subject !== Subject) throw new Error(`${MIGRATION}: ${Ruling} is taken by "${there.Subject}"`); continue; }
    rows.push({ Ruling, Kind, Subject, Value, Reason, By: BY, Date: DATE }); r++;
  }
  if (r) { writeFileSync(RULINGS_FILE, csvText(header, rows)); n += r; }
}
// The V2 ledger's note on the Composites sheet: its fourth column has entered.
{
  const LEDGER = join(projectRoot, 'docs/audits/2026-09-18-v2-import/ledger.csv');
  const { header, records } = readCsv(LEDGER);
  const rows = records.map((x) => x.values);
  const row = rows.find((x) => x.doc_key === '58a9c5673b437051');
  const note = ` Its Onyx ESD column entered on ${DATE} (${MIGRATION}; the owner's rulings, R239, D176) as ${esd.GradeID} under PA-ESD.`;
  if (!row.status_note.includes(note.trim())) { row.status_note = `${row.status_note}${note}`; row.updated = DATE; writeFileSync(LEDGER, csvText(header, rows)); n++; }
}
console.log(`${MIGRATION}: ${n} edit(s)`);
