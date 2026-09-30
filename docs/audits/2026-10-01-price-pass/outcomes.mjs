// Where the price pass left each material in scope: priced, from which tier and how many of its products, or not, and
// why not in the words of the batch reviews. The reason for a material left unpriced is the reviewer's; everything else
// is counted from the build.
//
//   node docs/audits/2026-10-01-price-pass/outcomes.mjs     writes OUTCOMES.csv beside it; needs npm run build
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText } from '../../../build/src/csv.js';

const here = dirname(fileURLToPath(import.meta.url));
const db = JSON.parse(readFileSync(join(here, '../../../dist/db.json'), 'utf8'));

const PUREFIL = 'Only Fabru (purefil) makes it in the database; its shop prints "inkl. ges. MwSt." without the rate, so no price can be taken before VAT.';
const GONE = '3DXTECH\'s own catalogue (captured 2026-09-30) no longer lists it, and no captured shop does.';
const FILLAMENTUM = 'Fillamentum\'s shop prints "Tax included." without the rate, and no Canadian, US or 3DJake listing was found.';
const NANOVIA = 'Nanovia sells through variable listings whose shop data states no VAT basis for the price; not at 3DJake.';
const WHY = {
  M038: 'Ultrafuse PC GF30 is listed only out of stock (Shop3D.ca); SIDDAMENT sells in AUD and not to Canada; purefil prints VAT without its rate.',
  M056: 'No procurement product: nothing to price until the database holds one.',
  M058: 'No procurement product: nothing to price until the database holds one.',
  M060: 'No procurement product: nothing to price until the database holds one.',
  M064: GONE, M103: GONE, M114: GONE, M119: GONE, M120: GONE, M124: GONE, M128: GONE,
  M086: `${FILLAMENTUM} Dow's EVOLV3D OBC has no public price found.`,
  M087: 'Tarfuse POM (filamentworld.de) and purefil POM state no VAT basis on their pages; Yousu\'s shop was not reached in this pass.',
  M112: 'Every listing found is out of stock (Spectrum\'s North American shop, 3DJake); Nanovia as above.',
  M132: 'Neither of Flashforge\'s shops captured lists PBT-GF.',
  M133: 'No listing of Flashforge\'s "Flexible" filament was found; the matches were printer parts.',
  M135: `${PUREFIL} Fillamentum's Vinyl 303: shop prints "Tax included." without the rate.`,
  M136: PUREFIL, M137: PUREFIL, M139: PUREFIL, M140: PUREFIL, M175: PUREFIL,
  M138: `${PUREFIL} iSANMATE's HDPE glass-fibre was not in its own shop's catalogue.`,
  M141: 'colorFabb\'s LW-PET is not at 3DJake, and colorFabb\'s own shops were not readable (the US shop draws its pages by script).',
  M146: FILLAMENTUM, M154: FILLAMENTUM,
  M147: 'LEHVOSS sells through 3D4Makers and filamentworld.de; neither page states the VAT basis of its price.',
  M148: 'LEHVOSS sells through 3D4Makers and filamentworld.de; neither page states the VAT basis of its price.',
  M149: '3D4Makers lists Facilan PCL 100 without stating its VAT basis; no iSANMATE, SUNLU or Filament2Print listing was found in a bounded search.',
  M152: `Extrudr Flax at 3DJake prints two net masses (1100 g in its title, 1.000 g in its properties). ${NANOVIA}`,
  M157: 'Every listing found is out of stock (Recreus Conductive Filaflex at Narrow Path 3D and 3DJake); NinjaTek\'s Eel page carries no readable offer data.',
  M166: 'Markforged sells Onyx GF by volume (cm³), with no net mass.',
  M167: NANOVIA,
  M169: 'Only a 5 kg Green-TEC PRO CF spool, on sale, was found (3DJake), and bulk is kept out; BigRep\'s shop was not reached.',
  M174: 'FormFutura Crystal Flex is not at 3DJake, and FormFutura\'s own shop was not reached.',
};

const prices = new Map(db.prices.map((p) => [p.id, p]));
const tierOf = (p) => (!p.foreign ? (p.market.startsWith('Amazon') ? 'Amazon.ca, the maker\'s store' : p.accessDate === '2026-09-10' ? 'Canadian shop (2026-09-10)' : 'Canadian shop') : p.currency === 'USD' ? 'USD' : 'EUR');
const rows = [];
for (const m of db.materials.filter((x) => !x.familyEntry && !x.excluded)) {
  const h = m.headline?.priceCADkg;
  const products = m.gradeIds.map((id) => db.grades.find((g) => g.id === id)).filter((g) => g && !g.retired && !/-R\d+$/.test(g.id));
  const priced = products.filter((g) => g.headline?.priceCADkg?.value != null);
  if (h?.known) {
    const tiers = [...new Set(h.priceIds.map((id) => prices.get(id)).filter(Boolean).map(tierOf))];
    rows.push({ MaterialID: m.id, Material: m.name, Priced: 'yes', 'CAD/kg': h.value, Tiers: tiers.join('; '), Converted: h.converted ? `${h.converted.products ?? 1} product(s) from ${h.converted.currencies.join(', ')}` : 'no',
      'Products priced': `${priced.length} of ${products.length}`, 'Why not': '' });
  } else {
    rows.push({ MaterialID: m.id, Material: m.name, Priced: 'no', 'CAD/kg': '', Tiers: '', Converted: '', 'Products priced': `${priced.length} of ${products.length}`,
      'Why not': WHY[m.id] ?? 'Not recorded.' });
  }
}
writeFileSync(join(here, 'OUTCOMES.csv'), csvText(Object.keys(rows[0]), rows));
const count = (f) => rows.filter(f).length;
console.log(JSON.stringify({
  release: db.meta.release.id, materials: rows.length, priced: count((r) => r.Priced === 'yes'), converted: count((r) => r.Converted && r.Converted !== 'no'),
  unpriced: count((r) => r.Priced === 'no'), unexplained: rows.filter((r) => r['Why not'] === 'Not recorded.').map((r) => r.MaterialID),
  byTier: rows.filter((r) => r.Priced === 'yes').reduce((t, r) => { for (const x of r.Tiers.split('; ')) t[x] = (t[x] ?? 0) + 1; return t; }, {}),
}, null, 1));
