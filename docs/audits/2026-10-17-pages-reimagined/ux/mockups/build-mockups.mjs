// Builds the UX mockups from dist/db.json (real numbers only). Run from the repo root:
//   node docs/audits/2026-10-17-pages-reimagined/ux/mockups/build-mockups.mjs docs/audits/2026-10-17-pages-reimagined/ux/mockups
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = process.cwd();
const imp = (p) => import(join(ROOT, p));
const { prepare } = await imp('app/pages/render.js');
const { materialContext, productRows } = await imp('app/js/ui/material-facts.js');
const { pageOf } = await imp('app/js/ui/page-rule.js');
const { fmtNumber } = await imp('app/js/ui/format.js');

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'style.css'), 'utf8');
const db = JSON.parse(readFileSync(join(ROOT, 'dist/db.json'), 'utf8'));
prepare(db);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (v) => fmtNumber(v);
const SELECTOR = '../../../../../dist/H2C_Material_Selector_2026-09-21_ee8eb64a0259.html';

const MARK = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8"/><path d="M9 22h14M11 16.5h10M13 11h6"/></svg>';
const I = {
  back: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M8 5 3 10l5 5M3.5 10H17"/></svg>',
  theme: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.6"/><path d="M10 3.4a6.6 6.6 0 0 1 0 13.2Z" fill="currentColor" stroke="none"/></svg>',
  down: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true" style="width:16px;height:16px"><path d="M6 8l4 4 4-4"/></svg>',
  search: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>',
  copy: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="7" width="9.5" height="9.5" rx="1.5"/><path d="M13 7V4.5A1 1 0 0 0 12 3.5H4.5a1 1 0 0 0-1 1V12a1 1 0 0 0 1 1H7"/></svg>',
  tough: '<svg class="tough" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3l6 2.2v4.3c0 3.6-2.5 6.1-6 7.5-3.5-1.4-6-3.9-6-7.5V5.2z"/></svg>',
  variant: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5l6.5 6.5-6.5 6.5L3.5 10z"/></svg>',
  twin: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3.5h6.5l3 3V15H7z"/><path d="M13.5 3.5v3h3"/><path d="M4 6.5v10h8.5"/></svg>',
  hard: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5h8v4l-2.5 4h-3L6 7.5z"/><path d="M8.5 11.5L10 16.5l1.5-5"/></svg>',
};

const SCRIPT = `<script>
(function(){
  var q = new URLSearchParams(location.search);
  var root = document.documentElement;
  if (q.get('theme')) root.dataset.theme = q.get('theme');
  // The return button: "Back to your results" when the tab came from the selector (?from=), else "Open in the selector".
  var cold = q.get('from') === 'none';
  document.querySelectorAll('[data-return]').forEach(function(a){ a.querySelector('.long').textContent = cold ? 'Open in the selector' : 'Back to your results'; a.querySelector('.short').textContent = cold ? 'Selector' : 'Results'; });
  var btn = document.querySelector('.here-btn'), menu = document.getElementById('sections');
  if (btn && menu) {
    var set = function(on){ btn.setAttribute('aria-expanded', on); if (on) menu.setAttribute('data-open',''); else menu.removeAttribute('data-open'); };
    btn.addEventListener('click', function(){ set(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { set(false); btn.focus(); } });
    if (q.get('menu') === 'open') set(true);
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function(b){ b.addEventListener('click', function(){
    var dark = getComputedStyle(root).getPropertyValue('--bg').trim() === '#15161a'; root.dataset.theme = dark ? 'light' : 'dark'; }); });
  var st = q.get('sort'); if (st) { document.querySelectorAll('div[data-state]').forEach(function(el){ el.hidden = el.dataset.state !== st; }); var sel = document.querySelector('.sortby select'); if (sel) sel.selectedIndex = 6; var h = document.querySelector('[data-hdt]'); if (h) { h.setAttribute('aria-sort','descending'); h.innerHTML = '0.45 MPa \u2193<small>°C, high first</small>'; } }
  if (q.get('open') === 'none') document.querySelectorAll('details[open]').forEach(function(d){ d.open = false; });
})();
</script>`;

function page({ title, body, crumbs, here = null, menu = '' }) {
  return `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="color-scheme" content="light dark">
<style>
${CSS}
</style>
</head>
<body>
<a class="vh" href="#main">Skip to the content</a>
<header class="bar"><div class="bar-in wrap">
<a class="brand" href="${SELECTOR}" title="The selector">${MARK}<span class="brand-name">Filament Atlas</span></a>
<nav class="crumbs" aria-label="You are here"><ol>${crumbs}${here ? `<li class="here"><button class="here-btn" type="button" aria-expanded="false" aria-controls="sections">${here}${I.down}</button>${menu}</li>` : ''}</ol></nav>
<div class="bar-end">
<a class="btn" data-return href="${SELECTOR}#%7B%22m%22%3A%22M001%22%7D">${I.back}<span class="long">Back to your results</span><span class="short">Results</span></a>
<button class="icon-btn" type="button" data-theme-toggle aria-label="Switch between light and dark" title="Light or dark">${I.theme}</button>
</div></div></header>
<main id="main" class="wrap">
${body}
</main>
${SCRIPT}
</body>
</html>
`;
}

// ---------------------------------------------------------------- data
const m = db.materials.find((x) => x.id === 'M001');
const petg = db.materials.find((x) => x.id === 'M020');
const abs = db.materials.find((x) => x.id === 'M027');
const c = materialContext(db, 'M001', { showEstimates: true });
const rows = productRows(c).filter((r) => r.product);
const makers = new Map(); for (const r of rows) makers.set(r.maker, (makers.get(r.maker) ?? 0) + 1);
const makerList = [...makers].sort((a, b) => b[1] - a[1]);

// ---------------------------------------------------------------- key figures
const KF = [
  ['tensileModulusXY', 'Tensile modulus XY'],
  ['tensileStrengthXY', 'Tensile strength XY'],
  ['tensileStrengthZ', 'Tensile strength Z'],
  ['charpyNotched', 'Notched Charpy'],
  ['hdt045', 'HDT at 0.45 MPa'],
  ['priceCADkg', 'Price'],
];
function whisker(s, med, refs) {
  // A placeholder drawing for the dataviz expert's slot: range, middle half, median, and the two landmark medians.
  const lo = Math.min(s.min, ...refs.map((r) => r[1])), hi = Math.max(s.max, ...refs.map((r) => r[1]));
  const pad = (hi - lo) * 0.04, a = lo - pad, b = hi + pad;
  const x = (v) => ((v - a) / (b - a) * 100).toFixed(2) + '%';
  const refMarks = refs.map(([name, v], i) => `<line class="wh-ref" x1="${x(v)}" x2="${x(v)}" y1="${i ? 14 : 4}" y2="${i ? 24 : 14}"/><text class="wh-lab" x="${x(v)}" y="${i ? 34 : 1}" text-anchor="middle">${name}</text>`).join('');
  return `<svg role="img" aria-label="Products range ${n(s.min)} to ${n(s.max)}; middle half ${n(s.q1)} to ${n(s.q3)}; PETG ${n(refs[0][1])}, ABS ${n(refs[1][1])}">
<line class="wh-track" x1="${x(s.min)}" x2="${x(s.max)}" y1="14" y2="14"/>
<line class="wh-end" x1="${x(s.min)}" x2="${x(s.min)}" y1="9" y2="19"/><line class="wh-end" x1="${x(s.max)}" x2="${x(s.max)}" y1="9" y2="19"/>
<rect class="wh-band" x="${x(s.q1)}" y="9" width="${((s.q3 - s.q1) / (b - a) * 100).toFixed(2)}%" height="10" rx="2"/>
<line class="wh-med" x1="${x(med)}" x2="${x(med)}" y1="6" y2="22"/>${refMarks}</svg>`;
}
const kfHtml = KF.map(([k, label]) => {
  const h = m.headline[k], s = h.spread;
  const refs = [['PETG', petg.headline[k].value], ['ABS', abs.headline[k].value]];
  return `<div><dt>${esc(label)}</dt><dd class="kf-v"><span class="kf-n">${n(h.value)}</span><span class="kf-u">${esc(h.unit)}</span></dd>
<dd class="kf-s">${whisker(s, h.value, refs)}</dd><dd class="kf-f">${n(s.n)} products, ${n(s.min)} to ${n(s.max)}</dd></div>`;
}).join('\n');

// ---------------------------------------------------------------- material page
const sections = [['among', 'Among the materials'], ['mechanical', 'Mechanical properties'], ['thermal', 'Thermal properties'], ['printing', 'Printing on the H2C'], ['products', 'Products'], ['uses', 'Uses, limitations and chemicals'], ['price', 'Price'], ['other', 'Other properties, as published'], ['sources', 'Sources']];
const menu = `<div class="menu" id="sections" aria-label="PLA, on this page">
<a href="#top" aria-current="true"><span>Overview</span></a>
${sections.filter(([id]) => id !== 'products').map(([id, t]) => `<a href="#${id}"><span>${t}</span></a>`).join('\n')}
<hr><a href="products-PLA.html"><span>Products</span><span class="m-n">195</span></a>
<a href="hub.html"><span>All materials</span><span class="m-n">76 pages</span></a></div>`;

const summary = m.written.parts.map((p) => (p.text != null ? esc(p.text) : `${n(p.value)}${p.unit ? `&nbsp;${esc(p.unit)}` : ''}`)).join('');
const box = (title, words, h, slot = 'Dataviz slot') => `<div class="slot" data-slot="${slot}"><div class="box" style="min-height:${h}px"><div><b>${title}</b>${words}</div></div></div>`;

const materialBody = `
<header class="head" id="top">
  <div>
    <h1 class="name">PLA</h1>
    <p class="full">Polylactic acid</p>
    <p class="idline slot" data-slot="Content slot: identity sentence">Unfilled PLA, sold as 195 products by 40 makers. A material type on Bambu Lab's H2C list, though not every brand of it is.</p>
  </div>
  <nav class="tabs" aria-label="PLA pages"><a href="#top" aria-current="page">Overview</a><a href="products-PLA.html">Products <span class="n">195</span></a></nav>
</header>

<section class="kf-wrap slot" data-slot="Layout: UX. Spread drawing under each number: dataviz slot" aria-label="Key figures: the median of the products that publish each value">
<dl class="kf plate">
${kfHtml}
</dl>
</section>

<div class="first">
  <section class="summary slot" data-slot="Content slot: the summary">
    <h2 class="vh">In short</h2>
    <p>${summary}</p>
    <p class="by">Written by Claude Sonnet (agent), revised by Claude Opus (agent), 2026-10-17. A draft, not yet reviewed by the owner. Its numbers are filled from the data.</p>
  </section>
  <section class="h2c plate" aria-labelledby="h2c-h">
    <div class="h2c-h"><h2 id="h2c-h">On the H2C</h2><a href="#printing">Printing in full</a></div>
    <dl>
      <div><dt>Nozzle</dt><dd>195–230 °C</dd><dd class="k">most of 169</dd></div>
      <div><dt>Bed</dt><dd>50–60 °C</dd><dd class="k">most of 159</dd></div>
      <div><dt>Heated chamber</dt><dd>Not needed</dd><dd class="k">160 of 195</dd></div>
      <div><dt>Drying</dt><dd>50 °C for 6 h</dd><dd class="k">typical of 183</dd></div>
      <div><dt>Hardened nozzle</dt><dd>Not needed</dd><dd class="k">6 of 195 need one</dd></div>
    </dl>
    <p class="foot slot" data-slot="Content slot: words">Counted over the products whose own or shared data sheet states the setting. No product asks for more than the H2C gives: nozzle 350 °C, bed 120 °C, heated chamber 65 °C.</p>
  </section>
</div>


<section class="sec" id="among" aria-labelledby="among-h">
  <h2 id="among-h">Among the materials</h2>
  <p class="lead slot" data-slot="Content slot: the opening">Where PLA sits against what an engineer would weigh it against, then among every material.</p>
  <div class="figs">
    ${box('Figure 1. Against its alternatives', 'PLA-CF, PLA-GF, PETG, PLA blend, ABS: same six columns as the key figures above; names link to their pages', 360)}
    <div class="figs two">
      ${box('Figure 2a. Strength against stiffness', 'Every material\'s median, fixed frame', 280)}
      ${box('Figure 2b. HDT against price', 'Every material\'s median, fixed frame', 280)}
    </div>
  </div>
</section>

<section class="sec" id="mechanical" aria-labelledby="mechanical-h">
  <h2 id="mechanical-h">Mechanical properties</h2>
  <p class="lead slot" data-slot="Content slot: the opening">Flat and across the layers, and how tough.</p>
  <div class="figs">
    ${box('Figure 3. Its products, property by property', 'A dot per product, linked across strips; a click opens the product on the Products page', 300)}
    ${box('Figure 4. Across the layers', 'Z against XY, product by product', 240)}
  </div>
</section>

<section class="sec" id="thermal" aria-labelledby="thermal-h">
  <h2 id="thermal-h">Thermal properties</h2>
  <p class="lead slot" data-slot="Content slot: the opening">At what temperature it softens under load.</p>
</section>

<section class="sec" id="printing" aria-labelledby="printing-h">
  <h2 id="printing-h">Printing on the H2C</h2>
  <p class="lead slot" data-slot="Content slot: the opening">What to set, what it needs, what goes wrong.</p>
  <div class="figs">
    ${box('Figure 5. Every temperature on one axis', 'Tg, HDT, print windows, drying, the H2C\'s limits', 280)}
    ${box('Settings, with where each comes from', 'Own sheet, a shared sheet, Bambu Lab\'s Filament Guide; drying, hardened nozzle, AMS; makers\' printing notes', 200, 'Content slot')}
  </div>
</section>

<section class="handoff plate" id="products" aria-labelledby="handoff-h">
  <div>
    <h2 id="handoff-h">195 products from 40 makers</h2>
    <p>${makerList.slice(0, 8).map(([k, v]) => `${esc(k)} ${v}`).join(', ') } and ${makerList.length - 8} more makers.</p>
    <div class="slot" data-slot="Content slot: products that stand out" style="margin-top:18px"><div class="box" style="min-height:120px"><div><b>Products that stand out</b>Most values published, highest strength XY and Z, keeps most across the layers, highest HDT, highest Charpy, lowest price: a fact per line, each linking to its product</div></div></div>
  </div>
  <a class="btn btn-primary" href="products-PLA.html">Compare the 195 products</a>
</section>

<section class="sec" id="uses" aria-labelledby="uses-h"><h2 id="uses-h">Uses, limitations and chemicals</h2>
  <div class="figs">${box('What makers sell it for and warn about; chemicals, UV, moisture', 'In the makers\' own words, by topic', 220, 'Content slot')}</div></section>
<section class="sec" id="price" aria-labelledby="price-h"><h2 id="price-h">Price</h2>
  <div class="figs">${box('Price per kilogram', 'Median 33.7 CAD/kg of 26 products; the product strip is Figure 3\'s', 140, 'Content slot')}</div></section>
<section class="sec" id="other" aria-labelledby="other-h"><h2 id="other-h">Other properties, as published</h2>
  <div class="figs">${box('A table', 'Hardness, interlayer adhesion, Vicat, melting, decomposition…', 120, 'Content slot')}</div></section>
<section class="sec" id="sources" aria-labelledby="sources-h"><h2 id="sources-h">Sources</h2>
  <div class="figs two">${box('281 documents, by publisher', 'Each opens to its documents and the link to the original', 200, 'Content slot')}${box('Known gaps', 'Not published by any product: compression strength, CTE, thermal conductivity, fatigue, creep…', 200, 'Content slot')}</div></section>

<footer class="foot-band">
  <div>
    <p class="slot" data-slot="Content slot">Data-sheet values describe test specimens, not design allowables. Confirm the exact product, its conditioning and your part's geometry with your own print.</p>
    <div class="foot-nav">
      <a class="btn" data-return href="${SELECTOR}">${I.back}<span class="long">Back to your results</span><span class="short">Results</span></a>
      <a class="btn" href="products-PLA.html">Products <span class="num" style="color:var(--ink-2)">195</span></a>
    </div>
  </div>
  <div>
    <p class="fine">Release ee8eb64a0259. Documents read 2026-09-10 to 2026-10-05; built 2026-10-17.<br>2,440 measurements, 297 print profiles and 281 documents behind this page.</p>
    <button class="btn" type="button">${I.copy}Copy the citation</button>
  </div>
</footer>`;

writeFileSync(join(OUT, 'material-PLA.html'), page({
  title: 'PLA: Filament Atlas',
  crumbs: '<li class="hub-crumb"><a href="hub.html">Materials</a></li>',
  here: '<b>PLA</b><span class="here-sec long">Overview</span>',
  menu,
  body: materialBody,
}));

// ---------------------------------------------------------------- products page
const pick = (r, k) => r.values[k] ?? null;
const cls = (v) => [v.level === 'as-published' ? 'o' : '', v.anneal ? 'a' : ''].filter(Boolean).join(' ');
const COLS = [
  ['tensileStrengthXY', 'XY', 'Strength XY'], ['tensileStrengthZ', 'Z', 'Strength Z'], ['tensileModulusXY', 'XY', 'Modulus XY'],
  ['charpyNotched', 'Charpy', 'Charpy'], ['hdt045', '0.45 MPa', 'HDT 0.45'], ['hdt18', '1.8 MPa', 'HDT 1.8'], ['priceCADkg', 'CAD/kg', 'Price'],
];
const setText = (s) => (!s || s.state === 'unknown' ? '' : s.state === 'range' ? (s.min != null && s.max != null ? (s.min === s.max ? n(s.min) : `${n(s.min)}–${n(s.max)}`) : s.max == null ? `≥ ${n(s.min)}` : `≤ ${n(s.max)}`) : s.state === 'not-required' || s.state === 'ambient' ? 'none' : s.state);
const guide = (r, axis) => r.print?.from?.[axis]?.origin === 'guide';
const twin = (r) => Object.values(r.values).some((v) => v?.from?.origin === 'twin');
const keyN = (r) => Object.keys(r.values).filter((k) => !['priceCADkg'].includes(k)).length;
function rowHtml(r, { sortKey = null, max = 1, open = false, card = '' } = {}) {
  const marks = [r.toughened ? `<span title="Sold as toughened (the maker's statement)">${I.tough}</span>` : '', r.variant ? `<span title="Special formulation">${I.variant}</span>` : '', twin(r) ? `<span title="Data sheet shared with another product">${I.twin}</span>` : ''].join('');
  const PH = new Set([sortKey && sortKey !== 'docs' ? sortKey : 'tensileStrengthXY', 'tensileModulusXY', 'hdt045', 'priceCADkg']);
  if (PH.size > 4) PH.delete('tensileModulusXY');
  const vals = COLS.map(([k, , label]) => {
    const v = k === 'priceCADkg' ? r.price : pick(r, k);
    const bar = sortKey === k && v ? ` bar" style="--w:${Math.max(4, (v.value / max) * 100).toFixed(1)}%` : '';
    const ph = PH.has(k) ? ` ph${sortKey === k ? ' sorted' : ''}` : '';
    return v ? `<span class="pv ${k === 'priceCADkg' ? '' : cls(v)}${ph}${bar}" data-l="${label}"><span class="vh">${label} </span>${n(v.value)}</span>` : `<span class="pv${ph}" data-l="${label}"></span>`;
  }).join('');
  const p = r.print ?? {};
  const noz = setText(p.nozzle), bed = setText(p.bed), ch = setText(p.chamber);
  const dr = p.drying?.tempC != null ? `${n(p.drying.tempC)}<small> °C, ${p.drying.hours != null ? n(p.drying.hours) + ' h' : ''}</small>` : '';
  const print = `<span class="pv${guide(r, 'nozzle') ? ' g' : ''}"><span class="vh">Nozzle </span>${noz}${p.hardenedNozzle ? `<span class="hd" title="Hardened nozzle required">${I.hard}</span>` : ''}</span>`
    + `<span class="pv${guide(r, 'bed') ? ' g' : ''}"><span class="vh">Bed </span>${bed}</span>`
    + `<span class="pv${guide(r, 'chamber') ? ' g' : ''}"><span class="vh">Chamber </span>${ch}</span>`
    + `<span class="pv${guide(r, 'drying') ? ' g' : ''}"><span class="vh">Drying </span>${dr}</span>`;
  return `<details class="pr" id="${esc(r.id)}"${open ? ' open' : ''}><summary><span class="pn">${esc(r.name)}<span class="mk">${marks}</span></span>${vals}${print}</summary>${card}</details>`;
}
const docsOrder = [...rows].sort((a, b) => keyN(b) - keyN(a) || (a.maker ?? '~').localeCompare(b.maker ?? '~') || a.name.localeCompare(b.name));
const basic = rows.find((r) => r.name === 'Bambu Lab PLA Basic');
const card = `<div class="card plate">
<div><h3>Values, as its documents publish them</h3>
<dl>
<dt>Tensile strength</dt><dd>35 MPa</dd><dd style="text-align:left;font-weight:400;color:var(--ink-2)">XY; 31 MPa Z</dd>
<dt>Tensile modulus</dt><dd>2.58 GPa</dd><dd style="text-align:left;font-weight:400;color:var(--ink-2)">XY; 2.06 GPa Z</dd>
<dt>Elongation at break</dt><dd>12.2 %</dd><dd style="text-align:left;font-weight:400;color:var(--ink-2)">XY; 7.5 % Z</dd>
<p class="cond">Printed specimen, ISO 527 and GB/T 1040, annealed at 55 °C for 8 h. <a href="#">Bambu Lab, Technical Data Sheet, PLA Basic, p. 2</a></p>
<dt>Notched Charpy</dt><dd>7.9 kJ/m²</dd><dd></dd>
<p class="cond">Printed specimen, ISO 179 and GB/T 1043, notched, annealed at 55 °C for 8 h. <a href="#">Same sheet, p. 2</a></p>
<dt>HDT</dt><dd>57 °C</dd><dd style="text-align:left;font-weight:400;color:var(--ink-2)">at 0.45 MPa; 54 °C at 1.8 MPa</dd>
<dt>Glass transition</dt><dd>60 °C</dd><dd style="text-align:left;font-weight:400;color:var(--ink-2)">DSC, 10 °C/min</dd>
<p class="cond">Printed specimen, ISO 75, annealed at 55 °C for 8 h. <a href="#">Same sheet, p. 2</a></p>
</dl>
<div class="more"><a href="#">All 42 measurements of this product, with their conditions</a></div>
</div>
<div class="side"><h3>Printing</h3>
<dl>
<dt>Nozzle</dt><dd>190–230 °C<small>its own data sheet</small></dd>
<dt>Bed</dt><dd>35–45 °C<small>its own data sheet</small></dd>
<dt>Heated chamber</dt><dd>25–45 °C<small>its own data sheet</small></dd>
<dt>Drying</dt><dd>50 °C for 8 h<small>its own data sheet</small></dd>
<dt>Hardened nozzle</dt><dd>Not needed<small>Bambu Lab's Filament Guide for PLA</small></dd>
</dl>
<h3 style="margin-top:18px">Price and documents</h3>
<dl>
<dt>Price</dt><dd>28 CAD/kg<small>median of 2 Canadian listings</small></dd>
</dl>
<div class="more"><a href="#">5 price listings</a><a href="#">7 maker statements</a><a href="#">2 documents</a></div>
</div>
</div>`;
const listHead = `<div class="pl-h" role="presentation">
<span><button class="l" type="button">Product</button></span>
<span style="grid-column: span 3"><div class="pl-g">Strength and stiffness</div><span style="display:grid;grid-template-columns:repeat(3,1fr);column-gap:10px"><button type="button" data-k="tensileStrengthXY">Strength XY<small>MPa</small></button><button type="button">Strength Z<small>MPa</small></button><button type="button">Modulus XY<small>GPa</small></button></span></span>
<span><div class="pl-g">Impact</div><button type="button">Notched Charpy<small>kJ/m²</small></button></span>
<span style="grid-column: span 2"><div class="pl-g">HDT</div><span style="display:grid;grid-template-columns:repeat(2,1fr);column-gap:10px"><button type="button" data-hdt>0.45 MPa<small>°C</small></button><button type="button">1.8 MPa<small>°C</small></button></span></span>
<span><div class="pl-g">Cost</div><button type="button">Price<small>CAD/kg</small></button></span>
<span style="grid-column: span 4"><div class="pl-g">Printing on the H2C</div><span style="display:grid;grid-template-columns:.8fr .66fr .62fr .76fr;column-gap:10px"><button type="button">Nozzle<small>°C</small></button><button type="button">Bed<small>°C</small></button><button type="button">Chamber<small>°C</small></button><button type="button">Drying<small>°C, h</small></button></span></span>
</div>`;
const defaultList = docsOrder.slice(0, 16).map((r) => rowHtml(r, { open: r === basic, card: r === basic ? card : '' })).join('\n');
// Sorted by HDT at 0.45 MPa: compared values first (high to low), then values with no stated load, then none.
const withH = rows.filter((r) => r.values.hdt045);
const cmp = withH.filter((r) => r.values.hdt045.level !== 'as-published').sort((a, b) => b.values.hdt045.value - a.values.hdt045.value);
const open = withH.filter((r) => r.values.hdt045.level === 'as-published').sort((a, b) => b.values.hdt045.value - a.values.hdt045.value);
const none = rows.filter((r) => !r.values.hdt045);
const maxH = Math.max(...withH.map((r) => r.values.hdt045.value));
const sortedList = cmp.slice(0, 9).map((r) => rowHtml(r, { sortKey: 'hdt045', max: maxH })).join('\n')
  + `\n<p class="grp">No stated test load: shown, not compared <span>(${open.length} products)</span></p>\n`
  + open.slice(0, 3).map((r) => rowHtml(r, { sortKey: 'hdt045', max: maxH })).join('\n')
  + `\n<p class="grp">HDT at 0.45 MPa not published <span>(${none.length} products, by name)</span></p>\n`
  + none.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 2).map((r) => rowHtml(r, { sortKey: 'hdt045', max: maxH })).join('\n');

const productsBody = `
<header class="head" id="top">
  <div>
    <h1 class="name">PLA</h1>
    <p class="idline slot" data-slot="Content slot: one line">195 products from 40 makers. Each value is the product's own, from its own data sheet or one it shares. Open a product for its conditions, settings and documents.</p>
  </div>
  <nav class="tabs" aria-label="PLA pages"><a href="material-PLA.html">Overview</a><a href="#top" aria-current="page">Products <span class="n">195</span></a></nav>
</header>
<div class="ctl">
  <div class="ctl-row">
    <label class="find">${I.search}<input type="search" placeholder="Find a product or maker" aria-label="Find a product or maker"></label>
    <label class="sortby">Sort by <select aria-label="Sort products by">
      <option data-state="docs" ${'selected'}>Most documented</option><option>Name</option><option>Tensile strength XY, high first</option><option>Tensile strength Z, high first</option><option>Tensile modulus XY, high first</option><option>Notched Charpy, high first</option><option>HDT at 0.45 MPa, high first</option><option>HDT at 1.8 MPa, high first</option><option>Price, low first</option><option>Nozzle, low first</option><option>Drying, low first</option></select></label>
    <span class="count" aria-live="polite">195 products</span>
  </div>
</div>
<div>
  <ul class="keys" aria-label="Marks">
    <li><span class="pv o" style="font-size:13px">48</span> no stated orientation or load: shown, not compared</li>
    <li><span class="pv a" style="font-size:13px"></span>measured after annealing</li>
    <li><span class="pv g" style="font-size:13px">190–230</span> from Bambu Lab's Filament Guide</li>
    <li><span class="mk">${I.tough}</span>sold as toughened</li>
    <li><span class="mk">${I.variant}</span>special formulation</li>
    <li><span class="mk">${I.twin}</span>data sheet shared</li>
    <li><span class="mk"><svg viewBox="0 0 20 20" style="width:14px;height:14px;fill:none;stroke:var(--ink);stroke-width:1.6"><path d="M6 3.5h8v4l-2.5 4h-3L6 7.5z"/><path d="M8.5 11.5L10 16.5l1.5-5"/></svg></span>hardened nozzle</li>
  </ul>
</div>
<div class="pl">
${listHead}
<div data-state="docs">
${defaultList}
<p class="grp" style="border:0;font-weight:400">179 more products below in the full page; no paging, no "Show all".</p>
</div>
<div data-state="hdt045" hidden>
${sortedList}
</div>
</div>
<footer class="foot-band">
  <div><div class="foot-nav"><a class="btn" data-return href="${SELECTOR}">${I.back}<span class="long">Back to your results</span><span class="short">Results</span></a><a class="btn" href="material-PLA.html">PLA overview</a></div></div>
  <div><p class="fine">Release ee8eb64a0259. Built 2026-10-17.</p></div>
</footer>`;
writeFileSync(join(OUT, 'products-PLA.html'), page({
  title: 'PLA products: Filament Atlas',
  crumbs: '<li class="hub-crumb"><a href="hub.html">Materials</a></li><li><a href="material-PLA.html">PLA</a></li>',
  here: '<b>Products</b>',
  menu: `<div class="menu" id="sections"><a href="material-PLA.html"><span>PLA overview</span></a><a href="#top" aria-current="true"><span>Products</span><span class="m-n">195</span></a><hr><a href="hub.html"><span>All materials</span></a></div>`,
  body: productsBody,
}));

// ---------------------------------------------------------------- hub
const msBy = new Map(); for (const x of db.measurements) (msBy.get(x.materialId) ?? msBy.set(x.materialId, []).get(x.materialId)).push(x);
const fams = new Map();
for (const mm of db.materials) { if (mm.familyEntry) continue; (fams.get(mm.family) ?? fams.set(mm.family, []).get(mm.family)).push(mm); }
let paged = 0, listed = 0;
const famHtml = [...fams].map(([f, list]) => {
  const withPage = list.filter((x) => pageOf(x, msBy.get(x.id) ?? []));
  const without = list.filter((x) => !pageOf(x, msBy.get(x.id) ?? []));
  paged += withPage.length; listed += list.length;
  return `<section class="fam" aria-labelledby="f-${esc(f).replace(/[^a-z0-9]/gi, '')}"><h2 id="f-${esc(f).replace(/[^a-z0-9]/gi, '')}">${esc(f)}</h2>
${withPage.length ? `<ul>${withPage.map((x) => `<li><a href="${x.id === 'M001' ? 'material-PLA.html' : '#'}">${esc(x.name)}</a><span class="lead-dots" aria-hidden="true"></span><span class="c">${x.gradeIds.length}<span class="vh"> products</span></span></li>`).join('')}</ul>` : ''}
${without.length ? `<p class="also">${withPage.length ? 'Also on file' : 'On file'}, without a page: ${without.map((x) => `${esc(x.name)} (${x.gradeIds.length})`).join(', ')}</p>` : ''}
</section>`;
}).join('\n');
const hubBody = `
<header class="hub-head" id="top">
  <h1 class="name">Materials</h1>
  <p class="idline slot" data-slot="Content slot: one sentence" style="font-size:var(--t-l);color:var(--ink)">Every material on file, by family, with how many products each has. The ${paged} with at least 3 products and 20 measured values have a page of their own; the rest are named under their family.</p>
</header>
<div class="hub-tools">
  <label class="find" style="width:min(440px,100%)">${I.search}<input type="search" placeholder="Find a material, polymer or product" aria-label="Find a material, polymer or product"></label>
  <span class="count">${listed} materials, ${paged} with a page</span>
</div>
<div class="fams">
${famHtml}
</div>
<footer class="foot-band"><div><p>Filament Atlas reads what makers publish about each filament. A page shows a material across its products; the selector is where requirements are set and products judged.</p></div><div><p class="fine">Release ee8eb64a0259. Built 2026-10-17.</p></div></footer>`;
writeFileSync(join(OUT, 'hub.html'), page({ title: 'Materials: Filament Atlas', crumbs: '<li><a href="#top" aria-current="page" style="color:var(--ink);font-weight:600">Materials</a></li>', body: hubBody }));
console.log('wrote', OUT, { paged, listed, rows: rows.length, cmp: cmp.length, open: open.length, none: none.length });
