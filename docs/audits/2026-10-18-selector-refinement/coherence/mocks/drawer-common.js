// Shared by the drawer mocks (coherence PROPOSAL, 2026-10-18): open a drawer under a template, then rewrite its first
// screen by hand with the values the build already prints (the PLA and PEEK pages, the drawer's own counts). A mock, not code.
window.__mock = async function (id, template, spec) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  if (template !== null) { document.querySelector(`[data-template="${template}"]`)?.click(); await wait(600); }
  const row = document.querySelector(`tr[data-material="${id}"]`);
  if (row) { row.scrollIntoView({ block: 'center' }); row.click(); await wait(700); }
  else { await wait(400); const h = location.hash.slice(1); const s = h ? JSON.parse(decodeURIComponent(h)) : { x: 2 };
    s.m = id; location.hash = encodeURIComponent(JSON.stringify(s)); await wait(1300); }
  const d = document.querySelector('.drawer');
  // Header: one identity line, the H2C standing once (the chip), no lede.
  const subs = d.querySelectorAll('.drawer-head .sub');
  subs[1].innerHTML = spec.identity;
  // Tabs: counts only on Products and Sources; a tab with nothing stays grey (K38); no caption under the tabs.
  d.querySelectorAll('.drawer-tabs button').forEach((b) => { const t = b.dataset.tab; const n = b.querySelector('.n');
    if (n && !['Grades', 'Evidence'].includes(t)) n.remove(); });
  d.querySelector('#drawer-help')?.remove();
  const kp = (rows) => `<dl class="key-props">${rows.map(([name, v, s]) => `<dt><button type="button" class="mark prop-name">${name}</button></dt>
    <dd class="${v ? '' : 'kp-empty'}">${v ? `<button type="button" class="mark spread-value"><span class="sv">${v}</span></button>` : 'Not published'} ${s ? `<span class="spread">${s}</span>` : ''}</dd>`).join('')}</dl>`;
  const fact = ([chip, cls, label, value, why]) => chip
    ? `<div class="fact"><span class="chip ${cls}">${chip}</span><div><b>${label}</b> <span class="mk-v">${value}</span><br><span class="fact-why">${why}</span></div></div>`
    : `<div class="fact plain"><div><b>${label}</b> <span class="mk-v">${value}</span><br><span class="fact-why">${why}</span></div></div>`;
  d.querySelector('.drawer-body').innerHTML = `${spec.answer}
    <h3 class="sec">Your requirements</h3>${spec.why}
    <h3 class="sec">Key properties</h3>${kp(spec.key)}
    <p class="fine">${spec.more}</p>
    <h3 class="sec mk-h2c">On the H2C <button type="button" class="link-btn mk-full">Printing in full</button></h3>
    <div class="facts-list">${spec.h2c.map(fact).join('')}</div>
    <p class="fine">${spec.h2cFoot}</p>`;
  const st = document.createElement('style');
  st.textContent = `.mk-v{font-weight:600;font-variant-numeric:tabular-nums}.mk-h2c{display:flex;justify-content:space-between;align-items:baseline}
    .mk-full{text-transform:none;letter-spacing:0;font-weight:500;font-size:var(--t-small)}
    .key-props .spread{color:var(--ink-2);font-size:var(--t-small)} .drawer-tabs button{padding-left:8px;padding-right:8px}`;
  document.head.append(st);
  d.querySelector('.drawer-body').scrollTop = 0;
  return d.querySelector('h2').textContent;
};
