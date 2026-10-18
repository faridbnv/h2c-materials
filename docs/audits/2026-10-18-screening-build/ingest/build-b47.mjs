// b47: the polymer reference documents of the screening build's stage 2c, admitted through the import pipeline so that
// polymers.csv can cite them (its neat densities, the water absorption the lab-humidity rule of stage 3b reads, PLA's
// melting point for stage 4).
//
// A Claude Sonnet agent searched for producer documents and fetched 28 (.cache/screening-build/rereads/POLYMER-SOURCES.md,
// a proposal). Claude Opus 5.5 read every one against its bytes: the text of each page and, where the layout is a table, the
// page image. Kept: the producers' own sheets, or a copy of one whose Source note says whose copy it is. Not kept: three
// distributors' own sheets (Plastics International's TECAPET, Laminated Plastics' Techtron PPS, Direct Plastics' HDPE),
// replaced by the producer's own sheets Claude Opus fetched the same day (Mitsubishi Chemical Advanced Materials' Ertalyte
// PET-P, Techtron 1000 PPS, Proteus Homopolymer PP and Proteus HDPE), and UL Prospector's Makrolon 2405 sheet, replaced by
// Covestro's own ISO datasheet; the PEEK, PEI and PEKK sheets (no polymers.csv row: those materials are outside the H2C's
// scope); LyondellBasell's Moplen page (its data sheet's link reset the connection; PP is sourced without it); the PCTG
// sheets (no document names the polymer PCTG). Every kept document was staged by digest into this round's ledger
// (ingest:witness --from, staged-manifest-b47.csv), which cached its text; each quote below is checked on that text here.
//
//   node docs/audits/2026-10-18-screening-build/ingest/build-b47.mjs
//
// It writes proposals/b47/<sha16>.json and b47-packet.json (the packet m445 pins), and pins the packet in the migration.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cachedText } from '../../../../scripts/lib/pdf-text.mjs';

const HERE = 'docs/audits/2026-10-18-screening-build/ingest';
const OUT = `${HERE}/proposals/b47`;
const MIGRATION = 'scripts/migrate/m445-batch-b47-polymer-references.mjs';
const BY = 'Claude Opus 5.5 (screening build 2026-10-18, b47), read on the cached text and the page image';
const DATE = '2026-10-18';
const NP = 'Not published', NA = 'Not applicable';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const squash = (s) => String(s).replace(/\s+/g, ' ').trim();
const MANIFEST = 'docs/audits/2026-10-18-screening-build/ingest/staged-manifest-b47.csv';
const SONNET = (url) => `Fetched 2026-10-18 by Claude Sonnet (screening build, polymer sources) from ${url}, and fetched again the same day by Claude Opus 5.5, byte for byte the same. Staged by digest into the round's ledger (ingest:witness --from, ${MANIFEST}).`;
const OPUS = (url, extra = '') => `Fetched 2026-10-18 by Claude Opus 5.5 (screening build, b47) from ${url}. Staged by digest into the round's ledger (ingest:witness --from, ${MANIFEST}).${extra ? ` ${extra}` : ''}`;
const MCAM_ISSUE = (date) => `The sheet's margin gives its date of issue as ${date}; Mitsubishi Chemical Advanced Materials serves it from its product page, and a later fetch may carry another date and hash differently.`;

// Each document: its source row, the line that says what it is (identity), and the lines its figures are read from. A
// quote is a run of the page's cached lines; `visual` marks a page whose text layer does not keep a table's rows together,
// where the figures were read on the page image and only their words and numbers are checked on the page.
const docs = [
  {
    polymer: 'PVDF', sha256: 'a2839d65a51b6c68f8a99522d8e0f011f252793495253e7a1cb9481434503681', role: 'cited',
    row: { SourceID: 'R-ARKEMA-KYNAR-710-TDS', Publisher: 'Arkema', Title: 'TECHNICAL DATA SHEET KYNAR 710 FLUORINATED HOMOPOLYMER PELLET', Revision: 'HPP - 2026-09-29 (the date in its footer)', 'Publication date': NP,
      'Source class': 'Resin supplier data sheet', 'Source note': 'Arkema\'s own technical data sheet for KYNAR 710, a PVDF pellet for injection moulding ("KYNAR resins are fluorinated thermoplastic homopolymers"). Kept as the polymer reference of PVDF (polymers.csv): density, water absorption, glass transition and melting temperature.',
      URL: 'https://hpp.arkema.com/assets/arkema/TDS_KYNAR%C2%AE%20710_en_WW.pdf', Locator: 'p. 2: Thermal properties; Other properties', 'Applicable grades': 'Polymer reference of PVDF (polymers.csv): KYNAR 710 resin' },
    identity: { page: 1, text: 'KYNAR resins are fluorinated thermoplastic homopolymers.' },
    quotes: [
      { page: 2, text: 'Density, 23°C (73°F) 1.77 - 1.79 g/cm³ ISO 1183-1' },
      { page: 2, text: 'Water absorption, at equilibrium at 23°C (73°F) / 0.03 % ISO 62 Immersion' },
      { page: 2, text: 'Glass transition temperature, 10°C/min -40 °C ISO 11357-1/-2' },
      { page: 2, text: 'Melting temperature, 10°C/min 168 °C ISO 11357-1/-3' },
    ],
  },
  {
    polymer: 'PC', sha256: '8c17d0c63f075f568f0e290fc296a86897f2786d13250fe07c0e298ab6f567e9', role: 'cited', fetchedBy: 'opus',
    row: { SourceID: 'R-COVESTRO-MAKROLON-2405-ISO', Publisher: 'Covestro Deutschland AG', Title: 'Makrolon 2405', Revision: 'Edition 01.09.2015, ISO Datasheet', 'Publication date': '2015-09-01',
      'Source class': 'Resin supplier data sheet', 'Source note': 'Covestro\'s own ISO datasheet for Makrolon 2405, a general-purpose, low-viscosity polycarbonate (ISO 7391-PC), as okw.ch serves it. The document names its publisher "Covestro AG". Kept as the polymer reference of PC (polymers.csv): density and water absorption.',
      URL: 'https://www.okw.ch/it/PC/RW_Makrolon_2405_en.pdf', Locator: 'p. 3: Other properties (23 °C)', 'Applicable grades': 'Polymer reference of PC (polymers.csv): Makrolon 2405 resin' },
    identity: { page: 1, text: 'ISO Shortname ISO 7391-PC,MR,(,,)-18-9' },
    quotes: [
      { page: 3, text: 'C Water absorption (saturation value) Water at 23 °C % ISO 62 0.30' },
      { page: 3, text: 'C Water absorption (equilibrium value) 23 °C; 50 % r. h. % ISO 62 0.12' },
      { page: 3, text: 'C Density kg/m³ ISO 1183-1 1200' },
    ],
  },
  {
    polymer: 'ABS', sha256: '6cc90466e9e27b775eca4230ba65dfddbee24538b3204aaf9d846fcaa69ba433', role: 'cited',
    row: { SourceID: 'R-INEOS-TERLURAN-GP22-TDS', Publisher: 'INEOS Styrolution', Title: 'TERLURAN GP-22 Acrylonitrile Butadiene Styrene (ABS)', Revision: 'Revision Date: 2016.05.30', 'Publication date': '2016-05-30',
      'Source class': 'Resin supplier data sheet', 'Source note': 'INEOS Styrolution\'s own data sheet for Terluran GP-22, a general-purpose ABS injection-moulding grade, as quickparts.com serves it. Kept as the polymer reference of ABS (polymers.csv): density and water absorption.',
      URL: 'https://quickparts.com/wp-content/uploads/2023/04/Terluran-GP-22.pdf', Locator: 'p. 2: Other Properties', 'Applicable grades': 'Polymer reference of ABS (polymers.csv): Terluran GP-22 resin' },
    identity: { page: 1, text: 'Acrylonitrile Butadiene Styrene (ABS)' },
    quotes: [
      { page: 2, text: 'Density ISO 1183 kg/m³ 1040' },
      { page: 2, text: 'Water Absorption, Saturated at 23 °C ISO 62 % 1' },
      { page: 2, text: 'Moisture Absorption, Equilibrium 23 °C/50% RH ISO 62 % 0.22' },
    ],
  },
  {
    polymer: 'ASA', sha256: 'ef162a60e32571cbe91195bd07890ba6d13f89854ac0c6dce05fbd6ac98b44b8', role: 'cited',
    row: { SourceID: 'R-INEOS-LURAN-S778T-TDS', Publisher: 'INEOS Styrolution', Title: 'Luran S 778T SPF30 Black 28214 Acrylonitrile Styrene Acrylate (ASA)', Revision: 'Revision Date: 10/01/2022', 'Publication date': NP,
      'Source class': 'Resin supplier data sheet', 'Source note': 'INEOS Styrolution\'s own data sheet for a black colour (SPF30 Black 28214) of Luran S 778T, an ASA injection-moulding grade, as plasticker.de serves it. Kept as the polymer reference of ASA (polymers.csv): density and water absorption, a coloured grade\'s.',
      URL: 'https://plasticker.de/docs/recybase/35956_1752222296.pdf', Locator: 'p. 2: Other Properties', 'Applicable grades': 'Polymer reference of ASA (polymers.csv): Luran S 778T resin, black' },
    identity: { page: 1, text: 'Acrylonitrile Styrene Acrylate (ASA)' },
    quotes: [
      { page: 2, text: 'Density ISO 1183 kg/m³ 1070' },
      { page: 2, text: 'Water Absorption, Saturated at 23 °C ISO 62 % 1.65' },
      { page: 2, text: 'Moisture Absorption, Equilibrium 23 °C/50% RH ISO 62 % 0.35' },
    ],
  },
  {
    polymer: 'PC-ABS', sha256: 'f519937d614aa4ca7bb6f9852bd6ef6e8f3629890e59e4cc45d794df765d1049', role: 'cited',
    row: { SourceID: 'R-COVESTRO-BAYBLEND-T65XF-ISO', Publisher: 'Covestro Deutschland AG', Title: 'Bayblend T65 XF', Revision: 'Edition 24.02.2017, ISO Datasheet', 'Publication date': '2017-02-24',
      'Source class': 'Resin supplier data sheet', 'Source note': 'Covestro\'s own ISO datasheet for Bayblend T65 XF, a non-reinforced (PC+ABS) blend, as protolabs.com serves it. The document names its publisher "Covestro AG". Kept as the polymer reference of PC-ABS (polymers.csv): density and water absorption.',
      URL: 'https://www.protolabs.com/media/y5hnhojw/bayblend_t65_xf_iso_en.pdf', Locator: 'p. 1: Other properties', 'Applicable grades': 'Polymer reference of PC-ABS (polymers.csv): Bayblend T65 XF resin' },
    identity: { page: 1, text: 'Standard grades / Non reinforced (PC+ABS)-Blend; Vicat/B 120 temperature = 120 °C; improved flow compared with T65' },
    quotes: [
      { page: 1, text: 'C Water absorption (saturation value) Water at 23 °C % ISO 62 0.7' },
      { page: 1, text: 'C Water absorption (equilibrium value) 23 °C; 50 % r. h. % ISO 62 0.2' },
      { page: 1, text: 'C Density kg/m³ ISO 1183-1 1130' },
    ],
  },
  {
    polymer: 'PC-PBT', sha256: 'e6b6073965af4352cc3f5c40c0962619317fae248384771df91bb9f7f9984f66', role: 'cited',
    row: { SourceID: 'R-SABIC-XENOY-6620-DS', Publisher: 'SABIC Innovative Plastics', Title: 'XENOY 6620 resin Polycarbonate + PBT', Revision: 'Last Updated: 3/19/2014 (UL Prospector)', 'Publication date': NP,
      'Source class': 'Resin supplier data sheet', 'Source note': 'UL Prospector\'s technical data sheet of SABIC\'s figures for XENOY 6620, an unreinforced, impact-modified PBT+PC alloy ("acquired by UL Prospector from the producer of the material"), as protolabs.com serves it. Kept as the polymer reference of PC-PBT (polymers.csv): specific gravity and water absorption.',
      URL: 'https://www.protolabs.com/media/qcmegzd2/xenoy-6620.pdf', Locator: 'p. 1: Physical', 'Applicable grades': 'Polymer reference of PC-PBT (polymers.csv): XENOY 6620 resin' },
    identity: { page: 1, text: 'PBT+PC, Unreinforced, impact modified thermoplastic alloy. Outstanding impact at low temperature' },
    quotes: [
      { page: 1, text: 'Specific Gravity 1.20 1.20 g/cm³ ASTM D792' },
      { page: 1, text: 'Water Absorption (24 hr) 0.080 % 0.080 % ASTM D570' },
    ],
  },
  {
    polymer: 'PA6', sha256: '467952c9b6f2a78e3875e573c44caecd5213d9ef87f9255af0a0688a50a3b03e', role: 'cited',
    row: { SourceID: 'R-BASF-ULTRAMID-B27E-PI', Publisher: 'BASF', Title: 'Product Information Ultramid B27 E', Revision: 'March 2024', 'Publication date': '2024-03',
      'Source class': 'Resin supplier data sheet', 'Source note': 'BASF\'s own product information for Ultramid B27 E, a low-viscosity polyamide 6 grade for compounding and monofilaments. Kept as the polymer reference of PA6 (polymers.csv): density, melting point and water absorption.',
      URL: 'https://chemicals.basf.com/dam/jcr:0716d34e-f456-45ca-80d2-0b6beb8ffc2d/TI%20Ultramid%20B27%20E_30644930.pdf', Locator: 'p. 1: General properties', 'Applicable grades': 'Polymer reference of PA6 (polymers.csv): Ultramid B27 E resin' },
    identity: { page: 1, text: 'Ultramid B27 E is a polyamide 6 grade of low viscosity that is well suited for com-pounding and the' },
    quotes: [
      { page: 1, text: '°C 220 Melting point According to ISO 3146' },
      { page: 1, text: 'g/cm 1.12 - 1.15 Density According to ISO 1183' },
      { page: 1, text: '% 2.2 Water absorption, 23°C/50% rh' },
      { page: 1, text: '% 8.5 Water absorption, saturation in water 23°C' },
    ],
  },
  {
    polymer: 'PEBA', sha256: '13cc3363d9be17b91b2ed5656fc35ac46b1542f866814b9d78498e545c4d5157', role: 'cited',
    row: { SourceID: 'R-ARKEMA-PEBAX-5533-SP01-TDS', Publisher: 'Arkema', Title: 'TECHNICAL DATA SHEET PEBAX 5533 SP 01 POLYETHER BLOCK AMIDE PELLET', Revision: 'HPP - 2026-09-28 (the date in its footer)', 'Publication date': NP,
      'Source class': 'Resin supplier data sheet', 'Source note': 'Arkema\'s own technical data sheet for PEBAX 5533 SP 01, a heat- and UV-stabilised polyether block amide pellet. Kept as the polymer reference of PEBA (polymers.csv): density, melting temperature and water absorption.',
      URL: 'https://hpp.arkema.com/assets/arkema/TDS_PEBAX%C2%AE%205533%20SP%2001_en_WW.pdf', Locator: 'p. 2: Thermal properties; Other properties', 'Applicable grades': 'Polymer reference of PEBA (polymers.csv): PEBAX 5533 SP 01 resin' },
    identity: { page: 1, text: 'PEBAX 5533 SP 01 is a polyether block amide, a thermoplastic elastomer made of flexible polyether and rigid polyamide.' },
    quotes: [
      { page: 2, text: 'Melting temperature, 10°C/min 159 °C ISO 11357-1/-3' },
      { page: 2, text: 'Water absorption, at equilibrium at 23°C (73°F) / 0.6 % ISO 62 50%RH' },
      { page: 2, text: 'Density, 23°C (73°F) 1.01 g/cm³ ISO 1183-1' },
      { page: 2, text: 'Water absorption, at equilibrium at 23°C (73°F) / 1.2 % ISO 62 Immersion' },
    ],
  },
  {
    polymer: 'PVA', sha256: '7bddd2b304d760a49fc2134aa9f61a99b646a2c76bae46be8f4a9299a0fb08cf', role: 'cited',
    row: { SourceID: 'R-SEKISUI-SELVOL-E107-TDS', Publisher: 'Sekisui Specialty Chemicals', Title: 'SELVOL E 107 Polyvinyl Alcohol', Revision: 'Revision 6. June 2012', 'Publication date': '2012-06',
      'Source class': 'Resin supplier data sheet', 'Source note': 'Sekisui\'s own technical data for Selvol E 107, a low-viscosity, fully hydrolysed polyvinyl alcohol (98.0-98.8 mol %). Kept as the polymer reference of PVA (polymers.csv): specific gravity, glass transition and melting point.',
      URL: 'https://www.sekisui-sc.com/wp-content/uploads/SelvolEPVOH107_EN_TechData.pdf', Locator: 'p. 1: General properties', 'Applicable grades': 'Polymer reference of PVA (polymers.csv): Selvol E 107 resin' },
    identity: { page: 1, text: 'SELVOL E 107 is a low viscosity fully hydrolysed polyvinyl alcohol which finds applications principally in the' },
    quotes: [
      { page: 1, text: 'Degree of Hydrolysis Mol % 98.0 - 98.8 Titration IT 06-06-224 P' },
      { page: 1, text: 'Specific gravity', number: '1.27 - 1.31' },
      { page: 1, text: 'Glass transition temperature (ºC)', number: '85' },
      { page: 1, text: 'Melting point (ºC)', number: '230' },
    ],
  },
  {
    polymer: 'PET', sha256: 'de52cb6dfa6dd57f9cc784346ca89a7f040ab187adc8f9e1ea15f0b5ca2a0ee3', role: 'cited', fetchedBy: 'opus', issue: '18/10/2026, the day it was fetched',
    row: { SourceID: 'R-MCAM-ERTALYTE-PET-P-DS', Publisher: 'Mitsubishi Chemical Advanced Materials', Title: 'Ertalyte PET-P Polyethylene Terephthalate', Revision: 'Date of issue : 18/10/2026', 'Publication date': NP,
      'Source class': 'Manufacturer TDS', 'Source note': 'Mitsubishi Chemical Advanced Materials\' own product datasheet for Ertalyte PET-P stock shapes, "an unreinforced, semi-crystalline grade produced from our proprietary resins". Kept as the polymer reference of PET (polymers.csv): density, specific gravity, melting temperature and water absorption.',
      URL: 'https://www.mcam.com/mam/54370/GEP-Ertalyte%E2%84%A2%20PET_en_US.pdf', Locator: 'p. 1: Thermal properties; Miscellaneous', 'Applicable grades': 'Polymer reference of PET (polymers.csv): Ertalyte PET-P stock shapes' },
    identity: { page: 1, text: 'Ertalyte PET-P is an unreinforced, semi-crystalline grade produced from our proprietary resins and characterized by its excellent wear resistance,' },
    quotes: [
      { page: 1, text: 'Melting temperature (DSC, 10°C (50°F) / min) ISO 11357-1/-3 °C 245 ASTM D3418 °F 491' },
      { page: 1, text: 'Density ISO 1183-1 g/cm³ 1.39' },
      { page: 1, text: 'Specific Gravity ASTM D792 1.41' },
      { page: 1, text: 'Water absorption after 24h immersion in water of 23 °C (73°F) ISO 62 (16) % 0.07 ASTM D570 (17) % 0.07' },
      { page: 1, text: 'Water absorption at saturation in water of 23 °C (73°F) % 0.50 ASTM D570 (17) % 0.9' },
    ],
  },
  {
    polymer: 'PPS', sha256: '3cbc87998b12f7944b2662b4842864d00edde88bcf7b6d9bf7c2030c50278bca', role: 'cited', fetchedBy: 'opus', issue: '28/09/2026',
    row: { SourceID: 'R-MCAM-TECHTRON-1000-PPS-DS', Publisher: 'Mitsubishi Chemical Advanced Materials', Title: 'Techtron 1000 PPS Polyphenylene Sulfide', Revision: 'Date of issue : 28/09/2026', 'Publication date': '2026-09-28',
      'Source class': 'Manufacturer TDS', 'Source note': 'Mitsubishi Chemical Advanced Materials\' own product datasheet for Techtron 1000 PPS stock shapes, a polyphenylene sulfide that names no filler. Kept as the polymer reference of PPS (polymers.csv): density, specific gravity, melting temperature and water absorption.',
      URL: 'https://www.mcam.com/mam/54330/AEP-Techtron%E2%84%A2%201000%20PPS_en_US.pdf', Locator: 'p. 1: Thermal properties; Miscellaneous', 'Applicable grades': 'Polymer reference of PPS (polymers.csv): Techtron 1000 PPS stock shapes' },
    identity: { page: 1, text: 'Shapes made from Techtron 1000 PPS exhibit outstanding dimensional stability due to their minimal moisture absorption and low coefficient of' },
    quotes: [
      { page: 1, text: 'Melting temperature (DSC, 10°C (50°F) / min) ISO 11357-1/-3 °C 280 ASTM D3418 °F 540' },
      { page: 1, text: 'Density ISO 1183-1 g/cm³ 1.35' },
      { page: 1, text: 'Specific Gravity ASTM D792 1.35' },
      { page: 1, text: 'Water absorption after 24h immersion in water of 23 °C (73°F) ISO 62 (16) % 0.01 ASTM D570 (17) % 0.01' },
      { page: 1, text: 'Water absorption at saturation in water of 23 °C (73°F) % 0.10 ASTM D570 (17) % 0.03' },
    ],
  },
  {
    polymer: 'PP', sha256: 'dbe6c31da7d47a97e95d3ca726008627d23674b23252bac05d4d17ec4406f1b4', role: 'cited', fetchedBy: 'opus', issue: '23/06/2026',
    row: { SourceID: 'R-MCAM-PROTEUS-PP-H-DS', Publisher: 'Mitsubishi Chemical Advanced Materials', Title: 'Proteus Homopolymer PP Natural Polypropylene', Revision: 'Date of issue / revision: 23/06/2026', 'Publication date': '2026-06-23',
      'Source class': 'Manufacturer TDS', 'Source note': 'Mitsubishi Chemical Advanced Materials\' own product datasheet for Proteus Homopolymer PP Natural stock shapes. Kept as the polymer reference of PP (polymers.csv): density, specific gravity, melting temperature and water absorption.',
      URL: 'https://www.mcam.com/mam/54416/PE-Proteus%E2%84%A2%20Homopolymer%20PP%20Natural_en_US.pdf', Locator: 'p. 1: Thermal properties; Miscellaneous', 'Applicable grades': 'Polymer reference of PP (polymers.csv): Proteus Homopolymer PP stock shapes' },
    identity: { page: 1, text: 'Proteus Homopolymer PP Natural shapes are characterized by their high strength-to-weight ratio, excellent chemical and corrosion resistance' },
    quotes: [
      { page: 1, text: 'Melting temperature (DSC, 10°C (50°F) / min) ISO 11357-1/-3 °C 165 ASTM D3418 °F 327' },
      { page: 1, text: 'Density ISO 1183-1 g/cm³ 0.91' },
      { page: 1, text: 'Specific Gravity ASTM D792 0.91' },
      { page: 1, text: 'Water absorption after 24h immersion in water of 23 °C (73°F) ISO 62 (16) % <0.1 ASTM D570 (17) %' },
      { page: 1, text: 'Water absorption at saturation in water of 23 °C (73°F) % <0.1 ASTM D570 (17) %' },
    ],
  },
  {
    polymer: 'PE', sha256: 'b75083f6ff234a55c002452a3bac4b39411d66f0b5f72a47ce8d42224e07f00e', role: 'cited', fetchedBy: 'opus', issue: '23/06/2026',
    row: { SourceID: 'R-MCAM-PROTEUS-HDPE-DS', Publisher: 'Mitsubishi Chemical Advanced Materials', Title: 'Proteus HDPE High Density Polyethylene', Revision: 'Date of issue / revision: 23/06/2026', 'Publication date': '2026-06-23',
      'Source class': 'Manufacturer TDS', 'Source note': 'Mitsubishi Chemical Advanced Materials\' own product datasheet for Proteus HDPE stock shapes, a high-density polyethylene. Kept as the polymer reference of PE (polymers.csv): specific gravity and water absorption; its ISO density cell is empty.',
      URL: 'https://www.mcam.com/mam/54404/PE-Proteus%E2%84%A2%20HDPE_en_US.pdf', Locator: 'p. 1: Miscellaneous', 'Applicable grades': 'Polymer reference of PE (polymers.csv): Proteus HDPE stock shapes' },
    identity: { page: 1, text: 'High Density Polyethylene' },
    quotes: [
      { page: 1, text: 'Specific Gravity ASTM D792 0.96' },
      { page: 1, text: 'Water absorption after 24h immersion in water of 23 °C (73°F) ISO 62 (16) % <0.01 ASTM D570 (17) % <0.01' },
      { page: 1, text: 'Water absorption at saturation in water of 23 °C (73°F) % <0.01 ASTM D570 (17) % <0.01' },
    ],
  },
  {
    polymer: 'PETG', sha256: '23419ba666af13982c9dbda05561d35c12d7dd2ed6824379f3bb9eb667e78273', role: 'cited', html: true,
    row: { SourceID: 'R-EASTMAN-EASTAR-6763-TDS', Publisher: 'Eastman Chemical Company', Title: 'Technical Data Sheet Eastar copolyester 6763', Revision: NP, 'Publication date': NP,
      'Source class': 'Resin supplier data sheet', 'Source note': 'Eastman\'s own technical data sheet for Eastar copolyester 6763, a web page of its product catalogue saved as served ("Eastar 6763 is a clear, amorphous material"). Eastman publishes no PDF of it: its "Print or save as PDF" button prints the page. Kept as the polymer reference of PETG (polymers.csv): density, specific gravity, water absorption and glass transition of injection-moulded bars.',
      URL: 'https://productcatalog.eastman.com/tds/ProdDatasheet.aspx?product=71040786&pn=eastar-6763-copolyester', Locator: 'p. 1: Mechanical Properties (Injection Molded), ASTM and ISO Method; Thermal Properties', 'Applicable grades': 'Polymer reference of PETG (polymers.csv): Eastar copolyester 6763 resin' },
    identity: { page: 1, text: 'Eastar™ copolyester 6763' },
    quotes: [
      { page: 1, text: 'Specific Gravity  D 792  1.27' },
      { page: 1, text: 'Water Absorption, 24 h immersion  D 570  0.13 %' },
      { page: 1, text: 'Density  ISO 1183, Method D  1.27 g/cm 3' },
      { page: 1, text: 'Water Absorption, 24 h immersion  ISO 62  0.13 %' },
      { page: 1, text: 'Glass Transition Temperature (T g )  DSC  80 °C (176 °F)' },
    ],
    accessNote: `Fetched 2026-10-18 by Claude Sonnet (screening build, polymer sources) from this URL and saved as served. Staged by digest into the round's ledger (ingest:witness --from, ${MANIFEST}). The page carries a view state the server writes per request: a second fetch the same day by Claude Opus 5.5 hashed differently, and differed only in its __VIEWSTATE and __EVENTVALIDATION fields.`,
  },
  {
    polymer: 'PETG', sha256: 'f764fce37683ea6756fa10343af0db239278063a04727e2dff829265b880335b', role: 'corroboration', fetchedBy: 'opus',
    row: { SourceID: 'R-EASTMAN-EASTAR-6763-MBS80', Publisher: 'Eastman Chemical Company', Title: 'EASTAR Copolyester 6763 Technical Information', Revision: 'MBS-80Q 2/12', 'Publication date': NP,
      'Source class': 'Resin supplier data sheet', 'Source note': 'Eastman\'s technical information for Eastar copolyester 6763 (MBS-80Q): it says the grade "is a clear amorphous polymer" based "on poly(ethylene terephthalate)", which is what files Eastar 6763 as the amorphous PET copolyester of the PETG row. Its film density is not transcribed: its text layer drops the decimal point.',
      URL: 'https://www.eastman.com/content/dam/eastman/corporate/en/literature/m/mbs80.pdf', Locator: 'p. 3: introduction', 'Applicable grades': 'Polymer identity of PETG (polymers.csv): Eastar copolyester 6763' },
    identity: { page: 3, text: 'Eastar copolyester 6763 is a clear amorphous polymer with a' },
    quotes: [
      { page: 3, text: 'on poly(ethylene terephthalate) and has a number-average' },
    ],
  },
  {
    polymer: 'TPU', sha256: '2bcf739fd66f886571e9cba66d42eb44c568e074aecceb81bc15cddc91dd7144', role: 'cited',
    row: { SourceID: 'R-CUED-MATERIALS-DATA-BOOK-2003', Publisher: 'Cambridge University Engineering Department', Title: 'Materials Data Book', Revision: '2003 Edition', 'Publication date': '2003',
      'Source class': 'Reference or register', 'Source note': 'The Cambridge University Engineering Department\'s Materials Data Book, a teaching reference whose polymer data are Granta Design\'s: density ranges of generic polymer classes, not grades. Kept as the polymer reference of TPU (polymers.csv), and named in the Basis of PE, PET, PP, PC, POM and ABS beside their producers\' sheets.',
      URL: 'http://www-mdp.eng.cam.ac.uk/web/library/enginfo/cueddatabooks/materials.pdf', Locator: 'Section II.2, Density (PDF p. 12)', 'Applicable grades': 'Polymer reference of TPU (polymers.csv); corroborates PE, PET, PP, PC, POM and ABS' },
    identity: { page: 1, text: '2003 Edition' },
    // The density table is set sideways and its text layer runs each column together: the names are one line and the
    // numbers others. Read on the page image (PDF p. 12); here only each name and its two numbers are checked on the page.
    visual: true,
    quotes: [
      { page: 12, text: 'Polyurethane Thermoplastics (tpPU)', numbers: ['1.12', '1.24'] },
      { page: 12, text: 'Polyethylene (PE)', numbers: ['0.939', '0.96'] },
      { page: 12, text: 'PET', numbers: ['1.29', '1.4'] },
      { page: 12, text: 'Polypropylene (PP)', numbers: ['0.89', '0.91'] },
      { page: 12, text: 'Polycarbonate (PC)', numbers: ['1.14', '1.21'] },
      { page: 12, text: 'Acetal (POM)', numbers: ['1.39', '1.43'] },
      { page: 12, text: 'ABS', numbers: ['1.01', '1.21'] },
    ],
  },
];

// ---- check every quote on the cached text of its page -----------------------------------------------------------------
const pageText = (text, page) => squash((text.pages.find((p) => p.page === page)?.lines ?? []).map((l) => l.text).join(' '));
const onPage = (text, page, quote) => pageText(text, page).includes(squash(quote));
for (const d of docs) {
  const text = cachedText(d.sha256);
  if (!text) throw new Error(`${d.row.SourceID}: no cached text; stage it first (ingest:witness --from ${MANIFEST})`);
  d.pages = text.pages.length;
  if (!onPage(text, d.identity.page, d.identity.text)) throw new Error(`${d.row.SourceID}: identity line not on p. ${d.identity.page}`);
  for (const q of d.quotes) {
    if (!onPage(text, q.page, q.text)) throw new Error(`${d.row.SourceID}: "${q.text}" is not on p. ${q.page}`);
    for (const n of [q.number, ...(q.numbers ?? [])].filter(Boolean)) if (!pageText(text, q.page).includes(n)) throw new Error(`${d.row.SourceID}: ${n} is not on p. ${q.page}`);
  }
}

// ---- proposals and the packet --------------------------------------------------------------------------------------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const packetDocs = [];
for (const d of docs) {
  const url = d.row.URL;
  const accessNote = d.accessNote ?? (d.fetchedBy === 'opus' ? OPUS(url, d.issue ? MCAM_ISSUE(d.issue) : '') : SONNET(url));
  const sourceRow = { ...d.row, 'Access date': DATE, 'Citation role': d.role, 'Access state': 'retrieved', 'Access note': accessNote, SHA256: d.sha256 };
  const ordered = Object.fromEntries(['SourceID', 'Publisher', 'Title', 'Revision', 'Publication date', 'Access date', 'Source class', 'Source note', 'Citation role', 'URL', 'Locator', 'Applicable grades', 'Access state', 'Access note', 'SHA256'].map((k) => [k, sourceRow[k]]));
  const proposal = {
    version: 1, generated: { tool: 'build-b47.mjs (screening build 2026-10-18, stage 2c)', date: DATE },
    document: { sha256: d.sha256, url, pages: d.pages, provider: d.row.Publisher, manufacturer: d.row.Publisher, docKey: `${url}#witness-for=polymer:${d.polymer}` },
    identity: { polymer: d.polymer, materialId: null, note: `A reference for the polymer ${d.polymer} of polymers.csv, not a product of the catalogue: no grade, no value row. m445 sets the polymer's SourceID${d.role === 'cited' ? ' to it' : ' to another of this batch\'s documents and names it in the Basis'} and records the figures below in its Basis.` },
    source: { row: ordered, evidence: d.identity, review: { status: 'accepted', by: BY, date: DATE } },
    figures: d.quotes.map((q) => ({ page: q.page, text: q.text, ...(q.number ? { number: q.number } : {}), ...(q.numbers ? { numbers: q.numbers } : {}) })),
    grades: [], measurements: [], profiles: [], evidence: [], headlines: [], coverage: [], settings: [], acceptances: [],
    skipped: [{ note: 'Every other row of the document: a polymer reference enters for its density, its water absorption and its transitions, which the polymer\'s Basis quotes; no product of the catalogue is this grade, so no value row is written.' }],
    review: { status: 'reviewed', by: BY, date: DATE, visual: !!d.visual,
      note: `Registered as a ${d.role === 'cited' ? 'cited' : 'corroborating'} polymer reference (${d.polymer}); ${d.quotes.length} figure line(s) checked on the cached text${d.visual ? ' (the page\'s names and numbers; the table itself read on the page image)' : ''}.` },
  };
  const name = `${d.sha256.slice(0, 16)}.json`;
  const body = `${JSON.stringify(proposal, null, 2)}\n`;
  writeFileSync(join(OUT, name), body);
  packetDocs.push({ File: name, ProposalSHA256: sha(body), OriginalSHA256: d.sha256, Polymer: d.polymer, Source: ordered, Figures: proposal.figures.length });
}
const packet = {
  PacketID: 'b47-screening-build-polymer-references', Batch: 'b47', Documents: packetDocs,
  Totals: { Documents: packetDocs.length, Cited: packetDocs.filter((p) => p.Source['Citation role'] === 'cited').length, Corroboration: packetDocs.filter((p) => p.Source['Citation role'] === 'corroboration').length, NewGrades: 0, Values: 0, Profiles: 0 },
  NewVocabulary: [],
  Review: { prepared_by: BY, scope: 'polymer reference documents for polymers.csv (neat density, water absorption, PLA\'s melting point): no product, no value row' },
  NotAdmitted: [
    { Document: 'Plastics International\'s TECAPET and 1400 PET sheet (53b6eaa851c2), Laminated Plastics\' Techtron PPS sheet (10f326f33b03), Direct Plastics\' HDPE PE300 sheet (0eaf29cd284a)', Why: 'a distributor\'s own sheet, not a copy of a producer\'s; replaced by Mitsubishi Chemical Advanced Materials\' own Ertalyte PET-P, Techtron 1000 PPS and Proteus HDPE sheets.' },
    { Document: 'Mitsubishi Chemical Advanced Materials\' Proteus Euro-Gray copolymer PP sheet as Polymershapes serves it (433c165e7623)', Why: 'a coloured copolymer in a distributor\'s frame; MCAM\'s own Proteus Homopolymer PP Natural sheet replaces it.' },
    { Document: 'UL Prospector\'s Makrolon 2405 sheet as quickparts.com serves it (61f1b7a0154d)', Why: 'Covestro\'s own ISO datasheet of the grade, as okw.ch serves it, prints the same density and water figures and replaces it.' },
    { Document: 'Victrex PEEK 450G (58e9913a6cd9), Quadrant Ketron PEEK (ab06561f920d), SABIC ULTEM 1000 (bbea45fa7be0), Arkema Kepstan 6002 (b26a0778fe50)', Why: 'polymers.csv has no PEEK, PEI or PEKK row: their materials are outside the H2C\'s scope, so nothing would cite them.' },
    { Document: 'LyondellBasell Moplen HP500N product page (94887cb29d90)', Why: 'a web page whose own data sheet link reset the connection twice; PP is sourced from MCAM\'s sheet without it.' },
    { Document: 'Eastman Eastar DN011 (4c4215f7e29f) and Essentium PCTG (84bd0b9a7c88)', Why: 'no document names the polymer PCTG: DN011 says "copolyester", and Essentium is a filament maker quoting it. PCTG stays unsourced.' },
    { Document: 'Pebax 4033 SA 01 (7ffd2141a586), Selvol E 605 (8b387f4bccf1), BASF Elastollan range chart (10f4ef2b45d3)', Why: 'not needed (Pebax 5533 SP 01 and Selvol E 107 speak for their rows), or no text for its values (Elastollan).' },
  ],
};
const packetBody = `${JSON.stringify(packet, null, 2)}\n`;
writeFileSync(`${HERE}/b47-packet.json`, packetBody);
console.log(`${packetDocs.length} proposals (${packet.Totals.Cited} cited, ${packet.Totals.Corroboration} corroboration); packet sha ${sha(packetBody).slice(0, 12)}`);
try {
  writeFileSync(MIGRATION, readFileSync(MIGRATION, 'utf8').replace(/const PACKET_SHA256 = '[^']*';/, `const PACKET_SHA256 = '${sha(packetBody)}';`));
} catch { console.log(`(no ${MIGRATION} yet: pin ${sha(packetBody)} by hand)`); }
