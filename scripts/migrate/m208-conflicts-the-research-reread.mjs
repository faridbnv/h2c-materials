#!/usr/bin/env node
// Migration m208 (2026-09-27): the recorded conflicts the research package of 2026-09-26 re-read, and three it found
// (GOALS C3; P0-ERR-01, 04, 05 and P0-REV-81, P1-VALUES).
//
// The research package fetched the makers' own pages behind three open conflicts and read the current revisions of the
// sheets behind physically implausible values. The pages were staged into the pipeline from its copies; each is
// registered here to corroborate the finding it bears on, and no value is transcribed from it except where said:
//
//   C00003  iSANMATE PLA Glass Fiber (M019): iSANMATE's own Formnext announcement says "PLA-Glass Fiber blends PLA's
//           eco-friendliness with glass fiber strength". The sheet's heading says glass fibre and its prose carbon
//           fibre; the maker's page sides with the heading. Still a conflict: no composition declaration.
//   C01136  Fiberon PET-GF15 (M068): the product page that returned 403 in September is on Polymaker's wiki. It prints
//           "Environmental temperature Room Temperature", as the TDS does, and answers "Can I print PET-GF15 on an
//           open-frame printer?" with "Yes, but for best results, an enclosed or heated-chamber printer is
//           recommended." A recommendation, not a chamber the part needs: resolved, and the wiki's settings enter as
//           a profile of their own (an enclosure recommended, the chamber at room temperature).
//   C01137  colorFabb nGen (M092): colorFabb's nGen page and its German printing guide both say Amphora AM3300; the TDS
//           v2.0 says HT3300. Re-read, still a conflict, for colorFabb to settle.
//   New     eSUN ePLA-Silk Rainbow (M008): eSUN's product page labels the figures its sheet prints for a moulded bar
//           (m128) by build direction: "Tensile Strength (Z) (MPa) 11.1", "Elongation at Break (Z) (%) 3.05",
//           "Flexural Strength (XY)", "Flexural Modulus (XY)". A Z value would explain the 11.1 MPa m24 flagged.
//   New     Extrudr FLEX MEDIUM MATT (M162): Extrudr's product page prints "Elongation at break ISO 527-1 420 %" and a
//           yield strength of 34 MPa, where the sheet prints 6.9 % and 470 N/mm², flagged as physically implausible.
//   New     LEHVOSS LUVOCOM 3F PAHT KK 50056 BK FR (M148): LEHVOSS's own preliminary datasheet for the compound
//           prints a tensile modulus of 5,5 GPa and a specific gravity of 1,40, delivered as pellets; the 3D4Makers
//           filament sheet G148-02 cites prints 6 GPa and 1,49.
//
// And two sheets' dates: Fiberlogy's two FiberFlex CF sheets print "Last update: May 20, 2025" and "Last update:
// December 9, 2024", which separate the revision that prints 2200 MPa from the one that prints 200 (P0-REV-81).
//
// A conflict row that a later row replaces is superseded, never edited (D72's rule for coverage). Every quotation is
// checked on the staged page's visible text or the cached sheet. The reader is an AI agent (claude-opus-5.5, agent
// reviewer), not a person. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m208-conflicts-the-research-reread.mjs

import { existsSync, readFileSync } from 'node:fs';
import { openTables } from '../data/table-io.mjs';
import { cacheDir, cachedText, sha256 } from '../lib/pdf-text.mjs';
import { parseTemperature, parseEnclosure } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';

const migration = 'm208-conflicts-the-research-reread';
const date = '2026-09-27';
const NA = 'Not applicable';
const NP = 'Not published';
const READER = 'Read by an AI agent (claude-opus-5.5, agent reviewer), not a person.';
const t = openTables();

let changed = 0;
const tally = new Map();
const count = (k, n = 1) => { if (n) { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; } };

// ------------------------------------------------------------------------------------------------ the pages
const ACCESS = 'Fetched from its URL on 2026-09-26 by the Codex research agents (research package of 2026-09-26) and staged from their saved copy by digest (ingest:witness --from); not fetched again.';
const NOTE = "The maker's own page, found by the research package of 2026-09-26 while re-reading a recorded conflict; consulted to confirm or explain it, and no value is transcribed from it.";
const page = (SourceID, Publisher, Title, URL, grades, SHA256, extra = {}) => ({
  SourceID, Publisher, Title, Revision: NP, 'Publication date': NP, 'Access date': '2026-09-26', 'Source class': 'Manufacturer product page or guide',
  'Source note': NOTE, 'Citation role': 'corroboration', URL, Locator: 'Product page', 'Applicable grades': grades, 'Access state': 'retrieved', 'Access note': ACCESS, SHA256, ...extra,
});
const PAGES = {
  isanmate: page('I-ISANMATE-FORMNEXT-BLOG-PAGE', 'iSANMATE', 'iSANMATE Brings New Glass Fiber Series to Formnext Shenzhen', 'https://www.isanmate.com/isanmate-formnext-blog/', 'G019-02', '5305aaf5a0cc24f76ec76374168007767e95257807c9a4d97c69081ba56b835e'),
  fiberon: page('S-FIBERON-TM-PET-GF15-PAGE', 'Polymaker', 'Fiberon™ PET-GF15', 'https://wiki.polymaker.com/polymaker-products/polymaker-filaments/fiberon-tm/fiberon-tm-pet-gf15', 'G068-02', 'f0136691fc9033be72e3806351ed928cbcccba2bc7e6ff018e50d3b7f068680a',
    { 'Citation role': 'cited', 'Source note': "Polymaker's wiki page for Fiberon PET-GF15, the product page the September research could not reach (HTTP 403, R-FIBERON-PETGF15-PAGE); found by the research package of 2026-09-26. Its printing recommendations are a profile of the product (m208)." }),
  ngen: page('D-COLORFABB-NGEN-PAGE', 'colorFabb', 'nGen Filament – All-Purpose Co-Polyester for Reliable 3D Printing', 'https://colorfabb.us/filaments/materials/co-polyester-filaments/ngen#read=2026-09-26', 'G092-01; G092-02', '51a78438ea39de1d2c2d5016ba05912bd28e06d718f42c52a0d54af76a29ab84',
    { 'Access note': `${ACCESS} A second reading of the page S-NGEN2 registers (its bytes of 2026-09-13 are not held); the URL's fragment keeps the two readings apart.` }),
  ngenGuide: page('D-COLORFABB-HOW-TO-PRINT-WITH-NGEN-PAGE', 'colorFabb', 'Drucken mit nGen-Filament: Der ultimative Leitfaden für hochwertige und vielseitige 3D-Drucke', 'https://colorfabb.com/de/blog/post/how-to-print-with-ngen', 'G092-01; G092-02', 'f2d3a09fc915d89566f9f9b76107dbd7ec657c3267ef4308c09bed76d724b0aa'),
  esun: page('D-ESUN-EPLA-SILK-RAINBOW-PRODUCT-PAGE', 'eSUN', 'PLA-Silk Rainbow Filament 3D Printer Silk PLA Multicolor Filament', 'https://www.esun3d.com/epla-silk-rainbow-product', 'G008-12', 'fc8d02819299808e6d907e45410a9f97392bec7c741ea560b3ae9e802da3115a'),
  extrudr: page('D-EXTRUDR-FLEX-MEDIUM-MATT-PAGE', 'Extrudr', 'TPU FLEX Medium MATT Filament – Shore Hardness A98', 'https://extrudr.com/en/se/products/flex-medium-matt/', 'G039-14', 'efb1e80bdcfccbcc5e826f893b80a338886002ee8d4ef5534dad926b1e84e787'),
  lehvoss: page('D-LEHVOSS-LUVOCOM-3F-PAHT-KK-50056-BK-FR', 'LEHVOSS', 'LUVOCOM 3F PAHT® KK 50056 BK FR', 'https://www.lehvoss.de/fileadmin/Compounds/PDFs/LUVOCOM_3F/LUVOCOM_3F_PAHT_KK_50056_BK_FR/25150056-en-ISO.pdf', 'G148-02', '1efb0c8fc5374517d4821681de6139129dd304739b3328d4f9572ccbd88ee8bd',
    { 'Source class': 'Manufacturer TDS', Revision: 'Preliminary datasheet', Locator: 'Document / product page', 'Source note': "LEHVOSS's own preliminary datasheet for the compound LUVOCOM 3F PAHT KK 50056 BK FR, delivered as pellets; found by the research package of 2026-09-26 (P1-VALUES). Consulted beside the 3D4Makers filament sheet G148-02 cites; no value is transcribed from it." }),
};
// The digests the research recorded; each staged file is checked against its own.
const byId = new Map(Object.values(PAGES).map((p) => [p.SourceID, p]));
const staged = (p) => {
  for (const ext of ['html', 'pdf']) {
    const path = cacheDir('sources/by-sha', `${p.SHA256}.${ext}`);
    if (existsSync(path) && sha256(readFileSync(path)) === p.SHA256) return { path, ext };
  }
  throw new Error(`${migration}: ${p.SourceID} is not staged at ${p.SHA256}; run ingest:witness --from first`);
};
const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', trade: '™', reg: '®', deg: '°' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITY[e.toLowerCase()] ?? m));
const squeeze = (s) => String(s).replace(/[’‘]/g, "'").replace(/[\s ​]+/g, '');
const textOf = new Map();
function says(sourceId, words) {
  if (!textOf.has(sourceId)) {
    const p = byId.get(sourceId) ?? t.get('sources', sourceId);
    const at = staged(p);
    const text = at.ext === 'html'
      ? decode(readFileSync(at.path, 'utf8').replace(/<(script|style|template|svg)\b[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' '))
      : cachedText(p.SHA256).pages.map((x) => x.lines.map((l) => (typeof l === 'string' ? l : l.text)).join(' ')).join(' ');
    textOf.set(sourceId, squeeze(text));
  }
  if (!textOf.get(sourceId).includes(squeeze(words))) throw new Error(`${migration}: ${sourceId} does not print "${words}"`);
  return `"${words}"`;
}
for (const p of Object.values(PAGES)) {
  staged(p);
  const held = t.find('sources', p.SourceID);
  if (held) { if (held.SHA256 !== p.SHA256) throw new Error(`${migration}: ${p.SourceID} holds ${held.SHA256}; the data moved`); continue; }
  t.append('sources', p);
  count('pages registered');
}

// ------------------------------------------------------------------------------------------------ coverage
const rows = () => t.rows('coverage');
const has = (finding) => rows().some((c) => c.Finding === finding);
function add(materialId, domain, status, finding) {
  if (has(finding)) return null;
  const id = t.nextId('coverage');
  t.append('coverage', { CoverageID: id, MaterialID: materialId, Domain: domain, Status: status, 'Manufacturer count': NA, Finding: finding });
  count(`coverage: ${status.toLowerCase()} rows`);
  return id;
}
function supersede(oldId, materialId, domain, status, finding) {
  const old = t.get('coverage', oldId);
  if (old.Status === 'Superseded') return;
  if (old.MaterialID !== materialId || old.Domain !== domain) throw new Error(`${migration}: ${oldId} is ${old.MaterialID} ${old.Domain}`);
  const id = add(materialId, domain, status, finding);
  t.set('coverage', oldId, 'Finding', `Superseded by ${id} (${date}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
  t.set('coverage', oldId, 'Status', 'Superseded', { expect: old.Status });
  count('coverage: rows superseded');
}

supersede('C00003', 'M019', 'Composition', 'Conflict',
  `Re-read ${date} (${migration}): iSANMATE's own Formnext announcement (${PAGES.isanmate.SourceID}) says ${says(PAGES.isanmate.SourceID, "PLA-Glass Fiber blends PLA's eco-friendliness with glass fiber strength")}, as the iSANMATE PLA Glass Fiber sheet's heading does; the sheet's prose still says carbon fibre. The maker's page sides with glass fibre, but no composition declaration states the filler or its loading, so the conflict stands. Action: request a composition declaration from iSANMATE, or confirm by ash / TGA on purchased filament. ${READER}`);
supersede('C01136', 'M068', 'Source conflict', 'Resolved',
  `Resolved ${date} (${migration}): the product page the 2026-09-13 research could not reach is on Polymaker's wiki (${PAGES.fiberon.SourceID}). It prints ${says(PAGES.fiberon.SourceID, 'Environmental temperature Room Temperature')}, as TDS V1.0 does, and answers "Can I print PET-GF15 on an open-frame printer?" with ${says(PAGES.fiberon.SourceID, 'Yes, but for best results, an enclosed or heated-chamber printer is recommended.')} A recommendation for best results, not a chamber the part needs: the chamber stays room temperature, and the wiki's settings are a profile of G068-02. ${READER}`);
supersede('C01137', 'M092', 'Identity', 'Conflict',
  `Re-read ${date} (${migration}): colorFabb's nGen page (${PAGES.ngen.SourceID}) says ${says(PAGES.ngen.SourceID, 'nGen is made with Eastman Amphora AM3300 3D Polymer')} and its German printing guide (${PAGES.ngenGuide.SourceID}) ${says(PAGES.ngenGuide.SourceID, 'Basierend auf Eastmans Amphora AM3300')}; colorFabb TDS v2.0 (2023-09-01) names Amphora HT3300. Two of the maker's documents against its sheet: colorFabb to settle which resin the filament is. ${READER}`);
add('M008', 'Source conflict', 'Conflict',
  `Found ${date} (${migration}): eSUN's ePLA-Silk Rainbow page (${PAGES.esun.SourceID}) labels by build direction the figures its sheet (S-PEBA-79f73c22-1) prints for a moulded bar (m128): ${says(PAGES.esun.SourceID, 'Tensile Strength (Z) (MPa) 11.1')}, ${says(PAGES.esun.SourceID, 'Elongation at Break (Z) (%) 3.05')}, ${says(PAGES.esun.SourceID, 'Flexural Strength (XY) (MPa) 75.34')}. V007105 to V007109 keep the sheet's reading; a Z bar would explain the 11.1 MPa V007105 is flagged for (m24). eSUN to say how the bars were made. ${READER}`);
add('M162', 'Source conflict', 'Conflict',
  `Found ${date} (${migration}): Extrudr's FLEX MEDIUM MATT page (${PAGES.extrudr.SourceID}) prints ${says(PAGES.extrudr.SourceID, 'Elongation at break ISO 527-1 420 %')} and ${says(PAGES.extrudr.SourceID, 'Tensile strength at yield ISO 527-1 34 MPa')}, where the sheet (R-EXTRUDR-flex-medium-matt-TDS-en) prints 6.9 % and 470 N/mm², flagged as physically implausible (V004124, V004123). The flags stand until Extrudr says which is the product's; the page's values are not transcribed. ${READER}`);
add('M148', 'Source conflict', 'Conflict',
  `Found ${date} (${migration}): LEHVOSS's own preliminary datasheet for the compound (${PAGES.lehvoss.SourceID}) prints ${says(PAGES.lehvoss.SourceID, 'Tensile modulus GPa 5,5')} and ${says(PAGES.lehvoss.SourceID, 'Specific gravity g/cm³ 1,40')}, delivered as pellets; the 3D4Makers filament sheet G148-02 cites prints 6 GPa (V009742) and 1,49 g/cm³ (V009738). Which figures the filament has is LEHVOSS's or 3D4Makers' to say. ${READER}`);

// ------------------------------------------------------------------------------------------ Fiberon's wiki profile
const FIBERON = 'G068-02';
const WIKI = PAGES.fiberon.SourceID;
const CELLS = {
  nozzle: ['Nozzle temperature', '280 - 310°C'], bed: ['Build plate temperature', '70 - 80°C'], chamber: ['Environmental temperature', 'Room Temperature'],
};
if (!t.rows('profiles').some((p) => p.GradeID === FIBERON && p.SourceID === WIKI)) {
  const g = t.get('grades', FIBERON);
  const row = {
    ProfileID: t.nextId('profiles'), MaterialID: g.MaterialID, GradeID: FIBERON, Profile: 'Manufacturer published guidance',
    Plate: NP, Drying: NP, 'Drying state': 'unknown', 'Drying °C': NA, 'Drying hours': NA,
    'Nozzle material': NP, 'Nozzle diameter': NP, 'Abrasion / clogging': NP, 'Hardened nozzle': NP,
    'H2C left': 'Verify exact grade/nozzle; no blanket approval', 'H2C right': 'Verify exact grade/nozzle; no blanket approval',
    'AMS 2 Pro': 'Not verified for every grade', 'AMS HT': 'Not verified for every grade', 'AMS published': NP,
    'Support pairing': NP, 'Failure modes': NP, SourceID: WIKI, 'H2C SourceID': 'H2C-WIKI',
    Locator: 'Printing Recommendations: Nozzle temperature, Build plate temperature, Environmental temperature; FAQ: Can I print PET-GF15 on an open-frame printer?', 'Parse review': NA,
  };
  for (const [axis, [label, raw]] of Object.entries(CELLS)) {
    says(WIKI, `${label} ${raw}`);
    const p = parseTemperature(raw, { plausible: TEMP_WINDOW[axis] });
    const range = p.state === 'range';
    const L = axis[0].toUpperCase() + axis.slice(1);
    Object.assign(row, { [`${L} °C`]: raw, [`${L} state`]: p.state, [`${L} min °C`]: range ? String(p.min) : NA, [`${L} max °C`]: range ? String(p.max) : NA, [`${L} requirement`]: p.requirement });
  }
  const ENCLOSURE = 'Yes, but for best results, an enclosed or heated-chamber printer is recommended.';
  says(WIKI, ENCLOSURE);
  Object.assign(row, { Enclosure: ENCLOSURE, 'Enclosure state': parseEnclosure(ENCLOSURE).state });
  if (row['Enclosure state'] !== 'recommended' || row['Chamber state'] !== 'ambient') throw new Error(`${migration}: the wiki reads as enclosure ${row['Enclosure state']}, chamber ${row['Chamber state']}`);
  const header = t.header('profiles');
  for (const k of header) if (row[k] == null) throw new Error(`${migration}: the wiki profile has no ${k}`);
  t.append('profiles', Object.fromEntries(header.map((k) => [k, row[k]])));
  count('Fiberon PET-GF15: the wiki\'s profile');
}

// ------------------------------------------------------------------------------------------ two sheets' dates
for (const [id, printed, iso] of [['R-FIBERLOGY-FIBERLOGY-FIBERFLEXCF-TDS', 'Last update: May 20, 2025', '2025-05-20'], ['R-FIBERLOGY-FIBERLOGY-FIBERFLEX-CF-TDS', 'Last update: December 9, 2024', '2024-12-09']]) {
  const s = t.get('sources', id);
  if (s['Publication date'] === iso) continue;
  if (!cachedText(s.SHA256).pages[0].lines.some((l) => (typeof l === 'string' ? l : l.text).includes(printed))) throw new Error(`${migration}: ${id} p. 1 no longer prints "${printed}"`);
  t.set('sources', id, 'Publication date', iso, { expect: NP });
  count('sheet dates');
}

if (changed) t.save();
for (const [k, n] of [...tally].sort()) console.log(`  ${n}\t${k}`);
console.log(`${migration}: ${changed} change(s)`);
