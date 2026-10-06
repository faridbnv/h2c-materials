#!/usr/bin/env node
// Leverage: which of the checked values could flip an answer the tool gives (check round 3, 2026-10-05).
//
// Check round 3 reads the measurements that are some product's value and the profile cells that set its print gate
// against their source pages (docs/audits/2026-10-05-check-round-3/TARGETS.csv). Code confirms most of them. A person
// or a model must read the ones where a plausible misreading would change an answer, whatever the code says: those have
// LEVERAGE. This script decides it by recomputation, not by a rule of thumb: it perturbs the compiled database in memory,
// as a reader's misreading would, and re-runs the engine (runSelection's own evaluators) on the questions that could
// notice. Nothing on disk is touched except build/reports/leverage/.
//
// The questions are the ones scripts/audit/decisive-sample.mjs runs, unchanged: the six templates, the six again with
// annealing permitted, and the acceptance portfolio's questions that carry constraints (test/acceptance/portfolio.json),
// all in the strict policy (a product's verdict describes its evidence, so the policy does not change it).
//
// What a misreading is, and what flips
//   value   a measurement that is a product's value (grades[].headline and grades[].states[].values, its own or read from
//           a twin). Perturbed three ways: the value times 0.8, times 1.25 (its interval and uncertainty scaled with it),
//           and removed (the product then has no value of its own for that headline; the build's next-best measurement
//           is not searched for). Perturbed in every place the measurement is a product value, so a twin's copy moves
//           with it. A material's own headline is NOT perturbed: the engine judges a material that has products by
//           its products alone (app/js/engine/products.js productView replaces every headline), so a material's typical
//           value and spread decide nothing in these questions. Leverage: the product's verdict is PASS in one of the
//           two worlds and not in the other, in any question that constrains that headline (the material flips when its
//           count of passing products goes between zero and some; the Why says whether the material does).
//   gate    a profile cell (profiles.csv) or a printer maker's guide cell (print_guide.csv, Kind guide) that sets a
//           print gate. The engine reads the verdicts the build compiled into grades[].print (nozzle, bed, chamber,
//           hardenedNozzle, drying, enclosure), not the cells, so each perturbation is recomputed the way the build does:
//           the cell's parsed object (db.profiles[], db.printGuide[]) is changed, the gate re-derived with the build's own
//           withinH2C (H2C limits from db.meta.h2cBaseline: nozzle 350, bed 120, chamber 65), and the product's recipe
//           re-assembled by the build's rule (own profiles, then a twin's, then the material's guide row; the strongest
//           verdict across profiles), re-implemented here and checked against every compiled grade first (the run stops if
//           it disagrees, see "replica" in the summary). Perturbations:
//             Nozzle/Bed/Chamber °C   a stated window moved by -20, -10, +10, +20 °C (both ends); a stated non-window
//                                     state (not needed, enclosed, recommended, a dash) read as each of the other
//                                     verdicts (within, exceeds, unknown). A silent cell ("Not published") has nothing
//                                     to misread and is not perturbed.
//             Drying                  need required -> optional, optional -> required, not-needed -> optional.
//             Enclosure               recommended <-> not-needed (it also moves the chamber when the chamber was read from
//                                     "no enclosure needed", as readRecipe does).
//             Abrasion / clogging, Nozzle material, Hardened nozzle (guide)
//                                     hardened nozzle needed <-> not needed.
//           Leverage: (a) the product's compiled print state changes in one of build/snapshot/print.csv's six columns
//           (Nozzle, Bed, Chamber, Enclosure, Abrasive, Drying) -- counted for the numeric windows, drying, enclosure and
//           hardened-nozzle perturbations, NOT for the state-reading ones, where the print change is the perturbation
//           itself -- or (b) the product's PASS changes in a question that asks the gate that moved (the templates and
//           S01 ask nozzle, bed and chamber; no question run here asks abrasive, drying or enclosure, so those fields have
//           leverage by (a) alone).
//   guide   perturbed as a gate cell on the guide row itself, for every product of the material the guide is mapped to
//           (variants read none). It has leverage exactly when a product it answers has it by the gate rule.
// Approximations: a perturbation is tested one cell at a time; a multi-profile product where another profile of the same
// axis is stronger shows no flip (correctly: the profile did not decide). Removal of a value does not re-select a
// different measurement. The decimal shift (x10, x0.1) is off by default (--factors 0.8,1.25,10,0.1 turns it on).
//
//   node scripts/audit/leverage.mjs [--targets <csv>] [--db dist/db.json] [--factors 0.8,1.25] [--limit N] [--out <dir>]
//   writes build/reports/leverage/leverage.csv (TargetID, Kind, Record, Field, GradeID, MaterialID, Value, Leverage,
//   Why, Questions, Basis): Questions is the number of questions in which the perturbation flips a product's verdict;
//   Basis says what flips: material (a material's pass/fail), product (a product's), print-state (only a print.csv column), or empty.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, csvText } from '../../build/src/csv.js';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';
import { withinH2C } from '../../build/src/normalize/process.js';
import { GATE_PRECEDENCE } from '../../build/src/gates.js';
import { evaluateProducts, runSelection, UNKNOWN_POLICY } from '../../app/js/engine/constraints.js';
import { productsByMaterial } from '../../app/js/engine/products.js';
import { TEMPLATES } from '../../app/js/ui/templates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : def; };
const targetsPath = flag('targets', join(root, 'docs/audits/2026-10-05-check-round-3/TARGETS.csv'));
const dbPath = flag('db', null);
const FACTORS = flag('factors', '0.8,1.25').split(',').map(Number);
const LIMIT = Number(flag('limit', 0)) || Infinity;
const outDir = flag('out', join(root, 'build/reports/leverage'));
const t0 = performance.now();

// ---------------------------------------------------------------- the database and the questions
let db;
if (dbPath) db = JSON.parse(readFileSync(join(root, dbPath), 'utf8'));
else {
  const wb = loadTables(join(root, 'data'));
  ({ db } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'audit' }));
}
const LIMITS = db.meta.h2cBaseline; // { nozzleC, bedC, chamberC }
const group = (list, key = (x) => x.materialId) => { const m = new Map(); for (const x of list) { const k = key(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };
const baseCtx = { db, productsByMaterial: productsByMaterial(db), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage),
  measurementsByMaterial: group(db.measurements), unknownPolicy: UNKNOWN_POLICY.STRICT,
  measurementById: new Map(db.measurements.map((m) => [m.id, m])), gradeById: new Map(db.grades.map((g) => [g.id, g])) };
const mats = db.materials.filter((m) => !m.familyEntry && !m.excluded);
const matById = new Map(mats.map((m) => [m.id, m]));
const gradeById = baseCtx.gradeById;
const portfolio = JSON.parse(readFileSync(join(root, 'test/acceptance/portfolio.json'), 'utf8'));
const questions = [
  ...TEMPLATES.map((t) => ({ name: t.name, constraints: t.constraints, policy: {} })),
  ...TEMPLATES.map((t) => ({ name: `${t.name}, annealing permitted`, constraints: t.constraints, policy: { anneal: true } })),
  ...portfolio.cases.filter((c) => c.constraints).map((c) => ({ name: c.id, constraints: c.constraints, policy: { anneal: c.policy?.anneal, moisture: c.policy?.moisture } })),
].map((q) => ({ ...q, ctx: { ...baseCtx, ...q.policy } }));

// Which questions can notice a headline or a gate.
const qByKey = new Map();
const qByGate = new Map();
questions.forEach((q, qi) => {
  for (const c of q.constraints) {
    if (c.kind === 'numeric') (qByKey.get(c.property) ?? qByKey.set(c.property, new Set()).get(c.property)).add(qi);
    if (c.kind === 'gate') (qByGate.get(c.gate) ?? qByGate.set(c.gate, new Set()).get(c.gate)).add(qi);
  }
});

// Baseline: each product's verdict in each question, and how many products of each material pass.
const base = questions.map((q) => {
  const verdict = new Map();
  const passing = new Map();
  for (const e of runSelection(mats, q.constraints, q.ctx).evaluations) {
    let n = 0;
    for (const p of e.products ?? []) { verdict.set(p.gradeId, p.verdict); if (p.verdict === 'PASS') n++; }
    passing.set(e.materialId, n);
  }
  return { verdict, passing };
});
const judge = (qi, grade) => evaluateProducts(matById.get(grade.materialId), [grade], questions[qi].constraints, questions[qi].ctx).products[0].verdict;

/** Flips of a set of changed products in the questions `qs`: product flips, and whether each material's pass/fail moves. */
function flipsOf(grades, qs) {
  const out = [];
  for (const qi of qs) {
    const byMat = new Map();
    for (const g of grades) {
      if (!matById.has(g.materialId) || !base[qi].verdict.has(g.id)) continue;
      const was = base[qi].verdict.get(g.id), now = judge(qi, g);
      const m = byMat.get(g.materialId) ?? byMat.set(g.materialId, { delta: 0, flips: [] }).get(g.materialId);
      m.delta += (now === 'PASS' ? 1 : 0) - (was === 'PASS' ? 1 : 0);
      if ((was === 'PASS') !== (now === 'PASS')) m.flips.push({ grade: g, was, now });
    }
    for (const [mid, m] of byMat) {
      if (!m.flips.length) continue;
      const before = base[qi].passing.get(mid) ?? 0;
      const matFlip = (before > 0) !== (before + m.delta > 0);
      for (const f of m.flips) out.push({ qi, mid, ...f, matFlip, before, after: before + m.delta });
    }
  }
  return out;
}

// ---------------------------------------------------------------- values
const entriesByM = new Map(); // MeasurementID -> [{ grade, container, key }]
for (const g of db.grades) {
  if (g.retired) continue;
  const containers = new Set([g.headline, ...(g.states ?? []).map((s) => s.values)].filter(Boolean));
  for (const container of containers) for (const [key, v] of Object.entries(container)) {
    if (v?.measurementId) (entriesByM.get(v.measurementId) ?? entriesByM.set(v.measurementId, []).get(v.measurementId)).push({ grade: g, container, key });
  }
}
const scaled = (v, f) => ({ ...v, value: v.value * f, uncertainty: v.uncertainty == null ? v.uncertainty : v.uncertainty * f,
  interval: v.interval ? { ...v.interval, lo: v.interval.lo == null ? null : v.interval.lo * f, hi: v.interval.hi == null ? null : v.interval.hi * f } : v.interval });
const thresholdText = (qi, key) => questions[qi].constraints.filter((c) => c.kind === 'numeric' && c.property === key).map((c) => `${c.property} ${c.operator} ${c.value}`).join(' and ');
const num = (x) => Number(Number(x).toPrecision(4));

function valueLeverage(row) {
  const ents = entriesByM.get(row.Record) ?? [];
  if (!ents.length) return { lev: false, why: 'Not a product value in this build (the targets may be older than the data)', n: 0 };
  const keys = [...new Set(ents.map((e) => e.key))];
  const qs = new Set(keys.flatMap((k) => [...(qByKey.get(k) ?? [])]));
  if (!qs.size) return { lev: false, why: `No question asks ${keys.join(', ')}`, n: 0 };
  const grades = [...new Set(ents.map((e) => e.grade))].filter((g) => matById.has(g.materialId));
  if (!grades.length) return { lev: false, why: 'Its product is in a material out of scope for every question', n: 0 };
  const perts = [...FACTORS.map((f) => ({ label: `x${f}`, f })), { label: 'removed', f: null }];
  const all = [];
  for (const p of perts) {
    const saved = ents.map((e) => e.container[e.key]);
    ents.forEach((e, i) => { if (p.f == null) delete e.container[e.key]; else e.container[e.key] = scaled(saved[i], p.f); });
    try { for (const f of flipsOf(grades, qs)) all.push({ ...f, pert: p, key: ents.find((e) => e.grade === f.grade)?.key ?? keys[0] }); }
    finally { ents.forEach((e, i) => { e.container[e.key] = saved[i]; }); }
  }
  if (!all.length) return { lev: false, why: `No flip: ${keys.join(', ')} is asked by ${[...qs].map((i) => questions[i].name).slice(0, 3).join('; ')}${qs.size > 3 ? ` and ${qs.size - 3} more` : ''}, but x${FACTORS.join(', x')} and removal change no product's or material's pass/fail`, n: 0 };
  return { lev: true, ...explain(all, (f) => {
    const v = ents.find((e) => e.grade === f.grade && e.key === f.key)?.container[f.key];
    const shown = v && f.pert.f != null ? ` (${num(v.value)} -> ${num(v.value * f.pert.f)})` : v ? ` (${num(v.value)})` : '';
    return `${f.key}${shown} ${f.pert.label}, threshold ${thresholdText(f.qi, f.key)}`;
  }) };
}

/** The Why of a set of flips: the most telling one (a material that flips, then a mild change), and the counts. */
function explain(flips, describe) {
  const rank = (f) => (f.matFlip ? 0 : 1) * 10 + (f.pert.label === 'removed' ? 3 : f.pert.f != null ? 0 : 0) + (f.pert.kind === 'state' ? 2 : 0);
  const best = [...flips].sort((a, b) => rank(a) - rank(b))[0];
  const qn = new Set(flips.map((f) => f.qi));
  const prods = new Set(flips.map((f) => f.grade.id));
  const name = (g) => `${g.manufacturer ?? ''} ${g.product ?? ''}`.trim();
  const why = `${describe(best)}: ${best.grade.id} (${name(best.grade)}) ${best.was} -> ${best.now} in "${questions[best.qi].name}"; material ${best.mid} ${best.matFlip ? `flips (${best.before} -> ${best.after} passing products)` : `does not flip (${best.before} -> ${best.after} passing products)`}. ${qn.size} question(s), ${prods.size} product(s), ${flips.filter((f) => f.matFlip).length ? 'a material flips' : 'no material flips'}`;
  return { why, n: qn.size, qs: qn, basis: flips.some((f) => f.matFlip) ? 'material' : 'product' };
}

// ---------------------------------------------------------------- gates: the build's recipe assembly, replicated
const profileById = new Map(db.profiles.filter((p) => !p.retired).map((p) => [p.id, p]));
const profilesByGrade = group([...profileById.values()], (p) => p.gradeId);
const guideById = new Map((db.printGuide ?? []).map((g) => [g.id, g]));
const guideByMaterial = new Map();
for (const g of db.printGuide ?? []) for (const m of g.materials ?? []) guideByMaterial.set(m.materialId, g);
const TEMP_AXES = ['nozzle', 'bed', 'chamber'];
const LIMIT_OF = { nozzle: LIMITS.nozzleC, bed: LIMITS.bedC, chamber: LIMITS.chamberC };
const speaksTo = (profiles, axis) => {
  switch (axis) {
    case 'nozzle': case 'bed': return profiles.some((p) => p[axis].state !== 'unknown' || p[axis].unparsed);
    case 'chamber': return profiles.some((p) => p.chamber.state !== 'unknown' || p.chamber.unparsed || p.enclosureState !== 'unknown');
    case 'enclosure': return profiles.some((p) => p.enclosureState !== 'unknown');
    case 'hardenedNozzle': return profiles.some((p) => p.abrasion.requiresHardened != null || p.abrasion.state === 'stated' || p.abrasion.unparsed);
    default: return profiles.some((p) => p.drying.need !== 'unknown');
  }
};
const axisValue = (profiles, axis) => {
  if (TEMP_AXES.includes(axis)) {
    if (!profiles.length) return 'unknown';
    const vs = profiles.map((p) => p.gates[axis].verdict);
    return GATE_PRECEDENCE.find((v) => vs.includes(v)) ?? 'unknown';
  }
  if (axis === 'enclosure') {
    const s = profiles.map((p) => p.enclosureState);
    return s.includes('recommended') ? 'recommended' : s.includes('not-needed') ? 'not-needed' : 'unknown';
  }
  if (axis === 'hardenedNozzle') {
    const h = profiles.map((p) => p.abrasion.requiresHardened);
    return h.includes(true) ? 'requires-hardened' : h.includes(false) ? 'no-special-concern' : 'unknown';
  }
  for (const need of ['required', 'optional', 'not-needed']) if (profiles.some((p) => p.drying.need === need)) return need;
  return 'unknown';
};
const AXES = ['nozzle', 'bed', 'chamber', 'enclosure', 'hardenedNozzle', 'drying'];
/** A product's recipe as the build assembles it (build/src/products.js productPrint), with `ov` (id -> object) overriding rows. */
function recipe(grade, ov = new Map()) {
  const sub = (p) => ov.get(p.id) ?? p;
  const own = (profilesByGrade.get(grade.id) ?? []).map(sub);
  const twins = (grade.twins ?? []).map((id) => (profilesByGrade.get(id) ?? []).map(sub));
  let guide = grade.variant ? null : guideByMaterial.get(grade.materialId) ?? null;
  if (guide) guide = sub(guide);
  const out = {};
  for (const axis of AXES) {
    let read = own;
    if (!speaksTo(own, axis)) {
      const twin = axis === 'hardenedNozzle' && own.length ? undefined : twins.find((t) => speaksTo(t, axis));
      const gAnswers = guide && (axis === 'hardenedNozzle' ? guide.abrasion.requiresHardened != null : speaksTo([guide], axis));
      read = twin ?? (gAnswers ? [guide] : own);
    }
    out[axis] = axisValue(read, axis);
  }
  return out;
}
/** The six columns of build/snapshot/print.csv as the compiled grade has them. */
function compiled(g) {
  const p = g.print;
  const t = (a) => ((p?.profileIds.length || p?.from?.[a]) ? p[a].verdict : 'unknown');
  return { nozzle: t('nozzle'), bed: t('bed'), chamber: t('chamber'), enclosure: p?.enclosure ?? 'unknown',
    hardenedNozzle: p?.hardenedNozzle === true ? 'requires-hardened' : p?.hardenedNozzle === false ? 'no-special-concern' : 'unknown', drying: p?.drying?.need ?? 'unknown' };
}
const liveGrades = db.grades.filter((g) => !g.retired);
const baseRecipe = new Map(liveGrades.map((g) => [g.id, recipe(g)]));
let mismatches = 0;
for (const g of liveGrades) {
  const a = compiled(g), b = baseRecipe.get(g.id);
  if (AXES.some((x) => a[x] !== b[x])) { if (mismatches++ < 5) console.error(`replica differs for ${g.id}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); }
}
if (mismatches) { console.error(`leverage: the recipe replica disagrees with the build on ${mismatches} of ${liveGrades.length} products; refusing to continue`); process.exit(1); }

const GATE_OF = { nozzle: 'nozzle', bed: 'bed', chamber: 'chamber', hardenedNozzle: 'abrasive', drying: 'dryingKnown' };
const withEnclosure = (o, st, guide) => {
  let chamber = o.chamber;
  if (chamber.fromEnclosure && st !== 'not-needed') chamber = { text: chamber.text, state: 'unknown', requirement: 'unknown', min: null, max: null };
  else if (!chamber.fromEnclosure && chamber.state === 'unknown' && !chamber.unparsed && st === 'not-needed') chamber = { ...chamber, state: 'not-required', requirement: 'none', fromEnclosure: true };
  const gates = chamber === o.chamber ? o.gates : { ...o.gates, chamber: withinH2C(chamber, LIMITS.chamberC, { partialWindow: true, makerEnclosure: guide ? null : o.enclosure }) };
  return { ...o, enclosureState: st, chamber, gates };
};
const STATE_ALTS = (limit) => ({
  within: { state: 'not-required', requirement: 'none', min: null, max: null },
  exceeds: { state: 'range', requirement: 'required', min: limit + 10, max: limit + 10 },
  unknown: { state: 'unknown', requirement: 'unknown', min: null, max: null, unparsed: true },
});
/** The misreadings of one cell of a profile or guide row: [{ label, kind, obj }]. Empty where the cell is silent. */
function misreadings(o, field, isGuide) {
  const col = field.replace(/ °C$/, '').toLowerCase();
  if (['Nozzle °C', 'Bed °C', 'Chamber °C'].includes(field)) {
    const axis = col, t = o[axis], limit = LIMIT_OF[axis];
    const gate = (nt) => withinH2C(nt, limit, { partialWindow: axis === 'chamber', makerEnclosure: isGuide ? null : o.enclosure });
    const make = (nt, label, kind) => ({ label, kind, obj: { ...o, [axis]: nt, gates: { ...o.gates, [axis]: gate(nt) } } });
    if (t.state === 'range') return [-20, -10, 10, 20].map((d) => make({ ...t, min: t.min == null ? null : t.min + d, max: t.max == null ? null : t.max + d }, `${d > 0 ? '+' : ''}${d} °C`, 'numeric'));
    // A silent cell has nothing to misread; a chamber read from "no enclosure needed" is the Enclosure cell's, not this one's.
    if ((t.state === 'unknown' && !t.unparsed) || t.fromEnclosure) return [];
    const cur = o.gates[axis].verdict;
    return Object.entries(STATE_ALTS(limit)).filter(([v]) => v !== cur).map(([v, patch]) => make({ ...t, ...patch }, `read as ${v}`, 'state'));
  }
  if (field === 'Drying') {
    const alt = { required: 'optional', optional: 'required', 'not-needed': 'optional' }[o.drying.need];
    return alt ? [{ label: `${o.drying.need} -> ${alt}`, kind: 'drying', obj: { ...o, drying: { ...o.drying, need: alt } } }] : [];
  }
  if (field === 'Enclosure') {
    const alt = { recommended: 'not-needed', 'not-needed': 'recommended' }[o.enclosureState];
    return alt ? [{ label: `${o.enclosureState} -> ${alt}`, kind: 'enclosure', obj: withEnclosure(o, alt, isGuide) }] : [];
  }
  if (['Abrasion / clogging', 'Nozzle material', 'Hardened nozzle'].includes(field)) {
    const cur = o.abrasion.requiresHardened;
    return [true, false].filter((v) => v !== cur).map((v) => ({ label: `hardened nozzle ${cur ?? 'unstated'} -> ${v}`, kind: 'abrasion', obj: { ...o, abrasion: { ...o.abrasion, requiresHardened: v } } }));
  }
  return [];
}

function printWith(g, changed) {
  const p = g.print;
  const out = { ...p, profileIds: p.profileIds.length ? p.profileIds : ['_perturbed'] };
  for (const [axis, v] of Object.entries(changed)) {
    if (TEMP_AXES.includes(axis)) out[axis] = { ...p[axis], verdict: v, reason: 'perturbed' };
    else if (axis === 'hardenedNozzle') out.hardenedNozzle = v === 'requires-hardened' ? true : v === 'no-special-concern' ? false : null;
    else if (axis === 'drying') out.drying = { ...(p.drying ?? {}), need: v };
    else out.enclosure = v;
  }
  return out;
}

function gateLeverage(row) {
  const isGuide = row.Kind === 'guide';
  const o = isGuide ? guideById.get(row.Record) : profileById.get(row.Record);
  if (!o) return { lev: false, why: `${isGuide ? 'Guide row' : 'Profile'} not found in this build`, n: 0 };
  const perts = misreadings(o, row.Field, isGuide);
  if (!perts.length) return { lev: false, why: /^not published$/i.test(row.Value) || !row.Value ? 'Silent cell: nothing printed to misread' : `No plausible misreading modelled for this cell's state (${row.Field})`, n: 0 };
  const cands = liveGrades.filter((g) => g.print && (isGuide ? (o.materials ?? []).some((m) => m.materialId === g.materialId) : g.id === o.gradeId || g.twins?.includes(o.gradeId)));
  if (!cands.length) return { lev: false, why: 'No live product reads this row', n: 0 };
  const all = [], printFlips = [];
  for (const p of perts) {
    const ov = new Map([[o.id, p.obj]]);
    const moved = [];
    for (const g of cands) {
      const was = baseRecipe.get(g.id), now = recipe(g, ov);
      const changed = Object.fromEntries(AXES.filter((x) => was[x] !== now[x]).map((x) => [x, now[x]]));
      if (!Object.keys(changed).length) continue;
      moved.push({ g, changed, was });
      if (p.kind !== 'state') for (const x of Object.keys(changed)) printFlips.push({ g, pert: p, axis: x, from: was[x], to: now[x] });
    }
    // Run the questions that ask a gate that moved, with the product's compiled print patched.
    const byQ = new Map();
    for (const m of moved) {
      const qs = new Set(Object.keys(m.changed).filter((x) => GATE_OF[x]).flatMap((x) => [...(qByGate.get(GATE_OF[x]) ?? [])]));
      for (const qi of qs) (byQ.get(qi) ?? byQ.set(qi, []).get(qi)).push(m);
    }
    for (const [qi, ms] of byQ) {
      const saved = ms.map((m) => m.g.print);
      ms.forEach((m) => { m.g.print = printWith(m.g, m.changed); });
      try { for (const f of flipsOf(ms.map((m) => m.g), [qi])) all.push({ ...f, pert: p }); } finally { ms.forEach((m, i) => { m.g.print = saved[i]; }); }
    }
  }
  const lev = all.length > 0 || printFlips.length > 0;
  if (!lev) return { lev, why: `No flip: ${cands.length} product(s) read this cell; ${perts.map((p) => p.label).join(', ')} change neither a print state nor a pass/fail`, n: 0 };
  if (all.length) return { lev, ...explain(all, (f) => `${row.Field} "${String(row.Value).slice(0, 60)}" ${f.pert.label}${isGuide ? ` (guide row ${row.Record})` : ''}`), n: new Set(all.map((f) => f.qi)).size, qs: new Set(all.map((f) => f.qi)) };
  const f = printFlips[0];
  const prods = new Set(printFlips.map((x) => x.g.id));
  return { lev, n: 0, basis: 'print-state', why: `${row.Field} "${String(row.Value).slice(0, 60)}" ${f.pert.label}: ${f.g.id} print state ${f.axis} ${f.from} -> ${f.to} (build/snapshot/print.csv); no question run here asks that gate or its pass/fail holds. ${prods.size} product(s) change print state` };
}

// ---------------------------------------------------------------- run
const targets = readCsv(targetsPath).records.map((r) => r.values).slice(0, LIMIT === Infinity ? undefined : LIMIT);
const rows = [];
const byQuestion = new Map(); // question name -> { value, gate } targets with a flip in it
for (const t of targets) {
  const r = t.Kind === 'value' ? valueLeverage(t) : gateLeverage(t);
  for (const qi of r.qs ?? []) { const c = byQuestion.get(questions[qi].name) ?? byQuestion.set(questions[qi].name, { value: 0, gate: 0, material: 0 }).get(questions[qi].name); c[t.Kind === 'value' ? 'value' : 'gate']++; }
  rows.push({ TargetID: t.TargetID, Kind: t.Kind, Record: t.Record, Field: t.Field, GradeID: t.GradeID, MaterialID: t.MaterialID, Value: t.Value, Leverage: r.lev ? 'yes' : 'no', Why: r.why, Questions: r.n, Basis: r.basis ?? '' });
}
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'leverage.csv'), csvText(['TargetID', 'Kind', 'Record', 'Field', 'GradeID', 'MaterialID', 'Value', 'Leverage', 'Why', 'Questions', 'Basis'], rows));

// ---------------------------------------------------------------- summary
const tally = new Map();
for (const r of rows) { const k = `${r.Kind}\t${r.Field}`; const c = tally.get(k) ?? tally.set(k, { yes: 0, n: 0 }).get(k); c.n++; if (r.Leverage === 'yes') c.yes++; }
console.log(`leverage: ${rows.length} targets, ${rows.filter((r) => r.Leverage === 'yes').length} with leverage; ${questions.length} questions; replica of ${liveGrades.length} products' recipes agrees with the build`);
for (const kind of ['value', 'gate', 'guide']) {
  const mine = [...tally].filter(([k]) => k.startsWith(`${kind}\t`));
  console.log(`${kind}: ${mine.reduce((a, [, c]) => a + c.yes, 0)} of ${mine.reduce((a, [, c]) => a + c.n, 0)}`);
  for (const [k, c] of mine.sort((a, b) => b[1].yes - a[1].yes)) console.log(`  ${k.split('\t')[1].padEnd(42)} ${String(c.yes).padStart(5)} of ${String(c.n).padStart(5)}`);
}
const basis = new Map();
for (const r of rows) if (r.Leverage === 'yes') { const k = `${r.Kind}/${r.Basis}`; basis.set(k, (basis.get(k) ?? 0) + 1); }
console.log(`basis of the leverage: ${[...basis].sort().map(([k, n]) => `${k} ${n}`).join(', ')}`);
// Every perturbation was undone: the questions answer as they did before the first one.
const leaked = questions.filter((q, qi) => runSelection(mats, q.constraints, q.ctx).evaluations.some((e) => (e.products ?? []).some((p) => p.verdict !== base[qi].verdict.get(p.gradeId))));
if (leaked.length) { console.error(`leverage: a perturbation was not undone in ${leaked.map((q) => q.name).join(', ')}`); process.exit(1); }
console.log('by question (targets whose perturbation flips a product in it):');
for (const [name, c] of [...byQuestion].sort((a, b) => b[1].value + b[1].gate - a[1].value - a[1].gate)) console.log(`  ${name.padEnd(48)} value ${String(c.value).padStart(4)}  gate/guide ${String(c.gate).padStart(4)}`);
console.log(`runtime ${((performance.now() - t0) / 1000).toFixed(1)} s; wrote ${join(outDir, 'leverage.csv').replace(`${root}/`, '')}`);
