// The blind second readers name the product as the task did, not its GradeID; the reconciler matches a second reading to
// the first by GradeID where the first has one. This writes each second reading with the GradeID of the first reading of
// the same document, page, field and product (second/out/keyed.csv); nothing else changes.
//   node docs/audits/2026-10-19-research-intake/ingest/key-seconds.mjs
import { writeFileSync } from 'node:fs';
import { readCsv, csvText } from '../../../../build/src/csv.js';
const R = 'docs/audits/2026-10-19-research-intake';
const rows = (p) => readCsv(p).records.map((r) => r.values);
const first = rows(`${R}/ingest/readings/r1-resolved.csv`);
const squash = (s) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const { header } = readCsv(`${R}/second/out/chunk-01.csv`);
const seconds = ['chunk-01.csv', 'chunk-02.csv', 'third-01.csv', 'third-02.csv'].flatMap((f) => rows(`${R}/second/out/${f}`));
let keyed = 0;
const out = seconds.map((s) => {
  if (s.grade_id) return s;
  const f = first.find((x) => x.source_id === s.source_id && x.page === s.page && x.field === s.field && squash(x.product) === squash(s.product) && x.grade_id);
  if (f) { keyed++; return { ...s, grade_id: f.grade_id }; }
  // A task named its product in the executor's words (third-02): the one first reading of that page and field is the one it reads.
  const only = first.filter((x) => x.source_id === s.source_id && x.page === s.page && x.field === s.field && x.grade_id);
  if (only.length === 1) { keyed++; return { ...s, grade_id: only[0].grade_id }; }
  return s;
});
writeFileSync(`${R}/second/out/keyed.csv`, csvText(header, out));
console.log(`${out.length} second readings, ${keyed} keyed to their product's GradeID`);
