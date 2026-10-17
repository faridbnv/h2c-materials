/* The tables' script (app/pages/assets/tables.src.js), appended to assets/page.js by render.js buildAssets with
   format.js's fmtNumber in place of the marker below, so a number written here reads as every other. Without it every
   table reads in full. It adds: in Products, the search, toggles, sorting and a product's card (built from the
   #product-cards island when its row first opens; #product-<id> opens one); on a records page, the finder (search,
   type, product, document, orientation, property; each choice counted for the others; kept in the address as
   #type=…&property=…&orientation=…&product=…&doc=…&q=…), each group's counts, median and range for what it lists, and
   "Show all". Filtering only toggles `hidden` and classes; nothing is rebuilt. */
(() => {
  'use strict';
  var doc = document;
  var fmtNumber = /* fmtNumber */ null;
  var $$ = (s, el) => Array.from((el || doc).querySelectorAll(s));
  var count = (n, w) => fmtNumber(n) + ' ' + (n === 1 ? w : w + 's');
  var esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  var sel = s => window.CSS && CSS.escape ? CSS.escape(s) : s;
  var at = (el, a) => el.getAttribute(a);
  var terms = q => q.toLowerCase().split(/\s+/).filter(Boolean);
  var hasAll = (t, ts) => ts.every(x => t.indexOf(x) >= 0);
  var later = (f, ms) => { var t; return () => { clearTimeout(t); t = setTimeout(f, ms); }; };
  var order = (a, b, dir) => a === null || b === null ? (a === b ? 0 : a === null ? 1 : -1) : (a < b ? -1 : a > b ? 1 : 0) * dir;

  // ---------------------------------------------------------------- Products
  var pt = doc.querySelector('table[data-products]');
  if (pt) (table => {
    var sec = table.closest('section') || doc, CAP = 25, all = false;
    var find = sec.querySelector('[data-find]'), toggles = $$('[data-t]', sec), more = sec.querySelector('[data-more]');
    var bodies = Array.from(table.tBodies);
    var nameOf = b => b.rows[0].querySelector('.pn').textContent.toLowerCase() + ' ' + (at(b.rows[0].querySelector('.px'), 'title') || '').toLowerCase();
    // Each product's words to search, kept on its own rows, so a sort that moves them moves its words with them.
    bodies.forEach(b => b.q = nameOf(b));
    var data = null;
    try { data = JSON.parse(doc.getElementById('product-cards').textContent); } catch (e) { data = null; }
    $$('.pt-tools', sec).forEach(t => t.hidden = false);
    table.classList.add('ready');

    function card(b) {
      var id = at(b.rows[0], 'data-grade'), d = data && data.cards[id];
      if (!d || b.rows[1]) return;
      var w = data.words, S = data.strings, sets = [], by = {}, i, html = '', print = '';
      for (i = 0; i < d[1].length; i += 3) {
        if (!by[d[1][i + 2]]) { by[d[1][i + 2]] = []; sets.push(d[1][i + 2]); }
        by[d[1][i + 2]].push('<dt>' + esc(S[d[1][i]]) + '</dt><dd>' + esc(d[1][i + 1]) + '</dd>');
      }
      var none = t => '<p class="pc-none">' + esc(t) + '</p>';
      var small = t => t ? '<small>' + esc(t) + '</small>' : '';
      var link = (h, t) => '<a href="' + esc(data.records + '#' + h + 'product=' + encodeURIComponent(id)) + '">' + esc(t) + '</a>';
      for (i = 0; d[2] && i < d[2].length; i += 3) print += '<dt>' + esc(S[d[2][i]]) + '</dt><dd>' + esc(d[2][i + 1]) + small(S[d[2][i + 2]]) + '</dd>';
      html = '<p class="pc-name">' + esc(d[5]) + '</p>' + (d[0] ? '<p class="pc-notes">' + esc(d[0]) + '</p>' : '') + '<div class="pc-vals"><p class="pc-h">' + esc(w.values) + '</p>'
        + (sets.length ? sets.map(k => '<div class="pc-set"><dl>' + by[k].join('') + '</dl>' + (S[k] ? '<p>' + esc(S[k]) + '</p>' : '') + '</div>').join('') : none(w.noValues))
        + '</div><div class="pc-side"><p class="pc-h">' + esc(w.print) + '</p>' + (print ? '<dl class="pc-print">' + print + '</dl>' : none(w.noPrint))
        + (d[3] ? '<dl class="pc-print"><dt>' + esc(w.price) + '</dt><dd>' + esc(d[3][0]) + small(d[3][1]) + '</dd></dl>' : '')
        + '<p class="pc-h">' + esc(w.records) + '</p><p class="pc-links">'
        + w.types.map((t, j) => d[4][j] ? link('type=' + t[0] + '&', count(d[4][j], t[1])) : '').join('') + link('', w.every) + '</p></div>';
      var tr = doc.createElement('tr');
      tr.className = 'pc-row';
      tr.innerHTML = '<td colspan="' + data.ncol + '"><div class="pc">' + html + '</div></td>';
      b.appendChild(tr);
    }
    function open(tr, on) { var i = tr.querySelector('.px input'); if (i) { i.checked = on; if (on) card(tr.parentNode); } }
    table.addEventListener('change', ev => { if (ev.target.checked) card(ev.target.closest('tbody')); });
    table.addEventListener('click', ev => {
      var tr = ev.target.closest('tbody > tr:first-child');
      if (tr && !ev.target.closest('a, button, label, input') && !String(window.getSelection())) open(tr, !tr.querySelector('.px input').checked);
    });

    // What is listed: every product the search and toggles let through, the first 25 in the current order unless all.
    function apply() {
      var ts = terms(find ? find.value : ''), on = toggles.filter(t => t.checked), n = 0;
      bodies.forEach(b => {
        var ok = hasAll(b.q, ts) && on.every(t => b.hasAttribute('data-' + at(t, 'data-t')));
        if (b.hidden === ok) b.hidden = !ok;
        if (ok) b.classList.toggle('c', !all && n >= CAP);
        if (ok) n++;
      });
      var shown = sec.querySelector('[data-shown]'), none = sec.querySelector('[data-none]');
      if (shown) shown.textContent = n === bodies.length ? count(n, 'product') : 'Showing ' + fmtNumber(n) + ' of ' + count(bodies.length, 'product');
      if (none) none.hidden = n > 0;
      if (more) { more.parentNode.hidden = n <= CAP; more.textContent = all ? 'Show the first ' + CAP : 'Show all ' + fmtNumber(n); }
    }
    if (more) more.addEventListener('click', () => { all = !all; apply(); });
    function sort(i, dir) {
      var ths = $$('thead th[data-i="' + i + '"]', table), btn = ths[0] && ths[0].querySelector('button');
      if (!btn) return;
      var num = at(btn, 'data-sort') === 'num';
      $$('thead [aria-sort]', table).forEach(x => x.removeAttribute('aria-sort'));
      ths.forEach(th => th.setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending'));
      var val = b => {
        var c = b.rows[0].cells[i], v = at(c, 'data-v');
        if (!num) return b.q;
        if (v == null) { v = /(\d+(?:\.\d+)?)(?!.*\d)/.exec(c.textContent.replace(/,/g, '')); v = v ? v[1] : ''; }
        return v === '' ? null : Number(v);
      };
      bodies.sort((a, b) => order(val(a), val(b), dir)).forEach(b => table.appendChild(b));
      apply();
    }
    $$('thead button[data-sort]', table).forEach(b => b.addEventListener('click', () => {
      var th = b.closest('th'), now = at(th, 'aria-sort');
      sort(at(th, 'data-i'), now ? (now === 'ascending' ? -1 : 1) : at(b, 'data-first') === 'asc' ? 1 : -1);
    }));
    if (find) find.addEventListener('input', later(apply, 80));
    toggles.forEach(t => t.addEventListener('change', apply));

    // "Columns": the four values a two-line row shows; a fifth chosen lets go of the one chosen longest ago.
    var picks = $$('.pt-cols input', sec), chosen = picks.filter(p => p.checked);
    picks.forEach(p => p.addEventListener('change', () => {
      chosen = chosen.filter(x => x !== p);
      if (p.checked) chosen.push(p);
      if (chosen.length > 4) chosen.shift().checked = false;
      var set = chosen.map(x => at(x, 'data-c'));
      $$('thead .pt-p th[data-i]', table).concat(...bodies.map(b => Array.from(b.rows[0].cells))).forEach(c => {
        var i = at(c, 'data-i') || String(c.cellIndex);
        if (+i > 1) c.classList.toggle('on', set.indexOf(i) >= 0);
      });
    }));

    // #product-<id> (a figure's mark leads there): its row, shown and opened.
    function fromHash() {
      var m = /^#product-(.+)$/.exec(location.hash), tr = m && doc.getElementById('product-' + decodeURIComponent(m[1]));
      if (!tr || !table.contains(tr)) return;
      if (tr.parentNode.hidden || tr.parentNode.classList.contains('c')) { if (find) find.value = ''; toggles.forEach(t => t.checked = false); all = true; apply(); }
      open(tr, true);
      tr.scrollIntoView({ block: 'center' });
    }
    window.addEventListener('hashchange', fromHash);
    apply();
    fromHash();
  })(pt);

  // ---------------------------------------------------------------- the records page
  var rf = doc.querySelector('.rf');
  if (rf) (panel => {
    var main = panel.parentNode, F = ['type', 'property', 'orientation'], P = ['product', 'doc'];
    var q = panel.querySelector('[data-f="q"]'), details = panel.querySelector('details'), clear = panel.querySelector('[data-clear]');
    var total = Number(at(panel, 'data-total')), boxes = {}, pick = {}, names = {}, state;
    var blank = () => ({ q: '', type: [], property: [], orientation: [], product: '', doc: '' });
    panel.hidden = false;
    $$('.rec-tools').forEach(x => x.hidden = true);
    F.forEach(f => boxes[f] = $$('input[data-f="' + f + '"]', panel));
    // An orientation chip stands for the stated orientations it groups (XY with the sheets' words for a flat bar).
    var codes = {};
    boxes.orientation.forEach(b => codes[b.value] = (at(b, 'data-codes') || b.value).split(' '));
    P.forEach(f => {
      var input = panel.querySelector('input[data-f="' + f + '"]');
      if (!input) return;
      var p = pick[f] = { input: input, byName: {}, byId: {}, x: panel.querySelector('[data-x="' + f + '"]') };
      $$('option', doc.getElementById(at(input, 'list'))).forEach(o => { p.byName[o.value.toLowerCase()] = at(o, 'data-id'); p.byId[at(o, 'data-id')] = o.value; });
    });
    boxes.property.forEach(b => {
      [b.parentNode.querySelector('span').textContent].concat((at(b, 'data-also') || '').split('|')).forEach(k => { if (k) (names[k.toLowerCase()] = names[k.toLowerCase()] || []).push(b.value); });
    });

    // Every record row, read once.
    var groups = $$('.rs .rg'), rows = [];
    groups.forEach(g => {
      var type = at(g.closest('.rs'), 'data-type'), unit = at(g, 'data-unit'), label = at(g, 'data-group') || '';
      g.rs = [];
      $$('tbody > tr:not(.gr)', g).forEach(tr => {
        var a = tr.querySelector('td.src a[href^="#doc-"]');
        var r = { tr: tr, type: type, prop: at(g, 'data-prop'), o: at(tr, 'data-o'), grades: (at(tr, 'data-grade') || '').split(' '),
          sid: at(tr, 'data-sid') || (a && decodeURIComponent(at(a, 'href').slice(5))), u: at(tr, 'data-u') || unit,
          n: tr.hasAttribute('data-n') ? Number(at(tr, 'data-n')) : null, label: (at(tr.parentNode, 'data-group') || label).toLowerCase(), on: true };
        rows.push(r);
        g.rs.push(r);
      });
    });
    var secs = $$('.rs').map(s => { var n = s.querySelector('.rs-n'); return { el: s, n: n, all: Number(at(n, 'data-n')), noun: at(n, 'data-noun') }; });

    function read() {
      state.q = q.value.trim();
      F.forEach(f => state[f] = boxes[f].filter(b => b.checked).map(b => b.value));
      P.forEach(f => { if (pick[f]) { var v = pick[f].input.value.trim().toLowerCase(); state[f] = v ? pick[f].byName[v] || state[f] : ''; } });
    }
    function show() {
      q.value = state.q;
      F.forEach(f => { boxes[f].forEach(b => { b.checked = state[f].indexOf(b.value) >= 0; if (b.checked && b.closest('details.rf-other')) b.closest('details').open = true; }); });
      P.forEach(f => { if (pick[f]) pick[f].input.value = state[f] ? pick[f].byId[state[f]] || '' : ''; });
    }
    function apply(write) {
      var ts = terms(state.q), tally = { type: {}, property: {}, orientation: {} }, n = 0, oSel = [];
      state.orientation.forEach(v => oSel = oSel.concat(codes[v] || [v]));
      var inF = (f, v) => !state[f].length || (f === 'orientation' ? oSel : state[f]).indexOf(v) >= 0;
      var add = (f, v) => tally[f][v] = (tally[f][v] || 0) + 1;
      rows.forEach(r => {
        if (ts.length && !r.text) r.text = r.label + ' ' + r.tr.textContent.toLowerCase();
        var base = (!ts.length || hasAll(r.text, ts)) && (!state.product || r.grades.indexOf(state.product) >= 0) && (!state.doc || r.sid === state.doc);
        var m = r.type === 'measurements', t = inF('type', r.type);
        var p = !state.property.length || (m && inF('property', r.prop)), o = !state.orientation.length || (m && inF('orientation', r.o));
        if (base && p && o) add('type', r.type);
        if (base && t && o && m) add('property', r.prop);
        if (base && t && p && m && r.o) add('orientation', r.o);
        var on = base && t && p && o;
        if (on !== r.on) { r.tr.hidden = !on; r.on = on; }
        if (on) n++;
      });
      var filtered = n !== total;
      groups.forEach(g => place(g, filtered));
      // The maintainers' notes open when what is asked for is among them.
      $$('.rs-maint', main).forEach(d => { if (filtered) d.open = !!d.querySelector('tbody tr:not(.gr):not([hidden])'); });
      secs.forEach(s => {
        var k = tally.type[at(s.el, 'data-type')] || 0;
        if (state.type.length && state.type.indexOf(at(s.el, 'data-type')) < 0) k = 0;
        s.el.hidden = !k && filtered;
        s.n.textContent = k === s.all ? count(k, s.noun) : fmtNumber(k) + ' of ' + count(s.all, s.noun);
        $$('.dom', s.el).forEach(d => d.hidden = !d.querySelector('.rg:not([hidden])'));
      });
      F.forEach(f => {
        boxes[f].forEach(b => { var k = (f === 'orientation' ? codes[b.value] : [b.value]).reduce((n, v) => n + (tally[f][v] || 0), 0); b.parentNode.querySelector('[data-k]').textContent = fmtNumber(k); b.parentNode.classList.toggle('zero', !k); });
      });
      var on = state.type.length + state.property.length + state.orientation.length + (state.product ? 1 : 0) + (state.doc ? 1 : 0);
      panel.querySelector('[data-on]').textContent = on ? on : '';
      clear.hidden = !on && !state.q;
      P.forEach(f => { if (pick[f] && pick[f].x) pick[f].x.hidden = !pick[f].input.value; });
      panel.querySelector('[data-shown]').textContent = filtered ? 'Showing ' + fmtNumber(n) + ' of ' + count(total, 'record') : count(total, 'record');
      var empty = main.querySelector('.rf-none');
      if (!n && !empty) {
        empty = doc.createElement('p');
        empty.className = 'rf-none';
        empty.textContent = 'No record matches. Clear the search or a filter to see more.';
        main.insertBefore(empty, secs[0] ? secs[0].el : null);
      }
      if (empty) empty.hidden = n > 0;
      if (write) writeHash();
    }
    // A group: hidden when it lists nothing; its first rows shown, the rest behind "Show all"; its counts and, per unit,
    // the median and range of what it lists, in records/common.js statsWords' words.
    function place(g, filtered) {
      var cap = Number(at(g, 'data-cap')), listed = g.rs.filter(r => r.on), i = 0;
      g.hidden = !listed.length;
      if (!listed.length) return;
      $$('tbody > tr:not(.gr)', g).forEach(tr => { if (!tr.hidden) tr.classList.toggle('c', i++ >= cap); });
      $$('tbody[data-group]', g).forEach(tb => tb.hidden = !tb.querySelector('tr:not(.gr):not([hidden])'));
      var more = g.querySelector('[data-more]');
      if (more) { more.textContent = 'Show all ' + fmtNumber(listed.length); more.parentNode.hidden = listed.length <= cap; }
      var stats = g.querySelector('[data-stats]');
      if (!stats || !(filtered || stats.done)) return;
      var noun = at(g.closest('.rs').querySelector('.rs-n'), 'data-noun'), all = g.rs.length, units = [], by = {};
      var html = '<span>' + esc(listed.length === all ? count(all, noun) : fmtNumber(listed.length) + ' of ' + count(all, noun)) + '</span>';
      listed.forEach(r => { if (r.n === null) return; if (!by[r.u]) { by[r.u] = []; units.push(r.u); } by[r.u].push(r.n); });
      units.forEach(u => {
        var s = by[u].sort((a, b) => a - b), mid = s.length >> 1, unit = !u || u === 'Dimensionless' ? '' : ' ' + u;
        if (s.length > 1) html += '<span>median ' + esc(fmtNumber(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2) + unit) + '</span>' + (s[0] === s[s.length - 1] ? '' : '<span>range ' + esc(fmtNumber(s[0]) + '–' + fmtNumber(s[s.length - 1]) + unit) + '</span>');
      });
      stats.innerHTML = html;
      stats.done = true;
    }

    function writeHash() {
      var parts = [];
      F.forEach(f => { state[f].forEach(v => parts.push(f + '=' + encodeURIComponent(v))); });
      ['product', 'doc', 'q'].forEach(f => { if (state[f]) parts.push(f + '=' + encodeURIComponent(state[f])); });
      var h = parts.length ? '#' + parts.join('&') : '';
      if (h !== location.hash) history.replaceState(null, '', h || location.pathname + location.search);
    }
    // A property in a link may be its stored name, its name on the page, a key property's name without its orientation
    // ("Tensile strength": yield, break and unspecified), or the start of stored names ("Tensile").
    function props(v) {
      var low = v.toLowerCase(), all = boxes.property.map(b => b.value);
      if (all.indexOf(v) >= 0) return [v];
      if (names[low]) return names[low];
      var some = all.filter(p => p.toLowerCase().indexOf(low) === 0);
      return some.length ? some : [v];
    }
    function fromHash() {
      var h = location.hash.slice(1);
      if (h.indexOf('=') < 0) return reveal(h);
      state = blank();
      h.split('&').forEach(kv => {
        var i = kv.indexOf('='), k = kv.slice(0, i), v;
        try { v = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); } catch (e) { return; }
        if (k === 'orientation' && !codes[v]) v = Object.keys(codes).find(c => codes[c].indexOf(v) >= 0) || v;
        if (F.indexOf(k) >= 0) (k === 'property' ? props(v) : [v]).forEach(x => { if (state[k].indexOf(x) < 0) state[k].push(x); });
        else if (k in state) state[k] = v;
      });
      if (state.product && pick.product && !pick.product.byId[state.product]) state.product = pick.product.byName[state.product.toLowerCase()] || state.product;
      show();
      apply(false);
      var first = main.querySelector('.rs:not([hidden])');
      if (first) first.scrollIntoView();
    }
    // A plain anchor (#doc-…, #profile-…, #measurements-thermal) is shown even where a filter or a cap hid it.
    function reveal(id) {
      var el = id && doc.getElementById(decodeURIComponent(id));
      if (!el || !main.contains(el)) return;
      if (el.closest('[hidden]')) { state = blank(); show(); apply(true); }
      if (el.closest('details:not([open])')) el.closest('details').open = true;
      if (el.matches('tr.c')) el.closest('.rg').querySelector('.rg-more input').checked = true;
      el.scrollIntoView({ block: el.matches('tr') ? 'center' : 'start' });
    }

    var change = () => { read(); apply(true); };
    q.addEventListener('input', later(change, 120));
    F.forEach(f => { boxes[f].forEach(b => b.addEventListener('change', change)); });
    P.forEach(f => {
      var p = pick[f];
      if (!p) return;
      p.input.addEventListener('input', () => { var v = p.input.value.trim().toLowerCase(); if (!v || p.byName[v]) { state[f] = ''; change(); } });
      p.input.addEventListener('change', change);
      if (p.x) p.x.addEventListener('click', () => { p.input.value = ''; state[f] = ''; change(); p.input.focus(); });
    });
    clear.addEventListener('click', () => { state = blank(); show(); apply(true); });

    // The finder's bar, where it sits above the results, is what the groups' heads stick under; on a laptop it is a
    // column, always open.
    var small = window.matchMedia('(max-width: 1099px)');
    function bar() {
      var on = panel.getBoundingClientRect().width > main.clientWidth * .6;
      doc.documentElement.style.setProperty('--rf-h', on ? panel.querySelector('.rf-bar').getBoundingClientRect().height + 17 + 'px' : '0px');
    }
    function layout() { if (details) details.open = !small.matches; bar(); }
    if (small.addEventListener) small.addEventListener('change', layout);
    window.addEventListener('resize', later(bar, 150));
    window.addEventListener('hashchange', fromHash);
    layout();
    state = blank();
    if (location.hash.length > 1) fromHash(); else apply(false);
  })(rf);
})();
