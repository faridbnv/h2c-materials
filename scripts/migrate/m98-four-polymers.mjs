#!/usr/bin/env node
// Migration m98 (2026-09-21): four polymers the corpus publishes filaments of, each read from a producer.
//
// R081 named PA11 and SEBS (PCL's row was written under R052); R082 said a sheet that names two polymers is a
// material named for the blend, with a polymers.csv row of its own as PC-ABS has. Every figure below was read from
// the producer's own document, fetched and hashed for the purpose, and checked on its page before it was written
// (D35). The rows are what the reader needs before it can file Prusament PA11, Filaflex SEBS, colorFabb's PLA/PHA
// and Fillamentum's NonOilen anywhere: a material is identified by a row of polymers.csv, and there was none.
// The two blends are two rows, not one: colorFabb's deflects at 51 C and Fillamentum's PLA/PHB at 119 C as
// printed, and one row would have to be amorphous and crystallising at once (R082).
//
//   node scripts/migrate/m98-four-polymers.mjs

import { openTables } from '../data/table-io.mjs';

const source = (SourceID, Publisher, Title, Revision, published, klass, note, role, URL, Locator, access, SHA256) => ({
  SourceID, Publisher, Title, Revision, 'Publication date': published, 'Access date': '2026-09-21',
  'Source class': klass, 'Source note': note, 'Citation role': role, URL, Locator,
  'Applicable grades': 'Not applicable', 'Access state': 'retrieved', 'Access note': access, SHA256,
});

const MIRROR = (who) => `Manufacturer copy not reachable; document mirrored by ${who} and hashed as fetched.`;

const SOURCES = [
  source('R-ARKEMA-RILSAN-BESNO-TL-TDS', 'Arkema', 'TECHNICAL DATA SHEET RILSAN BESNO TL - Polyamide 11 pellet', 'Not published',
    'Not published', 'Resin supplier data sheet',
    "Arkema's own sheet for an unfilled, heat- and light-stabilised polyamide 11 extrusion grade (ISO 16396 - PA11, EG1HL, C22-010).",
    'cited', 'https://hpp.arkema.com/assets/arkema/TDS_RILSAN%C2%AE%20BESNO%20TL_en_WW.pdf',
    'p. 2: Physical properties (density), Thermal properties (melting temperature)', 'Not applicable',
    '3b3b8a1d65e2a7da5ccf444281048a82162bef9163f6cf2043c7b13892190ede'),
  source('R-ARKEMA-RILSAN-PA11-ES-NAT-MAC-TDS', 'Arkema', 'TECHNICAL DATA SHEET RILSAN PA11 ES NAT MAC - Polyamide 11 powder', 'Not published',
    'Not published', 'Resin supplier data sheet',
    'The powder grade: its coating density to ISO 1183-1 is the density of the solid polymer, and the upper end of the range.',
    'corroboration', 'https://hpp.arkema.com/assets/arkema/TDS_RILSAN%C2%AE%20PA11%20ES%20NAT%20MAC_en_WW.pdf',
    'p. 2: Physical properties', 'Not applicable', '554d73bcae20c783865551ca3fc96a706ab49b351e62b4bd485ed2640cc8cbeb'),
  source('R-ARKEMA-RILSAN-PA11-BROCHURE', 'Arkema', 'Rilsan polyamide 11 - A proven legacy, an exciting future', 'Not published',
    'Not published', 'Manufacturer product page or guide',
    "Arkema's range brochure: that PA11 is semi-crystalline, its melting range by grade, its glass transition, and its moisture pick-up against the other polyamides.",
    'corroboration', 'https://www.formerra.com/sites/default/files/2021-07/rilsan-pa11-brochure.pdf',
    'p. 3: Moisture pick-up; p. 4: Thermal properties', MIRROR('formerra.com'),
    '546cc833541b07045749a3c27722add75350b5306d077aa61e57253822ca3048'),
  source('R-KRATON-G1650M-TDS', 'Kraton Corporation', 'KRATON G1650 M Polymer - technical data sheet K0656', 'K0656 North America 8/18/2023',
    '2023-08-18', 'Resin supplier data sheet',
    "Kraton's own sheet for a clear linear styrene-ethylene/butylene-styrene triblock with 30 % polystyrene: the neat polymer a filament compound starts from.",
    'cited', 'https://sds.kraton.com/product-sds/shared-files/94422/KratonG1650M.pdf', 'p. 1: Typical properties',
    'Not applicable', 'cd93da5b92f96c1f817f20c46983540f9f6d218427cbcbf0bb38444eae6e9958'),
  source('R-KRATON-POLYMER-PRODUCT-GUIDE', 'Kraton Corporation', 'Kraton Polymers Product Guide', '24-09', '2024-09',
    'Manufacturer product page or guide',
    "Kraton's range guide; p. 14 lists its seven SEBS grades, G1633 to G1657, with their specific gravities, which is the range.",
    'corroboration', 'https://kraton.com/wp-content/uploads/2024/10/polymer-product-guide-kraton-24-09-al-web.pdf',
    'p. 14: Kraton G SEBS polymer grades', 'Not applicable', 'eb41fa89e79c5170d768e370d62c84a05995aa388f9a02ea8ed75fcffe975749'),
  source('R-COLORFABB-PLA-PHA-PAGE', 'colorFabb', 'PLA/PHA Filaments - Tougher, High-Quality PLA Blend', 'Not published', 'Not published',
    'Manufacturer product page or guide',
    "The blend's own producer's page for the family: a PLA blend, 100 % biobased, less brittle than PLA. The numbers are on its data sheet, which enters with batch b25 and is named in the row's basis by its digest.",
    'cited', 'https://colorfabb.com/filaments/materials/pla-filaments/pla-pha', 'Product family page', 'Not applicable',
    'bbfa39635a9863ac150e130031442afc2d1b8ca7b5b917d6a7ea311783226ccd'),
  source('R-PANARA-NONOILEN-TF-3066-8-TDS', 'PANARA a.s.', 'NonOilen TF 3066-8 - technical data sheet', 'Not published', 'Not published',
    'Resin supplier data sheet',
    "The compounder's own sheet for a NonOilen grade (sheet extrusion for thermoforming): the blend's density, DSC melting point, crystallisation temperature and HDT-B. Panara a.s. develops and produces NonOilen; Fillamentum extrudes the filament of it.",
    'cited', 'https://www.panara.sk/wp-content/uploads/2024/12/TDS-NonOilen%C2%AE-TF-3066-8.pdf', 'p. 1: Material properties; p. 2: thermal properties',
    'Not applicable', '489bc7bd937139c811fb120e7a34524926534152858139724fb55c641fa8dd25'),
  source('R-FILLAMENTUM-NONOILEN-ADDITIONAL', 'Fillamentum', 'NONOILEN - Additional information', 'Not published', 'Not published',
    'Manufacturer product page or guide',
    "The filament maker's information sheet: a polylactic acid and polyhydroxy butyrate blend (PLA/PHB), the PHB raising toughness and temperature resistance over PLA.",
    'corroboration', 'https://fillamentum.com/wp-content/uploads/2024/10/NONOILEN_ADDITIONAL_FILE.pdf', 'p. 1: Basic overview, Why choose NonOilen',
    'Not applicable', '54846f04e467ac7fd015c2ae5e43be93fc9655cd6e8abacfd53f6361e2e2ca78'),
  source('R-FILLAMENTUM-NONOILEN-PAGE', 'Fillamentum', 'Nonoilen | Fillamentum', 'Not published', 'Not published',
    'Manufacturer product page or guide',
    "The maker's collection page, whose comparison table gives the polymer base of each of its biodegradable filaments: for NonOilen, a polylactic acid and polyhydroxy butyrate blend.",
    'corroboration', 'https://fillamentum.com/collections/nonoilen-filament/', 'Comparison of our biodegradable filaments', 'Not applicable',
    '30ddc59e93aaa2f8bf643a523536c996a0e7a6c342cae86233a0cd99ef425f7a'),
];

const polymer = (PolymerID, Group, Morphology, tm, printed, water, lo, hi, SourceID, Basis) => ({
  PolymerID, Group, Morphology, 'Melting point °C': tm, 'As printed': printed, 'Water uptake': water,
  'Neat density min kg/m³': lo, 'Neat density max kg/m³': hi, SourceID, Basis,
});

const POLYMERS = [
  polymer('PA11', 'aliphatic polyamide', 'semicrystalline', '186', 'crystallises while printing', 'low', '1020', '1040',
    'R-ARKEMA-RILSAN-BESNO-TL-TDS',
    "Arkema Rilsan BESNO TL, an unfilled heat- and light-stabilised polyamide 11 extrusion grade (ISO 16396 - PA11, EG1HL, C22-010): density 1.02 g/cm3 at 23 C to ISO 1183-1 and a melting temperature of 186 C by DSC to ISO 11357-1/-3 (technical data sheet, p. 2); Rilsan BESNO MED, the medical tube grade, prints the same two figures. The powder grade PA11 ES NAT MAC gives a coating density of 1.04 g/cm3 to ISO 1183-1, the upper end. Arkema's Rilsan PA11 brochure says it is a semi-crystalline polymer with a melting range of 180 to 189 C depending on the grade and a glass transition at about 45 C (p. 4), and that among all performance polyamides it has very low moisture pick-up (p. 3), which is what the water uptake column records as low, as PA12's does. It crystallises in a print as the other aliphatic polyamides here do."),
  polymer('SEBS', 'elastomer', 'elastomer', 'Not applicable', 'Not applicable', 'Not applicable', '900', '910',
    'R-KRATON-G1650M-TDS',
    "Kraton G1650 M, a clear linear styrene-ethylene/butylene-styrene triblock copolymer with a polystyrene content of 30 %: specific gravity 0.91 to ASTM D4025, Shore A 72 at 10 s, melt index 1 g/10 min at 230 C / 5 kg (technical data sheet K0656, p. 1). Kraton's product guide lists its seven SEBS grades, G1633 to G1657, at a specific gravity of 0.90 to 0.91 (p. 14), which is the range. A styrenic block copolymer is an elastomer with glassy polystyrene domains in a rubbery midblock: no melting point, nothing crystallises on printing, and water uptake is Not applicable as it is for TPE and TPU. A filament of it is a compound (oil, a polyolefin, a filler), and one denser than the neat polymer declares its load as a Variant (R078)."),
  polymer('PLA-PHA', 'polylactide', 'amorphous', 'Not applicable', 'Not applicable', 'Not applicable', '1200', '1240',
    'R-COLORFABB-PLA-PHA-PAGE',
    "colorFabb's own blend of polylactide with a polyhydroxyalkanoate, which it compounds and is the only producer of: \"Colorfabb developed its own unique PLA blend for 3D printing, namely PLA/PHA. The added PHA makes our grade of PLA tougher and less brittle than generic PLA grades\" (its data sheet, SHA-256 d92bf0040ab5..., p. 1), and its family page says the same in three words: 100 % biobased, less brittle than PLA. That sheet gives a density of 1.24 g/cm3 (ISO 1183) and a melting temperature above 155 C (ISO 3146-C); the later revision (SHA-256 d9edb7dbfbf7...) gives 1.2 g/cm3, a melting temperature above 155 C by DSC to ISO 11357, a glass transition it prints as N/A and an HDT-B of 51 C. Both sheets enter with batch b25 as cited sources of their grades. A PLA-dominant blend prints amorphous as PLA does here - its HDT-B sits a hundred degrees below its melting point - so the melting point column is Not applicable, as PLA's and PC-ABS's are. R082: a blend is identified by its own name, and this row is that name."),
  polymer('PLA-PHB', 'polylactide', 'semicrystalline', '184', 'crystallises while printing', 'low', '1200', '1200',
    'R-PANARA-NONOILEN-TF-3066-8-TDS',
    "NonOilen, the polylactic acid / polyhydroxybutyrate blend Panara a.s. compounds and Fillamentum extrudes: \"thermoplastic material based on biodegradable polymer blends made of 100% renewable raw materials\" (Panara TF 3066-8 sheet, p. 1), and \"made of polylactic acid and polyhydroxy butyrate blend (PLA/PHB)\" with the PHB raising toughness and temperature resistance over PLA (Fillamentum's information sheet, p. 1). Panara's sheet for its TF 3066-8 grade gives a density of 1.2 g/cm3 at 23 C to ISO 1183, a melting point of 184 C by DSC, a crystallisation temperature of 110 C and an HDT-B of 107 C (pp. 1-2); the filament's own sheet (SHA-256 03d0c0a5dd7e..., entering with batch b25) gives 1.20 g/cm3 to ISO 1183, a heat distortion temperature of 119 C at 0.45 MPa and a Vicat of 150 C as printed, \"no need for annealing\". A blend that crystallises at 110 C on cooling and deflects at 119 C without annealing has crystallised in the print, which is what the PHB is there for: semicrystalline, crystallises while printing. The density has no width because both producers publish one figure. Water uptake is low, as PLA's compounds are. R082 named NonOilen with colorFabb's PLA/PHA, and they are two rows: colorFabb's deflects at 51 C and this at 119 C, and one row cannot be amorphous and crystallising at once."),
];

const t = openTables();
let n = 0;
for (const s of SOURCES) {
  if (t.rows('sources').some((x) => x.SourceID === s.SourceID)) continue;
  t.append('sources', s);
  n++;
}
for (const p of POLYMERS) {
  if (t.rows('polymers').some((x) => x.PolymerID === p.PolymerID)) continue;
  t.append('polymers', p);
  n++;
}
if (n) t.save();
console.log(`${n} record(s) written`);
