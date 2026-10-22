// The historic-link corpus (packages/parity/src/historic-links.ts: 53 links harvested from real places, hashes and saved scenario files) opened in
// the NEW selector, and compared with the OLD one on the same data: a link that opens there opens here, shows what it showed, and a link the old
// page refuses is refused here, with nothing else changed. The old page said it with an alert, the new one in a notice (a link) or in the
// Save / share panel (a file); what is compared is that it was refused, then what the page shows. The corpus is code (parity/corpus is not touched here).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect, FULL, root } from './fixtures.mjs';
import { createNewSelector } from './lib/adapters/new-selector.mjs';
import { createOldSelector } from './lib/adapters/old-selector.mjs';

const links = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `
  const { historicLinks, linkRequest } = await import(${JSON.stringify(new URL('../../packages/parity/src/historic-links.ts', import.meta.url).href)});
  const { TEMPLATES } = await import(${JSON.stringify(new URL('../../app/js/ui/templates.js', import.meta.url).href)});
  console.log(JSON.stringify(historicLinks(TEMPLATES).map((l) => ({ id: l.id, expect: l.expect, ...linkRequest(l) }))));
`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));

/** The lens a link names, as the old decoder reads it (null where it names none, or cannot be read). */
const lensOfLink = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `
  const scenario = await import(${JSON.stringify(new URL('../../app/js/engine/scenario.js', import.meta.url).href)});
  const links = JSON.parse(process.argv[1]);
  const out = {};
  for (const l of links) {
    try {
      const read = l.kind === 'hash' ? scenario.fromHash(l.text, {}) : scenario.deserialize(l.text, {}, {});
      out[l.id] = read?.scenario?.lens ?? null;
    } catch { out[l.id] = null; }
  }
  console.log(JSON.stringify(out));
`, JSON.stringify(links)], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const lensOf = (link) => lensOfLink[link.id] ?? null;

const sample = FULL ? links : links.filter((_, i) => i % 4 === 0);

/** What a reader sees: the count, the status chips that are shown and the lens, as the views read them. */
const READ_OLD = `(() => {
  const text = (el) => (el?.innerText ?? '').replace(/[ \\t]+/g, ' ').replace(/\\n\\s*\\n+/g, '\\n').trim();
  const chips = ['s-pass', 's-unknown', 's-fail', 's-screened'].map((id) => document.getElementById(id)).filter((e) => e && !e.hidden).map(text).join(' | ');
  return ['COUNT ' + text(document.getElementById('count')), 'STATUS ' + chips, text(document.getElementById('lens'))].join('\\n');
})()`;

test('historic links: every link of the corpus opens in the new selector as it does in the old one, and a refused one is refused', async ({ browser, site, base, meta, scratch }) => {
  test.setTimeout((FULL ? 20 : 8) * 60_000);
  expect(sample.length, 'the corpus is not empty').toBeGreaterThan(10);
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const oldPage = await context.newPage();
  const newPage = await context.newPage();
  const faults = [];
  const dialogs = { old: [], new: [] };
  for (const [name, page] of [['old', oldPage], ['new', newPage]]) {
    page.on('pageerror', (e) => faults.push(`${name}: script error ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.location().url)) faults.push(`${name}: console error ${m.text()}`); });
    page.on('dialog', (d) => { dialogs[name].push(d.message()); d.accept().catch(() => {}); });
  }
  const old = createOldSelector({ page: oldPage, origin: site.origin, base, meta, root });
  const next = createNewSelector({ page: newPage, origin: site.origin, base, meta, root, scratch });
  const dir = mkdtempSync(join(tmpdir(), 'h2c-links-'));
  const differences = [];
  const opened = { old: 0, new: 0 };
  const named = [];
  try {
    for (const link of sample) {
      dialogs.old.length = 0; dialogs.new.length = 0;
      // A fresh document each time: a link that differs from the last only in its fragment is applied to the page as it stands, with its notices.
      await oldPage.goto('about:blank');
      await newPage.goto('about:blank');
      let oldRead, newRead, newRefused;
      if (link.kind === 'hash') {
        await old.open(`${old.pageUrl}#${link.text}`);
        await next.open(`${next.pageUrl}#${link.text}`);
        oldRead = await old.evaluate(READ_OLD);
        newRead = await next.readView();
        newRefused = (await newPage.locator('[data-testid="notice-text"]').allInnerTexts()).some((t) => /^This link could not be read/.test(t));
      } else {
        const file = join(dir, `${link.id.replace(/[^a-z0-9]+/gi, '-')}.json`);
        writeFileSync(file, link.text);
        await old.open(old.pageUrl);
        await next.open(next.pageUrl);
        // The old page's panel and its file input.
        const chooser = oldPage.waitForEvent('filechooser', { timeout: 5000 });
        chooser.catch(() => {});
        await old.evaluate(`document.getElementById('btn-scenario').click(); document.getElementById('sc-import').click(); true`);
        await (await chooser).setFiles(file);
        await oldPage.waitForTimeout(700);
        oldRead = await old.evaluate(READ_OLD);
        await newPage.locator('[data-testid="save-share"]').click();
        await newPage.locator('[data-testid="file-input"]').setInputFiles(file);
        await newPage.waitForTimeout(700);
        newRefused = (await newPage.locator('[data-testid="import-problem"]').count()) > 0;
        if (newRefused) await newPage.keyboard.press('Escape'); else await next.settle();
        newRead = await next.readView();
      }
      if (link.expect === 'refused') {
        if (!newRefused) differences.push(`${link.id}: the corpus says it is refused, and the new page did not refuse it`);
        if (!dialogs.old.length) differences.push(`${link.id}: the corpus says it is refused, and the old page did not (reference for the comparison)`);
      } else {
        opened[link.expect === 'opened' ? 'new' : 'old']++;
        if (newRefused) differences.push(`${link.id}: the corpus says it opens, and the new page refused it`);
      }
      // A link that names a lens the new selector does not draw yet (the Ashby lens and its kin, WP-27) opens on the table: it is read, never refused,
      // and what it shows is the table's. The old page shows the lens it names, so the two are not compared.
      const lens = lensOf(link);
      if (lens && !['table', 'explain'].includes(lens)) { named.push(`${link.id} (${lens})`); continue; }
      if (oldRead !== newRead) {
        const a = oldRead.split('\n'), b = newRead.split('\n');
        const at = a.findIndex((line, i) => line !== b[i]);
        differences.push(`${link.id}: shows other than the old page (first difference at line ${at + 1}: "${(a[at] ?? '').slice(0, 100)}" against "${(b[at] ?? '').slice(0, 100)}")`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
    await context.close();
  }
  expect(faults, `the pages raised errors:\n  ${faults.join('\n  ')}`).toEqual([]);
  expect(differences, `${differences.length} link(s) differ:\n  ${differences.join('\n  ')}`).toEqual([]);
  expect(opened.new, 'some link opened').toBeGreaterThan(0);
  test.info().annotations.push({ type: 'links-opened', description: `${sample.length} links read, ${named.length} named a lens WP-27 draws: ${named.join(', ')}` });
});
