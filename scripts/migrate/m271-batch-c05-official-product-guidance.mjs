// GOALS steps2/5: seven witnessed originals; three exact-product recipes, bounded claims.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {openTables,projectRoot} from '../data/table-io.mjs';
const migration='m271-batch-c05-official-product-guidance',at=join(projectRoot,'docs/audits/2026-09-30-coverage-expansion');
const digest=b=>createHash('sha256').update(b).digest('hex');
const bytes=readFileSync(join(at,'tenth-c05-packet.json')),hash=digest(bytes),review=JSON.parse(readFileSync(join(at,'tenth-c05-review.json')));
if(hash!=='2f9ddfa897f35abd0e7d153325652938a1cd688de4273f148658dc787d05e7a7'||review.input_sha256!==hash||review.overall_verdict!=='APPROVE')throw Error(`${migration}: changed or unreviewed packet`);
const p=JSON.parse(bytes),t=openTables(),agrees=(row,expected)=>row&&Object.entries(expected).every(([k,v])=>row[k]===v);
for(const g of p.ExpectedGrades)if(!agrees(t.get('grades',g.GradeID),g))throw Error(`${migration}: ${g.GradeID} moved`);
for(const d of p.Documents){
 if(digest(readFileSync(join(at,'ingest/proposals/c05',d.File)))!==d.ProposalSHA256)throw Error(`${migration}: proposal moved`);
 if(digest(readFileSync(join(projectRoot,d.OriginalPath)))!==d.OriginalSHA256)throw Error(`${migration}: original changed`);
 const s=t.find('sources',d.Source.SourceID);if(s&&!agrees(s,d.Source))throw Error(`${migration}: source moved`);
 if(s)for(const[table,rows]of [['evidence',d.ProposedEvidence],['profiles',d.ProposedProfiles]])for(const f of rows){
  const row=t.rows(table).find(r=>r.SourceID===f.row.SourceID&&r.Locator===f.row.Locator&&(table!=='evidence'||r.Topic===f.row.Topic));
  if(!agrees(row,f.row))throw Error(`${migration}: previously admitted ${table} moved`);
 }
}
process.env.H2C_INGEST_ROOT=join(at,'ingest');process.env.H2C_PROPOSALS=join(at,'ingest/proposals');
const {applyBatch}=await import('../ingest/apply.mjs');
console.log(JSON.stringify({migration,packet:hash,...applyBatch('c05',{migration,date:'2026-10-01',dryRun:process.argv.includes('--dry-run')})},null,2));
