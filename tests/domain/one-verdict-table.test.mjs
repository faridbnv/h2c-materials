// WP-19 step 6: one gate-verdict table in the new code. Every object literal in packages/ and apps/ that has three or more of the
// six gate verdicts as keys is a table of what a verdict means; there must be exactly the shared core's (GATE_TABLE and the
// GATE_STATUS cut of it), and the engine port must read that table instead of holding its own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { GATE_PRECEDENCE, GATE_STATUS } from '../../packages/domain/src/core/gate-verdict.ts';
import { root } from '../parity/helpers.mjs';

function* sources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'generated') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (/\.ts$/.test(entry.name) && !entry.name.endsWith('.d.ts')) yield path;
  }
}

/** The object literals of a file keyed by three or more gate verdicts (other than a row of zero counters). */
function tablesIn(path) {
  const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const found = [];
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const keys = node.properties.map((p) => p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null);
      // A row of zero counters keyed by the verdicts (the validation report's tally) says nothing of what a verdict means.
      const counters = node.properties.every((p) => ts.isPropertyAssignment(p) && ts.isNumericLiteral(p.initializer));
      if (!counters && keys.filter((k) => GATE_PRECEDENCE.includes(k)).length >= 3) found.push(file.getLineAndCharacterOfPosition(node.getStart()).line + 1);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

// The facts-and-words layer (WP-24) is a label-only port of app/js/ui/labels.js, pinned to it by P-erase: its two tables give the
// words for a verdict, not what it means (the chip's state is GATE_STATUS). They are named here, in the file that holds them, and
// the next test requires their keys to be the core table's, so a new verdict cannot reach one screen and not the next.
const WORD_TABLES = { 'packages/pages/src/facts/labels.ts': ['GATE_VERDICT', 'OUTSIDE_WORDS'] };

test('the gate-verdict table is written once in new code: the shared core\'s (apart from the named word tables)', () => {
  const tables = [];
  for (const base of ['packages', 'apps']) for (const path of sources(join(root, base))) for (const line of tablesIn(path)) tables.push(`${relative(root, path)}:${line}`);
  const words = tables.filter((t) => t.split(':')[0] in WORD_TABLES);
  const meaning = tables.filter((t) => !words.includes(t));
  assert.equal(meaning.length, 2, meaning.join(', '));
  assert.ok(meaning.every((t) => t.startsWith('packages/domain/src/core/gate-verdict.ts:')), meaning.join(', '));
  assert.equal(words.length, Object.values(WORD_TABLES).flat().length, `word tables found: ${words.join(', ')}`);
});

test('the named word tables cover exactly the verdicts the core table gives them', async () => {
  const { GATE_TABLE } = await import('../../packages/domain/src/core/gate-verdict.ts');
  const { GATE_VERDICT, OUTSIDE_WORDS } = await import('../../packages/pages/src/facts/labels.ts');
  assert.deepEqual(Object.keys(GATE_VERDICT), [...GATE_PRECEDENCE], 'GATE_VERDICT: every verdict, in precedence order');
  const outside = Object.entries(GATE_TABLE).filter(([, row]) => row.outside).map(([v]) => v);
  assert.deepEqual(Object.keys(OUTSIDE_WORDS).sort(), outside.sort(), 'OUTSIDE_WORDS: exactly the verdicts outside the H2C');
});

test('the engine port\'s GATE_STATUS is the core\'s table, with the key order the page reads', async () => {
  const { importStaged, stageEngine } = await import('@atlas/engine');
  const constraints = (await importStaged(stageEngine())).get('constraints');
  assert.deepEqual(constraints.GATE_STATUS, GATE_STATUS);
  assert.deepEqual(Object.keys(constraints.GATE_STATUS), [...GATE_PRECEDENCE]);
});
