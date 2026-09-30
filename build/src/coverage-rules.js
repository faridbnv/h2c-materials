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

// The foreign listings of a database, found once per database: domainData runs once per material.
const FOREIGN = new WeakMap();
const foreignPrice = (db, id) => {
  if (!FOREIGN.has(db)) FOREIGN.set(db, new Set((db.prices ?? []).filter((p) => p.foreign).map((p) => p.id)));
  return FOREIGN.get(db).has(id);
};

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
    // A Canadian listing only: a price converted from a foreign one prices the material and closes no Canadian gap (D113).
    'Canadian price': material.headline.priceCADkg?.known ? material.headline.priceCADkg.priceIds.filter((id) => !foreignPrice(db, id)) : [],
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

/**
 * The finding a derived row carries where the records show nothing of a domain (D114): what is missing, counted from the
 * same rule, so a material with no stored row reads as a gap exactly as one with a stored Gap does, not as a blank.
 */
export const DERIVED_ABSENT = {
  'H2C status': (m) => (m.h2cStatus ? `H2C status "${m.h2cStatus}" is recorded with no document cited behind it.` : 'No H2C status recorded.'),
  'Print setup': () => 'No print profile of its own products publishes a nozzle, bed, chamber or drying setting.',
  Mechanical: () => 'Its own products publish no mechanical value.',
  Thermal: () => 'Its own products publish no thermal value.',
  'Moisture / environmental': (m, db) => `No exposure, solubility or moisture record from its own sources.${(db.polymerEvidence ?? []).some((e) => e.materialId === m.id)
    ? ' Its base polymer\'s published behaviour is shown instead, labelled polymer-level.' : ''}`,
  'Canadian price': (m, db) => {
    const listed = db.prices.filter((p) => p.materialId === m.id && !p.quarantined);
    if (!listed.length) return 'No listing of its own products in the sampled shops, Canadian or foreign.';
    const why = listed.every((p) => p.stock !== 'In stock') ? 'out of stock' : 'without a regular price the sample can use';
    return `No price: ${listed.length === 1 ? 'the one listing' : listed.length === 2 ? 'both listings' : `all ${listed.length} listings`} of its own products in the sampled shops (${listed.map((p) => p.id).join(', ')}) ${listed.length === 1 ? 'is' : 'are'} ${why}.`;
  },
};

/**
 * The properties almost no data sheet publishes for a filament, the "Sparse properties" domain. Which of them a
 * material's own products leave unpublished is derived from its measurements (D114); three are not properties the
 * registry holds yet, so no filament publishes them here.
 */
export const SPARSE_PROPERTIES = ['Compression strength', 'Coefficient of thermal expansion', 'Thermal conductivity', 'Fracture toughness',
  'Fatigue life', 'Creep compliance', 'Coefficient of friction'];

/**
 * A material priced only from foreign listings has no Canadian price, and is not unpriced either (D113): its price
 * coverage is limited, and says from what.
 */
const convertedPrice = (m) => {
  const c = m.headline?.priceCADkg?.known ? m.headline.priceCADkg.converted : null;
  if (!c) return null;
  const whose = c.products ? `the foreign listings of ${c.products === 1 ? 'one of its products' : `${c.products} of its products`}` : 'its foreign listings';
  return `No Canadian listing in the sample: priced from ${whose}, in ${c.currencies.join(' and ')}, converted at the Bank of Canada rate of ${c.rateDate} (D113).`;
};

/** The id of a derived row. Not a C##### key: nothing in the tables has this identifier, and nothing may cite it. */
export const derivedId = (materialId, domain) => `derived-${materialId}-${domain.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

/**
 * Coverage rows the build derives: one per (material, domain) no stored row speaks for, saying what the records show,
 * evidence or its absence (D74, D114). A stored row always wins, because it is a judgement somebody made and this is only
 * a restatement of the records.
 */
export function derivedCoverage(db) {
  const stored = new Set(db.coverage.filter((c) => c.status !== 'Superseded').map((c) => `${c.materialId}\u0000${c.domain}`));
  const out = [];
  for (const material of db.materials) {
    const data = domainData(db, material);
    for (const domain of Object.keys(DERIVED_FINDING)) {
      if (stored.has(`${material.id}\u0000${domain}`)) continue;
      const ids = data[domain] ?? [];
      const row = (status, finding) => out.push({ id: derivedId(material.id, domain), materialId: material.id, domain, status, manufacturerCount: null, finding, derived: true });
      if (ids.length) { row('Evidence recorded', DERIVED_FINDING[domain](material, ids)); continue; }
      // Absence is a restatement of the records too (D114), except for a family entry, which owns no product and whose
      // stored rows say Not applicable where it had findings.
      if (material.familyEntry || !DERIVED_ABSENT[domain]) continue;
      const converted = domain === 'Canadian price' && convertedPrice(material);
      if (converted) row('Limited comparability', converted);
      else row('Gap', DERIVED_ABSENT[domain](material, db));
    }
    // The rarely published properties: a Gap naming the ones its own products do not publish.
    if (material.familyEntry || stored.has(`${material.id}\u0000Sparse properties`)) continue;
    const published = new Set(db.measurements.filter((m) => m.materialId === material.id && (m.numeric || m.qualitative) && !m.quarantined).map((m) => m.property));
    const missing = SPARSE_PROPERTIES.filter((p) => !published.has(p));
    out.push({ id: derivedId(material.id, 'Sparse properties'), materialId: material.id, domain: 'Sparse properties', manufacturerCount: null, derived: true,
      ...(missing.length ? { status: 'Gap', finding: `Not published by its own products: ${missing.join(', ')}.` }
        : { status: 'Evidence recorded', finding: `Its own products publish every rarely published property: ${SPARSE_PROPERTIES.join(', ')}.` }) });
  }
  return out;
}

/** Distinct manufacturers across a material's procurement grades, the figure a Grades row quotes. */
export function manufacturerCount(db, material) {
  return new Set(db.grades.filter((g) => g.materialId === material.id && !g.retired && !isStudyGrade(g.id)).map((g) => g.manufacturer)).size;
}
