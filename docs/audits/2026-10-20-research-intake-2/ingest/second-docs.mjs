// The documents the blind second readers open (research intake 2, stage 3): a DOCS.csv in the reader round's columns,
// for ingest:read-packet, from the reconciler's second-read tasks and sources.csv; then the tasks in chunks, each row
// naming the page image and text a reader opens, and the conditions that tell one column of a table from another
// (direction, moisture, treatment, test conditions), never its value.
//   node docs/audits/2026-10-20-research-intake-2/ingest/second-docs.mjs [--chunks]
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv, csvText } from '../../../../build/src/csv.js';
import { cachedText } from '../../../../scripts/lib/pdf-text.mjs';
const R = 'docs/audits/2026-10-20-research-intake-2';
const ROUND = 'r2i';
const rows = (p) => readCsv(p).records.map((r) => r.values);
const tasks = rows(join(R, 'reconcile/r2/second-read/tasks.csv'));
const sources = new Map(rows('data/tables/sources.csv').map((s) => [s.SourceID, s]));
const ids = [...new Set(tasks.map((t) => t.source_id))];
const docs = ids.map((id) => {
  const s = sources.get(id);
  const kind = existsSync(`.cache/sources/by-sha/${s.SHA256}.pdf`) || existsSync(`.cache/sources/${id}.pdf`) ? 'pdf' : 'html';
  const text = cachedText(s.SHA256);
  return { SourceID: id, SHA256: s.SHA256, Kind: kind, Cache: 'current', Pages: text?.pages?.length ?? 1, OCR: '', Tier: 1, Materials: '', Grades: s['Applicable grades'], Cited: 'intake', Publisher: s.Publisher, Title: s.Title, URL: s.URL };
});
writeFileSync(join(R, 'ingest/DOCS-second.csv'), csvText(['SourceID', 'SHA256', 'Kind', 'Cache', 'Pages', 'OCR', 'Tier', 'Materials', 'Grades', 'Cited', 'Publisher', 'Title', 'URL'], docs));
console.log(`${docs.length} documents`);
if (process.argv.includes('--chunks')) {
  const first = ['new-values', 'new-settings', 'mismatches', 'unmapped'].flatMap((f) => rows(join(R, `reconcile/r2/${f}.csv`)));
  const kinds = new Map(docs.map((d) => [d.SourceID, d.Kind]));
  const out = tasks.map((t) => {
    const like = first.filter((r) => r.SourceID === t.source_id && r.Page === t.page && r.Field === t.field && (r.Grade || r.Product) === t.product && r.Label === t.label);
    const dir = `.cache/readings/${ROUND}/${t.source_id}`;
    return {
      ...t,
      direction: [...new Set(like.map((r) => r.Direction).filter(Boolean))].join(' / '),
      moisture: [...new Set(like.map((r) => r.Moisture).filter(Boolean))].join(' / '),
      post_processing: [...new Set(like.map((r) => r.PostProcessing).filter(Boolean))].join(' / '),
      test_conditions: [...new Set(like.map((r) => r.TestConditions).filter(Boolean))].join(' / '),
      images: kinds.get(t.source_id) === 'pdf' ? `${dir}/p-${t.page}.png` : '',
      text: `${dir}/text.txt`,
    };
  });
  mkdirSync(join(R, 'second'), { recursive: true });
  const header = ['task_id', 'source_id', 'page', 'kind', 'field', 'product', 'label', 'locator', 'direction', 'moisture', 'post_processing', 'test_conditions', 'images', 'text'];
  const forward = out.filter((t) => /FORWARDAM/.test(t.source_id));
  const rest = out.filter((t) => !/FORWARDAM/.test(t.source_id));
  const half = Math.ceil(rest.length / 2);
  writeFileSync(join(R, 'second/chunk-01.csv'), csvText(header, forward));
  writeFileSync(join(R, 'second/chunk-02.csv'), csvText(header, rest.slice(0, half)));
  writeFileSync(join(R, 'second/chunk-03.csv'), csvText(header, rest.slice(half)));
  console.log(`chunks: ${forward.length}, ${half}, ${rest.length - half}`);
}
