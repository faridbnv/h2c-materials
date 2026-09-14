// The single vocabulary.
//
// The detail drawer already spoke plainly ("Stiffness", "Heat resistance") while the table, the
// filter rail and the explain panel spoke materials science ("Tensile modulus XY", "hdt045 >= 100").
// Three code paths described the same property three ways, and one of them leaked internal keys.
// Everything that names a property or a constraint now comes from here.
//
// Plain name leads; the technical name is available as a subtitle or tooltip for anyone who wants
// it. Nothing is dumbed down, only ordered: the reader gets the meaning first and the standard
// second.

export const PROPERTY = {
  density: {
    short: 'Density', plain: 'Density', technical: 'Density', unit: 'kg/m³',
    hint: 'how heavy a printed part will be', better: 'min',
  },
  tensileModulusXY: {
    short: 'Stiffness', plain: 'Stiffness', technical: 'Tensile modulus, XY direction', unit: 'GPa',
    hint: 'resistance to bending and stretching', better: 'max',
  },
  tensileStrengthXY: {
    short: 'Strength', plain: 'Strength', technical: 'Tensile strength, XY direction', unit: 'MPa',
    hint: 'load it takes before failing', better: 'max',
  },
  elongationXY: {
    short: 'Stretch', plain: 'Stretch before breaking', technical: 'Elongation at break, XY direction', unit: '%',
    hint: 'how far it stretches before it snaps; not the same as springing back or toughness', better: 'max',
  },
  hdt045: {
    short: 'Heat', plain: 'Heat resistance', technical: 'HDT at 0.45 MPa', unit: '°C',
    hint: 'temperature where it starts to soften under load', better: 'max',
  },
  priceCADkg: {
    short: 'Price', plain: 'Price', technical: 'Median Canadian retail price', unit: 'CAD/kg',
    hint: 'sampled Canadian retail, not live', better: 'min',
  },
};

export const prop = (key) => PROPERTY[key] ?? { short: key, plain: key, technical: key, unit: '', hint: '' };

// Process gates, in the words of someone standing at the printer.
export const GATE = {
  // "Printable on an H2C" was a promise this criterion never tested: it only reads the research
  // scope list, not temperatures, nozzles or feed paths.
  scope: { plain: 'In the H2C research scope', hint: 'leaves out materials the database places outside the printer\'s envelope; it does not check print settings' },
  nozzle: { plain: 'Nozzle temperature is within range', hint: 'the H2C reaches 350 °C' },
  bed: { plain: 'Bed temperature is within range', hint: 'the H2C reaches 120 °C' },
  chamber: { plain: 'Chamber temperature is within range', hint: 'the H2C reaches 65 °C' },
  abrasive: { plain: 'No hardened nozzle', hint: 'hides filaments a source says need one' },
  dryingKnown: { plain: 'Drying guidance is published', hint: '' },
  h2cStatus: { plain: 'Bambu support level', hint: '' },
  buyable: { plain: 'Listed in the Canadian price sample', hint: 'three retailers, sampled on the snapshot date; not live stock' },
};

/**
 * A process gate's verdict, as a state chip and in words. Three screens used to carry their own copy
 * of this table, which is how a new verdict reaches one screen and not the next.
 */
export const GATE_VERDICT = {
  within: { state: 'PASS', word: 'Yes', short: 'yes' },
  partial: { state: 'INDETERMINATE', word: 'Partly', short: 'part of the window' },
  'exceeds-recommended': { state: 'INDETERMINATE', word: 'Yes, with a caveat', short: 'recommended higher' },
  exceeds: { state: 'FAIL', word: 'No', short: 'no' },
  unknown: { state: 'UNKNOWN', word: 'Not recorded', short: 'not recorded' },
};
export const gateVerdict = (v) => GATE_VERDICT[v] ?? GATE_VERDICT.unknown;

/**
 * Chamber guidance given in words. Each is manufacturer evidence and none is a temperature, so the
 * wording never carries a number.
 */
export const CHAMBER_GUIDANCE = {
  'not-required': { word: 'not required', title: 'A source says no heated chamber is needed. No temperature is implied.' },
  recommended: { word: 'recommended', title: 'A source recommends a heated chamber but publishes no temperature. That is not proof 65 °C is enough.' },
  'no-setpoint': { word: 'no setpoint', title: 'The data sheet lists no chamber setpoint ("-"). Not zero, and not the same as not required.' },
};

/**
 * Estimates, by what they rest on (build/src/estimates.js, DECISIONS D43). One wording, used by the
 * table cell, the drawer, Compare, the chart and the export.
 */
export const ESTIMATE_STRENGTH = {
  'this-grade': { short: 'from this grade\'s related measurements', title: 'Built mainly from this grade\'s own related measurements (another endpoint, direction, load or specimen), each converted to this headline, with the family model' },
  'this-material': { short: 'from this material\'s other grades', title: 'Built from this material\'s other grades or resin data, converted to this headline, with the family model' },
  family: { short: 'from the family model only', title: 'No evidence of this material itself: predicted from its polymer, reinforcement and chemical family, learned from every measured material' },
};

/** How a likely range should be read. */
export const ESTIMATE_PRECISION = {
  good: 'narrow enough to decide on',
  fair: 'indicative',
  poor: 'an order of magnitude only',
};

const percent = (p) => `${Math.round(p * 100)}%`;

/** A hover sentence for an estimate. `fmt` formats a number, so this module needs no imports. */
export function estimateTitle(e, fmt) {
  const s = ESTIMATE_STRENGTH[e.strength] ?? { title: 'Estimated' };
  const levels = e.levels ?? { likely: 0.8, plausible: 0.95 };
  const wide = e.plausible ? ` Plausibly ${fmt(e.plausible.lo)} to ${fmt(e.plausible.hi)} (${percent(levels.plausible)}).` : '';
  return `Estimated, not measured: likely ${fmt(e.lo)} to ${fmt(e.hi)} ${e.unit ?? ''} (${percent(levels.likely)} of hidden measured values fell inside ranges like this), centred on ${fmt(e.centre)}.${wide}`
    + ` ${s.title}.${e.sharedWith ? ` Its representative product is also recorded under ${e.sharedWith.name}.` : ''}`
    + ` Precision: ${e.precision}, ${ESTIMATE_PRECISION[e.precision] ?? ''}.`
    + ` Never enough to pass a requirement. ${e.canScreen ? 'In Explore it screens this material out when its plausible range wholly fails.' : `It cannot screen: ${e.screenLimit}.`}`;
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
      if (c.gate === 'h2cStatus') return `Bambu support level: ${(c.in ?? []).join(', ')}`;
      if (c.gate === 'buyable') return c.inStock ? 'In stock when sampled in Canada' : GATE.buyable.plain;
      if (c.gate === 'abrasive' && c.hardenedAvailable) return 'Hardened nozzle available';
      return GATE[c.gate]?.plain ?? c.gate;
    case 'facet':
      if (c.facet === 'supportMaterial') return c.equals === false ? 'A build material, not a support' : 'Support or interface material';
      return `Reinforcement: ${(c.in ?? []).map((x) => x.replace(/-/g, ' ')).join(' or ')}`;
    case 'environment':
      return `Resists ${envNoun(c.category)}`;
    case 'evidence': {
      const bits = [];
      if (c.exactGrade) bits.push('has a grade-specific measurement');
      if (c.noConflicts) bits.push('no unresolved conflicts');
      return bits.length ? `Evidence: ${bits.join(', ')}` : 'Evidence quality';
    }
    default: return c.kind;
  }
}

/**
 * Environment categories.
 *
 * The names are authored in build/mappings/environment-topics.json and compiled into the snapshot,
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
