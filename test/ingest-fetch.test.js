// Staging a document the owner supplies (R084): the pipeline hashes what it is given, and never guesses which
// row a file belongs to. What is asserted is the matching rule, on rows written for the purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, readCsv } from '../build/src/csv.js';
import { rowForStagedFile, adapter, request, get, fetchDocument, ledgerChange, limiter, fold, retryAfterMs, LIMITS } from '../scripts/ingest/fetch.mjs';
import { HEADER } from '../scripts/ingest/inventory.mjs';

const rows = [
  { doc_key: 'a', provider: 'iSANMATE', product_raw: 'ABS', url: 'https://www.isanmate.com/wp-content/uploads/2022/09/ABS_TDS.pdf' },
  { doc_key: 'b', provider: 'iSANMATE', product_raw: 'ABS GF', url: 'https://www.isanmate.com/wp-content/uploads/2024/09/ABS-GF_TDS.pdf' },
  { doc_key: 'c', provider: 'FormFutura', product_raw: 'ABSpro', url: 'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/TDS%20-%20ABSpro.pdf' },
  { doc_key: 'd', provider: 'FormFutura', product_raw: 'ABSpro Flame Retardant', url: 'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/TDS%20-%20ABSpro%20-%20Flame%20Retardant.pdf' },
];

test('a staged file finds its row by the file name the URL carries, whatever the case or punctuation', () => {
  assert.equal(rowForStagedFile('ABS_TDS.pdf', rows).row.doc_key, 'a');
  assert.equal(rowForStagedFile('abs-gf_tds.PDF', rows).row.doc_key, 'b');
  // A SharePoint name is percent-encoded in the URL and plain on disk.
  assert.equal(rowForStagedFile('TDS - ABSpro - Flame Retardant.pdf', rows).row.doc_key, 'd');
});

test('a file no URL names is matched by a product name that one row alone carries, and refused where two do', () => {
  assert.equal(rowForStagedFile('iSANMATE ABS GF datasheet 2026.pdf', rows).row.doc_key, 'b');
  // The longest name the file contains is the product: a file named for the flame-retardant grade is not the plain one.
  assert.equal(rowForStagedFile('ABSpro Flame Retardant datasheet.pdf', rows).row.doc_key, 'd');
  assert.equal(rowForStagedFile('ABSpro datasheet.pdf', rows).row.doc_key, 'c');
  // Two names of one length that the file contains alike are two products: it is listed, not guessed.
  const twins = [...rows, { doc_key: 'e', provider: 'X', product_raw: 'PLA Pro', url: 'https://x.example/1' }, { doc_key: 'f', provider: 'X', product_raw: 'PET Pro', url: 'https://x.example/2' }];
  const ambiguous = rowForStagedFile('PLA Pro and PET Pro.pdf', twins);
  assert.equal(ambiguous.row, undefined);
  assert.match(ambiguous.why, /2 products' names fit/);
  assert.match(rowForStagedFile('something else.pdf', rows).why, /no row carries this file name/);
});

test('the host that disallows fetching tools is the one the owner stages by hand', () => {
  assert.equal(adapter('https://www.isanmate.com/wp-content/uploads/2022/09/ABS_TDS.pdf').kind, 'manual');
});

test('a library is staged by what each file is: its data sheets, never its safety sheets, leaflets or case studies', async () => {
  const { stageKind } = await import('../scripts/ingest/fetch.mjs');
  for (const name of ['TDS - ABSpro.pdf', 'formfutura-tds-highprecisionpet.pdf', '3DIAKON-TDS-27-05-2019.pdf', 'TDS MDflex.pdf',
    'ABS-Glass-Fiber-Technical-Data-Sheet.pdf', 'PLA-Wood_-TDS.pdf', 'PA12_CF-TDS.pdf']) assert.equal(stageKind(name), 'data-sheet', name);
  for (const name of ['SDS Formfutura STYX-12 (DE)v09-04-2019.pdf', 'NovamidID1070black_SDS_EN_EU_2021-12-13.pdf',
    'PLA-Safety-Data-Sheet.pdf']) assert.equal(stageKind(name), 'safety-sheet', name);
  assert.equal(stageKind('Statement of compliance with food contact regulations - STYX-12 - 2020Jan27.pdf'), 'declaration');
  assert.equal(stageKind('DSM CS McGill hi-res final.pdf'), 'case-study');
  assert.equal(stageKind('ReForm rPLA - Website text.pdf'), 'website-text');
  assert.equal(stageKind('ff-Spool_Specifications-750g_Cardboard.pdf'), 'spool');
  assert.equal(stageKind('AM_Addigy-F1030_Leaflet.pdf'), 'leaflet');
  assert.equal(stageKind('Spec_MEP_Xantar C CF 107 V0_150928.pdf'), 'other');
});

test('two rows carrying one file name are told apart by the folder the file sits in', () => {
  const base = 'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/Filaments/FormFutura%20Filaments';
  const both = [
    { doc_key: 'plain', product_raw: 'High Gloss PLA', url: `${base}/High%20Gloss%20PLA/Data%20Sheets%20and%20Declarations/TDS%20-%20High%20Gloss%20PLA.pdf` },
    { doc_key: 'morph', product_raw: 'High Gloss PLA', url: `${base}/High%20Gloss%20PLA%20-%20ColorMorph/Data%20Sheets%20and%20Declarations/TDS%20-%20High%20Gloss%20PLA.pdf` },
  ];
  const name = 'TDS - High Gloss PLA.pdf';
  assert.equal(rowForStagedFile(name, both, { path: ['FormFutura Filaments', 'High Gloss PLA', 'Data Sheets and Declarations', name] }).row.doc_key, 'plain');
  assert.equal(rowForStagedFile(name, both, { path: ['FormFutura Filaments', 'High Gloss PLA - ColorMorph', 'Data Sheets and Declarations', name] }).row.doc_key, 'morph');
  // Without a path, or with one that separates nothing, the name alone is two rows and a question.
  assert.match(rowForStagedFile(name, both).why, /2 rows carry this file name/);
  assert.match(rowForStagedFile(name, both, { path: ['elsewhere', name] }).why, /2 rows carry this file name/);
});

test('a data sheet no row carries gets a row at the address the library gives it, named by its folder', async () => {
  const { rowForUnlistedFile } = await import('../scripts/ingest/fetch.mjs');
  const sibling = { provider: 'FormFutura', provider_kind: 'manufacturer', brand: 'FormFutura', manufacturer: 'FormFutura', language: 'Not stated' };
  const row = rowForUnlistedFile(['Partner Materials', 'Lehvoss', 'Luvocom 3F PAHT 9825 NT', 'Data sheets & declarations', 'TDS - LUVOCOM 3F PAHT 9825 NT - Injection molded specimen.pdf'],
    { rootUrl: 'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/Downloads%20Server/Materials/Filaments/', sibling, date: '2026-09-21' });
  assert.equal(row.url, 'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/Downloads%20Server/Materials/Filaments/Partner%20Materials/Lehvoss/Luvocom%203F%20PAHT%209825%20NT/Data%20sheets%20%26%20declarations/TDS%20-%20LUVOCOM%203F%20PAHT%209825%20NT%20-%20Injection%20molded%20specimen.pdf');
  assert.equal(row.product_raw, 'Luvocom 3F PAHT 9825 NT');
  assert.match(row.doc_key, /^url:[0-9a-f]{16}$/);
  assert.equal(row.status, 'inventoried');
  assert.equal(row.provider, 'FormFutura');
  // A file straight under the library's root is named by its own file name.
  assert.equal(rowForUnlistedFile(['PDS_TDS.pdf'], { rootUrl: 'https://www.isanmate.com/wp-content/uploads/2024/09', sibling, date: '2026-09-21' }).url,
    'https://www.isanmate.com/wp-content/uploads/2024/09/PDS_TDS.pdf');
});

// Bounded fetches (A06, the review of 2026-09-27), against a server this file runs on the loopback address: every
// failure a host can give ends in a named state, the ones that mean "later" are tried again, and a run that is killed
// part-way resumes without fetching again what it finished. Nothing here reaches the network.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pdf = (text) => Buffer.from(`%PDF-1.4\n% ${text}\n%%EOF\n`);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const hits = new Map();
let resumePhase = 1;
const server = createServer((req, res) => {
  const path = req.url.split('?')[0];
  const n = (hits.get(path) ?? 0) + 1;
  hits.set(path, n);
  const send = (bytes) => { res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Length': bytes.length }); res.end(bytes); };
  switch (path) {
    case '/silent.pdf': return undefined;                                           // never answers
    case '/stall.pdf': res.writeHead(200, { 'Content-Type': 'application/pdf' }); return res.write('%PDF-1.4\n');   // answers, then goes quiet
    case '/busy.pdf': return n === 1 ? res.writeHead(429, { 'Retry-After': '1' }).end() : send(pdf('busy, then served'));
    case '/patient.pdf': return res.writeHead(429, { 'Retry-After': '3600' }).end();
    case '/reset.pdf': return n === 1 ? req.socket.destroy() : send(pdf('reset, then served'));
    case '/gone.pdf': return res.writeHead(404).end();
    case '/declared-large.pdf': res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Length': 4096 }); return res.end(Buffer.alloc(4096, 1));
    case '/streamed-large.pdf': {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      let sent = 0;
      const more = () => { if (sent++ < 8) { res.write(Buffer.alloc(512, 1)); setTimeout(more, 5); } else res.end(); };
      return more();
    }
    case '/a.pdf': return send(pdf('document a'));
    case '/b.pdf': return resumePhase === 1 ? undefined : send(pdf('document b'));      // hangs until the run is killed
    default: return res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => { server.closeAllConnections(); server.close(); });
const quick = { ...LIMITS, responseMs: 400, bodyMs: 2_000, stallMs: 200, maxBytes: 1024, tries: 2, backoffMs: 10, maxWaitMs: 5_000 };

test('a host that never answers times out, and a body that stops arriving is abandoned as stalled', async () => {
  const silent = await request(`${base}/silent.pdf`, { limits: quick });
  assert.equal(silent.state, 'timeout');
  assert.match(silent.error, /^timeout: no response within 0\.4 s$/);
  const stalled = await request(`${base}/stall.pdf`, { limits: quick });
  assert.equal(stalled.state, 'stalled');
  assert.match(stalled.error, /^stalled: the body stopped arriving for 0\.2 s$/);
  // Each is tried again, and what the ledger records names the state it ended in.
  const before = hits.get('/stall.pdf');
  const result = await fetchDocument({ doc_key: 'x', url: `${base}/stall.pdf`, status: 'inventoried', sha256: '' }, { digests: new Map(), limits: quick });
  assert.equal(hits.get('/stall.pdf') - before, 2);
  assert.equal(result.status, 'unreachable');
  assert.match(result.note, /^stalled: the body stopped arriving for 0\.2 s on \d{4}-\d{2}-\d{2}$/);
});

test('a 429 is tried again after the Retry-After the host gives, and a host asking for an hour is left for the next run', async () => {
  const started = Date.now();
  const busy = await get(`${base}/busy.pdf`, { limits: quick });
  assert.equal(busy.error, undefined);
  assert.equal(busy.tries, 2);
  assert.ok(Date.now() - started >= 950, `waited ${Date.now() - started} ms for a Retry-After of 1 s`);
  assert.equal(busy.bytes.toString('latin1'), pdf('busy, then served').toString('latin1'));
  const patient = await get(`${base}/patient.pdf`, { limits: quick });
  assert.equal(patient.tries, 1);
  assert.match(patient.error, /^HTTP 429 Too Many Requests, and the host asks for 3600 s before another request$/);
  assert.equal(retryAfterMs('120'), 120_000);
  assert.equal(retryAfterMs(new Date(Date.parse('2026-09-28T00:00:30Z')).toUTCString(), Date.parse('2026-09-28T00:00:00Z')), 30_000);
});

test('a connection reset is tried again; a status that means no is not', async () => {
  const reset = await get(`${base}/reset.pdf`, { limits: quick });
  assert.equal(reset.error, undefined);
  assert.equal(reset.tries, 2);
  const gone = await get(`${base}/gone.pdf`, { limits: quick });
  assert.equal(gone.tries, 1);
  assert.equal(gone.error, 'HTTP 404 Not Found');
});

test('a body larger than a run accepts is refused, whether the host declares its length or streams it', async () => {
  for (const path of ['/declared-large.pdf', '/streamed-large.pdf']) {
    const big = await get(`${base}${path}`, { limits: quick });
    assert.equal(big.state, 'too-large', path);
    assert.equal(big.tries, 1, `${path}: more patience does not make a document smaller`);
    assert.match(big.error, /^too-large: more than 1024 bytes, the limit a run keeps to \(--max-mb raises it\)$/);
  }
  const result = await fetchDocument({ doc_key: 'x', url: `${base}/declared-large.pdf`, status: 'inventoried', sha256: '' }, { digests: new Map(), limits: quick });
  assert.equal(result.status, 'too-large');
});

test('no more requests are in flight at once than the cap allows', async () => {
  const slot = limiter(2);
  let active = 0, most = 0;
  await Promise.all(Array.from({ length: 7 }, () => slot(async () => {
    most = Math.max(most, ++active);
    await new Promise((r) => setTimeout(r, 15));
    active--;
  })));
  assert.equal(most, 2);
});

test('a journal line cut short by a kill is passed over, and the last line for a document stands', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-journal-'));
  try {
    const path = join(dir, 'journal.jsonl');
    writeFileSync(path, [
      JSON.stringify({ doc_key: 'a', change: { status: 'unreachable', status_note: 'timeout: first try' } }),
      JSON.stringify({ doc_key: 'a', change: { sha256: 'f'.repeat(64), status: 'fetched', status_note: '' } }),
      '{"doc_key":"b","change":{"sha2',
    ].join('\n'));
    const rows = [{ doc_key: 'a', status: 'inventoried' }, { doc_key: 'b', status: 'inventoried' }];
    assert.equal(fold(rows, path), 2);
    assert.deepEqual(rows, [{ doc_key: 'a', sha256: 'f'.repeat(64), status: 'fetched', status_note: '' }, { doc_key: 'b', status: 'inventoried' }]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a run killed part-way resumes without fetching again a document it finished', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-fetch-'));
  try {
    const ops = join(dir, 'ops'), cache = join(dir, 'cache');
    mkdirSync(ops, { recursive: true });
    const row = (key, path) => ({ ...Object.fromEntries(HEADER.map((h) => [h, ''])), doc_key: key, provider: 'Fixture Maker',
      provider_kind: 'manufacturer', manufacturer: 'Fixture Maker', product_raw: key, url: `${base}${path}`, primary: 'TRUE', status: 'inventoried' });
    writeFileSync(join(ops, 'ledger.csv'), csvText(HEADER, [row('fixture-a', '/a.pdf'), row('fixture-b', '/b.pdf')]));
    const ledgerBefore = readFileSync(join(ops, 'ledger.csv'), 'utf8');
    // The campaign folder and the document cache are the test's own (scripts/ingest/context.mjs).
    const env = { ...process.env, H2C_INGEST_ROOT: ops, H2C_DOCUMENT_CACHE: cache };
    const run = () => {
      const child = spawn(process.execPath, [join(root, 'scripts/ingest/fetch.mjs'), '--provider', 'Fixture Maker'], { cwd: root, env });
      let out = '';
      child.stdout.on('data', (d) => { out += d; });
      child.stderr.on('data', (d) => { out += d; });
      return { child, exited: new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal, out: () => out }))) };
    };
    const journal = join(ops, 'ledger.fetch-journal.jsonl');

    // The first run finishes a and waits on b; it is killed while it waits, with no chance to write the ledger.
    const first = run();
    for (let waited = 0; !(existsSync(journal) && readFileSync(journal, 'utf8').includes('fixture-a')); waited += 25) {
      if (waited > 15_000) { first.child.kill('SIGKILL'); assert.fail(`the first run never journalled a: ${(await first.exited).out()}`); }
      await new Promise((r) => setTimeout(r, 25));
    }
    first.child.kill('SIGKILL');
    assert.equal((await first.exited).signal, 'SIGKILL');
    assert.equal(readFileSync(join(ops, 'ledger.csv'), 'utf8'), ledgerBefore, 'a killed run never wrote the ledger');
    const a = pdf('document a');
    assert.ok(existsSync(join(cache, 'sources/by-sha', `${digest(a)}.pdf`)), 'but a\'s bytes are stored under their digest');

    // The second run folds the journal in first, so a is fetched and is not fetched again; b is.
    resumePhase = 2;
    const second = await run().exited;
    assert.equal(second.code, 0, second.out());
    assert.match(second.out(), /1 document\(s\) fetched by a run that was stopped are now in the ledger/);
    assert.equal(hits.get('/a.pdf'), 1, 'a was downloaded once');
    assert.equal(hits.get('/b.pdf'), 2, 'b was asked for by both runs');
    const ledger = new Map(readCsv(join(ops, 'ledger.csv')).records.map((r) => [r.values.doc_key, r.values]));
    assert.equal(ledger.get('fixture-a').status, 'fetched');
    assert.equal(ledger.get('fixture-a').sha256, digest(a));
    assert.equal(ledger.get('fixture-b').status, 'fetched');
    assert.equal(ledger.get('fixture-b').sha256, digest(pdf('document b')));
    assert.ok(!existsSync(journal), 'the journal is folded into the ledger and removed');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an applied document refetched with other bytes keeps its digest and records the new revision; the same bytes change only the date', async () => {
  const served = pdf('document a');
  const stored = new Map();
  const store = (bytes) => { const sha = digest(bytes); stored.set(sha, bytes); return { sha, path: `by-sha/${sha}`, stored: true }; };
  const row = { doc_key: 'x', url: `${base}/a.pdf`, status: 'applied', sha256: digest(served), status_note: 'applied in b01' };
  const opts = { digests: new Map(), refetch: true, recheck: true, limits: quick, store, today: '2026-10-02' };
  // The same bytes: the digest and status stand, the note is as it was, and the ledger change carries only the date.
  const same = await fetchDocument(row, opts);
  assert.equal(same.sha256, undefined);
  assert.equal(same.status, 'applied');
  assert.equal(same.note, 'applied in b01');
  const unchanged = ledgerChange(same, '2026-10-02');
  assert.deepEqual(unchanged, { status: 'applied', status_note: 'applied in b01', updated: '2026-10-02' });
  // Other bytes: stored by their own digest, recorded on the note, the recorded digest and status untouched.
  const revised = { ...row, sha256: digest(pdf('the sheet as it was applied')) };
  const result = await fetchDocument(revised, opts);
  assert.equal(result.sha256, undefined, 'a digest in the result would overwrite the recorded one');
  assert.equal(result.status, 'applied');
  assert.ok(stored.has(digest(served)), 'the new bytes are kept by their own digest');
  assert.equal(result.note, `applied in b01; new revision ${digest(served)} served 2026-10-02, not registered (the recorded digest ${revised.sha256} stands, D35)`);
  const change = ledgerChange(result, '2026-10-02');
  assert.equal(change.sha256, undefined);
  // Served again, the same revision is not noted twice; a host that fails leaves the row and says so.
  assert.equal((await fetchDocument({ ...revised, status_note: result.note }, opts)).note, result.note);
  const failed = await fetchDocument({ ...revised, url: `${base}/gone.pdf` }, opts);
  assert.equal(failed.status, 'applied');
  assert.equal(failed.sha256, undefined);
  assert.equal(failed.note, 'applied in b01; recheck failed 2026-10-02: HTTP 404 Not Found');
  // A document not yet applied is refetched and its digest updated, as before.
  const open = await fetchDocument({ ...revised, status: 'fetched', status_note: '' }, opts);
  assert.equal(open.sha256, digest(served));
  assert.equal(open.status, 'fetched');
});
