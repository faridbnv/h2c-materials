// Plottable axes. Only normalized numeric headline properties appear here, so the picker cannot
// offer a nonsensical pair. "better" drives the Pareto direction.
//
// `measurement` maps an axis onto the raw Properties rows, for the evidence plot mode. An axis
// with no measurement mapping (price) simply cannot be drawn at measurement level.
// Filled from the registry at start-up (registry.js, useRegistry): every headline, with its axis label,
// unit, Pareto direction, and the value properties, direction and load that map it onto measurements.
export const AXIS_DEFS = [];

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
 *
 * Two kinds of remark come back, and keeping them apart matters:
 *
 *   `relaxed`  something strict would have rejected and broad let through. These are the points
 *              drawn hollow, and the only ones the "mixed conditions" banner may name.
 *   `notes`    context worth showing on hover but not a mismatch. A density figure that names no
 *              specimen form is the common case, not a relaxation: the axis has no direction
 *              requirement to violate.
 *
 * Collapsing the two made strict mode announce "mixed conditions are included here" and draw
 * perfectly comparable points hollow, which is precisely the warning a reader should be able to
 * trust.
 */
export function measurementMatches(m, axis, mode) {
  if (!axis.measurement || !m.numeric || m.quarantined || m.implausible) return null;
  if (!axis.measurement.properties.includes(m.property)) return null;
  // Another unit is another quantity, in either mode: an impact value in J/m is energy per metre of notch, and becomes
  // kJ/m² only with the bar's thickness (D92). So is a bar with the other notch.
  if (axis.unit && m.unit !== axis.unit) return null;
  const notch = axis.measurement.notch;
  if (notch && ['Notched', 'Unnotched'].includes(m.notch) && m.notch !== notch) return null;
  // A value to another test standard is another test's, in either mode (D94): ASTM D256 in kJ/m² is not ISO 180.
  const standard = axis.measurement.standard;
  if (standard && m.standards?.length && !m.standards.includes(standard)) return null;

  const relaxed = [];
  const notes = [];
  const want = axis.measurement.direction;
  if (want && m.direction !== want) {
    if (mode === 'strict') return null;
    relaxed.push(m.direction === 'unknown' ? 'direction not stated' : `${m.direction} direction`);
  }
  if (axis.measurement.loadMPa != null) {
    const load = m.thermal?.loadMPa ?? null;
    if (load !== axis.measurement.loadMPa) {
      if (mode === 'strict') return null;
      relaxed.push(load == null ? 'HDT load not stated' : `HDT at ${load} MPa`);
    }
  }
  // A notch the source does not state, or a bar struck away from room temperature: strict leaves it out (D92).
  if (notch && m.notch !== notch) {
    if (mode === 'strict') return null;
    relaxed.push('notch not stated');
  }
  const at = axis.measurement.testTemperatureC;
  if (at != null && m.testTemperatureC != null && Math.abs(m.testTemperatureC - at) > 2) {
    if (mode === 'strict') return null;
    relaxed.push(`struck at ${m.testTemperatureC} °C`);
  }
  const unstatedSpecimen = m.specimenType && !m.specimenType.startsWith('Printed specimen');
  if (unstatedSpecimen) {
    // Only a relaxation where the axis actually cares about how the specimen was made.
    if (want) {
      if (mode === 'strict') return null;
      relaxed.push('specimen form not stated');
    } else {
      notes.push('specimen form not stated');
    }
  }
  if (m.property !== axis.measurement.properties[0]) {
    (mode === 'strict' ? notes : relaxed).push(m.property.toLowerCase());
  }
  return { measurement: m, relaxed, notes: [...relaxed, ...notes] };
}

/**
 * Whether two measurements of one product may share a point, and why not (D107; the review of 2026-09-28, A03).
 *
 * Strict is a claim: the two values describe one product in one condition. It used to check the direction alone, so a dry
 * modulus and a conditioned strength of Ultrafuse PAHT CF15 (V002469, V002491: one sheet's dried and conditioned tables)
 * were drawn as one "matched" point, with 26 more like it. Now an explicit contradiction keeps a pair out of strict:
 * moisture (dry against conditioned), treatment (as printed against annealed, or two annealing schedules), specimen form,
 * direction, and a different document, since two sheets are two test recipes. A condition one source leaves unstated is
 * missing context: the pair stays, and says so, never read as a match. An axis whose value the registry declares unchanged
 * by moisture or annealing (a density) takes no part in those two checks, and may come from another of the product's
 * sheets; the pair says that too. Mixed-condition exploration admits every pair of the product and names each conflict.
 *
 * `inv` is { a: { moisture, annealing, specimen }, b: { ... } }: whether each axis's value changes with moisture and
 * annealing (the registry's flags), and whether it asks a printed bar (an axis with a direction).
 */
export function pairCompatibility(a, b, mode, inv = {}) {
  const conflicts = [], missing = [], basis = [];
  const changes = (side, what) => inv[side]?.[what] !== false;
  const sensitive = (what) => changes('a', what) && changes('b', what);
  const explicit = (x, vocab) => vocab.includes(x);
  if (a.direction !== 'not-applicable' && b.direction !== 'not-applicable' && a.direction !== b.direction) {
    conflicts.push(`directions ${a.direction} and ${b.direction}`);
  }
  if (sensitive('moisture')) {
    const [ma, mb] = [a.moistureState, b.moistureState];
    if (explicit(ma, ['dry', 'conditioned']) && explicit(mb, ['dry', 'conditioned']) && ma !== mb) conflicts.push(`${ma} against ${mb}`);
    else if (ma !== mb) missing.push('moisture stated on one value only');
    else if (!explicit(ma, ['dry', 'conditioned'])) missing.push('moisture not stated');
  } else basis.push('moisture does not change one of the two, by the registry');
  if (sensitive('annealing')) {
    const [pa, pb] = [a.postProcessingState, b.postProcessingState];
    if (explicit(pa, ['as-printed', 'annealed']) && explicit(pb, ['as-printed', 'annealed']) && pa !== pb) conflicts.push(`${pa} against ${pb}`);
    else if (pa === 'annealed' && pb === 'annealed' && JSON.stringify(a.anneal ?? null) !== JSON.stringify(b.anneal ?? null)) conflicts.push('two annealing schedules');
    else if (pa !== pb) missing.push('treatment stated on one value only');
    else if (!explicit(pa, ['as-printed', 'annealed'])) missing.push('treatment not stated');
  } else basis.push('annealing does not change one of the two, by the registry');
  // Specimen form matters where both axes ask a printed bar (a direction); a density is the resin's either way.
  const forms = [a.specimenForm, b.specimenForm];
  if (inv.a?.specimen && inv.b?.specimen && forms.every((f) => f && f !== 'not-stated') && forms[0] !== forms[1]) conflicts.push(`${forms[0]} against ${forms[1]} specimens`);
  if (a.sourceId !== b.sourceId) {
    if (sensitive('moisture') || sensitive('annealing')) conflicts.push('two documents, two test recipes');
    else basis.push('from two of the product\'s sheets');
  }
  const ok = mode === 'broad' || !conflicts.length;
  return { ok, conflicts, missing, basis, strict: !conflicts.length };
}

/** Two measurements of different properties can share a point only if their conditions agree (pairCompatibility). */
export function pairable(a, b, mode, inv = {}) {
  return pairCompatibility(a, b, mode, inv).ok;
}
