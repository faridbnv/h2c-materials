// Published measurement eligibility shared by compilation and the drawer (D132).
// No UI-specific comparison rule: the build supplies its vocabulary validators; the browser reads compiled forms.
export const LEVEL = { COMPARABLE: 'comparable', AS_PUBLISHED: 'as-published' };

// A direction the source leaves open is not a direction the source states otherwise: it may be the headline's.
const UNSTATED_DIRECTIONS = new Set(['unknown', 'not-applicable']);
// ASTM D648's low load is 66 psi, 0.455 MPa, and ISO 75 method B's 0.45 MPa: one test (estimate/observations.js reads
// 0.44 to 0.46 MPa as it too).
const LOAD_TOLERANCE_MPA = 0.01;
// The standard laboratory atmosphere of ISO 291 and ASTM D618 is 23 ± 2 °C: a bar struck at 25 °C was struck in it, one
// at -30 °C was not (D92).
export const TEST_TEMPERATURE_TOLERANCE_C = 2;

/** Two annealing schedules are one where both parts agree, an unstated part with an unstated part (D99). */
export const sameSchedule = (a, t) => (a?.tempC ?? null) === (t?.tempC ?? null) && (a?.hours ?? null) === (t?.hours ?? null);
/** A schedule as a reader says it: "at 120 °C for 16 h", with what the sheet does not state said so. */
export const scheduleText = (t) => `at ${t?.tempC != null ? `${t.tempC} °C` : 'a temperature not stated'} for ${t?.hours != null ? `${t.hours} h` : 'a time not stated'}`;

/**
 * Whether a measurement can be a product's value for a headline, and at which level. Returns { excluded } with the
 * reason when it cannot, else { level, caveat }.
 *
 * With a `state` (D99: { treatment: null | { tempC, hours }, moisture: 'dry' | 'conditioned' }) it asks whether the value
 * is the product's in that state: for a headline annealing changes, a value as printed or unstated is the as-printed
 * state's and one annealed at a schedule is that schedule's only; for one water changes, a conditioned value is the
 * conditioned state's and a dry or unstated one the dry state's. Without a state it is the product's published value,
 * as the table and the material's spread show it (an annealed value where the product publishes none as printed).
 */
export function assessMeasurement(m, def, gradeMeasurements, state = null, adapters = {}) {
  const isPartSpecimen = adapters.isPartSpecimen ?? (() => ['printed', 'not-stated'].includes(m.specimenForm));
  const offRecipeWhy = adapters.offRecipeWhy ?? ((type) => type === 'Printed specimen at partial infill'
    ? 'printed below 100 % infill, a part filled that far rather than the material as a solid part (D130)'
    : 'printed at a setting the product is not meant for (D95)');
  const annealedBesideAsPrinted = adapters.annealedBesideAsPrinted ?? ((row, rows) => row.postProcessingState === 'annealed'
    && (rows ?? []).some(x => x !== row && x.gradeId === row.gradeId && x.property === row.property && !x.quarantined && x.postProcessingState === 'as-printed'));
  if (!m.numeric) return { excluded: `no usable numeric value (${m.dataStatus})` };
  if (!def.valueProperties.includes(m.property)) return { excluded: `measures ${m.property}` };
  if (m.unit !== def.unit) return { excluded: `in ${m.unit}, not ${def.unit}` };
  if (m.implausible) return { excluded: 'flagged physically implausible' };
  if (!isPartSpecimen(m.specimenType)) {
    // A bar printed at a setting the product is not meant for (D95), or below 100 % infill (D130), is printed, but not
    // the product as it is printed.
    return { excluded: m.specimenForm === 'off-recipe' ? offRecipeWhy(m.specimenType, { brief: true }) : `a ${m.specimenForm} specimen, not a printed part` };
  }
  if (state && def.changesWithMoisture) {
    if (state.moisture === 'conditioned' && m.moistureState !== 'conditioned') return { excluded: 'not measured after moisture conditioning' };
    if (state.moisture !== 'conditioned' && m.moistureState === 'conditioned') return { excluded: 'measured after moisture conditioning' };
  } else if (m.moistureState === 'conditioned') return { excluded: 'measured after moisture conditioning' };
  if (state && def.changesWithAnnealing) {
    if (state.treatment && (m.postProcessingState !== 'annealed' || !sameSchedule(m.anneal, state.treatment))) return { excluded: `not measured after annealing ${scheduleText(state.treatment)}` };
    if (!state.treatment && m.postProcessingState === 'annealed') return { excluded: `measured after annealing ${scheduleText(m.anneal)}, not as printed` };
  } else if (annealedBesideAsPrinted(m, gradeMeasurements)) return { excluded: 'annealed, and the product publishes it as printed' };
  // An impact headline is defined on a notched bar at room temperature (D92). An unnotched bar absorbs several times the
  // energy, and a notch the source does not state may be either, so neither is ever the headline's value; nor is a
  // bar struck cold. A temperature the source does not state is the laboratory's, as it is for every other headline.
  if (def.notch && m.notch !== def.notch) {
    return { excluded: m.notch === 'Unnotched' ? `an unnotched bar, not ${def.notch.toLowerCase()}` : m.notch === 'Notched' ? `a notched bar, not ${def.notch.toLowerCase()}`
      : 'the source does not state whether the bar was notched' };
  }
  if (def.testTemperatureC != null && m.testTemperatureC != null && Math.abs(m.testTemperatureC - def.testTemperatureC) > TEST_TEMPERATURE_TOLERANCE_C) {
    return { excluded: `tested at ${m.testTemperatureC} °C, not ${def.testTemperatureC} °C` };
  }
  // A headline may name its test standard (D94): a value that names only others is another test's, even in the
  // headline's unit (an Izod value to ASTM D256 printed in kJ/m² is that test's energy per metre of notch, converted by
  // its maker). A value that names no standard is not refused for it.
  if (def.standard && m.standards?.length && !m.standards.includes(def.standard)) {
    return { excluded: `measured to ${m.standards.join(', ')}, not ${def.standard}` };
  }
  let caveat = null;
  if (def.direction && m.direction !== def.direction) {
    if (!UNSTATED_DIRECTIONS.has(m.direction)) return { excluded: `a ${m.direction} measurement, not ${def.direction}` };
    // A value that states no direction may be an XY bar, the way makers test unless they say otherwise, and is counted
    // apart (D84); it is never a Z value, which a maker who pulls a bar across its layers says it is (D92).
    if (def.unstatedDirection === 'excluded') return { excluded: `the source states no direction, and a ${def.direction} value is one it says is ${def.direction}` };
    caveat = 'unstated-direction';
  }
  if (def.loadMPa != null) {
    if (m.thermal?.loadStated) {
      if (Math.abs(m.thermal.loadMPa - def.loadMPa) > LOAD_TOLERANCE_MPA) return { excluded: `measured at ${m.thermal.loadMPa} MPa, not ${def.loadMPa} MPa` };
    } else caveat ??= 'load-not-stated';
  }
  return { level: caveat ? LEVEL.AS_PUBLISHED : LEVEL.COMPARABLE, caveat };
}

/** The same product population the build summarises: active material members, variants apart unless all are variants. */
export function summaryEntries(material, gradeById, key) {
  const products = (material.gradeIds ?? []).map(id => gradeById.get(id)).filter(g => g && !g.retired);
  const plain = products.filter(g => !g.variant).length;
  const variantOnly = products.length > 0 && plain === 0;
  const entries = products.filter(g => g.headline?.[key]).map(g => ({ gradeId: g.id,
    variant: !variantOnly && (!!g.variant || (g.headline[key].from?.origin === 'twin' && !!gradeById.get(g.headline[key].from.gradeId)?.variant)), v: g.headline[key] }));
  return { entries, products: variantOnly ? products.length : plain };
}
