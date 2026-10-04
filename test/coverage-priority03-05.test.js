// Independent literal source anchors: PolyMax PC curve, PolyLite PC class table, and CTI sample report.
// These retain published scope; engine/browser parity is checked separately by full verify.
import test from 'node:test';import assert from 'node:assert/strict';import{readCsv}from'../build/src/csv.js';
const table=n=>readCsv(new URL(`../data/tables/${n}.csv`,import.meta.url)).records.map(r=>r.values);
test('PolyMax equilibrium uptake keeps humidity and unspecified curve specimen form',()=>{
 const r=table('measurements').find(r=>r.MeasurementID==='V011819');assert.equal(r.GradeID,'G035-06');assert.equal(r['Normalized value'],'0.253');assert.equal(r['Normalized unit'],'%');assert.equal(r['Moisture state'],'conditioned');assert.equal(r['Test temperature °C'],'23');assert.match(r['Moisture condition'],/70% RH/);assert.equal(r['Specimen type'],'Not published (do not assume printed)');assert.equal(r['Post-processing state'],'not-stated');assert.equal(r.Standards,'Not published');
});
test('PolyLite original solvent statement is not manufactured into an unsupported conflicting claim',()=>{
 const r=table('evidence').find(r=>r.EvidenceID==='Q05646');assert.equal(r.GradeID,'G035-10');assert.equal(r.SourceID,'S-POLYCN-PolyLite-PC-TDS-V5-3');assert.equal(r.Finding,'Not resistant');assert.match(r['Exposure / conditions'],/individual solvent\/concentration\/duration\/temperature/);
});
test('CTI PC FR sample-only result preserves geometry, both conditioning routes and unknown manufacturing form',()=>{
 const sid='R-CTI-PCFR-20241028-6b0741900015',r=table('evidence').find(r=>r.SourceID===sid);assert.equal(r.GradeID,'G036-01');assert.equal(r['Evidence type'],'Published observation');assert.equal(r.Finding,'Conclusion: This sample test results comply with the requirements of UL 94-2023 V-0.');assert.match(r['Exposure / conditions'],/128×12.9×3.3mm/);assert.match(r['Exposure / conditions'],/70°C168h/);assert.match(r['Exposure / conditions'],/client identification not verified/);assert.match(r['Exposure / conditions'],/manufacturing\/printed form.*not stated/);assert.match(r['Exposure / conditions'],/scientific research, education, internal quality control/);assert.equal(table('sources').find(s=>s.SourceID===sid).SHA256,'6b0741900015196712696f8e5f8119f2dae7d767c575a1fa4a52568109c99e2b');
});
test('ASA Aero central elongations and off-recipe specimen scope follow the original sheet',()=>{
 const m=table('measurements'),xy=m.find(r=>r.MeasurementID==='V000645'),z=m.find(r=>r.MeasurementID==='V000646');assert.equal(xy['Raw value'],'5.1% ± 1.6%');assert.equal(xy['Normalized value'],'5.1');assert.equal(z['Raw value'],'2.3% ± 0.9%');assert.equal(z['Normalized value'],'2.3');
 const corrected=m.filter(r=>r.GradeID==='G032-01'&&r.SourceID==='B-asa-aero-TDS'&&r['Specimen type']==="Printed off the product's recipe");assert.equal(corrected.length,20);for(const r of corrected)assert.match(r.Notes,/225°C.*recommended nozzle240–280°C/);
 for(const id of ['V000633','V002133'])assert.match(m.find(r=>r.MeasurementID===id)['Specimen type'],/^Not published/);
});
