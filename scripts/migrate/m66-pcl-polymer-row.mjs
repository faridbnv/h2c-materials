#!/usr/bin/env node
// Migration m66 (2026-09-19): polycaprolactone, read from Perstorp's own Capa documents.
//
// SUNLU publishes a PCL filament and the database could not file it: a material cannot be created for a polymer
// polymers.csv has no row for (R041). Four Perstorp documents were fetched, hashed and read for this row; three
// are cited and the range brochure corroborates them.
//
// What the row does not say is the neat density. No producer publishes a solid-state density for PCL: the only
// figure in anything that could be fetched is 1.1 g/cm³ at 60 °C, which is the melt and not ISO 1183 at 23 °C,
// and a melt density recorded as a solid one would bound every PCL product's density estimate wrongly. Not
// recorded is what CoPE and nGen already say, and a later reference can fill it in (owner ruling R052).
//
//   node scripts/migrate/m66-pcl-polymer-row.mjs

import { openTables } from '../data/table-io.mjs';

const SOURCES = [
  {
    SourceID: 'R-PERSTORP-CAPA-THERMO-PP', Publisher: 'Perstorp',
    Title: 'Properties & Processing of CAPA Thermoplastics', Revision: 'A22H-011',
    'Publication date': 'Not published', 'Access date': '2026-09-19', 'Source class': 'Resin supplier data sheet',
    'Source note': 'Perstorp datasheet for the CAPA 6000 thermoplastic series.', 'Citation role': 'cited',
    URL: 'http://www.rapstrap.com/TDS-CAPA6500.pdf',
    Locator: 'p. 1: product description; p. 2: Typical Physical Properties of CAPA Thermoplastics',
    'Applicable grades': 'Not applicable', 'Access state': 'retrieved',
    'Access note': 'Manufacturer copy not reachable; document mirrored by rapstrap.com and hashed as fetched.',
    SHA256: '41850aa330a9dfc862d3c38b9af9a3026756e5c44d0f4e8828a19ca34b4dc03b',
  },
  {
    SourceID: 'R-PERSTORP-CAPA-6800-PDS', Publisher: 'Perstorp',
    Title: 'Product data sheet Capa 6800', Revision: 'Issue 1',
    'Publication date': '2010-10-31', 'Access date': '2026-09-19', 'Source class': 'Resin supplier data sheet',
    'Source note': 'Not applicable', 'Citation role': 'cited',
    URL: 'https://www.mouser.com/datasheet/2/737/Perstorp_CAPA_6800_PDS-1915440.pdf',
    Locator: 'p. 1: Typical properties', 'Applicable grades': 'Not applicable', 'Access state': 'retrieved',
    'Access note': 'Manufacturer copy not reachable; document mirrored by Mouser Electronics and hashed as fetched.',
    SHA256: '1ad27ab2c644c8636a35c575b25e0dac1c7e6029d1283d8468d21c90b1e22f17',
  },
  {
    SourceID: 'R-PERSTORP-CAPA-6800-SDS', Publisher: 'Perstorp UK Ltd',
    Title: 'Safety data sheet according to 1907/2006/EC Article 31 - Capa 6800', Revision: 'Version 1',
    'Publication date': '2012-05-30', 'Access date': '2026-09-19', 'Source class': 'Manufacturer SDS',
    'Source note': 'Not applicable', 'Citation role': 'cited',
    URL: 'https://www.farnell.com/datasheets/1955572.pdf',
    Locator: 'p. 1: Section 1; p. 4: Section 9', 'Applicable grades': 'Not applicable', 'Access state': 'retrieved',
    'Access note': 'Manufacturer copy not reachable; document mirrored by Farnell and hashed as fetched.',
    SHA256: 'cb581be67a6c67ecfb7cbfbd7926600067e2915c065c0f0f81867cef1e4abeca',
  },
  {
    SourceID: 'R-PERSTORP-CAPA-BROCHURE', Publisher: 'Perstorp',
    Title: 'Capa for spearhead performance', Revision: 'Not published',
    'Publication date': 'Not published', 'Access date': '2026-09-19', 'Source class': 'Manufacturer product page or guide',
    'Source note': 'Range brochure for the Capa polycaprolactone line.', 'Citation role': 'corroboration',
    URL: 'http://www.chemcam.it/Capa.pdf',
    Locator: 'p. 12: Product data summary', 'Applicable grades': 'Not applicable', 'Access state': 'retrieved',
    'Access note': 'Manufacturer copy not reachable; document mirrored by chemcam.it and hashed as fetched.',
    SHA256: 'a1edc728ea195921ea49685b768527c4762616506e8bc51e5b309161e4d41ec6',
  },
];

const PCL = {
  PolymerID: 'PCL',
  Group: 'aliphatic polyester',
  Morphology: 'semicrystalline',
  'Melting point °C': '60',
  'As printed': 'crystallises while printing',
  'Water uptake': 'Not applicable',
  'Neat density min kg/m³': 'Not recorded',
  'Neat density max kg/m³': 'Not recorded',
  SourceID: 'R-PERSTORP-CAPA-THERMO-PP',
  Basis: "Perstorp Capa thermoplastic polycaprolactone, the neat homopolymer: \"Semi-Crystalline\" (Properties & Processing of CAPA Thermoplastics, p. 1), and on p. 2 a DSC melting point of 60-62 °C, 56 % crystallinity, a crystallisation temperature of 25 °C and a glass transition of -60 °C, for both CAPA 6500 and 6800. Perstorp's Capa 6800 product data sheet gives 58-60 °C and calls it a linear polyester derived from caprolactone monomer; its safety data sheet gives 58-60 °C and says it is insoluble in water. That sheet publishes a density of 1.1 g/cm³ at 60 °C only, at the melt and not to ISO 1183, so the neat density range is Not recorded (owner ruling R052). It crystallises while printing at a melting point far below every other polymer here: a PCL part deflects near 60 °C, which is what the range brochure means by staying workable by hand.",
};

const t = openTables();
let n = 0;
for (const s of SOURCES) {
  if (t.rows('sources').some((x) => x.SourceID === s.SourceID)) continue;
  t.append('sources', s);
  n++;
}
if (!t.rows('polymers').some((p) => p.PolymerID === 'PCL')) { t.append('polymers', PCL); n++; }
if (n) t.save();
console.log(`${n} record(s) written`);
