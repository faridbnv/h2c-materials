// GOALS steps2/5: compose the existing import pipeline with its post-admission coverage judgment.
// Facts and supersessions share one transaction. The normal source/number guard, schema, lint and core build all run.
import{readFileSync,cpSync,mkdtempSync,rmSync}from'node:fs';import{createHash}from'node:crypto';import{join}from'node:path';import{tmpdir}from'node:os';
import{openTables,projectRoot}from'../data/table-io.mjs';
import{checkData}from'../../build/src/schema.js';import{readCsv}from'../../build/src/csv.js';import{lintData,findingKey}from'../../build/src/lint-rules.js';import{loadTables,snapshotDate}from'../../build/src/load.js';import{buildDatabase}from'../../build/src/pipeline.js';
const migration='m312-batch-c06-priority-01',at=join(projectRoot,'docs/audits/2026-09-30-coverage-expansion'),hash=b=>createHash('sha256').update(b).digest('hex'),bytes=readFileSync(join(at,'priority-01-c06-packet.json')),digest=hash(bytes),p=JSON.parse(bytes),review=JSON.parse(readFileSync(join(at,'priority-01-c06-review.json')));
if(digest!=='2cade9840da6d56ff7ebe6728587f07bcd0f351ced041f722c704839b024d888'||review.input_sha256!==digest||review.overall_verdict!=='APPROVE')throw Error(`${migration}: changed or unreviewed packet`);
process.env.H2C_INGEST_ROOT=join(at,'ingest');process.env.H2C_PROPOSALS=join(at,'ingest/proposals');
const{proposalsOf,guard,worldOf,writeBatch,markApplied}=await import('../ingest/apply.mjs');
const proposals=proposalsOf('c06'),agrees=(r,e)=>r&&Object.entries(e).every(([k,v])=>r[k]===v);
if(proposals.length!==p.Documents.length)throw Error(`${migration}: proposal inventory moved`);
for(const d of p.Documents)if(hash(readFileSync(join(at,'ingest/proposals/c06',d.File)))!==d.ProposalSHA256)throw Error(`${migration}: proposal moved`);
const original=openTables();for(const g of p.ExpectedGrades)if(!agrees(original.get('grades',g.GradeID),g))throw Error(`${migration}: grade ${g.GradeID} moved`);
for(const d of p.Documents){const source=original.find('sources',d.Source.SourceID);if(!source)continue;if(!agrees(source,d.Source))throw Error(`${migration}: applied source moved`);for(const e of d.ProposedEvidence){const row=original.rows('evidence').find(r=>r.SourceID===e.row.SourceID&&r.Locator===e.row.Locator&&r.Topic===e.row.Topic&&r.GradeID===e.row.GradeID);if(!agrees(row,e.row))throw Error(`${migration}: previously admitted evidence moved`);}}
const problems=guard(proposals,worldOf());if(problems.length)throw Error(JSON.stringify(problems));
function coverage(t){const records=[];
 for(const o of p.CoverageUpdates){
  const actual=t.rows('evidence').find(r=>r.SourceID===o.Basis.SourceID&&r.GradeID===o.Basis.GradeID&&r.Topic===o.Basis.Topic&&r.Locator===o.Basis.Locator);
  if(!agrees(actual,o.Basis))throw Error(`${migration}: environmental judgment basis is not admitted`);
  const existing=t.rows('coverage').find(r=>r.MaterialID===o.Proposed.MaterialID&&r.Domain===o.Proposed.Domain&&r.Finding===o.Proposed.Finding);
  if(existing){if(!agrees(existing,o.Proposed))throw Error(`${migration}: judgment moved`);for(const old of o.ExpectedRows)if(!agrees(t.get('coverage',old.CoverageID),{...old,Status:'Superseded',Finding:`Superseded by ${existing.CoverageID}: ${old.Finding}`}))throw Error(`${migration}: supersession moved`);continue;}
  for(const old of o.ExpectedRows)if(!agrees(t.get('coverage',old.CoverageID),old))throw Error(`${migration}: old judgment moved`);
  const id=t.nextId('coverage');t.append('coverage',{CoverageID:id,...o.Proposed});for(const old of o.ExpectedRows){t.set('coverage',old.CoverageID,'Status','Superseded',{expect:old.Status});t.set('coverage',old.CoverageID,'Finding',`Superseded by ${id}: ${old.Finding}`,{expect:old.Finding});}records.push({operation:o.OperationID,id,basis:actual.EvidenceID});
 }return records;
}
const dir=mkdtempSync(join(tmpdir(),'h2c-c06-rehearse-'));let rehearsal;
try{
 cpSync(join(projectRoot,'data'),join(dir,'data'),{recursive:true});cpSync(join(projectRoot,'schema'),join(dir,'schema'),{recursive:true});
 const t=openTables(dir),log=writeBatch(t,proposals,{migration,date:'2026-10-02',root:dir}),judgments=coverage(t);t.save();
 const gate=checkData(join(dir,'data'),join(dir,'schema'));if(gate.issues.length)throw Error(JSON.stringify(gate.issues));
 const tables=Object.fromEntries(Object.keys(gate.schemas).map(n=>{const{header,records}=readCsv(join(dir,'data/tables',`${n}.csv`));return[n,{header,rows:records.map(r=>r.values)}];}));
 const baseline=new Set(readCsv(join(dir,'data/review/accepted-findings.csv')).records.map(r=>findingKey({code:r.values.Code,table:r.values.Table,record:r.values.Record,field:r.values.Field??''})));
 const lint=lintData(tables,gate.schemas).filter(f=>!baseline.has(findingKey(f)));if(lint.length)throw Error(JSON.stringify(lint));
 const wb=loadTables(join(dir,'data')),issues=buildDatabase(wb,{snapshot:snapshotDate(wb.Method.rows),build:'apply',estimates:false}).issues.filter(i=>i.level==='error');if(issues.length)throw Error(JSON.stringify(issues));
 rehearsal={log,judgments};
}finally{rmSync(dir,{recursive:true,force:true});}
if(process.argv.includes('--dry-run')){console.log(JSON.stringify({migration,packet:digest,rehearsal,written:false},null,2));process.exit(0);}
const t=openTables(),log=writeBatch(t,proposals,{migration,date:'2026-10-02'}),judgments=coverage(t),applied=markApplied(proposals,t);
if(log.length||judgments.length||applied)t.save();console.log(JSON.stringify({migration,packet:digest,log,judgments,applied,written:log.length+judgments.length},null,2));
