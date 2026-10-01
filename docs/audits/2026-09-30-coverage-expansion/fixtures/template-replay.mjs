// Replays the frozen templates under their four supported modes; parity is not a source correctness oracle.
import {readFileSync,writeFileSync} from 'node:fs';
import {runSelection,UNKNOWN_POLICY} from '../../../../app/js/engine/constraints.js';
import {productsByMaterial} from '../../../../app/js/engine/products.js';
import {TEMPLATES} from '../../../../app/js/ui/templates.js';
import {useRegistry} from '../../../../app/js/ui/registry.js';
const [baseline,out]=process.argv.slice(2),before=JSON.parse(readFileSync(baseline)),after=JSON.parse(readFileSync('dist/db.json'));
const group=xs=>{const m=new Map();for(const x of xs){if(!m.has(x.materialId))m.set(x.materialId,[]);m.get(x.materialId).push(x);}return m;};
const modes={Strict:{unknownPolicy:UNKNOWN_POLICY.STRICT},'Strict, annealing permitted':{unknownPolicy:UNKNOWN_POLICY.STRICT,anneal:true},Explore:{unknownPolicy:UNKNOWN_POLICY.EXPLORATION},'Explore with estimates':{unknownPolicy:UNKNOWN_POLICY.EXPLORATION,useEstimates:true}};
function replay(db){
 useRegistry(db.registry);const ctx={db,productsByMaterial:productsByMaterial(db),measurementsByMaterial:group(db.measurements),evidenceByMaterial:group(db.evidence),polymerEvidenceByMaterial:group(db.polymerEvidence??[]),coverageByMaterial:group(db.coverage)},rows=[];
 for(const t of TEMPLATES)for(const[mode,policy]of Object.entries(modes))for(const m of runSelection(db.materials.filter(m=>!m.familyEntry),t.constraints,{...ctx,...policy}).evaluations){
  rows.push({key:JSON.stringify([t.name,mode,m.materialId]),level:'material',id:m.materialId,verdict:m.verdict,screened:m.screened});
  for(const p of m.products??[])rows.push({key:JSON.stringify([t.name,mode,p.gradeId,p.state]),level:'product',id:p.gradeId,verdict:p.verdict,screened:p.screened});
 }return rows;
}
const b=replay(before),a=replay(after),old=new Map(b.map(r=>[r.key,r]));if(b.length!==a.length)throw Error('Population changed');const changes=[];
for(const r of a){const x=old.get(r.key);if(!x)throw Error('Identity/state changed');if(x.verdict!==r.verdict||x.screened!==r.screened)changes.push({before:x,after:r});}
writeFileSync(out,JSON.stringify({before_release:before.meta.release.id,after_release:after.meta.release.id,question_modes:TEMPLATES.length*Object.keys(modes).length,evaluations:b.length,answer_changes:changes.length,changes},null,2)+'\n');console.log(JSON.stringify({evaluations:b.length,changes:changes.length}));
