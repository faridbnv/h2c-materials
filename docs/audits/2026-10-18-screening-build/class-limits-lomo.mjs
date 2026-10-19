#!/usr/bin/env node
// The screening review's later class limits (C32 rows 1 to 4) and C40's fibre checks, tested once on a built database by
// holding out one maker at a time (stage 4, D163 and D164). Read-only: it prints a table and decides nothing.
//
// Cases: one per formulation group (a product and its twins once), each the as-printed, dry, comparable value of a
// product that is no declared variant, of a material that is no undisclosed commercial variant, in the row's class. For
// each maker M, the limit as the ledger would apply it without M's cases is max(the row's sourced value, the extreme of
// every other maker's cases), widened by the headline's test scatter; a case of M beyond it is a false fail: a
// requirement between them would have failed a product that meets it. A row may decide only with no false fail over at
// least 59 groups from at least 8 makers (the exact one-sided 95 % bound on the false-fail rate is then under 5 %).
//
//   node docs/audits/2026-10-18-screening-build/class-limits-lomo.mjs [dist/db.json]
import { readFileSync } from 'node:fs';
import { printedStateOf } from '../../../build/src/registry.js';

const db = JSON.parse(readFileSync(process.argv[2] ?? 'dist/db.json', 'utf8'));
const polymers = new Map(db.polymers.map((p) => [p.id, { Morphology: p.morphology, 'As printed': p.asPrinted ?? 'Not applicable' }]));
const materials = new Map(db.materials.map((m) => [m.id, m]));
const byId = new Map(db.measurements.map((x) => [x.id, x]));
const stateOf = (m) => printedStateOf(polymers.get(m.estimateIdentity), m.modifier);
const isFibre = (m) => m.modifier === 'Carbon fibre' || m.modifier === 'Glass fibre';
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

// One case per formulation group: the as-printed dry comparable value of each eligible product.
function cases(key, inClass, valueOf = (v) => v.value) {
  const seen = new Set(), out = [];
  for (const g of db.grades) {
    const m = materials.get(g.materialId);
    if (!m || g.retired || g.variant || /-R\d+$/.test(g.id) || m.familyEntry || m.excluded || m.modifier === 'Commercial variant / undisclosed' || !inClass(m)) continue;
    const group = g.formulationKey || g.id;
    if (seen.has(group)) continue;
    const v = g.states?.find((s) => !s.treatment && s.moisture === 'dry')?.values?.[key];
    if (v?.level !== 'comparable' || v.value == null || v.from) continue;
    const value = valueOf(v, g, m);
    if (value == null || !Number.isFinite(value)) continue;
    seen.add(group);
    out.push({ gradeId: g.id, maker: String(g.manufacturer ?? '').trim(), material: m.name, value });
  }
  return out;
}

// Leave one maker out, for a ceiling: the limit without M is max(sourced, others' maximum) widened by the scatter.
function lomo(list, { sourced = null, widen }) {
  const makers = [...new Set(list.map((c) => c.maker))];
  const falseFails = [];
  for (const M of makers) {
    const others = list.filter((c) => c.maker !== M).map((c) => c.value);
    const limit = widen(Math.max(sourced ?? -Infinity, ...others));
    for (const c of list.filter((x) => x.maker === M && x.value > limit + 1e-9)) falseFails.push({ ...c, limit: Number(limit.toPrecision(4)) });
  }
  return { cases: list.length, makers: makers.length, falseFails, decides: !falseFails.length && list.length >= 59 && makers.length >= 8 };
}

// Tg of a product: its own sheet's (DSC), else its material's product median, else none.
const tgOf = (g, m) => {
  const own = db.measurements.filter((x) => x.gradeId === g.id && x.property === 'Glass transition temperature' && x.numeric && !x.implausible).map((x) => x.value);
  if (own.length) return median(own);
  const mat = db.measurements.filter((x) => x.materialId === m.id && x.property === 'Glass transition temperature' && x.numeric && !x.implausible).map((x) => x.value);
  return mat.length ? median(mat) : null;
};

const rows = [
  { row: '1', what: 'glassy, unfilled (not PVA or BVOH): elongation at break XY at most 100 %', ...lomo(cases('elongationXY', (m) => stateOf(m) === 'glassy' && m.modifier === 'Unfilled / unspecified' && !['PVA', 'BVOH'].includes(m.estimateIdentity)), { sourced: 100, widen: (x) => x * 1.2 }) },
  { row: '2', what: 'glassy or crystalline, unfilled: tensile modulus XY at most 4.3 GPa', ...lomo(cases('tensileModulusXY', (m) => ['glassy', 'crystalline'].includes(stateOf(m)) && m.modifier === 'Unfilled / unspecified'), { sourced: 4.3, widen: (x) => x * 1.1 }) },
  { row: '3a', what: 'glassy, unfilled: HDT at 0.45 MPa at most Tg + 15 °C', ...lomo(cases('hdt045', (m) => stateOf(m) === 'glassy' && m.modifier === 'Unfilled / unspecified', (v, g, m) => { const tg = tgOf(g, m); return tg == null ? null : v.value - tg; }), { sourced: 15, widen: (x) => x + 5 }) },
  { row: '3b', what: 'glassy, fibre-filled: HDT at 0.45 MPa at most Tg + 25 °C', ...lomo(cases('hdt045', (m) => stateOf(m) === 'glassy' && isFibre(m), (v, g, m) => { const tg = tgOf(g, m); return tg == null ? null : v.value - tg; }), { sourced: 25, widen: (x) => x + 5 }) },
];
// Row 4: per fibre, the matrix's highest unfilled modulus plus k times the fibre content, k the other makers' envelope.
{
  const fibreOf = (g) => { const x = db.measurements.find((y) => y.gradeId === g.id && y.property === 'Fibre content' && y.numeric && !y.nominal); return x ? x.value / 100 : null; };
  const matrixMax = new Map();
  for (const c of cases('tensileModulusXY', (m) => m.modifier === 'Unfilled / unspecified')) {
    const m = db.materials.find((x) => x.name === c.material);
    matrixMax.set(m.estimateIdentity, Math.max(matrixMax.get(m.estimateIdentity) ?? 0, c.value));
  }
  const list = cases('tensileModulusXY', (m) => isFibre(m), (v, g, m) => { const w = fibreOf(g), e0 = matrixMax.get(m.estimateIdentity); return w && e0 ? (v.value - e0) / w : null; });
  rows.push({ row: '4', what: 'fibre-filled: tensile modulus XY at most the matrix\'s highest unfilled one plus k times the fibre content', ...lomo(list, { widen: (x) => x * 1.1 }) });
}

console.log('| Row | Class and limit | Groups | Makers | False fails | Decides |');
console.log('|---|---|---:|---:|---|---|');
for (const r of rows) console.log(`| ${r.row} | ${r.what} | ${r.cases} | ${r.makers} | ${r.falseFails.length ? r.falseFails.map((f) => `${f.maker} ${f.material} ${Number(f.value.toPrecision(4))} over ${f.limit} (${f.gradeId})`).join('; ') : 'none'} | ${r.decides ? 'yes' : 'no'} |`);

// C40, density: a fibre-filled product's density against the rule of mixtures at its stated fibre weight.
{
  const FIBRE = { 'Carbon fibre': 1800, 'Glass fibre': 2550 };
  const out = [];
  let checked = 0;
  for (const g of db.grades) {
    const m = materials.get(g.materialId);
    if (!m || g.retired || !FIBRE[m.modifier]) continue;
    const p = db.polymers.find((x) => x.id === m.estimateIdentity);
    const w = db.measurements.find((y) => y.gradeId === g.id && y.property === 'Fibre content' && y.numeric && !y.nominal);
    const rho = g.states?.[0]?.values?.density;
    if (!p?.neatDensity || !p.sourceId || !w || rho?.level !== 'comparable') continue;
    checked++;
    const mix = (rp) => 1 / ((1 - w.value / 100) / rp + (w.value / 100) / FIBRE[m.modifier]);
    const lo = mix(p.neatDensity.min) * 0.95 * 0.98, hi = mix(p.neatDensity.max) * 1.02;
    if (rho.value < lo || rho.value > hi) out.push(`${g.manufacturer} ${g.product ?? g.name} (${g.id}) ${rho.value} kg/m³ at ${w.value} % ${m.modifier.toLowerCase()}, expected ${Math.round(lo)} to ${Math.round(hi)}`);
  }
  console.log(`\nC40, density by the rule of mixtures (neat density from a sourced polymers.csv row, the stated fibre weight, 5 % voids, ±2 % scatter): ${checked} products checked, ${out.length} outside:`);
  for (const o of out) console.log(`- ${o}`);
}
