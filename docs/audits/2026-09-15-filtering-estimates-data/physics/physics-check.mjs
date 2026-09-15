#!/usr/bin/env node
// Workstream B (2026-09-15 audit): physical and engineering plausibility of the data, headlines, estimates and screening.
// Read-only. Reads dist/db.json, data/tables/*.csv (through the build's CSV reader) and the envelopes oracle beside this
// file; writes physics-findings.csv beside this file and prints a summary.
//
//   node docs/audits/2026-09-15-filtering-estimates-data/physics/physics-check.mjs
//
// Envelopes are a sanity oracle for printed FDM parts (envelopes.json); a value outside one is a lead, not a verdict.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../../../build/src/csv.js';
import { moistureState } from '../../../../build/src/normalize/moisture.js';
import { modulusFromShore } from '../../../../build/src/estimates.js';
import { runSelection, STATUS, UNKNOWN_POLICY } from '../../../../app/js/engine/constraints.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const ENV = JSON.parse(readFileSync(join(here, 'envelopes.json'), 'utf8'));
const MODEL = JSON.parse(readFileSync(join(root, 'build/mappings/estimate-model.json'), 'utf8'));
const csvRows = readCsv(join(root, 'data/tables/measurements.csv')).records.map((r) => r.values);
const rawById = new Map(csvRows.map((r) => [r.MeasurementID, r]));

const KEYS = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045'];
const LOG_KEYS = new Set(['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY']);
const materials = new Map(db.materials.map((m) => [m.id, m]));
const grades = new Map(db.grades.map((g) => [g.id, g]));
const findings = [];
const add = (f) => findings.push({ severity: 'low', materialId: '', material: '', gradeId: '', measurementIds: '', property: '', value: '', expected: '', sourceId: '', locator: '', detail: '', ...f });
const r3 = (v) => (v == null || !Number.isFinite(v) ? v : Number(Number(v).toPrecision(3)));

// ------------------------------------------------------------------------------------------ classification

const identityOf = (m) => (m.family === 'Polymer Blends' ? m.normalizedName : m.basePolymer);
const specimenClass = (x) => {
  const s = x.specimenType ?? '';
  if (/^Raw material/.test(s)) return 'moulded';
  if (/^Printed/.test(s)) return 'printed';
  if (/^Film/.test(s)) return 'film';
  if (/^Filament/.test(s)) return 'filament';
  return 'unknown';
};
const dirClass = (x) => ({ XY: 'XY', XZ: 'XY', 'horizontal-source-label': 'XY', 'along-flow': 'XY', Z: 'Z', ZX: 'Z', 'vertical-xz-source-label': 'Z' }[x.direction] ?? 'unk');
const wetOf = (x) => {
  let s = 'not-stated';
  try { s = moistureState(x.moisture ?? 'Not published'); } catch { /* unknown wording */ }
  if (/immersed|conditioned at|relative humidity/i.test(x.postProcessing ?? '')) s = 'conditioned';
  return s;
};
const annealedOf = (x) => /anneal/i.test(x.postProcessing ?? '') && !/not annealed|unanneal/i.test(x.postProcessing ?? '');
const isPolyamide = (id) => /^(PA|CoPA|PAHT|PPA)/.test(id);
const reinfOf = (m) => ({ 'carbon-fibre': 'carbon-fibre', 'glass-fibre': 'glass-fibre' }[m.facets?.reinforcement?.value] ?? 'unfilled');
const morph = (id) => MODEL.identities[id]?.morphology ?? (ENV.identities[id]?.tm ? 'semicrystalline' : 'amorphous');

function identityEnv(id) {
  const e = ENV.identities[id];
  if (!e) return null;
  if (e.same) return identityEnv(e.same);
  if (e.unionOf) {
    const parts = e.unionOf.map(identityEnv);
    const out = { tg: null, tm: null, ref: `union of ${e.unionOf.join(', ')}` };
    for (const r of ['unfilled', 'carbon-fibre', 'glass-fibre']) {
      out[r] = {};
      for (const k of [...KEYS, 'hdt045Annealed']) {
        const vs = parts.map((p) => p[r]?.[k]).filter(Boolean);
        if (vs.length) out[r][k] = [Math.min(...vs.map((v) => v[0])), Math.max(...vs.map((v) => v[1]))];
      }
    }
    out.tg = [Math.min(...parts.map((p) => p.tg[0])), Math.max(...parts.map((p) => p.tg[1]))];
    out.tm = [Math.min(...parts.map((p) => p.tm[0])), Math.max(...parts.map((p) => p.tm[1]))];
    return out;
  }
  return e;
}

/** Modifiers that apply to a material (and a grade of it). */
function modifiersOf(m, gradeId) {
  const mods = [];
  const r = m.facets?.reinforcement?.value;
  if (r === 'foaming') mods.push('foaming');
  if (r === 'esd' || m.facets?.esd?.value) mods.push('esd');
  for (const [tag, names] of Object.entries(MODEL.variants)) if (names.includes(m.name)) mods.push(tag);
  const g = gradeId && grades.get(gradeId);
  if (g?.variant && ENV.modifiers[g.variant]) mods.push(g.variant);
  if (/\bFR\b/.test(m.name)) mods.push('flame retardant');
  if (/Tough/i.test(m.name)) mods.push('tough');
  return mods;
}

/** The envelope [lo, hi] of one headline key for a material/grade, or null. */
function envelopeFor(m, key, gradeId, { annealed = false } = {}) {
  const e = identityEnv(identityOf(m));
  if (!e) return null;
  const block = e[reinfOf(m)] ?? e.unfilled;
  let v = annealed && key === 'hdt045' && block.hdt045Annealed ? block.hdt045Annealed : block[key];
  if (v === undefined && reinfOf(m) !== 'unfilled') v = e.unfilled[key];
  if (!v) return null;
  let [lo, hi] = v;
  for (const mod of modifiersOf(m, gradeId)) {
    const f = ENV.modifiers[mod]?.[key];
    if (f) { lo *= f[0]; hi *= f[1]; }
  }
  if (key === 'hdt045' && annealed && !block.hdt045Annealed && e.tm && morph(identityOf(m)) !== 'amorphous') hi = e.tm[1];
  return { lo, hi, tg: e.tg, tm: e.tm };
}

const mul = (env, f) => ({ ...env, lo: env.lo * f[0], hi: env.hi * f[1] });
const union = (a, b) => ({ ...a, lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) });

/** Envelope for a measurement: headline envelope moved to the measurement's own semantics. */
function measurementEnvelope(x) {
  const m = materials.get(x.materialId);
  if (!m) return null;
  const id = identityOf(m);
  const sc = specimenClass(x), dc = dirClass(x), wet = wetOf(x), ann = annealedOf(x);
  const SA = ENV.specimenAdjust;
  const mech = (key, base) => {
    let env = base;
    if (!env) return null;
    const dirAdj = (e) => (dc === 'Z' ? mul(e, SA.Z[key]) : dc === 'unk' ? union(e, mul(e, SA.Z[key])) : e);
    const printed = dirAdj(env), moulded = mul(env, SA.moulded[key]);
    env = sc === 'moulded' ? moulded : sc === 'printed' ? printed : union(printed, moulded);
    if (wet === 'conditioned') env = mul(env, (isPolyamide(id) ? SA.conditioned.polyamide : SA.conditioned.other)[key]);
    return env;
  };
  switch (x.property) {
    case 'Density': return envelopeFor(m, 'density', x.gradeId);
    case 'Tensile modulus': return mech('tensileModulusXY', envelopeFor(m, 'tensileModulusXY', x.gradeId));
    case 'Flexural modulus': { const b = envelopeFor(m, 'tensileModulusXY', x.gradeId); return b && mech('tensileModulusXY', mul(b, SA.flexuralModulus.vsTensile)); }
    case 'Tensile strength (endpoint unspecified)': return mech('tensileStrengthXY', envelopeFor(m, 'tensileStrengthXY', x.gradeId));
    case 'Tensile break strength': { const b = envelopeFor(m, 'tensileStrengthXY', x.gradeId); return b && mech('tensileStrengthXY', mul(b, [0.5, 1])); }
    case 'Tensile yield strength': { const b = envelopeFor(m, 'tensileStrengthXY', x.gradeId); return b && mech('tensileStrengthXY', mul(b, [0.6, 1])); }
    case 'Flexural strength': { const b = envelopeFor(m, 'tensileStrengthXY', x.gradeId); return b && mech('tensileStrengthXY', mul(b, SA.flexuralStrength.vsTensile)); }
    case 'Elongation at break': return mech('elongationXY', envelopeFor(m, 'elongationXY', x.gradeId));
    case 'HDT': {
      const matrix = morph(id) === 'semicrystalline' ? (reinfOf(m) === 'unfilled' ? 'semi-unfilled' : 'semi-filled') : morph(id);
      if (matrix === 'elastomer') return null; // judged by the stiffness criterion below
      const load = x.thermal?.loadStated ? x.thermal.loadMPa : null;
      let env = envelopeFor(m, 'hdt045', x.gradeId, { annealed: ann });
      if (!env) return null;
      const mouldedOrUnknown = sc === 'moulded' || sc === 'unknown';
      if (mouldedOrUnknown) env = { ...env, hi: env.tm && matrix !== 'amorphous' ? env.tm[1] : env.hi + 10 };
      const drop = SA.hdt18[matrix] ?? 20;
      if (load != null && load > 1) return { ...env, lo: env.lo - drop, hi: env.hi, loadNote: '1.8 MPa' };
      if (load == null) return { ...env, lo: env.lo - drop, loadNote: 'load not stated' };
      return env;
    }
    case 'Glass transition temperature': { const e = identityEnv(id); return e?.tg ? { lo: e.tg[0] - 12, hi: e.tg[1] + 12 } : null; }
    case 'Melting temperature': { const e = identityEnv(id); return e?.tm ? { lo: e.tm[0] - 10, hi: e.tm[1] + 10 } : null; }
    default: return null;
  }
}

const usable = db.measurements.filter((x) => x.numeric && !x.quarantined && Number.isFinite(x.value) && !/Retired duplicate/i.test(x.dataStatus ?? '')
  && !grades.get(x.gradeId)?.retired);
const isLog = (p) => !/temperature|HDT/i.test(p);
const csvRef = (x) => ({ sourceId: x.sourceId, locator: x.locator, measurementIds: x.id, gradeId: x.gradeId, materialId: x.materialId, material: materials.get(x.materialId)?.name ?? '' });
const sevFactor = (value, env, log) => {
  if (log) { const f = value > env.hi ? value / env.hi : env.lo / value; return f > 3 ? 'high' : f > 1.4 ? 'medium' : 'low'; }
  const d = value > env.hi ? value - env.hi : env.lo - value; return d > 30 ? 'high' : d > 12 ? 'medium' : 'low';
};

// ------------------------------------------------------------------------------- a. measurement level

for (const x of usable) {
  if (specimenClass(x) === 'film') continue;
  const env = measurementEnvelope(x);
  if (!env) continue;
  const v = x.interval?.hi == null && x.interval?.lo != null ? x.value : x.value; // bounds judged at the bound
  const oneSided = x.interval && (x.interval.hi == null || x.interval.lo == null);
  const out = v < env.lo * (isLog(x.property) ? 1 : 1) - (isLog(x.property) ? 0 : 0) || v > env.hi;
  if (!out) continue;
  if (oneSided && ((x.interval.hi == null && v < env.lo) || (x.interval.lo == null && v > env.hi))) continue; // a bound on the safe side
  const log = isLog(x.property);
  const ratio = log ? (v > env.hi ? v / env.hi : env.lo / v) : null;
  const magnitude = log && ratio >= 8 && [10, 100, 1000].some((k) => Math.abs(Math.log10(ratio) - Math.log10(k)) < 0.25);
  const m = materials.get(x.materialId);
  add({
    check: magnitude ? 'A12-magnitude-slip' : 'A1-outside-envelope', level: 'measurement', severity: sevFactor(v, env, log), ...csvRef(x),
    property: x.property, value: `${x.value} ${x.unit}`, expected: `${r3(env.lo)}-${r3(env.hi)}${env.loadNote ? ` (${env.loadNote})` : ''}`,
    detail: `${identityOf(m)}/${reinfOf(m)}${modifiersOf(m, x.gradeId).length ? `+${modifiersOf(m, x.gradeId).join('+')}` : ''}; specimen ${specimenClass(x)}, direction ${dirClass(x)}, moisture ${wetOf(x)}${annealedOf(x) ? ', annealed' : ''}${ratio ? `; x${r3(ratio)} beyond` : ''}`,
  });
}

// Pairs on one grade
const byGrade = new Map();
for (const x of usable) { if (!byGrade.has(x.gradeId)) byGrade.set(x.gradeId, []); byGrade.get(x.gradeId).push(x); }
const ctxKey = (x, { dir = true, wet = true, spec = true } = {}) => [x.sourceId, spec ? specimenClass(x) : '', dir ? dirClass(x) : '', wet ? wetOf(x) : '', annealedOf(x) ? 'ann' : '', x.printParameters ?? ''].join('|');

for (const [gid, xs] of byGrade) {
  const of = (p) => xs.filter((x) => x.property === p);
  // A2: HDT 0.45 < HDT 1.8 on the same grade and specimen
  const hdt = of('HDT').filter((x) => x.thermal?.loadStated);
  for (const a of hdt.filter((x) => x.thermal.loadMPa < 1)) for (const b of hdt.filter((x) => x.thermal.loadMPa > 1)) {
    if (a.sourceId !== b.sourceId || annealedOf(a) !== annealedOf(b)) continue;
    if (a.value < b.value - 0.5) add({ check: 'A2-hdt045-below-hdt18', level: 'measurement', severity: 'high', ...csvRef(a), measurementIds: `${a.id};${b.id}`, locator: `${a.locator} | ${b.locator}`,
      property: 'HDT', value: `${a.value} @0.45 / ${b.value} @1.8`, expected: 'HDT@0.45 >= HDT@1.8', detail: 'a lighter load cannot deflect at a lower temperature on the same specimen' });
  }
  // A3: HDT above Tm (semicrystalline) or far above Tg (amorphous unfilled, unless annealed)
  const m = materials.get(xs[0].materialId);
  if (!m) continue;
  const id = identityOf(m), mo = morph(id), e = identityEnv(id);
  const ownTm = of('Melting temperature').map((x) => x.value).filter((v) => v > 60);
  const ownTg = of('Glass transition temperature').map((x) => x.value);
  for (const h of hdt.concat(of('HDT').filter((x) => !x.thermal?.loadStated))) {
    const tm = ownTm.length ? Math.max(...ownTm) : e?.tm?.[1];
    if (mo === 'semicrystalline' && tm && h.value > tm + 5) add({ check: 'A3-hdt-above-tm', level: 'measurement', severity: 'high', ...csvRef(h), measurementIds: h.id, property: 'HDT', value: `${h.value} °C`, expected: `<= Tm ${tm} °C`, detail: `${id}; Tm from ${ownTm.length ? 'own DSC' : 'envelope'}` });
    const tg = ownTg.length ? Math.max(...ownTg) : e?.tg?.[1];
    const lift = reinfOf(m) === 'unfilled' ? 15 : 30;
    if (mo === 'amorphous' && id !== 'PLA' && tg != null && h.value > tg + lift && !annealedOf(h)) add({ check: 'A3-hdt-far-above-tg', level: 'measurement', severity: h.value > tg + 2 * lift ? 'high' : 'medium', ...csvRef(h), measurementIds: h.id, property: 'HDT', value: `${h.value} °C${h.thermal?.loadStated ? ` @${h.thermal.loadMPa}` : ''}`, expected: `<= Tg ${tg} + ${lift} °C`, detail: `${id} (amorphous); Tg from ${ownTg.length ? 'own DSC' : 'envelope'}` });
    if (id === 'PLA' && tg != null && h.value > tg + lift && !annealedOf(h)) add({ check: 'A3-pla-hdt-above-tg-not-annealed', level: 'measurement', severity: 'medium', ...csvRef(h), measurementIds: h.id, property: 'HDT', value: `${h.value} °C`, expected: `<= ${tg + lift} °C unless annealed/crystallised`, detail: 'PLA prints amorphous; an HDT this high needs annealing or a nucleated/HT grade — post-processing not recorded' });
  }
  // A3b: HDT on a matrix too soft to carry the load (ISO 75 deflection = 0.2 % outer-fibre strain: E(HDT) ~ sigma / 0.002)
  const moduli = [...of('Flexural modulus'), ...of('Tensile modulus')].filter((x) => dirClass(x) !== 'Z').map((x) => x.value);
  if (moduli.length) {
    const eMax = Math.max(...moduli) * 1000; // MPa at room temperature
    for (const h of of('HDT')) {
      const load = h.thermal?.loadStated ? h.thermal.loadMPa : 0.45;
      const need = load / 0.002;
      if (eMax < need && h.value > 30) add({ check: 'A3b-hdt-on-soft-matrix', level: 'measurement', severity: 'high', ...csvRef(h), measurementIds: h.id, property: 'HDT', value: `${h.value} °C @${load}`, expected: `room-temperature modulus >= ${need} MPa for any HDT above ambient`, detail: `grade's largest in-plane modulus ${r3(eMax)} MPa: the bar would exceed the ISO 75/ASTM D648 deflection (0.2 % strain) at room temperature` });
    }
  }
  // A4: yield or break > ultimate; elongation at yield > at break
  for (const u of of('Tensile strength (endpoint unspecified)')) for (const y of [...of('Tensile yield strength'), ...of('Tensile break strength')]) {
    if (ctxKey(u) !== ctxKey(y)) continue;
    if (y.value > u.value * 1.03) add({ check: 'A4-endpoint-above-ultimate', level: 'measurement', severity: 'medium', ...csvRef(y), measurementIds: `${y.id};${u.id}`, property: y.property, value: `${y.value} > ${u.value} MPa`, expected: 'yield and break stress <= maximum (ultimate) stress', detail: 'the unspecified endpoint may itself be a break value, or one is misread' });
  }
  for (const y of of('Elongation at yield')) for (const b of of('Elongation at break')) {
    if (ctxKey(y) === ctxKey(b) && y.value > b.value * 1.02) add({ check: 'A4-yield-strain-above-break', level: 'measurement', severity: 'high', ...csvRef(y), measurementIds: `${y.id};${b.id}`, property: 'Elongation', value: `${y.value} > ${b.value} %`, expected: 'strain at yield <= strain at break' });
  }
  // A5: conditioned above dry (same source, property, direction)
  for (const p of ['Tensile modulus', 'Flexural modulus', 'Tensile strength (endpoint unspecified)', 'Tensile break strength', 'Tensile yield strength', 'Flexural strength']) {
    const list = of(p);
    for (const w of list.filter((x) => wetOf(x) === 'conditioned')) for (const d of list.filter((x) => wetOf(x) === 'dry')) {
      if (w.sourceId !== d.sourceId || dirClass(w) !== dirClass(d)) continue;
      if (w.value > d.value * 1.05) add({ check: 'A5-conditioned-above-dry', level: 'measurement', severity: isPolyamide(id) ? 'medium' : 'low', ...csvRef(w), measurementIds: `${w.id};${d.id}`, locator: `${w.locator} | ${d.locator}`, property: p, value: `${w.value} wet > ${d.value} dry`, expected: 'absorbed water plasticises a polyamide: conditioned <= dry', detail: `${id}; ${w.postProcessing?.slice(0, 80)} vs ${d.postProcessing?.slice(0, 80)}` });
    }
  }
  // A6: Z above XY (same source, property, moisture, post-processing)
  for (const p of ['Tensile modulus', 'Flexural modulus', 'Tensile strength (endpoint unspecified)', 'Tensile break strength', 'Flexural strength', 'Elongation at break', 'Charpy strength', 'Izod strength']) {
    const list = of(p);
    for (const z of list.filter((x) => dirClass(x) === 'Z')) for (const xy of list.filter((x) => dirClass(x) === 'XY')) {
      if (ctxKey(z, { dir: false }) !== ctxKey(xy, { dir: false }) || z.notch !== xy.notch) continue;
      const tol = /modulus/i.test(p) ? 1.15 : 1.05;
      if (z.value > xy.value * tol) add({ check: 'A6-z-above-xy', level: 'measurement', severity: /strength|Elongation/.test(p) && z.value > xy.value * 1.3 ? 'medium' : 'low', ...csvRef(z), measurementIds: `${z.id};${xy.id}`, locator: `${z.locator} | ${xy.locator}`, property: p, value: `Z ${z.value} > XY ${xy.value} ${z.unit}`, expected: `Z <= XY${tol > 1.1 ? ' (stiffness within 15%)' : ''}`, detail: 'interlayer bonds make Z the weak direction; the direction labels may be swapped (flat vs upright vs on-edge naming)' });
    }
  }
  // A7: notched >= unnotched (same property, unit, source, direction)
  for (const p of ['Charpy strength', 'Izod strength', 'Izod impact strength', 'Impact strength']) {
    const list = of(p);
    for (const n of list.filter((x) => x.notch === 'Notched')) for (const u of list.filter((x) => x.notch === 'Unnotched')) {
      if (n.sourceId !== u.sourceId || n.unit !== u.unit || dirClass(n) !== dirClass(u) || wetOf(n) !== wetOf(u)) continue;
      if (n.value >= u.value) add({ check: 'A7-notched-not-below-unnotched', level: 'measurement', severity: 'medium', ...csvRef(n), measurementIds: `${n.id};${u.id}`, locator: `${n.locator} | ${u.locator}`, property: p, value: `notched ${n.value} >= unnotched ${u.value} ${n.unit}`, expected: 'notched < unnotched' });
    }
  }
  // A8: flexural / tensile modulus ratio outside 0.5-2 (same source, specimen, direction, moisture)
  for (const f of of('Flexural modulus')) for (const t of of('Tensile modulus')) {
    if (ctxKey(f) !== ctxKey(t)) continue;
    const ratio = f.value / t.value;
    if (ratio < 0.5 || ratio > 2) add({ check: 'A8-flex-tensile-modulus-ratio', level: 'measurement', severity: ratio < 0.25 || ratio > 4 ? 'high' : 'medium', ...csvRef(f), measurementIds: `${f.id};${t.id}`, locator: `${f.locator} | ${t.locator}`, property: 'Flexural/Tensile modulus', value: `${f.value} / ${t.value} GPa = ${r3(ratio)}`, expected: '0.5-2', detail: `${id}; specimen ${specimenClass(f)}, direction ${dirClass(f)}` });
  }
  // A9: strength / modulus implying implausible strain
  if (mo !== 'elastomer') for (const s of [...of('Tensile strength (endpoint unspecified)'), ...of('Tensile break strength'), ...of('Tensile yield strength')]) for (const t of of('Tensile modulus')) {
    if (ctxKey(s) !== ctxKey(t)) continue;
    const strain = s.value / (t.value * 1000) * 100; // %
    const brk = of('Elongation at break').find((b) => ctxKey(b) === ctxKey(s));
    if (strain > 12 || strain < 0.4) add({ check: 'A9-implied-strain', level: 'measurement', severity: strain > 25 || strain < 0.2 ? 'high' : 'medium', ...csvRef(s), measurementIds: `${s.id};${t.id}`, locator: `${s.locator} | ${t.locator}`, property: 'strength/modulus', value: `${s.value} MPa / ${t.value} GPa = ${r3(strain)} % linear strain`, expected: '0.4-12 % for a rigid thermoplastic', detail: `${id}` });
    else if (brk && brk.value < 0.6 * strain && s.property !== 'Tensile yield strength') add({ check: 'A9-break-strain-below-linear-strain', level: 'measurement', severity: brk.value < 0.35 * strain ? 'high' : 'medium', ...csvRef(brk), measurementIds: `${brk.id};${s.id};${t.id}`, property: 'Elongation at break', value: `${brk.value} % < sigma/E = ${r3(strain)} %`, expected: 'strain at break >= stress/modulus (thermoplastics soften before failure)', detail: `${id}; ${s.value} MPa / ${t.value} GPa` });
  }
}

// A10/A11: filled grade density below its unfilled base; filled elongation above the unfilled base
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const plainUnfilled = (m) => reinfOf(m) === 'unfilled' && m.facets?.reinforcement?.value === 'unfilled' && !modifiersOf(m).length && !m.excluded && !m.familyEntry;
const baseStats = new Map();
for (const x of usable) {
  const m = materials.get(x.materialId);
  if (!m || !plainUnfilled(m) || grades.get(x.gradeId)?.variant) continue;
  const id = identityOf(m);
  if (!baseStats.has(id)) baseStats.set(id, { density: [], elong: [] });
  if (x.property === 'Density') baseStats.get(id).density.push(x.value);
  if (x.property === 'Elongation at break' && specimenClass(x) === 'printed' && dirClass(x) === 'XY') baseStats.get(id).elong.push(x.value);
}
for (const x of usable) {
  const m = materials.get(x.materialId);
  if (!m || reinfOf(m) === 'unfilled') continue;
  const id = identityOf(m), st = baseStats.get(id), env = identityEnv(id);
  if (x.property === 'Density') {
    const base = st?.density.length ? median(st.density) : env?.unfilled?.density ? (env.unfilled.density[0] + env.unfilled.density[1]) / 2 : null;
    if (base && x.value < base * 0.995) add({ check: 'A10-filled-density-below-base', level: 'measurement', severity: x.value < base * 0.95 ? 'medium' : 'low', ...csvRef(x), property: 'Density', value: `${x.value} kg/m³`, expected: `> unfilled ${id} ${r3(base)} kg/m³ (${st?.density.length ? `median of ${st.density.length} in data` : 'envelope mid'})`, detail: `${reinfOf(m)}: carbon (1750-1800) and glass (2500-2600) fibre are denser than every matrix here; a lower filament density means voids, a foaming or lightweight additive, or a misread` });
  }
  if (x.property === 'Elongation at break' && specimenClass(x) === 'printed' && dirClass(x) === 'XY' && st?.elong.length) {
    const base = median(st.elong);
    if (x.value > base * 1.2 && x.value > 5) add({ check: 'A11-filled-elongation-above-base', level: 'measurement', severity: 'low', ...csvRef(x), property: 'Elongation at break', value: `${x.value} %`, expected: `< unfilled ${id} median ${r3(base)} % (n=${st.elong.length})`, detail: `${reinfOf(m)}: short fibres restrict matrix strain` });
  }
}

// A12b: impact unit slips (J/m vs kJ/m²)
for (const x of usable.filter((x) => /Charpy|Izod|Impact/i.test(x.property))) {
  if (x.unit === 'kJ/m²' && x.value > 200) add({ check: 'A12-impact-magnitude', level: 'measurement', severity: 'medium', ...csvRef(x), property: x.property, value: `${x.value} ${x.unit}`, expected: '< ~200 kJ/m² unless no break', detail: 'a J/m value entered as kJ/m² is ~10x (4 mm bar) too large' });
  if (x.unit === 'J/m' && x.value < 8) add({ check: 'A12-impact-magnitude', level: 'measurement', severity: 'medium', ...csvRef(x), property: x.property, value: `${x.value} ${x.unit}`, expected: '> ~10 J/m', detail: 'a kJ/m² value entered as J/m is ~10x too small' });
}
// A13: raw/normalized reconciliation from the CSV (the build checks this; repeated as a magnitude cross-check)
for (const x of usable) {
  const r = rawById.get(x.id);
  if (!r) continue;
  const raw = Number(r['Raw numeric']), fac = Number(r['Conversion factor']), norm = Number(r['Normalized value']);
  if (Number.isFinite(raw) && Number.isFinite(fac) && Number.isFinite(norm) && norm !== 0 && Math.abs(raw * fac / norm - 1) > 0.02) add({ check: 'A13-raw-normalized-mismatch', level: 'measurement', severity: 'medium', ...csvRef(x), property: x.property, value: `${raw} x ${fac} != ${norm}`, expected: 'raw x factor = normalized' });
}

// A14: direction or condition written in the locator but not in the coded fields
for (const x of usable) {
  const loc = `${x.locator ?? ''}`;
  const ambiguousXZ = /\bX-Z\b|\(X-Z\)/.test(loc);
  const saysZ = !ambiguousXZ && /(\bZ\b|\(Z\)|vertical|upright|\bZX\b|\bZ-?direction)/i.test(loc) && !/X-?Y|XY/.test(loc);
  if (ambiguousXZ && dirClass(x) === 'unk') add({ check: 'A14b-xz-label-ambiguous', level: 'measurement', severity: 'medium', ...csvRef(x), property: x.property, value: `${x.value} ${x.unit}; direction coded ${x.direction}`, expected: 'resolve X-Z (on-edge, in-plane) vs upright against the sheet figure; compare with the XY value', detail: `locator "${loc}"` });
  const saysXY = /(X-?Y|\bXY\b|horizontal|flat)/i.test(loc) && !/\bZ\b/.test(loc);
  if (saysZ && dirClass(x) !== 'Z') add({ check: 'A14-direction-in-locator-not-coded', level: 'measurement', severity: 'high', ...csvRef(x), property: x.property, value: `${x.value} ${x.unit}; direction coded ${x.direction}`, expected: 'direction Z', detail: `locator "${loc}" names the Z direction` });
  if (saysXY && dirClass(x) === 'Z') add({ check: 'A14-direction-in-locator-not-coded', level: 'measurement', severity: 'high', ...csvRef(x), property: x.property, value: `${x.value} ${x.unit}; direction coded ${x.direction}`, expected: 'direction XY', detail: `locator "${loc}" names XY` });
  if (/anneal/i.test(`${loc} ${x.notes ?? ''}`) && !/not anneal|unanneal/i.test(`${loc} ${x.notes ?? ''}`) && !annealedOf(x) && /HDT|Vicat|modulus|strength|Elongation/i.test(x.property)) add({ check: 'A15-annealed-in-locator-not-coded', level: 'measurement', severity: 'medium', ...csvRef(x), property: x.property, value: `${x.value} ${x.unit}`, expected: 'Post-processing names the annealing', detail: `locator/notes mention annealing: ${loc.slice(0, 80)}` });
}

// ---------------------------------------------------------------------------------- b. headline level

const HEAD_PROPS = { density: ['Density'], tensileModulusXY: ['Tensile modulus'], tensileStrengthXY: ['Tensile strength (endpoint unspecified)'], elongationXY: ['Elongation at break'], hdt045: ['HDT'] };
const byMat = new Map();
for (const x of usable) { if (!byMat.has(x.materialId)) byMat.set(x.materialId, []); byMat.get(x.materialId).push(x); }
const meas = new Map(db.measurements.map((x) => [x.id, x]));
const pool = db.materials.filter((m) => !m.familyEntry);

for (const m of pool) {
  for (const key of KEYS) {
    const h = m.headline?.[key];
    if (!h?.known) continue;
    const x = meas.get(h.measurementId);
    const env = envelopeFor(m, key, h.gradeId, { annealed: x && annealedOf(x) });
    const ref = { materialId: m.id, material: m.name, gradeId: h.gradeId, measurementIds: h.measurementId, sourceId: h.sourceId, locator: x?.locator ?? '', property: key };
    if (env && (h.value < env.lo || h.value > env.hi)) add({ check: 'B1-headline-outside-envelope', level: 'headline', severity: sevFactor(h.value, env, LOG_KEYS.has(key)), ...ref, value: `${h.value} ${h.unit}`, expected: `${r3(env.lo)}-${r3(env.hi)}`, detail: `${identityOf(m)}/${reinfOf(m)}${modifiersOf(m, h.gradeId).length ? `+${modifiersOf(m, h.gradeId).join('+')}` : ''}; ${m.excluded ? 'excluded material; ' : ''}specimen ${x ? specimenClass(x) : '?'}` });
    if (!x || key === 'density') continue;
    // B2: headline specimen not printed / dry / as printed, while a printed dry XY value exists on the material
    const issues = [];
    if (specimenClass(x) === 'moulded') issues.push('moulded (raw material)');
    if (specimenClass(x) === 'unknown') issues.push('specimen not stated');
    if (wetOf(x) === 'conditioned') issues.push('conditioned');
    if (annealedOf(x)) issues.push('annealed');
    if (issues.length) {
      const alt = (byMat.get(m.id) ?? []).filter((y) => y.id !== x.id && HEAD_PROPS[key].includes(y.property) && specimenClass(y) === 'printed' && wetOf(y) !== 'conditioned' && !annealedOf(y)
        && (key === 'hdt045' ? y.thermal?.loadStated && y.thermal.loadMPa < 1 : dirClass(y) === 'XY'));
      const onlyAnnealedHdt = issues.length === 1 && issues[0] === 'annealed' && key !== 'hdt045';
      if (!onlyAnnealedHdt) add({ check: alt.length ? 'B2-headline-condition-better-exists' : 'B2-headline-condition', level: 'headline', severity: alt.length ? 'medium' : (issues.includes('annealed') && key === 'hdt045') || issues.includes('conditioned') ? 'medium' : 'low', ...ref, value: `${h.value} ${h.unit}`, expected: alt.length ? `printed dry as-printed alternative(s): ${alt.map((y) => `${y.id}=${y.value}`).join(', ')}` : 'printed, dry, as-printed', detail: `headline specimen: ${issues.join(', ')}; ${x.postProcessing?.slice(0, 90)}` });
    }
    // B3: outlier vs the same grade's other printed XY values of the same property (other source or condition)
    const same = (byMat.get(m.id) ?? []).filter((y) => y.id !== x.id && y.gradeId === x.gradeId && HEAD_PROPS[key].includes(y.property) && specimenClass(y) === specimenClass(x)
      && (key === 'hdt045' ? y.thermal?.loadMPa === x.thermal?.loadMPa && annealedOf(y) === annealedOf(x) : dirClass(y) === 'XY' && wetOf(y) === wetOf(x)));
    if (same.length) {
      const med = median(same.map((y) => y.value));
      const off = key === 'hdt045' ? Math.abs(h.value - med) > 20 : Math.max(h.value / med, med / h.value) > 1.5;
      if (off) add({ check: 'B3-headline-outlier-same-grade', level: 'headline', severity: 'medium', ...ref, value: `${h.value} ${h.unit}`, expected: `same-grade median ${r3(med)} (${same.map((y) => y.id).join(', ')})` });
    }
  }
}

// --------------------------------------------------------------------------------- c. estimate level

const valueOf = (m, key) => { const h = m.headline?.[key]; if (!h) return null; if (h.known) return { v: h.value, src: 'known' }; if (h.estimate) return { v: h.estimate.centre, src: 'estimate', lo: h.estimate.lo, hi: h.estimate.hi }; return null; };
for (const m of pool) {
  for (const key of KEYS) {
    const h = m.headline?.[key];
    const est = h && !h.known ? h.estimate : null;
    if (!est) continue;
    const ref = { materialId: m.id, material: m.name, gradeId: m.representativeGrade, property: key, value: `likely ${r3(est.lo)}-${r3(est.hi)}, plausible ${r3(est.plausible?.lo)}-${r3(est.plausible?.hi)} ${est.unit}`, detail: `canScreen ${est.canScreen}; precision ${est.precision}; strength ${est.strength}; ${m.excluded ? 'excluded' : ''}` };
    // C4: physics says not applicable
    if (key === 'hdt045' && morph(identityOf(m)) === 'elastomer') add({ check: 'C4-estimate-where-not-applicable', level: 'estimate', severity: est.canScreen ? 'high' : 'medium', ...ref, expected: 'not applicable (elastomer: E << 225 MPa, no HDT at 0.45 MPa)', detail: `${ref.detail}; evidence ${est.evidence?.map((e) => e.kind + ':' + e.items.map((i) => i.measurementId).join('/')).join(', ')}` });
    const env = envelopeFor(m, key, m.representativeGrade);
    if (env) {
      const log = LOG_KEYS.has(key);
      if (est.hi < env.lo || est.lo > env.hi) add({ check: 'C1-likely-range-outside-envelope', level: 'estimate', severity: 'high', ...ref, expected: `${r3(env.lo)}-${r3(env.hi)}` });
      else if (est.centre < env.lo || est.centre > env.hi) add({ check: 'C1-centre-outside-envelope', level: 'estimate', severity: 'medium', ...ref, expected: `${r3(env.lo)}-${r3(env.hi)}` });
      const pl = est.plausible;
      if (pl) {
        const tooLow = log ? env.lo / pl.lo > 1.5 : env.lo - pl.lo > 25;
        const tooHigh = log ? pl.hi / env.hi > 1.5 : pl.hi - env.hi > 25;
        if (tooLow || tooHigh) add({ check: 'C1-plausible-tail-beyond-envelope', level: 'estimate', severity: 'low', ...ref, expected: `${r3(env.lo)}-${r3(env.hi)}`, detail: `${ref.detail}; tail ${tooLow ? 'low' : ''}${tooLow && tooHigh ? '+' : ''}${tooHigh ? 'high' : ''} (a tail beyond physics blunts screening on that side)` });
      }
    }
    // C3: width against the precision thresholds
    const p = MODEL.properties[key].precision;
    const width = LOG_KEYS.has(key) ? est.hi / est.lo : est.hi - est.lo;
    if (width > p.fair) add({ check: 'C3-likely-range-too-wide', level: 'estimate', severity: width > p.fair * 2 ? 'medium' : 'low', ...ref, expected: `${LOG_KEYS.has(key) ? 'hi/lo' : 'hi-lo'} <= ${p.fair} (fair)`, detail: `${ref.detail}; width ${r3(width)}` });
    // C5: range below a bound its own measurement proves
    for (const b of h.impliedBounds ?? []) {
      if (est.hi < b.lo) add({ check: 'C5-likely-range-below-implied-bound', level: 'estimate', severity: 'high', ...ref, measurementIds: b.measurementId, expected: `>= ${b.lo} (${b.property} ${b.measurementId})` });
      else if (est.plausible && est.plausible.lo < b.lo * (LOG_KEYS.has(key) ? 0.97 : 1) - (LOG_KEYS.has(key) ? 0 : 2)) add({ check: 'C5-range-extends-below-implied-bound', level: 'estimate', severity: est.lo < b.lo ? 'medium' : 'low', ...ref, measurementIds: b.measurementId, expected: `>= ${b.lo} (${b.property} ${b.measurementId})`, detail: `${ref.detail}; the range is not truncated at the bound its own measurement proves (only screens are vetoed)` });
    }
  }
}
// C6: HDT estimates against the material's own Vicat and melting point (upper consistency the model only treats as observations)
for (const m of pool) {
  const h = m.headline?.hdt045, est = h && !h.known ? h.estimate : null;
  if (!est) continue;
  const own = byMat.get(m.id) ?? [];
  const vicat = own.filter((x) => x.property === 'Vicat softening temperature' && specimenClass(x) !== 'moulded').map((x) => x.value);
  const tm = own.filter((x) => x.property === 'Melting temperature' && x.value > 60).map((x) => x.value);
  const unfilled = reinfOf(m) === 'unfilled';
  if (unfilled && vicat.length && est.plausible.hi > Math.max(...vicat) + 15) add({ check: 'C6-hdt-estimate-above-own-vicat', level: 'estimate', severity: est.hi > Math.max(...vicat) + 15 ? 'medium' : 'low', materialId: m.id, material: m.name, gradeId: m.representativeGrade, property: 'hdt045', value: `likely ${r3(est.lo)}-${r3(est.hi)}, plausible ${r3(est.plausible.lo)}-${r3(est.plausible.hi)} °C`, expected: `<= own Vicat ${Math.max(...vicat)} + 15 °C (unfilled: a 1 mm² needle under 10-50 N softens no later than a bar under 0.45 MPa)`, measurementIds: own.filter((x) => x.property === 'Vicat softening temperature').map((x) => x.id).join(';') });
  const tmv = tm.length ? Math.max(...tm) : MODEL.identities[identityOf(m)]?.tm;
  if (unfilled && tmv && morph(identityOf(m)) === 'semicrystalline' && est.plausible.hi > tmv - 15) add({ check: 'C6-hdt-estimate-near-tm-unfilled', level: 'estimate', severity: 'low', materialId: m.id, material: m.name, gradeId: m.representativeGrade, property: 'hdt045', value: `plausible ${r3(est.plausible.lo)}-${r3(est.plausible.hi)} °C`, expected: `< Tm ${tmv} - 15 °C for an unfilled printed bar`, detail: 'the model caps heat deflection only at Tm (sd 6 °C); an unfilled bar does not deflect within 15 °C of melting' });
}
// C7: HDT 1.8 -> 0.45 conversions for slow-crystallising semicrystalline identities (they print amorphous; the gap is the amorphous one)
for (const m of pool) {
  const est = m.headline?.hdt045 && !m.headline.hdt045.known ? m.headline.hdt045.estimate : null;
  const info = MODEL.identities[identityOf(m)];
  if (!est || !info || info.morphology !== 'semicrystalline' || info.fastCrystallising) continue;
  for (const e of est.evidence ?? []) if (/^HDT 1\.8 semi|^Vicat semi|^Tm semi/.test(e.kind)) add({ check: 'C7-slow-crystalliser-converted-as-semicrystalline', level: 'estimate', severity: 'medium', materialId: m.id, material: m.name, gradeId: e.gradeId, property: 'hdt045', measurementIds: e.items.map((i) => i.measurementId).join(';'), value: `${e.kind}: ${e.items.map((i) => i.value).join('/')} -> ${e.converted} °C`, expected: `${identityOf(m)} prints largely amorphous unless annealed: use the amorphous gap (≈ +5 °C) for as-printed values`, detail: `estimate centre ${est.centre}, likely ${est.lo}-${est.hi}` });
}
// C8: implied lower bounds that are not lower bounds of a printed, dry, as-printed XY headline
for (const m of pool) for (const key of KEYS) {
  const h = m.headline?.[key];
  if (!h || h.known || !h.impliedBounds?.length) continue;
  for (const b of h.impliedBounds) {
    const x = meas.get(b.measurementId);
    if (!x) continue;
    const why = [];
    if (specimenClass(x) === 'film') why.push('film specimen (oriented ASTM D882 film is several times stronger than a printed bar)');
    if (specimenClass(x) === 'unknown' && key !== 'hdt045') why.push('specimen not stated (a moulded bar is stronger and more ductile than a printed one)');
    if (key === 'elongationXY' && wetOf(x) === 'conditioned') why.push('conditioned (water plasticises a polyamide and raises its strain)');
    if (key === 'hdt045' && annealedOf(x)) why.push('annealed (crystallised bar deflects far later than an as-printed one)');
    if (key === 'hdt045' && specimenClass(x) === 'unknown') why.push('specimen not stated (a moulded semicrystalline bar deflects far later)');
    if (x.interval?.kind === 'uncertainty' && b.lo > x.value) why.push(`uses the top of the ± interval (${b.lo}) rather than the value ${x.value}`);
    if (x.retired || grades.get(x.gradeId)?.retired) why.push('retired grade');
    if (why.length) add({ check: 'C8-implied-bound-not-a-bound', level: 'screening', severity: why.some((w) => /film|annealed/.test(w)) ? 'high' : /not stated/.test(why.join()) ? 'medium' : 'low', ...csvRef(x), materialId: m.id, material: m.name, property: key, value: `veto at >= ${b.lo} ${b.unit} (${x.property} ${x.value})`, expected: 'a lower bound must describe a printed, dry, as-printed bar', detail: why.join('; ') });
  }
}

// C9: a screenable estimate whose plausible range covers a small part of what physics allows, resting on thin own evidence
for (const m of pool.filter((x) => !x.excluded)) for (const key of KEYS) {
  const h = m.headline?.[key], est = h && !h.known ? h.estimate : null;
  if (!est?.canScreen || !est.screenRange) continue;
  const env = envelopeFor(m, key, m.representativeGrade);
  if (!env) continue;
  const log = LOG_KEYS.has(key);
  const sr = est.screenRange;
  const hiGap = log ? env.hi / sr.hi : env.hi - sr.hi, loGap = log ? sr.lo / env.lo : sr.lo - env.lo;
  const big = (g) => (log ? g > 2.5 : g > 40);
  const own = (est.evidence ?? []).length;
  if ((big(hiGap) || big(loGap)) && (est.ownShare ?? 0) < 0.6) add({ check: 'C9-screen-range-narrow-vs-physics', level: 'screening', severity: own === 0 ? 'medium' : 'low', materialId: m.id, material: m.name, gradeId: m.representativeGrade, property: key, value: `screen ${r3(sr.lo)}-${r3(sr.hi)} ${est.unit}; ownShare ${est.ownShare}; ${own} evidence items`, expected: `envelope ${r3(env.lo)}-${r3(env.hi)}`, detail: `screens ${big(hiGap) ? `'>=' requirements above ${r3(sr.hi)}` : ''}${big(hiGap) && big(loGap) ? ' and ' : ''}${big(loGap) ? `'<=' requirements below ${r3(sr.lo)}` : ''} that physics alone would allow; the certification back-test holds on average, not for thinly evidenced identities` });
}

// C2: physically wrong orderings between a plain unfilled material and its filled siblings
for (const f of pool.filter((m) => reinfOf(m) !== 'unfilled' && !m.excluded)) {
  const id = identityOf(f);
  const base = pool.filter((m) => identityOf(m) === id && plainUnfilled(m));
  for (const b of base) {
    const rules = [
      ['tensileModulusXY', (fv, bv) => fv < bv * 1.0, 'filled stiffness below unfilled'],
      ['density', (fv, bv) => fv < bv * 0.995, 'filled density below unfilled'],
      ['elongationXY', (fv, bv) => fv > bv * 1.2, 'filled elongation above unfilled'],
      ...(morph(id) === 'semicrystalline' ? [['hdt045', (fv, bv) => fv < bv + 10, 'filled semicrystalline HDT not above unfilled']] : []),
    ];
    for (const [key, bad, what] of rules) {
      const fv = valueOf(f, key), bv = valueOf(b, key);
      if (!fv || !bv || !bad(fv.v, bv.v)) continue;
      const bothKnown = fv.src === 'known' && bv.src === 'known';
      add({ check: bothKnown ? 'C2-ordering-data' : 'C2-ordering-estimate', level: bothKnown ? 'headline' : 'estimate', severity: bothKnown ? 'low' : 'medium', materialId: f.id, material: `${f.name} vs ${b.name}`, property: key,
        measurementIds: [f.headline[key].measurementId, b.headline[key].measurementId].filter(Boolean).join(';'), value: `${f.name} ${r3(fv.v)} (${fv.src}) vs ${b.name} ${r3(bv.v)} (${bv.src})`, expected: what.replace('below', 'above').replace('not above', 'above'), detail: what });
    }
  }
}
// C2b: elastomer stiffness vs Shore hardness (Gent / Qi-Joyce-Boyce)
for (const [gid, hInfo] of Object.entries(MODEL.hardness)) {
  const g = grades.get(gid);
  if (!g) continue;
  const e = modulusFromShore(hInfo.shore) / 1000; // GPa
  const m = materials.get(g.materialId);
  const own = usable.filter((x) => x.gradeId === gid && /modulus/i.test(x.property) && dirClass(x) !== 'Z');
  for (const x of own) {
    const ratio = x.value / e;
    if (ratio > 3 || ratio < 0.1) add({ check: 'C2b-modulus-vs-shore', level: 'measurement', severity: ratio > 3 ? 'high' : 'medium', ...csvRef(x), property: x.property, value: `${x.value} GPa`, expected: `Shore ${hInfo.shore} -> ${r3(e * 1000)} MPa (Gent/Qi); ratio ${r3(ratio)}`, detail: 'a printed elastomer bar is not stiffer than its hardness relation allows; >3x suggests a misread, a secant/flexural basis, or a wrong hardness' });
  }
  const v = valueOf(m, 'tensileModulusXY');
  if (v && m.representativeGrade === gid && (v.v / e > 3 || v.v / e < 0.1)) add({ check: 'C2b-headline-modulus-vs-shore', level: v.src === 'known' ? 'headline' : 'estimate', severity: 'medium', materialId: m.id, material: m.name, gradeId: gid, property: 'tensileModulusXY', value: `${r3(v.v)} GPa (${v.src})`, expected: `Shore ${hInfo.shore} -> ${r3(e * 1000)} MPa`, measurementIds: m.headline.tensileModulusXY.measurementId ?? '' });
}
// C2c: hardness ordering among TPU grades of one manufacturer family (softer Shore should not be stiffer)
{
  const tpu = Object.entries(MODEL.hardness).map(([gid, h]) => ({ gid, h, g: grades.get(gid) })).filter((t) => t.g && /A$/.test(t.h.shore))
    .map((t) => ({ ...t, m: materials.get(t.g.materialId), shore: Number(t.h.shore.replace(/\D/g, '')) }))
    .map((t) => ({ ...t, v: t.m.representativeGrade === t.gid ? valueOf(t.m, 'tensileModulusXY') : null })).filter((t) => t.v);
  for (const a of tpu) for (const b of tpu) if (a.shore < b.shore && a.v.v > b.v.v * 1.1 && a.g.manufacturer === b.g.manufacturer) add({ check: 'C2c-shore-order-inverted', level: 'headline', severity: 'low', materialId: `${a.m.id};${b.m.id}`, material: `${a.m.name} vs ${b.m.name}`, property: 'tensileModulusXY', measurementIds: [a.m.headline.tensileModulusXY.measurementId, b.m.headline.tensileModulusXY.measurementId].filter(Boolean).join(';'), value: `${a.h.shore} ${r3(a.v.v * 1000)} MPa > ${b.h.shore} ${r3(b.v.v * 1000)} MPa`, expected: 'softer Shore -> lower modulus', detail: `${a.g.manufacturer}` });
}

// ------------------------------------------------------------------------------ d. non-circular leak sweep

const ctxBase = (() => { const group = (list) => { const mm = new Map(); for (const x of list) { if (!mm.has(x.materialId)) mm.set(x.materialId, []); mm.get(x.materialId).push(x); } return mm; }; return { db, evidenceByMaterial: group(db.evidence), measurementsByMaterial: group(db.measurements), coverageByMaterial: group(db.coverage) }; })();
const sweepMats = db.materials.filter((m) => !m.familyEntry && !m.excluded);
const leaks = new Map();
let sweepRuns = 0;
for (const key of KEYS) {
  const envs = new Map(sweepMats.map((m) => [m.id, envelopeFor(m, key, m.representativeGrade)]).filter(([, e]) => e));
  const ts = [...new Set([...envs.values()].flatMap((e) => [e.lo, e.hi, e.lo * 0.98, e.hi * 1.02]))].sort((a, b) => a - b);
  for (const op of ['>=', '<=']) for (const t of ts) {
    const c = [{ kind: 'numeric', property: key, operator: op, value: t, mandatory: true }];
    const failsEnv = (m) => { const e = envs.get(m.id); return e && (op === '>=' ? e.hi < t : e.lo > t); };
    const explore = runSelection(sweepMats, c, { ...ctxBase, unknownPolicy: UNKNOWN_POLICY.EXPLORATION, useEstimates: true });
    const strict = runSelection(sweepMats, c, { ...ctxBase, unknownPolicy: UNKNOWN_POLICY.STRICT });
    sweepRuns += 2;
    // D3: screened out (or failed in Strict) although the envelope wholly meets the requirement
    const passesEnv = (m) => { const e = envs.get(m.id); return e && (op === '>=' ? e.lo >= t : e.hi <= t); };
    for (const e of explore.evaluations) {
      const m = materials.get(e.materialId);
      if (!passesEnv(m) || e.eligible) continue;
      const r = e.results[0], h = m.headline[key];
      const k = `over|${m.id}|${key}|${op}`, env = envs.get(m.id);
      const margin = op === '>=' ? env.lo / t : t / env.hi;
      const prev = leaks.get(k);
      if (!prev || margin > prev.margin) leaks.set(k, { mode: 'over', m, key, op, t, margin, basis: h.known ? 'known' : h.notApplicable ? 'not applicable' : h.estimate ? 'estimate screened' : 'none', status: r?.status, reason: r?.reason?.slice(0, 160), env, vetoedBy: '', n: (prev?.n ?? 0) + 1 });
      else prev.n++;
    }
    for (const [mode, sel] of [['explore+est', explore], ['strict', strict]]) {
      for (const e of sel.evaluations) {
        const m = materials.get(e.materialId);
        if (!failsEnv(m)) continue;
        const kept = mode === 'strict' ? e.verdict === STATUS.PASS : e.eligible;
        if (!kept) continue;
        const r = e.results[0];
        const h = m.headline[key];
        const basis = h.known ? (h.loadStated === false ? 'known, load unstated' : (h.interval && (h.interval.hi == null || h.interval.lo == null)) ? 'known one-sided bound' : 'known') : h.notApplicable ? 'not applicable' : h.estimate ? (h.estimate.canScreen ? (r?.vetoedBy?.length ? 'estimate vetoed by implied bound' : 'estimate (screenable, not screened)') : 'estimate not certified to screen') : 'no value, no estimate';
        const k = `${mode}|${m.id}|${key}|${op}`;
        const env = envs.get(m.id);
        const margin = op === '>=' ? t / env.hi : env.lo / t;
        const prev = leaks.get(k);
        if (!prev || margin > prev.margin) leaks.set(k, { mode, m, key, op, t, margin, basis, status: r?.status, reason: r?.reason?.slice(0, 160), env, vetoedBy: r?.vetoedBy?.join('/') ?? '', n: (prev?.n ?? 0) + 1 });
        else prev.n++;
      }
    }
  }
}
for (const l of leaks.values()) {
  const h = l.m.headline[l.key];
  const val = h.known ? `${h.value}` : h.estimate ? `est ${r3(h.estimate.lo)}-${r3(h.estimate.hi)} pl ${r3(h.estimate.plausible?.lo)}-${r3(h.estimate.plausible?.hi)} screen ${r3(h.estimate.screenRange?.lo)}-${r3(h.estimate.screenRange?.hi)}` : 'none';
  const policy = l.basis === 'no value, no estimate' || l.basis === 'estimate not certified to screen' || l.basis === 'known one-sided bound';
  if (l.mode === 'over') { add({ check: 'D3-removed-though-envelope-passes', level: 'screening', severity: l.basis === 'estimate screened' ? 'high' : 'medium', materialId: l.m.id, material: l.m.name, gradeId: l.m.representativeGrade, property: l.key, measurementIds: h.measurementId ?? '', value: val, expected: `envelope ${r3(l.env.lo)}-${r3(l.env.hi)} meets ${l.op} ${r3(l.t)} (margin x${r3(l.margin)}, ${l.n} thresholds)`, detail: `${l.basis}; status ${l.status}; ${l.reason ?? ''}` }); continue; }
  add({ check: l.mode === 'strict' ? 'D2-strict-pass-envelope-fails' : policy ? 'D1-explore-kept-by-policy' : 'D1-explore-kept-envelope-fails', level: 'screening', severity: l.mode === 'strict' || (!policy && l.margin > 1.3) ? 'medium' : 'low',
    materialId: l.m.id, material: l.m.name, gradeId: l.m.representativeGrade, property: l.key, measurementIds: [h.measurementId, l.vetoedBy].filter(Boolean).join(';'),
    value: val, expected: `envelope ${r3(l.env.lo)}-${r3(l.env.hi)} fails ${l.op} ${r3(l.t)} (worst margin x${r3(l.margin)}, ${l.n} thresholds)`, detail: `${l.basis}; status ${l.status}; ${l.reason ?? ''}` });
}

// --------------------------------------------------------------------------------------------- output

const cols = ['check', 'level', 'severity', 'materialId', 'material', 'gradeId', 'measurementIds', 'property', 'value', 'expected', 'sourceId', 'locator', 'detail'];
const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const order = { high: 0, medium: 1, low: 2 };
findings.sort((a, b) => a.check.localeCompare(b.check) || order[a.severity] - order[b.severity] || String(a.materialId).localeCompare(String(b.materialId)));
writeFileSync(join(here, 'physics-findings.csv'), [cols.join(','), ...findings.map((f) => cols.map((c) => esc(f[c])).join(','))].join('\n') + '\n');

const tally = new Map();
for (const f of findings) { const k = f.check; if (!tally.has(k)) tally.set(k, { high: 0, medium: 0, low: 0 }); tally.get(k)[f.severity]++; }
console.log(`physics-check: ${usable.length} usable measurements, ${pool.length} materials, ${sweepRuns} sweep selections; ${findings.length} findings`);
for (const [k, t] of [...tally].sort()) console.log(`  ${k.padEnd(44)} high ${String(t.high).padStart(3)}  medium ${String(t.medium).padStart(3)}  low ${String(t.low).padStart(3)}`);
console.log('wrote physics-findings.csv');
