// The context strip under a key figure: every material's median of that property as a faint tick, this material's
// median as the one accent tick (tick--this), and its products' range and middle half behind it. It places the
// material's number among all the others (material-facts.js rankTable: measured medians only, never an estimate), on
// the one scale rule (scales.js), over every median and this material's own range together.

import { stripScale } from './scale.js';
import { tickSvg } from './axis.js';
import { esc, pct } from '../html.js';

/**
 * The strip for one key figure: `rank` is rankTable(db)[key], `s` the material's summary entry (materials[].summary[key])
 * and `value` its median (materials[].headline[key].value).
 */
export function contextStrip(key, rank, materialId, s, value, unit) {
  const values = rank.entries.map((x) => x.value);
  const own = [value, s?.n > 1 ? s.min : null, s?.n > 1 ? s.max : null].filter(Number.isFinite);
  const scale = stripScale([...values, ...own], unit);
  // This material's tick last, so it is drawn on top of the others.
  const ordered = [...rank.entries.filter((x) => x.id !== materialId), ...rank.entries.filter((x) => x.id === materialId)];
  const ticks = ordered.map((x) => (x.id === materialId
    ? `<line class="tick tick--this" x1="${pct(scale.pct(x.value))}" x2="${pct(scale.pct(x.value))}" y1="2" y2="30"/>`
    : `<line class="tick" x1="${pct(scale.pct(x.value))}" x2="${pct(scale.pct(x.value))}" y1="9" y2="23"/>`)).join('');
  const range = s?.n > 1 && s.min !== s.max ? `<line class="range" x1="${pct(scale.pct(s.min))}" x2="${pct(scale.pct(s.max))}" y1="16" y2="16"/>` : '';
  const band = s?.q1 != null ? `<rect class="band" x="${pct(scale.pct(s.q1))}" y="7" width="${pct(Math.max(scale.pct(s.q3) - scale.pct(s.q1), 0.5))}" height="18"/>` : '';
  return `<div class="ctx"><svg class="ctx-strip" data-rank="${esc(key)}" height="32" aria-hidden="true" focusable="false">`
    + `<line class="ctx-base" x1="0" x2="100%" y1="16" y2="16"/>${band}${range}${ticks}</svg>${tickSvg(scale, { height: 20, cls: 'ctx-ticks', wide: 270, narrow: 270 })}</div>`;
}

/** Where the median stands among the other materials' medians (material-facts.js rankOf), in words. */
export function rankWords(r) {
  const others = r.of - 1;
  if (others < 1) return 'No other material has a value to compare with.';
  const level = others - r.below - r.above;
  if (!r.below && !level) return `Below the medians of all ${others} other materials with a value.`;
  if (!r.above && !level) return `Above the medians of all ${others} other materials with a value.`;
  const parts = [r.below ? `above ${r.below}` : null, level ? `level with ${level}` : null, r.above ? `below ${r.above}` : null].filter(Boolean);
  const said = parts.length === 3 ? `${parts[0]}, ${parts[1]} and ${parts[2]}` : parts.join(' and ');
  return `${said.charAt(0).toUpperCase()}${said.slice(1)} of the ${others} other materials' medians.`;
}
