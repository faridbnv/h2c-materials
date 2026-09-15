const ROOT = decodeURIComponent(new URL('../../../../../', import.meta.url).pathname);
import { readCsv } from '../../../../../build/src/csv.js';
const rows = readCsv((ROOT + 'data/tables/measurements.csv')).records.map(r=>r.values);
const props = new Map(readCsv((ROOT + 'data/tables/properties.csv')).records.map(r=>[r.values.Property, r.values.Units.split(/;\s*/)]));
const combos=new Map(); const bad=[];
for (const r of rows) {
  if (!/^Published value/.test(r['Data status'])) continue;
  const k=`${r.Property} | ${r['Raw unit']} -> ${r['Normalized unit']} x ${r['Conversion factor']}`;
  combos.set(k,(combos.get(k)||[]).concat(r.MeasurementID));
  const rn=Number(r['Raw numeric']), cf=Number(r['Conversion factor']), nv=Number(r['Normalized value']);
  if (Number.isFinite(rn)&&Number.isFinite(cf)&&Number.isFinite(nv) && Math.abs(rn*cf-nv) > 1e-6*Math.max(1,Math.abs(nv))) bad.push(`${r.MeasurementID} ${r.Property} ${rn}x${cf}=${rn*cf} vs ${nv} [${r['Data status']}]`);
  if (!props.get(r.Property)?.includes(r['Normalized unit'])) bad.push(`UNIT-NOT-IN-PROPERTY ${r.MeasurementID} ${r.Property} ${r['Normalized unit']}`);
}
for (const [k,v] of [...combos].sort()) console.log(v.length+'\t'+k+'\t'+v.slice(0,3).join(' '));
console.log('--- mismatches'); console.log(bad.join('\n'));
