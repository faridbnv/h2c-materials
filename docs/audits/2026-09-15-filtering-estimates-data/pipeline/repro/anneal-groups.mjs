const ROOT = decodeURIComponent(new URL('../../../../../', import.meta.url).pathname);
import { kindOf } from '../../../../../build/src/estimates.js';
import fs from 'node:fs';
const db = JSON.parse(fs.readFileSync((ROOT + 'dist/db.json'),'utf8'));
const grades=new Map(db.grades.map(g=>[g.id,g]));
const ann=p=>/anneal/i.test(p)&&!/not annealed|unannealed/i.test(p)?'A':'P';
const keys=['density','tensileModulusXY','tensileStrengthXY','elongationXY','hdt045'];
const groups=new Map();
for (const x of db.measurements.filter(x=>x.numeric&&!x.quarantined&&!/^Film/.test(x.specimenType))) for (const key of keys) {
  const kind=kindOf(x,key,'semi-unfilled'); if(!kind) continue;
  const f=grades.get(x.gradeId)?.formulationKey||x.gradeId; const g=`${key}|${x.materialId}|${f}|${kind}`;
  if(!groups.has(g)) groups.set(g,[]); groups.get(g).push(x);
}
let n=0;
for (const [g,xs] of groups) { const c=new Set(xs.map(x=>ann(x.postProcessing))); if (c.size>1 || (xs.length>1 && new Set(xs.map(x=>x.postProcessing)).size>1 && xs.some(x=>/anneal/i.test(x.postProcessing)))) { n++; const ys=xs.map(x=>x.value); console.log(g, 'avg', (ys.reduce((a,b)=>a+b,0)/ys.length).toFixed(3), xs.map(x=>`${x.id}=${x.value}[${ann(x.postProcessing)}:${x.postProcessing.slice(0,22)}]`).join('; ')); } }
console.log('groups mixing post-processing:', n);
