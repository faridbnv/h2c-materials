// How long rendering every material's eight drawer tabs takes in Node, as a proxy for a static page per material.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const { renderDrawer } = await import(pathToFileURL(root + '/app/js/ui/detail.js').href);
const { useRegistry } = await import(pathToFileURL(root + '/app/js/ui/registry.js').href);
const db = JSON.parse(readFileSync(root + '/dist/db.json', 'utf8'));
useRegistry(db.registry);
const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
const ctx = { measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage), showEstimates: true };
const TABS = ['Overview', 'Grades', 'Mechanical', 'Thermal', 'Printing', 'Environment', 'Price', 'Evidence'];
const t0 = performance.now();
let bytes = 0, gz = 0, n = 0, errors = 0; const sizes = [];
for (const m of db.materials) {
  let total = '';
  for (const tab of TABS) {
    const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (s) => ['#drawer-close', '#drawer-pin'].includes(s) ? { addEventListener() {} } : null };
    try {
      renderDrawer(host, { db, selectedMaterialId: m.id, drawerTab: tab, selection: { evaluations: [] }, scenario: { shortlist: [], unknownPolicy: 'strict' }, ctx }, {});
      total += host.innerHTML;
    } catch (e) { errors++; if (errors < 4) console.error(m.id, tab, e.message.slice(0, 160)); }
  }
  const g = gzipSync(total).length;
  bytes += total.length; gz += g; n++; sizes.push({ name: m.name, html: total.length, gz: g });
}
const t1 = performance.now();
sizes.sort((a, b) => b.html - a.html);
console.log(`rendered ${n} materials x ${TABS.length} tabs in ${((t1 - t0) / 1000).toFixed(1)} s (${errors} errors)`);
console.log(`HTML ${(bytes / 1e6).toFixed(1)} MB raw, ${(gz / 1e6).toFixed(1)} MB gzipped; median ${(sizes[n >> 1].html / 1e3).toFixed(0)} KB raw / ${(sizes[n >> 1].gz / 1e3).toFixed(0)} KB gz`);
console.log('largest:', sizes.slice(0, 4).map((s) => `${s.name} ${(s.html / 1e6).toFixed(2)} MB (${(s.gz / 1e3).toFixed(0)} KB gz)`).join('; '));
