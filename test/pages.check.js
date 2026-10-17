// The material pages in dist/materials/, held against the database they were rendered from (the pages reimagined,
// 2026-10-17). The build's stage 8 writes, for each material the page rule admits (app/js/ui/page-rule.js), its Overview
// (<id>.html), its Products page (<id>-products.html) and a stub at its old records page's address (<id>-records.html);
// then the index of every material (the hub), the page on how the numbers are worked out (method.html) and the shared
// assets. This check reads those files back, with dist/db.json and dist/manifest.json, and fails when a page says what
// the records do not. A page is a view of the database and decides nothing, so every number, mark, record and link on it
// has an owner in the data. The check reads the pages by the data hooks their markup carries for it
// (docs/audits/2026-10-17-pages-reimagined/HOOKS.md), never by their words, and finds each hook's owner through the facts
// layer the selector's drawer also reads (material-facts.js), or the display statistics the figures draw
// (material-stats.js) where the hook is a figure's; the comment on each invariant says which.
//
// Run it after a build:
//
//   npm run build && npm run pages:check
//
// It reads only: nothing is built or written here. It fails with "run npm run build" when dist/materials/ is missing or
// does not match dist/db.json and dist/manifest.json. `verify` runs it after the build, beside the snapshot check
// (scripts/verify.mjs), which is why it is not in `npm test`. Every invariant collects its failures, with the material,
// so one run shows every problem; a failing test prints the first twenty.
//
//   P1   the files are exactly each admitted material's three pages, the index, the method page and the four assets; each
//        HTML file has one doctype, balanced tags, one main of the right kind; an Overview's sections are SECTIONS' in
//        order, the empty ones left out, and its bar lists exactly the sections present
//   P2   the tabs count the material's products as the drawer does (identity); the Products page holds one card per
//        product and reference specimen, the specimens apart
//   P3   each key figure is the compiled median and count, or says why there is none; every number a sentence marks
//        (data-stat) and every value in the Products list is the compiled one
//   P5   the figures: each strip's marks are the products' own values (spreadEntries) with their kinds; the
//        alternatives are peerSet's; the maps' and the layers' product points are those with both values; every
//        material mark is that material's median, every product mark that product's own value; each figure has its table
//   P6   printing: the H2C's limits are db.meta.h2cBaseline; the temperature rows shade printWindows' runs, mark its
//        one-end windows and every product's drying; On the H2C and the settings table name their settings once
//   REC  every record of a material (measurement, print profile, maker statement, environment statement, resin reference
//        row, price listing, document, known gap) is on its Overview or Products page exactly once, a product's in its own
//        card, but the two kinds the pages leave off by design (records/placement.js offThePages); nothing else carries
//        a record but an estimate
//   P7   every external link is the URL of a document the material's records cite or of one of its price listings, and
//        each cited document with an original is linked
//   P8   every internal link resolves to a file and an anchor; each way back opens the selector fresh, with this
//        material's drawer; the stub sends an old link on to the Products page
//   P9   no record ID, project coinage or retired phrase in what a reader sees (the text, the tooltips, the list's words)
//   P10  the release, the snapshot and the build stamped on every page are the database's
//   P11  every file is within its budget (app/pages/budget.js), the set within its own
//   P12  the written summary: only a material with a page has one; its filled numbers are the compiled values, printed as
//        plain text, its status and byline said
//   P13  the drawer has a "Full page" link exactly for the materials with a page, in the same tab, carrying the selection
//   P14  a fresh render of dist/db.json equals dist/materials/ byte for byte; fonts are embedded data: URIs, licences sit
//        beside them; the manifest's digest and counts agree with the files
//   IX   the index lists every material once, linked exactly where the rule gives a page, and every group name
//
// Dropped with the old pages: P4 (the rank tracks: the plate draws no peer ticks now, comparing is the figure's job,
// whose rug P5's material marks hold) and CNT (one section's counts against another's: each fact is said once now, and
// P3's data-stat check holds every marked number to the facts directly).

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSite, pageEnv, prepare } from '../app/pages/render.js';
import { readAssets } from '../app/pages/read-assets.js';
import { PAGE_BUDGET } from '../app/pages/budget.js';
import { SECTIONS } from '../app/pages/sections/index.js';
import { PEER_COLUMNS, MAP_PANELS, STRIP_SETS, LAYER_PAIRS } from '../app/pages/figures.js';
import { PAGES_DIR, pageOf } from '../app/js/ui/page-rule.js';
import { indexDb, materialContext, identity, spreadEntries, originalOf, isProduct, stated, soldToughened } from '../app/js/ui/material-facts.js';
import { peerSet, printWindows, dryingStats, layerPairs } from '../app/js/ui/material-stats.js';
import { fmtNumber } from '../app/js/ui/format.js';
import { SUMMARY_STATUS } from '../app/js/ui/labels.js';
import { fromHash, toHash, newScenario } from '../app/js/engine/scenario.js';
import { renderDrawer } from '../app/js/ui/detail.js';
import { offThePages } from '../app/pages/records/placement.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(root, 'dist');
const PAGES = join(DIST, PAGES_DIR);
const REBUILD = 'run `npm run build`';

// ---------------------------------------------------------------------------------------------------------------------
// The failures, per invariant

const FAILS = {};
const CHECKED = {};
/** One check of an invariant: counted, and recorded with its subject (a material, a file) where it fails. */
function check(inv, who, ok, what) {
  CHECKED[inv] = (CHECKED[inv] ?? 0) + 1;
  if (!ok) (FAILS[inv] ??= []).push(`${who}: ${typeof what === 'function' ? what() : what}`);
  return ok;
}
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const sorted = (list) => [...list].sort();
const same = (a, b) => sameList(sorted(a), sorted(b));
/** The first few items of a list that differ from another, both ways, for a failure's words. */
const diff = (got, want) => {
  const g = new Map(), w = new Map();
  for (const x of got) g.set(x, (g.get(x) ?? 0) + 1);
  for (const x of want) w.set(x, (w.get(x) ?? 0) + 1);
  const extra = [...g].filter(([k, n]) => n > (w.get(k) ?? 0)).map(([k]) => k);
  const missing = [...w].filter(([k, n]) => n > (g.get(k) ?? 0)).map(([k]) => k);
  return `${got.length} on the page, ${want.length} in the records; on the page only: ${extra.slice(0, 3).join(' ; ') || 'none'}; in the records only: ${missing.slice(0, 3).join(' ; ') || 'none'}`;
};
/** Two numbers as the page's data-v attribute and the compiled value: the same number. */
const eq = (attr, v) => attr !== undefined && v != null && Number(attr) === Number(v);

// ---------------------------------------------------------------------------------------------------------------------
// A small HTML reader: a tree with parents, balance checking and the few selectors the checks use

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAWTEXT = new Set(['script', 'style']);
const TOKEN = /<!--[\s\S]*?-->|<!doctype[^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/gi;
const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const unescape = (s) => s.replace(/&(#39|amp|lt|gt|quot|#x27|#(\d+));/g, (m, n, d) => ({ '#39': '\'', '#x27': '\'', amp: '&', lt: '<', gt: '>', quot: '"' }[n] ?? (d ? String.fromCodePoint(+d) : m)));

/** Parse a document: { root, errors (tags that do not balance), doctypes }. Void elements and `<x/>` need no end tag. */
function parse(html) {
  const root = { tag: '#root', attrs: {}, kids: [] };
  const stack = [root];
  const errors = [];
  let doctypes = 0;
  let at = 0;
  let m;
  const lower = html.toLowerCase();
  TOKEN.lastIndex = 0;
  const text = (s) => { if (s) stack.at(-1).kids.push(unescape(s)); };
  while ((m = TOKEN.exec(html))) {
    text(html.slice(at, m.index));
    at = TOKEN.lastIndex;
    if (m[0].startsWith('<!--')) continue;
    if (/^<!doctype/i.test(m[0])) { doctypes++; continue; }
    const [, closing, name, attrText, selfClose] = m;
    const tag = name.toLowerCase();
    if (closing) {
      if (stack.at(-1).tag === tag) stack.pop(); else errors.push(`</${tag}> where <${stack.at(-1).tag}> is open`);
      continue;
    }
    const attrs = {};
    for (const a of attrText.matchAll(ATTR)) attrs[a[1].toLowerCase()] = unescape(a[2] ?? a[3] ?? a[4] ?? '');
    const node = { tag, attrs, kids: [], parent: stack.at(-1) };
    stack.at(-1).kids.push(node);
    if (VOID.has(tag) || selfClose) continue;
    if (RAWTEXT.has(tag)) {
      const end = lower.indexOf(`</${tag}>`, at);
      if (end < 0) { errors.push(`<${tag}> never closes`); break; }
      node.kids.push(html.slice(at, end));
      node.raw = true;
      at = end + tag.length + 3;
      TOKEN.lastIndex = at;
      continue;
    }
    stack.push(node);
  }
  text(html.slice(at));
  if (stack.length > 1) errors.push(`left open: ${stack.slice(1).map((n) => n.tag).join(' > ')}`);
  return { root, errors, doctypes };
}

const compoundOf = (s) => {
  const head = /^([\w*-]*)/.exec(s);
  const spec = { tag: head[1] && head[1] !== '*' ? head[1] : null, cls: [], attrs: [] };
  for (const p of s.slice(head[1].length).matchAll(/\.([\w-]+)|#([\w-]+)|\[([\w:-]+)(?:([~^$*]?=)("[^"]*"|'[^']*'|[^\]]*))?\]/g)) {
    if (p[1]) spec.cls.push(p[1]);
    else if (p[2]) spec.attrs.push(['id', '=', p[2]]);
    else spec.attrs.push([p[3], p[4] ?? null, p[5] == null ? null : p[5].replace(/^["']|["']$/g, '')]);
  }
  return spec;
};
const compileSelector = (sel) => {
  const steps = [];
  let comb = ' ';
  for (const part of sel.trim().split(/\s+/)) {
    if (part === '>') { comb = '>'; continue; }
    steps.push({ spec: compoundOf(part), comb });
    comb = ' ';
  }
  return steps;
};
function matchCompound(n, spec) {
  if (!n.tag || n.tag === '#root') return false;
  if (spec.tag && n.tag !== spec.tag) return false;
  if (spec.cls.length) {
    const have = (n.attrs.class ?? '').split(/\s+/);
    if (!spec.cls.every((c) => have.includes(c))) return false;
  }
  return spec.attrs.every(([k, op, v]) => {
    const got = n.attrs[k];
    if (got === undefined) return false;
    return op === null || (op === '=' ? got === v : op === '^=' ? got.startsWith(v) : op === '$=' ? got.endsWith(v) : op === '*=' ? got.includes(v) : op === '~=' ? got.split(/\s+/).includes(v) : false);
  });
}
function matchSteps(n, steps, i) {
  if (!matchCompound(n, steps[i].spec)) return false;
  if (i === 0) return true;
  if (steps[i].comb === '>') return !!n.parent && matchSteps(n.parent, steps, i - 1);
  for (let p = n.parent; p; p = p.parent) if (matchSteps(p, steps, i - 1)) return true;
  return false;
}
const descendants = (node) => {
  if (node.flat) return node.flat;
  const out = [];
  (function walk(n) { for (const k of n.kids) if (typeof k === 'object') { out.push(k); walk(k); } })(node);
  node.flat = out;
  return out;
};
/** Every element under `scope` matching a selector (tags, classes, #id, [attr], [attr=v], [attr^=v], and ' ' and '>'). */
function query(scope, sel) {
  const steps = compileSelector(sel);
  return descendants(scope).filter((n) => matchSteps(n, steps, steps.length - 1));
}
const query1 = (scope, sel) => query(scope, sel)[0] ?? null;
/** Every element under `scope` carrying all the attributes named (the data hooks). */
const withAttrs = (scope, ...names) => descendants(scope).filter((n) => names.every((k) => n.attrs[k] !== undefined));
/** The nearest ancestor (or the element itself) carrying an attribute. */
const up = (n, name) => { for (let p = n; p; p = p.parent) if (p.attrs?.[name] !== undefined) return p; return null; };

const BLOCK = new Set(['p', 'div', 'li', 'ul', 'ol', 'tr', 'td', 'th', 'dt', 'dd', 'dl', 'h1', 'h2', 'h3', 'h4', 'section', 'figure', 'figcaption', 'summary', 'details', 'table', 'br', 'text', 'header', 'footer', 'nav', 'main', 'label', 'button', 'small']);
/** The text under a node, as a reader sees it: blocks apart, no word joiners or soft hyphens; `skip(el)` leaves an element out. */
function textOf(node, skip = null) {
  let out = '';
  (function walk(n) {
    for (const k of n.kids) {
      if (typeof k === 'string') { out += k; continue; }
      if (RAWTEXT.has(k.tag) || (skip && skip(k))) continue;
      const block = BLOCK.has(k.tag);
      if (block) out += ' ';
      walk(k);
      if (block) out += ' ';
    }
  })(node);
  return out.replace(/[\u2060\u00ad]/g, '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
const hasClass = (n, c) => (n.attrs.class ?? '').split(/\s+/).includes(c);

/** A page: its source, its tree, and the lookups the checks share. */
function makePage(file, html) {
  const { root: tree, errors, doctypes } = parse(html);
  const ids = new Map();
  const duplicateIds = [];
  for (const n of descendants(tree)) {
    if (n.attrs.id !== undefined) { if (ids.has(n.attrs.id)) duplicateIds.push(n.attrs.id); ids.set(n.attrs.id, n); }
  }
  const main = query1(tree, 'main');
  const cache = new Map();
  return {
    file, html, tree, errors, doctypes, ids, duplicateIds, main,
    kind: main?.attrs['data-page'] ?? null,
    materialId: main?.attrs['data-material'] ?? null,
    q: (sel) => { if (!cache.has(sel)) cache.set(sel, query(tree, sel)); return cache.get(sel); },
    q1: (sel) => query1(tree, sel),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The state: the database, the files on disk, a fresh render, every page read, and every material's context

let STATE = null;
let STATE_ERROR = null;

function load() {
  if (STATE) return STATE;
  if (STATE_ERROR) throw STATE_ERROR;
  try {
    STATE = loadOnce();
  } catch (e) {
    STATE_ERROR = e;
    throw e;
  }
  return STATE;
}

function loadOnce() {
  for (const f of ['db.json', 'manifest.json']) {
    if (!existsSync(join(DIST, f))) throw new Error(`dist/${f} is missing: ${REBUILD} first.`);
  }
  if (!existsSync(PAGES)) throw new Error(`dist/${PAGES_DIR}/ is missing: ${REBUILD} first (the build's stage 8 writes the material pages).`);
  const dbText = readFileSync(join(DIST, 'db.json'), 'utf8');
  const db = JSON.parse(dbText);
  const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8'));
  const selectors = readdirSync(DIST).filter((f) => /^H2C_Material_Selector_.*\.html$/.test(f));
  if (selectors.length !== 1) throw new Error(`dist/ holds ${selectors.length} selector pages, not one: ${REBUILD}.`);
  const selectorFile = selectors[0];

  prepare(db);
  const ix = indexDb(db);
  const listed = db.materials.filter((m) => !m.familyEntry);
  const withPage = listed.filter((m) => pageOf(m, ix.measurementsByMaterial.get(m.id) ?? []));

  // The files on disk, by their path under dist/ ("materials/M020.html").
  const disk = new Map();
  for (const rel of readdirSync(PAGES, { recursive: true })) {
    const full = join(PAGES, rel);
    if (statSync(full).isFile()) disk.set(`${PAGES_DIR}/${String(rel).split('\\').join('/')}`, readFileSync(full));
  }

  // The pages, read once.
  const pages = new Map();
  for (const [path, buf] of disk) if (path.endsWith('.html')) pages.set(basename(path), makePage(basename(path), buf.toString('utf8')));

  // A fresh render of the database, once: P14 holds the files to it byte for byte, and P1 reads from it which sections
  // the renderer found empty (renderSite's stats: the section's own emptiness, which only it can say).
  const fresh = renderSite(db, pageEnv(db, { assets: readAssets(root), selectorFile }));
  const emptyById = new Map((fresh.stats.perPage ?? []).map((p) => [p.id, new Set(p.empty ?? [])]));

  const contexts = new Map(withPage.map((m) => [m.id, materialContext(db, m.id, { showEstimates: true })]));
  const headlines = new Map(db.registry.headlines.map((h) => [h.key, h]));
  return { db, dbText, manifest, selectorFile, ix, listed, withPage, disk, pages, contexts, fresh, emptyById, headlines };
}

/** A material's two pages and its stub. */
const pagesOf = (S, id) => ({ ov: S.pages.get(`${id}.html`), pr: S.pages.get(`${id}-products.html`), stub: S.pages.get(`${id}-records.html`) });

// ---------------------------------------------------------------------------------------------------------------------
// What the database says, worked out here from the facts layer

/** A product mark's kinds as the figures' key names them: one of compared, as-published, variant; annealed; claimed. */
function kindsOf(h, e, c) {
  const base = e.variant ? 'variant' : e.v.level === 'as-published' ? 'as-published' : 'compared';
  return [base, e.v.anneal ? 'annealed' : null, h.toughened && soldToughened(e.g, e.v, c) ? 'claimed' : null].filter(Boolean);
}
const kindText = (s) => sorted(Array.isArray(s) ? s : String(s ?? '').split(/\s+/).filter(Boolean)).join('+');
const markKey = (g, v, kinds) => `${g}|${Number(v)}|${kindText(kinds)}`;

/** A material's value of one key property as a figure draws it: compared (its median), as published (its range), or none. */
function cellOf(m, key) {
  const e = m.headline?.[key], s = m.summary?.[key];
  if (e?.known) return { kind: 'compared', median: e.value };
  if (s?.asPublished?.n) return { kind: 'as-published', min: s.asPublished.min, max: s.asPublished.max };
  return null;
}

/** The print setting a product's mark or cell gives: a window's low end (else its high end), a drying temperature. */
function settingValue(g, key) {
  if (key === 'drying') return g.print?.drying?.tempC ?? null;
  const s = g.print?.[key];
  return s?.state === 'range' ? s.min ?? s.max ?? null : null;
}

/**
 * The records of a material the pages hold, by ID, with their kind (records/placement.js names the kinds): its
 * measurements, print profiles, its products' maker statements, its environment statements, its resin's reference rows,
 * its price listings, the documents they cite and its known gaps. The two kinds on neither page by design, the
 * project's own reading of a source and the maintainers' coverage notes, are left out by the renderer's own rule
 * (placement.js offThePages), which is the one place that says so.
 */
function recordsOf(S, c) {
  const kh = S.ix.knowHowByGrade;
  const out = new Map();
  const add = (type, r, id = r.id, gradeId = r.gradeId) => { if (stated(id) && !offThePages(type, r)) out.set(id, { type, gradeId: stated(gradeId) ? gradeId : null }); };
  for (const x of c.ms) add('measurement', x);
  for (const p of c.profiles) add('profile', p);
  for (const g of c.grades) for (const k of kh.get(g.id) ?? []) add('statement', k);
  for (const e of c.ev) add('environment', e);
  for (const r of c.poly ?? []) add('resin', r, r.id, null);
  for (const p of c.prices) add('listing', p);
  for (const sid of c.documents.keys()) add('document', S.ix.sourceById.get(sid) ?? { id: sid }, sid, null);
  for (const r of c.cov) add('coverage', r, r.id, null);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// P1  the files, the markup, the sections

/** The kind of page each file is. */
const kindOfFile = (file) => (file === 'index.html' ? 'hub' : file === 'method.html' ? 'method' : file.endsWith('-products.html') ? 'products' : file.endsWith('-records.html') ? 'stub' : 'overview');

function p1(S) {
  const expected = new Set([`${PAGES_DIR}/index.html`, `${PAGES_DIR}/method.html`, ...['pages.css', 'page.js', 'Inter-OFL.txt', 'Newsreader-OFL.txt'].map((f) => `${PAGES_DIR}/assets/${f}`)]);
  for (const m of S.withPage) for (const f of [`${m.id}.html`, `${m.id}-products.html`, `${m.id}-records.html`]) expected.add(`${PAGES_DIR}/${f}`);
  const missing = [...expected].filter((f) => !S.disk.has(f));
  const extra = [...S.disk.keys()].filter((f) => !expected.has(f));
  check('P1', 'files', !missing.length && !extra.length, () => `missing ${missing.slice(0, 5).join(', ') || 'none'}; unexpected ${extra.slice(0, 5).join(', ') || 'none'} (${REBUILD} if the pages are stale)`);
  check('P1', 'files', S.withPage.length > 0, 'no material has a page');

  for (const page of S.pages.values()) {
    const who = page.file;
    check('P1', who, page.doctypes === 1, `${page.doctypes} doctypes`);
    check('P1', who, !page.errors.length, () => `unbalanced tags: ${page.errors.slice(0, 3).join('; ')}`);
    check('P1', who, !page.duplicateIds.length, () => `duplicate ids ${page.duplicateIds.slice(0, 4).join(', ')}`);
    check('P1', who, !!page.main && page.q('main').length === 1, 'not exactly one <main>');
    check('P1', who, page.q('h1').length === 1, `${page.q('h1').length} <h1>`);
    const kind = kindOfFile(who);
    check('P1', who, page.kind === kind, `main[data-page] is "${page.kind}", not "${kind}"`);
    const material = ['overview', 'products', 'stub'].includes(kind) ? who.replace(/(-products|-records)?\.html$/, '') : undefined;
    check('P1', who, (page.materialId ?? undefined) === material, `main[data-material] is "${page.materialId}", not "${material}"`);
  }

  const bySection = new Map(SECTIONS.map((s) => [s.id, s]));
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const { ov, pr } = pagesOf(S, m.id);
    if (!ov || !pr) continue;
    const who = m.id;
    // The sections present, in SECTIONS' order: the masthead is the page's head, the colophon the footer's.
    const at = (id) => (id === 'masthead' ? !!ov.q1('header.phead') && !!withAttrs(ov.main, 'data-section').find((n) => n.attrs['data-section'] === 'key-figures')
      : id === 'footer' ? !!withAttrs(ov.main, 'data-section').find((n) => n.attrs['data-section'] === 'colophon')
        : withAttrs(ov.main, 'data-section').some((n) => n.attrs['data-section'] === id));
    const empty = S.emptyById.get(m.id) ?? new Set();
    const present = SECTIONS.map((s) => s.id).filter(at);
    const want = SECTIONS.map((s) => s.id).filter((id) => !empty.has(id));
    check('P1', who, sameList(present, want), () => `sections ${present.join(' ')}; the renderer's non-empty ones ${want.join(' ')}`);
    // In the page's own order too (a section's place is its place in the list).
    const order = withAttrs(ov.main, 'data-section').map((n) => n.attrs['data-section']).filter((id) => bySection.has(id) && id !== 'masthead' && id !== 'footer');
    check('P1', who, sameList(order, present.filter((id) => id !== 'masthead' && id !== 'footer')), () => `sections in the page's order ${order.join(' ')}`);
    // What is on file is never left out: the documents (Sources), the print settings (Printing), the products, and an
    // estimate where a key property has no measured value.
    const estimates = S.db.registry.headlines.some((h) => !h.drawerOnly && !m.headline?.[h.key]?.known && m.headline?.[h.key]?.estimate) || !!(m.print?.nozzleEstimate || m.print?.bedEstimate || m.print?.chamberEstimate);
    const onFile = { sources: c.documents.size > 0, printing: c.profiles.length > 0 || !!c.guide, products: c.grades.some(isProduct), estimates };
    for (const [id, has] of Object.entries(onFile)) {
      if (id === 'estimates') check('P1', who, present.includes(id) === has, `Estimated values ${present.includes(id) ? 'present' : 'absent'}, ${has ? 'an' : 'no'} estimate on file`);
      else if (has) check('P1', who, present.includes(id), `${id} is on file but has no section`);
    }
    // An empty section leaves the page: each titled one says something under its heading.
    for (const s of SECTIONS.filter((x) => x.title && !x.bare && present.includes(x.id))) {
      const sec = ov.ids.get(s.id);
      const h2 = sec && query1(sec, 'h2');
      check('P1', who, !!sec && !!h2 && textOf(sec).length > textOf(h2).length + 10, `the ${s.id} section is empty or has no heading`);
    }
    // The bar lists the page's top and every titled section present (the products hand-off is the Products tab).
    const bar = (page) => query(page.tree, '.atlas-bar a[href^="#"]').map((a) => a.attrs.href);
    const wantBar = ['#top', ...SECTIONS.filter((s) => s.title && s.menu !== false && present.includes(s.id)).map((s) => `#${s.id}`)];
    check('P1', who, sameList(bar(ov), wantBar), () => `the bar lists ${bar(ov).join(' ')}, the sections present ${wantBar.join(' ')}`);
    const refs = c.grades.some((g) => !isProduct(g));
    check('P1', `${who} products`, sameList(bar(pr), ['#top', ...(refs ? ['#ref-h'] : [])]), () => `the Products page's bar lists ${bar(pr).join(' ')}`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P2  the products: the tabs' count, one card per product and reference specimen

function p2(S) {
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const { ov, pr } = pagesOf(S, m.id);
    if (!ov || !pr) continue;
    const who = m.id;
    // The drawer's count (material-facts.js identity): the material's products you can buy.
    const n = identity(m, c).products;
    for (const page of [ov, pr]) {
      const tabs = withAttrs(page.main, 'data-tab');
      const products = tabs.filter((a) => a.attrs['data-tab'] === 'products');
      const overview = tabs.filter((a) => a.attrs['data-tab'] === 'overview');
      check('P2', `${who} ${page.kind}`, products.length === 1 && overview.length === 1, `${overview.length} Overview and ${products.length} Products tabs`);
      if (products[0]) check('P2', `${who} ${page.kind}`, Number(products[0].attrs['data-n']) === n, () => `the Products tab counts ${products[0].attrs['data-n']}, the material has ${n} products`);
      const current = tabs.filter((a) => a.attrs['aria-current'] === 'page').map((a) => a.attrs['data-tab']);
      check('P2', `${who} ${page.kind}`, sameList(current, [page.kind]), () => `the current tab is ${current.join(', ') || 'none'}`);
    }
    // One card per product and reference specimen (c.grades: the material's, none retired), the specimens apart.
    const cards = query(pr.main, 'details[data-grade]');
    const ids = cards.map((d) => d.attrs['data-grade']);
    check('P2', who, cards.length === c.grades.length && same(ids, c.grades.map((g) => g.id)), () => `cards: ${diff(ids, c.grades.map((g) => g.id))}`);
    const inRef = cards.filter((d) => up(d, 'data-group')?.attrs['data-group'] === 'reference').map((d) => d.attrs['data-grade']);
    check('P2', who, same(inRef, c.grades.filter((g) => !isProduct(g)).map((g) => g.id)), () => `reference group: ${diff(inRef, c.grades.filter((g) => !isProduct(g)).map((g) => g.id))}`);
    check('P2', who, cards.every((d) => d.attrs.id === d.attrs['data-grade']), 'a card is not its own anchor (#G…)');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P3  key figures, the numbers sentences mark, and the values of the Products list

/** What a sentence's marked number states (data-stat), from the compiled fields: materials[].summary and .headline. */
function statValue(S, m, key, stat, grade) {
  const s = m.summary?.[key] ?? {};
  const e = m.headline?.[key] ?? {};
  if (stat === 'product') return S.ix.gradeById.get(grade)?.headline?.[key]?.value;
  if (stat === 'median') return s.n ? s.median : e.known ? e.value : undefined;
  if (['n', 'min', 'max', 'q1', 'q3'].includes(stat)) return s[stat] ?? e.spread?.[stat];
  if (stat.startsWith('asPublished.')) return s.asPublished?.[stat.split('.')[1]];
  if (stat.startsWith('estimate.')) return e.estimate?.[stat.split('.')[1]];
  return undefined;
}

function p3(S) {
  const plateKeys = PEER_COLUMNS.map((x) => (typeof x === 'string' ? x : x.key));
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const { ov, pr } = pagesOf(S, m.id);
    if (!ov || !pr) continue;
    const who = m.id;
    const plate = withAttrs(ov.main, 'data-section').find((n) => n.attrs['data-section'] === 'key-figures');
    if (!check('P3', who, !!plate, 'no key-figure plate')) continue;
    // A cell is a key figure; a number its evidence line marks (data-stat) is held to the facts below.
    const cells = withAttrs(plate, 'data-key').filter((n) => n.attrs['data-stat'] === undefined && (n.attrs['data-v'] !== undefined || n.attrs['data-state'] !== undefined));
    check('P3', who, sameList(cells.map((n) => n.attrs['data-key']), plateKeys), () => `the plate's figures ${cells.map((n) => n.attrs['data-key']).join(' ')}, the alternatives' columns ${plateKeys.join(' ')}`);
    for (const cell of cells) {
      const key = cell.attrs['data-key'];
      const w = `${who} ${key}`;
      const e = m.headline?.[key];
      const s = m.summary?.[key];
      const mini = withAttrs(plate, 'data-mini').filter((n) => n.attrs['data-mini'] === key);
      if (e?.known) {
        const n = s?.n ?? e.spread?.n ?? 1;
        check('P3', w, eq(cell.attrs['data-v'], e.value) && eq(cell.attrs['data-n'], n) && cell.attrs['data-state'] === undefined,
          () => `data-v ${cell.attrs['data-v']} data-n ${cell.attrs['data-n']}, compiled median ${e.value} of ${n} products`);
        // The headline and the summary are one median (the drawer reads the one, the pages the other).
        if (s?.n && e.spread?.n) check('P3', w, s.n === e.spread.n && s.median === e.value, () => `summary ${s.median} of ${s.n}, headline ${e.value} of ${e.spread.n}`);
        check('P3', w, mini.length === 1 && eq(mini[0].attrs['data-n'], n), () => `${mini.length} spread drawings, data-n ${mini[0]?.attrs['data-n']}, compiled ${n}`);
      } else if (e?.notApplicable) {
        check('P3', w, cell.attrs['data-state'] === 'na' && cell.attrs['data-v'] === undefined, () => `does not apply, shown as ${cell.attrs['data-state'] ?? `the value ${cell.attrs['data-v']}`}`);
        check('P3', w, !mini.length, 'a spread drawn where the property does not apply');
      } else if (s?.asPublished?.n) {
        check('P3', w, cell.attrs['data-state'] === 'as-published' && eq(cell.attrs['data-n'], s.asPublished.n) && cell.attrs['data-v'] === undefined,
          () => `${s.asPublished.n} products publish it with no stated basis; shown as ${cell.attrs['data-state'] ?? `the value ${cell.attrs['data-v']}`} of ${cell.attrs['data-n']}`);
        // Its spread is drawn where the plate draws one (hollow, as published): of the same products.
        check('P3', w, mini.length <= 1 && (!mini.length || eq(mini[0].attrs['data-n'], s.asPublished.n)), () => `${mini.length} spread drawings, data-n ${mini[0]?.attrs['data-n']}, as published ${s.asPublished.n}`);
      } else {
        check('P3', w, cell.attrs['data-state'] === 'missing' && cell.attrs['data-v'] === undefined, () => `nothing on file, shown as ${cell.attrs['data-state'] ?? `the value ${cell.attrs['data-v']}`}`);
        check('P3', w, !mini.length, 'a spread drawn with nothing on file');
      }
    }

    // A number a sentence states (findings.js num): the compiled field it names. A shown value may be in a more readable
    // unit than data-v, so data-v is what is held to the facts.
    for (const page of [ov, pr]) {
      for (const n of withAttrs(page.main, 'data-v', 'data-key', 'data-stat')) {
        const key = n.attrs['data-key'], stat = n.attrs['data-stat'], grade = n.attrs['data-grade'];
        const mat = n.attrs['data-mat'] ? S.ix.materialById.get(n.attrs['data-mat']) : m;
        const want = statValue(S, mat ?? m, key, stat, grade);
        if (stat === 'product') check('P3', `${who} ${key} ${grade}`, !!grade && c.gradeById.get(grade)?.materialId === m.id, 'a product\'s number names no product of this material');
        check('P3', `${who} ${key} ${stat}`, S.headlines.has(key) && want != null && eq(n.attrs['data-v'], want), () => `a sentence states ${n.attrs['data-v']} ("${textOf(n)}"), the compiled ${stat} is ${want}`);
      }
    }

    // The Products list: each cell is its product's own value, in the group its comparability puts it. The impact column
    // is notched Charpy where a product of the list publishes it, notched Izod standing in, as not compared, where its
    // product publishes no Charpy; else it is Izod's.
    const cards = query(pr.main, 'details[data-grade]');
    const listed = cards.filter((d) => !up(d, 'data-group')).map((d) => c.gradeById.get(d.attrs['data-grade'])).filter(Boolean);
    const charpy = (listed.length ? listed : c.grades).some((g) => g.headline?.charpyNotched);
    for (const card of cards) {
      const g = c.gradeById.get(card.attrs['data-grade']);
      if (!g) continue;
      const summary = card.kids.find((k) => typeof k === 'object' && k.tag === 'summary');
      if (!summary) { check('P3', `${who} ${g.id}`, false, 'a card with no row'); continue; }
      for (const cell of withAttrs(summary, 'data-k', 'data-v')) {
        const k = cell.attrs['data-k'];
        const w = `${who} ${g.id} ${k}`;
        if (k === 'impact') {
          const v = charpy ? g.headline?.charpyNotched ?? g.headline?.izodNotched : g.headline?.izodNotched;
          const izod = charpy && !g.headline?.charpyNotched;
          check('P3', w, !!v && eq(cell.attrs['data-v'], v.value) && cell.attrs['data-g'] === (izod || v.level === 'as-published' ? 'o' : 'c'), () => `the list shows ${cell.attrs['data-v']} (${cell.attrs['data-g']}), the product's notched impact ${v?.value} (${v?.level})`);
        } else if (S.headlines.has(k)) {
          const v = g.headline?.[k];
          check('P3', w, !!v && eq(cell.attrs['data-v'], v.value) && cell.attrs['data-g'] === (v.level === 'as-published' ? 'o' : 'c'), () => `the list shows ${cell.attrs['data-v']} (${cell.attrs['data-g']}), the product's own ${v?.value} (${v?.level})`);
        } else if (['nozzle', 'bed', 'chamber', 'drying'].includes(k)) {
          const s = k === 'drying' ? g.print?.drying : g.print?.[k];
          const none = k === 'drying' ? s?.need === 'not-needed' : ['not-required', 'ambient'].includes(s?.state);
          const want = none ? 0 : settingValue(g, k);
          const guide = g.print?.from?.[k]?.origin === 'guide';
          check('P3', w, want != null && eq(cell.attrs['data-v'], want) && cell.attrs['data-g'] === (guide ? 'o' : 'c'), () => `the list shows ${cell.attrs['data-v']} (${cell.attrs['data-g']}), the product's print gate ${want}${guide ? ' from the guide' : ''}`);
        } else check('P3', w, false, `a list column "${k}" the check does not know`);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P5  the figures: product marks, material marks, the alternatives, the strips, the maps, the layers

/** A figure of the page by its id ("fig-alternatives"). */
const figureOf = (page, id) => { const n = page.ids.get(id); return n && n.tag === 'figure' ? n : null; };
/** The product marks under a node: data-grade with a value (a name's link carries no value). */
const productMarks = (scope) => withAttrs(scope, 'data-grade', 'data-key', 'data-v');

function p5(S) {
  const prop = (key) => S.headlines.get(key);
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const { ov } = pagesOf(S, m.id);
    if (!ov) continue;
    const who = m.id;

    // Every product mark (a figure's dot, a sentence's product number) is that product's own compiled value.
    for (const n of productMarks(ov.main)) {
      const g = c.gradeById.get(n.attrs['data-grade']);
      const key = n.attrs['data-key'];
      const w = `${who} ${n.attrs['data-grade']} ${key}`;
      if (!check('P5', w, !!g && g.materialId === m.id, 'a mark names no product of this material')) continue;
      const own = (k) => (prop(k) ? g.headline?.[k]?.value : settingValue(g, k));
      check('P5', w, own(key) != null && eq(n.attrs['data-v'], own(key)), () => `marked ${n.attrs['data-v']}, the product's own ${own(key)}`);
      if (n.attrs['data-xkey'] !== undefined) check('P5', w, eq(n.attrs['data-xv'], own(n.attrs['data-xkey'])), () => `across ${n.attrs['data-xkey']} marked ${n.attrs['data-xv']}, the product's own ${own(n.attrs['data-xkey'])}`);
    }
    // Every material mark is that material's median, or, drawn as published, within what its products publish.
    for (const n of withAttrs(ov.main, 'data-mat', 'data-key', 'data-v').filter((x) => x.attrs['data-grade'] === undefined && x.attrs['data-stat'] === undefined)) {
      const x = S.ix.materialById.get(n.attrs['data-mat']);
      const w = `${who} ${up(n, 'data-figure')?.attrs.id ?? 'a mark'} ${n.attrs['data-mat']} ${n.attrs['data-key']}`;
      if (!check('P5', w, !!x && !x.familyEntry, 'a mark names no material')) continue;
      const open = /\bas-published\b/.test(n.attrs['data-kind'] ?? '');
      for (const [k, v] of [[n.attrs['data-key'], n.attrs['data-v']], ...(n.attrs['data-xkey'] !== undefined ? [[n.attrs['data-xkey'], n.attrs['data-xv']]] : [])]) {
        const cell = prop(k) ? cellOf(x, k) : null;
        const ok = !!cell && (cell.kind === 'compared' ? eq(v, cell.median) : open && Number(v) >= cell.min && Number(v) <= cell.max);
        check('P5', w, ok, () => `marked ${v} on ${k}, the material's ${cell ? (cell.kind === 'compared' ? `median ${cell.median}` : `values as published ${cell.min} to ${cell.max}`) : 'has none'}`);
      }
    }

    // Every figure: an id and kind, its table, the method's section on it.
    for (const fig of withAttrs(ov.main, 'data-figure').filter((n) => n.tag === 'figure')) {
      const w = `${who} ${fig.attrs.id ?? 'a figure'}`;
      check('P5', w, /^fig-[\w-]+$/.test(fig.attrs.id ?? ''), 'a figure without its fig- id');
      check('P5', w, query(fig, 'details.fig-data').length === 1 && !!query1(fig, 'details.fig-data table'), 'no table twin (details.fig-data)');
      check('P5', w, query(fig, 'a[href^="method.html#"]').length >= 1, 'no link to the method page');
    }

    // The alternatives: this material, then peerSet's, in order; each cell its median, or as published its highest value.
    const peers = peerSet(S.db, m, S.ix, { max: 5 });
    const pf = figureOf(ov, 'fig-alternatives');
    const cols = PEER_COLUMNS.map((x) => (typeof x === 'string' ? x : x.key));
    const drawable = peers.length > 0 && cols.some((k) => cellOf(m, k));
    check('P5', who, !!pf === drawable, `the alternatives figure is ${pf ? 'drawn' : 'absent'}; ${peers.length} alternatives, ${drawable ? 'a' : 'no'} key figure on file`);
    if (pf) {
      const rows = withAttrs(pf, 'data-mat').filter((n) => n.attrs['data-key'] === undefined && (n.attrs['data-self'] !== undefined || n.attrs['data-alt'] !== undefined));
      const want = [m.id, ...peers.map((p) => p.id)];
      check('P5', `${who} alternatives`, sameList(rows.map((n) => n.attrs['data-mat']), want) && rows[0]?.attrs['data-self'] !== undefined && rows.slice(1).every((n) => n.attrs['data-alt'] === '1'),
        () => `rows ${rows.map((n) => n.attrs['data-mat']).join(' ')}, peerSet gives ${want.join(' ')}`);
      const mats = [m, ...peers];
      const drawn = cols.filter((k) => mats.some((x) => cellOf(x, k)));
      const got = withAttrs(pf, 'data-mat', 'data-key', 'data-v').map((n) => `${n.attrs['data-mat']}|${n.attrs['data-key']}|${n.attrs['data-kind']}`);
      const wantCells = mats.flatMap((x) => drawn.map((k) => [x, k, cellOf(x, k)]).filter(([, , cell]) => cell).map(([x, k, cell]) => `${x.id}|${k}|${cell.kind}`));
      check('P5', `${who} alternatives`, same(got, wantCells), () => `cells: ${diff(got, wantCells)}`);
    }

    // The strips: each property's marks are its products' own values (spreadEntries), with their kinds; every property
    // of the section's set that a product publishes is drawn.
    for (const fig of withAttrs(ov.main, 'data-figure').filter((n) => /^fig-products-/.test(n.attrs.id ?? ''))) {
      const id = fig.attrs.id.slice('fig-products-'.length);
      const marks = productMarks(fig);
      const keys = [...new Set(marks.map((n) => n.attrs['data-key']))];
      const set = STRIP_SETS[id];
      if (check('P5', `${who} ${fig.attrs.id}`, !!set, `a strip figure "${id}" with no set in STRIP_SETS`)) {
        const want = set.filter((k) => prop(k) && spreadEntries(m, c, k).length);
        check('P5', `${who} ${fig.attrs.id}`, sameList(keys, want), () => `strips ${keys.join(' ')}, the set's properties a product publishes ${want.join(' ')}`);
      }
      for (const key of keys) {
        const h = prop(key);
        if (!h) continue;
        const got = marks.filter((n) => n.attrs['data-key'] === key).map((n) => markKey(n.attrs['data-grade'], n.attrs['data-v'], n.attrs['data-kind']));
        const want = spreadEntries(m, c, key).map((e) => markKey(e.g.id, e.v.value, kindsOf(h, e, c)));
        check('P5', `${who} ${fig.attrs.id} ${key}`, same(got, want), () => `marks: ${diff(got, want)}`);
      }
    }

    // The maps: this material's products with both values compared, none modified.
    const map = figureOf(ov, 'fig-among-materials');
    if (map) {
      for (const pnl of MAP_PANELS) {
        const both = new Map(spreadEntries(m, c, pnl.x).filter((e) => e.v.level === 'comparable' && !e.variant).map((e) => [e.g.id, e]));
        const want = spreadEntries(m, c, pnl.y).filter((e) => e.v.level === 'comparable' && !e.variant && both.has(e.g.id)).map((e) => `${e.g.id}|${e.v.value}|${both.get(e.g.id).v.value}`);
        const got = productMarks(map).filter((n) => n.attrs['data-key'] === pnl.y && n.attrs['data-xkey'] === pnl.x).map((n) => `${n.attrs['data-grade']}|${Number(n.attrs['data-v'])}|${Number(n.attrs['data-xv'])}`);
        check('P5', `${who} map ${pnl.y} against ${pnl.x}`, same(got, want), () => `points: ${diff(got, want)}`);
      }
    }

    // Across the layers: exactly the products layerPairs pairs, each at its flat and across-the-layers values.
    const layers = figureOf(ov, 'fig-layers');
    if (layers) {
      for (const pair of LAYER_PAIRS) {
        const a = prop(pair.xy), b = prop(pair.z);
        if (!a || !b) continue;
        const byKey = new Map([a, b].map((h) => [h.key, spreadEntries(m, c, h.key)]));
        const want = layerPairs(a, b, byKey, c).map((p) => `${p.g.id}|${p.z.v.value}|${p.xy.v.value}`);
        const got = productMarks(layers).filter((n) => n.attrs['data-key'] === b.key).map((n) => `${n.attrs['data-grade']}|${Number(n.attrs['data-v'])}|${Number(n.attrs['data-xv'])}`);
        check('P5', `${who} layers ${pair.z}`, same(got, want), () => `points: ${diff(got, want)}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P6  printing: the H2C's limits, the temperature rows, On the H2C and the settings table

function p6(S) {
  const base = S.db.meta.h2cBaseline;
  const limits = { nozzle: base.nozzleC, bed: base.bedC, chamber: base.chamberC };
  const PLATE = ['nozzle', 'bed', 'chamber', 'drying', 'hardened'];
  const TABLE = new Set(['nozzle', 'bed', 'chamber', 'drying', 'hardened', 'ams']);
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const { ov } = pagesOf(S, m.id);
    if (!ov) continue;
    const who = m.id;
    const products = c.grades.filter(isProduct);

    // On the H2C: each setting once, in a print's order.
    const plate = withAttrs(ov.main, 'data-section').find((n) => n.attrs['data-section'] === 'on-the-h2c');
    if (check('P6', who, !!plate, 'no On the H2C plate')) {
      const rows = withAttrs(plate, 'data-print').map((n) => n.attrs['data-print']);
      check('P6', who, sameList(rows, PLATE), () => `On the H2C lists ${rows.join(' ')}`);
    }
    // The settings table of Printing on the H2C: settings it knows, each once a table.
    const printing = ov.ids.get('printing');
    for (const table of printing ? query(printing, 'table') : []) {
      const rows = query(table, 'tr[data-print]').map((n) => n.attrs['data-print']);
      const odd = rows.filter((r) => !TABLE.has(r));
      check('P6', `${who} settings`, !odd.length && new Set(rows).size === rows.length, () => `rows ${rows.join(' ')}${odd.length ? `; not settings of HOOKS.md: ${odd.join(', ')}` : ''}`);
    }

    // The temperatures figure.
    const fig = figureOf(ov, 'fig-temperatures');
    if (!fig) { check('P6', who, !printing || !products.some((g) => g.print?.nozzle?.state === 'range'), 'print windows on file but no temperatures figure'); continue; }
    for (const axis of ['nozzle', 'bed', 'chamber']) {
      const pw = printWindows(products, axis);
      const row = withAttrs(fig, 'data-print').find((n) => n.attrs['data-print'] === axis);
      const w = `${who} ${axis}`;
      if (!check('P6', w, !!row, 'no row')) continue;
      // The H2C's limit: the baseline's, and drawn wherever a window reaches past it.
      const past = [...pw.windows.map((x) => x.max), ...pw.ends.map((x) => x.max ?? x.min)].some((v) => v > limits[axis]);
      if (row.attrs['data-limit'] !== undefined) check('P6', w, eq(row.attrs['data-limit'], limits[axis]), () => `data-limit ${row.attrs['data-limit']}, the H2C's ${limits[axis]} °C`);
      else check('P6', w, !past, `a window reaches past the H2C's ${limits[axis]} °C and the limit is not drawn`);
      // The shading: one run per stretch of degrees the same number of counted windows accept (printWindows' runs).
      const runs = query(row, '.tp').length;
      const want = pw.runs.filter((r) => r.k).length;
      check('P6', w, runs === want, () => `${runs} shaded runs, printWindows gives ${want} over ${pw.n} counted windows`);
      // Windows with one end, a mark each, where fewer than ten windows are counted.
      const ends = productMarks(row).map((n) => `${n.attrs['data-grade']}|${Number(n.attrs['data-v'])}`);
      const wantEnds = pw.n < 10 ? pw.ends.map((e) => `${e.g.id}|${e.min ?? e.max}`) : [];
      check('P6', w, same(ends, wantEnds), () => `one-end marks: ${diff(ends, wantEnds)}`);
    }
    // Drying: a mark per product whose sheet gives a temperature (dryingStats).
    const dry = dryingStats(products);
    const row = withAttrs(fig, 'data-print').find((n) => n.attrs['data-print'] === 'drying');
    check('P6', `${who} drying`, !!row === dry.entries.length > 0, `a drying row ${row ? 'drawn' : 'absent'} for ${dry.entries.length} drying temperatures`);
    if (row) {
      const got = productMarks(row).filter((n) => n.attrs['data-key'] === 'drying').map((n) => `${n.attrs['data-grade']}|${Number(n.attrs['data-v'])}`);
      const want = dry.entries.map((e) => `${e.g.id}|${e.value}`);
      check('P6', `${who} drying`, same(got, want), () => `drying marks: ${diff(got, want)}`);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// REC  every record once, a product's in its own card

function rec(S) {
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const { ov, pr } = pagesOf(S, m.id);
    if (!ov || !pr) continue;
    const who = m.id;
    const records = recordsOf(S, c);
    const seen = new Map();
    for (const [page, where] of [[ov, 'overview'], [pr, 'products']]) {
      for (const n of withAttrs(page.main, 'data-rec')) {
        const id = n.attrs['data-rec'];
        (seen.get(id) ?? seen.set(id, []).get(id)).push({ n, where });
      }
    }
    // Each record exactly once, a product's in its own card, a document in the Overview's Sources.
    for (const [id, r] of records) {
      const at = seen.get(id) ?? [];
      const w = `${who} ${r.type} ${id}`;
      if (!check('REC', w, at.length === 1, `${at.length ? `on the pages ${at.length} times (${at.map((x) => x.where).join(', ')})` : 'on neither page'}`)) continue;
      const { n, where } = at[0];
      if (r.type === 'document') { check('REC', w, where === 'overview', 'a document\'s record is not in the Overview\'s Sources'); continue; }
      if (r.gradeId && c.gradeById.has(r.gradeId)) {
        const card = up(n, 'data-grade');
        check('REC', w, where === 'products' && card?.tag === 'details' && card.attrs['data-grade'] === r.gradeId, () => `not in its product's card (${r.gradeId}): ${where}${card ? `, card ${card.attrs['data-grade']}` : ''}`);
      } else if (r.gradeId) check('REC', w, false, `its product ${r.gradeId} is not one of the material's (retired?), so it has no card`);
      else check('REC', w, where === 'overview', `a ${r.type} record with no product is not on the Overview`);
    }
    // Nothing else carries a record: the one addition is an estimate of this material (Estimated values), each once.
    for (const [id, at] of seen) {
      if (records.has(id)) continue;
      const w = `${who} ${id}`;
      const extra = new RegExp(`^${m.id}/\\w+(?:/estimate)?$`).test(id);
      check('REC', w, extra, () => `a data-rec that is no record of this material${offThePages('coverage', S.db.coverage.find((r) => r.id === id)) || offThePages('environment', S.ix.evidenceById.get(id)) ? ' (one the pages leave out: placement.js)' : ''}`);
      if (extra) check('REC', w, at.length === 1 && at[0].where === 'overview', () => `on the pages ${at.length} times (${at.map((x) => x.where).join(', ')})`);
    }
    // The documents a card names, and the measurements a thin section's table cites, are the material's own.
    for (const n of withAttrs(pr.main, 'data-doc')) check('REC', `${who} ${n.attrs['data-doc']}`, c.documents.has(n.attrs['data-doc']), 'a card names a document the material\'s records do not cite');
    for (const n of withAttrs(ov.main, 'data-mid')) {
      const bad = n.attrs['data-mid'].split(/\s+/).filter((id) => !c.msById.get(id)?.numeric);
      check('REC', `${who} ${n.attrs['data-mid']}`, !bad.length, () => `a table cell cites ${bad.join(', ')}, no measurement of this material with a number`);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P7, P8  links

function p7(S) {
  for (const page of S.pages.values()) {
    const external = query(page.tree, 'a[href]').filter((a) => /^https?:/i.test(a.attrs.href));
    const c = S.contexts.get(page.materialId);
    if (!c || page.kind === 'stub') { check('P7', page.file, !external.length, () => `an external link on the ${page.kind} page: ${external[0]?.attrs.href}`); continue; }
    const allowed = new Set();
    for (const sid of c.documents.keys()) { const o = originalOf(S.ix.sourceById.get(sid)); if (o && !o.local) allowed.add(o.url); }
    for (const p of c.prices) if (/^https?:/i.test(p.url ?? '')) allowed.add(p.url);
    for (const a of external) check('P7', page.file, allowed.has(a.attrs.href), () => `${a.attrs.href} is not the URL of a document or listing of this material`);
    // Each cited document with an original is linked from its line in Sources.
    if (page.kind === 'overview') {
      const lines = new Map(withAttrs(page.main, 'data-rec').map((n) => [n.attrs['data-rec'], n]));
      for (const sid of c.documents.keys()) {
        const o = originalOf(S.ix.sourceById.get(sid));
        if (!o || o.local) continue;
        const li = lines.get(sid);
        check('P7', `${page.file} ${sid}`, !!li && query(li, 'a[href]').some((a) => a.attrs.href === o.url), () => `the document is not linked to its original ${o.url}`);
      }
    }
  }
}

function p8(S) {
  const materialIds = new Set(S.db.materials.map((x) => x.id));
  const scenarioOf = (frag) => fromHash(frag, S.db.meta, { materialIds }).scenario;
  for (const page of S.pages.values()) {
    const w = page.file;
    const m = page.materialId;
    const refs = [...query(page.tree, 'a[href]').map((n) => n.attrs.href), ...query(page.tree, 'link[href]').map((n) => n.attrs.href), ...query(page.tree, 'script[src]').map((n) => n.attrs.src)];
    for (const href of refs) {
      if (/^(?:https?:|data:|mailto:)/i.test(href)) continue;
      const [target, ...rest] = href.split('#');
      const frag = rest.join('#');
      if (!target) { check('P8', w, page.ids.has(frag), () => `#${frag} is not an anchor on the page`); continue; }
      if (target.startsWith('../')) {
        check('P8', w, target.slice(3) === S.selectorFile && existsSync(join(DIST, S.selectorFile)), () => `${href.slice(0, 80)} is not the selector page`);
        continue;
      }
      check('P8', w, S.disk.has(`${PAGES_DIR}/${target}`), () => `${target} is not in dist/materials/`);
      if (frag && S.pages.has(target)) check('P8', w, S.pages.get(target).ids.has(decodeURIComponent(frag)), () => `${target}#${frag} is not an anchor there`);
    }
    // The ways back: a fresh selection, with this material's drawer open (the index's and the method page's with none).
    const back = [...withAttrs(page.main.parent ?? page.tree, 'data-return'), ...withAttrs(page.tree, 'data-return-brand')];
    const backs = [...new Set(back)];
    if (['overview', 'products', 'hub', 'method'].includes(page.kind)) check('P8', w, backs.some((a) => a.attrs['data-return'] !== undefined), 'no way back to the selector (a[data-return])');
    for (const a of backs) {
      const href = a.attrs.href ?? '';
      const [file, ...hash] = href.split('#');
      const frag = hash.join('#');
      check('P8', w, file === `../${S.selectorFile}`, () => `a way back to ${href.slice(0, 60)}, not the selector`);
      const want = ['overview', 'products', 'stub'].includes(page.kind) ? m : null;
      if (!frag) { check('P8', w, want === null, 'a way back that opens no drawer'); continue; }
      let s = null;
      try { s = scenarioOf(frag); } catch (e) { check('P8', w, false, () => `the way back cannot be read: ${e.message}`); }
      if (s) check('P8', w, (s.openMaterial ?? null) === want && !s.constraints.length && !s.shortlist.length, () => `the way back opens ${s.openMaterial ?? 'no drawer'} with ${s.constraints.length} requirements, the page is ${want ?? 'not a material\'s'}`);
    }
    // The stub sends an old link on to the Products page.
    if (page.kind === 'stub') {
      const to = `${m}-products.html`;
      check('P8', w, query(page.tree, 'a[href]').some((a) => a.attrs.href === to), `the stub does not link to ${to}`);
      check('P8', w, query(page.tree, 'meta[http-equiv]').some((x) => /refresh/i.test(x.attrs['http-equiv']) && String(x.attrs.content).includes(to)), 'the stub does not refresh to the Products page');
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P9  no record IDs, no coinages, no retired phrase

// A unit's slash never comes before an ID: two values a cell sets on two lines read "405 J/m" "320 J/m" as "J/m320".
const ID_SHAPES = /(?<![A-Za-z0-9./-])(?:V\d{6}|G\d{3}-(?:\d{2}(?:-R\d+)?|R\d+)|M\d{3}|P\d{4}|Q\d{5}|C\d{5}|CA\d{4}|PG\d{3}|m\d{3}|R\d{3}|S-[A-Z0-9]+(?:-[A-Za-z0-9]+){2,})(?![A-Za-z0-9-])/g;
// The project's own words (INTERFACE "Words", left column, and common.js's list of words a reviewer's note must not carry).
const COINAGES = [
  // "grade" for a product is the project's word; the word stands in data the pages quote (a maker's "all grades of Delrin", a
  // chemical's "technical grade", a product's name), so only its compounds are looked for here.
  /\breference grades?\b/i, /\brepresentative grade\b/i, /\bgrade[- ]specific\b/i, /\bgrade IDs?\b/i,
  /\btwins?\b/i, /same sheet as/i, /admitted for screening/i, /research mode/i, /print checks? off/i, /H2C's scope/i,
  /printer's envelope/i, /printer maker's guide/i, /Official Bambu product/, /Officially listed family/, /\bTheoretical\b/, /"Conditional"/,
  /\bheadlines?\b/i, /\bquarantin\w*/i, /track only/i, /preference only/i, /coverage records?/i, /evidence recorded/i, /family entr(?:y|ies)/i,
  /\bmigrations?\b/i, /\bworkbook\b/i, /\bscreened\b/i,
  // A maintainers' note in the reading path: a review step, a dated reading, the records' own state (common.js shownGap).
  /Mandatory review/i, /estimate band/i, /no document cited/i, /\bre-read \d{4}-\d{2}-\d{2}/i, /SHA-256/, /Partially resolved \d{4}/i,
];
// The old pages' bookkeeping, retired with them (HOOKS.md, "Words the checks refuse anywhere on a page").
const RETIRED = [/counted products/i, /\(of /, /not compared/i, /special formulation/i, /drawn but not counted/i, /\bKey values\b/];

function p9(S) {
  const known = new Set();
  for (const t of ['sources', 'grades', 'measurements', 'profiles', 'evidence', 'knowHow', 'prices', 'coverage', 'printGuide']) for (const r of S.db[t] ?? []) known.add(r.id);
  for (const page of S.pages.values()) {
    // What a reader sees: the text, the tooltips the script shows (data-t, data-note), and the Products list's words its
    // script prints (the pl-words island).
    // A quotation is its document's words: a maker's G-code ("M104 S230") is not a record ID.
    const text = textOf(page.main, (n) => n.tag === 'q');
    const tips = withAttrs(page.main, 'data-t').map((n) => n.attrs['data-t']).concat(withAttrs(page.main, 'data-note').map((n) => n.attrs['data-note'])).join(' · ');
    const island = page.ids.get('pl-words');
    let words = '';
    if (island) { try { words = JSON.stringify(JSON.parse(island.kids.join(''))); } catch { words = ''; } }
    const seen = `${text} · ${tips} · ${words}`;
    const ids = [...seen.matchAll(ID_SHAPES)].map((x) => x[0]);
    const tokens = seen.match(/[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]/g) ?? [];
    for (const t of tokens) if (known.has(t) && !/^(?:H2C|PA6|PA12)$/.test(t)) ids.push(t);
    check('P9', page.file, !ids.length, () => `record ID in what a reader sees: ${[...new Set(ids)].slice(0, 4).join(', ')} ("${seen.slice(Math.max(0, seen.indexOf(ids[0]) - 40), seen.indexOf(ids[0]) + 40)}")`);
    // The coinages and retired phrases in the page's own words: a maker's quotation keeps its own.
    const own = seen;
    for (const re of [...COINAGES, ...RETIRED]) {
      const x = re.exec(own);
      check('P9', page.file, !x, () => `"${x[0]}" in "${own.slice(Math.max(0, x.index - 50), x.index + 50)}"`);
    }
  }
  // Standards and polymer names are not record IDs.
  const probe = 'ASTM D256, ISO 527, ISO 179-1, D638, PA6, PA612, PA12-CF, H2C, ISO 75-2, 405 J/m320 J/m';
  check('P9', 'the ID pattern', !probe.match(ID_SHAPES), 'a standard or a polymer name matches the ID pattern');
  check('P9', 'the ID pattern', 'V000384 G020-01 G052-R1 M020 P0349 Q00012 C00012 m123'.match(ID_SHAPES).length === 8, 'the ID pattern misses a record ID');
}

// ---------------------------------------------------------------------------------------------------------------------
// P10  stamps, P11 budgets

function p10(S) {
  const meta = S.db.meta;
  const release = meta.release?.id ?? 'unidentified';
  for (const page of S.pages.values()) {
    const a = page.main?.attrs ?? {};
    check('P10', page.file, a['data-release'] === release && a['data-snapshot'] === meta.snapshot && a['data-build'] === meta.build, () => `main stamps ${a['data-release']}/${a['data-snapshot']}/${a['data-build']}, database ${release}/${meta.snapshot}/${meta.build}`);
    const gen = page.q1('meta[name=generator]')?.attrs.content ?? '';
    check('P10', page.file, gen.includes(`release ${release}`) && gen.includes(`snapshot ${meta.snapshot}`) && gen.includes(`build ${meta.build}`), `generator "${gen}"`);
    if (page.kind === 'overview' || page.kind === 'products') {
      const foot = withAttrs(page.main, 'data-section').find((n) => n.attrs['data-section'] === 'colophon');
      const fine = foot && withAttrs(foot, 'data-release')[0];
      check('P10', page.file, !!fine && fine.attrs['data-release'] === release && textOf(query1(fine, 'span.mono') ?? { kids: [] }) === release && textOf(query1(fine, 'time') ?? { kids: [] }) === String(meta.build),
        () => `the colophon's stamp "${fine ? textOf(fine).slice(0, 80) : 'none'}"`);
    }
  }
  check('P10', 'manifest', S.manifest.release === release && S.manifest.snapshot === meta.snapshot && S.manifest.build === meta.build, `manifest ${S.manifest.release}/${S.manifest.snapshot}/${S.manifest.build}, ${REBUILD}`);
}

function p11(S) {
  let total = 0;
  for (const [path, buf] of S.disk) {
    total += buf.length;
    const budget = path.endsWith('/assets/pages.css') ? PAGE_BUDGET.css : path.endsWith('/assets/page.js') ? PAGE_BUDGET.script
      : path.endsWith('-products.html') ? PAGE_BUDGET.products : path.endsWith('-records.html') ? PAGE_BUDGET.records : path.endsWith('.html') ? PAGE_BUDGET.main : null;
    if (!budget) continue;
    check('P11', path, buf.length <= budget.raw, () => `${(buf.length / 1024).toFixed(0)} KB raw, budget ${(budget.raw / 1024).toFixed(0)} KB`);
    if (budget.gzip) {
      const z = gzipSync(buf, { level: 9 }).length;
      check('P11', path, z <= budget.gzip, () => `${(z / 1024).toFixed(0)} KB gzipped, budget ${(budget.gzip / 1024).toFixed(0)} KB`);
    }
  }
  check('P11', 'the set', total <= PAGE_BUDGET.set.raw, () => `${(total / 1024 / 1024).toFixed(1)} MB, budget ${(PAGE_BUDGET.set.raw / 1024 / 1024).toFixed(0)} MB`);
}

// ---------------------------------------------------------------------------------------------------------------------
// P12  written summaries

/** The summary's tag beside it (masthead.js): a draft and one under revision say so; a reviewed one carries none. */
const TAGGED = new Set(['draft', 'revise']);

function p12(S) {
  for (const m of S.listed.filter((x) => x.written)) check('P12', m.id, S.withPage.includes(m), 'a written summary on a material with no page');
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const { ov } = pagesOf(S, m.id);
    if (!ov) continue;
    const who = m.id;
    const sec = withAttrs(ov.main, 'data-section').find((n) => n.attrs['data-section'] === 'summary');
    const w = m.written;
    const byline = withAttrs(ov.main, 'data-written-status').filter((n) => !up(n, 'data-section') || up(n, 'data-section').attrs['data-section'] === 'colophon');
    if (!w?.parts?.length) {
      check('P12', who, !sec && !withAttrs(ov.main, 'data-field').length && !withAttrs(ov.main, 'data-written-status').length, 'a material with no summary shows one, or its byline');
      continue;
    }
    if (!check('P12', who, !!sec, 'a written summary, but no summary on the page')) continue;
    // Its status beside it, and its byline in the colophon.
    const tag = withAttrs(sec, 'data-written-status');
    check('P12', who, TAGGED.has(w.status) ? tag.length === 1 && tag[0].attrs['data-written-status'] === w.status : !tag.length, () => `status tag ${tag.map((t) => t.attrs['data-written-status']).join(' ') || 'none'}, written ${w.status}`);
    const by = byline.filter((n) => !sec || !up(n, 'data-section') || up(n, 'data-section') !== sec);
    const t = by.length === 1 ? textOf(by[0]) : '';
    check('P12', who, by.length === 1 && by[0].attrs['data-written-status'] === w.status && t.includes(w.by) && t.includes(String(w.on)) && t.includes(SUMMARY_STATUS[w.status] ?? w.status), () => `byline "${t || `${by.length} bylines`}"`);
    // Every filled number: the compiled value, printed as plain text.
    const fields = w.parts.filter((p) => p.field);
    const spans = withAttrs(sec, 'data-field');
    check('P12', who, spans.length === fields.length, `${spans.length} filled numbers, ${fields.length} in the summary`);
    spans.forEach((s, i) => {
      const p = fields[i];
      if (!p) return;
      const w2 = `${who} ${p.field}`;
      check('P12', w2, s.attrs['data-field'] === p.field && s.attrs['data-value'] === String(p.value), () => `${s.attrs['data-field']} ${s.attrs['data-value']}, compiled ${p.field} ${p.value}`);
      const sign = typeof p.bound === 'string' ? `${p.bound} ` : p.bound?.sign ? `${p.bound.sign} ` : '';
      const shown = `${sign}${typeof p.value === 'number' ? fmtNumber(p.value) : String(p.value ?? '')}${p.unit ? ` ${p.unit}` : ''}`;
      check('P12', w2, textOf(s) === shown && s.kids.every((k) => typeof k === 'string'), () => `shows "${textOf(s)}", the value ${shown}, as plain text`);
      // The number is the data's: a statistic of a key property's compiled spread, or a count of records.
      const [key, stat] = p.field.split('.');
      const sum = m.summary?.[key];
      if (stat && sum && ['median', 'min', 'max', 'q1', 'q3', 'n', 'products'].includes(stat) && sum[stat] != null) check('P12', w2, sum[stat] === p.value, () => `compiled ${sum[stat]}, summary ${p.value}`);
      const id = identity(m, c);
      const counts = { products: id.products, makers: id.makers, values: c.summary.numericMeasurements, profiles: c.profiles.length };
      if (p.field in counts) check('P12', w2, counts[p.field] === p.value, () => `count ${counts[p.field]}, summary ${p.value}`);
    });
    check('P12', who, !/[{}]/.test(textOf(sec)), 'a placeholder left in the text');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P13  the drawer's link to the page

function p13(S) {
  const db = S.db;
  const group = (rows) => { const g = new Map(); for (const r of rows) { if (!g.has(r.materialId)) g.set(r.materialId, []); g.get(r.materialId).push(r); } return g; };
  const ctx = { measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage) };
  for (const m of db.materials) {
    // A host that keeps the page link's click handler, so the check can press it.
    const link = { href: null, handlers: [], addEventListener(type, fn) { if (type === 'click') this.handlers.push(fn); } };
    const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (s) => (s === '.page-link' ? link : ['#drawer-close', '#drawer-pin'].includes(s) ? { addEventListener() {} } : null) };
    const scenario = { ...newScenario(db.meta), shortlist: [], unknownPolicy: 'strict', openMaterial: m.id };
    renderDrawer(host, { db, selectedMaterialId: m.id, drawerTab: 'Overview', selection: { evaluations: [] }, scenario, ctx, highlightMeasurement: null, highlightSource: null }, {});
    const page = pageOf(m, ctx.measurementsByMaterial.get(m.id) ?? []);
    const links = [...host.innerHTML.matchAll(/<a\b[^>]*\bpage-link\b[^>]*>/g)].map((x) => x[0]);
    check('P13', m.id, host.innerHTML.length > 500, 'the drawer rendered nothing');
    if (page) {
      check('P13', m.id, links.length === 1 && links[0].includes(`href="${page}"`) && !/target=/.test(links[0]), () => `drawer links ${links.join(' ') || 'none'}, page ${page}, in the same tab`);
      check('P13', m.id, S.disk.has(`${PAGES_DIR}/${m.id}.html`) && page === `${PAGES_DIR}/${m.id}.html`, 'the drawer links to a page that is not there');
      // Pressed, it carries the selection as it stands (the page keeps it for the way back).
      const ev = { currentTarget: link };
      for (const fn of link.handlers) fn(ev);
      check('P13', m.id, link.handlers.length === 1 && link.href === `${page}?from=${toHash(scenario)}`, () => `pressed, the link goes to ${link.href ?? 'nowhere new'}`);
    } else check('P13', m.id, !links.length && !host.innerHTML.includes('materials/'), () => `a page link on a material with no page: ${links.join(' ')}`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P14  a fresh render, the fonts, the licences, the manifest

function p14(S) {
  check('P14', 'db.json', sha256(S.dbText) === S.manifest.outputs['db.json'], `dist/db.json does not match the manifest: ${REBUILD}`);
  const files = new Map(S.fresh.files);
  check('P14', 'files', same([...files.keys()], [...S.disk.keys()]), () => `a fresh render has ${files.size} files, dist/materials/ ${S.disk.size}: ${REBUILD}`);
  for (const [path, text] of files) {
    const disk = S.disk.get(path);
    check('P14', path, !!disk && Buffer.compare(disk, Buffer.from(text, 'utf8')) === 0, () => `${path} differs from a fresh render of dist/db.json: ${REBUILD}`);
  }
  // Fonts travel inside the stylesheet, so a page opened from disk keeps them; their licences sit beside it.
  const css = S.disk.get(`${PAGES_DIR}/assets/pages.css`)?.toString('utf8') ?? '';
  const urls = [...css.matchAll(/url\(\s*(['"]?)([^)'"]*)\1\s*\)/g)].map((x) => x[2]);
  check('P14', 'pages.css', urls.length >= 3 && urls.every((u) => u.startsWith('data:')), () => `stylesheet url()s: ${urls.filter((u) => !u.startsWith('data:')).slice(0, 3).join(', ') || `${urls.length}, too few`}`);
  const faces = [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map((x) => x[0]);
  check('P14', 'pages.css', faces.length === 3 && faces.every((f) => /src:\s*url\(data:font\/woff2;base64,[A-Za-z0-9+/=]+\)\s*format\("woff2"\)/.test(f)), `${faces.length} font faces, not all embedded woff2 data URIs`);
  // (An embedded SVG's namespace, xmlns='http://www.w3.org/2000/svg', inside a data: URI is a name, not a load.)
  const loads = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\(\s*(['"]?)data:[\s\S]*?\1\s*\)/g, 'url()');
  check('P14', 'pages.css', !/@import|https?:\/\//.test(loads), () => `the stylesheet loads something from outside: ${/(?:@import|https?:\/\/)\S{0,60}/.exec(loads)?.[0]}`);
  for (const f of ['Inter-OFL.txt', 'Newsreader-OFL.txt']) {
    const t = S.disk.get(`${PAGES_DIR}/assets/${f}`)?.toString('utf8') ?? '';
    check('P14', f, /SIL OPEN FONT LICENSE/i.test(t) && t.length > 1000, 'the licence is not the SIL Open Font License');
  }
  // The manifest: the digest of the files and their counts.
  const lines = [...S.disk].map(([path, buf]) => [path, sha256(buf)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([path, h]) => `${h}  ${path}`);
  check('P14', 'manifest', S.manifest.outputs[`${PAGES_DIR}/`] === sha256(lines.join('\n')), `outputs["materials/"] is not the digest of the files on disk: ${REBUILD}`);
  const bytes = [...S.disk.values()].reduce((n, b) => n + b.length, 0);
  const pages = S.withPage.length;
  const mp = S.manifest.pages;
  check('P14', 'manifest', !!mp && mp.pages === pages && mp.recordsPages === pages && mp.bytes === bytes, () => `manifest pages ${JSON.stringify(mp)}, files ${pages}/${pages}/${bytes}: ${REBUILD}`);
}

// ---------------------------------------------------------------------------------------------------------------------
// IX  the index

function ix(S) {
  const page = S.pages.get('index.html');
  if (!check('IX', 'index.html', !!page && page.kind === 'hub', 'no index page')) return;
  // A material's entry is the outermost element naming it (a link inside it names it too); a name that is not a material
  // links to the materials it stands for, which are not their entries.
  const entries = withAttrs(page.main, 'data-mat').filter((n) => !up(n.parent, 'data-mat') && !up(n, 'data-alias'));
  const byId = new Map();
  for (const n of entries) { const id = n.attrs['data-mat']; (byId.get(id) ?? byId.set(id, []).get(id)).push(n); }
  check('IX', 'materials', same([...byId.keys()], S.listed.map((m) => m.id)), () => `entries: ${diff([...byId.keys()], S.listed.map((m) => m.id))}`);
  for (const m of S.listed) {
    const at = byId.get(m.id) ?? [];
    if (!at.length) continue;
    check('IX', m.id, at.length === 1, `listed ${at.length} times`);
    const n = at[0];
    const href = pageOf(m, S.ix.measurementsByMaterial.get(m.id) ?? []) ? `${m.id}.html` : null;
    const links = [n, ...descendants(n)].filter((x) => x.tag === 'a' && x.attrs.href !== undefined).map((a) => a.attrs.href);
    check('IX', m.id, href ? sameList(links, [href]) : !links.length, () => `links ${links.join(' ') || 'none'}, the page rule gives ${href ?? 'no page'}`);
  }
  // Every name that is not a material (a group name, an alias), once.
  const aliases = withAttrs(page.main, 'data-alias');
  const names = S.db.materials.filter((m) => m.familyEntry);
  check('IX', 'names', same(aliases.map((n) => n.attrs['data-alias']), names.map((m) => m.id)), () => `names: ${diff(aliases.map((n) => n.attrs['data-alias']), names.map((m) => m.id))}`);
  // Each names only the materials it stands for, and links those with a page.
  for (const n of aliases) {
    const e = names.find((m) => m.id === n.attrs['data-alias']);
    if (!e) continue;
    const members = new Set((e.familyEntry.members ?? []).map((x) => x.id));
    const named = withAttrs(n, 'data-mat').map((x) => x.attrs['data-mat']);
    const links = query(n, 'a[href]').map((a) => a.attrs.href);
    const paged = named.filter((id) => S.withPage.some((m) => m.id === id)).map((id) => `${id}.html`);
    check('IX', e.id, named.every((id) => members.has(id)) && same(links, paged), () => `names ${named.join(' ') || 'none'} and links ${links.join(' ') || 'none'}; it stands for ${[...members].join(' ')}`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The tests: each invariant is run once, over every page, and reported with the first twenty failures

const INVARIANTS = { P1: p1, P2: p2, P3: p3, P5: p5, P6: p6, REC: rec, P7: p7, P8: p8, P9: p9, P10: p10, P11: p11, P12: p12, P13: p13, P14: p14, IX: ix };
let ANALYSED = false;
function analyse() {
  const S = load();
  if (ANALYSED) return;
  ANALYSED = true;
  for (const [inv, fn] of Object.entries(INVARIANTS)) {
    try { fn(S); } catch (e) { check(inv, 'the check itself', false, `crashed: ${e.stack?.split('\n').slice(0, 3).join(' | ')}`); }
  }
}
function report(inv) {
  analyse();
  const list = FAILS[inv] ?? [];
  assert.ok((CHECKED[inv] ?? 0) > 0, `${inv}: nothing was checked`);
  assert.equal(list.length, 0, `${inv}: ${list.length} of ${CHECKED[inv]} checks failed; the first ${Math.min(20, list.length)}:\n  ${list.slice(0, 20).join('\n  ')}`);
}

// PAGES_CHECK_ALL=1 prints every failure, not only each invariant's first twenty.
after(() => {
  if (!ANALYSED) return;
  console.log(`pages:check  checks per invariant: ${Object.entries(CHECKED).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (process.env.PAGES_CHECK_ALL) for (const [inv, list] of Object.entries(FAILS)) for (const f of list) console.log(`${inv}  ${f}`);
});

test('dist/materials/ is built, and is the database\'s', () => {
  const S = load();
  assert.ok(S.withPage.length >= 1, 'no material has a page');
  assert.equal(S.disk.size, S.withPage.length * 3 + 6, `dist/materials/ holds ${S.disk.size} files: ${REBUILD}`);
});
test('P1  the files, the markup, the sections present and the bar', () => report('P1'));
test('P2  the tabs count the products; a card per product and specimen', () => report('P2'));
test('P3  key figures, marked numbers and the Products list are the compiled values', () => report('P3'));
test('P5  the figures\' marks are the products\' and materials\' own values', () => report('P5'));
test('P6  print windows, drying and the H2C\'s limits', () => report('P6'));
test('REC every record once, a product\'s in its own card', () => report('REC'));
test('P7  external links are the cited documents\' and listings\' URLs', () => report('P7'));
test('P8  internal links resolve, and every way back opens the selector on the material', () => report('P8'));
test('P9  no record IDs, coinages or retired phrases in what a reader sees', () => report('P9'));
test('P10 the stamps are the database\'s', () => report('P10'));
test('P11 every file is within its budget', () => report('P11'));
test('P12 the written summaries', () => report('P12'));
test('P13 the drawer links to a page exactly where there is one, in the same tab', () => report('P13'));
test('P14 a fresh render equals dist/materials/, fonts and licences, the manifest', () => report('P14'));
test('IX  the index lists every material and every group name', () => report('IX'));
