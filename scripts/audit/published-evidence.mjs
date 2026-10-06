import { gunzipSync } from 'node:zlib';
// This round's reproducible impact inventory and deterministic target selection. Reads the compiled database only.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assess } from '../../build/src/products.js';
import { scenarioStates, productHeadline } from '../../app/js/engine/products.js';
const out = 'docs/audits/2026-10-06-published-evidence';
mkdirSync(out, { recursive: true });
const arg = (name, fallback) => { const i=process.argv.indexOf('--'+name); return i < 0 ? fallback : process.argv[i+1]; };
const phase=arg('phase','baseline');
const input=arg('db','dist/db.json');
const db = JSON.parse(input.endsWith('.gz')?gunzipSync(readFileSync(input)):readFileSync(input));
const facts = JSON.parse(readFileSync(`${out}/scenario-facts.json`)).facts;
const seed = ['G002-01', 'G006-01', 'G001-24', 'G001-27', 'G001-30', 'G022-01', 'G020-13', 'G020-16'];
const source = new Map(db.sources.map(s => [s.id, s]));
const mats = new Map(db.materials.map(m => [m.id, m]));
const grades = db.grades.filter(g => !g.retired && mats.get(g.materialId)?.gradeIds?.includes(g.id));
const sourceGrades = new Map();
for (const x of [...db.grades.map(g=>({sourceId:g.sourceId,gradeId:g.id})),...db.measurements]) { if(!sourceGrades.has(x.sourceId))sourceGrades.set(x.sourceId,new Set());sourceGrades.get(x.sourceId).add(x.gradeId); }
const impact = db.measurements.filter(m => /Charpy|Izod|impact/i.test(m.property));
const defs = db.registry.headlines.filter(h => ['charpyNotched', 'izodNotched'].includes(h.key));
const claims = (db.knowHow ?? []).filter(k => /tough|impact|brittle|ductil/i.test(k.text));
const measurements = impact.map(m => ({ ...m, sha256: source.get(m.sourceId)?.sha256,
  eligibility: defs.filter(h => h.valueProperties.includes(m.property)).map(h => ({key:h.key, ...assess(m,h, db.measurements.filter(x=>x.gradeId===m.gradeId))})),
  compiledOwners: grades.filter(g => defs.some(h => g.headline?.[h.key]?.measurementId===m.id)).map(g => g.id),
}));
const contributors = db.materials.flatMap(m => defs.map(h => ({materialId:m.id,key:h.key,summary:m.summary?.[h.key],
  products:grades.filter(g=>g.materialId===m.id && !g.variant && g.headline?.[h.key]?.level==='comparable')
    .map(g=>({gradeId:g.id,maker:g.manufacturer,product:g.product,...g.headline[h.key]}))}))).filter(x=>x.summary);
const candidates = grades.map(g=>{
  const rows=measurements.filter(m=>m.gradeId===g.id);
  const owns=contributors.filter(c=>c.products.some(p=>p.gradeId===g.id)).length;
  const conflicting=rows.filter(m=>(/Charpy/.test(m.property)&&m.standards?.includes('ISO 180')) || (/Izod/.test(m.property)&&m.standards?.includes('ISO 179')));
  const recoverable=rows.filter(m=>m.numeric && m.eligibility.some(a=>a.caveat==='unstated-direction'||/does not state whether|not a printed part/.test(a.excluded??'')));
  const claim=claims.filter(k=>k.gradeId===g.id);
  const tier=conflicting.length?1:recoverable.length?2:claim.length?3:rows.length?4:null;
  const relevant=conflicting.length?conflicting:recoverable.length?recoverable:rows;
  const sourceIds=[...new Set([...relevant.map(m=>m.sourceId),...claim.map(k=>k.sourceId),g.sourceId])].sort();
  const stateAnswers=g.states?.length??1;
  return {gradeId:g.id,materialId:g.materialId,maker:g.manufacturer,product:g.product,tier,
    affectedStateAnswers: stateAnswers,summaryContributors:owns,
    sourceCoverage:Math.max(0,...sourceIds.map(id=>sourceGrades.get(id)?.size??0)),
    sourceIds,measurementIds:rows.map(m=>m.id),claimIds:claim.map(k=>k.id),
    reasons:conflicting.length?['method label conflicts with recorded ISO test']:recoverable.length?['published impact with unstated deciding conditions']:claim.length?['impact/toughness claim filed under a general topic']:rows.length?['other recorded impact evidence']:[],
    stop:'Read held originals and prior outcomes first; absent/contradictory printed conditions stay held. At most three official routes for an unanswered question.'};
}).filter(c=>c.tier);
const ordered=candidates.filter(c=>!seed.includes(c.gradeId)).sort((a,b)=>a.tier-b.tier||b.affectedStateAnswers-a.affectedStateAnswers||b.summaryContributors-a.summaryContributors||b.sourceCoverage-a.sourceCoverage||a.gradeId.localeCompare(b.gradeId)||a.sourceIds[0].localeCompare(b.sourceIds[0]));
const e3=ordered.slice(0,8).map(c=>({...c,stage:'E3'}));
const used=new Set([...seed,...e3.map(c=>c.gradeId)]);
const practical= facts.filter(f=>!used.has(f.gradeId) && /nozzle|bed|chamber|drying|anneal|treatment/i.test(f.requirement) && f.kind!=='print test').map(f=>{
 const g=grades.find(g=>g.id===f.gradeId); const s=source.get(g.sourceId);
 const sha=s?.sha256; const held=sha&&existsSync(`.cache/sources/by-sha/${sha}.pdf`);
 return {...f,maker:g.manufacturer,product:g.product,sourceIds:[g.sourceId],held:!!held,official:!!s?.url,errorReuse:grades.filter(x=>x.sourceId===g.sourceId).length,
  stop:'Reuse terminal dated search outcomes; otherwise three official routes maximum. No chamber inference or H2C test substitute.'};
}).sort((a,b)=>b.questions.length-a.questions.length||Number(b.held)-Number(a.held)||Number(b.official)-Number(a.official)||b.errorReuse-a.errorReuse||a.gradeId.localeCompare(b.gradeId)||a.sourceIds[0].localeCompare(b.sourceIds[0]));
const e4=[]; for(const p of practical) {if(e4.length===8)break; if(!e4.some(x=>x.gradeId===p.gradeId))e4.push({...p,stage:'E4'});}
const targets=[...seed.map(id=>({...candidates.find(c=>c.gradeId===id),gradeId:id,stage:'E2'})),...e3,...e4];
const measurementById = new Map(db.measurements.map(m=>[m.id,m]));
const scenarioResults=grades.flatMap(g=>defs.flatMap(h=>[{}, {anneal:true}, {moisture:'conditioned'}].flatMap(policy=>scenarioStates(g,policy).flatMap(state=>{
 const v=productHeadline(mats.get(g.materialId),g,h.key,{db,measurementById},state);
 return [5,10,20,40,80].map(limit=>({gradeId:g.id,key:h.key,policy,state:state.id,limit,known:!!v?.known,value:v?.value??null,measurementId:v?.measurementId??null,answer:v?.known?(v.value>=limit?'pass':'fail'):'unknown'}));
}))));
const write=(name,obj)=>writeFileSync(`${out}/${name}`,JSON.stringify(obj)+'\n');
if(phase!=='validation')write(phase==='baseline'?'impact-inventory.json':`impact-inventory-${phase}.json`,{release:db.meta.release,priorityMetric:'distinct product states potentially affected by a reading, not actual changed answers',measurements,claims,contributors,scenarioResults});
if(!existsSync(`${out}/targets.json`))write('targets.json',targets);
if(phase==='validation') {
 const frozen=JSON.parse(readFileSync(`${out}/targets.json`));
 const previous=frozen.filter(t=>t.stage==='E3').map(t=>t.gradeId), corrected=e3.map(t=>t.gradeId);
 if(JSON.stringify(previous)!==JSON.stringify(corrected))throw new Error('Corrected distinct-state priority changed assignments; reconcile before rewriting');
 if(!existsSync(`${out}/targets-initial.json`))writeFileSync(`${out}/targets-initial.json`,readFileSync(`${out}/targets.json`));
 write('targets.json',frozen.map(t=>({...t,...(t.stage==='E4'?{}:{affectedStateAnswers:candidates.find(c=>c.gradeId===t.gradeId)?.affectedStateAnswers??0})})));
 write('priority-validation.json',{previous,corrected,assignmentsChanged:false,reason:'Count distinct product/state answers once rather than once per suspect source record; frozen product assignments unchanged.'});
}
write('pending-impact.json',ordered.filter(c=>!targets.some(t=>t.gradeId===c.gradeId)));
write('pending-practical.json',practical.filter(c=>!targets.some(t=>t.gradeId===c.gradeId)));
console.log(JSON.stringify({release:db.meta.release,impactRows:impact.length,claims:claims.length,targets:targets.map(t=>({stage:t.stage,gradeId:t.gradeId,product:t.product,tier:t.tier,requirement:t.requirement})),checksum:createHash('sha256').update(readFileSync(`${out}/targets.json`)).digest('hex')},null,2));
