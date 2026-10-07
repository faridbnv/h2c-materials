// The review of price batch p05 (quality round 2026-10-07, item 10): materials no Canadian, Amazon.ca maker, USD or EUR
// listing had priced, from the leads the round's web search found (web/price-leads.csv). Eight product pages were fetched
// as served on 2026-10-07 (archive/ingest-2026-09-18/prices/p05/pages.csv), each a schema.org offer:
//   - seven from filamentworld.de, a German shop whose every price says "inkl. 19 % MwSt." beside it: recorded with
//     VAT included at 19 %, the rate the page prints, which the guard reads on the page;
//   - Extrudr GREENTEC PRO CF's 800 g spool from 3DJake International, before VAT as the page says ("All prices excl.
//     VAT."): p04 left the material unpriced because 3DJake then sold only a 5 kg spool.
// Not taken (price-leads.csv): Nanovia's own shop states its prices before VAT, but its pages give one offer per product
// and the 1.75 mm 500 g price only in its variation data, which the price reader does not read; Filament2Print prints
// prices with VAT and no rate; Fabru's purefil shop prints VAT without its rate; the rest had no listing in stock.
//
//   node docs/audits/2026-10-07-quality-round/web/review-p05.mjs   writes archive/ingest-2026-09-18/prices/p05/selected.csv
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { csvText } from '../../../../build/src/csv.js';
import { batchOffers, SELECTED_HEADER, PRICES_ROOT } from '../../../../scripts/ingest/prices.mjs';
import { variantOf } from '../../2026-09-30-price-pass/review-lib.mjs';

const REVIEWER = 'Claude (claude-opus-5-5), an agent, 2026-10-07';
const WHY = 'Quality round 2026-10-07, item 10: an unpriced material\'s product, priced where the page states its tax (review-p05.mjs).';
const FW = 'filamentworld.de';
const VAT = { vat: '19', note: 'The page prints "inkl. 19 % MwSt." beside the price.' };
// [GradeID, host, title, options]
const LISTINGS = [
  ['G147-01', FW, /LUVOCOM 3F PAHT 9825 NT/, { ...VAT, maker: 'The listing names the product exactly, LUVOCOM 3F PAHT 9825 NT of LEHVOSS\'s LUVOCOM 3F line; 3D4Makers, in its title, is the label it is sold under.' }],
  ['G148-01', FW, /LUVOCOM 3F PAHT 9936 BK/, VAT],
  ['G149-02', FW, /Facilan - PCL 100/, VAT],
  ['G087-02', FW, /Tarfuse - POM/, { ...VAT, maker: 'Tarfuse is Grupa Azoty\'s filament brand, the name the grade carries.' }],
  ['G146-01', FW, /NonOilen/, VAT],
  ['G135-02', FW, /VINYL 303/, VAT],
  ['G157-01', FW, /FilaFlex Conductive/, VAT],
  ['G169-01', 'www.3djake.com', /Green-TEC PRO CF Black, 1\.75 mm \/ 800 g/, {}],
];
const offers = batchOffers('p05');
const rows = LISTINGS.map(([gradeId, host, title, opts]) => {
  const list = offers.filter((o) => o.capture.Host === host && title.test(o.title));
  if (!list.length) throw new Error(`${gradeId}: no listing ${host} ${title}`);
  const o = variantOf(list, opts);
  if (!o) throw new Error(`${gradeId}: no usable variant in ${host} "${list[0].title}"`);
  return {
    GradeID: gradeId, SHA256: o.capture.SHA256, Offer: o.key, Packaging: 'Spool', 'Mass from': 'title', 'Eligible for median': 'TRUE', 'Headline sample': 'TRUE',
    'Regular price basis': '', Notes: opts.note ?? '', Diameter: '', Maker: opts.maker ?? '', 'VAT included %': opts.vat ?? '', Status: 'accepted', Reviewer: REVIEWER, Why: WHY, _offer: o,
  };
});
mkdirSync(join(PRICES_ROOT, 'p05'), { recursive: true });
writeFileSync(join(PRICES_ROOT, 'p05', 'selected.csv'), csvText(SELECTED_HEADER, rows));
for (const r of rows) console.log(`${r.GradeID}  ${r._offer.title}  ${r._offer.price} ${r._offer.currency}  ${r._offer.available ? 'in stock' : 'out of stock'}`);
