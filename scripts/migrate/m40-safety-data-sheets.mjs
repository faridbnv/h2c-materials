#!/usr/bin/env node
// Migration m40: the first safety data sheets, and the declared composition of the seven grades m39 added.
//
// docs/audits/2026-09-17-data-gaps/REPORT.md's third finding is a source-class problem: composition, burning
// behaviour, ventilation and disposal are printed by no technical data sheet, so no amount of TDS reading reaches
// them. The owner decided on 2026-09-17 that the class is `Manufacturer SDS`; this migration adds that value to
// schema/vocab/source-classes.csv in the same commit as the first data that uses it (AGENTS.md).
//
// Six of the seven products m39 filed publish a safety data sheet. Each was fetched from the publisher's own URL
// on 2026-09-17, cached under .cache/sources by SourceID and hashed:
//
//   a5806c16 CarbonX CF ASA SDS v1.1        cdn.shopify.com (3DXTECH)
//   bf2ed4e2 Raise3D Industrial PPA CF SDS  s1.raise3d.com
//   1cb7ada0 Fibreheart ABS-GF SDS          drive.google.com, linked from siraya.tech/pages/msds
//   9962541a Fibreheart PPA-CF SDS          the same
//   5a0c0285 Fibreheart PPA-CF Core SDS     the same
//   9397bea4 Fibreheart PPA-GF SDS          the same
//
// Siraya Tech serves a later revision of its four sheets than the copies the owner supplied (the product-title
// wording differs). The owner's decision, 2026-09-17, is that the currently-served file is the source of record,
// so these digests are what siraya.tech serves and `npm run audit:sources` will keep re-verifying them.
//
// Fibreheart PPA (G069-02) has no safety data sheet on that page, so it keeps its TDS composition.
//
// What this migration does NOT take from the four Siraya sheets, and why.
//
// Their sections 5, 7, 10, 12 and 13 are word-for-word identical across all four documents, although the four
// products are three different polymers with two different fibres. Two of those shared statements are wrong for
// the products that carry them:
//
//   - 10.4 "Avoid temperatures above 240 ºC" appears on the PPA-CF, PPA-CF Core and PPA-GF sheets, whose own
//     technical data sheets specify a 300-320 °C nozzle. A grade-level record saying the material must stay below
//     its own printing temperature would be read as a design limit, and it is not one.
//   - 5.3 and 10.6 name acetic acid among the decomposition products of all four. Acetic acid is the signature of
//     a vinyl-acetate or cellulose-acetate polymer, not of ABS or of a polyphthalamide.
//
// So the composition (section 3, which is product-specific and differs on every sheet) is recorded, together with
// the handling, storage and disposal statements, which are generic but true of any filament. The burning
// chemistry and the "conditions to avoid" of those four sheets are left out as publisher boilerplate rather than
// statements about these products, and this is the reason on record. The 3DXTECH and Raise3D sheets are not
// templated this way - 3DXTECH names hydrogen cyanide, which is what an acrylonitrile polymer does produce - so
// their flammability and stability statements are recorded. The rule this establishes is D66.
//
// Nothing here resolves coverage row C00003, the register's open composition conflict: that one asks for a
// declaration from iSANMATE about G019-02 PLA Glass Fiber, whose SDS is not among these six.

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables, nextId, projectRoot } from '../data/table-io.mjs';

const MIGRATION = 'm40';
const DATE = '2026-09-17';
const NA = 'Not applicable';
const NP = 'Not published';

// The source class this migration introduces. It goes into schema/vocab/source-classes.csv in this same commit.
export const SOURCE_CLASS = 'Manufacturer SDS';

// ------------------------------------------------------------------------------------ sources
const SOURCES = [
  { SourceID: 'X-CarbonX-CF-ASA-SDS-v1-1', Publisher: '3DXTECH', Title: 'Safety Data Sheet: CarbonX™ CF-ASA',
    Revision: 'V1.1', 'Publication date': '2022-08-01', 'Source class': SOURCE_CLASS, 'Citation role': 'cited',
    URL: 'https://cdn.shopify.com/s/files/1/0625/4185/6821/files/CarbonX_CF_ASA_SDS_v1.1.pdf',
    Locator: 'p. 1: identification, hazards and composition; p. 2: fire, handling, storage and exposure controls; p. 3: stability, decomposition, disposal and transport',
    'Applicable grades': 'G033-02 (3DXTECH CarbonX CF ASA)',
    'Access status': 'Retrieved', SHA256: 'a5806c168de462d5ddbb144d08404422209d940caa256d8bcd3fd0c40839a2ff' },

  { SourceID: 'D-RAISE3D-Industrial-PPA-CF-SDS-V1-2', Publisher: 'Raise3D', Title: 'Raise3D Industrial PPA CF Safety Data Sheet',
    Revision: 'Version 1.2', 'Publication date': '2023-02', 'Source class': SOURCE_CLASS, 'Citation role': 'cited',
    URL: 'https://s1.raise3d.com/2023/02/Raise3D-Industrial-PPA-CF_SDS_V1.2.pdf',
    Locator: 'p. 2: composition and information on ingredients; p. 4: handling and storage; p. 7: stability and reactivity; p. 9: disposal considerations',
    'Applicable grades': 'G070-04 (Raise3D Industrial PPA CF)',
    'Access status': 'Retrieved', SHA256: 'bf2ed4e2595c8225774f6d1d5dc2ab1e1b36254c7bb4155113ce176ba748ba0a' },

  { SourceID: 'D-SIRAYA-Fibreheart-ABS-GF-SDS', Publisher: 'Siraya Tech', Title: 'Material Safety Data Sheet: Siraya Tech ABS-GF',
    Revision: NP, 'Publication date': NP, 'Source class': SOURCE_CLASS, 'Citation role': 'cited',
    URL: 'https://drive.google.com/file/d/1fmW2wikLsuWH39cW6p6NCg_kPwikk_LV/view',
    Locator: 'p. 2: composition and information on ingredients, and fire fighting measures; p. 3: safe handling and storage; p. 4: chemical stability and waste disposal',
    'Applicable grades': 'G028-02 (Siraya Tech Fibreheart ABS-GF)',
    'Access status': 'Retrieved; the currently-served revision, which differs from the copy the owner supplied', SHA256: '1cb7ada0a4e3e63f3dd0423fb69e5b5af78f9b817cba5b351edbe510489011b7' },

  { SourceID: 'D-SIRAYA-Fibreheart-PPA-CF-SDS', Publisher: 'Siraya Tech', Title: 'Material Safety Data Sheet: Siraya Tech PAHT-CF',
    Revision: NP, 'Publication date': NP, 'Source class': SOURCE_CLASS, 'Citation role': 'cited',
    URL: 'https://drive.google.com/file/d/1OiaxrW6QL_WKWPO6mBTX9f6EjZyiKBlB/view',
    Locator: 'p. 2: composition and information on ingredients, and fire fighting measures; p. 3: safe handling and storage; p. 4: chemical stability and waste disposal',
    'Applicable grades': 'G070-02 (Siraya Tech Fibreheart PPA-CF)',
    'Access status': 'Retrieved; the currently-served revision, which differs from the copy the owner supplied', SHA256: '9962541a7bd28b7731fe067f0da0dd7d6c941183cd260e4118fe5e5771c8a43a' },

  { SourceID: 'D-SIRAYA-Fibreheart-PPA-CF-Core-SDS', Publisher: 'Siraya Tech', Title: 'Material Safety Data Sheet: Siraya Tech PPA-CF Core',
    Revision: NP, 'Publication date': NP, 'Source class': SOURCE_CLASS, 'Citation role': 'cited',
    URL: 'https://drive.google.com/file/d/1GvDXi7KEz8I19IJP71tESdB9vGS48xr_/view',
    Locator: 'p. 2: composition and information on ingredients, and fire fighting measures; p. 3: safe handling and storage; p. 4: chemical stability and waste disposal',
    'Applicable grades': 'G070-03 (Siraya Tech Fibreheart PPA-CF Core)',
    'Access status': 'Retrieved; the currently-served revision, which differs from the copy the owner supplied', SHA256: '5a0c0285acd73f10fb88da7b1c95bb6b501f6e0000bf5bc5619c770957dff5c1' },

  { SourceID: 'D-SIRAYA-Fibreheart-PPA-GF-SDS', Publisher: 'Siraya Tech', Title: 'Material Safety Data Sheet: Siraya Tech PPA-GF',
    Revision: NP, 'Publication date': NP, 'Source class': SOURCE_CLASS, 'Citation role': 'cited',
    URL: 'https://drive.google.com/file/d/1M8Z-Ylnh9c9vY86NZx39tXCFKJoLirlJ/view',
    Locator: 'p. 2: composition and information on ingredients, and fire fighting measures; p. 3: safe handling and storage; p. 4: chemical stability and waste disposal',
    'Applicable grades': 'G071-02 (Siraya Tech Fibreheart PPA-GF)',
    'Access status': 'Retrieved; the currently-served revision, which differs from the copy the owner supplied', SHA256: '9397bea4de94af9a178d5ade8d633f4e8e13a1bc07a6475a480bde1762b8a691' },
];

// ------------------------------------------------------------------------------------ declared composition
// Section 3 of each sheet, in the sheet's own words, naming the document it came from (m26, m35, m37 precedents).
// `expect` is what m39 wrote from the technical data sheet, so a re-run after the data moved stops.
const COMPOSITION = [
  { GradeID: 'G033-02', SourceID: 'X-CarbonX-CF-ASA-SDS-v1-1', page: 1,
    expect: 'Carbon-fibre reinforced ASA (TDS p. 1, title); the fibre loading is not stated on the data sheet',
    value: 'ASA Resin (CAS 26299-47-8) > 85 %, Carbon Fiber (CAS 308063-67-4) < 15 %, as the SDS declares (X-CarbonX-CF-ASA-SDS-v1-1, p. 1, section 3)' },

  { GradeID: 'G028-02', SourceID: 'D-SIRAYA-Fibreheart-ABS-GF-SDS', page: 2,
    expect: 'Glass-fibre reinforced ABS (TDS p. 1); the fibre loading is not stated on the data sheet',
    value: 'Acrylonitrile Butadiene Styrene (CAS 9003-56-9) 78-82 %, Glass Fiber (CAS 65997-17-3) 18-22 %, as the SDS declares (D-SIRAYA-Fibreheart-ABS-GF-SDS, p. 2, section 3)' },

  { GradeID: 'G070-02', SourceID: 'D-SIRAYA-Fibreheart-PPA-CF-SDS', page: 2,
    expect: 'Carbon-fibre reinforced polyphthalamide (TDS p. 1); the fibre loading is not stated on the data sheet',
    value: 'Polyphthalamide (PPA) (CAS 27135-32-6) 80-85 %, Carbon Fiber (CAS 7440-44-0) 15-20 %, as the SDS declares (D-SIRAYA-Fibreheart-PPA-CF-SDS, p. 2, section 3)' },

  { GradeID: 'G070-03', SourceID: 'D-SIRAYA-Fibreheart-PPA-CF-Core-SDS', page: 2,
    expect: 'Carbon-fibre reinforced polyphthalamide in a core-shell filament construction (TDS p. 3, Material Specifications: base material Polyphthalamide); the fibre loading is not stated on the data sheet',
    value: 'Polyphthalamide (PPA) (CAS 27135-32-6) 70-80 %, Carbon Fiber (CAS 7440-44-0) 20-25 %, as the SDS declares (D-SIRAYA-Fibreheart-PPA-CF-Core-SDS, p. 2, section 3); the filament is a core-shell construction (TDS p. 3)' },

  { GradeID: 'G070-04', SourceID: 'D-RAISE3D-Industrial-PPA-CF-SDS-V1-2', page: 2,
    expect: 'Polyphthalamide with 15 wt.% chopped carbon fibre (TDS p. 1, product description)',
    value: 'Polyphthalamide (CAS 27135-32-6) > 80 %, Chopped Carbon (CAS 7440-44-0, EC 231-153-3) 10-30 %, as the SDS declares (D-RAISE3D-Industrial-PPA-CF-SDS-V1-2, p. 2, section 3). The technical data sheet states 15 wt.% chopped carbon fibre, inside that range' },

  { GradeID: 'G071-02', SourceID: 'D-SIRAYA-Fibreheart-PPA-GF-SDS', page: 2,
    expect: 'Polyphthalamide with 15 % glass fibre (TDS p. 1)',
    value: 'Polyphthalamide (PPA) (CAS 27135-32-6) 80-85 %, Glass Fiber (CAS 65997-17-3) 15-20 %, as the SDS declares (D-SIRAYA-Fibreheart-PPA-GF-SDS, p. 2, section 3). The technical data sheet states 15 % glass fibre, at the bottom of that range' },
];

// ------------------------------------------------------------------------------------ evidence
const E_DEFAULTS = { 'Rating 1–5': NP, RubricID: NA, 'Evidence type': 'Manufacturer statement' };

const SIRAYA_HANDLING = 'Handle in accordance with good industrial hygiene and safety practice. Do not eat, drink or smoke at the workplace. Avoid dust formation by cutting or grinding. During printing, ensure good ventilation and local exhaust.';
const SIRAYA_STORAGE = 'To ensure technical integrity of the product store in the original container/box and keep at temperatures below 50ºC and in a dry place. Protect from moisture, product may be hygroscopic.';
const SIRAYA_DISPOSAL = 'Dispose of in accordance with local regulations.';
const SIRAYA_SHARED = 'SDS section as published. This wording is identical on all four Siraya Tech filament safety data sheets, so it is a publisher statement about its filaments generally, not a measurement of this product.';

/** The three statements every Siraya sheet makes, for one grade. */
const sirayaRows = (materialId, gradeId, sourceId) => [
  { MaterialID: materialId, GradeID: gradeId, Domain: 'Safety', Topic: 'Processing ventilation',
    Finding: SIRAYA_HANDLING, 'Exposure / conditions': SIRAYA_SHARED, SourceID: sourceId, Locator: 'p. 3: section 7.1, Precautions for safe handling' },
  { MaterialID: materialId, GradeID: gradeId, Domain: 'Environmental', Topic: 'Moisture handling',
    Finding: SIRAYA_STORAGE, 'Exposure / conditions': SIRAYA_SHARED, SourceID: sourceId, Locator: 'p. 3: section 7.2, Conditions for safe storage' },
  { MaterialID: materialId, GradeID: gradeId, Domain: 'Circularity', Topic: 'Disposal',
    Finding: SIRAYA_DISPOSAL, 'Exposure / conditions': SIRAYA_SHARED, SourceID: sourceId, Locator: 'p. 4: section 13.1, Waste treatment methods' },
];

const EVIDENCE = [
  // 3DXTECH CarbonX CF ASA. Not a shared template: the decomposition products it names are what an acrylonitrile
  // polymer actually produces, so its flammability and stability statements are recorded.
  { MaterialID: 'M033', GradeID: 'G033-02', Domain: 'Safety', Topic: 'Processing ventilation',
    Finding: 'Local exhaust is preferred. Product as shipped is not a combustible dust; mechanical handling can cause the formation of dusts.',
    'Exposure / conditions': 'SDS sections 7 and 8 as published; validate against the workplace assessment.',
    SourceID: 'X-CarbonX-CF-ASA-SDS-v1-1', Locator: 'p. 2: sections 7 and 8, Handling and storage conditions, Ventilation' },
  { MaterialID: 'M033', GradeID: 'G033-02', Domain: 'Flammability', Topic: 'Flammability',
    Finding: 'Thermal decomposition can yield intense heat, dense smoke, phenols, hydrogen cyanide, carbon dioxide, and carbon monoxide.',
    'Exposure / conditions': 'SDS section 10 as published. A statement about burning, not a fire rating; no UL 94 classification is claimed.',
    SourceID: 'X-CarbonX-CF-ASA-SDS-v1-1', Locator: 'p. 3: section 10, Hazardous decomposition byproducts' },
  { MaterialID: 'M033', GradeID: 'G033-02', Domain: 'Circularity', Topic: 'Disposal',
    Finding: 'Waste or unused product may be discarded in accordance with state, federal, and local regulations.',
    'Exposure / conditions': 'SDS section 13 as published.',
    SourceID: 'X-CarbonX-CF-ASA-SDS-v1-1', Locator: 'p. 3: section 13, Disposal' },

  // Raise3D Industrial PPA CF. A full EU-format sheet, product-specific throughout.
  { MaterialID: 'M070', GradeID: 'G070-04', Domain: 'Safety', Topic: 'Processing ventilation',
    Finding: 'Ensure good ventilation / exhaustion at the workplace. Wash thoroughly after handling.',
    'Exposure / conditions': 'SDS section 7.1 as published; validate against the workplace assessment.',
    SourceID: 'D-RAISE3D-Industrial-PPA-CF-SDS-V1-2', Locator: 'p. 4: section 7.1, Advice on safe handling' },
  { MaterialID: 'M070', GradeID: 'G070-04', Domain: 'Environmental', Topic: 'Moisture handling',
    Finding: 'Store spool in a dry, cool and ventilated place, at a storage temperature above 0 °C and at or below 40 °C.',
    'Exposure / conditions': 'SDS section 7.2 as published.',
    SourceID: 'D-RAISE3D-Industrial-PPA-CF-SDS-V1-2', Locator: 'p. 4: section 7.2, Conditions for safe storage' },
  { MaterialID: 'M070', GradeID: 'G070-04', Domain: 'Safety', Topic: 'Chemical stability',
    Finding: 'Stable at room temperature in closed containers under normal storage and handling conditions. No decomposition if stored and applied as directed.',
    'Exposure / conditions': 'SDS sections 7.2 and 10.2 as published.',
    SourceID: 'D-RAISE3D-Industrial-PPA-CF-SDS-V1-2', Locator: 'p. 7: section 10.2, Chemical stability' },
  { MaterialID: 'M070', GradeID: 'G070-04', Domain: 'Circularity', Topic: 'Disposal',
    Finding: 'The material should be disposed of by incineration in a chemical incinerator in compliance with national and regional requirements.',
    'Exposure / conditions': 'SDS section 13.1 as published.',
    SourceID: 'D-RAISE3D-Industrial-PPA-CF-SDS-V1-2', Locator: 'p. 9: section 13.1, Waste treatment methods' },

  // The four Siraya sheets: the statements that are generic but true of any filament (see this file's header).
  ...sirayaRows('M028', 'G028-02', 'D-SIRAYA-Fibreheart-ABS-GF-SDS'),
  ...sirayaRows('M070', 'G070-02', 'D-SIRAYA-Fibreheart-PPA-CF-SDS'),
  ...sirayaRows('M070', 'G070-03', 'D-SIRAYA-Fibreheart-PPA-CF-Core-SDS'),
  ...sirayaRows('M071', 'G071-02', 'D-SIRAYA-Fibreheart-PPA-GF-SDS'),
];

// ------------------------------------------------------------------------------------ coverage
// A coverage row whose own words disagree with the records stops the build (COVERAGE-UNTRUE, D39). PPA-GF's
// Moisture / environmental row said the material had no exposure or moisture record of its own; its safety data
// sheet is now one. A row is never edited in place: it is superseded and replaced (AGENTS.md).
const COVERAGE_MOISTURE = [
  { MaterialID: 'M071', Domain: 'Moisture / environmental',
    Finding: `1 moisture record from this material's own source, recorded ${DATE} (${MIGRATION}): the Siraya Tech Fibreheart PPA-GF safety data sheet states the storage and hygroscopicity condition for the grade. It is a publisher statement about handling, not a measured exposure result, and the four Siraya sheets print it identically.` },
];

// ------------------------------------------------------------------------------------ the guard
// Every sheet must be cached and hash-matched, and every CAS number and percentage this migration records must be
// on the page its entry names, checked against the cached file's own text (D35).
const cachePath = (id) => join(projectRoot, '.cache/sources', `${id}.pdf`);

async function pageText(path) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(path)), useSystemFonts: true, verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    pages.push(items.map((i) => i.str ?? '').join('').replace(/\s+/g, ''));
  }
  return pages;
}

async function assertReadable() {
  const problems = [];
  const text = {};
  for (const s of SOURCES) {
    const path = cachePath(s.SourceID);
    if (!existsSync(path)) { problems.push(`${s.SourceID}: not cached at .cache/sources/${s.SourceID}.pdf`); continue; }
    const sha = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (sha !== s.SHA256) { problems.push(`${s.SourceID}: the cached file is ${sha.slice(0, 12)}, this migration was written against ${s.SHA256.slice(0, 12)}`); continue; }
    text[s.SourceID] = await pageText(path);
  }
  // Every CAS number and every percentage bound of a composition entry, on the page it names.
  for (const c of COMPOSITION) {
    const pages = text[c.SourceID];
    if (!pages) continue;
    const page = pages[c.page - 1];
    if (!page) { problems.push(`${c.SourceID}: page ${c.page} does not exist`); continue; }
    for (const cas of c.value.match(/CAS \d[\d-]+/g) ?? []) {
      const n = cas.slice(4);
      if (!page.includes(n)) problems.push(`${c.SourceID}: CAS ${n} (${c.GradeID}) is not on page ${c.page}`);
    }
    for (const pct of c.value.match(/(?:^|[ (])(\d+)-(\d+) %/g) ?? []) {
      for (const n of pct.match(/\d+/g)) {
        if (!page.includes(n)) problems.push(`${c.SourceID}: the loading "${n}" (${c.GradeID}) is not on page ${c.page}`);
      }
    }
  }
  if (problems.length) {
    throw new Error(`${MIGRATION}: nothing entered. Under D35 a value enters only from a fetched, hashed source, re-read page by page.\n  - ${problems.join('\n  - ')}`);
  }
}

export async function migrate(t) {
  await assertReadable();

  for (const s of SOURCES) if (!t.find('sources', s.SourceID)) t.append('sources', { 'Access date': DATE, ...s });

  for (const c of COMPOSITION) {
    const g = t.find('grades', c.GradeID);
    if (!g) throw new Error(`${MIGRATION}: ${c.GradeID} does not exist; run m39 first`);
    if (g['Composition / filler'] === c.value) continue;
    t.set('grades', c.GradeID, 'Composition / filler', c.value, { expect: c.expect });
  }

  for (const e of EVIDENCE) {
    if (t.rows('evidence').some((x) => x.SourceID === e.SourceID && x.GradeID === e.GradeID && x.Topic === e.Topic)) continue;
    t.append('evidence', { ...E_DEFAULTS, ...e, EvidenceID: nextId('evidence', t.rows('evidence').map((x) => x.EvidenceID)) });
  }

  for (const c of COVERAGE_MOISTURE) {
    const old = t.rows('coverage').find((r) => r.MaterialID === c.MaterialID && r.Domain === c.Domain && r.Status !== 'Superseded');
    if (!old) continue;
    // A re-run must be a no-op: the live row is already this migration's own.
    if (old.Finding.includes(`(${MIGRATION})`)) continue;
    const newId = nextId('coverage', t.rows('coverage').map((r) => r.CoverageID));
    t.append('coverage', {
      CoverageID: newId, MaterialID: c.MaterialID, Domain: c.Domain,
      Status: 'Evidence recorded', 'Manufacturer count': NA, Finding: c.Finding,
    });
    t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${newId} (${DATE}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  await migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
