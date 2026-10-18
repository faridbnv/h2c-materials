// The hand-offs from the selector to the material pages (coherence round, 2026-10-18, C38 and C39): the decision brief
// names the material's page and the product's card with the release, and the results table's shortlist star is a narrow
// column straight after the material's name, where a laptop's screen shows it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decisionBrief } from '../app/js/ui/brief.js';
import { pageOf } from '../app/js/ui/page-rule.js';
import { COLUMN_SETS } from '../app/js/ui/table.js';
import { db, material, situation } from './fixtures/drawer-situation.js';

function brief(gradeId, extra = {}) {
  const sit = situation('Indoor prototype');
  const grade = db.grades.find((g) => g.id === gradeId);
  const mat = db.materials.find((m) => m.id === grade.materialId);
  const evaluation = sit.selection.evaluations.find((e) => e.materialId === mat.id);
  const entry = evaluation.products.find((p) => p.gradeId === gradeId);
  const decision = { gradeId, stateId: entry.state.id, release: db.meta.release.id, chosenOn: '2026-10-18', note: null, tests: [] };
  return decisionBrief({ db, scenario: sit.scenario, material: mat, grade, evaluation, entry, decision, ...extra });
}

test('C38: the brief names the material page and the product\'s card with the release, in full on the site and relative with its caveat from a file', () => {
  const id = db.grades.find((g) => g.materialId === material('PETG').id && !g.retired).id;
  const m = material('PETG');
  const release = db.meta.release.id;
  const site = brief(id, { pagesBase: 'https://example.org/atlas/index.html' });
  assert.ok(site.includes(`material page https://example.org/atlas/materials/${m.id}.html · this product's card https://example.org/atlas/materials/${m.id}-products.html#${id} (material pages of release ${release}).`), site.split('\n').slice(0, 6).join('\n'));
  const file = brief(id);
  assert.ok(file.includes(`material page materials/${m.id}.html · this product's card materials/${m.id}-products.html#${id} (material pages of release ${release}; these are paths relative to the selector's page, which open only where that release's material pages are unzipped beside it).`), file.split('\n').slice(0, 6).join('\n'));
  // Under the head: before the question, after the line naming the product.
  assert.ok(file.indexOf('Read the reasons behind it') < file.indexOf('## The question'));
});

test('C38: a material with no page gets no link in its brief', () => {
  const none = db.materials.find((x) => !x.familyEntry && x.gradeIds.length && !pageOf(x, db.measurements.filter((r) => r.materialId === x.id))
    && db.grades.some((g) => g.materialId === x.id && !g.retired));
  const gradeId = db.grades.find((g) => g.materialId === none.id && !g.retired).id;
  const sit = situation('Indoor prototype');
  const evaluation = sit.selection.evaluations.find((e) => e.materialId === none.id);
  const entry = evaluation?.products?.find((p) => p.gradeId === gradeId);
  const grade = db.grades.find((g) => g.id === gradeId);
  const text = decisionBrief({ db, scenario: sit.scenario, material: none, grade, evaluation, entry, decision: { gradeId, release: db.meta.release.id, chosenOn: '2026-10-18', tests: [] }, pagesBase: 'https://example.org/atlas/' });
  assert.doesNotMatch(text, /material page|Read the reasons/);
});

test('C39: the shortlist star is a narrow column straight after the material\'s name, in both column sets', () => {
  for (const [name, set] of Object.entries(COLUMN_SETS)) {
    const keys = set.columns.map((c) => c.key);
    assert.equal(keys[0], 'name', name);
    assert.equal(keys[1], 'pin', `${name}: the star follows the name`);
    assert.equal(keys.filter((k) => k === 'pin').length, 1);
    assert.equal(set.columns[1].width, '44px');
  }
});
