// Search tests.
//
// The regression that forced this module into existence is the first one: a substring test for
// "PLA" matches "Thermoplastic Polyurethane", so the most common search a filament buyer can type
// returned every TPU and TPE in the database, with nothing about the result looking wrong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesQuery, words, searchableWords } from '../app/js/engine/search.js';

const mk = (over = {}) => ({ name: 'X', fullName: '', abbreviation: '', family: '', basePolymer: '', modifier: '', gradeIds: [], ...over });

const pla = mk({ name: 'PLA', fullName: 'Polylactic Acid', family: 'PLA', gradeIds: ['G001-01'] });
const tpu = mk({ name: 'TPU 95A HF', fullName: 'Thermoplastic Polyurethane, Shore 95A - High Flow', family: 'Flexible Elastomers' });
const pa6cf = mk({ name: 'PA6-CF', fullName: 'Polyamide 6, Carbon Fibre', family: 'Nylon / Polyamide' });
const support = mk({ name: 'Support for PLA/PETG', family: 'Support / Soluble' });

test('a term inside a longer word is not a match', () => {
  // "pla" sits inside "thermoplastic". This is the whole reason the module exists.
  assert.equal(matchesQuery(tpu, 'PLA'), false);
  assert.equal(matchesQuery(pla, 'PLA'), true);
});

test('a term may begin a word, because that is how people abbreviate', () => {
  assert.equal(matchesQuery(pa6cf, 'pa6'), true);   // PA6-CF
  assert.equal(matchesQuery(pa6cf, 'cf'), true);    // the filler
  assert.equal(matchesQuery(tpu, '95'), true);      // 95A
  assert.equal(matchesQuery(pa6cf, 'nylon'), true); // via family
});

test('a slash separates names rather than joining them', () => {
  // "Support for PLA/PETG" is genuinely about both, and must answer to either.
  assert.equal(matchesQuery(support, 'pla'), true);
  assert.equal(matchesQuery(support, 'petg'), true);
});

test('every term must match, so another word narrows', () => {
  assert.equal(matchesQuery(tpu, 'tpu 95'), true);
  assert.equal(matchesQuery(tpu, 'tpu 85'), false);
});

test('an empty query matches everything', () => {
  assert.equal(matchesQuery(pla, ''), true);
  assert.equal(matchesQuery(pla, '   '), true);
});

test('punctuation is a separator, never part of a word', () => {
  assert.deepEqual(words('PA6/66'), ['pa6', '66']);
  assert.deepEqual(words('TPC / TPEE'), ['tpc', 'tpee']);
  assert.ok(searchableWords(pa6cf).includes('polyamide'));
});
