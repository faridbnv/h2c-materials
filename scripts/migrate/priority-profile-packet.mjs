// Reviewed own-product profiles only; preflight full expected records and originals before allocating IDs.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {openTables,projectRoot} from '../data/table-io.mjs';
import {locate} from '../data/source-store.mjs';
export function applyPriorityProfilePacket(name,digest,migration){
 const at=join(projectRoot,'docs/audits/2026-09-30-coverage-expansion');
 const bytes=readFileSync(join(at,`${name}-packet.json`)),hash=createHash('sha256').update(bytes).digest('hex');
 const review=JSON.parse(readFileSync(join(at,`${name}-review.json`)));
 if(hash!==digest||review.input_sha256!==hash||review.overall_verdict!=='APPROVE')throw Error(`${migration}: changed or unreviewed packet`);
 const p=JSON.parse(bytes),t=openTables(),keys={profiles:'ProfileID'};
 const agrees=(row,expected)=>row&&Object.entries(expected).every(([k,v])=>row[k]===v);
 for(const g of p.ExpectedGrades)if(!agrees(t.get('grades',g.GradeID),g))throw Error(`${migration}: grade ${g.GradeID} moved`);
 for(const s of p.ExpectedSources){
  if(!agrees(t.get('sources',s.SourceID),s))throw Error(`${migration}: source ${s.SourceID} moved`);
  const o=locate(s.SHA256,s.SourceID);
  if(o.bytes!=='present'||createHash('sha256').update(readFileSync(o.path)).digest('hex')!==s.SHA256)throw Error(`${migration}: original ${s.SourceID} missing or changed`);
 }
 const work=[];
 for(const o of p.Operations){
  const key=keys[o.Table];if(!key||!['append','edit'].includes(o.Kind))throw Error(`${migration}: invalid operation`);
  if(o.Kind==='edit'){
   const id=o.Expected[key];if(o.Proposed[key]!==id)throw Error(`${migration}: changed identity`);
   const current=t.get(o.Table,id);if(agrees(current,o.Proposed))continue;
   if(!agrees(current,o.Expected))throw Error(`${migration}: ${id} moved`);
  }else{
   if(key in o.Proposed)throw Error(`${migration}: IDs allocated only during injection`);
   const matches=t.rows(o.Table).filter(r=>r.GradeID===o.Proposed.GradeID&&r.SourceID===o.Proposed.SourceID&&r.Locator===o.Proposed.Locator);
   if(matches.length){if(matches.length!==1||!agrees(matches[0],o.Proposed))throw Error(`${migration}: previously admitted ${o.OperationID} moved`);continue;}
  }
  work.push(o);
 }
 const records=[];
 for(const o of work){const key=keys[o.Table];if(o.Kind==='edit'){
  for(const[field,value]of Object.entries(o.Proposed))if(field!==key&&value!==o.Expected[field])t.set(o.Table,o.Expected[key],field,value,{expect:o.Expected[field]});
  records.push({operation:o.OperationID,table:o.Table,id:o.Expected[key],kind:'edit'});
 }else{const id=t.nextId(o.Table);t.append(o.Table,{[key]:id,...o.Proposed});records.push({operation:o.OperationID,table:o.Table,id,kind:'append'});}}
 if(records.length)t.save();
 console.log(JSON.stringify({migration,packet:hash,written:records.length,records},null,2));return records;
}
