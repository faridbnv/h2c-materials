// Literal observations independently reread from PC-Max p1/p2 and TPU90V5.5, not inferred from engine output.
import test from 'node:test';import assert from 'node:assert/strict';import{readCsv}from'../build/src/csv.js';
const table=n=>readCsv(new URL(`../data/tables/${n}.csv`,import.meta.url)).records.map(r=>r.values),m=table('measurements'),s=table('sources');
const pc='S-POLYCN-Polymaker-PC-Max-TDS-v1-0',tpu='R-POLYMAKER-PRIORITY-20261002-8c3c83807f63';
const own=(sid,property)=>m.find(r=>r.SourceID===sid&&r.Property===property);
test('PC-Max own flat-bar drawings support printed XY results, without an invented moisture or treatment state',()=>{
 for(const[p,n,u]of[['Tensile modulus','2.048','0.066'],['Tensile strength (endpoint unspecified)','59.7','1.8'],['Elongation at break','12.24','1.44'],['Flexural modulus','2.044','0.055'],['Flexural strength','94.1','0.9']]){
  const r=own(pc,p);assert.equal(r['Normalized value'],n);assert.equal(r['Normalized uncertainty ±'],u);assert.equal(r.Direction,'XY');assert.equal(r['Specimen type'],'Printed specimen');assert.equal(r['Moisture state'],'not-stated');assert.equal(r['Post-processing state'],'not-stated');assert.match(r['Specimen / print parameters'],/255 °C/);assert.match(r['Specimen / print parameters'],/60 mm\/s/);
 }
 assert.equal(s.find(r=>r.SourceID===pc).SHA256,'cdc310fbb5fb150d315faa112f82b9794107a748b4c0babf0f5cfccc27e6d6fe');
 assert.equal(Number(own(pc,'Density')['Normalized value']),1180);assert.equal(Number(own(pc,'Density')['Normalized upper bound']),1200);assert.equal(own(pc,'Melt mass-flow rate')['Test temperature °C'],'300');assert.equal(own(pc,'Melt mass-flow rate')['Normalized upper bound'],'26');
 assert.equal(own(pc,'Impact strength'),undefined,'D256/ISO179 conflict does not become a guessed Charpy/Izod input');
});
test('TPU90 coherent V5.5 source preserves ISO37 stress distinctions and its own recipe, apart from mislabelled V5.6',()=>{
 assert.equal(s.find(r=>r.SourceID===tpu).Revision,'V5.5');assert.equal(s.find(r=>r.SourceID===tpu).SHA256,'8c3c83807f63b025181088de281ddff20b2893231d02f50cb1af9c8879b71a26');
 for(const[p,n]of[['Tensile strength (endpoint unspecified)','30.1'],['Elongation at break','592.1'],['Tensile stress at 100 % elongation','7.1'],['Tensile stress at 200 % elongation','9'],['Tensile stress at 300 % elongation','13.2']]){const r=own(tpu,p);assert.equal(r['Normalized value'],n);assert.equal(r.Standards,'ISO 37; GB/T 528');assert.equal(r['Moisture state'],'not-stated');assert.equal(r.Direction,'XY');assert.match(r['Specimen / print parameters'],/230 °C/);}
 assert.equal(own(tpu,'Tensile modulus'),undefined);assert.equal(own(tpu,'Elongation at break')['Raw unit'],'%');
 const ambiguous=table('evidence').filter(r=>r.SourceID==='S-POLYCN-TDS-Polymaker-PolyFlex-TPU90-V5-6-2025-12-11-EN'&&r.Topic==='Pitfalls and limitations');assert.equal(ambiguous.length,5);for(const r of ambiguous){assert.equal(r.Domain,"Makers' know-how");assert.match(r['Exposure / conditions'],/PC-ABS Black/);}
});
test('ABS Pro own minimum has no invented maximum and displaces its earlier enclosure-only shortcut',()=>{
 const p=table('profiles'),r=p.find(r=>r.SourceID==='R-POLYMAKER-PRIORITY-20261002-29b58f0eea90');assert.equal(r['Chamber min °C'],'50');assert.equal(r['Chamber max °C'],'Not published');assert.equal(r['Chamber requirement'],'required');assert.equal(r['Nozzle °C'],'270˚C - 290˚C');assert.equal(r['Nozzle min °C'],'270');assert.equal(r['Nozzle max °C'],'290');assert.equal(r['Hardened nozzle'],'FALSE');/* reader round (m342), 2026-10-04: the page prints "Printing Temperature: 270˚C - 290˚C" and answers "Does ABS Pro require a hardened nozzle? No." (the campaign recorded only the chamber) */assert.equal(p.find(r=>r.ProfileID==='P0292')['Chamber state'],'unknown');
});
