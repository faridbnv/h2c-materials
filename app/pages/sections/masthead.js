// The masthead: the material's name, the name it is also called and its full name, then how much is on file (products,
// makers, measured values, documents), what it is (polymer, filler, family, Bambu Lab's standing) and the data's
// date and release. A material beyond the H2C's capability says so before anything else.

import { esc } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { identity, stated } from '../../js/ui/material-facts.js';
import { ledeWords, describeFacets } from '../../js/ui/material-words.js';
import { h2cStatusLabel, H2C_STATUS, FILLER } from '../../js/ui/labels.js';

export default {
  id: 'masthead',
  title: null,
  render(c, env) {
    const m = c.m;
    const id = identity(m, c);
    // The label first, as a description list must have it; the stylesheet sets the number above it.
    const count = (key, n, one, many) => `<div class="count"><dt>${esc(n === 1 ? one : many)}</dt><dd data-count="${key}" data-n="${n}">${esc(fmtNumber(n))}</dd></div>`;
    const fact = (label, value, cls = '') => (value ? `<div><dt>${esc(label)}</dt><dd${cls ? ` class="${cls}"` : ''}>${value}</dd></div>` : '');
    const status = `<span class="chip" title="${esc(H2C_STATUS[m.h2cStatus]?.meaning ?? '')}">${esc(h2cStatusLabel(m.h2cStatus))}</span>`;
    // Beyond the H2C's capability, the callout says what the status lede would; the facets are said alone.
    const lede = m.excluded ? describeFacets(m) : ledeWords(m);
    const html = `<header class="mast">
<h1 class="mast-name">${esc(id.primary)}</h1>
${id.aka ? `<p class="mast-aka">also called ${esc(id.aka)}</p>` : ''}
${id.fullName ? `<p class="mast-full">${esc(id.fullName)}</p>` : ''}
${m.excluded ? '<p class="callout"><b>Beyond H2C capability.</b> Kept for reference, never a candidate: it needs more heat than the H2C gives.</p>' : ''}
<dl class="mast-counts">
${count('products', id.products, 'product', 'products')}
${count('makers', id.makers, 'maker', 'makers')}
${count('values', c.summary.numericMeasurements, 'measured value', 'measured values')}
${count('documents', c.documents.size, 'document', 'documents')}
</dl>
<dl class="mast-facts">
${fact('Polymer', esc(stated(m.basePolymer) ? m.basePolymer : ''))}
${fact('Filler', esc(FILLER[id.reinforcement] ?? id.reinforcement ?? ''))}
${stated(m.family) && m.family !== m.basePolymer ? fact('Family', esc(m.family)) : ''}
${fact('Bambu Lab status', status)}
${fact('Data of', `<time>${esc(env.stamps.snapshot)}</time>`)}
${fact('Release', esc(env.stamps.release), 'mono')}
</dl>
${lede ? `<p class="mast-lede">${esc(lede)}</p>` : ''}
</header>`;
    return { html, empty: false, stats: {} };
  },
};
