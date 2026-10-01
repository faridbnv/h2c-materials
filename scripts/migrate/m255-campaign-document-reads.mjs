import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { locate } from '../data/source-store.mjs';
const migration = 'm255-campaign-document-reads';
const at = join(projectRoot, 'docs/audits/2026-09-30-coverage-expansion');
const bytes = readFileSync(join(at, 'document-reads-packet.json'));
const hash = createHash('sha256').update(bytes).digest('hex');
const review = JSON.parse(readFileSync(join(at, 'document-reads-review.json')));
if (hash !== '6fb8dd9abdbda09457e4819f484fa038c342dac7ea4edfb9ca95b5afc6d35a39' || review.input_sha256 !== hash || review.overall_verdict !== 'APPROVE') throw Error(`${migration}: reviewed packet changed`);
const p = JSON.parse(bytes), t = openTables(), pending = [];
const check = (row, expected, name) => { if (!row || Object.entries(expected).some(([k,v]) => row[k] !== v)) throw Error(`${migration}: ${name} moved`); };
for (const f of p.Readings) {
  const s = f.ExpectedSource;
  check(t.get('sources', s.SourceID), s, s.SourceID);
  const original = locate(s.SHA256, s.SourceID);
  if (original.bytes !== 'present' || createHash('sha256').update(readFileSync(original.path)).digest('hex') !== s.SHA256) throw Error(`${migration}: original missing or changed`);
  const old = t.rows('know_how_reads').find(r => r.SourceID === f.Proposed.SourceID && r.Scope === f.Proposed.Scope);
  if (old) check(old, f.Proposed, s.SourceID); else pending.push(f.Proposed);
}
for (const row of pending) t.append('know_how_reads', row);
t.save();
console.log(JSON.stringify({migration, packet:hash, written:pending.length}, null, 2));
