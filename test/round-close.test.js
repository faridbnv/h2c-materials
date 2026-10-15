// Closing a round (scripts/round-close.mjs): the rewrite that moves a migration's imports from scripts/migrate/ to
// archive/migrations/, and the static check that every archived import still resolves. The check exists because
// neither `node --check` nor `import.meta.resolve` looks for the file, and a migration runs when it is imported.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rewriteForArchive, checkImports } from '../scripts/round-close.mjs';

test('a migration archived two levels down reaches the living tools through scripts/', () => {
  const before = [
    "import { openTables } from '../data/table-io.mjs';",
    "import { correct } from '../lib/source-edits.mjs';",
    "const { applyBatch } = await import('../ingest/apply.mjs');",
    "import { readCsv } from '../../build/src/csv.js';",
    "import { applyApplicationPacket } from './application-packet.mjs';",
  ].join('\n');
  assert.equal(rewriteForArchive(before), [
    "import { openTables } from '../../scripts/data/table-io.mjs';",
    "import { correct } from '../../scripts/lib/source-edits.mjs';",
    "const { applyBatch } = await import('../../scripts/ingest/apply.mjs');",
    "import { readCsv } from '../../build/src/csv.js';",
    "import { applyApplicationPacket } from './application-packet.mjs';",
  ].join('\n'));
});

test('the import check names a missing file, a missing dynamic import and a name the target does not export', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-round-close-'));
  try {
    writeFileSync(join(dir, 'helper.mjs'), 'export const kept = 1;\nexport function other() {}\nconst inner = 2;\nexport { inner as renamed };\n');
    writeFileSync(join(dir, 'm1-good.mjs'), "import { kept, other, renamed as r } from './helper.mjs';\nconst m = await import('./helper.mjs');\n");
    writeFileSync(join(dir, 'm2-bad.mjs'), "import { gone } from './helper.mjs';\nimport x from './missing.mjs';\nawait import('./also-missing.mjs');\n");
    const problems = checkImports(dir).map((p) => p.replace(/^.*?: /, ''));
    assert.deepEqual(problems.sort(), ['./also-missing.mjs does not exist', './helper.mjs exports no gone', './missing.mjs does not exist']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
