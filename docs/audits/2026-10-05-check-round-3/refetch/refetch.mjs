#!/usr/bin/env node
// Check round 3: the registered documents whose bytes the source store lost, fetched again (2026-10-05; the owner:
// "fetch the registered documents and add them to your checks and one drive").
//
// 123 sources were retrieved in September 2026 before the store kept every document, and neither this machine nor the
// backup held their bytes (../missing-bytes.csv). Each is fetched from its URL (or read from its local path) once:
// - bytes that hash to the digest sources.csv records ARE that source: they go back into the store by digest
//   (.cache/sources/by-sha) and their text is cached, so every check reads them as before;
// - other bytes are a later copy of the page, not the source a record cites (scripts/data/source-store.mjs: a digest that
//   differs is another document). They are kept by their own digest beside the store (.cache/later-copies/<SourceID>/),
//   with their text, so a check can read what the page prints now and say that it read a later copy. Registering one
//   is an import, and none is registered here.
// Writes refetched.csv beside this file. Re-running skips a source already fetched. Two requests at a time, spaced.
//
//   node docs/audits/2026-10-05-check-round-3/refetch/refetch.mjs [--only <SourceID>]
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, csvText } from '../../../../build/src/csv.js';
import { sha256, documentText, cacheDir } from '../../../../scripts/lib/pdf-text.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const rows = (p) => readCsv(p).records.map((r) => r.values);
const missing = rows(join(here, '../missing-bytes.csv'));
const sources = new Map(rows(join(root, 'data/tables/sources.csv')).map((s) => [s.SourceID, s]));
const outPath = join(here, 'refetched.csv');
const done = new Map(existsSync(outPath) ? rows(outPath).map((r) => [r.SourceID, r]) : []);
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const extOf = (bytes, type, url) => {
  if (String(Buffer.from(bytes).subarray(0, 5)) === '%PDF-') return '.pdf';
  if (/html/i.test(type ?? '') || /^\s*<(?:!doctype|html)/i.test(Buffer.from(bytes).subarray(0, 200).toString())) return '.html';
  return extname(new URL(url, 'file:///').pathname) || '.bin';
};

async function get(url) {
  if (url.startsWith('/')) return existsSync(url) ? { status: 'local', bytes: readFileSync(url), type: '' } : { status: 'local-missing' };
  for (let tries = 0; tries < 3; tries++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
      if (res.status === 429 || res.status >= 500) { await sleep(3000 * (tries + 1)); continue; }
      if (!res.ok) return { status: `http-${res.status}` };
      return { status: 'fetched', bytes: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type'), finalUrl: res.url };
    } catch (e) { if (tries === 2) return { status: `error: ${e.message.slice(0, 60)}` }; await sleep(2000); }
  }
  return { status: 'gave-up' };
}

async function one(m) {
  const s = sources.get(m.SourceID);
  const r = await get(m.URL);
  const row = { SourceID: m.SourceID, URL: m.URL, Status: r.status, RecordedSHA256: s?.SHA256 ?? '', FetchedSHA256: '', Matches: '', Bytes: '', Kept: '', Text: '', DecidingTargets: m.DecidingTargets };
  if (!r.bytes) return row;
  const sha = sha256(r.bytes);
  const ext = extOf(r.bytes, r.type, m.URL);
  row.FetchedSHA256 = sha; row.Bytes = String(r.bytes.length);
  row.Matches = sha === s?.SHA256 ? 'yes' : 'no';
  const target = row.Matches === 'yes' ? cacheDir('sources', 'by-sha', `${sha}${ext}`) : join(cacheDir('later-copies', m.SourceID), `${sha}${ext}`);
  mkdirSync(dirname(target), { recursive: true });
  if (!existsSync(target)) writeFileSync(target, r.bytes);
  row.Kept = target.replace(`${cacheDir()}/`, '.cache/');
  try {
    const text = await documentText(r.bytes, { sha });
    row.Text = `${text.pages.length} page(s), ${text.pages.reduce((n, p) => n + p.lines.length, 0)} line(s)`;
  } catch (e) { row.Text = `no text: ${e.message.slice(0, 60)}`; }
  return row;
}

const queue = missing.filter((m) => (!only || m.SourceID === only) && !done.has(m.SourceID));
const out = [...done.values()];
const hosts = new Map();
let i = 0;
async function worker() {
  while (i < queue.length) {
    const m = queue[i++];
    const host = m.URL.startsWith('/') ? 'local' : new URL(m.URL).host;
    while ((hosts.get(host) ?? 0) >= 2) await sleep(200);
    hosts.set(host, (hosts.get(host) ?? 0) + 1);
    try { const row = await one(m); out.push(row); console.log(`${row.Matches === 'yes' ? 'same ' : row.Matches === 'no' ? 'later' : '     '} ${row.Status.padEnd(12)} ${m.SourceID}`); }
    finally { hosts.set(host, hosts.get(host) - 1); await sleep(500); }
    writeFileSync(outPath, csvText(Object.keys(out[0]), out.sort((a, b) => a.SourceID.localeCompare(b.SourceID))));
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
const n = (f) => out.filter(f).length;
console.log(`${out.length} sources: ${n((r) => r.Matches === 'yes')} the same bytes (restored), ${n((r) => r.Matches === 'no')} a later copy, ${n((r) => !r.Matches)} not fetched`);
