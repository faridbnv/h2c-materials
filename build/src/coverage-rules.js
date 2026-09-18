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
 *
 * "Post-processing / application" is deliberately absent. Its rows distinguish grade-specific evidence from family
 * notes a material owns but that were written for its family, and no rule over evidence domains expresses that: six
 * materials say Gap there beside records of their own, truthfully. Those rows stay stored (m48).
 */
export function domainData(db, material) {
  const own = (rows) => rows.filter((r) => r.materialId === material.id);
  const measured = own(db.measurements).filter((m) => (m.numeric || m.qualitative) && !m.quarantined);
  const mechanical = propertiesInDomain(db.registry, 'mechanical'), thermal = propertiesInDomain(db.registry, 'thermal');
  return {
    // A material is its own identity evidence: it has a canonical record, which is what the domain reports (m48).
    Identity: [material.id],
    'H2C status': material.h2cStatus ? (material.identity.h2cEvidence ?? []) : [],
    Mechanical: measured.filter((m) => mechanical.has(m.property)).map((m) => m.id),
    Thermal: measured.filter((m) => thermal.has(m.property)).map((m) => m.id),
    'Print setup': own(db.profiles).filter((p) => !p.retired)
      .filter((p) => ['nozzle', 'bed', 'chamber'].some((a) => p[a].state !== 'unknown') || p.drying.state === 'stated')
      .map((p) => p.id),
    'Moisture / environmental': own(db.evidence).filter((e) => ENVIRONMENT_CATEGORIES.has(e.category)).map((e) => e.id),
    'Canadian price': material.headline.priceCADkg?.known ? material.headline.priceCADkg.priceIds : [],
  };
}

/**
 * The finding a derived coverage row carries: what the build can see, counted and named, which is more than the
 * sentence it replaces said. The caveat each domain's sentence carried is kept, because it is still true.
 */
export const DERIVED_FINDING = {
  Identity: (m) => `Canonical identity recorded: ${m.fullName} (${m.family}, base polymer ${m.basePolymer}). Aliases and disputed entries are family entries of their own.`,
  'H2C status': (m, ids) => `H2C status recorded: ${m.h2cStatus}. Generic inclusion is not automatic grade or route approval. Cited: ${ids.join(', ')}.`,
  Mechanical: (m, ids) => `${ids.length} mechanical measurement(s) of this material's own grades. See specimen, direction, moisture, preparation and standard before comparing.`,
  Thermal: (m, ids) => `${ids.length} thermal measurement(s) of this material's own grades. HDT, Tg and Vicat are not continuous-service ratings.`,
  'Print setup': (m, ids) => `${ids.length} print profile(s) publishing a nozzle, bed, chamber or drying setting: ${ids.join(', ')}. Check other setup fields individually.`,
  'Moisture / environmental': (m, ids) => `${ids.length} exposure, solubility or moisture record(s) from this material's own sources. Test conditions are rarely stated; not a chemical database.`,
  'Canadian price': (m, ids) => `${ids.length} in-stock regular-price observation(s), before tax/shipping.`,
};

/** The id of a derived row. Not a C##### key: nothing in the tables has this identifier, and nothing may cite it. */
export const derivedId = (materialId, domain) => `derived-${materialId}-${domain.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

/**
 * Coverage rows the build derives: one per (material, domain) the build can prove and no stored row speaks for.
 * A stored row always wins, because it is a judgement somebody made and this is only a restatement of the records.
 */
export function derivedCoverage(db) {
  const stored = new Set(db.coverage.filter((c) => c.status !== 'Superseded').map((c) => `${c.materialId}\u0000${c.domain}`));
  const out = [];
  for (const material of db.materials) {
    const data = domainData(db, material);
    for (const domain of Object.keys(DERIVED_FINDING)) {
      const ids = data[domain] ?? [];
      if (!ids.length || stored.has(`${material.id}\u0000${domain}`)) continue;
      out.push({
        id: derivedId(material.id, domain), materialId: material.id, domain, status: 'Evidence recorded',
        manufacturerCount: null, finding: DERIVED_FINDING[domain](material, ids), derived: true,
      });
    }
  }
  return out;
}

/** Distinct manufacturers across a material's procurement grades, the figure a Grades row quotes. */
export function manufacturerCount(db, material) {
  return new Set(db.grades.filter((g) => g.materialId === material.id && !g.retired && !isStudyGrade(g.id)).map((g) => g.manufacturer)).size;
}
