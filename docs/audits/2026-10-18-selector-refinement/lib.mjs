// What the round's measures share: the drawer rendered in Node as app/js/main.js renders it (the material pages round's
// drawer-golden.mjs, set b), from dist/db.json (run `npm run build` first).
import { readFileSync } from 'node:fs';
import { renderDrawer } from '../../../app/js/ui/detail.js';
import { useRegistry } from '../../../app/js/ui/registry.js';
import { setH2cBaseline, setEnvironmentLabels } from '../../../app/js/ui/labels.js';
import { runSelection, UNKNOWN_POLICY } from '../../../app/js/engine/constraints.js';
import { productsByMaterial } from '../../../app/js/engine/products.js';
import { newScenario } from '../../../app/js/engine/scenario.js';
import { TEMPLATES } from '../../../app/js/ui/templates.js';

export const db = JSON.parse(readFileSync(new URL('../../../dist/db.json', import.meta.url), 'utf8'));
globalThis.CSS ??= { escape: (s) => String(s) };
setEnvironmentLabels(db.meta.environmentCategories);
setH2cBaseline(db.meta.h2cBaseline);
useRegistry(db.registry);

/** Every drawer tab key, the internal ones included (Coverage opens Sources at its known gaps). */
export const TABS = ['Overview', 'Grades', 'Mechanical', 'Thermal', 'Printing', 'Environment', 'Price', 'Evidence', 'Coverage'];

const group = (rows, key = 'materialId') => {
  const m = new Map();
  for (const r of rows) { if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(r); }
  return m;
};
const base = {
  db,
  measurementsByMaterial: group(db.measurements),
  evidenceByMaterial: group(db.evidence),
  polymerEvidenceByMaterial: group(db.polymerEvidence ?? []),
  coverageByMaterial: group(db.coverage),
  productsByMaterial: productsByMaterial(db),
  unknownPolicy: UNKNOWN_POLICY.STRICT,
};
const candidates = db.materials.filter((m) => !m.familyEntry);

/** A scenario and its context as main.js builds them: Confirmed only, or a template by its index. */
export function situation({ template = null, policy = 'strict' } = {}) {
  const scenario = { ...newScenario(db.meta), created: null, shortlist: [], unknownPolicy: policy };
  if (template !== null) { scenario.constraints = TEMPLATES[template].constraints.map((c) => ({ ...c })); scenario.template = TEMPLATES[template].name; }
  const ctx = { ...base, unknownPolicy: policy, useEstimates: policy === 'exploration', evidence: 'comparable', anneal: false, annealMaxC: null, moisture: 'dry' };
  ctx.showEstimates = ctx.useEstimates;
  const selection = runSelection(candidates, scenario.constraints, ctx);
  return { scenario, ctx, selection };
}

/** One drawer's HTML. */
export function drawerHtml(sit, materialId, tab) {
  const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (s) => (['#drawer-close', '#drawer-pin'].includes(s) ? { addEventListener() {} } : null) };
  renderDrawer(host, { db, selectedMaterialId: materialId, drawerTab: tab, selection: sit.selection, scenario: sit.scenario, ctx: sit.ctx, highlightMeasurement: null, highlightSource: null }, {});
  return host.innerHTML;
}

/** Reader text of some HTML: tags out, entities read, maintainers' folds (Record notes, Review notes) left out. */
export function readerText(html) {
  // The maintainers' folds, nested folds and all: each <details> whose summary is Record notes or Review notes, to its own
  // closing tag (a "Show all" inside one had ended a lazy match early).
  let noNotes = '', i = 0;
  const open = /<details[^>]*>\s*<summary[^>]*>\s*(?:Record notes|Review notes)/g;
  for (let m; (m = open.exec(html));) {
    if (m.index < i) continue;
    noNotes += html.slice(i, m.index) + ' ';
    let depth = 0, j = m.index;
    const tag = /<\/?details\b[^>]*>/g;
    tag.lastIndex = m.index;
    for (let t; (t = tag.exec(html));) { depth += t[0][1] === '/' ? -1 : 1; if (!depth) { j = tag.lastIndex; break; } }
    i = j > m.index ? j : html.length;
    open.lastIndex = i;
  }
  noNotes += html.slice(i);
  return noNotes.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t\r\n]+/g, ' ').trim();
}
