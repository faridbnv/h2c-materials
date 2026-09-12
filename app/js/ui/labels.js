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
    hint: 'high means tough and bendy, low means brittle', better: 'max',
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
  scope: { plain: 'Printable on an H2C', hint: 'excludes the 6 materials outside the printer\'s envelope' },
  nozzle: { plain: 'Nozzle temperature is within range', hint: 'the H2C reaches 350 °C' },
  bed: { plain: 'Bed temperature is within range', hint: 'the H2C reaches 120 °C' },
  chamber: { plain: 'Chamber temperature is within range', hint: 'the H2C reaches 65 °C' },
  abrasive: { plain: 'I have a hardened nozzle', hint: 'needed for carbon and glass filled filaments' },
  dryingKnown: { plain: 'Drying schedule is published', hint: '' },
  h2cStatus: { plain: 'Bambu support level', hint: '' },
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
      return GATE[c.gate]?.plain ?? c.gate;
    case 'facet':
      return `Reinforcement: ${(c.in ?? []).map((x) => x.replace(/-/g, ' ')).join(' or ')}`;
    case 'environment':
      return `Resists ${String(c.category).replace(/-/g, ' ')}`;
    case 'evidence': {
      const bits = [];
      if (c.exactGrade) bits.push('has a grade-specific measurement');
      if (c.noConflicts) bits.push('no unresolved conflicts');
      return bits.length ? `Evidence: ${bits.join(', ')}` : 'Evidence quality';
    }
    default: return c.kind;
  }
}

/** Environment categories, with a display label rather than one built by concatenation. */
export const ENVIRONMENT = {
  acid: 'Acids', alkali: 'Alkalis', 'organic-solvent': 'Solvents', 'oil-grease': 'Oils and grease',
  flammability: 'Fire behaviour', 'water-solubility': 'Water solubility',
  'uv-outdoor': 'UV and outdoor', moisture: 'Moisture', hydrolysis: 'Hydrolysis',
  'food-contact': 'Food contact', fatigue: 'Fatigue', creep: 'Creep',
};
export const envLabel = (k) => ENVIRONMENT[k] ?? String(k).replace(/-/g, ' ');
