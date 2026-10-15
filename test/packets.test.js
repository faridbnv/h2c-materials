// What stays in a round's folder when its packets leave for the evidence store (scripts/data/packets.mjs, D138). A file a
// living script, test or document reads must stay, or the check that reads it fails on the next clone; everything else
// is a packet and may go.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keepReason, checkAll } from '../scripts/data/packets.mjs';

test('reports, scripts and images stay; a round\'s working files move', () => {
  assert.match(keepReason('2026-10-05-gap-round-2', 'README.md'), /report/);
  assert.match(keepReason('2026-10-05-gap-round-2', 'tooling/targets.mjs'), /script/);
  assert.match(keepReason('2026-09-29-ashby-makeover', 'visuals/beam.png'), /image/);
  assert.equal(keepReason('2026-10-05-gap-round-2', 'proposals/joined/held.csv'), null);
  assert.equal(keepReason('2026-09-30-coverage-expansion', 'priority-06-09-render.json'), null);
});

test('what a living check reads stays: verdicts, frozen lists, the campaign status inputs, the import pipeline\'s state', () => {
  assert.match(keepReason('2026-10-07-completeness-round', 'blind-draw/verdicts-20261012.csv'), /verdict/);
  assert.match(keepReason('2026-10-05-check-round-3', 'blind-draw/draw-b-verdicts-20261005.csv'), /verdict/);
  assert.match(keepReason('2026-10-05-check-round-3', 'TARGETS.csv'), /frozen/);
  assert.match(keepReason('2026-10-04-reader-round', 'DOCS.csv'), /frozen/);
  assert.match(keepReason('2026-09-30-coverage-expansion', 'frozen-targets.json'), /campaign/);
  assert.match(keepReason('2026-09-30-coverage-expansion', 'first-12-packet.json'), /campaign/);
  assert.match(keepReason('2026-09-18-v2-import', 'rulings/rulings.csv'), /live state/);
});

test('a file a living document, table or script names by path stays, and so does what the keep-list names', () => {
  assert.match(keepReason('2026-09-25-re-center', 'retired-representative-picks.csv'), /named by a living/);
  assert.match(keepReason('2026-09-30-coverage-check', 'removed-sparse-gaps.csv'), /named by a living/);
  assert.match(keepReason('2026-09-15-filtering-estimates-data', 'physics/findings.csv'), /keep-list/);
});

test('no exported packet is still tracked', () => {
  assert.deepEqual(checkAll().problems.filter((p) => /still tracked/.test(p)), []);
});
