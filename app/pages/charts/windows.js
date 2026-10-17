// Print windows across a material's products, for one setting (material-stats.js printWindows): on top, how many
// products accept each temperature (a step histogram over whole degrees, the span more than half accept in the accent,
// the rest pale, a line at half the products); below, each product's window as a thin bar, lowest end first; the H2C's
// limit as a dashed line where it is near. One scale for both, x in per cent; the peak named on the plot.

import { esc, pct } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { stripScale, limitOnScale } from './scale.js';
import { tickSvg } from './axis.js';

const CURVE = 64; // the histogram's height, px
const HEAD = 22;  // room above it for the peak's label

/** The bars' pitch for a number of windows: about 200 px in all, whole pixels from 1 to 6 a bar, so each bar is crisp. */
const pitchOf = (n) => Math.max(1, Math.min(6, Math.round(200 / Math.max(n, 1))));

/**
 * One setting's panel: `pw` from printWindows, `label` the setting's name ("Nozzle"), `peakWords` the label at the peak
 * ("54 of 65 accept 240 °C"), `guideName` for a guide window's tooltip. Returns { html, scale, onScale }.
 */
export function windowPanel(pw, { label, peakWords, guideName }) {
  const ends = pw.windows.flatMap((w) => [w.min, w.max]);
  const onScale = limitOnScale(pw.limit, ends);
  const scale = stripScale(onScale ? [...ends, pw.limit] : ends, '°C');
  const X = (t) => scale.pct(t);
  // Whole degrees: a run from..to covers from - 0.5 to to + 0.5.
  const left = (t) => X(t - 0.5), right = (t) => X(t + 0.5);
  const yk = (k) => HEAD + CURVE - (pw.n ? (k / pw.n) * CURVE : 0);
  const half = pw.n / 2;
  const most = pw.most;
  // The histogram as two filled paths (the span more than half accept, and the rest) and one outline, drawn in a nested
  // SVG stretched to the plot's width (x in thousandths of it, y in px), so neighbouring degrees join without a seam.
  const vx = (p) => (p * 10).toFixed(1);
  const area = (keep) => pw.runs.filter((r) => r.k > 0 && keep(r)).map((r) => {
    const x0 = vx(left(r.from)), x1 = vx(right(r.to)), y = yk(r.k).toFixed(1), b = HEAD + CURVE;
    return `M${x0} ${b}V${y}H${x1}V${b}Z`;
  }).join('');
  const inMost = (r) => most && r.from >= most.from && r.to <= most.to;
  const top = pw.runs.map((r, i) => `${i ? 'V' : `M${vx(left(r.from))} ${(HEAD + CURVE).toFixed(1)}V`}${yk(r.k).toFixed(1)}H${vx(right(r.to))}`).join('') + `V${HEAD + CURVE}`;
  const shape = `<svg x="0" y="0" width="100%" height="${HEAD + CURVE}" viewBox="0 0 1000 ${HEAD + CURVE}" preserveAspectRatio="none" overflow="visible">`
    + `<path class="run" d="${area((r) => !inMost(r))}"/><path class="run run--most" d="${area(inMost)}"/>`
    + `<path class="run-edge" d="${top}" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
  const halfLine = pw.n > 1 ? `<line class="half" x1="0" x2="100%" y1="${yk(half).toFixed(1)}" y2="${yk(half).toFixed(1)}"/>` : '';
  const peak = pw.peak;
  const peakX = peak ? (left(peak.from) + right(peak.to)) / 2 : null;
  const peakAnchor = peakX == null ? 'middle' : peakX > 78 ? 'end' : peakX < 22 ? 'start' : 'middle';
  const peakLabel = peak && peakWords ? `<text class="peak" x="${pct(peakX)}" y="${(yk(peak.k) - 7).toFixed(1)}" text-anchor="${peakAnchor}">${esc(peakWords)}</text>` : '';
  const band = (h) => (most ? `<rect class="agree" x="${pct(left(most.from))}" y="0" width="${pct(right(most.to) - left(most.from))}" height="${h}"/>` : '');
  const limitLine = (h, top = 0) => (onScale ? `<line class="limit" x1="${pct(X(pw.limit))}" x2="${pct(X(pw.limit))}" y1="${top}" y2="${h}"/>` : '');
  const limitLabel = onScale ? `<text class="limit-label" x="${pct(X(pw.limit))}" y="11" dx="-5" text-anchor="end">${esc(`H2C max ${fmtNumber(pw.limit)} °C`)}</text>` : '';
  const curve = `<svg class="pw-curve" height="${HEAD + CURVE}" aria-hidden="true" focusable="false">${band(HEAD + CURVE)}${shape}${halfLine}`
    + `<line class="base" x1="0" x2="100%" y1="${HEAD + CURVE - 0.5}" y2="${HEAD + CURVE - 0.5}"/>${limitLine(HEAD + CURVE)}${peakLabel}${limitLabel}</svg>`;

  const pitch = pitchOf(pw.windows.length);
  const h = Math.max(14, Math.ceil(pw.windows.length * pitch) + 6);
  const bars = pw.windows.map((w, i) => {
    const y = (3 + i * pitch + pitch / 2).toFixed(1);
    const cls = ['wb', w.origin === 'guide' ? 'wb--guide' : '', w.variant ? 'wb--variant' : ''].filter(Boolean).join(' ');
    const from = w.origin === 'guide' ? `from ${guideName}` : w.origin === 'twin' ? 'data sheet shared with another product' : null;
    return `<line class="${cls}" x1="${pct(left(w.min))}" x2="${pct(right(w.max))}" y1="${y}" y2="${y}" style="stroke-width:${pitch > 1 ? pitch - 1 : 1}px"`
      + ` data-grade="${esc(w.g.id)}"${w.profileId ? ` data-profile="${esc(w.profileId)}"` : ''} data-v="${esc(`${fmtNumber(w.min)}–${fmtNumber(w.max)} °C`)}"${from ? ` data-from="${esc(from)}"` : ''}/>`;
  }).join('');
  const stack = `<svg class="pw-bars" height="${h}" aria-hidden="true" focusable="false">${band(h)}${scale.ticks.map((t) => `<line class="grid" x1="${pct(X(t))}" x2="${pct(X(t))}" y1="0" y2="${h}"/>`).join('')}${limitLine(h)}${bars}</svg>`;
  const axis = tickSvg(scale, { wide: 420, narrow: 300 });
  const html = `<div class="pw" data-setting="${esc(pw.axis)}" data-n="${pw.n}" data-peak="${pw.peak?.k ?? ''}"><h4 class="pw-title">${esc(label)}</h4>${curve}${stack}${axis}<p class="pw-unit">°C${!onScale && pw.limit != null ? `, the H2C reaches ${esc(fmtNumber(pw.limit))} °C` : ''}</p></div>`;
  return { html, scale, onScale };
}
