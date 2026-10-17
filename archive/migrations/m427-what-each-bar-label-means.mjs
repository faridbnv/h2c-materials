#!/usr/bin/env node
// Migration m427 (2026-10-17): test-bar labels typed by the rule of D92 and D140, sheet by sheet (data review fixes,
// item 9; read by two Claude Sonnet readers on every cached sheet and its rendered drawings, judged by Claude Opus).
//
// The reviewers saw AzureFilm's "(ZX Value)" typed Z beside 3D-Fuel Pro PLA's "ZX Axis" kept ZX, and 3D-Fuel's "YX Axis"
// shown as "orientation not stated". The rule: a tensile bar is Z only where its sheet says or shows it stood upright
// (m191, D92), an XZ or ZX bar is otherwise kept as its label and shown, not compared (D140), and Eryone's template "X-Z"
// tensile bar is Z by the owner's ruling (D123). 487 rows with an XZ, ZX or YX label were read again; 82 changed:
// - Upright tensile bars left ZX (48). Their sheets say or show the bar stood upright, and most of their siblings on the
//   same sheet are Z already: Stratasys's ULTEM 1010, PC-ABS, PC, ABS-M30 and HIPS sheets draw "Flat (XY) On Edge (XZ)
//   Upright (ZX)" and head their tables "XZ Orientation | ZX Orientation" (32 rows); AzureFilm's four 3DJake sheets draw
//   the ZX bar standing beside the flat XY and on-edge XZ ones (5); Raise3D heads the column "(ZX, Upright)" (7);
//   Essentium's TPU 80A-Z and 95A-Z draw the ZX bar standing and say "ZX: Traces aligned orthogonal to major length" (2);
//   BASF's BVOH Extended TDS says "The orientation of the 3D printed part in the printer is always aligned with the longest
//   axis first" (1); BASF's HiPS heads its columns "Flat | On its edge | Upright" (1). And Eryone's "X-Z" tensile rows
//   on eight sheets of its template that entered after m301 (20; two of the sheets say "Z-axis tensile strength").
// - YX (13): Essentium's PA and PA-CF sheets print a YX column beside XY and ZX and draw the YX bar lying flat; 3D-Fuel
//   Pro PLA heads a "YX Axis" column beside its "XY Axis". By ISO/ASTM 52921 a YX bar lies flat with its length along Y,
//   another bar than the XY one: it is recorded YX, a new value of the Direction vocabulary (D143), shown and compared
//   with nothing, where "Stated, not a usable direction" had shown it as not stated.
// - Raise3D Industrial PPS-CF's flexural strength of 30.0 ± 5 MPa stands in the column headed "(ZX, Flat)" and was typed
//   XY (1): it is ZX, as its label.
// Kept, with why: QIDI's three PETG sheets head a "Z-X Axis" column and draw a standing "Z axis" bar, but nothing ties
// the drawing to that column rather than to "X-Z" (9 rows stay ZX); Raise3D's Hyper Speed PET CF, PETG CF and
// Industrial PPS CF head their first table "(ZX, Flat)" and draw ZX upright (9 stay ZX: the sheets contradict
// themselves); Flashforge ASA-GF10's "X-Z" rows and 3D4Makers' starred PI rows are "not usable" for the reasons their
// Notes give. Each sheet's label is checked on the cached sheet; a drawing is an image, which the readers rendered. A
// re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m427-what-each-bar-label-means.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { withNote } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm427';
const DATE = '2026-10-17';
const UNUSABLE = 'Stated, not a usable direction';
// [rows, from, to, the label or statement on the sheet, why]
const STRATASYS = 'the sheet draws its bars "Flat (XY) On Edge (XZ) Upright (ZX)" and heads the table "XZ Orientation | ZX Orientation": the ZX tensile bar stood upright and was pulled across its layers (m191, D92)';
const AZURE = 'the sheet draws the ZX bar standing upright beside the flat XY and on-edge XZ bars, under its "XY Value | XZ Value | ZX Value" table, as its tensile strength and modulus rows record (D92)';
const RAISE = 'the sheet heads the column "(ZX, Upright)", as its tensile strength and modulus rows record (D92)';
const ERYONE = 'Eryone\'s template labels its upright tensile bar "X-Z" (D123, the owner\'s ruling of 2026-10-02); this sheet prints the template\'s "Mechanical Properties of Printed Samples" table';
const GROUPS = [
  [['V014883', 'V014884', 'V014886', 'V014899', 'V014900', 'V014902', 'V014903', 'V014905'], 'ZX', 'Z', 'R-STRATASYS-mds-fdm-ultem-1010-resin-0626a', 'Flat (XY) On Edge (XZ) Upright (ZX)', STRATASYS],
  [['V014921', 'V014923', 'V014934', 'V014936', 'V014938', 'V014940', 'V014942', 'V014944'], 'ZX', 'Z', 'R-STRATASYS-mds-fdm-pc-abs-0823a', 'Flat (XY) On Edge (XZ) Upright (ZX)', STRATASYS],
  [['V014946', 'V014948', 'V014950', 'V014961', 'V014963', 'V014965', 'V014967', 'V014969', 'V014971', 'V014973', 'V014975', 'V014977'], 'ZX', 'Z', 'R-STRATASYS-mds-fdm-pc-0426a', 'Flat (XY) On Edge (XZ) Upright (ZX)', STRATASYS],
  [['V014979', 'V014981', 'V014983'], 'ZX', 'Z', 'R-STRATASYS-mds-fdm-abs-m30-0826a', 'Flat (XY) On Edge (XZ) Upright (ZX)', STRATASYS],
  [['V014421'], 'ZX', 'Z', 'R-STRATASYS-mds-fdm-hips-0823a', 'Flat (XY) On Edge (XZ) Upright (ZX)', STRATASYS],
  [['V012600'], 'ZX', 'Z', 'R-3DJAKE-3DJAKE-TDS-ASA-Prime-pptx', 'XY Value XZ Value ZX Value', AZURE],
  [['V012608', 'V012614'], 'ZX', 'Z', 'R-3DJAKE-3DJAKE-TDS-PETG', 'XY Value XZ Value ZX Value', AZURE],
  [['V012633'], 'ZX', 'Z', 'R-3DJAKE-3DJAKE-TDS-PLA-MATTE', 'XY Value XZ Value ZX Value', AZURE],
  [['V012663'], 'ZX', 'Z', 'R-3DJAKE-EN-TDS-LumberLay-pptx', 'XY Value XZ Value ZX Value', AZURE],
  [['V013818'], 'ZX', 'Z', 'D-RAISE3D-Raise3D-Hyper-Core-ABS-CF15-TDS-V1-0', '(ZX, Upright)', RAISE],
  [['V013837'], 'ZX', 'Z', 'D-RAISE3D-Raise3D-Hyper-Core-PPA-CF25-TDS-V2-0', '(ZX, Upright)', RAISE],
  [['V013854'], 'ZX', 'Z', 'D-RAISE3D-Raise3D-Hyper-Core-PPA-GF25-TDS-V1-1', '(ZX, Upright)', RAISE],
  [['V013882'], 'ZX', 'Z', 'D-RAISE3D-Raise3D-Hyper-Speed-PET-CF-TDS-V1-0', '(ZX, Upright)', 'the sheet\'s second table heads the column "(ZX, Upright)", as its tensile strength and modulus rows record (D92)'],
  [['V013913'], 'ZX', 'Z', 'D-RAISE3D-Raise3D-Hyper-Speed-PLA-Filament-TDS-V4-0-EN', '(ZX, Upright)', RAISE],
  [['V013928'], 'ZX', 'Z', 'D-RAISE3D-Raise3D-Hyper-Speed-PLA-Pro-TDS-V1-0-1', '(ZX, Upright)', RAISE],
  [['V013974'], 'ZX', 'Z', 'D-RAISE3D-Raise3D-Industrial-PPS-CF-TDS-V1-1', '(ZX, Upright)', 'the sheet\'s second table heads the column "(ZX, Upright)", as its tensile strength and modulus rows record (D92)'],
  [['V012791'], 'ZX', 'Z', 'R-ESSENTIUM-TDS-Essentium-TPU-80A-Z', 'ZX: Traces aligned orthogonal to major length', 'the sheet draws the ZX bar standing and says "ZX: Traces aligned orthogonal to major length", as its tensile strength row records (D92)'],
  [['V012798'], 'ZX', 'Z', 'R-ESSENTIUM-TDS-Essentium-TPU-95A-Z', 'ZX: Traces aligned orthogonal to major length', 'the sheet draws the ZX bar standing and says "ZX: Traces aligned orthogonal to major length", as its tensile strength row records (D92)'],
  [['V011884'], 'ZX', 'Z', 'R-FORWARDAM-ULTRAFUSE-BVOH-EXTENDED-TDS', 'The orientation of the 3D printed part in the printer is always aligned with the longest axis', 'the sheet says "The orientation of the 3D printed part in the printer is always aligned with the longest axis first", so its ZX bar stood upright, as its tensile strength and modulus rows record (D92)'],
  [['V012683'], 'ZX', 'Z', 'R-BASF-Ultrafuse-HiPS-TDS-EN-v2-2', 'Print direction Standard XY XZ ZX | Flat On its edge Upright', 'the sheet heads its columns "Print direction XY XZ ZX" with "Flat On its edge Upright" (m191, D92)'],
  [['V011909', 'V011910', 'V011911'], 'XZ', 'Z', 'R-ERYONE-eryone-silk-pla-dual-color-tds', 'Mechanical Properties of Printed Samples', ERYONE],
  [['V011914', 'V011915', 'V011916'], 'XZ', 'Z', 'R-ERYONE-eryone-hyper-speed-triple-color-silk-pla-tds', 'Mechanical Properties of Printed Samples', ERYONE],
  [['V011924'], 'XZ', 'Z', 'R-ERYONE-eryone-silk-pla-tri-color-tds', 'Mechanical Properties of Printed Samples', ERYONE],
  [['V012755', 'V012756', 'V012757'], 'XZ', 'Z', 'R-ERYONE-eryone-standard-pla-tds', 'Mechanical Properties of Printed Samples', ERYONE],
  [['V012762'], 'XZ', 'Z', 'R-ERYONE-eryone-standard-tpu-tds', 'Mechanical Properties of Printed Samples', ERYONE],
  [['V012773', 'V012774', 'V012775'], 'XZ', 'Z', 'R-ERYONE-eryone-wood-pla-tds', 'Mechanical Properties of Printed Samples', ERYONE],
  [['V012783', 'V012784', 'V012785'], 'XZ', 'Z', 'R-ERYONE-PRINT-20260928-9e82297a5891', 'Tensile strength X-Z', ERYONE],
  [['V015356', 'V015357', 'V015358'], 'XZ', 'Z', 'R-ERYONE-eryone-burnt-titanium-pla-tds', 'Mechanical Properties of Printed Samples', ERYONE],
  [['V014530', 'V014534', 'V014538', 'V014542'], UNUSABLE, 'YX', 'R-ESSENTIUM-Essentium-PA-TDS', 'XY YX ZX', 'the sheet prints a YX column beside its XY and ZX ones and draws the YX bar lying flat: by ISO/ASTM 52921 a flat bar with its length along Y, another bar than the XY one, kept as its label and compared with nothing (D143)'],
  [['V014711', 'V014715', 'V014719', 'V014723', 'V014727', 'V014731'], UNUSABLE, 'YX', 'R-ESSENTIUM-TDS-Essentium-PA-CF', 'XY 45/45 YX ZX', 'the sheet prints a YX column beside its XY, 45/45 and ZX ones and draws the YX bar lying flat: by ISO/ASTM 52921 a flat bar with its length along Y, another bar than the XY one, kept as its label and compared with nothing (D143)'],
  [['V014738', 'V014741', 'V014744'], UNUSABLE, 'YX', 'R-3D-FUEL-TDS-3DFuel-Pro-PLA', 'XY Axis YX Axis ZX Axis', 'the sheet heads a "YX Axis" column beside its "XY Axis" one: by ISO/ASTM 52921 a flat bar with its length along Y, another bar than the XY one; the sheet draws none, so it is kept as its label and compared with nothing (D143)'],
  [['V015311'], 'XY', 'ZX', 'D-RAISE3D-Raise3D-Industrial-PPS-CF-TDS-V1-1', 'Typical Value (ZX, Flat)', 'the value stands in the column the sheet heads "(ZX, Flat)", which its Fig. 4 draws upright: a flexural bar keeps its label (D92), and it is not the XY value'],
];

const t = openTables();
let n = 0;
for (const [ids, from, to, sid, quote, why] of GROUPS) {
  let checked = false;
  for (const id of ids) {
    const r = t.get('measurements', id);
    if (r.SourceID !== sid) throw new Error(`${MIGRATION}: ${id} cites ${r.SourceID}, not ${sid}`);
    if (r.Direction === to) continue;
    if (!checked) { onCachedSheet(t, sid, quote, MIGRATION); checked = true; }
    t.set('measurements', id, 'Direction', to, { expect: from, migration: MIGRATION });
    t.set('measurements', id, 'Notes', withNote(r.Notes, `Direction ${to}, was "${from}", since ${DATE} (${MIGRATION}): ${why}.`), { expect: r.Notes, migration: MIGRATION });
    n++;
  }
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} test-bar label(s) typed by the rule of D92, D140 and D143`);
