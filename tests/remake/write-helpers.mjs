// Shared by the WP-10 tests (not a test itself): a sandbox workspace cloned from one template built once per test file, a
// correction of a real measurement (V000001, the PLA density of 1.24 g/cc) that passes every guard, and a fake private store.
// Nothing here writes under the repository's data/.
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newOpId } from '../../packages/data/src/digest.ts';
import { TABLE_COLUMNS } from '../../packages/data/src/generated/columns.ts';
import { readRow } from '../../packages/data/src/storage.ts';
import { Workspace } from '../../packages/data/src/workspace.ts';
import { root } from './data-helpers.mjs';

export { newOpId, root };

export const SOURCE = 'X-ECOMAX-PLA-TDS-v3';
export const HASH = 'd1fdff52f1293ebab12bd2e853b187522c4cc37e29f9938df7c0a51ebf5d048a';
export const QUOTE = 'Density ISO 1183 g/cc 1.25';
const PAGES = new Map([[1, `Technical data sheet. ${QUOTE}. Melt flow 6 g/10 min.`], [2, 'Storage and handling.']]);
const squeeze = (text) => text.replace(/\s+/g, '');

/** A private store that holds the text of the one document the fixture cites, two pages long. */
export const fakeStore = {
  document: (sha) => (sha === HASH ? { pageCount: PAGES.size, squeezedPage: (n) => (PAGES.has(n) ? squeeze(PAGES.get(n)) : null) } : null),
};

let templateDir = null;
/** A workspace built once from the real data; each test clones it (a rebuild per test would cost seconds). */
async function template() {
  if (templateDir === null) {
    templateDir = mkdtempSync(join(tmpdir(), 'atlas-ws-template-'));
    (await Workspace.open({ workspaceDir: templateDir, store: null })).close();
  }
  return templateDir;
}
export const dropTemplate = () => { if (templateDir) rmSync(templateDir, { recursive: true, force: true }); templateDir = null; };

/**
 * A scratch sandbox. By default it is a clone of the template on the real (read-only) data; pass `dataDir` for a scratch copy of the
 * data that the test may move (Git moving), which costs one rebuild.
 */
export async function scratch({ store = fakeStore, dataDir, now } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-ws-'));
  if (dataDir === undefined) cpSync(await template(), dir, { recursive: true });
  const options = { workspaceDir: dir, store, ...(dataDir === undefined ? {} : { dataDir }), ...(now === undefined ? {} : { now }) };
  const open = (extra = {}) => Workspace.open({ ...options, ...extra });
  const ws = await open();
  const handle = { ws, dir, options, open, cleanup() { handle.ws.close(); rmSync(dir, { recursive: true, force: true }); } };
  return handle;
}

/** The cells of a measurement, by column name. */
export function measurement(ws, id = 'V000001') {
  const ord = ws.db.prepare('SELECT _ord FROM measurements WHERE measurementid = ?').get(id)._ord;
  const cells = readRow(ws.db, 'measurements', ord);
  return { ord, cells, get: (name) => cells[TABLE_COLUMNS.measurements.indexOf(name)] };
}

export const journalSize = (ws) => Number(ws.db.prepare('SELECT count(*) AS n FROM change_log').get().n);

/** A correction that passes every guard: the density becomes 1.25 g/cc (1250 kg/m³), the three cells together, with its evidence. */
export function command(ws, overrides = {}) {
  const stamp = ws.stamp();
  return {
    opId: newOpId(),
    kind: 'correctValue',
    target: { table: 'measurements', id: 'V000001' },
    expect: { cells: { 'Raw value': '1.24', 'Raw numeric': '1.24', 'Normalized value': '1240' } },
    set: { 'Raw value': '1.25', 'Raw numeric': '1.25', 'Normalized value': '1250' },
    evidence: { sourceId: SOURCE, sha256: HASH, page: 1, locator: 'Table 1', quote: QUOTE },
    reason: 'Edition 2025-06 supersedes 2024-03.',
    actor: { kind: 'agent', name: 'h2c-implementer', model: 'claude-sonnet-5-5' },
    base: { snapshotDigest: stamp.snapshotDigest, commit: stamp.commit },
    ...overrides,
  };
}

// ---------------------------------------------------------------- WP-17 helpers (the other commands)
import { snapshotDigestOf, tableDigests } from '../../packages/data/src/digest.ts';
import { textExpression } from '../../packages/data/src/storage.ts';

export const ACTOR = { kind: 'agent', name: 'h2c-implementer', model: 'claude-sonnet-5-5' };

/** A private store with several documents: { <sha256>: [page 1 text, page 2 text, ...] }. */
export function storeOf(documents) {
  return {
    document: (sha) => {
      const pages = documents[sha];
      return pages === undefined ? null : { pageCount: pages.length, squeezedPage: (n) => (n >= 1 && n <= pages.length ? squeeze(pages[n - 1]) : null) };
    },
  };
}

/** The common part of a command for the workspace as it stands: a new opId, the base it is written against, the actor and a reason. */
export function cmd(ws, kind, fields) {
  const stamp = ws.stamp();
  return { opId: newOpId(), kind, reason: 'A test of the write service.', actor: ACTOR, base: { snapshotDigest: stamp.snapshotDigest, commit: stamp.commit }, ...fields };
}

export const schemaExpect = (ws) => ({ schemaDigest: ws.stamp().schemaSha256 });

/** The snapshot digest of every table of the workspace as it is now: equal before and after proves a refusal changed nothing. */
export const fingerprint = (ws) => snapshotDigestOf(tableDigests(ws.db).digests);

/** A record's cells by column name, found by one column's text. */
export function recordBy(ws, table, column, value) {
  const hit = ws.db.prepare(`SELECT _ord FROM "${table}" WHERE ${textExpression(table, column)} = ?`).get(value);
  if (hit === undefined) return null;
  const cells = readRow(ws.db, table, hit._ord);
  return { ord: hit._ord, cells, get: (name) => cells[TABLE_COLUMNS[table].indexOf(name)], all: Object.fromEntries(TABLE_COLUMNS[table].map((name, k) => [name, cells[k]])) };
}

/** Run `build(ws)` as a command, expect a refusal with `code`, and prove nothing in the workspace changed. */
export async function refusedWith(code, build, options = {}) {
  const sb = await scratch(options);
  try {
    const before = fingerprint(sb.ws);
    const journal = journalSize(sb.ws);
    const result = sb.ws.apply(build(sb.ws));
    assert.equal(result.status, 'refused', JSON.stringify(result));
    assert.equal(result.code, code, result.detail);
    assert.ok(result.detail.length > 20, 'a refusal says why in words');
    assert.equal(fingerprint(sb.ws), before, 'a refused command changes no cell');
    assert.equal(journalSize(sb.ws), journal, 'a refused command writes no change record');
    return result;
  } finally { sb.cleanup(); }
}
