#!/usr/bin/env node
// Migration m70 (2026-09-19): six polymers the corpus publishes filaments of, each read from a resin producer.
//
// Eight polymers had no row and so no material could be created for them. Six enter here. Every figure was read
// from the producer's own document, fetched and hashed for the purpose, and checked on its page before it was
// written (D35).
//
// Two do not enter, on the owner's rulings:
//
//   PHA is not one polymer. CJ Biomaterials publishes an amorphous grade with no melting point at all (PHACT
//   A1000P, Tg -17 °C) and a semi-crystalline one melting at 150-170 °C (PHACT S1000P), and Kaneka's brochure
//   says the values depend significantly on the grade. One row would have to be amorphous and semicrystalline at
//   once, so the six PHA products wait until a sheet says which class its product is (R055).
//
//   TPS in this corpus is not thermoplastic starch. BASF's Ultrafuse TPS 90A says "Styrene-Ethylene-Butadiene-
//   Styrene (SEBS) based filament" and purefil heads its sheet "Thermoplastic styrene block copolymer elastomer
//   (TPS)", which is the ISO 18064 code for a styrenic thermoplastic elastomer. Both products file under the TPE
//   row that already exists, and a TPS row would differ from it in nothing the schema can express (R056).
//
// PVC's neat density is Not recorded, as PCL's is: PVC is sold as a powder, so its producers publish an apparent
// bulk density (Vynova S5702, 570 kg/m³; OxyChem's Vinyl Handbook has only ABD) and two safety sheets say the
// density is not determined. The one figure found, a specific gravity of 1.4 with no test method, is not a
// density range. purefil's only PVC product is plasticised and sits below any neat value, which is what the new
// grade variant is for (R057).
//
//   node scripts/migrate/m70-six-polymers.mjs

import { readCsv, csvText } from '../../build/src/csv.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';

const source = (SourceID, Publisher, Title, Revision, published, klass, note, role, URL, Locator, access, SHA256) => ({
  SourceID, Publisher, Title, Revision, 'Publication date': published, 'Access date': '2026-09-19',
  'Source class': klass, 'Source note': note, 'Citation role': role, URL, Locator,
  'Applicable grades': 'Not applicable', 'Access state': 'retrieved', 'Access note': access, SHA256,
});

const MIRROR = (who) => `Manufacturer copy not reachable; document mirrored by ${who} and hashed as fetched.`;

const SOURCES = [
  source('R-TRINSEO-TYRIL-790-TI', 'Trinseo', 'Technical Information TYRIL 790 SAN Resin', 'Form No. 500-00031941en',
    'Not published', 'Resin supplier data sheet', "Trinseo's own technical information for an unfilled general-purpose SAN resin.",
    'cited', 'https://alpha-plast.com.ua/wp-content/docs/Trinseo-Styron/TDS_Tyril%20790.pdf', 'p. 1: Physical / Thermal',
    MIRROR('alpha-plast.com.ua'), 'ebfe1ec3e1d0ba5b723908ec1a5ff55ad54527d56216a680c2b3fa4773fc13c5'),
  source('R-TOPAS-COC-BROCHURE', 'TOPAS Advanced Polymers GmbH', 'TOPAS COC Cyclic Olefin Copolymer', 'Not published',
    '2019-09', 'Manufacturer product page or guide', "TOPAS's range brochure: that COC is amorphous, and the density of its basic grades.",
    'cited', 'https://topas.com/wp-content/uploads/2023/05/TOPAS_Product-Brochure.pdf',
    'p. 4: introduction; p. 7: Table 1 Physical properties', 'Not applicable',
    'f60c785c6629ce832a2e40d1ebe0f60724ec694f4e232e506d1a82c6de64c884'),
  source('R-TOPAS-8007S04-TDS', 'TOPAS Advanced Polymers GmbH', 'TECHNICAL DATA SHEET TOPAS 8007S-04 Cyclic Olefin Copolymer (COC)',
    'Rev.: 01.07.2019', 'Not published', 'Resin supplier data sheet',
    'An unfilled injection-moulding grade: 1010 kg/m³ to ISO 1183 and 0.01 % water at saturation, which is the low end of the range and the reason the row records no water uptake.',
    'corroboration', 'https://topas.com/wp-content/uploads/2023/05/TDS_8007S_04_e.pdf', 'p. 1: Physical Properties',
    'Not applicable', 'd889dd84b1c70dd8b6929a983c2932c7e3b0f1b5ecbac163bc870d7ddce5881d'),
  source('R-BASF-ULTRADUR-B4500-PI', 'BASF SE', 'Product Information Ultradur B 4500', '02/2026', 'Not published',
    'Resin supplier data sheet', "BASF's own product information for the unreinforced, uncoloured PBT grade.", 'cited',
    'https://download.basf.com/p1/8a8081c57fd4b609017fd66449853d71/en/ULTRADUR%C2%AE_B4500', 'p. 2: property table',
    'Not applicable', '13b47eeed941ea4a960b93608df75f09fcf180d2e0513baf98f13008b4719194'),
  source('R-CELANESE-VECTRA-LCP-GUIDE', 'Celanese', 'Vectra liquid crystal polymers (LCP) - short term properties guide',
    'VC-4R3_LCP-019', '2013-09-19', 'Resin supplier data sheet',
    "Celanese's own grade guide; A950 and V400P are its two unfilled grades and every other grade in it is filled.",
    'cited', 'https://www.celanese.com/-/media/Engineered%20Materials/Files/Product%20Technical%20Guides/LCP-026_VectraLCPShortTermPropGuideTG_AM_0613.pdf',
    'p. 6: property labels; p. 11: extrudable grades A950 and V400P',
    "The file is served under the name LCP-026; the document's own printed code is VC-4R3_LCP-019, recorded as its revision.",
    'ece5f2704e4f85161b9e08142d33633d1730337d92019b88e1413059e053305f'),
  source('R-BASF-ECOFLEX-C1200-PI', 'BASF SE', 'ecoflex F Blend C1200 - Certified compostable polyester for compostable film',
    'Version 3.0', '2025-11', 'Resin supplier data sheet', "BASF's own product information for the unfilled PBAT resin.",
    'cited', 'https://download.basf.com/p1/8a8082587fd4b608017fd63230bf39c4/en/ecoflex%3Csup%3E%C2%AE%3Csup%3E_F_Blend_C1200_Product_Data_Sheet_English.pdf',
    'p. 1: Product description; p. 3: Typical basic material properties', 'Not applicable',
    'ba9199bcb77b71f3438d7cf22214ec3f216bbfddd0a19c64a21655661a3f68e7'),
  source('R-SCG-PVC-RESIN-SDS', 'Thai Plastic and Chemicals Public Company Limited', 'SAFETY DATA SHEET SCGC PVC - PVC Resin',
    'Rev.9', '2023-02-13', 'Manufacturer SDS',
    'The only producer document found that states a specific gravity for PVC; it names no test method, which is why the row records no density.',
    'cited', 'https://www.scgchemicals.com/uploads/Safety_Data_Sheet_of_PVC_Resin_RY-S-QA-T003_09_(EN)2.pdf', 'p. 4: Section 9',
    'Not applicable', '1d3c74f255e847fc0fa34b2dcc6594fcf3b994d94a89dcb869a9a83fb9324ed3'),
];

const polymer = (PolymerID, Group, Morphology, tm, printed, water, lo, hi, SourceID, Basis) => ({
  PolymerID, Group, Morphology, 'Melting point °C': tm, 'As printed': printed, 'Water uptake': water,
  'Neat density min kg/m³': lo, 'Neat density max kg/m³': hi, SourceID, Basis,
});

const POLYMERS = [
  polymer('SAN', 'styrenic', 'amorphous', 'Not applicable', 'Not applicable', 'Not applicable', '1080', '1080',
    'R-TRINSEO-TYRIL-790-TI',
    "Trinseo TYRIL 790, an unfilled general-purpose styrene-acrylonitrile resin: density 1.08 g/cm3 (Technical Information, p. 1), against an apparent density of 0.69 for the pellets. The range has no width because every producer grade found publishes the same figure; INEOS Styrolution's Luran 368R and its ten-grade Lustran guide all give 1.08 g/cm3 to ISO 1183. SAN is amorphous and has no melting point."),
  polymer('COC', 'cyclic polyolefin', 'amorphous', 'Not applicable', 'Not applicable', 'Not applicable', '1010', '1020',
    'R-TOPAS-COC-BROCHURE',
    "TOPAS cyclic olefin copolymer: \"Because of its amorphous character\" (product brochure, p. 6), with every basic grade at 1.02 g/cm3 to ISO 1183 (p. 7). TOPAS 8007S-04, an unfilled injection-moulding grade, gives the low end at 1010 kg/m3 and 0.01 % water at saturation to ISO 62, which is why the row records no water uptake. An amorphous polymer has no melting point."),
  polymer('PBT', 'aromatic polyester', 'semicrystalline', '223', 'crystallises while printing', 'Not applicable', '1300', '1310',
    'R-BASF-ULTRADUR-B4500-PI',
    "BASF Ultradur B 4500, the unreinforced uncoloured polybutylene terephthalate: density 1300 kg/m3 (ISO 1183), melting temperature 223 C by DSC (ISO 11357-1/-3) and an equilibrium water uptake of 0.5 % at 23 C (Product Information 02/2026, p. 2). Celanese's Crastin FG6130 agrees at 1300 kg/m3 and 225 C. It crystallises fast enough that a printed part's heat resistance follows its melting point, as the other semicrystalline polyesters here do; 0.5 % is not the uptake that moves a polyamide's modulus, so the row records none."),
  polymer('LCP', 'liquid crystal polyester', 'semicrystalline', '280', 'crystallises, not driven by its melting point',
    'Not applicable', '1400', '1400', 'R-CELANESE-VECTRA-LCP-GUIDE',
    "Celanese Vectra liquid crystal polymer: a melting point of 280 C to ISO 11357 and a density of 1.40 g/cm3 for A950 and V400P, its two unfilled extrudable grades (short term properties guide, pp. 6 and 11). Its order is nematic rather than lamellar, which none of this database's three morphologies names exactly; semicrystalline is the closest, and what follows from it - that a printed part's heat resistance is not set by the melting point - is stated in the column beside it, as it is for PPS (D56)."),
  polymer('PBAT', 'aliphatic-aromatic copolyester', 'semicrystalline', '115', 'crystallises while printing', 'Not applicable',
    '1250', '1270', 'R-BASF-ECOFLEX-C1200-PI',
    "BASF ecoflex F Blend C1200, an unfilled polybutylene adipate terephthalate: \"biodegradable, statistical, aliphatic-aromatic copolyester\" with a mass density of 1.25 to 1.27 g/cm3 (ISO 1183), a DSC melting point of 110 to 120 C and a Vicat A/50 of 91 C (Product Information Version 3.0, pp. 1 and 3). The melting point recorded is the midpoint of the published range."),
  polymer('PVC', 'vinyl chloride', 'amorphous', 'Not applicable', 'Not applicable', 'Not applicable',
    'Not recorded', 'Not recorded', 'R-SCG-PVC-RESIN-SDS',
    "Polyvinyl chloride is sold as a powder, and its producers publish what a powder has: Vynova's S5702 sheet gives a bulk density of 570 kg/m3 and no polymer density, and OxyChem's own Vinyl Handbook covers apparent bulk density only. The one figure found in a producer document is a specific gravity of 1.4 in SCGC's safety data sheet (Section 9), with no test method beside it, which is not a density range this database would bound an estimate with. Both columns therefore say Not recorded, as PCL's do (R052, R057). Unplasticised PVC is amorphous and has no melting point; a plasticised compound says so on its grade."),
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

// A plasticiser lowers a vinyl's density and its modulus together, which no existing variant describes.
const variants = join(projectRoot, 'schema/vocab/grade-variants.csv');
const rows = readCsv(variants).records.map((r) => r.values);
const head = Object.keys(rows[0]);
if (!rows.some((r) => r.Value === 'plasticised')) {
  rows.push({ Value: 'plasticised', Meaning: 'A declared plasticiser lowers the density, the modulus and the softening point well below the neat polymer\'s; a plasticised PVC is a different material from the rigid one and its published values are its own.' });
  rows.sort((a, b) => a.Value.localeCompare(b.Value));
  writeFileSync(variants, csvText(head, rows));
  console.log('schema/vocab/grade-variants.csv + plasticised');
}
console.log(`${n} record(s) written`);
