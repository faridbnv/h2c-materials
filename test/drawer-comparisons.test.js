// Every comparison the drawer draws (drawer_comparisons.csv, D133, D139), read off the rendered page of every material and
// held against what the build says: impact (Charpy beside Izod), tensile XY beside Z, and the two heat deflection loads
// beside the glass transition. A heading must be the material's spread exactly (build/src/products.js, summarise), each dot
// a product's own value, each record saying where it sits, the counted line adding up to the lists under it, and the reason
// a record is not drawn the build's own (assess). impact-compare.test.js keeps the spot checks on the impact heading.
//
// Rendering is the cost (verify:fast has a budget), so each material's Mechanical and Thermal tab is rendered once, here,
// and every test reads that copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDrawer, notDrawnWhy } from '../app/js/ui/detail.js';
import { assess, ASSESS_ORDER } from '../build/src/products.js';
import { useRegistry, propertiesInDomain, propertyApplies } from '../app/js/ui/registry.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
useRegistry(db.registry);
const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
const ctx = { measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage) };
const gradeById = new Map(db.grades.map((g) => [g.id, g]));
const msById = new Map(db.measurements.map((x) => [x.id, x]));
const HEADLINES = db.registry.headlines;
const TABS = ['Mechanical', 'Thermal'];
const WJ = '⁠'; // the word joiner the page puts round the dash of a range

const rendered = new Map();
function render(materialId, tab) {
  const key = `${materialId}:${tab}`;
  if (!rendered.has(key)) {
    const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (s) => ['#drawer-close', '#drawer-pin'].includes(s) ? { addEventListener() {} } : null };
    renderDrawer(host, { db, selectedMaterialId: materialId, drawerTab: tab, selection: { evaluations: [] }, scenario: { shortlist: [], unknownPolicy: 'strict' }, ctx }, {});
    rendered.set(key, host.innerHTML);
  }
  return rendered.get(key);
}

const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const text = (html) => html.replace(/<[^>]+>/g, '');
const lower = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
const pct = (r) => `${Math.round(r * 100)} %`;

/** A comparison's heading in a tab's html: its closed <details> up to the matching close, or null. */
function headingOf(html, name) {
  const open = new RegExp(`<details class="prop-block imp-block"[^>]*>\\s*<summary><span class="maker-name">${reEscape(name)}</span>`).exec(html);
  if (!open) return null;
  assert.equal(html.split(`<span class="maker-name">${name}</span>`).length - 1, 1, `${name}: one heading`);
  let depth = 0;
  for (const t of html.slice(open.index).matchAll(/<details\b|<\/details>/g)) {
    depth += t[0] === '</details>' ? -1 : 1;
    if (!depth) return html.slice(open.index, open.index + t.index + t[0].length);
  }
  throw new Error(`${name}: the heading never closes`);
}

/** The products a spread counts for one headline, as the drawer reads them (detail.js spreadEntries): each with whether
 *  it is a special formulation. */
function entriesOf(m, key) {
  const products = (m.gradeIds ?? []).map((id) => gradeById.get(id)).filter((g) => g && !g.retired);
  const variantOnly = products.length > 0 && products.every((g) => g.variant);
  return products.filter((g) => g.headline?.[key]).map((g) => {
    const v = g.headline[key];
    return { g, v, variant: !variantOnly && (!!g.variant || (v.from?.origin === 'twin' && !!gradeById.get(v.from.gradeId)?.variant)) };
  });
}

/** Each drawn comparison of each material, with what the build says it holds and what the page printed:
 *  { m, tab, cmp, hs, entries, units, section, prefix, records, dots, named }. */
let collected = null;
function headings() {
  if (collected) return collected;
  collected = [];
  for (const m of db.materials.filter((x) => !x.familyEntry)) {
    for (const tab of TABS) {
      const html = render(m.id, tab);
      const inTab = new Set(propertiesInDomain(tab === 'Mechanical' ? 'mechanical' : 'thermal').filter((p) => propertyApplies(p, m) && !db.registry.properties.find((x) => x.name === p)?.replacedBy));
      for (const cmp of db.registry.comparisons) {
        const heading = headingOf(html, cmp.name);
        if (!heading) continue;
        const hs = HEADLINES.filter((h) => h.drawerComparison === cmp.name && !m.headline?.[h.key]?.notApplicable && h.valueProperties.some((p) => inTab.has(p)));
        const entries = new Map(hs.map((h) => [h.key, entriesOf(m, h.key)]));
        const at = heading.indexOf('<div class="imp-records">');
        const prefix = heading.slice(0, at), records = heading.slice(at);
        const start = prefix.indexOf(`<section class="imp-compare" data-comparison="${cmp.name}">`);
        const section = start < 0 ? '' : prefix.slice(start, prefix.indexOf('</section>', start));
        // The dots of each row, in the page's order, and the values the page names in a sentence instead of a graph.
        const dots = new Map([...section.matchAll(/<div class="imp-row" data-headline="([^"]+)">[\s\S]*?<\/div>/g)].map((r) => [r[1],
          [...r[0].matchAll(/<button type="button" class="imp-dot([^"]*)" data-row="([^"]+)" data-grade="([^"]+)"/g)].map((d) => ({ cls: d[1].split(/\s+/).filter(Boolean), mid: d[2], gid: d[3] }))]));
        const named = [...prefix.matchAll(/<button type="button" class="link-btn" data-row="([^"]+)"/g)].map((d) => d[1]);
        collected.push({ m, tab, cmp, hs, entries, inTab, heading, section, prefix, records, dots, named });
      }
    }
  }
  return collected;
}

/** The graphs the build's spread gives a heading: one per unit, drawn where two or more products have a value. */
function graphsOf(h) {
  return [...new Set(h.hs.map((x) => x.unit))].map((unit) => {
    const rows = h.hs.filter((x) => x.unit === unit && h.entries.get(x.key).length);
    const total = rows.reduce((n, x) => n + h.entries.get(x.key).length, 0);
    return { unit, rows, total, drawn: total > 1 };
  });
}
const label = (h) => `${h.m.id} ${h.tab} "${h.cmp.name}"`;

test('every comparison is drawn on some materials, and only where two of its tests apply', () => {
  const seen = Object.fromEntries(db.registry.comparisons.map((c) => [c.name, 0]));
  for (const h of headings()) {
    seen[h.cmp.name]++;
    assert.ok(h.hs.length >= 2, `${label(h)}: a heading needs two of its tests to apply, ${h.hs.length} do`);
    const properties = new Set(h.hs.flatMap((x) => [...x.valueProperties, ...x.relatedProperties]));
    assert.ok((ctx.measurementsByMaterial.get(h.m.id) ?? []).some((x) => properties.has(x.property) && x.numeric && !x.quarantined), `${label(h)}: a numeric result behind it`);
  }
  for (const [name, n] of Object.entries(seen)) assert.ok(n > 10, `"${name}" is drawn for ${n} materials`);
});

test('the dots are the spread: a dot per product at its own value, a row only with a dot, a graph only with two', () => {
  const seen = { rows: 0, dots: 0, graphs: 0, named: 0, hollow: 0, square: 0 };
  for (const h of headings()) {
    const graphs = graphsOf(h);
    const drawn = graphs.filter((g) => g.drawn);
    assert.equal(h.section.split('<div class="imp-strips">').length - 1, drawn.length, `${label(h)}: a graph per unit with two products' values`);
    assert.equal(h.section !== '', drawn.length > 0, `${label(h)}: the section only with a graph`);
    seen.graphs += drawn.length;
    for (const g of graphs) for (const x of g.rows) {
      const key = x.key, products = h.entries.get(key), dots = h.dots.get(key);
      if (!g.drawn) { assert.ok(!dots, `${label(h)} ${key}: no row on a scale of fewer than two values`); continue; }
      assert.ok(dots, `${label(h)} ${key}: a row, since a product has a value`);
      seen.rows++;
      const s = h.m.summary?.[key];
      assert.equal(dots.length, (s?.n ?? 0) + (s?.asPublished?.n ?? 0) + (s?.variants?.n ?? 0) + (s?.claimed?.setApart ? s.claimed.n : 0), `${label(h)} ${key}: a dot per product the spread counts, those set apart included`);
      assert.equal(dots.length, products.length, `${label(h)} ${key}: a dot per product with a value`);
      for (const d of dots) {
        const gr = gradeById.get(d.gid), v = gr?.headline?.[key];
        assert.ok(gr && gr.materialId === h.m.id, `${label(h)} ${key} ${d.gid}: a product of the material`);
        assert.ok(v, `${label(h)} ${key} ${d.gid}: the product has this value`);
        assert.equal(d.mid, v.measurementId, `${label(h)} ${key} ${d.gid}: its own value`);
        assert.equal(d.cls.includes('annealed'), !!v.anneal, `${label(h)} ${key} ${d.gid}: square only when annealed`);
        assert.equal(d.cls.includes('open'), v.level === 'as-published', `${label(h)} ${key} ${d.gid}: hollow only with no stated orientation or load`);
        seen.dots++;
        if (v.anneal) seen.square++;
        if (v.level === 'as-published') seen.hollow++;
      }
    }
    // Rows with no product are not drawn at all.
    for (const x of h.hs) if (!h.entries.get(x.key).length) assert.ok(!h.dots.has(x.key), `${label(h)} ${x.key}: no row where no product has a value`);
    // A scale with exactly one value is a sentence naming it, with the way to its record.
    const ones = graphs.filter((g) => g.total === 1).map((g) => h.entries.get(g.rows[0].key)[0].v.measurementId);
    assert.deepEqual([...h.named].sort(), [...ones].sort(), `${label(h)}: the lone values are named, each with the way to its record`);
    seen.named += ones.length;
    if (!drawn.length) assert.ok(!h.dots.size, `${label(h)}: no dots without a graph`);
  }
  for (const [k, n] of Object.entries(seen)) assert.ok(n > 0, `some heading shows ${k}`);
});

test('every dot\'s record says where it sits, and the ones "in the median" are the median the table prints', () => {
  let lines = 0, checkedMedians = 0;
  for (const h of headings()) {
    // The "On the graph" lines of the records listed in the heading: { mid, key, text }.
    const found = h.records.split('<div class="evidence-row').slice(1).flatMap((r) => {
      const mid = r.match(/data-mid="([^"]+)"/)[1];
      return [...r.matchAll(/<div class="cond on-graph" data-on-graph="([^"]+)">([\s\S]*?)<\/span><\/div>/g)].map((l) => ({ mid, key: l[1], text: text(l[2]) }));
    });
    // A twin's dot is its sibling's record (D89), so one record can carry a line per product: count per (record, test).
    const want = new Map();
    for (const [key, dots] of h.dots) for (const d of dots) want.set(`${d.mid} ${key}`, (want.get(`${d.mid} ${key}`) ?? 0) + 1);
    const got = new Map();
    for (const l of found) got.set(`${l.mid} ${l.key}`, (got.get(`${l.mid} ${l.key}`) ?? 0) + 1);
    assert.deepEqual([...got].sort(), [...want].sort(), `${label(h)}: a line on the record of each dot, and on no other`);
    lines += found.length;
    for (const l of found) {
      const x = msById.get(l.mid), hd = h.hs.find((y) => y.key === l.key);
      assert.ok(hd && hd.valueProperties.includes(x.property), `${label(h)} ${l.mid}: under a property its test reads`);
    }
    for (const [key, dots] of h.dots) {
      const s = h.m.summary?.[key];
      const inMedian = found.filter((l) => l.key === key && /: in the median\b/.test(l.text)).map((l) => gradeById.get(dots.find((d) => d.mid === l.mid).gid).headline[key].value);
      assert.equal(inMedian.length, s?.n ?? 0, `${label(h)} ${key}: the products in the median`);
      if (s?.n > 1) { // the graph draws a median mark from two products on
        assert.ok(Math.abs(median(inMedian) - s.median) < 1e-6 * Math.max(1, Math.abs(s.median)), `${label(h)} ${key}: median ${median(inMedian)} = ${s.median}`);
        checkedMedians++;
      }
    }
  }
  assert.ok(lines > 500 && checkedMedians > 100, `${lines} lines, ${checkedMedians} medians checked`);
});

test('what is drawn decides itself: a median table only with a median, a key naming only the marks a dot carries', () => {
  const seen = { table: 0, noMedian: 0 };
  for (const h of headings().filter((x) => x.section)) {
    const compared = [...h.dots.keys()].some((k) => h.m.summary?.[k]?.n);
    assert.equal(h.section.includes('class="grid imp-summary"'), compared, `${label(h)}: a median table only with a median`);
    if (compared) seen.table++;
    else {
      seen.noMedian++;
      assert.match(h.section, /No median: none of the (\d+ )?values? drawn (is compared|states )/, `${label(h)}: says why there is no median`);
    }
    assert.equal(h.section.includes('No median:'), !compared, `${label(h)}: the "No median" sentence only without a median`);
    const key = h.section.match(/<p class="imp-key fine">([\s\S]*?)<\/p>/)?.[1];
    assert.ok(key, `${label(h)}: a key`);
    const classes = [...h.dots.values()].flat().map((d) => d.cls);
    // A special formulation is a diamond whatever its orientation, so "no stated orientation" is keyed by a circle only.
    for (const mark of ['open', 'annealed', 'variant', 'claimed']) {
      const carried = classes.some((x) => x.includes(mark) && (mark !== 'open' || !x.includes('variant')));
      assert.equal(key.includes(`class="imp-dot ${mark}"`), carried, `${label(h)}: the key's ${mark} mark`);
    }
  }
  for (const [k, n] of Object.entries(seen)) assert.ok(n > 0, `some heading shows ${k}`);
});

test('why a record is not drawn is the build\'s reason', () => {
  let checked = 0;
  const reasons = new Set();
  for (const h of headings()) {
    const props = new Set(h.hs.flatMap((x) => [...x.valueProperties, ...x.relatedProperties]));
    const ms = ctx.measurementsByMaterial.get(h.m.id) ?? [];
    const records = ms.filter((x) => props.has(x.property) && h.inTab.has(x.property) && !x.quarantined && !(!x.numeric && !x.qualitative && /^not published$/i.test(String(x.dataStatus ?? '').trim())));
    const drawnIds = new Set([...h.dots.values()].flat().map((d) => d.mid)), namedIds = new Set(h.named);
    const c = { ms, gradeById };
    for (const x of records) {
      const reads = h.hs.filter((y) => y.valueProperties.includes(x.property));
      const results = reads.map((y) => assess(x, y, ms.filter((z) => z.gradeId === x.gradeId)));
      const said = notDrawnWhy(x, h.hs, c, drawnIds, namedIds);
      const got = said.split(':')[0] === 'resin' ? 'moulded' : said.split(':')[0];
      if (!reads.length) assert.equal(got, 'property', `${label(h)} ${x.id}: no test of the heading reads ${x.property}`);
      else if (results.some((r) => !r.excluded)) assert.ok(['drawn', 'named', 'second', 'retired', 'reference'].includes(said), `${label(h)} ${x.id}: a test takes it, the drawer says ${said}`);
      else {
        // Refused by every test that reads it: counted by the one it got furthest with.
        const whys = results.map((r) => r.why);
        assert.ok(whys.every((w) => ASSESS_ORDER.includes(w)), `${label(h)} ${x.id}: assess's reasons ${whys} are in ASSESS_ORDER`);
        const expected = whys.reduce((a, b) => (ASSESS_ORDER.indexOf(b) > ASSESS_ORDER.indexOf(a) ? b : a));
        assert.equal(got, expected, `${label(h)} ${x.id}: the build says ${whys.join(' / ')}, the drawer says "${said}"`);
      }
      reasons.add(got);
      checked++;
    }
  }
  assert.ok(checked > 3000, `${checked} records checked`);
  for (const r of ['drawn', 'second', 'unnotched', 'direction', 'property']) assert.ok(reasons.has(r), `some record is counted "${r}"`);
});

test('the counted line adds up to the lists under it', () => {
  let checked = 0;
  for (const h of headings()) {
    const n = h.records.split('<div class="evidence-row').length - 1;
    const props = new Set(h.hs.flatMap((x) => [...x.valueProperties, ...x.relatedProperties]));
    const listed = (ctx.measurementsByMaterial.get(h.m.id) ?? []).filter((x) => props.has(x.property) && h.inTab.has(x.property) && !(!x.numeric && !x.qualitative && /^not published$/i.test(String(x.dataStatus ?? '').trim())));
    assert.equal(n, listed.length, `${label(h)}: every record of its tests is listed`);
    const line = h.prefix.match(/<p class="fine imp-(?:tally|none)">([\s\S]*?)<\/p>/);
    assert.ok(line, `${label(h)}: a counted line`);
    const body = text(line[1]);
    // The parts after the colon each begin with the number of records they count.
    const after = (body.match(/(?:the other \d+|the other results?|results? below|below|other \d+): (.*)$/)?.[1] ?? '').trim();
    const sum = [...after.matchAll(/(?:^|, | and )(\d+) /g)].reduce((a, x) => a + +x[1], 0);
    if (/^Of the (\d+) results below/.test(body)) {
      const said = +body.match(/^Of the (\d+) results below/)[1];
      const drawn = +body.match(/, (\d+) (?:is|are) drawn above/)[1], named = +(body.match(/ and (\d+) named above/)?.[1] ?? 0);
      assert.equal(said, n, `${label(h)}: the line counts every record listed`);
      // A twin's dot is its sibling's record, so the records drawn are the distinct ones.
      assert.equal(drawn, new Set([...h.dots.values()].flat().map((d) => d.mid)).size, `${label(h)}: the drawn count is the records the dots stand for`);
      assert.equal(named, new Set(h.named).size, `${label(h)}: the named count is the lone values' records`);
      assert.equal(drawn + named + sum, n, `${label(h)}: "${body}"`);
      const rest = body.match(/the other (\d+):/)?.[1];
      if (rest) assert.equal(+rest, sum, `${label(h)}: "the other ${rest}" is the sum of its parts`);
    } else if (/^No graph: no product has a value to draw\./.test(body)) {
      assert.equal(h.named.length, 0, `${label(h)}: nothing named`);
      assert.equal(+(body.match(/The (\d+) results below/)?.[1] ?? 1), n, `${label(h)}: the line counts every record listed`);
      assert.equal(sum, n, `${label(h)}: "${body}"`);
    } else {
      // One or several lone values, named: the records left over are "the other N results".
      assert.match(body, /^No graph: /, `${label(h)}: a counted line, got "${body}"`);
      assert.ok(h.named.length > 0, `${label(h)}: a lone value named`);
      const other = /It is the only result below/.test(body) ? 0 : +(body.match(/The other (\d+) results? below/)?.[1] ?? (/The other result below/.test(body) ? 1 : 0));
      assert.equal(other, sum, `${label(h)}: the other records are the sum of the parts in "${body}"`);
      assert.equal(h.named.length + other, n, `${label(h)}: named and the others cover every record listed`);
    }
    checked += n;
  }
  assert.ok(checked > 3000, `${checked} records counted`);
});

test('"both" and the share are the products\' own values', () => {
  const seen = { single: 0, multi: 0, none: 0, share: 0, shareOne: 0 };
  for (const h of headings().filter((x) => x.cmp.pairLabel)) {
    const graphs = graphsOf(h).filter((g) => g.drawn);
    const pairs = graphs.filter((g) => g.rows.length === 2);
    const bothOf = (g) => h.entries.get(g.rows[0].key).filter((e) => h.entries.get(g.rows[1].key).some((y) => y.g.id === e.g.id)).length;
    const lineWith = (re) => [...h.section.matchAll(/<p class="fine imp-foot">([\s\S]*?)<\/p>/g)].map((p) => text(p[1])).find((t) => re.test(t));
    const said = lineWith(new RegExp(`^(${reEscape(h.cmp.pairLabel)}: |No product publishes ${reEscape(lower(h.cmp.pairLabel))})`));
    if (!pairs.length) assert.equal(said, undefined, `${label(h)}: no pair line without a pair of rows`);
    else if (pairs.length === 1 && graphs.length === 1) {
      const n = bothOf(pairs[0]);
      assert.ok(said, `${label(h)}: a pair line`);
      if (n) {
        assert.match(said, new RegExp(`^${reEscape(h.cmp.pairLabel)}: ${n} products? \\(`), `${label(h)}: ${n} products publish both; "${said}"`);
        assert.equal(/ and others\)/.test(said), n > 6, `${label(h)}: "and others" only past six`);
        seen.single++;
      } else { assert.match(said, /^No product publishes /, `${label(h)}: none publishes both; "${said}"`); seen.none++; }
    } else {
      assert.ok(said, `${label(h)}: a pair line`);
      const got = [...said.matchAll(/(none|\d+)(?: products?)? for /g)].map((x) => (x[1] === 'none' ? 0 : +x[1]));
      assert.deepEqual(got, pairs.map(bothOf), `${label(h)}: the products with both, per graph; "${said}"`);
      seen.multi++;
    }

    // The share one orientation gives of the other, product by product (detail.js shareOf): both values compared, neither
    // a special formulation, from one document and property, in one state.
    const shares = pairs.map((g) => {
      const [a, b] = g.rows;
      if (!a.direction || !b.direction || a.direction === b.direction || a.valueProperties.join(';') !== b.valueProperties.join(';')) return null;
      const list = [];
      for (const ea of h.entries.get(a.key)) {
        const eb = h.entries.get(b.key).find((y) => y.g.id === ea.g.id);
        if (!eb || ea.variant || eb.variant || ea.v.level !== 'comparable' || eb.v.level !== 'comparable' || !(ea.v.value > 0)) continue;
        const xa = msById.get(ea.v.measurementId), xb = msById.get(eb.v.measurementId);
        const schedule = (v) => (v.anneal ? `${v.anneal.tempC}:${v.anneal.hours}` : null);
        if (!xa || !xb || xa.property !== xb.property || xa.sourceId !== xb.sourceId || schedule(ea.v) !== schedule(eb.v)) continue;
        list.push(eb.v.value / ea.v.value);
      }
      return list.length ? { g, list } : null;
    }).filter(Boolean);
    const shareLine = lineWith(/ as a share of /);
    if (!shares.length) { assert.equal(shareLine, undefined, `${label(h)}: no share line without a pair of products`); continue; }
    assert.ok(shareLine, `${label(h)}: a share line`);
    const name = (g) => lower(g.rows[0].labels.plain.replace(/\s*\([^)]*\)$/, ''));
    // A share every product gives alike (one product, or several at one rounded per cent) is said once, with its count.
    const items = shares.map(({ g, list }) => (pct(Math.min(...list)) === pct(Math.max(...list)) ? `${name(g)} ${pct(list[0])} (${list.length} product${list.length === 1 ? '' : 's'})`
      : `${name(g)} ${pct(median(list))} (${pct(Math.min(...list))}${WJ}–${WJ}${pct(Math.max(...list))}, ${list.length} products)`));
    const andList = items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
    assert.ok(shareLine.startsWith(`${shares[0].g.rows[1].direction} as a share of ${shares[0].g.rows[0].direction}, `), `${label(h)}: names the two orientations; "${shareLine}"`);
    assert.ok(shareLine.endsWith(`: ${andList}.`), `${label(h)}: the printed share is the products' own; expected "${andList}", got "${shareLine}"`);
    seen.share += shares.length;
    seen.shareOne += shares.filter((s) => s.list.length === 1).length;
  }
  for (const [k, n] of Object.entries(seen)) assert.ok(n > 0, `some heading shows ${k}`);
});

test('an elastomer keeps its glass transition: no heat deflection heading, a block of its own', () => {
  const name = 'Heat deflection and glass transition';
  const elastomers = db.materials.filter((m) => !m.familyEntry && m.family === 'Flexible Elastomers'
    && (ctx.measurementsByMaterial.get(m.id) ?? []).some((x) => x.property === 'Glass transition temperature' && x.numeric && !x.quarantined));
  assert.ok(elastomers.length > 0, 'such an elastomer exists');
  for (const m of elastomers) {
    const html = render(m.id, 'Thermal');
    assert.ok(m.headline?.hdt045?.notApplicable || m.headline?.hdt18?.notApplicable, `${m.id}: heat deflection does not apply to it`);
    assert.ok(!html.includes(`maker-name">${name}<`), `${m.id}: one test is too few for a comparison`);
    assert.ok(html.includes('maker-name">Glass transition temperature<'), `${m.id}: the glass transition is a heading of its own`);
  }
  // Where heat deflection does apply, the glass transition is inside the comparison, not beside it.
  const plastic = headings().find((h) => h.cmp.name === name);
  assert.ok(plastic, 'a material draws the comparison');
  assert.ok(!render(plastic.m.id, 'Thermal').replace(plastic.heading, '').includes('maker-name">Glass transition temperature<'),`${plastic.m.id}: the glass transition block is not repeated outside the comparison`);
});
