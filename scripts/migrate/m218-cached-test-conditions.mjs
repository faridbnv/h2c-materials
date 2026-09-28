#!/usr/bin/env node
// GOALS step 2 / C6: exact-product direction and treatment conditions. Reviewer: Codex AI, 2026-09-28.
import {readFileSync} from 'node:fs';
import {openTables} from '../data/table-io.mjs';
import {locate} from '../data/source-store.mjs';
import {sha256} from '../lib/pdf-text.mjs';
import {pageReader} from './printed-on.mjs';
import {correct,addValue} from './source-edits.mjs';
const migration='m218-cached-test-conditions';
const pins=JSON.parse(readFileSync(new URL(`./${migration}.json`,import.meta.url),'utf8'));
const t=openTables(),printed=pageReader(t,migration);
for(const p of pins){const s=t.get('sources',p.source),f=locate(p.sha,p.source);if(s.SHA256!==p.sha||f.bytes!=='present'||sha256(readFileSync(f.path))!==p.sha||!printed(p.source,p.page,p.text))throw new Error(`${migration}: hash/page moved for ${p.id}`);}
let changed=0;
for(const p of pins)changed+=correct(t,{source:p.source,ids:[p.id],set:p.set,note:p.note,migration,date:'2026-09-28'});
const source='S-SPECTRUM-en-tds-spectrum-pla-tough';
if(!printed(source,1,'432,8'))throw new Error('Spectrum Tough E-modulus page moved');
const added=addValue(t,{like:'V002691',migration,date:'2026-09-28',set:{Property:'Tensile modulus','Raw value':'432,8 MPa','Raw numeric':'432.8','Normalized value':'0.4328','Conversion factor':'0.001','Standard / load':'D638',Standards:'ASTM D638',Locator:'p. 1: E-modulus, D638, 432.8 MPa; horizontal XY footnote',Direction:'XY'},note:'The source explicitly prints E-modulus 432.8 MPa, separately from flexural modulus 2493 MPa. The printed horizontal XY footnote is preserved.'});
if(added)changed++;
else {const existing=t.rows('measurements').find(r=>r.SourceID===source && r.Locator==='p. 1: E-modulus, D638, 432.8 MPa; horizontal XY footnote');if(existing)changed+=correct(t,{source,ids:[existing.MeasurementID],set:{'Conversion factor':['1','0.001']},note:'Explicit MPa to GPa factor 0.001 accompanies 432.8 MPa = 0.4328 GPa.',migration,date:'2026-09-28'});}
if(changed)t.save();console.log(`${migration}: ${changed} row(s) changed; added ${added??'none'}`);
