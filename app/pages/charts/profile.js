// The property profile's track: where a material's median of one key property falls among every other material's median
// (material-stats.js propertyProfile), on a 0 to 100 scale from the lowest material to the highest, with the place of its
// products' middle half as a band. One small SVG per row of the typical-values table, x in per cent.

import { attrs, pct } from '../html.js';

/** The track for one profile row (`r` from propertyProfile, known). Quarter lines at 25, 50 and 75; the band; the dot. */
export function profileTrack(r) {
  const at = r.at?.pct;
  const quarters = [25, 50, 75].map((p) => `<line class="pq${p === 50 ? ' pq--mid' : ''}" x1="${p}%" x2="${p}%" y1="5" y2="19"/>`).join('');
  const band = r.lo != null && r.hi != null
    ? `<rect class="pband" x="${pct(Math.min(r.lo, r.hi))}" y="8" width="${pct(Math.max(Math.abs(r.hi - r.lo), 1.2))}" height="8" rx="2"/>` : '';
  const dot = at != null ? `<circle class="pdot" cx="${pct(at)}" cy="12" r="5.5"/>` : '';
  return `<svg class="ptrack"${attrs({ 'data-rank': r.key, 'data-pct': at != null ? at.toFixed(1) : null, 'data-of': r.at?.others != null ? r.at.others + 1 : null })} height="24" aria-hidden="true" focusable="false">`
    + `<line class="pbase" x1="0" x2="100%" y1="12" y2="12"/>${quarters}${band}${dot}</svg>`;
}

/** The profile column's heading: what the ends mean, in plain words. */
export const profileHead = '<span class="ph"><span>Lowest material</span><span>Highest</span></span>';
