// Render every material's Mechanical and Thermal tabs from dist/db.json and write them to <out>/<tab>/<id>.html.
// Usage: node dump-drawers.mjs <repo> <out>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const [repo, out] = process.argv.slice(2);
const { renderDrawer } = await import(join(repo, 'app/js/ui/detail.js'));
const { useRegistry } = await import(join(repo, 'app/js/ui/registry.js'));
const db = JSON.parse(readFileSync(join(repo, 'dist/db.json'), 'utf8'));
useRegistry(db.registry);
const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
const ctx = { measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage) };
for (const tab of ['Mechanical', 'Thermal']) {
  mkdirSync(join(out, tab), { recursive: true });
  for (const m of db.materials.filter((x) => !x.familyEntry)) {
    const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (s) => ['#drawer-close', '#drawer-pin'].includes(s) ? { addEventListener() {} } : null };
    renderDrawer(host, { db, selectedMaterialId: m.id, drawerTab: tab, selection: { evaluations: [] }, scenario: { shortlist: [], unknownPolicy: 'strict' }, ctx }, {});
    writeFileSync(join(out, tab, `${m.id}.html`), host.innerHTML);
  }
}
console.log('done');
