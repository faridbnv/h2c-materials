// The estimate stage, called unchanged (WP-20). The 18 files of build/src/estimate/ are the old code; they stay where they are and
// run as they are until WP-21 moves them into this package as a cached stage. This adapter is the one seam: the new
// stages hand the compiled database over, the old stage adds its overlay in place, and the new stages go on.
//
// What the old stage reads from outside its own folder (products.js `assess`, lower-bounds.js, normalize/, rules.js) it loads
// from the old tree too, as its own module instances; it holds no state the new modules share, and P-build (db.json path by path,
// with the estimate stage in it) is the proof that the two halves agree.
import { attachEstimates as attachOldEstimates } from '../../../build/src/estimate/index.js';
import { estimateReportLines as oldEstimateReportLines, validateEstimates as validateOldEstimates } from '../../../build/src/estimate/validate.js';
import type { Dyn, Issue } from './types.ts';

/** The estimate overlay, added to the compiled database in place. `conversions` are the ledger's estimate rows (estimateConversions). */
export function attachEstimates(db: Dyn, options: { conversions: Dyn }): void {
  attachOldEstimates(db, options);
}

/** The estimate stage's own checks of the database it extended. */
export function validateEstimates(db: Dyn): Issue[] {
  return validateOldEstimates(db);
}

/** The estimate section of the validation report. */
export function estimateReportLines(db: Dyn): string[] {
  return oldEstimateReportLines(db);
}
