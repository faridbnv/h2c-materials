// Plottable axes. Only normalized numeric headline properties appear here, so the picker cannot
// offer a nonsensical pair. "better" drives the Pareto direction.
//
// `measurement` maps an axis onto the raw Properties rows, for the evidence plot mode. An axis
// with no measurement mapping (price) simply cannot be drawn at measurement level.
export const AXIS_DEFS = [
  {
    key: 'density', label: 'Density', unit: 'kg/m³', better: 'min',
    measurement: { properties: ['Density'], direction: null },
  },
  {
    key: 'tensileModulusXY', label: 'Tensile modulus XY', unit: 'GPa', better: 'max',
    measurement: { properties: ['Tensile modulus'], direction: 'XY' },
  },
  {
    key: 'tensileStrengthXY', label: 'Tensile strength XY', unit: 'MPa', better: 'max',
    measurement: {
      properties: ['Tensile strength (endpoint unspecified)', 'Tensile yield strength', 'Tensile break strength'],
      direction: 'XY',
    },
  },
  {
    key: 'elongationXY', label: 'Elongation at break XY', unit: '%', better: 'max',
    measurement: { properties: ['Elongation at break'], direction: 'XY' },
  },
  {
    key: 'hdt045', label: 'HDT at 0.45 MPa', unit: '°C', better: 'max',
    measurement: { properties: ['HDT'], direction: null, loadMPa: 0.45 },
  },
  {
    key: 'priceCADkg', label: 'Price', unit: 'CAD/kg', better: 'min',
    measurement: null,
  },
];

export const axisByKey = (k) => AXIS_DEFS.find((a) => a.key === k) ?? AXIS_DEFS[0];

/**
 * Does a measurement qualify for this axis under the chosen comparability?
 *
 * Strict holds the Method sheet's line: XY and Z stay separate, an unstated direction is not XY,
 * a printed specimen is not interchangeable with an unspecified one, and an HDT whose load was
 * never stated cannot stand in for the 0.45 MPa figure.
 *
 * Broad admits those measurements so the trade space can be seen, and returns the reasons so the
 * chart can say what it mixed.
 */
export function measurementMatches(m, axis, mode) {
  if (!axis.measurement || !m.numeric || m.quarantined) return null;
  if (!axis.measurement.properties.includes(m.property)) return null;

  const notes = [];
  const want = axis.measurement.direction;
  if (want && m.direction !== want) {
    if (mode === 'strict') return null;
    notes.push(m.direction === 'unknown' ? 'direction not stated' : `${m.direction} direction`);
  }
  if (axis.measurement.loadMPa != null) {
    const load = m.thermal?.loadMPa ?? null;
    if (load !== axis.measurement.loadMPa) {
      if (mode === 'strict') return null;
      notes.push(load == null ? 'HDT load not stated' : `HDT at ${load} MPa`);
    }
  }
  if (mode === 'strict' && m.specimenType && !m.specimenType.startsWith('Printed specimen')) {
    // Density rarely names a specimen form; the axis has no direction requirement there either.
    if (want) return null;
  }
  if (m.specimenType && !m.specimenType.startsWith('Printed specimen')) {
    notes.push('specimen form not stated');
  }
  if (m.property !== axis.measurement.properties[0]) notes.push(m.property.toLowerCase());
  return { measurement: m, notes };
}

/** Two measurements of different properties can share a point only if their conditions agree. */
export function pairable(a, b, mode) {
  if (mode === 'broad') return true;
  const da = a.direction, dbb = b.direction;
  if (da === 'not-applicable' || dbb === 'not-applicable') return true;
  return da === dbb;
}
