/* The lists' script (app/pages/assets/products.src.js), appended to assets/page.js by render.js buildAssets
   (tables-asset.js strips its comments). Without it every list reads in full. It adds:
   - on a Products page, a search over product and maker, and one sort: most documented (the page's own order), by name,
     or by a column in its one direction (a property high first; price and the print settings low first). Sorting by a
     column groups the list, in this order: compared values; values shown and not compared (no stated orientation or
     load, Izod in Charpy's place, a setting from Bambu Lab's guide); products that publish none. The sorted column alone
     draws its values as bars. Sorting never hides a product; the search never reorders; the count says what is shown;
   - on the index, a search over every material's names; a name that is not a material shows where it leads
     ("PLA Matte → PLA") while it matches.
   Filtering only toggles `hidden`; the rows are moved, never rebuilt. */
(function () {
  'use strict';
  var doc = document;
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };
  var terms = function (q) { return q.toLowerCase().split(/\s+/).filter(Boolean); };
  var hasAll = function (t, ts) { for (var i = 0; i < ts.length; i++) if (t.indexOf(ts[i]) < 0) return false; return true; };
  var later = function (f, ms) { var t; return function () { clearTimeout(t); t = setTimeout(f, ms); }; };
  var fmt = function (n) { return n.toLocaleString('en-CA'); };

  /* ---------------------------------------------------------------- a Products page */
  var pl = doc.querySelector('[data-products]');
  var ctl = doc.querySelector('.pl-ctl');
  if (pl && ctl) (function () {
    var body = pl.querySelector('.pl-body');
    var rows = $$(':scope > details.pr', body);
    var words = { groups: {}, dir: {}, noun: ['product', 'products'] };
    try { words = JSON.parse(doc.getElementById('pl-words').textContent); } catch (e) { /* the defaults */ }
    var find = ctl.querySelector('[data-find]'), sel = ctl.querySelector('[data-sortby]'), counter = ctl.querySelector('[data-count]');
    var none = pl.querySelector('[data-none]'), noneQ = pl.querySelector('[data-none-q]'), clear = pl.querySelector('[data-clear]');
    var heads = $$('.pl-h [data-sort]', pl);
    var state = { q: '', sort: 'docs' };
    rows.forEach(function (r, i) { r._i = i; r._q = r.getAttribute('data-q') || ''; r._n = (r.querySelector('.pn-t') || r).textContent.toLowerCase(); });
    ctl.hidden = false;
    var noun = function (n) { return n === 1 ? words.noun[0] : words.noun[1]; };
    var cellOf = function (r, k) { return r.querySelector('.pv[data-k="' + k + '"]'); };
    var num = function (c) { var v = c && c.getAttribute('data-v'); return v == null || v === '' ? null : Number(v); };

    function apply() {
      var k = state.sort, ts = terms(state.q);
      var desc = words.dir[k] === 'desc';
      var ordered, groups = null;
      if (k === 'docs') ordered = rows.slice().sort(function (a, b) { return a._i - b._i; });
      else if (k === 'name') ordered = rows.slice().sort(function (a, b) { return a._n < b._n ? -1 : a._n > b._n ? 1 : a._i - b._i; });
      else {
        groups = [[], [], []];
        rows.forEach(function (r) {
          var c = cellOf(r, k), g = c && c.getAttribute('data-g');
          groups[g === 'c' ? 0 : g === 'o' ? 1 : 2].push({ r: r, v: num(c) });
        });
        var by = function (a, b) {
          if (a.v === null || b.v === null) return a.v === b.v ? a.r._i - b.r._i : a.v === null ? 1 : -1;
          return (desc ? b.v - a.v : a.v - b.v) || a.r._i - b.r._i;
        };
        groups[0].sort(by); groups[1].sort(by);
        groups[2].sort(function (a, b) { return a.r._n < b.r._n ? -1 : a.r._n > b.r._n ? 1 : 0; });
        ordered = [];
      }
      $$('.pl-grp', body).forEach(function (x) { x.remove(); });
      var shown = 0;
      var place = function (r) { var on = !ts.length || hasAll(r._q, ts); r.hidden = !on; if (on) shown++; body.appendChild(r); return on; };
      if (groups) {
        groups.forEach(function (list, gi) {
          var head = null, n = 0;
          if (gi && list.length) {
            var label = (words.groups[k] || [])[gi - 1];
            if (label) { head = doc.createElement('p'); head.className = 'pl-grp'; body.appendChild(head); head._label = label; }
          }
          list.forEach(function (x) { if (place(x.r)) n++; });
          if (head) { if (n) { head.textContent = head._label + ' '; var s = doc.createElement('span'); s.textContent = '(' + fmt(n) + ' ' + noun(n) + ')'; head.appendChild(s); } else head.remove(); }
        });
      } else ordered.forEach(place);
      // The sorted column, and its bars: a value's share of the column's largest, for a property or a price.
      $$('.pv.sorted', pl).forEach(function (c) { c.classList.remove('sorted'); c.style.removeProperty('--w'); });
      if (groups) {
        var cells = $$('.pv[data-k="' + k + '"]', body);
        var max = 0;
        cells.forEach(function (c) { var v = num(c); if (v !== null && v > max) max = v; });
        var bars = (desc || k === 'priceCADkg') && max > 0 && cells.every(function (c) { var v = num(c); return v === null || v >= 0; });
        cells.forEach(function (c) { c.classList.add('sorted'); var v = num(c); if (bars && v !== null) c.style.setProperty('--w', (100 * v / max).toFixed(1) + '%'); });
        var phone = cells.length && cells[0].classList.contains('pv-ph');
        if (phone) pl.removeAttribute('data-extra'); else pl.setAttribute('data-extra', '');
      } else pl.removeAttribute('data-extra');
      heads.forEach(function (b) { var on = b.getAttribute('data-sort') === k; b.setAttribute('aria-pressed', on ? 'true' : 'false'); if (on) b.setAttribute('data-dir', words.dir[k] || 'asc'); });
      if (sel && sel.value !== k) sel.value = k;
      var total = rows.length;
      counter.textContent = ts.length ? fmt(shown) + ' of ' + fmt(total) + ' ' + noun(total) : fmt(total) + ' ' + noun(total);
      none.hidden = shown > 0;
      if (noneQ) noneQ.textContent = state.q.trim();
    }
    var onFind = later(function () { state.q = find.value; apply(); }, 120);
    find.addEventListener('input', onFind);
    if (sel) sel.addEventListener('change', function () { state.sort = sel.value; apply(); });
    heads.forEach(function (b) { b.addEventListener('click', function () { state.sort = b.getAttribute('data-sort'); apply(); }); });
    if (clear) clear.addEventListener('click', function () { find.value = ''; state.q = ''; apply(); find.focus(); });
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === '/' && !(ev.target.closest && ev.target.closest('input, select, textarea'))) { ev.preventDefault(); find.focus(); }
    });
    apply();
  })();

  /* ---------------------------------------------------------------- the index */
  var ix = doc.querySelector('[data-index]');
  var tools = doc.querySelector('.ix-tools');
  if (ix && tools) (function () {
    var input = tools.querySelector('[data-ix-find]'), counter = tools.querySelector('[data-count]');
    var none = doc.querySelector('[data-ix-none]'), noneQ = doc.querySelector('[data-ix-q]');
    var items = $$('[data-q]', ix);
    var names = $$('[data-aliases] [data-q]');
    var blocks = $$('.fam', ix);
    var lines = $$('.ix-line', ix);
    var all = counter.textContent;
    tools.hidden = false;
    function apply() {
      var ts = terms(input.value);
      var n = 0;
      items.forEach(function (x) { var on = !ts.length || hasAll(x.getAttribute('data-q'), ts); x.hidden = !on; if (on && x.hasAttribute('data-mat')) n++; });
      lines.forEach(function (l) { var sp = $$('[data-q]', l); l.hidden = sp.length > 0 && sp.every(function (x) { return x.hidden; }); });
      blocks.forEach(function (b) { b.hidden = !!ts.length && !$$('[data-q]', b).some(function (x) { return !x.hidden; }); });
      var named = 0;
      names.forEach(function (x) { var on = !!ts.length && hasAll(x.getAttribute('data-q'), ts); x.hidden = !on; if (on) named++; });
      counter.textContent = ts.length ? fmt(n) + (n === 1 ? ' material matches' : ' materials match') : all;
      none.hidden = !ts.length || named > 0 || blocks.some(function (b) { return !b.hidden; });
      if (noneQ) noneQ.textContent = input.value.trim();
    }
    input.addEventListener('input', later(apply, 100));
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === '/' && !(ev.target.closest && ev.target.closest('input, select, textarea'))) { ev.preventDefault(); input.focus(); }
    });
  })();
})();
