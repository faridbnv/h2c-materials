/* H2C material pages: the one script, classic (a module script will not load from file://), no library. Every page reads
   in full without it; it adds:
   - the theme button (the selector's choice, localStorage 'h2c-theme');
   - the contents rail's current section;
   - lighting a product across every figure: hover or tap a mark, or a product's row, and its marks stay lit while the
     others fade; a tooltip names it with its value; a click on a mark goes to its row in Products;
   - sorting a table by a column (th[data-sort], each cell's data-v);
   - on a records page, finding records by text and by product (#product=<id> in the address selects one). */
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
  function paintTheme() { if (themeButton) themeButton.textContent = isDark() ? 'Light theme' : 'Dark theme'; }
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

  /* ------------------------------------------------------------ contents: the section in view */
  var tocLinks = $$('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var targets = tocLinks.map(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    var visible = {};
    var current = null;
    var strip = doc.querySelector('.toc');
    var mark = function () {
      var top = null;
      for (var i = 0; i < targets.length; i++) if (visible[targets[i].id]) { top = targets[i].id; break; }
      if (!top || top === current) return;
      current = top;
      tocLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
      var link = byId[top];
      link.setAttribute('aria-current', 'true');
      // The strip below 1,080 px scrolls sideways: keep the current link in sight without moving the page.
      if (strip && strip.scrollWidth > strip.clientWidth + 1) {
        var s = strip.getBoundingClientRect(), r = link.getBoundingClientRect();
        strip.scrollLeft += (r.left - s.left) - (s.width - r.width) / 2;
      }
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      mark();
    }, { rootMargin: '-10% 0px -70% 0px' });
    targets.forEach(function (t) { io.observe(t); });
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
      if (!x.matches('.mk, tr')) return;
      x.classList.add('lit');
      // Drawn last in its plot, so no faded mark covers it.
      if (x.matches('.mk') && x.parentNode.lastElementChild !== x) x.parentNode.appendChild(x);
    });
  }
  function cssEscape(s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }

  function describe(m) {
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
    rest.textContent = (v ? ': ' + v + (unit && v.indexOf(',') < 0 ? ' ' + unit : '') : '') + (bits.length ? ' (' + bits.join('; ') + ')' : '');
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

  // The mark nearest the pointer within 14 px, in the SVG under it: a bigger target than the mark itself.
  function nearest(svg, x, y) {
    var best = null, dist = 14 * 14;
    var marks = svg.querySelectorAll('.mk');
    for (var i = 0; i < marks.length; i++) {
      var r = marks[i].getBoundingClientRect();
      var dx = r.left + r.width / 2 - x, dy = r.top + r.height / 2 - y;
      var d = dx * dx + dy * dy;
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
      if (m) { light(m.getAttribute('data-grade')); showTip(m, ev.clientX, ev.clientY); plot.style.cursor = 'pointer'; }
      else { light(null); hideTip(); plot.style.cursor = ''; }
    });
    plot.addEventListener('pointerleave', function () { light(null); hideTip(); });
    plot.addEventListener('click', function (ev) {
      var svg = ev.target.closest && ev.target.closest('svg');
      var m = svg && nearest(svg, ev.clientX, ev.clientY);
      if (!m) { if (touched) { touched = null; light(null); hideTip(); } return; }
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
  $$('table.products tbody tr[data-grade]').forEach(function (tr) {
    tr.addEventListener('mouseenter', function () { light(tr.getAttribute('data-grade')); });
    tr.addEventListener('mouseleave', function () { light(null); });
  });
  $$('a[data-grade]').forEach(function (a) {
    a.addEventListener('focus', function () { light(a.getAttribute('data-grade')); });
    a.addEventListener('blur', function () { light(null); });
  });
  doc.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { light(null); hideTip(); } });

  /* ------------------------------------------------------------ sorting a table by a column */
  $$('th[data-sort] button').forEach(function (button) {
    button.addEventListener('click', function () {
      var th = button.closest('th');
      var table = th.closest('table');
      var col = Array.prototype.indexOf.call(th.parentNode.children, th);
      var numeric = th.getAttribute('data-sort') === 'num';
      var dir = th.getAttribute('aria-sort') === 'ascending' ? -1 : 1;
      $$('th[aria-sort]', table).forEach(function (x) { x.removeAttribute('aria-sort'); });
      th.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
      var body = table.tBodies[0];
      var rows = Array.prototype.slice.call(body.rows);
      var key = function (tr) {
        var cell = tr.children[col];
        if (!cell) return null;
        var v = cell.getAttribute('data-v');
        if (numeric) return v === '' || v == null ? null : Number(v);
        return (v != null ? v : cell.textContent).trim().toLowerCase();
      };
      rows.sort(function (a, b) {
        var x = key(a), y = key(b);
        if (x === null && y === null) return 0;
        if (x === null) return 1; // a blank cell (not published) sorts last either way
        if (y === null) return -1;
        return (x < y ? -1 : x > y ? 1 : 0) * dir;
      });
      rows.forEach(function (tr) { body.appendChild(tr); });
    });
  });

  /* ------------------------------------------------------------ records: find by text and by product */
  var tools = doc.querySelector('.rec-tools');
  if (tools) {
    tools.hidden = false;
    var input = tools.querySelector('[data-filter]');
    var select = tools.querySelector('[data-product]');
    var shown = tools.querySelector('[data-shown]');
    var rows = $$('table.rec tbody tr:not(.group)');
    var text = null;
    var apply = function () {
      var q = input.value.trim().toLowerCase();
      var g = select.value;
      if (q && !text) text = rows.map(function (tr) { return tr.textContent.toLowerCase(); });
      var n = 0;
      rows.forEach(function (tr, i) {
        var grades = (tr.getAttribute('data-grade') || '').split(' ');
        var ok = (!g || grades.indexOf(g) >= 0) && (!q || text[i].indexOf(q) >= 0);
        tr.hidden = !ok;
        if (ok) n++;
      });
      $$('table.rec tbody').forEach(function (tb) {
        var group = tb.querySelector('tr.group');
        if (group) group.hidden = !tb.querySelector('tr:not(.group):not([hidden])');
      });
      $$('.rec-sec').forEach(function (sec) {
        var all = sec.querySelectorAll('tbody tr:not(.group)').length;
        var vis = sec.querySelectorAll('tbody tr:not(.group):not([hidden])').length;
        var small = sec.querySelector('.rec-title small');
        if (small) {
          if (!small.getAttribute('data-all')) small.setAttribute('data-all', small.textContent);
          small.textContent = q || g ? vis + ' of ' + small.getAttribute('data-all') : small.getAttribute('data-all');
        }
      });
      shown.textContent = q || g ? 'Showing ' + n + ' of ' + rows.length + ' records.' : '';
    };
    var fromHash = function () {
      var m = /^#product=(.+)$/.exec(location.hash);
      if (m) { select.value = decodeURIComponent(m[1]); apply(); }
    };
    input.addEventListener('input', apply);
    select.addEventListener('change', function () {
      var v = select.value;
      if (history.replaceState) history.replaceState(null, '', v ? '#product=' + encodeURIComponent(v) : location.pathname);
      apply();
    });
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }
})();
