// What a material's own records can support, domain by domain.
//
// Coverage is terminal: it reports, it never feeds selection (Method, Verification / Coverage). It
// still has to be true. A consolidation pass on 2026-09-13 found coverage saying "Gap" beside
// published data (PC-GF's print setup, TPU's HDT) and "Evidence recorded" where the only evidence was
// another material's family notes (PC FR, PETG HF and fifteen more). These rules define "has data"
// once, so the validator and the data edit that corrected those rows cannot disagree.

import { propertiesInDomain } from './registry.js';

// Categories that count as exposure, solubility or moisture evidence. Flammability is its own domain.
export const ENVIRONMENT_CATEGORIES = new Set([
  'acid', 'alkali', 'organic-solvent', 'oil-grease', 'water-solubility', 'uv-outdoor', 'moisture', 'hydrolysis',
]);

// Mechanical and thermal evidence are the measurements of properties in those domains of the property
// registry (properties.csv). Density and melt flow are physical, not mechanical: counting density as
// mechanical evidence turned every support material's "Mechanical: Gap" into a false contradiction.

/** Method, Identity / Grade sample: supplemental study grades carry R suffixes and are not procurement grades. */
export const isStudyGrade = (gradeId) => /-R\d+$/.test(String(gradeId ?? ''));

/** A coverage status that asserts the domain has evidence, and one that asserts it has none. */
export const CLAIMS_EVIDENCE = new Set(['Evidence recorded', 'Resolved']);
export const CLAIMS_ABSENCE = new Set(['Gap']);

/**
 * The records of this material, per coverage domain, that count as data. Only the material's own
 * records count: family context cited from another material is context, not evidence for this one.
 */
export function domainData(db, material) {
  const own = (rows) => rows.filter((r) => r.materialId === material.id);
  const measured = own(db.measurements).filter((m) => (m.numeric || m.qualitative) && !m.quarantined);
  const mechanical = propertiesInDomain(db.registry, 'mechanical'), thermal = propertiesInDomain(db.registry, 'thermal');
  return {
    Mechanical: measured.filter((m) => mechanical.has(m.property)).map((m) => m.id),
    Thermal: measured.filter((m) => thermal.has(m.property)).map((m) => m.id),
    'Print setup': own(db.profiles).filter((p) => !p.retired)
      .filter((p) => ['nozzle', 'bed', 'chamber'].some((a) => p[a].state !== 'unknown') || p.drying.state === 'stated')
      .map((p) => p.id),
    'Moisture / environmental': own(db.evidence).filter((e) => ENVIRONMENT_CATEGORIES.has(e.category)).map((e) => e.id),
    'Canadian price': material.headline.priceCADkg?.known ? material.headline.priceCADkg.priceIds : [],
  };
}

/** Distinct manufacturers across a material's procurement grades, the figure a Grades row quotes. */
export function manufacturerCount(db, material) {
  return new Set(db.grades.filter((g) => g.materialId === material.id && !g.retired && !isStudyGrade(g.id)).map((g) => g.manufacturer)).size;
}
