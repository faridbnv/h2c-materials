// Other properties, as published: every property the sheets give that no other section speaks of (not a key property,
// and not Vicat or melting, which Thermal properties says), mechanical, thermal and physical together, each with how many
// products publish it and its lowest and highest value per unit, as published. They are listed, not ranked: their test
// conditions differ from sheet to sheet. Each value, with its conditions and document, is on its product's card.

import { esc, tableBox } from '../html.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { measuredIn } from '../../js/ui/material-facts.js';
import { propertyName } from '../../js/ui/labels.js';
import { fmtD, glue } from '../findings.js';
import { para } from './common.js';

/** Properties said elsewhere on the page, as published. */
const SAID = new Set(['Vicat softening temperature', 'Melting temperature']);

export default {
  id: 'other',
  title: 'Other properties, as published',
  render(c) {
    const keyProps = new Set(REGISTRY.allHeadlines.flatMap((h) => [...h.valueProperties]));
    const rows = [];
    for (const tab of ['Mechanical', 'Thermal', 'Physical']) {
      const mi = measuredIn(c, tab);
      for (const p of mi.shown) {
        if (keyProps.has(p) || SAID.has(p) || rows.some((r) => r.property === p)) continue;
        const xs = mi.rows.filter((x) => x.property === p && x.numeric && !x.quarantined && !x.implausible && Number.isFinite(x.value));
        if (!xs.length) continue;
        const units = [...new Set(xs.map((x) => x.unit))];
        const spans = units.map((u) => {
          const vs = xs.filter((x) => x.unit === u).map((x) => x.value);
          const unit = u && u !== 'Dimensionless' ? u : null;
          const lo = Math.min(...vs), hi = Math.max(...vs);
          return lo === hi ? fmtD(lo, unit) : `${fmtD(lo)}⁠–⁠${fmtD(hi, unit)}`;
        });
        rows.push({ property: p, label: propertyName(p), products: new Set(xs.map((x) => x.gradeId)).size, spans });
      }
    }
    if (!rows.length) return { empty: true, html: '', stats: {} };
    rows.sort((a, b) => b.products - a.products || a.label.localeCompare(b.label));
    const table = tableBox(`<table class="grid other"><thead><tr><th scope="col">Property</th><th scope="col" class="num">Products</th><th scope="col" class="num">Lowest–highest</th></tr></thead><tbody>${rows.map((r) => `<tr><th scope="row" class="prop">${esc(r.label)}</th><td class="num" data-label="Products">${r.products}</td><td class="num" data-label="Lowest–highest">${r.spans.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table>`);
    // One line and the table behind a fold: every value is there, and the account reads on (the second review: the
    // 15-row table weighed on the page's last third).
    return { empty: false, html: glue(`${para([`${rows.length === 1 ? 'One more property is' : `${rows.length} more properties are`} published, each under its own sheet's test conditions, so they are listed, not ranked.`])}<details class="more"><summary>${esc(rows.length === 1 ? rows[0].label : `The ${rows.length} properties, lowest to highest`)}</summary>${table}</details>`), stats: { properties: rows.length } };
  },
};
