// A round's frozen list is written once: a re-run of its script that would change it stops, unless --refreeze
// (scripts/lib/frozen.mjs; completeness round, 2026-10-07). The files here are temporary.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFrozen } from '../scripts/lib/frozen.mjs';

const dir = mkdtempSync(join(tmpdir(), 'h2c-frozen-'));
test.after(() => rmSync(dir, { recursive: true, force: true }));

test('a frozen list is written once, kept on a re-run that would change it, and written again only on --refreeze', () => {
  const path = join(dir, 'TARGETS.csv');
  assert.equal(writeFrozen(path, 'a\n1\n', []), true, 'the first run writes it');
  assert.equal(writeFrozen(path, 'a\n1\n', []), false, 'the same bytes again are a no-op');
  assert.throws(() => writeFrozen(path, 'a\n2\n', []), /is frozen/);
  assert.equal(readFileSync(path, 'utf8'), 'a\n1\n', 'the refused run left the frozen list as it was');
  assert.equal(writeFrozen(path, 'a\n2\n', ['--refreeze']), true);
  assert.equal(readFileSync(path, 'utf8'), 'a\n2\n');
});
