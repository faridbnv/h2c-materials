#!/usr/bin/env node
// Bounded research dispositions for every frozen target. Never equate unresolved with publisher silence.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {readCsv,csvText} from '../../build/src/csv.js';
import {projectRoot} from '../data/table-io.mjs';
import {useRegistry} from '../../app/js/ui/registry.js';
import {describeConstraint} from '../../app/js/ui/labels.js';
const out=join(projectRoot,'docs/audits/2026-09-28-gap-closing');
const read=n=>readCsv(join(out,n)).records.map(r=>r.values);
const answers=JSON.parse(gunzipSync(readFileSync(join(out,'C-ANSWERS.json.gz'))));
const db=JSON.parse(readFileSync(join(projectRoot,'dist/db.json')));useRegistry(db.registry);
const targets=read('TARGETS.csv'),cached=read('CACHED-DOCUMENTS.csv'),docs=read('C-DOCUMENTS.csv'),inputs=read('C-SEARCH-INPUTS.csv'),attempts=JSON.parse('['+readFileSync(join(out,'C-FETCH.jsonl'),'utf8').trim().split('\n').join(',')+']');
const pins=JSON.parse(readFileSync(join(out,'C-PINS.json'))),sites=[];
const limits={
 'G086-01':'Dow maker endpoint unavailable; retained distributor index is not a maker-site absence.',
 'G064-01':'Exact ESD-PA12 product page unavailable; maker index supplies no replacement product identity or recipe.',
 'G087-03':'Yousu documentation index captured, but no exact POM recipe located; availability/identity limited.'
};
for(const t of inputs){const ds=docs.filter(d=>d.GradeIDs.split('; ').includes(t.GradeID));if(!ds.length)continue;const ps=pins.filter(p=>p.gid===t.GradeID);
 sites.push({GradeID:t.GradeID,Manufacturer:t.Manufacturer,Product:t.Product,SourceIDs:ds.map(d=>d.SourceID).join('; '),URLs:ds.map(d=>d.URL).join('; '),Outcome:limits[t.GradeID]?'access-or-identity-limited':ps.length?'explicit-statement-recorded':'bounded-search-no-usable-chamber-statement',Limit:limits[t.GradeID]??(ps.length?'Exact raw chamber/enclosure words entered; qualitative heating advice supplies no numeric setpoint.':'Product/download/print-guide search exhausted within captured maker pages; no usable chamber fact accepted. Not a claim about unavailable pages or every future revision.'),'Scope maker site':limits[t.GradeID]?'FALSE':'TRUE','Next action':limits[t.GradeID]?'Owner/maker: exact live product guide or original revision':ps.length?'Follow current engine result; maker setpoint or own H2C print if unresolved':'Maker: exact-product chamber requirement/window; then own H2C print','Reviewed by':'Codex AI agent, 2026-09-28'});
}
writeFileSync(join(out,'C-SITE-OUTCOMES.csv'),csvText(Object.keys(sites[0]),sites));
const products=new Map();for(const q of answers)for(const m of q.materials)for(const p of m.products)products.set(q.name.split(':')[0]+'|'+p.id,p);
const rows=[],states=[];
for(const t of targets){const results=t.Questions.split('; ').map(name=>{let p=products.get(name+'|'+t.GradeID);if(!p)throw Error('Question/product missing '+name+' '+t.GradeID);let r=p.results.find(r=>r.constraint&&describeConstraint(r.constraint)===t.Requirement);if(!r)throw Error('Requirement missing '+t.GradeID+' '+t.Requirement+' '+name);states.push({GradeID:t.GradeID,Requirement:t.Requirement,Question:name,State:JSON.stringify(p.state),Answer:p.status,'Fact status':r.status,Reason:r.reason,MeasurementID:r.measurementId??r.asPublished?.measurementId??'',EvidenceIDs:(r.evidenceIds??[]).join('; ')});return{p,r};});
 const known=r=>['PASS','FAIL','NOT_APPLICABLE'].includes(r.status);
 const factClosed=results.every(({r})=>known(r));const answerClosed=results.every(({p})=>['PASS','FAIL'].includes(p.status));
 const own=cached.filter(d=>d.GradeIDs.split('; ').includes(t.GradeID));const usable=own.filter(d=>d.Bytes==='present'&&+d.Pages>0);const limited=own.filter(d=>d.Bytes!=='present'||!+d.Pages);
 // Tranche C searched print settings only; a chamber search says nothing about acid/modulus publication.
 const site=/Chamber/.test(t.Requirement)?sites.find(s=>s.GradeID===t.GradeID):null;
 let outcome=factClosed?'resolved-fact':answerClosed?'question-closed-by-other-failure':results.some(({r})=>r.status==='INDETERMINATE'&&r.constraint?.kind==='gate')?'print-test-now-needed':site?.Outcome==='access-or-identity-limited'?'access-or-identity-limited':site?.Outcome==='bounded-search-no-usable-chamber-statement'?'searched-print-settings-no-usable-fact':results.some(({r})=>r.missing==='other-state')?'compatible-state-still-needed':results.some(({r})=>r.missing==='not-comparable')?'test-conditions-still-needed':!usable.length?'original-or-reader-unavailable':'cached-held-search-no-accepted-fact';
 const next=factClosed||answerClosed?'No further research for this frozen question; validate final choice with the team.':/Chamber/.test(t.Requirement)?'Maker: exact-product heated chamber requirement/window (or explicit none), then H2C print; no contact/test executed.':t.Kind==='another state'?'Maker: exact value in the frozen service/treatment state; otherwise team coupon.':'Maker: '+t['Source question']+' Include specimen, direction/load, moisture, treatment and exposure; otherwise team coupon.';
 rows.push({...t,'Research status':factClosed?'Resolved in frozen questions':'Authorized A/B/C pass complete; unresolved fact handed off','Final outcome':outcome,'Fact settled in all questions':String(factClosed),'Question answered in all questions':String(answerClosed),'Verified cached sources':usable.map(d=>d.SourceID).join('; '),'Limited cached sources':limited.map(d=>d.SourceID+': '+d.Bytes+(!+d.Pages?' / no usable text':'')).join('; '),'Maker search':site?.Outcome??'Not in the authorized print-settings fetch; cached/held pass only','Next action':next,'Evidence boundary':'Agent review. No universal environmental, XY/load, specimen or state inference. See TARGET-QUESTION-OUTCOMES.csv and A-READ-LIMITS.md.'});
}
writeFileSync(join(out,'OUTCOMES.csv'),csvText(Object.keys(rows[0]),rows));
writeFileSync(join(out,'TARGET-QUESTION-OUTCOMES.csv'),csvText(Object.keys(states[0]),states));
const handoffs=rows.filter(r=>r['Fact settled in all questions']!=='true'&&r['Question answered in all questions']!=='true');
writeFileSync(join(out,'HANDOFFS.csv'),csvText(Object.keys(rows[0]),handoffs));
const counts={targets:rows.length,targetQuestionPairs:states.length,allFactSettled:rows.filter(r=>r['Fact settled in all questions']==='true').length,allQuestionsAnswered:rows.filter(r=>r['Question answered in all questions']==='true').length,handoffs:handoffs.length,outcomes:{},makerSites:sites.length,makerSiteLimits:sites.filter(s=>s['Scope maker site']==='FALSE').length,urlAttempts:attempts.length,capturedDocuments:docs.length};for(const r of rows)counts.outcomes[r['Final outcome']]=(counts.outcomes[r['Final outcome']]??0)+1;
writeFileSync(join(out,'OUTCOME-COUNTS.json'),JSON.stringify(counts,null,2)+'\n');console.log(counts);
