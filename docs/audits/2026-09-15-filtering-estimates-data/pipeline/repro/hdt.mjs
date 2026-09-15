const ROOT = decodeURIComponent(new URL('../../../../../', import.meta.url).pathname);
import { readCsv } from '../../../../../build/src/csv.js';
import { parseHdtStandard } from '../../../../../build/src/normalize/thermal.js';
const rows = readCsv((ROOT + 'data/tables/measurements.csv')).records.map(r=>r.values);
const hdt = rows.filter(r=>r.Property==='HDT');
console.log('HDT rows', hdt.length, 'non-HDT with Test load != N/A:', rows.filter(r=>r.Property!=='HDT'&&r['Test load MPa']!=='Not applicable').map(r=>r.MeasurementID).join(','));
console.log('HDT with Test load N/A:', hdt.filter(r=>r['Test load MPa']==='Not applicable').map(r=>r.MeasurementID).join(','));
console.log('non-HDT citing 75/648:', rows.filter(r=>r.Property!=='HDT'&&/ISO\s*75\b|648/.test(r['Standard / load'])).map(r=>r.MeasurementID+':'+r.Property+':'+r['Standard / load']).join(' || '));
const m=new Map();
for (const r of hdt) { const p=parseHdtStandard(r['Standard / load']); const k=r['Standard / load']+'|||'+r['Test load MPa']; if(!m.has(k)) m.set(k,{t:r['Standard / load'],typed:r['Test load MPa'],p,ids:[],review:new Set()}); const e=m.get(k); e.ids.push(r.MeasurementID); if(r['Parse review']!=='Not applicable') e.review.add(r['Parse review']); }
for (const e of m.values()) {
  const flags=[]; const t=e.t;
  if (/psi|kg\s*\/\s*cm|kPa/i.test(t) && !/MPa|MN/.test(t)) flags.push('PSI-ONLY');
  if (/0[.,]45/.test(t) && /1[.,]8/.test(t)) flags.push('BOTH-LOADS-FIRST-WINS');
  if (/Method A \(0\.45|Method B \(1\.8/.test(t)) flags.push('SOURCE-METHOD-LETTER-INVERTED');
  if (String(e.p.loadMPa??'Not published')!==e.typed) flags.push('TYPED-DIFFERS'+(e.review.size?' (reviewed)':''));
  if (!e.p.standard) flags.push('NO-STANDARD');
  console.log([JSON.stringify(t), e.typed, e.p.loadMPa, e.p.standard, e.ids.length, e.ids.slice(0,3).join(' '), flags.join(' '), [...e.review].join('|').slice(0,80)].join('\t'));
}
