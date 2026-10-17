// Sorts the Products table by every sortable column, both ways, and after each sort searches and toggles; asserts that
// the products listed are exactly those whose names match (or that carry the toggle's flag), the first 25 of them in the
// current order until "Show all", every one after it; that the count says how many match; and that every row is in the
// column's order (blanks last). Run in a page (Runtime.evaluate) on a material page with a Products table; it returns a
// summary with the failures. The table shows a value per cell index; each sortable heading names its index (data-i).
(async () => {
  const table = document.querySelector('table[data-products]');
  const sec = table.closest('section');
  const find = sec.querySelector('[data-find]');
  const toggles = [...sec.querySelectorAll('[data-t]')];
  const shown = sec.querySelector('[data-shown]');
  const more = sec.querySelector('[data-more]');
  const CAP = 25;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const label = (b) => b.rows[0].querySelector('.px');
  const nameOf = (b) => `${label(b).querySelector('.pn').textContent} ${label(b).getAttribute('title') || ''}`.toLowerCase();
  const val = (b, i, num) => {
    const c = b.rows[0].cells[i];
    if (!num) return nameOf(b);
    let v = c.getAttribute('data-v');
    if (v == null) { const m = /(\d+(?:\.\d+)?)(?!.*\d)/.exec(c.textContent.replace(/,/g, '')); v = m ? m[1] : ''; }
    return v === '' ? null : Number(v);
  };
  const listed = () => [...table.tBodies].filter((b) => !b.hidden && getComputedStyle(b).display !== 'none');
  const names = [...table.tBodies].map(nameOf);
  const words = [...new Set(names.flatMap((n) => n.split(/\s+/)).filter((w) => w.length > 3))];
  const queries = ['', words[0], words[3], words[7], (names[5] ?? names[0]).split(' ').slice(0, 3).join(' '), 'zzz-none'].filter((q) => q != null);
  const failures = [];
  let checks = 0;
  const expectListed = (want, tag) => {
    // The matching products, in table order: the first 25 listed until "Show all", all of them after it.
    const order = [...table.tBodies].filter((b) => want.includes(b));
    const expanded = more && /first/.test(more.textContent);
    const expect = expanded ? order : order.slice(0, CAP);
    const got = listed();
    checks++;
    if (expect.length !== got.length || expect.some((b, k) => b !== got[k])) failures.push({ ...tag, problem: 'listed', want: expect.slice(0, 3).map(nameOf), got: got.slice(0, 3).map(nameOf), wantN: expect.length, gotN: got.length });
    if (!shown.textContent.includes(want.length === table.tBodies.length ? String(want.length) : `Showing ${want.length.toLocaleString('en-CA')} of`)) failures.push({ ...tag, problem: 'count', shown: shown.textContent, want: want.length });
    const moreShown = more && !more.parentNode.hidden;
    if (!!moreShown !== want.length > CAP) failures.push({ ...tag, problem: '"Show all" shown wrongly', want: want.length });
  };
  const heads = [...table.querySelectorAll('thead tr:not(.pt-p) th[data-i]')].filter((th) => th.querySelector('button'));
  for (const th of heads) {
    const btn = th.querySelector('button'), i = Number(th.dataset.i), num = btn.dataset.sort === 'num';
    for (const pass of [1, 2]) {
      btn.click();
      const dir = th.getAttribute('aria-sort') === 'ascending' ? 1 : -1;
      const vs = [...table.tBodies].map((b) => val(b, i, num));
      checks++;
      for (let k = 1; k < vs.length; k++) {
        const a = vs[k - 1], b = vs[k];
        if (a === null && b !== null) { failures.push({ i, dir, problem: 'blank before a value', at: k }); break; }
        if (a !== null && b !== null && (a < b ? -1 : a > b ? 1 : 0) * dir > 0) { failures.push({ i, dir, problem: 'out of order', at: k, a, b }); break; }
      }
      for (const expand of [false, true]) {
        if (more && /first/.test(more.textContent) !== expand && !more.parentNode.hidden) more.click();
        for (const q of queries) {
          find.value = q; find.dispatchEvent(new Event('input')); await wait(100);
          if (more && /first/.test(more.textContent) !== expand && !more.parentNode.hidden) more.click();
          const ts = q.toLowerCase().split(/\s+/).filter(Boolean);
          expectListed([...table.tBodies].filter((b) => ts.every((t) => nameOf(b).includes(t))), { i, dir, q, expand });
        }
        find.value = ''; find.dispatchEvent(new Event('input')); await wait(100);
        for (const t of toggles) {
          t.click();
          expectListed([...table.tBodies].filter((b) => b.hasAttribute('data-' + t.dataset.t)), { i, dir, toggle: t.dataset.t, expand });
          t.click();
        }
      }
      if (more && /first/.test(more.textContent)) more.click();
    }
  }
  return { products: names.length, sortable: heads.length, queries, checks, failures: failures.length, first: failures.slice(0, 3) };
})()
