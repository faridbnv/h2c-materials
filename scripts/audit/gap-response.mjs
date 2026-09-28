#!/usr/bin/env node
// Compare the frozen questions product by product. Changes to documents are reported separately.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';
import { csvText } from '../../build/src/csv.js';
import { runSelection, UNKNOWN_POLICY } from '../../app/js/engine/constraints.js';
import { productsByMaterial } from '../../app/js/engine/products.js';
import { useRegistry } from '../../app/js/ui/registry.js';
import { projectRoot } from '../ingest/context.mjs';
const out = join(projectRoot,'docs/audits/2026-09-28-gap-closing');
const readCheckpoint=(path)=>JSON.parse(existsSync(path)?readFileSync(path,'utf8'):gunzipSync(readFileSync(path+'.gz')).toString());
const baseline = JSON.parse(readFileSync(join(out,'BASELINE.json'),'utf8'));
const wb=loadTables(join(projectRoot,'data'));
const {db}=buildDatabase(wb,{snapshot:snapshotDate(wb.Method.rows),build:'audit'});
useRegistry(db.registry);
const group=(list)=>{const m=new Map();for(const x of list){if(!m.has(x.materialId))m.set(x.materialId,[]);m.get(x.materialId).push(x);}return m;};
const ctx={db,productsByMaterial:productsByMaterial(db),evidenceByMaterial:group(db.evidence),polymerEvidenceByMaterial:group(db.polymerEvidence??[]),measurementsByMaterial:group(db.measurements),coverageByMaterial:group(db.coverage),unknownPolicy:UNKNOWN_POLICY.STRICT};
const mats=db.materials.filter((m)=>!m.familyEntry&&!m.excluded);
const current=baseline.questions.map((q)=>{const r=runSelection(mats,q.constraints,{...ctx,...q.policy});return {name:q.name,counts:r.counts,materials:r.evaluations.map((e)=>({id:e.materialId,status:e.verdict,products:e.products.map((p)=>({id:p.gradeId,status:p.verdict,screened:p.screened,state:p.state,results:p.results}))}))};});
const basePath=join(out,'BASELINE-ANSWERS.json');
if(process.argv.includes('--freeze')){
 if(existsSync(basePath))throw new Error('Baseline answers already frozen');
 writeFileSync(basePath,JSON.stringify(current,null,2)+'\n');
 console.log('Baseline answers frozen');
}else{
 const against=process.argv.indexOf('--against');
 const original=readCheckpoint(against<0?basePath:join(out,process.argv[against+1]));
 const rows=[],changes=[];
 for(let i=0;i<current.length;i++){
  const a=original[i],b=current[i];let pm=0,mm=0,ps=0;
  const beforeM=new Map(a.materials.map((m)=>[m.id,m]));
  for(const m of b.materials){const prev=beforeM.get(m.id);if(prev?.status!==m.status){mm++;changes.push({Question:b.name,Kind:'material',ID:m.id,Before:prev?.status??'absent',After:m.status});}
   const beforeP=new Map((prev?.products??[]).map((p)=>[p.id,p]));
   for(const p of m.products){const prev=beforeP.get(p.id);if(prev?.status!==p.status){pm++;changes.push({Question:b.name,Kind:'product',ID:p.id,Before:prev?.status??'absent',After:p.status});}else if(prev?.screened!==p.screened){ps++;changes.push({Question:b.name,Kind:'product-screening',ID:p.id,Before:String(prev?.screened),After:String(p.screened)});}}
  }
  rows.push({Question:b.name,'Materials moved':mm,'Product answers moved':pm,'Product screening changed':ps,'PASS before':a.counts.pass,'PASS after':b.counts.pass,'UNKNOWN before':a.counts.unknown,'UNKNOWN after':b.counts.unknown,'FAIL before':a.counts.fail,'FAIL after':b.counts.fail});
 }
 const tag=process.argv[2]||'CURRENT';
 writeFileSync(join(out,`${tag}-ANSWERS.json.gz`),gzipSync(JSON.stringify(current))); 
 writeFileSync(join(out,`${tag}-MOVEMENT.csv`),csvText(Object.keys(rows[0]),rows));
 writeFileSync(join(out,`${tag}-CHANGES.csv`),csvText(['Question','Kind','ID','Before','After'],changes));
 console.log(rows.map((r)=>`${r.Question.split(':')[0]}: ${r['Materials moved']} material / ${r['Product answers moved']} product answers moved; PASS ${r['PASS before']} -> ${r['PASS after']}`).join('\n'));
}
