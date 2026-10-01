import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewedClause } from '../scripts/migrate/coverage-clause.mjs';

// Fluorodur's original publishes these two exclusions in one paragraph. They are
// separate source statements, not duplicate evidence, despite the shared locator.
const base = { GradeID: 'G096-02', SourceID: 'R-FLUORODUR', Topic: 'Pitfalls and limitations', Locator: 'paragraph 3' };
const food = { ...base, Finding: 'The usage for food contact application is not recommended.' };
const medical = { ...base, Finding: 'The material should not be used for medical applications.' };
const operations = [food, medical].map((Proposed) => ({ Kind: 'append', Table: 'evidence', Proposed }));
const lookup = (rows, proposed) => reviewedClause(rows, proposed, operations, 'evidence', 'EvidenceID', 'fixture');

test('each separate exclusion is found on a rerun, irrespective of peer order', () => {
  const rows = [{ EvidenceID: 'Q-food', ...food }, { EvidenceID: 'Q-medical', ...medical }];
  assert.equal(lookup(rows, medical).EvidenceID, 'Q-medical');
  assert.equal(lookup(rows.toReversed(), food).EvidenceID, 'Q-food');
  assert.equal(lookup(rows.slice(0, 1), medical), undefined);
});

test('changed source wording stops a missing-clause admission instead of creating a duplicate', () => {
  const rows = [{ EvidenceID: 'Q-food', ...food, Finding: 'Changed published wording' }, { EvidenceID: 'Q-medical', ...medical }];
  assert.throws(() => lookup(rows, food), /Q-food moved/);
  assert.deepEqual(rows[0].Finding, 'Changed published wording');
});
