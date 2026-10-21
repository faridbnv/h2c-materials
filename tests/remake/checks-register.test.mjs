// WP-15: the check register, its frozen inventory, the must-not-change map and the owner's untested list.
// The first test is the CI check: a pull request that deletes, shortens or skips a registered test, or an old check
// without a register row, fails here. The rest delete things in a scratch copy of the checkout and expect the failure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../../remake/tools/rulings-check.mjs';
import { csvLine } from '../../remake/tools/wp-lib.mjs';
import { BASELINE_PATH, FLOOR_PATH, MAP_IDS, MAP_PATH, REGISTER_PATH, UNTESTED_PATH, assertCount, floorFor, formatBaseline, formatFloor, liveInventory, parseBaseline, parseFloor, skeleton, skipCount, standingSkipCount, testCount, verifyRegister } from '../../remake/tools/checks-register.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tool = join(repo, 'remake/tools/checks-register.mjs');

/** A scratch checkout: every top-level entry links to the real one, except the paths named in `copy`, which are real copies. */
function scratch(copy) {
  const dir = mkdtempSync(join(tmpdir(), 'checks-register-'));
  for (const name of readdirSync(repo)) if (name !== '.git') symlinkSync(join(repo, name), join(dir, name));
  for (const rel of copy) {
    const parts = rel.split('/');
    for (let i = 1; i < parts.length; i++) {
      const at = join(dir, ...parts.slice(0, i));
      if (lstatSync(at).isSymbolicLink()) {
        const real = readlinkSync(at);
        unlinkSync(at);
        mkdirSync(at);
        for (const child of readdirSync(real)) symlinkSync(join(real, child), join(at, child));
      }
    }
    const target = join(dir, rel);
    if (lstatSync(target).isSymbolicLink()) unlinkSync(target);
    cpSync(join(repo, rel), target, { recursive: true });
  }
  return dir;
}
const withScratch = (copy, fn) => {
  const dir = scratch(copy);
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const edit = (dir, rel, fn) => { const p = join(dir, rel); writeFileSync(p, fn(readFileSync(p, 'utf8'))); };
/** Rewrite checks/register.csv: `fn` gets the data rows as objects and returns the rows to keep. */
function editRegister(dir, fn) {
  const [header, ...rows] = parseCsv(readFileSync(join(dir, REGISTER_PATH), 'utf8'));
  const objects = rows.map((r) => Object.fromEntries(header.map((c, i) => [c, r[i]])));
  writeFileSync(join(dir, REGISTER_PATH), [csvLine(header), ...fn(objects).map((o) => csvLine(header.map((c) => o[c])))].join('\n') + '\n');
}
/** An editRegister callback: merge `fields` into the row with this id. */
const patchRow = (id, fields) => (rows) => rows.map((r) => (r.id === id ? { ...r, ...fields } : r));
const dropRow = (id) => (rows) => rows.filter((r) => r.id !== id);
// The marker words are built, so this file does not trip its own skip detector.
const SKIP = 'sk' + 'ip';
const TODO = 'to' + 'do';
const problems = (dir) => verifyRegister(dir).problems;
const has = (list, re) => list.some((p) => re.test(p));
/** Change a scratch checkout with `mutate(dir)` and expect verifyRegister to report a problem matching `re`. */
function expectProblem(copy, mutate, re) {
  withScratch(copy, (dir) => {
    mutate(dir);
    const list = problems(dir);
    assert.ok(has(list, re), list.join('\n'));
  });
}

test('the repository verifies: register, frozen inventory, must-not-change map and the owner\'s list agree', () => {
  const result = verifyRegister(repo);
  assert.deepEqual(result.problems, []);
  assert.equal(result.items, MAP_IDS.length);
  assert.ok(result.rows >= 100, `${result.rows} register rows`);
});

test('every old check the tree holds is in the frozen inventory, with its test and skip counts', () => {
  const live = liveInventory(repo);
  const frozen = parseBaseline(readFileSync(join(repo, BASELINE_PATH), 'utf8'));
  assert.deepEqual([...frozen.keys()].filter((t) => !live.has(t)), [], 'frozen checks the tree no longer holds');
  assert.deepEqual([...frozen].filter(([t, a]) => a.tests !== undefined && JSON.stringify(a) !== JSON.stringify(live.get(t))), [], 'a frozen test file changed');
  assert.equal(formatBaseline(live), readFileSync(join(repo, BASELINE_PATH), 'utf8'));
});

test('the CLI exits 0 on the repository, 1 on a problem and 2 on bad usage', () => {
  const run = (...args) => spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' });
  const ok = run('--verify');
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /checks:register: OK\. \d+ register rows cover \d+ old checks; 38 must-not-change items/);
  assert.equal(run().status, 2);
  assert.equal(run('--cutover-ready').status, 2);
  withScratch(['test'], (dir) => {
    unlinkSync(join(dir, 'test/search.test.js'));
    const bad = run('--verify', '--root', dir);
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /T-search: names file:test\/search\.test\.js, which no longer exists/);
  });
});

test('a scratch deletion of a registered test fails, naming the row and the test', () => {
  withScratch(['test'], (dir) => {
    unlinkSync(join(dir, 'test/constraints.test.js'));
    const list = problems(dir);
    assert.ok(has(list, /register row T-constraints: names file:test\/constraints\.test\.js, which no longer exists/), list.join('\n'));
    assert.ok(has(list, /must-not-change\.md S11-04: names file:test\/constraints\.test\.js, which does not exist/), 'the map names it too');
  });
});

test('deleting the test and its register row together still fails: the frozen inventory remembers it', () => {
  withScratch(['test', 'checks'], (dir) => {
    unlinkSync(join(dir, 'test/search.test.js'));
    editRegister(dir, dropRow('T-search'));
    assert.ok(has(problems(dir), /an old check vanished without a register row: file:test\/search\.test\.js/));
  });
});

test('a deletion recorded as the register asks (a deleted date and a successor) passes', () => {
  withScratch(['test', 'checks'], (dir) => {
    unlinkSync(join(dir, 'test/search.test.js'));
    editRegister(dir, patchRow('T-search', { status: 'successor', deleted: '2027-01-15' }));
    assert.deepEqual(problems(dir), []);
    editRegister(dir, patchRow('T-search', { status: 'keep' }));
    assert.ok(has(problems(dir), /T-search: a deleted check is a successor or obsolete-at-cutover row/));
  });
});

test('a row marked deleted whose check still exists fails', () => {
  expectProblem(
    ['checks'],
    (dir) => editRegister(dir, patchRow('T-search', { status: 'obsolete-at-cutover', deleted: '2027-01-15' })),
    /T-search: marked deleted on 2027-01-15, but file:test\/search\.test\.js still exists/,
  );
});

test('an old check with no register row fails, and --skeleton prints the row to write', () => {
  withScratch(['checks'], (dir) => {
    editRegister(dir, dropRow('S-links'));
    assert.ok(has(problems(dir), /no register row for step:links/));
    assert.ok(skeleton(dir).some((l) => l.includes('step:links')));
    assert.deepEqual(skeleton(repo), [], 'nothing is missing in the repository');
  });
  expectProblem(
    ['test'],
    (dir) => writeFileSync(join(dir, 'test/brand-new.test.js'), "import test from 'node:test';\ntest('x', () => {});\n"),
    /no register row for file:test\/brand-new\.test\.js/,
  );
});

test('a registered old test that loses a test or gains a skip fails', () => {
  expectProblem(
    ['test'],
    (dir) => edit(dir, 'test/search.test.js', (src) => src.replace(/^test\(/m, 'xtest(')),
    /file:test\/search\.test\.js lost tests: \d+ at the freeze, \d+ now/,
  );
  expectProblem(
    ['test'],
    (dir) => edit(dir, 'test/search.test.js', (src) => `${src}\ntest('another', { ${SKIP}: true }, () => {});\n`),
    /file:test\/search\.test\.js gained skip or todo markers/,
  );
});

test('a registered new test that is skipped outright fails; a conditional skip does not', () => {
  withScratch(['tests'], (dir) => {
    edit(dir, 'tests/domain/tidy.test.mjs', (src) => `${src}\ntest('x', { ${SKIP}: process.env.NEVER_SET }, () => {});\n`);
    assert.deepEqual(problems(dir), []);
    edit(dir, 'tests/domain/tidy.test.mjs', (src) => `${src}\ntest.${SKIP}('y', () => {});\n`);
    assert.ok(has(problems(dir), /tests\/domain\/tidy\.test\.mjs \(register row X-domain-tidy\) is skipped/));
  });
});

test('a step removed from the verify runner fails, naming the row', () => {
  expectProblem(
    ['scripts'],
    (dir) => edit(dir, 'scripts/verify.mjs', (src) => src.replace(/^.*\['links',.*\n/m, '')),
    /register row S-links: names step:links, which no longer exists/,
  );
});

test('a malformed register row fails: no proof, an unknown status, an owner that is not a package, a repeated id', () => {
  const broken = { 'T-search': { proof: '' }, 'T-scale': { status: 'retire' }, 'T-bounds': { owner: 'Alice' } };
  const firstId = parseCsv(readFileSync(join(repo, REGISTER_PATH), 'utf8'))[1][0];
  withScratch(['checks'], (dir) => {
    editRegister(dir, (rows) => [...rows.map((r) => ({ ...r, ...broken[r.id] })), rows[0]]);
    const list = problems(dir);
    assert.ok(has(list, /T-search: proof is empty/));
    assert.ok(has(list, /T-scale: status "retire" is not one of keep, re-point, successor, obsolete-at-cutover/));
    assert.ok(has(list, /T-bounds: owner "Alice" is not a work package/));
    assert.ok(has(list, new RegExp(`${firstId}: duplicate id`)));
  });
});

test('the map: a missing item, a test that does not exist, and an item with neither a test nor an UNTESTED mark all fail', () => {
  expectProblem(
    ['docs/next'],
    (dir) => edit(dir, MAP_PATH, (src) => src.split('\n').filter((l) => !l.startsWith('| S11-03 |')).join('\n')),
    /S11-03 is missing/,
  );
  expectProblem(
    ['docs/next'],
    (dir) => edit(dir, MAP_PATH, (src) => src.replace('`test/retired.test.js`', '`test/no-such-test.test.js`')),
    /names file:test\/no-such-test\.test\.js, which does not exist/,
  );
  // S06-01 has tests; strip them and leave the status: neither a test nor an UNTESTED mark.
  expectProblem(
    ['docs/next'],
    (dir) => edit(dir, MAP_PATH, (src) => src.replace(/^(\| S06-01 \|[^|]*\|[^|]*\|)[^|]*\|[^|]*\|/m, '$1  |  |')),
    /S06-01: marked TESTED but names no test or parity tier \(mark it UNTESTED, explicitly\)/,
  );
  // S06-11 names a test and is PARTIAL; calling it UNTESTED while it names one is a contradiction the check refuses.
  expectProblem(
    ['docs/next'],
    (dir) => edit(dir, MAP_PATH, (src) => src.replace(/^(\| S06-11 \|.*\| )PARTIAL( \|)/m, '$1UNTESTED$2')),
    /S06-11: marked UNTESTED but names/,
  );
});

test('the map: a parity tier that is not built is not protection', () => {
  expectProblem(
    ['docs/next'],
    (dir) => edit(dir, MAP_PATH, (src) => src.replace(/^(\| S06-02 \|.*)`P-engine`/m, '$1`P-ui`')),
    /S06-02: parity tier P-ui is not built yet/,
  );
});

test('the map and the register must agree on which check pins which item', () => {
  expectProblem(
    ['checks'],
    (dir) => editRegister(dir, patchRow('T-retired', { protects: '' })),
    /S11-03: file:test\/retired\.test\.js is in the register \(T-retired\) without S11-03 in its protects column/,
  );
  expectProblem(
    ['checks'],
    (dir) => editRegister(dir, patchRow('T-search', { protects: 'S06-01' })),
    /register row T-search says it protects S06-01, but the map does not name it/,
  );
});

test('the owner\'s list must hold every PARTIAL and UNTESTED item, and only those', () => {
  expectProblem(
    ['docs/next'],
    (dir) => edit(dir, MAP_PATH, (src) => src.replace(/^(\| S06-01 \|.*\| )TESTED( \|)/m, '$1UNTESTED$2')),
    /S06-01: marked UNTESTED but names/,
  );
  expectProblem(
    ['docs/next'],
    (dir) => edit(dir, UNTESTED_PATH, (src) => src.replace('### Question 3. S06-11', '### Question 3. S06-99')),
    /S06-11 is PARTIAL in the map but not on the owner's list/,
  );
  expectProblem(
    ['docs/next'],
    (dir) => edit(dir, UNTESTED_PATH, (src) => `${src}\n### S11-02 an item the map calls TESTED\n`),
    /lists S11-02, which the map does not mark PARTIAL or UNTESTED/,
  );
});

test('the counters count what they say', () => {
  assert.equal(testCount("test('a', () => {});\n  it('b', () => {});\ntest.only('c', () => {});\n// test('d')\n"), 3);
  assert.equal(skipCount(`test('a', { ${SKIP}: !x }, f); test.${SKIP}('b', f); test('c', { ${TODO}: true }, f);`), 3);
  assert.equal(standingSkipCount(`test('a', { ${SKIP}: !x }, f); test('c', { ${TODO}: say(1) }, f);`), 0);
  assert.equal(standingSkipCount(`test.${SKIP}('b', f); test('c', { ${SKIP}: true }, f); test('d', { ${SKIP}: 'why' }, f);`), 3);
});

// ---- the test floor: a registered test file cannot lose a test or an assertion ----------------------------------------------
const FLOOR_COPY = ['tests', 'checks'];
const firstAssertLine = /^[ \t]*assert(?:\.\w+)*\([^\n]*\);[ \t]*$/m;

test('assertion calls are counted as calls, and comments, strings of prose and other words are not', () => {
  assert.equal(assertCount("assert.equal(a, b);\n  assert(ok);\nt.assert.ok(x);\nexpect(y).toBe(1);\nawait assert.rejects(f, /x/);\n"), 5);
  assert.equal(assertCount("// assert.equal(a, b);\n * assert.ok(x)\n/* assert(x) */\nconst reassert = 1; myassert(2); x.assert(3);\n"), 0);
  assert.equal(assertCount('assert.deepEqual(\n  a,\n  b);'), 1);
});

test('the floor file parses, formats, and refuses a line it cannot read', () => {
  const floor = parseFloor(readFileSync(join(repo, FLOOR_PATH), 'utf8'));
  assert.ok(floor.size > 100 && floor.get('file:tests/remake/gate-order.test.mjs').asserts > 10);
  assert.equal(formatFloor(floor), readFileSync(join(repo, FLOOR_PATH), 'utf8'), 'the file on disk is exactly what --floor writes');
  assert.throws(() => parseFloor('file:tests/a.test.mjs tests=1'), /cannot read the line/);
});

test('a registered new test that loses an assertion, or a test, fails and names the floor', () => {
  withScratch(FLOOR_COPY, (dir) => {
    edit(dir, 'tests/domain/tidy.test.mjs', (src) => src.replace(firstAssertLine, ''));
    assert.ok(has(problems(dir), /tests\/domain\/tidy\.test\.mjs lost assertions: the floor is \d+ assertion calls, it holds \d+/), problems(dir).join('\n'));
  });
  withScratch(FLOOR_COPY, (dir) => {
    edit(dir, 'tests/domain/tidy.test.mjs', (src) => src.replace(/^test\(/m, 'xtest('));
    assert.ok(has(problems(dir), /tests\/domain\/tidy\.test\.mjs lost tests: the floor is \d+, it holds \d+/));
  });
});

test('an old test that loses an assertion fails too, although its test count is frozen already', () => {
  withScratch(['test', 'checks'], (dir) => {
    edit(dir, 'test/search.test.js', (src) => src.replace(firstAssertLine, ''));
    const list = problems(dir);
    assert.ok(has(list, /file:test\/search\.test\.js lost assertions/), list.join('\n'));
    assert.ok(!has(list, /lost tests/), 'the test count is intact');
  });
});

test('a new assertion, a new test and a rewritten assertion do not trip the floor (it is a minimum, not a freeze)', () => {
  withScratch(FLOOR_COPY, (dir) => {
    edit(dir, 'tests/domain/tidy.test.mjs', (src) => `${src}\ntest('one more', () => { assert.ok(true); });\n`);
    edit(dir, 'tests/domain/tidy.test.mjs', (src) => src.replace(firstAssertLine, (m) => m.replace(/\(.*\)/, '(1 === 1)')));
    assert.deepEqual(problems(dir), []);
  });
});

test('the floor file cannot be dropped, emptied of a file, or left without a file the register names', () => {
  withScratch(FLOOR_COPY, (dir) => {
    unlinkSync(join(dir, FLOOR_PATH));
    assert.ok(has(problems(dir), /checks\/test-floor\.txt does not exist/));
  });
  withScratch(FLOOR_COPY, (dir) => {
    edit(dir, FLOOR_PATH, (src) => src.split('\n').filter((l) => !l.startsWith('file:tests/domain/tidy.test.mjs ')).join('\n'));
    assert.ok(has(problems(dir), /file:tests\/domain\/tidy\.test\.mjs is a registered test file with no floor in checks\/test-floor\.txt/));
  });
  withScratch(FLOOR_COPY, (dir) => {
    edit(dir, FLOOR_PATH, (src) => `${src}file:tests/domain/tidy.test.mjs tests=x\n`);
    assert.ok(has(problems(dir), /cannot read the line/));
  });
});

test('--floor raises and adds, never lowers; lowering is a hand edit of the file, and then the check passes', () => {
  withScratch(FLOOR_COPY, (dir) => {
    const before = parseFloor(readFileSync(join(dir, FLOOR_PATH), 'utf8')).get('file:tests/domain/tidy.test.mjs');
    edit(dir, 'tests/domain/tidy.test.mjs', (src) => src.replace(firstAssertLine, ''));
    assert.deepEqual(floorFor(dir).get('file:tests/domain/tidy.test.mjs'), before, 'a lost assertion does not lower the floor');
    assert.ok(has(problems(dir), /lost assertions/));
    edit(dir, FLOOR_PATH, (src) => src.replace(`file:tests/domain/tidy.test.mjs tests=${before.tests} asserts=${before.asserts}`, `file:tests/domain/tidy.test.mjs tests=${before.tests} asserts=${before.asserts - 1}`));
    assert.deepEqual(problems(dir), [], 'the deliberate edit is the only way down, and it shows in the diff');
    edit(dir, 'tests/domain/tidy.test.mjs', (src) => `${src}\ntest('more', () => { assert.ok(1); assert.ok(2); });\n`);
    const raised = floorFor(dir).get('file:tests/domain/tidy.test.mjs');
    assert.equal(raised.tests, before.tests + 1);
    assert.equal(raised.asserts, before.asserts + 1);
  });
});

test('the CLI writes the floor with --floor, and verification then holds', () => {
  withScratch(FLOOR_COPY, (dir) => {
    unlinkSync(join(dir, FLOOR_PATH));
    const run = (...args) => spawnSync(process.execPath, [tool, ...args, '--root', dir], { encoding: 'utf8' });
    assert.equal(run('--verify').status, 1);
    const written = run('--floor');
    assert.equal(written.status, 0, written.stderr);
    assert.match(written.stdout, /checks\/test-floor\.txt written: \d+ test files/);
    const ok = run('--verify');
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /test floor holds for \d+ registered test files/);
  });
});
