// A material answered by its products (re-center phase 2; docs/GOALS.md, D83 and D84).
//
// The build gives every product its own values and print recipe (build/src/products.js). A product view is the
// material with one product's values and recipe in place of the material's own, so every criterion the engine already
// knows (a numeric limit, a print gate, a facet, an environment record) is judged on that product with no second copy
// of the rules. constraints.js runs the views and rolls them up: a material passes when at least one of its products
// meets every requirement at once, and says how many do.
//
// Pure: no DOM, no globals, no imports from ../ui.

/** How a material's products answered: all that could be judged pass, some do, or none does. */
export const SHARE = { ALL: 'all', SOME: 'some', NONE: 'none' };

/**
 * Which values may decide. `comparable` (the default) is a printed or unstated specimen, the headline's direction,
 * dry or unstated, at its load; `as-published` also admits values whose source leaves the direction or the load
 * unstated, which read like moulded bars and flatter a printed part (D84).
 */
export const EVIDENCE = { COMPARABLE: 'comparable', AS_PUBLISHED: 'as-published' };
export const normalizeEvidence = (v) => (v === EVIDENCE.AS_PUBLISHED ? EVIDENCE.AS_PUBLISHED : EVIDENCE.COMPARABLE);

/** Each material's products: its active procurement grades, in the material's order. */
export function productsByMaterial(db) {
  const byId = new Map(db.grades.map((g) => [g.id, g]));
  return new Map(db.materials.map((m) => [m.id, (m.gradeIds ?? []).map((id) => byId.get(id)).filter((g) => g && !g.retired)]));
}

function productValueHeadline(base, grade, v, measurementById) {
  const h = {
    known: true, value: v.value, unit: base.unit, origin: 'source', verified: true,
    measurementId: v.measurementId ?? null, gradeId: grade.id,
    sourceId: measurementById?.get(v.measurementId)?.sourceId ?? null,
    interval: v.interval ?? { lo: v.value, hi: v.value, kind: 'point' },
    uncertainty: v.uncertainty ?? null,
    level: v.level,
  };
  if (v.direction) h.direction = v.direction;
  if (v.caveat) h.caveat = v.caveat;
  if (v.anneal) h.anneal = v.anneal;
  if (v.priceIds) Object.assign(h, { priceIds: v.priceIds, observations: v.observations });
  return h;
}

/**
 * One headline of a product view. A product value that may decide becomes the headline; otherwise the product has no
 * value here, and says whether it publishes one that is not comparable. The material's estimate stands in only where
 * none of its products publishes a comparable value, which is where it was built to (D43, D83): a product that is
 * silent beside siblings that publish is untested, not estimated.
 */
export function productHeadline(material, grade, key, ctx = {}) {
  const base = material.headline?.[key];
  if (!base || base.notApplicable) return base;
  const v = grade.headline?.[key];
  const evidence = normalizeEvidence(ctx.evidence);
  const decides = v && (v.level === 'comparable' || evidence === EVIDENCE.AS_PUBLISHED);
  // A scenario assumption is the reader's own number for a material's missing value; it stands in for a product that
  // publishes nothing that may decide, and never over a value that does.
  if (!decides && base.assumption) return base;
  if (decides) return productValueHeadline(base, grade, v, ctx.measurementById);
  const entry = {
    known: false, unit: base.unit,
    missing: v ? 'not-comparable' : key === 'priceCADkg' ? 'not-available-in-market' : 'not-published',
  };
  if (v) entry.asPublished = { value: v.value, caveat: v.caveat, measurementId: v.measurementId };
  const summary = material.summary?.[key];
  if (base.estimate && !(summary?.n > 0)) {
    entry.estimate = base.estimate;
    entry.impliedBounds = base.impliedBounds ?? [];
  }
  return entry;
}

const NO_PROFILE = { verdict: 'unknown', reason: 'No print profile recorded for this product' };

/** A product's print gates, from its own recipe; a product with none is unknown on each, never a pass. */
export function productGates(material, grade) {
  const p = grade.print;
  const axis = (a) => (p?.profileIds.length ? { verdict: p[a].verdict, reason: p[a].reason } : NO_PROFILE);
  return {
    ...material.gates,
    nozzle: axis('nozzle'), bed: axis('bed'), chamber: axis('chamber'),
    abrasive: p?.hardenedNozzle === true ? 'requires-hardened' : p?.hardenedNozzle === false ? 'no-special-concern' : 'unknown',
    drying: p?.drying ? 'required' : 'unknown',
  };
}

/**
 * The material with one product's values and recipe. It keeps the material's ID, facets, scope and records, so the
 * criteria that are the material's (its family, its environment evidence, its scope) read what they always read.
 */
export function productView(material, grade, ctx = {}) {
  const headline = {};
  for (const key of Object.keys(material.headline ?? {})) headline[key] = productHeadline(material, grade, key, ctx);
  return { ...material, headline, gates: productGates(material, grade), product: grade };
}

/**
 * The material as the page shows it: each headline that its products publish comparably becomes the products' typical
 * value (their median), carrying their spread, so every view that reads a material's headline (the table, the chart,
 * Compare, the export) shows the material as the spread of its products (D83). A headline no product publishes
 * comparably keeps what the build gave it: an estimate, a related measurement, not published, not applicable. Nothing
 * here decides: the verdict is its products' (evaluateProducts).
 */
export function displayMaterial(material, gradeById) {
  if (!material.summary) return material;
  let headline = null;
  for (const [key, s] of Object.entries(material.summary)) {
    const base = material.headline?.[key];
    if (!(s.n > 0) || !base || base.notApplicable) continue;
    const typical = gradeById.get(s.typical)?.headline?.[key];
    headline ??= { ...material.headline };
    headline[key] = {
      known: true, value: s.median, unit: base.unit, origin: 'products', verified: true,
      interval: { lo: s.median, hi: s.median, kind: 'point' },
      spread: { n: s.n, products: s.products, min: s.min, max: s.max, q1: s.q1 ?? null, q3: s.q3 ?? null,
        asPublished: s.asPublished ?? null, variants: s.variants ?? null },
      typical: { gradeId: s.typical, measurementId: typical?.measurementId ?? null, value: typical?.value ?? null },
      // One product: its value is the material's, and opens its measurement as a headline always did.
      ...(s.n === 1 ? { measurementId: typical?.measurementId ?? null, gradeId: s.typical } : {}),
      ...(key === 'priceCADkg' ? { observations: s.n } : {}),
    };
  }
  return headline ? { ...material, headline } : material;
}

/** Every material as the page shows it (displayMaterial), for the page and for anything that must see what it sees. */
export function displayMaterials(db) {
  const gradeById = new Map(db.grades.map((g) => [g.id, g]));
  return db.materials.map((m) => displayMaterial(m, gradeById));
}
