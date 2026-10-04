// What a product's or a material's own measurements prove a headline is at least (headline_definitions.csv Lower bound
// properties): the ultimate strength is at least the yield and break stress, a break strain at least the strain at yield,
// HDT at 0.45 MPa at least HDT at 1.8 MPa. One rule, read by the compile stage (implied bounds), the estimate stage (a
// grade's range, the back-test) and the order check (EST-ORDER), so what bounds an estimate and what the check asks of
// it cannot differ.

import { annealedBesideAsPrinted } from './normalize/specimen.js';

// Which specimens bound a headline (D126). A printed bar does, and so does one whose sheet states no specimen: D84 lets
// that value decide a product's headline, so a stricter reading here left an estimate beside the sheet's own number. A
// bar the source states is moulded, a drawn film, a filament strand or printed off the product's recipe is another
// specimen (ASTM D882 film strengths once kept PLA a candidate for 140 MPa) and bounds nothing.
export const BOUNDING_FORMS = ['printed', 'not-stated'];
// The rule before D126, kept only for the back-test that measures what admitting the unstated specimen changed.
export const PRINTED_FORMS = ['printed'];

/**
 * The measurements, among `own` (a material's or a formulation's), that bound the headline `def` from below:
 * [{ measurementId, gradeId, property, direction, lo, unit }]. Any direction bounds: a printed part is strongest in XY,
 * so a Z or unstated-direction strength is at most its XY one. A state the headline is not in bounds nothing either: an
 * annealed value where the grade publishes the as-printed one, or a moisture state the rule excludes (conditioning
 * raises a nylon's strain at break). Nothing a physics lint flagged or the data quarantined bounds anything.
 */
export function lowerBoundsOf(def, own, { forms = BOUNDING_FORMS } = {}) {
  const rel = def.lowerBounds;
  if (!rel) return [];
  return own
    .filter((m) => m.numeric && !m.quarantined && !m.implausible && forms.includes(m.specimenForm) && m.operator !== '<' && m.operator !== '<=')
    .filter((m) => !annealedBesideAsPrinted(m, own))
    .filter((m) => !(rel.excludeMoisture ?? []).includes(m.moistureState))
    .filter((m) => rel.properties.includes(m.property) && (rel.loadMPa == null || (m.thermal?.loadStated && Math.abs(m.thermal.loadMPa - rel.loadMPa) < 0.05)))
    .map((m) => ({ measurementId: m.id, gradeId: m.gradeId, property: m.property, direction: m.direction,
      // The published value (the low end of a published range, the bound of a "> x"), never value + SD: a spread of
      // specimens is not a guarantee, and 30 ± 23 % once read as "at least 53 %" (audit 2026-09-15, B-02).
      lo: m.value, unit: m.unit }))
    .filter((b) => Number.isFinite(b.lo));
}
