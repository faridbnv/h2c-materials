// WP-24: the material pages in TypeScript (packages/pages). The renderer's command writes the files the old build's stage 8 writes;
// the four deliberate display changes hold (AR-19 the selector's stable address, OQ-11 A the test-answers label, the reprint ruling's
// twin wording, R3 C private references); the page script is within its 30 KB budget; and the old unit tests of the drawer's facts
// and words run, unedited, against the TypeScript layer. P-pages (npm run parity -- --new --surface pages) is the proof that the
// words and links of every page are the old ones apart from the registered transitions (tests/parity/pages.test.mjs).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Script } from 'node:vm';
import { assertClean, scanTree } from '../../remake/tools/private-scan.mjs';
import { renderPages } from '../../packages/pages/src/site.ts';
import { checkBudgets } from '../../packages/pages/src/site.ts';
import { TEST_ANSWERS_LABEL } from '../../packages/pages/src/method-page.ts';
import { SHARED_NOTE } from '../../packages/pages/src/sections/common.ts';
import { SELECTOR_HREF } from '../../packages/pages/src/render.ts';
import { PRIVATE_REFERENCE } from '../../packages/publish/src/source-link.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const dbPath = join(root, 'dist/db.json');
// A failure names the page and the pattern, never the page: these strings are megabytes.
const isMatch = (text, re, msg = '') => assert.ok(re.test(text), `${msg} expected to match ${re}`);
const noMatch = (text, re, msg = '') => assert.ok(!re.test(text), `${msg} expected not to match ${re}`);
const made = [];
const tmp = (prefix) => { const d = mkdtempSync(join(tmpdir(), prefix)); made.push(d); return d; };
after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });

let db;
let out; // the folder the command wrote: <out>/materials
const files = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => relative(dir, join(e.parentPath, e.name)).split('\\').join('/')).sort();
const read = (rel) => readFileSync(join(out, 'materials', rel), 'utf8');

before(() => {
  if (!existsSync(dbPath)) {
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' });
    assert.equal(build.status, 0, `npm run build failed:\n${build.stderr}`);
  }
  db = JSON.parse(readFileSync(dbPath, 'utf8'));
  out = tmp('h2c-pages-');
  const run = spawnSync(process.execPath, ['packages/pages/src/cli.ts', '--db', dbPath, '--out', out], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, `the page command failed:\n${run.stdout}${run.stderr}`);
});

test('the command writes the set of files the old build writes under materials/: every page the rule admits, its Products page and stub, the index, the method page, the assets', () => {
  const written = files(join(out, 'materials'));
  const overviews = written.filter((f) => /^M\d+\.html$/.test(f));
  assert.ok(overviews.length >= 80, `${overviews.length} Overviews`);
  for (const f of overviews) {
    const id = f.replace('.html', '');
    assert.ok(written.includes(`${id}-products.html`) && written.includes(`${id}-records.html`), `${id} has its Products page and its stub`);
  }
  assert.equal(written.length, overviews.length * 3 + 2 + 4, 'three pages per material, the index and the method page, four assets');
  for (const f of ['index.html', 'method.html', 'assets/pages.css', 'assets/page.js', 'assets/Inter-OFL.txt', 'assets/Newsreader-OFL.txt']) assert.ok(written.includes(f), f);
  // Where the old build's folder is there, the sets are the same.
  const old = join(root, 'dist/materials');
  if (existsSync(old)) assert.deepEqual(written, files(old));
  // Every material the page rule admits has its page: none is dropped.
  const admitted = db.materials.filter((m) => !m.familyEntry).map((m) => m.id).filter((id) => written.includes(`${id}.html`));
  assert.equal(admitted.length, overviews.length);
});

test('the command refuses what it cannot render: a missing database, an unknown argument, a missing value', () => {
  const run = (...args) => spawnSync(process.execPath, ['packages/pages/src/cli.ts', ...args], { cwd: root, encoding: 'utf8' });
  assert.notEqual(run('--db', join(tmpdir(), 'nonexistent-db.json'), '--out', tmpdir()).status, 0);
  assert.notEqual(run('--db', dbPath, '--out', tmpdir(), '--bogus').status, 0);
  assert.notEqual(run('--db', dbPath, '--out').status, 0);
  assert.notEqual(run('--db', dbPath).status, 0);
});

test('AR-19: no page names the release-stamped selector file; the way back is the selector at its stable address', () => {
  const html = files(join(out, 'materials')).filter((f) => f.endsWith('.html'));
  let backLinks = 0;
  for (const f of html) {
    const text = read(f);
    noMatch(text, /H2C_Material_Selector/, f);
    for (const m of text.matchAll(/<a [^>]*data-return[^>]*href="([^"]*)"|<a [^>]*href="([^"]*)"[^>]*data-return/g)) {
      const href = m[1] ?? m[2];
      assert.ok(href === SELECTOR_HREF || href.startsWith(`${SELECTOR_HREF}#`), `${f}: ${href}`);
      backLinks++;
    }
  }
  assert.equal(SELECTOR_HREF, '../');
  assert.ok(backLinks >= html.length, `every page has a way back: ${backLinks} links on ${html.length} pages`);
  // A deployer may still give another address (the old stamped name, or none).
  const stamped = renderPages(db, { only: ['M001'], selectorHref: '../H2C_Material_Selector_x.html' });
  isMatch(stamped.files.find(([p]) => p === 'materials/M001.html')[1], /href="\.\.\/H2C_Material_Selector_x\.html#/);
  const none = renderPages(db, { only: ['M001'], selectorHref: null });
  noMatch(none.files.find(([p]) => p === 'materials/M001.html')[1], /data-return/);
});

test('OQ-11 A: the method page says the test answers were written by an agent and not yet reviewed by a person', () => {
  const method = read('method.html');
  isMatch(TEST_ANSWERS_LABEL, /test answers written by an agent, not yet reviewed by a person/);
  assert.ok(method.includes('test answers written by an agent, not yet reviewed by a person'));
  isMatch(method, /<section class="method-part" id="test-answers"[^>]*><h2>Test answers<\/h2>/);
  isMatch(method, /href="#test-answers"/, 'the page bar lists it');
  // Only the method page carries it.
  assert.ok(!/test answers/i.test(read('M001.html')));
});

test('the reprint ruling: a value read from a twin\'s shared sheet is said to count once in the material\'s median', () => {
  // PPS-GF (M074): QIDI reprints Polymaker's table (docs/next/transitions/reprint-counts-once.md).
  const products = read('M074-products.html');
  assert.ok(/Data sheet shared with [^<]*: their values are one table, recorded once and counted once in the material(?:'|&#39;)s median\./.test(products), 'the card says it');
  const overview = read('M074.html');
  assert.ok(overview.includes(SHARED_NOTE) || overview.includes('Counted once in the median'), 'the Overview says it where it shows a value read from a shared sheet');
  assert.ok(/the median counts that value once/.test(read('method.html')));
  assert.ok(!/as the median counts each/.test(read('method.html')));
  // Where there is no twin the words are not there.
  const pages = files(join(out, 'materials')).filter((f) => /^M\d+-products\.html$/.test(f));
  const without = pages.filter((f) => !read(f).includes('Data sheet shared with'));
  assert.ok(without.length > 0);
  for (const f of without) noMatch(read(f), /counted once in the material's median/, f);
});

test('R3 C: a source whose address is a path on a machine shows its title and "private reference", with no link, and no path reaches a page', () => {
  // The real data holds four such sources (LOCAL-CREEP and LOCAL-FATIGUE are cited by M001 and M019).
  const cited = read('M001.html');
  isMatch(cited, /Plastics Engineering: pseudo-elastic design[^<]*<span class="doc-meta">[^<]*<span class="doc-kind">private reference<\/span>/);
  noMatch(cited, /<a [^>]*>[^<]*pseudo-elastic design/);
  for (const f of files(join(out, 'materials'))) noMatch(read(f), /\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\\\/, f);
  // The scan that runs before the preview is published finds nothing in the whole folder.
  assertClean(scanTree(join(out, 'materials')), 'the rendered pages');

  // A source the data has never held: a local path on one cited source of M001, as a path in every shape.
  const copy = structuredClone(db);
  const id = copy.sources.find((s) => /^https?:/.test(s.url) && cited.includes(`data-rec="${s.id}"`))?.id;
  assert.ok(id, 'a cited web source of M001');
  for (const [url, shows] of [['/Users/someone/Documents/secret.pdf', true], ['~/notes/secret.pdf', true], ['C:\\Users\\someone\\secret.pdf', true], ['file:///Users/someone/secret.pdf', true], ['Not recorded', false]]) {
    copy.sources.find((s) => s.id === id).url = url;
    const html = renderPages(copy, { only: ['M001'] }).files.find(([p]) => p === 'materials/M001.html')[1];
    noMatch(html, /someone|secret\.pdf|Users/, url);
    const item = new RegExp(`<li class="doc" data-rec="${id}">(.*?)</li>`).exec(html)?.[1] ?? '';
    assert.ok(item, `the source is listed: ${url}`);
    noMatch(item, /<a /, `no link for ${url}`);
    assert.equal(item.includes(PRIVATE_REFERENCE), shows, url);
  }
});

test('the page script is bundled for the browser within its 30 KB budget, as one classic script', () => {
  const script = read('assets/page.js');
  assert.ok(script.length > 5000, 'a real script');
  assert.ok(Buffer.byteLength(script) <= 30_000, `${Buffer.byteLength(script)} bytes`);
  assert.doesNotThrow(() => new Script(script), 'it parses as a classic script');
  noMatch(script, /^\s*(import|export)\s/m, 'no module syntax');
  // Both scripts are in it: the frame's (theme, the way back, lighting) and the lists' (search and sort).
  isMatch(script, /atlas-return/);
  isMatch(script, /data-sortby/);
  // The budget check is the build's: a script over twice the budget fails.
  const fat = checkBudgets([['materials/assets/page.js', 'x'.repeat(60_001)]]);
  assert.equal(fat.fail.length, 1);
  assert.equal(checkBudgets([['materials/assets/page.js', 'x'.repeat(30_001)]]).warn.length, 1);
  assert.equal(checkBudgets([['materials/assets/page.js', 'x'.repeat(30_000)]]).warn.length, 0);
});

test('a render is a function of the database alone: twice gives the same bytes', () => {
  const a = renderPages(db, { only: ['M001', 'M074'] });
  const b = renderPages(db, { only: ['M074', 'M001'] });
  assert.deepEqual(a.files.map(([p, t]) => [p, t]), b.files.map(([p, t]) => [p, t]));
});

// ------------------------------------------------------------------------------------------------------------------------------
// The old unit tests of the drawer's facts and words, unedited, against the TypeScript layer (the drawer-comparisons test among them).

const FACTS_TESTS = ['ashby-export', 'bounds', 'brief', 'diameter', 'drawer-comparisons', 'evidence-pairs', 'format', 'gate-verdicts', 'handoffs', 'impact-compare', 'know-how',
  'material-facts', 'material-stats', 'new-property', 'parallel', 'polymer-environment', 'print-spread', 'product-claims', 'product-screening', 'products-tab', 'registry-ui',
  'table-sort', 'templates', 'workspace-acceptance'].map((n) => `test/${n}.test.js`);

function runOld(testFiles, env = {}) {
  const { NODE_TEST_CONTEXT: _context, ...base } = process.env;
  const child = spawn(process.execPath, ['--import', join(root, 'tests/remake/redirect-facts.mjs'), '--test', ...testFiles], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...base, ATLAS_ROOT: root, ...env },
  });
  let text = '';
  child.stdout.on('data', (d) => { text += d; });
  child.stderr.on('data', (d) => { text += d; });
  return new Promise((resolve) => child.on('exit', (code) => {
    const count = (word) => Number(new RegExp(`^ℹ ${word} (\\d+)`, 'm').exec(text)?.[1] ?? Number.NaN);
    resolve({ code, tests: count('tests'), pass: count('pass'), fail: count('fail'), text });
  }));
}

test('the old unit tests of the drawer (drawer-comparisons, material-facts, material-stats, format, print-spread and 19 more) hold unedited against the TypeScript facts layer', async () => {
  for (const f of FACTS_TESTS) assert.ok(existsSync(join(root, f)), f);
  const r = await runOld(FACTS_TESTS);
  assert.equal(r.code, 0, r.text.slice(-3000));
  assert.equal(r.fail, 0);
  assert.ok(r.tests >= 140, `a real run: ${r.tests} tests`);
  assert.equal(r.pass, r.tests);
});

test('control: a fault planted in a copy of the facts layer fails the old tests, so they ran against it', async () => {
  mkdirSync(join(root, '.cache'), { recursive: true });
  const dir = mkdtempSync(join(root, '.cache', 'h2c-facts-fault-'));
  made.push(dir);
  const facts = join(root, 'packages/pages/src/facts');
  cpSync(join(root, 'packages/pages/src'), join(dir, 'src'), { recursive: true });
  const format = readFileSync(join(facts, 'format.ts'), 'utf8');
  const find = 'else s = v.toPrecision(3);';
  assert.equal(format.split(find).length - 1, 1);
  writeFileSync(join(dir, 'src/facts/format.ts'), format.replace(find, 'else s = v.toPrecision(2);'));
  const r = await runOld(['test/format.test.js', 'test/drawer-comparisons.test.js'], { ATLAS_FACTS_DIR: join(dir, 'src/facts') });
  assert.notEqual(r.code, 0);
  assert.ok(r.fail > 0, `the planted fault must fail something: ${r.fail}`);
});
