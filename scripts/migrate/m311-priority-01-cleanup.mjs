// GOALS steps2/5: own-source composition, canonical wording and updated environmental judgment.
import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{join}from'node:path';
import{openTables,projectRoot}from'../data/table-io.mjs';import{locate}from'../data/source-store.mjs';
const migration='m311-priority-01-cleanup',at=join(projectRoot,'docs/audits/2026-09-30-coverage-expansion'),bytes=readFileSync(join(at,'priority-01-cleanup-packet.json')),hash=createHash('sha256').update(bytes).digest('hex'),review=JSON.parse(readFileSync(join(at,'priority-01-cleanup-review.json')));
if(hash!=='e650c788a2a7d8ac085d60dd89c34f277fc7625ab52619d111f3e5e52f4380ad'||review.input_sha256!==hash||review.overall_verdict!=='APPROVE')throw Error(`${migration}: changed or unreviewed packet`);
const p=JSON.parse(bytes),t=openTables(),agrees=(r,e)=>r&&Object.entries(e).every(([k,v])=>r[k]===v),keys={grades:'GradeID',evidence:'EvidenceID'};
for(const s of p.ExpectedSources){const o=locate(s.SHA256,s.SourceID);if(!agrees(t.get('sources',s.SourceID),s)||o.bytes!=='present'||createHash('sha256').update(readFileSync(o.path)).digest('hex')!==s.SHA256)throw Error(`${migration}: source/original ${s.SourceID} moved`);}
for(const o of p.Operations){const key=keys[o.Table];if(!key||o.Expected[key]!==o.Proposed[key])throw Error(`${migration}: invalid operation`);const r=t.get(o.Table,o.Expected[key]);if(!agrees(r,o.Expected)&&!agrees(r,o.Proposed))throw Error(`${migration}: ${o.Expected[key]} moved`);}
const pending=[];
for(const o of p.CoverageOperations){
 const basis=p.Operations.find(x=>x.Table==='evidence'&&x.Expected.EvidenceID===o.BasisEvidenceID);if(!basis||basis.Expected.SourceID!==o.SourceID)throw Error(`${migration}: judgment basis missing`);
 const already=t.rows('coverage').find(r=>r.MaterialID===o.Proposed.MaterialID&&r.Domain===o.Proposed.Domain&&r.Finding===o.Proposed.Finding);
 if(already){if(!agrees(already,o.Proposed))throw Error(`${migration}: judgment moved`);for(const old of o.ExpectedRows)if(!agrees(t.get('coverage',old.CoverageID),{...old,Status:'Superseded',Finding:`Superseded by ${already.CoverageID}: ${old.Finding}`}))throw Error(`${migration}: superseded judgment moved`);}
 else{for(const old of o.ExpectedRows)if(!agrees(t.get('coverage',old.CoverageID),old))throw Error(`${migration}: old judgment moved`);pending.push(o);}
}
const records=[];
for(const o of p.Operations){const key=keys[o.Table],r=t.get(o.Table,o.Expected[key]);if(agrees(r,o.Proposed))continue;for(const[f,v]of Object.entries(o.Proposed))if(f!==key&&v!==o.Expected[f])t.set(o.Table,o.Expected[key],f,v,{expect:o.Expected[f]});records.push({operation:o.OperationID,table:o.Table,id:o.Expected[key]});}
for(const o of pending){const id=t.nextId('coverage');t.append('coverage',{CoverageID:id,...o.Proposed});for(const old of o.ExpectedRows){t.set('coverage',old.CoverageID,'Status','Superseded',{expect:old.Status});t.set('coverage',old.CoverageID,'Finding',`Superseded by ${id}: ${old.Finding}`,{expect:old.Finding});}records.push({operation:o.OperationID,table:'coverage',id});}
if(records.length)t.save();console.log(JSON.stringify({migration,packet:hash,written:records.length,records},null,2));
