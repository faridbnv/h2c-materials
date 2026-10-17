// Which records the material pages leave off on purpose (the pages reimagined, 2026-10-17). Every other record of a
// material appears exactly once across its two pages: a product's in its card on the Products page (products/card.js),
// the rest on the Overview (statements about the material in general and the resin's reference data under Uses, the
// documents and known gaps under Sources). The page checks import this function to know the two kinds that are on
// neither page, by type and by topic:
//
//   - the project's own reading of a source, not a document's words: an evidence record whose Evidence type (or
//     topic) is "Selection interpretation" (a printability rubric, a shared selection principle: PLA's Q00318, Q00353);
//   - the maintainers' coverage notes: a coverage row (recorded, or derived by the build) that is not a known gap a
//     reader is shown (sections/common.js shownGap).

import { shownGap } from '../sections/common.js';

/** The topic, or Evidence type, of the project's own reading of a source. */
export const SELECTION_INTERPRETATION = 'Selection interpretation';

/**
 * Whether a record is left off both of its material's pages on purpose. `type` is the record's kind: 'measurement',
 * 'profile', 'statement' (a maker's statement, db.knowHow), 'environment' (db.evidence), 'resin', 'listing',
 * 'document' or 'coverage'.
 */
export function offThePages(type, record) {
  if (!record) return false;
  if (type === 'statement' || type === 'environment') return record.topic === SELECTION_INTERPRETATION || record.evidenceType === SELECTION_INTERPRETATION;
  if (type === 'coverage') return !shownGap(record);
  return false;
}
