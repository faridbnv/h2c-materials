#!/usr/bin/env node
// Reproduce exact source-line bindings and end-to-end traces for every changed frozen product answer.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {projectRoot} from '../data/table-io.mjs';
import {readCsv,csvText} from '../../build/src/csv.js';
import {releaseIdentity} from '../../build/src/release.js';
import {cachedText,sha256} from '../lib/pdf-text.mjs';
import {locate} from '../data/source-store.mjs';
import {traceDecision} from '../trace.mjs';
import {useRegistry} from '../../app/js/ui/registry.js';
const rel='docs/audits/2026-09-28-gap-closing',out=join(projectRoot,rel);
const read=path=>readCsv(join(projectRoot,path)).records.map(r=>r.values);
const db=JSON.parse(readFileSync(join(projectRoot,'dist/db.json')));
if(db.meta.release?.id!==releaseIdentity(projectRoot).id)throw Error('Build is stale');useRegistry(db.registry);
const docs=read(rel+'/C-DOCUMENTS.csv'),pins=JSON.parse(readFileSync(join(out,'C-PINS.json'))),profiles=read('data/tables/profiles.csv');
const bindings=[];
for(const pin of pins){
 const d=docs.find(d=>d.GradeIDs.split('; ').includes(pin.gid)&&d.URL.includes(pin.url));
 const p=JSON.parse(readFileSync(join(projectRoot,'archive/ingest-2026-09-18/proposals/b39',d.SHA256.slice(0,16)+'.json'))).profiles.find(p=>p.id==='chamber-'+pin.gid&&p.review.status==='accepted');
 const stored=profiles.find(r=>r.GradeID===pin.gid&&r.SourceID===d.SourceID&&r.Locator===p.row.Locator);
 if(!stored||p.gradeKey!==pin.gid)throw Error('Exact profile/grade key missing '+pin.gid);
 // ingest:apply resolves GradeID from gradeKey and allocates ProfileID; the proposal's placeholder cells are not facts.
 for(const key of Object.keys(p.row))if(!['ProfileID','GradeID'].includes(key)&&stored[key]!==undefined&&stored[key]!==p.row[key])throw Error(`Profile/proposal disagreement ${pin.gid} ${key}`);
 const original=locate(d.SHA256,d.SourceID);
 if(original.bytes!=='present'||sha256(readFileSync(original.path))!==d.SHA256)throw Error('Source moved '+d.SourceID);
 const text=cachedText(d.SHA256),page=text.pages.find(page=>page.page===p.evidence.page);
 if(!page?.lines.map(l=>l.text).join(' ').includes(p.evidence.text))throw Error('Evidence line missing '+pin.gid);
 bindings.push({Record:stored.ProfileID,GradeID:pin.gid,SourceID:d.SourceID,SHA256:d.SHA256,Page:p.evidence.page,Locator:stored.Locator,'Source words':p.evidence.text,'Chamber state':stored['Chamber state'],'Chamber requirement':stored['Chamber requirement'],'Enclosure state':stored['Enclosure state'],'Agent check':'Verified original digest, full cached source line, exact product and accepted proposal; no setpoint inferred.','Checked by person':'',Date:'',Finding:''});
}
writeFileSync(join(out,'C-SOURCE-BINDINGS.csv'),csvText(Object.keys(bindings[0]),bindings));
const changes=read(rel+'/FINAL-CHANGES.csv').filter(r=>r.Kind==='product');
const index=[];mkdirSync(join(out,'DECISION-TRACES'),{recursive:true});
for(const c of changes){
 const name=c.Question.split(':')[0];const slug=name.toLowerCase().replaceAll(' ','-');
 const file=rel+'/scenarios/'+slug+'.json';const output='DECISION-TRACES/'+slug+'-'+c.ID+'.json';
 const trace=traceDecision(db,readFileSync(join(projectRoot,file),'utf8'),c.ID,{file,database:'dist/db.json, current release '+db.meta.release.id});
 if(trace.product.verdict!==c.After)throw Error('Trace disagrees '+name+' '+c.ID);
 writeFileSync(join(out,output),JSON.stringify(trace,null,2)+'\n');
 index.push({...c,File:output,Release:db.meta.release.id});
}
writeFileSync(join(out,'DECISION-TRACE-INDEX.csv'),csvText(Object.keys(index[0]),index));
console.log(`${bindings.length} chamber/enclosure source-line bindings; ${index.length} changed product-answer traces agree with final checkpoint.`);
