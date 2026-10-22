// Thermal properties: at what temperature a part softens under load, and why. Its sentences (findings.js thermalWords:
// HDT at both loads against the glass transition, with the reason where the polymer data gives one, the products well
// above the rest by name, Vicat and melting as published), then each product's HDT and glass transition (figures.js
// stripsFigure) where four products or more are compared, else what each sheet publishes, as a table. The temperatures
// against the H2C's settings are drawn where the reader sets the printer, in Printing on the H2C.

import type { Loose } from '../loose.ts';

import { measuredIn } from '../facts/material-facts.ts';
import { thermalWords, fmtD, glue } from '../findings.ts';
import { inStrip } from '../figures.ts';
import { opening, drawFigure, figureConfig, publishedKeys, headlineTable, absentLine } from './common.ts';

const KEYS = ['hdt045', 'hdt18', 'glassTransition'];

export default {
  id: 'thermal',
  title: 'Thermal properties',
  render(c: Loose, env: Loose = {}): Loose {
    const m = c.m;
    const mi = measuredIn(c, 'Thermal');
    if (!mi.rows.length) return { empty: true, html: '', stats: {} };
    const keys = figureConfig('STRIP_SETS', {}).thermal ?? KEYS;
    const published = publishedKeys(c, keys);
    const stripped = published.filter((k: Loose) => inStrip(m, k));
    const tabled = published.filter((k: Loose) => !stripped.includes(k));
    const parts = [opening(thermalWords(c))];
    let figures = 0, dots = 0;
    if (stripped.length) {
      const f = drawFigure('stripsFigure', c, env, stripped, { id: 'thermal' });
      if (!f.empty && f.html) { parts.push(f.html); figures += f.stats?.figures ?? 1; dots += f.stats?.dots ?? 0; }
    }
    if (tabled.length) parts.push(headlineTable(c, tabled, { fmt: (v: Loose, u: Loose) => fmtD(v, u) }));
    const LABEL: Record<string, Loose> = { hdt045: 'HDT at 0.45 MPa', hdt18: 'HDT at 1.8 MPa', glassTransition: 'the glass transition' };
    parts.push(absentLine(c, keys.filter((k: Loose) => !published.includes(k)).map((k: Loose) => LABEL[k] ?? k)));
    const html = glue(parts.filter(Boolean).join('\n'));
    if (!html) return { empty: true, html: '', stats: {} };
    return { empty: false, html, stats: { figures, dots } };
  },
};
