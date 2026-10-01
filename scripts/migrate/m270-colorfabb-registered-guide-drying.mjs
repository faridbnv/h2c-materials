// GOALS steps2/5 C3/C9/C10: reuse an unchanged registered original; dry-only recipes.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {openTables,projectRoot} from '../data/table-io.mjs';
import {locate} from '../data/source-store.mjs';
const migration='m270-colorfabb-registered-guide-drying',at=join(projectRoot,'docs/audits/2026-09-30-coverage-expansion');
const digest=b=>createHash('sha256').update(b).digest('hex');
const bytes=readFileSync(join(at,'tenth-cached-guide-packet.json')),hash=digest(bytes),review=JSON.parse(readFileSync(join(at,'tenth-cached-guide-review.json')));
if(hash!=='d4672a7774298c37212f54c222aefd1d6e0bc914bd71b637d20859604673a94d'||review.input_sha256!==hash||review.overall_verdict!=='APPROVE')throw Error(`${migration}: changed or unreviewed packet`);
const p=JSON.parse(bytes),t=openTables(),agrees=(row,expected)=>row&&Object.entries(expected).every(([k,v])=>row[k]===v);
for(const g of p.ExpectedGrades)if(!agrees(t.get('grades',g.GradeID),g))throw Error(`${migration}: ${g.GradeID} moved`);
const s=t.get('sources',p.ExpectedSource.SourceID);
if(!agrees(s,p.ExpectedSource)&&!agrees(s,p.ProposedSource))throw Error(`${migration}: source moved`);
const original=locate(p.ExpectedSource.SHA256,p.ExpectedSource.SourceID);
if(original.bytes!=='present'||digest(readFileSync(original.path))!==p.ExpectedSource.SHA256)throw Error(`${migration}: original missing or changed`);
const groups=[['evidence','EvidenceID',p.ProposedEvidence],['profiles','ProfileID',p.ProposedProfiles]];
for(const[table,,rows]of groups)for(const expected of rows){
 const existing=t.rows(table).find(r=>r.SourceID===expected.SourceID&&r.Locator===expected.Locator&&(table!=='evidence'||r.Topic===expected.Topic));
 if(existing&&!agrees(existing,expected))throw Error(`${migration}: previously admitted ${table} moved`);
 if(agrees(s,p.ProposedSource)&&!existing)throw Error(`${migration}: previously admitted ${table} missing`);
}
const records=[];
for(const[field,value]of Object.entries(p.ProposedSource))if(s[field]!==value){t.set('sources',s.SourceID,field,value,{expect:p.ExpectedSource[field]});records.push({table:'sources',id:s.SourceID,field});}
for(const[table,key,rows]of groups)for(const expected of rows){
 if(t.rows(table).some(r=>r.SourceID===expected.SourceID&&r.Locator===expected.Locator&&(table!=='evidence'||r.Topic===expected.Topic)))continue;
 const id=t.nextId(table);t.append(table,{[key]:id,...expected});records.push({table,id,grade:expected.GradeID});
}
t.save();console.log(JSON.stringify({migration,packet:hash,written:records.length,records},null,2));
