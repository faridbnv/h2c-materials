// GOALS step5/C3/C10/C11: source-only transcription and publisher corrections.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {openTables,projectRoot} from '../data/table-io.mjs';
import {locate} from '../data/source-store.mjs';
const migration='m268-coc-text-and-graphene-source-publishers',at=join(projectRoot,'docs/audits/2026-09-30-coverage-expansion');
const bytes=readFileSync(join(at,'ninth-source-corrections-packet.json')),hash=createHash('sha256').update(bytes).digest('hex');
const review=JSON.parse(readFileSync(join(at,'ninth-source-corrections-review.json')));
if(hash!=='03a1478473c795e974c3f40ee8d60fdedc8707eebf4a9faad014251989b79aaa'||review.input_sha256!==hash||review.overall_verdict!=='APPROVE')throw Error(`${migration}: changed or unreviewed packet`);
const p=JSON.parse(bytes),t=openTables(),agrees=(row,expected)=>row&&Object.entries(expected).every(([k,v])=>row[k]===v);
const nextRow=(table,id)=>p.Operations.find(o=>o.Table===table&&o.Key===id)?.Proposed;
const check=(row,expected,table,id)=>{const next=nextRow(table,id);if(!agrees(row,expected)&&!(next&&agrees(row,next)))throw Error(`${migration}: ${id} moved`);};
for(const g of p.ExpectedGrades)check(t.get('grades',g.GradeID),g,'grades',g.GradeID);
for(const s of p.ExpectedSources){
 check(t.get('sources',s.SourceID),s,'sources',s.SourceID);
 const original=locate(s.SHA256,s.SourceID);
 if(original.bytes!=='present'||createHash('sha256').update(readFileSync(original.path)).digest('hex')!==s.SHA256)throw Error(`${migration}: original missing or changed`);
}
const keys={evidence:'EvidenceID',grades:'GradeID',sources:'SourceID'};
for(const o of p.Operations){if(!keys[o.Table]||o.Expected[keys[o.Table]]!==o.Key||o.Proposed[keys[o.Table]]!==o.Key)throw Error(`${migration}: invalid operation`);check(t.get(o.Table,o.Key),o.Expected,o.Table,o.Key);}
const records=[];
for(const o of p.Operations){let fields=0;for(const[field,value]of Object.entries(o.Proposed)){if(field===keys[o.Table]||t.get(o.Table,o.Key)[field]===value)continue;t.set(o.Table,o.Key,field,value,{expect:o.Expected[field]});fields++;}if(fields)records.push({operation:o.OperationID,table:o.Table,id:o.Key,fields});}
t.save();console.log(JSON.stringify({migration,packet:hash,written:records.length,records},null,2));
