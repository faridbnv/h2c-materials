#!/usr/bin/env node
// GOALS step 2, C6: the frozen S06 exact-product acid targets, from their own cached sheets.
// Keep both weak and strong exposures and every published scale word. Never turn mixed exposures into a PASS.
// These are manufacturer statements; no chemical allowable or unstated condition is inferred.
// Reviewer: Codex AI agent, 2026-09-28.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { locate } from '../data/source-store.mjs';
import { cachedText, sha256 } from '../lib/pdf-text.mjs';
import { pageReader } from './printed-on.mjs';
const migration='m217-cached-acid-statements';
const pins=readCsv(join(dirname(fileURLToPath(import.meta.url)),`${migration}.csv`)).records.map((r)=>r.values);
const t=openTables(), printed=pageReader(t,migration);
for(const p of pins){
 const s=t.get('sources',p.SourceID),g=t.get('grades',p.GradeID),found=locate(p.SHA256,p.SourceID);
 if(s.SHA256!==p.SHA256||g.SourceID!==p.SourceID||found.bytes!=='present'||sha256(readFileSync(found.path))!==p.SHA256||!printed(p.SourceID,p.Page,p['Exact text']))throw new Error(`${migration}: source/identity/page moved for ${p.GradeID}`);
}
let changed=0;
for(const p of pins){
 if(t.rows('evidence').some((e)=>e.GradeID===p.GradeID&&e.SourceID===p.SourceID&&e.Topic===p.Topic))continue;
 const g=t.get('grades',p.GradeID);
 const text=cachedText(p.SHA256);
 const definition=text.pages.flatMap((p)=>p.lines.map((l)=>l.text)).join(' ');
 const scale=/Material may get minor attack/.test(definition) ? ' Maker scale: Good permits minor attack after long storage at ambient temperature; Fair permits short contact; Poor is not recommended.' : '';
 t.append('evidence',{EvidenceID:t.nextId('evidence'),MaterialID:g.MaterialID,GradeID:g.GradeID,Domain:'Chemical exposure',Topic:p.Topic,Finding:p.Finding,
  'Exposure / conditions':`${p.Conditions}${scale} Weak and strong acid rows are retained separately.`, 'Rating 1–5':'Not published',RubricID:'Not applicable','Evidence type':'Manufacturer statement',SourceID:p.SourceID,Locator:`p. ${p.Page}: ${p['Exact text']}`});
 changed++;
}
if(changed)t.save();
console.log(`${migration}: ${changed} acid statement(s) recorded`);
