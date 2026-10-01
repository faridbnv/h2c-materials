import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {openTables,projectRoot} from '../data/table-io.mjs';
import {locate} from '../data/source-store.mjs';
const migration='m262-sunlu-pcl-off-recipe-specimen',at=join(projectRoot,'docs/audits/2026-09-30-coverage-expansion');
const bytes=readFileSync(join(at,'sunlu-pcl-specimen-packet.json')),hash=createHash('sha256').update(bytes).digest('hex'),review=JSON.parse(readFileSync(join(at,'sunlu-pcl-specimen-review.json')));
if(hash!=='60e37a5aa4ae55ab08687783cae699da264fe9ea7ede6e3c04fb1ab192ba6988'||review.input_sha256!==hash||review.overall_verdict!=='APPROVE')throw Error(`${migration}: changed or unreviewed packet`);
const p=JSON.parse(bytes),t=openTables();
const agrees=(row,expected)=>row&&Object.entries(expected).every(([k,v])=>row[k]===v);
const check=(row,expected,name)=>{if(!agrees(row,expected))throw Error(`${migration}: ${name} moved`);};
const m=t.get('measurements',p.ExpectedMeasurement.MeasurementID);
if(!agrees(m,p.ProposedMeasurement))check(m,p.ExpectedMeasurement,m.MeasurementID);
check(t.get('sources',p.ExpectedSource.SourceID),p.ExpectedSource,p.ExpectedSource.SourceID);
const original=locate(p.ExpectedSource.SHA256,p.ExpectedSource.SourceID);
if(original.bytes!=='present'||createHash('sha256').update(readFileSync(original.path)).digest('hex')!==p.ExpectedSource.SHA256)throw Error(`${migration}: original missing or changed`);
for(const o of p.Operations){const v=m[o.field];if(v!==o.expected&&v!==o.proposed)throw Error(`${migration}: ${m.MeasurementID} moved`);}
let written=0;for(const o of p.Operations){if(m[o.field]===o.proposed)continue;t.set('measurements',m.MeasurementID,o.field,o.proposed,{expect:o.expected});written++;}t.save();
console.log(JSON.stringify({migration,packet:hash,written},null,2));
