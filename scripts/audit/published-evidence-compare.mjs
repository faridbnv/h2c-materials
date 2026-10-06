import { gunzipSync } from 'node:zlib';
// Compare explicit impact questions and all existing templates with the pre-change compiled release.
// Pass the preserved baseline db.json; do not infer baseline answers from current code snapshots.
import {readFileSync,writeFileSync}from'node:fs';
import {createHash}from'node:crypto';
import {runSelection}from'../../app/js/engine/constraints.js';
import {productsByMaterial}from'../../app/js/engine/products.js';
import {TEMPLATES}from'../../app/js/ui/templates.js';
const input=process.argv[2];
const before=JSON.parse(input.endsWith('.gz')?gunzipSync(readFileSync(input)):readFileSync(input)),after=JSON.parse(readFileSync('dist/db.json'));
const group=rows=>{const m=new Map();for(const r of rows){if(!m.has(r.materialId))m.set(r.materialId,[]);m.get(r.materialId).push(r);}return m;};
const ctx=db=>({db,productsByMaterial:productsByMaterial(db),measurementsByMaterial:group(db.measurements),evidenceByMaterial:group(db.evidence),coverageByMaterial:group(db.coverage),polymerEvidenceByMaterial:group(db.polymerEvidence),useEstimates:false,evidence:'comparable'});
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const questions=[];
for(const property of ['charpyNotched','izodNotched'])for(const value of [5,10,20,40,80])for(const policy of [{anneal:false,moisture:'dry'},{anneal:true,moisture:'dry'},{anneal:false,moisture:'conditioned'},{anneal:true,moisture:'conditioned'}])for(const evidence of ['comparable','as-published'])questions.push({name:`${property}>=${value}`,constraints:[{kind:'numeric',property,operator:'>=',value,mandatory:true}],...policy,evidence});
for(const t of TEMPLATES)for(const unknownPolicy of ['strict','exploration'])questions.push({name:t.name,constraints:t.constraints,unknownPolicy,useEstimates:unknownPolicy==='exploration'});
let products=0;const results=[];let differences=0;
for(const q of questions){const a=runSelection(before.materials,q.constraints,{...ctx(before),unknownPolicy:'strict',...q}),b=runSelection(after.materials,q.constraints,{...ctx(after),unknownPolicy:'strict',...q});const project=x=>x.evaluations.map(e=>({materialId:e.materialId,verdict:e.verdict,products:e.products}));const av=project(a),bv=project(b);const changed=digest(av)!==digest(bv);if(changed)differences++;products+=av.reduce((n,e)=>n+(e.products?.length??0),0);results.push({name:q.name,anneal:q.anneal??false,moisture:q.moisture??'dry',evidence:q.evidence??'comparable',unknownPolicy:q.unknownPolicy??'strict',before:digest(av),after:digest(bv),changed});}
const compiled=[];
for(const [table,field]of [['materials','headline'],['materials','summary'],['grades','headline'],['grades','states'],['grades','print']]){const map=new Map(before[table].map(x=>[x.id,x[field]]));const changed=after[table].filter(x=>digest(map.get(x.id)??null)!==digest(x[field]??null)).map(x=>x.id);compiled.push({table,field,changed});if(changed.length)differences+=changed.length;}
const out={baseline:before.meta.release.id,release:after.meta.release.id,questions:questions.length,productQuestionAnswers:products,compiled,results,differences};writeFileSync('docs/audits/2026-10-06-published-evidence/answer-parity.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({questions:questions.length,productQuestionAnswers:products,differences}));if(differences)process.exitCode=1;
