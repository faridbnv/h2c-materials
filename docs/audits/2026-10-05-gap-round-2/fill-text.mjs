// Gap round 2, phase 0: every registered source whose hash-checked original is here gets its cached text, so it can be
// read again. The text is the extractor's own reading of the verified bytes (documentText), written where the cache
// keeps it; nothing in data/ changes.
//
//   node docs/audits/2026-10-05-gap-round-2/fill-text.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv } from '../../../build/src/csv.js';
import { projectRoot } from '../../../scripts/data/table-io.mjs';
import { locate } from '../../../scripts/data/source-store.mjs';
import { documentText, cachedText } from '../../../scripts/lib/pdf-text.mjs';

const sources = readCsv(join(projectRoot, 'data/tables/sources.csv')).records.map((r) => r.values);
let filled = 0, failed = 0;
for (const s of sources) {
  const sha = s.SHA256;
  if (!/^[0-9a-f]{64}$/.test(sha ?? '') || cachedText(sha)) continue;
  const at = locate(sha, s.SourceID);
  if (at.bytes !== 'present') continue;
  try { await documentText(readFileSync(at.path), { sha, refresh: true }); filled++; }
  catch (e) { failed++; console.log(`${s.SourceID}: ${e.message}`); }
}
console.log(`text written for ${filled} source(s); ${failed} could not be read`);
