// Every print profile of the material's products, as its document gives it: the source's own words for each setting,
// with the H2C's verdict-free reading left to the main page's figure.

import { esc } from '../html.js';
import { productNameOrId, stated } from '../../js/ui/material-facts.js';
import { recordTable, headRow, rawCell, sourceCell, idCell, fold } from './common.js';

export default {
  id: 'profiles',
  title: 'Print profiles',
  noun: 'profile',
  count: (c) => c.profiles.length,
  render(c) {
    const name = (p) => productNameOrId(c.gradeById.get(p.gradeId) ?? { id: p.gradeId });
    const sorted = [...c.profiles].sort((a, b) => name(a).localeCompare(name(b)) || (a.id < b.id ? -1 : 1));
    // The settings a print is set up with, each in its document's words; the rest of what the profile records, folded.
    const other = (p) => {
      const parts = [['Enclosure', p.enclosure], ['Nozzle type', [p.nozzleMaterial, p.nozzleDiameter?.text].filter(stated).join(', ')], ['Abrasion', p.abrasion?.text],
        ['Plate', p.plate], ...(p.notes ?? []).map((x) => [x.topic, x.text]), ['Failure modes', p.failureModes]].filter(([, t]) => stated(t));
      if (!parts.length) return '<td class="raw none">—</td>';
      return `<td class="raw">${fold(parts.map(([k, t]) => `${k}: ${t}`).join('. '), 60, parts.map(([k, t]) => `<b>${esc(k)}:</b> ${esc(t)}`).join('<br>'))}</td>`;
    };
    const rows = sorted.map((p) => `<tr data-pid="${esc(p.id)}" data-grade="${esc(p.gradeId)}" id="profile-${esc(p.id)}"><th scope="row">${esc(name(p))}</th><td>${esc(stated(p.profile) ? p.profile : '—')}</td>`
      + rawCell(p.nozzle?.text, 50) + rawCell(p.bed?.text, 50) + rawCell(p.chamber?.text, 50) + rawCell(p.drying?.text, 50) + other(p)
      + sourceCell(c, p.sourceId, p.locator) + idCell(p.id) + '</tr>').join('');
    return recordTable({
      id: 'profiles', title: 'Print profiles', n: c.profiles.length, noun: 'profile',
      head: headRow([['Product'], ['Kind'], ['Nozzle'], ['Bed'], ['Chamber'], ['Drying'], ['Also recorded'], ['Document'], ['ID']]), widths: [13, 11, 11, 12, 10, 12, 13, 12, 6],
      rows: `<tbody>${rows}</tbody>`, empty: 'No print profile is on file for this material.',
      note: '<p class="rec-note">Each setting in its document\'s own words. Figure 3.1 on the main page draws the temperatures each product\'s print settings read from them.</p>',
    });
  },
};
