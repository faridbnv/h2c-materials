// Heat: how hot a printed part can get, as one ladder of the material's temperatures (material-stats.js heatLadder): the
// glass transition and HDT at both loads as the build compiled them, Vicat and melting as their products publish them
// (figures.js LADDER_EXTRA), with the H2C's heated-chamber limit as a reference line; the heat comparison's bookkeeping
// under "How this is counted"; then the other thermal properties on file, counted.

import { esc } from '../html.js';
import { h2cLimit } from '../../js/ui/labels.js';
import { fmtNumber } from '../../js/ui/format.js';
import { measuredIn, comparisonsOf, spreadEntries } from '../../js/ui/material-facts.js';
import { heatLadder, printsAmorphous } from '../../js/ui/material-stats.js';
import { EMPTY_LINES, plural, andList, medianRule, apartWords } from '../../js/ui/material-words.js';
import { ladderPlot } from '../charts/ladder.js';
import { figure, figId } from '../charts/figure.js';
import { LADDER_EXTRA, MATERIAL_MAPS } from '../figures.js';
import { mapFigure } from './maps.js';
import { emptyBody, otherProperties, figureCounter, findingsBlock, notesHtml, recordsLink, countedLine, comparisonAbout, medianTable, middleHalf } from './common.js';
import { heatFindings } from '../findings.js';

/** The ladder's title, its finding, each property named: "HDT 70 °C at 0.45 MPa and 64.5 °C at 1.8 MPa; Tg 80 °C". */
function ladderTitle(rows) {
  const v = (r) => fmtNumber(r.summary.median, '°C');
  const hdt = rows.filter((r) => r.h?.loadMPa != null).sort((a, b) => a.h.loadMPa - b.h.loadMPa);
  const tg = rows.find((r) => r.h && r.h.loadMPa == null);
  const parts = [hdt.length ? `HDT ${andList(hdt.map((r) => `${v(r)} at ${fmtNumber(r.h.loadMPa)} MPa`))}` : null, tg ? `Tg ${v(tg)}` : null].filter(Boolean);
  if (parts.length) return parts.join('; ');
  return `${rows[0].label} ${v(rows[0])}, as published`;
}

export default {
  id: 'thermal',
  title: 'Heat',
  records: '#measurements-thermal',
  render(c, env, place) {
    const anchor = '#measurements-thermal';
    const mi = measuredIn(c, 'Thermal');
    if (!mi.rows.length) {
      const other = otherProperties(c, 'Thermal', new Set(), anchor);
      return { empty: true, html: emptyBody(c, EMPTY_LINES.Thermal, { tab: 'Thermal', anchor }) + other.html, stats: {} };
    }
    const m = c.m;
    const next = figureCounter(place.n);
    const rows = heatLadder(m, c, LADDER_EXTRA);
    const comps = comparisonsOf(m, c, 'Thermal');
    const covered = new Set([...comps.flatMap((f) => [...f.properties]), ...rows.filter((r) => !r.compared).map((r) => r.id)]);
    // The products that give HDT at both loads, comparably: where the heavier load's median is not the lower, the two
    // medians rest on different products, and the finding says so.
    const both = (() => {
      const keys = rows.filter((r) => r.h?.loadMPa != null && r.compared).map((r) => r.h.key);
      if (keys.length !== 2) return null;
      const [a, b] = keys.map((k) => new Set(spreadEntries(m, c, k).filter((e) => e.v.level === 'comparable' && !e.variant).map((e) => e.g.id)));
      return [...a].filter((id) => b.has(id)).length;
    })();
    const out = [findingsBlock(heatFindings(rows, { name: m.name, amorphous: printsAmorphous(m, c.db), both }))];
    let figures = 0;
    if (rows.length) {
      for (const r of rows) {
        r.sub = r.compared ? plural(r.summary.n, 'product') : `as published, ${plural(r.summary.n, 'product')}`;
        r.label = r.h ? r.h.labels.plain : r.label;
        r.short = r.h ? r.h.labels.short : r.label.split(' ')[0];
      }
      const limit = h2cLimit('chamber');
      const plot = ladderPlot(rows, { limit, limitWords: `H2C chamber max ${fmtNumber(limit)} °C` });
      const no = next();
      figures++;
      const f = comps[0];
      const keyHs = f ? (f.shown.length ? f.shown : f.hs) : [];
      const apart = keyHs.map((h) => [h, apartWords(h, m.summary?.[h.key])]).filter(([, a]) => a.length).map(([h, a]) => `${h.labels.plain}: ${andList(a)}.`);
      out.push(figure({
        id: figId(no), n: no, title: ladderTitle(rows),
        data: { 'data-ladder': 'heat' }, cls: 'fig--ladder',
        plot,
        label: `Temperatures of ${m.name}, lowest first: ${rows.map((r) => `${r.label} typically ${fmtNumber(r.summary.median, '°C')}${r.summary.q1 != null ? `, middle half ${middleHalf(r.summary)} °C` : ''}${r.compared ? '' : ', as published'}`).join('; ')}. The H2C's heated chamber reaches ${fmtNumber(limit)} °C.`,
        read: esc('Each rung is one property: the tick is its typical value, the band the middle half of its products, the thin line their lowest to highest. Grey rungs are values as published, under each sheet\'s own test method.'),
        counted: notesHtml([
          f ? `${medianRule(keyHs, m)} Typical is their median.` : null,
          apart.length ? `Left out of the median: ${apart.join(' ')}` : null,
          rows.some((r) => !r.compared) ? `${andList(rows.filter((r) => !r.compared).map((r) => r.label))}: one value per product, the median of its own where it publishes several, whatever its test method or specimen, special formulations left out of the median. They are a guide to where the material softens or melts, not a comparison between products.` : null,
          'The dashed line is the most the H2C\'s heated chamber reaches, for reference.',
          f ? countedLine(f, c, 'Thermal').line : null,
        ]) + (f && keyHs.some((h) => m.summary?.[h.key]?.n) ? medianTable(keyHs, m) : '') + (f ? comparisonAbout(f) : '') + `<p>${recordsLink(c, anchor, 'Every result, with its document, on the records page')}.</p>`,
      }));
    }
    let dots = 0;
    for (const pair of MATERIAL_MAPS.filter((p) => p.section === 'thermal')) {
      const fig = mapFigure(c, env, pair, `${place.n}.${figures + 1}`);
      if (fig) { next(); out.push(fig.html); figures++; dots += fig.dots; }
    }
    const other = otherProperties(c, 'Thermal', covered, anchor);
    out.push(other.html);
    return { empty: false, html: out.join('\n'), stats: { figures, dots } };
  },
};
