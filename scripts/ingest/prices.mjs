#!/usr/bin/env node
// The one way a price enters (D35, D113; GOALS, "Decided on 2026-09-30, the price pass").
//
// A price is read from a page a shop served, fetched and hashed like any document, and every number, the currency and
// the stock state of the row it becomes must be in that page's own offer data (scripts/lib/offers.mjs). Nothing enters
// from a search snippet, a research note or memory. The stages, each writing what the next reads:
//
//   npm run ingest:prices -- capture --batch p01 --shop <host>        a Shopify shop: its /meta.json (its currency)
//                                                                      and every /products.json page, hashed and stored
//   npm run ingest:prices -- capture --batch p01 --url <url> --format jsonld    one product page as the server sent it
//   npm run ingest:prices -- capture --batch p02 --url <url> --format amazon    one page as a browser drew it
//   npm run ingest:prices -- offers --batch p01 [--vendor X] [--grep Y]         what the captured documents offer
//   npm run ingest:prices -- propose --batch p01                      selected.csv (the reviewed choice of offers) into
//                                                                      proposals, one per document
//   npm run ingest:prices -- apply --batch p01 [--dry-run]            guard, rehearse on a copy, then write
//
// A batch lives in archive/ingest-2026-09-18/prices/<batch>/ (captures.csv, selected.csv) and its proposals in
// archive/ingest-2026-09-18/proposals/<batch>/, as a sheet's do. Sellers, with the market and tax basis each sells on,
// are archive/ingest-2026-09-18/prices/sellers.csv. A batch is also a migration: scripts/migrate/mNNN-batch-pNN.mjs
// calls applyPriceBatch, so the sequence of migrations stays the one history of how the data got here.
//
// apply writes nothing unless, for every row:
//
//   a person accepted or rejected it, by name                           APPLY-UNREVIEWED
//   its document (and the shop profile that states its currency) still hashes to what was recorded   APPLY-HASH
//   the offer is in the document, and its list, sale and displayed price, stock and currency are that offer's
//                                                                        APPLY-PRICE-NOT-IN-OFFER
//   its net mass is printed in the listing's own words, and they sell 1.75 mm (or a reviewer says the product is only
//   sold so)                                                            APPLY-PRICE-MASS, APPLY-PRICE-DIAMETER
//   the product is an active procurement grade of the row's material, and the listing names its maker
//                                                                        APPLY-PRICE-GRADE
//   a price including VAT states its rate in the page                   APPLY-PRICE-VAT
//   the same listing is not already recorded under another source      APPLY-PRICE-DUPLICATE
//
// and unless the result passes the schema gate, the lint and the core build on a copy of the tables first. Applying
// twice changes nothing: a source is known by its SourceID, a price by its source and listing URL.

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { csvText, readCsv } from '../../build/src/csv.js';
import { checkData } from '../../build/src/schema.js';
import { lintData, findingKey } from '../../build/src/lint-rules.js';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';
import { isCanadianMarket } from '../../build/src/prices.js';
import { openTables, projectRoot, nextId } from '../data/table-io.mjs';
import { storeBytes, locate } from '../data/source-store.mjs';
import { sha256 } from '../lib/pdf-text.mjs';
import { readOffers, shopMeta, massKg, isOneSeventyFive } from '../lib/offers.mjs';
import { PROPOSALS } from './context.mjs';
import { Refusal } from './apply.mjs';

export const PRICES_ROOT = join(projectRoot, 'archive/ingest-2026-09-18/prices');
export const SELLERS = join(PRICES_ROOT, 'sellers.csv');
const batchDir = (batch) => join(PRICES_ROOT, batch);
const CAPTURE_HEADER = ['Host', 'URL', 'Kind', 'Format', 'SHA256', 'Bytes', 'Accessed', 'Note'];
const SELECTED_HEADER = ['GradeID', 'SHA256', 'Offer', 'Packaging', 'Mass from', 'Eligible for median', 'Headline sample', 'Regular price basis', 'Notes', 'Diameter', 'Maker', 'VAT included %', 'Status', 'Reviewer', 'Why'];
const NA = 'Not applicable';
const rows = (path) => (existsSync(path) ? readCsv(path).records.map((r) => r.values) : []);
const arg = (name, fallback = null) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const plain = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const stripTags = (html) => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export const sellers = () => new Map(rows(SELLERS).map((s) => [s.Host, s]));
export const captures = (batch) => rows(join(batchDir(batch), 'captures.csv'));
const bytesOf = (sha) => { const found = locate(sha, ''); return found.bytes === 'present' ? readFileSync(found.path) : null; };

// ---------------------------------------------------------------------------------------------------------- capture

async function fetchBytes(url) {
  // A shop is asked as a browser asks: several refuse a client that does not say what it is.
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36 h2c-materials price pass', Accept: '*/*' }, redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

function record(batch, entry) {
  const dir = batchDir(batch);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'captures.csv');
  const have = rows(path);
  if (!have.some((r) => r.SHA256 === entry.SHA256 && r.URL === entry.URL)) have.push(entry);
  writeFileSync(path, csvText(CAPTURE_HEADER, have));
}

/** A Shopify shop: its profile (the currency its catalogue is in) and every catalogue page, until one is empty. */
export async function captureShop(batch, host, { date = new Date().toISOString().slice(0, 10), maxPages = 40 } = {}) {
  const origin = `https://${host}`;
  const meta = await fetchBytes(`${origin}/meta.json`);
  shopMeta(meta);
  const m = storeBytes(meta);
  record(batch, { Host: host, URL: `${origin}/meta.json`, Kind: 'meta', Format: 'shopify-meta', SHA256: m.sha, Bytes: meta.length, Accessed: date, Note: `base currency ${shopMeta(meta).currency}` });
  let pages = 0, products = 0;
  for (let page = 1; page <= maxPages; page++) {
    const url = `${origin}/products.json?limit=250&page=${page}`;
    const bytes = await fetchBytes(url);
    const n = JSON.parse(bytes.toString('utf8')).products?.length ?? 0;
    if (!n) break;
    const s = storeBytes(bytes);
    record(batch, { Host: host, URL: url, Kind: 'catalogue', Format: 'shopify-catalogue', SHA256: s.sha, Bytes: bytes.length, Accessed: date, Note: `${n} products` });
    pages++; products += n;
    await sleep(700);
  }
  return { pages, products };
}

/** One page, as its server sent it. */
export async function capturePage(batch, url, format, { date = new Date().toISOString().slice(0, 10) } = {}) {
  const bytes = await fetchBytes(url);
  const { offers } = readOffers(bytes, format, url);
  const s = storeBytes(bytes);
  record(batch, { Host: new URL(url).host, URL: url, Kind: 'page', Format: format, SHA256: s.sha, Bytes: bytes.length, Accessed: date, Note: `${offers.length} offer(s) read` });
  return { sha: s.sha, offers: offers.length };
}

/** One page, as a browser drew it (Amazon's buy box is drawn after the page loads). */
export async function captureRendered(batch, urls, format, { date = new Date().toISOString().slice(0, 10), waitMs = 20000 } = {}) {
  const { findChrome, launchChrome } = await import('../lib/cdp.mjs');
  const chrome = findChrome();
  if (!chrome) throw new Error('no Chrome found (set CHROME=/path); a drawn page needs a browser');
  const profile = mkdtempSync(join(tmpdir(), 'h2c-price-'));
  const { proc, port } = await launchChrome(chrome, profile);
  let ws, next = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
  const out = [];
  try {
    const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    ws.onmessage = (msg) => { const x = JSON.parse(msg.data); if (x.id && pending.has(x.id)) { const p = pending.get(x.id); pending.delete(x.id); x.error ? p.reject(new Error(x.error.message)) : p.resolve(x.result); } };
    await send('Runtime.enable'); await send('Page.enable');
    for (const url of urls) {
      await send('Page.navigate', { url });
      const t0 = Date.now();
      let ready = false;
      while (Date.now() - t0 < waitMs) {
        await sleep(500);
        const state = await evaluate(`(() => ({ ready: document.readyState, price: !!document.querySelector('#corePriceDisplay_desktop_feature_div .a-offscreen, #corePrice_feature_div .a-offscreen, .a-price .a-offscreen') }))()`).catch(() => null);
        if (state?.ready === 'complete' && state.price) { ready = true; break; }
      }
      await sleep(1500);
      const html = await evaluate('document.documentElement.outerHTML');
      const bytes = Buffer.from(html, 'utf8');
      const { offers } = readOffers(bytes, format, url);
      const s = storeBytes(bytes);
      record(batch, { Host: new URL(url).host, URL: url, Kind: 'rendered', Format: format, SHA256: s.sha, Bytes: bytes.length, Accessed: date, Note: `${ready ? '' : 'no price drawn; '}${offers.length} offer(s) read; drawn by a browser` });
      out.push({ url, sha: s.sha, offers: offers.length, ready });
      await sleep(2500);
    }
  } finally {
    try { ws?.close(); } catch { /* closing */ }
    proc.kill();
    rmSync(profile, { recursive: true, force: true });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------- offers

/** Every offer of a batch's captured documents, with the currency each is in. */
export function batchOffers(batch) {
  const caps = captures(batch);
  const metaByHost = new Map();
  for (const c of caps.filter((x) => x.Kind === 'meta')) { const b = bytesOf(c.SHA256); if (b) metaByHost.set(c.Host, { ...shopMeta(b), sha: c.SHA256, url: c.URL, accessed: c.Accessed }); }
  const out = [];
  for (const c of caps.filter((x) => x.Kind !== 'meta')) {
    const b = bytesOf(c.SHA256);
    if (!b) continue;
    const doc = readOffers(b, c.Format, c.URL);
    const body = c.Format === 'shopify-catalogue' ? new Map(JSON.parse(b.toString('utf8')).products.map((p) => [String(p.id), stripTags(p.body_html)])) : null;
    for (const o of doc.offers) out.push({ ...o, currency: o.currency ?? doc.currency ?? metaByHost.get(c.Host)?.currency ?? null, description: body?.get(o.product) ?? '', capture: c, meta: metaByHost.get(c.Host) ?? null });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------- propose

const MAKER_ALIASES = {
  // What a shop calls a maker where it differs from grades.csv. A listing names its maker by vendor or in its title.
  Spectrum: ['spectrum', 'spectrumfilaments'], '3DXTECH': ['3dxtech', '3dxtek', '3dxmax', 'carbonx', 'fluorx', 'thermax', 'ecomax'],
  eSUN: ['esun'], Polymaker: ['polymaker', 'polylite', 'polymax', 'polyterra', 'polysonic', 'panchroma', 'fiberon'],
  'Prusa Research': ['prusa', 'prusament'], 'BASF Forward AM': ['basf', 'forwardam', 'ultrafuse'], Protopasta: ['protopasta', 'proto-pasta'],
  NinjaTek: ['ninjatek', 'ninjaflex', 'cheetah', 'armadillo'], 'Siraya Tech': ['sirayatech', 'siraya'], LEHVOSS: ['lehvoss', 'luvocom'],
  Recreus: ['recreus', 'filaflex'], 'Fabru / purefil': ['fabru', 'purefil'], Fabru: ['fabru', 'purefil'], FormFutura: ['formfutura'],
  colorFabb: ['colorfabb'], Fillamentum: ['fillamentum'], Fiberlogy: ['fiberlogy'], Extrudr: ['extrudr'], Nanovia: ['nanovia'],
  'Bambu Lab': ['bambulab', 'bambu'], UltiMaker: ['ultimaker'], Markforged: ['markforged'], Raise3D: ['raise3d'], Kimya: ['kimya'],
  MatterHackers: ['matterhackers'], '3D4Makers': ['3d4makers'], SUNLU: ['sunlu'], Eryone: ['eryone'], QIDI: ['qidi'], Flashforge: ['flashforge'],
  Elegoo: ['elegoo'], Anycubic: ['anycubic'], Creality: ['creality'], Kingroon: ['kingroon'], iSANMATE: ['isanmate'], Yousu: ['yousu'],
};
export const namesMaker = (manufacturer, offer) => {
  const words = (MAKER_ALIASES[manufacturer] ?? [plain(manufacturer)]).map(plain);
  const hay = plain(`${offer.vendor} ${offer.title}`);
  return words.some((w) => w && hay.includes(w));
};

/** The price row an offer becomes, from the offer alone and the reviewer's choices. */
export function priceRow(offer, sel, seller, grade) {
  const onSale = offer.compareAt != null && offer.compareAt > offer.price;
  const massText = sel['Mass from'] === 'description' ? offer.description : offer.title;
  const mass = massKg(massText);
  const vat = sel['VAT included %'] || NA;
  const inStock = offer.available === true;
  const eligible = sel['Eligible for median'] !== 'FALSE' && inStock && mass != null;
  return {
    MaterialID: grade.MaterialID, GradeID: grade.GradeID, Retailer: seller.Retailer,
    'Variant / SKU': `${offer.title}${offer.sku ? ` (SKU ${offer.sku})` : ''}`, Packaging: sel.Packaging || 'Spool',
    'Net mass kg': mass ?? '', 'List price': onSale ? offer.compareAt : offer.price, 'Sale price': onSale ? offer.price : NA,
    Stock: offer.available === true ? 'In stock' : offer.available === false ? 'Out of stock' : '',
    'Eligible for median': eligible ? 'TRUE' : 'FALSE', 'Headline sample': eligible && sel['Headline sample'] !== 'FALSE' ? 'TRUE' : 'FALSE',
    'Displayed price': offer.price, Currency: offer.currency, Market: seller.Market, 'Tax / shipping': seller['Tax / shipping'],
    'VAT included %': vat,
    'Regular price basis': sel['Regular price basis'] || (onSale ? 'Retailer compare-at price in the shop\'s own product data; the displayed price is a sale' : 'The shop\'s own product data shows one price and no compare-at price'),
    Quarantined: 'FALSE', URL: offer.url, 'Access date': offer.capture.Accessed,
    Notes: [sel.Notes, `Read from the shop's own ${offer.capture.Format === 'shopify-catalogue' ? 'catalogue data' : offer.capture.Format === 'amazon' ? 'page as a browser drew it' : 'product data (schema.org)'}; offer ${offer.key}.`,
      sel['Mass from'] === 'description' ? 'Net mass as the product description prints it.' : null].filter(Boolean).join(' '),
  };
}

const SOURCE_NOTE = {
  'shopify-catalogue': 'One page of the shop\'s own product catalogue (Shopify /products.json): each listing\'s price, compare-at price, availability and SKU, in the shop\'s base currency. Pricing only; no property is read from it.',
  jsonld: 'The product page as the shop\'s server sent it; its schema.org offer data gives the price, currency and availability. Pricing only; no property is read from it.',
  amazon: 'The product page as a browser drew it on the access date (Amazon draws its price after the page loads): the price, the list price and the seller of the buy box. Pricing only.',
};

/** The source row a captured document becomes. */
export function sourceRow(capture, seller, gradeIds, { title }) {
  const canadian = isCanadianMarket(seller.Market);
  const day = capture.Accessed.replace(/-/g, '');
  const page = /[?&]page=(\d+)/.exec(capture.URL)?.[1];
  return {
    SourceID: `${canadian ? 'CA' : 'OFFER'}-${seller.Code}-${day}-${capture.SHA256.slice(0, 12)}`,
    Publisher: seller.Retailer, Title: title, Revision: 'Not published', 'Publication date': 'Not published', 'Access date': capture.Accessed,
    'Source class': 'Retailer catalogue', 'Source note': `${SOURCE_NOTE[capture.Format]} ${seller.Market}. Price pass (GOALS, 2026-09-30).`,
    'Citation role': 'cited', URL: capture.URL,
    Locator: capture.Format === 'shopify-catalogue' ? `Catalogue page ${page ?? '1'}; each listing by its product and variant ID` : 'Document / product page',
    'Applicable grades': [...new Set(gradeIds)].sort().join('; '), 'Access state': 'retrieved',
    'Access note': capture.Kind === 'rendered' ? 'Drawn by a headless browser and hashed as drawn; not the bytes the server sent' : NA,
    SHA256: capture.SHA256,
  };
}

/** selected.csv into proposals: one file per document, holding its source, its shop's profile and its price rows. */
export function propose(batch) {
  const sel = rows(join(batchDir(batch), 'selected.csv'));
  const shops = sellers();
  const offers = batchOffers(batch);
  const byKey = new Map(offers.map((o) => [`${o.capture.SHA256}\u0000${o.key}`, o]));
  const grades = new Map(rows(join(projectRoot, 'data/tables/grades.csv')).map((g) => [g.GradeID, g]));
  const dir = join(PROPOSALS, batch);
  mkdirSync(dir, { recursive: true });
  const byDoc = new Map();
  for (const s of sel) {
    const offer = byKey.get(`${s.SHA256}\u0000${s.Offer}`);
    if (!offer) throw new Error(`selected.csv: no offer ${s.Offer} in ${s.SHA256.slice(0, 12)}`);
    const grade = grades.get(s.GradeID);
    if (!grade) throw new Error(`selected.csv: no grade ${s.GradeID}`);
    const seller = shops.get(offer.capture.Host);
    if (!seller) throw new Error(`sellers.csv has no row for ${offer.capture.Host}`);
    if (!byDoc.has(s.SHA256)) byDoc.set(s.SHA256, { capture: offer.capture, seller, meta: offer.meta, rows: [] });
    byDoc.get(s.SHA256).rows.push({
      offer: { key: offer.key, massFrom: s['Mass from'] || 'title' },
      row: priceRow(offer, s, seller, grade),
      review: { status: s.Status, by: s.Reviewer, note: s.Why || undefined, ...(s.Diameter ? { diameter: s.Diameter } : {}), ...(s.Maker ? { maker: s.Maker } : {}) },
    });
  }
  let n = 0;
  for (const [sha, d] of byDoc) {
    const accepted = d.rows.filter((r) => r.review.status === 'accepted');
    const title = d.capture.Format === 'shopify-catalogue'
      ? `${d.seller.Retailer} product catalogue, page ${/[?&]page=(\d+)/.exec(d.capture.URL)?.[1] ?? '1'}`
      : offers.find((o) => o.capture.SHA256 === sha)?.productTitle || d.seller.Retailer;
    const proposal = {
      version: 1, kind: 'prices', generated: { tool: 'prices.mjs', date: new Date().toISOString().slice(0, 10) },
      document: { sha256: sha, url: d.capture.URL, format: d.capture.Format, host: d.capture.Host, accessed: d.capture.Accessed },
      ...(d.meta ? { currencyDocument: { sha256: d.meta.sha, url: d.meta.url, currency: d.meta.currency, source: { row: {
        SourceID: `${isCanadianMarket(d.seller.Market) ? 'CA' : 'OFFER'}-${d.seller.Code}-${d.meta.accessed.replace(/-/g, '')}-${d.meta.sha.slice(0, 12)}`,
        Publisher: d.seller.Retailer, Title: `${d.seller.Retailer} shop profile`, Revision: 'Not published', 'Publication date': 'Not published', 'Access date': d.meta.accessed,
        'Source class': 'Retailer catalogue', 'Source note': `The shop's own profile (Shopify /meta.json), which states the base currency its catalogue prices are in: ${d.meta.currency}. Price pass (GOALS, 2026-09-30).`,
        'Citation role': 'register', URL: d.meta.url, Locator: 'Document / shop profile', 'Applicable grades': 'Shop scope: the currency of its catalogue',
        'Access state': 'retrieved', 'Access note': NA, SHA256: d.meta.sha } } } } : {}),
      source: { row: sourceRow(d.capture, d.seller, accepted.map((r) => r.row.GradeID), { title }) },
      prices: d.rows,
      review: { status: 'reviewed', by: [...new Set(d.rows.map((r) => r.review.by).filter(Boolean))].join('; ') },
    };
    writeFileSync(join(dir, `${sha.slice(0, 16)}.json`), `${JSON.stringify(proposal, null, 1)}\n`);
    n++;
  }
  return n;
}

// ---------------------------------------------------------------------------------------------------------- apply

export const proposalsOf = (batch) => {
  const dir = join(PROPOSALS, batch);
  if (!existsSync(dir)) throw new Error(`no proposals at ${dir}`);
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => ({ file: f, ...JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
};

function worldOf(root = projectRoot) {
  const table = (n) => readCsv(join(root, 'data/tables', `${n}.csv`)).records.map((r) => r.values);
  const vocab = (n) => new Set(readCsv(join(root, 'schema/vocab', `${n}.csv`)).records.map((r) => r.values.Value));
  return { sources: table('sources'), grades: table('grades'), prices: table('prices'), currencies: vocab('currencies'), markets: vocab('markets') };
}

/** Everything that must hold before anything is written. Returns the problems; an empty list is permission. */
export function guard(proposals, world) {
  const problems = [];
  const fail = (code, where, message) => problems.push({ code, where, message });
  const grades = new Map(world.grades.map((g) => [g.GradeID, g]));
  const sourceById = new Map(world.sources.map((s) => [s.SourceID, s]));
  const sourceBySha = new Map(world.sources.filter((s) => /^[0-9a-f]{64}$/.test(s.SHA256)).map((s) => [s.SHA256, s.SourceID]));
  // One listing is one product: the same listing accepted for two grades is refused, whichever document holds it.
  const claimed = new Map();
  for (const proposal of proposals) {
    const where = proposal.file ?? proposal.document?.sha256?.slice(0, 12);
    if (proposal.kind !== 'prices') { fail('APPLY-KIND', where, 'not a price proposal'); continue; }
    if (proposal.review?.status !== 'reviewed' || !proposal.review?.by) fail('APPLY-UNREVIEWED', where, 'the document is not reviewed by anyone named');
    const bytes = bytesOf(proposal.document.sha256);
    if (!bytes || sha256(bytes) !== proposal.document.sha256) { fail('APPLY-HASH', where, `no cached document hashing to ${proposal.document.sha256.slice(0, 12)}`); continue; }
    // Two identifiers for one document, or one identifier for two: refused, as for a sheet (apply.mjs).
    for (const src of [proposal.source?.row, proposal.currencyDocument?.source?.row].filter(Boolean)) {
      const owner = sourceBySha.get(src.SHA256);
      if (owner && owner !== src.SourceID) fail('APPLY-SHA-DUPLICATE', where, `this document is already registered as ${owner}`);
      const registered = sourceById.get(src.SourceID);
      if (registered && registered.SHA256 !== src.SHA256) fail('APPLY-SOURCE-COLLISION', where, `${src.SourceID} is already a document whose SHA-256 is ${String(registered.SHA256).slice(0, 12)}`);
    }
    let currency = null;
    if (proposal.currencyDocument) {
      const meta = bytesOf(proposal.currencyDocument.sha256);
      if (!meta || sha256(meta) !== proposal.currencyDocument.sha256) fail('APPLY-HASH', where, `no cached shop profile hashing to ${proposal.currencyDocument.sha256.slice(0, 12)}`);
      else currency = shopMeta(meta).currency;
    }
    const doc = readOffers(bytes, proposal.document.format, proposal.document.url);
    const body = proposal.document.format === 'shopify-catalogue' ? new Map(JSON.parse(bytes.toString('utf8')).products.map((p) => [String(p.id), stripTags(p.body_html)])) : new Map();
    const text = bytes.toString('utf8');
    for (const p of proposal.prices ?? []) {
      const at = `${where} ${p.row?.GradeID ?? '?'} ${p.offer?.key ?? '?'}`;
      if (!['accepted', 'rejected'].includes(p.review?.status)) { fail('APPLY-UNREVIEWED', at, `the row is "${p.review?.status ?? 'unreviewed'}"`); continue; }
      if (p.review.status === 'rejected') continue;
      if (!p.review.by) fail('APPLY-UNREVIEWED', at, 'accepted by nobody: a review records who');
      const o = doc.offers.find((x) => x.key === p.offer.key);
      if (!o) { fail('APPLY-PRICE-NOT-IN-OFFER', at, 'the document holds no such offer'); continue; }
      const r = p.row;
      const cur = o.currency ?? doc.currency ?? currency;
      const onSale = o.compareAt != null && o.compareAt > o.price;
      const want = { 'List price': onSale ? o.compareAt : o.price, 'Sale price': onSale ? o.price : NA, 'Displayed price': o.price,
        Stock: o.available === true ? 'In stock' : o.available === false ? 'Out of stock' : null, Currency: cur };
      for (const [field, value] of Object.entries(want)) {
        if (value == null) { fail('APPLY-PRICE-NOT-IN-OFFER', at, `the document states no ${field === 'Currency' ? 'currency' : field.toLowerCase()} for this offer`); continue; }
        const same = typeof value === 'number' ? Number(r[field]) === value : String(r[field]) === String(value);
        if (!same) fail('APPLY-PRICE-NOT-IN-OFFER', at, `${field} "${r[field]}" is not the offer's "${value}"`);
      }
      if (o.url !== r.URL) fail('APPLY-PRICE-NOT-IN-OFFER', at, `URL ${r.URL} is not the offer's ${o.url}`);
      if (proposal.document.format === 'amazon' && !namesMaker(grades.get(r.GradeID)?.Manufacturer, { vendor: o.soldBy, title: '' }) && !p.review.seller) {
        fail('APPLY-PRICE-GRADE', at, `sold by "${o.soldBy}", not the maker's own store`);
      }
      const words = p.offer.massFrom === 'description' ? body.get(o.product) ?? '' : o.title;
      const mass = massKg(words);
      if (mass == null || Number(r['Net mass kg']) !== mass) fail('APPLY-PRICE-MASS', at, `the listing's ${p.offer.massFrom === 'description' ? 'description' : 'title'} prints ${mass == null ? 'no single net mass' : `${mass} kg`}, the row says ${r['Net mass kg']}`);
      // The variant's own words decide where they state a diameter (a "Black / 2.85 mm" variant of a listing whose
      // description says 1.75 is not 1.75); otherwise its SKU, then the listing's description.
      const d = isOneSeventyFive(o.title) ?? isOneSeventyFive(o.sku) ?? isOneSeventyFive(`${o.productType} ${body.get(o.product) ?? ''}`);
      if (d === false || (d == null && !p.review.diameter)) fail('APPLY-PRICE-DIAMETER', at, d === false ? 'the listing sells another diameter' : 'the listing states no diameter and no reviewer says the product is sold only in 1.75 mm');
      const g = grades.get(r.GradeID);
      if (!g || g.Status !== 'active' || g.Role !== 'procurement') fail('APPLY-PRICE-GRADE', at, `${r.GradeID} is not an active procurement grade`);
      else {
        if (g.MaterialID !== r.MaterialID) fail('APPLY-PRICE-GRADE', at, `${r.GradeID} is a grade of ${g.MaterialID}, not ${r.MaterialID}`);
        if (!namesMaker(g.Manufacturer, o) && !p.review.maker) fail('APPLY-PRICE-GRADE', at, `the listing does not name ${g.Manufacturer} ("${o.vendor}", "${o.title}") and no reviewer says why it is theirs`);
      }
      if (!world.currencies.has(r.Currency)) fail('APPLY-PRICE-NOT-IN-OFFER', at, `${r.Currency} is not in schema/vocab/currencies.csv`);
      if (!world.markets.has(r.Market)) fail('APPLY-PRICE-GRADE', at, `"${r.Market}" is not in schema/vocab/markets.csv`);
      // A European price is before VAT only where its page says so ("excl. VAT", "HT", "zzgl. MwSt."); otherwise it
      // includes a rate, which must then be the one the page prints.
      if (r.Market === 'European storefront' && r['VAT included %'] === NA && !/excl(?:\.|uding|usive)?\s?(?:of\s)?(?:VAT|tax)|tax[- ]exclusive|prices are exclusive|\bHT\b|hors\s?taxes|zzgl\.?\s?(?:ges\.\s?)?MwSt|exkl\.?\s?MwSt|netto/i.test(text)) {
        fail('APPLY-PRICE-VAT', at, 'a European price recorded as before VAT, and the page does not say its prices exclude VAT');
      }
      if (r['VAT included %'] !== NA && r['VAT included %'] !== 'Not published') {
        const rate = String(r['VAT included %']).replace('.', '[.,]');
        if (!new RegExp(`(?:${rate})\\s?%[^<]{0,40}(?:VAT|MwSt|TVA|IVA|BTW|VAT)|(?:VAT|MwSt|TVA|IVA|BTW)[^<]{0,40}?${rate}\\s?%`, 'i').test(text)) fail('APPLY-PRICE-VAT', at, `the page does not state ${r['VAT included %']}% VAT`);
      }
      if (claimed.has(r.URL) && claimed.get(r.URL) !== r.GradeID) fail('APPLY-PRICE-DUPLICATE', at, `the listing is also accepted for ${claimed.get(r.URL)}`);
      claimed.set(r.URL, r.GradeID);
      const same = world.prices.find((x) => x.URL === r.URL && x['Access date'] === r['Access date'] && x.Retailer === r.Retailer);
      if (same && same.SourceID !== proposal.source.row.SourceID) fail('APPLY-PRICE-DUPLICATE', at, `the listing is already ${same.PriceID}`);
    }
  }
  return problems;
}

/** Write a reviewed price batch into an open set of tables. Idempotent: what is already recorded is left alone. */
export function writePrices(t, proposals, { migration, date }) {
  const log = [];
  const canadianMaterials = new Set();
  for (const proposal of proposals) {
    const accepted = (proposal.prices ?? []).filter((p) => p.review?.status === 'accepted');
    if (!accepted.length) continue;
    for (const src of [proposal.currencyDocument?.source?.row, proposal.source.row].filter(Boolean)) {
      if (!t.find('sources', src.SourceID)) { t.append('sources', src); log.push(`source ${src.SourceID}`); }
    }
    for (const p of accepted) {
      const r = p.row;
      if (t.rows('prices').some((x) => x.SourceID === proposal.source.row.SourceID && x.URL === r.URL && x.GradeID === r.GradeID)) continue;
      const id = nextId('prices', t.rows('prices').map((x) => x.PriceID));
      t.append('prices', { PriceID: id, ...r, SourceID: proposal.source.row.SourceID });
      log.push(`price ${id} ${r.GradeID} ${r['List price']} ${r.Currency} / ${r['Net mass kg']} kg (${r.Retailer})`);
      if (isCanadianMarket(r.Market) && r['Headline sample'] === 'TRUE') canadianMaterials.add(r.MaterialID);
    }
  }
  // A material that gains a Canadian price no longer has the gap its coverage row stated: the row is superseded by one
  // that says what is true now, never edited in place (m141's pattern, D72).
  for (const materialId of canadianMaterials) {
    const gaps = t.rows('coverage').filter((c) => c.MaterialID === materialId && c.Domain === 'Canadian price' && c.Status === 'Gap');
    if (!gaps.length) continue;
    const id = nextId('coverage', t.rows('coverage').map((c) => c.CoverageID));
    t.append('coverage', { CoverageID: id, MaterialID: materialId, GradeID: NA, Domain: 'Canadian price', Status: 'Resolved', 'Manufacturer count': NA,
      Finding: `A Canadian listing of its own products was sampled by the price pass (${migration}, ${date}); the build counts them.` });
    for (const old of gaps) {
      t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${id} (${date}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
      t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
    }
    log.push(`coverage ${id} (Canadian price of ${materialId})`);
  }
  return log;
}

/** Apply a batch to a copy of the tables and check the result. */
export function rehearse(proposals, { migration, date }) {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-prices-'));
  try {
    cpSync(join(projectRoot, 'data'), join(dir, 'data'), { recursive: true });
    cpSync(join(projectRoot, 'schema'), join(dir, 'schema'), { recursive: true });
    const t = openTables(dir);
    const log = writePrices(t, proposals, { migration, date });
    t.save();
    const gate = checkData(join(dir, 'data'), join(dir, 'schema'));
    let lint = [], build = [];
    if (!gate.issues.length) {
      const tables = Object.fromEntries(Object.keys(gate.schemas).map((n) => {
        const { header, records } = readCsv(join(dir, 'data/tables', `${n}.csv`));
        return [n, { header, rows: records.map((r) => r.values) }];
      }));
      const baseline = new Set(readCsv(join(dir, 'data/review/accepted-findings.csv')).records
        .map((r) => findingKey({ code: r.values.Code, table: r.values.Table, record: r.values.Record, field: r.values.Field ?? '' })));
      lint = lintData(tables, gate.schemas).filter((f) => !baseline.has(findingKey(f)));
      const wb = loadTables(join(dir, 'data'));
      build = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'apply', estimates: false }).issues.filter((i) => i.level === 'error');
    }
    return { log, gate: gate.issues, lint, build };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The whole of it: guard, rehearse, then write. Throws a Refusal and writes nothing if anything is wrong. */
export function applyPriceBatch(batch, { migration = batch, date = new Date().toISOString().slice(0, 10), dryRun = false } = {}) {
  const proposals = proposalsOf(batch);
  const problems = guard(proposals, worldOf());
  if (problems.length) throw new Refusal(problems);
  const rehearsal = rehearse(proposals, { migration, date });
  const after = [
    ...rehearsal.gate.map((i) => ({ code: 'APPLY-SCHEMA', where: i.where, message: i.message })),
    ...rehearsal.lint.map((i) => ({ code: 'APPLY-LINT', where: i.where, message: `${i.code}: ${i.message}` })),
    ...rehearsal.build.map((i) => ({ code: 'APPLY-CORE-BUILD', where: i.where, message: `${i.code}: ${i.message}` })),
  ];
  if (after.length) throw new Refusal(after);
  if (dryRun) return { log: rehearsal.log, written: false };
  const t = openTables();
  const log = writePrices(t, proposals, { migration, date });
  t.save();
  if (log.some((l) => l.startsWith('source '))) console.warn('Source backup: re-export after this batch: npm run data:sources -- --export "$H2C_SOURCE_BACKUP"');
  return { log, written: true };
}

// ---------------------------------------------------------------------------------------------------------- command

if (process.argv[1]?.endsWith('prices.mjs')) {
  const [command] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const batch = arg('batch');
  if (!batch) { console.error('usage: npm run ingest:prices -- <capture|offers|propose|apply> --batch pNN ...'); process.exit(2); }
  try {
    if (command === 'capture' && arg('shop')) {
      const r = await captureShop(batch, arg('shop'));
      console.log(`${arg('shop')}: ${r.pages} catalogue page(s), ${r.products} products`);
    } else if (command === 'capture' && arg('from')) {
      // A list of pages (columns URL, Format): each fetched as served, or drawn by a browser where its format needs it.
      const list = rows(arg('from'));
      const drawn = list.filter((r) => r.Format === 'amazon');
      for (const r of list.filter((x) => x.Format !== 'amazon')) {
        try { const got = await capturePage(batch, r.URL, r.Format); console.log(`${got.sha.slice(0, 12)} ${got.offers} offer(s)  ${r.URL}`); } catch (e) { console.log(`FAILED ${r.URL}: ${e.message}`); }
        await sleep(900);
      }
      if (drawn.length) for (const got of await captureRendered(batch, drawn.map((r) => r.URL), 'amazon')) console.log(`${got.sha.slice(0, 12)} ${got.offers} offer(s)${got.ready ? '' : ' (no price drawn)'}  ${got.url}`);
    } else if (command === 'capture' && arg('url')) {
      const format = arg('format', 'jsonld');
      if (format === 'amazon') console.log(await captureRendered(batch, [arg('url')], format));
      else console.log(await capturePage(batch, arg('url'), format));
    } else if (command === 'offers') {
      const vendor = arg('vendor'), grep = arg('grep');
      const list = batchOffers(batch).filter((o) => (!vendor || plain(o.vendor).includes(plain(vendor))) && (!grep || new RegExp(grep, 'i').test(o.title)));
      const out = list.map((o) => ({ Host: o.capture.Host, SHA256: o.capture.SHA256, Offer: o.key, Vendor: o.vendor, Title: o.title, SKU: o.sku ?? '', Price: o.price, 'Compare at': o.compareAt ?? '', Currency: o.currency ?? '', Available: o.available, 'Mass kg': massKg(o.title) ?? '', '1.75': isOneSeventyFive(`${o.title} ${o.description}`) ?? '', URL: o.url }));
      const file = arg('out');
      if (file) { writeFileSync(file, csvText(Object.keys(out[0] ?? { Host: '' }), out)); console.log(`${out.length} offer(s) -> ${file}`); } else for (const o of out) console.log(`${o.Offer}\t${o.Vendor}\t${o.Title}\t${o.Price} ${o.Currency}\t${o.Available}`);
    } else if (command === 'propose') {
      console.log(`${propose(batch)} proposal(s) written to ${join(PROPOSALS, batch)}`);
    } else if (command === 'apply') {
      const { log, written } = applyPriceBatch(batch, { migration: arg('migration', batch), dryRun: process.argv.includes('--dry-run') });
      console.log(`${log.length} record(s) ${written ? 'written' : 'would be written'}`);
      for (const line of log.slice(0, 60)) console.log(`  ${line}`);
      if (log.length > 60) console.log(`  ... and ${log.length - 60} more`);
    } else {
      console.error(`unknown command "${command}"`); process.exit(2);
    }
  } catch (e) {
    console.error(e instanceof Refusal ? `Nothing written. ${e.message}` : e.stack ?? e.message);
    process.exit(1);
  }
}

export { SELECTED_HEADER, CAPTURE_HEADER };
