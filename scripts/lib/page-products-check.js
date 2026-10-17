// The Products page check of the material pages (the pages reimagined, 2026-10-17). scripts/ui-probe.mjs reads this file
// and evaluates it inside a material's Products page (Runtime.evaluate, awaited); it is not a module and is not run by
// Node. It drives the page's two controls as a reader does and holds what it shows to the rows themselves:
//   - the search: each query lists exactly the products whose name or maker (data-q) holds every word, in the order the
//     list had, and the count says how many are listed; a query that matches none says so;
//   - the sort, by every choice it offers: no product is hidden; sorted by a column, the products whose value there is
//     compared (data-g "c") come first, then those shown as published (data-g "o"), then those that publish none, each
//     group in the column's one direction (pl-words dir: a property high first, price and the print settings low first),
//     a value with no number last in its group; by name, A to Z; most documented, the page's own order;
//   - a product's address (#G…) opens its card.
// It returns { products, sorts, queries, checks, failures, first }, failures a count and first the first three.
(async () => {
  const doc = document;
  const pl = doc.querySelector('[data-products]');
  const find = doc.querySelector('[data-find]');
  const sel = doc.querySelector('[data-sortby]');
  const counter = doc.querySelector('[data-count]');
  if (!pl || !find || !sel || !counter) return { error: `the list or its controls are missing (${[!pl && 'list', !find && 'search', !sel && 'sort', !counter && 'count'].filter(Boolean).join(', ')})` };
  let words = { dir: {} };
  try { words = JSON.parse(doc.getElementById('pl-words').textContent); } catch (e) { /* the defaults */ }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rows = () => [...pl.querySelectorAll('details[data-grade]')];
  const shown = () => rows().filter((r) => !r.hidden && r.getClientRects().length > 0);
  const ids = (list) => list.map((r) => r.getAttribute('data-grade'));
  const nameOf = (r) => (r.querySelector('summary .pn-t') ?? r.querySelector('summary'))?.textContent.trim().toLowerCase() ?? '';
  const first = rows();
  const original = ids(first);
  const all = first.length;
  const failures = [];
  let checks = 0;
  const expect = (ok, what) => { checks++; if (!ok) failures.push(what); };
  const countOf = () => Number((/[\d,]+/.exec(counter.textContent) ?? ['NaN'])[0].replace(/,/g, ''));

  // The search: a maker's word, a product's word, two words, and one that matches nothing.
  const qs = first.map((r) => r.getAttribute('data-q') || '');
  const tokens = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
  const pickWord = (i, j) => tokens(qs[Math.min(i, qs.length - 1)] ?? '').filter((w) => w.length > 2)[j] ?? null;
  const queries = ['', pickWord(0, 0), pickWord(Math.floor(all / 2), 1), [pickWord(all - 1, 0), pickWord(all - 1, 1)].filter(Boolean).join(' '), 'zzz-none'].filter((q, i, a) => q != null && a.indexOf(q) === i);
  const search = async (q) => { find.value = q; find.dispatchEvent(new Event('input', { bubbles: true })); await wait(220); };
  for (const q of queries) {
    await search(q);
    const want = ids(rows().filter((r) => { const t = r.getAttribute('data-q') || ''; return tokens(q).every((w) => t.includes(w)); }));
    const got = ids(shown());
    expect(got.length === want.length && got.every((id, i) => id === want[i]), { q, problem: 'listed', want: want.slice(0, 3), got: got.slice(0, 3), wantN: want.length, gotN: got.length });
    expect(countOf() === got.length || (!tokens(q).length && countOf() === all), { q, problem: 'count', said: counter.textContent.trim(), listed: got.length });
    const none = doc.querySelector('[data-none]');
    expect(!!none && none.hidden === got.length > 0, { q, problem: 'the no-match line', shown: none ? !none.hidden : 'absent', listed: got.length });
  }
  await search('');

  // The sort, by every choice it offers.
  const options = [...sel.options].map((o) => o.value);
  for (const k of options) {
    sel.value = k;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(30);
    const list = shown();
    expect(list.length === all, { k, problem: 'sorting hid a product', listed: list.length, of: all });
    if (k === 'docs') { expect(ids(list).every((id, i) => id === original[i]), { k, problem: 'most documented is not the page\'s own order' }); continue; }
    if (k === 'name') {
      const names = list.map(nameOf);
      const at = names.findIndex((n, i) => i > 0 && names[i - 1].localeCompare(n) > 0 && names[i - 1] > n);
      expect(at < 0, { k, problem: 'not A to Z', at, a: names[at - 1], b: names[at] });
      continue;
    }
    const desc = words.dir?.[k] === 'desc';
    // An Izod value in the Charpy column (data-izod) is a group of its own after the Charpy ones shown as published (D145).
    const cells = list.map((r) => { const c = r.querySelector(`summary [data-k="${CSS.escape(k)}"]`); const g = c?.getAttribute('data-g'); const v = c?.getAttribute('data-v'); return { id: r.getAttribute('data-grade'), g: g === 'c' ? 0 : g === 'o' ? (c.hasAttribute('data-izod') ? 1.5 : 1) : 2, v: v == null || v === '' ? null : Number(v) }; });
    const back = cells.findIndex((x, i) => i > 0 && x.g < cells[i - 1].g);
    expect(back < 0, { k, problem: 'a group out of place (compared, then as published, then none)', at: back, before: cells[back - 1], after: cells[back] });
    for (const g of [0, 1, 1.5]) {
      const vs = cells.filter((x) => x.g === g);
      const bad = vs.findIndex((x, i) => i > 0 && (vs[i - 1].v === null ? x.v !== null : x.v !== null && (desc ? x.v > vs[i - 1].v : x.v < vs[i - 1].v)));
      expect(bad < 0, { k, group: g === 1.5 ? 'Izod' : g ? 'as published' : 'compared', problem: `not ${desc ? 'high' : 'low'} first`, at: bad, a: vs[bad - 1], b: vs[bad] });
    }
  }
  // Sorted and searched at once: the search narrows, the groups keep their order.
  if (options.length > 2) {
    const k = options[2];
    sel.value = k; sel.dispatchEvent(new Event('change', { bubbles: true }));
    const q = queries[1] ?? '';
    await search(q);
    const got = shown();
    const g = got.map((r) => { const e = r.querySelector(`summary [data-k="${CSS.escape(k)}"]`); const c = e?.getAttribute('data-g'); return c === 'c' ? 0 : c === 'o' ? (e.hasAttribute('data-izod') ? 1.5 : 1) : 2; });
    expect(g.every((x, i) => !i || x >= g[i - 1]) && countOf() === got.length, { k, q, problem: 'sorted and searched, the groups or the count are wrong' });
    await search('');
  }
  sel.value = 'docs'; sel.dispatchEvent(new Event('change', { bubbles: true }));

  // A product's address opens its card: the last product's, closed first where the page opens every card.
  const target = rows().at(-1);
  if (target) {
    const id = target.getAttribute('data-grade');
    target.open = false;
    history.replaceState(null, '', location.pathname);
    location.hash = id;
    await wait(250);
    const r = target.getBoundingClientRect();
    expect(target.open && r.top >= 0 && r.top < innerHeight / 2, { problem: `#${id} did not open its card near the top`, open: target.open, top: Math.round(r.top) });
    history.replaceState(null, '', location.pathname);
    window.scrollTo(0, 0);
  }
  return { products: all, sorts: options.length, queries, checks, failures: failures.length, first: failures.slice(0, 3) };
})()
