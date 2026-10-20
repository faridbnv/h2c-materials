#!/usr/bin/env node
// The empirical check behind ADVICE.md: how a heat deflection on a bar no document describes compares with a printed bar's
// of the same product and of the same material, at each load, and with the product's own glass transition, for the
// plastics that cannot crystallise (the values D177 counts, and those a counter-indication keeps apart) and, as the
// contrast, for those that can. Reads a compiled database; run after `npm run build`.
//
//   node docs/audits/2026-10-20-amorphous-heat/empirical.mjs [dist/db.json]
import { readFileSync } from 'node:fs';
import { readCsv } from '../../../build/src/csv.js';

const db = JSON.parse(readFileSync(process.argv[2] ?? 'dist/db.json', 'utf8'));
const can = new Map(readCsv('data/tables/polymers.csv').records.map((r) => [r.values.PolymerID, r.values['Can crystallise']]));
const asPrinted = new Map(readCsv('data/tables/polymers.csv').records.map((r) => [r.values.PolymerID, r.values['As printed']]));
const mat = new Map(db.materials.map((m) => [m.id, m]));
const PRINT = new Set(['XY', 'Z', 'XZ', 'ZX', 'YX', 'raster-45', 'horizontal-source-label', 'vertical-xz-source-label']);
const POINTS = 'Not published (its document points to moulded or resin bars)';
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const r1 = (x) => (x == null ? '–' : (Math.round(x * 10) / 10).toString());
const load = (m) => (!m.thermal?.loadStated ? null : Math.abs(m.thermal.loadMPa - 0.45) <= 0.01 ? '0.45' : Math.abs(m.thermal.loadMPa - 1.8) <= 0.03 ? '1.8' : null);
const bar = (m) => (m.specimenForm === 'printed' || (m.specimenForm === 'not-stated' && PRINT.has(m.direction)) ? 'printed' : m.specimenForm === 'not-stated' ? 'undescribed' : m.specimenForm);
const usable = db.measurements.filter((m) => m.property === 'HDT' && m.numeric && !m.quarantined && !m.implausible && m.gradeId && m.operator === '='
  && m.moistureState !== 'conditioned' && m.postProcessingState !== 'annealed' && !m.outranked && !['Z', 'XZ', 'ZX'].includes(m.direction) && load(m));
const tg = new Map();
for (const m of db.measurements) if (m.property === 'Glass transition temperature' && m.numeric && !m.implausible && m.gradeId) { if (!tg.has(m.gradeId)) tg.set(m.gradeId, []); tg.get(m.gradeId).push(m.value); }
const group = (m) => {
  const id = mat.get(m.materialId)?.estimateIdentity;
  if (can.get(id) === 'no') return bar(m) === 'undescribed' ? (m.countsUndescribed ? 'cannot crystallise, counted' : m.specimenType === POINTS ? 'cannot crystallise, document points to moulding' : 'cannot crystallise, other') : `cannot crystallise, ${bar(m)}`;
  if (can.get(id) === 'yes') return `can crystallise (${asPrinted.get(id) === 'prints amorphous' ? 'prints glassy' : 'crystallises'}), ${bar(m)}`;
  return `other, ${bar(m)}`;
};
const summary = (ds) => (ds.length ? `${ds.length} | ${r1(median(ds))} | ${r1(Math.min(...ds))} to ${r1(Math.max(...ds))} | ${ds.filter((d) => d > 10).length}` : '0 | – | – | –');
const groups = [...new Set(usable.map(group))].filter((g) => !/printed$|moulded$|off-recipe$/.test(g)).sort();
console.log('Differences in °C, the undescribed value minus the other. Same product: products that publish both, n, median, range, how many above by more than 10 °C. Same material: the median of its products\' undescribed values minus that of their printed ones. Glass transition: the product\'s own, where its documents print one.\n');
console.log('| Load | Undescribed bars of (values) | Same product n | median | range | > +10 | Same material n | median | range | > +10 | Minus own Tg n | median | range | > +10 |');
console.log('|---|---|---:|---:|---|---:|---:|---:|---|---:|---:|---:|---|---:|');
for (const L of ['0.45', '1.8']) {
  for (const g of groups) {
    const here = usable.filter((m) => load(m) === L && group(m) === g);
    if (!here.length) continue;
    const printedOf = (pred) => usable.filter((m) => load(m) === L && bar(m) === 'printed' && pred(m)).map((m) => m.value);
    const sameProduct = [...new Set(here.map((m) => m.gradeId))].map((id) => { const p = printedOf((m) => m.gradeId === id); return p.length ? median(here.filter((m) => m.gradeId === id).map((m) => m.value)) - median(p) : null; }).filter((d) => d != null);
    const sameMaterial = [...new Set(here.map((m) => m.materialId))].map((id) => {
      const byG = (pred) => { const per = new Map(); for (const m of usable.filter((x) => load(x) === L && x.materialId === id && pred(x))) { if (!per.has(m.gradeId)) per.set(m.gradeId, []); per.get(m.gradeId).push(m.value); } return [...per.values()].map(median); };
      const p = byG((m) => bar(m) === 'printed'), u = byG((m) => here.includes(m));
      return p.length && u.length ? median(u) - median(p) : null;
    }).filter((d) => d != null);
    const vsTg = here.filter((m) => tg.has(m.gradeId)).map((m) => m.value - median(tg.get(m.gradeId)));
    console.log(`| ${L} MPa | ${g} (${here.length}) | ${summary(sameProduct)} | ${summary(sameMaterial)} | ${summary(vsTg)} |`);
  }
  // Printed bars against their own glass transition, as the yardstick.
  for (const g of ['cannot crystallise', 'can crystallise']) {
    const printed = usable.filter((m) => load(m) === L && bar(m) === 'printed' && can.get(mat.get(m.materialId)?.estimateIdentity) === (g === 'cannot crystallise' ? 'no' : 'yes') && tg.has(m.gradeId)).map((m) => m.value - median(tg.get(m.gradeId)));
    console.log(`| ${L} MPa | printed bars of a plastic that ${g} (the yardstick) | | | | | | | | | ${summary(printed)} |`);
  }
}
