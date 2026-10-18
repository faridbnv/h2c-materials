(async () => {
  const s = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('[data-template="1"]').click(); await s(900);
  for (const t of document.querySelectorAll('.typical-state')) {
    const sv = t.closest('td').querySelector('.sv') ?? t.previousElementSibling ?? t;
    const m = document.createElement('span'); m.className = 'ann-mk'; m.title = t.title; sv.after(m); t.remove();
  }
  for (const f of document.querySelectorAll('.fx-mark')) { const h = f.closest('[data-explain-head]')?.dataset.explainHead ?? f.dataset.explainHead ?? ''; const c = (h.match(/from ([A-Z]{3})/) ?? [])[1]; if (c) f.textContent = c; }
  const lg = document.querySelector('.legend-row');
  const words = { 'median and range': 'median, range · products', 'one measurement': 'one value', 'published, not comparable': 'not comparable', 'close to the limit': 'near the limit' };
  for (const b of lg.children) for (const n of b.childNodes) if (n.nodeType === 3) { const k = n.textContent.trim(); if (words[k]) n.textContent = ` ${words[k]}`; }
  const fx = lg.querySelector('.fx-mark'); if (fx) { fx.textContent = 'USD'; fx.parentElement.lastChild.textContent = ' converted'; }
  const ann = document.createElement('span'); ann.className = 'lg'; ann.innerHTML = '<b>2.2</b><span class="ann-mk"></span> annealed median'; (fx?.parentElement ?? lg.lastElementChild).before(ann);
  document.querySelector('#lens').scrollTop = 0;
  return lg.scrollWidth + ' / ' + lg.clientWidth;
})()
