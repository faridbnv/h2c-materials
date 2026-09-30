// The review of batch p04, tier 4 of the price pass: EUR, for materials no Canadian shop, no Amazon.ca maker store and
// no USD shop priced. The one European seller used is 3DJake International (niceshops, Austria), which carries most of
// the European makers left and shows a visitor outside the EU its prices before VAT, saying so on every page ("All prices
// excl. VAT."): each price is recorded as before VAT on that statement, which the guard reads on the page. Thirty
// product pages were fetched as served on 2026-09-30; the reader takes each page's schema.org offer, its reduced and
// replaced prices where it is on sale ("p-price__reduced", "p-price__instead"), and its "Content" line for the net mass.
//
// Not taken: Extrudr Flax (its title prints 1100 g, its properties 1.000 g and a price per kg at 1 kg: two net masses);
// Extrudr Green-TEC (a 2.5 kg spool) and Green-TEC PRO CF (5 kg, on sale): bulk, which the method keeps out; Spectrum
// GreenyHT, whose identity the gap-fill tranche held. Fabru and purefil, LEHVOSS, Grupa Azoty, Kimya, BASF Forward AM,
// Nanovia, Fillamentum's Vinyl, NonOilen, Nylon AF80 and OBC, and 3DXTECH's discontinued products are not sold there;
// their shops either print VAT without its rate or no public price.
//
//   node docs/audits/2026-09-30-price-pass/review-p04.mjs     writes archive/ingest-2026-09-18/prices/p04/selected.csv
import { writeSelection } from './review-lib.mjs';
import { batchOffers } from '../../../scripts/ingest/prices.mjs';

const H = 'www.3djake.com';
const PROGRAFEN = 'Prografen is 3DJake\'s own brand of graphene filament; the grade\'s maker is recorded as 3DJake.';
const CONTENT = 'The net mass is the page\'s "Content" line; its title prints none.';
// [GradeID, path, options]
const PAGES = [
  ['G046-05', '/formfutura/flexifil-tpc-30d-black'],
  ['G046-06', '/formfutura/flexifil-tpc-40d-black'],
  ['G167-03', '/fiberlogy/fiberflex-30d-black'],
  ['G082-10', '/fiberlogy/pp-black'],
  ['G082-11', '/formfutura/centaur-pp-black', { massFrom: 'description', note: CONTENT }],
  ['G082-03', '/spectrum/pp-black-1'],
  ['G084-02', '/prusa/prusament-pp-glass-fiber-natural-nfc'],
  ['G085-01', '/spectrum/hdpe-traffic-black'],
  ['G104-01', '/spectrum/pa6-cs20-fr-vo'],
  ['G105-01', '/spectrum/asa-electrically-conductive-black'],
  ['G112-01', '/spectrum/pc-ptfe-natural'],
  ['G126-02', '/extrudr/tpu-medium-esd-black', { note: 'Extrudr sells FLEX MEDIUM ESD as TPU Medium ESD.' }],
  ['G131-01', '/extrudr/durapro-pc-pbt-cf-black'],
  ['G142-01', '/colorfabb/ngen-cf10'],
  ['G143-01', '/colorfabb/ngen-flex-black', { massFrom: 'description', note: CONTENT }],
  ['G153-01', '/prografen/pet-g-graphene-strong-jet-black', { maker: PROGRAFEN }],
  ['G153-02', '/prografen/pet-g-graphene-light-jet-black', { maker: PROGRAFEN }],
  ['G155-01', '/prografen/pla-graphene-light-jet-black', { maker: PROGRAFEN }],
  ['G155-02', '/prografen/pla-graphene-strong-jet-black', { maker: PROGRAFEN }],
  ['G156-01', '/esun/pa-cf-black', { note: 'eSUN sells ePA-CF, its carbon-fibre nylon, as PA-CF.' }],
  ['G157-01', '/recreus/conductive-filaflex-black'],
  ['G164-06', '/colorfabb/pa-neat', { massFrom: 'description', note: CONTENT }],
  ['G164-02', '/colorfabb/pa-blue-metal-detectable'],
  ['G165-01', '/colorfabb/pa-cf-low-warp', { massFrom: 'description', note: CONTENT }],
  ['G168-05', '/spectrum/greenypro-traffic-black'],
  ['G168-03', '/extrudr/green-tec-pro-black'],
  ['G168-02', '/3djake/nicebio-black'],
];
// A 3DJake page is one product, known by the address it was fetched from.
const byUrl = new Map(batchOffers('p04').map((o) => [o.capture.URL.replace(`https://${H}`, ''), o]));
const LISTINGS = PAGES.map(([gradeId, path, opts = {}]) => {
  const o = byUrl.get(path);
  if (!o) throw new Error(`${gradeId}: no page ${path}`);
  return [gradeId, H, o.product, opts];
});
const rows = writeSelection('p04', LISTINGS, 'Tier 4: EUR, before VAT as the page states (review-p04.mjs).');
for (const r of rows) console.log(`${r.GradeID}  ${r._offer.title}  ${r._offer.price}${r._offer.compareAt ? ` (was ${r._offer.compareAt})` : ''} ${r._offer.currency}  ${r._offer.available ? 'in stock' : 'out of stock'}`);
