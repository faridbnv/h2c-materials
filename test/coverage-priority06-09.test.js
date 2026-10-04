// Literal source anchors independently checked against product pages and the Fillamentum guides.
// Browser/engine parity is a separate verification gate.
import test from 'node:test';import assert from 'node:assert/strict';import{readCsv}from'../build/src/csv.js';import{readFileSync}from'node:fs';import{evaluateConstraint}from'../app/js/engine/constraints.js';
const table=n=>readCsv(new URL(`../data/tables/${n}.csv`,import.meta.url)).records.map(r=>r.values);
const profile=id=>table('profiles').find(r=>r.ProfileID===id);
test('Fiberlogy PP conditional plate and PA12CF optional enclosure retain own wording',()=>{
 const pp=profile('P1367');assert.equal(pp.GradeID,'G082-10');assert.equal(pp['Drying °C'],'50');assert.equal(pp['Drying hours'],'4');assert.match(pp.Plate,/packing|packaging/i);assert.equal(pp['Bed requirement'],'none');
 const cf=profile('P1372');assert.equal(cf.GradeID,'G053-16');assert.equal(cf['Drying °C'],'80');assert.equal(cf['Drying hours'],'4');assert.equal(cf['Enclosure state'],'recommended');assert.match(cf.Enclosure,/not required/i);assert.match(cf.Enclosure,/enclosed and heated/i);assert.equal(cf['Chamber state'],'unknown');
});
test('Fillamentum guide keeps strict open time and thermal precautions without making PP drying mandatory',()=>{
 const p=profile('P1376');assert.equal(p.GradeID,'G049-05');assert.match(p.Drying,/>5 h/);assert.equal(p['Drying hours'],'Not published');assert.match(p['Failure modes'],/desiccator/);
 for(const[id,temp]of[['P1378','100'],['P1379','80']]){const r=profile(id);assert.equal(r['Drying °C'],temp);assert.equal(r['Drying hours'],'3');assert.match(r['Failure modes'],/maximum of 3 drying cycles of 3 hours/);assert.match(r['Failure modes'],/yellowing/);}
 const sid=p.SourceID;assert.equal(table('profiles').filter(r=>r.GradeID==='G082-07'&&r.SourceID===sid).length,0);
});
test('Flexfill literal agent ratings retain mixed solvent limits and scoped oil positives',()=>{
 const db=JSON.parse(readFileSync(new URL('../dist/db.json',import.meta.url))),own=table('evidence');
 for(const g of['G039-29','G039-30']){
  const rows=own.filter(r=>r.GradeID===g&&/TPU.*ADDITIONAL|FILLAMENTUM/.test(r.SourceID)&&['GOOD','BAD'].includes(r.Finding));
  assert.ok(rows.some(r=>r.Topic==='Acetone'&&r.Finding==='BAD'));assert.ok(rows.some(r=>r.Topic==='Ethanol'&&r.Finding==='GOOD'));assert.ok(rows.some(r=>r.Topic==='Effect of organic solvent'&&r.Finding==='BAD'));
  for(const r of rows){assert.match(r['Exposure / conditions'],/25 °C/);assert.match(r['Exposure / conditions'],/reply time, not exposure duration/);assert.match(r['Exposure / conditions'],/exposure duration.*not published/);}
  const mid=g==='G039-29'?'M162':'M160',map=new Map([[mid,db.evidence.filter(r=>r.materialId===mid)]]),m={id:mid,product:{id:g}},ctx={db,evidenceByMaterial:map};
  assert.equal(evaluateConstraint(m,{kind:'environment',category:'organic-solvent'},ctx).status,'INDETERMINATE');assert.equal(evaluateConstraint(m,{kind:'environment',category:'oil-grease'},ctx).status,'PASS');
 }
});
test('Extrudr nozzle ambiguity and eSUN legacy revision/temperature bounds remain visible',()=>{
 for(const id of['P1385','P1388','P1392']){const r=profile(id);assert.match(r['Failure modes'],/0.4 mm nozzle/);assert.match(r['Failure modes'],/at least 0.[56]mm/);assert.equal(r['Hardened nozzle'],'TRUE');}
 const e=table('evidence'),uv=e.find(r=>r.EvidenceID==='Q05745'),water=e.find(r=>r.EvidenceID==='Q05746');assert.equal(uv.GradeID,'G026-07');assert.equal(uv.Finding,'Not resistant to light and ageing');assert.match(water.Finding,/less than 60/);assert.match(water['Exposure / conditions'],/open upper temperature/);assert.match(water['Exposure / conditions'],/Not steam\/hydrolysis/);
 const note=e.find(r=>r.EvidenceID==='Q05742');assert.match(note['Exposure / conditions'],/Nov2021V4.0/);assert.match(note['Exposure / conditions'],/No measurement substitution/);assert.equal(table('sources').find(r=>r.SourceID===note.SourceID)['Publication date'],'2026-06-15');
});
