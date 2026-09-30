// The review of batch p03, tier 3 of the price pass: USD, for materials no Canadian shop and no Amazon.ca maker store
// priced. Ten USD Shopify shops were captured whole on 2026-09-30, each with its /meta.json stating USD: 3DXTECH's own,
// Spectrum's North American shop, Siraya Tech's, SUNLU's, iSANMATE's, Flashforge's, 3D Printers Depot, Printed Solid,
// and the two US retailers Fiberlogy names (Texas Filament Supply, Narrow Path 3D). match.mjs offered the candidates;
// each accepted listing below was read as the product, and review-lib.mjs picks its variant by review-p01's rule.
//
// Not taken: 3DXTECH's catalogue no longer lists 3DXSTAT ESD-PA12, ESD-TPC, ESD-PVDF, ESD-PPS, 3DXMAX PC/ASA, CarbonX
// PC/ABS or Hyperlite PP, and its ESD-TPU is the 60D, not the 90A of the sheet; SUNLU's PP is out of stock in every
// market; Fiberlogy's FiberFlex 30D and 40D and MattFlex 40D listings print no diameter, and the grades' sheets do not
// settle which the shops sell; CreatBot's listings are Ultra PA-GF and PA-CF, not Ultra PA.
//
//   node docs/audits/2026-10-01-price-pass/review-p03.mjs     writes archive/ingest-2026-09-18/prices/p03/selected.csv
import { writeSelection, TDS } from './review-lib.mjs';

const FL = 'The product\'s net mass is printed in the listing\'s description, not its title.';
const LISTINGS = [
  ['G030-01', '3dxtech.com', '7626113417269', { variant: /1\.75mm \/ 750g/ }],
  ['G030-07', 'texasfilamentsupply.com', '7223148806319', { massFrom: 'description', note: FL }],
  ['G052-01', '3dxtech.com', '14655109071211'],
  ['G052-06', 'texasfilamentsupply.com', '7446304456879', { variant: /1 KG/ }],
  ['G054-01', '3dxtech.com', null, { title: 'FIBREX™ NYLON 12+GF30', variant: /1\.75mm \/ 750g/, note: 'FibreX Nylon 12+GF30 is 3DXTECH\'s FibreX PA12 GF30.' }],
  ['G054-03', 'texasfilamentsupply.com', '6829499482287', { massFrom: 'description', note: FL }],
  ['G164-03', 'us.spectrumfilaments.com', '14740478099826'],
  ['G072-01', '3dxtech.com', '14635906662763', { variant: /1\.75mm/ }],
  ['G072-02', 'us.spectrumfilaments.com', '14740508377458'],
  ['G076-04', 'texasfilamentsupply.com', '7446296101039', { massFrom: 'description', note: FL }],
  ['G096-01', '3dxtech.com', '7626114891829', { variant: /1\.75mm/ }],
  ['G104-01', 'us.spectrumfilaments.com', '14740506935666'],
  ['G110-03', 'texasfilamentsupply.com', '7585517666479', { massFrom: 'description', note: FL }],
  ['G112-01', 'us.spectrumfilaments.com', '14740508180850'],
  ['G129-01', 'us.spectrumfilaments.com', '14740500349298'],
  ['G129-07', 'texasfilamentsupply.com', '8169713139887', { massFrom: 'description', note: FL }],
  ['G130-01', '3dxtech.com', '7626115481653'],
  ['G134-01', 'np3dp.com', '8618590109866', { massFrom: 'description', diameter: TDS('R-FIBERLOGY-FIBERLOGY-FIBERFLEX-AERO-TDS-1', 1, 'Diameter: 1.75 mm'), note: FL }],
  ['G144-03', 'texasfilamentsupply.com', '7900435710127', { massFrom: 'description', note: FL }],
  ['G151-01', 'siraya.tech', '7938530738285', { variant: /^US \//, diameter: TDS('D-SIRAYA-fibreheart-tpu-gf-filament-tds', 1, 'Diameter 1.75±0.03 mm'), note: 'The variant shipped within the US.' }],
  ['G157-01', 'np3dp.com', '8592692478122', { massFrom: 'description', note: FL }],
  ['G158-01', 'texasfilamentsupply.com', '7039241093295', { massFrom: 'description', note: FL }],
];
const rows = writeSelection('p03', LISTINGS, 'Tier 3: USD, the maker\'s shop or a US seller (review-p03.mjs).');
for (const r of rows) console.log(`${r.GradeID}  ${r._offer.capture.Host}  ${r._offer.title}  ${r._offer.price}${r._offer.compareAt ? ` (was ${r._offer.compareAt})` : ''} ${r._offer.currency}  ${r._offer.available ? 'in stock' : 'out of stock'}`);
