const ROOT = decodeURIComponent(new URL('../../../../../', import.meta.url).pathname);
import fs from 'node:fs';
const db = JSON.parse(fs.readFileSync((ROOT + 'dist/db.json'),'utf8'));
const byId = new Map(db.measurements.map(m=>[m.id,m]));
for (const mat of db.materials) for (const [k,h] of Object.entries(mat.headline)) for (const b of (h.impliedBounds||[])) {
  const m = byId.get(b.measurementId); const flags = [];
  if (/^Film/.test(m.specimenType)) flags.push('FILM'); if (m.specimenType==='Filament') flags.push('FILAMENT');
  if (/Conditioned|Wet/.test(m.moisture)) flags.push('CONDITIONED'); if (/anneal/i.test(m.postProcessing) && !/not annealed|unannealed/i.test(m.postProcessing)) flags.push('ANNEALED');
  if (m.interval?.kind==='uncertainty' && b.lo !== m.value) flags.push(`USES-HI ${m.value}->${+b.lo.toFixed(3)}`);
  if (flags.length) console.log(mat.id, mat.name, k, b.measurementId, m.property, m.value, m.unit, flags.join(' '));
}
