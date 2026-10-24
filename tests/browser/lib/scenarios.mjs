// The twelve scripted scenarios (WP-27 exit evidence; pack 15 section 5.3): each of the six templates asked of the data in Strict, and in Explore with the
// estimates on, as the old page reads them. A scenario is a link (the hash the page writes), and may carry a chosen product (the first product the engine
// passes, else the first it judges), which is what a decision brief is written for. The oracle is the old engine run in Node on the old build's database,
// so the pages are compared with what the old code decided, not with themselves.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

let loaded;
async function oldCode(root) {
  const url = (p) => pathToFileURL(join(root, 'app/js', p)).href;
  const [scenario, constraints, products, templates, registry] = await Promise.all(['engine/scenario.js', 'engine/constraints.js', 'engine/products.js', 'ui/templates.js', 'ui/registry.js'].map((p) => import(url(p))));
  return { scenario, constraints, products, templates, registry };
}

/** The scenarios: { id, name, mode, hash, chosen }. */
export async function twelveScenarios(root) {
  loaded ??= (async () => {
    const code = await oldCode(root);
    const db = JSON.parse(readFileSync(join(root, 'dist', 'db.json'), 'utf8'));
    code.registry.useRegistry(db.registry);
    const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
    const base = { db, productsByMaterial: code.products.productsByMaterial(db), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage), measurementsByMaterial: group(db.measurements) };
    const out = [];
    for (const [t, template] of code.templates.TEMPLATES.entries()) {
      for (const mode of ['strict', 'exploration']) {
        const s = { ...code.scenario.newScenario(db.meta), constraints: template.constraints.map((c) => ({ ...c })), template: template.name, unknownPolicy: mode, useEstimates: mode === 'exploration' };
        // The chosen product: strict judgement of the template, which the estimates never change (a product the engine passes, else the first it judges).
        const evaluations = code.constraints.runSelection(db.materials.filter((m) => !m.familyEntry), s.constraints, { ...base, unknownPolicy: 'strict', anneal: false, moisture: 'dry' }).evaluations;
        const entries = evaluations.flatMap((e) => e.products ?? []);
        const entry = entries.find((p) => p.verdict === 'PASS') ?? entries[0] ?? null;
        const chosen = entry ? { gradeId: entry.gradeId, stateId: entry.state?.id ?? null, release: db.meta.release?.id ?? null, chosenOn: '2026-01-01', note: null, tests: [] } : null;
        const withChoice = { ...s, decisions: chosen ? [chosen] : [] };
        out.push({ id: `${t}-${mode}`, name: `${template.name}, ${mode === 'strict' ? 'Leave out' : 'Include with estimates'}`, mode, template: template.name, chosen,
          hash: code.scenario.toHash(withChoice), plainHash: code.scenario.toHash(s) });
      }
    }
    return { out, meta: db.meta, toHash: code.scenario.toHash, newScenario: code.scenario.newScenario, templates: code.templates.TEMPLATES };
  })();
  return (await loaded).out;
}

/** The old code's own scenario functions, for specs that write a link. */
export async function scenarioTools(root) {
  await twelveScenarios(root);
  const { meta, toHash, newScenario, templates } = await loaded;
  return { meta, toHash, newScenario, templates };
}
