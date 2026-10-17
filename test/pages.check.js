// The material pages in dist/materials/, held against the database they were rendered from. The build's stage 8 writes a
// page for each material the page rule admits (app/js/ui/page-rule.js), its records page, an index and the shared assets;
// this check reads those files back, with dist/db.json and dist/manifest.json, and fails when a page says what the
// records do not. A page is a view of the database and decides nothing, so every number, count, mark and link on it has
// an owner in the data, and each invariant below finds the owner without calling the section module that wrote the page
// wherever it can. Where a check does call a shared function (the facts layer the drawer also reads, or the section's own
// emptiness), the comment on it says so.
//
// Run it after a build:
//
//   npm run build && npm run pages:check
//
// It reads only: nothing is built or written here. It fails with "run npm run build" when dist/materials/ is missing or
// does not match dist/db.json and dist/manifest.json. `verify` runs it after the snapshot check (scripts/verify.mjs),
// which is why it is not in `npm test`. Every invariant collects its failures, with the material, so one run shows every
// problem; a failing test prints the first twenty.
//
//   P1   the files are exactly those of the materials the page rule admits (main page and records page), the index and the
//        four assets; each HTML file has one doctype and balanced tags; the sections present are the page's sections in
//        order, less the ones with nothing on file, which one line names (data-absent); the contents list the same
//   P2   the masthead's and Sources' counts agree with identity(), the evidence summary and the documents the records cite,
//        which are derived again here from the database's tables
//   P3   a key figure is the material's compiled median, range and count, written as fmtNumber and fmtBounded write them;
//        a key property with no comparable value says why, and a property that does not apply says the reason
//   P4   a rank track's place is the material's place among every material's median (rankTable), worked out again here
//   P5   a comparison's marks are the products' own values (spreadEntries) with their own records and kinds; the counted line
//        adds up; on the records page each td.drawn agrees with notDrawnWhy, and for a record left out with the build's own
//        reason (assess, called directly)
//   P6   the print marks are each product's window (grades[].print), guide windows are drawn apart and not counted, the H2C's
//        limit is db.meta.h2cBaseline
//   P7   every external link is the URL of a document the material's records cite, and each such document is linked
//   P8   every internal link resolves to a file and an anchor; the selector link opens the material's drawer
//   P9   no record ID in the reader's text, and none of the project's coinages that INTERFACE "Words" rules out
//   P10  the release, the snapshot and the build stamped on every page are the database's
//   P11  every file is within PAGE_BUDGET (raw and gzipped), the script within its own, the set within its
//   P12  the written summary: a material with none says so; one with a summary shows its byline, its status and every filled
//        number as the data compiled it, and has a page
//   P13  the drawer has a "Full page" link exactly for the materials that have a page
//   P14  a fresh render of dist/db.json equals dist/materials/ byte for byte; fonts are embedded data: URIs, licences sit
//        beside them; the manifest's digest and counts agree with the files
//   IX   the index lists every material once, linked exactly where the rule gives a page, with the rule's numbers, and every
//        group name with its members
//   CNT  the counts one section gives agree with the counts another gives for the same thing (the 755 checks of
//        docs/audits/2026-10-16-material-pages-round/page-counts.mjs, folded in)

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
import { RECORD_SECTIONS } from '../app/pages/records/index.js';
import { LAYER_TESTS } from '../app/pages/figures.js';
import { PAGES_DIR, PAGE_RULE, pageOf, pageFacts, shortOf, pageRuleWords } from '../app/js/ui/page-rule.js';
import { indexDb, materialContext, rankTable, identity, comparisonsOf, notDrawnWhy, spreadEntries, originalOf, isProduct, stated, printCounts } from '../app/js/ui/material-facts.js';
import { fmtNumber, fmtBounded, publishedBound } from '../app/js/ui/format.js';
import { h2cStatusLabel, SUMMARY_STATUS } from '../app/js/ui/labels.js';
import { limitOnScale } from '../app/js/ui/scales.js';
import { REGISTRY } from '../app/js/ui/registry.js';
import { fromHash } from '../app/js/engine/scenario.js';
import { renderDrawer } from '../app/js/ui/detail.js';
import { assess, ASSESS_ORDER } from '../build/src/products.js';

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
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const num = (s) => Number(String(s).replace(/,/g, ''));

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

  const contexts = new Map(withPage.map((m) => [m.id, materialContext(db, m.id, { showEstimates: true })]));
  return { db, dbText, manifest, selectorFile, ix, listed, withPage, disk, pages, contexts, ranks: rankTable(db) };
}

// ---------------------------------------------------------------------------------------------------------------------
// What the database says, worked out here from its tables

/** The properties of a domain that apply to a material (registry properties.csv: domain, "Applies to", replaced ones out). */
const propertiesOf = (S, domain, m) => new Set(S.db.registry.properties
  .filter((p) => p.domain === domain && !p.replacedBy && (!p.appliesTo || p.appliesTo.every((c) => c.values.includes(m[c.field]))))
  .map((p) => p.name));
/** A record that only names its property (no number, no words, "Not published"). */
const namedOnly = (x) => !x.numeric && !x.qualitative && /^not published$/i.test(String(x.dataStatus ?? '').trim());
const toughenedClaim = (g) => (g?.claims ?? []).some((x) => x.claim === 'Toughened or impact-modified');

/** The documents the material's records cite, from the tables (measurements, profiles, its products' maker statements, environment, the guide). */
function documentIds(S, m) {
  const db = S.db;
  const grades = new Set(db.grades.filter((g) => g.materialId === m.id && !g.retired).map((g) => g.id));
  const out = new Set();
  const add = (sid) => { if (stated(sid)) out.add(sid); };
  for (const x of db.measurements) if (x.materialId === m.id) add(x.sourceId);
  for (const p of db.profiles) if (p.materialId === m.id && !p.retired) { add(p.sourceId); add(p.h2cSourceId); }
  for (const k of db.knowHow ?? []) if (grades.has(k.gradeId)) add(k.sourceId);
  for (const e of db.evidence) if (e.materialId === m.id) add(e.sourceId);
  const guide = db.printGuide.find((g) => g.materials.some((y) => y.materialId === m.id));
  if (guide) add(guide.sourceId);
  return out;
}

/** Which sections have something on file, from the tables (the page removes the others and says so). */
function onFile(S, c) {
  const { db } = S;
  const m = c.m;
  const has = (domain) => { const props = propertiesOf(S, domain, m); return c.ms.some((x) => props.has(x.property) && !namedOnly(x)); };
  const priceKey = db.registry.headlines.find((h) => h.kind === 'price')?.key;
  const products = db.grades.filter((g) => g.materialId === m.id && !g.retired);
  return {
    mechanical: has('mechanical'), thermal: has('thermal'), physical: has('physical'),
    printing: db.profiles.some((p) => p.materialId === m.id && !p.retired) || db.printGuide.some((g) => g.materials.some((y) => y.materialId === m.id)),
    products: products.length > 0,
    'makers-say': Object.values(m.knowHow?.products ?? {}).some((n) => n > 0),
    environment: db.evidence.some((e) => e.materialId === m.id) || (db.polymerEvidence ?? []).some((e) => e.materialId === m.id),
    price: !!priceKey && products.filter((g) => m.gradeIds.includes(g.id)).some((g) => g.headline?.[priceKey]),
    estimates: db.registry.headlines.some((h) => !h.drawerOnly && !m.headline?.[h.key]?.known && m.headline?.[h.key]?.estimate) || !!(m.print?.nozzleEstimate || m.print?.bedEstimate || m.print?.chamberEstimate),
    sources: documentIds(S, m).size > 0,
  };
}

/** The products' windows on a print setting, from grades[].print: every window with both ends, with where it was read. */
function windowsOf(c, axis) {
  const products = c.grades.filter(isProduct);
  const variantOnly = products.length > 0 && products.every((g) => g.variant);
  const out = [];
  for (const g of products) {
    const v = g.print?.[axis];
    if (v?.state !== 'range' || v.min == null || v.max == null) continue;
    const origin = g.print?.from?.[axis]?.origin ?? 'own';
    const variant = !variantOnly && !!g.variant;
    out.push({ g, min: v.min, max: v.max, origin, variant, counted: origin !== 'guide' && !variant, profileId: v.profileId ?? null });
  }
  return out;
}

/** The headline's compiled spread as a key figure shows it. */
const spreadOf = (e) => e.spread ?? { n: 1, min: e.value, max: e.value };

// ---------------------------------------------------------------------------------------------------------------------
// P1  the files, the markup, the sections

function p1(S) {
  const expected = new Set([`${PAGES_DIR}/index.html`, ...['pages.css', 'page.js', 'Inter-OFL.txt', 'Newsreader-OFL.txt'].map((f) => `${PAGES_DIR}/assets/${f}`)]);
  for (const m of S.withPage) { expected.add(`${PAGES_DIR}/${m.id}.html`); expected.add(`${PAGES_DIR}/${m.id}-records.html`); }
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
  }

  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const page = S.pages.get(`${m.id}.html`);
    if (!page) continue;
    const who = m.id;
    check('P1', who, page.kind === 'material' && page.materialId === m.id, `main says ${page.kind} ${page.materialId}`);
    const have = onFile(S, c);
    // The written summary is kept whether or not there is one; the sections that have nothing on file leave the page.
    const removed = SECTIONS.filter((s) => s.title && s.id !== 'in-short' && s.id in have && !have[s.id]).map((s) => s.id);
    const want = SECTIONS.map((s) => s.id).filter((id) => !removed.includes(id));
    const got = page.q('main > section[data-section]').map((n) => n.attrs['data-section']);
    check('P1', who, sameList(got, want), () => `sections ${got.join(' ')}; on file: ${want.join(' ')}`);
    for (const n of page.q('main > section[data-section]')) {
      const id = n.attrs['data-section'];
      const empty = id === 'in-short' ? !m.written?.parts?.length : false;
      check('P1', who, n.attrs['data-empty'] === String(empty), `${id} data-empty=${n.attrs['data-empty']}, expected ${empty}`);
      if (id !== 'masthead' && id !== 'footer') check('P1', who, !!n.attrs.id && n.attrs.id === id, `${id} has no anchor`);
    }
    // The line that says what was left out (estimates are named in the data-absent list always; the sentence names them
    // only where some key property has no measured value and does not apply, since otherwise nothing is missing).
    const line = page.q1('p.not-on-file');
    const missingKeys = S.db.registry.headlines.filter((h) => !h.drawerOnly && !m.headline?.[h.key]?.known && !m.headline?.[h.key]?.notApplicable);
    const sayable = removed.filter((id) => id !== 'estimates' || missingKeys.length);
    if (sayable.length) {
      check('P1', who, !!line, 'sections left out but no "Not on file" line');
      if (line) {
        check('P1', who, sameList(sorted(line.attrs['data-absent'].split(/\s+/).filter(Boolean)), sorted(removed)), () => `data-absent "${line.attrs['data-absent']}", removed ${removed.join(' ')}`);
        check('P1', who, textOf(line).startsWith(`Not on file for ${m.name}:`), () => `line reads "${textOf(line).slice(0, 60)}"`);
        const next = line.parent.kids.filter((k) => typeof k === 'object').find((k, i, all) => all[i - 1] === line);
        check('P1', who, !next || ['sources', 'footer'].includes(next.attrs['data-section']) || next.attrs.class?.includes('to-records'), 'the line is not before Sources');
      }
    } else {
      check('P1', who, !line, 'a "Not on file" line with nothing left out');
    }
    // The contents list the titled sections present, then the records page.
    const titled = got.filter((id) => SECTIONS.find((s) => s.id === id)?.title);
    const toc = page.q('nav.toc li a').map((a) => a.attrs.href);
    check('P1', who, sameList(toc, [...titled.map((id) => `#${id}`), `${m.id}-records.html`]), () => `contents ${toc.join(' ')}`);

    const rec = S.pages.get(`${m.id}-records.html`);
    if (!rec) continue;
    check('P1', who + ' records', rec.kind === 'records' && rec.materialId === m.id, `records page says ${rec.kind} ${rec.materialId}`);
    const types = rec.q('main section.rs[data-type]').map((n) => n.attrs['data-type']);
    check('P1', who + ' records', sameList(types, RECORD_SECTIONS.map((s) => s.id)), () => `record tables ${types.join(' ')}`);
    check('P1', who + ' records', sameList(rec.q('main > section[data-section]').map((n) => n.attrs['data-section']).filter((x) => ['masthead', 'footer'].includes(x)), ['masthead', 'footer']), 'masthead and footer');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P2  the counts the masthead, Sources and the records page head state

function p2(S) {
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const page = S.pages.get(`${m.id}.html`);
    const rec = S.pages.get(`${m.id}-records.html`);
    if (!page || !rec) continue;
    const who = m.id;
    const id = identity(m, c);
    const docs = documentIds(S, m);
    const ms = S.db.measurements.filter((x) => x.materialId === m.id);
    const numeric = ms.filter((x) => x.numeric).length;
    const profiles = S.db.profiles.filter((p) => p.materialId === m.id && !p.retired).length;
    const products = S.db.grades.filter((g) => g.materialId === m.id && !g.retired && !/-R\d+$/.test(g.id));
    const makers = new Set(products.map((g) => g.manufacturer).filter(stated)).size;

    // What the tables hold, against what the facts layer reports (the numbers the pages and the drawer share).
    check('P2', who, id.products === products.length && id.makers === makers, `identity ${id.products} products from ${id.makers} makers, tables ${products.length} from ${makers}`);
    check('P2', who, c.documents.size === docs.size && sameList(sorted([...c.documents.keys()]), sorted([...docs])), `documents(c) ${c.documents.size}, tables ${docs.size}`);
    check('P2', who, c.summary.numericMeasurements === numeric && c.summary.measurements === ms.length, `evidenceSummary ${c.summary.measurements}/${c.summary.numericMeasurements}, tables ${ms.length}/${numeric}`);
    check('P2', who, pageFacts(m, ms).values === numeric, `the page rule counts ${pageFacts(m, ms).values} values, "with a number" is ${numeric}`);

    // The masthead.
    const mast = page.q1('section[data-section=masthead] header.mast');
    check('P2', who, !!mast, 'no masthead');
    if (mast) {
      check('P2', who, textOf(query1(mast, 'h1.mast-name')) === id.primary, () => `name "${textOf(query1(mast, 'h1.mast-name'))}", expected "${id.primary}"`);
      const aka = query1(mast, 'p.mast-aka');
      check('P2', who, id.aka ? textOf(aka ?? { kids: [] }) === `also called ${id.aka}` : !aka, `also-called line ${aka ? textOf(aka) : 'absent'}, expected ${id.aka ?? 'none'}`);
      const full = query1(mast, 'p.mast-full');
      check('P2', who, id.fullName ? !!full && textOf(full) === id.fullName : !full, `full name ${full ? textOf(full) : 'absent'}, expected ${id.fullName ?? 'none'}`);
      const facts = new Map(query(mast, 'dl.mast-facts > div').map((d) => [textOf(query1(d, 'dt')), textOf(query1(d, 'dd'))]));
      check('P2', who, facts.get('Products') === `${fmtNumber(products.length)} from ${plural(makers, 'maker')}`, () => `Products "${facts.get('Products')}", tables ${products.length} from ${makers} makers`);
      check('P2', who, facts.get('Bambu Lab status') === h2cStatusLabel(m.h2cStatus), () => `status "${facts.get('Bambu Lab status')}", expected "${h2cStatusLabel(m.h2cStatus)}"`);
      if (stated(m.basePolymer)) check('P2', who, facts.get('Polymer') === m.basePolymer, () => `polymer "${facts.get('Polymer')}", expected ${m.basePolymer}`);
      check('P2', who, !!mast.parent && (query1(mast, 'p.callout') ? !!m.excluded : !m.excluded), 'the beyond-capability callout only for an excluded material');
    }
    const description = page.q1('meta[name=description]')?.attrs.content ?? '';
    check('P2', who, description.includes(`${fmtNumber(numeric)} measured value`) && description.includes(`${plural(docs.size, 'document')}`), () => `description "${description.slice(0, 120)}"`);

    // Sources.
    const src = page.q1('section[data-section=sources]');
    check('P2', who, !!src, 'no Sources section');
    if (src) {
      const counts = Object.fromEntries(query(src, 'dl.inventory dd[data-count]').map((d) => [d.attrs['data-count'], d]));
      const want = { products: products.length, measurements: ms.length, profiles, documents: docs.size };
      for (const [k, n] of Object.entries(want)) {
        check('P2', who, counts[k] && num(counts[k].attrs['data-n']) === n && textOf(counts[k]) === fmtNumber(n), () => `Sources ${k}: ${counts[k] ? `${counts[k].attrs['data-n']} "${textOf(counts[k])}"` : 'absent'}, tables ${n}`);
      }
      const inv = textOf(query1(src, 'dl.inventory'));
      check('P2', who, inv.includes(`measurement records, ${fmtNumber(numeric)} with a number`), () => `Sources "with a number": ${/measurement records, [\d,]+ with a number/.exec(inv)?.[0]}, tables ${numeric}`);
      const lead = /^([\d,]+) documents? from ([\d,]+) publishers?/.exec(textOf(query1(src, '.findings p')));
      const publishers = new Set([...docs].map((sid) => S.ix.sourceById.get(sid)?.publisher ?? 'Publisher not named'));
      check('P2', who, !!lead && num(lead[1]) === docs.size && num(lead[2]) === publishers.size, () => `Sources lead "${textOf(query1(src, '.findings p')).slice(0, 80)}", tables ${docs.size} documents from ${publishers.size} publishers`);
      const byPublisher = query(src, 'table.publishers tbody tr');
      let rows = 0, rowDocs = 0, moreRows = 0, moreDocs = 0;
      for (const r of byPublisher) {
        if (hasClass(r, 'apart')) { const t = /And ([\d,]+) more publishers?, with ([\d,]+) documents?/.exec(textOf(r)); if (t) { moreRows += num(t[1]); moreDocs += num(t[2]); } continue; }
        rows++;
        rowDocs += num(textOf(query(r, 'td.num')[0]));
      }
      check('P2', who, rows + moreRows === publishers.size && rowDocs + moreDocs === docs.size, () => `publishers table: ${rows}+${moreRows} publishers, ${rowDocs}+${moreDocs} documents; tables ${publishers.size}, ${docs.size}`);
      const kinds = query(src, 'table.kinds tbody tr td.num').map((td) => num(textOf(td))).reduce((a, b) => a + b, 0);
      check('P2', who, kinds === docs.size, `kinds of document add up to ${kinds}, documents ${docs.size}`);
    }

    // The closing link, and the records page's head.
    const link = textOf(page.q1('p.to-records') ?? { kids: [] });
    const lm = /Every record behind this page: ([\d,]+) measurements?, ([\d,]+) print profiles?, ([\d,]+) documents?/.exec(link);
    check('P2', who, !!lm && num(lm[1]) === ms.length && num(lm[2]) === profiles && num(lm[3]) === docs.size, () => `closing link "${link.slice(0, 120)}", tables ${ms.length}/${profiles}/${docs.size}`);
    const head = Object.fromEntries(rec.q('dl.mast-counts dd[data-count]').map((d) => [d.attrs['data-count'], num(d.attrs['data-n'])]));
    check('P2', who + ' records', head.measurements === ms.length && head.profiles === profiles && head.documents === docs.size, () => `records head ${JSON.stringify(head)}, tables ${ms.length}/${profiles}/${docs.size}`);
    for (const t of RECORD_SECTIONS) {
      const sec = rec.q1(`section.rs[data-type=${t.id}]`);
      if (!sec) continue;
      check('P2', who + ' records', num(sec.attrs['data-count']) === head[t.id] && num(sec.attrs['data-count']) === t.count(c), () => `${t.id}: section ${sec.attrs['data-count']}, head ${head[t.id]}, count ${t.count(c)}`);
    }
    // A table has a row for each record it counts (the rows of a table that lists nothing are its empty line).
    const rowsOf = { measurements: 'tr[data-mid]', profiles: 'tr[data-pid]', statements: 'tr[data-kid]', prices: 'tr[data-lid]', documents: 'tr[data-sid]' };
    for (const [type, sel] of Object.entries(rowsOf)) {
      const sec = rec.q1(`section.rs[data-type=${type}]`);
      if (sec) check('P2', who + ' records', query(sec, sel).length === num(sec.attrs['data-count']), () => `${type}: ${query(sec, sel).length} rows, ${sec.attrs['data-count']} counted`);
    }
    const sec = rec.q1('section.rs[data-type=measurements]');
    if (sec) check('P2', who + ' records', query(sec, 'tr[data-mid]').length === ms.length && sameList(sorted(query(sec, 'tr[data-mid]').map((r) => r.attrs['data-mid'])), sorted(ms.map((x) => x.id))), 'the measurement rows are the measurements');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P3  key figures

function p3(S) {
  const keys = S.db.registry.headlines.filter((h) => !h.drawerOnly);
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const page = S.pages.get(`${m.id}.html`);
    if (!page) continue;
    const who = m.id;
    const rows = page.q('section[data-section=key-figures] tr.kf[data-kf]');
    check('P3', who, sameList(sorted(rows.map((r) => r.attrs['data-kf'])), sorted(keys.map((h) => h.key))), () => `rows ${rows.map((r) => r.attrs['data-kf']).join(' ')}`);
    for (const h of keys) {
      const row = rows.find((r) => r.attrs['data-kf'] === h.key);
      if (!row) continue;
      const e = m.headline?.[h.key];
      const w = `${who} ${h.key}`;
      if (e?.known) {
        const sp = spreadOf(e);
        check('P3', w, !hasClass(row, 'kf--none'), 'a known value drawn as none');
        check('P3', w, Number(row.attrs['data-median']) === e.value && Number(row.attrs['data-min']) === sp.min && Number(row.attrs['data-max']) === sp.max && Number(row.attrs['data-n']) === sp.n,
          () => `data ${row.attrs['data-median']}/${row.attrs['data-min']}/${row.attrs['data-max']}/${row.attrs['data-n']}, compiled ${e.value}/${sp.min}/${sp.max}/${sp.n}`);
        const s = m.summary?.[h.key];
        if (s?.n) check('P3', w, s.n === sp.n && s.median === e.value, () => `summary n ${s.n} median ${s.median}, headline n ${sp.n} median ${e.value}`);
        const typ = query1(row, 'td.typ');
        check('P3', w, textOf(query1(typ, 'b')) === fmtBounded(e.value, null, publishedBound(e)) && textOf(query1(typ, '.u')) === h.unit,
          () => `shows "${textOf(typ)}", expected ${fmtBounded(e.value, null, publishedBound(e))} ${h.unit}`);
        const cells = query(row, 'td.num');
        const range = textOf(cells[1]);
        if (sp.n > 1 && (sp.min !== sp.max || sp.bounds)) {
          check('P3', w, range.includes(fmtNumber(sp.min)) && range.includes(fmtNumber(sp.max)) && (sp.bounds || range === `${fmtNumber(sp.min)}–${fmtNumber(sp.max)}`), () => `range "${range}", compiled ${sp.min} to ${sp.max}`);
        } else check('P3', w, range === '—', () => `range "${range}" for one value`);
        check('P3', w, textOf(cells[2]) === String(sp.n), () => `products compared "${textOf(cells[2])}", compiled ${sp.n}`);
      } else {
        check('P3', w, hasClass(row, 'kf--none') && row.attrs['data-median'] === undefined, 'no comparable value but drawn with one');
        const t = textOf(query1(row, 'td.none') ?? { kids: [] });
        if (e?.notApplicable) {
          check('P3', w, t.startsWith('Not applicable'), () => `not applicable shown as "${t.slice(0, 60)}"`);
          // The drawer says the reason in its own words; so does the page, beside the table.
          check('P3', w, !e.notApplicable.reason || textOf(page.q1('section[data-section=key-figures]')).includes(String(e.notApplicable.reason).replace(/\s+/g, ' ').trim()), () => `the reason "${e.notApplicable.reason}" is not on the page`);
        } else if (m.summary?.[h.key]?.asPublished?.n) {
          check('P3', w, t.startsWith('Not compared:'), () => `values with no stated basis shown as "${t.slice(0, 60)}"`);
        } else if (e?.related) {
          check('P3', w, /^(?:On file, not compared|One value from|\d+ values from)/.test(t), () => `related values shown as "${t.slice(0, 60)}"`);
        } else check('P3', w, t.startsWith('Not published'), () => `nothing on file shown as "${t.slice(0, 60)}"`);
      }
    }
    // The first screen's numbers.
    for (const kn of page.q('dl.mast-numbers div.kn[data-key]')) {
      const key = kn.attrs['data-key'];
      const w = `${who} first screen ${key}`;
      const b = query1(kn, 'b');
      const small = textOf(query1(kn, 'small') ?? { kids: [] });
      const h = S.db.registry.headlines.find((x) => x.key === key);
      if (h) {
        const e = m.headline?.[key];
        if (e?.known) {
          const n = e.spread?.n ?? m.summary?.[key]?.n ?? 1;
          check('P3', w, !!b && textOf(b) === fmtBounded(e.value, null, publishedBound(e)) && small === (n === 1 ? 'one product' : `median of ${n} products`), () => `shows "${b ? textOf(b) : ''}" "${small}", compiled ${e.value} of ${n}`);
        } else check('P3', w, hasClass(kn, 'kn--none') || hasClass(kn, 'kn--open'), 'no comparable value but drawn as a typical one');
      } else if (key === 'nozzle' || key === 'bed') {
        const counted = windowsOf(c, key).filter((x) => x.counted).length;
        if (!counted) check('P3', w, hasClass(kn, 'kn--none'), 'no counted window but a window shown');
        else {
          check('P3', w, counted === 1 ? small === 'one product' : new RegExp(`^(?:all|most of|\\d+ of) ${counted} products accept$`).test(small), () => `says "${small}", windows counted ${counted}`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P4  rank tracks

function p4(S) {
  for (const m of S.withPage) {
    const page = S.pages.get(`${m.id}.html`);
    if (!page) continue;
    for (const row of page.q('section[data-section=key-figures] tr.kf[data-kf]')) {
      const key = row.attrs['data-kf'];
      const w = `${m.id} ${key}`;
      const rank = S.ranks[key];
      const tracks = query(row, 'svg.ptrack');
      if (hasClass(row, 'kf--none')) { check('P4', w, !tracks.length, 'a track on a row with no value'); continue; }
      const entries = rank.entries;
      const self = entries.find((x) => x.id === m.id);
      check('P4', w, !!self && self.value === m.headline[key].value, 'the material is not in the rank table with its median');
      const others = entries.filter((x) => x.id !== m.id);
      if (!others.length) { check('P4', w, !tracks.length, 'a track with no other material to rank against'); continue; }
      check('P4', w, tracks.length === 1 && tracks[0].attrs['data-rank'] === key, 'one track for the row');
      if (tracks.length !== 1) continue;
      const t = tracks[0];
      const below = others.filter((x) => x.value < self.value).length;
      const level = others.filter((x) => x.value === self.value).length;
      const pct = ((below + level / 2) / others.length) * 100;
      check('P4', w, Number(t.attrs['data-of']) === entries.length, () => `data-of ${t.attrs['data-of']}, materials with a value ${entries.length}`);
      check('P4', w, t.attrs['data-pct'] === pct.toFixed(1), () => `data-pct ${t.attrs['data-pct']}, rank table gives ${pct.toFixed(1)} (${below} below, ${level} level of ${others.length})`);
      check('P4', w, (row.attrs.title ?? '') === `Above ${Math.round(pct)} % of the ${others.length} other materials' typical values`, () => `title "${row.attrs.title}"`);
    }
    // Where a context strip is drawn: a tick per material with a value, and one of them this material's.
    for (const strip of page.q('svg.ctx-strip[data-rank]')) {
      const rank = S.ranks[strip.attrs['data-rank']];
      check('P4', `${m.id} ${strip.attrs['data-rank']}`, !!rank && query(strip, 'line.tick, line.tick--this').length === rank.entries.length && query(strip, 'line.tick--this').length === 1, 'context strip ticks');
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P5  comparison marks, the counted line, and why a record is not drawn

const MARKS = ['open', 'annealed', 'variant', 'claimed'];
/** The kinds a product's value is drawn with (the drawer's: hollow without a stated basis, square if annealed, diamond for a special formulation). */
function kindsOf(h, e, c) {
  const owner = e.v.from?.origin === 'twin' ? c.gradeById.get(e.v.from.gradeId) : e.g;
  return [e.v.level === 'as-published' ? 'open' : null, e.v.anneal ? 'annealed' : null, e.variant ? 'variant' : null, h.toughened && toughenedClaim(owner) ? 'claimed' : null].filter(Boolean);
}
const shapeOf = (kinds) => (kinds.includes('variant') ? '#mk-diamond' : kinds.includes('annealed') ? '#mk-square' : '#mk-dot');
const classKinds = (n) => MARKS.filter((k) => hasClass(n, `mk--${k}`));
const xOf = (n) => parseFloat(n.attrs.x);

/** A row's marks against the entries it should draw: the same products, records, kinds and shapes; left to right by value. */
function checkRowMarks(who, row, h, entries, c) {
  const marks = query(row, 'use.mk[data-grade]');
  const key = (g, mid, kinds) => `${g}|${mid}|${kinds.join('+')}`;
  const want = entries.map((e) => key(e.g.id, e.v.measurementId, kindsOf(h, e, c)));
  const got = marks.map((n) => key(n.attrs['data-grade'], n.attrs['data-mid'], classKinds(n)));
  check('P5', who, sameList(sorted(want), sorted(got)), () => `marks of ${h.key}: page ${sorted(got).slice(0, 3).join(' ; ')}…, records ${sorted(want).slice(0, 3).join(' ; ')}… (${got.length} against ${want.length})`);
  const bad = marks.filter((n) => {
    const e = entries.find((x) => x.g.id === n.attrs['data-grade']);
    return e && (n.attrs.href !== shapeOf(kindsOf(h, e, c)) || n.attrs['data-v'] !== fmtBounded(e.v.value, null, e.v.interval));
  });
  check('P5', who, !bad.length, () => `marks of ${h.key} with a wrong shape or value: ${bad.slice(0, 2).map((n) => `${n.attrs['data-grade']} ${n.attrs['data-v']}`).join(', ')}`);
  // Placed left to right by value.
  const placed = marks.map((n) => [entries.find((x) => x.g.id === n.attrs['data-grade'])?.v.value, xOf(n)]).filter(([v]) => v != null).sort((a, b) => a[0] - b[0]);
  check('P5', who, placed.every(([, x], i) => i === 0 || x >= placed[i - 1][1] - 1e-9), `marks of ${h.key} are not in the order of their values`);
}

function p5(S) {
  const LAYERS = new Set(LAYER_TESTS);
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const page = S.pages.get(`${m.id}.html`);
    const rec = S.pages.get(`${m.id}-records.html`);
    if (!page || !rec) continue;
    const who = m.id;
    const mechanical = comparisonsOf(m, c, 'Mechanical');
    const thermal = comparisonsOf(m, c, 'Thermal');

    // The impact comparison (and any other that is not a layer test): a figure if two products' values share a scale, else a sentence.
    const figures = page.q('figure[data-comparison]');
    const lone = page.q('div.nofig[data-comparison]');
    const wantTopics = mechanical.filter((f) => !LAYERS.has(f.topic));
    check('P5', who, sameList(sorted([...figures, ...lone].map((n) => n.attrs['data-comparison'])), sorted(wantTopics.map((f) => f.topic))), () => `comparisons on the page ${[...figures, ...lone].map((n) => n.attrs['data-comparison']).join(', ')}, records give ${wantTopics.map((f) => f.topic).join(', ')}`);
    for (const f of wantTopics) {
      const fig = figures.find((n) => n.attrs['data-comparison'] === f.topic);
      check('P5', `${who} ${f.topic}`, !!fig === (f.drawnGraphs.length > 0), 'a figure exactly where a scale has two products\' values');
      if (!fig) continue;
      const graphs = query(fig, 'div.fig-graph');
      check('P5', `${who} ${f.topic}`, graphs.length === f.drawnGraphs.length, `${graphs.length} graphs, ${f.drawnGraphs.length} scales with two values`);
      const rows = query(fig, '.fig-row[data-headline]');
      check('P5', `${who} ${f.topic}`, sameList(rows.map((r) => r.attrs['data-headline']), f.drawnGraphs.flatMap((gr) => gr.rows.map((h) => h.key))), 'the rows are the tests that have a product');
      for (const row of rows) {
        const h = f.hs.find((x) => x.key === row.attrs['data-headline']);
        const entries = spreadEntries(m, c, h.key);
        checkRowMarks(`${who} ${f.topic}`, row, h, entries, c);
        const sub = textOf(query1(row, 'small') ?? { kids: [] });
        check('P5', `${who} ${h.key}`, sub === `${entries.length} shown, ${m.summary?.[h.key]?.n ?? 0} compared`, () => `row says "${sub}", records ${entries.length} shown, ${m.summary?.[h.key]?.n ?? 0} compared`);
      }
      // The counted line: every result on file for these tests is drawn, named or left out for a stated reason.
      const props = new Set(f.hs.flatMap((h) => [...h.valueProperties, ...h.relatedProperties]));
      for (const p of f.cmp.listed ?? []) props.add(p);
      const tabProps = propertiesOf(S, 'mechanical', m);
      const records = c.ms.filter((x) => props.has(x.property) && tabProps.has(x.property) && !namedOnly(x));
      const body = textOf(query1(fig, 'details.counted .counted-body') ?? { kids: [] });
      const line = /Of the (\d+) results on file for these tests, (\d+) (?:is|are) the products' own values(?: and (\d+) (?:is|are) named alone)?\.(?: The other (\d+): (.*?)\.)?(?= |$)/.exec(body);
      check('P5', `${who} ${f.topic}`, !!line, 'no counted line');
      if (line) {
        const n = Number(line[1]), drawn = Number(line[2]), named = Number(line[3] ?? 0), rest = Number(line[4] ?? 0);
        const parts = (line[5] ?? '').split(/, | and /).map((x) => /^(\d+) /.exec(x)?.[1]).filter(Boolean).reduce((a, x) => a + Number(x), 0);
        check('P5', `${who} ${f.topic}`, n === records.length, `the line counts ${n} results, the records give ${records.length}`);
        check('P5', `${who} ${f.topic}`, drawn + named + rest === n && rest === parts, () => `"${line[0]}" does not add up: ${drawn}+${named}+${rest} of ${n}, parts ${parts}`);
        check('P5', `${who} ${f.topic}`, drawn === records.filter((x) => f.drawnIds.has(x.id)).length && named === records.filter((x) => f.namedIds.has(x.id)).length, 'drawn and named counts are the records the figure draws');
      }
    }
    // Marks of the layer figure and of the price figure: each is a product's own value or price.
    for (const mk of page.q('use.mk[data-mid]')) {
      const g = c.gradeById.get(mk.attrs['data-grade']);
      check('P5', who, !!g && g.materialId === m.id && Object.values(g.headline ?? {}).some((v) => v?.measurementId === mk.attrs['data-mid']) && c.msById.has(mk.attrs['data-mid']),
        () => `mark ${mk.attrs['data-grade']} ${mk.attrs['data-mid']} is not one of the product's values`);
    }
    const priceKey = S.db.registry.headlines.find((h) => h.kind === 'price')?.key;
    const priceFig = page.q1('figure[data-price]');
    const priced = priceKey ? spreadEntries(m, c, priceKey) : [];
    check('P5', who, !!priceFig === priced.length > 0, 'the price figure only with a priced product');
    if (priceFig) {
      const marks = query(priceFig, 'use.mk[data-grade]');
      const want = priced.map((e) => `${e.g.id}|${[e.v.converted ? 'open' : null, e.variant ? 'variant' : null].filter(Boolean).join('+')}`);
      const got = marks.map((n) => `${n.attrs['data-grade']}|${classKinds(n).join('+')}`);
      check('P5', who + ' price', sameList(sorted(want), sorted(got)), () => `price marks ${got.length}, priced products ${want.length}`);
    }

    // The records page: why each record is, or is not, on a figure.
    const sec = rec.q1('section.rs[data-type=measurements]');
    const comps = [...mechanical, ...thermal];
    const first = new Map();
    for (const f of comps) for (const p of f.properties) if (!first.has(p)) first.set(p, f);
    const lines = new Map();
    for (const f of comps) if (f.drawnGraphs.length) for (const o of f.onGraph) lines.set(o.mid, (lines.get(o.mid) ?? 0) + 1);
    const gm = (x) => c.ms.filter((z) => z.gradeId === x.gradeId);
    for (const tr of query(sec, 'tr[data-mid]')) {
      const x = c.msById.get(tr.attrs['data-mid']);
      const w = `${who} ${tr.attrs['data-mid']}`;
      if (!check('P5', w, !!x && tr.attrs['data-grade'] === x.gradeId, 'a row for no measurement of the material')) continue;
      const cell = query1(tr, 'td.drawn');
      const f = first.get(x.property);
      check('P5', w, !!cell === !!f, () => `${cell ? 'a' : 'no'} "on the main page" cell, ${f ? 'a' : 'no'} comparison reads ${x.property}`);
      if (!cell || !f) continue;
      const said = notDrawnWhy(x, f.hs, c, f.drawnIds, f.namedIds);
      check('P5', w, cell.attrs['data-why'] === said, () => `page says "${cell.attrs['data-why']}", notDrawnWhy says "${said}"`);
      if (said === 'drawn') check('P5', w, query(cell, 'span.bd').length === (lines.get(x.id) ?? 0), () => `${query(cell, 'span.bd').length} lines for a record drawn ${lines.get(x.id) ?? 0} times`);
      // Against the build's own reason for refusing a record (assess, called here directly).
      const reads = f.hs.filter((y) => y.valueProperties.includes(x.property));
      const results = reads.map((y) => assess(x, y, gm(x)));
      const got = said.split(':')[0] === 'resin' ? 'moulded' : said.split(':')[0];
      if (x.quarantined) check('P5', w, said === 'held' || said === 'drawn' || said === 'named', `a held-back record is "${said}"`);
      else if (!reads.length) check('P5', w, got === (x.numeric ? 'property' : 'noNumber'), `no test reads ${x.property}; "${said}"`);
      else if (results.some((r) => !r.excluded)) check('P5', w, ['drawn', 'named', 'second', 'retired', 'reference'].includes(said), `a test takes it; "${said}"`);
      else {
        const whys = results.map((r) => r.why);
        const expected = whys.reduce((a, b) => (ASSESS_ORDER.indexOf(b) > ASSESS_ORDER.indexOf(a) ? b : a));
        check('P5', w, got === expected, () => `assess says ${whys.join('/')}, the page says "${said}"`);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P6  print windows, drying, the guide and the H2C's limit

function p6(S) {
  const limits = { nozzle: S.db.meta.h2cBaseline.nozzleC, bed: S.db.meta.h2cBaseline.bedC, chamber: S.db.meta.h2cBaseline.chamberC };
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const page = S.pages.get(`${m.id}.html`);
    if (!page) continue;
    const who = m.id;
    const section = page.q1('section[data-section=printing]');
    if (!section) { check('P6', who, !c.profiles.length && !c.guide, 'print profiles on file but no printing section'); continue; }
    const products = c.grades.filter(isProduct);
    const fig = query1(section, 'figure[data-print]');
    // A setting is drawn where three counted windows or more give it and they do not all agree.
    const drawable = (axis) => { const w = windowsOf(c, axis).filter((x) => x.counted); return w.length > 2 && !w.every((x) => x.min === w[0].min && x.max === w[0].max); };
    const axes = ['nozzle', 'bed', 'chamber'].filter(drawable);
    check('P6', who, !!fig === axes.length > 0, `a print figure ${fig ? 'drawn' : 'absent'}, drawable settings ${axes.join(', ') || 'none'}`);
    const panels = fig ? query(fig, 'div.pw[data-setting]') : [];
    const drawnAxes = panels.map((p) => p.attrs['data-setting']).filter((a) => a !== 'drying');
    check('P6', who, sameList(drawnAxes, axes), () => `panels ${drawnAxes.join(', ')}, settings with windows ${axes.join(', ')}`);
    for (const panel of panels) {
      const axis = panel.attrs['data-setting'];
      const w = windowsOf(c, axis);
      const ww = `${who} ${axis}`;
      check('P6', ww, num(panel.attrs['data-n']) === w.filter((x) => x.counted).length, () => `data-n ${panel.attrs['data-n']}, counted windows ${w.filter((x) => x.counted).length}`);
      const bars = query(panel, 'line.wb[data-grade]');
      check('P6', ww, sameList(sorted(bars.map((b) => b.attrs['data-grade'])), sorted(w.map((x) => x.g.id))), () => `${bars.length} bars, ${w.length} windows`);
      for (const b of bars) {
        const x = w.find((y) => y.g.id === b.attrs['data-grade']);
        if (!x) continue;
        check('P6', ww, b.attrs['data-v'] === `${fmtNumber(x.min)}–${fmtNumber(x.max)} °C`, () => `${x.g.id} bar says ${b.attrs['data-v']}, sheet ${x.min}–${x.max}`);
        check('P6', ww, hasClass(b, 'wb--guide') === (x.origin === 'guide') && hasClass(b, 'wb--variant') === x.variant, () => `${x.g.id} bar kinds (guide ${x.origin === 'guide'}, variant ${x.variant})`);
        check('P6', ww, (b.attrs['data-profile'] ?? null) === x.profileId, () => `${x.g.id} bar profile ${b.attrs['data-profile']}, gate ${x.profileId}`);
      }
      // Guide windows are drawn and counted for none; left to right by their lowest end.
      check('P6', ww, bars.filter((b) => hasClass(b, 'wb--guide') && !hasClass(b, 'wb--variant')).length === w.filter((x) => x.origin === 'guide' && !x.variant).length, 'guide windows drawn apart');
      const ordered = bars.map((b) => [num(/^([\d,.]+)/.exec(b.attrs['data-v'])[1]), parseFloat(b.attrs.x1)]);
      check('P6', ww, ordered.every(([lo, x], i) => i === 0 || (lo >= ordered[i - 1][0] && x >= ordered[i - 1][1] - 1e-9)), 'bars run top to bottom by their lowest end, and sit left to right with it');
      // The limit: a line and its label where it is near the windows, else said under the plot.
      const ends = w.flatMap((x) => [x.min, x.max]);
      const on = limitOnScale(limits[axis], ends);
      check('P6', ww, query(panel, 'svg.pw-curve line.limit').length === (on ? 1 : 0) && query(panel, 'svg.pw-bars line.limit').length === (on ? 1 : 0), `limit line ${on ? 'missing' : 'drawn'}`);
      const label = textOf(query1(panel, 'text.limit-label') ?? { kids: [] });
      check('P6', ww, on ? label === `H2C max ${fmtNumber(limits[axis])} °C` : !label && textOf(query1(panel, 'p.pw-unit')).includes(`the H2C reaches ${fmtNumber(limits[axis])} °C`), () => `limit label "${label}", baseline ${limits[axis]}`);
    }
    // Drying: a strip of dots where two products give a temperature and a figure is drawn.
    const dry = products.filter((g) => g.print?.drying?.tempC != null && g.print.drying.need !== 'not-needed');
    const strip = fig ? query1(fig, '[data-row=drying]') : null;
    check('P6', who, !!strip === (dry.length > 1 && !!fig), `drying strip ${strip ? 'drawn' : 'absent'} for ${dry.length} products with a temperature`);
    if (strip) {
      const marks = query(strip, 'use.mk[data-grade]');
      const variantOnly = products.every((g) => g.variant);
      const key = (g, kinds) => `${g}|${kinds.join('+')}`;
      const want = dry.map((g) => key(g.id, [g.print.from?.drying?.origin === 'guide' ? 'open' : null, !variantOnly && g.variant ? 'variant' : null].filter(Boolean)));
      const got = marks.map((n) => key(n.attrs['data-grade'], classKinds(n)));
      check('P6', who + ' drying', sameList(sorted(want), sorted(got)), () => `drying marks ${got.length}, products ${want.length}`);
      for (const n of marks) {
        const g = c.gradeById.get(n.attrs['data-grade']);
        check('P6', who + ' drying', !!g && n.attrs['data-v'].startsWith(fmtNumber(g.print.drying.tempC)), () => `${n.attrs['data-grade']} drying ${n.attrs['data-v']}, sheet ${g?.print.drying.tempC}`);
      }
    }
    // The drying and print counts the facts line states.
    const need = (g) => g.print?.drying && ['required', 'optional', 'not-needed'].includes(g.print.drying.need);
    const haveDry = products.filter(need);
    const facts = query1(section, 'dl.facts[data-drying-have]');
    if (facts) {
      const origin = (g) => g.print?.from?.drying?.origin ?? 'own';
      const want = [haveDry.length, haveDry.filter((g) => origin(g) === 'own').length, haveDry.filter((g) => origin(g) === 'twin').length, haveDry.filter((g) => origin(g) === 'guide').length, products.length];
      const got = ['data-drying-have', 'data-drying-own', 'data-drying-twin', 'data-drying-guide', 'data-products'].map((k) => Number(facts.attrs[k]));
      check('P6', who + ' drying', sameList(got, want), () => `drying counts ${got.join('/')}, products ${want.join('/')}`);
    } else check('P6', who, false, 'no drying and nozzle facts');
    // The limits table: the H2C's limit and how many products are within, over, unknown, for each setting.
    const table = query1(section, 'table.limits');
    const counts = printCounts(c.grades);
    if (table) {
      for (const r of query(table, 'tbody tr')) {
        const axis = ({ Nozzle: 'nozzle', Bed: 'bed', Chamber: 'chamber' })[textOf(query1(r, 'th'))];
        const cells = query(r, 'td.num').map((td) => textOf(td));
        const tally = { within: 0, over: 0, unknown: 0 };
        for (const g of products) {
          const v = g.print?.profileIds?.length || g.print?.from?.[axis] ? g.print[axis].verdict : 'unknown';
          tally[v === 'within' ? 'within' : v === 'unknown' ? 'unknown' : 'over']++;
        }
        check('P6', `${who} ${axis}`, cells[0] === fmtNumber(limits[axis], '°C') && num(cells[1]) === tally.within && num(cells[2]) === tally.over && num(cells[3]) === tally.unknown, () => `limits row ${cells.join(' / ')}, baseline ${limits[axis]} and ${JSON.stringify(tally)}`);
      }
      check('P6', who, !!counts && !counts.all, 'the limits table only where some product is not within');
    }
    // The guide's row is shown as the guide prints it.
    const guide = query1(section, 'div.guide');
    check('P6', who, !!guide === !!c.guide, `guide block ${guide ? 'drawn' : 'absent'}, guide row ${c.guide ? 'on file' : 'none'}`);
    if (guide && c.guide) {
      check('P6', who, textOf(query1(guide, 'h3')) === c.guide.name, 'the guide block is headed by the guide row\'s name');
      const dd = query(guide, 'dl.facts--guide dd').map((d) => textOf(d));
      check('P6', who, dd[0] === textOf({ kids: [String(c.guide.nozzle.text)] }) && dd[1] === textOf({ kids: [String(c.guide.bed.text)] }), () => `guide nozzle/bed "${dd[0]}" / "${dd[1]}"`);
    }
    // The heat ladder's reference line is the heated chamber's limit.
    const ladder = page.q1('figure[data-ladder]');
    // (The ladder draws the line only where the chamber's limit is near its rungs, so the line is not required; where it is drawn it is the baseline's.)
    if (ladder) {
      const label = query1(ladder, 'text.limit-label');
      check('P6', who, !!label === !!query1(ladder, 'line.limit'), 'the heat ladder\'s limit line and its label go together');
      if (label) check('P6', who, textOf(label) === `H2C chamber max ${fmtNumber(limits.chamber)} °C`, () => `ladder limit "${textOf(label)}", baseline ${limits.chamber}`);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P7, P8  links

function p7(S) {
  for (const page of S.pages.values()) {
    const external = page.q('a[href]').filter((a) => /^https?:/i.test(a.attrs.href));
    const m = S.contexts.get(page.materialId);
    const allowed = new Map();
    if (m) for (const sid of m.documents.keys()) { const o = originalOf(S.ix.sourceById.get(sid)); if (o && !o.local) allowed.set(o.url, sid); }
    for (const a of external) check('P7', `${page.file}`, allowed.has(a.attrs.href), () => `${a.attrs.href} is not the URL of a document this material cites`);
    if (page.kind === 'records') {
      for (const tr of page.q('tr[data-sid]')) {
        const o = originalOf(S.ix.sourceById.get(tr.attrs['data-sid']));
        const links = query(tr, 'td.src a[href]').map((a) => a.attrs.href);
        check('P7', `${page.file} ${tr.attrs['data-sid']}`, o && !o.local ? links.length === 1 && links[0] === o.url : !links.some((h) => /^https?:/i.test(h)), () => `document links ${links.join(' ') || 'none'}, source url ${o?.url ?? 'none'}`);
      }
    } else check('P7', page.file, !external.length, 'an external link outside the records page');
  }
}

function p8(S) {
  for (const page of S.pages.values()) {
    const m = page.materialId;
    const sids = new Set(page.q('tr[data-sid]').map((r) => r.attrs['data-sid']));
    let selector = 0;
    const refs = [...page.q('a[href]').map((n) => ['href', n.attrs.href]), ...page.q('link[href]').map((n) => ['href', n.attrs.href]), ...page.q('script[src]').map((n) => ['src', n.attrs.src])];
    for (const [, href] of refs) {
      const w = `${page.file}`;
      if (/^(?:https?:|data:|mailto:)/i.test(href)) continue;
      const [target, ...rest] = href.split('#');
      const frag = rest.join('#');
      if (!target) {
        if (/^[a-z]+=/.test(frag)) {
          const [k, v] = [frag.slice(0, frag.indexOf('=')), decodeURIComponent(frag.slice(frag.indexOf('=') + 1))];
          check('P8', w, k === 'doc' && sids.has(v), () => `#${frag.slice(0, 60)} names no document of this page`);
        } else check('P8', w, page.ids.has(frag), () => `#${frag} is not an anchor on the page`);
        continue;
      }
      if (target.startsWith('../')) {
        const file = target.slice(3);
        check('P8', w, file === S.selectorFile && existsSync(join(DIST, file)), () => `${href.slice(0, 80)} is not the selector page`);
        if (frag) {
          selector++;
          let scenario = null;
          try { scenario = fromHash(frag, S.db.meta, { materialIds: new Set(S.db.materials.map((x) => x.id)) }).scenario; } catch (e) { check('P8', w, false, () => `the selector link cannot be read: ${e.message}`); }
          if (scenario) check('P8', w, scenario.openMaterial === m, () => `the selector link opens ${scenario.openMaterial}, the page is ${m}`);
        } else check('P8', w, page.kind === 'index', 'a selector link without the material');
        continue;
      }
      check('P8', w, S.disk.has(`${PAGES_DIR}/${target}`), () => `${target} is not in dist/materials/`);
      if (frag && S.pages.has(target)) check('P8', w, S.pages.get(target).ids.has(frag), () => `${target}#${frag} is not an anchor there`);
    }
    if (page.kind === 'material' || page.kind === 'records') check('P8', page.file, page.kind === 'records' ? true : selector > 0, 'no link to the selector with this material open');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P9  no record IDs, no coinages

/** Text outside the places that show a record's own words: ID cells, quotations, source lines, raw cells, the release stamp, collapsed record notes. */
function readerSkip(n) {
  if (n.tag === 'q') return true;
  if (n.tag === 'td' && hasClass(n, 'id')) return true;
  if (hasClass(n, 'src') || hasClass(n, 'raw') || (n.tag === 'span' && hasClass(n, 'mono'))) return true;
  // A record's own note, collapsed under "record note" (INTERFACE "Words": a reviewer's or migration's note sits under Record notes).
  if (n.tag === 'details' && hasClass(n, 'ch') && /^record note/i.test(textOf(query1(n, 'summary') ?? { kids: [] }))) return true;
  return false;
}
const ID_SHAPES = /(?<![A-Za-z0-9.-])(?:V\d{6}|G\d{3}-(?:\d{2}(?:-R\d+)?|R\d+)|M\d{3}|P\d{4}|Q\d{5}|C\d{5}|CA\d{4}|PG\d{3}|m\d{3}|R\d{3}|S-[A-Z0-9]+(?:-[A-Za-z0-9]+){2,})(?![A-Za-z0-9-])/g;
// The project's own words (INTERFACE "Words", left column, and common.js's list of words a reviewer's note must not carry).
const COINAGES = [
  // "grade" for a product is the project's word; the word stands in data the pages quote (a maker's "all grades of Delrin", a
  // chemical's "technical grade", a product's name), so only its compounds are looked for here, and the makers' topic names below.
  /\breference grades?\b/i, /\brepresentative grade\b/i, /\bgrade[- ]specific\b/i, /\bgrade IDs?\b/i,
  /\btwins?\b/i, /same sheet as/i, /admitted for screening/i, /research mode/i, /print checks? off/i, /H2C's scope/i,
  /printer's envelope/i, /printer maker's guide/i, /Official Bambu product/, /Officially listed family/, /\bTheoretical\b/, /"Conditional"/,
  /\bheadlines?\b/i, /\bquarantin\w*/i, /track only/i, /preference only/i, /coverage records?/i, /evidence recorded/i, /family entr(?:y|ies)/i,
  /\bmigrations?\b/i, /\bworkbook\b/i, /representative grade/i, /\bscreened\b/i, /\bgrade-specific\b/i,
];

function p9(S) {
  const known = new Set();
  for (const t of ['sources', 'grades', 'measurements', 'profiles', 'evidence', 'knowHow', 'prices', 'coverage', 'printGuide']) for (const r of S.db[t] ?? []) known.add(r.id);
  for (const page of S.pages.values()) {
    const records = page.kind === 'records';
    // On a records page the tables hold the records as recorded; the page's own words (head, notes, group heads) are checked.
    const text = textOf(page.main, (n) => readerSkip(n) || (records && n.tag === 'tbody'));
    const ids = [...text.matchAll(ID_SHAPES)].map((x) => x[0]);
    const tokens = text.match(/[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]/g) ?? [];
    for (const t of tokens) if (known.has(t) && !/^(?:H2C|PA6|PA12)$/.test(t)) ids.push(t);
    check('P9', page.file, !ids.length, () => `record ID in the text: ${[...new Set(ids)].slice(0, 4).join(', ')} ("${text.slice(Math.max(0, text.indexOf(ids[0]) - 40), text.indexOf(ids[0]) + 40)}")`);
    const bad = COINAGES.map((re) => re.exec(text)).filter(Boolean);
    // The makers' topics are headings the page writes; none says "grade" for a product.
    for (const th of page.q('table.topics tbody th')) check('P9', page.file, !/\bgrades?\b/i.test(textOf(th)), () => `a maker topic is headed "${textOf(th)}"`);
    check('P9', page.file, !bad.length, () => `project word "${bad[0][0]}" in "${text.slice(Math.max(0, bad[0].index - 50), bad[0].index + 50)}"`);
  }
  // Standards and polymer names are not record IDs.
  const probe = 'ASTM D256, ISO 527, ISO 179-1, D638, PA6, PA612, PA12-CF, H2C, ISO 75-2';
  check('P9', 'the ID pattern', !probe.match(ID_SHAPES), 'a standard or a polymer name matches the ID pattern');
  check('P9', 'the ID pattern', 'V000384 G020-01 G052-R1 M020 P0349 Q00012 C00012 m123'.match(ID_SHAPES).length === 8, 'the ID pattern misses a record ID');
}

// ---------------------------------------------------------------------------------------------------------------------
// P10  stamps, P11 budgets

function p10(S) {
  const meta = S.db.meta;
  const release = meta.release?.id ?? 'unidentified';
  for (const page of S.pages.values()) {
    const a = page.main.attrs;
    check('P10', page.file, a['data-release'] === release && a['data-snapshot'] === meta.snapshot && a['data-build'] === meta.build, () => `main stamps ${a['data-release']}/${a['data-snapshot']}/${a['data-build']}, database ${release}/${meta.snapshot}/${meta.build}`);
    const gen = page.q1('meta[name=generator]')?.attrs.content ?? '';
    check('P10', page.file, gen.includes(`release ${release}`) && gen.includes(`snapshot ${meta.snapshot}`) && gen.includes(`build ${meta.build}`), `generator "${gen}"`);
    const fine = page.q1('p.foot-fine');
    check('P10', page.file, !!fine && fine.attrs['data-release'] === release && textOf(query1(fine, 'span.mono')) === release && textOf(query1(fine, 'time')) === String(meta.build), () => `footer stamp "${fine ? textOf(fine).slice(0, 80) : 'none'}"`);
  }
  check('P10', 'manifest', S.manifest.release === release && S.manifest.snapshot === meta.snapshot && S.manifest.build === meta.build, `manifest ${S.manifest.release}/${S.manifest.snapshot}/${S.manifest.build}, ${REBUILD}`);
}

function p11(S) {
  let total = 0;
  for (const [path, buf] of S.disk) {
    total += buf.length;
    const budget = path.endsWith('/assets/pages.css') ? PAGE_BUDGET.css : path.endsWith('/assets/page.js') ? PAGE_BUDGET.script : path.endsWith('-records.html') ? PAGE_BUDGET.records : path.endsWith('.html') ? PAGE_BUDGET.main : null;
    if (!budget) continue;
    check('P11', path, buf.length <= budget.raw, () => `${(buf.length / 1024).toFixed(0)} KB raw, budget ${(budget.raw / 1024).toFixed(0)} KB`);
    if (budget.gzip) {
      const z = gzipSync(buf, { level: 9 }).length;
      check('P11', path, z <= budget.gzip, () => `${(z / 1024).toFixed(0)} KB gzipped, budget ${(budget.gzip / 1024).toFixed(0)} KB`);
    }
  }
  const js = S.disk.get(`${PAGES_DIR}/assets/page.js`);
  check('P11', 'page.js', !!js && js.length <= PAGE_BUDGET.script.raw, 'the script is over its budget');
  check('P11', 'the set', total <= PAGE_BUDGET.set.raw, () => `${(total / 1024 / 1024).toFixed(1)} MB, budget ${(PAGE_BUDGET.set.raw / 1024 / 1024).toFixed(0)} MB`);
}

// ---------------------------------------------------------------------------------------------------------------------
// P12  written summaries

function p12(S) {
  for (const m of S.listed.filter((x) => x.written)) check('P12', m.id, S.withPage.includes(m), 'a written summary on a material with no page');
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const page = S.pages.get(`${m.id}.html`);
    if (!page) continue;
    const who = m.id;
    const sec = page.q1('section[data-section=in-short]');
    if (!check('P12', who, !!sec, 'no In short section')) continue;
    const w = m.written;
    if (!w?.parts?.length) {
      check('P12', who, sec.attrs['data-empty'] === 'true' && !!query1(sec, 'p.empty') && !query1(sec, '.byline') && !query1(sec, 'span.filled'), 'a material with no summary says so and shows no byline');
      continue;
    }
    check('P12', who, sec.attrs['data-empty'] === 'false' && !query1(sec, 'p.empty'), 'a summary is shown as one');
    const by = query1(sec, 'p.byline');
    check('P12', who, !!by && by.attrs['data-written-status'] === w.status, () => `byline status ${by?.attrs['data-written-status']}, written ${w.status}`);
    if (by) {
      const t = textOf(by);
      check('P12', who, t.includes(w.by) && t.includes(String(w.on)) && t.includes(SUMMARY_STATUS[w.status] ?? w.status), () => `byline "${t}"`);
    }
    const fields = w.parts.filter((p) => p.field);
    const spans = query(sec, 'span.filled');
    check('P12', who, spans.length === fields.length, `${spans.length} filled numbers, ${fields.length} in the summary`);
    spans.forEach((s, i) => {
      const p = fields[i];
      if (!p) return;
      check('P12', `${who} ${p.field}`, s.attrs['data-field'] === p.field && s.attrs['data-value'] === String(p.value), () => `${s.attrs['data-field']} ${s.attrs['data-value']}, compiled ${p.field} ${p.value}`);
      const sign = typeof p.bound === 'string' ? `${p.bound} ` : p.bound?.sign ? `${p.bound.sign} ` : '';
      check('P12', `${who} ${p.field}`, textOf(s) === `${sign}${fmtNumber(p.value)}${p.unit ? ` ${p.unit}` : ''}`, () => `shows "${textOf(s)}", value ${p.value}`);
      // The number is the data's: a statistic of a key property's compiled spread, or a count of records.
      const [key, stat] = p.field.split('.');
      const sum = m.summary?.[key];
      if (stat && sum && ['median', 'min', 'max', 'q1', 'q3', 'n'].includes(stat) && sum[stat] != null) check('P12', `${who} ${p.field}`, sum[stat] === p.value, () => `compiled ${sum[stat]}, summary ${p.value}`);
      const id = identity(m, c);
      const counts = { products: id.products, makers: id.makers, values: c.summary.numericMeasurements, profiles: c.profiles.length };
      if (p.field in counts) check('P12', `${who} ${p.field}`, counts[p.field] === p.value, () => `count ${counts[p.field]}, summary ${p.value}`);
    });
    check('P12', who, !/[{}]/.test(textOf(query1(sec, '.summary') ?? { kids: [] })), 'a placeholder left in the text');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P13  the drawer's link to the page

function p13(S) {
  const db = S.db;
  const group = (rows) => { const g = new Map(); for (const r of rows) { if (!g.has(r.materialId)) g.set(r.materialId, []); g.get(r.materialId).push(r); } return g; };
  const ctx = { measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage) };
  for (const m of db.materials) {
    const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (s) => (['#drawer-close', '#drawer-pin'].includes(s) ? { addEventListener() {} } : null) };
    renderDrawer(host, { db, selectedMaterialId: m.id, drawerTab: 'Overview', selection: { evaluations: [] }, scenario: { shortlist: [], unknownPolicy: 'strict' }, ctx, highlightMeasurement: null, highlightSource: null }, {});
    const page = pageOf(m, ctx.measurementsByMaterial.get(m.id) ?? []);
    const links = [...host.innerHTML.matchAll(/<a\b[^>]*\bpage-link\b[^>]*>/g)].map((x) => x[0]);
    check('P13', m.id, host.innerHTML.length > 500, 'the drawer rendered nothing');
    if (page) {
      check('P13', m.id, links.length === 1 && links[0].includes(`href="${page}"`) && links[0].includes('target="_blank"') && links[0].includes('rel="noopener"') && /class="btn btn-sm page-link"/.test(links[0]), () => `drawer links ${links.join(' ') || 'none'}, page ${page}`);
      check('P13', m.id, S.disk.has(`${PAGES_DIR}/${m.id}.html`) && page === `${PAGES_DIR}/${m.id}.html`, 'the drawer links to a page that is not there');
    } else check('P13', m.id, !links.length && !host.innerHTML.includes('materials/'), () => `a page link on a material with no page: ${links.join(' ')}`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P14  a fresh render, the fonts, the licences, the manifest

function p14(S) {
  const { db } = S;
  check('P14', 'db.json', sha256(S.dbText) === S.manifest.outputs['db.json'], `dist/db.json does not match the manifest: ${REBUILD}`);
  const fresh = renderSite(db, pageEnv(db, { assets: readAssets(root), selectorFile: S.selectorFile }));
  const files = new Map(fresh.files);
  check('P14', 'files', sameList(sorted([...files.keys()]), sorted([...S.disk.keys()])), () => `a fresh render has ${files.size} files, dist/materials/ ${S.disk.size}: ${REBUILD}`);
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
  check('P14', 'pages.css', !/@import|https?:\/\//.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'the stylesheet loads something from outside');
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
  if (!check('IX', 'index.html', !!page && page.kind === 'index', 'no index page')) return;
  const rowsById = new Map();
  for (const r of page.q('tr[data-material]')) {
    const id = r.attrs['data-material'];
    check('IX', id, !rowsById.has(id), 'listed twice');
    rowsById.set(id, r);
  }
  check('IX', 'rows', sameList(sorted([...rowsById.keys()]), sorted(S.listed.map((m) => m.id))), () => `${rowsById.size} rows for ${S.listed.length} materials`);
  const sectionOf = (r) => { for (let n = r; n; n = n.parent) if (n.attrs['data-section'] === 'family') return n.attrs['data-family']; return null; };
  for (const m of S.listed) {
    const r = rowsById.get(m.id);
    if (!r) continue;
    const ms = S.ix.measurementsByMaterial.get(m.id) ?? [];
    const f = pageFacts(m, ms);
    const href = pageOf(m, ms) ? `${m.id}.html` : null;
    check('IX', m.id, r.attrs['data-page'] === (href ?? undefined), () => `data-page "${r.attrs['data-page']}", rule gives ${href}`);
    check('IX', m.id, num(r.attrs['data-products']) === f.products && num(r.attrs['data-values']) === f.values, () => `numbers ${r.attrs['data-products']}/${r.attrs['data-values']}, rule counts ${f.products}/${f.values}`);
    const cells = query(r, 'td.num').map((td) => textOf(td));
    check('IX', m.id, cells[0] === f.products.toLocaleString('en-CA') && cells[1] === f.values.toLocaleString('en-CA'), () => `cells ${cells.join('/')}, rule counts ${f.products}/${f.values}`);
    const links = query(r, 'th a[href]').map((a) => a.attrs.href);
    check('IX', m.id, href ? sameList(links, [href]) : !links.length, () => `links ${links.join(' ') || 'none'}, expected ${href ?? 'none'}`);
    const why = query1(r, '.ix-why');
    if (href) check('IX', m.id, !why, 'a page, but "No page" is said');
    else {
      const short = shortOf(m, ms);
      check('IX', m.id, !!why && textOf(why) === `No page: ${short}; a page needs ${pageRuleWords()}.`, () => `reason "${why ? textOf(why) : 'none'}", rule says "${short}"`);
      check('IX', m.id, (f.products < PAGE_RULE.minProducts) || (f.values < PAGE_RULE.minValues), 'no page, though the rule is met');
    }
    check('IX', m.id, sectionOf(r) === (stated(m.family) ? m.family : 'Other'), () => `under family "${sectionOf(r)}", material's is "${m.family}"`);
    check('IX', m.id, textOf(query1(r, 'th')).includes(m.name), 'the row does not name the material');
  }
  // Polymer groups: a heading row before each polymer's materials where the family has more than one.
  for (const table of page.q('table.ix')) {
    const body = query1(table, 'tbody');
    let current = null;
    const groups = query(body, 'tr.group').length;
    for (const r of query(body, 'tr')) {
      if (hasClass(r, 'group')) { current = r.attrs['data-polymer']; continue; }
      const m = S.listed.find((x) => x.id === r.attrs['data-material']);
      if (m && groups) check('IX', m.id, current === (stated(m.basePolymer) ? m.basePolymer : 'Polymer not stated'), () => `under polymer "${current}", material's is "${m.basePolymer}"`);
    }
  }
  const withPage = S.withPage.length;
  const counts = Object.fromEntries(page.q('dl.mast-counts dd[data-count]').map((d) => [d.attrs['data-count'], num(d.attrs['data-n'])]));
  check('IX', 'counts', counts.pages === withPage && counts.materials === S.listed.length, () => `index counts ${JSON.stringify(counts)}, rule ${withPage} of ${S.listed.length}`);
  // Names that are not materials, with the materials they stand for.
  const names = new Map(page.q('.ix-names li[data-name]').map((li) => [li.attrs['data-name'], li]));
  const entries = S.db.materials.filter((m) => m.familyEntry);
  check('IX', 'names', sameList(sorted([...names.keys()]), sorted(entries.map((e) => e.id))), () => `${names.size} names listed, ${entries.length} group names and aliases in the database`);
  for (const e of entries) {
    const li = names.get(e.id);
    if (!li) continue;
    const t = textOf(li);
    check('IX', e.id, t.startsWith(`${e.name}:`) && e.familyEntry.members.every((x) => t.includes(x.name)), () => `name line "${t.slice(0, 100)}"`);
    const linked = query(li, 'a[href]').map((a) => a.attrs.href);
    const want = e.familyEntry.members.filter((x) => S.withPage.some((m) => m.id === x.id)).map((x) => `${x.id}.html`);
    check('IX', e.id, sameList(sorted(linked), sorted(want)), () => `members linked ${linked.join(' ') || 'none'}, with a page ${want.join(' ') || 'none'}`);
    check('IX', e.id, sectionOf(li) === (stated(e.family) ? e.family : 'Other'), 'a name under another family');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// CNT  the counts of one section against another's (docs/audits/2026-10-16-material-pages-round/page-counts.mjs, folded in)

const plainText = (html) => html.replace(/<[^>]+>/g, '').replace(/&#39;/g, '\'').replace(/&amp;/g, '&').replace(/\u2060/g, '');
const sectionHtml = (html, id) => (new RegExp(`<section class="sec" id="${id}"[\\s\\S]*?(?=<section class="sec|</main>)`).exec(html) ?? [''])[0];

function cnt(S) {
  for (const m of S.withPage) {
    const c = S.contexts.get(m.id);
    const id = m.id;
    const page = S.pages.get(`${id}.html`)?.html;
    const records = S.pages.get(`${id}-records.html`)?.html;
    if (!page || !records) continue;
    const ck = (what, ok, detail) => check('CNT', `${id} ${what}`, ok, detail);

    // Drying: the parts add up to the whole, and the sentence says the whole.
    const dry = /data-drying-have="(\d+)" data-drying-own="(\d+)" data-drying-twin="(\d+)" data-drying-guide="(\d+)" data-products="(\d+)"/.exec(page);
    if (dry) {
      const [have, own, twin, guide, products] = dry.slice(1).map(Number);
      ck('drying', own + twin + guide === have && have <= products, `${own} + ${twin} + ${guide} against ${have} of ${products}`);
      const said = /(\d+) of (\d+) products? ha(?:s|ve) drying advice/.exec(plainText(sectionHtml(page, 'printing')));
      if (have) ck('drying sentence', said && num(said[1]) === have && num(said[2]) === products, `says ${said?.[0]}, counted ${have} of ${products}`);
    }

    // Measurement records: Sources, the records page and the closing link count them alike.
    const inv = /data-count="measurements" data-n="(\d+)"/.exec(sectionHtml(page, 'sources'));
    ck('measurements', inv && Number(inv[1]) === c.ms.length, `Sources ${inv?.[1]}, records ${c.ms.length}`);
    const withNumber = /measurement records, ([\d,]+) with a number/.exec(plainText(sectionHtml(page, 'sources')));
    ck('measurements with a number', withNumber && num(withNumber[1]) === c.summary.numericMeasurements, `Sources ${withNumber?.[1]}, compiled ${c.summary.numericMeasurements}`);
    const rec = /data-count="measurements" data-n="(\d+)"/.exec(records);
    ck('records page measurements', rec && Number(rec[1]) === c.ms.length, `records page ${rec?.[1]}, records ${c.ms.length}`);
    const link = /Every record behind this page: ([\d,]+) measurements?/.exec(plainText(page));
    ck('closing link', link && num(link[1]) === c.ms.length, `link ${link?.[1]}, records ${c.ms.length}`);

    // Chamber: the finding's count and the panel's.
    const printing = sectionHtml(page, 'printing');
    const chamberSaid = /The (\d+) whose sheets give a chamber temperature/.exec(plainText(printing)) ?? (/The one whose sheet gives a chamber temperature/.test(plainText(printing)) ? [null, '1'] : null);
    const chamberPanel = /class="pw" data-setting="chamber" data-n="(\d+)"/.exec(printing);
    if (chamberSaid && chamberPanel) ck('chamber', num(chamberSaid[1]) === Number(chamberPanel[1]), `finding ${chamberSaid[1]}, figure ${chamberPanel[1]}`);

    // Nozzle and bed: the first screen's count and the panel's.
    for (const axis of ['nozzle', 'bed']) {
      const first = new RegExp(`data-key="${axis}"[\\s\\S]*?<small>(?:most of|all) (\\d+) products accept</small>`).exec(page);
      const panel = new RegExp(`class="pw" data-setting="${axis}" data-n="(\\d+)"`).exec(printing);
      if (first && panel) ck(`${axis} window`, Number(first[1]) === Number(panel[1]), `first screen ${first[1]}, figure ${panel[1]}`);
    }

    // Density: Physical's median count and At a glance's.
    const glanceDensity = /data-kf="density" data-median="[^"]*" data-min="[^"]*" data-max="[^"]*" data-n="(\d+)"/.exec(page);
    const physical = /Density is typically .+? kg\/m³, the median of (\d+) products/.exec(plainText(sectionHtml(page, 'physical')));
    if (glanceDensity && physical) ck('density', Number(glanceDensity[1]) === Number(physical[1]), `At a glance ${glanceDensity[1]}, Physical ${physical[1]}`);

    // Impact: each row's compared count and At a glance's.
    for (const key of ['charpyNotched', 'izodNotched']) {
      const row = new RegExp(`data-headline="${key}"[\\s\\S]*?<small>(\\d+) shown, (\\d+) compared</small>`).exec(sectionHtml(page, 'mechanical'));
      const glance = new RegExp(`data-kf="${key}" data-median="[^"]*" data-min="[^"]*" data-max="[^"]*" data-n="(\\d+)"`).exec(page);
      if (row && glance) ck(key, Number(row[2]) === Number(glance[1]), `figure ${row[2]} compared, At a glance ${glance[1]}`);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The tests: each invariant is run once, over every page, and reported with the first twenty failures

const INVARIANTS = { P1: p1, P2: p2, P3: p3, P4: p4, P5: p5, P6: p6, P7: p7, P8: p8, P9: p9, P10: p10, P11: p11, P12: p12, P13: p13, P14: p14, IX: ix, CNT: cnt };
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

after(() => {
  if (ANALYSED) console.log(`pages:check  checks per invariant: ${Object.entries(CHECKED).map(([k, v]) => `${k} ${v}`).join(', ')}`);
});

test('dist/materials/ is built, and is the database\'s', () => {
  const S = load();
  assert.ok(S.withPage.length >= 1, 'no material has a page');
  assert.equal(S.disk.size, S.withPage.length * 2 + 5, `dist/materials/ holds ${S.disk.size} files: ${REBUILD}`);
});
test('P1  the files, the markup and the sections present', () => report('P1'));
test('P2  the masthead\'s, Sources\' and the records page\'s counts', () => report('P2'));
test('P3  key figures are the compiled medians, ranges and counts', () => report('P3'));
test('P4  rank tracks are the material\'s place among every material\'s median', () => report('P4'));
test('P5  comparison marks, counted lines and why a record is not drawn', () => report('P5'));
test('P6  print windows, drying, the guide and the H2C\'s limit', () => report('P6'));
test('P7  external links are the cited documents\' URLs', () => report('P7'));
test('P8  internal links resolve, and the selector link opens the material', () => report('P8'));
test('P9  no record IDs and no project coinages in the reader\'s text', () => report('P9'));
test('P10 the stamps are the database\'s', () => report('P10'));
test('P11 every file is within its budget', () => report('P11'));
test('P12 the written summaries', () => report('P12'));
test('P13 the drawer links to a page exactly where there is one', () => report('P13'));
test('P14 a fresh render equals dist/materials/, fonts and licences, the manifest', () => report('P14'));
test('IX  the index lists every material and every group name', () => report('IX'));
test('CNT the counts of one section agree with another\'s', () => report('CNT'));
