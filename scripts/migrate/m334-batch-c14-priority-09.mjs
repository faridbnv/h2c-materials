// GOALS steps 2/5: exact product maker guidance with attribution and condition limits.
// Reviewed sources and statements enter atomically after guards, schema, lint and core build.
import{readFileSync,cpSync,mkdtempSync,rmSync}from'node:fs';import{createHash}from'node:crypto';import{join}from'node:path';import{tmpdir}from'node:os';
import{openTables,projectRoot}from'../data/table-io.mjs';
import{checkData}from'../../build/src/schema.js';import{readCsv}from'../../build/src/csv.js';import{lintData,findingKey}from'../../build/src/lint-rules.js';import{loadTables,snapshotDate}from'../../build/src/load.js';import{buildDatabase}from'../../build/src/pipeline.js';
const migration='m334-batch-c14-priority-09',at=join(projectRoot,'docs/audits/2026-09-30-coverage-expansion'),hash=b=>createHash('sha256').update(b).digest('hex'),bytes=readFileSync(join(at,'priority-09-c14-packet.json')),digest=hash(bytes),p=JSON.parse(bytes),review=JSON.parse(readFileSync(join(at,'priority-09-c14-review.json')));
if(digest!=='4c5c8f29af9b6a97085cbc75b62c2451171324222a1783128270ccff30886577'||review.input_sha256!==digest||review.overall_verdict!=='APPROVE')throw Error(`${migration}: changed or unreviewed packet`);
process.env.H2C_INGEST_ROOT=join(at,'ingest');process.env.H2C_PROPOSALS=join(at,'ingest/proposals');
const{proposalsOf,guard,worldOf,writeBatch,markApplied}=await import('../ingest/apply.mjs');
const proposals=proposalsOf('c14'),agrees=(r,e)=>r&&Object.entries(e).every(([k,v])=>r[k]===v);
if(proposals.length!==p.Documents.length)throw Error(`${migration}: proposal inventory moved`);
for(const d of p.Documents)if(hash(readFileSync(join(at,'ingest/proposals/c14',d.File)))!==d.ProposalSHA256)throw Error(`${migration}: proposal moved`);
const original=openTables();for(const g of p.ExpectedGrades)if(!agrees(original.get('grades',g.GradeID),g))throw Error(`${migration}: grade ${g.GradeID} moved`);
for(const d of p.Documents){const source=original.find('sources',d.Source.SourceID);if(!source)continue;if(!agrees(source,d.Source))throw Error(`${migration}: applied source moved`);for(const e of d.ProposedEvidence){const matches=original.rows('evidence').filter(r=>r.SourceID===e.row.SourceID&&r.Locator===e.row.Locator&&r.Topic===e.row.Topic&&r.GradeID===e.row.GradeID&&r.Finding===e.row.Finding);if(matches.length!==1||!agrees(matches[0],e.row))throw Error(`${migration}: previously admitted evidence moved`);}}
for(const source of p.ExpectedSources)if(!agrees(original.get('sources',source.SourceID),source))throw Error(`${migration}: registered source moved`);
for(const d of p.Documents)if(original.find('sources',d.Source.SourceID))for(const[kind,key,list]of [['measurements','Property',d.ProposedMeasurements],['profiles','Profile',d.ProposedProfiles]])for(const e of list){const matches=original.rows(kind).filter(r=>r.SourceID===e.row.SourceID&&r.GradeID===e.row.GradeID&&r.Locator===e.row.Locator&&r[key]===e.row[key]);const expected={...e.row};if(kind==='measurements'){const added=`Added 2026-10-03 (${migration}): re-read from the source document, page ${/p\.\s*(\d+)/.exec(e.row.Locator)?.[1]??'?'} (SHA-256 recorded in sources.csv).`;expected.Notes=e.row.Notes&&e.row.Notes!=='Not applicable'?`${added} ${e.row.Notes}`:added;}if(matches.length!==1||!agrees(matches[0],expected))throw Error(`${migration}: previously admitted ${kind} moved`);}
const problems=guard(proposals,worldOf());if(problems.length)throw Error(JSON.stringify(problems));
function coverage(t){const records=[];
 for(const o of p.ExistingProfileEdits){const current=t.get('profiles',o.Expected.ProfileID);if(agrees(current,o.Proposed))continue;if(!agrees(current,o.Expected))throw Error(`${migration}: old profile ${o.Expected.ProfileID} moved`);for(const[field,value]of Object.entries(o.Proposed))if(value!==o.Expected[field])t.set('profiles',o.Expected.ProfileID,field,value,{expect:o.Expected[field]});records.push({operation:o.OperationID,id:o.Expected.ProfileID,reason:o.Reason});}
 return records;
}
const dir=mkdtempSync(join(tmpdir(),'h2c-c14-rehearse-'));let rehearsal;
try{
 cpSync(join(projectRoot,'data'),join(dir,'data'),{recursive:true});cpSync(join(projectRoot,'schema'),join(dir,'schema'),{recursive:true});
 const t=openTables(dir),log=writeBatch(t,proposals,{migration,date:'2026-10-03',root:dir}),judgments=coverage(t);t.save();
 const gate=checkData(join(dir,'data'),join(dir,'schema'));if(gate.issues.length)throw Error(JSON.stringify(gate.issues));
 const tables=Object.fromEntries(Object.keys(gate.schemas).map(n=>{const{header,records}=readCsv(join(dir,'data/tables',`${n}.csv`));return[n,{header,rows:records.map(r=>r.values)}];}));
 const baseline=new Set(readCsv(join(dir,'data/review/accepted-findings.csv')).records.map(r=>findingKey({code:r.values.Code,table:r.values.Table,record:r.values.Record,field:r.values.Field??''})));
 const lint=lintData(tables,gate.schemas).filter(f=>!baseline.has(findingKey(f)));if(lint.length)throw Error(JSON.stringify(lint));
 const wb=loadTables(join(dir,'data')),issues=buildDatabase(wb,{snapshot:snapshotDate(wb.Method.rows),build:'apply',estimates:false}).issues.filter(i=>i.level==='error');if(issues.length)throw Error(JSON.stringify(issues));
 rehearsal={log,judgments};
}finally{rmSync(dir,{recursive:true,force:true});}
if(process.argv.includes('--dry-run')){console.log(JSON.stringify({migration,packet:digest,rehearsal,written:false},null,2));process.exit(0);}
const t=openTables(),log=writeBatch(t,proposals,{migration,date:'2026-10-03'}),judgments=coverage(t),applied=markApplied(proposals,t);
if(log.length||judgments.length||applied)t.save();console.log(JSON.stringify({migration,packet:digest,log,judgments,applied,written:log.length+judgments.length},null,2));
