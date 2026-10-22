// Among the materials: where this material sits against the five an engineer would weigh it against (material-stats.js
// peerSet, by rule), said for the first two, and among every material on file, by its high and low properties; then the
// two figures that draw it (figures.js peersFigure, mapsFigure). It places the material; it does not restate its numbers.

import type { Loose } from '../loose.ts';

import { evidenceTier } from '../facts/material-highlights.ts';
import { indexDb } from '../facts/material-facts.ts';
import { rankTable } from '../facts/material-facts.ts';
import { peersWords, standingWords, glue } from '../findings.ts';
import { opening, drawFigure, figureConfig } from './common.ts';

export default {
  id: 'among',
  title: 'Among the materials',
  render(c: Loose, env: Loose = {}): Loose {
    const ix = env.index ?? indexDb(c.db);
    const ranks = env.ranks ?? rankTable(c.db);
    const peerSet = figureConfig('peerSet', null);
    const peers = typeof peerSet === 'function' ? peerSet(c.db, c.m, ix, { max: 5 }) : [];
    const words = [...peersWords(c, peers), standingWords(c, ranks)].filter(Boolean);
    // A thinly documented material is placed by the alternatives grid alone: on the landscape maps its point would rest on
    // one or two sheets, and the maps cost a thin page a screen (D145, the reviews: a thin page reads short).
    const thin = evidenceTier(c.m, c)?.tier === 'thinly';
    const figs = [drawFigure('peersFigure', c, env, {}), thin ? { empty: true } : drawFigure('mapsFigure', c, env, {})].filter((f) => !f.empty && f.html);
    if (!words.length && !figs.length) return { empty: true, html: '', stats: {} };
    return {
      empty: false,
      html: glue(`${opening(words)}\n${figs.map((f) => f.html).join('\n')}`),
      stats: { figures: figs.reduce((n, f) => n + (f.stats?.figures ?? 1), 0), dots: figs.reduce((n, f) => n + (f.stats?.dots ?? 0), 0), peers: peers.map((p: Loose) => p.id) },
    };
  },
};
