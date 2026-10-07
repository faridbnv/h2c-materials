// b45: the documents the quality round of 2026-10-07 admits (items 3, 9, 12 and 14 of its plan), read page by page and
// proposed through the import pipeline's own row builders (b45-lib.mjs, from gap round 2's b43-lib.mjs).
//
// A Claude Sonnet reader transcribed every value and print setting of the five documents into b45-readings.json
// (READER-PROMPT-b45.md), each number checked on the page image and every line on the cached text. This file is Claude
// Opus's review of that reading: the source and product rows, and the cells the reading got wrong or the rules keep out
// (REVIEW below, each with its reason). The typed columns are the parsers' reading (measurementRow / profileFor).
//
//   node docs/audits/2026-10-07-quality-round/ingest/build-b45.mjs
//
// It writes proposals/b45/<sha16>.json and ../b45-packet.json (the packet the migration pins), and pins the packet in the
// migration.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BY, DATE, NA, NP, cachedText, meas, profile, stamp, tables as t } from './b45-lib.mjs';

const HERE = 'docs/audits/2026-10-07-quality-round/ingest';
const OUT = `${HERE}/proposals/b45`;
const MIGRATION = 'scripts/migrate/m406-batch-b45-quality-round.mjs';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const readings = new Map(JSON.parse(readFileSync(`${HERE}/b45-readings.json`, 'utf8')).map((d) => [d.sha256, d]));
const STAGED = (url) => `Fetched ${DATE} by Claude Sonnet (quality round 2026-10-07, b45) from ${url}; staged by digest (ingest:witness --from, docs/audits/2026-10-07-quality-round/ingest/staged-manifest-b45.csv).`;

// ---- the documents -------------------------------------------------------------------------------------------------
const COPE_URL = 'https://polymaker.com/wp-content/uploads/lana-downloads/Panchroma-CoPE_TDS_EN_V5.4.pdf';
const docs = [
  {
    name: 'Polymaker Panchroma CoPE TDS V5.4', sha256: '8106f1c5c75e2cb3', slug: 'POLYMAKER', publisher: 'Polymaker', provider: 'Polymaker',
    title: 'Panchroma™ CoPE Technical Data Sheet', revision: 'V5.4', url: `http://web.archive.org/web/20251104124941id_/${COPE_URL}`,
    sourceClass: 'Manufacturer TDS',
    sourceNote: `Polymaker's six-page data sheet for Panchroma CoPE, version 5.4, as the Internet Archive captured it on 2025-11-04 12:49:41 UTC: physical, thermal and mechanical tables (the mechanical one in a classic and a high printing speed column), recommended printing conditions and how its test bars were made. The maker's address (${COPE_URL}) answers 404; R-POLYMAKER-COPE-TDS-V5-4 recorded it not retrieved on 2026-09-13.`,
    accessNote: `Fetched ${DATE} by Claude Sonnet (quality round 2026-10-07, b45) as the raw capture (id_) of ${COPE_URL}, captured 2025-11-04 12:49:41 UTC; the document hashed is the file as the Internet Archive replays it. Staged by digest (ingest:witness --from). The maker does not serve it now.`,
    identityNote: 'Exact product G091-02 (Polymaker Panchroma CoPE) of M091; identity unchanged ("Panchroma™ CoPE is a co-polyester-based 3D printing material").',
    grades: [{ key: 'main', existing: 'G091-02' }],
  },
  {
    name: 'Kimya TPC-ESD', sha256: '01ba14075179671e', slug: 'KIMYA', publisher: 'Kimya', provider: 'Shop3D Universe (retailer host)',
    title: 'Kimya TPC-ESD 3D Filament', revision: 'Revised on 13/11/2019', published: '2019-11-13', url: 'https://shop3duniverse.com/cdn/shop/t/116/assets/kimya-tpc-esd-3d-filament_en.pdf',
    sourceClass: 'Manufacturer TDS',
    sourceNote: 'Kimya\'s two-page technical data sheet for its TPC-ESD filament, created and revised 13/11/2019, as a retailer (shop3duniverse.com) serves it; kimya.fr does not answer. Filament properties on page 1, printed specimens\' properties (printing direction XY) on page 2.',
    identityNote: 'The sheet says "The Kimya TPC-ESD 3D filament belongs to the thermoplastic copolyester family: is an elastomer", with an ESD formulation and Shore 91A: TPC-ESD (M114). A product the catalogue did not hold; 3DXTECH\'s 3DXSTAT ESD-TPC (G114-01) is another product.',
    grades: [{ key: 'main', materialId: 'M114', manufacturer: 'Kimya', product: 'Kimya TPC-ESD',
      composition: 'Thermoplastic copolyester elastomer with an ESD formulation, Shore 91A ("belongs to the thermoplastic copolyester family: is an elastomer", p. 1, as the sheet states it)',
      note: 'New product: Kimya TPC-ESD, the second product of TPC-ESD (M114), found by the quality round\'s search for thin materials.', evidence: 'The Kimya TPC-ESD 3D filament belongs to the thermoplastic copolyester family: is an elastomer.' }],
  },
  {
    name: 'DREMC PBT GF TDS V1.1', sha256: '70f515d2b2875c2f', slug: 'DREMC', publisher: 'DREMC', provider: 'DREMC',
    title: 'PBT GF – Glass Fibre Technical Data Sheet (TDS)', revision: 'V1.1', url: 'https://cdn.shopify.com/s/files/1/0541/6638/8905/files/DREMC_PBT_GF_TDS_V1.1.pdf?v=1747390078',
    sourceClass: 'Manufacturer TDS',
    sourceNote: 'DREMC\'s three-page data sheet for its PBT GF filament (file DREMC_PBT_GF_TDS_V1.1.pdf, linked from the product page): physical and mechanical tables, the test bars\' printing conditions, a drying note.',
    identityNote: 'The sheet says "DREMC PBT GF using BASF Ultradur® PBT resin with added GF <10%": PBT-GF (M132). A product the catalogue did not hold.',
    grades: [{ key: 'main', materialId: 'M132', manufacturer: 'DREMC', product: 'PBT GF', availability: 'End of life for retail: the maker\'s product page (2026-10-07) says it is replaced by DREMC PC PBT GF, a PC/PBT blend.',
      composition: 'PBT with glass fibre under 10 % ("DREMC PBT GF using BASF Ultradur® PBT resin with added GF <10%", p. 1, as the sheet states it)',
      note: 'New product: DREMC PBT GF, the second product of PBT-GF (M132), found by the quality round\'s search for thin materials.', evidence: 'DREMC PBT GF using BASF Ultradur® PBT resin with added GF <10%' }],
  },
  {
    name: 'DREMC PBT GF product page', sha256: 'a23be9ad12ed9c70', slug: 'DREMC', publisher: 'DREMC', provider: 'DREMC',
    title: 'DREMC PBT GF Glass Fibre Filament 1.75mm 1kg', revision: 'Product page as served on 2026-10-07', url: 'https://store.dremc.com.au/products/dremc-pbt-gf-glass-fibre-filament-1-75mm-1kg',
    sourceClass: 'Manufacturer product page or guide',
    sourceNote: 'DREMC\'s own product page for PBT GF: its specification block (density) and its printing settings and requirements (nozzle, bed, chamber, drying, a wear-resistant nozzle). The page marks the product end of life for retail.',
    identityNote: 'The page says "DREMC\'s PBT-GF is a polybutylene terephthalate with glass fiber 3D printing filament": the product its data sheet is.',
    grades: [{ key: 'main', materialId: 'M132', manufacturer: 'DREMC', product: 'PBT GF', sameAs: 'DREMC PBT GF TDS V1.1',
      note: 'The product its data sheet (same batch) registers.', evidence: 'DREMC\'s PBT-GF is a polybutylene terephthalate with glass fiber 3D printing filament.' }],
  },
  {
    name: 'purefil GreenTEC', sha256: 'd299af0d689965eb', slug: 'FABRU', publisher: 'Fabru / purefil', provider: 'Fabru / purefil',
    title: 'GreenTEC (purefil material data sheet)', revision: NP, url: 'https://cdn02.plentyone.com/pvdtyofq45f2/propertyItems/1971%2FMaterialdatenblatt+GreenTEC+purefil.pdf',
    accessed: '2026-09-17', sourceClass: 'Manufacturer TDS',
    sourceNote: 'Fabru\'s one-page German material data sheet for purefil GreenTEC (Materialdatenblatt), linked from purefil.ch\'s product page "purefil GreenTEC filament": processing data and technical data. It names no polymer; its figures are Extrudr GreenTEC\'s, which purefil sells under the same name (R179).',
    accessNoteFull: 'Fetched 2026-09-17 by the V2 import (docs/audits/2026-09-18-v2-import/ledger.csv, doc_key d299af0d689965eb), hash-checked, and held for its identity until the owner\'s ruling R179; staged by digest for this batch (ingest:witness --from) and admitted in batch b45 (2026-10-07).',
    identityNote: 'R179 (the owner\'s ruling): GreenTEC is an undisclosed bio-copolymer of Extrudr\'s BIO Performance range, which purefil sells under the same name; its home is PLA blend (M168). Its table prints Extrudr GreenTEC\'s figures (docs/audits/2026-10-07-quality-round/web/greentec.md), so it takes that sheet as its formulation key (D119).',
    grades: [{ key: 'main', materialId: 'M168', manufacturer: 'Fabru', product: 'GreenTEC', formulationKey: 'R-EXTRUDR-greentec-TDS-en',
      composition: 'Not published: "GreenTEC ist ein Biokunststoff" (a bioplastic) "aus 100% nachwachsenden Rohstoffen"; the sheet names no polymer. Filed in PLA blend by the owner\'s ruling R179.',
      note: 'New product: purefil GreenTEC, filed in PLA blend (M168) by R179, beside purefil GreenTEC Pro (G001-66); its table is Extrudr GreenTEC\'s, so it shares that sheet\'s key (D119).', evidence: 'GreenTEC ist ein Biokunststoff, welcher eine hohe Zug- und Biegefestigkeit hat.' }],
  },
];

// ---- the review of the reading: what changes, and why -------------------------------------------------------------
const PRINT_SLIP = (what) => `The sheet prints ${what}; kept as printed.`;
// A note's topic is a value of schema/vocab/profile-topics.csv; a note no topic fits (a basis line, a support tip, the
// abrasion sentence the Abrasion cell already holds) is left on the page.
const TOPIC = { Cooling: 'Cooling', Speed: 'Speed', Storage: 'Storage humidity', 'Bed temperature settings (p. 4 FAQ)': 'Adhesion / release', 'Textured PEI (p. 4 FAQ)': 'Adhesion / release', 'Chamber note (Note 2, description)': 'Warping / shrinkage' };
const topics = (notes) => notes.filter(([topic]) => TOPIC[topic]).map(([topic, text]) => [TOPIC[topic], text]);
const REVIEW = {
  '8106f1c5c75e2cb3': {
    value: (v) => {
      // The unit column of the classic elongation cell prints "Mpa", a slip: the row is a percentage like its three neighbours.
      if (v.property === 'Elongation at break' && /Mpa/.test(v.raw)) return { ...v, unit: '%', notes: 'The sheet prints "Mpa" beside this elongation, a slip in its unit column: the row is a percentage, as the other three elongation cells of the table print.' };
      if (/㎡/.test(v.unit)) return { ...v, unit: 'kJ/m²', notch: 'Notched' };
      return v;
    },
  },
  '01ba14075179671e': {
    value: (v) => {
      if (v.property === 'Surface resistivity') return null; // an exponent range in Ω/m², a unit the table does not hold
      if (v.property === 'Elongation at break' && v.num === 0) return { ...v, status: 'Published value (physically implausible)', notes: 'The sheet prints a tensile strain at break of 0 % for an elastomer whose stress at break it prints as 12,8 MPa: no bar breaks without stretching. Kept as printed and flagged, so it backs nothing.' };
      return v;
    },
    // The block is headed PRINT PARAMETERS AND SPECIMENS DIMENSIONS: how the test bars were printed, not guidance (m170).
    profiles: () => [],
    skipped: ['Surface resistivity 10⁷ - 10⁹ Ohms/m² (ASTM D257): an exponent range in a unit the table does not hold; left in the record tier.',
      'The block "PRINT PARAMETERS AND SPECIMENS DIMENSIONS" (nozzle 230-270 °C, bed 60-85 °C, 20-60 mm/s, 100 % rectilinear, XY) is how the test bars were printed, not a recommendation: never a profile (m170); it is the printed bars\' statement of the page 2 values.'],
  },
  'a23be9ad12ed9c70': {
    // DREMC states the nozzle hardness in its own words; the parser reads them (Hardened nozzle), as b44 did.
    cells: (c) => ({ ...c, abrasion: 'Abrasive resistance nozzle is requirement due to glass fibre, plated/brass nozzle can wear quickly and cause inconsistent prints and will destroy those types of nozzles.' }),
  },
  'd299af0d689965eb': {
    // The sheet prints the drying temperature and time on two labelled lines; the cell holds both, in its words.
    cells: (c) => ({ ...c, drying: 'Trocknungstemperatur 80°C, Trocknungsdauer 2h' }),
    notes: (n) => n.filter(([topic]) => !/^(Drucktemperatur|Heizbett Temperatur|Trocknungstemperatur|Trocknungsdauer)$/.test(topic)),
  },
  '70f515d2b2875c2f': {
    value: (v) => {
      // "Impact Strength (X-Y)" to ISO 180 is an Izod test; the notch is not printed.
      if (v.property === 'Impact strength') return { ...v, post: 'Test sample is un-annealing', property: 'Izod impact strength', unit: 'kJ/m²', notch: 'Not published', notes: 'The row is labelled "Impact Strength (X-Y)" and cites ISO 180, the Izod method; the sheet prints the unit as "Kj/m" with its square on the next line.' };
      if (v.property === 'Tensile strength (endpoint unspecified)' && /538/.test(v.std)) return { ...v, post: 'Test sample is un-annealing', review: 'Fields: Standards. The sheet prints "ISO 538" beside its tensile strength, which names no tensile test (its other tensile rows cite ISO 527); no standard is recorded for it.', standardsOverride: NP };
      if (v.property === 'Melt mass-flow rate') return { ...v, notes: PRINT_SLIP('"ISO 1183", the density method, beside its melt index of 250 °C / 2.15 kg') };
      if (v.property === 'Density') return { ...v, review: 'Fields: Standards. The sheet prints "ISO 1183, GB/T1003"; GB/T 1003 names no density test (GB/T 1033 does), so only ISO 1183 is recorded.', standardsOverride: 'ISO 1183' };
      // "Note: Test sample is un-annealing TDS. You may see better mechanical properties once annealed" heads the table.
      if (v.specimenType === 'Printed specimen') return { ...v, post: 'Test sample is un-annealing' };
      return v;
    },
  },
};

// ---- build ---------------------------------------------------------------------------------------------------------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const packetDocs = [];
const gradeRows = new Map();
let nMeas = 0, nProf = 0, nGrades = 0;
for (const d of docs) {
  const reading = [...readings.values()].find((r) => r.sha256.startsWith(d.sha256));
  if (!reading) throw new Error(`${d.name}: no reading`);
  d.sha256 = reading.sha256;
  const text = cachedText(d.sha256);
  if (!text) throw new Error(`${d.name}: no cached text`);
  const sourceId = `R-${d.slug}-QR-20261007-${d.sha256.slice(0, 12)}`;
  const review = REVIEW[d.sha256.slice(0, 16)] ?? {};
  const grades = d.grades.map((g) => {
    if (g.existing) {
      const row = t.get('grades', g.existing);
      return { key: g.key, row: { ...row }, review: { status: 'accepted', by: BY, date: DATE, note: 'Existing exact product binding; the grade, its material and its primary source are unchanged.' } };
    }
    const first = g.sameAs ? gradeRows.get(g.sameAs) : null;
    const row = first ? { ...first } : {
      MaterialID: g.materialId, Role: 'procurement', Status: 'active', Manufacturer: g.manufacturer, 'Product name': g.product,
      'Shared formulation key': g.formulationKey ?? sourceId, 'Composition / filler': g.composition ?? NP, Variant: NA,
      'Colour caveat': 'Properties may vary by colour; use TDS scope', Availability: g.availability ?? NP, 'Certification claims': NP,
      'Selected-grade rationale': 'Documented commercial formulation; traceable manufacturer evidence',
      SourceID: sourceId, 'Source locator': 'TDS / official product page', 'Diameter compatibility': 'Check 1.75 mm variant; diameter is not part tolerance',
    };
    if (!first) gradeRows.set(d.name, row);
    return { key: g.key, row, review: { status: 'accepted', by: BY, date: DATE, note: g.note }, evidence: { page: 1, text: g.evidence } };
  });
  const materialOf = grades[0].row.MaterialID;
  const measurements = [];
  for (const v0 of reading.values) {
    const v = review.value ? review.value(v0) : v0;
    if (!v) continue;
    const m = meas({ sourceId, materialId: materialOf }, {
      page: v.page, property: v.property, label: v.label, unit: v.unit, raw: v.raw, num: v.num, op: v.op ?? '=', line: v.line, std: v.std ?? '',
      direction: v.direction ?? NA, notch: v.notch, testTemp: v.testTemp, moisture: v.moisture, post: v.post, specimenType: v.specimenType,
      params: v.params, locator: v.locator, notes: v.notes, status: v.status, review: v.review,
    });
    if (v.standardsOverride) m.row.Standards = v.standardsOverride;
    measurements.push(stamp(m, text, { visual: true, visualNote: 'Every number was read on the page image by the reader and checked again on it by the reviewer.' }));
  }
  measurements.forEach((m, i) => { m.id = `m${String(i + 1).padStart(3, '0')}`; });
  const profileSpecs = review.profiles ? review.profiles(reading.profiles) : reading.profiles;
  const profiles = profileSpecs.map((p) => profile({ sourceId, materialId: materialOf }, {
    page: p.page, locator: p.locator, cells: review.cells ? review.cells(p.cells) : p.cells, lines: p.lines, evidence: p.evidence,
    notes: topics(review.notes ? review.notes(p.notes ?? []) : (p.notes ?? [])),
  }));
  const sourceRow = {
    SourceID: sourceId, Publisher: d.publisher, Title: d.title, Revision: d.revision ?? NP, 'Publication date': d.published ?? NP, 'Access date': d.accessed ?? DATE,
    'Source class': d.sourceClass, 'Source note': d.sourceNote, 'Citation role': 'cited', URL: d.url, Locator: 'Document / product page',
    'Applicable grades': grades.map((g) => (g.row.GradeID ? `${g.row.MaterialID} / ${g.row.GradeID}` : `\${grade:${g.key}}`)).join('; '), 'Access state': 'retrieved',
    'Access note': d.accessNoteFull ?? d.accessNote ?? STAGED(d.url), SHA256: d.sha256,
  };
  const skipped = [...reading.skipped, ...(review.skipped ?? [])];
  const proposal = {
    version: 1, generated: { tool: 'build-b45.mjs (quality round 2026-10-07)', date: DATE },
    document: { sha256: d.sha256, url: d.url, pages: text.pages.length, provider: d.provider, manufacturer: d.publisher, docKey: `${d.url}#b45` },
    identity: { polymer: null, materialId: materialOf, note: d.identityNote },
    source: { row: sourceRow, evidence: { page: 1, text: reading.identityLine }, review: { status: 'accepted', by: BY, date: DATE } },
    grades, measurements, profiles, evidence: [], headlines: [], coverage: [], settings: [], acceptances: [],
    skipped: skipped.map((note) => ({ note })),
    review: { status: 'reviewed', by: BY, date: DATE, note: `Read page by page on the page images and against the cached text: ${measurements.length} value(s) and ${profiles.length} print profile(s) for ${grades.length} product(s); ${skipped.length} omission(s) are reasoned in skipped.` },
  };
  const name = `${d.sha256.slice(0, 16)}.json`;
  const body = `${JSON.stringify(proposal, null, 2)}\n`;
  writeFileSync(join(OUT, name), body);
  nMeas += measurements.length; nProf += profiles.length; nGrades += grades.filter((g) => !g.row.GradeID).length;
  packetDocs.push({
    File: name, ProposalSHA256: sha(body), OriginalSHA256: d.sha256, Source: sourceRow,
    Grades: grades.map((g) => ({ Key: g.key, GradeID: g.row.GradeID ?? null, MaterialID: g.row.MaterialID, Manufacturer: g.row.Manufacturer, 'Product name': g.row['Product name'] })),
    Values: measurements.length, Profiles: profiles.length, Skipped: skipped,
  });
}

const packet = {
  PacketID: 'b45-quality-round', Batch: 'b45', Documents: packetDocs,
  Totals: { Documents: packetDocs.length, NewGrades: nGrades, Values: nMeas, Profiles: nProf },
  NewVocabulary: [{ Vocabulary: 'manufacturers', Value: 'DREMC', Meaning: 'Australian maker and shop (DREMC, store.dremc.com.au); sells its own filament line under the DREMC name.', Aliases: 'DREMC 3D' }],
  Review: { prepared_by: BY, scope: 'five documents: a not-retrieved sheet found in the Internet Archive, three documents for two thin materials, and a sheet held for its identity until R179' },
  NotAdmitted: [
    { Document: 'DREMC Support for PLA/PETG product page (store.dremc.com.au, f63f2f7aa307)', Why: 'its settings (bed 100-110 °C, a 60-80 °C enclosure) are not a support printed beside PLA and read as another product\'s template, its SKU is DR-SUPPORT-PP and it names no polymer: a page that contradicts its product is not entered on the reviewer\'s word. Left for the owner.' },
    { Document: 'Z-Polymers Tullomer TDS 1.8 (7d15f954a020)', Why: 'the sheet names no polymer (only "Tullomer"), and the maker\'s product page as served names none either; filed as LCP only on press reports, which R205 does not admit. Not entered.' },
    { Document: 'BASF Forward AM hub pages for Ultrafuse 17-4 PH, PPSU and Support Layer (Internet Archive), Eryone ABS+ TDS (2023), iSANMATE ASA, PA12 CF and CF-PC (2023-2024), Polymaker PolyCast TDS V5.2', Why: 'fetched again (docs/audits/2026-10-07-quality-round/web/refetch.csv) but not entered: products the catalogue does not hold (17-4 PH, PPSU, Support Layer, ABS+), or earlier editions of sheets already entered in a later revision (iSANMATE, PolyCast V5.5).' },
    { Document: 'purefil LCP, purefil TPV 98A and Fillamentum NonOilen product pages', Why: 'they repeat the print settings their products\' registered sheets already give (P1467, P1452, P1396 and P1397) and add no setting a column holds.' },
  ],
};
const body = `${JSON.stringify(packet, null, 2)}\n`;
writeFileSync(`${HERE}/b45-packet.json`, body);
console.log(`${packetDocs.length} proposals, ${nGrades} new grades, ${nMeas} values, ${nProf} profiles; packet sha ${sha(body).slice(0, 12)}`);
writeFileSync(MIGRATION, readFileSync(MIGRATION, 'utf8').replace(/const PACKET_SHA256 = '[^']*';/, `const PACKET_SHA256 = '${sha(body)}';`));
