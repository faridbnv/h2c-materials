/* Filament Atlas material pages: the one script, classic (a module script will not load from file://), no library.
   Every page reads in full without it; it adds:
   - the theme button (the selector's choice, localStorage 'h2c-theme');
   - the anchor offset: the measured height of the sticky top bar (and of the section strip, below 1,080 px), set as
     --head-h and --strip-h, so every contents link and figure link lands with its heading in full below them;
   - the contents' current section, read against that same offset;
   - lighting a product across every figure: hover or tap a mark, a window, or a product's row, and its marks stay lit
     while the others fade; a tooltip names it with its value; a click on a mark goes to its row in Products; another
     material's point on a map names that material;
   Sorting, searching and filtering the Products table and the records page are the tables script's, appended after
   this one (assets/tables.src.js). */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); };

  /* ------------------------------------------------------------ theme */
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  var themeButton = doc.querySelector('[data-theme-toggle]');
  function paintTheme() {
    if (!themeButton) return;
    var words = isDark() ? 'Light theme' : 'Dark theme';
    var span = themeButton.querySelector('.theme-words');
    if (span) span.textContent = words; else themeButton.textContent = words;
    themeButton.setAttribute('aria-label', words);
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

  /* ------------------------------------------------------------ the anchor offset: what the sticky bar and strip cover */
  var bar = doc.querySelector('.topbar');
  var strip = doc.querySelector('.toc');
  var GAP = 16;
  var isStrip = function () { return !!strip && getComputedStyle(strip).getPropertyValue('--is-strip').trim() === '1'; };
  function covered() {
    var h = bar ? bar.getBoundingClientRect().height : 0;
    var s = isStrip() ? strip.getBoundingClientRect().height : 0;
    return { head: h, strip: s };
  }
  function measure() {
    var c = covered();
    root.style.setProperty('--head-h', c.head.toFixed(2) + 'px');
    root.style.setProperty('--strip-h', c.strip.toFixed(2) + 'px');
    return c;
  }
  /** Where a heading should sit after a jump: below the bar and the strip, by the gap. */
  function offset() { var c = covered(); return c.head + c.strip + GAP; }
  measure();
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { measure(); });
    if (bar) ro.observe(bar);
    if (strip) ro.observe(strip);
  }
  window.addEventListener('resize', measure);
  // A page opened at an anchor was scrolled before the measured offset applied: once the faces are in, put it right.
  function settle() {
    measure();
    var id = decodeURIComponent(location.hash.slice(1));
    var t = id && /^[\w-]+$/.test(id) ? doc.getElementById(id) : null;
    if (t) t.scrollIntoView();
  }
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(settle); else window.addEventListener('load', settle);

  /* ------------------------------------------------------------ contents: the section in view */
  var tocLinks = $$('.toc a[href^="#"]');
  if (tocLinks.length) {
    var targets = tocLinks.map(function (a) { return { a: a, el: doc.getElementById(a.getAttribute('href').slice(1)) }; }).filter(function (t) { return t.el; });
    var current = null;
    var pending = false;
    var mark = function () {
      pending = false;
      // The last section whose heading has come into the upper part of the view, below the bar: the line a jump puts
      // headings on, and a reading margin under it, so a section is current as soon as its heading is read, not only
      // once it reaches the bar.
      var line = offset() + Math.min(160, window.innerHeight * 0.25);
      var top = targets[0];
      for (var i = 0; i < targets.length; i++) if (targets[i].el.getBoundingClientRect().top <= line) top = targets[i];
      // At the foot of the page the last section is current, however short it is.
      if (window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 2) top = targets[targets.length - 1];
      if (!top || top === current) return;
      current = top;
      tocLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
      top.a.setAttribute('aria-current', 'true');
      // The strip below 1,080 px scrolls sideways: keep the current link in sight without moving the page.
      if (strip && strip.scrollWidth > strip.clientWidth + 1) {
        var s = strip.getBoundingClientRect(), r = top.a.getBoundingClientRect();
        strip.scrollLeft += (r.left - s.left) - (s.width - r.width) / 2;
      }
    };
    var onScroll = function () { if (!pending) { pending = true; requestAnimationFrame(mark); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    mark();
  }

  /* ------------------------------------------------------------ products lit across the figures */
  var names = {};
  var island = doc.getElementById('product-names');
  if (island) { try { names = JSON.parse(island.textContent); } catch (e) { names = {}; } }
  var tip = doc.getElementById('tip');
  var lit = null;
  var KIND = { 'mk--annealed': 'measured after annealing', 'mk--variant': 'special formulation, not in the median', 'mk--claimed': 'sold as toughened (the maker\'s statement)' };

  function light(grade) {
    if (grade === lit) return;
    $$('.lit').forEach(function (x) { x.classList.remove('lit'); });
    lit = grade;
    if (!grade) { doc.body.classList.remove('lighting'); return; }
    doc.body.classList.add('lighting');
    $$('[data-grade="' + cssEscape(grade) + '"]').forEach(function (x) {
      if (!x.matches('.mk, .wb, tr, li')) return;
      x.classList.add('lit');
      // Drawn last in its plot, so no faded mark covers it.
      if (x.matches('.mk, .wb') && x.parentNode.lastElementChild !== x) x.parentNode.appendChild(x);
    });
  }
  function cssEscape(s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }

  function describe(m) {
    if (m.matches('.cx')) {
      var nb = doc.createElement('b');
      nb.textContent = m.getAttribute('data-name') || '';
      var nv = doc.createElement('span');
      nv.textContent = ': typically ' + (m.getAttribute('data-v') || '');
      return [nb, nv];
    }
    var grade = m.getAttribute('data-grade');
    var row = m.closest('[data-unit]');
    var unit = row ? row.getAttribute('data-unit') : '';
    var v = m.getAttribute('data-v') || '';
    var bits = [];
    if (m.classList.contains('mk--open')) bits.push((row && row.getAttribute('data-open')) || 'not compared');
    Object.keys(KIND).forEach(function (k) { if (m.classList.contains(k)) bits.push(KIND[k]); });
    var from = m.getAttribute('data-from');
    if (from) bits.push(from);
    var b = doc.createElement('b');
    b.textContent = names[grade] || grade;
    var rest = doc.createElement('span');
    rest.textContent = (v ? ': ' + v + (unit && v.indexOf(',') < 0 && v.indexOf(unit) < 0 ? ' ' + unit : '') : '') + (bits.length ? ' (' + bits.join('; ') + ')' : '');
    return [b, rest];
  }
  function showTip(m, x, y) {
    if (!tip) return;
    tip.textContent = '';
    describe(m).forEach(function (n) { tip.appendChild(n); });
    tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(Math.max(8, x + 14), window.innerWidth - w - 8);
    var top = y - h - 12 < 8 ? y + 18 : y - h - 12;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }

  // The mark nearest the pointer within 14 px, in the SVG under it: a bigger target than the mark itself. A window (a
  // line) is measured to its nearest point, so it is as easy to reach at its ends as in its middle. Another material's
  // point on a map is reached the same way, a little less eagerly than this material's own marks.
  function nearest(svg, x, y) {
    var best = null, dist = 14 * 14;
    var marks = svg.querySelectorAll('.mk, .wb, .cx');
    for (var i = 0; i < marks.length; i++) {
      var r = marks[i].getBoundingClientRect();
      var cx = Math.max(r.left, Math.min(x, r.right)), cy = Math.max(r.top, Math.min(y, r.bottom));
      var dx = cx - x, dy = cy - y;
      if (!marks[i].matches('.wb')) { dx = r.left + r.width / 2 - x; dy = r.top + r.height / 2 - y; }
      var d = dx * dx + dy * dy + (marks[i].matches('.cx') ? 30 : 0);
      if (d < dist) { dist = d; best = marks[i]; }
    }
    return best;
  }
  var touched = null;
  $$('.fig-plot').forEach(function (plot) {
    plot.addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'touch') return;
      var svg = ev.target.closest && ev.target.closest('svg');
      var m = svg && nearest(svg, ev.clientX, ev.clientY);
      if (m) { light(m.getAttribute('data-grade')); showTip(m, ev.clientX, ev.clientY); plot.style.cursor = m.matches('.cx') ? 'default' : 'pointer'; }
      else { light(null); hideTip(); plot.style.cursor = ''; }
    });
    plot.addEventListener('pointerleave', function () { light(null); hideTip(); });
    plot.addEventListener('click', function (ev) {
      var svg = ev.target.closest && ev.target.closest('svg');
      var m = svg && nearest(svg, ev.clientX, ev.clientY);
      if (!m) { if (touched) { touched = null; light(null); hideTip(); } return; }
      if (m.matches('.cx')) { showTip(m, ev.clientX, ev.clientY); return; }
      var grade = m.getAttribute('data-grade');
      // On a touch screen the first tap lights the product and names it; a second tap on it goes to its row.
      if (ev.pointerType === 'touch' || (ev.pointerType == null && 'ontouchstart' in window && touched !== grade)) {
        if (touched !== grade) { touched = grade; light(grade); showTip(m, ev.clientX, ev.clientY); return; }
      }
      var row = doc.getElementById('product-' + grade);
      if (row) { touched = null; hideTip(); location.hash = 'product-' + grade; }
    });
  });
  // A product's row in a table, or its name, lights its marks.
  $$('table[data-products] tbody tr[data-grade], .db-names li[data-grade]').forEach(function (tr) {
    tr.addEventListener('mouseenter', function () { light(tr.getAttribute('data-grade')); });
    tr.addEventListener('mouseleave', function () { light(null); });
  });
  $$('a[data-grade]').forEach(function (a) {
    a.addEventListener('focus', function () { light(a.getAttribute('data-grade')); });
    a.addEventListener('blur', function () { light(null); });
  });
  doc.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { light(null); hideTip(); } });
  // A tapped product stays lit only while the reader looks at it: a scroll, or a tap anywhere outside a figure, lets it go.
  var release = function () { if (touched || (tip && !tip.hidden)) { touched = null; light(null); hideTip(); } };
  window.addEventListener('scroll', release, { passive: true });
  doc.addEventListener('click', function (ev) { if (!(ev.target.closest && ev.target.closest('.fig-plot'))) release(); });

})();
