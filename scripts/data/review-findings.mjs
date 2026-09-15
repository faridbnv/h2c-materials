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

/** One finding per record the build names: { code, table, record, field, message }. */
export function reviewFindings(issues) {
  return issues.filter((i) => REVIEW_CODES.includes(i.code))
    .flatMap((i) => (i.records ?? []).map((record) => ({ code: i.code, table: 'materials', record, field: '', message: i.message.slice(0, 160) })));
}

/** Compile the tables as the build does and return its issues. */
export function compileIssues(root = resolve('.')) {
  const { wb } = readSource(root);
  return buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'review' }).issues;
}
