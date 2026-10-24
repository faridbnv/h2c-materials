// P-build and P-pages: the compiled database path by path, and the visible text of every material page. Both build in a temporary
// copy of the project; both can be fed a different tables directory; neither touches data/, app/, build/ or dist/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BuildFailed, buildInCopy, compareBuilds } from '../../packages/parity/src/p-build.ts';
import { comparePages, decodeEntities, normalizeNames, readPages, visibleText } from '../../packages/parity/src/p-pages.ts';
import { readDb } from '../../packages/parity/src/old-adapter.ts';
import { root, sha } from './helpers.mjs';

const db = readDb();
const names = { release: db.meta.release.id, build: db.meta.build };
const dist = { path: join(root, 'dist', 'db.json'), label: 'dist/db.json' };
const tables = join(root, 'data', 'tables');
const realBefore = { materials: sha('data/tables/materials.csv'), manifest: sha('data/manifest.json'), db: sha('dist/db.json'), buildIndex: sha('build/src/index.js') };

/** A copy of data/tables where one cell is changed, written by the old build's own canonical CSV writer so the schema gate accepts it. */
async function mutatedTables(root_, dir) {
  const { readCsv, csvText } = await import(pathToFileURL(join(root_, 'build', 'src', 'csv.js')).href);
  cpSync(tables, dir, { recursive: true });
  const parsed = readCsv(join(dir, 'materials.csv'));
  const row = parsed.records.find((r) => r.values.MaterialID === 'M001');
  const was = row.values['Full name'];
  row.values['Full name'] = `${was} (parity mutation)`;
  writeFileSync(join(dir, 'materials.csv'), csvText(parsed.header, parsed.records.map((r) => r.values)));
  return was;
}

const scratch = mkdtempSync(join(tmpdir(), 'h2c-build-test-'));
const mutatedDir = join(scratch, 'tables');
const was = await mutatedTables(root, mutatedDir);
test.after(() => rmSync(scratch, { recursive: true, force: true }));

// Two real builds, side by side (about 40 s each on a quiet machine): the same tables twice, and one changed cell.
const sameTables = buildInCopy({ label: 'second copy', buildDate: names.build });
const changedTables = buildInCopy({ label: 'one cell changed', tablesDir: mutatedDir, buildDate: names.build });
sameTables.catch(() => undefined);
changedTables.catch(() => undefined);

test('P-build, no-op: the same tables built a second time, in a temporary copy, compare path by path as exactly equal', async () => {
  const second = await sameTables;
  assert.notEqual(second.dir, root);
  const r = await compareBuilds(dist, { path: second.dbPath, label: second.label });
  assert.equal(r.status, 'zero');
  assert.equal(r.differenceCount, 0);
  assert.ok(r.unitsCompared > 1_000_000, `${r.unitsCompared} values compared`);
});

test('P-build can fail: one changed cell in a tables directory is named by its record and field, and nothing unrelated moves', async () => {
  const built = await changedTables;
  const r = await compareBuilds(dist, { path: built.dbPath, label: built.label });
  assert.equal(r.status, 'differs');
  assert.ok(r.differenceCount >= 1, 'something moved');
  const fullName = r.differences.find((d) => d.record === 'materials[M001]' && /fullName/.test(d.field));
  assert.ok(fullName, `the changed cell is named: ${r.differences.map((d) => `${d.record} ${d.field}`).join('; ')}`);
  assert.match(fullName.after, /parity mutation/);
  assert.ok(fullName.before.includes(was));
  // Nothing unrelated moved: every difference carries the mutation or sits in the record it belongs to.
  assert.ok(r.differences.every((d) => /parity mutation/.test(d.after) || d.record === 'materials[M001]'), r.differences.map((d) => `${d.record} ${d.field}`).join('; '));
});

test('the tables override reached the copy only: the real tables, manifest, db and build code are untouched', () => {
  assert.equal(sha('data/tables/materials.csv'), realBefore.materials);
  assert.equal(sha('data/manifest.json'), realBefore.manifest);
  assert.equal(sha('dist/db.json'), realBefore.db);
  assert.equal(sha('build/src/index.js'), realBefore.buildIndex);
});

test('P-pages, no-op: the visible text of all 248 pages from a second build equals the first, names normalised', async () => {
  const second = await sameTables;
  const a = readPages(join(root, 'dist', 'materials'), 'dist/materials', names);
  const b = readPages(second.materialsDir, second.label, names);
  const r = comparePages(a, b);
  assert.equal(r.status, 'zero');
  assert.equal(r.unitsCompared, 248);
  assert.ok(a.pages.get('M001.html').length > 5000);
});

test('P-pages can fail: the changed cell shows in the visible text of the page that carries it, and only there (each side normalised by its own release)', async () => {
  const built = await changedTables;
  const otherNames = { release: readDb(built.dbPath).meta.release.id, build: names.build };
  assert.notEqual(otherNames.release, names.release, 'a data change is a new release, so its id is a name to normalise, not a difference');
  const r = comparePages(readPages(join(root, 'dist', 'materials'), 'dist', names), readPages(built.materialsDir, built.label, otherNames));
  assert.equal(r.status, 'differs');
  assert.ok(r.differences.some((d) => d.record === 'M001.html'));
  assert.ok(r.differences.every((d) => /parity mutation/.test(d.after)), r.differences.map((d) => d.record).join(', '));
  assert.ok(r.differenceCount < 10, `${r.differenceCount} pages carry the name`);
});

test('P-pages: a dropped source line, a dropped section, a changed link target and a missing page are each named', () => {
  const real = readPages(join(root, 'dist', 'materials'), 'dist', names);
  const edit = (f) => { const copy = { ...real, label: 'edited', pages: new Map(real.pages) }; f(copy.pages); return comparePages(real, copy); };
  const lines = real.pages.get('M001.html').split('\n');
  const dropLine = edit((p) => p.set('M001.html', lines.filter((_, i) => i !== 200).join('\n')));
  assert.equal(dropLine.status, 'differs');
  assert.equal(dropLine.differenceCount, 1);
  assert.match(dropLine.differences[0].field, /^lines 201-/);
  const dropSection = edit((p) => p.set('M001.html', lines.slice(0, 100).join('\n')));
  assert.equal(dropSection.differenceCount, 1);
  const link = edit((p) => p.set('M001.html', real.pages.get('M001.html').replace('⟨M001-products.html⟩', '⟨M002-products.html⟩')));
  assert.equal(link.differenceCount, 1);
  const missing = edit((p) => p.delete('M008-records.html'));
  assert.deepEqual(missing.differences.map((d) => [d.record, d.field, d.before, d.after]), [['M008-records.html', '(page)', '<present>', '<absent>']]);
  const same = edit(() => {});
  assert.equal(same.status, 'zero');
});

test('visible text: scripts, styles and comments are dropped; cells, blocks and link targets are kept; entities decode; nbsp is kept', () => {
  const html = '<!doctype html><html><head><title>T &amp; U</title><style>p{}</style><script>var x="<b>no</b>"</script></head>'
    + '<body><!-- hidden --><h1>Head</h1><p>one&nbsp;two <a href="x.html#a&amp;b">link</a></p><table><tr><td>a</td><td>b</td></tr></table><svg><text>5</text><text>6</text></svg></body></html>';
  assert.equal(visibleText(html), 'T & U\nHead\none two link ⟨x.html#a&b⟩\na | b |\n5 6');
  assert.throws(() => decodeEntities('&bogus;'), /unknown entity/);
  assert.equal(decodeEntities('&#39;&#x41;&lt;'), "'A<");
});

test('visible text cannot silently lose the rest of a page: a head never closed, a script with a "<" in it, an unquoted href, labels and data islands', () => {
  // `</head>` omitted (the body tag ends the head); the page still reads in full.
  assert.equal(visibleText('<html><head><title>T</title><body><h1>Real</h1><p>after</p>'), 'T\nReal\nafter');
  // A script whose code holds "a<b": its end is found by its closing tag, not by tokenizing the code.
  assert.equal(visibleText('<head><title>T</title></head><body><script>if(a<b){x=1}</script><p>after</p></body>'), 'T\nafter');
  // An unquoted href is a target too.
  assert.match(visibleText('<body><a href=foo.html>link</a></body>'), /link ⟨foo\.html⟩/);
  // What screen readers read, and the JSON a page carries for its script, are part of the page.
  const text = visibleText('<body><button aria-label="Close it" title="Shut">x</button><img alt="A chart"><script type="application/json" id="w">{"a":["b"]}</script><script>var z=1</script></body>');
  assert.match(text, /⟦aria-label: Close it⟧/);
  assert.match(text, /⟦title: Shut⟧/);
  assert.match(text, /⟦alt: A chart⟧/);
  assert.match(text, /⟦data: \{"a":\["b"\]\}⟧/);
  assert.doesNotMatch(text, /var z/);
  // A page that ends inside its head or title was not read, and says so.
  assert.throws(() => visibleText('<html><head><title>T</title><meta charset="utf-8">'), /ends inside its head/);
  assert.throws(() => visibleText('<html><head><title>never closed'), /ends inside its head or title/);
});

test('P-pages can fail on a label or a data island, not only on visible words', () => {
  const page = (aria, json) => ({ label: 'x', pages: new Map([['a.html', normalizeNames(visibleText(`<body><p>same</p><button aria-label="${aria}">b</button><script type="application/json">${json}</script></body>`), names)]]), html: new Map() });
  assert.equal(comparePages(page('Close', '{"w":1}'), page('Close', '{"w":1}')).status, 'zero');
  assert.equal(comparePages(page('Close', '{"w":1}'), page('Shut', '{"w":1}')).status, 'differs');
  assert.equal(comparePages(page('Close', '{"w":1}'), page('Close', '{"w":2}')).status, 'differs');
});

test('names that name a build, not a page, are replaced: the release id, the build date and the stamped selector file', () => {
  const t = 'release 7c6da496722d, build 2026-10-21 ⟨../H2C_Material_Selector_2026-09-21_7c6da496722d.html#%22i%22%3A%227c6da496722d%22⟩';
  assert.equal(normalizeNames(t, { release: '7c6da496722d', build: '2026-10-21' }), 'release {release}, build {build} ⟨../{selector}#%22i%22%3A%22{release}%22⟩');
  assert.equal(normalizeNames(t.replaceAll('7c6da496722d', 'aaaaaaaaaaaa'), { release: 'aaaaaaaaaaaa', build: '2026-10-22' }).includes('{selector}'), true);
});

test('an empty or missing pages directory is not "no differences": it throws', () => {
  const empty = mkdtempSync(join(scratch, 'empty-'));
  assert.throws(() => readPages(empty, 'empty', names), /no material pages/);
  assert.throws(() => readPages(join(scratch, 'nope'), 'missing', names), /cannot read the material pages/);
});

test('compareBuilds on small made-up databases: a changed value, an added row and a removed row are named; meta.build and meta.release are left out', async () => {
  const write = (name, o) => { const p = join(scratch, name); writeFileSync(p, JSON.stringify(o)); return { path: p, label: name }; };
  const base = { meta: { build: 'a', release: { id: 'r1' }, snapshot: 's' }, materials: [{ id: 'M1', headline: { density: { value: 1 } } }, { id: 'M2', headline: {} }], grades: [] };
  const same = await compareBuilds(write('a.json', base), write('b.json', { ...base, meta: { build: 'b', release: { id: 'r2' }, snapshot: 's' } }));
  assert.equal(same.status, 'zero');
  const moved = await compareBuilds(write('c.json', base), write('d.json', {
    ...base, materials: [{ id: 'M1', headline: { density: { value: 2 } } }, { id: 'M3', headline: {} }],
  }));
  assert.equal(moved.status, 'differs');
  assert.deepEqual(moved.differences.map((d) => [d.record, d.field]).sort(), [['materials[M1]', 'headline.density.value'], ['materials[M2]', '(whole)'], ['materials[M3]', '(whole)']].sort());
});

test('P-build sees the ORDER of every list of records and a record listed twice, which a path-by-id comparison cannot', async () => {
  const write = (name, o) => { const p = join(scratch, name); writeFileSync(p, JSON.stringify(o)); return { path: p, label: name }; };
  const rows = [{ id: 'M1', v: 1 }, { id: 'M2', v: 2 }, { id: 'M3', v: 3 }];
  const base = { meta: {}, materials: rows, notes: [{ text: 'no id' }] };
  assert.equal((await compareBuilds(write('o1.json', base), write('o2.json', base))).status, 'zero');
  const reordered = await compareBuilds(write('o3.json', base), write('o4.json', { ...base, materials: [rows[2], rows[0], rows[1]] }));
  assert.equal(reordered.status, 'differs');
  assert.deepEqual(reordered.differences.map((d) => [d.record, d.field, d.before, d.after]), [['materials', '(order)', 'position 1: M1', 'position 1: M3']]);
  const twice = await compareBuilds(write('o5.json', base), write('o6.json', { ...base, materials: [...rows, rows[0]] }));
  assert.equal(twice.status, 'differs');
  assert.ok(twice.differences.some((d) => d.field === '(duplicate ids)' && d.after === 'M1'), JSON.stringify(twice.differences));
});

test('a build that cannot finish is a BuildFailed, with the build\'s own words, not an empty database', async () => {
  const broken = join(scratch, 'broken-tables');
  cpSync(tables, broken, { recursive: true });
  const text = readFileSync(join(broken, 'materials.csv'), 'utf8');
  writeFileSync(join(broken, 'materials.csv'), text.replace('MaterialID,Original name', 'MaterialID,Renamed column'));
  await assert.rejects(buildInCopy({ label: 'broken tables', tablesDir: broken, pages: false }), (e) => e instanceof BuildFailed && /broken tables/.test(e.message) && /exited/.test(e.message));
});
