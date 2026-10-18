// The single vocabulary.
//
// Everything that names a property, a requirement or a stored state on the page comes from here, so nothing is called
// two different things. The reader is an engineer (D124): a property is named as a data sheet names it ("Tensile
// modulus (XY)", "HDT at 0.45 MPa"), with its method as the technical line, and a stored state the database coined
// ("Theoretical", "Official Bambu product") is shown under a name that engineer would use. The stored value never
// changes, so links, saved scenarios and exports made before a rename still read.

import { GATE_STATUS } from '../engine/constraints.js';
import { lower } from './text.js';

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
// "Materials with missing data: Confirmed only / Include uncertain" made an engineer stop twice (REVIEW-0, 2026-10-18):
// the control names the materials it is about, those whose data cannot settle a requirement, and what to do with them.
export const POLICY_CONTROL = 'Materials that could not be checked';
/** The same label where a phone has no room for the long one. The control is never left unlabelled. */
export const POLICY_CONTROL_SHORT = 'Could not be checked';
/** An environment requirement in words. Water solubility is not water resistance: a nylon does not dissolve in water and
 * still takes it up, so it reads "Does not dissolve in water" (the PM trial, PM-11). */
export const envRequirement = (category) => (category === 'water-solubility' ? 'Does not dissolve in water' : `Resists ${envNoun(category)}`);
export const POLICY_LABELS = { strict: 'Leave out', exploration: 'Include' };
/** The choice in a sentence, where the buttons' two words alone would not read ("With Include, …"). */
export const POLICY_PHRASE = {
  strict: 'with the materials that could not be checked left out',
  exploration: 'with the materials that could not be checked included',
};
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
 * A filler the materials table names (Modifier / filler) that the reinforcement facet files with the undisclosed
 * variants (compile.js deriveFacets: aramid fibre, ceramic, PTFE…): its name, and its words after "A variant with".
 * Such a material's filler is disclosed, and is never said not to be. Null where the modifier names no filler.
 */
const NAMED_FILLER = {
  'Aramid fibre': ['Aramid fibre', 'aramid fibre'], Ceramic: ['Ceramic filler', 'a ceramic filler'],
  'Electrically conductive': ['Electrically conductive filler', 'an electrically conductive filler'], 'Glass spheres': ['Glass spheres', 'glass spheres'],
  PTFE: ['PTFE', 'PTFE'], 'Natural fibre': ['Natural fibre', 'natural fibre'], Graphene: ['Graphene', 'graphene'], 'Metal powder': ['Metal powder', 'metal powder'],
};
export function namedFiller(m) {
  const mod = String(m?.modifier ?? '');
  if (m?.facets?.reinforcement?.value !== 'undisclosed' || !mod || /undisclosed|^Not /i.test(mod)) return null;
  const [name, words] = NAMED_FILLER[mod] ?? [mod, mod];
  return { name, words };
}

/**
 * A process gate's verdict in words: a heading, a chip and the decision brief's phrase. Three screens and the brief
 * used to carry their own copy of this table, which is how a new verdict reaches one screen and not the next. The state
 * a chip is coloured by is the engine's own answer to the verdict (GATE_STATUS), not a second copy of it.
 */
export const GATE_VERDICT = {
  within: { word: 'Within', short: 'within', against: 'within the H2C' },
  partial: { word: 'Partly within', short: 'partly within', against: 'partly within the H2C' },
  'exceeds-recommended': { word: 'Above recommended', short: 'above recommended', against: 'recommended above the H2C' },
  exceeds: { word: 'Exceeds', short: 'exceeds', against: 'beyond the H2C' },
  unknown: { word: 'No data', short: 'no data', against: 'not judged against the H2C' },
};
export const gateVerdict = (v) => {
  const key = GATE_VERDICT[v] ? v : 'unknown';
  return { ...GATE_VERDICT[key], state: GATE_STATUS[key] };
};

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
    + ` It never makes a material pass.${e.canScreen ? ` ${POLICY_PHRASE.exploration.charAt(0).toUpperCase()}${POLICY_PHRASE.exploration.slice(1)}, it excludes this material from ${screenRangeText(e, d.num, d.unit)}.` : ''}${e.screenLimit ? ` ${e.screenLimit.charAt(0).toUpperCase()}${e.screenLimit.slice(1)}` : ''}`;
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

// ------------------------------------------------------------------ the drawer's and the pages' words for stored codes
//
// Moved from detail.js (material pages round, step 1) so the drawer and the material pages name a stored code alike
// (D124). Each is a map from a value the build compiles to the words an engineer reads; a value no map names reads as
// itself.

/** A measurement's specimen orientation (measurements[].direction), where the stored code is not the words. */
export const DIRECTION_WORDS = {
  unknown: 'orientation not stated', 'horizontal-source-label': '"horizontal" (the sheet\'s word)',
  'vertical-xz-source-label': '"vertical XZ" (the sheet\'s word)', 'along-flow': 'along the melt flow', 'raster-45': '±45° raster',
};
/** A measurement's specimen type (measurements[].specimenType), where the stored value is not the words. */
export const SPECIMEN_WORDS = { 'Raw material value': 'moulded bar (resin supplier\'s value)', 'Printed part': 'printed part', 'Printed specimen': 'printed specimen' };
/** A property whose stored name does not say what a data sheet would (properties.csv). */
export const PROPERTY_WORDS = { 'Tensile strength (endpoint unspecified)': 'Tensile strength (yield or break not stated)', 'Charpy strength': 'Charpy impact strength', 'Impact strength': 'Impact strength, test unclear' };
/** A property by its name on the page. */
export const propertyName = (p) => PROPERTY_WORDS[p] ?? p;
/** A measurement's Data status, where it holds the value back, in words. */
export const STATUS_WORDS = { 'Unresolved unit / layout': 'held back: the sheet\'s unit or table layout is unclear' };

/** What kind of document a source is (sources[].sourceClass), as an engineer would name it. */
export const SOURCE_KIND = {
  'Manufacturer TDS': 'Data sheet', 'Manufacturer product page or guide': 'Maker\'s product page or guide', 'Manufacturer SDS': 'Safety data sheet',
  'Resin supplier data sheet': 'Resin supplier\'s data sheet', 'Retailer catalogue': 'Retailer listing', 'Printer documentation': 'Printer documentation',
  'Peer-reviewed study': 'Peer-reviewed study', 'Safety guidance': 'Safety guidance', 'Reference or register': 'Reference',
};
export const sourceKind = (s) => SOURCE_KIND[s?.sourceClass] ?? s?.sourceClass ?? 'Source';

/** A material's filler (facets.reinforcement.value) in its identity line: "carbon-fibre filled". */
export const FILLED_WORDS = { 'carbon-fibre': 'carbon-fibre filled', 'glass-fibre': 'glass-fibre filled', esd: 'anti-static (ESD)', foaming: 'foaming', unfilled: 'unfilled' };

/**
 * Why a record under a comparison is or is not drawn (material-facts.js notDrawnWhy), counted: "80 unnotched", "1 on a
 * moulded bar". A key is one of NOT_DRAWN_ORDER's, or held, second, retired or reference; "unit:" and "property:" keys
 * carry their unit or property after the colon.
 */
export const WHY_WORDS = {
  held: (n) => `${n} held back`, noNumber: (n) => `${n} with no number`,
  implausible: (n) => `${n} flagged implausible`, moulded: (n) => (n === 1 ? '1 on a moulded bar' : `${n} on moulded bars`),
  resin: (n) => `${n} of the resin, its supplier's value`, film: (n) => `${n} measured on film`, filament: (n) => `${n} on filament strands`,
  offRecipe: (n) => `${n} printed at a setting the product is not meant for`, partialInfill: (n) => `${n} printed below 100 % infill`,
  notPrinted: (n) => `${n} not on a printed bar`, conditioned: (n) => `${n} after moisture conditioning`,
  annealed: (n) => `${n} annealed beside an as-printed value`, unnotched: (n) => `${n} unnotched`, notched: (n) => `${n} notched`, notch: (n) => `${n} with no stated notch`,
  cold: (n) => `${n} tested below room temperature`, hot: (n) => `${n} tested above room temperature`, standard: (n) => `${n} to another standard`,
  direction: (n) => (n === 1 ? '1 on a bar in another orientation' : `${n} on bars in another orientation`),
  unstatedDirection: (n) => `${n} with no stated orientation`, load: (n) => `${n} at another test load`, unstatedLoad: (n) => `${n} with no stated test load`,
  second: (n) => `${n} more of ${n === 1 ? 'a product' : 'products'} already drawn`, retired: (n) => `${n} of products no longer listed`,
  reference: (n) => `${n} of reference grades`,
};
export const whyWords = (key, n) => (key.startsWith('unit:') ? `${n} in ${key.slice(5)}`
  : key.startsWith('property:') ? `${n} of ${lower(propertyName(key.slice(9)))}` : WHY_WORDS[key](n));

/**
 * The same reasons said of one record, as a material page's records table gives them beside each value: "unnotched",
 * "on a moulded bar". A key whose phrase reads the same alone is WHY_WORDS's without its count.
 */
const WHY_ONE = {
  held: 'held back', noNumber: 'no number', implausible: 'flagged implausible', moulded: 'on a moulded bar',
  resin: 'the resin\'s, its supplier\'s value', film: 'on film', filament: 'on a filament strand',
  direction: 'on a bar in another orientation', second: 'another value of a product already drawn',
  retired: 'a product no longer listed', reference: 'a reference grade, not a product',
};
export const whyOne = (key) => (key.startsWith('unit:') ? `in ${key.slice(5)}`
  : key.startsWith('property:') ? `${lower(propertyName(key.slice(9)))}, listed, not drawn`
    : WHY_ONE[key] ?? WHY_WORDS[key](1).replace(/^1 /, ''));

/**
 * An environment statement's verdict (evidence[].verdict) as a column of a material page's matrix: a statement with no
 * rating is "described in words"; the others read as their code.
 */
const ENV_VERDICT_WORDS = { narrative: 'described in words', 'no-data': 'no data', 'self-extinguishing': 'self-extinguishing' };
export const envVerdictWords = (v) => ENV_VERDICT_WORDS[v] ?? String(v ?? '').replace(/-/g, ' ');

/** A material summary's review status (material_summaries.csv, Review status), as its byline says it. */
export const SUMMARY_STATUS = {
  draft: 'Draft, not yet reviewed by the owner',
  'reviewed by the owner': 'Reviewed by the owner',
  revise: 'Marked for revision by the owner',
};

/** A part of a product's recipe its maker's documents may leave unsaid (grades[].knowHow.recipe). */
export const RECIPE_WORDS = { chamber: 'chamber or enclosure need', drying: 'drying schedule', annealing: 'annealing schedule' };
/** A know-how topic in a list of what a maker leaves unsaid; a topic the vocabulary gains later reads as its name. */
export const TOPIC_WORDS = {
  'Good for': 'applications', Benefits: 'benefits', 'Pitfalls and limitations': 'pitfalls', 'Warping and shrinkage': 'warping',
  'Precision and tolerance': 'dimensional accuracy', 'Surface finish': 'surface finish', 'Adhesion between layers': 'layer adhesion',
  'Moisture sensitivity': 'moisture', 'Nozzle wear': 'nozzle wear', 'Odour and emissions': 'odour', 'Supports and removal': 'supports',
  'Printing advice': 'printing advice',
};

/**
 * Why a product's print setting is not drawn (print-spread.js notDrawn), counted: "3 say nothing" (no sheet, shared
 * sheet or guide row gives the setting; "state none" was read as "need none"), "60 need none". The drawer and the
 * material pages say it in these words.
 */
export const PRINT_NOT_DRAWN = {
  unknown: 'say nothing', 'not-required': 'need none', enclosed: 'ask for an enclosure and give no temperature (the H2C\'s heated chamber counts)',
  recommended: 'recommend an enclosure and give no temperature', ambient: 'print at room temperature', 'no-setpoint': 'give no set point',
  'not-needed': 'say none is needed', 'no-temperature': 'give no temperature',
};
/** What a print gate verdict outside the H2C's limits adds after a product's window (print-spread.js OUTSIDE). */
export const OUTSIDE_WORDS = { exceeds: '', 'exceeds-recommended': ', its recommended setting above', partial: ', part of its window above' };
