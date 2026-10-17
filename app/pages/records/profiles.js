// Every print profile of the material's products, grouped by product: each setting in its document's own words, what
// else the profile records behind one chip that names it, the document and the ID. The temperatures the build reads
// from them are drawn on the main page (Printing).

import { esc } from '../html.js';
import { productNameOrId, stated } from '../../js/ui/material-facts.js';
import { lower } from '../../js/ui/material-words.js';
import { typeSection, flatGroups, rawCell, sourceCell, idCell, chipList } from './common.js';

export default {
  id: 'profiles',
  title: 'Print profiles',
  noun: 'profile',
  count: (c) => c.profiles.length,
  render(c) {
    const name = (p) => productNameOrId(c.gradeById.get(p.gradeId) ?? { id: p.gradeId });
    const by = new Map();
    for (const p of [...c.profiles].sort((a, b) => name(a).localeCompare(name(b)) || (a.id < b.id ? -1 : 1))) (by.get(name(p)) ?? by.set(name(p), []).get(name(p))).push(p);
    // What a profile records beyond the four settings, named in its chip so nothing is hidden without being said.
    const other = (p, kind) => {
      const parts = [['Kind', kind], ['Enclosure', p.enclosure], ['Nozzle', [p.nozzleMaterial, p.nozzleDiameter?.text].filter(stated).join(', ')], ['Abrasion', p.abrasion?.text],
        ['Plate', p.plate], ...(p.notes ?? []).map((x) => [x.topic, x.text]), ['Failure modes', p.failureModes]].filter(([, t]) => stated(t));
      if (!parts.length) return '<td class="cd none">—</td>';
      const names = parts.map(([k]) => k.toLowerCase());
      return `<td class="cd">${chipList(names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', '), parts)}</td>`;
    };
    // The kind most profiles are is said once, above the table; a profile of another kind says so in its own row.
    const kinds = new Map();
    for (const p of c.profiles) if (stated(p.profile)) kinds.set(p.profile, (kinds.get(p.profile) ?? 0) + 1);
    const common = [...kinds].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const row = (p) => `<tr data-pid="${esc(p.id)}" data-grade="${esc(p.gradeId)}" id="profile-${esc(p.id)}">`
      + rawCell(p.nozzle?.text) + rawCell(p.bed?.text) + rawCell(p.chamber?.text) + rawCell(p.drying?.text)
      + other(p, stated(p.profile) && p.profile !== common ? p.profile : null)
      + sourceCell(c, p.sourceId, p.locator) + idCell(p.id) + '</tr>';
    return typeSection({
      id: 'profiles', title: 'Print profiles', n: c.profiles.length, noun: 'profile',
      body: flatGroups({
        groups: [...by].map(([label, ps]) => [label, ps.map(row)]), noun: 'profile', cls: 'rt--p',
        cols: [['Nozzle', 'raw'], ['Bed', 'raw'], ['Chamber', 'raw'], ['Drying', 'raw'], ['Also recorded', 'cd'], ['Document', 'src'], ['ID', 'id']],
      }),
      empty: 'No print profile is on file for this material.',
      note: `<p class="rs-note">${esc(`Each setting in its document's own words, by product${common ? `; each profile is ${lower(common)} unless its row says otherwise` : ''}. The main page's Printing section draws the temperatures the build reads from them.`)}</p>`,
    });
  },
};
