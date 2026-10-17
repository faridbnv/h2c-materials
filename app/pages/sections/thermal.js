// Thermal properties: at what temperature a part softens under load, and why. Its sentences (findings.js thermalWords:
// HDT at both loads against the glass transition, with the reason where the polymer data gives one, the products well
// above the rest by name, Vicat and melting as published), then each product's HDT and glass transition (figures.js
// stripsFigure) where four products or more are compared, else what each sheet publishes, as a table. The temperatures
// against the H2C's settings are drawn where the reader sets the printer, in Printing on the H2C.

import { measuredIn } from '../../js/ui/material-facts.js';
import { thermalWords, fmtD } from '../findings.js';
import { opening, drawFigure, figureConfig, sheetColumns, sheetTable } from './common.js';

const KEYS = ['hdt045', 'hdt18', 'glassTransition'];
const load = (x) => x.thermal?.loadMPa;
/** The rows of the thin table: HDT at each load, the glass transition, Vicat and melting, as each sheet publishes them. */
const ROWS = [
  { label: 'HDT at 0.45 MPa', pick: (xs) => xs.filter((x) => x.property === 'HDT' && Math.abs((load(x) ?? 0) - 0.45) < 0.02) },
  { label: 'HDT at 1.8 MPa', pick: (xs) => xs.filter((x) => x.property === 'HDT' && Math.abs((load(x) ?? 0) - 1.8) < 0.05) },
  { label: 'HDT, load not stated', pick: (xs) => xs.filter((x) => x.property === 'HDT' && load(x) == null) },
  { label: 'Glass transition (Tg)', pick: (xs) => xs.filter((x) => x.property === 'Glass transition temperature') },
  { label: 'Vicat softening, as published', pick: (xs) => xs.filter((x) => x.property === 'Vicat softening temperature') },
  { label: 'Melting, as published', pick: (xs) => xs.filter((x) => x.property === 'Melting temperature') },
];
const SHOWN = new Set(['HDT', 'Glass transition temperature', 'Vicat softening temperature', 'Melting temperature']);

export default {
  id: 'thermal',
  title: 'Thermal properties',
  render(c, env = {}) {
    const m = c.m;
    const mi = measuredIn(c, 'Thermal');
    if (!mi.rows.length) return { empty: true, html: '', stats: {} };
    const keys = figureConfig('STRIP_SETS', {}).thermal ?? KEYS;
    const ranked = Math.max(0, ...keys.map((k) => m.summary?.[k]?.n ?? 0));
    const thin = ranked < 4;
    const words = thermalWords(c, { table: thin });
    const parts = [];
    let figures = 0, dots = 0;
    if (!thin) {
      const f = drawFigure('stripsFigure', c, env, keys, { id: 'thermal' });
      if (!f.empty && f.html) { parts.push(f.html); figures += f.stats?.figures ?? 1; dots += f.stats?.dots ?? 0; }
    } else parts.push(sheetTable(c, sheetColumns(c, (x) => SHOWN.has(x.property)), ROWS, { fmt: (v, u) => fmtD(v, u), conditions: false }));
    const html = [opening(words), ...parts].filter(Boolean).join('\n');
    if (!html) return { empty: true, html: '', stats: {} };
    return { empty: false, html, stats: { figures, dots } };
  },
};
