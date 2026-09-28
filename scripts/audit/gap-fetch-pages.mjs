#!/usr/bin/env node
// Capture only the maker pages authorized in C-URLS.csv. Originals are staged into the import pipeline next.
// A failed or generic page is an access/identity limitation, never evidence of publisher silence.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv, csvText } from '../../build/src/csv.js';
import { get, LIMITS } from '../ingest/fetch.mjs';
import { sha256 } from '../lib/pdf-text.mjs';
const out='docs/audits/2026-09-28-gap-closing';
const stage='/tmp/h2c-gap-pages';
mkdirSync(stage,{recursive:true});
const rows=readCsv(join(out,'C-URLS.csv')).records.map((r)=>r.values);
const log=join(out,'C-FETCH.jsonl');
const held=existsSync(log)?readFileSync(log,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const completed=new Set(held.map((r)=>`${r.GradeID}\0${r.url}`));
const hosts=new Map();
for(const r of rows.filter((r)=>!completed.has(`${r.GradeID}\0${r.url}`))) {
 const h=new URL(r.url).hostname;
 (hosts.get(h)??hosts.set(h,[]).get(h)).push(r);
}
let queues=[...hosts.values()];
const {appendFileSync}=await import('node:fs');
await Promise.all(Array.from({length:Math.min(6,queues.length)},async()=>{
 while(queues.length){const queue=queues.shift();
  for(const r of queue){
   const got=await get(r.url,{limits:{...LIMITS,responseMs:20000,bodyMs:60000,stallMs:20000,tries:2}});
   let result={...r,accessed:'2026-09-28',by:'Codex AI agent',error:got.error||'',sha256:'',file:''};
   if(got.bytes){const sha=sha256(got.bytes);const ext=got.bytes.subarray(0,5).toString()==='%PDF-'?'pdf':'html';
    const file=join(stage,`${sha}.${ext}`);writeFileSync(file,got.bytes);result={...result,sha256:sha,file,type:got.type};}
   held.push(result);appendFileSync(log,JSON.stringify(result)+'\n');
   console.log(`${r.GradeID}: ${got.error||result.sha256.slice(0,12)}`);
   await new Promise((resolve)=>setTimeout(resolve,600));
  }
 }
}));
const staged=held.filter((r)=>r.sha256).map((r)=>({file:r.file,url:r.url,doc:'',for:r.for,provider:r.Manufacturer,manufacturer:r.Manufacturer,product:r.Product,sha256:r.sha256,accessed:r.accessed,by:r.by}));
writeFileSync(join(out,'C-STAGED.csv'),csvText(['file','url','doc','for','provider','manufacturer','product','sha256','accessed','by'],staged));
console.log(`${staged.length} staged captures; ${held.filter((r)=>r.error).length} failed captures`);
