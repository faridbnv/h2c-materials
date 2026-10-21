// RowResult: the parity harness's record of an answer (02 sections 9.5 and 9.8), made from the typed evaluations.
//
// One row for each material, then one for each of its products, in the evaluation's own order. The counts of a row are of
// its parts: a material's products by verdict (the evaluation's own `counts`; none on record counts nothing), a product's
// requirements by status (open means UNKNOWN or INDETERMINATE). A product row carries its material's listing place.
import type { Evaluation, GradeId, ProductView, RequirementResult, RowResult } from '@atlas/domain';
import { isOpen, reasonEntriesOf } from './reasons.ts';

const requirementCounts = (results: readonly RequirementResult[]) => ({
  pass: results.filter((r) => r.status === 'PASS').length,
  fail: results.filter((r) => r.status === 'FAIL').length,
  untested: results.filter((r) => isOpen(r.status)).length,
});

function productRow(evaluation: Evaluation, product: ProductView, listingRank: number): RowResult {
  return {
    materialId: evaluation.materialId, productId: product.gradeId, stateId: product.state.id,
    verdict: product.verdict, counts: requirementCounts(product.results), group: product.group, likely: product.likely,
    listingRank, reasons: product.results.map(reasonEntriesOf), requirements: product.results,
  };
}

function materialRow(evaluation: Evaluation, listingRank: number, best: GradeId | undefined): RowResult {
  const { pass, fail, untested } = evaluation.counts ?? { pass: 0, fail: 0, untested: 0 };
  return {
    materialId: evaluation.materialId, verdict: evaluation.verdict, counts: { pass, fail, untested }, group: evaluation.group, likely: evaluation.likely,
    ...(best === undefined ? {} : { best }), listingRank, reasons: evaluation.results.map(reasonEntriesOf), requirements: evaluation.results,
  };
}

/** All rows for the evaluations, given each material's listing place (from 1). */
export function rowsOf(evaluations: readonly Evaluation[], listingRank: ReadonlyMap<string, number>): readonly RowResult[] {
  return evaluations.flatMap((evaluation) => {
    const rank = listingRank.get(evaluation.materialId);
    if (rank === undefined) throw new Error(`no listing place for ${evaluation.materialId}`);
    return [materialRow(evaluation, rank, evaluation.gradeId), ...(evaluation.products ?? []).map((p) => productRow(evaluation, p, rank))];
  });
}
