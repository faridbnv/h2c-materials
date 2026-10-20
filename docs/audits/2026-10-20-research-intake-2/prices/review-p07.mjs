// The review of price batch p07 (research intake 2, stage 6): the price leads of the second research package and of the
// round's price agent (Claude Sonnet, prices/leads.csv), captured live on 2026-10-20 (archive/ingest-2026-09-18/prices/p07/
// pages.csv). Taken where the page's own offer states every fact:
//   - QIDI's own Canadian store prices PPS-GF20 in CAD, 750 g, in stock; the page heads it "QIDI TECH PPS-GF20 Filament
//     1.75mm", the one diameter QIDI sells it in;
//   - purefil's own shop (www.purefil.at) prices PC GF10 before VAT, 1 kg, 1.75 mm, in stock (purefil is Fabru's brand).
// Not taken: Filamatrix Nylon Glass Fiber (its offer's title prints two masses, "500g & 1kg", and the variant's own title
// is not in the offer the price reader reads, as in p06); Kexcelled THE K8 OBC (its maker's shop shows no price on any
// variant, and no retailer lists it); Filamentive Hemp PLA and Forward AM Ultrafuse PP GF30 (only UK shops in GBP, a
// currency fx_rates.csv holds no Bank of Canada rate for, and the PP GF30 listing is 700 g against the sheet's spools);
// Sakata PA-NT and PA-CF15 (HTA3D is a Spanish shop whose page prints no VAT rate, and PA-CF15's markdown from 99.95 to
// 55.00 EUR needs a regular price a reviewer can trust). Nanovia's and colorFabb's leads stay where p06 left them.
//
//   node docs/audits/2026-10-20-research-intake-2/prices/review-p07.mjs   writes archive/ingest-2026-09-18/prices/p07/selected.csv
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { csvText } from '../../../../build/src/csv.js';
import { batchOffers, SELECTED_HEADER, PRICES_ROOT } from '../../../../scripts/ingest/prices.mjs';

const REVIEWER = 'Claude (claude-opus-5-5), an agent, 2026-10-20';
const WHY = 'Research intake 2, stage 6: a price lead of the second research package or the round\'s price agent, captured live and priced where the page states every fact (review-p07.mjs).';
// [GradeID, host, title, options]
const LISTINGS = [
  ['G074-03', 'ca.qidi3d.com', /^PPS-GF20 \/ 750g/, { diameter: '1.75 mm only: the page heads the product "QIDI TECH PPS-GF20 Filament 1.75mm", and QIDI sells it in no other diameter.', maker: 'The vendor is QIDI\'s own Canadian store (ca.qidi3d.com), which sells QIDI\'s own filament.' }],
  ['G038-03', 'www.purefil.at', /^purefil PC GF10 /, { maker: 'purefil is Fabru\'s filament brand, and www.purefil.at its own shop: the listing is the product the grade names.' }],
];
const offers = batchOffers('p07');
const rows = LISTINGS.map(([gradeId, host, title, opts]) => {
  const list = offers.filter((o) => o.capture.Host === host && title.test(o.title));
  if (list.length !== 1) throw new Error(`${gradeId}: ${list.length} listings ${host} ${title}`);
  const o = list[0];
  return {
    GradeID: gradeId, SHA256: o.capture.SHA256, Offer: o.key, Packaging: 'Spool', 'Mass from': 'title', 'Eligible for median': 'TRUE', 'Headline sample': 'TRUE',
    'Regular price basis': '', Notes: opts.note ?? '', Diameter: opts.diameter ?? '', Maker: opts.maker ?? '', 'VAT included %': '', Status: 'accepted', Reviewer: REVIEWER, Why: WHY, _offer: o,
  };
});
mkdirSync(join(PRICES_ROOT, 'p07'), { recursive: true });
writeFileSync(join(PRICES_ROOT, 'p07', 'selected.csv'), csvText(SELECTED_HEADER, rows));
for (const r of rows) console.log(`${r.GradeID}  ${r._offer.title}  ${r._offer.price} ${r._offer.currency}  ${r._offer.available ? 'in stock' : 'out of stock'}`);
