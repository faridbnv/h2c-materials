// GOALS steps 2/5: original test recipe limits and central values, preserving the source's ambiguity.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {openTables,projectRoot} from '../data/table-io.mjs';
import {applyPriorityPacket} from './priority-product-packet.mjs';
const p=JSON.parse(readFileSync(join(projectRoot,'docs/audits/2026-09-30-coverage-expansion/priority-04-asa-aero-correction-packet.json'))),t=openTables();
for(const expected of p.ExpectedProfiles){const actual=t.get('profiles',expected.ProfileID);if(!actual||Object.entries(expected).some(([k,v])=>actual[k]!==v))throw Error('m325: source profile moved '+expected.ProfileID);}
applyPriorityPacket('priority-04-asa-aero-correction','8014275a44d08ef9ca5053acee2f1698d88fb63b961f98c5ff520999ebfea582','m325-priority-04-asa-aero-correction');
// The reproduced transcription correction removes this ratio finding; preserve its old review in the audit.
const {readCsv,csvText}=await import('../../build/src/csv.js');
const at=join(projectRoot,'data/review/accepted-findings.csv'),csv=readCsv(at),rows=csv.records.map(r=>r.values),matches=rows.filter(r=>r.Code==='MEAS-PHYSICS-STRAIN'&&r.Table==='measurements'&&r.Record==='V000646'&&r.Field==='Normalized value');
if(matches.length){
 const expected='Brittle printed bars whose sheets give a strain at break 10-60 % below stress / modulus. Systematic across Bambu Lab, IPCON and others, so the modulus basis (chord or crosshead) differs from the strain measurement; not a transcription error, and no headline decision rests on the ratio.';
 if(matches.length!==1||matches[0].Reason!==expected||matches[0].Accepted!=='2026-09-15')throw Error('m325: stale acceptance moved');
 const meta=openTables();meta.stageFile('docs/audits/2026-09-30-coverage-expansion/priority-04-asa-aero-retired-acceptance.json',JSON.stringify({migration:'m325',reason:'Reproduced source central-value correction removes the lint finding; previous review retained here.',previous:matches[0]},null,2)+'\n');meta.stageFile(at,csvText(csv.header,rows.filter(r=>!matches.includes(r))));meta.save();console.log('m325: removed one reproduced stale acceptance; historical reason retained');
}
