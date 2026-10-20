#!/usr/bin/env node
// Migration m489 (2026-10-20): what the second research package's pages print, read into the records (research intake 2,
// stage 3; docs/audits/2026-10-20-research-intake-2/).
//
// The research agent of 2026-10-19 (round 2) read the documents batch b50 registered (m488) and the pages of six sheets
// the catalogue holds, in the reading schema; the executor read Filamentive's store page, which it saved and did not read.
// Claude Opus 5.5 triaged the readings (ingest/intake.mjs). `npm run ingest:read-reconcile` checked each against the page's
// text in every view (Forward AM's and Fiberlogy's image-only pages through their optical reading, ingest:ocr-pass);
// three Claude Sonnet readers read blind a second time every value or setting that decides or that only the image bore
// out, and every second reading agreed but six, which the executor read on the page and settled (summary.md).
// `npm run ingest:read-proposals` mapped what the pages bore out (proposals/r2/), and the executor's review
// (ingest/review-r2.mjs) set Kexcelled's directions by the bars its drawings show, the specimen each document indicates
// (D172), and the cells the pipeline held (proposals/r2-reviewed/, summary.md lists every decision). This migration
// applies that folder:
// - the six new products' values and print recipes: Kexcelled THE K8 OBC, Filamentive Hemp PLA, QIDI PPS-GF20, Forward
//   AM Ultrafuse PP GF30, Sakata PA-NT and PA-CF15;
// - AzureFilm ASA's own data sheet (100 % infill, XY, XZ and ZX), Raise3D's and Polymaker's PA12-CF figures as printed
//   beside annealed, Fiberlogy R PP's current heat deflection (40 °C, at 1.8 MPa on this sheet);
// - fibre loads: Eryone PLA-CF 15 %, eSUN ePLA-CF 15-20 %, MatterHackers PRO Series PA CF 20 %, the new products' own;
// - held sheets' values no row held: COC flex's thermal conductivity and nozzle window, Conductive PLA's three volume
//   resistivities, Nanovia PC-PTFE's tensile strength (F-0037 to F-0039); Braskem FL900PP-CF's "no drying needed" (F-0311);
// - PolyMide PA12-CF's drying "if the filament has absorbed moisture", optional (F-0146), and its 25-50 °C chamber.
// By hand here, the cells no parser reads, each with its Parse review (D115): LEHVOSS's German "needs no temperature-
// controlled build chamber" and Raise3D's PA12 CF printed "without the heating chamber" (on its RMF 500) as no heated
// chamber needed; AzureFilm's "can be printed without an enclosed printer" as no enclosure needed (D168); Prusa's
// "place the printer inside an enclosure" as an enclosure asked for, which ASA's guide reads as the H2C's chamber (D93);
// Sakata's "Enclosed" printer and its drying temperatures printed with "ºC". Filamentive's flexural modulus of "3.8 MPa"
// beside a 3.5 GPa tensile modulus is kept as printed and flagged physically implausible.
//
// applyProposals checks every quote on the cached, hash-checked sheet (with its optical reading as a second view), every
// raw × factor, and the parsers' reading of every profile. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m489-research-intake-2-readings.mjs [--dry-run]
import { join } from 'node:path';
import { openTables, projectRoot, nextId } from '../../scripts/data/table-io.mjs';
import { applyProposals, onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { typedOf } from '../../scripts/lib/profile-settings.mjs';

const MIGRATION = 'm489';
const DIR = join(projectRoot, 'docs/audits/2026-10-20-research-intake-2/proposals/r2-reviewed');
const READ = 'Read 2026-10-20 by the research agent of 2026-10-19 (round 2) and the executor, every deciding or image-only reading read blind a second time by Claude Sonnet readers and settled, every quote checked on the cached sheet; reviewed and applied by Claude Opus 5.5 (research intake 2, stage 3)';
const NP = 'Not published', NA = 'Not applicable';
const t = openTables();

const counts = applyProposals(t, DIR, { migration: MIGRATION, read: READ, date: '2026-10-20' });

// ---- the cells no parser reads, typed by hand with their Parse review ----------------------------------------------
const live = (p) => p.Profile !== 'Retired duplicate record';
const profileOn = (source, grade) => t.rows('profiles').find((p) => live(p) && p.SourceID === source && p.GradeID === grade);
let hand = 0;
/** Sets raw cells, then the typed cells the parsers read, then the typed cells set by hand, which Parse review names. */
function typeByHand(profileId, { raw = {}, typed, review, locator }) {
  const p = t.get('profiles', profileId);
  const want = { ...raw, ...typed };
  if (Object.entries(want).every(([c, v]) => p[c] === v) && p['Parse review'] === review) return;
  for (const [c, v] of Object.entries(raw)) if (p[c] !== v) t.set('profiles', profileId, c, v, { expect: p[c], migration: MIGRATION });
  const parsed = typedOf({ ...t.get('profiles', profileId), 'Nozzle material': NP });
  for (const [c, v] of Object.entries(parsed)) if (!(c in typed) && t.get('profiles', profileId)[c] !== v) t.set('profiles', profileId, c, v, { expect: t.get('profiles', profileId)[c], migration: MIGRATION });
  for (const [c, v] of Object.entries(typed)) if (t.get('profiles', profileId)[c] !== v) t.set('profiles', profileId, c, v, { expect: t.get('profiles', profileId)[c], migration: MIGRATION });
  if (locator && !t.get('profiles', profileId).Locator.includes(locator)) t.set('profiles', profileId, 'Locator', `${t.get('profiles', profileId).Locator}; ${locator}`, { expect: t.get('profiles', profileId).Locator, migration: MIGRATION });
  t.set('profiles', profileId, 'Parse review', review, { expect: t.get('profiles', profileId)['Parse review'], migration: MIGRATION });
  hand++;
}
/** A profile of its own for a statement no parser reads, copied from the product's held profile with every cell unknown. */
function addProfile({ source, grade, like, raw, quote, locator }) {
  const have = profileOn(source, grade);
  if (have) return have.ProfileID;
  onCachedSheet(t, source, quote, MIGRATION);
  const base = t.get('profiles', like);
  if (base.GradeID !== grade) throw new Error(`${MIGRATION}: ${like} is not ${grade}'s`);
  const blank = { 'Nozzle °C': NP, 'Bed °C': NP, 'Chamber °C': NP, Enclosure: NP, Drying: NP, 'Nozzle diameter': NP, Plate: NP, 'Abrasion / clogging': NP, 'Nozzle material': NP };
  const row = { ...base, ...blank, ...raw, ProfileID: nextId('profiles', t.rows('profiles').map((p) => p.ProfileID)), Profile: 'Manufacturer published guidance', SourceID: source, Locator: locator, 'Parse review': NA, 'AMS published': NP, 'Support pairing': NP, 'Failure modes': NP };
  t.append('profiles', { ...row, ...typedOf(row) });
  hand++;
  return row.ProfileID;
}

// LEHVOSS: "Unser Material braucht keinen temperierten Bauraum für den Druckvorgang" (our material needs no temperature-
// controlled build chamber for printing), said of LUVOCOM 3F PPS CF 9938 BK.
const LEHVOSS = 'R-LEHVOSS-INTAKE-20261020-9828d6e2bfd9';
onCachedSheet(t, LEHVOSS, 'Unser Material braucht keinen temperierten Bauraum', MIGRATION);
typeByHand(profileOn(LEHVOSS, 'G073-05').ProfileID, {
  typed: { 'Chamber state': 'not-required', 'Chamber min °C': NA, 'Chamber max °C': NA, 'Chamber requirement': 'none' },
  review: 'Fields: Chamber state, Chamber requirement. The page\'s German, "Unser Material braucht keinen temperierten Bauraum für den Druckvorgang", says the material needs no temperature-controlled build chamber for printing: no heated chamber is needed, which the parser, reading English, does not read (research intake 2, m489).',
});
// Raise3D: "with specifically-developed fiber-reinforced filament such as PA12 CF, Raise3D's RMF 500 can maintain warp-free
// printing quality without the heating chamber". The parser reads the printer's model number as a temperature.
const RAISE = 'R-RAISE3D-INTAKE-20261020-35dfb5b81aeb';
onCachedSheet(t, RAISE, 'without the heating chamber', MIGRATION);
typeByHand(profileOn(RAISE, 'G053-09').ProfileID, {
  typed: { 'Chamber state': 'not-required', 'Chamber requirement': 'none' },
  review: 'Fields: Chamber state, Chamber requirement. The white paper says PA12 CF prints warp-free "without the heating chamber" on Raise3D\'s RMF 500 (p. 11): no heated chamber is needed, on the maker\'s own printer, which the parser does not read (research intake 2, m489).',
  locator: 'p. 11: Cost Efficiency (PA12 CF on the RMF 500 without the heating chamber)',
});
// Sakata 3D: drying temperatures printed with "º" (the ordinal sign) for the degree sign, and PA-CF15's "Type of printer:
// Enclosed".
const SAKATA_CF = 'R-SAKATA-INTAKE-20261020-d6c57de6f438', SAKATA_NT = 'R-SAKATA-INTAKE-20261020-ff205bacb571';
onCachedSheet(t, SAKATA_CF, '> 8 hours at 70 ºC (drybox) | Enclosed', MIGRATION);
typeByHand(profileOn(SAKATA_CF, 'G165-07').ProfileID, {
  raw: { Drying: '> 8 hours at 70 ºC (drybox)', Enclosure: 'Type of printer: Enclosed' },
  typed: { 'Drying °C': '70', 'Enclosure state': 'recommended' },
  review: 'Fields: Drying °C, Enclosure state. The sheet prints the drying temperature with the ordinal sign "º" for the degree sign ("> 8 hours at 70 ºC (drybox)"), which the parser does not read as a temperature: 70 °C, for more than 8 hours. Its print settings answer "Type of printer: Enclosed": an enclosed printer, asked for (research intake 2, m489).',
  locator: 'PRINT SETTINGS (Dry specification, before printing; Type of printer)',
});
onCachedSheet(t, SAKATA_NT, '4 hours at 60ºC (drybox)', MIGRATION);
typeByHand(profileOn(SAKATA_NT, 'G164-12').ProfileID, {
  raw: { Drying: '4 hours at 60ºC (drybox)' },
  typed: { 'Drying °C': '60' },
  review: 'Fields: Drying °C. The sheet prints the drying temperature with the ordinal sign "º" for the degree sign ("4 hours at 60ºC (drybox)"), which the parser does not read as a temperature: 60 °C for 4 hours (research intake 2, m489).',
  locator: 'PRINT SETTINGS (Dry specifications)',
});
// AzureFilm's page: "This material can be printed without an enclosed printer but we strongly recommend using an
// enclosure or enclosed 3D printer." An enclosure its maker does not require is not needed; the recommendation stays in
// the raw column (D168).
const AZURE_PAGE = 'R-AZUREFILM-INTAKE-20261020-b9835e9fa9ec';
const AZURE_WORDS = 'This material can be printed without an enclosed printer but we strongly recommend using an enclosure or enclosed 3D printer.';
typeByHand(addProfile({ source: AZURE_PAGE, grade: 'G031-31', like: 'P0868', raw: { Enclosure: AZURE_WORDS }, quote: AZURE_WORDS, locator: 'ASA filaments (enclosure)' }), {
  typed: { 'Enclosure state': 'not-needed' },
  review: 'Fields: Enclosure state. "This material can be printed without an enclosed printer but we strongly recommend using an enclosure": printable without one, so not needed, with the recommendation kept in the raw column (D168, as Siraya Tech\'s "Not mandatory, but it is recommended" reads); the parser knows "printed without an enclosure" and not "without an enclosed printer" (research intake 2, m489).',
});
// Prusa's ASA article: "One of the best options is to place the printer inside an enclosure." An enclosure asked for, with
// no temperature, for a type Bambu Lab's guide prints enclosed: the H2C's heated chamber (D93).
const PRUSA = 'R-PRUSA-INTAKE-20261020-f8fff41ba5af';
const PRUSA_WORDS = 'One of the best options is to place the printer inside an enclosure.';
if (t.rows('profiles').some((p) => live(p) && p.GradeID === 'G031-20' && !['unknown', 'Not published'].includes(p['Chamber state']) && p.SourceID !== PRUSA)) throw new Error(`${MIGRATION}: another profile of G031-20 states its chamber (D93 declares enclosed only where none does)`);
typeByHand(addProfile({ source: PRUSA, grade: 'G031-20', like: 'P0670', raw: { Enclosure: PRUSA_WORDS }, quote: PRUSA_WORDS, locator: 'Printing inside an enclosure' }), {
  typed: { 'Enclosure state': 'recommended', 'Chamber state': 'enclosed', 'Chamber requirement': 'recommended' },
  review: 'Fields: Enclosure state, Chamber state, Chamber requirement. Prusa\'s article recommends an enclosure for Prusament ASA ("One of the best options is to place the printer inside an enclosure") and states no chamber temperature; for ASA, a type the printer maker\'s guide prints enclosed, the H2C\'s heated, enclosed chamber is that enclosure (D93), recommended in the maker\'s words (research intake 2, m489).',
});

// ---- Raise3D's annealed column: "100℃ Annealed", a temperature the parser does not read with the sign ℃ ------------
let annealed = 0;
for (const m of t.rows('measurements').filter((x) => x.SourceID === RAISE && x['Post-processing state'] === 'annealed')) {
  const review = 'Fields: Anneal °C. The white paper heads the column "100℃ Annealed" (p. 11), a temperature written with the sign ℃, which the parser does not read: 100 °C; it gives no time (research intake 2, m489).';
  if (m['Parse review'] === review) continue;
  if (m['Anneal °C'] !== '100') throw new Error(`${MIGRATION}: ${m.MeasurementID} is not typed 100 °C`);
  t.set('measurements', m.MeasurementID, 'Parse review', review, { expect: m['Parse review'], migration: MIGRATION });
  annealed++;
}

// ---- Filamentive's flexural modulus -------------------------------------------------------------------------------
const HEMP = 'R-FILAMENTIVE-INTAKE-20261020-74ea25479ede';
let flagged = 0;
const flex = t.rows('measurements').find((m) => m.SourceID === HEMP && m.Property === 'Flexural modulus');
if (!flex) throw new Error(`${MIGRATION}: Hemp PLA's flexural modulus was not added`);
if (flex['Data status'] !== 'Published value (physically implausible)') {
  t.set('measurements', flex.MeasurementID, 'Data status', 'Published value (physically implausible)', { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', flex.MeasurementID, 'Notes', `${flex.Notes} Physically implausible (${MIGRATION}): the sheet prints a flexural modulus of "3.8 MPa" beside a tensile modulus of 3.5 GPa for the same PLA; a stiff PLA composite bends at about a thousand times that, so the unit is the sheet's slip. Kept as printed and set apart; the maker is asked (OPEN-PROBLEMS).`, { expect: flex.Notes, migration: MIGRATION });
  flagged++;
}

if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, ...counts, hand, annealed, flagged, written: false }, null, 2)); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, ...counts, hand, annealed, flagged }, null, 2));
