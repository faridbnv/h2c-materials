// Build findings that name a record and need a reviewer's decision, as a lint finding does (audit 2026-09-15, C-10).
// The build reports them as warnings; each record is fixed, or accepted with a reason in
// data/review/accepted-findings.csv, and npm run audit:data (in verify) fails on one that is neither, or on a stale
// acceptance. A fifth outlier or a seventh unstated load used to reach dist with no review.
import { resolve } from 'node:path';
import { snapshotDate } from '../../build/src/load.js';
import { readSource } from '../../build/src/source.js';
import { buildDatabase } from '../../build/src/pipeline.js';
import { REVIEWED_CODES } from '../../build/src/rules.js';

/** The codes the catalogue marks reviewed (build/src/rules.js), so a new one needs no list here. */
export const REVIEW_CODES = REVIEWED_CODES;

/**
 * One finding per record the build names: { code, table, record, field, message }. A finding that carries the measured
 * value it is about (EST-OUTLIER) names it in field ("measured 97"), so its acceptance holds for that value alone: when
 * the value changes, the acceptance stops matching and the finding is reviewed again (D131).
 */
export function reviewFindings(issues) {
  return issues.filter((i) => REVIEW_CODES.includes(i.code))
    .flatMap((i) => (i.records ?? []).map((record, k) => ({ code: i.code, table: 'materials', record, field: i.values?.[k] != null ? `measured ${i.values[k]}` : '', message: i.message.slice(0, 160) })));
}

/** The measured value an acceptance was written for ("measured 97" -> 97), or null. */
export const acceptedValue = (field) => { const m = String(field ?? '').match(/^measured (-?[\d.e+-]+)$/); return m ? Number(m[1]) : null; };

/**
 * Acceptances that no longer occur, split: dormant where the record's value (valueOf(record)) is still the one the
 * acceptance was written for, so a refit moved the threshold and not the data; stale otherwise (D131).
 */
export function splitStale(stale, valueOf) {
  const dormant = stale.filter((b) => { const v = acceptedValue(b.Field); return v != null && valueOf(b.Record) === v; });
  return { dormant, stale: stale.filter((b) => !dormant.includes(b)) };
}

/** Compile the tables as the build does and return its issues. */
export function compileIssues(root = resolve('.')) {
  const { wb } = readSource(root);
  return buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'review' }).issues;
}
