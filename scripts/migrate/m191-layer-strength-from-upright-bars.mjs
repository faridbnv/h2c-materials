#!/usr/bin/env node
// Migration m191 (2026-09-27): a tensile bar its sheet shows or says stood upright is a Z value (D92; OPEN-PROBLEMS
// §18; phase 6, final round).
//
// D92's layer strength counts only Direction Z. Thirty-eight products' across-layer values carried only an XZ or ZX
// label, and which of those are upright bars was not settled: ISO/ASTM 52921 names a bar by the axis along its length
// first, so ZX is upright and XZ lies on its edge, but makers use the labels loosely, and the Direction vocabulary's own
// meanings said otherwise. Every such sheet was re-read on its cached, hash-checked page, and rendered where a drawing
// might say more (docs/audits/2026-09-25-re-center/RESPONSE.md, "Phase 6, final round"). A row becomes Z only where its
// sheet shows or states that the bar stood upright and was pulled along Z, across its layers:
//
// - BASF Forward AM's Ultrafuse PC GF30, PAHT CF15 (v4.0, dry and conditioned tables) and BVOH head the column
//   "Print direction | XY | XZ | ZX" with "Flat | On its edge | Upright".
// - Stratasys's FDM Nylon 12 (a study grade) prints "Flat (XY) On Edge (XZ) Upright (ZX)" over its tensile curves.
// - Essentium's PPS-CF heads the column "Print Orientation ZX" and draws the ZX bar standing upright beside the flat XY
//   and 45/45 bars (p. 1; the drawing is an image, so this migration checks the heading and the reviewer read the
//   rendered page).
// - Two Eryone sheets say what their "X-Z" bar is: "a Z-axis tensile strength approaching 20 MPa" (Hyper Speed Dual
//   Color Silk PLA, X-Z 19.1 MPa) and "its Z-axis tensile strength reaches 34 MPa, ensuring excellent interlayer
//   adhesion" (Dual Color Burnt Titanium PLA, X-Z 34.2 MPa).
//
// Only the tensile rows move (strength, modulus, elongation): they are the bar pulled along Z. The same sheets' upright
// flexural and impact bars keep ZX, which the vocabulary now defines as ISO/ASTM 52921 does. Left as labelled, because
// nothing on the page says how the bar stood: Eryone's other 25 "X-Z" sheets, SUNLU's two "(Z-X)" sheets (their
// drawings show only flat bars), Flashforge HS PLA's "(X-Z)", iSANMATE PEI 9085's "XZ/ZX Orientation", Prusament PVB's
// "Vertical xz" (49 MPa beside a horizontal 50 MPa, and a separate interlayer adhesion of 9 MPa), Markforged Onyx GF's
// XZ (73.7 MPa, above its XY) and Stratasys ABS-M30i's XZ ("Build orientation is on side long edge").
//
// BASF's PAHT CF15 v4.0 sheet is not in every machine's cache: fetch its recorded URL, check it hashes to the SHA-256
// sources.csv holds, and pass its folder with --cache. A re-run without it is a no-op once the rows are written.
//
// The reviewer is an agent, claude-opus-5.5 (agent reviewer); no person has reviewed it. A re-run is a no-op, and a run
// after the data moved stops.
//
//   node scripts/migrate/m191-layer-strength-from-upright-bars.mjs [--cache <folder holding <sha256>.pdf>]

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables } from '../data/table-io.mjs';
import { cachedText, sha256, pdfPages, pageLines } from '../lib/pdf-text.mjs';
import { pageReader } from './printed-on.mjs';
import { correct } from './source-edits.mjs';

const migration = 'm191-layer-strength-from-upright-bars';
const DATE = '2026-09-27';
const extra = process.argv.includes('--cache') ? process.argv[process.argv.indexOf('--cache') + 1] : null;

const UPRIGHT = 'Print direction Standard XY XZ ZX Flat On its edge Upright';
// Source, the label the rows carry, the pages and the words on each that say the bar stood upright, the rows, and the
// note each row gains.
const SHEETS = [
  {
    source: 'R-BASF-PCGF30-TDS', from: 'ZX', says: [[3, UPRIGHT]], ids: ['V001836', 'V001838', 'V001840'],
    note: 'Direction Z, was ZX: p. 3 heads the column "Print direction ZX" with "Upright", a bar printed standing and pulled along Z, across its layers (ISO/ASTM 52921 names it ZX).',
  },
  {
    source: 'R-FORWARDAM-PAHT-CF15-TDS-v4-0', from: 'ZX', says: [[4, UPRIGHT], [5, UPRIGHT]], ids: ['V002466', 'V002468', 'V002470', 'V002492', 'V002494', 'V002496'],
    note: 'Direction Z, was ZX: pp. 4 and 5 head the column "print direction ZX" with "Upright", a bar printed standing and pulled along Z, across its layers (ISO/ASTM 52921 names it ZX).',
  },
  {
    source: 'S-BVOH-ULTRAFUSE-TDS-v1-3', from: 'ZX', says: [[3, UPRIGHT]], ids: ['V002263', 'V002265', 'V002267'],
    note: 'Direction Z, was ZX: p. 3 heads the column "Print direction ZX" with "Upright", a bar printed standing and pulled along Z, across its layers (ISO/ASTM 52921 names it ZX).',
  },
  {
    source: 'R-STRATASYS-FDM-NYLON12-MDS', from: 'ZX', says: [[5, 'Flat (XY) On Edge (XZ) Upright (ZX)']], ids: ['V002007', 'V002009', 'V002011', 'V002013', 'V002015'],
    note: 'Direction Z, was ZX: p. 5 names its orientations "Flat (XY) On Edge (XZ) Upright (ZX)", so the ZX bar stood upright and was pulled along Z, across its layers.',
  },
  {
    source: 'R-ESSENTIUM-PPSCF-TDS', from: 'ZX', says: [[1, 'Print Orientation Metric Test Method XY 45/45 ZX']], ids: ['V001864', 'V001867', 'V001870'],
    note: 'Direction Z, was ZX: p. 1 heads the column "Print Orientation ZX" and draws the ZX bar standing upright beside the flat XY and 45/45 bars, so it was pulled along Z, across its layers.',
  },
  {
    source: 'R-ERYONE-eryone-hyper-speed-dual-color-silk-pla-tds', from: 'XZ', says: [[1, 'with a Z-axis tensile strength approaching 20 MPa'], [2, 'Tensile strength X-Z']], ids: ['V004872', 'V004873', 'V004874'],
    note: 'Direction Z, was XZ: p. 1 calls the sheet\'s X-Z value its "Z-axis tensile strength approaching 20 MPa" (p. 2 prints X-Z 19.1 MPa), so the X-Z bar is the one pulled along Z, across its layers.',
  },
  {
    source: 'R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250909-eryone-', from: 'XZ', says: [[1, 'its Z-axis tensile strength reaches 34 MPa, ensuring excellent interlayer adhesion'], [2, 'Tensile strength X-Z']], ids: ['V005104', 'V005105', 'V005106'],
    note: 'Direction Z, was XZ: p. 1 says "its Z-axis tensile strength reaches 34 MPa, ensuring excellent interlayer adhesion" (p. 2 prints X-Z 34.2 MPa), so the X-Z bar is the one pulled along Z, across its layers.',
  },
];
const TENSILE = new Set(['Tensile strength (endpoint unspecified)', 'Tensile yield strength', 'Tensile break strength', 'Tensile modulus', 'Elongation at break', 'Elongation at yield']);

const t = openTables();

// A document this machine's cache does not hold, read from --cache after its digest is checked.
const texts = new Map();
for (const { source, ids } of SHEETS) {
  const s = t.get('sources', source);
  if (cachedText(s.SHA256) || ids.every((id) => t.get('measurements', id).Direction === 'Z')) continue;
  const path = extra && join(extra, `${s.SHA256}.pdf`);
  if (!path || !existsSync(path)) throw new Error(`${migration}: ${source} is not cached; fetch ${s.URL}, check it hashes to ${s.SHA256}, and pass its folder with --cache`);
  const bytes = readFileSync(path);
  if (sha256(bytes) !== s.SHA256) throw new Error(`${migration}: ${path} does not hash to ${s.SHA256}`);
  texts.set(s.SHA256, { pages: (await pdfPages(bytes)).map(({ page, spans }) => ({ page, lines: pageLines(spans) })) });
}
const printed = pageReader(t, migration, { texts });

let changed = 0;
for (const sheet of SHEETS) {
  const pending = sheet.ids.filter((id) => t.get('measurements', id).Direction !== 'Z');
  if (!pending.length) continue;
  for (const [page, words] of sheet.says) if (!printed(sheet.source, page, words)) throw new Error(`${migration}: "${words}" is not printed on p. ${page} of ${sheet.source}`);
  for (const id of pending) {
    const m = t.get('measurements', id);
    if (!TENSILE.has(m.Property)) throw new Error(`${migration}: ${id} is ${m.Property}, not a tensile bar's value`);
    if (!/^Published value/.test(m['Data status'])) throw new Error(`${migration}: ${id} is ${m['Data status']}`);
    if (!sheet.says.some(([page]) => m.Locator.includes(`p. ${page}:`)) && !/^Table \d/.test(m.Locator)) throw new Error(`${migration}: ${id}'s locator "${m.Locator}" is not on a page this sheet's words are checked on`);
  }
  changed += correct(t, { source: sheet.source, ids: pending, set: { Direction: [sheet.from, 'Z'] }, note: sheet.note, migration, date: DATE });
}

if (changed) t.save();
console.log(`${migration}: ${changed} tensile row(s) of ${SHEETS.length} sheets are Z (${SHEETS.reduce((n, s) => n + s.ids.length, 0)} pinned)`);
