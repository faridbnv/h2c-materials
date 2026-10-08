// Every dated audit, its packets, the background research and the archive say, just below their title, whether they are
// a historical record, a current document, or generated on a given day (scripts/docs-history.mjs, the owner's request of
// 2026-10-05). A reader or an agent who opens one must not take a past round's numbers and rules for today's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { historyFiles, marked, CURRENT } from '../scripts/docs-history.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('every audit, background and archive document says whether it is history or current', () => {
  const files = historyFiles();
  assert.ok(files.length > 100, `only ${files.length} documents found`);
  const unmarked = files.filter((rel) => !CURRENT.has(rel) && !marked(readFileSync(join(root, rel), 'utf8')));
  assert.deepEqual(unmarked, [], 'run npm run docs:history, or mark a current document by hand');
});

test('a document a command writes into the audit folders opens with the Generated mark, so a run keeps it', async () => {
  const { generatedMark } = await import('../scripts/lib/generated-mark.mjs');
  const page = ['# A generated page', '', generatedMark('npm run audit:gaps', '2026-10-07'), '', 'Body.'].join('\n');
  assert.ok(marked(page));
  assert.match(generatedMark('npm run audit:gaps', '2026-10-07'), /^> \*\*Generated\*\* \(2026-10-07\) by `npm run audit:gaps`/);
});
