// Candidate listings for each product, from a batch's captured shop documents: the offers whose listing names the
// product's maker and every word of its product name. A candidate is a lead for a reviewer, never a match: the reviewer
// reads the listing, keeps the one that is the product (and not its plus, silk or carbon sibling), and writes it into
// the batch's selected.csv, which is what enters.
//
//   node docs/audits/2026-10-01-price-pass/match.mjs <batch> [out.csv]    needs the batch's captures in the source store
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, readCsv } from '../../../build/src/csv.js';
import { batchOffers, namesMaker } from '../../../scripts/ingest/prices.mjs';
import { massKg, isOneSeventyFive } from '../../../scripts/lib/offers.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const [batch, out = join(here, `CANDIDATES-${process.argv[2]}.csv`)] = process.argv.slice(2);
const targets = readCsv(join(here, 'TARGETS.csv')).records.map((r) => r.values).filter((t) => t.GradeID !== 'None');

// Words that name a product line's variant: a listing that has one the product's name lacks is a sibling, not it.
const MODIFIERS = new Set(['plus', 'pro', 'silk', 'matte', 'matt', 'cf', 'gf', 'hs', 'hf', 'lite', 'tough', 'metal', 'wood', 'marble', 'glow', 'galaxy',
  'sparkle', 'rainbow', 'dual', 'tri', 'translucent', 'transparent', 'esd', 'fr', 'uv', 'high', 'speed', 'rapid', 'hyper', 'engineering', 'basic',
  'premium', 'ht', 'x', 'max', 'flex', 'soft', 'glass', 'carbon', 'kevlar', 'aramid', 'nylon', 'pa', 'pa6', 'pa12', 'petg', 'pla', 'abs', 'asa', 'pc', 'tpu',
  'pp', 'pctg', 'pet', 'pvb', 'pva', 'hips', 'peek', 'pei', 'ppa', 'pps', 'pekk', 'ultem', '95a', '90a', '85a', '98a', '64d', '60a', '75d', 'fiber', 'fibre']);
// Words every listing uses about itself, which tell nothing about which product it is.
const NOISE = new Set(['filament', 'filaments', '3d', 'printer', 'printing', 'spool', 'refill', 'mm', 'kg', 'g', 'the', 'and', 'for', 'with', 'of', 'a', 'by', 'new', 'series', 'color', 'colour', 'colors', 'colours', 'default', 'title', 'black', 'white']);
const tokens = (s) => String(s ?? '').toLowerCase().replace(/\+/g, ' plus ').replace(/[®™]/g, '').replace(/(\d)\.(\d)/g, '$1_$2').split(/[^a-z0-9_]+/).filter(Boolean).filter((t) => !/^\d+(_\d+)?(mm|kg|g)?$/.test(t));

const offers = batchOffers(batch);
const makerWords = (m) => new Set(tokens(m));
const rows = [];
for (const t of targets) {
  const mine = offers.filter((o) => namesMaker(t.Manufacturer, o));
  if (!mine.length) continue;
  const want = tokens(t.Product).filter((w) => !makerWords(t.Manufacturer).has(w) && !NOISE.has(w));
  if (!want.length) continue;
  const byProduct = new Map();
  for (const o of mine) {
    const have = new Set(tokens(`${o.productTitle}`));
    if (!want.every((w) => have.has(w))) continue;
    const extras = [...have].filter((w) => MODIFIERS.has(w) && !want.includes(w));
    const key = `${o.capture.Host}|${o.product}`;
    if (!byProduct.has(key)) byProduct.set(key, { o, extras, variants: [] });
    byProduct.get(key).variants.push(o);
  }
  for (const { o, extras, variants } of byProduct.values()) {
    const inStock = variants.filter((v) => v.available === true);
    const priced = variants.filter((v) => massKg(v.title) != null);
    rows.push({
      MaterialID: t.MaterialID, Material: t.Material, 'Material priced': t['Material priced'], Wave: t.Wave, Order: t.Order, GradeID: t.GradeID,
      Manufacturer: t.Manufacturer, Product: t.Product, Host: o.capture.Host, 'Listing': o.productTitle, Vendor: o.vendor, Extras: extras.join(' '),
      Variants: variants.length, 'In stock': inStock.length, 'With mass': priced.length, '1.75': isOneSeventyFive(`${o.title} ${o.description}`) ?? '',
      'First variant': `${variants[0].key} ${variants[0].title} ${variants[0].price} (${variants[0].compareAt ?? '-'}) ${variants[0].currency}`,
      SHA256: o.capture.SHA256,
    });
  }
}
rows.sort((a, b) => a.MaterialID.localeCompare(b.MaterialID) || Number(a.Order) - Number(b.Order) || a.Extras.length - b.Extras.length);
writeFileSync(out, csvText(Object.keys(rows[0] ?? { MaterialID: '' }), rows));
const clean = rows.filter((r) => !r.Extras);
const materials = (list, wave) => new Set(list.filter((r) => r.Wave === wave).map((r) => r.MaterialID)).size;
console.log(JSON.stringify({ batch, offers: offers.length, candidates: rows.length, withoutExtras: clean.length,
  wave1Materials: materials(clean, '1: material'), wave2Grades: new Set(clean.filter((r) => r.Wave === '2: product').map((r) => r.GradeID)).size, out }, null, 1));
