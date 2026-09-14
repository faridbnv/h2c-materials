#!/usr/bin/env node
// Compare two compiled databases (dist/db.json files) and print every difference by path, meta.build
// excluded. Use it to see what a data or rule change did downstream:
//
//   cp dist/db.json /tmp/before.json; <change>; npm run build; node scripts/data/db-diff.mjs /tmp/before.json dist/db.json
//
//   --summary   group differences by path shape (materials[].headline.density.estimate.lo ...)

import { readFileSync } from 'node:fs';

export function diffJson(a, b, root = '') {
  const diffs = [];
  const walk = (x, y, path) => {
    if (x === y) return;
    if (typeof x !== typeof y || x === null || y === null || typeof x !== 'object' || Array.isArray(x) !== Array.isArray(y)) { diffs.push({ path, before: x, after: y }); return; }
    if (Array.isArray(x)) {
      const byId = x.every((e) => e?.id) && y.every((e) => e?.id);
      if (byId) {
        const ym = new Map(y.map((e) => [e.id, e]));
        for (const e of x) walk(e, ym.get(e.id), `${path}[${e.id}]`);
        for (const e of y) if (!x.some((o) => o.id === e.id)) diffs.push({ path: `${path}[${e.id}]`, before: undefined, after: e });
        return;
      }
      if (x.length !== y.length) diffs.push({ path: `${path}.length`, before: x.length, after: y.length });
      for (let i = 0; i < Math.min(x.length, y.length); i++) walk(x[i], y[i], `${path}[${i}]`);
      return;
    }
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], `${path}.${k}`);
  };
  walk(a, b, root);
  return diffs;
}

if (process.argv[1]?.endsWith('db-diff.mjs')) {
  const [before, after] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const load = (p) => { const j = JSON.parse(readFileSync(p, 'utf8')); delete j.meta?.build; return j; };
  const diffs = diffJson(load(before), load(after), 'db');
  const short = (v) => { const s = JSON.stringify(v); return s && s.length > 140 ? `${s.slice(0, 137)}...` : s; };
  if (process.argv.includes('--summary')) {
    const groups = new Map();
    for (const d of diffs) { const k = d.path.replace(/\[[^\]]+\]/g, '[]'); groups.set(k, (groups.get(k) ?? 0) + 1); }
    for (const [k, n] of [...groups].sort((p, q) => q[1] - p[1])) console.log(`${String(n).padStart(6)}  ${k}`);
  } else {
    for (const d of diffs) console.log(`${d.path}\n  before ${short(d.before)}\n  after  ${short(d.after)}`);
  }
  console.log(`${diffs.length} difference(s)`);
}
