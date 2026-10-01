import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { openTables, nextId, projectRoot } from '../data/table-io.mjs';
import { locate } from '../data/source-store.mjs';

export function applyApplicationPacket(name, digest, migration) {
  const audit = join(projectRoot, 'docs/audits/2026-09-30-coverage-expansion');
  const bytes = readFileSync(join(audit, `${name}-packet.json`));
  const hash = createHash('sha256').update(bytes).digest('hex');
  const review = JSON.parse(readFileSync(join(audit, `${name}-review.json`)));
  if (hash !== digest || review.input_sha256 !== hash || review.overall_verdict !== 'APPROVE') throw new Error(`${migration}: reviewed packet changed`);
  const packet = JSON.parse(bytes), t = openTables(), pending = [];
  const agrees = (row, expected) => row && Object.entries(expected).every(([k, v]) => row[k] === v);
  const check = (row, expected, name) => { if (!agrees(row, expected)) throw new Error(`${migration}: ${name} moved`); };
  for (const op of packet.Operations) {
    const f = packet.Findings.find((r) => r.FindingID === op.FindingID);
    if (!f) throw new Error(`${migration}: missing reviewed finding`);
    if (f.ExpectedGrade) check(t.get('grades', f.ExpectedGrade.GradeID), f.ExpectedGrade, f.ExpectedGrade.GradeID);
    for (const e of f.ExistingEvidence ?? []) check(t.get('evidence', e.EvidenceID), e, e.EvidenceID);
    for (const { RegisteredSource: s } of f.Sources ?? []) {
      check(t.get('sources', s.SourceID), s, s.SourceID);
      const original = locate(s.SHA256, s.SourceID);
      if (original.bytes !== 'present' || createHash('sha256').update(readFileSync(original.path)).digest('hex') !== s.SHA256) throw new Error(`${migration}: ${s.SourceID}'s reviewed original is unavailable or changed`);
    }
    const existing = t.rows('coverage').find((r) => r.MaterialID === op.append.MaterialID && r.GradeID === op.append.GradeID && r.Domain === op.append.Domain && r.Finding === op.append.Finding);
    if (existing) {
      check(existing, op.append, existing.CoverageID);
      for (const old of op.supersede) check(t.get('coverage', old.CoverageID), { ...old, Status: 'Superseded', Finding: `Superseded by ${existing.CoverageID}: ${old.Finding}` }, old.CoverageID);
    } else {
      for (const old of op.supersede) check(t.get('coverage', old.CoverageID), old, old.CoverageID);
      pending.push(op);
    }
  }
  const records = [];
  for (const op of pending) {
    const id = nextId('coverage', t.rows('coverage').map((r) => r.CoverageID));
    t.append('coverage', { CoverageID: id, ...op.append });
    for (const old of op.supersede) {
      t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
      t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${id}: ${old.Finding}`, { expect: old.Finding });
    }
    records.push({ finding: op.FindingID, coverageId: id });
  }
  t.save();
  console.log(JSON.stringify({ migration, packet: hash, written: records.length, records }, null, 2));
  return records;
}
