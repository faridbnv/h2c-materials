#!/usr/bin/env node
// Focused checks in the actual offline page; uses the same Chrome/CDP harness as ui:check.
import { findChrome, launchChrome } from './lib/cdp.mjs';
import { pageName } from '../build/src/release.js';
import { newScenario, toHash } from '../app/js/engine/scenario.js';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),out=join(root,'docs/audits/2026-10-06-published-evidence');
const db=JSON.parse(readFileSync(join(root,'dist/db.json'))),url=pathToFileURL(join(root,'dist',pageName(db.meta))).href;
const chrome=findChrome();if(!chrome)throw new Error('Chrome required: this check cannot pass skipped');
const profile=mkdtempSync(join(tmpdir(),'h2c-impact-')), {proc,port}=await launchChrome(chrome,profile,['--disable-background-timer-throttling','--disable-renderer-backgrounding']);
let ws,id=0;const pending=new Map(),errors=[],remoteRequests=[],views=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(new Error(`CDP timeout: ${method}`));},20000);pending.set(n,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id:n,method,params}));});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
const until=async expression=>{for(const start=Date.now();Date.now()-start<20000;await sleep(100))if(await ev(expression))return;throw new Error(`UI condition timed out: ${expression}`);};
const click=selector=>ev(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error('Missing control');el.scrollIntoView({block:'center'});el.click();return true;})()`);
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
try {
 const target=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});ws.onmessage=m=>{const v=JSON.parse(m.data);if(v.id&&pending.has(v.id)){const p=pending.get(v.id);pending.delete(v.id);v.error?p.reject(new Error(v.error.message)):p.resolve(v.result);}if(v.method==='Runtime.exceptionThrown')errors.push(v.params.exceptionDetails.exception?.description??v.params.exceptionDetails.text);if(v.method==='Network.requestWillBeSent'&&/^https?:/.test(v.params.request.url))remoteRequests.push(v.params.request.url);};
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
 for(const width of [1180,390])for(const material of ['M001','M020'])for(const anneal of [false,true]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width===390});
  const s={...newScenario(db.meta),openMaterial:material,anneal,annealMaxC:80,constraints:[{kind:'numeric',property:'charpyNotched',operator:'>=',value:5,mandatory:true}]};
  await send('Page.navigate',{url:'about:blank'});
  await send('Page.navigate',{url:url+'#'+toHash(s)});await until(`!!document.querySelector('.drawer [data-tab="Mechanical"]')`);
  await click('.drawer [data-tab="Mechanical"]');await until(`!!document.querySelector('.impact-summary')`);
  const targetId=material==='M001'?'V000122':db.measurements.find(m=>m.gradeId==='G022-01'&&m.property==='Charpy strength'&&m.notch==='Notched'&&m.direction==='XY').id;
  await ev(`(()=>{let el=document.querySelector('[data-mid="${targetId}"]');for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)p.querySelector(':scope>summary').click();return true;})()`);
  await click(`[data-mid="${targetId}"] .impact-basis summary`);
  const row=await ev(`document.querySelector('[data-mid="${targetId}"]').innerText`);
  assert(anneal?row.includes('used for this state'):row.includes('not as printed'),`${width} ${material} anneal=${anneal}: incorrect state explanation: ${row}`);
  await click('.impact-claims>summary');
  const claimGrades=material==='M001'?['G006-01','G001-24','G001-27','G001-30','G002-01']:['G022-01'];
  const mechanicalIds=await ev(`[...document.querySelectorAll('.impact-maker-says [data-statement]')].map(x=>x.dataset.statement)`);
  for(const g of claimGrades)for(const k of db.knowHow.filter(k=>k.gradeId===g&&k.topic==='Impact and toughness'))assert(mechanicalIds.filter(id=>id===k.id).length===1,`Mechanical exact statement ${k.id}`);
  const counts=await ev(`[...document.querySelectorAll('.impact-summary')].map(x=>({key:x.dataset.impactSummary,count:x.querySelectorAll('.impact-contributors>li').length,text:x.textContent}))`);
  for(const x of counts){assert(x.count===db.materials.find(m=>m.id===material).summary[x.key].n,`Contributor population ${material} ${x.key}`);assert(x.text.includes('different commercial formulations'),'Commercial formulations disclosure');}
  const bodyText=await ev(`document.querySelector('.drawer-body').innerText`);assert(bodyText.includes('not stated'),'Unknown conditions visible');
  await click('.drawer [data-tab="Grades"]');await until(`!!document.querySelector('[data-grade-toggle="${claimGrades[0]}"]')`);for(const grade of claimGrades)await click(`[data-grade-toggle="${grade}"]`);
  const productIds=await ev(`[...document.querySelectorAll('.impact-maker-says [data-statement]')].map(x=>x.dataset.statement)`);
  for(const g of claimGrades)for(const k of db.knowHow.filter(k=>k.gradeId===g&&k.topic==='Impact and toughness'))assert(productIds.includes(k.id),`Products exact statement ${k.id}`);
  const repeatedWithinBlock=await ev(`[...document.querySelectorAll('.impact-maker-says')].some(block=>{const ids=[...block.querySelectorAll('[data-statement]')].map(x=>x.dataset.statement);return ids.length!==new Set(ids).size;})`);
  assert(!repeatedWithinBlock,'Duplicate statement within one product block');
  const sid=material==='M001'?'R-BAMBU-PLA-TOUGH-20261005':'B-petg-hf-TDS';await click(`[data-impact-product="${claimGrades[0]}"] [data-open-source="${sid}"]`);await until(`!!document.querySelector('[data-source-block="${sid}"].target')`);
  const sourceText=await ev(`document.querySelector('[data-source-block="${sid}"]').innerText`);assert(sourceText.includes(material==='M001'?'Tough+':'PETG HF'),'Source navigation reaches exact product');
  const size=await ev(`({width:document.documentElement.scrollWidth,viewport:innerWidth})`);assert(size.width<=width+1,`Page overflow at ${width}`);
  views.push({width,material,anneal,stateRow:row,mechanicalIds,productIds,contributors:counts.map(({key,count})=>({key,count})),source:sid,sourceNavigation:'passed',pageOverflow:'none'});
 }
 assert(!errors.length,errors.join('\n'));assert(!remoteRequests.length,'Remote runtime requests: '+remoteRequests.join(', '));
 writeFileSync(join(out,'browser-checks.json'),JSON.stringify({release:db.meta.release.id,offline:true,remoteRequests,errors,views},null,2)+'\n');console.log(`Offline impact UI: ${views.length} material/state/width cases passed; exact claims, contributors, source navigation and state use verified.`);
} catch(error) {console.error(error);throw error;} finally {if(ws)ws.close();proc.kill();await sleep(500);rmSync(profile,{recursive:true,force:true,maxRetries:6,retryDelay:100});}
