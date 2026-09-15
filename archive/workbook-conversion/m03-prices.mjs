#!/usr/bin/env node
// Migration m03: the price headline and the per-kg price are calculated, not typed.
//
// Before: Materials "Price CAD/kg" held a median typed from the observations cited in "Price
// evidence", and Prices "Regular CAD/kg" held list price / net mass from a spreadsheet formula. The
// build checked both copies.
//
// After: the build calculates regular CAD/kg (list price / net mass, to the cent, for rows eligible
// for a median) and the headline (the median of the material's headline-sample observations, to the
// cent, half up). Price evidence is exactly that sample for every material, so it is derived too.
// The migration proves all three on the rows it removes before removing them: the per-kg prices and
// the samples exactly, the headlines within the half cent the build always allowed (PAHT-CF's typed
// 124.48 was the display of the median 124.485; calculated, it is 124.49).

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';

// Half up to the cent, on the decimal value: 124.485 is 124.49, not binary floating point's 124.48.
const cents = (x) => Math.round(Number((x * 100).toPrecision(12))) / 100;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const ids = (cell) => (cell == null ? [] : String(cell).split(/[;,]/).map((s) => s.trim()).filter((s) => s && !/^(not published|not applicable)$/i.test(s)));

export function migrate(t) {
  if (!t.header('prices').includes('Regular CAD/kg')) return; // already applied
  const perKg = (p) => (p['Eligible for median'] === 'TRUE' ? cents(Number(p['List price CAD']) / Number(p['Net mass kg'])) : null);

  for (const p of t.rows('prices')) {
    const stored = p['Regular CAD/kg'] === 'Not applicable' ? null : Number(p['Regular CAD/kg']);
    if (stored !== perKg(p)) throw new Error(`prices ${p.PriceID}: stored ${p['Regular CAD/kg']} is not list price / net mass (${perKg(p)})`);
  }
  for (const mat of t.rows('materials')) {
    const sample = t.rows('prices').filter((p) => p.MaterialID === mat.MaterialID && p['Headline sample'] === 'TRUE' && perKg(p) !== null);
    const cited = ids(mat['Price evidence']);
    if (JSON.stringify(cited) !== JSON.stringify(sample.map((p) => p.PriceID))) throw new Error(`${mat.MaterialID}: Price evidence ${cited.join(', ')} is not its headline sample`);
    const stored = /^\d/.test(mat['Price CAD/kg']) ? Number(mat['Price CAD/kg']) : null;
    const exact = sample.length ? median(sample.map(perKg)) : null;
    const expected = exact === null ? null : cents(exact);
    // The typed median was a spreadsheet display; the old build accepted it within half a cent.
    if ((stored === null) !== (expected === null) || Math.abs(stored - exact) >= 0.005) throw new Error(`${mat.MaterialID}: Price CAD/kg ${mat['Price CAD/kg']} is not the median of its sample (${expected})`);
    if (stored === null && mat['Price CAD/kg'] !== 'Not available in sampled Canadian market') throw new Error(`${mat.MaterialID}: unexpected price state "${mat['Price CAD/kg']}"`);
  }
  t.dropColumn('prices', 'Regular CAD/kg');
  t.dropColumn('materials', 'Price CAD/kg');
  t.dropColumn('materials', 'Price evidence');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables(undefined, { allowMissing: true });
  migrate(t);
  console.log(`${t.save().length} change(s)`);
}
