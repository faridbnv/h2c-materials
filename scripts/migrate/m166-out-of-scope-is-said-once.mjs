#!/usr/bin/env node
// Migration m166 (2026-09-26): out of scope is said once (the owner's decision 2 of 2026-09-26, docs/GOALS.md).
//
// Phase 5, part 5 (m146) recorded exclusion in Scope alone and gave the fourteen industrial high-temperature materials
// the H2C status "Exceeds H2C limits". Their family still said it a third time, "Industrial High-Temperature - Outside
// H2C Practical Envelope", and the sintering filaments' a second, "Metal and Ceramic Sintering - Outside H2C Scope"; the
// page stripped the first suffix wherever it showed a family. A family now names what the materials are:
// "Industrial High-Temperature" and "Metal and Ceramic Sintering". Scope says they are not candidates, and H2C status
// what the printer can do.
//
// It renames the family on every material that carries it and in heat deflection's Applies to (headline_definitions.csv),
// in step with schema/vocab/families.csv. No other table names a family by these words. A re-run is a no-op, and a run
// after the data moved stops.
//
//   node scripts/migrate/m166-out-of-scope-is-said-once.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm166-out-of-scope-is-said-once';
const RENAME = {
  'Industrial High-Temperature - Outside H2C Practical Envelope': 'Industrial High-Temperature',
  'Metal and Ceramic Sintering - Outside H2C Scope': 'Metal and Ceramic Sintering',
};
// The materials m146 wrote each status for: every one of them, and only they, carry the family renamed.
const EXPECTED = {
  'Industrial High-Temperature': ['M097', 'M098', 'M099', 'M100', 'M101', 'M102', 'M115', 'M117', 'M118', 'M121', 'M122', 'M123', 'M125', 'M127'],
  'Metal and Ceramic Sintering': ['M171', 'M172', 'M173'],
};

const t = openTables();

let n = 0;
for (const m of t.rows('materials')) {
  const to = RENAME[m.Family];
  if (!to) continue;
  if (m.Scope !== 'Excluded') throw new Error(`${migration}: ${m.MaterialID} is in ${m.Family} with Scope ${m.Scope}; the data moved`);
  t.set('materials', m.MaterialID, 'Family', to, { expect: m.Family });
  n++;
}
for (const [family, ids] of Object.entries(EXPECTED)) {
  const have = t.rows('materials').filter((m) => m.Family === family).map((m) => m.MaterialID).sort();
  if (have.join() !== ids.join()) throw new Error(`${migration}: ${family} holds ${have.join(', ')}, not the ${ids.length} materials this was written for`);
}

// Heat deflection applies by family among other fields (D87): the rename is the same list with the new name.
const hdt = t.get('headline_definitions', 'hdt045');
const applies = hdt['Applies to'];
const renamed = Object.entries(RENAME).reduce((s, [from, to]) => s.split(from).join(to), applies);
if (renamed !== applies) { t.set('headline_definitions', 'hdt045', 'Applies to', renamed, { expect: applies }); n++; }
if (/Outside H2C/.test(t.get('headline_definitions', 'hdt045')['Applies to'])) throw new Error(`${migration}: hdt045 still names a suffix`);

for (const name of t.tables()) {
  for (const r of t.rows(name)) {
    for (const [k, v] of Object.entries(r)) if (Object.keys(RENAME).some((from) => String(v ?? '').includes(from))) throw new Error(`${migration}: ${name} ${k} still names "${v}"`);
  }
}

if (n) t.save();
console.log(`${migration}: ${n} cell(s) renamed`);
