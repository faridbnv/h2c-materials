#!/usr/bin/env node
// Migration m45: materials.csv carried nine columns that were a constant, a duplicate, or a summary of data the
// build already holds. D47 says what can be calculated is not stored; these had survived it.
//
//   Price basis            a sentence counting the material's own price observations, which compile already counts
//   Headline basis         three sentences chosen by Scope and Representative grade, 102 of 103 rows derivable
//   Measurement conditions two measurement columns concatenated, compiled but rendered nowhere
//   Identity source        "LOCAL-CANON" on all 103 rows
//   Printability rubric    "R-PRINT" on all 103 rows
//   Printability rating    the same ten ratings as the ten evidence rows with Topic "Printability rubric"
//   Fatigue / creep        one sentence on 99 rows; the other four are the four materials with fatigue_tests rows
//   Normalized name        equal to Original name on all 103 rows
//   Impact / toughness     an editorial sentence on 52 rows that the data contradicts (see the cross-tab below)
//
// Limitations keeps its material-specific text. The one sentence 82 rows repeated is true of every material in the
// database, not 82 of them, so it becomes a Method rule the drawer shows once, on every material.
//
// npm run build:diff: the seven compiled fields removed, materials[].limitations edited on 82, two Method rows added.
// headlineBasis and the price basis are unchanged, now derived.
import { fileURLToPath } from 'node:url';
import { openTables, projectRoot } from '../data/table-io.mjs';

export const DROPPED = ['Price basis', 'Measurement conditions', 'Headline basis', 'Identity source',
  'Printability rubric', 'Printability rating 1–5', 'Fatigue / creep', 'Impact / toughness', 'Normalized name'];

const BOILERPLATE_LIMITATION = 'No transferable long-term allowable. Verify grade, conditioning and geometry.';
const FATIGUE_NONE = 'Not published for selected grade in sampled sources';
const M077_BASIS = 'Single-grade observations; mechanical values not published';
const M077_NOTES = 'Exact current Support for PLA (New Version) recorded; current Support for PLA/PETG remains a different product.';

/** The rule compile.js now applies; asserted here row by row before the column is dropped. */
export const headlineBasis = (r) => (r.Scope === 'Family entry' ? 'Family entry: no values of its own; see its member materials'
  : r['Representative grade'] === 'Not published' ? 'Insufficient comparable data'
    : 'Single-grade observations; not a polymer-family range');

export function migrate(t) {
  if (!t.header('materials').includes('Identity source')) return;
  const mats = t.rows('materials');
  const fail = (msg) => { throw new Error(`m45: ${msg}; nothing dropped`); };

  // Every column is dropped only where what it said is either constant, derivable, or held elsewhere.
  for (const [column, value] of [['Identity source', 'LOCAL-CANON'], ['Printability rubric', 'R-PRINT']]) {
    const others = [...new Set(mats.map((r) => r[column]))].filter((v) => v !== value);
    if (others.length) fail(`${column} is no longer always "${value}" (${others.join(', ')})`);
  }
  const renamed = mats.filter((r) => r['Normalized name'] !== r['Original name']);
  if (renamed.length) fail(`Normalized name differs from Original name on ${renamed.map((r) => r.MaterialID).join(', ')}`);

  const basisOff = mats.filter((r) => r['Headline basis'] !== headlineBasis(r) && r.MaterialID !== 'M077');
  if (basisOff.length) fail(`Headline basis is not derivable on ${basisOff.map((r) => r.MaterialID).join(', ')}`);

  const fatigue = new Set(t.rows('fatigue_tests').map((f) => f.MeasurementID));
  const hasFatigue = new Set(t.rows('measurements').filter((x) => fatigue.has(x.MeasurementID)).map((x) => x.MaterialID));
  const claims = mats.filter((r) => r['Fatigue / creep'] !== FATIGUE_NONE).map((r) => r.MaterialID);
  if (claims.join() !== [...hasFatigue].sort().join()) fail(`Fatigue / creep claims ${claims.join(', ')} but fatigue_tests covers ${[...hasFatigue].sort().join(', ')}`);

  const rated = new Map(t.rows('evidence').filter((e) => e.Topic === 'Printability rubric').map((e) => [e.MaterialID, e['Rating 1–5']]));
  const lost = mats.filter((r) => r['Printability rating 1–5'] !== 'Not published' && rated.get(r.MaterialID) !== r['Printability rating 1–5']);
  if (lost.length) fail(`Printability rating has no matching evidence row on ${lost.map((r) => r.MaterialID).join(', ')}`);

  // Impact / toughness is not derivable and the data contradicts it: printed for the record, then dropped.
  const impact = new Set(['Charpy strength', 'Izod impact strength', 'Impact strength', 'Izod strength']);
  const withRows = new Set(t.rows('measurements').filter((x) => impact.has(x.Property)).map((x) => x.MaterialID));
  const says = new Set(mats.filter((r) => r['Impact / toughness'] !== 'Not published').map((r) => r.MaterialID));
  console.log(`m45: Impact / toughness says "see distinct impact records" on ${says.size} materials; ${withRows.size} have impact measurements.`);
  console.log(`m45:   says it with no impact row: ${[...says].filter((x) => !withRows.has(x)).join(', ') || 'none'}`);
  console.log(`m45:   has impact rows but silent: ${[...withRows].filter((x) => !says.has(x)).sort().join(', ')}`);

  // M077 is the one material whose Headline basis said more than the rule: Support for PLA publishes no mechanical
  // values at all. That belongs with its other identity prose, which the drawer shows as "About this entry".
  t.set('materials', 'M077', 'Identity notes', `${M077_NOTES} Its sheet publishes no mechanical values.`, { expect: M077_NOTES });
  t.get('materials', 'M077')['Headline basis'] === M077_BASIS || fail('M077 Headline basis moved');

  // The caveat 82 rows repeated is true of every material here, so it is a rule, shown once.
  let cleared = 0;
  for (const r of mats) {
    if (r.Limitations === BOILERPLATE_LIMITATION) { t.set('materials', r.MaterialID, 'Limitations', 'Not published'); cleared++; }
  }
  console.log(`m45: cleared the general limitation from ${cleared} materials; it is now a Method rule.`);

  t.append('method', { Section: 'Scope', Topic: 'Transferable allowables',
    'Definition / rule': `${BOILERPLATE_LIMITATION} This holds for every material here, and is shown on each; what a material adds to it is in its own limitations.` });
  t.append('method', { Section: 'Scope', Topic: 'Headline basis',
    'Definition / rule': 'A headline is a single-grade observation on the material\'s representative grade, never a polymer-family range. A family entry has no values of its own and points at its members; a material with no representative grade has insufficient comparable data.' });

  // Nothing may cite a source that is not cited by a record: Identity source was what cited LOCAL-CANON.
  t.set('sources', 'LOCAL-CANON', 'Citation role', 'provenance', { expect: 'cited' });

  for (const c of DROPPED) t.dropColumn('materials', c);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables(projectRoot);
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}`);
}
