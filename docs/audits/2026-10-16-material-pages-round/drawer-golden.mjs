#!/usr/bin/env node
// The drawer's golden digests (material pages round, step 1): one SHA-256 per rendered drawer, and one over them all, so
// that moving the drawer's data shaping into app/js/ui/material-facts.js (and its words, scales and labels beside it)
// can be shown to change its HTML by not one byte. Run it on the tree before the change and after, and compare:
//
//   node docs/audits/2026-10-16-material-pages-round/drawer-golden.mjs > before.txt
//   (change the code)
//   node docs/audits/2026-10-16-material-pages-round/drawer-golden.mjs > after.txt && diff before.txt after.txt
//
// It renders renderDrawer in Node with the fake host the tests use (test/drawer-comparisons.test.js), from dist/db.json
// (run `npm run build` first if it is stale), in these sets, in this order:
//
//   a    the tests' minimal context (measurements, evidence and coverage by material; no labels set but the registry):
//        every material, family entries too, on every tab key (Coverage opens Sources at its known gaps), estimates off
//        and on
//   b    the context app/js/main.js builds (buildContext, then recompute's fields), after useRegistry, setH2cBaseline and
//        setEnvironmentLabels as main.js calls them: every material and tab, as Confirmed only, as Include uncertain
//        with estimates shown, and as Include uncertain with estimates unticked and the material on the shortlist
//   h    as b, with a record asked for: Sources opened at a measurement and at a document, Mechanical at a measurement
//   t    the Overview and Products tabs of every material under templates 0, 3 and 4 (app/js/ui/templates.js), answered
//        by runSelection as main.js answers it (with each material's products), as Confirmed only and as Include
//        uncertain; the second also with each material's first passing product chosen; and template 0 once more with
//        annealing allowed and the part conditioned, so each product's answer says the state it is in
//
// Every line is "<set> <case> <material> <tab> <sha256>"; the last is "TOTAL <renders> <sha256 of the lines>". The
// output depends on nothing but the database and the code: no clock, no random number, no locale but the one fmtNumber
// names.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { renderDrawer } from '../../../app/js/ui/detail.js';
import { useRegistry } from '../../../app/js/ui/registry.js';
import { setH2cBaseline, setEnvironmentLabels } from '../../../app/js/ui/labels.js';
import { runSelection, UNKNOWN_POLICY } from '../../../app/js/engine/constraints.js';
import { productsByMaterial } from '../../../app/js/engine/products.js';
import { newScenario } from '../../../app/js/engine/scenario.js';
import { TEMPLATES } from '../../../app/js/ui/templates.js';

const db = JSON.parse(readFileSync(new URL('../../../dist/db.json', import.meta.url), 'utf8'));
// A record asked for makes the drawer look for it (CSS.escape, then querySelector); the fake host finds nothing, so
// nothing scrolls, and the page's own marking of the record (its "target" class) is what is digested.
globalThis.CSS ??= { escape: (s) => String(s) };

const TABS = ['Overview', 'Grades', 'Mechanical', 'Thermal', 'Printing', 'Environment', 'Price', 'Evidence', 'Coverage'];
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const lines = [];

function render(state) {
  const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (s) => (['#drawer-close', '#drawer-pin'].includes(s) ? { addEventListener() {} } : null) };
  renderDrawer(host, { highlightMeasurement: null, highlightSource: null, ...state }, {});
  return host.innerHTML;
}
const record = (set, kase, materialId, tab, html) => lines.push(`${set} ${kase} ${materialId} ${tab} ${sha(html)}`);

const group = (rows, key = 'materialId') => {
  const m = new Map();
  for (const r of rows) { if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(r); }
  return m;
};
const strictScenario = () => ({ ...newScenario(db.meta), created: null, shortlist: [], unknownPolicy: 'strict' });

// ---- a: the tests' context, with only the registry set ----
useRegistry(db.registry);
const minimal = { measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage) };
for (const showEstimates of [false, true]) {
  const ctx = showEstimates ? { ...minimal, showEstimates } : minimal;
  for (const m of db.materials) {
    for (const tab of TABS) {
      record('a', showEstimates ? 'est' : 'noest', m.id, tab, render({ db, selectedMaterialId: m.id, drawerTab: tab, selection: { evaluations: [] }, scenario: { shortlist: [], unknownPolicy: 'strict' }, ctx }));
    }
  }
}

// ---- b: the context main.js builds, after the labels main.js sets ----
setEnvironmentLabels(db.meta.environmentCategories);
setH2cBaseline(db.meta.h2cBaseline);
useRegistry(db.registry);
const base = {
  db,
  measurementsByMaterial: group(db.measurements),
  evidenceByMaterial: group(db.evidence),
  polymerEvidenceByMaterial: group(db.polymerEvidence ?? []),
  coverageByMaterial: group(db.coverage),
  productsByMaterial: productsByMaterial(db),
  unknownPolicy: UNKNOWN_POLICY.STRICT,
};
/** main.js recompute: the context's fields for a scenario and the Estimates tick. */
function contextFor(scenario, useEstimates = true) {
  const ctx = { ...base };
  ctx.unknownPolicy = scenario.unknownPolicy;
  ctx.useEstimates = scenario.unknownPolicy === UNKNOWN_POLICY.EXPLORATION && useEstimates;
  ctx.evidence = scenario.evidence ?? 'comparable';
  ctx.anneal = scenario.anneal === true;
  ctx.annealMaxC = scenario.annealMaxC ?? null;
  ctx.moisture = scenario.moisture === 'conditioned' ? 'conditioned' : 'dry';
  ctx.showEstimates = ctx.useEstimates;
  return ctx;
}
const candidates = db.materials.filter((m) => !m.familyEntry);
const CASES = [
  ['strict', { unknownPolicy: 'strict' }, true, false],
  ['explore', { unknownPolicy: 'exploration' }, true, false],
  ['explore-unticked-pinned', { unknownPolicy: 'exploration' }, false, true],
];
for (const [kase, over, useEstimates, pinned] of CASES) {
  const scenario = { ...strictScenario(), ...over };
  const ctx = contextFor(scenario, useEstimates);
  const selection = runSelection(candidates, scenario.constraints, ctx);
  for (const m of db.materials) {
    const sc = pinned ? { ...scenario, shortlist: [m.id] } : scenario;
    for (const tab of TABS) record('b', kase, m.id, tab, render({ db, selectedMaterialId: m.id, drawerTab: tab, selection, scenario: sc, ctx }));
  }
}

// ---- h: a record asked for ----
{
  const scenario = strictScenario();
  const ctx = contextFor(scenario);
  const selection = runSelection(candidates, scenario.constraints, ctx);
  const mechanical = new Set(db.registry.properties.filter((p) => p.domain === 'mechanical').map((p) => p.name));
  for (const m of db.materials) {
    const ms = base.measurementsByMaterial.get(m.id) ?? [];
    const one = ms[0];
    const mech = ms.find((x) => mechanical.has(x.property));
    const state = { db, selectedMaterialId: m.id, selection, scenario, ctx };
    record('h', 'measurement', m.id, 'Evidence', render({ ...state, drawerTab: 'Evidence', highlightMeasurement: one?.id ?? null }));
    record('h', 'source', m.id, 'Evidence', render({ ...state, drawerTab: 'Evidence', highlightSource: one?.sourceId ?? null }));
    record('h', 'measurement', m.id, 'Mechanical', render({ ...state, drawerTab: 'Mechanical', highlightMeasurement: mech?.id ?? null }));
  }
}

// ---- t: templates 0, 3 and 4, answered as main.js answers them ----
for (const i of [0, 3, 4]) {
  const t = TEMPLATES[i];
  for (const policy of ['strict', 'exploration']) {
    const scenario = { ...strictScenario(), constraints: t.constraints.map((c) => ({ ...c })), template: t.name, unknownPolicy: policy };
    const ctx = contextFor(scenario);
    const selection = runSelection(candidates, scenario.constraints, ctx);
    const runs = [['plain', scenario]];
    if (policy === 'exploration') {
      const decisions = selection.evaluations.flatMap((e) => (e.products ?? []).filter((p) => p.verdict === 'PASS').slice(0, 1).map((p) => ({ gradeId: p.gradeId })));
      runs.push(['chosen', { ...scenario, decisions }]);
    }
    for (const [kase, sc] of runs) {
      for (const m of db.materials) {
        for (const tab of ['Overview', 'Grades']) record('t', `${i}-${policy}-${kase}`, m.id, tab, render({ db, selectedMaterialId: m.id, drawerTab: tab, selection, scenario: sc, ctx }));
      }
    }
  }
}
// The states a product may be judged in (D99): annealed where its sheet states a schedule, and conditioned, so the
// Products tab says which state each product's answer is in.
{
  const scenario = { ...strictScenario(), constraints: TEMPLATES[0].constraints.map((c) => ({ ...c })), template: TEMPLATES[0].name, unknownPolicy: 'exploration', anneal: true, moisture: 'conditioned' };
  const ctx = contextFor(scenario);
  const selection = runSelection(candidates, scenario.constraints, ctx);
  for (const m of db.materials) {
    for (const tab of ['Overview', 'Grades']) record('t', '0-exploration-annealed-conditioned', m.id, tab, render({ db, selectedMaterialId: m.id, drawerTab: tab, selection, scenario, ctx }));
  }
}

const body = lines.join('\n');
process.stdout.write(`${body}\nTOTAL ${lines.length} ${sha(body)}\n`);
