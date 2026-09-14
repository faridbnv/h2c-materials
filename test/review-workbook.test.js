// The review workbook is a faithful, read-only view: every table sheet has exactly the manifest's rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeReviewWorkbook, workbookRowCounts } from '../build/src/review-workbook.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('the review workbook holds every table with the manifest row counts, plus the headline view', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-review-'));
  try {
    const path = join(dir, 'review.xlsx');
    writeReviewWorkbook(root, path, { commit: 'test', dataManifestSha256: 'test', generated: 'test' });
    const counts = workbookRowCounts(path);
    const manifest = JSON.parse(readFileSync(join(root, 'data/manifest.json'), 'utf8')).tables;
    for (const [table, { rows }] of Object.entries(manifest)) assert.equal(counts[table], rows, table);
    assert.equal(counts['Headlines view'], manifest.headlines.rows);
    assert.ok(counts.README > 0 && counts.Columns > 100);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
