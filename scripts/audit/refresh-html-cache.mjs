// Re-read already cached HTML from digest-verified originals after a reader upgrade; no fetch or table writes.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cacheDir, documentText, cachedText } from '../lib/pdf-text.mjs';
import { inventory, locate } from '../data/source-store.mjs';
const wanted = new Map(inventory().filter(s => /^[a-f0-9]{64}$/.test(s.SHA256 ?? '')).map(s => [s.SHA256, s.SourceID]));
const result = { refreshed: [], unavailable: [], alreadyCurrent: 0, outsideInventory: 0 };
for (const name of readdirSync(cacheDir('text')).filter(n => /^[a-f0-9]{64}\.json$/.test(n))) {
  const doc = JSON.parse(readFileSync(join(cacheDir('text'), name)));
  if (!doc.html) continue;
  const sha = name.slice(0, -5);
  if (cachedText(sha)) { result.alreadyCurrent++; continue; }
  if (!wanted.has(sha)) { result.outsideInventory++; continue; }
  const original = locate(sha, wanted.get(sha));
  if (original.bytes !== 'present') { result.unavailable.push({ sha, SourceID: wanted.get(sha), state: original.bytes }); continue; }
  const next = await documentText(readFileSync(original.path), { sha, refresh: true });
  result.refreshed.push({ sha, SourceID: wanted.get(sha), extractor: next.extractor });
}
const at = process.argv.indexOf('--receipt');
if (at >= 0) writeFileSync(process.argv[at + 1], JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ refreshed: result.refreshed.length, unavailable: result.unavailable.length, alreadyCurrent: result.alreadyCurrent, outsideInventory: result.outsideInventory }));
