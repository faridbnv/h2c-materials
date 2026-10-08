// The single vocabulary.
//
// Everything that names a property, a requirement or a stored state on the page comes from here, so nothing is called
// two different things. The reader is an engineer (D124): a property is named as a data sheet names it ("Tensile
// modulus (XY)", "HDT at 0.45 MPa"), with its method as the technical line, and a stored state the database coined
// ("Theoretical", "Official Bambu product") is shown under a name that engineer would use. The stored value never
// changes, so links, saved scenarios and exports made before a rename still read.

// Filled from the database's registry at start-up (registry.js, useRegistry): one row per headline in
// data/tables/headline_definitions.csv supplies short, plain, technical, unit, hint and better.
export const PROPERTY = {};

export const prop = (key) => PROPERTY[key] ?? { short: key, plain: key, technical: key, unit: '', hint: '' };

/**
 * The missing-data control, by the names its buttons carry. The top bar said "Confirmed only" while the Why excluded
 * tab said missing data was set to "leave it out" or "keep it" and its button offered to "keep materials with missing
 * data visible": three names for one switch. Every sentence that names the mode takes it from here.
 */
// "Candidate confidence" read as a statistical confidence; the switch decides whether materials with missing data are
// listed (the PM trial of 2026-10-01, PM-09).
export const POLICY_CONTROL = 'Materials with missing data';
/** The same label where a phone has no room for the long one. The control is never left unlabelled. */
export const POLICY_CONTROL_SHORT = 'Missing data';
/** An environment requirement in words. Water solubility is not water resistance: a nylon does not dissolve in water and
 * still takes it up, so it reads "Does not dissolve in water" (the PM trial, PM-11). */
export const envRequirement = (category) => (category === 'water-solubility' ? 'Does not dissolve in water' : `Resists ${envNoun(category)}`);
export const POLICY_LABELS = { strict: 'Confirmed only', exploration: 'Include uncertain' };
export const policyLabel = (policy) => POLICY_LABELS[policy] ?? POLICY_LABELS.strict;

// The H2C's limits, from the build (db.meta.h2cBaseline); set once at start-up. Every label that names a limit reads
// them here, so the page never prints a number the build does not hold.
const BASELINE = { nozzleC: 350, bedC: 120, chamberC: 65 };
export function setH2cBaseline(b) { Object.assign(BASELINE, b ?? {}); }
export const h2cLimit = (gate) => BASELINE[`${gate}C`];

// Process gates. One name each, used by the rail, the requirement pills, the drawer and the export.
export const GATE = {
  scope: { plain: 'Within H2C capability' },
  get nozzle() { return { plain: `Nozzle \u2264 ${BASELINE.nozzleC} \u00b0C` }; },
  get bed() { return { plain: `Bed \u2264 ${BASELINE.bedC} \u00b0C` }; },
  get chamber() { return { plain: `Chamber \u2264 ${BASELINE.chamberC} \u00b0C` }; },
  abrasive: { plain: 'Brass nozzle only' },
  dryingKnown: { plain: 'Drying instructions published' },
  h2cStatus: { plain: 'Bambu Lab status' },
  buyable: { plain: 'Sold in Canada (sampled)' },
};

/**
 * Bambu Lab's standing of a material on the H2C. The stored values are the database's (schema/vocab/h2c-status.csv); an
 * engineer reads these names and meanings instead.
 */
export const H2C_STATUS = {
  'Official Bambu product': { label: 'Bambu Lab filament', meaning: 'Bambu Lab sells a filament of this material for the H2C. As a filter it passes Bambu Lab\'s own spools only.',
    lede: 'Bambu Lab sells a filament of it for the H2C.' },
  'Officially listed family': { label: 'Type on Bambu\'s H2C list', meaning: 'Bambu Lab lists this material type for the H2C, though not every brand of it.',
    lede: 'A material type on Bambu Lab\'s H2C list, though not every brand of it is.' },
  Conditional: { label: 'Unlisted, usable with conditions', meaning: 'Not on Bambu Lab\'s list. It prints on the H2C under conditions, which the Printing tab gives.',
    lede: 'Not on Bambu Lab\'s list; it prints on the H2C under the conditions given in Printing.' },
  Theoretical: { label: 'Unlisted, within H2C temperatures', meaning: 'Not on Bambu Lab\'s list. Its published process temperatures are within the H2C\'s, but Bambu Lab has not validated it.',
    lede: 'Not on Bambu Lab\'s list; its published process temperatures are within the H2C\'s.' },
  'Exceeds H2C limits': { label: 'Beyond H2C capability', meaning: 'Not on Bambu Lab\'s list, and it needs more heat than the H2C gives. It is never a candidate.',
    lede: 'Not on Bambu Lab\'s list, and it needs more heat than the H2C gives.' },
};
export const h2cStatusLabel = (s) => H2C_STATUS[s]?.label ?? s;

/** The filler of a material (its reinforcement facet), by the name a data sheet would use. */
export const FILLER = {
  'carbon-fibre': 'Carbon fibre', 'glass-fibre': 'Glass fibre', unfilled: 'Unfilled',
  esd: 'Anti-static (ESD)', foaming: 'Foaming', undisclosed: 'Other variant, filler not disclosed',
};

/**
 * A process gate's verdict, as a state chip and in words. Three screens used to carry their own copy
 * of this table, which is how a new verdict reaches one screen and not the next.
 */
export const GATE_VERDICT = {
  within: { state: 'PASS', word: 'Within', short: 'within' },
  partial: { state: 'INDETERMINATE', word: 'Partly within', short: 'partly within' },
  'exceeds-recommended': { state: 'INDETERMINATE', word: 'Above recommended', short: 'above recommended' },
  exceeds: { state: 'FAIL', word: 'Exceeds', short: 'exceeds' },
  unknown: { state: 'UNKNOWN', word: 'No data', short: 'no data' },
};
export const gateVerdict = (v) => GATE_VERDICT[v] ?? GATE_VERDICT.unknown;

/**
 * Chamber guidance given in words. Each is manufacturer evidence and none is a temperature, so the
 * wording never carries a number.
 */
export const CHAMBER_GUIDANCE = {
  'not-required': { word: 'not required', title: 'A source says no heated chamber is needed. It gives no temperature.' },
  recommended: { word: 'recommended', title: 'A source recommends a heated chamber but gives no temperature, so 65 °C is not shown to be enough.' },
  'no-setpoint': { word: 'no setpoint', title: 'The data sheet prints "-" for the chamber. That is no setpoint: not zero, and not "not required".' },
};

/**
 * Estimates, by what they rest on (build/src/estimate/, DECISIONS D43). One wording, used by the
 * table cell, the drawer, Compare, the chart and the export.
 */
export const ESTIMATE_STRENGTH = {
  'this-grade': { short: 'from this product\'s related values', title: 'Estimated mainly from this product\'s other published values (another endpoint, orientation, load or specimen), converted to this property, and from similar materials' },
  'this-material': { short: 'from its products\' related values', title: 'Estimated from its products\' other published values or resin data (another endpoint, orientation, load or specimen), converted to this property, and from similar materials' },
  family: { short: 'from similar materials only', title: 'Nothing on file for this material itself: predicted from similar materials (its polymer, filler and family)' },
};

/** How a likely range should be read. */
export const ESTIMATE_PRECISION = {
  good: 'narrow enough to exclude a material from a requirement it clearly misses',
  fair: 'a rough guide',
  poor: 'only the order of magnitude',
};

const percent = (p) => `${Math.round(p * 100)}%`;

/**
 * What an estimate rests on, for its popover and its title. `d` is how its numbers read (estimateDisplay in format.js,
 * passed in so this module needs no imports): the likely and plausible ranges on one step, in a unit that may have been
 * made readable, in which case the text also gives the range in the unit of its column.
 */
export function estimateTitle(e, d) {
  const s = ESTIMATE_STRENGTH[e.strength] ?? { title: 'Estimated' };
  const levels = e.levels ?? { likely: 0.8, plausible: 0.95 };
  const unit = d.unit ? ` ${d.unit}` : '';
  // For an engineer who is not a statistician: the range, how often ranges like it held when the model was tested on
  // values it had not seen, what it rests on, and what it may and may not do.
  const oneIn = (p) => (p >= 0.94 && p <= 0.96 ? '19 in 20' : p >= 0.78 && p <= 0.82 ? '8 in 10' : percent(p));
  const wide = d.plausible ? ` Plausible range ${d.plausible[0]} to ${d.plausible[1]}${unit} (${percent(levels.plausible)}).` : '';
  const column = d.inColumn ? ` In ${d.columnUnit}, the table's unit: ${d.inColumn[0]} to ${d.inColumn[1]}.` : '';
  return `Estimate, not a measurement: likely ${d.lo} to ${d.hi}${unit} (${percent(levels.likely)} interval), centre ${d.centre}${unit}.${column}${wide}`
    + ` ${s.title}.${e.sharedWith ? ` Its product is also filed under ${e.sharedWith.name}.` : ''}`
    + ` ${e.precision === 'poor' ? 'Poor precision: treat it as an order of magnitude only.' : `Precision: ${e.precision}, ${ESTIMATE_PRECISION[e.precision] ?? ''}.`}`
    + ` It never makes a material pass.${e.canScreen ? ` With ${POLICY_LABELS.exploration}, it excludes this material from ${screenRangeText(e, d.num, d.unit)}.` : ''}${e.screenLimit ? ` ${e.screenLimit.charAt(0).toUpperCase()}${e.screenLimit.slice(1)}` : ''}`;
}

/**
 * What an estimate may screen a material out of, from the range the build lets it screen on (D59), whose ends may be
 * open: "a requirement its screening range, 12 to 40 %, wholly fails", "a maximum requirement below 12 %", "a minimum
 * requirement above 40 %". Each end keeps the digits a single number is shown with, not the rounder step of the likely
 * range beside it: an end is where a screen starts, and a requirement just inside a rounded end would read as screened.
 * `fmt` formats one number and `unit` is the unit it is in, which is the estimate's own unless the text rescaled it.
 */
export function screenRangeText(e, fmt, unit = e.unit) {
  const r = e.screenRange ?? e.plausible;
  if (!r) return '';
  const u = unit ? ` ${unit}` : '';
  if (r.lo != null && r.hi != null) return `any requirement entirely outside ${fmt(r.lo)} to ${fmt(r.hi)}${u}`;
  return r.lo != null ? `a maximum below ${fmt(r.lo)}${u}` : `a minimum above ${fmt(r.hi)}${u}`;
}

const OPERATOR = { '>=': 'at least', '<=': 'at most', '>': 'more than', '<': 'less than' };

/** Format a number without trailing noise. */
const n = (v) => (Number.isFinite(v) ? String(Number(Number(v).toFixed(4))) : String(v));

/**
 * One sentence describing a constraint, used by the requirement pills, the explain panel, the
 * per-candidate why list and the CSV export. There is no second way to say it.
 */
export function describeConstraint(c) {
  switch (c.kind) {
    case 'numeric': {
      const p = prop(c.property);
      return `${p.plain} ${OPERATOR[c.operator] ?? c.operator} ${n(c.value)} ${p.unit}`.trim();
    }
    case 'gate':
      if (c.gate === 'h2cStatus') return `Bambu Lab status: ${(c.in ?? []).map(h2cStatusLabel).join(' or ')}`;
      if (c.gate === 'buyable') return c.inStock ? 'In stock in Canada (sampled)' : GATE.buyable.plain;
      if (c.gate === 'abrasive' && c.hardenedAvailable) return 'Hardened nozzle available';
      return GATE[c.gate]?.plain ?? c.gate;
    case 'facet':
      if (c.facet === 'supportMaterial') return c.equals === false ? 'Build material (not a support)' : 'Support or interface material';
      if (c.facet === 'family') return `Family: ${(c.in ?? []).join(' or ')}`;
      if (c.facet === 'polymer') return `Polymer: ${[...new Set((c.in ?? []).map((x) => x.split(' › ').pop()))].join(' or ')}`;
      return `Filler: ${(c.in ?? []).map((x) => (FILLER[x] ?? x.replace(/-/g, ' ')).toLowerCase()).join(' or ')}`;
    case 'environment':
      return envRequirement(c.category);
    case 'treatment': return 'Annealed as its data sheet states';
    case 'evidence': {
      const bits = [];
      if (c.exactGrade) bits.push('product-level measurements');
      if (c.noConflicts) bits.push('no unresolved data conflicts');
      return bits.length ? `Data quality: ${bits.join(', ')}` : 'Data quality';
    }
    default: return c.kind;
  }
}

/**
 * The requirements an estimate screened a material out of, in the pills' words. The engine's `screenedBy` holds its
 * criterion strings ("hdt045 >= 100, tensileModulusXY >= 3"), which reached the screened chip and the export as they
 * were: internal keys beside pills that said "Heat resistance at least 100 °C".
 */
export const screenedByText = (evaluation) => (evaluation?.unresolved ?? [])
  .filter((r) => r.screened).map((r) => describeConstraint(r.constraint));

/** The screened requirements split by what screened them: an estimate, or the base polymer's published behaviour (D64). */
export const screenedByKind = (evaluation) => {
  const screened = (evaluation?.unresolved ?? []).filter((r) => r.screened);
  return {
    estimate: screened.filter((r) => !r.polymerScreen).map((r) => describeConstraint(r.constraint)),
    polymer: screened.filter((r) => r.polymerScreen).map((r) => describeConstraint(r.constraint)),
  };
};

/** The two prefixes a screened chip's explanation may start with; the fuzz demands the criterion after either. */
export const SCREEN_PREFIX = { estimate: 'Screened by an estimate', polymer: 'Screened by the base polymer\'s published behaviour' };

/**
 * The screened chip's explanation, heading and next step, as one sentence per kind of screen: "Screened by an estimate:
 * Heat resistance at least 100 °C. Screened by the base polymer's published behaviour: Resists solvents. Not a failure;
 * not measured." The base polymer's screen opens the Environment tab, where its rows are; an estimate's opens the Overview.
 */
export function screenedChip(evaluation) {
  const by = screenedByKind(evaluation);
  const parts = [];
  if (by.estimate.length) parts.push(`${SCREEN_PREFIX.estimate}: ${by.estimate.join('; ')}.`);
  if (by.polymer.length) parts.push(`${SCREEN_PREFIX.polymer}: ${by.polymer.join('; ')}.`);
  const onlyPolymer = by.polymer.length && !by.estimate.length;
  return {
    text: `${parts.join(' ')} Not a failure; ${onlyPolymer ? 'not tested on this product' : 'not measured'}.`,
    head: onlyPolymer ? 'Screened by the base polymer' : by.polymer.length ? 'Screened by an estimate and the base polymer' : SCREEN_PREFIX.estimate,
    action: onlyPolymer ? 'polymer' : evaluation.products?.some((p) => p.results?.some((r) => r.prediction)) ? 'products' : 'estimate',
  };
}

/**
 * Environment categories.
 *
 * The names are authored in schema/vocab/environment-categories.csv and compiled into the snapshot,
 * so there is one place to change them and no chance of the app and the build disagreeing. They
 * are seeded here at boot. The app used to build a name by appending "resistance" to the internal
 * key, which produced "water solubility resistance".
 */
let ENVIRONMENT = {};

/** Called once at boot with db.meta.environmentCategories. */
export function setEnvironmentLabels(categories) {
  ENVIRONMENT = categories ?? {};
}

/** The heading form: "Acid resistance". */
export const envLabel = (k) => ENVIRONMENT[k]?.label ?? String(k).replace(/-/g, ' ');

/** The sentence form, for "Resists acids". */
export const envNoun = (k) => ENVIRONMENT[k]?.noun ?? String(k).replace(/-/g, ' ');

/**
 * A material name, split into what to lead with and what it is also called.
 *
 * "TPC / TPEE" and "PEI / ULTEM" read as two separate materials in a list. They are one material
 * under two names, and the database writes an alias with spaces around the slash. "PA6/66" and
 * "Support for PLA/PETG" have no spaces, are single names, and are left alone.
 */
export function materialName(name) {
  const s = String(name ?? '');
  const i = s.indexOf(' / ');
  if (i < 0) return { primary: s, aka: null };
  return { primary: s.slice(0, i).trim(), aka: s.slice(i + 3).trim() };
}
