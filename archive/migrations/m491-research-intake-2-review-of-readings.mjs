#!/usr/bin/env node
// Migration m491 (2026-10-20): what the lint found in the readings m489 wrote, and the products m490 re-filed, each fixed or
// accepted with its reason (research intake 2, stage 3; docs/audits/2026-10-20-research-intake-2/). Read by Claude Opus
// 5.5 on the cached pages.
//
// - QIDI PPS-GF20 prints Polymaker Fiberon PPS-GF20's table: the same density, melt flow, Vicat, heat deflection and XY
//   tensile figures to the decimal, and its "Impact Strength (X-Y)" is Fiberon's Charpy XY (27.3 kJ/m²). Two products of
//   one material printing one table are twins (R053): QIDI's grade joins Fiberon's Shared formulation key, and its copies
//   of Fiberon's figures are retired as duplicates of Fiberon's rows, which carry the condition Fiberon's sheet states
//   (annealed at 130 °C for 10 hours); QIDI reads them as its twin's (D89), and its own print recipe stands.
// - Forward AM's unnotched Izod on the XZ bar (2.4 kJ/m²) is below its own notched Izod on the same bar (6.2), and a tenth
//   of the unnotched Charpy on that bar (25.8): a notch cannot make a bar tougher. Kept as printed, flagged physically
//   implausible (MEAS-PHYSICS-NOTCH).
// - Raise3D Industrial PA12 CF's data sheet prints its heat deflections (131 °C at 0.45 MPa, 105 °C at 1.8 MPa) without
//   their condition; its white paper prints the same figures as the 100 °C-annealed bars'. The data sheet's copies are
//   retired as duplicates of the white paper's rows (the build's calibration check found them: below).
// - Accepted with their reasons: the physics windows the new values and the re-filed Essentium PA-CF meet, and the
//   tables makers reprint across materials (GRADE-VALUES-TWIN; a key never spans two materials, R166).
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m491-research-intake-2-review-of-readings.mjs [--dry-run]
import { openTables } from '../../scripts/data/table-io.mjs';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';
import { settleFindings } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm491';
const DATE = '2026-10-20';
const t = openTables();
const out = { keyed: 0, flagged: 0, retired: 0 };

// ---- QIDI PPS-GF20, a twin of Fiberon PPS-GF20 --------------------------------------------------------------------
onSheet(t, 'R-QIDI-INTAKE-20261020-4bdb6fe222df', 'Tensile Strength(X-Y) 64.1±2.1 MPa | Tensile Modulus (X-Y) 4552.0±54.6 MPa | Impact Strength (X-Y) 27.3±1.1', MIGRATION);
const KEY = 'S-FIBER-PPSGF-TDS-2';
if (t.get('grades', 'G074-02')['Shared formulation key'] !== KEY) throw new Error(`${MIGRATION}: Fiberon PPS-GF20's key moved`);
if (t.get('grades', 'G074-03')['Shared formulation key'] !== KEY) {
  t.set('grades', 'G074-03', 'Shared formulation key', KEY, { expect: 'R-QIDI-INTAKE-20261020-4bdb6fe222df', migration: MIGRATION });
  out.keyed++;
}

// ---- Forward AM's unnotched Izod, XZ ------------------------------------------------------------------------------
const BASF = 'R-FORWARDAM-INTAKE-20261020-bd7cbd47d8e7';
const izod = t.rows('measurements').filter((m) => m.SourceID === BASF && m.Property === 'Izod impact strength' && m.Direction === 'XZ');
const unnotched = izod.find((m) => m.Notch === 'Unnotched'), notched = izod.find((m) => m.Notch === 'Notched');
if (!unnotched || !notched || unnotched['Normalized value'] !== '2.4' || notched['Normalized value'] !== '6.2') throw new Error(`${MIGRATION}: Forward AM's XZ Izod rows are not the ones read`);
if (unnotched['Data status'] !== 'Published value (physically implausible)') {
  t.set('measurements', unnotched.MeasurementID, 'Data status', 'Published value (physically implausible)', { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', unnotched.MeasurementID, 'Notes', `${unnotched.Notes} Physically implausible (${MIGRATION}): the unnotched Izod of the XZ bar (2.4 kJ/m²) is below the notched Izod of the same bar (6.2, ${notched.MeasurementID}) and a tenth of the unnotched Charpy of that bar (25.8); a notch cannot make a bar tougher. Two readers read 2.4 from the image; kept as printed and set apart.`, { expect: unnotched.Notes, migration: MIGRATION });
  out.flagged++;
}

// ---- Raise3D's data sheet figures the white paper labels annealed ---------------------------------------------------
// The data sheet (V3.0) prints Industrial PA12 CF's heat deflection, 131 °C at 0.45 MPa and 105 °C at 1.8 MPa, in its
// filament table, without saying how the bars were made or treated (set apart since D172). Raise3D's white paper prints
// the same two figures for the same product in its "100℃ Annealed" column, beside 90 °C as printed (m489). The data
// sheet's copies are the same measurements without their condition: read as possibly as printed, they made the estimate
// model take the product's as-printed heat deflection for anywhere from 90 to 131 °C, and the heat ranges of the
// crystalline unfilled products lost their calibration (EST-CALIBRATION, hdt045 semi-unfilled, 63 % of 27). They are
// retired as duplicates of the white paper's rows, which say what they are.
const RAISE = 'R-RAISE3D-INTAKE-20261020-35dfb5b81aeb';
onSheet(t, 'D-RAISE3D-Raise3D-Industrial-PA12-CF-TDS-V3-0-0b3967', 'ISO75 1.8MPa 105 | ISO75 0.45 MPa 131', MIGRATION);
onSheet(t, RAISE, 'HDT @ 0.45 MPa 131℃ | HDT @ 1.8 MPa / 105℃', MIGRATION);
for (const [held, load, value] of [['V013939', '0.45', '131'], ['V013938', '1.8', '105']]) {
  const m = t.get('measurements', held);
  const twin = t.rows('measurements').find((x) => x.SourceID === RAISE && x.Property === 'HDT' && x['Test load MPa'] === load && x['Post-processing state'] === 'annealed' && x['Normalized value'] === value);
  if (!twin) throw new Error(`${MIGRATION}: the white paper's annealed HDT at ${load} MPa is not recorded`);
  if (m['Data status'] === 'Retired duplicate record') continue;
  if (m.GradeID !== 'G053-09' || m['Normalized value'] !== value || m['Test load MPa'] !== load) throw new Error(`${MIGRATION}: ${held} moved`);
  t.set('measurements', held, 'Data status', 'Retired duplicate record', { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', held, 'Notes', `${m.Notes} Retired duplicate record (${MIGRATION}): Raise3D's white paper prints this figure for the same product in its "100℃ Annealed" column (${twin.MeasurementID}, which stays), beside ${load === '0.45' ? '90 °C' : '"/"'} as printed; the data sheet prints it without its condition.`, { expect: m.Notes, migration: MIGRATION });
  out.retired++;
}

// ---- QIDI's reprint of Fiberon's table, recorded once (R053) ------------------------------------------------------
// Every value QIDI's page prints is a figure of Fiberon PPS-GF20's sheet, which states the bars were annealed at 130 °C
// for 10 hours (QIDI's page recommends that post-processing and does not say its figures were measured after it). R053
// records a table once, on one product of the formulation: QIDI's copies are retired as duplicates of Fiberon's rows, and
// QIDI reads them, with their annealed state, as Fiberon's twin (D89). Recorded as QIDI's own, they would have read as
// not stated and passed an as-printed question on Fiberon's annealed figures.
const QIDI = 'R-QIDI-INTAKE-20261020-4bdb6fe222df';
const TWINS = { 'Fibre content': 'V015544', Density: 'V001391', 'Melt mass-flow rate': 'V002074', 'Vicat softening temperature': 'V002070', HDT: 'V002071', 'Tensile strength (endpoint unspecified)': 'V001395', 'Tensile modulus': 'V001393', 'Elongation at break': 'V001397', 'Impact strength': 'V001404' };
for (const m of t.rows('measurements').filter((x) => x.SourceID === QIDI)) {
  const twin = TWINS[m.Property];
  if (!twin) throw new Error(`${MIGRATION}: QIDI's ${m.Property} has no Fiberon row named`);
  if (m['Data status'] === 'Retired duplicate record') continue;
  const f = t.get('measurements', twin);
  if (f.GradeID !== 'G074-02' || Number(f['Normalized value']) !== Number(m['Normalized value'])) throw new Error(`${MIGRATION}: ${m.MeasurementID} is not ${twin}'s figure`);
  t.set('measurements', m.MeasurementID, 'Data status', 'Retired duplicate record', { expect: m['Data status'], migration: MIGRATION });
  t.set('measurements', m.MeasurementID, 'Notes', `${m.Notes} Retired duplicate record (${MIGRATION}): QIDI's page reprints Polymaker Fiberon PPS-GF20's table; the figure is ${twin}'s, which stays, with the condition Fiberon's sheet gives it (R053, D89).`, { expect: m.Notes, migration: MIGRATION });
  out.retired++;
}

// ---- findings accepted with their reasons ------------------------------------------------------------------------
const byLocator = (source, locator) => {
  const m = t.rows('measurements').find((x) => x.SourceID === source && x.Locator.startsWith(locator) && x['Data status'] !== 'Retired duplicate record');
  if (!m) throw new Error(`${MIGRATION}: no row "${locator}" on ${source}`);
  return m.MeasurementID;
};
const KEX = 'R-KEXCELLED-INTAKE-20261020-92a1f96a864b';
const KEX_STIFF = 'THE K8 OBC\'s own sheet prints a tensile modulus of 200-400 MPa and a flexural modulus of 300-400 MPa on printed bars (p. 2): an olefin block copolymer this stiff is a flexible polyolefin, not a rubber, so';
const kexHdt = t.rows('measurements').find((m) => m.SourceID === KEX && m.Property === 'HDT').MeasurementID;
const kexFlex = t.rows('measurements').filter((m) => m.SourceID === KEX && m.Property === 'Flexural modulus' && m['Normalized value'] === '0.3').map((m) => m.MeasurementID);
const sakataWater = t.rows('measurements').filter((m) => /^R-SAKATA-INTAKE-20261020-/.test(m.SourceID) && m.Property === 'Water absorption').map((m) => m.MeasurementID);
// The rows the window flags (a ZX flexural bar has a window of its own, which 0.56 GPa meets).
const essentium = ['V014714', 'V014715', 'V014716', 'V014726', 'V014727'];
for (const id of essentium) if (t.get('measurements', id).GradeID !== 'G165-05') throw new Error(`${MIGRATION}: ${id} is not Essentium PA-CF's`);
const raiseElong = t.rows('measurements').find((m) => m.SourceID === 'R-RAISE3D-INTAKE-20261020-35dfb5b81aeb' && m.Property === 'Elongation at break' && m['Post-processing state'] === 'as-printed').MeasurementID;
const fiberlogyHdt = t.rows('measurements').find((m) => m.SourceID === 'R-FIBERLOGY-INTAKE-20261020-f5fc266cf423' && m.Property === 'HDT').MeasurementID;
const W = (Record, Reason) => ({ Code: 'MEAS-PHYSICS-WINDOW', Table: 'measurements', Record, Field: 'Normalized value', Reason });
const accept = [
  W(kexHdt, `${KEX_STIFF} its heat deflection at 0.45 MPa (58 °C, ISO 75, p. 1) is a figure its bar can give; the elastomer window assumes a rubber's stiffness (research intake 2, m491).`),
  ...kexFlex.map((id) => W(id, `${KEX_STIFF} a flexural modulus of 300-400 MPa is what it prints (research intake 2, m491).`)),
  ...sakataWater.map((id) => W(id, 'Sakata prints water absorption to ISO 62 beside a separate moisture absorption: the immersion figure of a copolyamide, which saturates near 8 to 10 %, as nylon 6 does (research intake 2, m491).')),
  ...essentium.map((id) => W(id, 'Essentium PA-CF\'s own sheet prints these moduli for printed bars at 45/45, YX and Z (the XY figure apart); a printed bar\'s stiffness falls with its voids and its layer bonding. The window applies since m490 filed the product under PA6/66-CF, as its safety data sheet names it; the figures are as printed and were held under M165 without one (research intake 2, m491).')),
  W(raiseElong, 'Raise3D\'s white paper prints 34 % at break for PA12 CF as printed and 4 % annealed (p. 11): an unannealed long-chain nylon\'s bar stretches before it breaks, and annealing takes it away (research intake 2, m491).'),
  W(fiberlogyHdt, 'Fiberlogy\'s current sheet prints 40 °C at 1.8 MPa for R PP, a recycled polypropylene, where its product page labels the same 40 °C at 0.45 MPa (OPEN-PROBLEMS): at 1.8 MPa a polypropylene deflects near 45 to 60 °C, so 40 °C is low and is what the sheet prints; the bar is undescribed and set apart (D172) (research intake 2, m491).'),
];
const TWIN = (a, b, Reason) => ({ Code: 'GRADE-VALUES-TWIN', Table: 'grades', Record: `${a} | ${b}`, Field: 'Shared formulation key', Reason });
const RESIN = 'Filamentive Hemp PLA\'s sheet prints the figures many makers reprint from their PLA resin\'s data sheet (density 1.24, melt flow 6, tensile 53 and 60 MPa, 3.5 GPa, 6 %, Izod 16 J/m, flexural 83 MPa, heat deflection 55 °C, glass transition 55-60 °C); the products are of other materials, and a key never spans two materials (R166) (research intake 2, m491).';
const PA6 = (other) => `Sakata 3D's PA-NT sheet prints ${other}'s table (density, tensile, flexural, Charpy and heat deflection alike): another maker's reprint of a nylon table, kept as Sakata's own product under the maker-undisclosed home its maker's words ("unfilled copolyamide") give; a key never spans two materials (R166) (research intake 2, m491).`;
accept.push(
  ...['G013-02', 'G001-69', 'G001-162', 'G016-05', 'G012-07'].map((g) => TWIN(g, 'G152-03', RESIN)),
  TWIN('G049-02', 'G164-12', PA6('FormFutura STYX PA6')),
  TWIN('G049-03', 'G164-12', PA6('Spectrum PA6 Low Warp')),
  TWIN('G050-03', 'G165-07', 'Sakata 3D\'s PA-CF15 sheet prints Spectrum PA6 Low Warp CF15S\'s table (density, tensile, flexural, Charpy and heat deflection alike): another maker\'s reprint, kept as Sakata\'s own product under the maker-undisclosed home its maker\'s words ("copolyamide") give; a key never spans two materials (R166) (research intake 2, m491).'),
);
accept.push({ Code: 'EST-FAMILY-ORDER', Table: 'materials', Record: 'M156 tensileModulusXY', Field: '', Reason: 'PA6/66-CF (M156) holds Essentium PA-CF since m490 filed it there, as its safety data sheet names "Polyamide (PA 6/66)": its printed XY bar\'s 2.16 ± 0.15 GPa (ISO 527) is the material\'s one tensile modulus, beside unfilled PA6/66\'s 2.34 GPa, which other makers\' bars give. One product\'s sheet, and makers\' test methods, not a fibre\'s effect; eSUN\'s ePA-CF publishes no modulus that would show the fill (research intake 2, m491).' });
// Essentium PA-CF left the maker-undisclosed carbon-fibre home, so its order below the unfilled one no longer occurs.
const drop = [{ Code: 'EST-FAMILY-ORDER', Table: 'materials', Record: 'M165 tensileModulusXY', Field: '' }];
const settled = settleFindings(t, { date: DATE, accept, drop });

if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, ...out, settled, written: false }, null, 2)); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, ...out, settled }, null, 2));
