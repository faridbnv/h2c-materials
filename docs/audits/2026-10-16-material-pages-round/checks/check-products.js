// Sorts the Products table by every column, both ways, and after each sort searches and toggles; asserts that the rows
// shown are exactly the products whose names match (or that carry the toggle's flag), that the count says so, and that
// the visible rows are in the column's order (blanks last).
(async () => {
  const table = document.querySelector('table[data-products]');
  const sec = table.closest('section');
  const find = sec.querySelector('[data-find]');
  const toggles = [...sec.querySelectorAll('[data-t]')];
  const shown = sec.querySelector('[data-shown]');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const nameOf = (b) => b.rows[0].querySelector('.pn').textContent.toLowerCase();
  const keys = ['name', 'docs', ...[...table.querySelectorAll('thead .pt-c th')].map((th) => th.dataset.k)];
  const val = (b, col, num) => {
    const c = b.rows[0].cells[col];
    if (!num) return nameOf(b);
    let v = c.getAttribute('data-v');
    if (v == null) { const m = /(\d+(?:\.\d+)?)(?!.*\d)/.exec(c.textContent.replace(/,/g, '')); v = m ? m[1] : ''; }
    return v === '' ? null : Number(v);
  };
  const names = [...table.tBodies].map(nameOf);
  const words = [...new Set(names.flatMap((n) => n.split(/\s+/)).filter((w) => w.length > 3))];
  const queries = [words[0], words[3], words[7], names[5], 'zzz-none'].filter(Boolean);
  const failures = [];
  let checks = 0;
  for (const th of table.querySelectorAll('thead th[data-k]')) {
    const btn = th.querySelector('button'), k = th.dataset.k, col = keys.indexOf(k), num = btn.dataset.sort === 'num';
    for (const pass of [1, 2]) {
      btn.click();
      const dir = th.getAttribute('aria-sort') === 'ascending' ? 1 : -1;
      // The order, over every row.
      const vs = [...table.tBodies].map((b) => val(b, col, num));
      checks++;
      for (let i = 1; i < vs.length; i++) {
        const a = vs[i - 1], b = vs[i];
        if (a === null && b !== null) { failures.push({ k, dir, problem: 'blank before a value', at: i }); break; }
        if (a !== null && b !== null && (a < b ? -1 : a > b ? 1 : 0) * dir > 0) { failures.push({ k, dir, problem: 'out of order', at: i, a, b }); break; }
      }
      for (const q of queries) {
        find.value = q; find.dispatchEvent(new Event('input')); await wait(110);
        const ts = q.toLowerCase().split(/\s+/);
        const want = [...table.tBodies].filter((b) => ts.every((t) => nameOf(b).includes(t))).map(nameOf).sort();
        const got = [...table.tBodies].filter((b) => !b.hidden).map(nameOf).sort();
        checks++;
        if (JSON.stringify(want) !== JSON.stringify(got) || !shown.textContent.includes(String(got.length))) failures.push({ k, dir, q, want: want.slice(0, 4), got: got.slice(0, 4), shown: shown.textContent });
      }
      find.value = ''; find.dispatchEvent(new Event('input')); await wait(110);
      for (const t of toggles) {
        t.click();
        const attr = 'data-' + t.dataset.t;
        const want = [...table.tBodies].filter((b) => b.hasAttribute(attr)).map(nameOf).sort();
        const got = [...table.tBodies].filter((b) => !b.hidden).map(nameOf).sort();
        checks++;
        if (JSON.stringify(want) !== JSON.stringify(got) || !shown.textContent.includes(String(got.length))) failures.push({ k, dir, toggle: t.dataset.t, want: want.length, got: got.length });
        t.click();
      }
    }
  }
  return { products: names.length, columns: keys.length, queries, checks, failures: failures.length, first: failures.slice(0, 3) };
})()
