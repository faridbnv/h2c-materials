// The property profile's track: where a material's median of one key property falls among every other material's median
// (material-stats.js propertyProfile), on a scale from the lowest material to the highest, with the place of its
// products' middle half as a band. Under the track, the lowest and highest materials' values at its ends, and a few
// landmark materials a reader knows (material-stats.js landmarkMaterials) ticked by name where they fit. One small SVG
// per row of the typical-values table, x in per cent.

import { attrs, esc, pct } from '../html.js';
import { fmtPage } from '../numbers.js';

const CHAR = 6.9;    // about how wide a character of a 12 px label is
const TRACK = 230;   // the track's width on a laptop, px, for fitting the labels

/**
 * The track for one profile row (`r` from propertyProfile, known). `ends` are the lowest and highest other materials'
 * medians; `marks` the landmarks with a median here: [{ name, at (per cent) }].
 */
export function profileTrack(r, { ends = null, marks = [] } = {}) {
  const at = r.at?.pct;
  const quarters = [25, 50, 75].map((p) => `<line class="pq${p === 50 ? ' pq--mid' : ''}" x1="${p}%" x2="${p}%" y1="5" y2="19"/>`).join('');
  const band = r.lo != null && r.hi != null
    ? `<rect class="pband" x="${pct(Math.min(r.lo, r.hi))}" y="8" width="${pct(Math.max(Math.abs(r.hi - r.lo), 1.2))}" height="8" rx="2"/>` : '';
  const dot = at != null ? `<circle class="pdot" cx="${pct(at)}" cy="12" r="5.5"/>` : '';
  // The labels under the track: the two ends first, then each landmark where it overlaps nothing already placed.
  const placed = [];
  const fits = (x0, x1) => x0 >= -2 && x1 <= TRACK + 2 && placed.every(([a, b]) => x1 + 6 <= a || x0 >= b + 6);
  const label = (text, p, anchor, cls) => {
    const w = text.length * CHAR, x = (p / 100) * TRACK;
    const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
    if (!fits(x0, x0 + w)) return '';
    placed.push([x0, x0 + w]);
    return `<text class="${cls}" x="${pct(p)}" y="35" text-anchor="${anchor}">${esc(text)}</text>`;
  };
  const endLabels = ends ? label(fmtPage(ends[0]), 0, 'start', 'pend') + label(fmtPage(ends[1]), 100, 'end', 'pend') : '';
  const ticks = marks.map((k) => `<line class="plm" x1="${pct(k.at)}" x2="${pct(k.at)}" y1="15" y2="24"/>`).join('');
  const names = marks.map((k) => label(k.name, k.at, k.at < 12 ? 'start' : k.at > 88 ? 'end' : 'middle', 'plm-name')).join('');
  return `<svg class="ptrack"${attrs({ 'data-rank': r.key, 'data-pct': at != null ? at.toFixed(1) : null, 'data-of': r.at?.others != null ? r.at.others + 1 : null })} height="40" aria-hidden="true" focusable="false">`
    + `<line class="pbase" x1="0" x2="100%" y1="12" y2="12"/>${quarters}${band}${ticks}${dot}${endLabels}${names}</svg>`;
}

/** The profile column's heading: what the ends mean, in plain words. */
export const profileHead = '<span class="ph-t">Rank among materials</span><span class="ph"><span>lowest</span><span>highest</span></span>';
