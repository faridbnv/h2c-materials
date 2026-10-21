// The private-material scan (remake/tools/private-scan.mjs; pack 02 section 10; must-not-change S11-13 and S06-21).
// A clean site passes. Each kind of private material fails, by name and by content, in a folder and in a zip. Where the
// scan cannot look (a symbolic link, an unreadable zip entry, an empty site) it fails: it never reports a pass for what it
// did not see. preview-assemble runs it at the end of `inject` and `stage`, so the deploy fails closed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';
import { ALLOWED_EXTENSIONS, ALLOWED_NAMES, assertClean, checkPath, describe, scanPath, scanTree, scanZip } from '../../remake/tools/private-scan.mjs';
import { inject, stage } from '../../remake/tools/preview-assemble.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tool = join(root, 'remake/tools/private-scan.mjs');
const SHA = 'a'.repeat(40);
const OLD_SHA = 'b'.repeat(40);

const made = [];
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'h2c-scan-')); made.push(d); return d; };
test.after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });

const PAGE = '<!doctype html><html><head><title>t</title></head><body>x</body></html>';
const put = (dir, rel, content) => { const p = join(dir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); return p; };

/** A site with one file of every allowed kind, the two named exceptions, and nothing else. */
function cleanSite(release = 'abcdef012345') {
  const site = tmp();
  put(site, 'index.html', PAGE);
  put(site, 'materials/M001.html', PAGE);
  put(site, 'manifest.json', JSON.stringify({ release, snapshot: '2026-01-01' }));
  put(site, 'assets/app.css', 'body{margin:0}.workspace{display:grid}');
  put(site, 'assets/app.js', 'var a={};a.cache=a.cache||{};var h=a.cache/2;var ctx={contextLayer:1,pageText:"x"};');
  put(site, 'assets/app.js.map', '{"version":3}');
  put(site, 'assets/logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
  put(site, 'assets/pic.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]));
  put(site, 'assets/font.woff2', Buffer.from('wOF2....'));
  put(site, 'favicon.ico', Buffer.from([0, 0, 1, 0, 0, 0]));
  put(site, 'notes.txt', 'The first layer cannot be squeezed too much.');
  put(site, 'validation-report.md', '# report');
  put(site, '.nojekyll', '');
  return site;
}

const rulesOf = (result) => [...new Set(result.findings.map((f) => f.rule))].sort();

test('a clean site passes, with every allowed kind in it and the two named exceptions', () => {
  const r = scanTree(cleanSite());
  assert.deepEqual(r.findings, []);
  assert.equal(r.files, 13);
  assert.equal(assertClean(r), r);
});

test('prose and bundled code that only look like markers are not findings (squeezed, contextLayer, .workspace, a.cache/2)', () => {
  const site = tmp();
  put(site, 'index.html', PAGE);
  put(site, 'a.js', 'x.cache/2;var q={contextLayer:1};if(a.cache){}');
  put(site, 'b.css', '.workspace .topbar{color:red}');
  put(site, 'c.json', '{"text":"the first layer cannot be squeezed too much","name":"H2C_Material_Selector"}');
  assert.deepEqual(scanTree(site).findings, []);
});

test('the allow-list is the one the plan names, and the two exceptions are exact names', () => {
  assert.deepEqual([...ALLOWED_EXTENSIONS].sort(), ['.css', '.html', '.ico', '.js', '.json', '.map', '.png', '.svg', '.txt', '.woff2']);
  assert.deepEqual([...ALLOWED_NAMES].sort(), ['.nojekyll', 'validation-report.md']);
  assert.deepEqual(checkPath('other-report.md').map((f) => f.rule), ['extension']);
  assert.deepEqual(checkPath('deep/validation-report.md'), [], 'the named exception holds wherever the file sits, as in previous/<release>/');
});

// Each case adds one thing to a clean site and expects the named rule, and only a finding of that rule's family.
const FORBIDDEN = [
  ['a .cache folder', '.cache/text/abc.json', '{}', 'cache-path'],
  ['.cache/ in a page', 'extra.html', `${PAGE}<p>see .cache/text/ab.json</p>`, 'cache-path'],
  ['a .workspace folder', '.workspace/state.json', '{}', 'workspace-path'],
  ['private.sqlite named in text', 'extra.json', '{"db":"private.sqlite"}', 'workspace-path'],
  ['a .sqlite file', 'db/atlas.sqlite', 'x', 'database-file'],
  ['a .sqlite3 file', 'atlas.sqlite3', 'x', 'database-file'],
  ['a .db file', 'atlas.db', 'x', 'database-file'],
  ['a database under another name', 'extra.json', Buffer.from('SQLite format 3\0rest'), 'database-file'],
  ['a PDF', 'doc.pdf', '%PDF-1.7 x', 'source-original'],
  ['a PDF under another name', 'extra.txt', '%PDF-1.7 x', 'source-original'],
  ['a source file named by its digest', `${'0123456789abcdef'.repeat(4)}.html`, PAGE, 'source-original'],
  ['a by-sha folder', 'sources/by-sha/x.json', '{}', 'source-original'],
  ['a saved copy of a web page', 'saved.html', `<!-- saved from url=(0040)https://example.com/ -->${PAGE}`, 'source-original'],
  ['PACKETS.md', 'PACKETS.md', '#', 'packet-name'],
  ['a packet folder', 'packets/round-1.json', '{}', 'packet-name'],
  ['a file named for a packet', 'round-12-packet.json', '{}', 'packet-name'],
  ['PACKETS.csv named in text', 'extra.json', '{"see":"PACKETS.csv"}', 'packet-name'],
  ['a proposals folder', 'proposals/b01/doc.json', '{}', 'packet-name'],
  ['an OCR sidecar key', 'extra.json', '{"sha":"x","psm":[3],"pages":[]}', 'ocr-field'],
  ['the text cache key squeezed', 'extra.json', '{"pages":[{"page":1,"lines":[],"squeezed":"a b"}]}', 'ocr-field'],
  ['a text layer key', 'extra.json', '{"textLayer":"..."}', 'ocr-field'],
  ['an escaped OCR key inside a page', 'extra.html', `${PAGE}<script>var d="{\\"ocrText\\":\\"x\\"}"</script>`, 'ocr-field'],
  ['H2C_SOURCE_BACKUP', 'extra.json', '{"env":"H2C_SOURCE_BACKUP"}', 'private-name'],
  ['H2C_DOCUMENT_CACHE in a script', 'extra.js', 'process.env.H2C_DOCUMENT_CACHE', 'private-name'],
  ['a /Users/ path', 'extra.json', '{"url":"/Users/someone/Documents/wiki/note.md"}', 'absolute-path'],
  ['a Windows user path', 'extra.json', '{"url":"C:\\\\Users\\\\someone\\\\doc.pdf"}', 'absolute-path'],
  ['a CI runner path', 'extra.js', '// /home/runner/work/repo/repo/x.js', 'absolute-path'],
  ['an extension off the list (.xlsx)', 'review.xlsx', 'x', 'extension'],
  ['an extension off the list (.md other than the report)', 'README.md', '#', 'extension'],
  ['a file with no extension', 'LICENSE', 'x', 'extension'],
  ['a .DS_Store', '.DS_Store', 'x', 'extension'],
  ['a zip in the site', 'bundle.zip', Buffer.from('PK\x03\x04....'), 'archive'],
  ['a zip under another name', 'extra.json', Buffer.from('PK\x03\x04....'), 'archive'],
];

for (const [what, rel, content, rule] of FORBIDDEN) {
  test(`fails on ${what}`, () => {
    const site = cleanSite();
    put(site, rel, content);
    const r = scanTree(site);
    assert.ok(rulesOf(r).includes(rule), `${rule} expected, got ${rulesOf(r)}`);
    assert.throws(() => assertClean(r), /private-scan: the site holds private material/);
  });
}

test('a symbolic link, an empty site, a missing path and a file in place of a folder are failures, never passes', () => {
  const linked = cleanSite();
  symlinkSync(join(linked, 'index.html'), join(linked, 'link.html'));
  assert.deepEqual(rulesOf(scanTree(linked)), ['symlink']);
  assert.deepEqual(rulesOf(scanTree(tmp())), ['empty']);
  assert.throws(() => scanPath(join(tmp(), 'nope')), /does not exist/);
  const file = put(tmp(), 'a.html', PAGE);
  assert.deepEqual(rulesOf(scanPath(file)), ['zip-error'], 'a file that is not a zip is not a site');
  assert.throws(() => scanTree(file), /not a folder/);
  const real = cleanSite();
  assert.throws(() => scanPath(join(tmp(), 'x')), /does not exist/);
  const viaLink = join(tmp(), 'site-link');
  symlinkSync(real, viaLink);
  assert.throws(() => scanPath(viaLink), /symbolic link/);
});

test('a finding names the file, the rule and a count, and never the text it matched', () => {
  const site = cleanSite();
  put(site, 'leak.json', '{"a":"/Users/secretname/Documents/x.md","b":"/Users/secretname/y.md","k":"H2C_SOURCE_BACKUP"}');
  const r = scanTree(site);
  const hit = r.findings.find((f) => f.rule === 'absolute-path');
  assert.equal(hit.path, 'leak.json');
  assert.equal(hit.count, 2);
  const text = describe(r).join('\n') + (() => { try { assertClean(r); return ''; } catch (e) { return e.message; } })();
  assert.match(text, /absolute-path: leak\.json \(2 times\)/);
  assert.doesNotMatch(text, /secretname/);
  assert.doesNotMatch(text, /Documents/);
});

test('a skipped folder and an allowed path are left out, and nothing else is', () => {
  const repo = tmp();
  put(repo, '.git/config', '[core]');
  put(repo, 'README.md', '# preview');
  put(repo, 'index.html', PAGE);
  put(repo, 'previous/111111111111/validation-report.md', '# r');
  const opts = { skip: (rel) => rel === '.git', allowPaths: ['README.md'] };
  assert.deepEqual(scanTree(repo, opts).findings, []);
  assert.ok(rulesOf(scanTree(repo)).includes('workspace-path'), 'without the skip the .git folder is a finding');
  put(repo, 'docs/README.md', '# not the exception');
  assert.deepEqual(scanTree(repo, opts).findings.map((f) => f.path), ['docs/README.md']);
});

// ---- found by the silent-failure review: ways a scan could have passed what it should refuse -----------------------------
const EVASIONS = [
  ['private text renamed .png', 'dump.png', '{"squeezed":"x","k":"H2C_SOURCE_BACKUP"}', ['ocr-field', 'private-name', 'extension']],
  ['private text renamed .woff2', 'f.woff2', 'see /Users/someone/x', ['absolute-path', 'extension']],
  ['private text renamed .ico', 'f.ico', '.cache/text/a', ['cache-path', 'extension']],
  ['UTF-16LE text (a PowerShell redirect)', 'n.txt', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('H2C_SOURCE_BACKUP /Users/someone/.cache/x "squeezed":', 'utf16le')]), ['private-name', 'absolute-path', 'cache-path', 'ocr-field']],
  ['UTF-16BE text', 'n.txt', Buffer.from('\0H\0 \0/\0U\0s\0e\0r\0s\0/\0a\0/\0', 'latin1'), ['absolute-path']],
  ['a /Users name with no slash after it', 'a.json', '{"u":"/Users/farid"}', ['absolute-path']],
  ['a /Users name that is not ASCII', 'a.json', '{"u":"/Users/José/x"}', ['absolute-path']],
  ['a JSON-escaped /Users path', 'a.json', '{"u":"\\/Users\\/farid\\/x"}', ['absolute-path']],
  ['a single-word H2C_ name', 'a.json', 'H2C_ROOT H2C_TOKEN', ['private-name']],
  ['a numbered packet folder', 'packet-02/notes.txt', 'hi', ['packet-name']],
  ['a dated proposals folder', 'proposals-2026/a.json', '{}', ['packet-name']],
  ['a PDF after a few bytes of junk', 'a.txt', '\n%PDF-1.4 hi', ['source-original']],
  ['a PDF behind a png name', 'b.png', '\n%PDF-1.4 hi', ['source-original', 'extension']],
  ['a PDF as base64 in a json', 'a.json', '{"d":"JVBERi0xLjQK"}', ['source-original']],
];
for (const [what, rel, content, rules] of EVASIONS) {
  test(`fails on ${what}`, () => {
    const site = cleanSite();
    put(site, rel, content);
    const r = scanTree(site);
    for (const rule of rules) assert.ok(rulesOf(r).includes(rule), `${rule} expected, got ${rulesOf(r)}`);
  });
}

test('a real png, woff2 and ico, and a lower-case word that only starts like a folder name, are still clean', () => {
  const site = cleanSite();
  put(site, 'readme-notes/page.txt', 'x');
  put(site, 'ocrmypdf-docs/page.txt', 'x');
  assert.deepEqual(scanTree(site).findings, []);
});

test('a zip whose end record undercounts its entries is refused, not read short', () => {
  const buf = makeZip([{ name: 'index.html', data: PAGE }, { name: '.cache/secret.html', data: PAGE }]);
  const eocd = buf.length - 22;
  assert.equal(buf.readUInt32LE(eocd), 0x06054b50);
  buf.writeUInt16LE(1, eocd + 8); buf.writeUInt16LE(1, eocd + 10);
  const file = join(tmp(), 'short.zip'); writeFileSync(file, buf);
  assert.deepEqual(rulesOf(scanZip(file)), ['zip-error']);
});

test('the command line refuses to be silent: run through a symbolic link to the tools folder it still scans and fails', () => {
  const dirty = tmp();
  put(dirty, '.cache/a.html', PAGE);
  const link = join(tmp(), 'tools-link');
  symlinkSync(dirname(tool), link);
  const r = spawnSync(process.execPath, [join(link, 'private-scan.mjs'), dirty], { encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /private-scan: FAIL/);
});

// ---- zip ------------------------------------------------------------------------------------------------------------
/** A zip writer for the tests: stored or deflated entries, with the flags a test needs to break. */
function makeZip(entries) {
  const locals = [], central = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name);
    const raw = Buffer.from(e.data ?? '');
    const method = e.method ?? 8;
    const body = method === 8 ? deflateRawSync(raw) : raw;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(e.flags ?? 0, 6); local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc32(raw), 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(name.length, 26);
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0); head.writeUInt16LE(0x031e, 4); head.writeUInt16LE(20, 6); head.writeUInt16LE(e.flags ?? 0, 8); head.writeUInt16LE(method, 10);
    head.writeUInt32LE(crc32(raw), 16); head.writeUInt32LE(body.length, 20); head.writeUInt32LE(raw.length, 24); head.writeUInt16LE(name.length, 28);
    head.writeUInt32LE(((e.mode ?? 0o100644) << 16) >>> 0, 38); head.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    central.push(head, name);
    offset += 30 + name.length + body.length;
  }
  const dir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}
const zipFile = (entries) => { const f = join(tmp(), 'site.zip'); writeFileSync(f, makeZip(entries)); return f; };
const CLEAN_ENTRIES = [
  { name: 'index.html', data: PAGE }, { name: 'materials/M001.html', data: PAGE, method: 0 }, { name: 'manifest.json', data: '{"release":"abcdef012345"}' },
  { name: 'assets/', data: '', method: 0 }, { name: 'validation-report.md', data: '# r' },
];

test('a clean zip passes, entries stored or deflated', () => {
  const r = scanZip(zipFile(CLEAN_ENTRIES));
  assert.deepEqual(r.findings, []);
  assert.equal(r.files, 4);
});

const ZIP_CASES = [
  ['a .cache entry', { name: '.cache/text/x.json', data: '{}' }, 'cache-path'],
  ['private text in a deflated entry', { name: 'extra.json', data: '{"k":"H2C_SOURCE_BACKUP","u":"/Users/a/b.md"}' }, 'private-name'],
  ['an OCR key in a stored entry', { name: 'extra.json', data: '{"squeezed":"x"}', method: 0 }, 'ocr-field'],
  ['a PDF entry', { name: 'sheet.pdf', data: '%PDF-1.4' }, 'source-original'],
  ['a database entry', { name: 'atlas.sqlite', data: 'x' }, 'database-file'],
  ['a nested zip', { name: 'inner.zip', data: 'PK\x03\x04....' }, 'archive'],
  ['an entry off the allow-list', { name: 'data.csv', data: 'a,b' }, 'extension'],
  ['a path that leaves the site', { name: '../evil.html', data: PAGE }, 'unsafe-name'],
  ['a symbolic link entry', { name: 'link.html', data: 'index.html', mode: 0o120777 }, 'symlink'],
  ['an encrypted entry', { name: 'secret.json', data: '{}', flags: 1 }, 'zip-error'],
  ['a compression method the scan cannot read', { name: 'b.json', data: '{}', method: 12 }, 'zip-error'],
];
for (const [what, entry, rule] of ZIP_CASES) {
  test(`a zip fails on ${what}`, () => {
    const r = scanZip(zipFile([...CLEAN_ENTRIES, entry]));
    assert.ok(rulesOf(r).includes(rule), `${rule} expected, got ${rulesOf(r)}`);
  });
}

test('a damaged, truncated, empty or not-a-zip file is a failure', () => {
  const good = makeZip(CLEAN_ENTRIES);
  const cut = join(tmp(), 'cut.zip'); writeFileSync(cut, good.subarray(0, good.length - 30));
  assert.deepEqual(rulesOf(scanZip(cut)), ['zip-error']);
  const junk = join(tmp(), 'junk.zip'); writeFileSync(junk, 'this is not a zip at all, but it is long enough to be searched');
  assert.deepEqual(rulesOf(scanZip(junk)), ['zip-error']);
  assert.deepEqual(rulesOf(scanZip(zipFile([]))), ['empty']);
  const bad = Buffer.from(good); bad.writeUInt32LE(0xdeadbeef, 0);
  const badFile = join(tmp(), 'bad.zip'); writeFileSync(badFile, bad);
  assert.ok(rulesOf(scanZip(badFile)).includes('zip-error'), 'a damaged local header');
});

// ---- the command line -----------------------------------------------------------------------------------------------
const run = (...args) => spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' });

test('command line: 0 clean, 1 findings (listed, no matched text), 2 when the scan could not run', () => {
  const clean = cleanSite();
  const ok = run(clean);
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /private-scan: OK .*13 file\(s\)/);
  const dirty = cleanSite();
  put(dirty, 'x.json', '{"u":"/Users/secretname/a.md"}');
  const bad = run(dirty, zipFile(CLEAN_ENTRIES));
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /private-scan: FAIL .*1 finding/);
  assert.match(bad.stderr, /absolute-path: x\.json/);
  assert.doesNotMatch(bad.stderr + bad.stdout, /secretname/);
  assert.match(bad.stdout, /OK .*site\.zip/, 'every argument is scanned');
  for (const args of [[], ['--help'], [join(tmp(), 'missing')]]) {
    const r = run(...args);
    assert.equal(r.status, 2, args.join(' '));
    assert.match(r.stderr, /NOT RUN/);
  }
  assert.equal(run(tmp()).status, 1, 'an empty site fails');
});

// ---- the preview deploy fails closed ---------------------------------------------------------------------------------
function previewSite(release = 'abcdef012345') {
  const site = cleanSite(release);
  return site;
}

test('inject fails closed: private material in the site stops the deploy, and a clean site goes through', () => {
  const ok = previewSite();
  assert.equal(inject(ok, { remake: SHA, main: OLD_SHA }).release, 'abcdef012345');
  for (const [rel, content] of [['.cache/x.json', '{}'], ['materials/leak.json', '{"u":"/Users/a/b.md"}'], ['sheet.pdf', '%PDF-1.4'], ['atlas.sqlite', 'x']]) {
    const site = previewSite();
    put(site, rel, content);
    assert.throws(() => inject(site, { remake: SHA, main: OLD_SHA }), /private-scan: the preview site holds private material/, rel);
  }
});

test('stage fails closed too: the tree about to be pushed is scanned, previous/ included, and the repository .git and README.md are not the site', () => {
  const repo = tmp();
  mkdirSync(join(repo, '.git'));
  put(repo, '.git/HEAD', 'ref: refs/heads/main');
  put(repo, 'README.md', '# the preview repository');
  const deploy = (release) => { const site = previewSite(release); inject(site, { remake: SHA, main: OLD_SHA }); return stage(site, repo); };
  deploy('111111111111');
  deploy('222222222222');
  assert.ok(existsSync(join(repo, 'README.md')) && readdirSync(join(repo, 'previous')).includes('111111111111'));
  // The release did not change, so previous/ stays as it is; a leak sitting in it is still caught.
  put(repo, 'previous/111111111111/dump.json', '{"squeezed":"x"}');
  assert.throws(() => deploy('222222222222'), /private-scan: the staged preview repository holds private material/);
  rmSync(join(repo, 'previous/111111111111/dump.json'));
  deploy('222222222222');
});

// ---- the real build ---------------------------------------------------------------------------------------------------
test('the files the preview workflow publishes from a real build are clean (index, release page, manifest, validation report, material pages)', () => {
  const dist = join(root, 'dist');
  if (!existsSync(join(dist, 'manifest.json'))) {
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' });
    assert.equal(build.status, 0, `npm run build failed:\n${build.stderr}`);
  }
  const site = tmp();
  for (const f of readdirSync(dist).filter((n) => /^H2C_Material_Selector_.*\.html$/.test(n))) { copyFileSync(join(dist, f), join(site, f)); copyFileSync(join(dist, f), join(site, 'index.html')); }
  copyFileSync(join(root, 'build/reports/validation-report.md'), join(site, 'validation-report.md'));
  copyFileSync(join(dist, 'manifest.json'), join(site, 'manifest.json'));
  cpSync(join(dist, 'materials'), join(site, 'materials'), { recursive: true });
  writeFileSync(join(site, '.nojekyll'), '');
  const r = scanTree(site);
  assert.deepEqual(r.findings.map((f) => `${f.rule}: ${f.path}`), []);
  assert.ok(r.files > 200, `${r.files} files`);
});
