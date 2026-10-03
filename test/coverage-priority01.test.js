// Independent source-grounded fixtures: literal original observations, not values calculated by the build.
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{readCsv}from'../build/src/csv.js';import{classifyFinding}from'../build/src/normalize/chemical.js';
const table=n=>readCsv(new URL(`../data/tables/${n}.csv`,import.meta.url)).records.map(r=>r.values),measurements=table('measurements'),sources=table('sources');
const own=(grade,property)=>measurements.filter(m=>m.GradeID===grade&&m.Property===property&&!/^Retired/.test(m['Data status']));
function one(grade,property){const rows=own(grade,property);assert.equal(rows.length,1);return rows[0];}
test('Nanovia exact original bounds remain strict observations, not manufactured points',()=>{
 const pa=one('G049-06','Elongation at break');assert.equal(pa.Operator,'>');assert.equal(pa['Normalized value'],'50');assert.equal(pa['Normalized upper bound'],'Not applicable');assert.equal(pa.Standards,'ISO 527');assert.equal(pa['Moisture state'],'not-stated');
 const pp=one('G083-04','Water absorption');assert.equal(pp.Operator,'<');assert.equal(pp['Normalized value'],'1');assert.equal(pp['Specimen / print parameters'],'after 24h of submersion');assert.equal(pp.Standards,'Not published');assert.equal(pp['Test temperature °C'],'Not published');
 assert.equal(sources.find(s=>s.SourceID===pp.SourceID).SHA256,'b9bb98021c7100391fcb6a310d2469943681988ef9d7c3825c54ea1522983aae');
});
test('Nanovia TPU70D retains own28MPa/320% without inventing printed, conditioned or annealed specimens',()=>{
 for(const[prop,n]of[['Tensile strength (endpoint unspecified)','28'],['Elongation at break','320']]){const m=one('G039-45',prop);assert.equal(m['Normalized value'],n);assert.equal(m.SourceID,'R-NANOVIA-TPU-70D');assert.equal(m['Specimen type'],'Not published (do not assume printed)');assert.equal(m.Direction,'Unstated');assert.equal(m['Moisture state'],'not-stated');assert.equal(m['Post-processing state'],'not-stated');}
 assert.equal(one('G039-45','Tensile stress at 100 % elongation')['Normalized value'],'20');assert.equal(one('G039-45','Tensile stress at 300 % elongation')['Normalized value'],'28');
});
test('Nanovia thermal and MFR intervals retain both endpoints and unstated MFR conditions',()=>{
 for(const g of['G024-11','G020-39','G025-03','G026-08'])assert.equal(one(g,'Glass transition temperature')['Normalized value'],'80');
 for(const g of['G001-98','G001-135']){const m=one(g,'Glass transition temperature');assert.equal(m['Normalized value'],'55');assert.equal(m['Normalized upper bound'],'60');}
 const mfr=one('G001-98','Melt mass-flow rate');assert.equal(mfr['Normalized value'],'7');assert.equal(mfr['Normalized upper bound'],'9');assert.equal(mfr['Test temperature °C'],'Not published');assert.equal(mfr['Specimen / print parameters'],'Not published');
});
test('Nanovia actual0° PETG tab cannot become an unstated XY observation',()=>{
 const m=measurements.find(m=>m.MeasurementID==='V007529');assert.equal(m['Normalized value'],'2.26');assert.equal(m['Specimen type'],'Printed specimen');assert.equal(m.Direction,'Stated, not a usable direction');assert.match(m['Specimen / print parameters'],/at 0°/);
 assert.equal(own('G020-39','Tensile strength (endpoint unspecified)').length,0,'conflicting repeated0° prose does not admit guessed45° strength');
});
test('Nanovia PAFI specimen geometry/speed does not assert a printed or moulded form',()=>{
 for(const id of['V011205','V011512','V011513']){const m=measurements.find(m=>m.MeasurementID===id);assert.equal(m['Specimen / print parameters'],'Test performed at 50mm/min on ISO 3167 A test specimens');assert.equal(m['Specimen type'],'Not published (do not assume printed)');assert.equal(m['Moisture state'],'not-stated');}
});
test('Nanovia SDS reactivity and UV warning narratives never manufacture resistance verdicts',()=>{
 const rows=table('evidence').filter(r=>r.SourceID.startsWith('R-NANOVIA-PRIORITY-20261002-')&&r.Domain==='Durability');assert.equal(rows.length,20);
 for(const r of rows){assert.equal(classifyFinding(r.Finding).verdict,'narrative');assert.equal(r['Rating 1–5'],'Not published');assert.match(r['Exposure / conditions'],/not stated/);}
});
test('Nanovia PA Rail test summary remains raw-material guidance with its requirement/method conflict',()=>{
 const rows=table('evidence').filter(r=>r.SourceID==='R-NANOVIA-PRIORITY-20261002-a570add2d2c7');assert.equal(rows.length,3);
 for(const r of rows)assert.equal(r.Domain,"Makers' know-how");assert.match(rows[0]['Exposure / conditions'],/raw material/);assert.ok(rows.some(r=>/R22\/R33/.test(r['Exposure / conditions'])));assert.ok(rows.some(r=>/ENISO4589-2/.test(r['Exposure / conditions'])));
});
