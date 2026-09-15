#!/usr/bin/env node
// Data lint: quality problems the schema cannot express (build/src/lint-rules.js). A finding is either
// fixed or accepted with a reason in data/review/accepted-findings.csv; anything else fails.
//
//   npm run data:lint                                  new findings and stale acceptances; exit 1 if any
//   npm run data:lint -- --all                         every finding, accepted or not
//   npm run data:lint -- --accept CODE "reason"        accept every current finding of CODE with a reason
//   npm run data:lint -- --rules                       the rule catalogue

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv, writeCsv } from '../../build/src/csv.js';
import { loadSchemas } from '../../build/src/schema.js';
import { lintData, findingKey, LINT_RULES } from '../../build/src/lint-rules.js';
import { projectRoot } from './table-io.mjs';
import { REVIEW_CODES, reviewFindings, compileIssues } from './review-findings.mjs';

export const BASELINE = join(projectRoot, 'data/review/accepted-findings.csv');
const HEADER = ['Code', 'Table', 'Record', 'Field', 'Reason', 'Accepted'];

export function currentFindings(root = projectRoot) {
  const { tables: schemas } = loadSchemas(join(root, 'schema'));
  const tables = Object.fromEntries(Object.keys(schemas).map((n) => {
    const { header, records } = readCsv(join(root, 'data/tables', `${n}.csv`));
    return [n, { header, rows: records.map((r) => r.values) }];
  }));
  return lintData(tables, schemas);
}

export function readBaseline(path = BASELINE) {
  if (!existsSync(path)) return [];
  return readCsv(path).records.map((r) => r.values);
}

export function compareWithBaseline(findings, baseline) {
  const accepted = new Map(baseline.map((b) => [findingKey({ code: b.Code, table: b.Table, record: b.Record, field: b.Field ?? '' }), b]));
  const current = new Set(findings.map(findingKey));
  return {
    fresh: findings.filter((f) => !accepted.has(findingKey(f))),
    stale: baseline.filter((b) => !current.has(findingKey({ code: b.Code, table: b.Table, record: b.Record, field: b.Field ?? '' }))),
    accepted: findings.filter((f) => accepted.has(findingKey(f))),
  };
}

if (process.argv[1]?.endsWith('lint.mjs')) {
  const args = process.argv.slice(2);
  if (args.includes('--rules')) {
    for (const [code, meaning] of Object.entries(LINT_RULES)) console.log(`${code.padEnd(28)} ${meaning}`);
    process.exit(0);
  }
  const all = readBaseline();
  const acceptAt = args.indexOf('--accept');
  // Build findings are checked by npm run audit:data, which compiles; the lint accepts them too.
  const review = acceptAt >= 0 && REVIEW_CODES.includes(args[acceptAt + 1]);
  const findings = review ? reviewFindings(compileIssues(projectRoot)) : currentFindings();
  const baseline = all.filter((b) => REVIEW_CODES.includes(b.Code) === review);
  if (acceptAt >= 0) {
    const [code, reason] = args.slice(acceptAt + 1);
    if (!(LINT_RULES[code] || REVIEW_CODES.includes(code)) || !reason) { console.error('usage: npm run data:lint -- --accept CODE "reason"'); process.exit(2); }
    const { fresh } = compareWithBaseline(findings, baseline);
    const today = new Date().toISOString().slice(0, 10);
    const added = fresh.filter((f) => f.code === code).map((f) => ({ Code: f.code, Table: f.table, Record: f.record, Field: f.field || null, Reason: reason, Accepted: today }));
    const rows = [...all, ...added].sort((a, b) => `${a.Code}${a.Table}${a.Record}${a.Field ?? ''}`.localeCompare(`${b.Code}${b.Table}${b.Record}${b.Field ?? ''}`));
    writeCsv(BASELINE, HEADER, rows);
    console.log(`accepted ${added.length} ${code} finding(s)`);
    process.exit(0);
  }
  const { fresh, stale, accepted } = compareWithBaseline(findings, baseline);
  const show = args.includes('--all') ? findings : fresh;
  for (const f of show.slice(0, 300)) console.log(`${f.code.padEnd(26)} ${f.table} ${f.record}${f.field ? ` [${f.field}]` : ''}  ${f.message}`);
  for (const b of stale) console.log(`STALE ACCEPTANCE           ${b.Code} ${b.Table} ${b.Record}${b.Field ? ` [${b.Field}]` : ''}: no longer occurs; remove it from data/review/accepted-findings.csv`);
  const byCode = {};
  for (const f of fresh) byCode[f.code] = (byCode[f.code] ?? 0) + 1;
  console.log(`${findings.length} finding(s): ${accepted.length} accepted, ${fresh.length} new ${JSON.stringify(byCode)}, ${stale.length} stale acceptance(s)`);
  if (fresh.length || stale.length) process.exitCode = 1;
}
