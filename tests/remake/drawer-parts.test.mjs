// WP-26: the drawer built from the parts of a release shows what the drawer built from the compiled database shows. The selector's drawer reads
// the core (every material, cut to what a decision and the first screen read), with the open material's detail joined in row by row and the
// shared part beside them (apps/public/src/selector/drawer/db.ts); the facts layer reads a database. If the cut had lost a field the drawer reads,
// a sentence or a count would differ, silently, for that material alone. So every material's drawer is drawn both ways, on every tab, with the
// estimates hidden and shown, and the markup must be the same.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { newScenario } from '../../packages/engine/src/port/scenario.ts';
import { useRegistry } from '../../packages/pages/src/facts/registry.ts';
import { drawerDbOf } from '../../apps/public/src/selector/drawer/db.ts';
import { drawerModel } from '../../apps/public/src/selector/drawer/detail.ts';
import { makeShards } from '../../apps/public/tools/shards.ts';
import { applyEstimates, decodeDetail } from '../../packages/publish/src/shards.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const TABS = ['Overview', 'Grades', 'Mechanical', 'Thermal', 'Printing', 'Environment', 'Price', 'Evidence'];

let db, files, scenario;

before(() => {
  const path = join(root, 'dist/db.json');
  if (!existsSync(path)) {
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' });
    assert.equal(build.status, 0, `npm run build failed:\n${build.stderr}`);
  }
  db = JSON.parse(readFileSync(path, 'utf8'));
  db.meta.release = { id: 'aaaaaaaaaaaa', digest: 'a'.repeat(64), inputs: {} };
  files = makeShards(db, { meta: { caveat: 'x' } }, 'aaaaaaaaaaaa').files;
  scenario = newScenario(db.meta);
});

const stateOf = (id, tab, showEstimates) => ({
  selectedMaterialId: id, drawerTab: tab, selection: { evaluations: [] }, scenario, ctx: { showEstimates }, highlightMeasurement: null, highlightSource: null,
});

/** The first place two markups differ, with a little of each, or null. */
const firstDifference = (a, b) => {
  if (a === b) return null;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return `at ${i}: ${JSON.stringify(a.slice(Math.max(0, i - 60), i + 120))} against ${JSON.stringify(b.slice(Math.max(0, i - 60), i + 120))}`;
};

for (const showEstimates of [false, true]) {
  test(`the drawer from the parts equals the drawer from the whole database, for every material and tab (estimates ${showEstimates ? 'shown' : 'hidden'})`, () => {
    const coreFile = JSON.parse(files.get('core.json'));
    const core = coreFile.model;
    if (showEstimates) applyEstimates(core, JSON.parse(files.get('estimates.json')).overlay);
    const shared = JSON.parse(files.get('shared.json'));
    const sharedPart = { tables: shared.tables, sources: shared.sources, knowHow: shared.knowHow, registry: shared.registry };
    const problems = [];
    let drawn = 0;
    for (const m of db.materials) {
      if (m.familyEntry) continue;
      const detail = decodeDetail(JSON.parse(files.get(`detail/${m.id}.json`)));
      const parts = drawerDbOf(core, detail, sharedPart);
      for (const tab of TABS) {
        useRegistry(db.registry);
        const whole = drawerModel(db, stateOf(m.id, tab, showEstimates));
        useRegistry(parts.registry);
        const cut = drawerModel(parts, stateOf(m.id, tab, showEstimates));
        drawn++;
        if (!whole || !cut) { problems.push(`${m.id} ${tab}: ${whole ? 'no drawer from the parts' : 'no drawer from the database'}`); continue; }
        const d = firstDifference(whole.body, cut.body) ?? firstDifference(whole.idLine, cut.idLine);
        if (d) problems.push(`${m.id} ${tab}: ${d}`);
      }
    }
    assert.ok(drawn > 1000, 'the test drew the drawers');
    assert.deepEqual(problems.slice(0, 10), [], `${problems.length} of ${drawn} drawers differ`);
  });
}
