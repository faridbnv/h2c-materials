// What a material's own records can support, domain by domain.
//
// Coverage is terminal: it reports, it never feeds selection (Method, Verification / Coverage). It
// still has to be true. A consolidation pass on 2026-09-13 found coverage saying "Gap" beside
// published data (PC-GF's print setup, TPU's HDT) and "Evidence recorded" where the only evidence was
// another material's family notes (PC FR, PETG HF and fifteen more). These rules define "has data"
// once, so the validator and the data edit that corrected those rows cannot disagree.

import { propertiesInDomain } from './registry.ts';
import type { Dyn } from './types.ts';

// Categories that count as exposure, solubility or moisture evidence. Flammability is its own domain.
export const ENVIRONMENT_CATEGORIES = new Set<Dyn>([
  'acid', 'alkali', 'organic-solvent', 'oil-grease', 'water-solubility', 'uv-outdoor', 'moisture', 'hydrolysis',
]);

// Mechanical and thermal evidence are the measurements of properties in those domains of the property
// registry (properties.csv). Density and melt flow are physical, not mechanical: counting density as
// mechanical evidence turned every support material's "Mechanical: Gap" into a false contradiction.

/** Method, Identity / Grade sample: supplemental study grades carry R suffixes and are not procurement grades. */
export const isStudyGrade = (gradeId: Dyn) => /-R\d+$/.test(String(gradeId ?? ''));

/** A coverage status that asserts the domain has evidence, and one that asserts it has none. */
export const CLAIMS_EVIDENCE = new Set<Dyn>(['Evidence recorded', 'Resolved']);
export const CLAIMS_ABSENCE = new Set<Dyn>(['Gap']);

// The foreign listings of a database, found once per database: domainData runs once per material.
const FOREIGN = new WeakMap<Dyn, Dyn>();
const foreignPrice = (db: Dyn, id: Dyn) => {
  if (!FOREIGN.has(db)) FOREIGN.set(db, new Set<Dyn>((db.prices ?? []).filter((p: Dyn) => p.foreign).map((p: Dyn) => p.id)));
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
/** A material's makers' statements on moisture sensitivity, from the know-how tier (db.knowHow, D85). */
export const MOISTURE_KNOW_HOW = 'Moisture sensitivity';
const moistureKnowHow = (db: Dyn, material: Dyn) => (db.knowHow ?? []).filter((k: Dyn) => k.materialId === material.id && k.topic === MOISTURE_KNOW_HOW);

export function domainData(db: Dyn, material: Dyn) {
  const own = (rows: Dyn) => rows.filter((r: Dyn) => r.materialId === material.id);
  const measured = own(db.measurements).filter((m: Dyn) => (m.numeric || m.qualitative) && !m.quarantined);
  const mechanical = propertiesInDomain(db.registry, 'mechanical'), thermal = propertiesInDomain(db.registry, 'thermal');
  return {
    // A material is its own identity evidence: it has a canonical record, which is what the domain reports (m48).
    Identity: [material.id],
    'H2C status': material.h2cStatus ? (material.identity.h2cEvidence ?? []) : [],
    Mechanical: measured.filter((m: Dyn) => mechanical.has(m.property)).map((m: Dyn) => m.id),
    Thermal: measured.filter((m: Dyn) => thermal.has(m.property)).map((m: Dyn) => m.id),
    'Print setup': own(db.profiles).filter((p: Dyn) => !p.retired)
      .filter((p: Dyn) => ['nozzle', 'bed', 'chamber'].some((a) => p[a].state !== 'unknown') || p.drying.state === 'stated')
      .map((p: Dyn) => p.id),
    // A maker's own statement on how its product takes up water (moderately hygroscopic, dry at 75 °C for 24 h, keep in a
    // dry box) is a moisture record of its own sources, as a storage or handling note under Environmental is; it sits in
    // the know-how tier, which screens nothing (D85), so it counts here and decides nothing (D143).
    'Moisture / environmental': [...own(db.evidence).filter((e: Dyn) => ENVIRONMENT_CATEGORIES.has(e.category)), ...moistureKnowHow(db, material)].map((e) => e.id),
    // A Canadian listing only: a price converted from a foreign one prices the material and closes no Canadian gap (D113).
    'Canadian price': material.headline.priceCADkg?.known ? material.headline.priceCADkg.priceIds.filter((id: Dyn) => !foreignPrice(db, id)) : [],
  };
}

/**
 * The finding a derived coverage row carries: what the build can see, counted and named, which is more than the
 * sentence it replaces said. The caveat each domain's sentence carried is kept, because it is still true.
 */
export const DERIVED_FINDING: Dyn = {
  Identity: (m: Dyn) => `Canonical identity recorded: ${m.fullName} (${m.family}, base polymer ${m.basePolymer}). Aliases and disputed entries are family entries of their own.`,
  'H2C status': (m: Dyn, ids: Dyn) => `H2C status recorded: ${m.h2cStatus}. Generic inclusion is not automatic grade or route approval. Cited: ${ids.join(', ')}.`,
  Mechanical: (m: Dyn, ids: Dyn) => `${ids.length} mechanical measurement(s) of this material's own grades. See specimen, direction, moisture, preparation and standard before comparing.`,
  Thermal: (m: Dyn, ids: Dyn) => `${ids.length} thermal measurement(s) of this material's own grades. HDT, Tg and Vicat are not continuous-service ratings.`,
  'Print setup': (m: Dyn, ids: Dyn) => `${ids.length} print profile(s) publishing a nozzle, bed, chamber or drying setting: ${ids.join(', ')}. Check other setup fields individually.`,
  'Moisture / environmental': (m: Dyn, ids: Dyn, db: Dyn) => {
    const statements = moistureKnowHow(db, m).length;
    return `${ids.length} exposure, solubility or moisture record(s) from this material's own sources${statements ? `, ${statements === ids.length ? (ids.length === 1 ? 'it' : 'all of them') : `${statements} of them`} its makers' statements on moisture sensitivity (drying, storage, water uptake)` : ''}. Test conditions are rarely stated; not a chemical database.`;
  },
  'Canadian price': (m: Dyn, ids: Dyn) => `${ids.length} in-stock regular-price observation(s), before tax/shipping.`,
};

/**
 * The finding a derived row carries where the records show nothing of a domain (D114): what is missing, counted from the
 * same rule, so a material with no stored row reads as a gap exactly as one with a stored Gap does, not as a blank.
 */
export const DERIVED_ABSENT: Dyn = {
  'H2C status': (m: Dyn) => (m.h2cStatus ? `H2C status "${m.h2cStatus}" is recorded with no document cited behind it.` : 'No H2C status recorded.'),
  'Print setup': () => 'No print profile of its own products publishes a nozzle, bed, chamber or drying setting.',
  Mechanical: () => 'Its own products publish no mechanical value.',
  Thermal: () => 'Its own products publish no thermal value.',
  'Moisture / environmental': (m: Dyn, db: Dyn) => `No exposure, solubility or moisture record from its own sources.${(db.polymerEvidence ?? []).some((e: Dyn) => e.materialId === m.id)
    ? ' Its base polymer\'s published behaviour is shown instead, labelled polymer-level.' : ''}`,
  'Canadian price': (m: Dyn, db: Dyn) => {
    const listed = db.prices.filter((p: Dyn) => p.materialId === m.id && !p.quarantined);
    if (!listed.length) return 'No listing of its own products in the sampled shops, Canadian or foreign.';
    const why = listed.every((p: Dyn) => p.stock !== 'In stock') ? 'out of stock' : 'without a regular price the sample can use';
    return `No price: ${listed.length === 1 ? 'the one listing' : listed.length === 2 ? 'both listings' : `all ${listed.length} listings`} of its own products in the sampled shops (${listed.map((p: Dyn) => p.id).join(', ')}) ${listed.length === 1 ? 'is' : 'are'} ${why}.`;
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
const convertedPrice = (m: Dyn) => {
  const c = m.headline?.priceCADkg?.known ? m.headline.priceCADkg.converted : null;
  if (!c) return null;
  const whose = c.products ? `the foreign listings of ${c.products === 1 ? 'one of its products' : `${c.products} of its products`}` : 'its foreign listings';
  return `No Canadian listing in the sample: priced from ${whose}, in ${c.currencies.join(' and ')}, converted at the Bank of Canada rate of ${c.rateDate} (D113).`;
};

/** The id of a derived row. Not a C##### key: nothing in the tables has this identifier, and nothing may cite it. */
export const derivedId = (materialId: Dyn, domain: Dyn) => `derived-${materialId}-${domain.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

/**
 * Coverage rows the build derives: one per (material, domain) no stored row speaks for, saying what the records show,
 * evidence or its absence (D74, D114). A stored row always wins, because it is a judgement somebody made and this is only
 * a restatement of the records.
 */
export function derivedCoverage(db: Dyn) {
  const stored = new Set<Dyn>(db.coverage.filter((c: Dyn) => c.status !== 'Superseded').map((c: Dyn) => `${c.materialId}\u0000${c.domain}`));
  const out = [];
  for (const material of db.materials) {
    const data: Record<string, Dyn> = domainData(db, material);
    for (const domain of Object.keys(DERIVED_FINDING)) {
      if (stored.has(`${material.id}\u0000${domain}`)) continue;
      const ids = data[domain] ?? [];
      const row = (status: Dyn, finding: Dyn) => out.push({ id: derivedId(material.id, domain), materialId: material.id, domain, status, manufacturerCount: null, finding, derived: true });
      if (ids.length) { row('Evidence recorded', DERIVED_FINDING[domain](material, ids, db)); continue; }
      // Absence is a restatement of the records too (D114), except for a family entry, which owns no product and whose
      // stored rows say Not applicable where it had findings.
      if (material.familyEntry || !DERIVED_ABSENT[domain]) continue;
      const converted = domain === 'Canadian price' && convertedPrice(material);
      if (converted) row('Limited comparability', converted);
      else row('Gap', DERIVED_ABSENT[domain](material, db));
    }
    // The rarely published properties: a Gap naming the ones its own products do not publish.
    if (material.familyEntry || stored.has(`${material.id}\u0000Sparse properties`)) continue;
    const published = new Set<Dyn>(db.measurements.filter((m: Dyn) => m.materialId === material.id && (m.numeric || m.qualitative) && !m.quarantined).map((m: Dyn) => m.property));
    const missing = SPARSE_PROPERTIES.filter((p) => !published.has(p));
    out.push({ id: derivedId(material.id, 'Sparse properties'), materialId: material.id, domain: 'Sparse properties', manufacturerCount: null, derived: true,
      ...(missing.length ? { status: 'Gap', finding: `Not published by its own products: ${missing.join(', ')}.` }
        : { status: 'Evidence recorded', finding: `Its own products publish every rarely published property: ${SPARSE_PROPERTIES.join(', ')}.` }) });
  }
  return out;
}

/** Distinct manufacturers across a material's procurement grades, the figure a Grades row quotes. */
export function manufacturerCount(db: Dyn, material: Dyn) {
  return new Set<Dyn>(db.grades.filter((g: Dyn) => g.materialId === material.id && !g.retired && !isStudyGrade(g.id)).map((g: Dyn) => g.manufacturer)).size;
}
