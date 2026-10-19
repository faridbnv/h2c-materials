// The documents the blind second readers open (the research intake, stage 4): a DOCS.csv in the reader round's columns,
// for ingest:read-packet, built from the second-read chunks and sources.csv.
//   node docs/audits/2026-10-19-research-intake/ingest/second-docs.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv, csvText } from '../../../../build/src/csv.js';
import { cachedText } from '../../../../scripts/lib/pdf-text.mjs';
const HERE = 'docs/audits/2026-10-19-research-intake';
const rows = (p) => readCsv(p).records.map((r) => r.values);
const tasks = ['chunk-01.csv', 'chunk-02.csv', 'third-01.csv'].filter((f) => existsSync(join(HERE, 'second', f))).flatMap((f) => rows(join(HERE, 'second', f)));
const sources = new Map(rows('data/tables/sources.csv').map((s) => [s.SourceID, s]));
const ids = [...new Set(tasks.map((t) => t.source_id))];
const out = ids.map((id) => {
  const s = sources.get(id);
  const kind = existsSync(`.cache/sources/by-sha/${s.SHA256}.pdf`) || existsSync(`.cache/sources/${id}.pdf`) ? 'pdf' : 'html';
  const text = cachedText(s.SHA256);
  return { SourceID: id, SHA256: s.SHA256, Kind: kind, Cache: 'current', Pages: text?.pages?.length ?? 1, OCR: '', Tier: 1, Materials: '', Grades: s['Applicable grades'], Cited: 'intake', Publisher: s.Publisher, Title: s.Title, URL: s.URL };
});
writeFileSync(join(HERE, 'ingest/DOCS-second.csv'), csvText(['SourceID', 'SHA256', 'Kind', 'Cache', 'Pages', 'OCR', 'Tier', 'Materials', 'Grades', 'Cited', 'Publisher', 'Title', 'URL'], out));
console.log(`${out.length} documents`);
