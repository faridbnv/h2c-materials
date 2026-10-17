// The records page's finder: a search over every record, then filters that combine: record type, product, document,
// and for measurements orientation and property, each choice with how many records it holds. The script
// (assets/tables.src.js) shows it, keeps it in the address (#type=measurements&property=…&product=G…) and filters the
// tables by toggling `hidden`; without the script it stays hidden and every table reads in full.

import { esc } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { DIRECTION_WORDS, propertyName } from '../../js/ui/labels.js';
import { productNameOrId, sourceName, tabProperties } from '../../js/ui/material-facts.js';
import { REGISTRY } from '../../js/ui/registry.js';

const SEARCH_ICON = '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>';
const FILTER_ICON = '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M6 10h8M8.5 15h3"/></svg>';

/** A checkable chip: its label and its count, which the script keeps for the other filters as they are set. */
const option = (f, value, label, n, also = '') => `<label class="rf-c"><input type="checkbox" data-f="${f}" value="${esc(value)}"${also ? ` data-also="${esc(also)}"` : ''}><span>${esc(label)}</span><span class="rf-k" data-k>${esc(fmtNumber(n))}</span></label>`;

/** A text field with suggestions (a datalist): typing narrows them; a value names one product or document. */
const picker = (f, label, placeholder, options) => `<div class="rf-g"><label class="rf-l" for="rf-${f}">${esc(label)}</label>`
  + `<span class="rf-pick"><input id="rf-${f}" type="text" list="rf-${f}s" data-f="${f}" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false">`
  + `<button type="button" class="rf-x" data-x="${f}" aria-label="${esc(`Clear the ${label.toLowerCase()}`)}" hidden>×</button></span>`
  + `<datalist id="rf-${f}s">${options.map(([id, name]) => `<option value="${esc(name)}" data-id="${esc(id)}"></option>`).join('')}</datalist></div>`;

/** Names that are the same for two documents get what tells them apart: the first product each covers, then a number. */
function distinct(list) {
  const seen = new Map();
  for (const [, name] of list) seen.set(name, (seen.get(name) ?? 0) + 1);
  const used = new Set();
  return list.map(([id, name, hint]) => {
    let n = seen.get(name) > 1 && hint ? `${name} (${hint})` : name;
    for (let i = 2; used.has(n); i++) n = `${name} (${i})`;
    used.add(n);
    return [id, n];
  });
}

/** The finder, from the material's context and its record types with their counts ([{ s, n }]). */
export function filterPanel(c, types) {
  const total = types.reduce((k, t) => k + t.n, 0);
  const products = c.grades.map((g) => [g.id, productNameOrId(g)]).sort((a, b) => a[1].localeCompare(b[1]));
  const first = (d) => { const g = c.gradeById.get([...d.grades][0]); return g ? productNameOrId(g) : null; };
  const docs = distinct([...c.documents].map(([sid, d]) => [sid, sourceName(c.sourceById.get(sid), sid), first(d)])
    .sort((a, b) => a[1].localeCompare(b[1])));
  // Orientations as stated: XY and Z first, the rest by how often, "not stated" last; a property without one is none.
  const dirs = new Map();
  for (const x of c.ms) if (x.direction && x.direction !== 'not-applicable') dirs.set(x.direction, (dirs.get(x.direction) ?? 0) + 1);
  const rank = (d) => (d === 'XY' ? 0 : d === 'Z' ? 1 : d === 'unknown' ? 3 : 2);
  const orientations = [...dirs].sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1]);
  // Properties by domain in the registry's order, as the measurements are grouped below.
  const byProperty = new Map();
  for (const x of c.ms) byProperty.set(x.property, (byProperty.get(x.property) ?? 0) + 1);
  const domains = [['Mechanical', tabProperties('Mechanical', c.m)], ['Thermal', tabProperties('Thermal', c.m)], ['Physical', tabProperties('Physical', c.m)]];
  const placed = new Set(domains.flatMap(([, ps]) => ps));
  domains.push(['Other', [...byProperty.keys()].filter((p) => !placed.has(p)).sort()]);
  const props = domains.map(([label, ps]) => [label, ps.filter((p) => byProperty.has(p))]).filter(([, ps]) => ps.length);
  // The key properties each property is read for, by name without the orientation ("tensile strength"), so a link that
  // asks for property=Tensile%20strength lists yield, break and unspecified strengths alike.
  const also = new Map();
  for (const h of REGISTRY.allHeadlines) {
    if (h.kind !== 'measurement') continue;
    const family = h.labels.plain.replace(/\s*\((XY|Z)\)$/, '').toLowerCase();
    for (const p of h.valueProperties ?? []) (also.get(p) ?? also.set(p, new Set()).get(p)).add(family);
  }
  const alsoOf = (p) => [...(also.get(p) ?? [])].join('|');

  return `<aside class="rf" aria-label="Find records" data-total="${total}" hidden>
<div class="rf-bar"><label class="rf-find">${SEARCH_ICON}<input type="search" data-f="q" placeholder="Search every record" aria-label="Search every record" autocomplete="off" spellcheck="false"></label>
<p class="rf-shown" data-shown aria-live="polite">${esc(`${fmtNumber(total)} records`)}</p></div>
<details class="rf-more" open><summary>${FILTER_ICON}<span>Filters</span><span class="rf-on" data-on></span></summary>
<fieldset class="rf-g"><legend class="rf-l">Record type</legend>${types.map(({ s, n }) => option('type', s.id, s.title, n)).join('')}</fieldset>
${picker('product', 'Product', 'Every product', products)}
${picker('doc', 'Document', 'Every document', docs)}
${orientations.length ? `<fieldset class="rf-g" data-for="measurements"><legend class="rf-l">Orientation<small>measurements</small></legend>${orientations.map(([d, n]) => option('orientation', d, d === 'unknown' ? 'not stated' : DIRECTION_WORDS[d] ?? d, n)).join('')}</fieldset>` : ''}
${props.length ? `<fieldset class="rf-g rf-props" data-for="measurements"><legend class="rf-l">Property<small>measurements</small></legend>${props.map(([label, ps]) => `<p class="rf-sub">${esc(label)}</p>${ps.map((p) => option('property', p, propertyName(p), byProperty.get(p), alsoOf(p))).join('')}`).join('')}</fieldset>` : ''}
<button type="button" class="rf-clear" data-clear hidden>Clear every filter</button>
</details>
</aside>`;
}
