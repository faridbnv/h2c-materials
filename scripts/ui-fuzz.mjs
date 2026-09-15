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
// switch, I4 Ashby points/envelopes/front/legend, I5 display rounding against thresholds, I6 exceptions, bad tokens
// and empty reasons, I7 link round trip, I8 monotonicity across policies and when a mandatory requirement is added.

import { spawn } from 'node:child_process';
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
// Reload a tab after this many in-app imports. Every Ashby render leaks a Plotly resize listener and its plot
// (finding A-03), so a tab that is never reloaded slows down as its heap grows.
const RECYCLE = Number(arg('recycle', 40));
const CAP = 50;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { runSelection, compareInterval, STATUS, UNKNOWN_POLICY } = await import(pathToFileURL(join(root, 'app/js/engine/constraints.js')).href);
const { matchesQuery } = await import(pathToFileURL(join(root, 'app/js/engine/search.js')).href);
const { applyAssumptions, toHash, validateScenario } = await import(pathToFileURL(join(root, 'app/js/engine/scenario.js')).href);
const { TEMPLATES } = await import(pathToFileURL(join(root, 'app/js/ui/templates.js')).href);

const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const html = readdirSync(join(root, 'dist')).find((f) => /^H2C_Material_Selector_.*\.html$/.test(f));
const pageUrl = pathToFileURL(join(root, 'dist', html)).href;
const candidates = db.materials.filter((m) => !m.familyEntry);
const KEYS = db.registry.headlines.map((h) => h.key);
const BETTER = Object.fromEntries(db.registry.headlines.map((h) => [h.key, h.better]));
const group = (rows, key) => { const m = new Map(); for (const r of rows) { if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(r); } return m; };
const baseCtx = { db, measurementsByMaterial: group(db.measurements, 'materialId'), evidenceByMaterial: group(db.evidence, 'materialId'), coverageByMaterial: group(db.coverage, 'materialId') };

// ------------------------------------------------------------------ seeded generator

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED * 2654435761);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const chance = (p) => rnd() < p;
const subset = (a) => a.filter(() => chance(0.4));

/** The display rounding step of fmtNumber (app/js/ui/format.js) at a magnitude. */
const roundStep = (v) => { const a = Math.abs(v); return a >= 100 ? 1 : a >= 10 ? 0.1 : a >= 1 ? 0.01 : a > 0 ? 10 ** (Math.floor(Math.log10(a)) - 2) : 0.001; };
const RANGES = { density: [800, 1800], tensileModulusXY: [0.01, 12], tensileStrengthXY: [5, 170], elongationXY: [1, 700], hdt045: [40, 270], priceCADkg: [20, 300] };
const edges = Object.fromEntries(KEYS.map((k) => {
  const s = new Set();
  const add = (v) => { if (Number.isFinite(v)) s.add(v); };
  for (const m of candidates) {
    const h = m.headline[k]; if (!h) continue;
    add(h.value); add(h.interval?.lo); add(h.interval?.hi); add(h.loadBracket?.lo); add(h.loadBracket?.hi);
    const e = h.estimate; if (e) { add(e.lo); add(e.hi); add(e.plausible?.lo); add(e.plausible?.hi); add(e.screenRange?.lo); add(e.screenRange?.hi); }
    for (const b of h.impliedBounds ?? []) add(b.lo);
  }
  return [k, [...s]];
}));
// Headline values the table displays rounded (27.99 shows as "28"): thresholds near them probe I5.
const sensitive = Object.fromEntries(KEYS.map((k) => [k, candidates.map((m) => m.headline[k]).filter((h) => h?.known && Number(fmtNumber(h.value).replace(/,/g, '')) !== h.value).map((h) => h.value)]));
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
const H2C = ['Official Bambu product', 'Officially listed family', 'Conditional', 'Theoretical', 'Excluded'];
const REINF = ['carbon-fibre', 'glass-fibre', 'unfilled', 'esd', 'foaming', 'undisclosed'];
const CATS = Object.keys(db.meta.environmentCategories);
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
  if (kind === 'facet') return pick([{ kind, facet: 'supportMaterial', equals: false }, { kind, facet: 'supportMaterial', equals: chance(0.2) ? true : false }, { kind, facet: 'reinforcement', in: (() => { const s = subset(REINF); return s.length ? s : [pick(REINF)]; })() }, { kind, facet: 'flexible', equals: chance(0.5) }]);
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
    // Two requirements on the same property.
    if (chance(0.1)) { const k = pick(KEYS); s.constraints.push({ kind: 'numeric', property: k, operator: '>=', value: threshold(k), mandatory: true }, { kind: 'numeric', property: k, operator: pick(['<=', '<']), value: threshold(k), mandatory: !chance(0.2) }); }
  }
  if (s.parent === null) {
    if (chance(0.1)) s.assumptions = Array.from({ length: 1 + Math.floor(rnd() * 2) }, () => { const k = pick(KEYS); const a = { materialId: chance(0.15) ? '*' : pick(candidates).id, property: k, value: threshold(k) }; if (!chance(0.2)) a.unit = db.registry.headlines.find((h) => h.key === k).unit; return a; });
    if (chance(0.15)) s.search = pick(SEARCHES);
    const x = pick(KEYS); let y = pick(KEYS); if (y === x) y = KEYS[(KEYS.indexOf(x) + 1) % KEYS.length];
    s.plot = { x, y, xLog: chance(0.3), yLog: chance(0.3), index: null, showReference: false, comparability: 'strict', pointLevel: 'headline', showEstimates: chance(0.6) };
  }
  s.columnSet = s.parent === null ? (chance(0.15) ? 'printing' : 'properties') : prior[s.parent].columnSet;
  s.start = pick(['S1', 'S0', 'X0', 'X1']);
  s.startLens = chance(0.5) ? 'table' : 'ashby';
  s.path = chance(IMPORT_SHARE) ? 'import' : 'url';
  s.sample = chance(0.25);            // also read SCREENED on, and FAIL shown
  s.roundtrip = chance(ROUNDTRIP_SHARE);
  return s;
}

const SETTINGS = { S1: { u: 'strict', e: true }, S0: { u: 'strict', e: false }, X0: { u: 'exploration', e: false }, X1: { u: 'exploration', e: true } };
const hashFor = (s, setting, lens) => toHash({ constraints: s.constraints, unknownPolicy: SETTINGS[setting].u, shortlist: [], plot: s.plot, template: s.template ?? null, lens, openMaterial: null, useEstimates: SETTINGS[setting].e, columnSet: s.columnSet ?? 'properties', baseline: null, assumptions: s.assumptions });
const urlFor = (s, setting, lens, n = s.i) => `${pageUrl}?n=${n}#${hashFor(s, setting, lens)}`;

// ------------------------------------------------------------------ oracle (the engine, as main.js composes it)

const fmtEngine = (v) => (Number.isFinite(v) ? String(Number(v.toFixed(6))) : String(v));
function fmtNumber(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v); let s;
  if (abs >= 1000) s = v.toLocaleString('en-CA', { maximumFractionDigits: 0 });
  else if (abs >= 100) s = v.toFixed(0); else if (abs >= 10) s = v.toFixed(1); else if (abs >= 1) s = v.toFixed(2); else s = v.toPrecision(3);
  return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}
function oracle(s, setting, { screened = false, fail = false } = {}) {
  const { u, e } = SETTINGS[setting];
  const explore = u === UNKNOWN_POLICY.EXPLORATION;
  const ctx = { ...baseCtx, unknownPolicy: u, useEstimates: explore && e, showEstimates: explore && e };
  const units = Object.fromEntries(db.registry.headlines.map((h) => [h.key, h.unit]));
  const materials = s.assumptions.length ? candidates.map((m) => applyAssumptions(m, s.assumptions, units).material) : candidates;
  const sel = runSelection(materials, s.constraints, ctx);
  const q = s.search.trim();
  const byId = new Map(materials.map((m) => [m.id, m]));
  const families = q ? db.materials.filter((m) => m.familyEntry && matchesQuery(m, q)) : [];
  const members = new Set(families.flatMap((f) => f.familyEntry.members.map((x) => x.id)));
  const found = sel.evaluations.map((ev) => ({ material: byId.get(ev.materialId), evaluation: ev })).filter(({ material: m }) => matchesQuery(m, q) || members.has(m.id));
  const showStates = new Set(explore ? ['PASS', 'UNKNOWN'] : ['PASS']); if (fail) showStates.add('FAIL');
  const visible = (ev) => showStates.has(ev.verdict) && (!ev.screened || screened);
  const rows = found.filter(({ evaluation: ev }) => visible(ev));
  // Harness self-test: FZ_MUTATE=rows drops a row from the oracle, FZ_MUTATE=value nudges a headline, so every
  // row/point check must fire. Never set in a real run.
  if (process.env.FZ_MUTATE === 'rows' && rows.length) rows.pop();
  const excluded = q ? found.filter(({ evaluation: ev }) => !visible(ev)) : [];
  const tested = s.constraints.length > 0;
  const { counts } = sel;
  const shown = rows.length, eligible = sel.candidates.length;
  let count = tested ? `${shown} shown ${[...showStates].sort().join(' + ')}${shown !== eligible ? ` · ${eligible} eligible` : ''}` : `${shown} material${shown === 1 ? '' : 's'} no requirements set`;
  if (s.search) count += ` matching "${s.search}"${excluded.length ? `, plus ${excluded.length} listed below that your requirements exclude` : ''}`;
  const chips = [['PASS', counts.pass], ['UNKNOWN', counts.unknown], ['FAIL', counts.fail]].map(([v, n]) => [!tested, `${v} ${n}`]);
  chips.push([!(tested && explore && e && counts.screened), `SCREENED ${counts.screened}`]);
  return { sel, rows, excluded, families, count: count.replace(/\s+/g, ' ').trim(), chips, tested, ctx, materials };
}
function plotOracle(o, plot) {
  const span = (h) => { if (h?.known) return { lo: h.value, hi: h.value, measured: true }; const e = h?.estimate; return e && e.lo !== null && e.hi !== null ? { lo: e.lo, hi: e.hi, measured: false } : null; };
  const pts = [], est = [];
  for (const { material: m, evaluation: ev } of o.rows) {
    const hx = m.headline[plot.x], hy = m.headline[plot.y];
    if (hx?.known && hy?.known) { pts.push({ id: m.id, x: hx.value * (process.env.FZ_MUTATE === 'value' ? 1.001 : 1), y: hy.value, eligible: ev.eligible, assumed: !!(hx.assumption || hy.assumption) }); continue; }
    if (!o.ctx.showEstimates) continue;
    const x = span(hx), y = span(hy);
    if (x && y) est.push({ id: m.id, x, y });
  }
  const better = (a, b, g) => (g === 'min' ? a < b : a > b);
  // A scenario assumption is drawn but never joins the front (A-02).
  const el = pts.filter((p) => p.eligible && !p.assumed);
  const front = el.filter((p) => !el.some((q) => q !== p && !better(p.x, q.x, BETTER[plot.x]) && !better(p.y, q.y, BETTER[plot.y]) && (better(q.x, p.x, BETTER[plot.x]) || better(q.y, p.y, BETTER[plot.y]))));
  return { pts, est, envs: plot.showEstimates ? est : [], front, missing: o.rows.length - pts.length - est.length };
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
  check('I2-chips');
  const pc = r.chips.map(([hidden, text]) => [hidden, text]);
  for (let j = 0; j < 4; j++) {
    const exp = o.chips[j], got = pc[j];
    // A hidden chip's text is not shown; compare text only when visible.
    if (exp[0] !== got[0] || (!exp[0] && exp[1] !== got[1])) { violate('I2-chips', `chip ${exp[1].split(' ')[0]} differs`, s, key, { page: got, node: exp }); break; }
  }
  check('I6-bad-token'); if (r.bad.length) violate('I6-bad-token', `bad token ${r.bad.join(',')} in ${lens}`, s, key, { tokens: r.bad, context: r.badContext });
  if (set === 'X0' || set === 'S0fail') { check('I3-off-estimate'); if (r.estEls || r.dagger || r.envs?.length) violate('I3-off-estimate', `estimate marks with estimates off (${set} ${lens})`, s, key, { estEls: r.estEls, dagger: r.dagger, envs: r.envs?.length }); }
  if (set.startsWith('S')) { check('I3-strict-estimate'); if (r.estEls || r.dagger || r.envs?.length) violate('I3-strict-estimate', `estimate marks in Strict ${lens}`, s, key, { estEls: r.estEls, dagger: r.dagger, envs: r.envs?.length }); }

  if (lens === 'table' && o.tested) {
    check('I2-header');
    const c = o.sel.counts, explore = SETTINGS[set.slice(0, 2)].u === 'exploration';
    const hm = /(\d+) of the (\d+) materials in this database meet/.exec(r.head ?? '');
    const um = /(\d+) more could not be checked for missing data, and are (listed flagged|left out)/.exec(r.head ?? '');
    if (!hm || Number(hm[1]) !== c.pass || Number(hm[2]) !== c.total) violate('I2-header', 'results header pass/total differs', s, key, { head: (r.head ?? '').slice(0, 200), node: [c.pass, c.total] });
    else if ((c.unknown > 0) !== !!um || (um && (Number(um[1]) !== c.unknown || (um[2] === 'listed flagged') !== explore))) violate('I2-header', 'results header unknown sentence differs', s, key, { head: (r.head ?? '').slice(0, 240), node: [c.unknown, explore] });
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
      if (scr) { check('I6-empty-reason'); if (!/Screened by an estimate: \S/.test(scrTitle)) violate('I6-empty-reason', 'screened chip title has no criterion', s, key, { id, scrTitle }); }
      // I5: displayed value against each numeric requirement on that property.
      for (const c of s.constraints) {
        if (c.kind !== 'numeric' || !cells[c.property]) continue;
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
    const gf = (r.front ?? []).map((q) => `${q[0]},${q[1]}`).sort(), ef = p.front.length > 1 ? p.front.map((q) => `${q.x},${q.y}`).sort() : [];
    if (!same(gf, ef)) violate('I4-front', 'Pareto front differs (eligible-only, own dominance)', s, key, { page: gf, node: ef });
    check('I4-legend');
    const m = /(\d+) of (\d+) candidates plotted(?:, (\d+) lack one or both)?/.exec(r.legend);
    if (!m) violate('I4-legend', 'legend sentence not found', s, key, { legend: r.legend.slice(0, 200) });
    else {
      const [pl, tot, miss] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
      if (pl !== p.pts.length || tot !== o.rows.length || miss !== p.missing) violate('I4-legend', 'plotted/total/lacking counts differ', s, key, { page: [pl, tot, miss], node: [p.pts.length, o.rows.length, p.missing] });
      const more = /(\d+) more candidates? ha(?:s|ve) no measurement/.exec(r.legend);
      const outlined = /The outlined ranges are (\d+) material/.exec(r.legend);
      check('I4-estimate-text');
      if ((more ? Number(more[1]) : 0) !== (s.plot.showEstimates ? 0 : p.est.length)) violate('I4-estimate-text', '"N more candidates have ... only an estimated range" count differs', s, key, { page: more?.[1] ?? null, node: s.plot.showEstimates ? 0 : p.est.length });
      if ((outlined ? Number(outlined[1]) : 0) !== p.envs.length) violate('I4-estimate-text', '"The outlined ranges are N" count differs', s, key, { page: outlined?.[1] ?? null, node: p.envs.length });
      const lab = /Show estimated ranges \((\d+)\)/.exec(r.estLabel ?? '');
      if ((lab ? Number(lab[1]) : 0) !== p.est.length) violate('I4-estimate-text', 'Show estimated ranges (N) differs', s, key, { page: r.estLabel, state: r.estState, node: p.est.length });
      check('I4-axis-counts');
      for (const [which, text] of [['x', r.axisX], ['y', r.axisY]]) {
        const k = s.plot[which];
        const known = o.rows.filter((x) => x.material.headline[k]?.known).length;
        const est = o.ctx.showEstimates ? o.rows.filter((x) => { const h = x.material.headline[k]; return h && !h.known && h.estimate; }).length : 0;
        const exp = est ? `(${known} measured, ${est} estimated)` : `(${known} of ${o.rows.length} have it)`;
        if (!text?.endsWith(exp)) violate('I4-axis-counts', 'axis picker count differs', s, key, { axis: which, page: text, node: exp });
      }
      if (pl + miss + p.est.length !== tot) violate('I4-legend', 'plotted + lacking + estimated != rows', s, key, { page: [pl, tot, miss], est: p.est.length });
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
        if (t.name === 'Pareto front') out.front = t.x.map((x, i) => [x, t.y[i]]);
        else if (typeof t.hovertemplate === 'string' && t.hovertemplate.includes('Estimated material range')) out.envs.push([t.customdata[0][0], t.x, t.y]);
        else if (Array.isArray(t.customdata) && t.customdata[0]?.length === 8) t.customdata.forEach((cd, i) => out.points.push([cd[0], t.x[i], t.y[i], cd[2], cd[7]]));
        badSrc += ' ' + (t.name ?? '') + ' ' + (Array.isArray(t.text) ? t.text.join(' ') : '') + ' ' + (t.hovertemplate ?? '');
      }
      out.legend = txt(lens.querySelector('.legend-note'));
      out.axisX = document.querySelector('#ashby-x option:checked')?.textContent.trim();
      out.axisY = document.querySelector('#ashby-y option:checked')?.textContent.trim();
      out.estLabel = txt(lens.querySelector('[data-show-estimates]')?.closest('label'));
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
const chromePath = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
if (!chromePath) {
  console.log('ui:fuzz skipped: no Chrome found (set CHROME=/path)');
  process.exit(process.argv.includes('--require') ? 1 : 0);
}
const proc = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1400,1000', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
let port;
for (let i = 0; i < 150 && !port; i++) { const f = join(profile, 'DevToolsActivePort'); if (existsSync(f)) port = readFileSync(f, 'utf8').split('\n')[0]; else await sleep(100); }
if (!port) { console.error('Chrome did not open a debugging port'); process.exit(2); }
const ws = new WebSocket((await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let nid = 0; const pending = new Map(); const sessions = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); return; }
  const t = msg.sessionId && sessions.get(msg.sessionId);
  if (t) t.onEvent(msg.method, msg.params);
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++nid; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });

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
    writeFileSync(t.file, JSON.stringify({ version: 1, constraints: s.constraints, unknownPolicy: u, useEstimates: e, assumptions: s.assumptions, plot: s.plot, lens, template: s.template ?? null, shortlist: [], columnSet: s.columnSet }));
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
