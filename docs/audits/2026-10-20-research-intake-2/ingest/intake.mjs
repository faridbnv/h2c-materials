// The second research intake's triage of the package's documents and readings (2026-10-20): which saved documents enter
// as sources (batch b50), and the cleaned readings the reading tools take (ingest:read-reconcile). Every decision is the
// executor's (Claude Opus 5.5), made against the repository's rules and the package's EXECUTION-WARNINGS.md: a document
// enters only where it carries data a record will cite; a fibre load is a measurement (D150), never a grade's words; a
// figure another document of the product already holds from its data sheet is not entered twice; a reading the page
// prints no figure for ("/", "0.0" for a bar that never yielded) is not a value.
//
//   node docs/audits/2026-10-20-research-intake-2/ingest/intake.mjs --package <research package folder>
//
// It reads the package outside the repository and writes, beside itself: staged-manifest-b50.csv (the documents to stage
// by digest), b50-docs.json (each document's source row and products), readings/r2-intake.csv (the readings, cleaned and
// re-keyed; grade_id "@KEY" names a product batch b50 creates, resolved once it exists, into r2-resolved.csv), and
// readings/r2-dropped.csv (each reading left out, with why).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, csvText } from '../../../../build/src/csv.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../..');
const at = process.argv.indexOf('--package');
if (at < 0 || !process.argv[at + 1]) { console.error('usage: intake.mjs --package <research package folder>'); process.exit(2); }
const PACKAGE = resolve(process.argv[at + 1]);
const DATE = '2026-10-20', TAG = 'INTAKE-20261020';
const BY = 'Claude Opus 5.5 (research intake 2, 2026-10-20, b50)';
const rows = (p) => readCsv(p).records.map((r) => r.values);
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

const docs = new Map(rows(join(PACKAGE, 'output/documents.csv')).map((d) => [d.doc_id, d]));
const gradeSource = new Map(rows(join(ROOT, 'data/tables/grades.csv')).map((g) => [g.GradeID, g.SourceID]));
const sourceIds = new Set(rows(join(ROOT, 'data/tables/sources.csv')).map((s) => s.SourceID));

// ---- the documents that enter (b50) -------------------------------------------------------------------------------
const MPP = 'Manufacturer product page or guide', TDS = 'Manufacturer TDS', SDS = 'Manufacturer SDS';
export const REGISTER = {
  // The products the research found for materials one product short of a page (T1) or thin (T7).
  'NEW-92a1f96a864b': { slug: 'KEXCELLED', publisher: 'Kexcelled', title: 'THE K8 OBC Technical Data Sheet', cls: TDS, grades: ['@OBC'], note: 'Kexcelled\'s own data sheet for THE K8 OBC, an olefin block copolymer filament: print guideline, material properties and printed-bar mechanical properties in three build directions.' },
  'NEW-74ea25479ede': { slug: 'FILAMENTIVE', publisher: 'Filamentive', title: 'Hemp PLA Technical Data Sheet', cls: TDS, grades: ['@HEMP'], note: 'Filamentive\'s own data sheet for Hemp PLA: its composition and eleven properties with their test methods.' },
  'NEW-c8a447a4df81': { slug: 'FILAMENTIVE', publisher: 'Filamentive', title: 'Hemp Based PLA – Sustainable 3D Printing Filament - 1.75mm, 1 kg - Filamentive', cls: MPP, grades: ['@HEMP'], note: 'Filamentive\'s own store page for Hemp PLA: its print recipe (printing temperature, bed temperature, no hardened nozzle needed) and its 1.75 mm diameter, which its data sheet does not print.' },
  'NEW-4bdb6fe222df': { slug: 'QIDI', publisher: 'QIDI', title: 'QIDI PPS-GF20 3D printer filament (QIDI store)', cls: MPP, grades: ['@PPSGF'], note: 'QIDI\'s own store page for PPS-GF20: its glass load, a property table, its recommended print settings, drying and cautions.' },
  'NEW-bd7cbd47d8e7': { slug: 'FORWARDAM', publisher: 'BASF Forward AM', title: 'Ultrafuse PP GF30 Technical Data Sheet', cls: TDS, grades: ['@PPGF'], note: 'Forward AM\'s own data sheet for Ultrafuse PP GF30: its print recipe and drying, and printed-bar mechanical, impact and thermal tables (pages 3 to 5 are images).' },
  'NEW-ff205bacb571': { slug: 'SAKATA', publisher: 'Sakata 3D', title: 'PA-NT Technical Data Sheet', cls: TDS, grades: ['@PANT'], note: 'Sakata 3D\'s own data sheet for PA-NT, an unfilled copolyamide: physical, mechanical and thermal properties and its print settings.' },
  'NEW-d6c57de6f438': { slug: 'SAKATA', publisher: 'Sakata 3D', title: 'PA-CF15 Technical Data Sheet', cls: TDS, grades: ['@PACF15'], note: 'Sakata 3D\'s own data sheet for PA-CF15, a copolyamide with 15 % carbon fibre: properties (mechanical values dry as moulded) and its print settings.' },
  // Statements for products the catalogue holds.
  'NEW-8168f14e3afb': { slug: 'AZUREFILM', publisher: 'AzureFilm', title: 'Technical Data Sheet ASA (AzureFilm, 05.24)', cls: TDS, grades: ['G031-31'], note: 'AzureFilm\'s own data sheet for ASA, served from its own site: printed-bar properties at 100 % infill in three build directions and its print recommendations. The sheet held for the product (R-3DJAKE-3DJAKE-ASA-TDS-1, hosted by 3DJake) prints other test settings; both stay.', revisionOf: 'R-3DJAKE-3DJAKE-ASA-TDS-1' },
  'NEW-b9835e9fa9ec': { slug: 'AZUREFILM', publisher: 'AzureFilm', title: 'ASA filament Blue (AzureFilm)', cls: MPP, grades: ['G031-31'], note: 'AzureFilm\'s own product page for ASA: "This material can be printed without an enclosed printer but we strongly recommend using an enclosure".' },
  'NEW-f8fff41ba5af': { slug: 'PRUSA', publisher: 'Prusa Research', title: 'ASA Prusament is here: learn everything about the successor to ABS (Prusa blog)', cls: MPP, grades: ['G031-20'], note: 'Prusa Research\'s own launch article for Prusament ASA, which recommends printing it inside an enclosure.' },
  'NEW-9828d6e2bfd9': { slug: 'LEHVOSS', publisher: 'LEHVOSS', title: 'LUVOCOM 3F (LEHVOSS brochure, German)', cls: MPP, grades: ['G073-05'], note: 'LEHVOSS\'s own LUVOCOM 3F brochure; read for its statement on LUVOCOM 3F PPS CF 9938 BK: "Unser Material braucht keinen temperierten Bauraum für den Druckvorgang."' },
  'NEW-35dfb5b81aeb': { slug: 'RAISE3D', publisher: 'Raise3D', title: 'Raise3D Fiber Reinforced Technology white paper v2.0', cls: MPP, grades: ['G053-09'], note: 'Raise3D\'s own white paper on its fibre-reinforced filaments: PA12 CF\'s properties as printed and annealed at 100 °C, and that the RMF 500 prints it warp-free without the heating chamber.' },
  'NEW-bf1a52b7bfb4': { slug: 'POLYMAKER', publisher: 'Polymaker', title: 'PolyMide PA12-CF Product Information Sheet', cls: MPP, grades: ['G053-02'], note: 'Polymaker\'s own product information sheet for PolyMide PA12-CF: its print settings with a chamber of 25-50 °C, drying "if the filament has absorbed moisture", and its properties as printed beside annealed.' },
  'NEW-75b28336ecbb': { slug: 'ERYONE', publisher: 'Eryone', title: 'Carbon Fiber PLA (Eryone)', cls: MPP, grades: ['G018-09'], note: 'Eryone\'s own product page for its carbon-fibre PLA: "Carbon Fiber Content: 15%" and its print settings.' },
  'NEW-baaab8903e4b': { slug: 'ESUN', publisher: 'eSUN', title: 'ePLA-CF Filament safety data sheet', cls: SDS, grades: ['G018-11'], note: 'eSUN\'s own safety data sheet for ePLA-CF, as the Wayback Machine captured it (2025-08-13); read for the carbon-fibre load its composition section states.' },
  'NEW-f5fc266cf423': { slug: 'FIBERLOGY', publisher: 'Fiberlogy', title: 'TECHNICAL DATA SHEET Fiberlogy R PP (2025)', cls: TDS, grades: ['G082-13'], note: 'Fiberlogy\'s own current data sheet for R PP, served from its own site and linked from its product page: a later revision of R-FIBERLOGY-FIBERLOGY-R-PP-TDS (OPEN-PROBLEMS §39.1). Its heat deflection of 40 °C is labelled 1.8 MPa here, where the product page labels it 0.45 MPa (F-0680).', revisionOf: 'R-FIBERLOGY-FIBERLOGY-R-PP-TDS' },
  // Identity: kept to corroborate a grade's filing or name; no value is transcribed from them.
  'NEW-b4959fb55a87': { slug: 'ESSENTIUM', publisher: 'Essentium', title: 'Essentium PA-CF safety data sheet', cls: SDS, grades: ['G165-05'], role: 'corroboration', note: 'Essentium\'s own safety data sheet for PA-CF, as Filament2Print serves it: section 3 names the polymer "Polyamide (PA 6/66)", which files the product under PA6/66-CF (m490).' },
  'NEW-cb8de69c5dec': { slug: 'POLYMAKER', publisher: 'Polymaker', title: 'Panchroma Matte PLA (Polymaker wholesale store)', cls: MPP, grades: ['G001-23'], role: 'corroboration', note: 'Polymaker\'s own store page for Panchroma Matte PLA, which names its former product name: "PolyTerra PLA" (F-0678).' },
};

// The products batch b50 creates: grade rows, and the material each is filed under.
export const NEW_GRADES = {
  OBC: { MaterialID: 'M086', Manufacturer: 'Kexcelled', 'Product name': 'THE K8 OBC', composition: '"Olefin Block Copolymers" (Chemical name, p. 1, as the sheet states it)', from: 'NEW-92a1f96a864b' },
  HEMP: { MaterialID: 'M152', Manufacturer: 'Filamentive', 'Product name': 'Hemp PLA', composition: '"90% plant-based PLA and 10% hemp byproducts" (p. 1, as the sheet states it)', from: 'NEW-74ea25479ede' },
  PPSGF: { MaterialID: 'M074', Manufacturer: 'QIDI', 'Product name': 'PPS-GF20', composition: 'Polyphenylene sulfide with "20% glass fiber" (the maker\'s store page, as it states it)', from: 'NEW-4bdb6fe222df' },
  PPGF: { MaterialID: 'M084', Manufacturer: 'BASF Forward AM', 'Product name': 'Ultrafuse PP GF30', composition: 'Polypropylene with "30% glass fiber" (p. 3, as the sheet states it)', from: 'NEW-bd7cbd47d8e7' },
  PANT: { MaterialID: 'M164', Manufacturer: 'Sakata 3D', 'Product name': 'PA-NT', composition: '"unfilled copolyamide (Nylon)" (p. 1, as the sheet states it); the maker names no polyamide', from: 'NEW-ff205bacb571' },
  PACF15: { MaterialID: 'M165', Manufacturer: 'Sakata 3D', 'Product name': 'PA-CF15', composition: '"copolyamide" with "15% carbon fiber" (p. 1, as the sheet states it); the maker names no polyamide', from: 'NEW-d6c57de6f438' },
};

const sourceIdOf = (id) => `R-${REGISTER[id].slug}-${TAG}-${docs.get(id).sha256.slice(0, 12)}`;

// ---- the readings ------------------------------------------------------------------------------------------------
const HEADER = ['source_id', 'page', 'kind', 'field', 'grade_id', 'product', 'label', 'raw', 'number_lo', 'number_hi', 'unit', 'operator', 'direction', 'specimen', 'moisture', 'post_processing', 'standard', 'test_conditions', 'table_heading', 'quote', 'held_id', 'verdict', 'held_value', 'confidence', 'reader', 'note'];
const kept = [], dropped = [];
const drop = (r, why) => dropped.push({ source_id: r.source_id, page: r.page, kind: r.kind, field: r.field, grade_id: r.grade_id, raw: r.raw, why });

const numbers = (s) => [...String(s ?? '').matchAll(/-?\d+(?:[.,]\d+)?/g)].map((m) => m[0].replace(',', '.'));
/** Cells the reader left empty where the page prints them: a setting's numbers ("220 - 235", "> 65"), a drying
 * schedule's hours, and a bound's figure written as the high end of a range ("below –90 °C" is < -90, not a range). */
function cells(r) {
  const fill = {};
  if (r.kind === 'setting' && ['nozzle', 'bed', 'chamber'].includes(r.field) && !r.number_lo && !r.number_hi) {
    const n = numbers(r.raw).filter((x) => !x.startsWith('-'));
    if (n.length) Object.assign(fill, { number_lo: n[0], number_hi: n[1] ?? '', operator: /^\s*>/.test(r.raw) ? '>' : r.operator, unit: r.unit || '°C' });
  }
  if (r.kind === 'setting' && r.field === 'drying' && !/hours=/.test(r.test_conditions) && /(\d+(?:\.\d+)?)\s*hours/i.test(r.raw)) fill.test_conditions = `hours=${/(\d+(?:\.\d+)?)\s*hours/i.exec(r.raw)[1]}`;
  if (r.kind === 'setting' && r.field === 'drying' && !r.number_lo) { const t = /(\d+)\s*º?\s*C/.exec(r.raw); if (t) Object.assign(fill, { number_lo: t[1], unit: '°C' }); }
  if (r.kind === 'value' && ['<', '>'].includes(r.operator) && !r.number_lo && r.number_hi) Object.assign(fill, { number_lo: r.number_hi, number_hi: '' });
  return fill;
}

// Registered sheets read again by the research (readings-registered.csv): the readings it marked new go to the reconciler,
// which says which a record already holds. Left out: the polymer references (polymers.csv is frozen, D58, D138).
const POLYMER_REFS = /^R-BASF-INTAKE-20261019-/;
function fixRegistered(r) {
  if (r.verdict !== 'new') return drop(r, r.verdict === 'confirms' || r.verdict === 'same' ? 'confirms what the table holds' : 'a held row the research found different: read on its page in the review, not applied from the package');
  if (!sourceIds.has(r.source_id)) return drop(r, 'its source is not registered');
  if (POLYMER_REFS.test(r.source_id)) return drop(r, 'a polymer reference: polymers.csv is frozen (D58, D138)');
  if (r.kind === 'identity' && r.field === 'filler' && r.number_lo && r.unit === '%') return kept.push({ ...r, kind: 'value', field: 'Fibre content' });
  if (r.kind === 'identity' || r.kind === 'none') return drop(r, 'an identity or empty-page reading: the triage records it, no table takes it');
  if (r.source_id === 'R-EXTRUDR-durapro-asa-cf-TDS-en' && r.field === 'nozzle_diameter' && /at least/.test(r.raw)) return drop(r, 'the sheet prints "≥0.6 mm" (read by the second reader); "at least 0.6 mm" is the reader\'s paraphrase, not on the page');
  return kept.push({ ...r, ...cells(r), reader: r.reader || 'research package 2026-10-19 (round 2)' });
}
for (const r of rows(join(PACKAGE, 'output/readings-registered.csv'))) fixRegistered(r);

// Readings of the saved documents, re-keyed to the SourceID b50 gives each.
const FIBRE = /(\d+(?:\.\d+)?)\s*%\s*(?:hemp|glass|carbon)/i;
function fixNew(r) {
  const id = r.source_id;
  if (!REGISTER[id]) return drop(r, `its document does not enter (${docs.get(id)?.kind ?? 'unknown'}: ${docs.get(id)?.products ?? ''}); archive/research-2026-10-20/disposition.csv says why`);
  const to = sourceIdOf(id);
  const g = REGISTER[id].grades;
  const grade = r.grade_id || (g?.length === 1 ? g[0] : '');
  if (r.kind === 'none') return drop(r, 'an empty page');
  // A fibre load the product's own document states as a figure is a measurement (D150).
  if (r.kind === 'identity' && FIBRE.test(r.raw) && ['filler', 'polymer'].includes(r.field) && !/^R-ESSENTIUM/.test(to)) {
    const n = FIBRE.exec(r.raw)[1];
    return kept.push({ ...r, source_id: to, grade_id: grade, kind: 'value', field: 'Fibre content', number_lo: n, number_hi: '', unit: '%', reader: r.reader || 'research package 2026-10-19 (round 2)' });
  }
  if (r.kind === 'identity') return drop(r, 'an identity reading: the grade row and its composition carry it (b50, m490)');
  if (REGISTER[id].role === 'corroboration') return drop(r, 'a document kept to corroborate a filing or a name: no value is transcribed from it (the product\'s data sheet prints its values)');
  // A cell that prints no figure is not a value.
  if (r.kind === 'value' && !r.number_lo && !r.number_hi && !r.field.startsWith('unmapped:')) return drop(r, `the cell prints no figure ("${r.raw}")`);
  if (id === 'NEW-8168f14e3afb' && r.field === 'Tensile yield strength' && r.number_lo === '0.0') return drop(r, 'the ZX column prints 0.0 MPa for a bar that never yielded: the sheet\'s placeholder, not a strength (a 0 is never written for unknown)');
  // The documents read for one statement: the product's data sheet prints its nozzle and bed.
  if (id === 'NEW-f8fff41ba5af' && r.field !== 'enclosure') return drop(r, 'Prusament ASA\'s own data sheet (S-PVB-bc8551ef-tds-prusament-asa-2024-en) prints its recipe; the article is read for its enclosure statement');
  if (id === 'NEW-b9835e9fa9ec' && r.field !== 'enclosure') return drop(r, 'AzureFilm\'s own data sheet (b50) prints the recipe; the page is read for its enclosure statement');
  // PolyMide PA12-CF's annealed figures are held from its data sheet (V000980 to V000990, V000977, V000978), which
  // states another schedule (80 °C for 24 h, where this sheet says 80 °C for 6 h): only the as-printed figures are new.
  if (id === 'NEW-bf1a52b7bfb4' && r.kind === 'value' && /annealed/i.test(r.post_processing)) return drop(r, 'the annealed figure its data sheet already holds (V000980 to V000990), whose schedule differs (80 °C for 24 h there, 6 h here): OPEN-PROBLEMS records the difference');
  if (id === 'NEW-4bdb6fe222df' && r.field === 'nozzle' && /Equipment Requirements/.test(r.label)) return drop(r, 'the printing tip asks the printer to reach 310-350 °C; the recipe table\'s 300-350 °C is the profile\'s nozzle window, and the tip is kept in its Locator');
  if (id === 'NEW-bf1a52b7bfb4' && r.field === 'other') return drop(r, 'the annealing instruction for parts, carried by the values\' post-processing, not a print setting');
  const fill = cells(r);
  return kept.push({ ...r, ...fill, source_id: to, grade_id: grade, reader: r.reader || 'research package 2026-10-19 (round 2)' });
}
for (const r of rows(join(PACKAGE, 'output/readings-new.csv'))) fixNew(r);

// Filamentive's store page prints Hemp PLA's recipe, which the research saved and did not read: read here by the
// executor on the saved page, each quote checked on its cached text when the reading tools run.
const READER = 'Claude Opus 5.5 (research intake 2), read on the saved page';
const page = (o) => ({ source_id: 'NEW-c8a447a4df81', page: '1', kind: 'setting', grade_id: '@HEMP', product: 'Hemp PLA', unit: '', operator: '', direction: '', specimen: '', moisture: '', post_processing: '', standard: '', test_conditions: '', table_heading: '', held_id: '', verdict: 'new', held_value: '', confidence: 'high', reader: READER, note: '', number_lo: '', number_hi: '', ...o });
for (const r of [
  page({ field: 'nozzle', label: 'Printing temperature', raw: '200 ± 15°C', number_lo: '200', unit: '°C', quote: 'Printing temperature: 200 ± 15°C' }),
  page({ field: 'bed', label: 'Bed temperature', raw: '≤45°C', number_lo: '45', unit: '°C', operator: '<', quote: 'Bed temperature : ≤45°C' }),
  page({ field: 'hardened_nozzle', label: 'Hardened nozzle', raw: 'There’s no need for a hardened nozzle', quote: 'There’s no need for a hardened nozzle' }),
]) kept.push({ ...r, source_id: sourceIdOf(r.source_id) });

// Exact duplicates (same document, page, field, product and numbers) are read once.
const seen = new Set();
const out = kept.filter((r) => {
  const k = [r.source_id, r.page, r.kind, r.field, r.grade_id, r.product, r.number_lo, r.number_hi, r.direction, r.post_processing, r.moisture, r.test_conditions].join('\u0001');
  if (seen.has(k)) { drop(r, 'a duplicate of another reading'); return false; }
  seen.add(k); return true;
});

// ---- the staging manifest and the batch's document table -------------------------------------------------------------
const manifest = [], table = [];
for (const [id, r] of Object.entries(REGISTER)) {
  const d = docs.get(id);
  if (!d) throw new Error(`${id}: not in the package`);
  const file = join(PACKAGE, 'output', d.file);
  if (sha(file) !== d.sha256) throw new Error(`${id}: ${file} does not hash to its recorded digest`);
  const sourceId = sourceIdOf(id);
  const forKey = r.grades[0].startsWith('@') ? `material:${NEW_GRADES[r.grades[0].slice(1)].MaterialID}` : r.revisionOf ?? gradeSource.get(r.grades[0]);
  manifest.push({ file, url: d.url, doc: '', for: forKey, provider: r.publisher, manufacturer: r.publisher, product: d.products, sha256: d.sha256, accessed: d.accessed || DATE, by: 'research package of 2026-10-19, round 2 (saved and hashed by its agent); staged by Claude Opus 5.5' });
  table.push({ id, sourceId, sha256: d.sha256, url: d.url, accessed: d.accessed || DATE, language: d.language, format: d.format, kind: d.kind, ...r });
}

mkdirSync(join(HERE, 'readings'), { recursive: true });
writeFileSync(join(HERE, 'staged-manifest-b50.csv'), csvText(['file', 'url', 'doc', 'for', 'provider', 'manufacturer', 'product', 'sha256', 'accessed', 'by'], manifest));
writeFileSync(join(HERE, 'b50-docs.json'), `${JSON.stringify({ by: BY, date: DATE, documents: table, newGrades: NEW_GRADES }, null, 2)}\n`);
writeFileSync(join(HERE, 'readings/r2-intake.csv'), csvText(HEADER, out));
// After b50 (m488) the new products have IDs: the readings that name them by key are resolved (r2-resolved.csv).
const made = rows(join(ROOT, 'data/tables/grades.csv'));
const idOf = Object.fromEntries(Object.entries(NEW_GRADES).map(([k, g]) => [k, made.find((x) => x.Manufacturer === g.Manufacturer && x['Product name'] === g['Product name'] && x.Status === 'active')?.GradeID]));
if (Object.values(idOf).every(Boolean)) {
  writeFileSync(join(HERE, 'readings/r2-resolved.csv'), csvText(HEADER, out.map((r) => (r.grade_id?.startsWith('@') ? { ...r, grade_id: idOf[r.grade_id.slice(1)] } : r))));
  console.log(`resolved: ${Object.entries(idOf).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
writeFileSync(join(HERE, 'readings/r2-dropped.csv'), csvText(['source_id', 'page', 'kind', 'field', 'grade_id', 'raw', 'why'], dropped));
console.log(`${table.length} documents to stage; ${out.length} readings kept, ${dropped.length} left out`);
