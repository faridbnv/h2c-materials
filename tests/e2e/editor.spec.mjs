// WP-13 exit evidence: the correction journey in a browser, on fixtures. Find a product; open its source page beside the record;
// correct a value with a reason and a quote the service finds on the page; see which answers would move (or that the preview is not
// available yet); see a stale edit without losing what was typed; restart with the draft intact; see a conflict after the data moved;
// prepare a review into the sandbox export folder and nothing under data/. Each service is the real one, started as `npm run editor`
// starts it, on a sandbox workspace and a small private store in the real store's layout.
import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { columnIndex, copyData, editRecords, realData, realRecords } from '../remake/data-helpers.mjs';
import { QUOTE, SOURCE, makeStore } from '../remake/editor-helpers.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const manifestDigest = () => createHash('sha256').update(readFileSync(join(realData, 'manifest.json'))).digest('hex');

/** Start the service as a person would, wait for its ready line, and give back its address and how long it took. */
function launch({ script = 'apps/editor/server/start.ts', args }) {
  const child = spawn(process.execPath, [join(root, script), ...args], {
    cwd: root, env: { ...process.env, H2C_SOURCE_BACKUP: '', H2C_DOCUMENT_CACHE: '' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errors = '';
  child.stderr.on('data', (chunk) => { errors += chunk; });
  return new Promise((resolve, reject) => {
    let out = '';
    child.stdout.on('data', (chunk) => {
      out += chunk;
      const line = out.split('\n').find((l) => l.startsWith('{'));
      if (line === undefined) return;
      const ready = JSON.parse(line);
      resolve({
        url: ready.launchUrl, readyMs: ready.readyMs,
        stop: () => new Promise((done) => { child.once('exit', done); child.kill('SIGTERM'); }),
      });
    });
    child.once('exit', (code) => reject(new Error(`the editor exited (${code}) before it was ready:\n${errors}`)));
  });
}

const editor = (workspace, store, extra = []) => launch({ args: ['--no-build', '--ready-line', '--workspace', workspace, '--source-store', store, ...extra] });

const find = async (page, text, maker) => {
  await page.getByLabel('Maker, product or material').fill(text);
  await page.getByRole('list', { name: 'Products found' }).getByRole('button', { name: new RegExp(maker) }).first().click();
};
const openDensity = async (page) => {
  await find(page, 'ecomax pla', '3DXTECH');
  await page.getByRole('button', { name: 'Open Density (V000001) beside its source' }).click();
  await expect(page.getByRole('heading', { name: 'Correct Density' })).toBeVisible();
};
/** The whole correction as a person does it: the new value, the line on the page as the quote, a reason, save. */
const correctDensity = async (page) => {
  await page.getByLabel('New printed value').fill('1.25');
  await expect(page.getByLabel('Its number')).toHaveValue('1.25');
  await expect(page.getByLabel('Normalized value')).toHaveValue('1250');
  await page.getByRole('list', { name: 'Source page' }).getByRole('button', { name: QUOTE }).click();
  await page.getByLabel('Reason').fill('Edition 2025-06 supersedes 2024-03.');
  await page.getByRole('button', { name: 'Check and save as draft' }).click();
};

let store;
let workspace;
const running = [];
test.beforeEach(() => { store = makeStore(); workspace = mkdtempSync(join(tmpdir(), 'atlas-e2e-ws-')); });
test.afterEach(async () => {
  while (running.length) await running.pop().stop();
  store.cleanup();
  rmSync(workspace, { recursive: true, force: true });
});
const start = async (...args) => { const e = await editor(workspace, store.dir, ...args); running.push(e); return e; };

test('the correction journey: find, read the source beside the record, correct, see the effect, restart, prepare a review', async ({ page, context }) => {
  const dataBefore = manifestDigest();
  let service = await start();
  await page.goto(service.url);
  await expect(page.getByText('Sandbox workspace. Changes stay on this computer.')).toBeVisible();
  await expect(page).not.toHaveURL(/token/, 'the token is taken out of the address');

  await openDensity(page);
  // The record and the page are side by side, and the quote is not marked until it is chosen.
  await expect(page.getByRole('heading', { name: 'Source page' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Source page' })).toContainText(QUOTE);
  await expect(page.locator('.page-text mark')).toHaveCount(0);

  // A second window opens the same value before the first one saves: its edit will be stale.
  const other = await context.newPage();
  await other.goto(service.url);
  await openDensity(other);

  await correctDensity(page);
  await expect(page.getByRole('status').filter({ hasText: 'Saved as a draft, not approved.' })).toContainText('The quote was found on page 1 of the stored document.');
  await expect(page.locator('.page-text mark')).toHaveCount(0, { message: 'the form clears after a save' });
  await expect(page.getByRole('row', { name: /Density/ })).toContainText('draft, not approved');
  await expect(page.getByRole('row', { name: /Density/ })).toContainText('1.25 g/cc');

  // The engine is not on this branch: the panel says so and gives no count; it never says that nothing moves.
  const impact = page.getByRole('region', { name: 'Which answers would move' });
  await expect(impact).toContainText('Impact preview: not available yet (WP-11).');
  await expect(impact).not.toContainText('move no answer');
  await expect(page.getByRole('banner')).toContainText('1 draft, not approved');

  // The stale edit: the other window still holds the old value. Its refusal shows three columns and keeps what was typed.
  await other.getByLabel('New printed value').fill('1.25');
  await other.getByRole('list', { name: 'Source page' }).getByRole('button', { name: QUOTE }).click();
  await other.getByLabel('Reason').fill('A second opinion, typed before the first save.');
  await other.getByRole('button', { name: 'Check and save as draft' }).click();
  const alert = other.getByRole('alert').filter({ hasText: 'changed after you opened it' });
  await expect(alert).toBeVisible();
  await expect(alert).toBeFocused();
  await expect(alert).toContainText('The value you expected');
  await expect(alert).toContainText('The value in the data now');
  await expect(alert).toContainText('The value you wanted');
  await expect(alert.locator('.three > div').nth(0)).toContainText('1.24');
  await expect(alert.locator('.three > div').nth(1)).toContainText('1.25');
  await expect(other.getByLabel('New printed value')).toHaveValue('1.25');
  await expect(other.getByLabel('Reason')).toHaveValue('A second opinion, typed before the first save.');
  await expect(other.locator('#evidence-quote')).toHaveValue(QUOTE);
  await other.close();

  // A restart: the draft is on disk and the workspace is ready in 3 seconds or less.
  await service.stop();
  running.pop();
  service = await start();
  expect(service.readyMs, 'ready time after a restart').toBeLessThanOrEqual(3000);
  await page.goto(service.url);
  await expect(page.getByRole('banner')).toContainText('1 draft, not approved');
  await page.getByRole('button', { name: /^Drafts/ }).click();
  const draft = page.getByRole('listitem').filter({ hasText: 'Density of' });
  await expect(draft).toContainText('draft, not approved');
  await expect(draft).toContainText('Edition 2025-06 supersedes 2024-03.');
  await expect(draft.locator('.was').first()).toHaveText('1.24');
  await expect(draft.locator('.now').first()).toHaveText('1.25');

  // Prepare review: into the sandbox export folder, never into data/.
  await page.getByRole('button', { name: 'Prepare review' }).click();
  const done = page.getByRole('status').filter({ hasText: 'is ready' });
  await expect(done).toContainText('in the sandbox only');
  const sets = join(workspace, 'export', 'data', 'review', 'change-sets');
  expect(readdirSync(sets).filter((f) => f.endsWith('.json'))).toHaveLength(1);
  expect(existsSync(join(workspace, 'export', 'data', 'tables', 'measurements.csv'))).toBe(true);
  expect(manifestDigest(), 'data/ is untouched').toBe(dataBefore);
  await expect(page.getByRole('listitem').filter({ hasText: 'Density of' })).toContainText('exported in');
});

test('a source that is not on this computer is said so, and the correction is switched off', async ({ page }) => {
  const other = realRecords('measurements').find((cells) => cells[columnIndex('measurements', 'SourceID')] !== SOURCE
    && cells[columnIndex('measurements', 'Property')] === 'Density');
  const id = other[0];
  const grade = realRecords('grades').find((cells) => cells[0] === other[columnIndex('measurements', 'GradeID')]);
  const service = await start();
  await page.goto(service.url);
  await page.getByLabel('Maker, product or material').fill(grade[0]);
  await page.getByRole('list', { name: 'Products found' }).getByRole('button', { name: new RegExp(`${grade[0]}$`) }).click();
  await page.getByRole('button', { name: `Open Density (${id}) beside its source` }).click();
  await expect(page.getByRole('status').filter({ hasText: /Source not available on this computer|never retrieved|No digest/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check and save as draft' })).toBeDisabled();
  await expect(page.getByLabel('New printed value')).toBeDisabled();
  await expect(page.locator('.page-text')).toHaveCount(0);
});

test('the answers that would move are listed when a preview is behind the editor', async ({ page }) => {
  const service = await launch({ script: 'tests/e2e/serve-fixture.mjs', args: ['--workspace', workspace, '--source-store', store.dir] });
  running.push(service);
  await page.goto(service.url);
  await openDensity(page);
  await correctDensity(page);
  const impact = page.getByRole('region', { name: 'Which answers would move' });
  await expect(impact).toContainText('These corrections change 2 answers.');
  await expect(impact).toContainText('Questions that need the estimate stage have not been asked yet');
  await expect(impact.getByRole('row', { name: /everyday-pla/ })).toContainText('pass');
  await expect(impact.getByRole('row', { name: /everyday-pla/ })).toContainText('fail');
  await expect(page.getByRole('banner')).toContainText('Impact preview: available');
});

test('when the data moved under a draft the draft is a conflict with three columns, and applying it again loses nothing', async ({ page }) => {
  const data = copyData();
  try {
    let service = await start(['--data-dir', data.dir]);
    await page.goto(service.url);
    await openDensity(page);
    await correctDensity(page);
    await expect(page.getByRole('status').filter({ hasText: 'Saved as a draft' })).toBeVisible();
    await service.stop();
    running.pop();

    editRecords(data.dir, 'measurements', (rows) => { rows[0][columnIndex('measurements', 'Normalized value')] = '1241'; });
    service = await start(['--data-dir', data.dir]);
    await page.goto(service.url);
    await expect(page.getByRole('banner')).toContainText('0 drafts, not approved');
    await page.getByRole('button', { name: /^Conflicts/ }).click();
    const card = page.getByRole('listitem').filter({ hasText: 'Density of' });
    await expect(card).toContainText('draft, not approved');
    await expect(card.locator('.three > div').nth(0)).toContainText('1240');
    await expect(card.locator('.three > div').nth(1)).toContainText('1241');
    await expect(card.locator('.three > div').nth(2)).toContainText('1250');
    await expect(card.locator('.three > div').nth(2)).toContainText(QUOTE.length ? '1.25' : '');
    await card.getByRole('button', { name: 'Apply my change to the current value' }).click();
    await expect(page.getByText('There are no conflicts.')).toBeVisible();
    await page.getByRole('button', { name: /^Drafts/ }).click();
    const draft = page.getByRole('listitem').filter({ hasText: 'Density of' });
    await expect(draft.locator('.was').last()).toHaveText('1241');
    await expect(draft.locator('.now').last()).toHaveText('1250');
  } finally { data.cleanup(); }
});

test('a request with a wrong token ends the session in plain words; the page is usable with the keyboard alone', async ({ page }) => {
  const service = await start();
  await page.goto(`${service.url.split('#')[0]}#token=not-the-token`);
  await expect(page.getByRole('alert')).toContainText('This editor session has ended. Start it again with npm run editor.');

  await page.goto(service.url);
  await page.getByLabel('Maker, product or material').fill('ecomax pla');
  await expect(page.getByRole('list', { name: 'Products found' }).getByRole('button')).toHaveCount(2);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'ECOMAX PLA', level: 3 })).toBeVisible();
  await page.getByRole('button', { name: 'Open Density (V000001) beside its source' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Correct Density' })).toBeVisible();
  // Arrow keys move between the lines of the page, and Enter takes the line as the quote.
  await page.getByRole('list', { name: 'Source page' }).getByRole('button').first().focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#evidence-quote')).toHaveValue(QUOTE);
  // Every field has a name a screen reader can say.
  for (const name of ['New printed value', 'Its number', 'Normalized value', 'Page', 'Where on the page', 'Quote', 'Reason']) {
    await expect(page.getByRole('main').getByLabel(name).first(), name).toBeVisible();
  }
});
