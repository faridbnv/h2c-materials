#!/usr/bin/env node
// Migration m445 (2026-10-18), batch b47: polymer reference documents, admitted through the import pipeline, and the rows
// of polymers.csv that now cite them (the screening build's stage 2c). Read by Claude Opus 5.5 on the cached text and the
// page images (docs/audits/2026-10-18-screening-build/ingest/build-b47.mjs, which writes the proposals and the packet this
// pins).
//
// 22 of the 36 polymers.csv rows that cited no source now cite one, each a document that prints a density inside the row's
// neat density range: 16 new documents (15 cited, 1 corroborating) and 7 already registered (NatureWorks Ingeo 3D850,
// Celanese Zytel 101L, DuPont's Zytel guide, Evonik's VESTAMID brochure, DuPont Delrin 100P, DuPont's Hytrel guide and
// Solvay's Amodel overview). Each row's Basis now names its document and quotes what it prints: the density, the water
// absorption at 23 °C after 24 h and at saturation where the document prints them (stage 3b's lab-humidity rule reads a
// polymer's saturation figure), and PLA's melting point and glass transition (stage 4 decides PLA's class). A second
// document is named in the Basis with its SHA-256 prefix, as the PBT, PCL and PLA-PHA rows do.
//
// No density, melting point, water uptake, morphology or as-printed cell changes: polymers.csv is read by the estimate
// stage, which is frozen until stage 4, and a moved cell would move estimates. Where a document's figure differs from a
// cell (PET's melting point 245 °C beside the row's 252, PA6's 220 beside 222, PPS's 280 beside 283, PVDF's 168 beside
// 170, PVA's 230 beside 220), the Basis says so and the cell stays. The 14 rows no document was found for keep "Not
// recorded" (OPEN-PROBLEMS §38.4), and BVOH's range, which the one figure found (a distributor's 1.29 g/cm³) exceeds,
// is unchanged (§38.5).
//
// The batch is guarded and rehearsed as every batch is (scripts/ingest/apply.mjs: hashes, reviews, the schema gate, no
// new lint finding, the core build) together with the polymers.csv edits, before anything is written; each edit names
// the cell it replaces, and every quoted line is checked on its cached, hash-checked sheet. The round's ledger
// (docs/audits/2026-10-18-screening-build/ingest/ledger.csv) records each document as applied. A re-run is a no-op.
//
//   node scripts/migrate/m445-batch-b47-polymer-references.mjs [--dry-run]
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { checkData } from '../../build/src/schema.js';
import { readCsv } from '../../build/src/csv.js';
import { lintData, findingKey } from '../../build/src/lint-rules.js';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';

const migration = 'm445-batch-b47-polymer-references', date = '2026-10-18';
const at = join(projectRoot, 'docs/audits/2026-10-18-screening-build/ingest');
const PACKET_SHA256 = '14a2eee086e1db7137ab0d9e9fe77c6357eb71e13f7d5daddf40526cb17eec11';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(join(at, 'b47-packet.json')), digest = hash(bytes);
if (digest !== PACKET_SHA256) throw Error(`${migration}: changed packet`);
const p = JSON.parse(bytes);

// The round's own ledger and proposals: the documents were staged there (ingest:witness --from), and applied is written there.
process.env.H2C_INGEST_ROOT = at;
process.env.H2C_PROPOSALS = join(at, 'proposals');
const { proposalsOf, guard, worldOf, writeBatch, markApplied } = await import('../../scripts/ingest/apply.mjs');
const { locate } = await import('../../scripts/data/source-store.mjs');
const { onSheet } = await import('../../scripts/lib/sweep-shared.mjs');

const proposals = proposalsOf('b47');
if (proposals.length !== p.Documents.length) throw Error(`${migration}: proposal inventory moved`);
for (const d of p.Documents) {
  if (hash(readFileSync(join(at, 'proposals/b47', d.File))) !== d.ProposalSHA256) throw Error(`${migration}: proposal ${d.File} moved`);
  const o = locate(d.OriginalSHA256, d.Source.SourceID);
  if (o.bytes !== 'present') throw Error(`${migration}: ${d.Source.SourceID} is ${o.bytes}; restore the source store (npm run data:sources -- --restore "$H2C_SOURCE_BACKUP")`);
}

// ---- the rows of polymers.csv ---------------------------------------------------------------------------------------
const HANDBOOK = 'Classification and typical values from polymer handbooks and resin data sheets, as compiled for the estimate model (docs/audits/2026-09-15-filtering-estimates-data/physics/); no single source recorded.';
const LEAD = 'Classification and typical values from polymer handbooks and resin data sheets, as compiled for the estimate model (docs/audits/2026-09-15-filtering-estimates-data/physics/). The document cited prints a density inside the range, not its ends.';
const CUED = 'The Cambridge Materials Data Book (R-CUED-MATERIALS-DATA-BOOK-2003, SHA-256 2bcf739fd66f...) gives';
// Each row: the source it cites, the Basis it had, what is added, and the lines of the cited documents the words rest on
// (checked on the cached sheet before anything is written; `|` separates lines read apart).
const ROWS = [
  { id: 'PLA', source: 'R-NATUREWORKS-INGEO-3D850-TDS', before: HANDBOOK, lead: true,
    add: 'NatureWorks Ingeo 3D850 (R-NATUREWORKS-INGEO-3D850-TDS), a PLA grade for 3D-printing monofilament, prints a specific gravity of 1.24 (ASTM D792), a peak melt temperature of 165-180 °C and a glass transition temperature of 55-60 °C (both ASTM D3418), p. 1. It prints no water absorption. The melting point column stays Not applicable while this row classes PLA as amorphous; that class is the estimate model\'s to change, with a back-test (screening build, stage 4).',
    quotes: { 'R-NATUREWORKS-INGEO-3D850-TDS': ['Specific Gravity, g/cc 1.24 D792', 'Peak Melt Temperature, °C 165-180 D3418', 'Glass Transition Temperature, °C 55-60 D3418'] } },
  { id: 'PETG', source: 'R-EASTMAN-EASTAR-6763-TDS', before: HANDBOOK, lead: true,
    add: 'Eastman\'s data sheet for Eastar copolyester 6763 (R-EASTMAN-EASTAR-6763-TDS, a web page) prints, for injection-moulded bars, a specific gravity of 1.27 (ASTM D792) and a density of 1.27 g/cm³ (ISO 1183, method D), a water absorption of 0.13 % after 24 h immersion (ASTM D570 and ISO 62) and a glass transition temperature of 80 °C by DSC. It prints no saturation figure. Eastman\'s technical information for the grade (R-EASTMAN-EASTAR-6763-MBS80, MBS-80Q, SHA-256 f764fce37683...) calls it "a clear amorphous polymer" based "on poly(ethylene terephthalate)" (p. 3): the amorphous PET copolyester this row stands for.',
    quotes: { 'R-EASTMAN-EASTAR-6763-TDS': ['Specific Gravity D 792 1.27', 'Density ISO 1183, Method D 1.27 g/cm 3', 'Water Absorption, 24 h immersion D 570 0.13 %', 'Water Absorption, 24 h immersion ISO 62 0.13 %', 'Glass Transition Temperature (T g ) DSC 80 °C (176 °F)'],
      'R-EASTMAN-EASTAR-6763-MBS80': ['Eastar copolyester 6763 is a clear amorphous polymer with a', 'on poly(ethylene terephthalate) and has a number-average'] } },
  { id: 'PET', source: 'R-MCAM-ERTALYTE-PET-P-DS', before: 'Handbook values; prints amorphous: PET-GF15 81.6 °C as printed and 133.7 °C annealed (DECISIONS D56).',
    add: `Mitsubishi Chemical Advanced Materials' sheet for Ertalyte PET-P (R-MCAM-ERTALYTE-PET-P-DS), an unreinforced, semi-crystalline PET, prints a density of 1.39 g/cm³ (ISO 1183-1) and a specific gravity of 1.41 (ASTM D792), inside the density range, and a melting temperature of 245 °C (ISO 11357-1/-3) beside the row's 252, p. 1. Its water absorption in water at 23 °C is 0.07 % after 24 h (ISO 62 and ASTM D570) and, at saturation, 0.50 % to ISO 62 and 0.9 % to ASTM D570. ${CUED} PET 1.29-1.4 Mg/m³.`,
    quotes: { 'R-MCAM-ERTALYTE-PET-P-DS': ['Density ISO 1183-1 g/cm³ 1.39', 'Specific Gravity ASTM D792 1.41', 'Melting temperature (DSC, 10°C (50°F) / min) ISO 11357-1/-3 °C 245', 'Water absorption after 24h immersion in water of 23 °C (73°F) ISO 62 (16) % 0.07 ASTM D570 (17) % 0.07', 'Water absorption at saturation in water of 23 °C (73°F) % 0.50 ASTM D570 (17) % 0.9'] } },
  { id: 'ABS', source: 'R-INEOS-TERLURAN-GP22-TDS', before: HANDBOOK, lead: true,
    add: `INEOS Styrolution's sheet for Terluran GP-22 (R-INEOS-TERLURAN-GP22-TDS), a general-purpose ABS injection-moulding grade, prints a density of 1040 kg/m³ (ISO 1183) and a water absorption of 1 % saturated at 23 °C and 0.22 % at equilibrium at 23 °C / 50 % RH (ISO 62), p. 2. ${CUED} ABS 1.01-1.21 Mg/m³.`,
    quotes: { 'R-INEOS-TERLURAN-GP22-TDS': ['Density ISO 1183 kg/m³ 1040', 'Water Absorption, Saturated at 23 °C ISO 62 % 1', 'Moisture Absorption, Equilibrium 23 °C/50% RH ISO 62 % 0.22'] } },
  { id: 'ASA', source: 'R-INEOS-LURAN-S778T-TDS', before: HANDBOOK, lead: true,
    add: 'INEOS Styrolution\'s sheet for Luran S 778T SPF30 Black 28214 (R-INEOS-LURAN-S778T-TDS), a black colour of an ASA injection-moulding grade, prints a density of 1070 kg/m³ (ISO 1183) and a water absorption of 1.65 % saturated at 23 °C and 0.35 % at equilibrium at 23 °C / 50 % RH (ISO 62), p. 2. The figures are a coloured grade\'s, not the natural resin\'s.',
    quotes: { 'R-INEOS-LURAN-S778T-TDS': ['Luran S 778T SPF30 Black 28214', 'Density ISO 1183 kg/m³ 1070', 'Water Absorption, Saturated at 23 °C ISO 62 % 1.65', 'Moisture Absorption, Equilibrium 23 °C/50% RH ISO 62 % 0.35'] } },
  { id: 'PC', source: 'R-COVESTRO-MAKROLON-2405-ISO', before: HANDBOOK, lead: true,
    add: `Covestro's ISO datasheet for Makrolon 2405 (R-COVESTRO-MAKROLON-2405-ISO), a general-purpose, low-viscosity polycarbonate, prints a density of 1200 kg/m³ (ISO 1183-1) and a water absorption of 0.30 % at saturation in water at 23 °C and 0.12 % at equilibrium at 23 °C / 50 % RH (ISO 62), p. 3. It prints no 24-hour figure. ${CUED} PC 1.14-1.21 Mg/m³.`,
    quotes: { 'R-COVESTRO-MAKROLON-2405-ISO': ['C Density kg/m³ ISO 1183-1 1200', 'C Water absorption (saturation value) Water at 23 °C % ISO 62 0.30', 'C Water absorption (equilibrium value) 23 °C; 50 % r. h. % ISO 62 0.12'] } },
  { id: 'PC-ABS', source: 'R-COVESTRO-BAYBLEND-T65XF-ISO', before: HANDBOOK, lead: true,
    add: 'Covestro\'s ISO datasheet for Bayblend T65 XF (R-COVESTRO-BAYBLEND-T65XF-ISO), a non-reinforced (PC+ABS) blend, prints a density of 1130 kg/m³ (ISO 1183-1) and a water absorption of 0.7 % at saturation in water at 23 °C and 0.2 % at equilibrium at 23 °C / 50 % RH (ISO 62), p. 1.',
    quotes: { 'R-COVESTRO-BAYBLEND-T65XF-ISO': ['C Density kg/m³ ISO 1183-1 1130', 'C Water absorption (saturation value) Water at 23 °C % ISO 62 0.7', 'C Water absorption (equilibrium value) 23 °C; 50 % r. h. % ISO 62 0.2'] } },
  { id: 'PC-PBT', source: 'R-SABIC-XENOY-6620-DS', before: HANDBOOK, lead: true,
    add: 'UL Prospector\'s sheet of SABIC\'s figures for XENOY 6620 (R-SABIC-XENOY-6620-DS), an unreinforced, impact-modified PBT+PC alloy, prints a specific gravity of 1.20 (ASTM D792) and a water absorption of 0.080 % after 24 h (ASTM D570), p. 1. It prints no saturation figure.',
    quotes: { 'R-SABIC-XENOY-6620-DS': ['PBT+PC, Unreinforced, impact modified thermoplastic alloy', 'Specific Gravity 1.20 1.20 g/cm³ ASTM D792', 'Water Absorption (24 hr) 0.080 % 0.080 % ASTM D570'] } },
  { id: 'PA6', source: 'R-BASF-ULTRAMID-B27E-PI', before: HANDBOOK, lead: true,
    add: 'BASF\'s product information for Ultramid B27 E (R-BASF-ULTRAMID-B27E-PI), a low-viscosity polyamide 6 grade for compounding and monofilaments, prints a density of 1.12-1.15 g/cm³ (ISO 1183), a melting point of 220 °C (ISO 3146) beside the row\'s 222, and a water absorption of 2.2 % at 23 °C / 50 % RH and 8.5 % at saturation in water at 23 °C, p. 1.',
    quotes: { 'R-BASF-ULTRAMID-B27E-PI': ['g/cm 1.12 - 1.15 Density According to ISO 1183', '°C 220 Melting point According to ISO 3146', '% 2.2 Water absorption, 23°C/50% rh', '% 8.5 Water absorption, saturation in water 23°C'] } },
  { id: 'PA66', source: 'R-CELANESE-ZYTEL-101L', before: HANDBOOK, lead: true,
    add: 'Celanese\'s sheet for Zytel 101L NC010 (R-CELANESE-ZYTEL-101L), a lubricated polyamide 66 resin for injection moulding, prints a density of 1140 kg/m³ (ISO 1183) and, on 2 mm specimens similar to ISO 62, a humidity absorption of 2.6 %, a water absorption of 8.5 % and 1.2 % after 24 h immersion, p. 3, with a melting temperature of 262 °C (ISO 11357-1/-3), p. 2. DuPont\'s Zytel guide (R-DUPONT-ZYTEL-GUIDE, SHA-256 4b28bc3c55f6...) prints 1140 kg/m³ for the unreinforced Zytel 101L and 101F, p. 6.',
    quotes: { 'R-CELANESE-ZYTEL-101L': ['Zytel® 101L NC010 is a lubricated polyamide 66 resin for injection moulding.', 'Density 1140 / - kg/m³ ISO 1183', 'Humidity absorption, 2mm 2.6 / * % Sim. to ISO 62', 'Water absorption, 2mm 8.5 / * % Sim. to ISO 62', 'Water absorption, Immersion 24h 1.2 /* % Sim. to ISO 62', 'Melting temperature, 10°C/min 262 / * °C ISO 11357-1/-3'],
      'R-DUPONT-ZYTEL-GUIDE': ['Test ZYTEL 101L ZYTEL 101F', 'Density 1183 kg/m 1140 1140'] } },
  { id: 'PA612', source: 'R-DUPONT-ZYTEL-GUIDE', before: HANDBOOK, lead: true,
    add: 'DuPont\'s Zytel guide (R-DUPONT-ZYTEL-GUIDE) prints, for the unreinforced PA612 grades Zytel 151L and 153HSL, a density of 1060 kg/m³ (ISO 1183), a melting temperature of 218 °C (ISO 11357-1/-3) and a water absorption, similar to ISO 62, of 1.3 % at equilibrium at 50 % RH and 23 °C and 3 % saturated, immersed at 23 °C, p. 8.',
    quotes: { 'R-DUPONT-ZYTEL-GUIDE': ['Test ZYTEL 151L ZYTEL 153HSL', 'Density 1183 kg/m 1060 1060', 'Melting temperature 10°C/min 11357-1/-3 °C 218 218', 'Water absorption Equilibrium, 50% RH, 23°C Similar % 1,3 1,3', 'Saturation, immersed, 23°C to ISO 62 3 3'] } },
  { id: 'PA12', source: 'R-EVONIK-VESTAMID-PA12', before: HANDBOOK, lead: true,
    add: 'Evonik\'s VESTAMID brochure (R-EVONIK-VESTAMID-PA12) prints, for its unfilled VESTAMID L compounds L1670, X7377, L1940 and L1970, densities of 1.01 to 1.03 g/cm³ (ISO 1183), a melting temperature of 178 °C (DSC, ISO 11357) and a water absorption (ISO 62) of 1.4 and 1.5 % at saturation at 23 °C (L1670, L1940) and 0.7 to 0.8 % at 23 °C / 50 % RH, p. 24.',
    quotes: { 'R-EVONIK-VESTAMID-PA12': ['Unfilled VESTAMID', 'and flammability Test method Unit L1670 X7377 L1940 L1970', 'Density ISO 1183 g/cm³ 1.01 1.03 1.01 1.02', 'Melting temperature DSC, 2nd heating ISO 11357 °C 178 178 178 178', '23°C, saturation ISO 62 % 1.4 1.5', '23°C, 50% relative humidity ISO 62 % 0.7 0.8 0.7'] } },
  { id: 'POM', source: 'R-DUPONT-DELRIN-100P', before: HANDBOOK, lead: true,
    add: `DuPont's product information for Delrin 100P NC010 (R-DUPONT-DELRIN-100P), a high-viscosity acetal homopolymer, prints a density of 1420 kg/m³ (1.42 g/cm³, ISO 1183) and a water absorption, similar to ISO 62, of 0.3 % at equilibrium at 50 % RH and 1.4 % saturated, immersed, p. 3. ${CUED} acetal (POM) 1.39-1.43 Mg/m³.`,
    quotes: { 'R-DUPONT-DELRIN-100P': ['Delrin 100P is a high viscosity acetal homopolymer', 'Density ISO 1183 kg/m (g/cm ) 1420 (1.42)', 'Water Absorption ISO 62, Similar to %', 'Equilibrium 50%RH 0.3', 'Saturation, immersed 1.4'] } },
  { id: 'PPA', source: 'R-SOLVAY-AMODEL-PPA-OVERVIEW', before: 'Handbook values; prints amorphous unless fibre-filled: IPCON PPA 103 °C as printed and 131 °C annealed, Bambu PPA-CF 227 °C unannealed (D56).',
    add: 'Solvay\'s Amodel PPA overview (R-SOLVAY-AMODEL-PPA-OVERVIEW) prints a specific gravity of 1.13 for Amodel AT-1002 HS, the one unfilled grade of its typical-properties table (toughened and heat stabilised), inside the density range, p. 7 (printed page 5); its other grades there are glass- or mineral-filled. It prints no water absorption.',
    quotes: { 'R-SOLVAY-AMODEL-PPA-OVERVIEW': ['Unfilled, toughened and heat stabilized', 'Property Units 33 % GF 45 % GF 45 % GF Mineral Unfilled 30 % GF 33 % GF', 'Specific gravity 1.48 1.59 1.55 1.84 1.13 1.34 1.68'] } },
  { id: 'PP', source: 'R-MCAM-PROTEUS-PP-H-DS', before: HANDBOOK, lead: true,
    add: `Mitsubishi Chemical Advanced Materials' sheet for Proteus Homopolymer PP Natural (R-MCAM-PROTEUS-PP-H-DS) prints a density of 0.91 g/cm³ (ISO 1183-1) and a specific gravity of 0.91 (ASTM D792), a melting temperature of 165 °C (ISO 11357-1/-3), and a water absorption in water at 23 °C below 0.1 % after 24 h and below 0.1 % at saturation (ISO 62), p. 1. ${CUED} PP 0.89-0.91 Mg/m³.`,
    quotes: { 'R-MCAM-PROTEUS-PP-H-DS': ['Density ISO 1183-1 g/cm³ 0.91', 'Specific Gravity ASTM D792 0.91', 'Melting temperature (DSC, 10°C (50°F) / min) ISO 11357-1/-3 °C 165', 'Water absorption after 24h immersion in water of 23 °C (73°F) ISO 62 (16) % <0.1', 'Water absorption at saturation in water of 23 °C (73°F) % <0.1'] } },
  { id: 'PE', source: 'R-MCAM-PROTEUS-HDPE-DS', before: HANDBOOK, lead: true,
    add: `Mitsubishi Chemical Advanced Materials' sheet for Proteus HDPE (R-MCAM-PROTEUS-HDPE-DS), a high-density polyethylene, prints a specific gravity of 0.96 (ASTM D792; its ISO density cell is empty) and a water absorption in water at 23 °C below 0.01 % after 24 h and below 0.01 % at saturation (ISO 62 and ASTM D570), p. 1. ${CUED} polyethylene 0.939-0.96 Mg/m³. Neither prints a figure below 0.939, where the range begins at 0.900.`,
    quotes: { 'R-MCAM-PROTEUS-HDPE-DS': ['High Density Polyethylene', 'Specific Gravity ASTM D792 0.96', 'Water absorption after 24h immersion in water of 23 °C (73°F) ISO 62 (16) % <0.01 ASTM D570 (17) % <0.01', 'Water absorption at saturation in water of 23 °C (73°F) % <0.01 ASTM D570 (17) % <0.01'] } },
  { id: 'PPS', source: 'R-MCAM-TECHTRON-1000-PPS-DS', before: 'Handbook values; printed hot PPS crystallises (IPCON PPS GF 241 °C, Bambu PPS-CF 264 °C unannealed), but its heat deflection is not modelled on its melting point (D56).',
    add: 'Mitsubishi Chemical Advanced Materials\' sheet for Techtron 1000 PPS (R-MCAM-TECHTRON-1000-PPS-DS), a polyphenylene sulfide that names no filler, prints a density of 1.35 g/cm³ (ISO 1183-1) and a specific gravity of 1.35 (ASTM D792), inside the density range, a melting temperature of 280 °C (ISO 11357-1/-3) beside the row\'s 283, and a water absorption in water at 23 °C of 0.01 % after 24 h (ISO 62 and ASTM D570) and, at saturation, 0.10 % to ISO 62 and 0.03 % to ASTM D570, p. 1.',
    quotes: { 'R-MCAM-TECHTRON-1000-PPS-DS': ['Density ISO 1183-1 g/cm³ 1.35', 'Specific Gravity ASTM D792 1.35', 'Melting temperature (DSC, 10°C (50°F) / min) ISO 11357-1/-3 °C 280', 'Water absorption after 24h immersion in water of 23 °C (73°F) ISO 62 (16) % 0.01 ASTM D570 (17) % 0.01', 'Water absorption at saturation in water of 23 °C (73°F) % 0.10 ASTM D570 (17) % 0.03'] } },
  { id: 'PVDF', source: 'R-ARKEMA-KYNAR-710-TDS', before: HANDBOOK, lead: true,
    add: 'Arkema\'s sheet for KYNAR 710 (R-ARKEMA-KYNAR-710-TDS), a PVDF homopolymer pellet, prints a density of 1.77-1.79 g/cm³ (ISO 1183-1), a water absorption of 0.03 % at equilibrium, immersed, at 23 °C (ISO 62), a glass transition temperature of -40 °C and a melting temperature of 168 °C (ISO 11357) beside the row\'s 170, p. 2. It prints no 24-hour figure.',
    quotes: { 'R-ARKEMA-KYNAR-710-TDS': ['KYNAR resins are fluorinated thermoplastic homopolymers.', 'Density, 23°C (73°F) 1.77 - 1.79 g/cm³ ISO 1183-1', 'Water absorption, at equilibrium at 23°C (73°F) / 0.03 % ISO 62 Immersion', 'Glass transition temperature, 10°C/min -40 °C ISO 11357-1/-2', 'Melting temperature, 10°C/min 168 °C ISO 11357-1/-3'] } },
  { id: 'PVA', source: 'R-SEKISUI-SELVOL-E107-TDS', before: 'Handbook values; prints amorphous (D56).',
    add: 'Sekisui\'s sheet for Selvol E 107 (R-SEKISUI-SELVOL-E107-TDS), a fully hydrolysed polyvinyl alcohol (98.0-98.8 mol %), prints a specific gravity of 1.27-1.31 with no test method, inside the density range, a glass transition temperature of 85 °C and a melting point of 230 °C beside the row\'s 220, p. 1. It prints no water absorption.',
    quotes: { 'R-SEKISUI-SELVOL-E107-TDS': ['SELVOL E 107 is a low viscosity fully hydrolysed polyvinyl alcohol', 'Degree of Hydrolysis Mol % 98.0 - 98.8', 'Specific gravity', '1.27 - 1.31', 'Glass transition temperature (ºC)', 'Melting point (ºC)'] } },
  { id: 'TPU', source: 'R-CUED-MATERIALS-DATA-BOOK-2003', before: HANDBOOK, lead: true,
    add: 'The Cambridge Materials Data Book, 2003 edition (R-CUED-MATERIALS-DATA-BOOK-2003), a teaching reference whose polymer data are Granta Design\'s, gives thermoplastic polyurethane (tpPU) 1.12-1.24 Mg/m³ (Section II.2, Density, PDF p. 12); the row\'s 1050-1300 is wider. No producer\'s sheet with a readable figure was registered for TPU.',
    quotes: { 'R-CUED-MATERIALS-DATA-BOOK-2003': ['Polyurethane Thermoplastics (tpPU)', '(Data courtesy of Granta Design Ltd)'] } },
  { id: 'PEBA', source: 'R-ARKEMA-PEBAX-5533-SP01-TDS', before: HANDBOOK, lead: true,
    add: 'Arkema\'s sheet for PEBAX 5533 SP 01 (R-ARKEMA-PEBAX-5533-SP01-TDS), a polyether block amide, prints a density of 1.01 g/cm³ (ISO 1183-1), a melting temperature of 159 °C (ISO 11357-1/-3) and a water absorption at equilibrium at 23 °C of 0.6 % at 50 % RH and 1.2 % immersed (ISO 62), p. 2.',
    quotes: { 'R-ARKEMA-PEBAX-5533-SP01-TDS': ['PEBAX 5533 SP 01 is a polyether block amide', 'Density, 23°C (73°F) 1.01 g/cm³ ISO 1183-1', 'Melting temperature, 10°C/min 159 °C ISO 11357-1/-3', 'Water absorption, at equilibrium at 23°C (73°F) / 0.6 % ISO 62 50%RH', 'Water absorption, at equilibrium at 23°C (73°F) / 1.2 % ISO 62 Immersion'] } },
  { id: 'TPC', source: 'R-DUPONT-HYTREL-MODULE-V', before: HANDBOOK, lead: true,
    add: 'DuPont\'s Hytrel design guide, module V (R-DUPONT-HYTREL-MODULE-V), prints specific gravities of 1.11 to 1.22 for eight grades, G3548W to 4069 (ASTM D792, ISO 1183), and a water absorption of 0.6 to 5 % after 24 h (ASTM D570, ISO 62), table 2, p. 9.',
    quotes: { 'R-DUPONT-HYTREL-MODULE-V': ['Property ASTM ISO Unit G3548W G4074 G4078W G4774 G4778 G5544 4056 4069', 'Specific Gravity D 792 R1183 — 1.15 1.18 1.18 1.20 1.20 1.22 1.17 1.11', 'Water Absorption, 24 hr D 570 62 % 5 2.1 3 2.5 2.3 1.5 0.6 0.7'] } },
];
const basisOf = (r) => (r.lead ? `${LEAD} ${r.add}` : `${r.before} ${r.add}`);

/** Point each row at its source and write its Basis, naming the cells replaced; every quote is checked on its sheet first. */
function polymers(t) {
  let n = 0;
  for (const r of ROWS) {
    for (const [sourceId, lines] of Object.entries(r.quotes)) onSheet(t, sourceId, lines.join(' | '), migration);
    const row = t.get('polymers', r.id);
    if (row.SourceID !== r.source) { t.set('polymers', r.id, 'SourceID', r.source, { expect: 'Not recorded', migration }); n++; }
    const basis = basisOf(r);
    if (row.Basis !== basis) { t.set('polymers', r.id, 'Basis', basis, { expect: r.before, migration }); n++; }
  }
  return n;
}

// Rehearse on a copy of the tables: the batch and the polymer rows together, then the schema gate, the lint (no new
// finding) and the core build, before anything is written.
const dir = mkdtempSync(join(tmpdir(), 'h2c-b47-rehearse-'));
let rehearsal;
try {
  cpSync(join(projectRoot, 'data'), join(dir, 'data'), { recursive: true }); cpSync(join(projectRoot, 'schema'), join(dir, 'schema'), { recursive: true });
  const problems = guard(proposals, worldOf(dir));
  if (problems.length) throw Error(JSON.stringify(problems, null, 1));
  const t = openTables(dir), log = writeBatch(t, proposals, { migration, date, root: dir }), set = polymers(t); t.save();
  const gate = checkData(join(dir, 'data'), join(dir, 'schema')); if (gate.issues.length) throw Error(JSON.stringify(gate.issues));
  const tables = Object.fromEntries(Object.keys(gate.schemas).map((n) => { const { header, records } = readCsv(join(dir, 'data/tables', `${n}.csv`)); return [n, { header, rows: records.map((r) => r.values) }]; }));
  const baseline = new Set(readCsv(join(dir, 'data/review/accepted-findings.csv')).records.map((r) => findingKey({ code: r.values.Code, table: r.values.Table, record: r.values.Record, field: r.values.Field ?? '' })));
  const lint = lintData(tables, gate.schemas).filter((f) => !baseline.has(findingKey(f)));
  if (lint.length) throw Error(JSON.stringify(lint, null, 1));
  const wb = loadTables(join(dir, 'data')), issues = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'apply', estimates: false }).issues.filter((i) => i.level === 'error');
  if (issues.length) throw Error(JSON.stringify(issues, null, 1));
  rehearsal = { log, set };
} finally { rmSync(dir, { recursive: true, force: true }); }
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration, packet: digest, rehearsal, written: false }, null, 2)); process.exit(0); }

const t = openTables(), log = writeBatch(t, proposals, { migration, date }), set = polymers(t), applied = markApplied(proposals, t);
if (log.length || set || applied) t.save();
console.log(JSON.stringify({ migration, packet: digest, log, set, applied, written: log.length + set }, null, 2));
