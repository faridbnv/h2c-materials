// Every environment statement of the material (chemicals, water, UV, fire, handling), grouped by category: its verdict
// as stored, its own words, its conditions, the product it is about and its document; then the resin's reference data
// (D64), each agent a row, as a group of its own, apart from the products.

import { esc } from '../html.js';
import { productNameOrId, stated } from '../../js/ui/material-facts.js';
import { verdictWords, envConditionWords } from '../../js/ui/material-words.js';
import { envVerdictWords } from '../../js/ui/labels.js';
import { typeSection, groupBlock, sourceCell, idCell, chip, statsWords } from './common.js';

const cols = [['Verdict', 'kind'], ['Statement', 'q'], ['Conditions', 'cd'], ['About', 'p'], ['Document', 'src'], ['ID', 'id']];

export default {
  id: 'environment',
  title: 'Environment statements',
  noun: 'statement',
  count: (c) => c.ev.length + c.poly.reduce((n, p) => n + p.agents.length, 0),
  render(c) {
    const note = (t) => (stated(t) ? chip('record note', String(t).trim()) : '');
    const byCategory = new Map();
    for (const e of c.ev) { const k = e.categoryLabel ?? e.domain ?? ''; (byCategory.get(k) ?? byCategory.set(k, []).get(k)).push(e); }
    const own = [...byCategory].map(([label, es]) => groupBlock({
      title: label, cols, cls: 'rt--e', attrs: ` data-group="${esc(label)}"`, stats: statsWords(es.length, 'statement', []),
      rows: es.map((e) => `<tr data-eid="${esc(e.id)}" data-grade="${esc(stated(e.gradeId) ? e.gradeId : '')}"><td class="kind">${esc(envVerdictWords(e.verdict))}</td>`
        + `<td class="q"><q>${esc(e.finding)}</q>${note(e.exposure)}</td><td class="cd raw">${esc(envConditionWords(e, label) || '—')}</td>`
        + `<td class="p">${esc(stated(e.gradeId) ? productNameOrId(c.gradeById.get(e.gradeId) ?? { id: e.gradeId }) : 'the material in general')}</td>`
        + `${sourceCell(c, e.sourceId, e.locator)}${idCell(e.id)}</tr>`),
    })).join('');
    const agents = c.poly.flatMap((p) => p.agents.map((a) => ({ p, a })));
    const resin = agents.length ? groupBlock({
      title: `Reference data for ${c.poly[0].polymerId} resin, not these products`, cols, cls: 'rt--e', attrs: ` data-group="${esc(`${c.poly[0].polymerId} resin`)}"`,
      stats: statsWords(agents.length, 'statement', []),
      rows: agents.map(({ p, a }) => `<tr data-eid="${esc(a.id)}" data-grade=""><td class="kind">${esc(verdictWords(a.verdict))}</td>`
        + `<td class="q"><q>${esc(a.finding)}</q>${note(a.notes)}</td><td class="cd raw">${esc([a.agent, a.conditions].filter(stated).join('. ') || '—')}</td>`
        + `<td class="p">${esc(`${p.categoryLabel}: ${p.polymerId} resin`)}</td>${sourceCell(c, a.sourceId, a.locator)}${idCell(a.id)}</tr>`),
    }) : '';
    const n = c.ev.length + agents.length;
    return typeSection({
      id: 'environment', title: 'Environment statements', n, noun: 'statement', body: own + resin,
      empty: 'No statement on chemicals, water or other exposure is on file for this material.',
      note: '<p class="rs-note">What each document says about chemicals, water, light, fire and handling, by category, with its verdict as recorded.</p>',
    });
  },
};
