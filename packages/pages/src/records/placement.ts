// Which records the material pages leave off on purpose (the pages reimagined, 2026-10-17). Every other record of a
// material appears exactly once across its two pages: a product's in its card on the Products page (products/card.js),
// the rest on the Overview (statements about the material in general and the resin's reference data under Uses, the
// documents and known gaps under Sources). The page checks import this function to know the two kinds that are on
// neither page, by type and by topic:
//
//   - the project's own reading of a source, not a document's words: an evidence record whose Evidence type (or
//     topic) is "Selection interpretation" (a printability rubric, a shared selection principle: PLA's Q00318, Q00353);
//   - an environment record whose words are a reviewer's note rather than a document's (they name the project's records
//     or speak its own words, sections/common.js readerText: "Grade-specific fatigue observations are recorded in
//     Properties"), which is the maintainers';
//   - the maintainers' coverage notes: a coverage row (recorded, or derived by the build) that is not a known gap a
//     reader is shown (sections/common.js shownGap).

import type { Loose } from '../loose.ts';

import { shownGap, readerText } from '../sections/common.ts';

/** The topic, or Evidence type, of the project's own reading of a source. */
export const SELECTION_INTERPRETATION = 'Selection interpretation';

/**
 * Whether a record is left off both of its material's pages on purpose. `type` is the record's kind: 'measurement',
 * 'profile', 'statement' (a maker's statement, db.knowHow), 'environment' (db.evidence), 'resin', 'listing',
 * 'document' or 'coverage'.
 */
export function offThePages(type: Loose, record: Loose) {
  if (!record) return false;
  if (type === 'statement' || type === 'environment') {
    if (record.topic === SELECTION_INTERPRETATION || record.evidenceType === SELECTION_INTERPRETATION) return true;
    return type === 'environment' && !readerText(record.finding);
  }
  if (type === 'coverage') return !shownGap(record);
  return false;
}
