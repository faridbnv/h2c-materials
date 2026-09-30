// The review of batch p01, the Canadian shops' catalogues captured on 2026-09-30: which listing is which product, and
// which of its variants is recorded. It writes archive/ingest-2026-09-18/prices/p01/selected.csv, the reviewed choice
// `ingest:prices propose` reads; every value of every row is then read again from the hashed catalogue by the guard.
//
// Wave 1 (a material with no price) was read listing by listing: LISTINGS names each listing accepted for a product,
// and REJECTED each candidate the matcher offered that is not the product, with why. Wave 2 (another product of a
// priced material) takes only a listing whose name, less its maker, colour and size, is the product's name and nothing
// more, and never a bundle, a multi-kilogram spool or a deal.
//
// Within a listing the variant recorded is 1.75 mm by its own words (or its SKU, or the listing's description where
// the variant says nothing), with its net mass printed, in stock where one is, black where there is a choice, else
// natural or white, else the first. Per product: one listing per shop in stock, or, where no shop has it in stock, one
// out-of-stock listing, which says it is listed and prices nothing.
//
//   node docs/audits/2026-10-01-price-pass/review-p01.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, readCsv } from '../../../build/src/csv.js';
import { batchOffers, namesMaker, SELECTED_HEADER, PRICES_ROOT } from '../../../scripts/ingest/prices.mjs';
import { massKg, isOneSeventyFive } from '../../../scripts/lib/offers.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const BATCH = 'p01';
const REVIEWER = 'Claude (claude-opus-5-5), an agent, 2026-09-30';
const PRUSAMENT = 'Prusament is made in 1.75 mm only (Prusa Research makes filament for its own 1.75 mm printers)';

// [GradeID, host, product id, options]. options: variant (a pattern the variant's title must match), massFrom
// ('description' where the listing's title prints no mass), diameter (a reviewer's statement where the listing names
// none), maker (why a listing that does not name the maker is the product), note.
const LISTINGS = [
  ['G019-01', 'voxelfactory.com', '8918017245420'],
  ['G025-04', 'ca.qidi3d.com', '7860880277622'],
  ['G026-01', '3dprintingcanada.com', '4366156234821'],
  ['G026-01', 'digitmakers.ca', '4701098508419'],
  ['G026-05', 'voxelfactory.com', '8896053281004', { note: 'Polymaker sells PETG ESD in its Fiberon line.' }],
  ['G026-07', 'digitmakers.ca', '9352123252966'],
  ['G029-04', 'ca.eryone3d.com', '7635157942525', { variant: /^ABS-CF/ }],
  ['G029-06', 'digitmakers.ca', '8749010518246'],
  ['G029-09', 'shop3d.ca', '8781013319894'],
  ['G030-01', '3dprintingcanada.com', '6716956639301'],
  ['G033-14', 'ca.qidi3d.com', '8027344502902', { variant: /\/ CA$/, note: 'The variant shipped from QIDI\'s Canadian warehouse.' }],
  ['G033-11', 'voxelfactory.com', '9008875897068'],
  ['G033-02', '3dprintingcanada.com', '6879821463621'],
  ['G033-12', 'digitmakers.ca', '8730056425702'],
  ['G033-01', 'digitmakers.ca', '9448835743974'],
  ['G033-06', 'ca.eryone3d.com', '7635157975293', { variant: /^ASA-CF/ }],
  ['G033-04', '3dprintingcanada.com', '6890541580357'],
  ['G033-04', '3dprintingcanada.com', '6890540499013'],
  ['G038-02', 'shop3d.ca', '7568547774678'],
  ['G046-02', 'digitmakers.ca', '4365795098755', { massFrom: 'description' }],
  ['G167-05', '3dprintingcanada.com', '7059515146309'],
  ['G053-08', 'voxelfactory.com', '8896046760172'],
  ['G057-03', 'voxelfactory.com', '7466228023532', { note: 'PolyMide CoPA is two grades of one product here (G057-01 and G057-03, two TDS revisions); its listings are recorded once, under the current revision\'s grade.' }],
  ['G057-04', 'shop3d.ca', '2375244283982'],
  ['G057-07', 'digitmakers.ca', '1259130814500'],
  ['G059-01', 'voxelfactory.com', '8896103612652'],
  ['G059-03', 'shop3d.ca', '8202674634966'],
  ['G065-01', 'voxelfactory.com', '8989954867436'],
  ['G066-02', '3dprintingcanada.com', '6890539548741'],
  ['G068-02', 'voxelfactory.com', '9041405772012'],
  ['G068-04', 'shop3d.ca', '7997801758934'],
  ['G068-04', 'digitmakers.ca', '8238063190246'],
  ['G072-02', '3dprintingcanada.com', '6889669328965'],
  ['G074-02', 'voxelfactory.com', '8989943267564'],
  ['G077-01', 'shop3d.ca', '9482033660118'],
  ['G077-01', 'digitmakers.ca', '9358894792934'],
  ['G077-02', 'store.makerwiz.com', '8036727488734'],
  ['G077-02', 'voxelfactory.com', '4520188444790', { note: 'PolySupport is sold as "PolySupport for PLA" beside Polymaker\'s PolySupport for PA12 (G080-02).' }],
  ['G080-01', 'digitmakers.ca', '8259329917158'],
  ['G080-02', 'voxelfactory.com', '8896161939692'],
  ['G080-03', 'shop3d.ca', '7997805363414'],
  ['G080-03', 'digitmakers.ca', '8238059520230'],
  ['G083-01', 'digitmakers.ca', '8421908873446', { note: 'CarbonX PP+CF is 3DXTECH\'s CarbonX CF PP.' }],
  ['G089-03', 'digitmakers.ca', '8829132734694'],
  ['G089-03', 'store.makerwiz.com', '5569880774'],
  ['G089-04', 'store.makerwiz.com', '8818188044'],
  ['G090-02', '3dprintingcanada.com', '6890523820101', { note: 'Spectrum sells PCTG CF10 in its Premium PCTG line.' }],
  ['G090-03', 'digitmakers.ca', '8829197877478'],
  ['G090-03', 'store.makerwiz.com', '5569880902'],
  ['G092-02', 'store.makerwiz.com', '5569880326'],
  ['G093-02', 'voxelfactory.com', null, { title: 'Polymaker PolySmooth 1.75mm 0.75kg' }],
  ['G093-02', 'store.makerwiz.com', null, { title: 'Polymaker PolySmooth™ Filament - 1.75 mm, 0.75 kg (11 Colours)' }],
  ['G093-04', 'voxelfactory.com', '4520205877366'],
  ['G093-01', 'store.makerwiz.com', '6553415123021', { diameter: PRUSAMENT }],
  ['G094-02', 'voxelfactory.com', '6589757915316'],
  ['G094-03', '3dprintingcanada.com', '6977434681413'],
  ['G094-10', 'digitmakers.ca', '8736784810214'],
  ['G095-01', 'voxelfactory.com', '7446269067500'],
  ['G096-01', '3dprintingcanada.com', '6594923102277', { massFrom: 'description', note: 'The title prints "0.75g"; the description prints the 0.75 kg spool.' }],
  ['G106-01', '3dprintingcanada.com', '6734797373509'],
  ['G107-02', '3dprintingcanada.com', '6716955557957'],
  ['G108-01', '3dprintingcanada.com', '6734798061637'],
  ['G109-01', '3dprintingcanada.com', '6890538860613'],
  ['G110-01', '3dprintingcanada.com', '6890525950021', { note: 'Spectrum sells PCTG GF10 in its Premium PCTG line.' }],
  ['G111-02', 'store.makerwiz.com', '9280926023902'],
  ['G111-02', 'filaments.ca', '474907140'],
  ['G113-01', '3dprintingcanada.com', '6889668542533'],
  ['G113-02', 'digitmakers.ca', '8730115047654'],
  ['G116-01', '3dprintingcanada.com', '7882506272837'],
  ['G129-01', '3dprintingcanada.com', '6977434484805'],
  ['G145-01', 'store.makerwiz.com', '5569880518'],
  ['G156-01', 'digitmakers.ca', '8561184779'],
  ['G043-01', 'digitmakers.ca', '9007502459110', { variant: /^85A / }],
  ['G039-32', 'store.makerwiz.com', '153993674764', { note: 'NinjaFlex in the colour Fire; NinjaFlex is NinjaTek\'s 85A TPU.' }],
  ['G039-32', '3dprintingcanada.com', null, { title: 'Grass Green - NinjaTek NinjaFlex TPU 85A - 1.75mm, 0.5 kg' }],
  ['G039-32', 'digitmakers.ca', null, { title: 'Ninjatek Ninjaflex TPU 85A - 1.75 mm, 0.5kg' }],
  ['G039-48', 'shop3d.ca', '9073357848790'],
  ['G167-10', 'digitmakers.ca', '9471922307302'],
  // Found by searching the captured catalogues for the materials the matcher left unpriced: a listing whose name spells
  // the product differently from its sheet (ASA-X GF10 for "asax x gf10", PA 12+CF for CF PA12, ezPC+CF).
  ['G034-01', '3dprintingcanada.com', null, { title: 'Traffic Black - Spectrum ASA-X GF10 - 1.75mm, 1kg' }],
  ['G053-01', 'digitmakers.ca', null, { title: 'CARBONX™ Carbon Nylon PA 12+CF 1.75mm 500g Black', note: 'CarbonX PA12+CF is 3DXTECH\'s CarbonX CF PA12.' }],
  ['G037-04', 'digitmakers.ca', null, { title: 'CarbonX™ ezPC+CF - 1.75mm 750g', note: 'CarbonX ezPC+CF is 3DXTECH\'s CarbonX carbon-fibre ezPC.' }],
  ['G084-01', '3dprintingcanada.com', null, { title: 'Black - 1.75mm 3DXTech FibreX™ PP+GF30 Polypropylene - 0.5 kg', note: 'FibreX PP+GF30 is 3DXTECH\'s FibreX GF PP.' }],
];

// Candidates the matcher offered that are not the product: [GradeID, host, listing, why].
const REJECTED = [
  ['G019-03', 'digitmakers.ca', 'eSUN ePLA-GF (Glass Fiber Reinforced PLA) 3D Filament-Natural', 'Its SKU names ePLA-CF while its title says GF; which product it is cannot be settled from the listing.'],
  ['G052-05', 'digitmakers.ca', 'FormFutura STYX PA6-CF15 / PA6-GF30', 'STYX PA6 composites, not STYX-12.'],
  ['G053-02', 'voxelfactory.com', 'Polymaker PolyMide PA12-CF 2.85mm 500g', 'Sold in 2.85 mm only here.'],
  ['G053-06', 'ca.eryone3d.com', 'Nylon & Nylon-CF&GF(PA6 & PA12) Filament', 'The PA12-CF variant prints 800 g beside the listing\'s 1 kg: no single net mass.'],
  ['G053-09', 'shop3d.ca, digitmakers.ca', 'Raise3D Industrial PA12 CF Support Filament', 'The support filament for PA12 CF, not PA12 CF.'],
  ['G030-01', 'digitmakers.ca', '3DXSTAT ESD ABS Filament - Black various sizes', 'Its title and description print no net mass.'],
  ['G045-07', 'ca.qidi3d.com', 'PEBA 95A', 'Neither the listing nor its description states a diameter.'],
  ['G057-03', 'digitmakers.ca', 'PolyMide CoPA Nylon - Various Color and Size', 'Its title and description print no net mass.'],
  ['G068-05', 'ca.qidi3d.com', 'PET-GF Filament', 'Its title and description print no net mass.'],
  ['G082-09', 'shop3d.ca', 'Raise3D Pro3 P Heating Rod / Thermocouple', 'Printer parts.'],
  ['G133-01', 'digitmakers.ca', 'Flashforge Flexible build plates', 'Printer parts.'],
  ['G128-01', 'digitmakers.ca', 'CARBONX Carbon Fiber PC/ABS Filament - Black various sizes', 'Only its 2.85 mm variant is listed.'],
  ['G039-32', '3dprintingcanada.com, digitmakers.ca', 'NinjaTek NinjaFlex Edge TPE 83A', 'NinjaFlex Edge, a different NinjaTek product.'],
  ['G092-02', 'store.makerwiz.com', 'ColorFabb NGEN Flex', 'nGen Flex, a different colorFabb product.'],
  ['G089-03', 'digitmakers.ca, store.makerwiz.com', 'colorFabb XT CF20', 'XT-CF20 (G090-03), not XT.'],
  ['G093-02', 'digitmakers.ca', 'Polymaker PolySmooth Filament Various Colors- 1.75mm', 'Its variants print no net mass.'],
  ['G093-04', 'voxelfactory.com', 'Polymaker PolyCast 1.75mm 3.0kg', 'A 3 kg spool; the 0.75 kg one is recorded.'],
  ['G166-01', 'shop.cadmicro.com', 'Markforged Onyx GF Filament Spool', 'Sold by volume (cm³); no net mass is printed.'],
  ['G104-01', '3dprintingcanada.com', 'Spectrum PA6 CS20 Filament', 'The product is PA6 CS20 FR V0; whether the listing is the flame-retardant grade the listing does not say.'],
  ['G126-01', 'digitmakers.ca', '3DXSTAT ESD Flex Filament 750g 1.75mm Black', 'Whether "ESD Flex" is 3DXSTAT ESD-TPU 90A the listing does not say.'],
  ['G147-01', 'voxelfactory.com', 'LUVOCOM 3F PAHT 9825 (High Temperature Nylon) - White', 'An UltiMaker 2.85 mm spool with no printed mass.'],
];

// Wave 2 listings the rule accepts that are not the product: [GradeID, listing title less its colour prefix, why].
const WAVE2_REJECTED = [
  ['G020-10', 'Spectrum PETG Filament - 1.75mm, 1kg', 'Spectrum sells a PETG under its own name and THE FILAMENT PETG under a second brand; the listing does not say which.'],
];

// Wave 2: words a listing uses for its colour, size and shop, which say nothing about which product it is.
const COLOURS = new Set(['black', 'white', 'grey', 'gray', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'natural', 'clear', 'silver', 'gold',
  'brown', 'beige', 'navy', 'lime', 'deep', 'dark', 'light', 'polar', 'signal', 'traffic', 'true', 'bloody', 'lion', 'bahama', 'jet', 'snow', 'cream', 'baby',
  'royal', 'fresh', 'banana', 'anthracite', 'aluminium', 'aluminum', 'ola', 'grape', 'arctic', 'iceland', 'latte', 'telegrey', 'granite', 'walnut', 'cool', 'warm',
  'teal', 'coral', 'electric', 'slate', 'jade', 'ivory', 'charcoal', 'olive', 'cyan', 'magenta', 'transparent', 'translucent', 'midnight', 'fire', 'sapphire',
  'steel', 'sun', 'grass', 'water', 'flamingo', 'mocha', 'blush', 'caramel', 'almond', 'iron', 'pearl', 'various', 'colors', 'colours', 'color', 'colour', 'assorted',
  'glossy', 'sky', 'ocean', 'forest', 'mint', 'rose', 'wine', 'bronze', 'copper', 'titanium', 'space', 'army', 'khaki', 'sand', 'desert', 'marine', 'sea', 'tea']);
const NOISE = new Set(['filament', 'filaments', '3d', 'printer', 'printing', 'spool', 'refill', 'mm', 'kg', 'g', 'gr', 'the', 'and', 'for', 'with', 'of', 'a', 'by', 'new', 'series', 'default', 'title']);
const tokens = (s) => String(s ?? '').toLowerCase().replace(/\+/g, ' plus ').replace(/[®™]/g, '').replace(/(\d)[.,](\d)/g, '$1_$2').split(/[^a-z0-9_]+/).filter(Boolean)
  .filter((t) => !/^\d+(_\d+)?(mm|kg|g|gr)?$/.test(t) && !/^#?[0-9a-f]{6}$/.test(t) && !/^hex$|^code$/.test(t));
const offers = batchOffers(BATCH);
const byListing = new Map();
for (const o of offers) { const k = `${o.capture.Host}|${o.product}`; if (!byListing.has(k)) byListing.set(k, []); byListing.get(k).push(o); }

const diameterOf = (o) => isOneSeventyFive(o.title) ?? isOneSeventyFive(o.sku) ?? isOneSeventyFive(`${o.productType} ${o.description}`);
/** The variant recorded from one listing, or null with why. */
function variantOf(variants, { variant, massFrom, diameter } = {}) {
  const usable = variants.filter((o) => (!variant || variant.test(o.variantTitle)) && (diameterOf(o) === true || (diameter && diameterOf(o) !== false))
    && (massFrom === 'description' ? massKg(o.description) : massKg(o.title)) != null && o.available != null);
  if (!usable.length) return null;
  const rank = (o) => (o.available ? 0 : 4) + (/black/i.test(`${o.variantTitle} ${o.productTitle}`) ? 0 : /natural|white/i.test(`${o.variantTitle} ${o.productTitle}`) ? 1 : 2);
  return [...usable].sort((a, b) => rank(a) - rank(b))[0];
}

const picks = [];
for (const [gradeId, host, pid, opts = {}] of LISTINGS) {
  const list = pid ? byListing.get(`${host}|${pid}`) : [...byListing.entries()].find(([k, v]) => k.startsWith(`${host}|`) && v[0].productTitle === opts.title)?.[1];
  if (!list) throw new Error(`${gradeId}: no listing ${host} ${pid ?? opts.title}`);
  const o = variantOf(list, opts);
  if (!o) throw new Error(`${gradeId}: no usable variant in ${host} "${list[0].productTitle}"`);
  picks.push({ gradeId, o, opts, wave: 1 });
}

// Wave 2, by rule.
const targets = readCsv(join(here, 'TARGETS.csv')).records.map((r) => r.values).filter((t) => t.Wave === '2: product');
const taken = new Set(picks.map((p) => p.o.url));
const BULK = /bundle|deal|mix\s?&\s?match|gift|combo|pack\b|sample|\+\s?\d+\s?kg|\d+\s?-\s?\d+\s?kg/i;
for (const t of targets) {
  const makerWords = new Set(tokens(t.Manufacturer));
  const want = new Set(tokens(t.Product).filter((w) => !makerWords.has(w) && !NOISE.has(w)));
  if (!want.size) continue;
  for (const [key, variants] of byListing) {
    const first = variants[0];
    if (!namesMaker(t.Manufacturer, first) || BULK.test(first.productTitle)) continue;
    // Only the maker's own name is set aside: a product line's name (PolyLite, PolyMax) is part of which product it is.
    const vendorWords = new Set(tokens(first.vendor));
    const words = tokens(first.productTitle).filter((w) => !NOISE.has(w) && !COLOURS.has(w) && !makerWords.has(w) && !vendorWords.has(w));
    if (words.length !== want.size || !words.every((w) => want.has(w))) continue;
    const o = variantOf(variants);
    if (!o || massKg(o.title) > 1.1 || taken.has(o.url) || WAVE2_REJECTED.some(([g, title]) => g === t.GradeID && title === first.productTitle.replace(/^.* - (?=Spectrum)/, ''))) continue;
    picks.push({ gradeId: t.GradeID, o, opts: {}, wave: 2 });
  }
}

// One listing per product per shop, in stock first; a product with none in stock keeps one out-of-stock listing.
const byGrade = new Map();
for (const p of picks) { if (!byGrade.has(p.gradeId)) byGrade.set(p.gradeId, []); byGrade.get(p.gradeId).push(p); }
const urlOwner = new Map();
for (const p of picks) urlOwner.set(p.o.url, [...(urlOwner.get(p.o.url) ?? []), p.gradeId]);
const rows = [];
for (const [gradeId, list] of byGrade) {
  const clean = list.filter((p) => new Set(urlOwner.get(p.o.url)).size === 1);
  const inStock = clean.filter((p) => p.o.available);
  const perShop = new Map();
  for (const p of inStock) if (!perShop.has(p.o.capture.Host)) perShop.set(p.o.capture.Host, p);
  const chosen = perShop.size ? [...perShop.values()] : clean.slice(0, 1);
  for (const p of chosen) {
    rows.push({
      GradeID: gradeId, SHA256: p.o.capture.SHA256, Offer: p.o.key, Packaging: /refill/i.test(p.o.title) ? 'Refill' : 'Spool',
      'Mass from': p.opts.massFrom ?? 'title', 'Eligible for median': 'TRUE', 'Headline sample': 'TRUE', 'Regular price basis': '',
      Notes: p.opts.note ?? '', Diameter: p.opts.diameter ?? '', Maker: p.opts.maker ?? '', 'VAT included %': '',
      Status: 'accepted', Reviewer: REVIEWER, Why: p.wave === 1 ? 'Wave 1: read listing by listing (review-p01.mjs, LISTINGS).' : 'Wave 2: the listing\'s name, less maker, colour and size, is the product\'s name (review-p01.mjs).',
    });
  }
}
mkdirSync(join(PRICES_ROOT, BATCH), { recursive: true });
writeFileSync(join(PRICES_ROOT, BATCH, 'selected.csv'), csvText(SELECTED_HEADER, rows));
writeFileSync(join(here, 'REJECTED-p01.csv'), csvText(['GradeID', 'Host', 'Listing', 'Why'], [...REJECTED, ...WAVE2_REJECTED.map(([g, l, w]) => [g, '3dprintingcanada.com', l, w])].map(([g, h, l, w]) => ({ GradeID: g, Host: h, Listing: l, Why: w }))));
const stock = rows.filter((r) => offers.find((o) => o.key === r.Offer && o.capture.SHA256 === r.SHA256)?.available).length;
console.log(`${rows.length} listing(s) for ${byGrade.size} product(s): ${stock} in stock; wave 1 ${picks.filter((p) => p.wave === 1).length}, wave 2 ${picks.filter((p) => p.wave === 2).length} picks; ${REJECTED.length} candidates rejected`);
