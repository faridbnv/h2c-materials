import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { openTables, nextId, projectRoot } from '../data/table-io.mjs';
import { locate } from '../data/source-store.mjs';
const migration = 'm256-insublend-published-properties';
const at = join(projectRoot, 'docs/audits/2026-09-30-coverage-expansion');
const bytes = readFileSync(join(at, 'insublend-properties-packet.json'));
const hash = createHash('sha256').update(bytes).digest('hex');
const review = JSON.parse(readFileSync(join(at, 'insublend-properties-review.json')));
if (hash !== 'cf877c524f69366146f0b31143222d4df09f3f613cbe22504e59d7c75644b374' || review.input_sha256 !== hash || review.overall_verdict !== 'APPROVE') throw Error(`${migration}: unreviewed or changed packet`);
const p = JSON.parse(bytes), t = openTables(), pending = [];
const check = (row, expected, name) => { if (!row || Object.entries(expected).some(([k,v]) => row[k] !== v)) throw Error(`${migration}: ${name} moved`); };
check(t.get('grades', p.ExpectedGrade.GradeID), p.ExpectedGrade, p.ExpectedGrade.GradeID);
const s = p.ExpectedSource;
check(t.get('sources', s.SourceID), s, s.SourceID);
const original = locate(s.SHA256, s.SourceID);
if (original.bytes !== 'present' || createHash('sha256').update(readFileSync(original.path)).digest('hex') !== s.SHA256) throw Error(`${migration}: original missing or changed`);
for (const old of p.ExpectedExistingMeasurements) check(t.get('measurements', old.MeasurementID), old, old.MeasurementID);
for (const op of p.Operations) {
  const matches = t.rows('measurements').filter(r => r.SourceID === s.SourceID && r.GradeID === p.ExpectedGrade.GradeID && r.Locator === op.Append.Locator);
  if (matches.length > 1) throw Error(`${migration}: duplicate source locator`);
  if (matches.length) check(matches[0], op.Append, matches[0].MeasurementID); else pending.push(op);
}
const records = [];
for (const op of pending) {
  const id = nextId('measurements', t.rows('measurements').map(r => r.MeasurementID));
  t.append('measurements', {MeasurementID:id,...op.Append});
  records.push({finding:op.FindingID,measurementId:id});
}
t.save();
console.log(JSON.stringify({migration,packet:hash,written:records.length,records},null,2));
