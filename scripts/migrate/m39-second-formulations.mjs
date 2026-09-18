#!/usr/bin/env node
// Migration m39: the last second-formulation evidence the tensileStrengthXY screening back-test is short of.
//
// After m38, build/snapshot/screening.csv held hdt045 this-material at 23 cases (certified) and
// tensileStrengthXY this-material at 19. At maxWrongRate 0.1 and confidence 0.9 a screening limit needs 22
// (build/src/estimate/screening.js minimumCases), so that class was three short. A case there needs a SECOND
// FORMULATION of a material whose headline is already measured (D48, D59) — another Shared formulation key
// publishing a related kind: for strength, any tensile endpoint or a flexural strength, in any direction.
//
// docs/audits/2026-09-17-data-gaps/ledgers/strength-targets.csv ranks the 35 candidates. This migration takes the
// four the 2026-09-15 workstream itself named as appropriate for a second brand (open-items.md section 3) — ASA-CF
// M033, PPA-CF M070, PPA-GF M071, ABS-GF M028 — and PPA M069, which the same ledger lists. Five materials gain a
// second formulation, so the class reaches 24 and certifies with two cases of margin.
//
// The seven data sheets were supplied by the owner on 2026-09-17 and cached under .cache/sources by SourceID.
// Six were then re-fetched from the publisher's own URL and are byte-identical to the supplied copies:
//
//   4a5b3b41 CarbonX CF ASA TDS v1      cdn.shopify.com (3DXTECH)
//   e68562eb Raise3D Industrial PPA CF  s1.raise3d.com
//   f9e7f812 Fibreheart ABS-GF TDS      drive.google.com, linked from siraya.tech/pages/fibreheart-abs-gf-filament-tds
//   2a7e1fe3 Fibreheart PPA TDS         drive.google.com, linked from siraya.tech/pages/siraya-tech-fibreheart-ppa-filament-tds
//   6be1ce96 Fibreheart PPA-CF TDS      drive.google.com, linked from siraya.tech/pages/siraya-tech-fibreheart-paht-cf-ppa-based-tds
//   bc1acc67 Fibreheart PPA-CF Core TDS drive.google.com, linked from siraya.tech/pages/siraya-tech-fibreheart-ppa-cf-core-tds
//
// The seventh, Fibreheart PPA-GF, Siraya publishes only as a web page; it serves no PDF for it. The owner's PDF
// rendering is the cached document, and every value below was checked against the live page as well as the file.
// Each value was read from the cached file page by page, not from the owner's description of it (D35).
//
// Three rulings this migration makes, each open to revision:
//
// 1. PPA-CF Core is filed under M070 (PPA-CF). Its own Material Specifications table (p. 3) names the base
//    material Polyphthalamide and the product is carbon-fibre reinforced; the core-shell construction is a
//    filament geometry, not a different material class (D57). M070 therefore gains three formulations here.
// 2. The ABS-GF and PPA sheets print HDT as "Method A/B" without the loads. Their three sister sheets print
//    "Method A @ 1.80 MPa" and "Method B 0.45 MPa" explicitly, and both ISO 75 and ASTM D648 define A as the high
//    load and B as the low, so Test load MPa is typed 1.8 and 0.45 and each row's Parse review says the sheet named
//    the method rather than the load. Owner's decision, 2026-09-17; the rule is D65.
// 3. The ABS-GF sheet disagrees with itself on tensile strength: the p. 1 summary chart shows 44 MPa, the p. 2
//    Property Data table 46.5 MPa. The table is the sheet's detailed statement and carries the standard and the
//    direction, so 46.5 is the recorded value and the chart's 44 is in that row's Notes. Owner's decision,
//    2026-09-17. Its four sister sheets' charts agree with their tables, so this is a one-off.
//
// Deliberately not here:
//   - The 3DXTECH surface resistance (>10^9 ohm/sq, ASTM D257). No properties.csv row covers surface resistivity,
//     and adding one for a single observation would give the estimate model a covariate nothing has back-tested
//     (D58). It stays untranscribed by decision, and audit:sources will keep listing it.
//   - Biocompatibility ("Not Tested", "Not certified") on the Siraya sheets: a statement about testing, not a
//     measured property, and no registry row covers it.
//   - The safety data sheets of these same products. They are a source class of their own (Manufacturer SDS) and
//     land in m40 with the composition they declare.

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables, nextId, projectRoot } from '../data/table-io.mjs';

const MIGRATION = 'm39';
const DATE = '2026-09-17';
const NA = 'Not applicable';
const NP = 'Not published';
const ADDED = `Added ${DATE} (${MIGRATION}): re-read from the source document (SHA-256 recorded in sources.csv).`;

const PRINTED = 'Printed specimen';
const UNSTATED = 'Not published (do not assume printed)';
const DENSITY_FORM = 'Not published (density specimen form not explicitly established)';
const THERMAL = { Direction: NA };

// Post-processing wordings this migration introduces, with the state each declares (D53). They go into
// schema/vocab/post-processing.csv in this same commit, or the build stops. "Unannealed" and
// "Annealed (schedule not stated)" are already there and carry the two states the Siraya sheets publish.
export const POST_PROCESSING_WORDINGS = [
  ['All specimens were annealed at 100 °C for 8 h, and immerged in ambient temperature for 3 days prior to testing', 'annealed'],
];
// Likewise for schema/vocab/moisture-conditions.csv.
export const MOISTURE_WORDINGS = [
  ['Conditioned: immerged at ambient temperature for 3 days (medium not stated)', 'conditioned'],
  ['Wet (the row is labelled Wet; the sheet states no conditioning)', 'conditioned'],
];

const RAISE_TREATMENT = 'All specimens were annealed at 100 °C for 8 h, and immerged in ambient temperature for 3 days prior to testing';
const RAISE_MOISTURE = 'Conditioned: immerged at ambient temperature for 3 days (medium not stated)';
const SIRAYA_WET = 'Wet (the row is labelled Wet; the sheet states no conditioning)';
const UNANNEALED = 'Unannealed';
const ANNEALED = 'Annealed (schedule not stated)';

// The method-named HDT rows of the two sheets that print no load (ruling 2 above).
const METHOD_AB_NOTE = 'The sheet names the ISO/ASTM method rather than the load. Both ISO 75 and ASTM D648 define Method A as the high load and Method B as the low, and this publisher\'s PPA-CF, PPA-CF Core and PPA-GF sheets print "Method A @ 1.80 MPa" and "Method B 0.45 MPa" explicitly, so the load is typed from the method.';
// The typed load therefore differs from the parser's reading of the raw text on purpose, and says why (D35).
const methodParse = (method, load) => `The raw text states "${method}" and names no load, so the parser reads no stated load; the typed ${load} MPa is the load that method defines. Both ISO 75 and ASTM D648 define Method A as the high load and Method B as the low, and this publisher's other three sheets print the same methods with their loads. Owner's decision, ${DATE} (D65).`;

// ------------------------------------------------------------------------------------ sources
const SOURCES = [
  { SourceID: 'X-CarbonX-CF-ASA-TDS-v1', Publisher: '3DXTECH', Title: 'Technical Data Sheet: CarbonX™ Carbon Fiber ASA 3D Printing Filament',
    Revision: 'TDS Rev 1.0', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://cdn.shopify.com/s/files/1/0625/4185/6821/files/CarbonX_CF_ASA_TDS_v1.pdf',
    Locator: 'p. 1 (single page): physical, mechanical, thermal and electrical properties, and the printed-specimen conditions',
    'Applicable grades': 'G033-02 (3DXTECH CarbonX CF ASA, the second ASA-CF formulation)',
    'Access status': 'Retrieved; owner-supplied copy, byte-identical to the file 3DXTECH serves at this URL', SHA256: '4a5b3b4189abb6a2374654531e7d2f8fa9cd82b5f61ae65d582864e58759d3eb' },

  { SourceID: 'D-SIRAYA-Fibreheart-ABS-GF-TDS', Publisher: 'Siraya Tech', Title: 'Technical Data Sheet: Siraya Tech Fibreheart ABS-GF',
    Revision: NP, 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://drive.google.com/file/d/1f2ZP0RORUl6RalvYTG7vaFeEJBrTNoC2/view',
    Locator: 'p. 1: product introduction and the summary chart; p. 2: mechanical, other and filament properties; pp. 3-4: the printing workflow',
    'Applicable grades': 'G028-02 (Siraya Tech Fibreheart ABS-GF, the second ABS-GF formulation)',
    'Access status': 'Retrieved; owner-supplied copy, byte-identical to the file linked from siraya.tech/pages/fibreheart-abs-gf-filament-tds', SHA256: 'f9e7f812255ac13a520c0ff75593c741ce6e60fe8f903b7d9ad1067eec4601cc' },

  { SourceID: 'D-SIRAYA-Fibreheart-PPA-TDS', Publisher: 'Siraya Tech', Title: 'Technical Data Sheet: Siraya Tech Fibreheart PPA',
    Revision: NP, 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://drive.google.com/file/d/1GaGVCDdMkTlow4lEnktYVjDoS5o5WAKU/view',
    Locator: 'p. 2: mechanical properties; p. 3: other properties, including the dry and wet heat-deflection rows; pp. 4-5: the printing workflow',
    'Applicable grades': 'G069-02 (Siraya Tech Fibreheart PPA, the second PPA formulation)',
    'Access status': 'Retrieved; owner-supplied copy, byte-identical to the file linked from siraya.tech/pages/siraya-tech-fibreheart-ppa-filament-tds', SHA256: '2a7e1fe39bb4d35e3c86fa12ed7db5c67d2c753b9a32fa615d2ab184579c9d45' },

  { SourceID: 'D-SIRAYA-Fibreheart-PPA-CF-TDS', Publisher: 'Siraya Tech', Title: 'Technical Data Sheet: Siraya Tech Fibreheart PPA-CF',
    Revision: NP, 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://drive.google.com/file/d/1PelrzkuSeJ9APBa451_7qJ3t_MMKJH9H/view',
    Locator: 'p. 2: mechanical properties, unannealed and annealed; p. 3: other properties and the printing preparation; p. 4: the printing guide',
    'Applicable grades': 'G070-02 (Siraya Tech Fibreheart PPA-CF, a second PPA-CF formulation)',
    'Access status': 'Retrieved; owner-supplied copy, byte-identical to the file linked from siraya.tech/pages/siraya-tech-fibreheart-paht-cf-ppa-based-tds', SHA256: '6be1ce96d4674f5b82dcf113b386ee8017687581e88c73bdf99d0b88525ecc02' },

  { SourceID: 'D-SIRAYA-Fibreheart-PPA-CF-Core-TDS', Publisher: 'Siraya Tech', Title: 'Technical Data Sheet: Siraya Tech Fibreheart PPA-CF Core',
    Revision: NP, 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://drive.google.com/file/d/1BtsXWum9kAZEWi0dbaha2eKUp5DRORhS/view',
    Locator: 'p. 2: mechanical properties, unannealed and annealed; p. 3: other properties and the material specifications; p. 4: the printing preparation',
    'Applicable grades': 'G070-03 (Siraya Tech Fibreheart PPA-CF Core, a third PPA-CF formulation)',
    'Access status': 'Retrieved; owner-supplied copy, byte-identical to the file linked from siraya.tech/pages/siraya-tech-fibreheart-ppa-cf-core-tds', SHA256: 'bc1acc67abe5686d16c9367a12ca3fcb256cc7d3f7a7c56d4242f7eb4e0f9a4d' },

  // Siraya publishes this TDS as a web page and serves no PDF for it. The cached document is the owner's PDF
  // rendering, supplied 2026-09-17; every value below was checked against the live page as well as the file.
  { SourceID: 'D-SIRAYA-Fibreheart-PPA-GF-TDS', Publisher: 'Siraya Tech', Title: 'Fibreheart PPA-GF TDS for FDM printer',
    Revision: NP, 'Publication date': NP, 'Source class': 'Manufacturer TDS (web)', 'Citation role': 'cited',
    URL: 'https://siraya.tech/pages/fibreheart-ppa-gf-tds',
    Locator: 'p. 2: specifications, including filament density; p. 3: mechanical and other properties, unannealed and annealed; pp. 4-5: the printing workflow and the annealing recommendation',
    'Applicable grades': 'G071-02 (Siraya Tech Fibreheart PPA-GF, the second PPA-GF formulation)',
    'Access status': 'Retrieved; the publisher serves this TDS as a web page only. The cached document is the owner-supplied PDF rendering, whose values match the live page', SHA256: '5a2c215a17afb7e321277f53b7d729d3b0d1137bccd4b30ca70a5590e387ad15' },

  { SourceID: 'D-RAISE3D-Industrial-PPA-CF-TDS-V2-0', Publisher: 'Raise3D', Title: 'Raise3D Industrial PPA CF Technical Data Sheet',
    Revision: 'Version 2.0', 'Publication date': '2022-04', 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://s1.raise3d.com/2022/04/Raise3D-Industrial-PPA-CF_TDS-V21.pdf',
    Locator: 'p. 1: product description and filament specifications, including heat deflection at both loads; p. 2: mechanical properties on conditioned specimens and the handling notes; p. 3: the testing specimen drawings',
    'Applicable grades': 'G070-04 (Raise3D Industrial PPA CF, a fourth PPA-CF formulation)',
    'Access status': 'Retrieved; owner-supplied copy, byte-identical to the file Raise3D serves at this URL', SHA256: 'e68562eba591df9ac5b1fcf52de58e34152c289c7d529ac70797fca355322850' },
];

// ------------------------------------------------------------------------------------ grades
const GRADE_DEFAULTS = {
  Role: 'procurement', Status: 'active', Variant: NA, 'Certification claims': NP,
  'Colour caveat': 'Properties may vary by colour; use TDS scope',
  'Diameter compatibility': 'Check 1.75 mm variant; diameter is not part tolerance',
};
const rationale = (material, adds) => `Second ${material} manufacturer, added ${DATE} (${MIGRATION}): it publishes ${adds}, which gives the screening back-test a second-formulation case for this material (D48, D59).`;

const GRADES = [
  { key: 'carbonx-cf-asa', MaterialID: 'M033', Manufacturer: '3DXTECH', 'Product name': 'CarbonX CF ASA',
    'Shared formulation key': 'X-CarbonX-CF-ASA-TDS-v1',
    'Composition / filler': 'Carbon-fibre reinforced ASA (TDS p. 1, title); the fibre loading is not stated on the data sheet',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'X-CarbonX-CF-ASA-TDS-v1',
    'Source locator': 'TDS Rev 1.0, p. 1', 'Selected-grade rationale': rationale('ASA-CF', 'a printed X-Y tensile break strength and flexural strength, and heat deflection at 0.45 MPa') },

  { key: 'fibreheart-abs-gf', MaterialID: 'M028', Manufacturer: 'Siraya Tech', 'Product name': 'Fibreheart ABS-GF',
    'Shared formulation key': 'D-SIRAYA-Fibreheart-ABS-GF-TDS',
    'Composition / filler': 'Glass-fibre reinforced ABS (TDS p. 1); the fibre loading is not stated on the data sheet',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'D-SIRAYA-Fibreheart-ABS-GF-TDS',
    'Source locator': 'pp. 1-2', 'Selected-grade rationale': rationale('ABS-GF', 'a tensile break strength tested on the X/Y axis, a bending strength and heat deflection at both loads') },

  { key: 'fibreheart-ppa', MaterialID: 'M069', Manufacturer: 'Siraya Tech', 'Product name': 'Fibreheart PPA',
    'Shared formulation key': 'D-SIRAYA-Fibreheart-PPA-TDS',
    'Composition / filler': 'Polyphthalamide, unfilled (TDS p. 1); no filler disclosed',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'D-SIRAYA-Fibreheart-PPA-TDS',
    'Source locator': 'pp. 2-3', 'Selected-grade rationale': rationale('PPA', 'a tensile break strength, a bending strength and heat deflection at both loads in a dry and a wet state') },

  { key: 'fibreheart-ppa-cf', MaterialID: 'M070', Manufacturer: 'Siraya Tech', 'Product name': 'Fibreheart PPA-CF',
    'Shared formulation key': 'D-SIRAYA-Fibreheart-PPA-CF-TDS',
    'Composition / filler': 'Carbon-fibre reinforced polyphthalamide (TDS p. 1); the fibre loading is not stated on the data sheet',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'D-SIRAYA-Fibreheart-PPA-CF-TDS',
    'Source locator': 'pp. 2-3', 'Selected-grade rationale': rationale('PPA-CF', 'a tensile break strength, a bending strength and heat deflection at both loads, each in an unannealed and an annealed state') },

  // Filed under M070 by the identity ruling in this file's header (D57): the sheet's own Material Specifications
  // name the base material Polyphthalamide, and core-shell is a filament construction, not a material class.
  { key: 'fibreheart-ppa-cf-core', MaterialID: 'M070', Manufacturer: 'Siraya Tech', 'Product name': 'Fibreheart PPA-CF Core',
    'Shared formulation key': 'D-SIRAYA-Fibreheart-PPA-CF-Core-TDS',
    'Composition / filler': 'Carbon-fibre reinforced polyphthalamide in a core-shell filament construction (TDS p. 3, Material Specifications: base material Polyphthalamide); the fibre loading is not stated on the data sheet',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'D-SIRAYA-Fibreheart-PPA-CF-Core-TDS',
    'Source locator': 'pp. 2-3', 'Selected-grade rationale': rationale('PPA-CF', 'a tensile break strength, a bending strength and heat deflection at both loads, each in an unannealed and an annealed state') },

  { key: 'fibreheart-ppa-gf', MaterialID: 'M071', Manufacturer: 'Siraya Tech', 'Product name': 'Fibreheart PPA-GF',
    'Shared formulation key': 'D-SIRAYA-Fibreheart-PPA-GF-TDS',
    'Composition / filler': 'Polyphthalamide with 15 % glass fibre (TDS p. 1)',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'D-SIRAYA-Fibreheart-PPA-GF-TDS',
    'Source locator': 'pp. 2-3', 'Selected-grade rationale': rationale('PPA-GF', 'printed X-Y and Z tensile break strengths, a bending strength and heat deflection at both loads, each in an unannealed and an annealed state') },

  { key: 'raise3d-ppa-cf', MaterialID: 'M070', Manufacturer: 'Raise3D', 'Product name': 'Industrial PPA CF',
    'Shared formulation key': 'D-RAISE3D-Industrial-PPA-CF-TDS-V2-0',
    'Composition / filler': 'Polyphthalamide with 15 wt.% chopped carbon fibre (TDS p. 1, product description)',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'D-RAISE3D-Industrial-PPA-CF-TDS-V2-0',
    'Source locator': 'Version 2.0, pp. 1-2', 'Selected-grade rationale': rationale('PPA-CF', 'a printed X-Y tensile strength and bending strength on conditioned specimens, and heat deflection at both loads') },
];

const EXPECTED_GRADE_IDS = {
  'carbonx-cf-asa': 'G033-02', 'fibreheart-abs-gf': 'G028-02', 'fibreheart-ppa': 'G069-02',
  'fibreheart-ppa-cf': 'G070-02', 'fibreheart-ppa-cf-core': 'G070-03', 'fibreheart-ppa-gf': 'G071-02',
  'raise3d-ppa-cf': 'G070-04',
};

// ------------------------------------------------------------------------------------ measurement builders
const M_DEFAULTS = {
  'Raw uncertainty ±': NA, 'Raw upper bound': NA, Operator: '=', 'Conversion factor': '1',
  'Normalized uncertainty ±': NA, 'Normalized upper bound': NA,
  'Data status': 'Published value', 'Specimen type': UNSTATED,
  Direction: NP, 'Moisture condition': NP, 'Post-processing': NP, 'Anneal °C': NA, 'Anneal h': NA,
  'Test temperature': NP, 'Test load MPa': NA, Notch: NA,
  'Specimen / print parameters': NP, Notes: NA, 'Parse review': NA,
};

const UNIT = {
  MPa: ['MPa', 1], MPaGPa: ['GPa', 0.001], pct: ['%', 1], C: ['°C', 1],
  gcc: ['kg/m³', 1000], kJm2: ['kJ/m²', 1], g10: ['g/10 min', 1], ShoreD: ['Shore D', 1],
};
const round = (x) => Number(x.toPrecision(10));

/** A published number: the sheet's own text, its unit as printed, and the conversion the build reconciles. */
function num(property, raw, rawUnit, unitKey, standard, locator, over = {}) {
  const [unit, factor] = UNIT[unitKey];
  const m = /^(-?[\d.]+)(?:\s*±\s*([\d.]+))?/.exec(String(raw).replace(/^[<>]\s*/, ''));
  if (!m) throw new Error(`${MIGRATION}: cannot read a number from ${JSON.stringify(raw)}`);
  const value = Number(m[1]);
  const unc = m[2] == null ? null : Number(m[2]);
  return {
    ...M_DEFAULTS, Property: property,
    'Raw value': String(raw), 'Raw unit': rawUnit, 'Raw numeric': String(value),
    'Raw uncertainty ±': unc == null ? NA : String(unc),
    'Conversion factor': String(factor), 'Normalized value': String(round(value * factor)),
    'Normalized uncertainty ±': unc == null ? NA : String(round(unc * factor)),
    'Normalized unit': unit, 'Standard / load': standard, Locator: locator, ...over,
  };
}

// ------------------------------------------------------------------------------------ measurements
const ISO527 = 'ISO 527';
const ISO178 = 'ISO 178';
const ISO179 = 'ISO 179';
const ISO306 = 'ISO 306';
const ISO1183 = 'ISO 1183';
const ISO62 = 'ISO 62';
const D638 = 'ASTM D638';
const D3418 = 'ASTM D3418';

/** The Siraya sheets that publish an unannealed and an annealed column of the same table. */
const siraya = (state, over = {}) => ({
  'Post-processing': state === 'annealed' ? ANNEALED : UNANNEALED,
  'Anneal °C': state === 'annealed' ? NP : NA,
  'Anneal h': state === 'annealed' ? NP : NA,
  ...over,
});

/** One property of such a table: the unannealed value, then the annealed one where the sheet prints it. */
function pair(page, table, label, property, unitKey, rawUnit, standard, values, over = {}) {
  const rows = [];
  for (const [state, raw] of Object.entries(values)) {
    if (raw == null) continue;
    rows.push(num(property, raw, rawUnit, unitKey, standard,
      `p. ${page}: ${table}, ${label}, ${state === 'annealed' ? 'Annealed' : 'Unannealed'}`,
      { ...siraya(state), ...over }));
  }
  return rows;
}

const MEASUREMENTS = {
  // ---------------------------------------------------------------- 3DXTECH CarbonX CF ASA (M033, G033-02)
  // A single page. "Printed Specimen Conditions" names the printer, nozzle, layer height, infill, temperatures
  // and the specimen orientation, so the mechanical bars are printed and their direction is the sheet's own.
  'carbonx-cf-asa': { MaterialID: 'M033', SourceID: 'X-CarbonX-CF-ASA-TDS-v1', rows: [
    num('Density', '1.11', 'g/cc', 'gcc', ISO1183, 'p. 1: Physical Properties, Density', { ...THERMAL, 'Specimen type': DENSITY_FORM }),
    num('Tensile break strength', '48', 'MPa', 'MPa', ISO527, 'p. 1: Mechanical Properties, Tensile Strength, Break',
      { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': CARBONX_SPEC() }),
    num('Tensile modulus', '5355', 'MPa', 'MPaGPa', ISO527, 'p. 1: Mechanical Properties, Tensile Modulus',
      { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': CARBONX_SPEC() }),
    num('Elongation at break', '3', '%', 'pct', ISO527, 'p. 1: Mechanical Properties, Tensile Elongation, Break',
      { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': CARBONX_SPEC() }),
    num('Flexural strength', '78', 'MPa', 'MPa', ISO178, 'p. 1: Mechanical Properties, Flexural Strength',
      { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': CARBONX_SPEC() }),
    num('Flexural modulus', '5210', 'MPa', 'MPaGPa', ISO178, 'p. 1: Mechanical Properties, Flexural Modulus',
      { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': CARBONX_SPEC() }),
    num('Glass transition temperature', '105', '°C', 'C', 'DSC', 'p. 1: Thermal Properties, Glass Transition Temperature (Tg)', THERMAL),
    num('HDT', '97', '°C', 'C', 'ISO 75, 0.45 MPa (66psi)', 'p. 1: Thermal Properties, Deflection Temperature at 0.45 MPa (66psi)',
      { ...THERMAL, 'Specimen type': PRINTED, 'Test load MPa': '0.45', 'Specimen / print parameters': CARBONX_SPEC() }),
  ] },

  // ---------------------------------------------------------------- Siraya Fibreheart ABS-GF (M028, G028-02)
  // The p. 2 "Processed" column says "Tested on X/Y axis" for the tensile and elongation rows and nothing for the
  // rest, so only those two carry a direction and a printed specimen.
  'fibreheart-abs-gf': { MaterialID: 'M028', SourceID: 'D-SIRAYA-Fibreheart-ABS-GF-TDS', rows: [
    num('Tensile break strength', '46.5', 'MPa', 'MPa', ISO527, 'p. 2: Mechanical Properties, Tensile Stress at Break',
      { 'Specimen type': PRINTED, Direction: 'XY',
        Notes: 'The p. 1 summary chart of the same sheet shows 44 MPa for this property. The p. 2 Property Data table is the sheet\'s detailed statement and carries the standard and the direction, so its 46.5 MPa is the recorded value; the disagreement is the sheet\'s own.' }),
    num('Tensile modulus', '2350', 'MPa', 'MPaGPa', D638, 'p. 2: Mechanical Properties, Young’s Modulus'),
    num('Elongation at break', '3', '%', 'pct', D638, 'p. 2: Mechanical Properties, Elongation at Break',
      { 'Specimen type': PRINTED, Direction: 'XY' }),
    num('Charpy strength', '8.5', 'kJ/m²', 'kJm2', NP, 'p. 2: Mechanical Properties, Charpy impact strength', { Notch: NP }),
    num('Flexural strength', '66.4', 'MPa', 'MPa', NP, 'p. 2: Mechanical Properties, Bending Strength'),
    num('Flexural modulus', '2705', 'MPa', 'MPaGPa', NP, 'p. 2: Mechanical Properties, Bending Modulus'),
    num('Vicat softening temperature', '106', '°C', 'C', ISO306, 'p. 2: Other Properties, Vicat softening temperature', THERMAL),
    num('Glass transition temperature', '101', '°C', 'C', NP, 'p. 2: Other Properties, Glass Transition Temperature', THERMAL),
    num('Hardness', '82', 'Shore D', 'ShoreD', NP, 'p. 2: Other Properties, Shore Hardness (D)', THERMAL),
    num('HDT', '93', '°C', 'C', 'Method A', 'p. 2: Other Properties, HDT, Method A', { ...THERMAL, 'Test load MPa': '1.8', Notes: METHOD_AB_NOTE, 'Parse review': methodParse('Method A', '1.8') }),
    num('HDT', '97', '°C', 'C', 'Method B', 'p. 2: Other Properties, HDT, Method B', { ...THERMAL, 'Test load MPa': '0.45', Notes: METHOD_AB_NOTE, 'Parse review': methodParse('Method B', '0.45') }),
    num('Melting temperature', '225', '°C', 'C', NP, 'p. 2: Other Properties, Melting Point',
      { ...THERMAL, Notes: 'ABS is an amorphous polymer and has no true melting point; the sheet prints this row regardless, and its own safety data sheet calls 225 °C a softening range. Recorded as published.' }),
    num('Density', '1.08', 'g/cm³', 'gcc', ISO1183, 'p. 2: Filament Properties, Filament Density', { ...THERMAL, 'Specimen type': DENSITY_FORM }),
  ] },

  // ---------------------------------------------------------------- Siraya Fibreheart PPA (M069, G069-02)
  // One mechanical state, and a dry and a wet heat-deflection pair.
  'fibreheart-ppa': { MaterialID: 'M069', SourceID: 'D-SIRAYA-Fibreheart-PPA-TDS', rows: [
    num('Tensile break strength', '72', 'MPa', 'MPa', D638, 'p. 2: Mechanical Properties, Tensile Stress at Break'),
    num('Tensile modulus', '3600', 'MPa', 'MPaGPa', D638, 'p. 2: Mechanical Properties, Young’s Modulus'),
    num('Elongation at break', '10.5', '%', 'pct', D638, 'p. 2: Mechanical Properties, Elongation at Break'),
    num('Charpy strength', '10.1', 'kJ/m²', 'kJm2', ISO179, 'p. 2: Mechanical Properties, Charpy impact strength', { Notch: NP }),
    num('Flexural strength', '115', 'MPa', 'MPa', ISO178, 'p. 2: Mechanical Properties, Bending Strength'),
    num('Flexural modulus', '3350', 'MPa', 'MPaGPa', ISO178, 'p. 2: Mechanical Properties, Bending Modulus'),
    num('Vicat softening temperature', '230', '°C', 'C', ISO306, 'p. 3: Other Properties, Vicat softening temperature', THERMAL),
    num('Glass transition temperature', '80', '°C', 'C', D3418, 'p. 3: Other Properties, Glass Transition Temperature', THERMAL),
    num('Hardness', '82', 'Shore D', 'ShoreD', 'ISO 7619', 'p. 3: Other Properties, Shore Hardness D', THERMAL),
    num('Melting temperature', '231', '°C', 'C', D3418, 'p. 3: Other Properties, Melting Point', THERMAL),
    num('HDT', '73.5', '°C', 'C', 'Method A', 'p. 3: Other Properties, HDT (Dry), Method A', { ...THERMAL, 'Test load MPa': '1.8', 'Moisture condition': 'Dry', Notes: METHOD_AB_NOTE, 'Parse review': methodParse('Method A', '1.8') }),
    num('HDT', '81', '°C', 'C', 'Method B', 'p. 3: Other Properties, HDT (Dry), Method B', { ...THERMAL, 'Test load MPa': '0.45', 'Moisture condition': 'Dry', Notes: METHOD_AB_NOTE, 'Parse review': methodParse('Method B', '0.45') }),
    num('HDT', '48.5', '°C', 'C', 'Method A', 'p. 3: Other Properties, HDT (Wet), Method A', { ...THERMAL, 'Test load MPa': '1.8', 'Moisture condition': SIRAYA_WET, Notes: METHOD_AB_NOTE, 'Parse review': methodParse('Method A', '1.8') }),
    num('HDT', '61', '°C', 'C', 'Method B', 'p. 3: Other Properties, HDT (Wet), Method B', { ...THERMAL, 'Test load MPa': '0.45', 'Moisture condition': SIRAYA_WET, Notes: METHOD_AB_NOTE, 'Parse review': methodParse('Method B', '0.45') }),
    num('Water absorption', '2.59', '%', 'pct', ISO62, 'p. 3: Other Properties, Water Absorption Rate', THERMAL),
    num('Density', '1.21', 'g/cm³', 'gcc', ISO1183, 'p. 3: Other Properties, Filament Density', { ...THERMAL, 'Specimen type': DENSITY_FORM }),
  ] },

  // ---------------------------------------------------------------- Siraya Fibreheart PPA-CF (M070, G070-02)
  'fibreheart-ppa-cf': { MaterialID: 'M070', SourceID: 'D-SIRAYA-Fibreheart-PPA-CF-TDS', rows: [
    ...pair(2, 'Mechanical Properties', 'Tensile Stress at Break', 'Tensile break strength', 'MPa', 'MPa', ISO527, { unannealed: '95', annealed: '98' }),
    ...pair(2, 'Mechanical Properties', 'Young’s Modulus', 'Tensile modulus', 'MPaGPa', 'MPa', D638, { unannealed: '7800', annealed: '8700' }),
    ...pair(2, 'Mechanical Properties', 'Elongation at Break', 'Elongation at break', 'pct', '%', D638, { unannealed: '2', annealed: '1.6' }),
    ...pair(2, 'Mechanical Properties', 'Charpy impact strength', 'Charpy strength', 'kJm2', 'kJ/m²', ISO179, { unannealed: '11', annealed: '6.3' }, { Notch: NP }),
    ...pair(2, 'Mechanical Properties', 'Bending Strength', 'Flexural strength', 'MPa', 'MPa', ISO178, { unannealed: '145', annealed: '145' }),
    ...pair(2, 'Mechanical Properties', 'Bending Modulus', 'Flexural modulus', 'MPaGPa', 'MPa', ISO178, { unannealed: '6800', annealed: '7350' }),
    ...pair(3, 'Other Properties', 'Vicat softening temperature', 'Vicat softening temperature', 'C', '°C', ISO306, { unannealed: '230', annealed: '230' }, THERMAL),
    ...pair(3, 'Other Properties', 'Glass Transition Temperature', 'Glass transition temperature', 'C', '°C', D3418, { unannealed: '80', annealed: '80' }, THERMAL),
    ...pair(3, 'Other Properties', 'Melting Point', 'Melting temperature', 'C', '°C', D3418, { unannealed: '232', annealed: '232' }, THERMAL),
    ...pair(3, 'Other Properties', 'HDT, Method A @ 1.80 MPa', 'HDT', 'C', '°C', 'Method A @ 1.80 MPa', { unannealed: '82.5', annealed: '119' }, { ...THERMAL, 'Test load MPa': '1.8' }),
    ...pair(3, 'Other Properties', 'HDT, Method B 0.45 MPa', 'HDT', 'C', '°C', 'Method B 0.45 MPa', { unannealed: '84.5', annealed: '192' }, { ...THERMAL, 'Test load MPa': '0.45' }),
    ...pair(3, 'Other Properties', 'Water Absorption Rate', 'Water absorption', 'pct', '%', ISO62, { unannealed: '1.37', annealed: '1.37' }, THERMAL),
    ...pair(3, 'Other Properties', 'Filament Density', 'Density', 'gcc', 'g/cm³', ISO1183, { unannealed: '1.2', annealed: '1.2' }, { ...THERMAL, 'Specimen type': DENSITY_FORM }),
  ] },

  // ---------------------------------------------------------------- Siraya Fibreheart PPA-CF Core (M070, G070-03)
  'fibreheart-ppa-cf-core': { MaterialID: 'M070', SourceID: 'D-SIRAYA-Fibreheart-PPA-CF-Core-TDS', rows: [
    ...pair(2, 'Mechanical Properties', 'Tensile Stress at Break', 'Tensile break strength', 'MPa', 'MPa', D638, { unannealed: '112', annealed: '121' }),
    ...pair(2, 'Mechanical Properties', 'Young’s Modulus', 'Tensile modulus', 'MPaGPa', 'MPa', D638, { unannealed: '9300', annealed: '10220' }),
    ...pair(2, 'Mechanical Properties', 'Elongation at Break', 'Elongation at break', 'pct', '%', D638, { unannealed: '2.25', annealed: '1.6' }),
    ...pair(2, 'Mechanical Properties', 'Charpy impact strength', 'Charpy strength', 'kJm2', 'kJ/m²', ISO179, { unannealed: '13.1', annealed: '7.3' }, { Notch: NP }),
    ...pair(2, 'Mechanical Properties', 'Bending Strength', 'Flexural strength', 'MPa', 'MPa', ISO178, { unannealed: '178', annealed: '185' }),
    ...pair(2, 'Mechanical Properties', 'Bending Modulus', 'Flexural modulus', 'MPaGPa', 'MPa', ISO178, { unannealed: '8700', annealed: '9510' }),
    ...pair(3, 'Other Properties', 'Vicat softening temperature', 'Vicat softening temperature', 'C', '°C', ISO306, { unannealed: '238', annealed: '238' }, THERMAL),
    ...pair(3, 'Other Properties', 'Glass Transition Temperature', 'Glass transition temperature', 'C', '°C', D3418, { unannealed: '80', annealed: '80' }, THERMAL),
    ...pair(3, 'Other Properties', 'Melting Point', 'Melting temperature', 'C', '°C', D3418, { unannealed: '239', annealed: '239' }, THERMAL),
    ...pair(3, 'Other Properties', 'HDT, Method A at 1.80 MPa', 'HDT', 'C', '°C', 'Method A at 1.80 MPa', { unannealed: '84', annealed: '126' }, { ...THERMAL, 'Test load MPa': '1.8' }),
    ...pair(3, 'Other Properties', 'HDT, Method B at 0.45 MPa', 'HDT', 'C', '°C', 'Method B at 0.45 MPa', { unannealed: '97', annealed: '199' }, { ...THERMAL, 'Test load MPa': '0.45' }),
    ...pair(3, 'Other Properties', 'Water Absorption Rate', 'Water absorption', 'pct', '%', ISO62, { unannealed: '1.09', annealed: '1.09' }, THERMAL),
    ...pair(3, 'Other Properties', 'Filament Density', 'Density', 'gcc', 'g/cm³', ISO1183, { unannealed: '1.23', annealed: '1.23' }, { ...THERMAL, 'Specimen type': DENSITY_FORM }),
  ] },

  // ---------------------------------------------------------------- Siraya Fibreheart PPA-GF (M071, G071-02)
  // This sheet labels its tensile rows (X-Y) and (Z), so those carry a direction and a printed specimen; the
  // bending and impact rows carry none. The annealed column is printed only for the X-Y rows.
  'fibreheart-ppa-gf': { MaterialID: 'M071', SourceID: 'D-SIRAYA-Fibreheart-PPA-GF-TDS', rows: [
    ...pair(3, 'Mechanical Properties', 'Tensile Stress at Break (X-Y)', 'Tensile break strength', 'MPa', 'MPa', D638, { unannealed: '89', annealed: '94' }, { 'Specimen type': PRINTED, Direction: 'XY' }),
    ...pair(3, 'Mechanical Properties', 'Tensile Stress at Break (Z)', 'Tensile break strength', 'MPa', 'MPa', D638, { unannealed: '63' }, { 'Specimen type': PRINTED, Direction: 'Z' }),
    ...pair(3, 'Mechanical Properties', 'Young’s Modulus (X-Y)', 'Tensile modulus', 'MPaGPa', 'MPa', D638, { unannealed: '5700', annealed: '6000' }, { 'Specimen type': PRINTED, Direction: 'XY' }),
    ...pair(3, 'Mechanical Properties', 'Young’s Modulus (Z)', 'Tensile modulus', 'MPaGPa', 'MPa', D638, { unannealed: '4200' }, { 'Specimen type': PRINTED, Direction: 'Z' }),
    ...pair(3, 'Mechanical Properties', 'Elongation at Break (X-Y)', 'Elongation at break', 'pct', '%', D638, { unannealed: '2.7', annealed: '2.2' }, { 'Specimen type': PRINTED, Direction: 'XY' }),
    ...pair(3, 'Mechanical Properties', 'Elongation at Break (Z)', 'Elongation at break', 'pct', '%', D638, { unannealed: '1.85' }, { 'Specimen type': PRINTED, Direction: 'Z' }),
    ...pair(3, 'Mechanical Properties', 'Charpy impact strength', 'Charpy strength', 'kJm2', 'kJ/m²', ISO179, { unannealed: '12.2', annealed: '7.1' }, { Notch: NP }),
    ...pair(3, 'Mechanical Properties', 'Bending Strength', 'Flexural strength', 'MPa', 'MPa', ISO178, { unannealed: '141', annealed: '148' }),
    ...pair(3, 'Mechanical Properties', 'Bending Modulus', 'Flexural modulus', 'MPaGPa', 'MPa', ISO178, { unannealed: '4200', annealed: '5000' }),
    ...pair(3, 'Other Properties', 'Vicat softening temperature', 'Vicat softening temperature', 'C', '°C', ISO306, { unannealed: '235', annealed: '235' }, THERMAL),
    ...pair(3, 'Other Properties', 'Glass Transition Temperature', 'Glass transition temperature', 'C', '°C', D3418, { unannealed: '80', annealed: '80' }, THERMAL),
    ...pair(3, 'Other Properties', 'Melting Point', 'Melting temperature', 'C', '°C', D3418, { unannealed: '232', annealed: '232' }, THERMAL),
    ...pair(3, 'Other Properties', 'HDT Method A', 'HDT', 'C', '°C', 'Method A, 1.80 MPa', { unannealed: '80', annealed: '112.2' }, { ...THERMAL, 'Test load MPa': '1.8' }),
    ...pair(3, 'Other Properties', 'HDT Method B', 'HDT', 'C', '°C', 'Method B, 0.45 MPa', { unannealed: '84', annealed: '185' }, { ...THERMAL, 'Test load MPa': '0.45' }),
    ...pair(3, 'Other Properties', 'Water Absorption', 'Water absorption', 'pct', '%', 'ISO 62 Method 1', { unannealed: '1.37' }, THERMAL),
    num('Density', '1.27', 'g/cm³', 'gcc', NP, 'p. 2: Specifications, Filament Density', { ...THERMAL, 'Specimen type': DENSITY_FORM }),
  ] },

  // ---------------------------------------------------------------- Raise3D Industrial PPA CF (M070, G070-04)
  // p. 1 is the filament specification, measured on the material; p. 2 is a single mechanical table whose heading
  // says Conditioned and whose footnote gives the one treatment every specimen had. p. 3 draws the bars.
  'raise3d-ppa-cf': { MaterialID: 'M070', SourceID: 'D-RAISE3D-Industrial-PPA-CF-TDS-V2-0', rows: [
    num('Density', '1.15', 'g/cm³', 'gcc', ISO1183, 'p. 1: Filament Specifications, Density', { ...THERMAL, 'Specimen type': DENSITY_FORM, 'Test temperature': '21.5 °C' }),
    num('HDT', '113', '°C', 'C', 'ISO 75, 1.8 MPa', 'p. 1: Filament Specifications, Heat Deflection Temperature, ISO75 1.8 MPa', { ...THERMAL, 'Test load MPa': '1.8' }),
    num('HDT', '188', '°C', 'C', 'ISO 75, 0.45 MPa', 'p. 1: Filament Specifications, Heat Deflection Temperature, ISO75 0.45 MPa', { ...THERMAL, 'Test load MPa': '0.45' }),
    num('Melting temperature', '231', '°C', 'C', 'ISO 11357', 'p. 1: Filament Specifications, Melting Temperature', THERMAL),
    num('Melt mass-flow rate', '11', 'g/10 min', 'g10', '280 °C, 2.16 kg', 'p. 1: Filament Specifications, Melt index', THERMAL),
    num('Moisture content', '0.6', '%', 'pct', 'ISO 62: Method 1', 'p. 1: Filament Specifications, Moisture content', THERMAL),

    num('Tensile modulus', '7800 ± 520', 'MPa', 'MPaGPa', ISO527, 'p. 2: Mechanical Properties (Conditioned), Young’s modulus (X-Y)', RAISE('XY')),
    num('Tensile strength (endpoint unspecified)', '122 ± 4', 'MPa', 'MPa', ISO527, 'p. 2: Mechanical Properties (Conditioned), Tensile strength (X-Y)', RAISE('XY')),
    num('Elongation at break', '1.9 ± 0.1', '%', 'pct', ISO527, 'p. 2: Mechanical Properties (Conditioned), Elongation at break (X-Y)', RAISE('XY')),
    num('Tensile strength (endpoint unspecified)', '30.2 ± 1.4', 'MPa', 'MPa', 'Custom method', 'p. 2: Mechanical Properties (Conditioned), Mono-layer Z-axis tensile strength',
      RAISE('Z', { Notes: 'The sheet calls this a mono-layer Z-axis tensile strength measured by a custom method, not by ISO 527.' })),
    num('Flexural modulus', '8510 ± 240', 'MPa', 'MPaGPa', ISO178, 'p. 2: Mechanical Properties (Conditioned), Bending modulus (X-Y)', RAISE('XY')),
    num('Flexural strength', '190 ± 20', 'MPa', 'MPa', ISO178, 'p. 2: Mechanical Properties (Conditioned), Bending strength (X-Y)', RAISE('XY')),
    num('Charpy strength', '7.8 ± 1.0', 'kJ/m²', 'kJm2', ISO179, 'p. 2: Mechanical Properties (Conditioned), Charpy impact strength (X-Y)', RAISE('XY', { Notch: NP })),
  ] },
};

/** The one printed-specimen recipe the 3DXTECH sheet states, on every row it made. */
function CARBONX_SPEC() {
  return 'Printed on an open-source FDM/FFF printer at a 0.4 mm nozzle, 0.25 mm layer height, 100% infill at +/- 45°, 250 °C extrusion and 110 °C bed, specimen orientation XY Flat (p. 1: Printed Specimen Conditions)';
}

/** The one state every Raise3D mechanical row was measured in, from the footnote under its table. */
function RAISE(direction, over = {}) {
  return {
    'Specimen type': PRINTED, Direction: direction,
    'Post-processing': RAISE_TREATMENT, 'Anneal °C': '100', 'Anneal h': '8',
    'Moisture condition': RAISE_MOISTURE,
    'Specimen / print parameters': 'Tensile, flexural and impact bars drawn on p. 3 (tensile 150.00 x 20.00 x 4.00 mm with 4*R25 shoulders; flexural 80.00 x 10.00 x 4.00 mm; impact 80.00 x 10.00 x 4.00 mm notched at 45°)',
    ...over,
  };
}

// ------------------------------------------------------------------------------------ coverage
// A new grade changes a material's manufacturer count, and a Grades row whose count or whose own words disagree
// with the records stops the build (COVERAGE-UNTRUE, D39). A row is never edited in place: it is superseded.
const COVERAGE_GRADES = ['M028', 'M033', 'M069', 'M070', 'M071'];

// ------------------------------------------------------------------------------------ the guard
// Nothing enters from a report, a summary or an earlier reading (D35). Every source must be cached and hash
// -matched, and every number below must be on the page it cites, checked against the cached file's own text.
const cachePath = (id) => join(projectRoot, '.cache/sources', `${id}.pdf`);

/** The text of a PDF, page by page, with every space removed so a value split across spans still matches. */
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
  for (const s of SOURCES) {
    const path = cachePath(s.SourceID);
    if (!existsSync(path)) { problems.push(`${s.SourceID}: not cached at .cache/sources/${s.SourceID}.pdf`); continue; }
    const sha = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (sha !== s.SHA256) { problems.push(`${s.SourceID}: the cached file is ${sha.slice(0, 12)}, this migration was written against ${s.SHA256.slice(0, 12)}`); continue; }

    const pages = await pageText(path);
    const rows = Object.values(MEASUREMENTS).filter((m) => m.SourceID === s.SourceID).flatMap((m) => m.rows);
    for (const r of rows) {
      const page = Number(/^p\.\s*(\d+)/.exec(r.Locator)?.[1]);
      if (!page || !pages[page - 1]) { problems.push(`${s.SourceID}: ${r.Locator} names no page this document has`); continue; }
      const digits = String(r['Raw value']).replace(/\s+/g, '');
      const number = /^[<>]?\s*(-?[\d.]+)/.exec(String(r['Raw value']))?.[1];
      if (!number) continue;
      if (!pages[page - 1].includes(number)) problems.push(`${s.SourceID}: "${number}" (${r.Property}, ${r.Locator}) is not on page ${page} of the document; the transcription or the locator is wrong`);
      const unc = /±\s*([\d.]+)/.exec(digits)?.[1];
      if (unc && !pages[page - 1].includes(unc)) problems.push(`${s.SourceID}: the uncertainty "${unc}" of ${r.Property} (${r.Locator}) is not on page ${page}`);
    }
  }
  if (problems.length) {
    throw new Error(`${MIGRATION}: nothing entered. Under D35 a value enters only from a fetched, hashed source, re-read page by page.\n  - ${problems.join('\n  - ')}`);
  }
}

export async function migrate(t) {
  await assertReadable();

  for (const s of SOURCES) if (!t.find('sources', s.SourceID)) t.append('sources', { 'Access date': DATE, ...s });

  const gradeIds = {};
  for (const { key, ...g } of GRADES) {
    const existing = t.rows('grades').find((r) => r.SourceID === g.SourceID && r['Product name'] === g['Product name']);
    if (existing) { gradeIds[key] = existing.GradeID; continue; }
    const row = { ...GRADE_DEFAULTS, ...g, GradeID: nextId('grades', t.rows('grades').map((r) => r.GradeID), { materialId: g.MaterialID }) };
    t.append('grades', row);
    gradeIds[key] = row.GradeID;
  }
  for (const [key, id] of Object.entries(EXPECTED_GRADE_IDS)) {
    if (gradeIds[key] !== id) throw new Error(`${MIGRATION}: ${key} became ${gradeIds[key]}, not ${id}; the sources' "Applicable grades" name ${id}`);
  }

  for (const [key, { MaterialID, SourceID, rows }] of Object.entries(MEASUREMENTS)) {
    for (const r of rows) {
      if (t.rows('measurements').some((x) => x.SourceID === SourceID && x.Locator === r.Locator)) continue;
      const row = { ...r, MeasurementID: nextId('measurements', t.rows('measurements').map((x) => x.MeasurementID)), MaterialID, GradeID: gradeIds[key], SourceID };
      row.Notes = row.Notes === NA ? ADDED : `${ADDED} ${row.Notes}`;
      t.append('measurements', row);
    }
  }

  const manufacturers = (materialId) => new Set(t.rows('grades')
    .filter((g) => g.MaterialID === materialId && g.Role === 'procurement' && g.Status === 'active')
    .map((g) => g.Manufacturer)).size;
  for (const materialId of COVERAGE_GRADES) {
    const old = t.rows('coverage').find((r) => r.MaterialID === materialId && r.Domain === 'Grades' && r.Status !== 'Superseded');
    if (!old) continue;
    // A re-run must be a no-op: the live row is already this migration's own, so there is nothing to supersede.
    if (old.Finding.includes(`(${MIGRATION})`)) continue;
    const n = manufacturers(materialId);
    const newId = nextId('coverage', t.rows('coverage').map((r) => r.CoverageID));
    t.append('coverage', {
      CoverageID: newId, MaterialID: materialId, Domain: 'Grades',
      Status: n >= 3 ? 'Resolved' : 'Gap', 'Manufacturer count': String(n),
      Finding: `${n} distinct manufacturer(s) documented against target 3. A second formulation was recorded ${DATE} (${MIGRATION}) from a data sheet publishing a tensile or flexural strength, so the screening back-test has a case for this material (D48, D59).`,
    });
    t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${newId} (${DATE}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
    t.set('coverage', old.CoverageID, 'Manufacturer count', NA, { expect: old['Manufacturer count'] });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  await migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
