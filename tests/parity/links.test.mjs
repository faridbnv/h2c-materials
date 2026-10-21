// The historic-link corpus: pinned, harvested from real places, opened by both decoders, and able to fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { copyEngine } from '../../packages/parity/src/engine-copy.ts';
import { faultByName } from '../../packages/parity/src/faults.ts';
import { digestOfLinks, hashesInPages, historicLinks, linkRequest } from '../../packages/parity/src/historic-links.ts';
import { linkUnits, runLinks } from '../../packages/parity/src/links.ts';
import { createOld, createOldAdapter, readDb } from '../../packages/parity/src/old-adapter.ts';
import { readPages } from '../../packages/parity/src/p-pages.ts';
import { root } from './helpers.mjs';

const { TEMPLATES } = await import(pathToFileURL(join(root, 'app/js/ui/templates.js')).href);
const links = historicLinks(TEMPLATES);
const units = linkUnits(links, []);

// Pinned: a change to a link, an added link or a dropped one fails here. The corpus is code (parity/corpus/** needs the owner's attest).
const PINNED_LINKS_DIGEST = 'sha256:e8e5dbbfcf1f450c0412583ac404798ec426687e8d90252470a6ab13db023dc2';

test('the historic-link corpus is pinned: 53 links, 6 templates in two key shapes among them', () => {
  assert.equal(digestOfLinks(links), PINNED_LINKS_DIGEST, 'the harvested link corpus changed; if on purpose, re-pin it in this test and say why in the PR');
  assert.equal(links.length, 53);
  assert.equal(links.filter((l) => l.id.startsWith('hash/template-v1/')).length, 6);
  assert.equal(links.filter((l) => l.id.startsWith('hash/template-v2/')).length, 6);
  assert.equal(new Set(links.map((l) => l.id)).size, links.length);
  for (const l of links) assert.ok(l.source && l.note !== undefined, `${l.id} names where it was found`);
});

test('every harvested link names a place that exists, and the docs files it reads still have the bytes pinned', () => {
  for (const l of links) {
    const file = /^((?:test|docs|app|scripts)\/[^:\s(]+)/.exec(l.source)?.[1];
    if (file) assert.ok(existsSync(join(root, file)), `${l.id}: ${file} is where it was found`);
    if (l.read) assert.doesNotThrow(() => linkRequest(l), l.id);
  }
});

test('an edited docs file is refused loudly, not read silently', () => {
  const doc = links.find((l) => l.read);
  assert.ok(doc);
  const moved = { ...doc, read: { ...doc.read, sha256: '0'.repeat(64) } };
  assert.throws(() => linkRequest(moved), /changed .* re-harvest/);
});

test('the old decoder does with every harvested link what the corpus says (opened, empty or refused)', async () => {
  const old = await createOld(readDb());
  const seen = { opened: 0, empty: 0, refused: 0 };
  for (const u of units) {
    const o = old.openLink(u.request);
    assert.equal(o.outcome, u.expect, `${u.id}: ${o.outcome} ${o.message ?? ''}`);
    seen[o.outcome]++;
  }
  assert.ok(seen.opened >= 35 && seen.refused >= 7 && seen.empty === 1, JSON.stringify(seen));
});

test('the refusals carry the words a person sees', async () => {
  const old = await createOld(readDb());
  const say = (id) => old.openLink(units.find((u) => u.id === id).request).message;
  assert.match(say('hash/damaged'), /damaged or incomplete/);
  assert.match(say('file/version-3'), /version 3/);
  assert.match(say('file/not-json'), /not valid JSON/);
  assert.match(say('file/no-version'), /no scenario version/);
});

test('the known x:3 quirk is ported as it is: a link with x:3 opens as version 1 (listed, not fixed)', async () => {
  const old = await createOld(readDb());
  const o = old.openLink(units.find((u) => u.id === 'hash/x3-reads-as-v1').request);
  assert.equal(o.outcome, 'opened');
});

test('the back-links on the built pages are the links to the selector, not in-page anchors, and every one opens', async () => {
  const pages = readPages(join(root, 'dist', 'materials'), 'pages', { release: '', build: '' });
  const hashes = hashesInPages(pages.html);
  assert.ok(hashes.length >= 80 && hashes.length <= 90, `${hashes.length} distinct back-links (one per page that carries one)`);
  const old = await createOld(readDb());
  for (const h of hashes) assert.equal(old.openLink({ kind: 'hash', text: h }).outcome, 'opened', h.slice(0, 80));
  const anchors = new Map([['x.html', '<a href="M001.html#sources">s</a> <a href="../H2C_Material_Selector_2026-09-21_aaaaaaaaaaaa.html#%7B%7D">back</a> <a href="M001-products.html#G001-101">g</a>']]);
  assert.deepEqual(hashesInPages(anchors), ['%7B%7D'], 'an in-page anchor is not a scenario');
  assert.deepEqual(hashesInPages(new Map([['x.html', '<p>no links</p>']])), []);
});

test('a page link that does not open is a difference against the expectation that every back-link opens', async () => {
  const old = await createOld(readDb());
  const bad = linkUnits([], ['%7Bbroken']);
  assert.equal(bad[0].expect, 'opened');
  const run = await runLinks({ units: bad, before: old, after: old });
  assert.equal(run.openings.status, 'differs');
  assert.equal(run.openings.differences[0].field, 'harvested expectation (the baseline decoder)');
});

test('old against a second copy of old: every link opens identically, and the questions they ask are answered identically', async () => {
  const run = await runLinks({ units, before: await createOld(readDb()), after: await createOldAdapter({ name: 'copy', db: readDb(), engineDir: copyEngine([]) }) });
  assert.equal(run.openings.status, 'zero');
  assert.equal(run.openings.unitsCompared, units.length);
  assert.ok(run.replayCases >= 10, `${run.replayCases} distinct questions`);
  assert.equal(run.replay.status, 'zero');
});

test('a decoder that changes a warning, or reads x:3 differently, is named', async () => {
  const old = await createOld(readDb());
  const tweaked = {
    name: 'tweaked decoder', evaluate: (c) => old.evaluate(c),
    openLink(req) {
      const o = old.openLink(req);
      if (o.outcome !== 'opened') return o;
      const warnings = JSON.parse(o.facts.wording.warnings.text);
      return { ...o, facts: { ...o.facts, wording: { warnings: { ...o.facts.wording.warnings, text: JSON.stringify([...warnings, 'a new warning']) } } } };
    },
  };
  const run = await runLinks({ units, before: old, after: tweaked });
  assert.equal(run.openings.status, 'differs');
  assert.ok(run.openings.differences.every((d) => d.field === 'warnings' && d.tier === 'wording'));
  assert.equal(run.openings.differenceCount, units.filter((u) => u.expect === 'opened').length);
});

test('a side that opens a refused link, or refuses an opened one, differs on the decision', async () => {
  const old = await createOld(readDb());
  const lax = { name: 'lax decoder', evaluate: (c) => old.evaluate(c), openLink: (req) => (req.text === '%7Bbroken' ? { outcome: 'empty' } : old.openLink(req)) };
  const run = await runLinks({ units, before: old, after: lax });
  assert.equal(run.openings.status, 'differs');
  assert.deepEqual(run.openings.differences.map((d) => [d.case, d.tier, d.field]), [['hash/damaged', 'decision', 'outcome'], ['hash/damaged', 'wording', 'message']]);
});

test('a side that cannot open links is not computable, never zero', async () => {
  const old = await createOld(readDb());
  const blind = { name: 'blind', evaluate: (c) => old.evaluate(c) };
  const run = await runLinks({ units, before: old, after: blind });
  assert.equal(run.openings.status, 'not-computable');
  assert.equal(run.openings.unitsCompared, 0);
  const crashing = { name: 'crashing', evaluate: (c) => old.evaluate(c), openLink: () => ({ outcome: 'not-computable', reason: 'boom' }) };
  assert.equal((await runLinks({ units: units.slice(0, 3), before: old, after: crashing })).openings.status, 'not-computable');
});

test('a fault in the engine moves the answers to the questions the links ask', async () => {
  const f = faultByName('gate-precedence');
  const run = await runLinks({ units, before: await createOld(readDb()), after: await createOldAdapter({ name: 'fault', db: readDb(), engineDir: copyEngine(f.patches) }) });
  assert.equal(run.openings.status, 'zero', 'the decoder is untouched by an engine fault');
  assert.equal(run.replay.status, 'differs');
  assert.ok(run.replay.differences.length > 0);
});

test('a decoder that crashes (TypeError) is not a refusal: it is not computable', async () => {
  const old = await createOld(readDb());
  const engineDir = copyEngine([{ file: 'scenario.js', find: "if (!isObject(c)) throw new Error('The link does not describe a selection.');", replace: 'if (!isObject(c)) null.crash;' }]);
  const broken = await createOldAdapter({ name: 'broken decoder', db: readDb(), engineDir });
  const out = broken.openLink(units.find((u) => u.id === 'hash/not-an-object').request);
  assert.equal(out.outcome, 'not-computable');
  assert.match(out.reason, /crashed/);
  assert.equal(old.openLink(units.find((u) => u.id === 'hash/not-an-object').request).outcome, 'refused');
});

test('the real scenario.js was not edited by the crash test above', () => {
  assert.ok(readFileSync(join(root, 'app/js/engine/scenario.js'), 'utf8').includes("throw new Error('The link does not describe a selection.')"));
});
