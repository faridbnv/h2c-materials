// Coverage. Method sheet, Verification / Coverage: "Coverage is terminal: it reports gaps and
// conflicts but does not drive material or price calculations."
//
// So nothing here may feed the selection engine. It answers a different question: what can this
// database decide, and what can it not.

import { COVERAGE_DOMAINS, COVERAGE_STATUS_RANK, coverageMatrix } from './coverage-matrix.ts';
import type { CoverageRecord } from './coverage-matrix.ts';

// The coverage matrix (the Data coverage lens) is in coverage-matrix.ts: the first screen reads the rest of this file, and not the matrix.
export { COVERAGE_DOMAINS, COVERAGE_STATUS_RANK, coverageMatrix };
export type { CoverageRecord };

export interface HeadlineBearer {
  /** A material, or a product's view of it: a headline per key, known or not. */
  readonly headline?: {
    readonly [key: string]: {
      readonly known?: boolean;
      readonly notApplicable?: { readonly rule?: unknown } | null | undefined;
      /** Read below, and in no headline shape the build writes (OPEN-PROBLEMS: a dead read). */
      readonly loadStated?: boolean;
    } | undefined;
  };
}

/**
 * Per-material headline completeness. This is the brief's answer to a fabricated confidence score:
 * show what is present over what was asked for, and let the reader judge.
 */
export function headlineCompleteness(material: HeadlineBearer, keys: readonly string[]) {
  const available = keys.filter((k) => material.headline?.[k]?.known);
  return { available: available.length, requested: keys.length, missing: keys.filter((k) => !material.headline?.[k]?.known) };
}

export interface OwnedRow {
  readonly materialId: string;
}
export interface EvidenceSources {
  readonly measurements: readonly (OwnedRow & { readonly numeric?: unknown; readonly quarantined?: unknown; readonly gradeId?: string })[];
  readonly evidence: readonly OwnedRow[];
  readonly coverage: readonly (OwnedRow & { readonly status?: string })[];
  readonly grades: readonly (OwnedRow & { readonly retired?: unknown })[];
}

/** Evidence summary for one material: counts, not a score. */
export function evidenceSummary(material: { readonly id: string }, { measurements, evidence, coverage, grades }: EvidenceSources) {
  const mine = <R extends OwnedRow>(rows: readonly R[]): R[] => rows.filter((r) => r.materialId === material.id);
  const ms = mine(measurements);
  const cov = mine(coverage);
  return {
    measurements: ms.length,
    numericMeasurements: ms.filter((m) => m.numeric).length,
    quarantined: ms.filter((m) => m.quarantined).length,
    grades: mine(grades).filter((g) => !g.retired).length,
    exactGradeEvidence: ms.some((m) => m.gradeId && m.gradeId !== 'Not applicable'),
    evidenceRecords: mine(evidence).length,
    gaps: cov.filter((c) => c.status === 'Gap').length,
    conflicts: cov.filter((c) => c.status === 'Conflict').length,
    limitedComparability: cov.filter((c) => c.status === 'Limited comparability').length,
  };
}

/**
 * Data-availability count for one headline key, for the filter rail's inline label. A headline limited
 * to some materials by the registry counts only those: "3 of 8 have data", not "3 of 102".
 */
export function availability(materials: readonly HeadlineBearer[], key: string) {
  const scoped = materials.filter((m) => !m.headline?.[key]?.notApplicable?.rule);
  const withData = scoped.filter((m) => m.headline?.[key]?.known).length;
  // A value measured at an unstated load, for a headline defined at a load (HDT at 0.45 MPa).
  const caveats = scoped.filter((m) => m.headline?.[key]?.known && m.headline![key]!.loadStated === false).length;
  return { withData, total: scoped.length, caveats, notApplicable: materials.length - scoped.length };
}
