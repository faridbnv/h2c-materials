const ROOT = decodeURIComponent(new URL('../../../../../', import.meta.url).pathname);
import fs from 'node:fs';
import { readCsv } from '../../../../../build/src/csv.js';
import { parseHdtStandard } from '../../../../../build/src/normalize/thermal.js';
import { normalizeDirection } from '../../../../../build/src/normalize/direction.js';
import { moistureState } from '../../../../../build/src/normalize/moisture.js';
import { parseOperator, DATA_STATUS } from '../../../../../build/src/normalize/values.js';
const rows = readCsv((ROOT + 'data/tables/measurements.csv')).records.map(r=>r.values);
const q = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
const out = [['Column','RawText','Rows','ExampleIDs','MappedValue','Flag','Note'].join(',')];
const distinct = (col, filter = () => true) => { const m = new Map(); for (const r of rows.filter(filter)) { const k = r[col]; if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return [...m].sort((a,b)=>b[1].length-a[1].length); };
const push = (col, raw, rs, mapped, flag, note) => out.push([q(col), q(raw), rs.length, q(rs.slice(0,3).map(r=>r.MeasurementID).join(' ')), q(mapped), q(flag), q(note)].join(','));
const ESTDIR = { XY: 'XY', XZ: 'XY', 'horizontal-source-label': 'XY', 'along-flow': 'XY', Z: 'Z', ZX: 'Z', 'vertical-xz-source-label': 'Z' };
for (const [raw, rs] of distinct('Moisture condition')) {
  const s = moistureState(raw); let flag = 'ok', note = '';
  if (/^(<20% RH|Keep vacuum|Kept dry)/.test(raw)) { note = 'storage/drying guidance, not test state'; }
  if (raw === 'Dry (source row); table heading 50% RH') { flag = 'suspect'; note = 'row says dry under a 50% RH heading; declared dry'; }
  const ppDry = rs.filter(r => s === 'not-stated' && /dried (for|at)/i.test(r['Post-processing']));
  if (ppDry.length) { flag = 'inconsistent'; note = `Post-processing says dried on ${ppDry.map(r=>r.MeasurementID).join(' ')} but Moisture condition is Not published (siblings use "Dried before testing")`; }
  push('Moisture condition', raw, rs, `state=${s}; estimates kind ${s==='conditioned'?"' wet' (wet offset)":'dry/as-is'}`, flag, note);
}
for (const [raw, rs] of distinct('Direction')) {
  const d = normalizeDirection(raw); let flag = d.mapped ? 'ok' : 'unmapped-fallthrough', note = '';
  if (raw === '45/45') note = 'in schema/vocab/directions.csv but missing from direction.js MAP; becomes unknown, drawer says "direction not stated by the source"';
  if (['XZ','Horizontal (source label)','Along flow'].includes(raw)) { flag = 'policy-divergence'; note = 'compile keeps it apart from XY; estimates.js DIRECTION_CLASS merges it into XY with no conversion'; }
  if (raw === 'Vertical XZ (source label)') { flag = 'policy-divergence'; note = 'estimates.js treats as Z while plain XZ is treated as XY'; }
  const naMech = rs.filter(r => raw === 'Not applicable' && /Tensile|Flexural|Elongation|Izod|Charpy|Impact|Compression/.test(r.Property) && /^Published value/.test(r['Data status']));
  if (naMech.length) { flag = 'misuse'; note = `${naMech.length} mechanical rows use Not applicable (evades MEAS-PRINTED-NO-DIRECTION), e.g. ${naMech.slice(0,6).map(r=>r.MeasurementID).join(' ')}`; }
  push('Direction', raw, rs, `compile=${d.canonical}; estimates class=${ESTDIR[d.canonical] ?? 'unk'}`, flag, note);
}
for (const [raw, rs] of distinct('Specimen type')) {
  const moulded = raw.startsWith('Raw material'), film = /^Film/i.test(raw);
  let flag = 'ok', note = '';
  if (film) { flag = 'partial'; note = 'excluded from estimates, but compile impliedBounds/related.intervals still use it (V000039, V002179 bound PLA strength)'; }
  if (raw === 'Filament') { flag = 'suspect'; note = 'filament tensile treated as a printed-part observation in estimates and impliedBounds (V001700)'; }
  if (raw === 'Printed specimen; TDS reports N/A') note = 'printed=true in related evidence';
  push('Specimen type', raw, rs, `estimates=${moulded?'moulded kind':film?'excluded':'printed/unspecified kind'}; related.printed=${raw.startsWith('Printed specimen')}; impliedBounds=${moulded?'excluded':'used'}`, flag, note);
}
for (const [raw, rs] of distinct('Notch')) push('Notch', raw, rs, 'passthrough (no mapper; no impact headline)', 'ok', raw==='Not published' ? 'notched and unnotched impact values share one property; nothing compares them' : '');
for (const [raw, rs] of distinct('Operator')) { const o = parseOperator(raw); push('Operator', raw, rs, `parseOperator=${o}; interval=${o==='>'?'lo only':o==='<'?'hi only':'point/range/uncertainty'}`, 'ok', raw==='Not applicable'?'non-numeric rows only':''); }
for (const [raw, rs] of distinct('Data status')) { const s = DATA_STATUS[raw]; push('Data status', raw, rs, JSON.stringify(s), s ? 'ok' : 'unknown', s?.retiredDuplicate ? 'dropped from db.json before compile' : ''); }
for (const [raw, rs] of distinct('Post-processing')) {
  const annealed = /anneal/i.test(raw) && !/not annealed|unannealed/i.test(raw);
  const cond = /conditioned|immersed/i.test(raw);
  let flag = 'not-mapped', note = 'no mapper: compile and estimates ignore Post-processing';
  const mixed = rs.filter(r => r.Property === 'HDT' && ['G019-01','G068-02','G074-02'].includes(r.GradeID));
  if (mixed.length) { flag = 'defect-downstream'; note += `; HDT rows ${mixed.map(r=>r.MeasurementID).join(' ')} are averaged in estimates with differently post-processed HDT of the same formulation`; }
  if (/annealed and dried at (55|65|70|75|80) °C/.test(raw)) note = 'Bambu Lab boilerplate (drying schedule worded as annealing); no as-printed alternative on the same sheet';
  if (cond) note += '; conditioning also carried by Moisture condition';
  push('Post-processing', raw, rs, annealed ? 'annealed (text only)' : raw === 'As printed' || /not annealed|Unannealed/.test(raw) ? 'as printed (text only)' : 'unknown', flag, note);
}
for (const [raw, rs] of distinct('Standard / load', r => r.Property === 'HDT')) {
  const p = parseHdtStandard(raw); const typed = [...new Set(rs.map(r=>r['Test load MPa']))].join('|');
  let flag = String(p.loadMPa ?? 'Not published') === typed ? 'ok' : 'typed-differs';
  let note = '';
  if (/Method A \(0\.45|Method B \(1\.8/.test(raw)) { flag = 'source-mislabel'; note = 'ISO 75 method letters inverted in source (A is 1.80 MPa); number wins; rows are Not published values'; }
  if (/psi/.test(raw)) note = 'psi ignored by parser; MPa beside it decides (a psi-only text would read load not stated)';
  if (!p.standard) note = (note ? note + '; ' : '') + 'no standard recognised';
  push('Standard / load (HDT rows)', raw, rs, `standard=${p.standard}; parser load=${p.loadMPa ?? 'unstated'}; typed=${typed}`, flag, note);
}
const nonHdtStd = distinct('Standard / load', r => r.Property !== 'HDT');
out.push([q('Standard / load (non-HDT rows)'), q(`${nonHdtStd.length} distinct texts`), rows.filter(r=>r.Property!=='HDT').length, q(''), q('not parsed; text only'), q('not-mapped'), q('melt-flow temperature/load, impact method (ISO 179 vs 180) and test speed live only here; nothing compares on them. V002055 "Notched Izod" cites IS O 179 (Charpy)')].join(','));
for (const [raw, rs] of distinct('Test load MPa')) push('Test load MPa', raw, rs, raw, raw !== 'Not applicable' && rs.some(r=>r.Property!=='HDT') ? 'misuse' : 'ok', raw==='Not applicable' ? 'all non-HDT rows; no HDT row is N/A' : '');
fs.writeFileSync((ROOT + 'docs/audits/2026-09-15-filtering-estimates-data/pipeline/mapper-table.csv'), out.join('\n') + '\n');
console.log(out.length - 1, 'rows');
