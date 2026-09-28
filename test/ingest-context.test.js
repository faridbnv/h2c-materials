// The import pipeline's live paths are named in one place (scripts/ingest/context.mjs, A07): by default they are where
// the V2 campaign put them, and one variable moves a campaign, its proposals with it, without touching the one before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const paths = (env = {}) => {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('H2C_')));
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', `console.log(JSON.stringify(await import(${JSON.stringify(join(root, 'scripts/ingest/context.mjs'))})))`],
    { encoding: 'utf8', env: { ...clean, ...env } });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
};

test('with nothing set, every live path is where the V2 campaign put it', () => {
  const p = paths();
  assert.equal(p.LEDGER, join(root, 'docs/audits/2026-09-18-v2-import/ledger.csv'));
  assert.equal(p.PROPOSALS, join(root, 'archive/ingest-2026-09-18/proposals'));
  assert.equal(p.SOURCES_BY_SHA, join(root, '.cache/sources/by-sha'));
  assert.equal(p.TEXT_CACHE, join(root, '.cache/text'));
  // The relative forms are what the record tier and the audits join to a root of their own.
  assert.equal(p.LEDGER_REL, 'docs/audits/2026-09-18-v2-import/ledger.csv');
  assert.equal(p.PROPOSALS_REL, 'archive/ingest-2026-09-18/proposals');
});

test('a campaign root of its own moves the ledger and the proposals together; the document cache moves on its own', () => {
  const p = paths({ H2C_INGEST_ROOT: '/tmp/h2c-campaign-2027', H2C_DOCUMENT_CACHE: 'elsewhere/cache' });
  assert.equal(p.LEDGER, '/tmp/h2c-campaign-2027/ledger.csv');
  assert.equal(p.FETCH_JOURNAL, '/tmp/h2c-campaign-2027/ledger.fetch-journal.jsonl');
  assert.equal(p.PROPOSALS, '/tmp/h2c-campaign-2027/proposals');
  assert.equal(p.TEXT_CACHE, join(root, 'elsewhere/cache/text'));
  // A folder outside the project still joins correctly to the project root from its relative form.
  assert.equal(join(root, p.PROPOSALS_REL), '/tmp/h2c-campaign-2027/proposals');
  assert.equal(paths({ H2C_INGEST_ROOT: '/tmp/h2c-campaign-2027', H2C_PROPOSALS: '/tmp/h2c-proposals' }).PROPOSALS, '/tmp/h2c-proposals');
});
