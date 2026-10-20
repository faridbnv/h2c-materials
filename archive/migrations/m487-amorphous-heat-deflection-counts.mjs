#!/usr/bin/env node
// Migration m487 (2026-10-20): an undescribed heat deflection of a plastic that cannot crystallise counts (D177, amending
// D172; the owner's ruling of 2026-10-20 on the executor's suggestion, advised and built by the materials-science track:
// docs/audits/2026-10-20-amorphous-heat/ADVICE.md).
//
// D172 set apart every tensile, flexural, impact and heat deflection value whose test bar no document describes as
// printed, since a moulded bar flatters a print. For heat deflection that holds where the plastic can crystallise (a hot
// mould or an anneal crystallises a PLA, a PET, a nylon or a PP, and its bar deflects tens of degrees above a print's),
// and not where it cannot: an amorphous bar deflects where its modulus collapses at its glass transition, whether it was
// moulded or printed (the model's own moulded-against-printed pairs differ by 1.3 °C, sd 7.6; ADVICE.md says the rest).
// As data:
//   1. polymers.csv gains Can crystallise: yes, no, not known, or Not applicable for an elastomer.
//   2. headline_definitions.csv gains Undescribed bar counts for, in the Applies-to grammar: for hdt045 and hdt18 a
//      polymer that cannot crystallise, unfilled or with a fibre, conductive, PTFE or graphene load (not foamed); Not
//      applicable for every other headline, whose undescribed bars stay set apart (a print's voids and layers move a
//      strength, a stiffness, a stretch and an impact whatever the polymer).
//   3. D172's counter-indications become a Specimen type of their own, "Not published (its document points to moulded or
//      resin bars)", for every value the readings of 2026-10-20 set apart for one (the owner's rulings, evidence/
//      classification.csv, pinned below): such a value stays set apart whatever the polymer, as the ruling asks.
//   4. What the values that now count were read against, on their cached pages: Nanovia's PC V0 and PC CF sheets print
//      their heat deflections at "4.6 kg/cm 2" and "18.6 kg/cm 2" (0.45 and 1.8 MPa), recorded with no load and the 1.8 MPa
//      value never transcribed; MatterHackers PRO Series PETG prints "ASTM D648 at 66 PS" (66 psi, 0.455 MPa). And two
//      cannot be an amorphous bar's as printed: Nanovia PC CF's 144 and 133 °C beside its own sheet's glass transition of
//      120 °C (a glassy bar cannot hold its shape 24 °C above it; PR12's margin is 15 °C, D149), and Fabru's ASA CF10 at
//      130 °C (no ASA's glass transition is near it: the sheets of its products here print at most 108 °C): flagged physically
//      implausible, as D149 flags a PLA bar above its glass transition.
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m487-amorphous-heat-deflection-counts.mjs
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { readCsv } from '../../build/src/csv.js';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';
import { settleFindings } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm487';
const NA = 'Not applicable';
const t = openTables();
let changed = 0;
const set = (table, id, field, value, expect) => { if (t.get(table, id)[field] === value) return; t.set(table, id, field, value, { expect, migration: MIGRATION }); changed++; };

// 1. Whether a polymer, or a phase of a blend, can crystallise in a hot mould or on annealing.
const CRYSTALLISE = {
  PLA: 'yes', PETG: 'no', PCTG: 'no', CPE: 'no', CoPE: 'not known', nGen: 'no', PET: 'yes', ABS: 'no', ASA: 'no', HIPS: 'no', PC: 'no',
  'PC-ABS': 'no', 'PC-PBT': 'yes', PA: 'yes', PA6: 'yes', PA66: 'yes', 'PA6/66': 'yes', CoPA: 'yes', PA12: 'yes', PA612: 'yes', PAHT: 'yes',
  PPA: 'yes', PP: 'yes', PE: 'yes', PPS: 'yes', PVDF: 'yes', POM: 'yes', PVA: 'yes', BVOH: 'yes', PVB: 'no', TPU: NA, TPE: NA, PEBA: NA, TPC: NA,
  OBC: NA, Support: 'not known', 'PPE-PS': 'no', PCL: 'yes', SAN: 'no', COC: 'no', PBT: 'yes', LCP: 'yes', PBAT: 'yes', PVC: 'no', PA11: 'yes',
  SEBS: NA, 'PLA-PHA': 'yes', 'PLA-PHB': 'yes', SBC: 'no',
};
if (!t.header('polymers').includes('Can crystallise')) {
  t.addColumn('polymers', 'Can crystallise', { after: 'As printed', fill: (r) => {
    if (!(r.PolymerID in CRYSTALLISE)) throw new Error(`${MIGRATION}: polymer ${r.PolymerID} has no Can crystallise; read it and add it here`);
    return CRYSTALLISE[r.PolymerID];
  } });
  changed++;
}

// 2. The headlines an undescribed bar may count for, and for which kinds of plastic.
const HEAT = 'Can crystallise: no; Modifier / filler: Unfilled / unspecified | Carbon fibre | Glass fibre | Aramid fibre | ESD formulation | Electrically conductive | PTFE | Graphene | Commercial variant / undisclosed';
if (!t.header('headline_definitions').includes('Undescribed bar counts for')) {
  t.addColumn('headline_definitions', 'Undescribed bar counts for', { after: 'Unstated load', fill: (r) => (['hdt045', 'hdt18'].includes(r.HeadlineKey) ? HEAT : NA) });
  changed++;
}

// 3. D172's counter-indications, as the readings of 2026-10-20 recorded them value by value.
const CLASSIFICATION = 'docs/audits/2026-10-20-owner-rulings/evidence/classification.csv';
const CLASSIFICATION_SHA256 = 'a174ef9a302571106f69855825b2ee22d6da249f49c7c87fce8aa699a2c8bec2';
const bytes = readFileSync(join(projectRoot, CLASSIFICATION));
if (createHash('sha256').update(bytes).digest('hex') !== CLASSIFICATION_SHA256) throw new Error(`${MIGRATION}: ${CLASSIFICATION} changed`);
const POINTS = 'Not published (its document points to moulded or resin bars)';
const UNDESCRIBED = new Set(['Not published (do not assume printed)', 'Not published']);
let retyped = 0;
for (const { values: c } of readCsv(join(projectRoot, CLASSIFICATION)).records) {
  if (c.verdict !== 'set-apart' || c.kind === 'none') continue;
  const m = t.get('measurements', c.measurementId);
  if (m['Specimen type'] === POINTS) continue;
  if (!UNDESCRIBED.has(m['Specimen type'])) throw new Error(`${MIGRATION}: ${c.measurementId} is "${m['Specimen type']}", not the undescribed bar the reading set apart`);
  t.set('measurements', c.measurementId, 'Specimen type', POINTS, { expect: m['Specimen type'], migration: MIGRATION });
  retyped++;
}
changed += retyped;

// 4. The loads the pages print, and two values no amorphous bar of their kind reaches.
const NANOVIA = [
  // [measurement, source, the cell's words for the 0.45 MPa value, the 1.8 MPa line's words]
  ['V007724', 'R-NANOVIA-PC', 'D648 @ 4.6 kg/cm 2', 'D648 @ 18.6 kg/cm 2', 'HDT 144 °C D648 @ 4.6 kg/cm 2 | 133 °C D648 @ 18.6 kg/cm 2'],
  ['V007487', 'R-NANOVIA-PC-CF', 'ASTN D648 at 4.6 kg/cm 2', 'ASTN D648 at 18.6 kg/cm 2', 'HDT 144 °C ASTN D648 at 4.6 kg/cm 2 | 133 °C ASTN D648 at 18.6 kg/cm 2'],
];
const IMPLAUSIBLE = 'Published value (physically implausible)';
const PC_CF_WHY = 'Flagged 2026-10-20 (m487, D177) as physically implausible: a polycarbonate bar is glassy, and its own sheet prints a glass transition of 120 °C (V013427, "Tg 120 °C"); a glassy bar cannot hold its shape 13 to 24 °C above it (PR12\'s margin is 15 °C, D149). One of the two figures is not this product\'s; it backs nothing until the maker says which.';
for (const [id, source, words, words18, quote] of NANOVIA) {
  const m = t.get('measurements', id);
  if (m.SourceID !== source || m['Normalized value'] !== '144') throw new Error(`${MIGRATION}: ${id} is not the row it was`);
  onSheet(t, source, quote, MIGRATION);
  set('measurements', id, 'Standard / load', words, 'D648');
  set('measurements', id, 'Test load MPa', '0.45', 'Not published');
  if (!m.Notes.includes('(m487')) set('measurements', id, 'Notes', `${m.Notes} The load was read 2026-10-20 (m487): the page prints it as "4.6 kg/cm 2", 0.45 MPa, which the row had left out.`, m.Notes);
  if (id === 'V007487') {
    set('measurements', id, 'Data status', IMPLAUSIBLE, 'Published value');
    const now = t.get('measurements', id).Notes;
    if (!now.includes('Flagged 2026-10-20 (m487')) set('measurements', id, 'Notes', `${now} ${PC_CF_WHY}`, now);
  }
  // The 1.8 MPa value the page prints on the next line, never transcribed.
  if (!t.rows('measurements').some((r) => r.SourceID === source && r.Property === 'HDT' && r['Normalized value'] === '133')) {
    const row = { ...t.get('measurements', id) };
    const newId = t.nextId('measurements');
    Object.assign(row, {
      MeasurementID: newId, 'Raw value': '133 °C', 'Raw numeric': '133', 'Normalized value': '133', 'Standard / load': words18, 'Test load MPa': '1.8',
      'Data status': id === 'V007487' ? IMPLAUSIBLE : 'Published value', Locator: 'p. 1: HDT, its second line',
      Notes: `Added 2026-10-20 (m487): published in the source, never transcribed. p. 1, under "Thermal properties" beside the 0.45 MPa value (${id}): "133 °C ${words18}" (18.6 kgf/cm², 1.8 MPa).${id === 'V007487' ? ` ${PC_CF_WHY}` : ''}`,
      'Parse review': NA,
    });
    t.append('measurements', row, { after: id });
    changed++;
  }
}
// MatterHackers PRO Series PETG: "Heat Deflection Temperature 65°C ASTM D648 at 66 PS".
{
  const id = 'V009026';
  const m = t.get('measurements', id);
  if (m.SourceID !== 'R-MATTERHACKERS-PRO-SERIES-4b8JqK' || m['Normalized value'] !== '65') throw new Error(`${MIGRATION}: ${id} is not the row it was`);
  onSheet(t, m.SourceID, 'Heat Deflection Temperature 65°C ASTM D648 at 66 PS', MIGRATION);
  set('measurements', id, 'Standard / load', 'ASTM D648 at 66 PS', 'ASTM D648');
  set('measurements', id, 'Test load MPa', '0.45', 'Not published');
  set('measurements', id, 'Parse review', 'Fields: Test load MPa. The page prints "ASTM D648 at 66 PS", the end of "66 PSI" cut by its layout: ASTM D648\'s lighter load, 66 psi (0.455 MPa), which the parser reads only when psi is spelled (m487).', NA);
}
// Fabru ASA CF10: 130 °C at 0.45 MPa.
{
  const id = 'V013107';
  const m = t.get('measurements', id);
  if (m.SourceID !== 'R-FABRU-7738-Fiche-technique-du-mat-riau-ASA-CF10-purefil' || m['Normalized value'] !== '130') throw new Error(`${MIGRATION}: ${id} is not the row it was`);
  onSheet(t, m.SourceID, 'Température de déflexion 0,45 MPa 130 °C', MIGRATION);
  set('measurements', id, 'Data status', IMPLAUSIBLE, 'Published value');
  const now = t.get('measurements', id).Notes;
  if (!now.includes('(m487')) set('measurements', id, 'Notes', `${now} Flagged 2026-10-20 (m487, D177) as physically implausible: an ASA bar is glassy and deflects at or just below its glass transition, which the sheets of its products here print at most 108 °C; 10 % carbon fibre does not hold a glassy bar 20 °C above it (PR12's margin is 15 °C, D149). The sheet prints no glass transition or Vicat to say otherwise.`, now);
}

// 5. Two materials' heat deflections the estimate model now flags. With the glassy materials' values counted, the model's
// heat ranges for materials narrowed (its plausible scale 1.71 to 1.21, BACKTEST.md), and two crystallisable materials' own
// printed values lie outside them: each is its maker's own, read on its sheet, and stands.
const { added } = settleFindings(t, { date: '2026-10-20', accept: [
  { Code: 'EST-OUTLIER', Table: 'materials', Record: 'M067 hdt045', Field: 'measured 100', Reason: 'PET-CF\'s typical product is Flashforge PET-CF at 100 °C, a printed bar its sheet says "has not been annealed": a glassy fibre-filled PET\'s (D176). The model expects about 78; its material heat ranges narrowed when the heat deflections of the plastics that cannot crystallise joined its back-test (D177, m487: plausible scale 1.71 to 1.21), and a PET fill\'s printed bars run 74 to 100 °C (BASF, Raise3D, Flashforge). The value is the maker\'s own and stands.' },
  { Code: 'EST-OUTLIER', Table: 'materials', Record: 'M124 hdt045', Field: 'measured 93', Reason: 'PPS-ESD\'s one product, 3DXTECH 3DXSTAT ESD-PPS, prints 93 °C on a printed specimen with no anneal stated: a PPS printed glassy, at its glass transition (about 90 °C), where the model expects a crystallised PPS\'s 193. Its material heat ranges narrowed when the glassy plastics\' values joined its back-test (D177, m487), which flagged it; the value is the maker\'s own and stands.' },
] });
changed += added;

if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s), ${retyped} value(s) given the counter-indication's Specimen type`);
