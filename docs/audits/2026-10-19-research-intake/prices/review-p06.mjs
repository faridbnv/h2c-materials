// The review of price batch p06 (the research intake, stage 6): the price leads of the research package of 2026-10-19
// and of the intake's price agent (Claude Sonnet), captured live on 2026-10-19 (archive/ingest-2026-09-18/prices/p06/
// pages.csv, and Spectrum's Canadian shop as a catalogue). Taken where the page's own offer states every fact:
//   - purefil's own shop (www.purefil.at), whose every page prints "Excl. VAT excl. Shipping": SAN, COC tough and flex,
//     HDPE GF20, PBT and TPV, each the product's own listing (purefil is Fabru's filament brand);
//   - MatterHackers' listing of 3DXTECH's 3DXMAX PC/ASA (USD) and Multitech 3D's of 3DXSTAT ESD-PPS (EUR, before VAT as
//     the page's offer states), both out of stock and so recorded but never sampled;
//   - Polymaker Panchroma Satin PLA on Amazon.ca, sold by Polymaker's own store, on sale below its list price.
// Not taken: Shop3D's PC GF30 (already CA0225, still out of stock in 1.75 mm); Spectrum's Canadian shop (it prices in USD,
// its /meta.json says, so PC/PTFE has no Canadian listing; the USD price is CA0329's shop's); purefil's LCP (its offer
// states no stock); Filamatrix's two nylons (each title prints two masses, 500 g and 1 kg, and the price reader reads one);
// Nanovia's pages (the 1.75 mm 500 g price is only in variation data the reader does not read); Fillamentum's AF80 (the
// page prints VAT included and no rate); 3D Prima's PA-ESD and CAD Micro's Onyx GF (no mass or diameter on the page);
// Flashforge PBAT on Amazon.ca (not sold by the maker); Extrudr Flax on 3DJake (the page gives 2500 g and 2000 g).
//
//   node docs/audits/2026-10-19-research-intake/prices/review-p06.mjs   writes archive/ingest-2026-09-18/prices/p06/selected.csv
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { csvText } from '../../../../build/src/csv.js';
import { batchOffers, SELECTED_HEADER, PRICES_ROOT } from '../../../../scripts/ingest/prices.mjs';

const REVIEWER = 'Claude (claude-opus-5-5), an agent, 2026-10-19';
const WHY = 'Research intake 2026-10-19, stage 6: a price lead of the research package, captured live and priced where the page states every fact (review-p06.mjs).';
const PUREFIL = 'www.purefil.at';
const BRAND = { maker: 'purefil is Fabru\'s filament brand, and www.purefil.at its own shop: the listing is the product the grade names.' };
// [GradeID, host, title, options]
const LISTINGS = [
  ['G136-02', PUREFIL, /^purefil SAN /, BRAND],
  ['G137-01', PUREFIL, /^purefil COC tough /, {}],
  ['G137-03', PUREFIL, /^purefil COC flex /, BRAND],
  ['G138-02', PUREFIL, /^purefil HDPE GF20 /, BRAND],
  ['G140-01', PUREFIL, /^purefil PBT /, {}],
  ['G167-13', PUREFIL, /^purefil TPV 98A /, BRAND],
  ['G119-01', 'www.matterhackers.com', /3DXMAX WHITE PC\/ASA/, {}],
  ['G124-01', 'www.multitech3d.com', /3DXSTAT ESD-PPS/, {}],
  ['G001-201', 'www.amazon.ca', /Panchroma Satin PLA/, {}],
];
const offers = batchOffers('p06');
const rows = LISTINGS.map(([gradeId, host, title, opts]) => {
  const list = offers.filter((o) => o.capture.Host === host && title.test(o.title));
  if (list.length !== 1) throw new Error(`${gradeId}: ${list.length} listings ${host} ${title}`);
  const o = list[0];
  return {
    GradeID: gradeId, SHA256: o.capture.SHA256, Offer: o.key, Packaging: /refill/i.test(o.title) ? 'Refill' : 'Spool', 'Mass from': 'title', 'Eligible for median': 'TRUE', 'Headline sample': 'TRUE',
    'Regular price basis': '', Notes: opts.note ?? '', Diameter: '', Maker: opts.maker ?? '', 'VAT included %': '', Status: 'accepted', Reviewer: REVIEWER, Why: WHY, _offer: o,
  };
});
mkdirSync(join(PRICES_ROOT, 'p06'), { recursive: true });
writeFileSync(join(PRICES_ROOT, 'p06', 'selected.csv'), csvText(SELECTED_HEADER, rows));
for (const r of rows) console.log(`${r.GradeID}  ${r._offer.title}  ${r._offer.price} ${r._offer.currency}  ${r._offer.available ? 'in stock' : 'out of stock'}`);
