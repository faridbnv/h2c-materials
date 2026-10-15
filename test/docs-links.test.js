// The link checker (scripts/docs-links.mjs): a heading's anchor is GitHub's slug, a link inside code is not a link, and
// every relative link in the tracked Markdown resolves. Rounds moved and removed files, and a dead link failed nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anchorsOf, brokenLinks, proseOf, slug } from '../scripts/docs-links.mjs';

test('a heading anchors at GitHub\'s slug: lower case, punctuation dropped, spaces to hyphens, a repeat numbered', () => {
  assert.equal(slug('Decided on 2026-09-28, for source backup and targeted gap closure'), 'decided-on-2026-09-28-for-source-backup-and-targeted-gap-closure');
  assert.equal(slug('D45. The source of truth is CSV tables under a declared schema'), 'd45-the-source-of-truth-is-csv-tables-under-a-declared-schema');
  assert.equal(slug('§29. What the [open-problems pass](x.md) leaves open'), '29-what-the-open-problems-pass-leaves-open');
  const anchors = anchorsOf('# A\n\n## Notes\n\n## Notes\n\n<a id="row-7"></a>\n\n```\n## not a heading\n```\n');
  assert.deepEqual([...anchors].sort(), ['a', 'notes', 'notes-1', 'row-7']);
});

test('code and comments are not prose, and keep their lines', () => {
  const text = 'one [a](x.md)\n```\n[b](y.md)\n```\n`[c](z.md)` and <!-- [d](w.md) -->';
  const prose = proseOf(text);
  assert.equal(prose.split('\n').length, text.split('\n').length);
  assert.ok(prose.includes('[a](x.md)'));
  for (const hidden of ['y.md', 'z.md', 'w.md']) assert.ok(!prose.includes(hidden), hidden);
});

test('every relative link in the tracked Markdown resolves', () => {
  assert.deepEqual(brokenLinks(), []);
});
