// The ui-fuzz of scripts/ui-fuzz.mjs ported to Playwright (WP-22): seeded random scenarios, the rendered page read through a tab
// of a page adapter, and every reading compared with the pure engine run in Node (invariants I1 to I10, see that file's header
// and docs/audits/2026-09-15-filtering-estimates-data/ui-fuzz/NOTES.md).
//
// What is the same: the generator, the oracle, the comparisons and the invariants are the old script's, unchanged, so a seed draws the
// same scenarios and the same checks run. What differs: a tab is a Playwright page (see adapters/old-fuzz-tab.mjs), the page is served
// over HTTP under a base path, and the one random draw the old script made after an await (which setting a round trip reopens) comes
// from its own generator per scenario, so a run does not depend on which tab finished first. A scenario the harness could not read
// is a violation (H-harness), never a skipped scenario.
import { appendFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fmtNumber } from '../../../app/js/ui/format.js';

/**
 * @param {object} o
 * @param {string} o.root       repository root
 * @param {string} o.pageUrl    the selector's address under a base path, with its trailing slash
 * @param {string} o.html       the page's release-stamped name (reported only)
 * @param {number} o.n          scenarios drawn from the seed
 * @param {number} o.seed
 * @param {number} [o.tabs]     tabs reading at once
 * @param {number} [o.importShare]
 * @param {number} [o.roundtripShare]
 * @param {number} [o.recycle]
 * @param {string|null} [o.shard]  'K/N'
 * @param {string} o.out        where results.json and violations.jsonl go
 */
export async function createFuzz({ root, pageUrl, html, n: N, seed: SEED, tabs: TABS = 8, importShare: IMPORT_SHARE = 0.8, roundtripShare: ROUNDTRIP_SHARE = 0.05, recycle: RECYCLE = 40, shard: SHARD = null, out: OUT }) {
  const [PART, PARTS] = SHARD === null ? [1, 1] : SHARD.split('/').map(Number);
  if (!(Number.isInteger(PART) && Number.isInteger(PARTS) && PART >= 1 && PART <= PARTS)) throw new Error(`fuzz: shard takes K/N with 1 <= K <= N, not "${SHARD}"`);
  const CAP = 50;
  mkdirSync(OUT, { recursive: true });
  // The oracle is the repository's own engine (app/js), loaded from `root`, never a copy.
  const loadModule = (file) => import(pathToFileURL(join(root, file)).href);
  const { runSelection, compareInterval, UNKNOWN_POLICY } = await loadModule('app/js/engine/constraints.js');
  const { matchesQuery } = await loadModule('app/js/engine/search.js');
  const { productsByMaterial, productView, stateOf } = await loadModule('app/js/engine/products.js');
  const { applyAssumptions, toHash, validateScenario } = await loadModule('app/js/engine/scenario.js');
  const { TEMPLATES } = await loadModule('app/js/ui/templates.js');
  const { fillerOf } = await loadModule('app/js/engine/filler.js');
  const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
  // As the page does: a material is judged by its products (D83); the build gives its headline as their spread.
  const productsOf = productsByMaterial(db);
  const candidates = db.materials.filter((m) => !m.familyEntry);
  // Selectable headlines only: a drawer-only one (D139) is no requirement, axis or assumption.
  const SELECTABLE = db.registry.headlines.filter((h) => !h.drawerOnly);
  const KEYS = SELECTABLE.map((h) => h.key);
  const BETTER = Object.fromEntries(SELECTABLE.map((h) => [h.key, h.better]));
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
  // The rail's filler classes (engine/filler.js): the facet's, and the fillers the materials table names (§37.8). A link
  // may still carry the facet's own classes (REINF), which the engine reads as before.
  const FILLERS = [...new Set(candidates.map(fillerOf).filter(Boolean))];
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
    if (kind === 'facet') return pick([{ kind, facet: 'supportMaterial', equals: false }, { kind, facet: 'supportMaterial', equals: chance(0.2) ? true : false }, { kind, facet: 'reinforcement', in: (() => { const s = subset(REINF); return s.length ? s : [pick(REINF)]; })() },
      { kind, facet: 'filler', in: (() => { const s = subset(FILLERS).slice(0, 4); return s.length ? s : [pick(FILLERS)]; })() }, { kind, facet: 'flexible', equals: chance(0.5) },
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
      // Material typicals (view id catalogue) keeps I4's material oracle; the decision view is I10's (D107).
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
    s.sample = chance(0.25);            // also read HIDDEN on, and FAIL shown
    s.roundtrip = chance(ROUNDTRIP_SHARE);
    return s;
  }

  const SETTINGS = { S1: { u: 'strict', e: true }, S0: { u: 'strict', e: false }, X0: { u: 'exploration', e: false }, X1: { u: 'exploration', e: true } };
  const hashFor = (s, setting, lens) => toHash({ constraints: s.constraints, unknownPolicy: SETTINGS[setting].u, shortlist: [], plot: s.plot, template: s.template ?? null, lens, openMaterial: null, useEstimates: SETTINGS[setting].e, columnSet: s.columnSet ?? 'properties', baseline: null, assumptions: s.assumptions,
    anneal: !!s.anneal, annealMaxC: s.annealMaxC ?? null, moisture: s.moisture ?? 'dry' });
  const urlFor = (s, setting, lens, n = s.i) => `${pageUrl}?n=${n}#${hashFor(s, setting, lens)}`;

  // ------------------------------------------------------------------ oracle (the engine, as main.js composes it)

  function oracle(s, setting, { screened = false, fail = false } = {}) {
    const { u, e } = SETTINGS[setting];
    const explore = u === UNKNOWN_POLICY.EXPLORATION;
    const ctx = { ...baseCtx, unknownPolicy: u, useEstimates: explore && e, showEstimates: explore && e, anneal: !!s.anneal, annealMaxC: s.annealMaxC ?? null, moisture: s.moisture ?? 'dry' };
    const units = Object.fromEntries(SELECTABLE.map((h) => [h.key, h.unit]));
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
    // The count names the shown verdicts in a fixed order, never alphabetically, then HIDDEN while its chip is on screen
    // and pressed (main.js renderCount). The chip shows under Include whatever the estimates switch says: a property that
    // does not apply hides a material with it off too (D148).
    const screenedChip = tested && explore && sel.counts.screened > 0;
    const label = [...['PASS', 'UNKNOWN', 'FAIL'].filter((v) => showStates.has(v)), ...(screened && screenedChip ? ['HIDDEN'] : [])].join(' + ');
    // Then what the shown rows are, in parts that add up to their number: the candidates among them (of how many, when not all
    // are shown), and those shown for another reason. No parts when the rows are exactly the candidates.
    const kinds = { candidate: 0, unchecked: 0, screened: 0, failed: 0 };
    for (const { evaluation: ev } of rows) kinds[ev.eligible ? 'candidate' : ev.screened ? 'screened' : ev.verdict === 'FAIL' ? 'failed' : 'unchecked']++;
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    const parts = kinds.candidate === shown && shown === candidateCount ? '' : [
      !candidateCount ? 'no candidates' : kinds.candidate === candidateCount ? plural(candidateCount, 'candidate') : `${kinds.candidate} of the ${plural(candidateCount, 'candidate')}`,
      kinds.unchecked ? `${kinds.unchecked} could not be checked` : null,
      kinds.screened ? `${kinds.screened} hidden` : null,
      kinds.failed ? `${kinds.failed} failed` : null,
    ].filter(Boolean).join(', ');
    let count = tested ? `${shown} shown ${label}${parts ? ` · ${parts}` : ''}` : `${shown} material${shown === 1 ? '' : 's'} no requirements set`;
    if (s.search) count += ` matching "${s.search}"${excluded.length ? `, plus ${excluded.length} listed below that your requirements exclude` : ''}`;
    // Each chip leads with a box, ticked while its results are shown (main.js chipText).
    const box = (on) => (on ? '\u2611' : '\u2610');
    const chips = [['PASS', counts.pass], ['UNKNOWN', counts.unknown], ['FAIL', counts.fail]].map(([v, n]) => [!tested, `${box(showStates.has(v))} ${v} ${n}`]);
    chips.push([!(tested && explore && counts.screened), `${box(screened)} HIDDEN ${counts.screened}`]);
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

  const stats = {}; const sigs = {}; const examples = {};
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

  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const near = (a, b) => a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a)));
  const BAD = /\bNaN\b|\bundefined\b|\[object Object\]/;

  function compareReading(s, key, r, o) {
    const [set, lens] = key.split('|');
    check('I2-count'); if (r.count !== o.count) violate('I2-count', 'count text differs', s, key, { page: r.count, node: o.count });
    // The count's parts must add up to its number, read from the page alone: "31 shown ... · 23 candidates, 8 hidden".
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
    if (set === 'X0' || set === 'X0scr' || set === 'S0fail') { check('I3-off-estimate'); if (r.estEls || r.dagger || r.envs?.length) violate('I3-off-estimate', `estimate marks with estimates off (${set} ${lens})`, s, key, { estEls: r.estEls, dagger: r.dagger, envs: r.envs?.length }); }
    if (set.startsWith('S')) { check('I3-strict-estimate'); if (r.estEls || r.dagger || r.envs?.length) violate('I3-strict-estimate', `estimate marks in Strict ${lens}`, s, key, { estEls: r.estEls, dagger: r.dagger, envs: r.envs?.length }); }

    if (lens === 'table' && o.tested) {
      check('I2-header');
      const c = o.sel.counts, explore = SETTINGS[set.slice(0, 2)].u === 'exploration';
      const hm = /(\d+) of the (\d+) materials meet/.exec(r.head ?? '');
      // The line under the heading (F09, stage 3d) counts the UNKNOWN materials by group: "UNKNOWN 91 left out: 7 one check
      // away, 38 not enough data, 37 unlikely to meet, 9 a required property does not apply to", or under Include "UNKNOWN 93:
      // …, 9 hidden". The groups add up to the count, and the hidden ones are the chip's.
      const um = /UNKNOWN (\d+)( left out| shown, not candidates)?(?:: ([^·]*))?/.exec(r.head ?? '');
      // The heading's buttons follow the line in the text read, so each part is read up to its group's own words.
      const groupsSaid = (um?.[3] ?? '').split(', ').map((p) => /^(\d+) (one check away|not enough data|unlikely to meet|hidden|a required property does not apply to)\b/.exec(p.trim())).filter(Boolean);
      const groupSum = groupsSaid.reduce((n, g) => n + Number(g[1]), 0);
      const hiddenSaid = Number(groupsSaid.find((g) => g[2] === 'hidden')?.[1] ?? 0);
      if (!hm || Number(hm[1]) !== c.pass || Number(hm[2]) !== c.total) violate('I2-header', 'results header pass/total differs', s, key, { head: (r.head ?? '').slice(0, 200), node: [c.pass, c.total] });
      else if ((c.unknown > 0) !== !!um || (um && (Number(um[1]) !== c.unknown || groupSum !== c.unknown || explore === !!um[2] || hiddenSaid !== (explore ? c.screened : 0))))
        violate('I2-header', 'results header unknown sentence differs', s, key, { head: (r.head ?? '').slice(0, 320), node: [c.unknown, c.screened, explore] });
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
      // Grouped under Include once something is asked (D155): the groups are the engine's, never recomputed here.
      const grouped = o.tested && o.ctx.unknownPolicy === UNKNOWN_POLICY.EXPLORATION;
      // The Result column is there once a requirement is set, and only then (D174): before, no row reads "not tested".
      check('I1-result-column');
      if (!r.noResults && r.rows.length && !!r.resultColumn !== !!o.tested) violate('I1-result-column', o.tested ? 'a requirement is set and the table has no Result column' : 'no requirement is set and the table shows a Result column', s, key, { page: r.resultColumn, node: o.tested });
      for (const [id, verdict, scr, scrTitle, cells, group, groupReason, hiddenWhy, failWhy] of r.rows) {
        const x = byId.get(id); if (!x) continue;
        const ev = x.evaluation;
        check('I1-verdict');
        const expV = o.tested ? ev.verdict : null;
        if (verdict !== expV) violate('I1-verdict', `verdict chip ${verdict} vs ${expV}`, s, key, { id, page: verdict, node: expV });
        check('I1-group');
        if ((grouped ? ev.group : null) !== group) violate('I1-group', `row in the ${group} table, the engine says ${grouped ? ev.group : 'ungrouped'}`, s, key, { id, page: group, node: ev.group });
        check('I1-group-reason');
        const expReason = o.tested && ev.verdict === 'UNKNOWN' && ev.group !== 'hidden' ? ev.groupReason ?? '' : '';
        if (groupReason !== expReason) violate('I1-group-reason', 'the row\'s group reason differs from the engine\'s', s, key, { id, page: groupReason, node: expReason });
        // A hidden row says why in one short phrase, and a failing row what it failed first (stage 3d).
        check('I1-hidden-why');
        if (o.tested && ev.screened && !/^(does not apply: |resin data: |no product on record|its estimate wholly misses)/.test(hiddenWhy)) violate('I1-hidden-why', 'a hidden row gives no reason', s, key, { id, page: hiddenWhy });
        check('I1-fail-why');
        if (o.tested && ev.verdict === 'FAIL' && !/^fails: \S/.test(failWhy)) violate('I1-fail-why', 'a failing row does not say what failed', s, key, { id, page: failWhy });
        check('I1-screened');
        if (scr !== (o.tested && ev.screened)) violate('I1-screened', 'hidden chip mismatch', s, key, { id, page: scr, node: ev.screened });
        if (scr && !set.includes('scr')) violate('I1-screened', 'hidden row shown with HIDDEN off', s, key, { id });
        if (scr) {
          // Each screen names what held the row out, a property that does not apply (D148), an estimate or the base
          // polymer's published behaviour (D64), and the requirement after it; the title starts with one of the three and no
          // prefix is left without a criterion.
          check('I6-empty-reason');
          const PREFIX = /(Does not apply|Hidden by an estimate|Hidden by resin data on the base polymer):/;
          const prefixed = new RegExp(`^${PREFIX.source} \\S`).test(scrTitle);
          const bare = new RegExp(`${PREFIX.source}(?!\\s\\S)`).test(scrTitle);
          if (!prefixed || bare) violate('I6-empty-reason', 'screened chip title has no criterion after its prefix', s, key, { id, scrTitle });
          const expKinds = { notApplicable: ev.unresolved.some((r) => r.screened && r.notApplicable), estimate: ev.unresolved.some((r) => r.screened && !r.notApplicable && !r.polymerScreen), polymer: ev.unresolved.some((r) => r.screened && r.polymerScreen) };
          if (expKinds.notApplicable !== /Does not apply:/.test(scrTitle) || expKinds.estimate !== /Hidden by an estimate:/.test(scrTitle) || expKinds.polymer !== /Hidden by resin data on the base polymer:/.test(scrTitle)) violate('I6-empty-reason', 'hidden chip title names the wrong kind of screen', s, key, { id, scrTitle, expected: expKinds });
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
          // An end that is a published bound carries its sign: "520+" for a lower bound, "<0.8" for an upper one (§21).
          // Products that all publish one value show it once, with no range line (format.js renderSpread); the value is probed above.
          const ranged = sp && sp.n > 1 && !(sp.min === sp.max && !sp.bounds);
          const rm = ranged ? /<?(-?[\d,]*\.?\d+)\+?\u2013<?(-?[\d,]*\.?\d+)\+?\s*·/.exec(cells[c.property].t) : null;
          if (ranged) {
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
        // The Estimates chip under Also stays in place and is greyed, with its reason, exactly when there is nothing to draw.
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

  /**
   * The headline a material's reasons were judged on: its best product's, in the state that product was judged in, where
   * the material is answered by its products (D83, D99), and the material's own otherwise. A scenario's assumption stands
   * in only for a product that publishes nothing deciding (engine/products.js productHeadline), so a reason may rightly
   * say "Published" beside a material whose own headline carries an assumption (seed 116, scenario 516: PA66's product
   * publishes its density). Reading the material's headline here reported that as a violation.
   */
  function judgedHeadline(o, ev, property) {
    const m = o.materials.find((x) => x.id === ev.materialId);
    const g = ev.products?.length ? gradeById.get(ev.gradeId) : null;
    return g ? productView(m, g, o.ctx, stateOf(g, ev.state?.id ?? null)).headline[property] : m?.headline[property];
  }

  // Engine-side reasons that surface in the drawer, the export and the exclusion list.
  function checkReasons(s, o, setting) {
    for (const ev of o.sel.evaluations) {
      for (const res of [...ev.unresolved, ...ev.failed]) {
        check('I6-empty-reason'); check('I6-reason-assumption');
        if (!res.reason || !String(res.reason).trim()) violate('I6-empty-reason', `empty engine reason (${res.constraint.kind}${res.constraint.gate ? ':' + res.constraint.gate : ''})`, s, `${setting}|table`, { id: ev.materialId, criterion: res.criterion });
        else if (res.constraint.kind === 'numeric' && judgedHeadline(o, ev, res.constraint.property)?.assumption && /^Published /.test(res.reason)) violate('I6-reason-assumption', 'reason calls a scenario assumption "Published"', s, `${setting}|table`, { id: ev.materialId, criterion: res.criterion, reason: res.reason });
        else if (BAD.test(res.reason) || BAD.test(res.criterion)) violate('I6-bad-token', `bad token in engine reason (${res.constraint.kind}${res.constraint.property ? ':' + res.constraint.property : ''})`, s, `${setting}|table`, { id: ev.materialId, criterion: res.criterion, reason: res.reason });
      }
    }
  }

  const t0 = Date.now();
  const scenarios = [];
  for (let i = 0; i < N; i++) scenarios.push(genScenario(i, scenarios));
  // The part this run takes (--shard). Every part draws all N scenarios from the seed, so a scenario is the same in every
  // part; each family (a scenario and the children built on it, which I8 compares with their parent) goes whole to one
  // part, the largest families first, each to the part with the fewest scenarios so far.
  const mine = (() => {
    if (PARTS === 1) return scenarios;
    const rootOf = (s) => (s.parent === null ? s.i : rootOf(scenarios[s.parent]));
    const families = new Map();
    for (const s of scenarios) { const r = rootOf(s); if (!families.has(r)) families.set(r, []); families.get(r).push(s); }
    const sizes = Array(PARTS).fill(0);
    const part = new Map();
    for (const [r, f] of [...families].sort((a, b) => b[1].length - a[1].length || a[0] - b[0])) {
      const k = sizes.indexOf(Math.min(...sizes));
      part.set(r, k); sizes[k] += f.length;
    }
    return scenarios.filter((s) => part.get(rootOf(s)) === PART - 1);
  })();
  const rendered = new Map();   // i -> { S1: ids, X0: ids, X1: ids }
  // When each scenario has been read (or failed to be). A child compares its rows with its parent's (I8), and waits for
  // its parent to finish first: every child is compared, not only the ones whose parent another tab happened to finish
  // sooner (51 of the 54 children of seed 1's 300 in one run, 48 in the same 300 run in three parts; all 54 since, D144).
  // The parent was taken from the list before its child, so it is being read or is done, and the wait ends.
  const finished = new Map(mine.map((s) => { let settle; const p = new Promise((r) => { settle = r; }); return [s.i, { p, settle }]; }));
  let firstImportError = null;
  let next = 0, done = 0, loads = 0, imports = 0, importFallbacks = 0, readings = 0, roundtrips = 0;
  const timing = { load: 0, import: 0, run: 0, oracle: 0 };

  function perms(start) {
    const rest = ['S1', 'S0', 'X0', 'X1'].filter((x) => x !== start);
    for (let j = rest.length - 1; j > 0; j--) { const k = Math.floor(rnd() * (j + 1)); [rest[j], rest[k]] = [rest[k], rest[j]]; }
    return [start, ...rest];
  }

  async function worker(t) {
    while (next < mine.length) {
      const s = mine[next++];
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
          try { await t.importScenario(s, SETTINGS[s.start], s.startLens); imports++; t.sinceLoad = (t.sinceLoad ?? 0) + 1; timing.import += Date.now() - a; }
          catch (err) { importFallbacks++; firstImportError ??= `scenario ${s.i}: ${err.message.split('\n')[0].slice(0, 160)}`; await t.load(urlFor(s, s.start, s.startLens)); loads++; s.path = 'url'; }
        }
        else { await t.load(urlFor(s, s.start, s.startLens)); loads++; timing.load += Date.now() - a; s.path = 'url'; }
        a = Date.now();

        res = await t.runPlan({ search: s.search, order: s.order, lens0: s.startLens, keys, sample: s.sample });
        timing.run += Date.now() - a;
      } catch (err) {
        violate('H-harness', `harness error: ${err.message.split('\n')[0].slice(0, 80)}`, s, `${s.start}|${s.startLens}`, { error: err.message.slice(0, 400), errors: t.errors.slice(0, 3), dialogs: t.dialogs });
        t.loaded = false; done++; finished.get(s.i).settle(); continue;
      }
      s.constraints = validated.scenario.constraints;
      s.rawConstraints = raw;
      const a = Date.now();
      check('I6-exception');
      if (t.errors.length) violate('I6-exception', `page error: ${t.errors[0].split('\n')[0].slice(0, 80)}`, s, `${s.start}|${s.startLens}`, { errors: t.errors.slice(0, 5) });
      const readErrors = t.errors.length;
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
      finished.get(s.i).settle();
      if (s.parent !== null && finished.has(s.parent)) await finished.get(s.parent).p;
      if (s.parent !== null && rendered.has(s.parent)) {
        const P = rendered.get(s.parent);
        for (const k of ['S1', 'X0', 'X1']) { check('I8-mono-add'); const extra = notIn(R[k], P[k]); if (extra.length) violate('I8-mono-add', `adding a mandatory requirement adds a row (${k})`, s, `${k}|table`, { parent: s.parent, added: extra }); }
      }
      timing.oracle += Date.now() - a;
      // I7: reopen one setting's link in a fresh load and compare what a reader sees.
      if (s.roundtrip) {
        const rr = mulberry32(SEED * 7919 + s.i), st = ['S1', 'S0', 'X0', 'X1'][Math.floor(rr() * 4)], lens = ['table', 'ashby'][Math.floor(rr() * 2)];
        try {
          await t.load(urlFor(s, st, lens, `rt${s.i}`)); loads++; roundtrips++;
          const r = await t.readWithSearch(s.search, keys);
          const before = res[`${st}|${lens}`];
          check('I7-roundtrip');
          const rowsOf = (x) => JSON.stringify(x.rows ? x.rows.map((y) => [y[0], y[1], y[2]]) : [x.points, x.envs, x.front]);
          if (r.count !== before.count || JSON.stringify(r.chips) !== JSON.stringify(before.chips) || rowsOf(r) !== rowsOf(before)) violate('I7-roundtrip', `link reopened differs (${lens})`, s, `${st}|${lens}`, { count: [before.count, r.count], chips: [before.chips, r.chips] });
          else if (r.h !== before.h) { check('I7-roundtrip-text'); violate('I7-roundtrip-text', `link reopened: same rows, different text (${lens})`, s, `${st}|${lens}`, { note: 'lens text hash differs' }); }
        } catch (err) { violate('H-harness', `roundtrip error: ${err.message.slice(0, 80)}`, s, `${st}|${lens}`, { error: err.message.slice(0, 300) }); t.loaded = false; }
      }
      // What the page raised after the first look (the round trip reloads it, the parent wait lets it run on) is read too, not cleared unread.
      if (t.errors.length > readErrors) violate('I6-exception', `page error after the scenario was read: ${t.errors[readErrors].split('\n')[0].slice(0, 80)}`, s, `${s.start}|${s.startLens}`, { errors: t.errors.slice(readErrors, readErrors + 5) });
      done++;
      if (done % 250 === 0) { console.log(`${done}/${mine.length} scenarios, ${readings} readings, ${((Date.now() - t0) / 1000).toFixed(1)} s`); writeResults(true); }
    }
  }

  function writeResults(partial = false) {
    const out = {
      partial, seed: SEED, scenariosRequested: N, shard: `${PART}/${PARTS}`, scenariosInShard: mine.length, scenariosRun: done, tabs: TABS, runtimeSeconds: Number(((Date.now() - t0) / 1000).toFixed(1)),
      recycleEvery: RECYCLE, pageLoads: loads, inAppImports: imports, importFallbacks, firstImportError, roundtrips, readings,
      msPerScenario: done ? Number(((Date.now() - t0) * TABS / done).toFixed(1)) : null,
      timingMsTotalAcrossTabs: timing, avgLoadMs: loads ? Math.round(timing.load / loads) : null, avgImportMs: imports ? Math.round(timing.import / imports) : null,
      invariants: stats, signatures: Object.fromEntries(Object.entries(sigs).sort((a, b) => b[1] - a[1])),
      page: html, base: pageUrl, dbSnapshot: db.meta.snapshot,
    };
    writeFileSync(join(OUT, 'results.json'), `${JSON.stringify(out, null, 2)}\n`);
    return out;
  }

  /** Read every scenario of this part through the tabs. Resolves to the results record; throws only for a harness fault, never for a violation. */
  async function run(tabList) {
    let final;
    try { await Promise.all(tabList.map(worker)); }
    finally { final = writeResults(false); }
    return final;
  }
  return { run, expected: () => mine.length, vfile };
}
