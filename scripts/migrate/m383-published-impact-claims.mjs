#!/usr/bin/env node
// D132 / approved published-evidence round: display-only source claims, never deciding measurements.
// Keep source literals and exact products; a changed page is a separate digest. Preflight every quote and expected
// field before the one transactional save. Re-run is a no-op; changed expected data is refused without partial writes.
import { readFileSync, existsSync } from 'node:fs';
import { openTables } from '../data/table-io.mjs';
import { cacheDir, sha256 } from '../lib/pdf-text.mjs';
import { onCachedSheet, applyProposals } from './read-proposals-apply.mjs';
import { readCsv } from '../../build/src/csv.js';

const MIGRATION = 'm383', TOPIC = 'Impact and toughness';
const t = openTables();
const source = {
 SourceID:'R-BAMBU-PLA-TOUGH-20261005',Publisher:'Bambu Lab',Title:'PLA Tough+ — official product page, later saved copy',
 Revision:'Not published','Publication date':'Not published','Access date':'2026-10-05','Source class':'Manufacturer product page or guide',
 'Source note':'Later copy of the PLA Tough+ product page; separate from the missing original B-pla-tough-upgrade. Display-only maker impact and flexing claims, not a controlled comparison or added measurement. Read 2026-10-06 by Codex AI; not human validation.',
 'Citation role':'cited',URL:'https://ca.store.bambulab.com/products/pla-tough-upgrade#read=2026-10-05',Locator:'Product features: Engineered for real-world impact; Designed for repeated flexing; enhanced durability',
 'Applicable grades':'G006-01','Access state':'retrieved','Access note':'Saved by the prior check round on 2026-10-05; admitted from its digest-addressed copy through ingest:witness --from on 2026-10-06. The older registered page is not reconstructed or overwritten.',
 SHA256:'79e4ff6a276353bf8f45c5ee126b4b7e2383af5e353c268f7b15214e4bb2c1dc',
};
const RETOPIC = [
  {
    "id": "Q00990",
    "materialId": "M001",
    "gradeId": "G001-24",
    "topic": "Benefits",
    "text": "has an impact resistance significantly higher than regular PLA, and better overall mechanical properties than ABS.",
    "exposure": "Not applicable",
    "sourceId": "S-POLYCN-PolyMax-PLA-TDS-v1",
    "locator": "p. 1"
  },
  {
    "id": "Q00992",
    "materialId": "M001",
    "gradeId": "G001-27",
    "topic": "Benefits",
    "text": "Polylite™ PLA Pro is a first of its kind combining high toughness and high rigidity, this professional PLA offers engineering properties with the ease of print of regular PLA.",
    "exposure": "Not applicable",
    "sourceId": "S-POLYCN-TDS-Polymaker-PolyLite-PLA-Pro-V5-6-2026-01-05-EN",
    "locator": "p. 1"
  },
  {
    "id": "Q00998",
    "materialId": "M001",
    "gradeId": "G001-30",
    "topic": "Good for",
    "text": "Engineered for high impact resistance and PLA-easy printability, it produces durable, high-quality parts fast, ideal for prototypes and end-use applications where speed and strength matter most.",
    "exposure": "Not applicable",
    "sourceId": "S-POLYCN-TDS-Polymaker-PLA-Pro-v6-0-2026-01-30-EN",
    "locator": "p. 1"
  },
  {
    "id": "Q00999",
    "materialId": "M001",
    "gradeId": "G001-30",
    "topic": "Benefits",
    "text": "Polymaker™ PLA Pro combines exceptional toughness with fast print speeds to maximize productivity.",
    "exposure": "Not applicable",
    "sourceId": "S-POLYCN-TDS-Polymaker-PLA-Pro-v6-0-2026-01-30-EN",
    "locator": "p. 1"
  },
  {
    "id": "Q01276",
    "materialId": "M001",
    "gradeId": "G002-01",
    "topic": "Adhesion between layers",
    "text": "Compared to general PLA, it can easily achieve printing speeds up to 250-300 mm/s and has excellent toughness and Z-layer strength.",
    "exposure": "Not applicable",
    "sourceId": "B-PC-Bambu-PLA-Basic-Technical-Data-Sheet",
    "locator": "p. 1"
  },
  {
    "id": "Q01427",
    "materialId": "M011",
    "gradeId": "G011-06",
    "topic": "Good for",
    "text": "With a refined formula that enhances toughness and printing performance, it is ideal for printing machine-, armor-, and metallic-style models.",
    "exposure": "Not applicable",
    "sourceId": "R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-Metal-V3-0",
    "locator": "p. 1"
  },
  {
    "id": "Q01909",
    "materialId": "M020",
    "gradeId": "G020-48",
    "topic": "Benefits",
    "text": "Anycubic PETG is a high-toughness basic filament known for its vibrant colors, durability (impact-resistant), water/weather resistance, and chemical stability.",
    "exposure": "Not applicable",
    "sourceId": "R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PETG-V3-0",
    "locator": "p. 1"
  },
  {
    "id": "Q01981",
    "materialId": "M020",
    "gradeId": "G022-01",
    "topic": "Benefits",
    "text": "Offering greater durability and toughness than PLA, PETG HF is the ideal choice for creating long-lasting items with an improved finish and faster production times.",
    "exposure": "Not applicable",
    "sourceId": "B-petg-hf-TDS",
    "locator": "p. 1"
  },
  {
    "id": "Q02267",
    "materialId": "M027",
    "gradeId": "G027-36",
    "topic": "Benefits",
    "text": "It can withstand temperatures up to 85°C and is known for its high toughness and impressive printing success rates.",
    "exposure": "Not applicable",
    "sourceId": "R-3DJAKE-3DJAKE-ANYCUBIC-TDS-ABS-V3-0",
    "locator": "p. 1"
  },
  {
    "id": "Q02559",
    "materialId": "M031",
    "gradeId": "G031-30",
    "topic": "Good for",
    "text": "Anycubic ASA is a weather- and temperature-resistant filament, featuring high-impact resistance as well as rain and UV resistance, making it suitable for outdoor environments.",
    "exposure": "Not applicable",
    "sourceId": "R-3DJAKE-3DJAKE-ANYCUBIC-TDS-ASA-V3-0",
    "locator": "p. 1"
  },
  {
    "id": "Q05649",
    "materialId": "M020",
    "gradeId": "G022-01",
    "topic": "Good for",
    "text": "PETG HF maintains the inherent strengths of regular PETG, providing superior resistance to water, UV, and temperatures. Tougher and more durable than PLA, with higher temperature resistance, it's the perfect choice for printing outdoor items such as planter pots, bird cages, watering cans, and automotive parts. Additionally, it's ideal for outdoor toys that require long-term exposure and the ability to withstand impacts, collisions, and falls.",
    "exposure": "Exact maker intended-use claim only; no design allowable, guaranteed lifetime, chemical/weathering qualification or suitability PASS. Revision/formulation, geometry and print conditions remain unstated unless the quotation specifies them.",
    "sourceId": "R-BAMBU-PRIORITY-20261003-50cc66066285",
    "locator": "p. 1: exact product features/description/application tips, source text line 138"
  }
];
const NEW = [
 {grade:'G006-01',source:source.SourceID,locator:'p. 1: Engineered for real-world impact',text:'Engineered for real-world impact, Bambu PLA Tough+ delivers toughness on par with ABS and offers up to 2× stronger layer adhesion than standard PLA. It shrugs off bumps, drops, and hits, making it ideal for RC cars, model planes, and durable tools.'},
 {grade:'G006-01',source:source.SourceID,locator:'p. 1: Designed for repeated flexing',text:'Designed for repeated flexing, Bambu PLA Tough+ outlasts standard PLA where it typically fails. It’s perfect for prints that need to bend without breaking—like springs, clips, and connectors.'},
 {grade:'G006-01',source:source.SourceID,locator:'p. 1: enhanced durability',text:'With enhanced durability, Bambu PLA Tough+ maintains its performance over time, extending the lifespan of standard PLA prints and making it suitable for demanding, tool-grade applications. Use it for parts that need impact resistance and repeated flexing.'},
 {grade:'G001-199',source:'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-V3-0',locator:'p. 1: Product Name: Anycubic PLA+; introduction',text:'Anycubic PLA+ is an eco-friendly filament known for its high toughness, impressive impact resistance, and excellent elongation at break.'},
];
const PREVIOUS_NOTE='Exact-product maker claim, re-read 2026-10-06 by Codex AI, not a person. Claimed comparators are retained as printed; no matching controlled test comparison, performance ratio, design allowable, screening or ranking result is established by this statement.';
const EXPOSURE = [
 'The ABS comparator is qualitative. The claimed up-to-2× multiple concerns layer adhesion versus standard PLA; it is not an impact-strength multiple. Specimen, conditioning, test method and comparison population are not stated here.',
 'Repeated-flexing claim versus standard PLA; cycle count, strain, specimen, environment and failure criterion are not stated in this paragraph.',
 'Durability and intended-use claim; service time, loads, geometry and acceptance criterion are not stated in this paragraph.',
 'Qualitative toughness, impact and elongation claim. Its numerical impact table labels Izod while citing ISO179; this statement does not resolve that conflict or assign a notch to the measured row.',
];
function bytes(s) {
 const path=['pdf','html'].map(e=>cacheDir('sources/by-sha',`${s.SHA256}.${e}`)).find(existsSync);
 if(!path || sha256(readFileSync(path))!==s.SHA256)throw new Error(`${MIGRATION}: original bytes absent or changed for ${s.SourceID}`);
}
const ledger = readCsv('docs/audits/2026-10-06-published-evidence/ingest/ledger.csv').records.map(r=>r.values);
if(!ledger.some(r=>r.sha256===source.SHA256 && r.format==='HTML' && r.status==='duplicate-of'))throw new Error(`${MIGRATION}: witness was not staged through the import pipeline`);
bytes(source);
const heldSource=t.find('sources',source.SourceID);
if(heldSource) {for(const [k,v] of Object.entries(source))if(heldSource[k]!==v)throw new Error(`${MIGRATION}: ${source.SourceID} ${k} moved`);}
else t.append('sources',source);
// Source registration is in memory only until all guards pass and t.save commits the transaction.
for(const k of [...RETOPIC,...NEW.map(x=>({sourceId:x.source,text:x.text}))]) {const s=t.get('sources',k.sourceId);bytes(s);onCachedSheet(t,k.sourceId,k.text,MIGRATION);}
for(const k of RETOPIC) {
 const row=t.get('evidence',k.id);
 for(const [field,expect] of Object.entries({GradeID:k.gradeId,SourceID:k.sourceId,Finding:k.text,Locator:k.locator}))if(row[field]!==expect)throw new Error(`${MIGRATION}: ${k.id} ${field} moved`);
 if(row.Topic!==k.topic && row.Topic!==TOPIC)throw new Error(`${MIGRATION}: ${k.id} Topic moved`);
}
let changed=heldSource?0:1;
for(const k of RETOPIC)if(t.get('evidence',k.id).Topic!==TOPIC){t.set('evidence',k.id,'Topic',TOPIC,{expect:k.topic});changed++;}
for(const [index,x] of NEW.entries()) {
 const note=EXPOSURE[index];
 const existing=t.rows('evidence').find(r=>r.GradeID===x.grade&&r.SourceID===x.source&&r.Locator===x.locator);
 if(existing) {if(existing.Finding!==x.text||existing.Topic!==TOPIC)throw new Error(`${MIGRATION}: prior added statement moved`);
 if(existing['Exposure / conditions']!==note){t.set('evidence',existing.EvidenceID,'Exposure / conditions',note,{expect:PREVIOUS_NOTE});changed++;}
 continue;}
 t.append('evidence',{EvidenceID:t.nextId('evidence'),MaterialID:t.get('grades',x.grade).MaterialID,GradeID:x.grade,Domain:"Makers' know-how",Topic:TOPIC,Finding:x.text,'Exposure / conditions':note,'Rating 1–5':'Not published',RubricID:'Not applicable','Evidence type':'Manufacturer statement',SourceID:x.source,Locator:x.locator});changed++;
}
const proposals=applyProposals(t,'docs/audits/2026-10-06-published-evidence/proposals',{migration:MIGRATION,date:'2026-10-06',read:'Codex AI image review, source text checked; no deciding corrections proposed'});
if(changed)t.save();
console.log(JSON.stringify({changed,proposals}));
