// The engine on dist/db.json: PLA's film tensile strengths veto an estimate screen; a ± band blocks a pass.
import fs from 'node:fs';
import { evaluateConstraint } from '../../../../../app/js/engine/constraints.js';
const ROOT = decodeURIComponent(new URL('../../../../../', import.meta.url).pathname);
const db = JSON.parse(fs.readFileSync(ROOT + 'dist/db.json', 'utf8'));
const mat = (id) => db.materials.find((m) => m.id === id);
for (const v of [70, 100, 140, 150]) {
  const r = evaluateConstraint(mat('M001'), { kind: 'numeric', property: 'tensileStrengthXY', operator: '>=', value: v }, { useEstimates: true });
  console.log(`M001 PLA tensileStrengthXY >= ${v}: status=${r.status} screened=${r.screened} vetoedBy=${JSON.stringify(r.vetoedBy)}`);
}
for (const v of [33, 36]) {
  const r = evaluateConstraint(mat('M002'), { kind: 'numeric', property: 'tensileStrengthXY', operator: '>=', value: v }, {});
  console.log(`M002 PLA Basic tensileStrengthXY 35 (±4) >= ${v}: status=${r.status}; ${r.reason}`);
}
