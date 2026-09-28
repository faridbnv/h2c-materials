#!/usr/bin/env node
// GOALS step 5 / C10: dated chamber searches must not mislabel captured maker claims as general non-publication.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {openTables,nextId,projectRoot} from '../data/table-io.mjs';
import {locate} from '../data/source-store.mjs';
import {cachedText,sha256} from '../lib/pdf-text.mjs';
import {csvText} from '../../build/src/csv.js';
const migration='m222-b39-record-know-how',out=join(projectRoot,'docs/audits/2026-09-28-gap-closing');
const pins=JSON.parse(readFileSync(join(out,'C-KNOW-HOW-PINS.json'))),t=openTables(),bindings=[];
let changed=0;
for(const p of pins){
 const s=t.get('sources',p.SourceID),g=t.get('grades',p.GradeID),f=locate(p.SHA256,p.SourceID);
 if(s.SHA256!==p.SHA256||f.bytes!=='present'||sha256(readFileSync(f.path))!==p.SHA256)throw Error(migration+': source moved '+p.SourceID);
 if(!cachedText(p.SHA256)?.pages.find(page=>page.page===p.Page)?.lines.some(line=>line.text===p.Finding))throw Error(migration+': exact paragraph missing '+p.GradeID);
 let row=t.rows('evidence').find(r=>r.SourceID===p.SourceID&&r.GradeID===p.GradeID&&r.Topic===p.Topic&&r.Locator===p.Locator);
 if(row&&row.Finding!==p.Finding)throw Error(migration+': finding moved '+row.EvidenceID);
 if(!row){row={EvidenceID:nextId('evidence',t.rows('evidence').map(r=>r.EvidenceID)),MaterialID:g.MaterialID,GradeID:p.GradeID,Domain:"Makers' know-how",Topic:p.Topic,Finding:p.Finding,'Exposure / conditions':'Not applicable','Rating 1–5':'Not published',RubricID:'Not applicable','Evidence type':'Manufacturer statement',SourceID:p.SourceID,Locator:p.Locator};t.append('evidence',row);changed++;}
 if(s['Citation role']!=='cited'){t.set('sources',p.SourceID,'Citation role','cited',{expect:'corroboration'});changed++;}
 bindings.push({Record:row.EvidenceID,...p,'Agent review':'Codex AI, 2026-09-28; verified original digest and exact captured product paragraph. Record tier only; no numeric/environmental verdict.','Checked by person':'',Date:'',FindingByPerson:''});
}
if(changed)t.save();writeFileSync(join(out,'C-KNOW-HOW-BINDINGS.csv'),csvText(Object.keys(bindings[0]),bindings));
console.log(migration+': '+changed+' row/field changes; '+bindings.length+' original-bound record-tier claims');
