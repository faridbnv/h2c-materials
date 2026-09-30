#!/usr/bin/env node
// Trace a displayed value back to its source, from the current tables (compiled in memory, so it
// never reads a stale dist/).
//
//   npm run trace -- M020                    every headline of a material
//   npm run trace -- PETG tensileModulusXY   one headline; a material name works too
//   npm run trace -- V000384                 one measurement, and the product value it is
//
// Chain: headline -> measurement (raw, unit, factor, normalized, status, conditions)
//        -> grade (owner, availability) -> source (URL, locator, access, SHA-256).
//
// And one decision (F13; the version 2.1 plan, 3.3), as the page makes it:
//
//   npm run trace -- --scenario <file> --product <GradeID> [--requirement <key or gate>] [--json]
//
// The scenario file is one the page saved, read as the page reads it (deserialize), and the selection is run as the page
// runs it: every material that is not a family entry, with the scenario's policy, evidence, annealing and moisture. For
// the product it says the release, the requirements and the evidence policy; the states the scenario permits, each
// state's verdict and the one it was judged in; for each requirement its status and reason, the records it rests on,
// a measurement's own words and typed conditions and what was admitted unstated, and each source's SHA-256 and locator;
// and its material's verdict and counts. --json prints one object, its keys always in the same order, for tests and
// tools. The database is dist/db.json when it is of the release the tables, rules and engine make now (D96), and is
// compiled in memory from them otherwise, so a trace is never of other tables than the ones on disk.

import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSource } from '../build/src/source.js';
import { snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { releaseIdentity } from '../build/src/release.js';
import { runSelection, UNKNOWN_POLICY } from '../app/js/engine/constraints.js';
import { productsByMaterial, productHeadline, scenarioStates, statePolicy } from '../app/js/engine/products.js';
import { deserialize, applyAssumptions } from '../app/js/engine/scenario.js';

// ---------------------------------------------------------------- one decision

const byId = (rows) => new Map(rows.map((r) => [r.id, r]));
const group = (rows) => {
  const m = new Map();
  for (const r of rows) (m.get(r.materialId) ?? m.set(r.materialId, []).get(r.materialId)).push(r);
  return m;
};

/** The context the page gives the engine for a scenario (app/js/main.js, buildContext and recompute). */
export function pageContext(db, scenario) {
  const useEstimates = scenario.unknownPolicy === UNKNOWN_POLICY.EXPLORATION && scenario.useEstimates !== false;
  return {
    db,
    measurementsByMaterial: group(db.measurements),
    evidenceByMaterial: group(db.evidence),
    polymerEvidenceByMaterial: group(db.polymerEvidence ?? []),
    coverageByMaterial: group(db.coverage),
    productsByMaterial: productsByMaterial(db),
    measurementById: byId(db.measurements),
    gradeById: byId(db.grades),
    unknownPolicy: scenario.unknownPolicy,
    useEstimates,
    showEstimates: useEstimates,
    evidence: scenario.evidence ?? 'comparable',
    anneal: scenario.anneal === true,
    annealMaxC: scenario.annealMaxC ?? null,
    moisture: scenario.moisture === 'conditioned' ? 'conditioned' : 'dry',
  };
}

/** What a requirement is asked by: its property, gate, facet or environment, or evidence or treatment. */
const requirementKey = (c) => (c.kind === 'numeric' ? c.property : c.kind === 'gate' ? c.gate : c.kind === 'facet' ? c.facet
  : c.kind === 'environment' ? c.category : c.kind);
const sortedKeys = (o) => Object.fromEntries(Object.keys(o).filter((k) => !k.startsWith('__')).sort().map((k) => [k, o[k]]));
const stateRef = (s) => ({ id: s.id, treatment: s.treatment ?? null, moisture: s.moisture ?? 'dry' });

function sourceRecord(sources, id) {
  const s = sources.get(id);
  if (!s) return { id, found: false };
  return { id, publisher: s.publisher, title: s.title, url: s.url, sha256: s.sha256, accessDate: s.accessDate, accessState: s.accessState, citationRole: s.citationRole };
}

/** A measurement as a decision cites it: the source's own words beside the typed conditions the engine read. */
function measurementRecord(ix, id, role) {
  const m = ix.measurements.get(id);
  if (!m) return { kind: 'measurement', id, role, found: false };
  return {
    kind: 'measurement', id, role, gradeId: m.gradeId, property: m.property,
    raw: {
      value: m.raw?.value ?? null, unit: m.raw?.unit ?? null, specimen: m.specimenType, direction: m.directionText,
      moisture: m.moisture, postProcessing: m.postProcessing, standard: m.standardText, testTemperature: m.testTemperature,
    },
    typed: {
      value: m.value, unit: m.unit, operator: m.operator, interval: m.interval ?? null, uncertainty: m.uncertainty ?? null,
      specimenForm: m.specimenForm, direction: m.direction, moistureState: m.moistureState, postProcessingState: m.postProcessingState,
      anneal: m.anneal ?? null, standards: m.standards ?? [], loadMPa: m.thermal?.loadMPa ?? null, testTemperatureC: m.testTemperatureC ?? null,
      notch: m.notch, dataStatus: m.dataStatus,
    },
    locator: m.locator,
    source: sourceRecord(ix.sources, m.sourceId),
  };
}

// A chamber the recipe reads from what the sheet says of an enclosure (D93) is traced to those words too.
const enclosureWords = (r, axis) => (axis === 'chamber' && r.chamber?.fromEnclosure ? { enclosure: r.enclosure ?? null } : {});
const profileRecord = (ix, id, role, axis) => {
  const p = ix.profiles.get(id);
  if (!p) return { kind: 'profile', id, role, found: false };
  return { kind: 'profile', id, role, gradeId: p.gradeId, raw: axis ? p[axis]?.text ?? null : null, ...enclosureWords(p, axis), locator: p.locator, source: sourceRecord(ix.sources, p.sourceId) };
};
const guideRecord = (ix, id, role, axis) => {
  const g = ix.guides.get(id);
  if (!g) return { kind: 'guide', id, role, found: false };
  return { kind: 'guide', id, role, name: g.name, raw: axis ? g[axis]?.text ?? null : null, ...enclosureWords(g, axis), locator: g.locator, source: sourceRecord(ix.sources, g.sourceId) };
};
const evidenceRecord = (ix, id, role) => {
  const e = ix.evidence.get(id);
  if (!e) return { kind: 'evidence', id, role, found: false };
  return { kind: 'evidence', id, role, gradeId: e.gradeId ?? null, category: e.category, agent: e.agent ?? null, verdict: e.verdict, finding: e.finding, locator: e.locator, source: sourceRecord(ix.sources, e.sourceId) };
};
const priceRecord = (ix, id, role) => {
  const p = ix.prices.get(id);
  if (!p) return { kind: 'price', id, role, found: false };
  return { kind: 'price', id, role, gradeId: p.gradeId ?? null, retailer: p.retailer, stock: p.stock, url: p.url, accessDate: p.accessDate, source: sourceRecord(ix.sources, p.sourceId) };
};

// A print gate, the key of the product's recipe it reads (build/src/products.js), and the profile's and guide's column.
const PRINT_AXIS = { abrasive: 'hardenedNozzle', dryingKnown: 'drying' };
const RECIPE_FIELD = { nozzle: 'nozzle', bed: 'bed', chamber: 'chamber', abrasive: 'abrasion', dryingKnown: 'drying' };

/** The records one requirement's answer rests on, each with what it is to the answer. */
function requirementRecords(ix, r, { material, grade, state, ctx }) {
  const c = r.constraint;
  const out = [];
  if (c.kind === 'numeric') {
    if (r.measurementId) out.push(measurementRecord(ix, r.measurementId, 'decides'));
    // A value the product publishes that may not decide: without its direction or load, or in another state (D84, D99).
    const h = r.measurementId ? null : productHeadline(material, grade, c.property, ctx, state);
    if (h?.asPublished?.measurementId) out.push(measurementRecord(ix, h.asPublished.measurementId, 'published, not comparable'));
    for (const e of r.elsewhere ?? []) if (e.measurementId) out.push(measurementRecord(ix, e.measurementId, `published in state ${e.stateId}`));
  } else if (c.kind === 'gate' && RECIPE_FIELD[c.gate]) {
    // The part of the recipe the gate reads: the product's own profile, its twin's (D89) or its printer maker's guide (D88).
    const axis = PRINT_AXIS[c.gate] ?? c.gate;
    const from = grade.print?.from?.[axis];
    if (from?.origin === 'guide') {
      out.push(guideRecord(ix, from.guideId, from.label, RECIPE_FIELD[c.gate]));
    } else {
      const owner = from?.origin === 'twin' ? ix.grades.get(from.gradeId) : grade;
      const one = grade.print?.[axis]?.profileId;
      for (const id of one ? [one] : owner?.print?.profileIds ?? []) out.push(profileRecord(ix, id, from?.label ?? 'the product\'s own recipe', RECIPE_FIELD[c.gate]));
    }
  } else if (c.kind === 'gate' && c.gate === 'buyable') {
    for (const id of r.priceIds ?? []) out.push(priceRecord(ix, id, 'offer'));
  } else if (c.kind === 'environment') {
    for (const id of r.evidenceIds ?? []) out.push(evidenceRecord(ix, id, 'decides'));
    for (const id of r.contextIds ?? []) out.push(evidenceRecord(ix, id, 'context, not this product\'s'));
    if (r.polymer) {
      for (const p of ctx.polymerEvidenceByMaterial.get(material.id) ?? []) {
        if (p.category !== c.category) continue;
        out.push({ kind: 'polymer', id: p.id, role: 'the base polymer\'s published behaviour, never a pass', polymerId: p.polymerId, verdict: p.verdict,
          sources: (p.sourceIds ?? []).map((s) => sourceRecord(ix.sources, s)) });
      }
    }
  } else if (c.kind === 'treatment') {
    // The values the state was reached by: each names the schedule its sheet printed.
    for (const [key, v] of Object.entries(state.values ?? {})) if (v.measurementId && v.anneal) out.push(measurementRecord(ix, v.measurementId, `the state's ${key}`));
  }
  return out;
}

function whyNotPermitted(s, policy) {
  if ((s.moisture ?? 'dry') !== policy.moisture) return `the scenario asks about the ${policy.moisture} state`;
  if (s.treatment && !policy.anneal) return 'the scenario does not permit annealing';
  if (s.treatment && policy.annealMaxC != null && s.treatment.tempC > policy.annealMaxC) return `its annealing at ${s.treatment.tempC} °C is above the oven's ${policy.annealMaxC} °C`;
  return 'not permitted';
}

/**
 * One product's decision under a scenario, as the page makes it, with every record it rests on. `scenarioText` is the
 * scenario file's text; `requirement` keeps the requirements asked by that key (a headline, a gate, a facet, an
 * environment, "evidence" or "treatment"). Throws when the product or the requirement is not there to trace.
 */
export function traceDecision(db, scenarioText, productId, { requirement = null, file = null, database = null } = {}) {
  const materialIds = new Set(db.materials.map((m) => m.id));
  const headlineKeys = new Set(db.registry.headlines.map((h) => h.key));
  const { scenario, warnings } = deserialize(scenarioText, db.meta, { materialIds, headlineKeys });
  const saved = JSON.parse(scenarioText).release ?? null;
  const grade = db.grades.find((g) => g.id === productId);
  if (!grade) throw new Error(`${productId} is not a product of this database`);
  if (grade.retired) throw new Error(`${productId} is retired: it backs nothing and is never judged`);

  const ctx = pageContext(db, scenario);
  const units = Object.fromEntries(db.registry.headlines.map((h) => [h.key, h.unit]));
  // A family entry owns no product and is never a candidate; assumptions are the scenario's, never the database's.
  const candidates = db.materials.filter((m) => !m.familyEntry);
  const materials = scenario.assumptions.length ? candidates.map((m) => applyAssumptions(m, scenario.assumptions, units).material) : candidates;
  const { evaluations } = runSelection(materials, scenario.constraints, ctx);
  const evaluation = evaluations.find((e) => e.materialId === grade.materialId);
  if (!evaluation) throw new Error(`${productId}'s material ${grade.materialId} is not a candidate: a family entry owns no product`);
  const entry = (evaluation.products ?? []).find((p) => p.gradeId === productId);
  if (!entry) throw new Error(`${productId} is not among ${grade.materialId}'s products`);

  const material = materials.find((m) => m.id === grade.materialId);
  const policy = statePolicy(ctx);
  const permitted = scenarioStates(grade, ctx);
  const verdicts = new Map((entry.states ?? [{ ...entry.state, verdict: entry.verdict }]).map((s) => [s.id, s.verdict]));
  const state = permitted.find((s) => s.id === entry.state.id);
  const ix = {
    measurements: ctx.measurementById, sources: byId(db.sources), profiles: byId(db.profiles), guides: byId(db.printGuide ?? []),
    evidence: byId(db.evidence), prices: byId(db.prices), grades: ctx.gradeById,
  };

  const asked = entry.results.filter((r) => !requirement || requirementKey(r.constraint) === requirement);
  if (requirement && !asked.length) {
    throw new Error(`No requirement "${requirement}" in this scenario for ${productId}; it asks ${[...new Set(entry.results.map((r) => requirementKey(r.constraint)))].join(', ')}`);
  }
  const requirements = asked.map((r) => ({
    key: requirementKey(r.constraint),
    kind: r.constraint.kind,
    mandatory: r.constraint.mandatory !== false,
    constraint: sortedKeys(r.constraint),
    criterion: r.criterion,
    status: r.status,
    reason: r.reason,
    observed: r.observed ?? null,
    unit: r.unit ?? null,
    closeToLimit: r.closeToLimit ?? false,
    estimated: r.estimated ?? false,
    screened: r.screened ?? false,
    admittedUnstated: r.admitted ?? [],
    treatment: r.treatment ?? null,
    records: requirementRecords(ix, r, { material, grade, state, ctx }),
  }));

  return {
    release: { id: db.meta.release?.id ?? null, digest: db.meta.release?.digest ?? null },
    database,
    scenario: {
      file,
      savedRelease: saved,
      warnings,
      policy: { unknownPolicy: scenario.unknownPolicy, evidence: ctx.evidence, useEstimates: ctx.useEstimates },
      states: policy,
      requirements: scenario.constraints.map((c) => requirementKey(c)),
    },
    product: {
      gradeId: grade.id, materialId: grade.materialId, manufacturer: grade.manufacturer, product: grade.product,
      verdict: entry.verdict, screened: entry.screened ?? false, failedBy: entry.failedBy ?? [], admitted: entry.admitted ?? [],
    },
    states: {
      permitted: permitted.map((s) => ({ ...stateRef(s), verdict: verdicts.get(s.id) ?? null })),
      notPermitted: (grade.states ?? []).filter((s) => !permitted.some((p) => p.id === s.id)).map((s) => ({ ...stateRef(s), why: whyNotPermitted(s, policy) })),
      chosen: entry.state.id,
      rule: 'Judged in each state the scenario permits, as printed first, and answered by the best: a state that passes, else an unresolved one (unscreened before screened), else a failure (D99).',
    },
    requirements,
    material: {
      id: material.id, name: material.name, verdict: evaluation.verdict, eligible: evaluation.eligible,
      share: evaluation.share ?? null, counts: evaluation.counts ?? null, someFail: evaluation.someFail ?? false,
      decidedBy: { gradeId: evaluation.gradeId ?? null, state: evaluation.state?.id ?? null },
    },
  };
}

/** The trace in a reader's words. */
function decisionText(t) {
  const lines = [];
  const say = (depth, s) => lines.push(`${'  '.repeat(depth)}${s}`);
  const stateWords = (s) => `${s.id}${s.verdict ? ` ${s.verdict}` : ''}`;
  say(0, `release ${t.release.id ?? '(unidentified)'}${t.database ? ` (${t.database})` : ''}`);
  const p = t.scenario.policy;
  const st = t.scenario.states;
  say(0, `scenario ${t.scenario.file ?? ''}: ${t.scenario.requirements.length} requirement(s); ${p.unknownPolicy}, ${p.evidence} values, estimates ${p.useEstimates ? 'on' : 'off'}; `
    + `${st.anneal ? `annealing permitted${st.annealMaxC != null ? ` up to ${st.annealMaxC} °C` : ''}` : 'used as printed'}, ${st.moisture}`);
  for (const w of t.scenario.warnings) say(1, `note: ${w}`);
  say(0, `product ${t.product.gradeId} ${t.product.manufacturer} ${t.product.product} (material ${t.product.materialId}): ${t.product.verdict}${t.product.screened ? ', screened' : ''}`);
  say(1, `states permitted: ${t.states.permitted.map(stateWords).join('; ')}; judged in ${t.states.chosen}`);
  for (const s of t.states.notPermitted) say(1, `not permitted: ${s.id} (${s.why})`);
  for (const r of t.requirements) {
    say(1, `${r.criterion}: ${r.status}${r.mandatory ? '' : ' (preference)'}`);
    say(2, r.reason);
    for (const rec of r.records) {
      if (rec.found === false) { say(2, `${rec.kind} ${rec.id}: NOT FOUND`); continue; }
      if (rec.kind === 'measurement') {
        say(2, `${rec.id} ${rec.role}: ${rec.property} "${rec.raw.value}" -> ${rec.typed.value} ${rec.typed.unit} (${rec.typed.dataStatus}), product ${rec.gradeId}`);
        say(3, `specimen "${rec.raw.specimen}" (${rec.typed.specimenForm}); direction "${rec.raw.direction}" (${rec.typed.direction}); moisture "${rec.raw.moisture}" (${rec.typed.moistureState})`);
        say(3, `post-processing "${rec.raw.postProcessing}" (${rec.typed.postProcessingState}${rec.typed.anneal ? `, ${rec.typed.anneal.tempC ?? '?'} °C for ${rec.typed.anneal.hours ?? '?'} h` : ''}); standard "${rec.raw.standard}" (${rec.typed.standards.join(', ') || 'none named'})`);
      } else {
        say(2, `${rec.kind} ${rec.id} ${rec.role}${rec.raw ? `: "${rec.raw}"` : ''}${rec.enclosure ? `, enclosure "${rec.enclosure}"` : ''}${rec.verdict ? `: ${rec.verdict}` : ''}`);
      }
      if (rec.kind === 'measurement' && r.admittedUnstated.length && rec.role === 'decides') say(3, `admitted unstated: ${r.admittedUnstated.join(', ')}`);
      for (const s of rec.source ? [rec.source] : rec.sources ?? []) {
        say(3, `source ${s.id}${s.found === false ? ': NOT FOUND' : `: ${s.publisher} — ${s.title}; sha256 ${s.sha256}`}`);
      }
      if (rec.locator) say(3, `at ${rec.locator}`);
    }
  }
  const m = t.material;
  const c = m.counts;
  say(0, `material ${m.id} ${m.name}: ${m.verdict}${m.share ? ` (${m.share})` : ''}${m.eligible ? ', a candidate' : ''}`
    + (c ? `; of ${c.products} product(s) ${c.pass} pass, ${c.fail} fail, ${c.untested} unresolved${c.screened ? ` (${c.screened} screened)` : ''}` : '')
    + (m.decidedBy.gradeId ? `; answered by ${m.decidedBy.gradeId} in ${m.decidedBy.state}` : ''));
  return lines.join('\n');
}

// ---------------------------------------------------------------- records

function traceRecords(root, query, key) {
  const { wb } = readSource(root);
  const { db } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'trace' });
  const rowsById = (rows, field) => new Map(rows.map((r) => [r[field], r]));
  const measurementRows = rowsById(wb.Properties.rows, 'MeasurementID');
  const gradeRows = rowsById(wb.Grades.rows, 'GradeID');
  const sourceRows = rowsById(wb.Sources.rows, 'SourceID');
  const at = (r) => `${r.__file}:${r.__row}`;

  const out = [];
  const line = (depth, text) => out.push(`${'  '.repeat(depth)}${text}`);

  function source(depth, id) {
    const s = sourceRows.get(id);
    if (!s) return line(depth, `source ${id}: NOT FOUND`);
    line(depth, `source ${id}  (${at(s)})`);
    line(depth + 1, `${s.Publisher} — ${s.Title}${s.Revision !== 'Not published' ? `, ${s.Revision}` : ''}`);
    line(depth + 1, `${s.URL}`);
    line(depth + 1, `accessed ${s['Access date']} · ${s['Access state']} · sha256 ${s.SHA256}`);
  }

  function grade(depth, id) {
    const g = gradeRows.get(id);
    if (!g) return line(depth, `grade ${id}: NOT FOUND`);
    const compiled = db.grades.find((x) => x.id === id);
    line(depth, `grade ${id}  (${at(g)})  ${g.Manufacturer} ${g['Product name']} · material ${g.MaterialID}${compiled?.retired ? ' · RETIRED' : ''}`);
  }

  function measurement(depth, id) {
    const r = measurementRows.get(id);
    if (!r) return line(depth, `measurement ${id}: NOT FOUND`);
    line(depth, `measurement ${id}  (${at(r)})  ${r.Property}`);
    line(depth + 1, `raw "${r['Raw value']}" [${r['Raw unit']}] -> numeric ${r['Raw numeric']} × factor ${r['Conversion factor']} = ${r['Normalized value']} ${r['Normalized unit']}`);
    line(depth + 1, `status ${r['Data status']} · operator ${r.Operator} · direction ${r.Direction} · specimen ${r['Specimen type']}`);
    line(depth + 1, `moisture ${r['Moisture condition']} · standard/load ${r['Standard / load']} · locator ${r.Locator}`);
    if (r.Notes !== 'Not applicable') line(depth + 1, `notes: ${r.Notes}`);
    grade(depth + 1, r.GradeID);
    source(depth + 1, r.SourceID);
  }

  function headline(depth, m, k) {
    const h = m.headline[k];
    if (!h) return line(depth, `${k}: no such headline (${Object.keys(m.headline).join(', ')})`);
    if (h.known) {
      line(depth, `${k} = ${h.value} ${h.unit}  [${h.origin}${h.verified === false ? ', NOT VERIFIED' : ''}]`);
      if (h.priceIds) {
        line(depth + 1, `median of ${h.observations} headline-sample observation(s) · ${h.basis ?? ''}`);
        for (const id of h.priceIds) {
          const p = db.prices.find((x) => x.id === id);
          const row = wb.Prices.rows.find((r) => r.PriceID === id);
          // A foreign listing says its own currency, the VAT it included and the rate it was converted at (D113).
          const amount = `${p.listPrice} ${p.currency}${p.vatPercent != null ? ` incl. ${p.vatPercent}% VAT` : ''}`;
          const rate = p.fx ? ` (${p.regularPerKgNative} ${p.currency}/kg × ${p.fx.cadPerUnit} CAD per ${p.currency}, Bank of Canada ${p.fx.date})` : '';
          line(depth + 2, `${id}  (${at(row)})  ${p.retailer} · ${p.variant} · ${amount} / ${p.netMassKg} kg = ${p.regularPerKg} CAD/kg${rate} · ${p.stock} · accessed ${p.accessDate}`);
          line(depth + 3, p.url);
        }
      } else if (h.spread) {
        // The spread of its products (D83): the median of n comparable values, and the product nearest it.
        line(depth + 1, `median of ${h.spread.n} product(s) publishing it comparably, ${h.spread.min}–${h.spread.max}${h.spread.asPublished ? `; ${h.spread.asPublished.n} more as published` : ''}; typical product ${h.typical.gradeId}`);
        if (h.typical.measurementId) measurement(depth + 1, h.typical.measurementId);
      } else {
        measurement(depth + 1, h.measurementId);
      }
    } else {
      line(depth, `${k}: ${h.text} (${h.missing})`);
      if (h.notApplicable) line(depth + 1, `not applicable: ${h.notApplicable.reason}`);
      if (h.estimate) line(depth + 1, `estimate ${h.estimate.lo}–${h.estimate.hi} ${h.estimate.unit} (likely), plausible ${h.estimate.plausible?.lo}–${h.estimate.plausible?.hi}; ${h.estimate.strength}, precision ${h.estimate.precision}`);
      if (h.related?.count) line(depth + 1, `related evidence: ${h.related.items.map((i) => i.measurementId).join(', ')}`);
    }
  }

  const material = db.materials.find((m) => m.id === query || m.name.toLowerCase() === query.toLowerCase() || m.abbreviation?.toLowerCase() === query.toLowerCase());
  if (material) {
    const row = wb.Materials.rows.find((r) => r.MaterialID === material.id);
    line(0, `${material.id} ${material.name}  (${at(row)})  scope ${material.scope} · family ${material.family} · ${material.gradeIds.length} product(s)`);
    for (const k of key ? [key] : Object.keys(material.headline)) headline(1, material, k);
  } else if (measurementRows.has(query)) {
    measurement(0, query);
    const product = db.grades.find((g) => Object.values(g.headline ?? {}).some((v) => v.measurementId === query));
    const keys = product ? Object.entries(product.headline).filter(([, v]) => v.measurementId === query).map(([k, v]) => `${k}, ${v.level}`) : [];
    line(0, product ? `the value of ${product.id} ${product.manufacturer} ${product.product} for ${keys.join('; ')}` : 'no product\'s value for any headline');
    const typicalOf = db.materials.filter((m) => Object.values(m.headline).some((h) => h.typical?.measurementId === query));
    if (typicalOf.length) line(0, `typical product's value of: ${typicalOf.map((m) => `${m.id} ${m.name} (${Object.entries(m.headline).filter(([, h]) => h.typical?.measurementId === query).map(([k]) => k).join(', ')})`).join('; ')}`);
  } else {
    return null;
  }
  return out.join('\n');
}

// ---------------------------------------------------------------- command line

/**
 * The database of the tables on disk: dist/db.json when the release it was built from is the one they make now,
 * otherwise compiled in memory from them (the build cache makes that cheap after the first time).
 */
function currentDatabase(root) {
  const release = releaseIdentity(root);
  const path = join(root, 'dist/db.json');
  if (existsSync(path)) {
    const db = JSON.parse(readFileSync(path, 'utf8'));
    if (db.meta?.release?.digest === release.digest) return { db, database: 'dist/db.json, of the tables as they are' };
  }
  const { wb } = readSource(root);
  const { db } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'trace' });
  db.meta.release = release;
  return { db, database: 'compiled in memory from the tables as they are' };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const root = resolve('.');
  if (args.includes('--scenario')) {
    const file = option('--scenario');
    const product = option('--product');
    if (!file || !product) {
      console.error('usage: npm run trace -- --scenario <file> --product <GradeID> [--requirement <key or gate>] [--json]');
      process.exit(2);
    }
    try {
      const { db, database } = currentDatabase(root);
      const t = traceDecision(db, readFileSync(file, 'utf8'), product, { requirement: option('--requirement'), file, database });
      console.log(args.includes('--json') ? JSON.stringify(t, null, 2) : decisionText(t));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  } else {
    const [query, key] = args;
    if (!query) {
      console.error('usage: npm run trace -- <MaterialID | material name | MeasurementID> [headlineKey]');
      console.error('       npm run trace -- --scenario <file> --product <GradeID> [--requirement <key or gate>] [--json]');
      process.exit(2);
    }
    const text = traceRecords(root, query, key);
    if (text == null) {
      console.error(`"${query}" is not a MaterialID, material name, abbreviation or MeasurementID`);
      process.exit(2);
    }
    console.log(text);
  }
}
