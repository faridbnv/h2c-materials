// Every environment statement of the material (chemicals, water, UV, fire, handling), with its verdict as stored, its
// own words, its conditions and its document; then the resin's reference data (D64), each agent a row, apart.

import { esc } from '../html.js';
import { productNameOrId, stated } from '../../js/ui/material-facts.js';
import { verdictWords, envConditionWords } from '../../js/ui/material-words.js';
import { envVerdictWords } from '../../js/ui/labels.js';
import { recordTable, headRow, rawCell, sourceCell, idCell } from './common.js';

export default {
  id: 'environment',
  title: 'Environment statements',
  noun: 'statement',
  count: (c) => c.ev.length + c.poly.reduce((n, p) => n + p.agents.length, 0),
  render(c) {
    const own = c.ev.map((e) => `<tr data-eid="${esc(e.id)}" data-grade="${esc(stated(e.gradeId) ? e.gradeId : '')}"><th scope="row">${esc(e.categoryLabel ?? e.domain ?? '')}</th><td>${esc(envVerdictWords(e.verdict))}</td>`
      + `<td class="quote"><q>${esc(e.finding)}</q></td><td>${esc(envConditionWords(e, e.categoryLabel ?? '') || '—')}</td>`
      + `<td>${esc(stated(e.gradeId) ? productNameOrId(c.gradeById.get(e.gradeId) ?? { id: e.gradeId }) : 'the material in general')}</td>`
      + `${sourceCell(c, e.sourceId, e.locator)}${rawCell(e.exposure, 50)}${idCell(e.id)}</tr>`).join('');
    const resin = c.poly.flatMap((p) => p.agents.map((a) => `<tr data-eid="${esc(a.id)}" data-grade=""><th scope="row">${esc(p.categoryLabel)}</th><td>${esc(verdictWords(a.verdict))}</td>`
      + `<td class="quote"><q>${esc(a.finding)}</q></td><td>${esc([a.agent, a.conditions].filter(stated).join('. '))}</td><td>${esc(`${p.polymerId} resin, not these products`)}</td>`
      + `${sourceCell(c, a.sourceId, a.locator)}${rawCell(a.notes, 50)}${idCell(a.id)}</tr>`)).join('');
    const n = c.ev.length + c.poly.reduce((k, p) => k + p.agents.length, 0);
    return recordTable({
      id: 'environment', title: 'Environment statements', n, noun: 'statement',
      head: headRow([['Category'], ['Verdict'], ['Statement'], ['Conditions'], ['Product'], ['Document'], ['Reviewer\'s note'], ['ID']]),
      rows: `${own ? `<tbody>${own}</tbody>` : ''}${resin ? `<tbody class="resin"><tr class="group"><th scope="rowgroup" colspan="8">${esc(`Reference data for ${c.poly[0].polymerId} resin (not these products)`)}</th></tr>${resin}</tbody>` : ''}`,
      widths: [11, 9, 24, 14, 13, 14, 9, 6],
      empty: 'No statement on chemicals, water or other exposure is on file for this material.',
    });
  },
};
