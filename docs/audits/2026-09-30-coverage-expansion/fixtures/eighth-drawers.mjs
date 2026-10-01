import assert from'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';
import{renderDrawer}from'../../../../app/js/ui/detail.js';
import{esc}from'../../../../app/js/ui/format.js';
import{useRegistry}from'../../../../app/js/ui/registry.js';
const db=JSON.parse(readFileSync('dist/db.json'));useRegistry(db.registry);const group=xs=>{const m=new Map();for(const x of xs){if(!m.has(x.materialId))m.set(x.materialId,[]);m.get(x.materialId).push(x);}return m;};
const cases=[];
for(const mid of ['M149','M150','M160','M164'])for(const tab of ['Grades','Environment','Coverage']){
 const host={innerHTML:'',querySelectorAll:()=>[],querySelector:s=>['#drawer-close','#drawer-pin'].includes(s)?{addEventListener(){}}:null};
 renderDrawer(host,{db,selectedMaterialId:mid,drawerTab:tab,selection:{evaluations:[]},scenario:{shortlist:[],unknownPolicy:'strict'},ctx:{measurementsByMaterial:group(db.measurements),evidenceByMaterial:group(db.evidence),coverageByMaterial:group(db.coverage)}},{});
 if(tab==='Grades')for(const k of db.knowHow.filter(k=>k.materialId===mid&&['Q05426','Q05427','Q05432'].includes(k.id)))assert.ok(host.innerHTML.includes('Scope and conditions: '+esc(k.exposure.trim())),k.id+' scope absent');
 if(tab==='Environment')for(const e of db.evidence.filter(e=>e.materialId===mid&&Number(e.id.slice(1))>=5428&&Number(e.id.slice(1))<=5451)) {assert.ok(host.innerHTML.includes(esc(e.finding)),e.id+' finding absent');if(e.exposure)assert.ok(host.innerHTML.includes(esc(e.exposure)),e.id+' scope absent');}
 if(tab==='Coverage')assert.ok(host.innerHTML.includes('Reviewed with limitations'));
 cases.push({material:mid,tab,actualDrawerHTML:true});
}
writeFileSync(process.argv[2],JSON.stringify({basis:'Actual renderDrawer HTML, scoped independently reviewed records; content assertion does not claim browser layout or human review',release:db.meta.release.id,cases},null,2)+'\n');console.log('12 changed material/tab drawer content fixtures passed');
