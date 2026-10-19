// The research intake's triage of the package's documents and readings (2026-10-19): which saved documents enter as
// sources (batch b48), which readings are re-pointed to a sheet already registered, and the cleaned readings the reading
// tools take (ingest:read-reconcile). Every decision is the executor's (Claude Opus 5.5), made against the repository's
// rules: a document enters only where it carries data a record will cite; a later copy of a registered sheet is read on
// the registered sheet where that prints the same line; a fibre load is a measurement (D150), never a grade's words; a
// raw cell is the page's own words in the form its source's earlier rows use.
//
//   node docs/audits/2026-10-19-research-intake/ingest/intake.mjs
//
// It reads the package outside the repository (PACKAGE below) and writes, beside itself: staged-manifest-b48.csv (the
// documents to stage by digest), b48-docs.json (each document's source row and grade), readings/r1-intake.csv (the
// readings, cleaned and re-keyed; grade_id "@KEY" names a product batch b48 creates, resolved after it), and
// readings/r1-dropped.csv (each reading left out, with why).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, csvText } from '../../../../build/src/csv.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../..');
const PACKAGE = '/Users/farid/Documents/H2C-v2.1-Review-2026-09-27/filament-atlas-research';
const DATE = '2026-10-19', TAG = 'INTAKE-20261019';
const BY = 'Claude Opus 5.5 (research intake 2026-10-19, b48)';
const rows = (p) => readCsv(p).records.map((r) => r.values);
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

const docs = new Map();
for (const pkg of ['output', 'intake-completion']) for (const d of rows(join(PACKAGE, pkg, 'documents.csv'))) docs.set(d.doc_id, { ...d, pkg });
const sources = new Map(rows(join(ROOT, 'data/tables/sources.csv')).map((s) => [s.SourceID, s]));
const gradeSource = new Map(rows(join(ROOT, 'data/tables/grades.csv')).map((g) => [g.GradeID, g.SourceID]));

// ---- the documents that enter (b48) -------------------------------------------------------------------------------
// slug: the maker part of the SourceID; cls: Source class; title as the document prints it; grades: the existing products
// it speaks for, or a key of NEW_GRADES; for: the witness key (a registered source of one of its products, a material
// for a new product, or a polymer). A note says what it is for.
const MPP = 'Manufacturer product page or guide', TDS = 'Manufacturer TDS', SDS = 'Manufacturer SDS', RESIN = 'Resin supplier data sheet';
const REGISTER = {
  // Print recipes and drying the makers publish (P2.2, P2.3).
  'NEW-0ebcebb053d0': { slug: 'SPECTRUM', publisher: 'Spectrum', title: 'Filament drying - Spectrum Filaments', cls: MPP, note: 'Spectrum\'s own filament-drying guide: a table of drying time, temperature and the need for drying for each of its filament lines.' },
  'NEW-ccbc209dd686': { slug: 'SPECTRUM', publisher: 'Spectrum', title: 'Material guide - PLA Magic SILK (SpectrumFilaments.com)', cls: MPP, note: 'Spectrum\'s material guide for PLA Magic SILK, with its drying advice.' },
  'NEW-ce459e1d517e': { slug: 'AZUREFILM', publisher: 'AzureFilm', title: 'LumberLay - AzureFilm', cls: MPP, note: 'AzureFilm\'s print guide for LumberLay: nozzle, bed, plate, nozzle size and drying.' },
  'NEW-4a28665e912a': { slug: '3DXTECH', publisher: '3DXTECH', title: 'Filament Drying Instructions | 3DXTECH', cls: MPP, note: '3DXTECH\'s drying instructions, a table by filament line; read for its own ThermaX PEI 9085, PEI GF30 and PEEK GF20 rows.' },
  'NEW-7152a0a1d844': { slug: 'PRUSA', publisher: 'Prusa Research', title: 'Drying filament | Prusa Knowledge Base', cls: MPP, note: 'Prusa Research\'s knowledge-base article on drying, a table by Prusament product.' },
  'NEW-a19de46bc4d5': { slug: 'FORMFUTURA', publisher: 'FormFutura', title: 'PPSU - FormFutura', cls: MPP, note: 'FormFutura\'s product page for PPSU, with its drying advice.' },
  'NEW-a7eec94b3aa6': { slug: 'EXTRUDR', publisher: 'Extrudr', title: 'DuraPro PA12 - Nylon Filament with Carbon Fibres for 3D Printing | Extrudr', cls: MPP, note: 'Extrudr\'s product page for DURAPRO PA12 CF, with its drying settings.' },
  'NEW-bc21a85e0853': { slug: 'MATTERHACKERS', publisher: 'MatterHackers', title: 'PRO Series PA CF (Carbon Fiber Nylon) Filament - 1.75mm (0.5kg) | MatterHackers', cls: MPP, note: 'MatterHackers\' own product page for its PRO Series PA CF, with its drying advice.' },
  'NEW-4be7015921cc': { slug: 'SUNLU', publisher: 'SUNLU', title: 'SUNLU quick start guide for new users (SUNLU wiki)', cls: MPP, note: 'SUNLU\'s wiki quick-start guide, with drying settings by SUNLU filament; read for its PVA row.' },
  'NEW-4253619973c8': { slug: 'SUNLU', publisher: 'SUNLU', title: 'SUNLU general filament guide (SUNLU wiki)', cls: MPP, note: 'SUNLU\'s wiki general filament guide, with drying settings by SUNLU filament; read for its PCL row.' },
  'NEW-2e322b175aba': { slug: '3D4MAKERS', publisher: '3D4Makers', title: 'Best practices in 3D printing PEEK (3D4Makers blog)', cls: MPP, note: '3D4Makers\' own article on printing its PEEK, with its drying advice.' },
  'NEW-0cd16cbde6e7': { slug: 'BRASKEM', publisher: 'Braskem', title: 'Braskem expands additive manufacturing portfolio (news)', cls: MPP, note: 'Braskem\'s own news page announcing FL300PE, which states "Heated chamber not required".' },
  'NEW-0ea774a63185': { slug: 'RAISE3D', publisher: 'Raise3D', title: 'Premium PVA+ - Raise3D', cls: MPP, note: 'Raise3D\'s product page for Premium PVA+, which caps the chamber temperature at 50 °C.' },
  'NEW-bce4fc930a99': { slug: 'FORMFUTURA', publisher: 'FormFutura', title: 'Technical Data Sheet Galaxy PLA', cls: TDS, note: 'FormFutura\'s current data sheet for Galaxy PLA, served from its own site: a later revision of S-PET-TDS-Galaxy-PLA, whose bytes differ and which prints no print settings; this one prints the nozzle and bed, the enclosure, drying and that the filament is not abrasive. The earlier row stays.' },
  // Identity and filing (P4.4).
  'NEW-38167ab03310': { slug: 'POLYMAKER', publisher: 'Polymaker', title: 'Panchroma Satin PLA 1.75mm 3D printer filament | Polymaker', cls: MPP, note: 'Polymaker\'s own store page for Panchroma Satin PLA, "Formerly called PolyTerra™ PLA+", with its print and drying settings.', grades: ['@SATIN'] },
  // Fibre loads (P2.6): the makers' own safety data sheets and pages.
  ...Object.fromEntries([
    ['NEW-30c9c34207db', '3DXTECH', 'CarbonX CF-PLA safety data sheet'], ['NEW-9b508b07c0e0', '3DXTECH', 'CarbonX Carbon Fiber PETG safety data sheet'],
    ['NEW-236bc17b5026', '3DXTECH', 'CarbonX CF ABS safety data sheet'], ['NEW-5534f85502cb', '3DXTECH', 'TriMax Carbon Fiber ABS safety data sheet'],
    ['NEW-62f2a4d81d9a', '3DXTECH', 'CarbonX CF PC safety data sheet'], ['NEW-d9ca434a09ae', '3DXTECH', 'CarbonX Carbon Fiber ezPC safety data sheet'],
    ['NEW-601d3db3f3c3', '3DXTECH', 'CarbonX Carbon Fiber Nylon (Gen3) safety data sheet'], ['NEW-60cf96b3651f', '3DXTECH', 'CarbonX CF PA12 safety data sheet'],
    ['NEW-7af1b756d331', '3DXTECH', 'CarbonX CF PP safety data sheet'], ['NEW-6d1bbc8b6d13', '3DXTECH', 'CarbonX Carbon Fiber PEEK safety data sheet'],
    ['NEW-6702775e288e', 'BAMBU', 'Bambu Lab PETG-CF safety data sheet'], ['NEW-ad2e8598e8e1', 'BAMBU', 'Bambu Lab ABS-GF safety data sheet'],
    ['NEW-bea7fb8ceebe', 'BAMBU', 'Bambu Lab ASA-CF safety data sheet'], ['NEW-a44c805caac4', 'BAMBU', 'Bambu Lab PA6-GF safety data sheet'],
    ['NEW-90ccc83cd98c', 'BAMBU', 'Bambu Lab PAHT-CF safety data sheet'], ['NEW-47b7fc17258c', 'BAMBU', 'Bambu Lab PA6-CF safety data sheet'],
    ['NEW-b3f4d4421f4c', 'BAMBU', 'Bambu Lab PET-CF safety data sheet'], ['NEW-8f9e75a3edbd', 'BAMBU', 'Bambu Lab PPA-CF safety data sheet'],
    ['NEW-dca8fea28441', 'BAMBU', 'Bambu Lab PLA-CF safety data sheet'], ['NEW-0701b0c8eae4', 'ESUN', 'eSUN ABS-CF safety data sheet'],
    ['NEW-f865f6236fdf', 'POLYMAKER', 'PolyMide PA12-CF safety data sheet (EU)'], ['NEW-f0ae2a696ebc', 'POLYMAKER', 'PolyMide PA6-GF safety data sheet (EU)'],
    ['NEW-fb5cc92eb63d', 'SUNLU', 'SUNLU PETG Carbon Fiber safety data sheet'], ['NEW-6135dc0f59c6', 'SUNLU', 'SUNLU ABS-GF safety data sheet'],
    ['NEW-daaf2bff5886', 'SUNLU', 'SUNLU PA6-GF safety data sheet'], ['NEW-dfde7ac70a99', 'FIBERLOGY', 'Fiberlogy ABS GF safety data sheet (Polish)'],
  ].map(([id, slug, title]) => [id, { slug, publisher: slug === 'BAMBU' ? 'Bambu Lab' : slug === 'ESUN' ? 'eSUN' : slug === 'POLYMAKER' ? 'Polymaker' : slug === 'FIBERLOGY' ? 'Fiberlogy' : slug, title, cls: SDS, note: 'The maker\'s own safety data sheet; read for the fibre load its composition section states.' }])),
  'NEW-2e31624e8f42': { slug: 'LEHVOSS', publisher: 'LEHVOSS', title: 'LUVOCOM-3F | LEHVOSS Compounds', cls: MPP, note: 'LEHVOSS\'s own LUVOCOM 3F page, which states each filament\'s fibre load.' },
  'NEW-6a231b651029': { slug: 'POLYMAKER', publisher: 'Polymaker', title: 'PolyLite PLA-CF 1.75mm 3D printer filament | Polymaker', cls: MPP, note: 'Polymaker\'s own store page for PolyLite PLA-CF: "8% chopped carbon fiber by weight".' },
  'NEW-7aa9c72f7d1e': { slug: 'MATTERHACKERS', publisher: 'MatterHackers', title: 'Black NylonG Glass Fiber Filament - 1.75mm (0.5kg) | MatterHackers', cls: MPP, note: 'MatterHackers\' own page for NylonG: "Glass-fill Percentage: 15%".' },
  // The new products (P2.4) and their completion.
  'NEW-c033c19c5de7': { slug: 'FILAMATRIX', publisher: 'Filamatrix', title: 'Nylon Carbon Fiber Technical Data Sheet', cls: TDS, note: 'Filamatrix\'s own data sheet for Nylon Carbon Fiber (July 2023): printed-bar properties and a print recipe.', grades: ['@NCF'] },
  'NEW-3aae724feaa5': { slug: 'FILAMATRIX', publisher: 'Filamatrix', title: 'Nylon Carbon Fiber 3D Printer Filament 500g & 1kg - Filamatrix', cls: MPP, note: 'Filamatrix\'s own store page for Nylon Carbon Fiber: settings, plate, hardened nozzle and drying.', grades: ['@NCF'] },
  'NEW-341954211950': { slug: 'FILAMATRIX', publisher: 'Filamatrix', title: 'Nylon Glass Enhanced Technical Data Sheet', cls: TDS, note: 'Filamatrix\'s own data sheet for Nylon Glass Enhanced (July 2019, a Breathe-3DP service mark): printed-bar properties and a print recipe.', grades: ['@NGE'] },
  'NEW-bf1721d6364f': { slug: 'FILAMATRIX', publisher: 'Filamatrix', title: 'Nylon Glass Fiber 3D Printer Filament 500g & 1kg - Filamatrix', cls: MPP, note: 'Filamatrix\'s own store page for the glass-fibre nylon its data sheet calls Nylon Glass Enhanced: settings, plate, hardened nozzle and drying.', grades: ['@NGE'] },
  'NEW-315a2e8f1fb9': { slug: 'FILAMATRIX', publisher: 'Filamatrix', title: 'Which Nylon Filament Is Right for Me? | Filamatrix', cls: MPP, note: 'Filamatrix\'s own article comparing its nylons: a hardened nozzle and drying for both fibre-filled grades.', grades: ['@NCF', '@NGE'] },
  'NEW-50de915f1dbb': { slug: 'EUMAKERS', publisher: 'Eumakers', title: 'PA NYLON GLASS FIBER Filament Technical Data Sheet', cls: TDS, note: 'Eumakers\' own filament data sheet, served from its own host (and byte for byte the same as the copy SI-Design serves).', url: 'https://www.eumakers.com/pub/media/technical_sheets/EUMAKERS_TDS_PA_NYLON_GLASS_FIBER_Filament_DataSheet.pdf', grades: ['@EUM'] },
  'NEW-da9a178eef3e': { slug: 'EUMAKERS', publisher: 'Eumakers', title: 'PA NYLON GLASS FIBER Polymer Technical Data Sheet', cls: TDS, note: 'Eumakers\' own polymer data sheet: printed-specimen tables at 15, 50 and 100 % infill, thermal values and print settings.', grades: ['@EUM'] },
  'NEW-e92a4b6130a7': { slug: 'EUMAKERS', publisher: 'Eumakers', title: 'MSDS Glass Fiber (Eumakers)', cls: SDS, note: 'Eumakers\' own safety data sheet: "Polyamide - additives/modifiers".', grades: ['@EUM'] },
  'NEW-1fde250ca576': { slug: 'EUMAKERS', publisher: 'Eumakers', title: 'EUMAKERS Store PA Filament | Color: Nylon Glass Fiber Translucent White', cls: MPP, note: 'Eumakers\' own store page as the Wayback Machine captured it on 2025-12-07 (the live page refuses automated readers): settings and the nozzle advice.', grades: ['@EUM'] },
  // Polymer references (P3.2): producers' sheets for rows of polymers.csv no document spoke for.
  'NEW-908c225fa945': { slug: 'SKCHEMICALS', publisher: 'SK chemicals', title: 'SKYGREEN JN200 safety data sheet', cls: RESIN, note: 'SK chemicals\' own safety data sheet for SKYGREEN JN200, a PCTG copolyester resin; read for the polymer it names and its density.', polymer: 'PCTG' },
  'NEW-f5e7bdf39ed1': { slug: 'AMSTY', publisher: 'AmSty', title: 'STYRON 478 technical data sheet', cls: RESIN, note: 'AmSty\'s own data sheet for STYRON 478, a high-impact polystyrene; read for its density.', polymer: 'HIPS' },
  'NEW-3fe4ca7f8420': { slug: 'BASF', publisher: 'BASF', title: 'Ultramid C33 safety data sheet', cls: RESIN, note: 'BASF\'s own safety data sheet for Ultramid C33, a polyamide 6/66 copolymer; read for its density and melting range.', polymer: 'PA6/66' },
  'NEW-73577e95a6a5': { slug: 'BASF', publisher: 'BASF', title: 'Ultramid C33 (BASF product page)', cls: RESIN, note: 'BASF\'s own product page for Ultramid C33, which names it a polyamide 6/66 copolymer.', polymer: 'PA6/66', role: 'corroboration' },
  'NEW-1c703cb952ff': { slug: 'EASTMAN', publisher: 'Eastman', title: 'Butvar B-74 polyvinyl butyral resin', cls: RESIN, note: 'Eastman\'s data sheet for Butvar B-74, a polyvinyl butyral resin, as a distributor serves it; read for its specific gravity (it prints no test method).', polymer: 'PVB' },
};

// Readings made on a later copy of a sheet already registered, read on the registered sheet where it prints the same line.
const REPOINT = {
  'NEW-3db72a183ffa': 'R-COLORFABB-PRINT-20260928-e02f420a2e56',
  'NEW-fe20e69c8fdc': 'R-POLYMAKER-PANCHROMA-TDS-V2-1',
};

// The products batch b48 creates: grade rows, and the material each is filed under.
export const NEW_GRADES = {
  NCF: { MaterialID: 'M165', Manufacturer: 'Filamatrix', 'Product name': 'Nylon Carbon Fiber', composition: 'Carbon fibre reinforced nylon; the maker names no polyamide and states no fibre load ("a proprietary blend of components encapsulated within a polymer matrix", its safety data sheet)', from: 'NEW-c033c19c5de7' },
  NGE: { MaterialID: 'M166', Manufacturer: 'Filamatrix', 'Product name': 'Nylon Glass Enhanced', composition: 'Glass fibre reinforced nylon; the maker names no polyamide and states no fibre load (its safety data sheet withholds the identity as Universal Fibers\' trade secret); sold on the maker\'s store as "Nylon Glass Fiber"', from: 'NEW-341954211950' },
  EUM: { MaterialID: 'M166', Manufacturer: 'Eumakers', 'Product name': 'PA Nylon Glass Fiber', composition: '"Glass Fiber Reinforced Polyammide" (the maker\'s filament data sheet); its safety data sheet says "Polyamide - additives/modifiers" and names no polyamide or fibre load', from: 'NEW-50de915f1dbb' },
  SATIN: { MaterialID: 'M001', Manufacturer: 'Polymaker', 'Product name': 'Panchroma Satin PLA', composition: 'PLA with a satin finish; "Formerly called PolyTerra™ PLA+" (the maker\'s store page)', from: 'NEW-38167ab03310', sourceId: 'R-POLYMAKER-PANCHROMA-TDS-V2-1' },
};

const sourceIdOf = (id) => {
  const r = REGISTER[id];
  return `R-${r.slug}-${TAG}-${docs.get(id).sha256.slice(0, 12)}`;
};

// ---- the readings ------------------------------------------------------------------------------------------------
const BY_HAND_IDS = [['NEW-bc21a85e0853', 'drying'], ['NEW-315a2e8f1fb9', 'hardened_nozzle']];
const HEADER = ['source_id', 'page', 'kind', 'field', 'grade_id', 'product', 'label', 'raw', 'number_lo', 'number_hi', 'unit', 'operator', 'direction', 'specimen', 'moisture', 'post_processing', 'standard', 'test_conditions', 'table_heading', 'quote', 'held_id', 'verdict', 'held_value', 'confidence', 'reader', 'note'];
const kept = [], dropped = [];
const drop = (r, why) => dropped.push({ source_id: r.source_id, page: r.page, kind: r.kind, field: r.field, grade_id: r.grade_id, raw: r.raw, why });

// Registered sheets: the readings whose findings the triage accepted. m452 applied the corrections (P1.2, P1.2b, F-0614,
// F-0615) and the acceptances (P1.1); what is left is what no record holds.
const READ_REGISTERED = new Set([
  'R-BRASKEM-Braskem-3D-Printing-Data-Sheet-FL900PP-CF', 'R-ISANMATE-READER-20261004-e2e246f1aa3e', 'R-NANOVIA-PEI-CF-Ultem-1010',
  'D-SIRAYA-Fibreheart-ABS-GF-TDS', 'D-SIRAYA-siraya-tech-rebound-peba-95a-tds', 'R-FILLAMENTUM-PRIORITY-20261003-3f22b7dd7442',
  'R-3DJAKE-3DJAKE-TDS-ABS-Prime-pptx', 'R-3DJAKE-3DJAKE-TDS-ASA-Prime-pptx', 'D-RAISE3D-Raise3D-Premium-PVA-TDS-V2-1-2021-06', 'S-PET-TDS-PPSU',
  'R-QIDI-PA12-CF', 'D-RAISE3D-Raise3D-Industrial-PA12-CF-TDS-V3-0-76400e', 'D-FLASH-PET-CF-TDS-EN', 'D-YOUSU-NYLON-MSDS',
  'R-FABRU-220-Material-data-sheet-PVA-purefil', 'R-POLYMAKER-PANCHROMA-TDS-V2-1', 'D-ESUN-EPLA-SILK-RAINBOW-PRODUCT-PAGE',
  'XP-carbonx-abs-cf-1-2',
]);
const FILLAMENTUM = 'R-FILLAMENTUM-PRIORITY-20261003-3f22b7dd7442';
const BY_HAND_REGISTERED = new Set(['R-3DJAKE-3DJAKE-TDS-ABS-Prime-pptx', 'R-3DJAKE-3DJAKE-TDS-ASA-Prime-pptx', 'D-RAISE3D-Raise3D-Premium-PVA-TDS-V2-1-2021-06', 'D-SIRAYA-siraya-tech-rebound-peba-95a-tds', 'R-BRASKEM-Braskem-3D-Printing-Data-Sheet-FL900PP-CF']);
const SCALE = '(1 – not necessary to dry, 5 – always needed)';
function fixRegistered(r) {
  // A fibre load a held page states as a figure by weight or unstated basis is a measurement (D150); by volume it is
  // another quantity (m444).
  if (r.kind === 'identity' && r.field === 'filler' && r.number_lo && r.unit === '%' && READ_REGISTERED.has(r.source_id)) {
    return kept.push({ ...r, kind: 'value', field: 'Fibre content' });
  }
  if (r.kind === 'identity' || r.kind === 'none') return drop(r, 'an identity or empty-page reading: the triage records it, no table takes it');
  if (!READ_REGISTERED.has(r.source_id)) return drop(r, r.verdict === 'confirms' ? 'confirms what the table holds' : 'applied by m452, judged not to change a record (F-0059, F-0060, F-0064, F-0066), or left for the owner or the maker');
  if (r.verdict === 'confirms' || r.verdict === 'mismatch') return drop(r, 'a held row: confirmed, or corrected by m452');
  // A tolerance window ("245±10 °C"), a bound (">60˚C"), a nozzle metal ("a standard 0.4mm brass nozzle works well") and an
  // alternative bed with its own substrate are typed by hand in m454, from the parsers, where the reading tools hold them.
  if (BY_HAND_REGISTERED.has(r.source_id) && r.kind === 'setting') return drop(r, 'typed by hand in m454 (a tolerance window, a bound, a nozzle metal, an alternative bed)');
  // The test bars' settings are not a recipe (F-0137 to F-0139): the context readings that say so are the reader's notes.
  if (r.kind === 'context' && /Specimen|Nozzle: 0\.4mm|Extrusion Temp/.test(r.raw)) return drop(r, 'test-bar settings, not a page statement (F-0137 to F-0139)');
  if (r.source_id === 'R-POLYMAKER-PANCHROMA-TDS-V2-1') return drop(r, 'a held row of CoPE');
  // Fillamentum's table, in the form its earlier rows took (P1376 to P1383): the need-to-dry scale beside the row.
  if (r.source_id === FILLAMENTUM && r.field === 'drying') {
    const m = /^(>?\d+(?:\.\d+)?) h minimum, (\d+) °C; need (\d)$/.exec(r.raw);
    if (!m) throw new Error(`Fillamentum drying "${r.raw}" is not in the reader's form`);
    const product = r.product;
    return kept.push({ ...r, raw: `${m[2]} °C; minimum drying time ${m[1]} h; the need to dry ${m[3]} ${SCALE}`, label: `p.2 Table1 own product row ${product}; own minimum-time/temperature/need columns, with p1 restrictions`, quote: `${product} ${m[1]} h ${m[2]} °C ${m[3]}`, test_conditions: `hours=${m[1].replace('>', '')}` });
  }
  return kept.push(r);
}
for (const r of rows(join(PACKAGE, 'output/readings-registered.csv'))) fixRegistered(r);

// Readings of saved documents: re-keyed to the SourceID b48 gives the document, or to the registered sheet a later copy is.
const FIBRE_UNIT = '%';
const DIRECTIONAL = /^(Tensile|Elongation|Flexural|Charpy|Izod|Impact|Compression strength|Interlayer|Fatigue|Tear|Mould shrinkage|unmapped)/;
// The reader's numbers left out where the cell prints them (the tools compare the reader's numbers with the parser's).
const FILL = {
  'NEW-ce459e1d517e|nozzle': { number_lo: '200', number_hi: '230' }, 'NEW-ce459e1d517e|bed': { number_lo: '60', number_hi: '' },
  'NEW-4253619973c8|drying': { test_conditions: 'hours=1' }, 'NEW-2e322b175aba|drying': { test_conditions: 'hours=4' },
};
let BY_HAND;
function fixNew(r, origin) {
  BY_HAND ??= BY_HAND_IDS.map(([d, f]) => [sourceIdOf(d), f]);
  const id = r.source_id;
  const to = REPOINT[id] ?? (REGISTER[id] ? sourceIdOf(id) : null);
  if (!to) return drop(r, `its document does not enter (${docs.get(id)?.kind ?? 'unknown'}: ${docs.get(id)?.products ?? ''}); see the triage`);
  if (REGISTER[id]?.polymer) return drop(r, 'a polymer reference: polymers.csv cites the document (m453), no product takes the value');
  if (r.kind === 'none') return drop(r, 'an empty page');
  const g = REGISTER[id]?.grades;
  // The completion reader filed Satin's readings under PolyTerra PLA (G001-23), the grade its old sheet was misfiled on;
  // they are Panchroma Satin PLA's, which b48 creates.
  const satin = ['NEW-fe20e69c8fdc', 'NEW-38167ab03310'].includes(id) && r.grade_id === 'G001-23';
  const grade = satin ? '@SATIN' : r.grade_id || (g?.length === 1 ? g[0] : '');
  // A fibre load is a measurement (D150), read where the document states it as a figure.
  if (r.kind === 'identity' && r.field === 'filler') {
    if (!r.number_lo && !r.number_hi) return drop(r, 'the filler named without a load: the grade\'s words, not a figure');
    return kept.push({ ...r, source_id: to, grade_id: grade, kind: 'value', field: 'Fibre content', unit: FIBRE_UNIT, number_lo: r.number_lo || r.number_hi, number_hi: r.number_lo ? r.number_hi : '' });
  }
  if (r.kind === 'identity') return drop(r, 'an identity reading: the triage records it, no table takes it');
  if (/^unmapped:Shore Hardness$/i.test(r.field)) return drop(r, 'Eumakers\' "Shore 77 MPa" prints a hardness in MPa: no row can hold it (left in the record tier)');
  const field = { 'unmapped:Relative Density': 'Density', 'Izod strength': 'Izod impact strength' }[r.field] ?? r.field;
  // A bar printed at 15 or 50 % infill is not a solid printed bar: its modulus would stand as the product's (the record keeps
  // the sheet; only the full-infill rows enter).
  if (/infill=\s*(?:15|50)\s*%/.test(r.test_conditions)) return drop(r, 'a bar printed at partial infill: not the product\'s value');
  // A property that has no build direction takes none (a sheet's orientation words belong to its bars).
  const direction = DIRECTIONAL.test(field) ? r.direction : '';
  // Settings the next migration types by hand (m454), or that another of the product's documents states more plainly.
  if (BY_HAND.some(([s, f]) => to === s && r.field === f)) return drop(r, 'typed by hand in m454 (a tolerance window, a bound, a nozzle metal or a °F schedule the reading tools hold)');
  const fill = FILL[`${id}|${r.field}`] ?? {};
  return kept.push({ ...r, ...fill, source_id: to, grade_id: grade, field, direction, reader: r.reader || origin });
}
for (const r of rows(join(PACKAGE, 'output/readings-new.csv'))) fixNew(r, 'research package 2026-10-19');
for (const r of rows(join(PACKAGE, 'intake-completion/readings-new.csv'))) fixNew(r, 'Claude Sonnet (agent), intake completion');

// Exact duplicates (same document, page, field, product and numbers) are read once.
const seen = new Set();
const out = kept.filter((r) => {
  const k = [r.source_id, r.page, r.kind, r.field, r.grade_id, r.product, r.number_lo, r.number_hi, r.direction, r.post_processing, r.moisture].join('\u0001');
  if (seen.has(k)) { drop(r, 'a duplicate of another reading'); return false; }
  seen.add(k); return true;
});

// ---- the staging manifest and the batch's document table -------------------------------------------------------------
const manifest = [], table = [];
for (const [id, r] of Object.entries(REGISTER)) {
  const d = docs.get(id);
  if (!d) throw new Error(`${id}: not in the package`);
  const file = join(PACKAGE, d.pkg, d.file);
  if (sha(file) !== d.sha256) throw new Error(`${id}: ${file} does not hash to its recorded digest`);
  const sourceId = sourceIdOf(id);
  const grades = r.grades ?? [...new Set(out.filter((x) => x.source_id === sourceId).map((x) => x.grade_id).filter(Boolean))];
  const forKey = r.polymer ? `polymer:${r.polymer}` : r.grades?.[0]?.startsWith('@') ? `material:${NEW_GRADES[r.grades[0].slice(1)].MaterialID}` : r.revisionOf ?? gradeSource.get(grades.find((g) => g && !g.startsWith('@'))) ?? sourceId;
  manifest.push({ file, url: r.url ?? d.url, doc: '', for: forKey, provider: r.publisher, manufacturer: r.publisher, product: d.products, sha256: d.sha256, accessed: d.accessed || DATE, by: 'research package of 2026-10-19 (saved and hashed by its agent); staged by Claude Opus 5.5' });
  table.push({ id, sourceId, sha256: d.sha256, url: r.url ?? d.url, originalUrl: d.original_url || '', accessed: d.accessed || DATE, language: d.language, format: d.format, kind: d.kind, ...r, grades });
}

mkdirSync(join(HERE, 'readings'), { recursive: true });
writeFileSync(join(HERE, 'staged-manifest-b48.csv'), csvText(['file', 'url', 'doc', 'for', 'provider', 'manufacturer', 'product', 'sha256', 'accessed', 'by'], manifest));
writeFileSync(join(HERE, 'b48-docs.json'), `${JSON.stringify({ by: BY, date: DATE, documents: table, newGrades: NEW_GRADES, repoint: REPOINT }, null, 2)}\n`);
writeFileSync(join(HERE, 'readings/r1-intake.csv'), csvText(HEADER, out));
// After b48 (m453) the new products have IDs: the readings that name them by key are resolved (r1-resolved.csv).
const made = rows(join(ROOT, 'data/tables/grades.csv'));
const idOf = Object.fromEntries(Object.entries(NEW_GRADES).map(([k, g]) => [k, made.find((x) => x.Manufacturer === g.Manufacturer && x['Product name'] === g['Product name'] && x.Status === 'active')?.GradeID]));
if (Object.values(idOf).every(Boolean)) {
  writeFileSync(join(HERE, 'readings/r1-resolved.csv'), csvText(HEADER, out.map((r) => (r.grade_id?.startsWith('@') ? { ...r, grade_id: idOf[r.grade_id.slice(1)] } : r))));
  console.log(`resolved: ${Object.entries(idOf).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
writeFileSync(join(HERE, 'readings/r1-dropped.csv'), csvText(['source_id', 'page', 'kind', 'field', 'grade_id', 'raw', 'why'], dropped));
console.log(`${table.length} documents to stage; ${out.length} readings kept, ${dropped.length} left out`);
