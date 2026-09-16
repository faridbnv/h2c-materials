#!/usr/bin/env node
// Migration m35 (2026-09-16): printed-specimen evidence for the weakest estimates. Each cached source of the "poor"
// gaps was re-read for a specimen direction the transcription missed, and the web searched for a manufacturer data
// sheet of the same material that publishes printed-specimen values with the direction stated. Every document was
// downloaded, read and hashed (sources.csv); nothing enters from a search snippet, a reseller's table or memory (D35).
//
// Corrections (re-read of a cached source, SHA-256 matched):
// - eSUN PEBA-90A (S-PEBA-PEBA90A-TDS-en) p. 3 says "The performance of the filament is evaluated based on standard
//   samples printed by eSUN" and gives the print test conditions (Bambu P1S, 240 ± 10 °C, 60-90 °C bed, 2 walls,
//   3 top/bottom layers, 100% infill, fan 50-100%). The "Printing Performance" rows (Z-axis, XY-axis) were recorded as
//   "Not published (do not assume printed)"; they are printed specimens. The axis-less "Basic Physical Properties"
//   rows are left as they were: the sheet does not say which block the p. 3 sentence covers.
//
// New grades and sources (one per gap, the direction as the sheet states it):
// - PVB: Polymaker PolySmooth TDS V5.4, XY and Z printed ISO 527 values with the specimen recipe (p. 5).
// - BVOH: Forward AM Ultrafuse BVOH TDS v1.3, XY / XZ / ZX printed values ("Flat / On its edge / Upright"); the
//   Extended TDS v1.0 (corroboration) gives the specimen printer and conditioning.
// - PE: Braskem FL300PE product data sheet, "Printed Part Properties" with specimens printed in the X-Y direction.
// - TPC: Kimya TPC-91A TDS (printed specimens, printing direction XY, ISO 527-5A bars) and DSM Arnitel ID 2045
//   provisional data (printed tensile bars in 0°-90° and 45°-45° rasters; the vocabulary has 45/45 and no 0/90, so
//   the 0°-90° rows carry Direction "Not published" and say so).
// - PLA Silk: eSUN PLA-Silk TDS (XY and Z printed values, print test conditions on p. 3).
// - POM: Yousu POM TDS (HDT at 1.8 MPa unannealed; direction not stated).
// - PEBA: Fillamentum Flexfill PEBA 90A TDS (flexural modulus and hardness; direction not stated).
// Withdrawn before this migration was finished (documented in the research report, not added): FormFutura STYX PA6
// (direction not stated; as a second, unfilled PA6 grade it moved the polyamide variant test's premise) and the
// Fiberlogy Nylon PA12 product page (its HDT 135 °C at 0.45 MPa put PA12 above PA612, against the melting-point order
// test/database.test.js asserts). Both wait for the owner's decision.
// Every Grades coverage finding these grades change is superseded by a row with the new manufacturer count.
import { fileURLToPath } from 'node:url';
import { openTables, nextId } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const MIGRATION = 'm35';
const DATE = '2026-09-16';
const NA = 'Not applicable';
const NP = 'Not published';
const ADDED = `Added ${DATE} (${MIGRATION}): re-read from the source document (SHA-256 recorded in sources.csv).`;

// ------------------------------------------------------------------------------------------------------ sources
const SOURCES = [
  {
    SourceID: 'S-POLYCN-PolySmooth-TDS-V5-4', Publisher: 'Polymaker', Title: 'PolySmooth Technical Data Sheet', Revision: 'V5.4', 'Publication date': NP,
    'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://cdn.shopify.com/s/files/1/0548/7299/7945/files/PolySmooth_TDS_EN_V5.4.pdf?v=1731961910',
    Locator: 'p. 2: Physical properties; p. 3: Thermal properties; p. 4: Mechanical properties; p. 5: How to make specimens',
    'Applicable grades': 'G093-02 (the TDS linked from the Polymaker wiki PolySmooth page)', 'Access status': 'Retrieved',
    SHA256: '126df8abf06b12f4ba02ead2d247760a3087ebb5e6076a7187eab9acd1efb345',
  },
  {
    SourceID: 'S-BVOH-ULTRAFUSE-TDS-v1-3', Publisher: 'BASF Forward AM', Title: 'Ultrafuse BVOH', Revision: 'Version No.: 1.3', 'Publication date': '2019-11-11',
    'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://move.forward-am.com/hubfs/AES%20Documentation/Support%20Filaments/BVOH/TDS/Ultrafuse_BVOH_TDS_EN_v1.3.pdf',
    Locator: 'p. 2: General and thermal properties; p. 3: Mechanical properties (print direction XY flat, XZ on its edge, ZX upright)',
    'Applicable grades': 'G076-02', 'Access status': 'Retrieved',
    SHA256: 'c45c6fb20e994a9e8370ac64174255778a8a3c07eeb6785eb1f2ee5be498adaa',
  },
  {
    SourceID: 'R-FORWARDAM-ULTRAFUSE-BVOH-EXTENDED-TDS', Publisher: 'BASF Forward AM (document mirrored by Raise3D Japan)', Title: 'Ultrafuse BVOH Extended TDS: Complete Technical Documentation and Testing Summary', Revision: 'Version 1.0', 'Publication date': NP,
    'Source class': 'Manufacturer TDS', 'Citation role': 'corroboration',
    URL: 'https://www.raise3d.jp/tds_ultrafuse_bvoh.pdf',
    Locator: 'p. 3: Used for test specimens (Ultimaker S5, 210 °C, 60 °C bed, 40 mm/s); p. 4: Tensile and flexural properties by direction, footnotes 5-8 (conditioning and test speeds)',
    'Applicable grades': 'G076-02; the same values as S-BVOH-ULTRAFUSE-TDS-v1-3 with the specimen printer, conditioning (23 °C / 50% RH, 72 h) and test speeds', 'Access status': 'Retrieved',
    SHA256: '5c312e6dd2740bf4264081441412666d526fb7ee1f12d681a63f468952a43eda',
  },
  {
    SourceID: 'R-BRASKEM-FL300PE-PDS', Publisher: 'Braskem', Title: 'FL300PE Product Data Sheet', Revision: NP, 'Publication date': NP,
    'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://www.braskem.com.br/portal/usa/arquivos/3DPrinting/Product-Data-Sheet-FL300PE.pdf',
    Locator: 'p. 1: Printed Part Properties and its note (test specimens printed in X-Y direction)',
    'Applicable grades': 'G085-02', 'Access status': 'Retrieved',
    SHA256: 'ab3c807e5dd2ad621b42205cbf2207658fac0fb8f4d1f5981173ea9741fafff5',
  },
  {
    SourceID: 'R-KIMYA-TPC-91A-TDS', Publisher: 'Kimya (Armor Group)', Title: 'TPC-91A Kimya technical data sheet', Revision: '01/07/2019', 'Publication date': '2019-07',
    'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://f.hubspotusercontent20.net/hubfs/7196278/Datasheets/Kimya/Kimya_TPC-91A_Technical_Data_Sheet.pdf',
    Locator: 'p. 1: Filament properties; p. 2: Print parameters and specimens dimensions; Printed specimens properties',
    'Applicable grades': 'G046-02', 'Access status': 'Retrieved',
    SHA256: '0bc72b0b585d2d89de15cb7cdd8d3a3bb8fce568f0e1e0a1f4844cd5fe6521e6',
  },
  {
    SourceID: 'R-DSM-ARNITEL-ID2045-TDS', Publisher: 'DSM (document hosted by MatterHackers)', Title: 'Arnitel ID 2045 TPC: Property Data (Provisional)', Revision: 'Provisional; print date 2018-12-13', 'Publication date': '2018-12-13',
    'Source class': 'Manufacturer TDS indexed at authorized distributor', 'Citation role': 'cited',
    URL: 'https://www.matterhackers.com/r/kVK5ym',
    Locator: 'p. 1: Material specific properties (3D printed tensile bars, 0°-90° and 45°-45°)',
    'Applicable grades': 'G046-03 (the "Technical Data Sheet" link of the MatterHackers DSM Arnitel ID2045 product page)', 'Access status': 'Retrieved',
    SHA256: '7af735894d64fa7bd831892bd621c49e0171e343be57c8305983a7ffe8256aeb',
  },
  {
    SourceID: 'S-ESUN-PLA-Silk-TDS-2025-06-19', Publisher: 'eSUN', Title: 'PLA-Silk Technical Data Sheet', Revision: 'Version 1.0 (JUL.2024); file dated 2025-06-19', 'Publication date': '2024-07',
    'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://www.esun3d.com/media/esun/catalog/certification/product/PLA-Silk/PLA-Silk_TDS_2025.06.19.pdf',
    Locator: 'p. 1: Physical and thermal properties; p. 2: Mechanical properties (X-Y, Z); p. 3: Test conditions of mechanical properties',
    'Applicable grades': 'G008-02', 'Access status': 'Retrieved',
    SHA256: 'bf6f16467b0580027121615fa1fda8de06a9f678d90e7b419768f33d002365da',
  },
  {
    SourceID: 'R-YOUSU-POM-TDS', Publisher: 'Guangzhou Yousu 3D Technology', Title: 'Yousu POM 3D Filament Technical Data Sheet', Revision: 'Version 2.0, revision date 18/12/2020', 'Publication date': '2020-12-18',
    'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://ysfilament.com/u_file/2206/14/file/YOUSUPOMTDS-ae63.pdf',
    Locator: 'p. 1: Physical, mechanical and thermal properties; p. 2: Basic parameters',
    'Applicable grades': 'G087-03', 'Access status': 'Retrieved',
    SHA256: 'c22e3d282abb75b28a5662a28ba2ba4e98b356fd6dfa27646707d5fc6a25bbb0',
  },
  {
    SourceID: 'R-FILLAMENTUM-FLEXFILL-PEBA-90A-TDS', Publisher: 'Fillamentum Manufacturing Czech', Title: 'Technical Data Sheet Flexfill PEBA 90A', Revision: NP, 'Publication date': NP,
    'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://fillamentum.com/wp-content/uploads/2020/10/TDS_Flexfill-PEBA-90A_EN.pdf',
    Locator: 'p. 1: Physical, mechanical and printing properties',
    'Applicable grades': 'G045-04', 'Access status': 'Retrieved',
    SHA256: '58a32db0852fe8899985e64ab7895bee8c4e66cecd399fa9b967e732d5b51c79',
  },
];

// ------------------------------------------------------------------------------------------------------- grades
const GRADE_DEFAULTS = {
  Role: 'procurement', Status: 'active', Variant: NA, 'Certification claims': NP,
  'Colour caveat': 'Properties may vary by colour; use TDS scope',
  'Diameter compatibility': 'Check 1.75 mm variant; diameter is not part tolerance',
};
const GRADES = [
  { key: 'polysmooth', MaterialID: 'M093', Manufacturer: 'Polymaker', 'Product name': 'PolySmooth', 'Shared formulation key': 'S-POLYCN-PolySmooth-TDS-V5-4',
    'Composition / filler': 'Polyvinyl butyral (PVB) filament for alcohol smoothing; composition not otherwise disclosed', Availability: 'Current Polymaker product page and wiki TDS retrieved 2026-09-16',
    'Selected-grade rationale': `Second PVB manufacturer, added ${DATE} (m35): the only PVB data sheet found that publishes printed ISO 527 values with the direction stated (X-Y and Z)`,
    SourceID: 'S-POLYCN-PolySmooth-TDS-V5-4', 'Source locator': 'V5.4, p. 2-5' },
  { key: 'ultrafuse-bvoh', MaterialID: 'M076', Manufacturer: 'BASF Forward AM', 'Product name': 'Ultrafuse BVOH', 'Shared formulation key': 'S-BVOH-ULTRAFUSE-TDS-v1-3',
    'Composition / filler': 'Butenediol vinyl alcohol copolymer based filament (TDS)', Availability: 'Current Forward AM portfolio page retrieved 2026-09-16', 'Colour caveat': 'Natural only (TDS)',
    'Selected-grade rationale': `Second BVOH manufacturer, added ${DATE} (m35): the only BVOH data sheet found that publishes printed values by print direction (XY, XZ, ZX)`,
    SourceID: 'S-BVOH-ULTRAFUSE-TDS-v1-3', 'Source locator': 'Version 1.3, p. 2-3', 'Diameter compatibility': '1.75 mm and 2.85 mm (TDS); select 1.75 mm' },
  { key: 'fl300pe', MaterialID: 'M085', Manufacturer: 'Braskem', 'Product name': 'FL300PE', 'Shared formulation key': 'R-BRASKEM-FL300PE-PDS',
    'Composition / filler': '100% polyethylene filament (sheet); "anywhere traditional HDPE resins are typically required"', Availability: 'Braskem USA 3D printing products page; data sheet retrieved 2026-09-16', 'Colour caveat': 'Natural (sheet does not list colours)',
    'Selected-grade rationale': `Second PE manufacturer, added ${DATE} (m35): an unfilled polyethylene whose sheet publishes printed part properties for specimens printed in the X-Y direction, beside the filled Spectrum grade`,
    SourceID: 'R-BRASKEM-FL300PE-PDS', 'Source locator': 'p. 1: Printed Part Properties' },
  { key: 'kimya-tpc', MaterialID: 'M046', Manufacturer: 'Kimya / Airtech Europe', 'Product name': 'Kimya TPC-91A', 'Shared formulation key': 'R-KIMYA-TPC-91A-TDS',
    'Composition / filler': 'Thermoplastic copolyester elastomer (TPE-C), Shore 91A (TDS)', Availability: 'Kimya product page (kimya.fr) lists TPC-91A; 2019 TDS retrieved 2026-09-16 from the Kimya document host',
    'Selected-grade rationale': `Second TPC manufacturer, added ${DATE} (m35): printed ISO 527-5A specimens with printing direction XY, where the selected BASF grade publishes no mechanical value`,
    SourceID: 'R-KIMYA-TPC-91A-TDS', 'Source locator': 'p. 2: Printed specimens properties', 'Diameter compatibility': '1.75 ± 0.1 mm and 2.85 ± 0.1 mm (TDS); select 1.75 mm' },
  { key: 'arnitel', MaterialID: 'M046', Manufacturer: 'DSM', 'Product name': 'Arnitel ID 2045', 'Shared formulation key': 'R-DSM-ARNITEL-ID2045-TDS',
    'Composition / filler': 'Thermoplastic copolyester (TPC), >50% renewable content, Shore D 34 (sheet)', Availability: 'Sold through MatterHackers (1.75 mm and 2.85 mm); DSM provisional data sheet retrieved 2026-09-16',
    'Selected-grade rationale': `Third TPC manufacturer, added ${DATE} (m35): printed tensile bars in two rasters (0°-90°, 45°-45°) with modulus, strength and elongation`,
    SourceID: 'R-DSM-ARNITEL-ID2045-TDS', 'Source locator': 'p. 1: Material specific properties' },
  { key: 'esun-silk', MaterialID: 'M008', Manufacturer: 'eSUN', 'Product name': 'PLA-Silk', 'Shared formulation key': 'S-ESUN-PLA-Silk-TDS-2025-06-19',
    'Composition / filler': 'Silk-effect PLA; "modified based on PLA material" (TDS)', Availability: 'Current eSUN product page (esilk-pla-product); TDS retrieved 2026-09-16', 'Colour caveat': 'Silk colour range; use TDS scope',
    'Selected-grade rationale': `Second silk PLA manufacturer, added ${DATE} (m35): printed X-Y and Z values including elongation at break, which the Polymaker sheet does not publish`,
    SourceID: 'S-ESUN-PLA-Silk-TDS-2025-06-19', 'Source locator': 'p. 2: Mechanical properties; p. 3: Test conditions' },
  { key: 'yousu-pom', MaterialID: 'M087', Manufacturer: 'Guangzhou Yousu 3D Technology', 'Product name': 'YOUSU POM 3D Filament', 'Shared formulation key': 'R-YOUSU-POM-TDS',
    'Composition / filler': 'POM (TDS); homopolymer or copolymer not stated', Availability: 'Current Yousu product page (YS-POM, 1.75 / 3.0 mm); TDS retrieved 2026-09-16',
    'Selected-grade rationale': `Third POM manufacturer, added ${DATE} (m35): the only other POM filament sheet found with a heat deflection temperature (1.8 MPa, unannealed). Direction not stated`,
    SourceID: 'R-YOUSU-POM-TDS', 'Source locator': 'Version 2.0, p. 1', 'Diameter compatibility': '1.75 mm and 3.0 mm (TDS); select 1.75 mm' },
  { key: 'flexfill-peba', MaterialID: 'M045', Manufacturer: 'Fillamentum', 'Product name': 'Flexfill PEBA 90A', 'Shared formulation key': 'R-FILLAMENTUM-FLEXFILL-PEBA-90A-TDS',
    'Composition / filler': 'Polyether-block-amide (PEBA), no plasticizer (TDS)', Availability: 'Current Fillamentum collection page; TDS retrieved 2026-09-16',
    'Selected-grade rationale': `Fourth PEBA manufacturer, added ${DATE} (m35): flexural modulus and hardness for the stiffness estimate. Direction not stated; no PEBA sheet with a printed XY tensile modulus was found`,
    SourceID: 'R-FILLAMENTUM-FLEXFILL-PEBA-90A-TDS', 'Source locator': 'p. 1: Mechanical properties', 'Diameter compatibility': '1.75 mm and 2.85 mm, ± 0.10 mm (TDS); select 1.75 mm' },
];

// ------------------------------------------------------------------------------------------------- measurements
const M_DEFAULTS = {
  'Raw uncertainty ±': NA, 'Raw upper bound': NA, Operator: '=', 'Conversion factor': '1', 'Normalized uncertainty ±': NA, 'Normalized upper bound': NA,
  'Data status': 'Published value', 'Specimen type': 'Not published (do not assume printed)', Direction: NP, 'Moisture condition': NP,
  'Post-processing': NP, 'Anneal °C': NA, 'Anneal h': NA, 'Test temperature': NP, 'Test load MPa': NA, Notch: NA,
  'Specimen / print parameters': NP, Notes: NA, 'Parse review': NA,
};
const UNIT = { MPa: ['MPa', 1], GPa: ['GPa', 1], MPaGPa: ['GPa', 0.001], pct: ['%', 1], C: ['°C', 1], gcc: ['kg/m³', 1000], kgm3: ['kg/m³', 1], kJm2: ['kJ/m²', 1], g10: ['g/10 min', 1], cm310: ['cm³/10 min', 1], ShoreA: ['Shore A', 1], ShoreD: ['Shore D', 1] };
const round = (x) => Number(x.toPrecision(10));
/** A published number: [property, raw value text, raw unit text, unit key, standard, locator, overrides]. */
function num(property, raw, rawUnit, unitKey, standard, locator, over = {}) {
  const [normUnit, factor] = UNIT[unitKey];
  const text = String(raw).replace(/[<>]/g, '').replace(/^\s*/, '').replace(/\s*%\s*$/, '');
  const [, main, unc] = /^(-?[\d.]+)(?:\s*±\s*([\d.]+))?/.exec(text) ?? [];
  if (main == null) throw new Error(`${MIGRATION}: cannot read a number from "${raw}"`);
  const row = {
    ...M_DEFAULTS, Property: property, 'Raw value': String(raw), 'Raw unit': rawUnit, 'Raw numeric': main, 'Conversion factor': String(factor),
    'Normalized value': String(round(Number(main) * factor)), 'Normalized unit': normUnit, 'Standard / load': standard, Locator: locator,
    Operator: /^\s*>/.test(String(raw)) ? '>' : /^\s*</.test(String(raw)) ? '<' : '=',
  };
  if (unc) { row['Raw uncertainty ±'] = unc; row['Normalized uncertainty ±'] = String(round(Number(unc) * factor)); }
  return { ...row, ...over };
}
/** A range "a-b": lower bound as the value, upper bound beside it. */
function range(property, raw, rawUnit, unitKey, lo, hi, standard, locator, over = {}) {
  const [normUnit, factor] = UNIT[unitKey];
  return { ...M_DEFAULTS, Property: property, 'Raw value': raw, 'Raw unit': rawUnit, 'Raw numeric': String(lo), 'Raw upper bound': String(hi), 'Conversion factor': String(factor),
    'Normalized value': String(round(lo * factor)), 'Normalized upper bound': String(round(hi * factor)), 'Normalized unit': normUnit, 'Standard / load': standard, Locator: locator, ...over };
}
/** A qualitative result ("No break"). */
function qual(property, raw, unitKey, standard, locator, over = {}) {
  const [normUnit] = UNIT[unitKey];
  return { ...M_DEFAULTS, Property: property, 'Raw value': raw, 'Raw unit': normUnit, 'Raw numeric': NP, Operator: NA, 'Normalized value': NP, 'Normalized unit': normUnit,
    'Data status': 'Published qualitative result', 'Standard / load': standard, Locator: locator, ...over };
}

const THERMAL = { Direction: NA };
const PRINTED = 'Printed specimen';
const DENSITY_FORM = 'Not published (density specimen form not explicitly established)';

const POLYSMOOTH_SPEC = 'Printed at 220 °C nozzle, 60 °C bed, 100% infill, 2 shells, 3 top and bottom layers, ambient environment, cooling fan on (p. 5: How to make specimens)';
const ESUN_SILK_SPEC = 'eSUN printing test conditions (p. 3): Bambu P1S, 0.4 mm nozzle, OrcaSlicer 2.1.0 Beta; extruder 220 °C; build platform 60 °C; 2 outer layers; 3 top/bottom layers; 100% infill; fan 100%';
const ESUN_PEBA_SPEC = 'eSUN print test conditions (p. 3): Bambu P1S, 0.4 mm nozzle, OrcaSlicer 2.1.0 Beta; nozzle 240 ± 10 °C; build plate 60-90 °C; 2 wall layers; 3 top/bottom layers; 100% infill; fan 50-100%; max volumetric flow 2 mm³/s';
const BRASKEM_SPEC = 'Test specimens printed in X-Y direction: 210 °C, bed 110 °C first layer and 60 °C other layers, 30 mm/s, 0.15 mm layer height, 100% grid infill, 3 perimeter layers, brass 0.4 mm nozzle (sheet note)';
const KIMYA_SPEC = 'Printed specimens (p. 2): printing direction XY; 44 mm/s; 100% rectilinear infill at 45°/-45°; extrusion 260 °C; bed 60 °C; tensile specimen ISO 527-5A, 75 × 12.5 × 2 mm; bending 80 × 10 × 4 mm; hardness 45 × 45 × 4 mm';
const ARNITEL_0_90 = '3D printed tensile bars, raster 0°-90° (print settings not published)';
const ARNITEL_45 = '3D printed tensile bars, raster 45°-45° (print settings not published)';
const BVOH_NOTE = 'The Extended TDS v1.0 (R-FORWARDAM-ULTRAFUSE-BVOH-EXTENDED-TDS, corroboration) states the same value for specimens printed on an Ultimaker S5 at 210 °C, 60 °C bed, 40 mm/s, conditioned 23 °C / 50% RH for 72 h; tensile at 5 mm/min (modulus 1 mm/min), flexural 2 mm/min.';
const ARNITEL_0_90_NOTE = 'The sheet states a 0°-90° raster, which the direction vocabulary cannot express (it has 45/45 only); Direction stays Not published and the raster is in the specimen column.';
const BRASKEM_LOAD_REVIEW = 'The sheet states 0.455 MPa (ASTM D648, 66 psi); the parser rounds the load to 0.45. The typed value keeps the published figure; the build reads any load between 0.44 and 0.46 MPa as the 0.45 MPa test.';
const YOUSU_IZOD_NOTE = 'The sheet labels the row "Notched Izod Impact" and cites ISO 179/1eA, which is the notched Charpy test; recorded under the generic impact property with the method as printed.';

const MEASUREMENTS = {
  polysmooth: { MaterialID: 'M093', SourceID: 'S-POLYCN-PolySmooth-TDS-V5-4', rows: [
    num('Density', '1.10 g/cm³ at 23 °C', 'g/cm³', 'gcc', 'ISO 1183, GB/T 1033', 'p. 2: Density', { 'Specimen type': DENSITY_FORM, ...THERMAL, 'Test temperature': '23 °C' }),
    num('Melt mass-flow rate', '6.7 g/10min', 'g/10min', 'g10', '210 °C, 2.16 kg', 'p. 2: Melt index', { ...THERMAL, 'Test temperature': '210 °C' }),
    num('Water absorption', '2.36 %', '%', 'pct', 'Equilibrium water absorption (moisture absorption curve)', 'p. 2: Moisture absorption curve', { ...THERMAL }),
    num('Glass transition temperature', '70 °C', '°C', 'C', 'DSC, 10 °C/min', 'p. 3: Glass transition temperature', { ...THERMAL }),
    num('Vicat softening temperature', '70 °C', '°C', 'C', 'ISO 306, GB/T 1633', 'p. 3: Vicat softening temperature', { ...THERMAL }),
    num('HDT', '66 °C', '°C', 'C', 'ISO 75, 1.8 MPa', 'p. 3: Heat deflection temperature (1.8 MPa)', { ...THERMAL, 'Test load MPa': '1.8' }),
    num('HDT', '68 °C', '°C', 'C', 'ISO 75, 0.45 MPa', 'p. 3: Heat deflection temperature (0.45 MPa)', { ...THERMAL, 'Test load MPa': '0.45' }),
    num('Tensile modulus', '2199 ± 43 MPa', 'MPa', 'MPaGPa', 'ISO 527, GB/T 1040', "p. 4: Young's modulus (X-Y)", { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': POLYSMOOTH_SPEC }),
    num('Tensile modulus', '2010 ± 69 MPa', 'MPa', 'MPaGPa', 'ISO 527, GB/T 1040', "p. 4: Young's modulus (Z)", { 'Specimen type': PRINTED, Direction: 'Z', 'Specimen / print parameters': POLYSMOOTH_SPEC }),
    num('Tensile strength (endpoint unspecified)', '51.8 ± 0.7 MPa', 'MPa', 'MPa', 'ISO 527, GB/T 1040', 'p. 4: Tensile strength (X-Y)', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': POLYSMOOTH_SPEC }),
    num('Tensile strength (endpoint unspecified)', '38.9 ± 0.8 MPa', 'MPa', 'MPa', 'ISO 527, GB/T 1040', 'p. 4: Tensile strength (Z)', { 'Specimen type': PRINTED, Direction: 'Z', 'Specimen / print parameters': POLYSMOOTH_SPEC }),
    num('Elongation at break', '14.5 ± 2.9 %', '%', 'pct', 'ISO 527, GB/T 1040', 'p. 4: Elongation at break (X-Y)', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': POLYSMOOTH_SPEC }),
    num('Elongation at break', '2.8 ± 0.3 %', '%', 'pct', 'ISO 527, GB/T 1040', 'p. 4: Elongation at break (Z)', { 'Specimen type': PRINTED, Direction: 'Z', 'Specimen / print parameters': POLYSMOOTH_SPEC }),
    num('Flexural modulus', '2198 ± 57 MPa', 'MPa', 'MPaGPa', 'ISO 178, GB/T 9341', 'p. 4: Bending modulus (X-Y)', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': POLYSMOOTH_SPEC }),
    num('Flexural strength', '75.9 ± 0.8 MPa', 'MPa', 'MPa', 'ISO 178, GB/T 9341', 'p. 4: Bending strength (X-Y)', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': POLYSMOOTH_SPEC }),
    num('Charpy strength', '3.1 ± 0.8 kJ/m²', 'kJ/m²', 'kJm2', 'ISO 179, GB/T 1043', 'p. 4: Notched Charpy impact strength (X-Y)', { 'Specimen type': PRINTED, Direction: 'XY', Notch: 'Notched', 'Specimen / print parameters': POLYSMOOTH_SPEC }),
  ] },
  'ultrafuse-bvoh': { MaterialID: 'M076', SourceID: 'S-BVOH-ULTRAFUSE-TDS-v1-3', rows: [
    num('Density', '1138 kg/m³', 'kg/m³', 'kgm3', 'ISO 1183-1', 'p. 2: Printed Part Density', { 'Specimen type': 'Printed part', ...THERMAL }),
    num('Glass transition temperature', '69 °C', '°C', 'C', 'ISO 11357-2', 'p. 2: Glass Transition Temperature', { ...THERMAL }),
    num('Crystallization temperature', '122 °C', '°C', 'C', 'ISO 11357-3', 'p. 2: Crystallization Temperature', { ...THERMAL }),
    num('Melting temperature', '175 °C', '°C', 'C', 'ISO 11357-3', 'p. 2: Melting Temperature', { ...THERMAL }),
    num('Melt volume-flow rate', '11.4 cm³/10 min', 'cm³/10 min', 'cm310', 'ISO 1133 (210 °C, 2.16 kg)', 'p. 2: Melt Volume Flow Rate', { ...THERMAL, 'Test temperature': '210 °C' }),
    num('Tensile strength (endpoint unspecified)', '33.7 MPa', 'MPa', 'MPa', 'ISO 527', 'p. 3: Tensile strength, XY (flat)', { 'Specimen type': PRINTED, Direction: 'XY', Notes: BVOH_NOTE }),
    num('Tensile strength (endpoint unspecified)', '8.7 MPa', 'MPa', 'MPa', 'ISO 527', 'p. 3: Tensile strength, ZX (upright)', { 'Specimen type': PRINTED, Direction: 'ZX', Notes: BVOH_NOTE }),
    num('Elongation at break', '14.8 %', '%', 'pct', 'ISO 527', 'p. 3: Elongation at Break, XY (flat)', { 'Specimen type': PRINTED, Direction: 'XY', Notes: BVOH_NOTE }),
    num('Elongation at break', '0.6 %', '%', 'pct', 'ISO 527', 'p. 3: Elongation at Break, ZX (upright)', { 'Specimen type': PRINTED, Direction: 'ZX', Notes: BVOH_NOTE }),
    num('Tensile modulus', '2339 MPa', 'MPa', 'MPaGPa', 'ISO 527', "p. 3: Young's Modulus, XY (flat)", { 'Specimen type': PRINTED, Direction: 'XY', Notes: BVOH_NOTE }),
    num('Tensile modulus', '1426 MPa', 'MPa', 'MPaGPa', 'ISO 527', "p. 3: Young's Modulus, ZX (upright)", { 'Specimen type': PRINTED, Direction: 'ZX', Notes: BVOH_NOTE }),
    num('Flexural strength', '53.8 MPa', 'MPa', 'MPa', 'ISO 178', 'p. 3: Flexural Strength, XY (flat)', { 'Specimen type': PRINTED, Direction: 'XY', Notes: BVOH_NOTE }),
    num('Flexural strength', '50.3 MPa', 'MPa', 'MPa', 'ISO 178', 'p. 3: Flexural Strength, XZ (on its edge)', { 'Specimen type': PRINTED, Direction: 'XZ', Notes: BVOH_NOTE }),
    num('Flexural strength', '11.4 MPa', 'MPa', 'MPa', 'ISO 178', 'p. 3: Flexural Strength, ZX (upright)', { 'Specimen type': PRINTED, Direction: 'ZX', Notes: BVOH_NOTE }),
    num('Flexural modulus', '2236 MPa', 'MPa', 'MPaGPa', 'ISO 178', 'p. 3: Flexural Modulus, XY (flat)', { 'Specimen type': PRINTED, Direction: 'XY', Notes: BVOH_NOTE }),
    num('Flexural modulus', '1807 MPa', 'MPa', 'MPaGPa', 'ISO 178', 'p. 3: Flexural Modulus, XZ (on its edge)', { 'Specimen type': PRINTED, Direction: 'XZ', Notes: BVOH_NOTE }),
    num('Flexural modulus', '1081 MPa', 'MPa', 'MPaGPa', 'ISO 178', 'p. 3: Flexural Modulus, ZX (upright)', { 'Specimen type': PRINTED, Direction: 'ZX', Notes: BVOH_NOTE }),
    num('Flexural elongation at break', '4.8 %', '%', 'pct', 'ISO 178', 'p. 3: Flexural Strain at Break, XY (flat)', { 'Specimen type': PRINTED, Direction: 'XY', Notes: BVOH_NOTE }),
    num('Flexural elongation at break', '4.4 %', '%', 'pct', 'ISO 178', 'p. 3: Flexural Strain at Break, XZ (on its edge)', { 'Specimen type': PRINTED, Direction: 'XZ', Notes: BVOH_NOTE }),
    num('Flexural elongation at break', '1.0 %', '%', 'pct', 'ISO 178', 'p. 3: Flexural Strain at Break, ZX (upright)', { 'Specimen type': PRINTED, Direction: 'ZX', Notes: BVOH_NOTE }),
  ] },
  fl300pe: { MaterialID: 'M085', SourceID: 'R-BRASKEM-FL300PE-PDS', rows: [
    num('Density', '0.954 g/cm3', 'g/cm3', 'gcc', 'ASTM D792', 'p. 1: Printed Part Properties, Density', { 'Specimen type': DENSITY_FORM, ...THERMAL, Notes: 'Listed under "Printed Part Properties" without the asterisk that marks the X-Y printed specimens.' }),
    num('Tensile strength (endpoint unspecified)', '18.5 MPa', 'MPa', 'MPa', 'ASTM D638', 'p. 1: Printed Part Properties, Ultimate Tensile Strength*', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': BRASKEM_SPEC }),
    num('Elongation at break', '208 %', '%', 'pct', 'ASTM D638', 'p. 1: Printed Part Properties, Tensile Elongation at Break*', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': BRASKEM_SPEC }),
    num('Tensile modulus', '752 MPa', 'MPa', 'MPaGPa', 'ASTM D638', "p. 1: Printed Part Properties, Young's Modulus*", { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': BRASKEM_SPEC }),
    num('Flexural modulus', '731.5 MPa', 'MPa', 'MPaGPa', 'ASTM D790 (chord modulus)', 'p. 1: Printed Part Properties, Flexural Modulus - Chord Modulus*', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': BRASKEM_SPEC }),
    num('Charpy strength', '79 kJ/m2', 'kJ/m2', 'kJm2', 'ISO 179', 'p. 1: Printed Part Properties, Charpy Impact Strength at 23 °C*', { 'Specimen type': PRINTED, Direction: 'XY', Notch: NP, 'Test temperature': '23 °C', 'Specimen / print parameters': BRASKEM_SPEC }),
    num('HDT', '66 °C', '°C', 'C', 'ASTM D648, 0.455 MPa', 'p. 1: Printed Part Properties, Deflection Temperature (at 0.455 MPa)', { 'Specimen type': 'Printed part', ...THERMAL, 'Test load MPa': '0.455', 'Parse review': BRASKEM_LOAD_REVIEW, Notes: 'Listed under "Printed Part Properties" without the asterisk that marks the X-Y printed specimens.' }),
    num('Vicat softening temperature', '125 °C', '°C', 'C', 'ASTM D1525, 10 N', 'p. 1: Printed Part Properties, Vicat Softening Temperature (at 10 N)', { 'Specimen type': 'Printed part', ...THERMAL, Notes: 'Listed under "Printed Part Properties" without the asterisk that marks the X-Y printed specimens.' }),
  ] },
  'kimya-tpc': { MaterialID: 'M046', SourceID: 'R-KIMYA-TPC-91A-TDS', rows: [
    num('Density', '1.22 g/cm3', 'g/cm3', 'gcc', 'ISO 1183-1', 'p. 1: Density', { 'Specimen type': DENSITY_FORM, ...THERMAL }),
    range('Melt mass-flow rate', '18 - 20 g/10min', 'g/10min', 'g10', 18, 20, 'ISO 1133-1 (210 °C, 2.16 kg)', 'p. 1: Melt Flow Index (MFI)', { ...THERMAL, 'Test temperature': '210 °C' }),
    num('Melting temperature', '160 °C', '°C', 'C', 'ISO 11357-1 DSC (10 °C/min, 20 to 220 °C)', 'p. 1: Melting temperature Tm', { ...THERMAL }),
    num('Tensile modulus', '67 MPa', 'MPa', 'MPaGPa', 'ISO 37/2/500', 'p. 2: Printed specimens properties, Tensile modulus', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': KIMYA_SPEC }),
    num('Tensile strength (endpoint unspecified)', '17.7 MPa', 'MPa', 'MPa', 'ISO 37/2/500', 'p. 2: Printed specimens properties, Strength', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': KIMYA_SPEC }),
    num('Tensile strain at strength', '> 500 %', '%', 'pct', 'ISO 37/2/500', 'p. 2: Printed specimens properties, Strain at Strength', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': KIMYA_SPEC }),
    num('Tensile break strength', '17.5 MPa', 'MPa', 'MPa', 'ISO 37/2/500', 'p. 2: Printed specimens properties, Stress at break', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': KIMYA_SPEC }),
    num('Elongation at break', '> 500 %', '%', 'pct', 'ISO 37/2/500', 'p. 2: Printed specimens properties, Strain at break', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': KIMYA_SPEC }),
    num('Flexural modulus', '66 MPa', 'MPa', 'MPaGPa', 'ISO 178', 'p. 2: Printed specimens properties, Flexural modulus', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': KIMYA_SPEC }),
    num('Flexural stress at conventional deflection', '2.6 MPa', 'MPa', 'MPa', 'ISO 178; 3.5% strain', 'p. 2: Printed specimens properties, Flexural stress at conventional deflection (3,5% strain)', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': KIMYA_SPEC }),
    qual('Charpy strength', 'No break', 'kJm2', 'ISO 179-1/1eA', 'p. 2: Printed specimens properties, Charpy impact resistance', { 'Specimen type': PRINTED, Direction: 'XY', Notch: 'Notched', 'Specimen / print parameters': KIMYA_SPEC }),
    num('Hardness', '91 Shore A', 'Shore A', 'ShoreA', 'ISO 868', 'p. 2: Printed specimens properties, Shore Hardness', { 'Specimen type': PRINTED, ...THERMAL, 'Specimen / print parameters': KIMYA_SPEC, Notes: 'No conversion between hardness scales.' }),
  ] },
  arnitel: { MaterialID: 'M046', SourceID: 'R-DSM-ARNITEL-ID2045-TDS', rows: [
    num('Melting temperature', '158 °C', '°C', 'C', 'ISO 11357-1/-3 (10 °C/min)', 'p. 1: Melting temperature', { ...THERMAL }),
    num('Glass transition temperature', '-35 °C', '°C', 'C', 'ISO 11357-1/-2 (10 °C/min)', 'p. 1: Glass transition temperature', { ...THERMAL }),
    num('Vicat softening temperature', '90 °C', '°C', 'C', 'ISO 306 (50 °C/h, 10 N)', 'p. 1: Vicat softening temperature', { ...THERMAL }),
    num('Water absorption', '0.04 %', '%', 'pct', 'Sim. to ISO 62', 'p. 1: Humidity absorption', { ...THERMAL }),
    num('Density', '1100 kg/m³', 'kg/m³', 'kgm3', 'ISO 1183', 'p. 1: Density', { 'Specimen type': DENSITY_FORM, ...THERMAL }),
    num('Tensile strength (endpoint unspecified)', '8 MPa', 'MPa', 'MPa', 'ISO 527-1/-2', 'p. 1: Maximum tensile stress (3D printed tensile bars) 0°-90°', { 'Specimen type': PRINTED, 'Specimen / print parameters': ARNITEL_0_90, Notes: ARNITEL_0_90_NOTE }),
    num('Tensile strength (endpoint unspecified)', '7.6 MPa', 'MPa', 'MPa', 'ISO 527-1/-2', 'p. 1: Maximum tensile stress (3D printed tensile bars) 45°-45°', { 'Specimen type': PRINTED, Direction: '45/45', 'Specimen / print parameters': ARNITEL_45 }),
    num('Tensile modulus', '29 MPa', 'MPa', 'MPaGPa', 'ISO 527-1/-2', 'p. 1: Tensile modulus (3D printed tensile bars) 0°-90°', { 'Specimen type': PRINTED, 'Specimen / print parameters': ARNITEL_0_90, Notes: ARNITEL_0_90_NOTE }),
    num('Tensile modulus', '29 MPa', 'MPa', 'MPaGPa', 'ISO 527-1/-2', 'p. 1: Tensile modulus (3D printed tensile bars) 45°-45°', { 'Specimen type': PRINTED, Direction: '45/45', 'Specimen / print parameters': ARNITEL_45 }),
    num('Elongation at break', '350 %', '%', 'pct', 'ISO 527-1/-2', 'p. 1: Elongation at break (3D printed tensile bars) 0°-90°', { 'Specimen type': PRINTED, 'Specimen / print parameters': ARNITEL_0_90, Notes: ARNITEL_0_90_NOTE }),
    num('Elongation at break', '390 %', '%', 'pct', 'ISO 527-1/-2', 'p. 1: Elongation at break (3D printed tensile bars) 45°-45°', { 'Specimen type': PRINTED, Direction: '45/45', 'Specimen / print parameters': ARNITEL_45 }),
    num('Hardness', '34 Shore D', 'Shore D', 'ShoreD', 'ISO 868 (3 s)', 'p. 1: Shore D Hardness (3s)', { ...THERMAL, Notes: 'No conversion between hardness scales.' }),
  ] },
  'esun-silk': { MaterialID: 'M008', SourceID: 'S-ESUN-PLA-Silk-TDS-2025-06-19', rows: [
    num('Density', '1.21 g/cm3', 'g/cm3', 'gcc', 'GB/T 1033', 'p. 1: Density', { 'Specimen type': DENSITY_FORM, ...THERMAL }),
    num('Melt mass-flow rate', '4.8 (190 ℃/2.16 kg)', 'g/10 min (unit not printed)', 'g10', 'GB/T 3682 (190 °C, 2.16 kg)', 'p. 1: Melt Flow Index', { ...THERMAL, 'Test temperature': '190 °C', Notes: 'The sheet prints no unit on this row; GB/T 3682 reports g/10 min.' }),
    num('HDT', '50 ℃ (0.45Mpa)', '°C', 'C', 'GB/T 1634, 0.45 MPa', 'p. 1: Heat Distortion Temperature', { ...THERMAL, 'Test load MPa': '0.45' }),
    num('Tensile strength (endpoint unspecified)', '32.53 Mpa', 'Mpa', 'MPa', 'GB/T 1040', 'p. 2: Tensile Strength (X-Y)', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': ESUN_SILK_SPEC }),
    num('Tensile strength (endpoint unspecified)', '17.36 MPa', 'MPa', 'MPa', 'GB/T 1040', 'p. 2: Tensile Strength (Z)', { 'Specimen type': PRINTED, Direction: 'Z', 'Specimen / print parameters': ESUN_SILK_SPEC }),
    num('Elongation at break', '11.65 %', '%', 'pct', 'GB/T 1040', 'p. 2: Elongation at Break (X-Y)', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': ESUN_SILK_SPEC }),
    num('Elongation at break', '1.84 %', '%', 'pct', 'GB/T 1040', 'p. 2: Elongation at Break (Z)', { 'Specimen type': PRINTED, Direction: 'Z', 'Specimen / print parameters': ESUN_SILK_SPEC }),
    num('Flexural strength', '44.4 MPa', 'MPa', 'MPa', 'GB/T 9341', 'p. 2: Flexural Strength (X-Y)', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': ESUN_SILK_SPEC }),
    num('Flexural strength', '23.1 Mpa', 'Mpa', 'MPa', 'GB/T 9341', 'p. 2: Flexural Strength (Z)', { 'Specimen type': PRINTED, Direction: 'Z', 'Specimen / print parameters': ESUN_SILK_SPEC }),
    num('Flexural modulus', '1917.35 MPa', 'MPa', 'MPaGPa', 'GB/T 9341', 'p. 2: Flexural Modulus (X-Y)', { 'Specimen type': PRINTED, Direction: 'XY', 'Specimen / print parameters': ESUN_SILK_SPEC }),
    num('Flexural modulus', '1858.86 Mpa', 'Mpa', 'MPaGPa', 'GB/T 9341', 'p. 2: Flexural Modulus (Z)', { 'Specimen type': PRINTED, Direction: 'Z', 'Specimen / print parameters': ESUN_SILK_SPEC }),
    num('Izod impact strength', '2.93 KJ/m²', 'KJ/m²', 'kJm2', 'GB/T 1843', 'p. 2: IZOD Impact Strength (X-Y)', { 'Specimen type': PRINTED, Direction: 'XY', Notch: NP, 'Specimen / print parameters': ESUN_SILK_SPEC }),
    num('Izod impact strength', '2.19 KJ/m²', 'KJ/m²', 'kJm2', 'GB/T 1843', 'p. 2: IZOD Impact Strength (Z)', { 'Specimen type': PRINTED, Direction: 'Z', Notch: NP, 'Specimen / print parameters': ESUN_SILK_SPEC }),
  ] },
  'yousu-pom': { MaterialID: 'M087', SourceID: 'R-YOUSU-POM-TDS', rows: [
    num('Density', '1.14 g/cm3', 'g/cm3', 'gcc', 'ISO 1183', 'p. 1: Density', { 'Specimen type': DENSITY_FORM, ...THERMAL, 'Test temperature': '23 °C', Notes: 'As published. Polyacetal is 1.38-1.44 g/cm³ neat (polymers.csv); the value is kept as the sheet prints it.' }),
    num('Melt mass-flow rate', '6 g/10min', 'g/10min', 'g10', 'ISO 1133 (220 °C, 10 kg)', 'p. 1: Melt Flow Rate', { ...THERMAL, 'Test temperature': '220 °C' }),
    num('Tensile yield strength', '65.0 Mpa', 'Mpa', 'MPa', 'ISO 527-2, yield', 'p. 1: Tensile Strength (23 °C, yield)', { 'Test temperature': '23 °C' }),
    num('Flexural strength', '84 Mpa', 'Mpa', 'MPa', 'ISO 178', 'p. 1: Flexural Strength', { 'Test temperature': '23 °C' }),
    num('Flexural modulus', '2.45 Gpa', 'Gpa', 'GPa', 'ISO 178', 'p. 1: Flexural modulus', { 'Test temperature': '23 °C' }),
    num('Elongation at break', '35 %', '%', 'pct', 'ISO 527-2, break', 'p. 1: Tensile Elongation (23 °C, break)', { 'Test temperature': '23 °C' }),
    num('Impact strength', '7 KJ/m2', 'KJ/m2', 'kJm2', 'ISO 179/1eA', 'p. 1: Notched Izod Impact', { Notch: 'Notched', Notes: YOUSU_IZOD_NOTE }),
    num('HDT', '96 ℃', '°C', 'C', 'ISO 75-2/A, 1.8 MPa', 'p. 1: Heat Deflection Temperature (1.8 MPa, Unannealed)', { ...THERMAL, 'Test load MPa': '1.8', 'Post-processing': 'Unannealed' }),
  ] },
  'flexfill-peba': { MaterialID: 'M045', SourceID: 'R-FILLAMENTUM-FLEXFILL-PEBA-90A-TDS', rows: [
    num('Density', '1.0 g/cm3', 'g/cm3', 'gcc', 'ISO 1183', 'p. 1: Material density', { 'Specimen type': DENSITY_FORM, ...THERMAL }),
    num('Tensile break strength', '36 MPa', 'MPa', 'MPa', 'ASTM D638, at break', 'p. 1: Tensile strength, at break', { Notes: 'The sheet also prints 9 MPa "at 50% elongation" (a stress at fixed strain, no property for it).' }),
    num('Elongation at break', '> 1000 %', '%', 'pct', 'ASTM D638', 'p. 1: Elongation at break', {}),
    num('Flexural modulus', '65 MPa', 'MPa', 'MPaGPa', 'ASTM D790, 1.27 mm/min', 'p. 1: Flexural modulus', {}),
    qual('Izod impact strength', 'no break', 'kJm2', 'ASTM D256, notched', 'p. 1: Izod impact strength, 23 °C, notched', { Notch: 'Notched', 'Test temperature': '23 °C' }),
    num('Hardness', '42 Shore D', 'Shore D', 'ShoreD', 'ASTM D2240', 'p. 1: Hardness', { ...THERMAL, Notes: 'No conversion between hardness scales.' }),
  ] },
};

// ----------------------------------------------------------------------------------------------------- coverage
// Grades findings superseded by the new manufacturer counts. [material, old row, new status, new finding]
const COVERAGE = [
  ['M093', 'C00047', 'Gap', (n) => `${n} distinct manufacturer(s) documented against target 3. Polymaker PolySmooth (G093-02) added ${DATE} (m35) with printed X-Y and Z values.`],
  ['M076', 'C00033', 'Gap', (n) => `${n} distinct manufacturer(s) documented against target 3. Forward AM Ultrafuse BVOH (G076-02) added ${DATE} (m35) with printed XY, XZ and ZX values.`],
  ['M085', 'C00039', 'Gap', (n) => `${n} distinct manufacturer(s) documented against target 3. Braskem FL300PE (G085-02) added ${DATE} (m35) with X-Y printed part properties.`],
  ['M046', 'C00013', 'Resolved', (n) => `${n} distinct manufacturers documented after adding Kimya TPC-91A (G046-02) and DSM Arnitel ID 2045 (G046-03) on ${DATE} (m35); the selected BASF grade still publishes no mechanical value.`],
  ['M087', 'C00041', 'Resolved', (n) => `${n} distinct manufacturers documented after adding Yousu POM (G087-03) on ${DATE} (m35); Grupa Azoty Tarfuse POM (G087-02) stays the representative grade.`],
  ['M045', 'C01114', 'Resolved', (n) => `${n} distinct manufacturers documented after adding Fillamentum Flexfill PEBA 90A (G045-04) on ${DATE} (m35).`],
];
// Thermal findings the new rows make untrue or incomplete. [material, old row, domain, new status, new finding]
const COVERAGE_OTHER = [
  ['M085', 'C00911', 'Thermal', 'Evidence recorded', `Braskem FL300PE (G085-02) printed part HDT 66 °C at 0.455 MPa (ASTM D648) and Vicat 125 °C (10 N) recorded ${DATE} (m35); the Spectrum grade publishes "Heat resistance 110 °C" without a method. HDT, Tg and Vicat are not continuous-service ratings.`],
  ['M008', 'C00138', 'Thermal', 'Evidence recorded', `Panchroma Silk PLA (G008-01): Vicat 64.7 °C, HDT not published and not substituted. eSUN PLA-Silk (G008-02) HDT 50 °C at 0.45 MPa (GB/T 1634) recorded ${DATE} (m35).`],
  ['M087', 'C00932', 'Thermal', 'Evidence recorded', `Tarfuse POM (G087-02): melting point 165-170 °C, Tg -50 °C, no HDT published. Yousu POM (G087-03) HDT 96 °C at 1.8 MPa, unannealed, recorded ${DATE} (m35). Delrin 100P NC010 (G087-R1) stays a moulded resin reference, never a headline.`],
];

// ------------------------------------------------------------------------------------------------------ migrate
export function migrate(t) {
  // 1. eSUN PEBA-90A: the axis-labelled rows are printed specimens (p. 3).
  correct(t, {
    source: 'S-PEBA-PEBA90A-TDS-en', ids: ['V000843', 'V000844', 'V000845', 'V002166'], migration: MIGRATION, date: DATE,
    set: { 'Specimen type': ['Not published (do not assume printed)', PRINTED], 'Specimen / print parameters': [NP, ESUN_PEBA_SPEC] },
    note: 'p. 3 states "The performance of the filament is evaluated based on standard samples printed by eSUN" and gives the print test conditions; the Z-axis and XY-axis rows are printed specimens.',
  });

  // 2. Sources.
  for (const s of SOURCES) if (!t.find('sources', s.SourceID)) t.append('sources', { 'Access date': DATE, ...s });

  // 3. Grades, one per source; a grade already recorded for the source and product is reused.
  const gradeIds = {};
  for (const { key, ...g } of GRADES) {
    const existing = t.rows('grades').find((r) => r.SourceID === g.SourceID && r['Product name'] === g['Product name']);
    if (existing) { gradeIds[key] = existing.GradeID; continue; }
    const row = { ...GRADE_DEFAULTS, ...g, GradeID: nextId('grades', t.rows('grades').map((r) => r.GradeID), { materialId: g.MaterialID }) };
    t.append('grades', row);
    gradeIds[key] = row.GradeID;
  }
  const expected = { polysmooth: 'G093-02', 'ultrafuse-bvoh': 'G076-02', fl300pe: 'G085-02', 'kimya-tpc': 'G046-02', arnitel: 'G046-03', 'esun-silk': 'G008-02', 'yousu-pom': 'G087-03', 'flexfill-peba': 'G045-04' };
  for (const [key, id] of Object.entries(expected)) if (gradeIds[key] !== id) throw new Error(`${MIGRATION}: ${key} became ${gradeIds[key]}, not ${id}; the sources' "Applicable grades" name ${id}`);

  // 4. Measurements; a row of the source with the same locator is not added twice.
  for (const [key, { MaterialID, SourceID, rows }] of Object.entries(MEASUREMENTS)) {
    for (const r of rows) {
      if (t.rows('measurements').some((x) => x.SourceID === SourceID && x.Locator === r.Locator)) continue;
      const row = { ...r, MeasurementID: nextId('measurements', t.rows('measurements').map((x) => x.MeasurementID)), MaterialID, GradeID: gradeIds[key], SourceID };
      row.Notes = row.Notes === NA ? ADDED : `${ADDED} ${row.Notes}`;
      t.append('measurements', row);
    }
  }

  // 5. Coverage: the Grades finding of each material with a new manufacturer.
  const manufacturers = (materialId) => new Set(t.rows('grades').filter((g) => g.MaterialID === materialId && g.Role === 'procurement' && g.Status === 'active').map((g) => g.Manufacturer)).size;
  for (const [materialId, oldId, status, finding] of COVERAGE) {
    const old = t.get('coverage', oldId);
    if (old.Status === 'Superseded') continue;
    const newId = nextId('coverage', t.rows('coverage').map((r) => r.CoverageID));
    t.append('coverage', { CoverageID: newId, MaterialID: materialId, Domain: 'Grades', Status: status, 'Manufacturer count': String(manufacturers(materialId)), Finding: finding(manufacturers(materialId)) });
    t.set('coverage', oldId, 'Finding', `Superseded by ${newId} (${DATE}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', oldId, 'Status', 'Superseded', { expect: old.Status });
    t.set('coverage', oldId, 'Manufacturer count', NA, { expect: old['Manufacturer count'] });
  }
  for (const [materialId, oldId, domain, status, finding] of COVERAGE_OTHER) {
    const old = t.get('coverage', oldId);
    if (old.Status === 'Superseded') continue;
    const newId = nextId('coverage', t.rows('coverage').map((r) => r.CoverageID));
    t.append('coverage', { CoverageID: newId, MaterialID: materialId, Domain: domain, Status: status, 'Manufacturer count': NA, Finding: finding });
    t.set('coverage', oldId, 'Finding', `Superseded by ${newId} (${DATE}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', oldId, 'Status', 'Superseded', { expect: old.Status });
  }

  // A re-run after the first pass: the typed test load of the Braskem HDT row carries its Parse review.
  const hdt = t.rows('measurements').find((x) => x.SourceID === 'R-BRASKEM-FL300PE-PDS' && x['Test load MPa'] === '0.455');
  if (hdt && hdt['Parse review'] === NA) t.set('measurements', hdt.MeasurementID, 'Parse review', BRASKEM_LOAD_REVIEW, { expect: NA });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
