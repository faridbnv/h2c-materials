// WP-24: P-pages on the new side. The hunk diff names each run of changed lines (not one difference for a whole page); the two page
// transitions are valid files whose lists split the observed differences; and the real run, `npm run parity -- --new --surface pages`,
// compares the old build's pages with the pages packages/pages renders from the new build's database and matches the transitions
// exactly. The run costs about a minute (the new build is most of it).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { diffHunks, comparePages, PAGES_CASE } from '../../packages/parity/src/p-pages.ts';
import { loadTransitions, settleSurface } from '../../packages/parity/src/transitions.ts';
import { cli, root } from './helpers.mjs';

const lines = (n, f = (i) => `line ${i}`) => Array.from({ length: n }, (_, i) => f(i));
const set = (pages) => ({ label: 'x', pages: new Map(Object.entries(pages)), html: new Map() });

test('diffHunks: nothing, an insertion, a deletion, a replacement, several separate runs', () => {
  const a = lines(20);
  assert.deepEqual(diffHunks(a, [...a]), []);
  assert.deepEqual(diffHunks(a, [...a.slice(0, 5), 'new', ...a.slice(5)]), [{ start: 5, before: [], after: ['new'] }]);
  assert.deepEqual(diffHunks(a, a.filter((_, i) => i !== 7)), [{ start: 7, before: ['line 7'], after: [] }]);
  assert.deepEqual(diffHunks(a, a.map((l, i) => (i === 3 ? 'changed' : l))), [{ start: 3, before: ['line 3'], after: ['changed'] }]);
  const b = a.map((l, i) => (i === 2 ? 'two' : i === 3 ? 'three' : i === 15 ? 'fifteen' : l));
  assert.deepEqual(diffHunks(a, b), [{ start: 2, before: ['line 2', 'line 3'], after: ['two', 'three'] }, { start: 15, before: ['line 15'], after: ['fifteen'] }]);
  // Whole texts that share nothing, and one empty side.
  assert.deepEqual(diffHunks(['a', 'b'], ['c']), [{ start: 0, before: ['a', 'b'], after: ['c'] }]);
  assert.deepEqual(diffHunks([], ['c']), [{ start: 0, before: [], after: ['c'] }]);
});

test('diffHunks reproduces the second text from the first, on seeded random edits', () => {
  let seed = 12345;
  const rand = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  for (let round = 0; round < 60; round++) {
    const a = lines(30 + rand(40), (i) => `l${i % 9}`); // repeated lines make the script ambiguous
    const b = [...a];
    for (let k = rand(8); k > 0; k--) {
      const at = rand(b.length + 1);
      if (rand(2)) b.splice(at, 1 + rand(3)); else b.splice(at, rand(2), ...lines(1 + rand(3), () => `new${rand(5)}`));
    }
    const hunks = diffHunks(a, b);
    const out = []; let i = 0;
    for (const h of hunks) { out.push(...a.slice(i, h.start), ...h.after); i = h.start + h.before.length; }
    out.push(...a.slice(i));
    assert.deepEqual(out, b, `round ${round}`);
    assert.deepEqual(a.slice(0, 0), []);
  }
});

test('diffHunks gives one hunk, never a crash or a hang, for a page changed beyond the script it keeps', () => {
  const a = lines(4000, (i) => `a${i}`);
  const b = lines(4000, (i) => `b${i}`);
  const hunks = diffHunks(a, b);
  assert.equal(hunks.length, 1);
  assert.equal(hunks[0].before.length, 4000);
});

test('comparePages: one difference for each run of changed lines, named by its first line in the old page; a missing page is one difference', () => {
  const old = lines(30).join('\n');
  const changed = lines(30, (i) => (i === 4 ? 'FOUR' : i === 20 ? 'TWENTY' : `line ${i}`)).join('\n');
  const r = comparePages(set({ 'a.html': old, 'b.html': old, 'c.html': old }), set({ 'a.html': changed, 'b.html': old }));
  assert.deepEqual(r.differences.map((d) => [d.case, d.record, d.field, d.before, d.after]), [
    [PAGES_CASE, 'a.html', 'lines 5-5', 'line 4', 'FOUR'],
    [PAGES_CASE, 'a.html', 'lines 21-21', 'line 20', 'TWENTY'],
    [PAGES_CASE, 'c.html', '(page)', '<present>', '<absent>'],
  ]);
  assert.equal(r.status, 'differs');
  const added = comparePages(set({ 'a.html': 'x\ny' }), set({ 'a.html': 'x\nnew\ny' }));
  assert.deepEqual(added.differences.map((d) => [d.field, d.before, d.after]), [['after line 1', '', 'new']]);
});

test('the two page transitions are valid, list only the case `pages`, and are named in the preview banner', async () => {
  const files = loadTransitions(join(root, 'parity/transitions')).filter((f) => f.id.startsWith('2026-10-22-pages-'));
  assert.deepEqual(files.map((f) => [f.id, f.kind]), [['2026-10-22-pages-display', 'display'], ['2026-10-22-pages-reprint-medians', 'science']]);
  for (const f of files) {
    assert.ok(f.differences.length > 0);
    assert.ok(f.differences.every((d) => d.case === PAGES_CASE && d.tier === 'wording'), f.id);
  }
  const [display, medians] = files;
  assert.equal(display.differences.length, 534);
  assert.equal(medians.differences.length, 491);
  // The two lists are disjoint: no difference is accounted for twice.
  const key = (d) => JSON.stringify([d.record, d.field, d.before, d.after]);
  const shown = new Set(display.differences.map(key));
  assert.ok(medians.differences.every((d) => !shown.has(key(d))));
  // The display list holds the four changes and no other: every difference is one of them.
  const kinds = display.differences.map((d) => {
    if (/\{selector\}/.test(d.before) && !/\{selector\}/.test(d.after)) return 'a';
    if (d.record === 'method.html' && /[Tt]est answers/.test(d.after)) return 'b';
    if (/private reference/.test(d.after)) return 'd';
    // A long line is clipped in the list, so a card's note and the method page's sentence are known by their first words as well.
    if (/counted once|counts that table once|counts that value once|recorded once/i.test(d.after) || /^(Data sheet shared with|A strip per property)/.test(d.before)) return 'c';
    return null;
  });
  assert.equal(kinds.filter((k) => k === null).length, 0, 'every listed difference is one of the four');
  const count = (k) => kinds.filter((x) => x === k).length;
  assert.deepEqual([count('a'), count('b'), count('c'), count('d')], [333, 2, 197, 2]);
  const { TRANSITION_NOTES } = await import('../../remake/tools/preview-assemble.mjs');
  for (const f of files) assert.ok(TRANSITION_NOTES[f.id], `${f.id} is named in the preview banner`);
});

test('P-pages on the new side: the old build\'s pages against the pages rendered from the new build match the registered transitions exactly', () => {
  assert.ok(existsSync(join(root, 'dist/materials')) && existsSync(join(root, 'dist/db.json')), 'npm run build first');
  const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', cli, '--new', '--surface', 'pages'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout}${r.stderr}`;
  assert.equal(r.status, 0, out.slice(-3000));
  assert.match(out, /RESULT: matches-transition/);
  assert.match(out, /transitions \[2026-10-22-pages-display, 2026-10-22-pages-reprint-medians\]: 1025 listed, 0 unexpected, 0 missing/);
  assert.match(out, /248 pages compared, 1025 differences/);
});

test('P-pages on the new side can fail: one difference more or one fewer than the registered lists is `differs`, and the lists settle exactly what they list', () => {
  const files = loadTransitions(join(root, 'parity/transitions')).filter((f) => f.id.startsWith('2026-10-22-pages-'));
  const listed = files.flatMap((f) => f.differences);
  const report = (differences) => ({ surface: 'pages', before: 'a', after: 'b', unit: 'page', unitsCompared: 248, differenceCount: differences.length, differences, notComputable: [], truncated: false, notes: [], status: 'differs' });
  const settled = (differences) => settleSurface(report(differences), files, PAGES_CASE);
  assert.equal(settled(listed).status, 'matches-transition');
  assert.equal(settled(listed.slice(1)).status, 'differs');
  assert.equal(settled(listed.slice(1)).transitions.missing.length, 1);
  const extra = { ...listed[0], field: 'lines 99999-99999' };
  assert.equal(settled([...listed, extra]).status, 'differs');
  assert.equal(settled([...listed, extra]).transitions.unexpected.length, 1);
  // A page that changed in a way the lists do not hold is named, never absorbed.
  assert.equal(settled([...listed, { ...listed[0], record: 'M999.html' }]).transitions.unexpected[0].record, 'M999.html');
});
