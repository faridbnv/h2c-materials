// Mock 1 and 2: open one heading, then key above, one count per row, the pages' key words, re-stacked dots with a count
// over a column that would still overflow. Everything here only moves or rewrites what the drawer already rendered.
async function mock(material, tab, heading, { maxH = 80, pitch = 7.5, gapPx = 7.5, labels = false } = {}) {
  const s = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector(`tr[data-material="${material}"]`).click(); await s(700);
  document.querySelector(`.drawer [data-tab="${tab}"]`).click(); await s(500);
  const d = [...document.querySelectorAll('.drawer details.imp-block')].find((x) => x.querySelector('summary').textContent.includes(heading));
  d.open = true; await s(300);
  const sec = d.querySelector('.imp-compare');
  // 1. The key above the first graph, in the pages' words; band and median one item.
  const key = sec.querySelector('.imp-key');
  const words = { '': 'a product', open: 'as published: orientation or load not stated', annealed: 'measured after annealing',
    variant: 'added filler or additive, kept out of the median', claimed: "sold as toughened (maker's statement)" };
  const print = sec.classList.contains('print-compare');
  for (const sp of [...key.children]) {
    const i = sp.querySelector('i'); const c = i.className.replace('imp-dot', '').trim();
    if (i.classList.contains('imp-median-key')) { sp.remove(); continue; }
    if (i.classList.contains('imp-band-key')) { sp.lastChild.textContent = ' middle half and median'; continue; }
    if (i.classList.contains('imp-limit-key')) { sp.lastChild.textContent = " the H2C's limit, and beyond it"; continue; }
    if (!print && c in words) sp.lastChild.textContent = ` ${words[c]}`;
    if (print && c === 'open') sp.lastChild.textContent = ' from the Bambu Lab Filament Guide, not counted';
    if (print && c === 'variant') sp.lastChild.textContent = ' added filler or additive, not counted';
    if (print && c === '') sp.lastChild.textContent = " a product's data sheet";
  }
  sec.querySelector('.imp-strips').before(key);
  // 2. One count per row, the pages' form: "55 ranked of 106 shown".
  const table = [...sec.querySelectorAll('.imp-summary tbody tr')].filter((tr) => tr.querySelector('th[scope=row]'));
  for (const row of sec.querySelectorAll('.imp-row[data-headline]')) {
    const label = row.querySelector('.imp-label').firstChild.textContent.trim();
    const fine = row.querySelector('.imp-label .fine'); const shown = parseInt(fine.textContent.replace(/,/g, ''), 10);
    const tr = table.find((t) => t.querySelector('th').textContent.trim().startsWith(label));
    const n = tr ? parseInt(tr.querySelector('td').textContent, 10) : 0;
    fine.textContent = n ? `${n} ${print ? 'counted' : 'ranked'} of ${shown} shown` : `${shown} shown, none ${print ? 'counted' : 'ranked'}`;
  }
  const th = sec.querySelector('.imp-summary thead th.num'); if (th) th.textContent = print ? 'Counted' : 'Ranked';
  // 3. Re-stack: smaller dots and no cap on rows; where the rows would pass the track's height the pitch tightens, so a
  // column's height stays in proportion to how many products it holds. An exact-value column taller than the dots can
  // show apart (print settings come in 5 degree steps) carries its count over it.
  for (const track of sec.querySelectorAll('.imp-track')) {
    const w = track.clientWidth; const dots = [...track.querySelectorAll('.imp-dot')];
    const xs = dots.map((b) => ({ b, x: parseFloat(b.style.left) / 100 * w, v: b.style.left })).sort((a, b) => a.x - b.x);
    const rows = [];
    for (const e of xs) { let r = rows.findIndex((last) => e.x - last >= gapPx); if (r < 0) r = rows.length; rows[r] = e.x; e.r = r; }
    const n = Math.max(1, rows.length); const p = Math.max(0.6, Math.min(pitch, (maxH - 10) / n));
    for (const e of xs) e.b.style.bottom = `${3 + e.r * p}px`;
    const byV = new Map(); for (const e of xs) byV.set(e.v, (byV.get(e.v) ?? 0) + 1);
    const tall = labels ? [...byV].filter(([, c]) => c * p > 0 && c > Math.floor((maxH - 10) / pitch)) : [];
    track.style.height = `${8 + n * p + (tall.length ? 12 : 0)}px`;
    for (const [v, c] of tall) { const lab = document.createElement('span'); lab.className = 'imp-count'; lab.style.left = v; lab.style.bottom = `${6 + c * p}px`; lab.textContent = c; track.append(lab); }
  }
  // 4. Print temperatures: a head per setting, the limit's range beyond it washed.
  if (print) {
    for (const g of sec.querySelectorAll('.imp-strips')) {
      const ax = g.querySelector('.imp-axis .fine'); const first = g.querySelector('.imp-label').firstChild.textContent.trim().split(',')[0];
      const lim = (ax.textContent.match(/limit (\d+)/) ?? [])[1]; const above = /above the scale/.test(ax.textContent);
      const h = document.createElement('div'); h.className = 'g-head';
      h.innerHTML = `${first} <span>· °C · ${lim ? (above ? `the H2C reaches ${lim} °C, above this scale` : `the H2C reaches ${lim} °C, drawn`) : ''}</span>`;
      g.prepend(h); ax.textContent = '°C';
      for (const l of g.querySelectorAll('.imp-limit')) { const b = document.createElement('span'); b.className = 'imp-beyond'; b.style.left = l.style.left; l.before(b); }
    }
  }
  d.scrollIntoView(); document.querySelector('.drawer-body').scrollTop -= 4;
  return 'ok';
}
