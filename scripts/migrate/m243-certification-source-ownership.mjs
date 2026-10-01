// GOALS steps 2/5: remove another product's footer from five certification fields.
// Own maker claims remain claims; certificates and lab reports are not admitted here.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { locate } from '../data/source-store.mjs';
const migration = 'm243-certification-source-ownership';
const path = join(projectRoot, 'docs/audits/2026-09-30-coverage-expansion');
const bytes = readFileSync(join(path, 'certification-corrections-packet.json'));
const hash = createHash('sha256').update(bytes).digest('hex');
const review = JSON.parse(readFileSync(join(path, 'certification-corrections-review.json')));
if (hash !== '73f1fb3ee7982345701b7c2076a6c953264b01103ca0497e4541d7c2bfbc2d7f' || review.input_sha256 !== hash || review.overall_verdict !== 'APPROVE') throw Error(`${migration}: unreviewed packet`);
const packet = JSON.parse(bytes), t = openTables(), pending = [];
const agrees = (row, expected) => row && Object.entries(expected).every(([k, v]) => row[k] === v);
for (const op of packet.Operations) {
  const s = op.Source.RegisteredSource, original = locate(s.SHA256, s.SourceID);
  if (!agrees(t.get('sources', s.SourceID), s) || original.bytes !== 'present' || createHash('sha256').update(readFileSync(original.path)).digest('hex') !== s.SHA256) throw Error(`${migration}: ${s.SourceID} moved`);
  const row = t.get('grades', op.Expected.GradeID);
  if (agrees(row, op.Proposed)) continue;
  if (!agrees(row, op.Expected)) throw Error(`${migration}: ${op.Expected.GradeID} moved`);
  if (Object.keys(op.Proposed).some((k) => k !== 'Certification claims' && op.Proposed[k] !== op.Expected[k])) throw Error(`${migration}: correction changes another grade field`);
  pending.push(op);
}
for (const op of pending) t.set('grades', op.Expected.GradeID, 'Certification claims', op.Proposed['Certification claims'], { expect: op.Expected['Certification claims'] });
t.save();
console.log(JSON.stringify({ migration, packet: hash, written: pending.length, records: pending.map((o) => o.Expected.GradeID) }, null, 2));
