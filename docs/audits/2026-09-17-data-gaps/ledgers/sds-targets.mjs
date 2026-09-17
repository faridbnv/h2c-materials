#!/usr/bin/env node
// The safety-data-sheet sweep: which grade needs one, and where its publisher keeps its documents.
//
// data/tables/method.csv [Evidence / Priority] ranks "Manufacturer TDS/SDS for exact grades" second, and
// sources.csv holds zero safety data sheets. An SDS is the one first-party document that publishes what a TDS never
// does: the ingredient disclosure with its CAS numbers, the filler and its loading, thermal decomposition and
// stability, and the handling and ventilation statements. C00003 (PLA-GF, glass fibre in the heading and carbon
// fibre in the description) asks in its own words for "a composition declaration from iSANMATE": that is an SDS.
//
//   node docs/audits/2026-09-17-data-gaps/ledgers/sds-targets.mjs
//
// "Where to look" is the shape of the URLs this register already holds for that publisher, so a fetch starts from
// the right tree. It is not a URL to guess at: an SDS is found from the publisher's own product page and then
// fetched, hashed and read (D35). Bambu Lab's document CDN uses an opaque hash per file, so its SDS cannot be
// constructed from the TDS URL at all.

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText } from '../../../../build/src/csv.js';
import { openTables } from '../../../../scripts/data/table-io.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// The document tree each publisher uses, read off its recorded URLs in sources.csv.
const WHERE = {
  'Bambu Lab': 'store.bblcdn.com/<opaque hash>/<Name>.pdf - not constructible; take the SDS link from the product page at ca.store.bambulab.com/products/<slug>',
  '3DXTECH': 'cdn.shopify.com/s/files/1/0625/4185/6821/files/<PRODUCT>_TDS_v#.pdf - an SDS sibling is linked from www.3dxtech.com/products/<slug>',
  Polymaker: 'cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/<Product>_TDS_V#.pdf - the documents tree of wiki.polymaker.com is the index',
  'Polymaker (Fiberon)': 'polymaker.com/wp-content/uploads/lana-downloads/TDS_FIBERON-<Product>_V#_EN.pdf; product pages at fiberon.polymaker.com/product/<slug>',
  Spectrum: 'spectrumfilaments.com/wp-content/uploads/<yyyy>/<mm>/en_tds_spectrum_<product>.pdf - an en_sds_ sibling is the obvious place to look',
  iSANMATE: 'www.isanmate.com/wp-content/uploads/<yyyy>/<mm>/<Product>.pdf - the host is robots-disallowed to fetch tools; open it in a browser and keep the file',
  'Prusa Research': 'help.prusa3d.com/article/<slug> and prusament.com/wp-content/uploads/<yyyy>/<mm>/<Product>_TDS_<date>_EN.pdf',
  Fillamentum: 'fillamentum.com/wp-content/uploads/<yyyy>/<mm>/TDS_<Product>.pdf',
  'Fillamentum Manufacturing Czech': 'fillamentum.com/wp-content/uploads/<yyyy>/<mm>/TDS_<Product>.pdf',
  eSUN: 'www.esun3d.com/media/esun/catalog/certification/product/<Product>/... - the folder is already called certification',
  'BASF Forward AM': 'move.forward-am.com/hubfs/AES Documentation/<Category>/<Product>/TDS/... - look for an /SDS/ sibling folder',
  Flashforge: 'www.flashforge.com/products/<slug>',
  FormFutura: 'www.formfutura.com/web/content/<opaque id>?download=true - not constructible; take the link from the product page',
};

const t = openTables();
const materials = new Map(t.rows('materials').map((r) => [r.MaterialID, r]));
const sources = new Map(t.rows('sources').map((r) => [r.SourceID, r]));

// Why this grade's SDS is worth fetching first. An SDS is worth most where the composition is undisclosed or
// disputed, and on a grade the reader can actually buy and print today.
const PRINTABLE = new Set(['Official Bambu product', 'Officially listed family']);
const priority = (g, m) => {
  const undisclosed = g['Composition / filler'] === 'Not published';
  const representative = m['Representative grade'] === g.GradeID;
  if ((g['Composition / filler'] ?? '').startsWith('Conflict')) return '1 - its composition is recorded as a conflict';
  if ((g.Variant ?? 'Not applicable') !== 'Not applicable') return '2 - a declared variant whose filler is undisclosed; the estimate model gives it its own covariate';
  if (undisclosed && representative && PRINTABLE.has(m['H2C status'])) return '3 - representative grade of a material printable today, composition undisclosed';
  if (undisclosed && PRINTABLE.has(m['H2C status'])) return '4 - printable today, composition undisclosed';
  if (undisclosed) return '5 - composition undisclosed';
  return '6 - composition disclosed on the data sheet';
};

const rows = [];
for (const g of t.rows('grades')) {
  if (g.Status !== 'active' || g.Role !== 'procurement') continue;
  const m = materials.get(g.MaterialID);
  const s = sources.get(g.SourceID);
  rows.push({
    Priority: priority(g, m),
    MaterialID: g.MaterialID, Material: m['Original name'], 'H2C status': m['H2C status'],
    GradeID: g.GradeID, Manufacturer: g.Manufacturer, Product: g['Product name'],
    Representative: m['Representative grade'] === g.GradeID ? 'yes' : 'no',
    'Composition / filler today': g['Composition / filler'],
    'Certification claims today': g['Certification claims'],
    'TDS source': g.SourceID, 'TDS URL': s?.URL ?? '?',
    'Where the publisher keeps documents': WHERE[g.Manufacturer] ?? WHERE[s?.Publisher] ?? 'not recorded; start from the product page',
  });
}
rows.sort((a, b) => a.Priority.localeCompare(b.Priority) || a.MaterialID.localeCompare(b.MaterialID) || a.GradeID.localeCompare(b.GradeID));
writeFileSync(join(here, 'sds-targets.csv'), csvText(Object.keys(rows[0]), rows));

const byPriority = new Map();
for (const r of rows) byPriority.set(r.Priority, (byPriority.get(r.Priority) ?? 0) + 1);
console.log(`sds-targets.csv: ${rows.length} active procurement grades, none of which has a safety data sheet on record.`);
for (const [p, n] of [...byPriority].sort()) console.log(`  ${String(n).padStart(3)}  priority ${p}`);
console.log('  Batch 1 (priorities 1 to 3):');
for (const r of rows.filter((x) => /^[123] /.test(x.Priority)))
  console.log(`    ${r.GradeID.padEnd(9)} ${r.Manufacturer.padEnd(22)} ${r.Product.slice(0, 34).padEnd(34)} ${r.Priority}`);
