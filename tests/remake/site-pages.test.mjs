// WP-25: the 404 page and the redirect stubs (remake/tools/site-pages.mjs), run against stand-ins for the browser's location and
// document. The page itself, served by the browser suite's Pages-like server under both base paths, is tests/browser/delivery.spec.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NOT_FOUND_HTML, recordsStubHtml, selectorStubHtml, writeStubs } from '../../remake/tools/site-pages.mjs';

const scriptOf = (html) => {
  const m = /<script>([^]*?)<\/script>/.exec(html);
  assert.ok(m, 'the page carries an inline script');
  return m[1];
};

/** Run the page's script at an address; returns the link it set and where it sent the browser. */
function visit(html, { pathname, search = '', hash = '' }) {
  const anchor = { href: './' };
  const went = [];
  const location = { pathname, search, hash, replace: (to) => went.push(to) };
  new Function('location', 'document', scriptOf(html))(location, { getElementById: (id) => (id === 'home' ? anchor : null) });
  return { home: anchor.href, went };
}

test('404.html is self-contained: one inline style, one inline script, nothing from the site, nothing external', () => {
  assert.doesNotMatch(NOT_FOUND_HTML, /<script[^>]*\ssrc=/);
  assert.doesNotMatch(NOT_FOUND_HTML, /<link\b/i);
  assert.doesNotMatch(NOT_FOUND_HTML, /(?:src|href)=["'](?:https?:)?\/\//i, 'no external address');
  assert.doesNotMatch(NOT_FOUND_HTML, /url\(/i, 'no external asset in the style');
  assert.equal((NOT_FOUND_HTML.match(/<style>/g) ?? []).length, 1);
  assert.match(NOT_FOUND_HTML, /<title>Page not found/);
  assert.match(NOT_FOUND_HTML, /<a id="home" href=".\/">/, 'without its script the link stands relative to the missing address');
});

test('404.html finds the site root from the first segment of its own address, at depths 1, 2 and 3, under two base paths', () => {
  for (const base of ['h2c-materials', 'h2c-material-temp-page']) {
    for (const rest of ['nothing.html', 'a/nothing.html', 'a/b/nothing.html', 'materials/M999.html', 'v3/data/x/missing.json']) {
      const { home, went } = visit(NOT_FOUND_HTML, { pathname: `/${base}/${rest}` });
      assert.equal(home, `/${base}/`, `/${base}/${rest}`);
      assert.deepEqual(went, []);
    }
  }
  assert.equal(visit(NOT_FOUND_HTML, { pathname: '/' }).home, './', 'at a root the relative link stands');
  assert.equal(visit(NOT_FOUND_HTML, { pathname: '/nothing.html' }).home, './', 'one segment that names a file is at the root');
  assert.equal(visit(NOT_FOUND_HTML, { pathname: '/h2c-materials/' }).home, '/h2c-materials/');
});

test('404.html sends an old release-stamped selector address to the selector, keeping the search and the hash (a scenario lives there)', () => {
  const hash = '#x=2&c=%5B%5D';
  for (const base of ['h2c-materials', 'h2c-material-temp-page']) {
    const { went } = visit(NOT_FOUND_HTML, { pathname: `/${base}/H2C_Material_Selector_2026-09-21_7c6da496722d.html`, search: '?from=1', hash });
    assert.deepEqual(went, [`/${base}/?from=1${hash}`]);
  }
  assert.deepEqual(visit(NOT_FOUND_HTML, { pathname: '/h2c-materials/H2C_Material_Selector_2025-01-01_aaaaaaaaaaaa.html' }).went, ['/h2c-materials/']);
  assert.deepEqual(visit(NOT_FOUND_HTML, { pathname: '/h2c-materials/nothing.html', hash }).went, [], 'any other missing address stays on the 404 page');
});

test('404.html sends a missing records page to its material\'s Products page, a finder address going where it names', () => {
  const at = (hash, base = 'h2c-materials') => visit(NOT_FOUND_HTML, { pathname: `/${base}/materials/M012-records.html`, hash }).went;
  assert.deepEqual(at(''), ['/h2c-materials/materials/M012-products.html']);
  assert.deepEqual(at('#V000123'), ['/h2c-materials/materials/M012-products.html#V000123']);
  assert.deepEqual(at('#product=G012-04'), ['/h2c-materials/materials/M012-products.html#G012-04']);
  assert.deepEqual(at('#type=documents'), ['/h2c-materials/materials/M012.html#sources']);
  assert.deepEqual(at('', 'h2c-material-temp-page'), ['/h2c-material-temp-page/materials/M012-products.html']);
  assert.deepEqual(visit(NOT_FOUND_HTML, { pathname: '/h2c-materials/other/M012-records.html' }).went, [], 'only under materials/');
});

test('the selector stub goes to the site root and keeps the hash; the records stub reads the finder address as the old one did', () => {
  const html = selectorStubHtml();
  const run = (script, location) => new Function('location', script)(location);
  const went = [];
  run(scriptOf(html), { search: '?a=1', hash: '#x=2', replace: (to) => went.push(to) });
  assert.deepEqual(went, ['./?a=1#x=2']);
  assert.match(html, /<meta http-equiv="refresh" content="1; url=\.\/">/, 'and without a script, a refresh to the root');
  const records = recordsStubHtml('M007');
  const to = (hash) => { const out = []; run(scriptOf(records), { hash, replace: (t) => out.push(t) }); return out[0]; };
  assert.equal(to(''), 'M007-products.html');
  assert.equal(to('#V000042'), 'M007-products.html#V000042');
  assert.equal(to('#doc=S-X'), 'M007.html#sources');
  assert.throws(() => recordsStubHtml('../x'), /not a material ID/);
});

test('writeStubs writes a stub per name and never replaces a page the site already has', () => {
  const site = mkdtempSync(join(tmpdir(), 'h2c-stubs-'));
  mkdirSync(join(site, 'materials'));
  writeFileSync(join(site, 'materials', 'M002-records.html'), 'the generator\'s own stub');
  const written = writeStubs(site, { selectorNames: ['H2C_Material_Selector_2026-09-21_7c6da496722d.html'], recordsFor: ['M001', 'M002'] });
  assert.deepEqual(written, ['H2C_Material_Selector_2026-09-21_7c6da496722d.html', 'materials/M001-records.html']);
  assert.equal(readFileSync(join(site, 'materials', 'M002-records.html'), 'utf8'), 'the generator\'s own stub');
  assert.ok(existsSync(join(site, 'materials', 'M001-records.html')));
  assert.deepEqual(writeStubs(site, { selectorNames: ['H2C_Material_Selector_2026-09-21_7c6da496722d.html'] }), [], 'a second run writes nothing');
  assert.throws(() => writeStubs(site, { selectorNames: ['../index.html'] }), /not a release-stamped selector name/);
});
