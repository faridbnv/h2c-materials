// What a source page states once for the values printed on it (D116, page_context.csv).
//
// A data sheet often says a thing once: "Mechanical properties (dry state)" over its table, "printed, non-injection
// moulded specimens" in a heading, "all specimens were annealed at 80 °C for 12 h" in a footnote, ISO 527 above the
// tensile rows. The import read each row on its own and lost those statements, so an annealed value was "treatment not
// stated", admitted as printed, and a printed bar was filed as raw material (the data audit of 2026-10-01, RC3). A
// measurement now inherits what its page states wherever its own row states nothing; a row that states the opposite
// keeps its own words and is flagged (CONTEXT-ROW-CONTRADICTS-PAGE, lint-rules.js).

import { specimenForm, postProcessingState } from './normalize/specimen.js';
import { moistureState } from './normalize/moisture.js';

const NP = 'Not published';
const NA = 'Not applicable';
const known = (v) => v != null && v !== '' && v !== NP && v !== NA;
const numberOr = (v) => (known(v) && Number.isFinite(Number(v)) ? Number(v) : null);

/** The page a locator names ("p. 2: Tensile modulus"), or null. */
export const pageOf = (locator) => { const m = String(locator ?? '').match(/\bp(?:age|p)?\.?\s*(\d+)/i); return m ? Number(m[1]) : null; };

/** Which scope a property belongs to. */
export function scopeOf(property) {
  const p = String(property ?? '');
  if (/Charpy|Izod|Impact/i.test(p)) return 'impact';
  if (/Flexural/i.test(p)) return 'flexural';
  if (/Tensile|Elongation|Young|Yield|Break strength|strain/i.test(p)) return 'tensile';
  if (/HDT|Vicat|transition|Melting|Crystalli|service temperature|Decomposition|softening/i.test(p)) return 'thermal';
  return 'physical';
}

/** Whether a page's specimen statement speaks for a property: a melt flow rate is measured on the melt, not a specimen. */
export const specimenApplies = (property) => !/^Melt (mass|volume)-flow rate/i.test(String(property ?? ''));

/** An index of page_context rows by source and page. */
export function indexPageContext(rows) {
  const byPage = new Map();
  for (const r of rows ?? []) {
    const k = `${r.SourceID}\u0000${Number(r.Page)}`;
    if (!byPage.has(k)) byPage.set(k, []);
    byPage.get(k).push(r);
  }
  return byPage;
}

/** The page_context rows that speak for one measurement row. */
export function contextFor(byPage, r) {
  const page = pageOf(r.Locator);
  if (page == null) return [];
  const scope = scopeOf(r.Property);
  return (byPage.get(`${r.SourceID}\u0000${page}`) ?? []).filter((c) => c['Applies to'] === 'all' || c['Applies to'] === scope);
}

/** What a row states for each inheritable field: null where it states nothing. */
export function rowStates(r) {
  return {
    specimen: /^Not published/.test(r['Specimen type'] ?? NP) ? null : r['Specimen type'],
    moisture: r['Moisture state'] === 'not-stated' ? null : r['Moisture state'],
    treatment: r['Post-processing state'] === 'not-stated' ? null : r['Post-processing state'],
    standard: known(r.Standards) ? r.Standards : null,
    testTemperature: numberOr(r['Test temperature °C']),
  };
}

/** What the page states for each field: null where it states nothing. */
export function pageStates(c) {
  return {
    specimen: known(c['Specimen type']) ? c['Specimen type'] : null,
    moisture: c['Moisture state'] === 'not-stated' ? null : c['Moisture state'],
    treatment: c['Post-processing state'] === 'not-stated' ? null : c['Post-processing state'],
    standard: known(c.Standard) ? c.Standard : null,
    testTemperature: numberOr(c['Test temperature °C']),
    anneal: c['Post-processing state'] === 'annealed' ? { tempC: numberOr(c['Anneal °C']), hours: numberOr(c['Anneal h']) } : null,
  };
}

/**
 * Apply a page's statements to a compiled measurement where its own row states nothing. Returns the fields inherited,
 * with the page_context IDs that gave them; the measurement keeps its own words in its raw fields.
 */
export function inheritPageContext(m, r, contexts) {
  if (!contexts.length) return null;
  const own = rowStates(r);
  const inherited = {};
  for (const c of contexts) {
    const page = pageStates(c);
    if (!own.specimen && page.specimen && !inherited.specimenType && specimenApplies(r.Property)) {
      m.specimenType = page.specimen; m.specimenForm = specimenForm(page.specimen); inherited.specimenType = c.PageContextID;
    }
    if (!own.moisture && page.moisture && !inherited.moistureState) {
      m.moistureState = moistureState(page.moisture); inherited.moistureState = c.PageContextID;
    }
    if (!own.treatment && page.treatment && !inherited.postProcessingState) {
      m.postProcessingState = postProcessingState(page.treatment); inherited.postProcessingState = c.PageContextID;
      if (page.anneal) m.anneal = page.anneal;
    }
    if (!own.standard && page.standard && !inherited.standards) {
      m.standards = page.standard.split(';').map((x) => x.trim()).filter(Boolean); inherited.standards = c.PageContextID;
    }
    if (own.testTemperature == null && page.testTemperature != null && !inherited.testTemperatureC) {
      m.testTemperatureC = page.testTemperature; inherited.testTemperatureC = c.PageContextID;
    }
  }
  if (!Object.keys(inherited).length) return null;
  m.pageContext = inherited;
  return inherited;
}
