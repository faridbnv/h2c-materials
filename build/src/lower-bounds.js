// What a product's or a material's own measurements prove a headline is at least (headline_definitions.csv Lower bound
// properties): the ultimate strength is at least the yield and break stress, a break strain at least the strain at yield,
// HDT at 0.45 MPa at least HDT at 1.8 MPa. One rule, read by the compile stage (implied bounds), the estimate stage (a
// grade's range, the back-test) and the order check (EST-ORDER), so what bounds an estimate and what the check asks of
// it cannot differ.

import { annealedBesideAsPrinted, countsUndescribed } from './normalize/specimen.js';

// Which specimens bound a headline (D126). A printed bar does; a bar the source states is moulded, a drawn film, a
// filament strand or printed off the product's recipe is another specimen (ASTM D882 film strengths once kept PLA a
// candidate for 140 MPa) and bounds nothing. D126 let a bar whose sheet states no specimen bound too, the default here
// where the registry says nothing; every headline with a lower bound now takes printed bars only (headline_definitions.csv
// Lower bound specimens): elongation since D161, tensile strength and heat deflection at 0.45 MPa since D172, an
// undescribed bar being possibly a moulded one, and a heat deflection D177 counts is read as printed (below).
export const BOUNDING_FORMS = ['printed', 'not-stated'];
// The rule before D126, kept only for the back-test that measures what admitting the unstated specimen changed.
export const PRINTED_FORMS = ['printed'];

/**
 * The measurements, among `own` (a material's or a formulation's), that bound the headline `def` from below, of the
 * specimens the headline names (`def.lowerBounds.forms`, or `forms` where a back-test asks for others):
 * [{ measurementId, gradeId, property, direction, lo, unit }]. Any direction bounds: a printed part is strongest in XY,
 * so a Z or unstated-direction strength is at most its XY one. A state the headline is not in bounds nothing either: an
 * annealed value of a headline that changes with annealing (D167: an annealed HDT at 1.8 MPa held Bambu Lab PET-CF's
 * as-printed estimate at 182 °C, where the data's own pairs put a printed PET-CF near 87), an annealed value where the
 * grade publishes the as-printed one, or a moisture state the rule excludes (conditioning raises a nylon's strain at
 * break). Nothing a physics lint flagged or the data quarantined bounds anything.
 */
export function lowerBoundsOf(def, own, { forms: asked } = {}) {
  const rel = def.lowerBounds;
  if (!rel) return [];
  const forms = asked ?? rel.forms ?? BOUNDING_FORMS;
  return own
    // A bar no document describes bounds where it is read as printed (D177: heat deflection of a polymer that cannot
    // crystallise), as it decides the product's value there.
    .filter((m) => m.numeric && !m.quarantined && !m.implausible && (forms.includes(m.specimenForm) || (forms.includes('printed') && countsUndescribed(m, def))) && m.operator !== '<' && m.operator !== '<=')
    .filter((m) => (def.changesWithAnnealing ? m.postProcessingState !== 'annealed' : !annealedBesideAsPrinted(m, own)))
    .filter((m) => !(rel.excludeMoisture ?? []).includes(m.moistureState))
    .filter((m) => rel.properties.includes(m.property) && (rel.loadMPa == null || (m.thermal?.loadStated && Math.abs(m.thermal.loadMPa - rel.loadMPa) < 0.05)))
    .map((m) => ({ measurementId: m.id, gradeId: m.gradeId, property: m.property, direction: m.direction,
      // The published value (the low end of a published range, the bound of a "> x"), never value + SD: a spread of
      // specimens is not a guarantee, and 30 ± 23 % once read as "at least 53 %" (audit 2026-09-15, B-02).
      lo: m.value, unit: m.unit }))
    .filter((b) => Number.isFinite(b.lo));
}

/**
 * What a product's own values from a moulded bar or one its sheet does not describe cap a headline at (D160): for each
 * demote-to-ceiling row of conversions.csv (reported or deciding) that targets the headline and names no Applies to, its
 * source properties' values in the build plane or with no direction stated (a value across the layers is no ceiling of
 * the flat one), as printed and not conditioned, times the row's Factor high: [{ measurementId, gradeId, property, hi,
 * unit, rule }]. Elongation has no such row: one product's undescribed stretch runs from a third to seventeen times its
 * printed one.
 */
export function ownCeilingsOf(def, own, rows) {
  const out = [];
  for (const r of (rows ?? []).filter((x) => x.target === def.key && x.kind === 'demote-to-ceiling' && !x.appliesToText)) {
    for (const m of own) {
      if (!m.numeric || m.quarantined || m.implausible || !r.sourceProperties.includes(m.property)) continue;
      if (!['moulded', 'not-stated'].includes(m.specimenForm) || /^(Z|ZX|Vertical)/.test(m.direction ?? '')) continue;
      if (m.postProcessingState === 'annealed' || m.moistureState === 'conditioned' || m.operator === '>' || m.operator === '>=') continue;
      const hi = (m.interval?.hi ?? m.value) * r.factorHigh;
      if (Number.isFinite(hi)) out.push({ measurementId: m.id, gradeId: m.gradeId, property: m.property, hi, unit: m.unit, rule: r.id });
    }
  }
  return out;
}

