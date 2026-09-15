// The selection engine. Pure: no DOM, no globals, no imports from ../ui.
//
// Two rules from the brief shape everything here.
//   "Hard constraints determine eligibility. Soft preferences rank eligible candidates."
//   (The second half is not built. A preference is evaluated and reported beside each candidate,
//   but it does not reorder anything, and the interface says so rather than implying a ranking.)
//   Missing data is information: PASS, FAIL, UNKNOWN and INDETERMINATE are four different answers.
//
// INDETERMINATE is not a synonym for UNKNOWN. UNKNOWN means no comparable evidence exists.
// INDETERMINATE means evidence exists and the threshold cuts through it, so the source cannot
// settle the question either way.

export const STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  UNKNOWN: 'UNKNOWN',
  INDETERMINATE: 'INDETERMINATE',
};

export const UNKNOWN_POLICY = {
  STRICT: 'strict',            // unknown does not satisfy a mandatory constraint
  EXPLORATION: 'exploration',  // unknown is retained, flagged "needs verification"
};

/**
 * Coerce a policy value to one the engine recognises.
 *
 * Without this, an unrecognised string (a hand-edited or older URL hash, say) made the verdict and
 * the eligibility test disagree: unresolved candidates were marked UNKNOWN, which the status bar
 * reported as Explore, while the eligibility test still held them out as if Strict. Anything that
 * is not explicitly exploration is strict, which is the conservative direction.
 */
export function normalizePolicy(value) {
  return value === UNKNOWN_POLICY.EXPLORATION ? UNKNOWN_POLICY.EXPLORATION : UNKNOWN_POLICY.STRICT;
}

const fmt = (n) => (Number.isFinite(n) ? String(Number(n.toFixed(6))) : String(n));

/**
 * Compare an asserted interval against a threshold.
 * An unbounded end is null. A point value is lo === hi.
 */
export function compareInterval(interval, operator, threshold) {
  if (!interval) return STATUS.UNKNOWN;
  const { lo, hi, openLow, openHigh } = interval;

  switch (operator) {
    case '>=': {
      if (lo !== null && lo >= threshold) return STATUS.PASS;
      if (hi !== null && (hi < threshold || (hi === threshold && openHigh))) return STATUS.FAIL;
      return STATUS.INDETERMINATE;
    }
    case '>': {
      if (lo !== null && (lo > threshold || (lo === threshold && openLow))) return STATUS.PASS;
      if (hi !== null && hi <= threshold) return STATUS.FAIL;
      return STATUS.INDETERMINATE;
    }
    case '<=': {
      if (hi !== null && hi <= threshold) return STATUS.PASS;
      if (lo !== null && (lo > threshold || (lo === threshold && openLow))) return STATUS.FAIL;
      return STATUS.INDETERMINATE;
    }
    case '<': {
      if (hi !== null && (hi < threshold || (hi === threshold && openHigh))) return STATUS.PASS;
      if (lo !== null && lo >= threshold) return STATUS.FAIL;
      return STATUS.INDETERMINATE;
    }
    default:
      throw new Error(`Unsupported operator "${operator}"`);
  }
}

// ---------------------------------------------------------------- numeric headline

function evaluateNumeric(material, c, ctx = {}) {
  const h = material.headline?.[c.property];
  const label = `${c.property} ${c.operator} ${fmt(c.value)}`;

  if (!h || !h.known) {
    // A property that does not apply (heat deflection of an elastomer, any value of a support
    // product) is a statement, not a gap. It can never pass; with estimates on it holds the material
    // out of Explore like an estimate that fails, and the SCREENED chip brings it back (D43).
    if (ctx.useEstimates && h?.notApplicable) {
      return {
        status: STATUS.UNKNOWN, notApplicable: true, screened: true, vetoedBy: [],
        criterion: label, reason: `Not applicable: ${h.notApplicable.reason}`, missing: h?.missing ?? 'not-published',
      };
    }
    // An estimate is inference, so the verdict stays UNKNOWN whatever it says: the verdict describes
    // the evidence (D26). What an estimate may change is eligibility, and only in one direction. It
    // screens a material out of Explore when its plausible (95%) range and the range the build's back-test
    // lets it screen on both wholly fail the requirement, and no measurement of the material bounds the
    // headline from below and meets it (D48). The likely (80%) range is what the reader sees; the wider
    // ones decide, so a screen is never closer to the threshold than the evidence allows.
    if (ctx.useEstimates && h?.estimate) {
      const est = h.estimate;
      const wide = est.plausible ?? { lo: est.lo, hi: est.hi };
      const plausible = compareInterval({ lo: wide.lo, hi: wide.hi, kind: 'range' }, c.operator, c.value);
      // The build's back-test decides which range may screen (D48): the plausible range of a certified class, or its
      // union with the certified family-only range. An older snapshot without screenRange screens on the plausible range.
      const decides = est.screenRange ?? wide;
      const screenFails = compareInterval({ lo: decides.lo, hi: decides.hi, kind: 'range' }, c.operator, c.value) === STATUS.FAIL;
      const span = `${fmt(est.lo)} to ${fmt(est.hi)} ${est.unit}`;
      // A measurement of the material that bounds this headline from below and meets the requirement vetoes the
      // screen: the headline is at least that value (headline_definitions.csv Lower bound, D48). Other related values,
      // other endpoints and moulded resin values do not bound it; the estimate already carries them.
      const veto = (h.impliedBounds ?? []).filter((b) => compareInterval({ lo: b.lo, hi: null }, c.operator, c.value) === STATUS.PASS);
      const screened = plausible === STATUS.FAIL && screenFails && est.canScreen && !veto.length;
      const reason = plausible === STATUS.FAIL
        ? screened
          ? `Not published. Estimated ${span} (plausibly ${fmt(wide.lo)} to ${fmt(wide.hi)}), which cannot meet this requirement. Screened out; not measured`
          : est.canScreen && !screenFails && !veto.length
            ? `Not published. Estimated ${span} would fail, but the family model alone (${fmt(decides.lo)} to ${fmt(decides.hi)} ${est.unit}) could meet it, and this estimate class is not certified to screen on its own`
          : veto.length
            ? `Not published. Estimated ${span} would fail, but its own ${veto[0].property} ${veto[0].measurementId} (${fmt(veto[0].lo)} ${veto[0].unit}) bounds it from below and meets the requirement, so it is not screened`
            : `Not published. Estimated ${span} would fail, but ${est.screenLimit ?? 'this estimate cannot screen'}`
        : `Not published. Estimated ${span} (plausibly ${fmt(wide.lo)} to ${fmt(wide.hi)}); ${plausible === STATUS.PASS ? 'plausible' : 'possible'}, but never enough to pass`;
      return {
        status: STATUS.UNKNOWN,
        estimated: true,
        estimate: est,
        plausible,
        screened,
        vetoedBy: veto.map((r) => r.measurementId),
        criterion: label,
        reason,
        missing: h?.missing ?? 'not-published',
      };
    }
    return {
      status: STATUS.UNKNOWN,
      reason: h?.missing === 'not-available-in-market'
        ? 'No Canadian price observation in the sampled market'
        : 'Not published in the sampled sources',
      criterion: label,
      missing: h?.missing ?? 'not-published',
    };
  }

  const interval = h.interval ?? { lo: h.value, hi: h.value, kind: 'point' };
  // A published "mean ± band" is judged on its mean (owner ruling, audit 2026-09-15, C-04; DECISIONS D54). The band is
  // mostly a specimen standard deviation, not a tolerance: read as hard limits, "35 ± 4 MPa" never passed 33 MPa and
  // 128 of 362 headlines could decide nothing near their own value. A threshold inside the band is flagged close to
  // the limit. A published range ("42-52") and a one-sided bound ("> 16.5") are still judged as the interval they are.
  const band = interval.kind === 'uncertainty';
  const status = compareInterval(band ? { lo: h.value, hi: h.value, kind: 'point' } : interval, c.operator, c.value);
  const closeToLimit = band && interval.lo <= c.value && c.value <= interval.hi;

  let reason;
  if (status === STATUS.INDETERMINATE) {
    reason = `Reported range ${fmt(interval.lo)} to ${fmt(interval.hi)} ${h.unit} straddles the threshold`;
  } else {
    // A scenario assumption is the reader's own number, never a published one (audit 2026-09-15, A-02).
    reason = h.assumption
      ? `Assumed ${fmt(h.value)} ${h.unit} (a scenario assumption, not published)`
      : `Published ${fmt(h.value)}${band ? ` ± ${fmt(h.uncertainty)}` : ''} ${h.unit}`;
    if (h.direction && h.direction !== 'not-applicable') reason += ` (${h.direction})`;
    if (closeToLimit) reason += `; close to the limit: the threshold lies within the published spread, so ${status === STATUS.PASS ? 'some parts may fall below it' : 'some parts may meet it'}`;
  }
  // A headline whose load was never stated cannot back a load-specific thermal claim outright. It is
  // not unbounded either: measured at 0.45 or 1.8 MPa, the 0.45 MPa value lies in a bracket whose top
  // is the largest load gap its matrix shows (build/src/estimate/screening.js). That top is inference, so it
  // decides only what an estimate may: in Explore with estimates on, a requirement the whole bracket
  // fails screens the material out, and the verdict stays INDETERMINATE (D26, D43).
  // Keyed on the headline's own flag, not its name: any headline defined at a load can lose it (D46 registry).
  if (h.loadStated === false) {
    const b = h.loadBracket;
    const bracket = b ? compareInterval({ lo: b.lo, hi: b.hi, kind: 'range' }, c.operator, c.value) : null;
    // The bracket screens only if the build's back-test certified it (D48); an older snapshot without the flag screens as before.
    const screened = !!(ctx.useEstimates && bracket === STATUS.FAIL && b?.canScreen !== false);
    return {
      status: STATUS.INDETERMINATE,
      reason: b
        ? `${reason}, but the source states the standard without the load, so at 0.45 MPa it is ${fmt(b.lo)} to ${fmt(b.hi)} ${h.unit}${bracket === STATUS.FAIL ? `, which cannot meet this requirement${screened ? '. Screened out; the load is not stated' : ''}` : ''}`
        : `${reason}, but the source states the standard without the load`,
      criterion: label, observed: h.value, unit: h.unit,
      measurementId: h.measurementId, gradeId: h.gradeId, sourceId: h.sourceId,
      caveat: 'load-not-stated', loadBracket: b ?? null, screened, vetoedBy: [],
    };
  }

  return {
    status, reason, criterion: label, closeToLimit,
    observed: h.value, unit: h.unit, interval,
    measurementId: h.measurementId, gradeId: h.gradeId, sourceId: h.sourceId,
    direction: h.direction,
  };
}

// ---------------------------------------------------------------- process gates

const GATE_LABEL = { nozzle: 'Nozzle temperature', bed: 'Bed temperature', chamber: 'Chamber temperature' };

function evaluateGate(material, c) {
  if (c.gate === 'scope') {
    const excluded = material.excluded;
    return {
      status: excluded ? STATUS.FAIL : STATUS.PASS,
      criterion: 'H2C-relevant scope',
      reason: excluded
        ? 'Outside the H2C practical envelope; excluded from the master list'
        : 'In scope for the H2C',
    };
  }
  if (c.gate === 'h2cStatus') {
    const ok = (c.in ?? []).includes(material.h2cStatus);
    return {
      status: ok ? STATUS.PASS : STATUS.FAIL,
      criterion: `H2C status in ${(c.in ?? []).join(', ')}`,
      reason: `Recorded status is "${material.h2cStatus}"`,
    };
  }
  // The nozzle question is about hardware the user lacks, not hardware they have. A hardened
  // nozzle prints abrasive and non-abrasive filament alike, so owning one can never remove a
  // material; the old checkbox did exactly that, holding out the 75 materials with no abrasion
  // guidance. The criterion now screens on a *recorded* requirement: a source that says a hardened
  // nozzle is needed fails it, and a fibre-filled material with no guidance stays unresolved,
  // because the filler is the known cause even where no source wrote it down.
  if (c.gate === 'abrasive') {
    const criterion = 'No hardened nozzle';
    if (c.hardenedAvailable) {
      return { status: STATUS.PASS, criterion: 'Hardened nozzle available', reason: 'A hardened nozzle prints abrasive and non-abrasive filament' };
    }
    const g = material.gates.abrasive;
    if (g === 'requires-hardened') return { status: STATUS.FAIL, criterion, reason: 'A source states it needs an abrasion-resistant nozzle' };
    if (g === 'no-special-concern') return { status: STATUS.PASS, criterion, reason: 'A source states no special nozzle concern' };
    const filler = material.facets?.reinforcement?.value;
    if (filler === 'carbon-fibre' || filler === 'glass-fibre') {
      return { status: STATUS.UNKNOWN, criterion, reason: 'Fibre-filled, but no abrasion guidance was recorded. Treat as abrasive until the grade says otherwise' };
    }
    return {
      status: STATUS.PASS, criterion,
      reason: filler === 'unfilled'
        ? 'No hardened-nozzle requirement recorded'
        : 'No hardened-nozzle requirement recorded. The filler is not disclosed, so check the grade: glow, metal, wood and marble fills can wear brass',
    };
  }

  // "Only show what I can buy." Absence of an offer is not proof a material is unavailable, only
  // that the three sampled Canadian retailers did not list it on the snapshot date, so it returns
  // UNKNOWN rather than FAIL. An offer that was sampled and is out of stock is positive evidence
  // and does fail.
  if (c.gate === 'buyable') {
    const buy = material.buy;
    const label = c.inStock ? 'In stock in Canada' : 'Available from a Canadian retailer';
    if (!buy) {
      return {
        status: STATUS.UNKNOWN, criterion: label,
        reason: 'None of the three sampled Canadian retailers listed this material on the snapshot date',
      };
    }
    if (c.inStock && !buy.anyInStock) {
      return {
        status: STATUS.FAIL, criterion: label,
        reason: `${buy.retailer} lists it, but no sampled offer was in stock on ${buy.accessDate}`,
      };
    }
    return {
      status: STATUS.PASS, criterion: label,
      reason: `${buy.retailer}${buy.perKg ? `, about ${buy.perKg} CAD/kg` : ''}, seen ${buy.accessDate}`,
    };
  }

  if (c.gate === 'dryingKnown') {
    const ok = material.gates.drying === 'required';
    return ok
      ? { status: STATUS.PASS, criterion: 'Drying schedule published', reason: 'A drying schedule is published for this material' }
      : { status: STATUS.UNKNOWN, criterion: 'Drying schedule published', reason: 'No drying schedule in the sampled sources' };
  }

  const g = material.gates[c.gate];
  const label = `${GATE_LABEL[c.gate] ?? c.gate} within H2C baseline`;
  if (!g) return { status: STATUS.UNKNOWN, criterion: label, reason: 'No print profile recorded' };
  switch (g.verdict) {
    case 'within': return { status: STATUS.PASS, criterion: label, reason: g.reason };
    case 'exceeds': return { status: STATUS.FAIL, criterion: label, reason: g.reason };
    // A recommendation is not a requirement, so it never removes a candidate on its own.
    case 'exceeds-recommended': return { status: STATUS.INDETERMINATE, criterion: label, reason: g.reason };
    // Part of a published chamber window is reachable and part is not. The source cannot settle
    // whether the reachable part is enough, which is exactly what INDETERMINATE means.
    case 'partial': return { status: STATUS.INDETERMINATE, criterion: label, reason: g.reason };
    default: return { status: STATUS.UNKNOWN, criterion: label, reason: g.reason };
  }
}

// ---------------------------------------------------------------- facets and evidence

function evaluateFacet(material, c) {
  const f = material.facets?.[c.facet];
  if (c.facet === 'supportMaterial' && f) {
    const ok = f.value === c.equals;
    return {
      status: ok ? STATUS.PASS : STATUS.FAIL,
      criterion: c.equals === false ? 'Build material' : 'Support material',
      reason: f.value ? 'Recorded as a support or interface material' : 'Recorded as a build material',
    };
  }
  const label = `${c.facet} in ${(c.in ?? [String(c.equals)]).join(', ')}`;
  if (!f) return { status: STATUS.UNKNOWN, criterion: label, reason: 'Facet not recorded' };
  const value = f.value;
  const ok = c.in ? c.in.includes(value) : value === c.equals;
  return {
    status: ok ? STATUS.PASS : STATUS.FAIL,
    criterion: label,
    reason: `Recorded as ${value}${f.origin === 'derived' ? ', derived from ' + f.from : ''}`,
    derived: f.origin === 'derived',
  };
}

/**
 * Environment criteria only work where the category actually carries reducible verdicts.
 * For an indicator category the honest answer is UNKNOWN with a pointer to the narrative,
 * never a manufactured PASS.
 */
/** Verdicts that answer "does it resist" with an unqualified yes. Water solubility says "insoluble". */
export const POSITIVE_VERDICTS = ['resistant', 'insoluble'];

function evaluateEnvironment(material, c, ctx) {
  const meta = ctx?.db?.meta?.environmentCategories?.[c.category];
  // The display name is compiled from the mapping file and travels in the snapshot, so the engine
  // can name a category without importing anything from the UI.
  const name = meta?.label ?? String(c.category).replace(/-/g, ' ');
  const label = `${name} evidence`;
  if (meta && meta.kind === 'indicator') {
    return {
      status: STATUS.UNKNOWN,
      criterion: label,
      reason: `The ${name.toLowerCase()} records in this snapshot are narrative only; no reducible verdict exists for any material`,
      indicatorOnly: true,
    };
  }
  const records = (ctx?.evidenceByMaterial?.get(material.id) ?? []).filter((e) => e.category === c.category);
  if (!records.length) return { status: STATUS.UNKNOWN, criterion: label, reason: 'No evidence record for this material' };

  // Only an unqualified positive record satisfies "resists". A source that reports *limited*
  // resistance has said something weaker than the checkbox asks, and the old default accepted it
  // as a clean PASS, so PLA passed a solvent screen on one "limited" record. Limited is now
  // unresolved, which Strict leaves out and Explore keeps flagged.
  const accept = c.require ?? POSITIVE_VERDICTS;
  const matching = records.filter((e) => accept.includes(e.verdict));
  const limited = records.filter((e) => e.verdict === 'limited' && !accept.includes('limited'));
  const contrary = records.filter((e) => ['not-resistant', 'soluble', 'flammable'].includes(e.verdict));
  const ids = (list) => list.map((e) => e.id);
  if (contrary.length && !matching.length) {
    return { status: STATUS.FAIL, criterion: label, reason: `${contrary.length} record(s) report ${contrary[0].verdict}`, evidenceIds: ids(contrary) };
  }
  if (matching.length && contrary.length) {
    return { status: STATUS.INDETERMINATE, criterion: label, reason: 'Evidence is mixed across exposures or grades', evidenceIds: ids(records) };
  }
  if (matching.length && limited.length) {
    return { status: STATUS.INDETERMINATE, criterion: label, reason: `${matching.length} record(s) report ${matching[0].verdict}, ${limited.length} only limited resistance. Check which exposure matters to you`, evidenceIds: ids(records) };
  }
  if (matching.length) {
    return { status: STATUS.PASS, criterion: label, reason: `${matching.length} record(s) report ${matching[0].verdict}. Resistance applies to the recorded exposures, not every chemical in the class`, evidenceIds: ids(matching) };
  }
  if (limited.length) {
    return { status: STATUS.INDETERMINATE, criterion: label, reason: `${limited.length} record(s) report only limited resistance`, evidenceIds: ids(limited) };
  }
  return { status: STATUS.UNKNOWN, criterion: label, reason: 'Records exist but none state a verdict', evidenceIds: ids(records) };
}

// ---------------------------------------------------------------- public API

/**
 * Data-quality criteria. These screen on the strength of the evidence rather than on a property,
 * which the brief treats as a first-class selection domain.
 */
function evaluateEvidence(material, c, ctx) {
  const checks = [];
  if (c.exactGrade) {
    const ms = ctx?.measurementsByMaterial?.get(material.id) ?? [];
    const has = ms.some((m) => m.numeric && m.gradeId && m.gradeId !== 'Not applicable');
    checks.push({ ok: has, label: 'exact-grade measurement', detail: has ? `${ms.length} measurements on record` : 'No grade-specific measurement in the sampled sources' });
  }
  if (c.noConflicts) {
    const cov = ctx?.coverageByMaterial?.get(material.id) ?? [];
    const bad = cov.filter((r) => r.status === 'Conflict' || r.status === 'Quarantined');
    checks.push({ ok: bad.length === 0, label: 'no unresolved conflict', detail: bad.length ? `${bad.length} unresolved: ${bad.map((b) => b.domain).join(', ')}` : 'No unresolved conflict recorded' });
  }
  if (!checks.length) return { status: STATUS.PASS, criterion: 'Evidence', reason: 'No evidence criterion set' };
  const failed = checks.filter((x) => !x.ok);
  return {
    status: failed.length ? STATUS.FAIL : STATUS.PASS,
    criterion: checks.map((x) => x.label).join(' and '),
    reason: (failed.length ? failed : checks).map((x) => x.detail).join('; '),
  };
}

export function evaluateConstraint(material, constraint, ctx = {}) {
  switch (constraint.kind) {
    case 'numeric': return { ...evaluateNumeric(material, constraint, ctx), constraint };
    case 'gate': return { ...evaluateGate(material, constraint), constraint };
    case 'facet': return { ...evaluateFacet(material, constraint), constraint };
    case 'environment': return { ...evaluateEnvironment(material, constraint, ctx), constraint };
    case 'evidence': return { ...evaluateEvidence(material, constraint, ctx), constraint };
    default: throw new Error(`Unsupported constraint kind "${constraint.kind}"`);
  }
}

/**
 * Evaluate one material against every constraint.
 * Eligibility, not ranking. A soft constraint never removes a candidate.
 */
export function evaluateMaterial(material, constraints, ctx = {}) {
  const policy = normalizePolicy(ctx.unknownPolicy);
  const results = constraints.map((c) => evaluateConstraint(material, c, ctx));
  const mandatory = results.filter((r) => r.constraint.mandatory !== false);

  const failed = mandatory.filter((r) => r.status === STATUS.FAIL);
  const unresolved = mandatory.filter((r) => r.status === STATUS.UNKNOWN || r.status === STATUS.INDETERMINATE);

  // The verdict describes the evidence and the policy decides eligibility. They used to be merged:
  // Strict turned "could not be checked" into FAIL, so the FAIL count mixed materials that failed a
  // test with materials nobody had measured, and an export read "does not work" for both.
  let verdict;
  if (failed.length) verdict = STATUS.FAIL;
  else if (!unresolved.length) verdict = STATUS.PASS;
  else verdict = STATUS.UNKNOWN;

  const screened = policy === UNKNOWN_POLICY.EXPLORATION && verdict === STATUS.UNKNOWN && unresolved.some((r) => r.screened);

  return {
    materialId: material.id,
    verdict,
    eligible: verdict === STATUS.PASS || (policy === UNKNOWN_POLICY.EXPLORATION && verdict === STATUS.UNKNOWN && !screened),
    needsVerification: verdict === STATUS.UNKNOWN && policy === UNKNOWN_POLICY.EXPLORATION && !screened,
    // The UI must show when an estimate was involved rather than let the reader assume a measurement.
    usesEstimate: results.some((r) => r.estimated),
    // Held out of Explore by an estimate, not by a failure. Its verdict is still UNKNOWN, so it is
    // counted there and never in FAIL; the status bar can bring it back.
    screened,
    screenedBy: screened ? unresolved.filter((r) => r.screened).map((r) => r.criterion) : [],
    results,
    failed,
    unresolved,
    // Why a strict-mode candidate disappeared: the reason is the unresolved criteria, not a failure.
    heldBy: policy === UNKNOWN_POLICY.STRICT && !failed.length ? unresolved.map((r) => r.criterion) : [],
    // Why a material failed, for the export and the excluded list. heldBy only ever named the
    // unresolved criteria, so a genuine failure exported with an empty reason.
    failedBy: failed.map((r) => r.criterion),
  };
}

/** Run the whole set. Returns evaluations plus the counts the status bar needs. */
export function runSelection(materials, constraints, ctx = {}) {
  const evaluations = materials.map((m) => evaluateMaterial(m, constraints, ctx));
  const counts = { pass: 0, fail: 0, unknown: 0, screened: 0, total: evaluations.length };
  for (const e of evaluations) {
    if (e.verdict === STATUS.PASS) counts.pass++;
    else if (e.verdict === STATUS.UNKNOWN) counts.unknown++;
    else counts.fail++;
    if (e.screened) counts.screened++;
  }
  return { evaluations, counts, candidates: evaluations.filter((e) => e.eligible) };
}

/**
 * Rank criteria by how many candidates each one removed, which is what the "why is my list empty"
 * panel needs. Computed by removing one constraint at a time, so the attribution is real rather
 * than an order-of-evaluation artefact.
 */
export function explainExclusions(materials, constraints, ctx = {}) {
  const base = runSelection(materials, constraints, ctx).candidates.length;
  return constraints.map((c, i) => {
    const without = constraints.filter((_, j) => j !== i);
    const recovered = runSelection(materials, without, ctx).candidates.length - base;
    let removed = 0, held = 0, screened = 0;
    for (const m of materials) {
      const r = evaluateConstraint(m, c, ctx);
      if (r.status === STATUS.FAIL) removed++;
      else if (r.status === STATUS.UNKNOWN || r.status === STATUS.INDETERMINATE) held++;
      if (r.screened) screened++;
    }
    return { constraint: c, removed, held, screened, recovered };
  }).sort((a, b) => b.recovered - a.recovered || b.removed - a.removed);
}
