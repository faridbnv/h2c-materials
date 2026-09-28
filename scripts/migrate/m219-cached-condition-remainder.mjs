#!/usr/bin/env node
// GOALS step 2 / C6: remaining exact-product XY footer leads. Codex AI source/image review, 2026-09-28.
import{readFileSync}from'node:fs';import{openTables}from'../data/table-io.mjs';import{locate}from'../data/source-store.mjs';import{sha256}from'../lib/pdf-text.mjs';import{pageReader}from'./printed-on.mjs';import{correct}from'./source-edits.mjs';
const migration='m219-cached-condition-remainder',t=openTables(),printed=pageReader(t,migration),pins=JSON.parse(readFileSync(new URL('./'+migration+'.json',import.meta.url)));
for(const p of pins){let f=locate(p.sha,p.source);if(t.get('sources',p.source).SHA256!==p.sha||f.bytes!=='present'||sha256(readFileSync(f.path))!==p.sha||!printed(p.source,p.page,p.text))throw Error(`${migration}: source/words moved ${p.id}`);}
const basf='R-BASF-ExtendedTDS-Ultrafuse-PAHT-CF15-V1-5';if(!printed(basf,4,'Samples were conditioned in 336h at 70°C / 62% RH')||!printed(basf,4,'Samples were dried at 80°C vacuum until weight constancy'))throw Error('BASF conditioning footnotes moved');
let n=0;for(const p of pins)n+=correct(t,{source:p.source,ids:[p.id],set:p.set,note:p.note,migration,date:'2026-09-28'});if(n)t.save();console.log(`${migration}: ${n} row(s) changed`);
