#!/usr/bin/env node
// GOALS steps 2/5, C6/C9: bounded maker-site chamber searches on the frozen targets, not a general import restart.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {applyBatch} from '../ingest/apply.mjs';
import {openTables,projectRoot} from '../data/table-io.mjs';
import {readCsv} from '../../build/src/csv.js';
import {locate} from '../data/source-store.mjs';
import {sha256} from '../lib/pdf-text.mjs';
const migration='m221-batch-b39';
console.log(applyBatch('b39',{migration,date:'2026-09-28'}));
const t=openTables(),docs=readCsv(join(projectRoot,'docs/audits/2026-09-28-gap-closing/C-DOCUMENTS.csv')).records.map(r=>r.values);
let added=0;
for(const d of docs){const source=t.get('sources',d.SourceID),found=locate(d.SHA256,d.SourceID);
 if(source.SHA256!==d.SHA256||found.bytes!=='present'||sha256(readFileSync(found.path))!==d.SHA256)throw new Error(migration+': source evidence moved '+d.SourceID);
 // A distributor index for Dow, a missing ESD-PA12 listing, and a documentation index without the exact Yousu
 // product do not prove the maker publishes no recipe for that product. Retain their captures and limited handoffs.
 const limited=['G086-01','G064-01','G087-03'].some(g=>d.GradeIDs.split('; ').includes(g));
 for(const Scope of limited?['document']:['document','maker site']){
  if(t.rows('know_how_reads').some(r=>r.SourceID===d.SourceID&&r.Scope===Scope))continue;
  t.append('know_how_reads',{SourceID:d.SourceID,Scope,'Read on':'2026-09-28','Read by':migration+': Codex AI agent; captured full text; exact-product product/download/guide search. '+(limited?'Access or identity limited; no maker-site absence asserted.':'Bounded scope and captures in C-SITE-OUTCOMES.csv; no unpublished numeric value inferred.')});added++;
 }
}
// A first rehearsal left this full recommendation sentence as unread/required. Its words state only a
// recommendation. Guard that correction as well as fresh imports; retain the raw sentence and missing setpoint.
let corrected=0;
const spectrum=t.rows('profiles').find(r=>r.GradeID==='G112-01'&&r.SourceID==='S-SPECTRUM-PRINT-20260928-fd0f508a9a5c'&&r['Chamber °C']==='It is recommended to print using a heated chamber.');
if(!spectrum)throw Error(migration+': exact Spectrum recommendation row missing');
for(const [field,from,to] of [
 ['Chamber state','unknown','recommended'],['Chamber requirement','required','recommended'],
 ['Parse review','Not applicable','The full manufacturer sentence recommends heating without a setpoint. The generic parser leaves this prose unread; no required temperature or universal necessity inferred. Codex AI, 2026-09-28.']
]){if(spectrum[field]===to)continue;t.set('profiles',spectrum.ProfileID,field,to,{expect:from});corrected++;}
if(added||corrected)t.save();console.log(added+' dated source-reading rows added; '+corrected+' recommendation fields corrected');
