#!/usr/bin/env node
// The impact round's frozen targets (D133, GOALS 2026-10-06 later): every registered document whose cached text prints
// an impact result (a Charpy, Izod or impact line with a unit or a test standard) that the tables hold fewer rows of,
// for an active product. Written once, before any page is read, and never widened except by a family a blind draw names.
//
//   node docs/audits/2026-10-06-impact-round/targets.mjs            write DOCS.csv and TARGETS.csv beside this file
//
// Tier 1: a product of PLA, PETG, ABS or ASA, or one a maker names or sells as toughened (where the drawer's split is
// read first). Tier 2: every other material. Nothing here reads a value: it counts lines, and the readers read.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, readCsv } from '../../../build/src/csv.js';
import { loadDocument, loadTables } from '../../../scripts/ingest/read-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const IMPACT = new Set(['Charpy strength', 'Izod impact strength', 'Impact strength']);
// An impact line: the test's name in any language the sheets use, with a unit or a standard on the same line, so a
// sentence about a product's "environmental impact" is not one.
const NAMES = /charpy|izod|impact|schlag|udarno|resilienza|resistencia al impacto|r[ée]sistance au choc|冲击|衝撃/i;
const MEASURE = /kj\s*\/\s*m|j\s*\/\s*m\b|jm-1|j\/cm|ft[\s·*.-]*lb|kg[\s·∙]*cm\/cm|iso\s*1(79|80)|d\s*256|gb\s*\/?\s*t\s*1(043|843)/i;
const TIER_ONE = new Set(['M001', 'M020', 'M027', 'M031']);
const CANDIDATE = /tough|impact|\bpro\b|\+|max\b/i;

const tables = loadTables();
const active = new Map(tables.grades.filter((g) => g.Status === 'active').map((g) => [g.GradeID, g]));
const claimed = new Set(readCsv(join(here, '../../../data/tables/product_claims.csv')).records.map((r) => r.values.GradeID));
const docs = [], targets = [];
let n = 0;
for (const s of tables.sources) {
  if (!/^[0-9a-f]{64}$/.test(s.SHA256 ?? '') || s['Access state'] === 'not-retrieved') continue;
  const products = new Set(String(s['Applicable grades'] ?? '').match(/G\d{3}-\d+/g) ?? []);
  for (const g of tables.grades) if (g.SourceID === s.SourceID) products.add(g.GradeID);
  const held = tables.measurements.filter((m) => m.SourceID === s.SourceID);
  for (const m of held) products.add(m.GradeID);
  const live = [...products].filter((id) => active.has(id));
  if (!live.length) continue;
  const doc = await loadDocument({ sha: s.SHA256, sourceId: s.SourceID });
  if (doc.source === 'none') continue;
  const lines = [...doc.pages.values()].flatMap((p) => p.line);
  const printed = lines.filter((l) => NAMES.test(l) && MEASURE.test(l) && /\d/.test(l.replace(MEASURE, '')));
  const heldImpact = held.filter((m) => IMPACT.has(m.Property) && !String(m['Data status']).startsWith('Retired')).length;
  if (!printed.length || printed.length <= heldImpact) continue;
  const materials = [...new Set(live.map((id) => active.get(id).MaterialID))];
  const toughened = live.filter((id) => claimed.has(id) || CANDIDATE.test(active.get(id)['Product name']));
  const tier = materials.some((m) => TIER_ONE.has(m)) || toughened.length ? '1' : '2';
  docs.push({ SourceID: s.SourceID, SHA256: s.SHA256, Kind: doc.kind ?? '', Cache: doc.source, Pages: String(doc.pages.size), OCR: '', Tier: tier,
    Materials: materials.join(';'), Grades: live.join(';'), Cited: '', Publisher: s.Publisher, Title: s.Title, URL: s.URL });
  for (const id of live) {
    targets.push({ TargetID: `I${String(++n).padStart(4, '0')}`, Level: 'grade', MaterialID: active.get(id).MaterialID, GradeID: id, Domain: 'mechanical',
      Field: 'impact', State: heldImpact ? 'partly held' : 'not held',
      Note: `${s.SourceID}: ${printed.length} impact line(s) printed, ${heldImpact} held; read every Charpy, Izod and impact row with its notch, direction, specimen, standard, unit and conditions` });
  }
}
const cols = (rows) => Object.keys(rows[0]);
writeFileSync(join(here, 'DOCS.csv'), csvText(cols(docs), docs));
writeFileSync(join(here, 'TARGETS.csv'), csvText(cols(targets), targets));
const t1 = docs.filter((d) => d.Tier === '1');
console.log(`impact round targets: ${docs.length} documents (${t1.length} tier 1, ${docs.length - t1.length} tier 2), ${targets.length} product targets, ${docs.reduce((a, d) => a + Number(d.Pages), 0)} pages`);
