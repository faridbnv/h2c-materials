#!/usr/bin/env node
// Owner: finish the frozen dry/as-printed queue; record additional expectation states for a follow-up.
// This queues unresolved facts. It performs no source research and changes no decision data.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {projectRoot} from '../data/table-io.mjs';
import {csvText} from '../../build/src/csv.js';
import {runSelection,UNKNOWN_POLICY} from '../../app/js/engine/constraints.js';
import {productsByMaterial} from '../../app/js/engine/products.js';
import {useRegistry} from '../../app/js/ui/registry.js';
import {describeConstraint} from '../../app/js/ui/labels.js';
import {releaseIdentity} from '../../build/src/release.js';

const out=join(projectRoot,'docs/audits/2026-09-28-gap-closing');
const db=JSON.parse(readFileSync(join(projectRoot,'dist/db.json')));
if(db.meta.release?.id!==releaseIdentity(projectRoot).id)throw Error('Build is stale; run npm run build first.');
useRegistry(db.registry);
const portfolio=JSON.parse(readFileSync(join(projectRoot,'test/acceptance/portfolio.json')));
const group=list=>{const map=new Map();for(const r of list){if(!map.has(r.materialId))map.set(r.materialId,[]);map.get(r.materialId).push(r);}return map;};
const ctx={db,productsByMaterial:productsByMaterial(db),evidenceByMaterial:group(db.evidence),polymerEvidenceByMaterial:group(db.polymerEvidence??[]),measurementsByMaterial:group(db.measurements),coverageByMaterial:group(db.coverage),unknownPolicy:UNKNOWN_POLICY.STRICT};
const grades=new Map(db.grades.map(g=>[g.id,g])),materials=db.materials.filter(m=>!m.familyEntry&&!m.excluded);
const rows=[],variants=[];
for(const c of portfolio.cases){
 if(!c.constraints)continue;
 const seen=new Set();
 for(const expectation of c.expect){
  if(!expectation.policy||!('anneal' in expectation.policy||'moisture' in expectation.policy))continue;
  const policy={...c.policy,...expectation.policy};const key=JSON.stringify(policy);
  if(seen.has(key))continue;seen.add(key);
  const selection=runSelection(materials,c.constraints,{...ctx,...policy});let queued=0;
  for(const e of selection.evaluations){
   if(e.verdict==='PASS')continue;
   for(const p of e.products??[]){
    if(p.verdict!=='UNKNOWN'||p.screened)continue;
    const open=p.results.filter(r=>r.constraint?.mandatory!==false&&['UNKNOWN','INDETERMINATE'].includes(r.status));
    if(open.length!==1)continue;
    const r=open[0],g=grades.get(p.gradeId);queued++;
    rows.push({Question:c.id,Policy:key,GradeID:g.id,MaterialID:e.materialId,Manufacturer:g.manufacturer,Product:g.product,Requirement:describeConstraint(r.constraint),State:JSON.stringify(p.state),Status:r.status,Reason:r.reason,'Missing kind':r.missing??'not stated','Follow-up work':r.status==='INDETERMINATE'?'Team H2C print/coupon; no test executed.':'Exact-product source research for this compatible state and its conditions; then maker or team coupon.','Research status':'Queued only; outside frozen campaign','Expected movement':'One product answer; a PASS would add a material with no passing product in this policy.'});
   }
  }
  variants.push({question:c.id,policy,constraints:c.constraints,counts:selection.counts,queuedFacts:queued,source:'Distinct state override in acceptance expectation; no new research performed.'});
 }
}
writeFileSync(join(out,'STATE-VARIANTS-FOLLOWUP.csv'),csvText(Object.keys(rows[0]??{}),rows));
writeFileSync(join(out,'STATE-VARIANTS-FOLLOWUP.json'),JSON.stringify({release:db.meta.release,authorization:'Owner: finish frozen targets; record additional variants for follow-up.',variants,queuedFacts:rows.length},null,2)+'\n');
console.log(`${variants.length} additional policy variants; ${rows.length} queued one-fact gaps. Research not executed.`);
