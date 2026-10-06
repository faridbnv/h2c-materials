// Independent expected facts from the page images listed in the published-evidence READINGS.csv, not generated
// from the assessment under test. The release-wide comparison is separately a consistency check.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessMeasurement, summaryEntries } from '../app/js/engine/published-values.js';
import { assess } from '../build/src/products.js';
import { classifyTopic } from '../build/src/normalize/chemical.js';
import { renderDrawer } from '../app/js/ui/detail.js';
import { useRegistry } from '../app/js/ui/registry.js';
import { productsByMaterial } from '../app/js/engine/products.js';
const db = JSON.parse(readFileSync(new URL('../dist/db.json', import.meta.url)));
const ms = new Map(db.measurements.map(m=>[m.id,m]));
const gs = new Map(db.grades.map(g=>[g.id,g]));
const defs = new Map(db.registry.headlines.map(h=>[h.key,h]));
const state = (tempC, hours) => ({ treatment: tempC == null ? null : {tempC,hours}, moisture:'dry' });
const own = m=>db.measurements.filter(x=>x.gradeId===m.gradeId);

test('source fixtures: Bambu notches and preparation decide only for the published state',()=>{
 const fixtures=[['G002-01',7.9,'Notched',55,8],['G006-01',72.3,'Notched',50,8],['G022-01',6.2,'Notched',75,8]];
 for(const [grade,value,notch,temp,hours] of fixtures){const m=db.measurements.find(x=>x.gradeId===grade&&x.property==='Charpy strength'&&x.direction==='XY'&&x.value===value&&x.notch===notch);
  assert.ok(m,grade);assert.equal(m.postProcessingState,'annealed');assert.deepEqual(m.anneal,{tempC:temp,hours});
  assert.match(assessMeasurement(m,defs.get('charpyNotched'),own(m),state()).excluded,/not as printed/);
  assert.equal(assessMeasurement(m,defs.get('charpyNotched'),own(m),state(temp,hours)).level,'comparable');
 }
 for(const [grade,value] of [['G002-01',26.6],['G006-01',80.6],['G022-01',31.5]]) {const m=db.measurements.find(x=>x.gradeId===grade&&x.direction==='XY'&&x.value===value&&x.property==='Charpy strength');assert.equal(m.notch,'Unnotched');assert.match(assessMeasurement(m,defs.get('charpyNotched'),own(m),state(m.anneal.tempC,m.anneal.hours)).excluded,/unnotched/);}
});

test('source fixtures: PolyLite PETG and contradictory labels retain separate meanings',()=>{
 const m=ms.get('V000408');assert.equal(m.value,2.6);assert.equal(m.notch,'Notched');assert.equal(m.direction,'XY');assert.equal(assessMeasurement(m,defs.get('charpyNotched'),own(m),state()).level,'comparable');
 const any=ms.get('V012566');assert.equal(any.value,28);assert.equal(any.property,'Izod impact strength');assert.deepEqual(any.standards,['ISO 179']);assert.ok(assessMeasurement(any,defs.get('izodNotched'),own(any),state()).excluded);
 const resin=db.measurements.find(x=>x.sourceId==='R-COLORFABB-TDS-E-ColorFabb-PETG-Economy'&&x.value===107);assert.equal(resin.unit,'J/m');assert.equal(resin.specimenForm,'moulded');assert.ok(assessMeasurement(resin,defs.get('izodNotched'),own(resin),state()).excluded);
});

test('shared compiled-form assessment matches the vocabulary-validating build for every measured headline and state',()=>{
 for(const g of db.grades){const rows=own({gradeId:g.id});for(const m of rows)for(const h of db.registry.headlines.filter(h=>h.kind==='measurement'&&h.valueProperties.includes(m.property)))for(const s of [null,...(g.states??[])])assert.deepEqual(assessMeasurement(m,h,rows,s),assess(m,h,rows,s),`${m.id} ${h.key} ${s?.id}`);}
});

test('derived impact contributor lists have the exact compiled summary population, including variants and shared sheets',()=>{
 for(const m of db.materials)for(const key of ['charpyNotched','izodNotched'])if(m.summary?.[key]){const xs=summaryEntries(m,gs,key).entries.filter(e=>!e.variant&&e.v.level==='comparable');assert.equal(xs.length,m.summary[key].n,`${m.id} ${key}`);}
});

test('impact claims are nonfilterable and do not enter deciding evidence',()=>{
 assert.equal(classifyTopic('Impact and toughness').filterable,false);
 const claims=db.knowHow.filter(k=>k.topic==='Impact and toughness');assert.equal(claims.length,15);assert.equal(new Set(claims.map(k=>k.id)).size,15);
 assert.equal(claims.filter(k=>k.gradeId==='G006-01').length,3);assert.ok(claims.some(k=>k.gradeId==='G001-24'&&k.text.includes('regular PLA')));
 assert.ok(claims.every(k=>!db.evidence.some(e=>e.id===k.id)));
});

const group=rows=>{const out=new Map();for(const r of rows){if(!out.has(r.materialId))out.set(r.materialId,[]);out.get(r.materialId).push(r);}return out;};
function drawer(tab){useRegistry(db.registry);const host={innerHTML:'',querySelectorAll:()=>[],querySelector:s=>['#drawer-close','#drawer-pin'].includes(s)?{addEventListener(){}}:null};renderDrawer(host,{db,selectedMaterialId:'M001',drawerTab:tab,selection:{evaluations:[]},scenario:{shortlist:[],unknownPolicy:'strict'},ctx:{db,evidence:'comparable',productsByMaterial:productsByMaterial(db),measurementsByMaterial:group(db.measurements),evidenceByMaterial:group(db.evidence),coverageByMaterial:group(db.coverage)}},{});return host.innerHTML;}
test('the existing drawers reuse statement IDs, expose unknown conditions and exclude annealed evidence as printed',()=>{
 const mech=drawer('Mechanical'),products=drawer('Grades');
 for(const k of db.knowHow.filter(k=>k.materialId==='M001'&&k.topic==='Impact and toughness')){assert.ok(mech.includes(`data-statement="${k.id}"`),k.id);assert.ok(products.includes(`data-statement="${k.id}"`),k.id);assert.equal((mech.match(new RegExp(`data-statement="${k.id}"`,'g'))??[]).length,1);}
 assert.match(mech,/What the maker says about impact and toughness/);assert.match(mech,/impact-product-name">Bambu Lab PLA Tough\+/);assert.match(mech,/not as printed/);assert.match(mech,/<dt>Test temperature<\/dt><dd>not stated<\/dd>/);assert.match(mech,/including different commercial formulations/);
 assert.match(products,/data-open-source="R-BAMBU-PLA-TOUGH-20261005"/);
});

// Extrudr PLA Tough already publishes toughness wording under a general topic. This round did not re-read it.
test('an unreviewed impact topic is not described as maker silence when other topics retain a toughness claim',()=>{
 const g=gs.get('G001-32');assert.ok(db.knowHow.some(k=>k.gradeId===g.id&&/less brittle|toughness/i.test(k.text)));
 assert.ok(!db.knowHow.some(k=>k.gradeId===g.id&&k.topic==='Impact and toughness'));
 const html=drawer('Grades');assert.ok(html.includes('This topic has not been reviewed for it'));
 const gaps=html.match(/<p class="fine">Not stated by the maker:[\s\S]*?<\/p>/g)??[];
 assert.ok(gaps.every(x=>!x.includes('impact and toughness')));
});
