// b46: FormFutura CarbonFil's data sheet of 23-8-2024, admitted through the import pipeline (screening build, stage 2a;
// the screening review's change C14, finding F26).
//
// The document is 3DJake's copy of FormFutura's own sheet (a scan with an optical text layer), fetched by the V2 import on
// 2026-09-17 and registered under S-PET-TDS-CarbonFil "as a revision or a copy" of the sheet already held
// (docs/audits/2026-09-18-v2-import/ledger.csv, doc_key 7b525961687e2d89). It is a later revision of that sheet, with
// other values: 15 % carbon fibre where the earlier one says 20 %, a specific gravity of 1,32 where it says 1.19. A later
// revision enters as a source of its own (OPEN-PROBLEMS §34.3), so it is admitted here, on the product it describes
// (G024-21), and the earlier revision's rows stay.
//
// Claude Opus 5.5 read the page on its image (rendered at 110 dpi) and on the cached optical text, value by value; the
// screening build's re-read dossier (a Claude Sonnet reader, 2026-10-18) read it too and agrees on every number. Two rows
// name a test their label does not, and are held back (Data status "Unresolved unit / layout"), as Extrudr's Izod rows whose
// label and standard disagree on the notch were (m63): the flexural modulus cites ISO 527-1, the tensile standard, and the
// Charpy row cites ISO 179-1eU, the unnotched designation, beside "Charpy notched".
//
//   node docs/audits/2026-10-18-screening-build/ingest/build-b46.mjs
//
// It writes proposals/b46/<sha16>.json and b46-packet.json (the packet the migration pins), and pins the packet in the
// migration.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BY, DATE, NA, NP, cachedText, meas, profile, stamp, tables as t } from './b46-lib.mjs';

const HERE = 'docs/audits/2026-10-18-screening-build/ingest';
const OUT = `${HERE}/proposals/b46`;
const MIGRATION = 'scripts/migrate/m442-batch-b46-carbonfil-2024.mjs';
const SHA = '7b525961687e2d89acfe803787048a946bed15cf0ceddedc36941ea9fd893270';
const URL = 'https://3d.nice-cdn.com/upload/file/formfutura-tds-carbonfil[0].pdf';
const SOURCE_ID = `R-FORMFUTURA-SB-20261018-${SHA.slice(0, 12)}`;
const GRADE = 'G024-21';
const sha = (b) => createHash('sha256').update(b).digest('hex');

const text = cachedText(SHA);
if (!text) throw new Error('no cached text for the CarbonFil 2024 sheet; restore the source cache');
const grade = t.get('grades', GRADE);
if (grade.Manufacturer !== 'FormFutura' || grade['Product name'] !== 'CarbonFil') throw new Error(`${GRADE} is no longer FormFutura CarbonFil`);
const ctx = { sourceId: SOURCE_ID, materialId: grade.MaterialID };

// ---- the values the page prints, each with its row as printed --------------------------------------------------
const NOT_TENSILE = 'The row is labelled "Flexural modulus" and cites ISO 527-1, the tensile test\'s standard, not ISO 178 or ASTM D790; the sheet\'s earlier revision printed a tensile modulus (9495 MPa) and no flexural one, and this one leaves its "Tensile modulus" row empty. Which modulus the 4250 MPa is cannot be read from the page, and the two differ on a printed bar, so the row is held back and backs nothing (screening build C14, D149).';
const NOTCH = 'The row\'s condition reads "Charpy notched 23°C" and the method it names, ISO 179-1eU, is ISO 179\'s unnotched (edgewise) designation; the sheet\'s own word for the notch is kept and the row is held back, as Extrudr\'s rows whose label and standard disagree on the notch are (m63).';
const values = [
  { property: 'Density', label: 'Specific gravity', unit: 'g/cm3', raw: '1,32', num: 1.32, std: 'ISO 1183',
    line: 'Specific gravity 1,32 g/cm3 ISO 1183', specimenType: 'Not published (density specimen form not explicitly established)' },
  { property: 'Charpy strength', label: 'Impact strenght', unit: 'kJ/m²', raw: '5.4', num: 5.4, std: 'ISO 179-1eU', notch: 'Notched', testTemp: '23°C',
    line: 'Impact strenght 5.4 kJ/m2 ISO 179-1eU Charpy notched 23°C', direction: 'Unstated', status: 'Unresolved unit / layout', notes: NOTCH },
  { property: 'Tensile break strength', label: 'Tensile strenght at break', unit: 'MPa', raw: '45', num: 45, std: 'ISO 527-1',
    line: 'Tensile strenght at break 45 MPa ISO 527-1', direction: 'Unstated' },
  { property: 'Elongation at break', label: 'Elongation at break', unit: '%', raw: '4,9', num: 4.9, std: 'ISO 527-1',
    line: 'Elongation at break 4,9 % ISO 527-1', direction: 'Unstated' },
  { property: 'Flexural modulus', label: 'Flexural modulus', unit: 'MPa', raw: '4250', num: 4250, std: 'ISO 527-1',
    line: 'Flexural modulus 4250 MPa ISO 527-1', direction: 'Unstated', status: 'Unresolved unit / layout', notes: NOT_TENSILE },
  { property: 'Vicat softening temperature', label: 'Vicat softening temperature', unit: '°C', raw: '80', num: 80, std: 'ISO 306',
    line: 'Vicat softening temperature 80 °C ISO 306' },
];
const measurements = values.map((v) => stamp(meas(ctx, { page: 1, ...v, locator: `p. 1: ${v.label}` }), text, {
  visual: true, visualNote: 'The document is a scan: every number was read on the rendered page image and on its optical text layer.',
}));
measurements.forEach((m, i) => { m.id = `m${String(i + 1).padStart(3, '0')}`; });

// ---- the print settings the page recommends (its "Recommended pretreatment", "Print with" and "Recommended print
// settings regular speed" blocks); they are the product's guidance, not a test bar's ----------------------------------
const profiles = [profile(ctx, {
  page: 1, locator: 'Recommended pretreatment, Print with, Recommended print settings regular speed',
  cells: { nozzle: '230 - 275 °C', bed: '80 - 90 °C', enclosure: 'Yes', drying: 'Recommended 40 - 60 °C 12 h' },
  lines: { nozzle: 'Nozzle temperature 230 -275°C', bed: 'Bed temperature 80-90 °C', enclosure: 'Enclosure Yes', drying: 'Drying Recommended 40 - 60 °C 12 h' },
  notes: [['Speed', 'Print speed 25 - 70 mm/s'], ['Cooling', 'Fan speed 0 - 50 %'], ['Storage humidity', 'Print with Dry box No']],
  evidence: 'Recommended print settings regular speed',
})];

const sourceRow = {
  SourceID: SOURCE_ID, Publisher: 'FormFutura', Title: 'Technical Data Sheet CarbonFil', Revision: 'Date of update: 23-8-2024 (date of issue 15-1-2021)',
  'Publication date': '2024-08-23', 'Access date': '2026-09-17', 'Source class': 'Manufacturer TDS',
  'Source note': 'FormFutura\'s one-page technical data sheet for CarbonFil, updated 23-8-2024, as the retailer 3DJake serves it (linked from its product page https://www.3djake.com/formfutura/carbonfil-grey): a scan with an optical text layer. It describes CarbonFil as "a 15% carbon fiber reinforced PETG based 3D printer filament" and prints material properties (specific gravity, Charpy, tensile strength and elongation at break, a flexural modulus, Vicat) and recommended drying, enclosure and print settings. A later revision of S-PET-TDS-CarbonFil (undated, 20 % carbon fibre, specific gravity 1.19), whose rows stay.',
  'Citation role': 'cited', URL, Locator: 'Document / product page', 'Applicable grades': `${grade.MaterialID} / ${GRADE}`, 'Access state': 'retrieved',
  'Access note': `Fetched 2026-09-17 by the V2 import from 3DJake's copy (docs/audits/2026-09-18-v2-import/ledger.csv, doc_key 7b525961687e2d89), hash-checked; its text is an optical reading (ocrmypdf, 2026-09-19). Registered under S-PET-TDS-CarbonFil as a revision until batch b46 admitted it as a source of its own (${DATE}, screening build C14).`,
  SHA256: SHA,
};

const proposal = {
  version: 1, generated: { tool: 'build-b46.mjs (screening build 2026-10-18)', date: DATE },
  document: { sha256: SHA, url: URL, pages: text.pages.length, provider: '3DJake / 3DJAKE', manufacturer: 'FormFutura', docKey: '7b525961687e2d89' },
  identity: { polymer: null, materialId: grade.MaterialID, note: 'Exact product G024-21 (FormFutura CarbonFil) of M024 PETG-CF; identity unchanged ("CarbonFil is a 15% carbon fiber reinforced PETG based 3D printer filament").' },
  source: { row: sourceRow, evidence: { page: 1, text: 'CarbonFil is a 15% carbon fiber reinforced PETG based 3D printer filament that is extremely stiff.' }, review: { status: 'accepted', by: BY, date: DATE } },
  grades: [{ key: 'main', row: { ...grade }, review: { status: 'accepted', by: BY, date: DATE, visual: true, note: 'Existing exact product, named on the page image ("CarbonFil", FormFutura); its rows belong on the grade that is there (a later revision of its sheet).' } }],
  measurements, profiles, evidence: [], headlines: [], coverage: [], settings: [], acceptances: [],
  skipped: [
    { note: 'Rows the sheet leaves empty (density, melt flow rate, tensile strength at yield, tensile modulus, elongation at yield, flexural strength, Rockwell hardness, melting, heat deflection and glass transition temperatures): nothing printed, nothing recorded.' },
    { note: 'Key features ("10% more impact resistant than HDglass", "Very easy to print", "Great dimensional stability") and suitable applications (Automotive, Aviation & Heavy industry): marketing statements, left in the record tier.' },
    { note: 'The 15 % carbon fibre is the product\'s composition: it goes to the grade\'s Composition / filler with the migration, beside the earlier revision\'s 20 % (the fibre content as a number is stage 2b\'s, C37).' },
  ],
  review: { status: 'reviewed', by: BY, date: DATE, note: `Read on the page image and against the cached optical text: ${measurements.length} value(s) (two held back, their label and their standard naming different tests) and ${profiles.length} print profile for G024-21; 3 omission(s) are reasoned in skipped.` },
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const name = `${SHA.slice(0, 16)}.json`;
const body = `${JSON.stringify(proposal, null, 2)}\n`;
writeFileSync(join(OUT, name), body);
const packet = {
  PacketID: 'b46-screening-build', Batch: 'b46',
  Documents: [{ File: name, ProposalSHA256: sha(body), OriginalSHA256: SHA, Source: sourceRow,
    Grades: [{ Key: 'main', GradeID: GRADE, MaterialID: grade.MaterialID, Manufacturer: grade.Manufacturer, 'Product name': grade['Product name'] }],
    Values: measurements.length, Profiles: profiles.length, Skipped: proposal.skipped.map((s) => s.note) }],
  Totals: { Documents: 1, NewGrades: 0, Values: measurements.length, Profiles: profiles.length },
  NewVocabulary: [],
  Review: { prepared_by: BY, scope: 'one document: the 2024 revision of FormFutura CarbonFil\'s data sheet, already fetched and registered as a revision (screening build C14)' },
  NotAdmitted: [],
};
const packetBody = `${JSON.stringify(packet, null, 2)}\n`;
writeFileSync(`${HERE}/b46-packet.json`, packetBody);
console.log(`1 proposal, ${measurements.length} values, ${profiles.length} profile; packet sha ${sha(packetBody).slice(0, 12)}`);
writeFileSync(MIGRATION, readFileSync(MIGRATION, 'utf8').replace(/const PACKET_SHA256 = '[^']*';/, `const PACKET_SHA256 = '${sha(packetBody)}';`));
