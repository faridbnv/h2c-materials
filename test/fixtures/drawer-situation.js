// The built database and the selector's own situation, for tests that render the drawer in Node as app/js/main.js does:
// no requirement, or one of the application templates, and a drawer's HTML for one material and tab.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSelection } from '../../app/js/engine/constraints.js';
import { productsByMaterial } from '../../app/js/engine/products.js';
import { newScenario } from '../../app/js/engine/scenario.js';
import { TEMPLATES } from '../../app/js/ui/templates.js';
import { renderDrawer } from '../../app/js/ui/detail.js';
import { useRegistry } from '../../app/js/ui/registry.js';
import { setH2cBaseline, setEnvironmentLabels } from '../../app/js/ui/labels.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
globalThis.CSS ??= { escape: (s) => String(s) };
setEnvironmentLabels(db.meta.environmentCategories);
setH2cBaseline(db.meta.h2cBaseline);
useRegistry(db.registry);

const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
const base = {
  db, measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []),
  coverageByMaterial: group(db.coverage), productsByMaterial: productsByMaterial(db),
};
const candidates = db.materials.filter((m) => !m.familyEntry);
export const material = (name) => db.materials.find((m) => m.name === name);

/** The scenario and its selection as the selector holds them: no requirement, or an application template by name. */
export function situation(template = null) {
  const scenario = { ...newScenario(db.meta), created: null, shortlist: [], unknownPolicy: template ? 'exploration' : 'strict' };
  if (template) { const t = TEMPLATES.find((x) => x.name === template); scenario.constraints = t.constraints.map((c) => ({ ...c })); scenario.template = t.name; }
  const ctx = { ...base, unknownPolicy: scenario.unknownPolicy, useEstimates: !!template, evidence: 'comparable', anneal: false, annealMaxC: null, moisture: 'dry', showEstimates: !!template };
  return { scenario, ctx, selection: runSelection(candidates, scenario.constraints, ctx) };
}

/** One material's drawer, as HTML. */
export function drawer(sit, id, tab = 'Grades') {
  const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (s) => (['#drawer-close', '#drawer-pin'].includes(s) ? { addEventListener() {} } : null) };
  renderDrawer(host, { db, selectedMaterialId: id, drawerTab: tab, selection: sit.selection, scenario: sit.scenario, ctx: sit.ctx, highlightMeasurement: null, highlightSource: null }, {});
  return host.innerHTML;
}

/** Markup text as the reader reads it (the few entities the drawer's escaping leaves). */
export const unescape = (s) => s.replace(/&#39;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
