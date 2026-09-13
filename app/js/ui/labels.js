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
