#!/usr/bin/env node
// The second reading of the filament indication (D172), after the independent review of track T1 (F1, F7): every value of a
// bar's property whose bar no document describes, that the first reading and its second pass left set apart or never read,
// is read again under the rubric the executor set (INSTRUCTIONS.md beside this file). The first reading had told its readers
// "when in doubt, choose NONE" and to let a counter-indication win, so they stopped at a melt flow rate or a blank mould
// shrinkage row and did not report what indicated printing; and one page in eight of those whose text held a moulding or
// resin word was read at all. This reads them all. Run from the repository root after `npm run build`:
//
//   node docs/audits/2026-10-20-owner-rulings/evidence/reading/round-2/packets.mjs <out-dir>
//
// It writes groups.json beside this file (the values each group holds, no page text) and the reading batches, which hold
// the cached page text, to <out-dir> (the private store's kind of content: never committed).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cachedText, repairLigatures } from '../../../../../../scripts/lib/pdf-text.mjs';
import { readCsv } from '../../../../../../build/src/csv.js';
import { undescribedBar, barProperty } from '../../../../../../build/src/products.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../../../..');
const outDir = process.argv[2];
if (!outDir) throw new Error('name the folder the batches go to');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const srcById = new Map(db.sources.map((s) => [s.id, s]));
const gradeById = new Map(db.grades.map((g) => [g.id, g]));
const inDataset = new Set(db.materials.map((m) => m.id));
const rows = (f) => readCsv(f).records.map((r) => r.values);
const classified = new Map(rows(join(here, '../../classification.csv')).map((r) => [r.measurementId, r]));
const firstGroups = JSON.parse(readFileSync(join(here, '../groups.json'), 'utf8'));
const firstGroupOf = new Map(firstGroups.map((g) => [`${g.sourceId}\u0000${g.page}`, g.group]));
const pc = rows(join(root, 'data/tables/page_context.csv'));
const pcBySource = new Map();
for (const r of pc) { if (!pcBySource.has(r.SourceID)) pcBySource.set(r.SourceID, []); pcBySource.get(r.SourceID).push(r); }
const pageOf = (loc) => { const m = String(loc ?? '').match(/\bp(?:age|p)?\.?\s*(\d+)/i); return m ? Number(m[1]) : null; };
const DOC = /print|specimen|sample|mou?ld|inject|resin|ISO\s?294|ISO\s?3167|raster|orientation|\bXY\b|\bX-Y\b|\bZX\b|\bXZ\b|upright|flat|supplier|reference material|typical|FDM|FFF|test bar|dog|anneal|layer|nozzle|infill/i;

// The values to read: a bar's property, a bar no document describes, on a product in the dataset, not flagged or held
// back, and left set apart by the first reading for want of an indication (not by a second-pass rule that already names
// what the value is: a resin grade's figure, prose, a literature value, Extrudr's mould shrinkage).
const barProps = new Set(measurementDefs().flatMap((d) => d.valueProperties));
function measurementDefs() { return db.registry.headlines.filter((d) => d.kind === 'measurement' && barProperty(d)); }
const SECOND_PASS = /^second pass: |^second pass$|^m473/;
const values = db.measurements.filter((m) => barProps.has(m.property) && undescribedBar(m) && m.numeric && !m.quarantined && !m.implausible
  && gradeById.get(m.gradeId) && !gradeById.get(m.gradeId).retired && inDataset.has(m.materialId))
  .filter((m) => { const c = classified.get(m.id); return !c || (c.verdict === 'set-apart' && !(SECOND_PASS.test(c.by) && c.kind !== 'none')); });

const byPage = new Map();
for (const m of values) {
  const k = `${m.sourceId}\u0000${pageOf(m.locator) ?? 1}`;
  if (!byPage.has(k)) byPage.set(k, []);
  byPage.get(k).push(m);
}
let fresh = 0;
const texts = new Map();
const groups = [...byPage].map(([k, ms]) => {
  const [sourceId, p] = k.split('\u0000');
  const page = Number(p);
  const s = srcById.get(sourceId);
  if (!texts.has(sourceId)) texts.set(sourceId, s?.sha256 ? cachedText(s.sha256) : null);
  const t = texts.get(sourceId);
  const pageLines = t ? (t.pages.find((x) => x.page === page)?.lines ?? []).map((l) => repairLigatures(l.text)) : [];
  let pageText = pageLines.join('\n');
  if (pageText.length > 12000) pageText = `${pageText.slice(0, 12000)}\n[... page text cut at 12000 characters ...]`;
  const docLines = t ? t.pages.filter((x) => x.page !== page).flatMap((x) => x.lines.map((l) => repairLigatures(l.text)).filter((l) => DOC.test(l)).map((l) => `p${x.page}: ${l.slice(0, 220)}`)).slice(0, 30) : [];
  const group = firstGroupOf.get(k) ?? `U${String(++fresh).padStart(4, '0')}`;
  const valueLines = ms.map((m) => `${m.id} | ${gradeById.get(m.gradeId)?.manufacturer} ${gradeById.get(m.gradeId)?.product} | ${m.property} = ${m.raw?.value ?? m.value} ${m.raw?.unit ?? m.unit} | locator: ${m.locator} | direction: ${m.directionText} | specimen: ${m.specimenType}${m.property === 'HDT' ? ` | load: ${m.thermal?.loadStated ? `${m.thermal.loadMPa} MPa` : 'not stated'}` : ''}`);
  const sibs = db.measurements.filter((m) => m.sourceId === sourceId && pageOf(m.locator) === page && !ms.includes(m) && (m.specimenForm === 'printed' || ['XY', 'Z', 'XZ', 'ZX', 'YX'].includes(m.direction) || m.specimenForm === 'moulded'))
    .slice(0, 12).map((m) => `${m.id} | ${m.property} | direction ${m.directionText} | specimen ${m.specimenType} | ${m.locator}`);
  const ctx = (pcBySource.get(sourceId) ?? []).map((r) => `${r.PageContextID} p${r.Page} scope ${r['Applies to']} table ${r.Table}: "${r.Statement}" -> specimen ${r['Specimen type']}, direction ${r.Direction}`);
  return { group, sourceId, page, publisher: s?.publisher, title: s?.title, sourceClass: s?.sourceClass, firstRead: firstGroupOf.has(k), ids: ms.map((m) => m.id), values: valueLines, sibs, ctx, pageText, docLines, noText: !t };
});
groups.sort((a, b) => (a.publisher ?? '').localeCompare(b.publisher ?? '') || a.sourceId.localeCompare(b.sourceId) || a.page - b.page);
writeFileSync(join(here, 'groups.json'), `${JSON.stringify(groups.map(({ pageText, docLines, ...g }) => g), null, 1)}\n`);

mkdirSync(outDir, { recursive: true });
const batches = [];
let cur = [], size = 0;
for (const g of groups) {
  const len = g.pageText.length + g.values.join('').length + 2000;
  if (cur.length && (size + len > 160000 || cur.length >= 40) && cur.at(-1).publisher !== g.publisher) { batches.push(cur); cur = []; size = 0; }
  if (cur.length && (size + len > 220000 || cur.length >= 60)) { batches.push(cur); cur = []; size = 0; }
  cur.push(g); size += len;
}
if (cur.length) batches.push(cur);
batches.forEach((b, i) => {
  const L = [];
  for (const g of b) {
    L.push(`################ ${g.group} | ${g.sourceId} | page ${g.page} | ${g.publisher} | "${g.title}" | ${g.sourceClass}`);
    L.push('VALUES (the undescribed values to classify):');
    for (const v of g.values) L.push(`  ${v}`);
    if (g.sibs.length) { L.push('OTHER ROWS OF THIS PAGE ALREADY TYPED (printed, a direction, or moulded):'); for (const v of g.sibs) L.push(`  ${v}`); }
    if (g.ctx.length) { L.push('PAGE STATEMENTS ALREADY RECORDED FOR THIS SOURCE (page_context):'); for (const v of g.ctx) L.push(`  ${v}`); }
    L.push(g.noText ? 'PAGE TEXT: (no cached text)' : `PAGE TEXT (page ${g.page}, lines as extracted):\n${g.pageText}`);
    if (g.docLines.length) { L.push('LINES FROM OTHER PAGES OF THE SAME DOCUMENT that mention printing, specimens, moulding, resin or settings:'); for (const v of g.docLines) L.push(`  ${v}`); }
    L.push('');
  }
  writeFileSync(join(outDir, `batch-${String(i + 1).padStart(2, '0')}.txt`), L.join('\n'));
  console.log(`batch-${String(i + 1).padStart(2, '0')}`, b.length, 'groups', b.reduce((a, g) => a + g.ids.length, 0), 'values', L.join('\n').length, 'chars');
});
console.log(groups.length, 'groups,', values.length, 'values,', groups.filter((g) => !g.firstRead).length, 'pages the first reading did not read');
