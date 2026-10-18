/* Filament Atlas material pages: the frame's script (track A of the pages reimagined, 2026-10-17), classic (a module
   script will not load from file://), no library. Every page reads in full without it; it adds:
   - the way back: a tab that came from the selector (?from=<the selector's own hash>, its drawer's "Full page" link or
     its "Material pages" link) keeps that selection in sessionStorage 'atlas-return' and drops it from the address, so a
     copied link never carries it; every [data-return] link then reads "Back to your results" and opens the selector
     with the reader's selection, its drawer on the material of the page in view (the index keeps the stored one).
     Where storage is refused, the selection rides on the internal links instead;
   - the theme button (the selector's choice, localStorage 'h2c-theme');
   - the anchor offset: the measured height of the bar (and of the Products page's sticky controls);
   - the section in view, named in the bar, and its list closing on a choice, Escape or a click outside;
   - a card opened at its anchor (#G… a product, #V… a value in it);
   - lighting: hover or focus anything carrying a product (data-grade) or a material (data-mat), and everything else
     carrying it lights while the rest fades; a figure's mark names itself in a tooltip; a click on a product's mark goes
     to its card on the Products page;
   - copying the citation.
   The Products page's search and sort, and the index's search, follow (assets/products.src.js). */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); };
  var main = doc.querySelector('main[data-page]');
  var kind = main ? main.getAttribute('data-page') : '';
  var material = main ? main.getAttribute('data-material') : null;
  function cssEscape(s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }

  /* ------------------------------------------------------------ the way back to the selector */
  var KEY = 'atlas-return';
  var stored = null, carried = false;
  try {
    var from = new URLSearchParams(location.search).get('from');
    if (from) {
      try { sessionStorage.setItem(KEY, from); stored = from; }
      catch (e) { stored = from; carried = true; }
      if (!carried && history.replaceState) history.replaceState(history.state, '', location.pathname + location.hash);
    } else {
      try { stored = sessionStorage.getItem(KEY); } catch (e) { stored = null; }
    }
  } catch (e) { stored = null; }
  var selection = null;
  if (stored) { try { selection = JSON.parse(stored); } catch (e) { selection = null; } }
  if (selection && typeof selection === 'object') {
    $$('[data-return], [data-return-brand]').forEach(function (a) {
      var base = (a.getAttribute('href') || '').split('#')[0];
      if (!base) return;
      var o = {};
      for (var k in selection) if (Object.prototype.hasOwnProperty.call(selection, k)) o[k] = selection[k];
      if (material && kind !== 'hub') o.m = material;
      a.setAttribute('href', base + '#' + encodeURIComponent(JSON.stringify(o)));
      var long = a.querySelector('.ret-long'), short = a.querySelector('.ret-short');
      if (long) long.textContent = 'Back to your results';
      if (short) short.textContent = 'Results';
    });
    // Storage refused (a file:// page in a browser that gives each file its own origin): the selection travels on.
    if (carried) {
      $$('a[href]').forEach(function (a) {
        var h = a.getAttribute('href');
        if (!h || a.hasAttribute('data-return') || a.hasAttribute('data-return-brand') || /^(#|[a-z]+:|\/|\.\.\/)/i.test(h) || !/\.html(#|$)/.test(h)) return;
        var i = h.indexOf('#');
        a.setAttribute('href', (i < 0 ? h : h.slice(0, i)) + '?from=' + encodeURIComponent(stored) + (i < 0 ? '' : h.slice(i)));
      });
    }
  }

  /* ------------------------------------------------------------ theme */
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  var themeButton = doc.querySelector('[data-theme-toggle]');
  // The selector's words and icons: what a press switches to.
  function paintTheme() {
    if (!themeButton) return;
    var dark = isDark();
    var words = dark ? 'Switch to light theme' : 'Switch to dark theme';
    themeButton.setAttribute('aria-label', words);
    themeButton.setAttribute('title', words);
    var sun = themeButton.querySelector('.theme-sun'), moon = themeButton.querySelector('.theme-moon');
    if (sun) { if (dark) sun.removeAttribute('hidden'); else sun.setAttribute('hidden', ''); }
    if (moon) { if (dark) moon.setAttribute('hidden', ''); else moon.removeAttribute('hidden'); }
  }
  if (themeButton) {
    themeButton.hidden = false;
    paintTheme();
    themeButton.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('h2c-theme', next); } catch (e) { /* private mode */ }
      paintTheme();
    });
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', paintTheme);
    }
  }

  // Printing: the page's address in the print line and at the foot of every printed page, the page number beside it
  // (the stylesheet's @page boxes), and the light theme for the printout, the reader's own back after.
  try {
    var here = location.href.split('#')[0].split('?')[0];
    $$('[data-print-url]').forEach(function (el) { el.setAttribute('data-print-url', here); });
    var ps = doc.createElement('style');
    ps.textContent = '@media print { @page { @bottom-left { content: ' + JSON.stringify(here) + '; } } }';
    doc.head.appendChild(ps);
  } catch (e) { /* the print line keeps the page's path */ }
  var printed = null;
  window.addEventListener('beforeprint', function () { printed = root.getAttribute('data-theme'); root.setAttribute('data-theme', 'light'); });
  window.addEventListener('afterprint', function () { if (printed) root.setAttribute('data-theme', printed); else root.removeAttribute('data-theme'); printed = null; });

  /* ------------------------------------------------------------ the anchor offset */
  var bar = doc.querySelector('.atlas-bar');
  var ctl = doc.querySelector('.pl-ctl');
  var plh = doc.querySelector('.pl-h');
  var GAP = 16;
  function covered() {
    var h = bar ? bar.getBoundingClientRect().height : 0;
    var c = ctl && !ctl.hidden && getComputedStyle(ctl).position === 'sticky' ? ctl.getBoundingClientRect().height : 0;
    return { bar: h, ctl: c };
  }
  function measure() {
    var c = covered();
    root.style.setProperty('--bar-h', c.bar.toFixed(2) + 'px');
    root.style.setProperty('--ctl-h', c.ctl.toFixed(2) + 'px');
    // The Products list's head sticks under them too: what is in a card lands below it.
    if (plh) root.style.setProperty('--plh-h', (getComputedStyle(plh).position === 'sticky' ? plh.getBoundingClientRect().height : 0).toFixed(2) + 'px');
    return c;
  }
  function offset() { var c = covered(); return c.bar + c.ctl + GAP; }
  measure();
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { measure(); });
    if (bar) ro.observe(bar);
    if (ctl) ro.observe(ctl);
  }
  window.addEventListener('resize', measure);

  /* ------------------------------------------------------------ a card opened at its anchor */
  function reveal(scroll) {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id || !/^[\w-]+$/.test(id)) return;
    var t = doc.getElementById(id);
    if (!t) return;
    for (var d = t.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
    if (t.matches('tr')) { $$('tr.hit').forEach(function (x) { x.classList.remove('hit'); }); t.classList.add('hit'); }
    if (scroll) t.scrollIntoView();
  }
  reveal(true);
  window.addEventListener('hashchange', function () { reveal(true); });
  // A page opened at an anchor was scrolled before the faces and the measured offset applied: once they are in, put it right.
  function settle() { measure(); reveal(true); }
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(settle); else window.addEventListener('load', settle);

  /* ------------------------------------------------------------ the section in view, and the bar's list */
  var here = doc.querySelector('.here');
  var hereText = doc.querySelector('[data-here]');
  var links = $$('.here-list a[href^="#"]');
  if (here) {
    here.addEventListener('click', function (ev) { if (ev.target.closest && ev.target.closest('.here-list a')) here.open = false; });
    doc.addEventListener('click', function (ev) { if (here.open && !(ev.target.closest && ev.target.closest('.here'))) here.open = false; });
    doc.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && here.open) { here.open = false; var s = here.querySelector('summary'); if (s) s.focus(); } });
  }
  if (links.length) {
    var targets = links.map(function (a) { return { a: a, el: doc.getElementById(a.getAttribute('href').slice(1)) }; }).filter(function (t) { return t.el; });
    var current = null, pending = false;
    var mark = function () {
      pending = false;
      var line = offset() + Math.min(160, window.innerHeight * 0.25);
      var top = targets[0];
      for (var i = 0; i < targets.length; i++) if (targets[i].el.getBoundingClientRect().top <= line) top = targets[i];
      if (window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 2) top = targets[targets.length - 1];
      if (!top || top === current) return;
      current = top;
      links.forEach(function (a) { a.removeAttribute('aria-current'); });
      top.a.setAttribute('aria-current', 'true');
      // The section's name beside the page's, unless it is the page's own name (the Products page's list).
      var page = here && here.querySelector('summary b');
      if (hereText) hereText.textContent = page && page.textContent === top.a.textContent ? '' : top.a.textContent;
    };
    var onScroll = function () { if (!pending) { pending = true; requestAnimationFrame(mark); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    mark();
  }

  /* ------------------------------------------------------------ lighting a product or a material across the page */
  var names = {};
  var island = doc.getElementById('product-names');
  if (island) { try { names = JSON.parse(island.textContent); } catch (e) { names = {}; } }
  var tip = doc.getElementById('tip');
  var lit = null;
  var keyOf = function (el) { return el.hasAttribute('data-grade') ? 'data-grade' : 'data-mat'; };

  function light(el) {
    var attr = el ? keyOf(el) : null, value = el ? el.getAttribute(attr) : null;
    var id = el ? attr + '=' + value : null;
    if (id === lit) return;
    $$('.lit').forEach(function (x) { x.classList.remove('lit'); });
    lit = id;
    if (!id || !value) { doc.body.classList.remove('lighting'); lit = null; return; }
    doc.body.classList.add('lighting');
    $$('[' + attr + '="' + cssEscape(value) + '"]').forEach(function (x) {
      if (x === main) return;
      x.classList.add('lit');
      // A figure's mark is drawn last in its plot, so no faded mark covers it.
      if (x instanceof SVGElement && x.ownerSVGElement && x.parentNode.lastElementChild !== x) x.parentNode.appendChild(x);
    });
  }

  // A product's mark names the product (the names island), then what the figure says of it (data-t), then its note; a
  // material names itself and what the figure says of it; the print shading says only what it says. data-v is a raw
  // number for the checks and is never printed.
  function describe(m) {
    var b = doc.createElement('b'), rest = doc.createElement('span');
    var t = m.getAttribute('data-t') || '', note = m.getAttribute('data-note') || '';
    if (m.hasAttribute('data-grade')) {
      var grade = m.getAttribute('data-grade');
      b.textContent = names[grade] || m.getAttribute('data-name') || grade;
      rest.textContent = (t ? ': ' + t : '') + (note ? ' (' + note + ')' : '');
      return [b, rest];
    }
    if (m.hasAttribute('data-mat')) {
      b.textContent = m.getAttribute('data-name') || m.getAttribute('data-mat');
      rest.textContent = t ? ': ' + t : '';
      return [b, rest];
    }
    rest.textContent = t + (note ? ' (' + note + ')' : '');
    return [rest];
  }
  function showTip(m, x, y) {
    if (!tip) return;
    tip.textContent = '';
    describe(m).forEach(function (n) { tip.appendChild(n); });
    tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(Math.max(8, x + 14), window.innerWidth - w - 8) + 'px';
    tip.style.top = (y - h - 12 < 8 ? y + 18 : y - h - 12) + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }

  // In a figure: the product's mark nearest the pointer within 14 px (a bigger target than the mark itself; a line is
  // measured to its nearest point), else the material under it, else the print shading under it (a tooltip only).
  var MARKS = '[data-grade], [data-mat]';
  var FIGS = 'figure svg, .dv-fig svg, .fig-plot svg';
  function nearest(svg, x, y) {
    var best = null, dist = 14 * 14;
    var marks = svg.querySelectorAll('.mk[data-grade]');
    for (var i = 0; i < marks.length; i++) {
      var r = marks[i].getBoundingClientRect();
      if (!r.width && !r.height) continue;
      var line = marks[i].matches('line, path, .wb');
      var cx = line ? Math.max(r.left, Math.min(x, r.right)) : r.left + r.width / 2;
      var cy = line ? Math.max(r.top, Math.min(y, r.bottom)) : r.top + r.height / 2;
      var d = (cx - x) * (cx - x) + (cy - y) * (cy - y);
      if (d < dist) { dist = d; best = marks[i]; }
    }
    return best;
  }
  function pick(ev) {
    var svg = ev.target.closest && ev.target.closest('svg');
    if (!svg) return null;
    var m = nearest(svg, ev.clientX, ev.clientY);
    if (m) return { m: m, lights: true };
    var mat = ev.target.closest('[data-mat]');
    if (mat && svg.contains(mat)) return { m: mat, lights: true };
    var tp = ev.target.closest('.tp[data-t]');
    return tp ? { m: tp, lights: false } : null;
  }
  function goTo(m) {
    var grade = m.getAttribute('data-grade');
    if (!grade || m.closest('a[href]')) return false;
    if (kind === 'products' && doc.getElementById(grade)) { location.hash = grade; return true; }
    if (material) { location.href = material + '-products.html#' + encodeURIComponent(grade); return true; }
    return false;
  }
  var touched = null;
  $$(FIGS).forEach(function (svg) {
    if (svg.__lit) return;
    svg.__lit = true;
    svg.addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'touch') return;
      var p = pick(ev);
      if (p) { light(p.lights ? p.m : null); showTip(p.m, ev.clientX, ev.clientY); svg.style.cursor = p.m.hasAttribute('data-grade') ? 'pointer' : 'default'; }
      else { light(null); hideTip(); svg.style.cursor = ''; }
    });
    svg.addEventListener('pointerleave', function () { light(null); hideTip(); });
    svg.addEventListener('click', function (ev) {
      var p = pick(ev);
      if (!p) { if (touched) { touched = null; light(null); hideTip(); } return; }
      var m = p.m, key = (m.getAttribute('data-grade') || m.getAttribute('data-mat') || m.getAttribute('data-t'));
      // On a touch screen the first tap lights the mark and names it; a second tap on a product goes to its card.
      if (ev.pointerType === 'touch' || (ev.pointerType == null && 'ontouchstart' in window)) {
        if (touched !== key) { touched = key; light(p.lights ? m : null); showTip(m, ev.clientX, ev.clientY); return; }
      }
      if (goTo(m)) { touched = null; hideTip(); ev.preventDefault(); }
    });
  });
  // A mark that takes the keyboard's focus names itself too.
  doc.addEventListener('focusin', function (ev) {
    var m = ev.target.closest && ev.target.closest('.mk[data-grade], svg [data-mat]');
    if (!m) return;
    var r = m.getBoundingClientRect();
    showTip(m, r.left + r.width / 2, r.top);
  });
  // Outside the figures: a product's or a material's name, row or link lights its marks while pointed at or focused.
  var outside = function (el) { return el && el.closest && !el.closest(FIGS) ? el.closest(MARKS) : null; };
  doc.addEventListener('pointerover', function (ev) {
    if (ev.pointerType === 'touch') return;
    var el = outside(ev.target);
    if (el && el !== main) light(el);
  });
  doc.addEventListener('pointerout', function (ev) {
    var el = outside(ev.target);
    if (el && !(ev.relatedTarget && el.contains(ev.relatedTarget))) light(null);
  });
  doc.addEventListener('focusin', function (ev) { var el = ev.target.closest && ev.target.closest(MARKS); if (el && el !== main) light(el); });
  doc.addEventListener('focusout', function () { light(null); hideTip(); });
  doc.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { light(null); hideTip(); } });
  var release = function () { if (touched || (tip && !tip.hidden)) { touched = null; light(null); hideTip(); } };
  window.addEventListener('scroll', release, { passive: true });

  /* ------------------------------------------------------------ the first screen's two columns, balanced */
  // On the H2C sits beside the summary. Where its rows run more than 60 px past the summary, they take two columns,
  // unless that leaves the bigger hole the other way; measured once the faces are in, and again on a resize.
  var h2c = doc.querySelector('.first .h2c'), left = doc.querySelector('.first-left');
  function balance() {
    if (!h2c || !left) return;
    h2c.classList.remove('h2c--two', 'h2c--fill');
    var moved = left && left.querySelector('.h2c-foot--left');
    if (moved) { moved.classList.remove('h2c-foot--left'); h2c.appendChild(moved); }
    if (getComputedStyle(h2c.parentNode).gridTemplateColumns.split(' ').length < 2) return;
    var gap = function () { return Math.abs(h2c.getBoundingClientRect().height - left.getBoundingClientRect().height); };
    var foot = h2c.querySelector('.h2c-foot');
    // Three ways to set the card, tried in turn: as it is, its rows in two columns, and those with its closing line on
    // the H2C's limits moved under the summary, where the column has room. The first that leaves no hole over 60 px is
    // kept; failing that, the one with the smallest.
    var set = function (k) {
      h2c.classList.toggle('h2c--two', k > 0);
      if (!foot) return;
      if (k === 2) { foot.classList.add('h2c-foot--left'); left.appendChild(foot); }
      else if (foot.parentNode !== h2c) { foot.classList.remove('h2c-foot--left'); h2c.appendChild(foot); }
    };
    var best = 0, least = Infinity;
    for (var k = 0; k <= (foot ? 2 : 1); k++) {
      set(k);
      var g = gap();
      if (g <= 60) { best = k; least = g; break; }
      if (g < least) { best = k; least = g; }
    }
    set(best);
    // A card left a little shorter than the summary takes the column's height, its rows spaced to fill it: no hole
    // beside the summary. A large shortfall is left as it is, rather than rows set far apart.
    var short = left.getBoundingClientRect().height - h2c.getBoundingClientRect().height;
    if (short > 24 && short <= 120) h2c.classList.add('h2c--fill');
  }
  if (h2c && left) {
    balance();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(balance);
    window.addEventListener('resize', balance);
    window.addEventListener('beforeprint', balance);
  }

  /* ------------------------------------------------------------ a data table's cells named, for the phone */
  // On a phone (frame.src.css) a table.grid stacks each row as label/value pairs, the label a cell's data-label. A cell
  // its table did not name takes its column's heading (the last header row, its colspans counted).
  $$('table.grid').forEach(function (t) {
    var rows = t.tHead ? t.tHead.rows : [];
    if (!rows.length) return;
    var names = [];
    Array.prototype.forEach.call(rows[rows.length - 1].cells, function (th) {
      for (var i = 0; i < (th.colSpan || 1); i++) names.push(th.textContent.replace(/\s+/g, ' ').trim());
    });
    // A first header row whose cells span the second (a group over its columns) lends its words where the last is blank.
    if (rows.length > 1) {
      var top = [], k = 0;
      Array.prototype.forEach.call(rows[0].cells, function (th) { for (var i = 0; i < (th.colSpan || 1); i++) top[k++] = { text: th.textContent.replace(/\s+/g, ' ').trim(), rows: th.rowSpan || 1 }; });
      var j = 0;
      names = top.map(function (x) { return x.rows > 1 ? x.text : (x.text + (names[j] ? ' ' + names[j++] : '')).trim(); });
    }
    Array.prototype.forEach.call(t.tBodies, function (b) {
      Array.prototype.forEach.call(b.rows, function (tr) {
        var col = 0;
        Array.prototype.forEach.call(tr.cells, function (cell) {
          if (!cell.hasAttribute('data-label') && names[col] && cell.colSpan === 1 && col > 0) cell.setAttribute('data-label', names[col]);
          col += cell.colSpan || 1;
        });
      });
    });
  });

  /* ------------------------------------------------------------ copying the citation */
  $$('[data-copy]').forEach(function (b) {
    var text = doc.querySelector('[data-cite]');
    if (!text || !navigator.clipboard) return;
    b.hidden = false;
    var words = b.querySelector('span');
    b.addEventListener('click', function () {
      navigator.clipboard.writeText(text.textContent).then(function () {
        if (!words) return;
        words.textContent = 'Copied';
        setTimeout(function () { words.textContent = 'Copy the citation'; }, 2000);
      }, function () { /* refused: the citation stays on the page to select */ });
    });
  });
})();
