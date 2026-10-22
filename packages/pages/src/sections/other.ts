// Other properties, as published: every property the sheets give that no other section speaks of (not a key property,
// not Shore A or D hardness, which Mechanical properties draws, and not Vicat or melting, which Thermal properties says,
// melting only where the polymer has a melting point), mechanical, thermal and physical together, each with how many
// products publish it and its lowest and highest value per unit, as published. They are listed, not ranked: their test
// conditions differ from sheet to sheet. Each value, with its conditions and document, is on its product's card.

import type { Loose } from '../loose.ts';

import { esc, tableBox } from '../html.ts';
import { REGISTRY } from '../facts/registry.ts';
import { measuredIn } from '../facts/material-facts.ts';
import { saysOnTheLadder, publishedEnds } from '../facts/material-stats.ts';
import { propertyName } from '../facts/labels.ts';
import { fmtD, glue } from '../findings.ts';
import { PAGE_ONLY, LADDER_EXTRA } from '../figures.ts';
import { para, publishedKeys } from './common.ts';

export default {
  id: 'other',
  title: 'Other properties, as published',
  render(c: Loose): Loose {
    // The properties a section of the page draws: a headline in a drawer comparison (the mechanical and thermal strips) or
    // a table column (density).
    const keyProps = new Set(REGISTRY.allHeadlines.filter((h: Loose) => h.drawerComparison || h.tableColumn).flatMap((h: Loose) => [...h.valueProperties]));
    // Those Thermal properties says as published (Vicat; melting where the polymer has a melting point,
    // material-stats.js saysOnTheLadder: an amorphous polymer's "melting temperatures" are listed here instead).
    const said = new Set(LADDER_EXTRA.filter((p) => saysOnTheLadder(c.m, c.db, p)));
    // A property's values in a unit a section draws: Shore A and Shore D hardness, in Mechanical properties since
    // OPEN-PROBLEMS §38.3, where a product publishes them; Rockwell and a Shore scale the sheet does not name stay here.
    const drawnUnits = new Set(publishedKeys(c, PAGE_ONLY).filter((k: Loose) => !c.m.headline?.[k]?.notApplicable).map((k: Loose) => REGISTRY.allHeadlines.find((h: Loose) => h.key === k))
      .filter(Boolean).flatMap((h: Loose) => h.valueProperties.map((p: Loose) => `${p}|${h.unit}`)));
    const rows: Loose[] = [];
    for (const tab of ['Mechanical', 'Thermal', 'Physical']) {
      const mi = measuredIn(c, tab);
      for (const p of mi.shown) {
        if (keyProps.has(p) || said.has(p) || rows.some((r) => r.property === p)) continue;
        const xs = mi.rows.filter((x: Loose) => x.property === p && x.numeric && !x.quarantined && !x.implausible && Number.isFinite(x.value) && !drawnUnits.has(`${p}|${x.unit}`));
        if (!xs.length) continue;
        const units = [...new Set(xs.map((x: Loose) => x.unit))];
        const spans = units.map((u) => {
          // A range its sheet prints counts by both ends, so the lowest and highest are what the sheets printed.
          const vs = xs.filter((x: Loose) => x.unit === u).flatMap(publishedEnds);
          const unit = u && u !== 'Dimensionless' ? u : null;
          const lo = Math.min(...vs), hi = Math.max(...vs);
          return lo === hi ? fmtD(lo, unit) : `${fmtD(lo)}⁠–⁠${fmtD(hi, unit)}`;
        });
        rows.push({ property: p, label: propertyName(p), products: new Set(xs.map((x: Loose) => x.gradeId)).size, spans });
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
