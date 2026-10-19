// The evidence ledger (D153) and the physics limits per kind of plastic (D154).
//
// A product's own value decides a requirement where it is measured the way the requirement asks (D84). Most products'
// sheets print something else: the HDT at 1.8 MPa and not at 0.45, a stiffness after annealing, conditioned, pulled
// across the layers, or in bending. Each such relation is a row of data/tables/conversions.csv, which says what the
// other value bounds and in which one direction that is safe: a floor (an HDT at 1.8 MPa is at most the HDT at 0.45 MPa),
// a ceiling (an annealed HDT is at least the as-printed one), a band (a tensile modulus lies between 0.70 and 1.59 times
// the flexural one) or an equality (a PET conditioned at laboratory humidity is as stiff as dry). A row of
// data/tables/class_limits.csv says what a kind of plastic cannot be: an unfilled rubber is never stiffer than 0.5 GPa.
//
//   grades[].states[i].bounds[key]   for a headline the state holds no deciding value for (none, one published without
//                                    its direction or load, or a value that is only a ceiling): { lo, hi, openLow,
//                                    openHigh, by: [contribution], disagree? }, lo and hi the intersection of the deciding
//                                    rows' comparable contributions (app/js/engine/ledger.js ledgerInterval), `by` every
//                                    contribution, reported rows' too, which the drawer lists as not yet deciding
//   …values[key].ceilingOnly         a PLA or PET HDT from a moulded or undescribed bar (CV05): still the product's value
//                                    and in its material's spread, but it may only fail a minimum or pass a maximum
//   …values[key].doubtful            a comparable value its own deciding bounds or its kind's limit contradict by more
//                                    than the test scatter: it still decides, and the answer says it is doubtful (C40)
//
// Source values are judged by assess() (products.js) with the target's definition changed only where the row changes it
// (its properties, load, direction, state or bar), so every rule a product value meets applies to them too: D84's
// levels, D92's notch and temperature, D94's standard, the implausible flag. A twin's values feed its sibling's ledger,
// labelled (D89). A key that annealing or moisture does not change is bounded in the first state, as the engine reads it
// (valueStateOf). Nothing here feeds the estimate stage: it reads the products' values and implied bounds, never `bounds`,
// and a demoted value keeps its level.
//
// Every row's band is re-measured at each build on same-sheet pairs: products that publish the source and the target on
// one sheet, the way each asks (CONVERSION-PAIRS, build/snapshot/ledger.csv). Only a deciding row decides; a reported one
// computes and is listed, so a row is switched in a commit of its own with its decision diff.

import { assess, LEVEL, twinOrigin } from './products.js';
import { parseAppliesTo, applies, measurementHeadlines } from './registry.js';
import { ledgerInterval, tidy } from '../../app/js/engine/ledger.js';

const NA = 'Not applicable';
const num = (cell) => (cell == null || cell === NA || cell === '' ? null : Number(cell));
const orNull = (cell) => (cell == null || cell === '' || /^Not (applicable|recorded)$/.test(cell) ? null : cell);
const list = (cell) => String(cell ?? '').split(';').map((s) => s.trim()).filter(Boolean);
// A material of undisclosed commercial variants is not one kind of plastic, nor is a declared variant (D57, D129).
const COMMERCIAL_VARIANT = 'Commercial variant / undisclosed';
const isProduct = (g) => !g.retired && !/-R\d+$/.test(g.id);

/** The rows of conversions.csv, checked against the registry (CONVERSION-ROW) and the physical relations. */
export function compileConversions(rows, { materialRows, registry, issues }) {
  const defs = new Map(registry.headlines.map((h) => [h.key, h]));
  const props = new Map(registry.properties.map((p) => [p.name, p]));
  const relations = new Map((registry.relations ?? []).map((r) => [r.id, r]));
  const out = [];
  for (const r of rows ?? []) {
    const where = `conversions ${r.ConversionID}`;
    const err = (message) => issues.push({ level: 'error', code: 'CONVERSION-ROW', where, message });
    const row = {
      id: r.ConversionID, target: r['Target headline'], sourceProperties: list(r['Source properties']),
      sourceLoadMPa: num(r['Source load MPa']), sourceDirection: r['Source direction'], sourceState: r['Source state'],
      sourceSpecimen: r['Source specimen'], kind: r.Kind, factorLow: num(r['Factor low']), factorHigh: num(r['Factor high']),
      offset: num(r['Absolute offset']) ?? 0, appliesTo: parseAppliesTo(r['Applies to'], where, issues, materialRows),
      appliesToText: orNull(r['Applies to']), relation: orNull(r['Physical relation']), status: r.Status, words: r['Reason words'],
      sourceId: orNull(r.SourceID), basis: r.Basis,
    };
    const def = defs.get(row.target);
    if (!def || def.kind !== 'measurement' || def.drawerOnly) { err(`Target headline ${row.target} is not a selectable measurement headline; a row bounds what a requirement can ask`); continue; }
    for (const p of row.sourceProperties) if (!props.get(p)?.units.includes(def.unit)) err(`${p} is never measured in ${def.unit}, the unit of ${def.key}`);
    const needs = { floor: ['factorLow'], ceiling: ['factorHigh'], 'demote-to-ceiling': ['factorHigh'], band: ['factorLow', 'factorHigh'], equal: ['factorLow', 'factorHigh'] }[row.kind] ?? [];
    for (const f of ['factorLow', 'factorHigh']) {
      if (needs.includes(f) && row[f] == null) err(`A ${row.kind} needs ${f === 'factorLow' ? 'Factor low' : 'Factor high'}`);
      if (!needs.includes(f) && row[f] != null) err(`A ${row.kind} has no ${f === 'factorLow' ? 'Factor low' : 'Factor high'}; write Not applicable`);
    }
    if (row.kind === 'band' && row.factorLow > row.factorHigh) err('A band\'s Factor low is above its Factor high');
    if (row.kind === 'equal' && row.factorLow !== row.factorHigh) err('An equality has one factor: Factor low and Factor high the same');
    if ((row.kind === 'demote-to-ceiling') !== (row.sourceSpecimen === 'moulded or not stated')) err('A demoted value is one from a moulded or undescribed bar, and only a demote-to-ceiling row reads such bars');
    if (row.sourceState === 'annealed' && !def.changesWithAnnealing) err(`${def.key} does not change with annealing, so an annealed value is its value already`);
    if (row.sourceState === 'conditioned' && !def.changesWithMoisture) err(`${def.key} does not change with moisture, so a conditioned value is its value already`);
    if (row.sourceDirection === 'Z' && !def.direction) err(`${def.key} has no direction for a Z value to differ from`);
    if (row.relation) {
      const rel = relations.get(row.relation);
      if (!rel) err(`Physical relation ${row.relation} is not a row of physical_relations.csv`);
      else if (!row.sourceProperties.includes(rel.lower) || !def.valueProperties.includes(rel.higher)
        || (rel.lowerLoadMPa ?? null) !== (row.sourceLoadMPa ?? def.loadMPa ?? null) || (rel.higherLoadMPa ?? null) !== (def.loadMPa ?? null)) {
        err(`${row.relation} puts ${rel.lower}${rel.lowerLoadMPa != null ? ` at ${rel.lowerLoadMPa} MPa` : ''} under ${rel.higher}${rel.higherLoadMPa != null ? ` at ${rel.higherLoadMPa} MPa` : ''}, which is not what this row relates`);
      }
    }
    out.push(row);
  }
  for (const problem of lowerBoundDrift(out, measurementHeadlines(registry))) issues.push({ level: 'error', code: 'LEDGER-LB-DRIFT', where: 'conversions', message: problem });
  return out;
}

/**
 * A headline's lower bound (headline_definitions.csv Lower bound properties) other than its own value at its own load is
 * a floor the ledger must hold too, with factor 1, so one relation lives in agreeing places: physical_relations.csv (the
 * lint and RELATIONS-HEADLINE-DRIFT), the headline's lower bound (the frozen estimate stage's floor) and a conversion row
 * (what decides). Returns the disagreements as sentences.
 */
export function lowerBoundDrift(conversions, headlines) {
  const problems = [];
  for (const h of headlines) {
    const lb = h.lowerBounds;
    for (const p of lb?.properties ?? []) {
      if (h.valueProperties.includes(p) && lb.loadMPa == null) continue;
      const ok = conversions.some((r) => r.target === h.key && r.kind === 'floor' && r.factorLow === 1 && r.offset === 0 && r.sourceProperties.includes(p)
        && (r.sourceLoadMPa ?? null) === (lb.loadMPa ?? null) && r.sourceState === 'same' && r.sourceDirection === 'same');
      if (!ok) problems.push(`${h.key} takes ${p}${lb.loadMPa != null ? ` at ${lb.loadMPa} MPa` : ''} as a lower bound, but no conversion row makes it a floor with factor 1 (same state, same direction${lb.loadMPa != null ? `, Source load MPa ${lb.loadMPa}` : ''})`);
    }
  }
  return problems;
}

/** The rows of class_limits.csv, checked (CLASS-LIMIT-ROW) and, where deciding, sourced (CLASS-LIMIT-SOURCE). */
export function compileClassLimits(rows, { materialRows, registry, sources, issues }) {
  const defs = new Map(registry.headlines.map((h) => [h.key, h]));
  const sourceById = new Map((sources ?? []).map((s) => [s.id, s]));
  const out = [];
  for (const r of rows ?? []) {
    const where = `class_limits ${r.LimitID}`;
    const row = {
      id: r.LimitID, target: r['Target headline'], kind: r.Kind, value: num(r.Value),
      appliesTo: parseAppliesTo(r['Applies to'], where, issues, materialRows), appliesToText: r['Applies to'],
      status: r.Status, words: r['Reason words'], sourceId: orNull(r.SourceID), basis: r.Basis,
    };
    const def = defs.get(row.target);
    const problem = !def || def.kind !== 'measurement' || def.drawerOnly ? `Target headline ${row.target} is not a selectable measurement headline`
      : row.kind === 'neat-density range' && (row.target !== 'density' || row.value != null) ? 'A neat-density range bounds density, from polymers.csv; its Value is Not applicable'
        : row.kind !== 'neat-density range' && row.value == null ? `A ${row.kind} needs a Value`
          : null;
    if (problem) { issues.push({ level: 'error', code: 'CLASS-LIMIT-ROW', where, message: problem }); continue; }
    if (row.status === 'deciding' && row.kind !== 'neat-density range') {
      const s = sourceById.get(row.sourceId);
      if (!s || s.accessState !== 'retrieved' || s.citationRole !== 'cited') {
        issues.push({ level: 'error', code: 'CLASS-LIMIT-SOURCE', where, message: `A deciding limit cites a retrieved, cited source that prints it; ${row.sourceId ?? 'none'} is ${!row.sourceId ? 'recorded' : !s ? 'not in sources.csv' : `${s.accessState}, citation role ${s.citationRole}`}` });
      }
    }
    out.push(row);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ contributions

/** What a row asks of a source value: the target's definition with only what the row changes changed. */
function sourceDefinition(row, def) {
  const d = { ...def, valueProperties: row.sourceProperties, lowerBounds: null };
  if (row.sourceLoadMPa != null) Object.assign(d, { loadMPa: row.sourceLoadMPa, unstatedLoad: 'excluded' });
  if (row.sourceDirection === 'Z') Object.assign(d, { direction: 'Z', unstatedDirection: 'excluded' });
  return d;
}

/** The state a source value is judged in, for a target state (D99), or null where the row does not bound that state. */
function sourceState(row, state, m) {
  if (row.sourceState === 'same') return { treatment: state.treatment ?? null, moisture: state.moisture ?? 'dry' };
  if (row.sourceState === 'annealed') {
    if (state.treatment || m.postProcessingState !== 'annealed') return null;
    return { treatment: m.anneal ?? { tempC: null, hours: null }, moisture: state.moisture ?? 'dry' };
  }
  if ((state.moisture ?? 'dry') === 'conditioned' || m.moistureState !== 'conditioned') return null;
  return { treatment: state.treatment ?? null, moisture: 'conditioned' };
}

const FORMS_MOULDED_OR_UNSTATED = new Set(['moulded', 'not-stated']);
/**
 * assess() for a source value. A row that reads moulded or undescribed bars takes such a bar alone, and judges the rest
 * of what it is (its load, state, notch, standard) as assess does for a bar whose sheet does not describe it.
 */
function judge(m, sdef, own, state, row) {
  if (row.sourceSpecimen === 'moulded or not stated') {
    if (!FORMS_MOULDED_OR_UNSTATED.has(m.specimenForm)) return { excluded: 'not a moulded or undescribed bar' };
    const a = m.specimenForm === 'moulded' ? assess({ ...m, specimenType: 'Not published', specimenForm: 'not-stated' }, sdef, own, state) : assess(m, sdef, own, state);
    return a.excluded ? a : { ...a, admitted: ['specimen'] };
  }
  return assess(m, sdef, own, state);
}

/** A published value as its ends: a point or a mean is itself (D54), a range its two ends, a bound one end, open or not. */
function ends(m) {
  const iv = m.interval ?? { lo: m.value, hi: m.value, kind: 'point' };
  if (iv.kind === 'point' || iv.kind === 'uncertainty') return { lo: m.value, hi: m.value, openLow: false, openHigh: false };
  return { lo: iv.lo ?? null, hi: iv.hi ?? null, openLow: !!iv.openLow, openHigh: !!iv.openHigh };
}

/** One row's contribution from one source value: its own interval on the target. */
function contribution(row, m, a, from) {
  const e = ends(m);
  const scale = (x, f) => (x == null || f == null ? null : tidy(x * f + row.offset));
  const lo = ['floor', 'band', 'equal'].includes(row.kind) ? scale(e.lo, row.factorLow) : null;
  const hi = ['ceiling', 'band', 'equal', 'demote-to-ceiling'].includes(row.kind) ? scale(e.hi, row.factorHigh) : null;
  if (lo == null && hi == null) return null;
  const b = { rule: row.id, kind: row.kind, status: row.status, measurementId: m.id, property: m.property, sourceValue: m.value, lo, hi };
  if (lo != null && e.openLow) b.openLow = true;
  if (hi != null && e.openHigh) b.openHigh = true;
  const factor = row.kind === 'floor' ? row.factorLow : row.kind === 'band' ? null : row.factorHigh;
  if (factor != null) b.factor = factor;
  b.level = a.level;
  const admitted = [...new Set([...(a.admitted ?? []), ...(m.specimenForm === 'not-stated' ? ['specimen'] : [])])];
  if (admitted.length) b.admitted = admitted;
  if (from) b.from = from;
  return b;
}

/** Every contribution a row makes to a target in a state, from the product's own measurements and its twins'. */
function rowContributions(row, def, state, sources, sdef) {
  const out = [];
  if (row.sourceState === 'annealed' && state.treatment) return out;
  if (row.sourceState === 'conditioned' && state.moisture === 'conditioned') return out;
  for (const src of sources) {
    for (const p of row.sourceProperties) {
      for (const m of src.byProperty.get(p) ?? []) {
        const st = sourceState(row, state, m);
        if (!st) continue;
        const a = judge(m, sdef, src.list, st, row);
        if (a.excluded) continue;
        const b = contribution(row, m, a, src.from);
        if (b) out.push(b);
      }
    }
  }
  return out;
}

/** How far outside an end a value may lie before the two disagree: the headline's test scatter at that end (D152). */
const scatterAt = (def, x) => (!def.testScatter ? 0 : def.testScatter.is === 'relative' ? Math.abs(x) * def.testScatter.value / 100 : def.testScatter.value);
const outside = (def, v, lo, hi) => (lo != null && v < tidy(lo - scatterAt(def, lo))) || (hi != null && v > tidy(hi + scatterAt(def, hi)));
const byRecord = (a, b) => (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : String(a.measurementId ?? '').localeCompare(String(b.measurementId ?? '')));
const changes = (def, state) => (state.treatment && def.changesWithAnnealing) || (state.moisture === 'conditioned' && def.changesWithMoisture);

/** The value a product's published headline gives a kind's extremes: its first state's, else what the table shows. */
const publishedValues = (g, key) => [g.states?.[0]?.values?.[key], g.headline?.[key]].filter((v) => v && Number.isFinite(v.value)).map((v) => v.value);

/**
 * Each class limit's extremes as its kind publishes them (D154): over the products that are not variants of the
 * materials the limit names, the lowest and highest values they publish for the headline (comparable or as published),
 * per polymer for a neat-density range.
 */
function classExtremes(limit, { grades, rowById }) {
  const out = new Map();
  for (const g of grades) {
    if (!isProduct(g) || g.variant) continue;
    const row = rowById.get(g.materialId);
    if (!row || row['Modifier / filler'] === COMMERCIAL_VARIANT || !applies(limit.appliesTo, row)) continue;
    const k = limit.kind === 'neat-density range' ? row['Estimate identity'] : '';
    // A neat range is a polymer's: a material that names none (a blend of its own name) has no range to widen.
    if (limit.kind === 'neat-density range' && (!k || /^Not /.test(k))) continue;
    for (const v of publishedValues(g, limit.target)) {
      const e = out.get(k) ?? { min: Infinity, max: -Infinity, minGradeId: null, maxGradeId: null };
      if (v < e.min) Object.assign(e, { min: v, minGradeId: g.id });
      if (v > e.max) Object.assign(e, { max: v, maxGradeId: g.id });
      out.set(k, e);
    }
  }
  return out;
}

/** A class limit's contribution for a product of its kind, or null (a neat range whose polymer row names no source). */
function limitContribution(limit, row, extremes, polymerById) {
  const k = limit.kind === 'neat-density range' ? row['Estimate identity'] : '';
  const e = extremes.get(k);
  let lo = null, hi = null, limitLo = null, limitHi = null, sourceId = limit.sourceId;
  if (limit.kind === 'ceiling') { limitHi = limit.value; hi = Math.max(limit.value, e?.max ?? -Infinity); }
  else if (limit.kind === 'floor') { limitLo = limit.value; lo = Math.min(limit.value, e?.min ?? Infinity); }
  else {
    const p = polymerById.get(k);
    if (!p?.neatDensity || !p.sourceId) return null;
    ({ min: limitLo, max: limitHi } = p.neatDensity);
    lo = Math.min(limitLo, e?.min ?? Infinity);
    hi = Math.max(limitHi, e?.max ?? -Infinity);
    sourceId = p.sourceId;
  }
  const b = { rule: limit.id, kind: limit.kind, status: limit.status, lo, hi, limit: { lo: limitLo, hi: limitHi }, level: LEVEL.COMPARABLE };
  if ((lo != null && lo !== limitLo) || (hi != null && hi !== limitHi)) {
    b.widened = true;
    b.widenedBy = [lo !== limitLo ? e?.minGradeId : null, hi !== limitHi ? e?.maxGradeId : null].filter(Boolean);
  }
  if (sourceId) b.sourceId = sourceId;
  return b;
}

// ------------------------------------------------------------------------------------------------ the ledger

/**
 * Every product's bounds, demoted values and doubtful values (see the head of this file), every row's same-sheet pairs,
 * and the counts the validation report and build/snapshot/ledger.csv give. Mutates grades' states; returns the rows
 * with their counts, for db.conversions and db.classLimits.
 */
export function attachLedger({ grades, materialRows, measurements, registry, conversions = [], classLimits = [], polymers = [], issues = [] }) {
  const defs = new Map(measurementHeadlines(registry).map((h) => [h.key, h]));
  const rowById = new Map(materialRows.map((r) => [r.MaterialID, r]));
  const gradeById = new Map(grades.map((g) => [g.id, g]));
  const polymerById = new Map(polymers.map((p) => [p.id, p]));
  const measurementById = new Map(measurements.map((m) => [m.id, m]));
  const byGrade = new Map();
  for (const m of measurements) {
    if (!m.numeric || !m.gradeId) continue;
    let g = byGrade.get(m.gradeId);
    if (!g) byGrade.set(m.gradeId, g = { list: [], byProperty: new Map() });
    g.list.push(m);
    if (!g.byProperty.has(m.property)) g.byProperty.set(m.property, []);
    g.byProperty.get(m.property).push(m);
  }
  const empty = { list: [], byProperty: new Map() };
  const sdefs = new Map(conversions.map((r) => [r.id, defs.get(r.target) ? sourceDefinition(r, defs.get(r.target)) : null]));
  const extremes = new Map(classLimits.map((l) => [l.id, classExtremes(l, { grades, rowById })]));
  const stats = new Map([...conversions, ...classLimits].map((r) => [r.id, { products: new Set(), states: 0, demoted: new Set(), contradicted: [], disagree: [] }]));
  const disagreements = [];
  const contradictions = { ledger: [], class: [] };

  for (const g of grades) {
    if (g.retired || !g.states?.length) continue;
    const row = rowById.get(g.materialId);
    if (!row) continue;
    const targetApplies = (key) => defs.has(key) && applies(defs.get(key).appliesTo, row);
    const rows = conversions.filter((r) => targetApplies(r.target) && applies(r.appliesTo, row));
    const ofKind = !g.variant && row['Modifier / filler'] !== COMMERCIAL_VARIANT;
    const limits = ofKind ? classLimits.filter((l) => targetApplies(l.target) && applies(l.appliesTo, row)) : [];
    if (!rows.length && !limits.length) continue;
    const sources = [{ ...(byGrade.get(g.id) ?? empty), from: null },
      ...(g.twins ?? []).map((id) => ({ ...(byGrade.get(id) ?? empty), from: twinOrigin(gradeById.get(id)) }))];
    const keys = [...new Set([...rows, ...limits].map((r) => r.target))];
    g.states.forEach((state, i) => {
      for (const key of keys) {
        const def = defs.get(key);
        // A key the state does not change is the first state's, and bounded there (the engine's valueStateOf).
        if (i > 0 && !changes(def, state)) continue;
        let v = state.values[key];
        // A PLA or PET HDT from a moulded or undescribed bar (C35): its value still, but only a ceiling when the row decides.
        const m = v?.measurementId ? measurementById.get(v.measurementId) : null;
        for (const r of rows.filter((x) => x.target === key && x.kind === 'demote-to-ceiling')) {
          if (!m || !FORMS_MOULDED_OR_UNSTATED.has(m.specimenForm)) continue;
          stats.get(r.id).demoted.add(g.id);
          if (r.status === 'deciding' && !v.ceilingOnly) v = state.values[key] = { ...v, ceilingOnly: true };
        }
        const by = [];
        for (const r of rows.filter((x) => x.target === key)) by.push(...rowContributions(r, def, state, sources, sdefs.get(r.id)));
        for (const l of limits.filter((x) => x.target === key)) { const b = limitContribution(l, row, extremes.get(l.id), polymerById); if (b) by.push(b); }
        if (!by.length) continue;
        by.sort(byRecord);
        for (const b of by) { const s = stats.get(b.rule); s.products.add(g.id); s.states++; }
        const decides = v && v.level === LEVEL.COMPARABLE && !v.ceilingOnly;
        const conv = by.filter((b) => b.limit === undefined);
        const iv = ledgerInterval(by);
        if (!decides) {
          (state.bounds ??= {})[key] = { lo: iv?.lo ?? null, hi: iv?.hi ?? null, openLow: !!iv?.openLow, openHigh: !!iv?.openHigh, by, ...(iv?.disagree ? { disagree: true } : {}) };
          // Two contributions with no value between them: the sheets disagree, unresolved until one is re-read.
          const all = ledgerInterval(by.map((b) => ({ ...b, status: 'deciding' })));
          if (all?.disagree) {
            const rec = { gradeId: g.id, state: state.id, key, lo: all.lo, hi: all.hi, loBy: all.loBy, hiBy: all.hiBy, deciding: !!iv?.disagree };
            disagreements.push(rec);
            for (const b of [all.loBy, all.hiBy]) stats.get(b.rule).disagree.push(rec);
          }
          continue;
        }
        // A comparable value decides, always; one its own deciding bounds or its kind's limit contradict by more than the
        // test scatter is doubtful (C40), and so would be one a reported row contradicts, which is counted.
        // Each record is read on its own, at the comparable level a deciding value is at.
        const doubtful = [];
        for (const b of conv) {
          if (b.level !== LEVEL.COMPARABLE || !outside(def, v.value, b.lo, b.hi)) continue;
          const rec = { gradeId: g.id, state: state.id, key, value: v.value, measurementId: v.measurementId, by: b };
          stats.get(b.rule).contradicted.push(rec);
          if (b.status === 'deciding') { contradictions.ledger.push(rec); doubtful.push({ rule: b.rule, measurementId: b.measurementId, lo: b.lo, hi: b.hi }); }
        }
        for (const b of by.filter((x) => x.limit !== undefined)) {
          if (!outside(def, v.value, b.limit.lo, b.limit.hi)) continue;
          const rec = { gradeId: g.id, state: state.id, key, value: v.value, measurementId: v.measurementId, by: b };
          stats.get(b.rule).contradicted.push(rec);
          if (b.status === 'deciding') { contradictions.class.push(rec); doubtful.push({ rule: b.rule, lo: b.limit.lo, hi: b.limit.hi }); }
        }
        if (doubtful.length) state.values[key] = { ...v, doubtful };
      }
    });
  }

  const pairs = new Map(conversions.map((r) => [r.id, measurePairs(r, { defs, sdef: sdefs.get(r.id), grades, byGrade, rowById })]));
  for (const r of conversions) {
    const p = pairs.get(r.id);
    if (r.status === 'deciding' && p.breaking.length) {
      issues.push({ level: 'warn', code: 'CONVERSION-PAIRS', where: `conversions ${r.id}`,
        message: `${r.id} (${r.kind} on ${r.target}): ${p.breaking.length} of ${p.n} same-sheet pair(s) break it: ${p.breaking.slice(0, 4).map((b) => `${b.gradeId} ${b.target} ${b.targetValue} against ${b.source} ${b.sourceValue}`).join('; ')}${p.breaking.length > 4 ? '; …' : ''}`,
        records: p.breaking.map((b) => `${r.id} ${b.target} ${b.source}`) });
    }
  }
  const deciding = disagreements.filter((d) => d.deciding);
  if (deciding.length) {
    issues.push({ level: 'warn', code: 'LEDGER-DISAGREE', where: 'grades',
      message: `${deciding.length} product state(s) whose deciding bounds leave no value between them: ${deciding.slice(0, 4).map((d) => `${d.gradeId} ${d.key} at least ${d.lo} (${d.loBy.rule} ${d.loBy.measurementId ?? ''}) and at most ${d.hi} (${d.hiBy.rule} ${d.hiBy.measurementId ?? ''})`).join('; ')}${deciding.length > 4 ? '; …' : ''}`,
      records: deciding.map((d) => `${d.gradeId} ${d.state} ${d.key}`) });
  }
  if (contradictions.ledger.length) {
    issues.push({ level: 'warn', code: 'LEDGER-CONTRADICTS-VALUE', where: 'grades',
      message: `${contradictions.ledger.length} comparable value(s) outside their own deciding bounds by more than the test scatter, so doubtful: ${contradictions.ledger.slice(0, 4).map((c) => `${c.gradeId} ${c.key} ${c.value} (${c.measurementId}) against ${c.by.rule} ${c.by.measurementId}`).join('; ')}${contradictions.ledger.length > 4 ? '; …' : ''}` });
  }
  if (contradictions.class.length) {
    issues.push({ level: 'warn', code: 'CLASS-LIMIT-CONTRADICTED', where: 'grades',
      message: `${contradictions.class.length} comparable value(s) beyond their kind's limit by more than the test scatter: ${contradictions.class.slice(0, 4).map((c) => `${c.gradeId} ${c.key} ${c.value} (${c.measurementId}) against ${c.by.rule}`).join('; ')}${contradictions.class.length > 4 ? '; …' : ''}`,
      records: contradictions.class.map((c) => `${c.by.rule} ${c.measurementId}`) });
  }

  const count = (id) => { const s = stats.get(id); return { products: s.products.size, states: s.states, contradicted: s.contradicted.length, disagree: s.disagree.length }; };
  return {
    conversions: conversions.map((r) => ({ ...rowOut(r), counts: { ...count(r.id), demoted: stats.get(r.id).demoted.size }, pairs: pairs.get(r.id) })),
    classLimits: classLimits.map((l) => ({ ...rowOut(l), counts: count(l.id), extremes: [...extremes.get(l.id)].sort(([a], [b]) => a.localeCompare(b)).map(([polymer, e]) => ({ polymer: polymer || null, min: e.min, max: e.max, minGradeId: e.minGradeId, maxGradeId: e.maxGradeId })) })),
  };
}

/** A compiled row as the database carries it: its Applies to as written, not parsed. */
const rowOut = ({ appliesTo, ...r }) => r;

/** A measurement's own state (D99): annealed at its schedule or as printed, conditioned or dry. */
const ownState = (m) => ({ treatment: m.postProcessingState === 'annealed' ? (m.anneal ?? { tempC: null, hours: null }) : null, moisture: m.moistureState === 'conditioned' ? 'conditioned' : 'dry' });
const pointLike = (m) => !m.interval || m.interval.kind === 'point' || m.interval.kind === 'uncertainty';

/**
 * A row re-measured on same-sheet pairs (CONVERSION-PAIRS): every product (active, not a study or reference grade) whose
 * one sheet prints the target the way it asks and a source value the row reads, in the states the row relates, the same
 * direction where the row keeps it. For each pair, what the target is against the source (a ratio, or a difference in
 * °C), and the pairs whose target lies outside the row's own interval from that source (an equality, outside the test
 * scatter). A printed bar is the target of a demote-to-ceiling row.
 */
export function measurePairs(row, { defs, sdef, grades, byGrade, rowById }) {
  const def = defs.get(row.target);
  const out = { n: 0, products: 0, min: null, max: null, implied: def?.unit === '°C' ? 'difference' : 'ratio', breaking: [] };
  if (!def || !sdef) return out;
  const products = new Set();
  const implied = [];
  for (const g of grades) {
    if (!isProduct(g)) continue;
    const own = byGrade.get(g.id);
    const material = rowById.get(g.materialId);
    if (!own || !material || !applies(def.appliesTo, material) || !applies(row.appliesTo, material)) continue;
    for (const p of def.valueProperties) {
      for (const t of own.byProperty.get(p) ?? []) {
        if (!pointLike(t)) continue;
        // The target the way the headline asks: comparable (D84), and for a demoted value a printed bar.
        const st = ownState(t);
        const at = assess(t, def, own.list, st);
        if (at.excluded || at.level !== LEVEL.COMPARABLE) continue;
        if (row.kind === 'demote-to-ceiling' && t.specimenForm !== 'printed') continue;
        for (const sp of row.sourceProperties) {
          for (const s of own.byProperty.get(sp) ?? []) {
            if (s === t || s.sourceId !== t.sourceId || !pointLike(s)) continue;
            // One test's endpoint against the same endpoint, where the row reads the target's own properties.
            if (row.sourceProperties.includes(t.property) && s.property !== t.property) continue;
            if (row.sourceDirection === 'same' && def.direction && s.direction !== t.direction) continue;
            const ss = sourceState(row, st, s);
            if (!ss) continue;
            const a = judge(s, sdef, own.list, ss, row);
            if (a.excluded) continue;
            const b = contribution(row, s, a, null);
            if (!b) continue;
            out.n++;
            products.add(g.id);
            implied.push(def.unit === '°C' ? tidy(t.value - s.value) : tidy(t.value / s.value));
            const breaks = row.kind === 'equal' ? outside(def, t.value, b.lo, b.hi) : (b.lo != null && t.value < b.lo) || (b.hi != null && t.value > b.hi);
            if (breaks) out.breaking.push({ gradeId: g.id, target: t.id, targetValue: t.value, source: s.id, sourceValue: s.value });
          }
        }
      }
    }
  }
  out.products = products.size;
  if (implied.length) { out.min = Math.min(...implied); out.max = Math.max(...implied); }
  out.breaking.sort((a, b) => a.gradeId.localeCompare(b.gradeId) || a.target.localeCompare(b.target) || a.source.localeCompare(b.source));
  return out;
}
