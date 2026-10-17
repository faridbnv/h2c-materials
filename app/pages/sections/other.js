// Other properties, as published: every property the sheets give that no other section speaks of (not a key property,
// and not Vicat or melting, which Thermal properties says), mechanical, thermal and physical together, each with how many
// products publish it and its lowest and highest value per unit, as published. They are listed, not ranked: their test
// conditions differ from sheet to sheet. Each value, with its conditions and document, is on its product's card.

import { esc, tableBox } from '../html.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { measuredIn } from '../../js/ui/material-facts.js';
import { propertyName } from '../../js/ui/labels.js';
import { fmtD } from '../findings.js';
import { para } from './common.js';

/** The keys whose products decide whether a section draws its strips or a table of each sheet (as mechanical.js, thermal.js). */
const THIN_KEYS = {
  Mechanical: ['tensileStrengthXY', 'tensileModulusXY', 'tensileStrengthZ', 'elongationXY', 'charpyNotched', 'izodNotched'],
  Thermal: ['hdt045', 'hdt18', 'glassTransition'],
};
/** Properties said elsewhere on the page, as published. */
const SAID = new Set(['Vicat softening temperature', 'Melting temperature']);

export default {
  id: 'other',
  title: 'Other properties, as published',
  render(c) {
    const keyProps = new Set(REGISTRY.allHeadlines.flatMap((h) => [...h.valueProperties]));
    // A section whose products are too few for its figures shows what each sheet publishes instead (mechanical.js,
    // thermal.js): its properties are said there.
    const thin = (keys) => Math.max(0, ...keys.map((k) => c.m.summary?.[k]?.n ?? 0)) < 4;
    const shownThin = new Set(['Mechanical', 'Thermal'].filter((tab) => thin(THIN_KEYS[tab])));
    const rows = [];
    for (const tab of ['Mechanical', 'Thermal', 'Physical']) {
      const mi = measuredIn(c, tab);
      if (shownThin.has(tab) && tab === 'Mechanical') continue;
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
    const table = tableBox(`<table class="grid other"><thead><tr><th scope="col">Property</th><th scope="col" class="num">Products</th><th scope="col" class="num">Lowest–highest</th></tr></thead><tbody>${rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th><td class="num">${r.products}</td><td class="num">${r.spans.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table>`);
    return { empty: false, html: `${para(['Each value is under its own sheet\'s test conditions, so these are listed, not ranked. Each product\'s values, with their conditions and documents, are on its card.'])}${table}`, stats: { properties: rows.length } };
  },
};
