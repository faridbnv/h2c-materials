const ROOT = decodeURIComponent(new URL('../../../../../', import.meta.url).pathname);
import { kindOf } from '../../../../../build/src/estimates.js';
import { moistureState } from '../../../../../build/src/normalize/moisture.js';
import fs from 'node:fs';
const db = JSON.parse(fs.readFileSync((ROOT + 'dist/db.json'),'utf8'));
const byId = new Map(db.measurements.map(m=>[m.id,m]));
const HEAD = { density: 'density', tensileModulusXY: 'tensile XY', tensileStrengthXY: 'ultimate XY', elongationXY: 'break XY', hdt045: 'HDT 0.45' };
const out=[];
for (const mat of db.materials) for (const [key,h] of Object.entries(mat.headline)) {
  if (!h.known || !h.measurementId) continue;
  const m = byId.get(h.measurementId); const flags=[];
  const ms = moistureState(m.moisture);
  if (ms==='conditioned') flags.push('CONDITIONED:'+m.moisture);
  if (/Raw material/.test(m.specimenType)) flags.push('MOULDED');
  if (/Film/.test(m.specimenType)) flags.push('FILM');
  if (/anneal/i.test(m.postProcessing) && !/not annealed|Unannealed/i.test(m.postProcessing)) flags.push('ANNEALED:'+m.postProcessing.slice(0,50));
  if (key==='hdt045') { if (!m.thermal?.loadStated) flags.push('LOAD-UNSTATED'); else if (m.thermal.loadMPa!==0.45) flags.push('LOAD='+m.thermal.loadMPa); }
  if (key==='tensileStrengthXY' && m.property!=='Tensile strength (endpoint unspecified)') flags.push('ENDPOINT:'+m.property);
  if (m.operator && m.operator!=='=') flags.push('OPERATOR'+m.operator);
  if (key==='tensileStrengthXY' && m.property==='Tensile strength (endpoint unspecified)') {
    // stated ultimate? there's no 'ultimate' property; check yield/break on same grade+source XY
    const alt = db.measurements.filter(x=>x.gradeId===m.gradeId && x.sourceId===m.sourceId && x.direction==='XY' && /Tensile (yield|break) strength/.test(x.property) && x.numeric);
    if (alt.length) flags.push('ALSO-ON-SOURCE:'+alt.map(a=>a.property.split(' ')[1]+'='+a.value+'('+a.id+')').join(';'));
  }
  const kind = kindOf(m, key, 'semi-unfilled');
  if (kind && kind.replace(/ (amorphous|semicrystalline|semi-unfilled)$/,'')!==HEAD[key]) flags.push('KIND='+kind);
  // same-grade same property outliers
  const peers = db.measurements.filter(x=>x.gradeId===m.gradeId && x.property===m.property && x.numeric && x.id!==m.id && x.unit===m.unit && (key!=='hdt045'||x.thermal?.loadMPa===m.thermal?.loadMPa) && (!/XY$/.test(key)||x.direction===m.direction));
  if (peers.length) { const vals=peers.map(p=>p.value); const med=vals.sort((a,b)=>a-b)[vals.length>>1];
    const ratio = key==='hdt045'? Math.abs(m.value-med) : Math.max(m.value/med, med/m.value);
    if ((key==='hdt045' && ratio>15) || (key!=='hdt045' && ratio>1.35)) flags.push(`OUTLIER vs ${peers.length} peers median ${med} (${peers.map(p=>p.id+'='+p.value).join(';').slice(0,120)})`); }
  if (flags.length) out.push([mat.id, mat.name, key, m.id, m.value, m.gradeId, flags.join(' | ')].join('\t'));
}
console.log(out.join('\n'));
