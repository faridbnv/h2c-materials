// The preview smoke's engine answer (remake/tools/preview-smoke.mjs engineAnswer) against the real engine on the old build's database.
// It lives with the parity tests because it needs dist/db.json, which the parity jobs download and the new-tests job does not build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { engineAnswer, SCENARIOS } from '../../remake/tools/preview-smoke.mjs';
import { root } from './helpers.mjs';

test('the smoke\'s engine answer is the real engine\'s: the Strict template on the old build\'s database gives its counts and verdicts, and an unknown question is an error', async () => {
  const dbFile = join(root, 'dist/db.json');
  assert.ok(existsSync(dbFile), 'npm run build first (dist/db.json)');
  const db = JSON.parse(readFileSync(dbFile, 'utf8'));
  const answer = await engineAnswer({ ...SCENARIOS.strict, model: db, release: db.meta.release.id });
  assert.equal(answer.counts.total, db.materials.filter((m) => !m.familyEntry).length);
  assert.equal(answer.counts.pass + answer.counts.fail + answer.counts.unknown + answer.counts.screened, answer.counts.total);
  assert.equal(answer.verdicts.size, answer.counts.total);
  await assert.rejects(engineAnswer({ caseId: 'template/no-such-question/strict', model: db, release: db.meta.release.id }), /no question/);
});
