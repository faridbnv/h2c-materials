#!/usr/bin/env node
// UI fuzz: the rendered page against the engine (audit 2026-09-15, workstream A; docs/audits/2026-09-15-filtering-
// estimates-data/ui-fuzz/NOTES.md explains the method and the invariants).
//
// Drives the BUILT page (dist/H2C_Material_Selector_*.html) in headless Chrome over CDP and checks, for thousands
// of seeded random filter scenarios, that what the page shows agrees with the pure engine run in Node and is
// internally consistent. No dependencies: Node's global WebSocket and fetch, and a local Chrome. Part of verify.
//
//   npm run ui:fuzz                     2,000 scenarios (about 2.5 minutes); exit 1 on any violation
//   npm run ui:fuzz -- --n 3000 --seed 7   the audit's full run, or another seed
//   Without Chrome it reports "skipped" and exits 0, unless --require is given (CI).
//
//   node scripts/ui-fuzz.mjs [--n 2000] [--seed 1] [--tabs 8]
//        [--import 0.8]   share of scenarios opened through the in-app "Load a saved scenario" path (no reload);
//                         the rest are opened as a fresh page load of the scenario URL (#hash)
//        [--recycle 40]   reload a tab after this many in-app imports (the page leaks memory per Ashby render)
//        [--roundtrip 0.05] share of scenarios whose link is reopened in a fresh load and compared
//        [--tmp DIR]      scratch directory for the Chrome profile and the scenario files (default: os tmpdir)
//        [--out DIR]      where results.json and violations.jsonl go (default: this directory)
//
// Invariants (see NOTES.md): I1 table rows and verdicts, I2 count and chips, I3 Strict ignores the estimates
// switch, I4 Ashby points/envelopes/front/legend (the catalogue view), I5 display rounding against thresholds, I6
// exceptions, bad tokens and empty reasons, I7 link round trip, I8 monotonicity across policies and when a mandatory
// requirement is added, I9 the filter rail, I10 the Ashby decision view (D107): its marks are exactly the passing products in the states their
// answers are in, at those states' values, and its count names products and materials apart ("N products from K materials", D108).

import { findChrome, launchChrome, skipWithoutChrome } from './lib/cdp.mjs';
import { pageName } from '../build/src/release.js';
import { fmtNumber } from '../app/js/ui/format.js';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : def; };
const N = Number(arg('n', 2000));
const SEED = Number(arg('seed', 1));
const TABS = Number(arg('tabs', 8));
const IMPORT_SHARE = Number(arg('import', 0.8));
const ROUNDTRIP_SHARE = Number(arg('roundtrip', 0.05));
const OUT = resolve(arg('out', join(tmpdir(), 'h2c-ui-fuzz')));
mkdirSync(OUT, { recursive: true });
const TMP_BASE = arg('tmp', null);
// Reload a tab after this many in-app imports. Every Ashby render used to leak a Plotly resize listener and its plot
// (finding A-03); ashby.js now wires one listener for all plots (A-04). The reload stays so a long run measures each
// scenario from a similar heap, not one a new leak has quietly grown.
const RECYCLE = Number(arg('recycle', 40));
const CAP = 50;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { runSelection, compareInterval, STATUS, UNKNOWN_POLICY } = await import(pathToFileURL(join(root, 'app/js/engine/constraints.js')).href);
const { matchesQuery } = await import(pathToFileURL(join(root, 'app/js/engine/search.js')).href);
const { productsByMaterial, productView, stateOf } = await import(pathToFileURL(join(root, 'app/js/engine/products.js')).href);
const { applyAssumptions, toHash, validateScenario } = await import(pathToFileURL(join(root, 'app/js/engine/scenario.js')).href);
const { TEMPLATES } = await import(pathToFileURL(join(root, 'app/js/ui/templates.js')).href);

const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
// As the page does: a material is judged by its products (D83); the build gives its headline as their spread.
const productsOf = productsByMaterial(db);
// The current snapshot's page, never whichever older page sorts first in dist/ (see ui-probe.mjs).
const html = readdirSync(join(root, 'dist')).find((f) => f === pageName(db.meta));
if (!html) { console.error(`No built page for release ${db.meta.release?.id} (data ${db.meta.snapshot}) in dist/; run npm run build`); process.exit(1); }
const pageUrl = pathToFileURL(join(root, 'dist', html)).href;
const candidates = db.materials.filter((m) => !m.familyEntry);
const KEYS = db.registry.headlines.map((h) => h.key);
const BETTER = Object.fromEntries(db.registry.headlines.map((h) => [h.key, h.better]));
const group = (rows, key) => { const m = new Map(); for (const r of rows) { if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(r); } return m; };
const gradeById = new Map(db.grades.map((g) => [g.id, g]));
const baseCtx = { db, productsByMaterial: productsOf, measurementsByMaterial: group(db.measurements, 'materialId'), evidenceByMaterial: group(db.evidence, 'materialId'), polymerEvidenceByMaterial: group(db.polymerEvidence ?? [], 'materialId'), coverageByMaterial: group(db.coverage, 'materialId') };

// ------------------------------------------------------------------ seeded generator

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED * 2654435761);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const chance = (p) => rnd() < p;
const subset = (a) => a.filter(() => chance(0.4));

/** The display rounding step of fmtNumber (app/js/ui/format.js) at a magnitude. */
const roundStep = (v) => { const a = Math.abs(v); return a >= 100 ? 1 : a >= 10 ? 0.1 : a >= 1 ? 0.01 : a > 0 ? 10 ** (Math.floor(Math.log10(a)) - 2) : 0.001; };
const RANGES = { density: [800, 1800], tensileModulusXY: [0.01, 12], tensileStrengthXY: [5, 170], tensileStrengthZ: [2, 90], elongationXY: [1, 700], charpyNotched: [0.5, 80], izodNotched: [0.5, 80], hdt045: [40, 270], glassTransition: [-60, 240], priceCADkg: [20, 300] };
const edges = Object.fromEntries(KEYS.map((k) => {
  const s = new Set();
  const add = (v) => { if (Number.isFinite(v)) s.add(v); };
  for (const m of candidates) {
    const h = m.headline[k]; if (!h) continue;
    add(h.value); add(h.interval?.lo); add(h.interval?.hi);
    const e = h.estimate; if (e) { add(e.lo); add(e.hi); add(e.plausible?.lo); add(e.plausible?.hi); add(e.screenRange?.lo); add(e.screenRange?.hi); }
    for (const b of h.impliedBounds ?? []) add(b.lo);
  }
  return [k, [...s]];
}));
// Headline values the table displays rounded (27.99 shows as "28"): thresholds near them probe I5.
const rounds = (v) => Number(fmtNumber(v).replace(/,/g, '')) !== v;
// A spread's ends are printed too (D83), and probed the same way.
const sensitive = Object.fromEntries(KEYS.map((k) => [k, candidates.map((m) => m.headline[k]).flatMap((h) => (!h?.known ? []
  : [h.value, ...(h.spread?.n > 1 ? [h.spread.min, h.spread.max] : [])]).filter(rounds))]));
const threshold = (k) => {
  if (chance(0.5) && edges[k].length) {
    const v = sensitive[k].length && chance(0.35) ? pick(sensitive[k]) : pick(edges[k]); const st = roundStep(v);
    const r = rnd();
    // Exactly, ± one display step, ± half a step, the displayed (rounded) value, and between the value and its display.
    const shown = Number(fmtNumber(v).replace(/,/g, ''));
    const out = r < 0.3 ? v : r < 0.4 ? v + st : r < 0.5 ? v - st : r < 0.6 ? v + st / 2 : r < 0.7 ? v - st / 2 : r < 0.85 ? shown : (v + shown) / 2;
    return Number(out.toPrecision(12));
  }
  const [a, b] = RANGES[k] ?? [0, 100];
  return Number((a + rnd() * (b - a)).toPrecision(chance(0.5) ? 3 : 6));
};
const H2C = ['Official Bambu product', 'Officially listed family', 'Conditional', 'Theoretical', 'Exceeds H2C limits'];
const REINF = ['carbon-fibre', 'glass-fibre', 'unfilled', 'esd', 'foaming', 'undisclosed'];
const CATS = Object.keys(db.meta.environmentCategories);
const FAMILIES = [...new Set(candidates.map((m) => m.facets.family.value))];
const POLYMERS = [...new Set(candidates.map((m) => m.facets.polymer.value))];
// The rail's pair: some families, then (sometimes) a polymer list over them, as filters.js builds it.
function genFamily() {
  const fams = subset(FAMILIES).slice(0, 3); if (!fams.length) fams.push(pick(FAMILIES));
  const out = [{ kind: 'facet', facet: 'family', in: fams }];
  if (chance(0.4)) {
    const of = POLYMERS.filter((p) => fams.some((f) => p.startsWith(`${f} › `)));
    const chosen = subset(of);
    out.push({ kind: 'facet', facet: 'polymer', in: chosen.length ? chosen : [pick(of)] });
  }
  return out;
}
function genConstraint() {
  // Link-only shapes the rail cannot produce: empty lists, an unknown gate, extreme thresholds.
  if (chance(0.03)) return pick([{ kind: 'gate', gate: 'h2cStatus', in: [] }, { kind: 'facet', facet: 'reinforcement', in: [] }, { kind: 'gate', gate: 'warp' },
    { kind: 'numeric', property: pick(KEYS), operator: pick(['>=', '<=']), value: pick([0, -1, 1e9, 1e-9]), mandatory: true }, { kind: 'numeric', property: 'notAHeadline', operator: '>=', value: 1, mandatory: true }]);
  const kind = pick(['numeric', 'numeric', 'numeric', 'numeric', 'gate', 'gate', 'facet', 'environment', 'evidence']);
  if (kind === 'numeric') { const k = pick(KEYS); return { kind, property: k, operator: pick(['>=', '<=', '>', '<']), value: threshold(k), mandatory: !chance(0.15) }; }
  if (kind === 'gate') {
    return pick([{ kind, gate: 'scope' }, { kind, gate: 'nozzle' }, { kind, gate: 'bed' }, { kind, gate: 'chamber' },
      { kind, gate: 'abrasive', hardenedAvailable: chance(0.3) }, { kind, gate: 'buyable', inStock: chance(0.5) }, { kind, gate: 'dryingKnown' },
      { kind, gate: 'h2cStatus', in: (() => { const s = subset(H2C); return s.length ? s : [pick(H2C)]; })() }]);
  }
  if (kind === 'facet') return pick([{ kind, facet: 'supportMaterial', equals: false }, { kind, facet: 'supportMaterial', equals: chance(0.2) ? true : false }, { kind, facet: 'reinforcement', in: (() => { const s = subset(REINF); return s.length ? s : [pick(REINF)]; })() }, { kind, facet: 'flexible', equals: chance(0.5) },
    { kind, facet: 'family', in: [pick(FAMILIES)] }, { kind, facet: 'polymer', in: [pick(POLYMERS)] }]);
  if (kind === 'environment') return { kind, category: pick(CATS) };
  const spec = {}; if (chance(0.6)) spec.exactGrade = true; if (chance(0.6)) spec.noConflicts = true;
  return { kind, ...spec };
}
const SEARCHES = [...candidates.map((m) => m.name), ...db.materials.filter((m) => m.familyEntry).map((m) => m.name), 'PA-CF', 'pla', 'cf', 'tpu 95', 'zzqx', 'PETG-', 'G020', '  ', 'ö'];
function genScenario(i, prior) {
  const s = { i, parent: null, search: '', assumptions: [] };
  if (prior.length && chance(0.2)) {
    // A child: a previous scenario plus one mandatory requirement (I8).
    const p = pick(prior.slice(-40));
    let extra = genConstraint(); if (extra.kind === 'numeric') extra = { ...extra, mandatory: true };
    Object.assign(s, JSON.parse(JSON.stringify({ constraints: [...p.constraints, extra], search: p.search, assumptions: p.assumptions, plot: p.plot })));
    s.parent = p.i;
  } else if (chance(0.2)) {
    const t = pick(TEMPLATES);
    let cs = t.constraints.map((c) => ({ ...c }));
    if (chance(0.3)) cs.splice(Math.floor(rnd() * cs.length), 1);
    for (const c of cs) {
      if (c.kind === 'numeric' && chance(0.5)) c.value = chance(0.5) ? threshold(c.property) : Number((c.value * (0.8 + rnd() * 0.4)).toPrecision(4));
      if (c.kind === 'numeric' && chance(0.15)) c.mandatory = !c.mandatory;
    }
    if (chance(0.3)) cs.push(genConstraint());
    s.constraints = cs; s.template = t.name;
  } else {
    const n = pick([0, 1, 1, 2, 2, 3, 3, 4, 5]);
    s.constraints = Array.from({ length: n }, genConstraint);
    if (chance(0.15)) s.constraints.push(...genFamily());
    // Two requirements on the same property.
    if (chance(0.1)) { const k = pick(KEYS); s.constraints.push({ kind: 'numeric', property: k, operator: '>=', value: threshold(k), mandatory: true }, { kind: 'numeric', property: k, operator: pick(['<=', '<']), value: threshold(k), mandatory: !chance(0.2) }); }
  }
  if (s.parent === null) {
    if (chance(0.1)) s.assumptions = Array.from({ length: 1 + Math.floor(rnd() * 2) }, () => { const k = pick(KEYS); const a = { materialId: chance(0.15) ? '*' : pick(candidates).id, property: k, value: threshold(k) }; if (!chance(0.2)) a.unit = db.registry.headlines.find((h) => h.key === k).unit; return a; });
    if (chance(0.15)) s.search = pick(SEARCHES);
    const x = pick(KEYS); let y = pick(KEYS); if (y === x) y = KEYS[(KEYS.indexOf(x) + 1) % KEYS.length];
    // The catalogue view keeps I4's material oracle; the decision view is I10's (D107).
    s.plot = { x, y, xLog: chance(0.3), yLog: chance(0.3), showReference: false, showEstimates: chance(0.6), view: chance(0.35) ? 'decision' : 'catalogue', layers: { front: chance(0.7) } };
  }
  s.columnSet = s.parent === null ? (chance(0.15) ? 'printing' : 'properties') : prior[s.parent].columnSet;
  // The states a product may be judged in (D99): annealing permitted, sometimes up to an oven temperature, and the
  // conditioned service state. A child keeps its parent's, so it adds exactly one requirement.
  if (s.parent === null) {
    s.anneal = chance(0.3);
    s.annealMaxC = s.anneal && chance(0.4) ? pick([60, 80, 90, 100, 120, 150]) : null;
    s.moisture = chance(0.15) ? 'conditioned' : 'dry';
  } else Object.assign(s, { anneal: prior[s.parent].anneal, annealMaxC: prior[s.parent].annealMaxC, moisture: prior[s.parent].moisture });
  s.start = pick(['S1', 'S0', 'X0', 'X1']);
  s.startLens = chance(0.5) ? 'table' : 'ashby';
  s.path = chance(IMPORT_SHARE) ? 'import' : 'url';
  s.sample = chance(0.25);            // also read SCREENED on, and FAIL shown
  s.roundtrip = chance(ROUNDTRIP_SHARE);
  return s;
}

const SETTINGS = { S1: { u: 'strict', e: true }, S0: { u: 'strict', e: false }, X0: { u: 'exploration', e: false }, X1: { u: 'exploration', e: true } };
const hashFor = (s, setting, lens) => toHash({ constraints: s.constraints, unknownPolicy: SETTINGS[setting].u, shortlist: [], plot: s.plot, template: s.template ?? null, lens, openMaterial: null, useEstimates: SETTINGS[setting].e, columnSet: s.columnSet ?? 'properties', baseline: null, assumptions: s.assumptions,
  anneal: !!s.anneal, annealMaxC: s.annealMaxC ?? null, moisture: s.moisture ?? 'dry' });
const urlFor = (s, setting, lens, n = s.i) => `${pageUrl}?n=${n}#${hashFor(s, setting, lens)}`;

// ------------------------------------------------------------------ oracle (the engine, as main.js composes it)

const fmtEngine = (v) => (Number.isFinite(v) ? String(Number(v.toFixed(6))) : String(v));
function oracle(s, setting, { screened = false, fail = false } = {}) {
  const { u, e } = SETTINGS[setting];
  const explore = u === UNKNOWN_POLICY.EXPLORATION;
  const ctx = { ...baseCtx, unknownPolicy: u, useEstimates: explore && e, showEstimates: explore && e, anneal: !!s.anneal, annealMaxC: s.annealMaxC ?? null, moisture: s.moisture ?? 'dry' };
  const units = Object.fromEntries(db.registry.headlines.map((h) => [h.key, h.unit]));
  const materials = s.assumptions.length ? candidates.map((m) => applyAssumptions(m, s.assumptions, units).material) : candidates;
  const sel = runSelection(materials, s.constraints, ctx);
  const q = s.search.trim();
  const byId = new Map(materials.map((m) => [m.id, m]));
  const families = q ? db.materials.filter((m) => m.familyEntry && matchesQuery(m, q)) : [];
  const members = new Set(families.flatMap((f) => f.familyEntry.members.map((x) => x.id)));
  const found = sel.evaluations.map((ev) => ({ material: byId.get(ev.materialId), evaluation: ev })).filter(({ material: m }) => matchesQuery(m, q, productsOf.get(m.id) ?? []) || members.has(m.id));
  const showStates = new Set(explore ? ['PASS', 'UNKNOWN'] : ['PASS']); if (fail) showStates.add('FAIL');
  const visible = (ev) => showStates.has(ev.verdict) && (!ev.screened || screened);
  const rows = found.filter(({ evaluation: ev }) => visible(ev));
  // Harness self-test: FZ_MUTATE=rows drops a row from the oracle, FZ_MUTATE=value nudges a headline, so every
  // row/point check must fire. Never set in a real run.
  if (process.env.FZ_MUTATE === 'rows' && rows.length) rows.pop();
  const excluded = q ? found.filter(({ evaluation: ev }) => !visible(ev)) : [];
  const tested = s.constraints.length > 0;
  const { counts } = sel;
  const shown = rows.length, candidateCount = sel.candidates.length;
  // The count names the shown verdicts in a fixed order, never alphabetically, then SCREENED while its chip is on screen
  // and pressed (main.js renderCount).
  const screenedChip = tested && explore && e && sel.counts.screened > 0;
  const label = [...['PASS', 'UNKNOWN', 'FAIL'].filter((v) => showStates.has(v)), ...(screened && screenedChip ? ['SCREENED'] : [])].join(' + ');
  // Then what the shown rows are, in parts that add up to their number: the candidates among them (of how many, when not all
  // are shown), and those shown for another reason. No parts when the rows are exactly the candidates.
  const kinds = { candidate: 0, unchecked: 0, screened: 0, failed: 0 };
  for (const { evaluation: ev } of rows) kinds[ev.eligible ? 'candidate' : ev.screened ? 'screened' : ev.verdict === 'FAIL' ? 'failed' : 'unchecked']++;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const parts = kinds.candidate === shown && shown === candidateCount ? '' : [
    !candidateCount ? 'no candidates' : kinds.candidate === candidateCount ? plural(candidateCount, 'candidate') : `${kinds.candidate} of the ${plural(candidateCount, 'candidate')}`,
    kinds.unchecked ? `${kinds.unchecked} could not be checked` : null,
    kinds.screened ? `${kinds.screened} screened out` : null,
    kinds.failed ? `${kinds.failed} failed` : null,
  ].filter(Boolean).join(', ');
  let count = tested ? `${shown} shown ${label}${parts ? ` · ${parts}` : ''}` : `${shown} material${shown === 1 ? '' : 's'} no requirements set`;
  if (s.search) count += ` matching "${s.search}"${excluded.length ? `, plus ${excluded.length} listed below that your requirements exclude` : ''}`;
  // Each chip leads with a box, ticked while its results are shown (main.js chipText).
  const box = (on) => (on ? '\u2611' : '\u2610');
  const chips = [['PASS', counts.pass], ['UNKNOWN', counts.unknown], ['FAIL', counts.fail]].map(([v, n]) => [!tested, `${box(showStates.has(v))} ${v} ${n}`]);
  chips.push([!(tested && explore && e && counts.screened), `${box(screened)} SCREENED ${counts.screened}`]);
  return { sel, rows, excluded, families, count: count.replace(/\s+/g, ' ').trim(), chips, tested, ctx, materials };
}
function plotOracle(o, plot) {
  // A measured side beside an estimate spans its products (A06); a point's own value is its headline.
  const span = (h) => {
    if (h?.known) { const sp = h.spread; return !h.assumption && sp && Number.isFinite(sp.min) && Number.isFinite(sp.max) && sp.min !== sp.max ? { lo: sp.min, hi: sp.max, measured: true } : { lo: h.value, hi: h.value, measured: true }; }
    const e = h?.estimate; return e && e.lo !== null && e.hi !== null ? { lo: e.lo, hi: e.hi, measured: false } : null;
  };
  const pts = [], est = [];
  let offLog = 0;
  for (const { material: m, evaluation: ev } of o.rows) {
    const hx = m.headline[plot.x], hy = m.headline[plot.y];
    // A value at or below zero has no logarithm (a glass transition below 0 °C): on a Log axis the page leaves it off and
    // counts it apart, never as plotted (D92).
    if (hx?.known && hy?.known && ((plot.xLog && !(hx.value > 0)) || (plot.yLog && !(hy.value > 0)))) { offLog++; continue; }
    if (hx?.known && hy?.known) { pts.push({ id: m.id, x: hx.value * (process.env.FZ_MUTATE === 'value' ? 1.001 : 1), y: hy.value, eligible: ev.eligible, assumed: !!(hx.assumption || hy.assumption) }); continue; }
    if (!o.ctx.showEstimates) continue;
    const x = span(hx), y = span(hy);
    if (x && y && ((plot.xLog && !(x.lo > 0)) || (plot.yLog && !(y.lo > 0)))) offLog++;
    else if (x && y) est.push({ id: m.id, x, y });
  }
  const better = (a, b, g) => (g === 'min' ? a < b : a > b);
  // A scenario assumption is drawn but never joins the front (A-02).
  const el = pts.filter((p) => p.eligible && !p.assumed);
  const front = el.filter((p) => !el.some((q) => q !== p && !better(p.x, q.x, BETTER[plot.x]) && !better(p.y, q.y, BETTER[plot.y]) && (better(q.x, p.x, BETTER[plot.x]) || better(q.y, p.y, BETTER[plot.y]))));
  return { pts, est, envs: plot.showEstimates ? est : [], front, offLog, missing: o.rows.length - pts.length - offLog - est.length };
}

/**
 * The decision view's marks (D107): each passing product of the rows on screen, in the state its answer is in, with both
 * values in that state (a registry-invariant value read from its first state), positive on a Log axis.
 */
function decisionOracle(o, plot) {
  const pairs = [];
  for (const { material: m, evaluation: ev } of o.rows) {
    for (const p of ev.products ?? []) {
      if (p.verdict !== 'PASS') continue;
      const g = gradeById.get(p.gradeId);
      const st = stateOf(g, p.state?.id ?? null);
      const v = productView(m, g, o.ctx, st);
      const hx = v.headline[plot.x], hy = v.headline[plot.y];
      if (!hx?.known || !hy?.known) continue;
      if ((plot.xLog && !(hx.value > 0)) || (plot.yLog && !(hy.value > 0))) continue;
      pairs.push({ key: `${m.id}|${g.id}|${st.id}`, materialId: m.id, x: hx.value, y: hy.value });
    }
  }
  // Harness self-test: FZ_MUTATE=pair drops a mark from the oracle, so I10 must fire. Never set in a real run.
  if (process.env.FZ_MUTATE === 'pair' && pairs.length) pairs.pop();
  return pairs;
}

// ------------------------------------------------------------------ violations

const stats = {}; const sigs = {}; const examples = {};
mkdirSync(OUT, { recursive: true });
const vfile = join(OUT, 'violations.jsonl');
writeFileSync(vfile, '');
const check = (inv) => { stats[inv] ??= { checks: 0, violations: 0 }; stats[inv].checks++; };
function violate(inv, sig, s, setting, detail) {
  stats[inv] ??= { checks: 0, violations: 0 }; stats[inv].violations++;
  const key = `${inv} | ${sig}`; sigs[key] = (sigs[key] ?? 0) + 1;
  examples[inv] ??= 0;
  if (examples[inv] >= CAP) return;
  // At most 8 examples of one signature, so a common pattern cannot crowd out the rest.
  if (sigs[key] > 8) return;
  examples[inv]++;
  const [set, lens] = (setting ?? 'S1|table').split('|');
  appendFileSync(vfile, `${JSON.stringify({ invariant: inv, signature: sig, seed: SEED, scenario: s?.i, setting, search: s?.search || undefined, clicks: /scr|fail/.test(set) ? set : undefined, detail, scenarioJSON: s && { constraints: s.constraints, assumptions: s.assumptions, plot: s.plot, template: s.template, columnSet: s.columnSet }, url: s ? urlFor(s, set.slice(0, 2), lens ?? 'table') : undefined })}\n`);
}

// ------------------------------------------------------------------ comparisons

const ids = (list) => list.map((r) => r.material?.id ?? r[0]).sort();
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const near = (a, b) => a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a)));
const BAD = /\bNaN\b|\bundefined\b|\[object Object\]/;

function compareReading(s, key, r, o) {
  const [set, lens] = key.split('|');
  check('I2-count'); if (r.count !== o.count) violate('I2-count', 'count text differs', s, key, { page: r.count, node: o.count });
  // The count's parts must add up to its number, read from the page alone: "31 shown ... · 23 candidates, 8 screened out".
  const cm = /^(\d+) shown [A-Z +]+(?: · (.*?))?(?: matching "|$)/.exec(r.count);
  if (o.tested) {
    check('I2-count-adds-up');
    const partsText = cm?.[2];
    const sum = partsText === undefined ? Number(cm?.[1]) : partsText.split(', ').reduce((n, part) => n + (/^no candidates$/.test(part) ? 0 : Number(/^(\d+)/.exec(part)?.[1] ?? NaN)), 0);
    if (!cm || sum !== Number(cm[1])) violate('I2-count-adds-up', 'count parts do not add up to the rows shown', s, key, { page: r.count });
  }
  check('I2-chips');
  const pc = r.chips.map(([hidden, text]) => [hidden, text]);
  for (let j = 0; j < 4; j++) {
    const exp = o.chips[j], got = pc[j];
    // A hidden chip's text is not shown; compare text only when visible.
    if (exp[0] !== got[0] || (!exp[0] && exp[1] !== got[1])) { violate('I2-chips', `chip ${exp[1].split(' ')[1]} differs`, s, key, { page: got, node: exp }); break; }
  }
  check('I6-bad-token'); if (r.bad.length) violate('I6-bad-token', `bad token ${r.bad.join(',')} in ${lens}`, s, key, { tokens: r.bad, context: r.badContext });
  if (set === 'X0' || set === 'S0fail') { check('I3-off-estimate'); if (r.estEls || r.dagger || r.envs?.length) violate('I3-off-estimate', `estimate marks with estimates off (${set} ${lens})`, s, key, { estEls: r.estEls, dagger: r.dagger, envs: r.envs?.length }); }
  if (set.startsWith('S')) { check('I3-strict-estimate'); if (r.estEls || r.dagger || r.envs?.length) violate('I3-strict-estimate', `estimate marks in Strict ${lens}`, s, key, { estEls: r.estEls, dagger: r.dagger, envs: r.envs?.length }); }

  if (lens === 'table' && o.tested) {
    check('I2-header');
    const c = o.sel.counts, explore = SETTINGS[set.slice(0, 2)].u === 'exploration';
    const hm = /(\d+) of the (\d+) materials meet/.exec(r.head ?? '');
    // The line under the heading (F09) counts the materials that could not be checked: left out under Confirmed only,
    // listed flagged under Include uncertain, where it also says how many an estimate or the base polymer's published
    // behaviour (D64) screened out of the list.
    const umS = /(\d+) more could not be checked, left out under Confirmed only/.exec(r.head ?? '');
    const umX = /(\d+) more could not be checked, listed flagged(?:, except (\d+) screened out)?/.exec(r.head ?? '');
    const um = explore ? umX : umS;
    const screenedShown = umX?.[2] === undefined ? 0 : Number(umX[2]);
    if (!hm || Number(hm[1]) !== c.pass || Number(hm[2]) !== c.total) violate('I2-header', 'results header pass/total differs', s, key, { head: (r.head ?? '').slice(0, 200), node: [c.pass, c.total] });
    else if ((explore ? umS : umX) || (c.unknown > 0) !== !!um || (um && Number(um[1]) !== c.unknown)
      || (umX && screenedShown !== c.screened)) violate('I2-header', 'results header unknown sentence differs', s, key, { head: (r.head ?? '').slice(0, 320), node: [c.unknown, c.screened, explore] });
    // The rail shows one control per property, so a second requirement on the same property is invisible there.
    for (const k of Object.keys(r.rail ?? {})) {
      const mine = s.constraints.filter((x) => x.kind === 'numeric' && x.property === k);
      check('I9-rail');
      if (mine.length > 1) violate('I9-rail', 'rail shows one of several requirements on a property', s, key, { property: k, requirements: mine.map((x) => `${x.operator} ${x.value}${x.mandatory === false ? ' (tracked)' : ''}`), rail: r.rail[k] });
      else if (mine.length === 1 && (r.rail[k][0] !== mine[0].operator || Number(r.rail[k][1]) !== mine[0].value)) violate('I9-rail', 'rail control disagrees with the requirement', s, key, { property: k, rail: r.rail[k], requirement: mine[0] });
    }
  }
  if (lens === 'table') {
    check('I1-rows');
    const expRows = o.rows.map((x) => x.material.id).sort();
    const gotRows = r.noResults ? [] : r.rows.map((x) => x[0]).sort();
    if (!same(expRows, gotRows)) violate('I1-rows', 'table material set differs', s, key, { onlyPage: gotRows.filter((x) => !expRows.includes(x)), onlyNode: expRows.filter((x) => !gotRows.includes(x)) });
    const noRes = !o.rows.length && !o.excluded.length && !o.families.length;
    check('I1-noresults'); if (noRes !== r.noResults) violate('I1-noresults', 'no-results panel mismatch', s, key, { page: r.noResults, node: noRes });
    const byId = new Map(o.rows.map((x) => [x.material.id, x]));
    for (const [id, verdict, scr, scrTitle, cells] of r.rows) {
      const x = byId.get(id); if (!x) continue;
      const ev = x.evaluation;
      check('I1-verdict');
      const expV = o.tested ? ev.verdict : 'not tested';
      if (verdict !== expV) violate('I1-verdict', `verdict chip ${verdict} vs ${expV}`, s, key, { id, page: verdict, node: expV });
      check('I1-screened');
      if (scr !== (o.tested && ev.screened)) violate('I1-screened', 'screened chip mismatch', s, key, { id, page: scr, node: ev.screened });
      if (scr && !set.includes('scr')) violate('I1-screened', 'screened row shown with SCREENED off', s, key, { id });
      if (scr) {
        // Each screen names what held the row out, an estimate or the base polymer's published behaviour (D64), and the
        // requirement after it; the title starts with one of the two and no "Screened by" is left without a criterion.
        check('I6-empty-reason');
        const prefixed = /^Screened by (an estimate|the base polymer's published behaviour): \S/.test(scrTitle);
        const bare = /Screened by (an estimate|the base polymer's published behaviour):(?!\s\S)/.test(scrTitle);
        if (!prefixed || bare) violate('I6-empty-reason', 'screened chip title has no criterion after its prefix', s, key, { id, scrTitle });
        const expKinds = { estimate: ev.unresolved.some((r) => r.screened && !r.polymerScreen), polymer: ev.unresolved.some((r) => r.screened && r.polymerScreen) };
        if (expKinds.estimate !== /Screened by an estimate:/.test(scrTitle) || expKinds.polymer !== /Screened by the base polymer's published behaviour:/.test(scrTitle)) violate('I6-empty-reason', 'screened chip title names the wrong kind of screen', s, key, { id, scrTitle, expected: expKinds });
        // In the pills' words, never the engine's criterion strings ("hdt045 >= 100").
        check('I6-raw-key');
        const raw = KEYS.find((k) => new RegExp(`(^|[^A-Za-z0-9_])${k}($|[^A-Za-z0-9_])`).test(scrTitle));
        if (raw) violate('I6-raw-key', 'screened chip title names an internal headline key', s, key, { id, key: raw, scrTitle });
      }
      // I5: displayed value against each numeric requirement on that property. A material shown as the spread of its
      // products (D83) prints its range under its typical value; neither end may be rounded across a threshold.
      for (const c of s.constraints) {
        if (c.kind !== 'numeric' || !cells[c.property]) continue;
        const sp = x.material.headline[c.property]?.spread;
        const rm = sp && sp.n > 1 ? /(-?[\d,]*\.?\d+)\u2013(-?[\d,]*\.?\d+)\s*·/.exec(cells[c.property].t) : null;
        if (sp && sp.n > 1) {
          check('I5-spread');
          if (!rm) violate('I5-spread', 'a material with a spread shows no range', s, key, { id, displayed: cells[c.property].t });
          else {
            for (const [end, text] of [[sp.min, rm[1]], [sp.max, rm[2]]]) {
              const shownEnd = Number(text.replace(/,/g, ''));
              if (compareInterval({ lo: end, hi: end }, c.operator, c.value) !== compareInterval({ lo: shownEnd, hi: shownEnd }, c.operator, c.value)) {
                violate('I5-spread', `displayed range end of ${c.property} crosses the threshold (${c.operator})`, s, key, { id, end, displayed: text, requirement: `${c.operator} ${c.value}` });
              }
            }
          }
        }
        const h = x.material.headline[c.property];
        if (!h?.known || h.loadStated === false) continue;
        const iv = h.interval ?? { lo: h.value, hi: h.value, kind: 'point' };
        if (iv.lo !== iv.hi) continue;
        if (cells[c.property].est) continue;
        // The first number in the cell: a price cell also carries the retailer arrow and "out of stock".
        const mm = /^-?[\d,]*\.?\d+/.exec(cells[c.property].t.trim());
        const shownV = mm ? Number(mm[0].replace(/,/g, '')) : NaN;
        check('I5-rounding');
        if (!Number.isFinite(shownV)) continue;
        const actual = compareInterval(iv, c.operator, c.value);
        const seen = compareInterval({ lo: shownV, hi: shownV }, c.operator, c.value);
        const pill = Number(String(Number(Number(c.value).toFixed(4))));   // labels.js n(): the requirement as the pill states it
        const bySeen = compareInterval({ lo: shownV, hi: shownV }, c.operator, pill);
        check('I5-rounding-pill');
        if (actual !== bySeen && actual === seen) violate('I5-rounding-pill', `requirement pill rounds ${c.property} threshold across the value`, s, key, { id, value: h.value, displayed: cells[c.property].t, requirement: `${c.operator} ${c.value}`, pill, criterionResult: actual });
        if (actual !== seen) violate('I5-rounding', `displayed ${c.property} crosses the threshold (${c.operator})`, s, key, { id, name: x.material.name, value: h.value, displayed: cells[c.property].t, requirement: `${c.property} ${c.operator} ${c.value}`, mandatory: c.mandatory !== false, criterionResult: actual, displayedWouldBe: seen, rowVerdict: ev.verdict });
      }
    }
    check('I1-excluded');
    const expEx = o.excluded.map((x) => x.material.id).sort(), gotEx = r.excluded.map((x) => x[0]).sort();
    if (!same(expEx, gotEx)) violate('I1-excluded', 'search-excluded set differs', s, key, { onlyPage: gotEx.filter((x) => !expEx.includes(x)), onlyNode: expEx.filter((x) => !gotEx.includes(x)) });
    for (const [id, , why] of r.excluded) { check('I6-empty-reason'); if (!why || BAD.test(why)) violate('I6-empty-reason', why ? 'bad token in exclusion reason' : 'empty exclusion reason', s, key, { id, why }); }
  } else if (s.plot.view === 'decision') {
    const expect = decisionOracle(o, s.plot);
    check('I10-pairs');
    // The decision marks are the passing ones; a context mark (unsettled or failing) is drawn only while its chip under
    // Also is pressed, and Include uncertain presses the unsettled one (D109).
    const got = r.pairs.filter((q) => q[3] === 'PASS').sort((a, b) => (a[0] < b[0] ? -1 : 1)), want = [...expect].sort((a, b) => (a.key < b.key ? -1 : 1));
    if (!same(got.map((q) => q[0]), want.map((q) => q.key))) violate('I10-pairs', 'decision marks differ from the passing products in their judged states', s, key, { onlyPage: got.map((q) => q[0]).filter((x) => !want.some((q) => q.key === x)).slice(0, 5), onlyNode: want.map((q) => q.key).filter((x) => !got.some((q) => q[0] === x)).slice(0, 5) });
    else {
      check('I10-coords');
      const bad = got.find((q, j) => !near(q[1], want[j].x) || !near(q[2], want[j].y));
      if (bad) violate('I10-coords', 'a decision mark is not at its judged state\'s values', s, key, { key: bad[0], page: [bad[1], bad[2]] });
      check('I10-verdict');
      const context = r.pairs.find((q) => (q[3] === 'UNKNOWN' && !r.layerOn?.unresolved) || (q[3] === 'FAIL' && !r.layerOn?.failed));
      if (context) violate('I10-verdict', 'a context mark drawn while its chip is off', s, key, { key: context[0], verdict: context[3], chips: r.layerOn });
    }
    check('I10-count');
    const n = want.length, k = new Set(want.map((q) => q.materialId)).size;
    const said = /Drawn: (\d+) products? from (\d+) materials?/.exec(r.wsReading ?? '');
    if (!said || Number(said[1]) !== n || Number(said[2]) !== k) violate('I10-count', 'the decision count differs, or does not name products and materials apart', s, key, { page: said?.slice(1), node: [n, k], reading: (r.wsReading ?? '').slice(0, 160) });
    check('I10-mislabel');
    if (/\d+ of \d+ candidates plotted/.test(r.wsReading ?? '')) violate('I10-mislabel', 'a product count read against a material count', s, key, { reading: (r.wsReading ?? '').slice(0, 160) });
  } else {
    const p = plotOracle(o, s.plot);
    check('I4-points');
    const gp = [...r.points].sort((a, b) => (a[0] < b[0] ? -1 : 1)), ep = [...p.pts].sort((a, b) => (a.id < b.id ? -1 : 1));
    if (!same(gp.map((q) => q[0]), ep.map((q) => q.id))) violate('I4-points', 'plotted point set differs', s, key, { onlyPage: gp.map((q) => q[0]).filter((x) => !ep.some((q) => q.id === x)), onlyNode: ep.map((q) => q.id).filter((x) => !gp.some((q) => q[0] === x)) });
    else {
      check('I4-coords');
      const bad = gp.find((q, j) => !near(q[1], ep[j].x) || !near(q[2], ep[j].y));
      if (bad) violate('I4-coords', 'point coordinates differ from headline values', s, key, { id: bad[0], page: [bad[1], bad[2]] });
      check('I4-point-verdict');
      const vById = new Map(o.rows.map((x) => [x.material.id, x.evaluation.verdict]));
      const wrong = gp.find((q) => q[3] !== vById.get(q[0]));
      if (wrong) violate('I4-point-verdict', 'point hover verdict differs', s, key, { id: wrong[0], page: wrong[3], node: vById.get(wrong[0]) });
    }
    // An assumption-backed point is drawn, but must say it is an assumption (A-02).
    for (const q of gp) {
      const m = o.materials.find((mm) => mm.id === q[0]);
      check('I4-assumption-point');
      if ((m?.headline[s.plot.x]?.assumption || m?.headline[s.plot.y]?.assumption) && !/^scenario assumption/.test(q[4] ?? '')) violate('I4-assumption-point', 'scenario assumption drawn as a measured point', s, key, { id: q[0], name: m.name, hover: q[4] });
      if ((s.plot.xLog && !(q[1] > 0)) || (s.plot.yLog && !(q[2] > 0))) violate('I4-log-nonpositive', 'non-positive point on a log axis (counted as plotted, not drawn)', s, key, { id: q[0], x: q[1], y: q[2] });
    }
    check('I4-envelopes');
    const ge = r.envs.map((q) => q[0]).sort(), ee = p.envs.map((q) => q.id).sort();
    if (!same(ge, ee)) violate('I4-envelopes', o.ctx.showEstimates && s.plot.showEstimates ? 'envelope set differs' : 'envelope drawn with estimates off', s, key, { onlyPage: ge.filter((x) => !ee.includes(x)), onlyNode: ee.filter((x) => !ge.includes(x)) });
    for (const q of r.envs) { const pid = gp.find((g) => g[0] === q[0]); if (pid) violate('I4-envelopes', 'material drawn both as point and envelope', s, key, { id: q[0] }); }
    for (const q of p.envs) {
      if ((s.plot.xLog && !(q.x.lo > 0)) || (s.plot.yLog && !(q.y.lo > 0))) { check('I4-log-nonpositive'); violate('I4-log-nonpositive', 'estimate envelope reaches a non-positive value on a log axis', s, key, { id: q.id, x: q.x, y: q.y }); }
    }
    check('I4-front');
    // The front is drawn by its chip (D110): as the engine has it when pressed, and not at all when not.
    const gf = (r.front ?? []).map((q) => `${q[0]},${q[1]}`).sort(), ef = p.front.length > 1 && s.plot.layers?.front ? p.front.map((q) => `${q.x},${q.y}`).sort() : [];
    if (!same(gf, ef)) violate('I4-front', 'Pareto front differs (eligible-only, own dominance)', s, key, { page: gf, node: ef });
    check('I4-legend');
    const m = /(\d+) of (\d+) candidates plotted(?:, (\d+) lack one or both)?/.exec(r.legend);
    if (!m) violate('I4-legend', 'legend sentence not found', s, key, { legend: r.legend.slice(0, 200) });
    else {
      const [pl, tot, miss] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
      if (pl !== p.pts.length || tot !== o.rows.length || miss !== p.missing) violate('I4-legend', 'plotted/total/lacking counts differ', s, key, { page: [pl, tot, miss], node: [p.pts.length, o.rows.length, p.missing] });
      check('I4-log-count');
      const off = /(\d+) more candidates? ha(?:s|ve) a value at or below zero/.exec(r.legend);
      if ((off ? Number(off[1]) : 0) !== p.offLog) violate('I4-log-count', '"N more candidates have a value at or below zero" count differs', s, key, { page: off?.[1] ?? null, node: p.offLog });
      const more = /(\d+) more candidates? ha(?:s|ve) no measurement/.exec(r.legend);
      const outlined = /The outlined ranges are (\d+) material/.exec(r.legend);
      check('I4-estimate-text');
      if ((more ? Number(more[1]) : 0) !== (s.plot.showEstimates ? 0 : p.est.length)) violate('I4-estimate-text', '"N more candidates have ... only an estimated range" count differs', s, key, { page: more?.[1] ?? null, node: s.plot.showEstimates ? 0 : p.est.length });
      if ((outlined ? Number(outlined[1]) : 0) !== p.envs.length) violate('I4-estimate-text', '"The outlined ranges are N" count differs', s, key, { page: outlined?.[1] ?? null, node: p.envs.length });
      // The Show menu's switch stays in place and is greyed, with its reason, exactly when there is nothing to draw (D108).
      if (r.estDisabled !== (p.est.length === 0)) violate('I4-estimate-text', 'Estimated ranges switch enabled without ranges, or greyed with some', s, key, { page: r.estLabel, disabled: r.estDisabled, node: p.est.length });
      // The axis menus name the property and nothing else, so their words never change as the reader works (D108); the
      // counts they carried are the legend's, checked above.
      check('I4-axis-static');
      for (const [which, text] of [['x', r.axisX], ['y', r.axisY]]) {
        const exp = db.registry.headlines.find((h) => h.key === s.plot[which])?.labels?.plain;
        if (text !== exp) violate('I4-axis-static', 'axis menu option is not the property\'s name alone', s, key, { axis: which, page: text, node: exp });
      }
      if (pl + miss + p.est.length + p.offLog !== tot) violate('I4-legend', 'plotted + lacking + estimated + off a Log axis != rows', s, key, { page: [pl, tot, miss], est: p.est.length, offLog: p.offLog });
    }
  }
}

// Engine-side reasons that surface in the drawer, the export and the exclusion list.
function checkReasons(s, o, setting) {
  for (const ev of o.sel.evaluations) {
    for (const res of [...ev.unresolved, ...ev.failed]) {
      check('I6-empty-reason'); check('I6-reason-assumption');
      if (!res.reason || !String(res.reason).trim()) violate('I6-empty-reason', `empty engine reason (${res.constraint.kind}${res.constraint.gate ? ':' + res.constraint.gate : ''})`, s, `${setting}|table`, { id: ev.materialId, criterion: res.criterion });
      else if (res.constraint.kind === 'numeric' && o.materials.find((m) => m.id === ev.materialId)?.headline[res.constraint.property]?.assumption && /^Published /.test(res.reason)) violate('I6-reason-assumption', 'reason calls a scenario assumption "Published"', s, `${setting}|table`, { id: ev.materialId, criterion: res.criterion, reason: res.reason });
      else if (BAD.test(res.reason) || BAD.test(res.criterion)) violate('I6-bad-token', `bad token in engine reason (${res.constraint.kind}${res.constraint.property ? ':' + res.constraint.property : ''})`, s, `${setting}|table`, { id: ev.materialId, criterion: res.criterion, reason: res.reason });
    }
  }
}

// ------------------------------------------------------------------ page side

const PAGE_HELPER = String.raw`window.__fz = (() => {
  const txt = (el) => (el?.innerText ?? '').replace(/\s+/g, ' ').trim();
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const BAD = /\bNaN\b|\bundefined\b|\bnull\b|\[object Object\]/g;
  const chips = () => ['s-pass', 's-unknown', 's-fail', 's-screened'].map((id) => { const e = document.getElementById(id); return [e.hidden, e.textContent.trim(), e.disabled]; });
  function read(keys) {
    const lens = document.getElementById('lens');
    const lensText = lens.innerText;
    const count = txt(document.getElementById('count'));
    const ch = chips();
    const out = { count, chips: ch, h: hash(count + '|' + JSON.stringify(ch) + '|' + lensText.replace(/\s+/g, ' ')), estEls: lens.querySelectorAll('.est').length, dagger: lensText.includes('†') };
    const plot = document.getElementById('plot');
    out.head = txt(lens.querySelector('.active-head'));
    out.rail = {};
    for (const k of keys) { const v = document.querySelector('[data-value-for="' + k + '"]'); if (v) out.rail[k] = [document.querySelector('[data-op-for="' + k + '"]').value, v.value, document.querySelector('[data-soft="' + k + '"]')?.checked ?? null]; }
    let badSrc = lensText + ' ' + count;
    if (plot) {
      out.points = []; out.envs = []; out.front = null;
      for (const t of plot.data ?? []) {
        if (t.legendgroup === 'pareto') out.front = t.x.map((x, i) => [x, t.y[i]]);
        else if (typeof t.hovertemplate === 'string' && t.hovertemplate.includes('Estimated material range')) out.envs.push([t.customdata[0][0], t.x, t.y]);
        else if (Array.isArray(t.customdata) && t.customdata[0]?.length === 8) t.customdata.forEach((cd, i) => out.points.push([cd[0], t.x[i], t.y[i], cd[2], cd[7]]));
        else if (Array.isArray(t.customdata) && t.customdata[0]?.length === 9) t.customdata.forEach((cd, i) => (out.pairs ??= []).push([cd[8], t.x[i], t.y[i], cd[2], cd[0]]));
        badSrc += ' ' + (t.name ?? '') + ' ' + (Array.isArray(t.text) ? t.text.join(' ') : '') + ' ' + (t.hovertemplate ?? '');
      }
      // Its text whether or not the reader has opened it (D111 folds it, as the other views do).
      out.legend = (lens.querySelector('.legend-note')?.textContent ?? '').replace(/\s+/g, ' ').trim();
      out.pairs ??= [];
      out.wsReading = txt(lens.querySelector('.ws-summary')) + ' ' + txt(lens.querySelector('.ws-reading'));
      out.layerOn = Object.fromEntries(['unresolved', 'failed'].map((k) => [k, lens.querySelector('button[data-layer="' + k + '"]')?.getAttribute('aria-pressed') === 'true']));
      out.axisX = document.querySelector('#ashby-x option:checked')?.textContent.trim();
      out.axisY = document.querySelector('#ashby-y option:checked')?.textContent.trim();
      out.estLabel = lens.querySelector('[data-show-estimates]')?.closest('label')?.textContent.replace(/\s+/g, ' ').trim() ?? null;
      out.estDisabled = !!lens.querySelector('[data-show-estimates]')?.disabled;
      out.estState = txt(lens.querySelector('.plot-data-state'));
    } else {
      const grid = [...lens.querySelectorAll('table.grid')].find((t) => !t.closest('.excluded-group'));
      out.noResults = !grid && !lens.querySelector('.excluded-group') && !lens.querySelector('.table-bar');
      out.rows = [];
      if (grid) {
        const cols = [...grid.querySelectorAll('thead th')].map((th) => th.dataset.sort ?? 'pin');
        const vi = cols.indexOf('verdict');
        for (const tr of grid.querySelectorAll('tbody tr[data-material]:not(.baseline-row)')) {
          const tds = tr.children;
          const scr = tds[vi].querySelector('.chip-screened');
          const cells = {};
          for (const k of keys) { const j = cols.indexOf(k); if (j >= 0) cells[k] = { t: tds[j].innerText.trim(), est: !!tds[j].querySelector('.est') }; }
          out.rows.push([tr.dataset.material, tds[vi].querySelector('.chip')?.textContent.trim(), !!scr, scr?.title ?? '', cells]);
        }
      }
      out.excluded = [...lens.querySelectorAll('.excluded-group tbody tr[data-material]')].map((tr) => [tr.dataset.material, tr.querySelector('.chip')?.textContent.trim(), txt(tr.querySelector('.why-cell'))]);
    }
    const m = badSrc.match(BAD);
    out.bad = m ? [...new Set(m)] : [];
    if (m) { const at = badSrc.search(BAD); out.badContext = badSrc.slice(Math.max(0, at - 80), at + 40); }
    return out;
  }
  const click = (sel) => { const e = document.querySelector(sel); if (!e) throw new Error('no ' + sel); e.click(); };
  const setEst = (on) => { const c = document.getElementById('use-estimates'); c.checked = on; c.dispatchEvent(new Event('change')); };
  const cur = () => ({ u: document.getElementById('mode-explore').getAttribute('aria-pressed') === 'true' ? 'X' : 'S', e: document.getElementById('use-estimates').checked });
  function go(target) {
    const want = { u: target[0], e: target[1] === '1' };
    let c = cur();
    if (c.e !== want.e) setEst(want.e);
    c = cur();
    if (c.u !== want.u) click(want.u === 'X' ? '#mode-explore' : '#mode-strict');
    if (document.getElementById('use-estimates').checked !== want.e) setEst(want.e);
  }
  // plan: { search, order: ['S1','S0',...], lens0, keys, sample }
  function run(plan) {
    const s = document.getElementById('search');
    s.value = plan.search; s.dispatchEvent(new Event('input'));
    const other = plan.lens0 === 'table' ? 'ashby' : 'table';
    const res = {};
    const both = (name) => {
      res[name + '|' + plan.lens0] = read(plan.keys);
      click('[data-lens="' + other + '"]');
      res[name + '|' + other] = read(plan.keys);
      click('[data-lens="' + plan.lens0 + '"]');
    };
    for (const st of plan.order) {
      go(st);
      both(st);
      if (plan.sample && st === 'X1' && !document.getElementById('s-screened').hidden) {
        click('#s-screened'); both('X1scr'); click('#s-screened');
      }
      if (plan.sample && st === 'S0' && !document.getElementById('s-fail').disabled && !document.getElementById('s-fail').hidden) {
        click('#s-fail'); both('S0fail'); click('#s-fail');
      }
    }
    return res;
  }
  return { run, read };
})(); true`;

// ------------------------------------------------------------------ chrome

const tmpRoot = TMP_BASE ? (mkdirSync(TMP_BASE, { recursive: true }), mkdtempSync(join(TMP_BASE, 'fz-'))) : mkdtempSync(join(tmpdir(), 'h2c-fuzz-'));
const profile = join(tmpRoot, 'profile'); mkdirSync(profile);
const chromePath = findChrome();
if (!chromePath) skipWithoutChrome('ui:fuzz');
const { proc, port } = await launchChrome(chromePath, profile, ['--disable-background-timer-throttling', '--disable-renderer-backgrounding']);
const ws = new WebSocket((await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let nid = 0; const pending = new Map(); const sessions = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); return; }
  const t = msg.sessionId && sessions.get(msg.sessionId);
  if (t) t.onEvent(msg.method, msg.params);
};
// A call Chrome never answers fails the run instead of leaving it waiting with no output (ui-probe.mjs, CALL_MS).
const CALL_MS = 60000;
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++nid;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome did not answer ${method} within ${CALL_MS / 1000} s`)); }, CALL_MS);
  pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

async function openTab(k) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const t = { k, sessionId, errors: [], dialogs: [], chooser: null };
  t.onEvent = (method, p) => {
    if (method === 'Runtime.exceptionThrown') t.errors.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text);
    else if (method === 'Runtime.consoleAPICalled' && p.type === 'error') t.errors.push(p.args.map((a) => a.value ?? a.description).join(' '));
    else if (method === 'Log.entryAdded' && p.entry.level === 'error' && !/favicon/.test(p.entry.text)) t.errors.push(p.entry.text);
    else if (method === 'Page.javascriptDialogOpening') { t.dialogs.push(p.message); send('Page.handleJavaScriptDialog', { accept: true }, sessionId).catch(() => {}); }
    else if (method === 'Page.fileChooserOpened') { const c = t.chooser; t.chooser = null; c?.(p); }
  };
  sessions.set(sessionId, t);
  await send('Runtime.enable', {}, sessionId); await send('Page.enable', {}, sessionId); await send('Log.enable', {}, sessionId);
  await send('Page.setInterceptFileChooserDialog', { enabled: true }, sessionId);
  t.ev = async (expression, userGesture = false) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  t.until = async (expr, what, ms = 20000) => { for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(10)) { if (await t.ev(expr).catch(() => false)) return; } throw new Error(`timeout: ${what}`); };
  t.load = async (url) => {
    await send('Page.navigate', { url }, sessionId);
    await sleep(30);
    await t.until(`document.readyState === 'complete' && !!document.getElementById('count')?.textContent.trim() && !!document.getElementById('lens')?.children.length`, 'page render');
    await t.ev(PAGE_HELPER);
    t.loaded = true; t.sinceLoad = 0;
  };
  t.file = join(tmpRoot, `tab${k}.json`);
  t.importScenario = async (s, setting, lens) => {
    const { u, e } = SETTINGS[setting];
    writeFileSync(t.file, JSON.stringify({ version: 2, constraints: s.constraints, unknownPolicy: u, useEstimates: e, assumptions: s.assumptions, plot: s.plot, lens, template: s.template ?? null, shortlist: [], columnSet: s.columnSet, anneal: !!s.anneal, annealMaxC: s.annealMaxC ?? null, moisture: s.moisture ?? 'dry' }));
    let timer;
    const opened = new Promise((r, j) => { t.chooser = r; timer = setTimeout(() => j(new Error('no file chooser')), 5000); });
    opened.catch(() => {});   // a failed click must not leave an unhandled rejection behind (it killed a 3000-scenario run)
    try { await t.ev(`(() => { const m = document.createElement('i'); m.id = 'fz-mark'; document.getElementById('lens').appendChild(m); document.getElementById('btn-scenario').click(); document.getElementById('sc-import').click(); return true; })()`, true);
    const p = await opened;
    await send('DOM.setFileInputFiles', { files: [t.file], backendNodeId: p.backendNodeId }, sessionId);
    } finally { clearTimeout(timer); t.chooser = null; }
    await t.until(`!document.getElementById('fz-mark')`, 'import render', 5000);
  };
  return t;
}

// ------------------------------------------------------------------ run

const t0 = Date.now();
const scenarios = [];
for (let i = 0; i < N; i++) scenarios.push(genScenario(i, scenarios));
const rendered = new Map();   // i -> { S1: ids, X0: ids, X1: ids }
let next = 0, done = 0, loads = 0, imports = 0, importFallbacks = 0, readings = 0, roundtrips = 0;
const timing = { load: 0, import: 0, run: 0, oracle: 0 };

function perms(start) {
  const rest = ['S1', 'S0', 'X0', 'X1'].filter((x) => x !== start);
  for (let j = rest.length - 1; j > 0; j--) { const k = Math.floor(rnd() * (j + 1)); [rest[j], rest[k]] = [rest[k], rest[j]]; }
  return [start, ...rest];
}

async function worker(t) {
  while (next < scenarios.length) {
    const s = scenarios[next++];
    s.order = perms(s.start);
    t.errors.length = 0; t.dialogs.length = 0;
    // The page validates what a link or file carries and leaves out what it cannot evaluate, with a warning (A-05, A-06).
    // The page is sent the raw scenario; the oracle and the checks use what validation keeps.
    const validated = validateScenario({ version: 1, constraints: s.constraints, assumptions: s.assumptions }, db.meta,
      { materialIds: new Set(db.materials.map((m) => m.id)), headlineKeys: new Set(KEYS) });
    s.expectedDialogs = validated.warnings;
    const raw = s.constraints;
    const keys = [...new Set(validated.scenario.constraints.filter((c) => c.kind === 'numeric').map((c) => c.property))];
    let res;
    try {
      let a = Date.now();
      if (s.path === 'import' && t.loaded && (t.sinceLoad ?? 0) < RECYCLE) {
        // The detached file input can be collected before Chrome resolves it; fall back to a fresh load.
        try { await t.importScenario(s, s.start, s.startLens); imports++; t.sinceLoad = (t.sinceLoad ?? 0) + 1; timing.import += Date.now() - a; }
        catch (err) { importFallbacks++; await t.load(urlFor(s, s.start, s.startLens)); loads++; s.path = 'url'; }
      }
      else { await t.load(urlFor(s, s.start, s.startLens)); loads++; timing.load += Date.now() - a; s.path = 'url'; }
      a = Date.now();
      if (process.env.FZ_DUMP && s.i === Number(process.env.FZ_DUMP)) console.log('DUMP', JSON.stringify(s).slice(0, 600));
      res = await t.ev(`__fz.run(${JSON.stringify({ search: s.search, order: s.order, lens0: s.startLens, keys, sample: s.sample })})`);
      timing.run += Date.now() - a;
    } catch (err) {
      violate('H-harness', `harness error: ${err.message.split('\n')[0].slice(0, 80)}`, s, `${s.start}|${s.startLens}`, { error: err.message.slice(0, 400), errors: t.errors.slice(0, 3), dialogs: t.dialogs });
      t.loaded = false; done++; continue;
    }
    if (process.env.FZ_DUMP && s.i === Number(process.env.FZ_DUMP)) for (const [k, v] of Object.entries(res)) console.log('DUMP', k, JSON.stringify(v).slice(0, 700));
    s.constraints = validated.scenario.constraints;
    s.rawConstraints = raw;
    const a = Date.now();
    check('I6-exception');
    if (t.errors.length) violate('I6-exception', `page error: ${t.errors[0].split('\n')[0].slice(0, 80)}`, s, `${s.start}|${s.startLens}`, { errors: t.errors.slice(0, 5) });
    check('I6-dialog');
    const unexpected = t.dialogs.flatMap((d) => d.split('\n')).map((l) => l.trim()).filter((l) => l && !s.expectedDialogs.includes(l));
    if (unexpected.length) violate('I6-dialog', `dialog: ${unexpected[0].slice(0, 80)}`, s, `${s.start}|${s.startLens}`, { dialogs: t.dialogs });
    const cache = {};
    const or = (set) => (cache[set] ??= oracle(s, set.slice(0, 2), { screened: set.includes('scr'), fail: set.includes('fail') }));
    for (const [key, r] of Object.entries(res)) { compareReading(s, key, r, or(key.split('|')[0])); readings++; }
    checkReasons(s, or('X1'), 'X1'); checkReasons(s, or('S1'), 'S1');
    // I3: Strict renders identically whatever the estimates switch says.
    for (const lens of ['table', 'ashby']) {
      check('I3-strict-identical');
      if (res[`S1|${lens}`].h !== res[`S0|${lens}`].h) {
        const a1 = res[`S1|${lens}`], a0 = res[`S0|${lens}`];
        violate('I3-strict-identical', `Strict ${lens} differs with estimates on/off`, s, `S1|${lens}`, { count: [a1.count, a0.count], chips: [a1.chips, a0.chips], rows: [a1.rows?.length, a0.rows?.length], points: [a1.points?.length, a0.points?.length], legend: [a1.legend?.slice(0, 160), a0.legend?.slice(0, 160)] });
      }
    }
    // I8: rendered candidate sets across policies.
    const set = (k) => new Set((res[`${k}|table`].noResults ? [] : res[`${k}|table`].rows).map((x) => x[0]));
    const R = { S1: set('S1'), X1: set('X1'), X0: set('X0') };
    check('I8-mono-policy');
    const notIn = (a, b) => [...a].filter((x) => !b.has(x));
    if (notIn(R.S1, R.X1).length) violate('I8-mono-policy', 'Strict row missing from Explore+estimates', s, 'X1|table', { ids: notIn(R.S1, R.X1) });
    if (notIn(R.X1, R.X0).length) violate('I8-mono-policy', 'Explore+estimates row missing from Explore no-estimates', s, 'X0|table', { ids: notIn(R.X1, R.X0) });
    rendered.set(s.i, R);
    if (s.parent !== null && rendered.has(s.parent)) {
      const P = rendered.get(s.parent);
      for (const k of ['S1', 'X0', 'X1']) { check('I8-mono-add'); const extra = notIn(R[k], P[k]); if (extra.length) violate('I8-mono-add', `adding a mandatory requirement adds a row (${k})`, s, `${k}|table`, { parent: s.parent, added: extra }); }
    }
    timing.oracle += Date.now() - a;
    // I7: reopen one setting's link in a fresh load and compare what a reader sees.
    if (s.roundtrip) {
      const st = pick(['S1', 'S0', 'X0', 'X1']), lens = pick(['table', 'ashby']);
      try {
        await t.load(urlFor(s, st, lens, `rt${s.i}`)); loads++; roundtrips++;
        const r = await t.ev(`(() => { const q = document.getElementById('search'); q.value = ${JSON.stringify(s.search)}; q.dispatchEvent(new Event('input')); return __fz.read(${JSON.stringify(keys)}); })()`);
        const before = res[`${st}|${lens}`];
        check('I7-roundtrip');
        const rowsOf = (x) => JSON.stringify(x.rows ? x.rows.map((y) => [y[0], y[1], y[2]]) : [x.points, x.envs, x.front]);
        if (r.count !== before.count || JSON.stringify(r.chips) !== JSON.stringify(before.chips) || rowsOf(r) !== rowsOf(before)) violate('I7-roundtrip', `link reopened differs (${lens})`, s, `${st}|${lens}`, { count: [before.count, r.count], chips: [before.chips, r.chips] });
        else if (r.h !== before.h) { check('I7-roundtrip-text'); violate('I7-roundtrip-text', `link reopened: same rows, different text (${lens})`, s, `${st}|${lens}`, { note: 'lens text hash differs' }); }
      } catch (err) { violate('H-harness', `roundtrip error: ${err.message.slice(0, 80)}`, s, `${st}|${lens}`, { error: err.message.slice(0, 300) }); t.loaded = false; }
    }
    done++;
    if (done % 250 === 0) { console.log(`${done}/${N} scenarios, ${readings} readings, ${((Date.now() - t0) / 1000).toFixed(1)} s`); writeResults(true); }
  }
}

function writeResults(partial = false) {
  const out = {
    partial, seed: SEED, scenariosRequested: N, scenariosRun: done, tabs: TABS, runtimeSeconds: Number(((Date.now() - t0) / 1000).toFixed(1)),
    recycleEvery: RECYCLE, pageLoads: loads, inAppImports: imports, importFallbacks, roundtrips, readings,
    msPerScenario: done ? Number(((Date.now() - t0) * TABS / done).toFixed(1)) : null,
    timingMsTotalAcrossTabs: timing, avgLoadMs: loads ? Math.round(timing.load / loads) : null, avgImportMs: imports ? Math.round(timing.import / imports) : null,
    invariants: stats, signatures: Object.fromEntries(Object.entries(sigs).sort((a, b) => b[1] - a[1])),
    page: html, dbSnapshot: db.meta.snapshot,
  };
  writeFileSync(join(OUT, 'results.json'), `${JSON.stringify(out, null, 2)}\n`);
  return out;
}

try {
  const tabs = await Promise.all(Array.from({ length: TABS }, (_, k) => openTab(k)));
  await Promise.all(tabs.map(worker));
} finally {
  const out = writeResults(false);
  console.log(`done: ${out.scenariosRun} scenarios, ${out.readings} readings, ${out.runtimeSeconds} s (${out.pageLoads} loads, ${out.inAppImports} imports)`);
  for (const [k, v] of Object.entries(out.invariants)) if (v.violations) console.log(`  ${k}: ${v.violations} of ${v.checks}`);
  const violations = Object.values(out.invariants).reduce((n, v) => n + v.violations, 0);
  if (violations || out.scenariosRun < N) { console.error(`ui:fuzz: ${violations} violation(s) or unfinished scenarios; examples with seed, scenario and link in ${join(OUT, 'violations.jsonl')}`); process.exitCode = 1; }
  try { ws.close(); } catch { /* closed */ }
  proc.kill();
  await sleep(400);
  rmSync(tmpRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
