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

import { productView, scenarioStates, SHARE } from './products.js';

export { SHARE };

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

/** A range whose ends may be open (null): "40 to 60", "at least 40", "at most 60". */
export const rangeText = (lo, hi, unit = '') => `${lo != null && hi != null ? `${fmt(lo)} to ${fmt(hi)}` : lo != null ? `at least ${fmt(lo)}` : `at most ${fmt(hi)}`}${unit ? ` ${unit}` : ''}`;

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
    // headline from below and meets it (D48). Each end of the screening range is set on its own (D59): an end
    // the back-test cannot set, or that the material's own evidence lies beyond, is open and screens nothing. The
    // likely (80%) range is what the reader sees; the wider ones decide.
    if (ctx.useEstimates && h?.estimate) {
      const est = h.estimate;
      const wide = est.plausible ?? { lo: est.lo, hi: est.hi };
      const plausible = compareInterval({ lo: wide.lo, hi: wide.hi, kind: 'range' }, c.operator, c.value);
      // The build's back-test decides the range that may screen, end by end (D48, D59). An older snapshot without
      // screenRange screens on the plausible range.
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
          : veto.length
            ? `Not published. Estimated ${span} would fail, but its own ${veto[0].property} ${veto[0].measurementId} (${fmt(veto[0].lo)} ${veto[0].unit}) bounds it from below and meets the requirement, so it is not screened`
            : est.canScreen && (c.operator.startsWith('>') ? decides.hi != null : decides.lo != null)
              ? `Not published. Estimated ${span} would fail, but the range it may screen on, ${rangeText(decides.lo, decides.hi, est.unit)}, could still meet it`
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
    // A product value the source published without the direction or the load: shown, and not comparable (D84).
    if (h?.asPublished) {
      const what = h.asPublished.caveat === 'load-not-stated' ? 'the test load' : 'the test direction';
      return {
        status: STATUS.UNKNOWN, criterion: label, missing: 'not-comparable', asPublished: h.asPublished,
        reason: `Published ${fmt(h.asPublished.value)} ${h.unit} without stating ${what}, so it is not compared (include values published that way to use it)`,
      };
    }
    // Published in a state this scenario does not judge the product in (D99): said, with what would let it decide.
    if (h?.elsewhere?.length) {
      return { status: STATUS.UNKNOWN, criterion: label, missing: 'other-state', elsewhere: h.elsewhere, reason: elsewhereReason(h, material.state) };
    }
    return {
      status: STATUS.UNKNOWN,
      reason: h?.missing === 'not-available-in-market'
        ? 'No price observation of its own in the sampled shops'
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
    // A value whose sheet leaves the load or direction unstated decides only when the reader includes such values (D84).
    if (h.caveat) reason += `, its test ${h.caveat === 'load-not-stated' ? 'load' : 'direction'} not stated (counted because values published that way are included)`;
    else if (h.direction && h.direction !== 'not-applicable') reason += ` (${h.direction})`;
    // The state the value is the product's in (D99), and the method it was measured to: a pooled method is not an equal one.
    if (h.anneal) reason += `, after annealing ${schedule(h.anneal)}`;
    if (h.standards?.length) reason += ` (${h.standards.join(', ')})`;
    // A twin's value is printed on its sibling's sheet too, and recorded there once (D89).
    if (h.from?.label) reason += `, ${h.from.label}`;
    // What the screening policy admitted unstated (GOALS 2026-09-28, decision 5).
    if (h.admitted?.length) reason += `; ${listWords(h.admitted.map((a) => ADMITTED_WORDS[a]))} not stated, admitted for screening`;
    if (closeToLimit) reason += `; close to the limit: the threshold lies within the published spread, so ${status === STATUS.PASS ? 'some parts may fall below it' : 'some parts may meet it'}`;
  }
  return {
    status, reason, criterion: label, closeToLimit,
    observed: h.value, unit: h.unit, interval,
    measurementId: h.measurementId, gradeId: h.gradeId, sourceId: h.sourceId,
    direction: h.direction,
    ...(h.admitted?.length ? { admitted: h.admitted } : {}),
  };
}

const ADMITTED_WORDS = { specimen: 'specimen form', moisture: 'moisture state', treatment: 'treatment' };
const listWords = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
/** An annealing schedule in a reader's words, the parts its sheet does not state said so. */
export const schedule = (t) => `at ${t?.tempC != null ? `${fmt(t.tempC)} °C` : 'a temperature its sheet does not state'} for ${t?.hours != null ? `${fmt(t.hours)} h` : 'a time its sheet does not state'}`;
const stateWords = (s) => (s?.treatment ? `after annealing ${schedule(s.treatment)}` : 'as printed') + (s?.moisture === 'conditioned' ? ', conditioned' : '');

/** Why a value the product publishes in another state does not decide in this one, and what would let it (D99). */
function elsewhereReason(h, state) {
  const e = h.elsewhere[0];
  const where = `${e.measurementId ? `${e.measurementId}: ` : ''}${fmt(e.value)} ${h.unit}`;
  if (e.treatment && !state?.treatment) {
    return `Published only after annealing ${schedule(e.treatment)} (${where}); this product is judged as printed. Permit annealing to judge it in that state`;
  }
  if (e.moisture === 'conditioned' && state?.moisture !== 'conditioned') return `Published only after moisture conditioning (${where}), not for the dry state this scenario asks about`;
  if (e.moisture !== 'conditioned' && state?.moisture === 'conditioned') {
    return `Published only dry or with moisture unstated (${where}); this scenario asks about the conditioned state, and no conditioned value is inferred from a dry one`;
  }
  return `Published ${stateWords(e)} (${where}), not ${stateWords(state)}; two states are never joined as one part`;
}

// ---------------------------------------------------------------- treatment

/**
 * The treatment a state needs (D99). A product judged in an annealed state is judged on values reached only after that
 * annealing, which the scenario permits: the verdict says so. An annealing its sheet does not state in full cannot be
 * carried out as tested, so it settles nothing.
 */
function evaluateTreatment(material) {
  const t = material.state?.treatment;
  if (!t) return { status: STATUS.PASS, criterion: 'Treatment', reason: 'Used as printed' };
  if (t.tempC == null || t.hours == null) {
    return { status: STATUS.UNKNOWN, criterion: 'Annealing', treatment: t, reason: `Its values in this state are of bars annealed ${schedule(t)}; an annealing its sheet does not state cannot be repeated, so it settles nothing` };
  }
  return { status: STATUS.PASS, criterion: 'Annealing', treatment: t, reason: `Needs annealing ${schedule(t)}, as its sheet states; this scenario permits annealing` };
}
export const TREATMENT = { kind: 'treatment', mandatory: true, __group: 'Manufacturing' };

// ---------------------------------------------------------------- process gates

const GATE_LABEL = { nozzle: 'Nozzle temperature', bed: 'Bed temperature', chamber: 'Chamber temperature' };

function evaluateGate(material, c) {
  if (c.gate === 'scope') {
    const excluded = material.excluded;
    return {
      status: excluded ? STATUS.FAIL : STATUS.PASS,
      criterion: 'H2C-relevant scope',
      // Scope is the one place exclusion is recorded (m146); the material's Limitations say why it is out (an envelope
      // the H2C cannot reach, or a sintering feedstock whose part is not the printed polymer).
      reason: excluded
        ? 'Excluded from the candidates (Scope Excluded); its Limitations say why'
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
    // Read from a twin's sheet or a printer maker's guide where the product's own is silent (D88, D89): said so.
    const from = material.gates.abrasiveFrom ? ` (${material.gates.abrasiveFrom})` : '';
    if (g === 'requires-hardened') return { status: STATUS.FAIL, criterion, reason: `A source states it needs an abrasion-resistant nozzle${from}` };
    if (g === 'no-special-concern') return { status: STATUS.PASS, criterion, reason: `A source states no special nozzle concern${from}` };
    const filler = material.facets?.reinforcement?.value;
    if (filler === 'carbon-fibre' || filler === 'glass-fibre') {
      return { status: STATUS.UNKNOWN, criterion, reason: 'Fibre-filled, but no abrasion guidance was recorded. Treat as abrasive until the product says otherwise' };
    }
    return {
      status: STATUS.PASS, criterion,
      reason: filler === 'unfilled'
        ? 'No hardened-nozzle requirement recorded'
        : 'No hardened-nozzle requirement recorded. The filler is not disclosed, so check the product: glow, metal, wood and marble fills can wear brass',
    };
  }

  // "Only show what I can buy." Absence of an offer is not proof a material is unavailable, only
  // that the sampled Canadian retailers did not list it when they were sampled, so it returns
  // UNKNOWN rather than FAIL. An offer that was sampled and is out of stock is positive evidence
  // and does fail. A product is judged on its own offers (D98): another product's stock is not its own. A foreign
  // listing prices a product and lists it in no Canadian shop (D113): `buy` holds Canadian offers only.
  if (c.gate === 'buyable') {
    const buy = material.buy;
    const label = c.inStock ? 'In stock in Canada' : 'Available from a Canadian retailer';
    const what = material.product ? 'this product' : 'this material';
    if (!buy) {
      return {
        status: STATUS.UNKNOWN, criterion: label,
        reason: `No sampled Canadian retailer listed ${what} when sampled`,
      };
    }
    if (c.inStock && !buy.anyInStock) {
      return {
        status: STATUS.FAIL, criterion: label, priceIds: buy.priceIds ?? [],
        reason: `${buy.retailer} lists it, but no sampled offer of ${what} was in stock on ${buy.accessDate}`,
      };
    }
    return {
      status: STATUS.PASS, criterion: label, priceIds: buy.priceIds ?? [],
      reason: `${buy.retailer}${buy.perKg ? `, about ${buy.perKg} CAD/kg` : ''}, seen ${buy.accessDate}`,
    };
  }

  if (c.gate === 'dryingKnown') {
    const ok = material.gates.drying === 'required';
    return ok
      ? { status: STATUS.PASS, criterion: 'Drying schedule published', reason: `A drying schedule is published for this material${material.gates.dryingFrom ? ` (${material.gates.dryingFrom})` : ''}` }
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
  const all = (ctx?.evidenceByMaterial?.get(material.id) ?? []).filter((e) => e.category === c.category);
  // A product is judged on its own records (D98): its own, else those of a twin that prints the same sheet (D89). A
  // sibling's record, and one filed under the material with no product, are context: shown, never a pass for it.
  const product = material.product;
  let records = all;
  let from = '';
  if (product) {
    const own = all.filter((e) => e.gradeId === product.id);
    const twin = own.length ? null : (product.twins ?? []).map((id) => ({ id, list: all.filter((e) => e.gradeId === id) })).find((t) => t.list.length);
    records = own.length ? own : twin?.list ?? [];
    if (twin) from = `, same sheet as ${gradeName(ctx, twin.id)}`;
  }
  if (!records.length) {
    // No record of this material. Its base polymer's published behaviour, where the build attached it (D64), is
    // inference about the neat resin, not a test of this grade: it never passes, and where the reference says the
    // polymer is attacked or dissolved it screens the material out under inference, exactly as an estimate does.
    const polymer = (ctx?.polymerEvidenceByMaterial?.get(material.id) ?? []).find((e) => e.category === c.category);
    if (polymer) return evaluatePolymerLevel(polymer, label, ctx);
    if (product && all.length) {
      const others = all.filter((e) => e.verdict !== 'no-data');
      return {
        status: STATUS.UNKNOWN, criterion: label, contextIds: all.map((e) => e.id),
        reason: `No record of this product's own. ${others.length ? `${others.length} record(s) of ${others.some((e) => !e.gradeId || /^Not /.test(e.gradeId)) ? 'its material or ' : ''}other products (${others.slice(0, 3).map((e) => e.id).join(', ')}${others.length > 3 ? ', ...' : ''}) are context, not this product's` : 'Its material has records that state no verdict'}`,
      };
    }
    return { status: STATUS.UNKNOWN, criterion: label, reason: `No evidence record for this ${product ? 'product' : 'material'}` };
  }

  // Only an unqualified positive record satisfies "resists". A source that reports *limited*
  // resistance has said something weaker than the checkbox asks, and the old default accepted it
  // as a clean PASS, so PLA passed a solvent screen on one "limited" record. Limited is now
  // unresolved, which Strict leaves out and Explore keeps flagged. So is a record in words the build does not reduce
  // to a verdict, beside a positive one (D98): it may be the limit ("resistant to weak acids, but ..."), and a positive
  // roll-up that set it aside claimed more than the source.
  const accept = c.require ?? POSITIVE_VERDICTS;
  const matching = records.filter((e) => accept.includes(e.verdict));
  const limited = records.filter((e) => e.verdict === 'limited' && !accept.includes('limited'));
  const contrary = records.filter((e) => ['not-resistant', 'soluble', 'flammable'].includes(e.verdict));
  const words = records.filter((e) => e.verdict === 'narrative');
  const ids = (list) => list.map((e) => e.id);
  const quote = (e) => `"${String(e.finding).slice(0, 60)}${String(e.finding).length > 60 ? '...' : ''}" (${e.id})`;
  if (contrary.length && !matching.length) {
    return { status: STATUS.FAIL, criterion: label, reason: `${contrary.length} record(s) report ${contrary[0].verdict}${from}`, evidenceIds: ids(contrary) };
  }
  if (matching.length && contrary.length) {
    return { status: STATUS.INDETERMINATE, criterion: label, reason: `Evidence is mixed across exposures: ${matching.length} record(s) report ${matching[0].verdict}, ${contrary.length} ${contrary[0].verdict}${from}`, evidenceIds: ids(records) };
  }
  if (matching.length && limited.length) {
    return { status: STATUS.INDETERMINATE, criterion: label, reason: `${matching.length} record(s) report ${matching[0].verdict}, ${limited.length} only limited resistance (${limited.map(quote).join('; ')})${from}. Check which exposure matters to you`, evidenceIds: ids(records) };
  }
  if (matching.length && words.length) {
    return { status: STATUS.INDETERMINATE, criterion: label, reason: `${matching.length} record(s) report ${matching[0].verdict}, and ${words.length} more say, in words no verdict is read from, ${words.map(quote).join('; ')}${from}. Read them before relying on it`, evidenceIds: ids(records) };
  }
  if (matching.length) {
    return { status: STATUS.PASS, criterion: label, reason: `${matching.length} record(s) report ${matching[0].verdict}${from}. Resistance applies to the recorded exposures, not every chemical in the class`, evidenceIds: ids(matching) };
  }
  if (limited.length) {
    return { status: STATUS.INDETERMINATE, criterion: label, reason: `${limited.length} record(s) report only limited resistance${from}`, evidenceIds: ids(limited) };
  }
  return { status: STATUS.UNKNOWN, criterion: label, reason: `Records exist but none state a verdict${from}`, evidenceIds: ids(records) };
}

/** A product as a reason names it: its maker and product, from the database the context carries. */
function gradeName(ctx, id) {
  const g = ctx?.gradeById?.get(id) ?? ctx?.db?.grades?.find((x) => x.id === id);
  if (!g) return id;
  const product = g.product && !/^Not /.test(g.product) ? g.product : '';
  const maker = g.manufacturer && !/^Not /.test(g.manufacturer) ? g.manufacturer : '';
  return !product ? maker || id : maker && !product.toLowerCase().startsWith(maker.toLowerCase()) ? `${maker} ${product}` : product;
}

/** A polymer-level verdict in words: "not resistant", "soluble". */
const verdictWords = (v) => String(v).replace(/-/g, ' ');

/**
 * A material with no record of its own in the category, judged on its base polymer's published behaviour (D64). The
 * verdict is always UNKNOWN and the reason names the polymer, what the reference says of it and the reference itself.
 * A polymer the reference reports attacked or dissolved screens the material out under inference (`polymerScreen`
 * says so, the way `estimated` marks an estimate), and the SCREENED chip brings it back.
 */
function evaluatePolymerLevel(polymer, label, ctx) {
  const agents = polymer.agents.map((a) => `${verdictWords(a.verdict)} to ${a.agent}`).join(', ');
  const refs = polymer.sourceIds.join(', ');
  const basis = `No evidence record for this material. Its base polymer ${polymer.polymerId} is published as ${verdictWords(polymer.verdict)} (${agents}; ${refs}), the neat resin's behaviour and not a test of this grade, so never enough to pass`;
  const common = { status: STATUS.UNKNOWN, criterion: label, polymer: true, polymerId: polymer.polymerId, polymerVerdict: polymer.verdict, polymerEvidenceIds: [polymer.id] };
  if (!polymer.screens) return { ...common, reason: basis };
  const screened = !!ctx?.useEstimates;
  return {
    ...common, polymerScreen: true, screened, vetoedBy: [],
    reason: screened ? `${basis}. Screened out; not tested on this product` : `${basis}. It would screen this material out with inference on`,
  };
}

// ---------------------------------------------------------------- public API

/**
 * Data-quality criteria. These screen on the strength of the evidence rather than on a property,
 * which the brief treats as a first-class selection domain.
 */
function evaluateEvidence(material, c, ctx) {
  const checks = [];
  // A product's own measurement, or its twin's, which is the same sheet (D89, D98); a sibling's is not this product's.
  const product = material.product;
  const measured = (list) => list.filter((m) => m.numeric && m.gradeId && m.gradeId !== 'Not applicable');
  if (c.exactGrade) {
    const all = ctx?.measurementsByMaterial?.get(material.id) ?? [];
    if (product) {
      const own = measured(all.filter((m) => m.gradeId === product.id));
      const twin = own.length ? null : (product.twins ?? []).find((id) => measured(all.filter((m) => m.gradeId === id)).length);
      checks.push({ ok: own.length > 0 || !!twin, label: 'exact-grade measurement',
        detail: own.length ? `${own.length} measurement(s) of this product` : twin ? `measured on the same sheet as ${gradeName(ctx, twin)}` : 'No measurement of this product in the sampled sources; its siblings\' are theirs' });
    } else {
      const has = measured(all).length > 0;
      checks.push({ ok: has, label: 'exact-grade measurement', detail: has ? `${all.length} measurements on record` : 'No grade-specific measurement in the sampled sources' });
    }
  }
  if (c.noConflicts) {
    // A finding about one product holds out that product and its twins, never its siblings (D98, m213); one about the
    // material holds out every product of it.
    const cov = ctx?.coverageByMaterial?.get(material.id) ?? [];
    const mine = (r) => !product || !r.gradeId || r.gradeId === product.id || (product.twins ?? []).includes(r.gradeId);
    const bad = cov.filter((r) => (r.status === 'Conflict' || r.status === 'Quarantined') && mine(r));
    checks.push({ ok: bad.length === 0, label: 'no unresolved conflict', detail: bad.length ? `${bad.length} unresolved: ${bad.map((b) => `${b.domain} (${b.id})`).join(', ')}` : 'No unresolved conflict recorded' });
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
    case 'treatment': return { ...evaluateTreatment(material), constraint };
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
    // Likewise when a base polymer's published behaviour stood in for a record of the material (D64).
    usesPolymer: results.some((r) => r.polymer),
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

/**
 * A product judged in each state the scenario may make it in (D99), as printed first, and answered by the best: a state
 * that passes, else one that is unresolved (unscreened before screened), else a failure. A product used in an annealed
 * state carries the treatment it needs as a requirement of its own, so the verdict and every export name it.
 */
function judgeProduct(material, grade, constraints, ctx) {
  const tries = scenarioStates(grade, ctx).map((state) => ({
    state, e: evaluateMaterial(productView(material, grade, ctx, state), state.treatment ? [...constraints, TREATMENT] : constraints, ctx),
  }));
  const rank = (t) => (t.e.verdict === STATUS.PASS ? 0 : t.e.verdict === STATUS.UNKNOWN ? (t.e.screened ? 2 : 1) : 3);
  const best = tries.reduce((a, b) => (rank(b) < rank(a) ? b : a));
  return { grade, e: best.e, state: best.state, tries };
}

/** A state as an answer names it: its identifier, treatment and moisture, never its values. */
const stateRef = (s) => ({ id: s.id, treatment: s.treatment ?? null, moisture: s.moisture ?? 'dry' });

/**
 * A material answered by its products (D83): each product is judged on every constraint at once, through a view of the
 * material with that product's values and print recipe (products.js), in the states the scenario permits (D99). The
 * material passes when at least one product passes, and says whether all the products that could be judged pass or only
 * some. It is unknown while any product is unresolved and none passes, and fails only when every product fails (D100):
 * one measured failure does not remove a material whose other products nobody has measured. The counts of products
 * passing, failing and untested stay beside every verdict. The evaluation's reasons are its best product's: the first that
 * passes, else the first unresolved one (unscreened before screened), else the first that fails. A material with no
 * product is judged as it always was, on its own headline.
 */
export function evaluateProducts(material, products, constraints, ctx = {}) {
  if (!products?.length) return { ...evaluateMaterial(material, constraints, ctx), share: null, counts: null, products: [] };
  const policy = normalizePolicy(ctx.unknownPolicy);
  const judged = products.map((g) => judgeProduct(material, g, constraints, ctx));
  const pass = judged.filter((x) => x.e.verdict === STATUS.PASS);
  const fail = judged.filter((x) => x.e.verdict === STATUS.FAIL);
  const unknown = judged.filter((x) => x.e.verdict === STATUS.UNKNOWN);
  const verdict = pass.length ? STATUS.PASS : unknown.length ? STATUS.UNKNOWN : fail.length ? STATUS.FAIL : STATUS.UNKNOWN;
  const share = pass.length ? (fail.length ? SHARE.SOME : SHARE.ALL) : fail.length ? SHARE.NONE : null;
  // Every product that could not be judged shares the material's estimate (products.js), so a screen holds for all or none.
  const screened = policy === UNKNOWN_POLICY.EXPLORATION && verdict === STATUS.UNKNOWN && unknown.every((x) => x.e.screened);
  const best = pass[0] ?? unknown.find((x) => !x.e.screened) ?? unknown[0] ?? fail[0];
  return {
    ...best.e,
    materialId: material.id,
    verdict,
    eligible: verdict === STATUS.PASS || (policy === UNKNOWN_POLICY.EXPLORATION && verdict === STATUS.UNKNOWN && !screened),
    needsVerification: verdict === STATUS.UNKNOWN && policy === UNKNOWN_POLICY.EXPLORATION && !screened,
    screened,
    screenedBy: screened ? best.e.screenedBy : [],
    heldBy: policy === UNKNOWN_POLICY.STRICT && verdict === STATUS.UNKNOWN ? best.e.heldBy : [],
    failedBy: verdict === STATUS.FAIL ? best.e.failedBy : [],
    share,
    counts: { products: products.length, pass: pass.length, fail: fail.length, untested: unknown.length, screened: unknown.filter((x) => x.e.screened).length },
    // No product demonstrates a pass, and some that were judged fail: said apart from "every product fails" (D100).
    ...(verdict === STATUS.UNKNOWN && fail.length ? { someFail: true } : {}),
    // Each product's own answer, the state it was judged in, and the records it rests on (D98, D99): the product cards,
    // the decision brief and the acceptance portfolio read a product's reasons, not its material's best product's.
    products: judged.map((x) => productEntry(x)),
    gradeId: best.grade.id,
    state: stateRef(best.state),
  };
}

function productEntry(x) {
  const admitted = [...new Set(x.e.results.flatMap((r) => (r.status === STATUS.PASS ? r.admitted ?? [] : [])))];
  return {
    gradeId: x.grade.id, verdict: x.e.verdict, screened: x.e.screened, failedBy: x.e.failedBy,
    state: stateRef(x.state), results: x.e.results.map(productResult),
    ...(admitted.length ? { admitted } : {}),
    ...(x.tries.length > 1 ? { states: x.tries.map((t) => ({ ...stateRef(t.state), verdict: t.e.verdict })) } : {}),
  };
}

/** One requirement's answer for one product, with the records it cites and nothing the material's rows repeat. */
const productResult = (r) => {
  const out = { criterion: r.criterion, status: r.status, reason: r.reason, constraint: r.constraint };
  for (const k of ['measurementId', 'evidenceIds', 'priceIds', 'contextIds', 'observed', 'unit', 'closeToLimit', 'estimated', 'screened', 'polymer', 'admitted', 'treatment', 'elsewhere', 'missing', 'asPublished']) if (r[k] !== undefined) out[k] = r[k];
  return out;
};

/** Evaluate one material: by its products when the context carries them (D83), else on its own headline. */
function evaluateOne(material, constraints, ctx) {
  return ctx.productsByMaterial
    ? evaluateProducts(material, ctx.productsByMaterial.get(material.id) ?? [], constraints, ctx)
    : evaluateMaterial(material, constraints, ctx);
}

/** Run the whole set. Returns evaluations plus the counts the status bar needs. */
export function runSelection(materials, constraints, ctx = {}) {
  // A product value cites its measurement; the reason names that measurement's source, and a twin's record names it.
  if (ctx.productsByMaterial && !ctx.measurementById && ctx.db) ctx = { ...ctx, measurementById: new Map(ctx.db.measurements.map((m) => [m.id, m])) };
  if (ctx.productsByMaterial && !ctx.gradeById && ctx.db) ctx = { ...ctx, gradeById: new Map(ctx.db.grades.map((g) => [g.id, g])) };
  const evaluations = materials.map((m) => evaluateOne(m, constraints, ctx));
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
    let removed = 0, held = 0, screened = 0, screenedByPolymer = 0, productsRemoved = 0;
    for (const m of materials) {
      // Judged by its products, a requirement removes a material when no product meets it and one fails it; a product
      // meets it in the best state the scenario permits (D99).
      const products = ctx.productsByMaterial?.get(m.id);
      const inBestState = (g) => {
        const rs = scenarioStates(g, ctx).map((st) => evaluateConstraint(productView(m, g, ctx, st), c, ctx));
        return rs.find((x) => x.status === STATUS.PASS) ?? rs.find((x) => x.status !== STATUS.FAIL) ?? rs[0];
      };
      const rs = products?.length ? products.map(inBestState) : [evaluateConstraint(m, c, ctx)];
      if (products?.length) productsRemoved += rs.filter((r) => r.status === STATUS.FAIL).length;
      // Removed only where every product fails it (D100); one unresolved product holds the material.
      const r = rs.find((x) => x.status === STATUS.PASS) ?? rs.find((x) => x.status !== STATUS.FAIL) ?? rs[0];
      if (r.status === STATUS.FAIL) removed++;
      else if (r.status === STATUS.UNKNOWN || r.status === STATUS.INDETERMINATE) held++;
      if (r.screened) screened++;
      if (r.screened && r.polymerScreen) screenedByPolymer++;
    }
    // `screened` counts every screen; `screenedByPolymer` the part of it that rests on the base polymer's published
    // behaviour rather than an estimate, so the panel can say which. `productsRemoved` counts products, where the
    // selection is by product.
    return { constraint: c, removed, held, screened, screenedByPolymer, recovered, ...(ctx.productsByMaterial ? { productsRemoved } : {}) };
  }).sort((a, b) => b.recovered - a.recovered || b.removed - a.removed);
}
