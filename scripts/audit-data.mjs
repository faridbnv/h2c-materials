// Reproducible audit using the production loader, compiler, validator and raw-value rules.
// npm run audit:data -- output-directory [before-db.json]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { snapshotDate } from '../build/src/load.js';
import { checkData } from '../build/src/schema.js';
import { readSource } from '../build/src/source.js';
import { compile } from '../build/src/compile.js';
import { validate } from '../build/src/validate.js';
import { normalizedRawValue } from '../build/src/measurement-rules.js';
import { compileReference } from '../build/src/reference.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const out = resolve(args[0] ?? 'build/reports/data-audit');
mkdirSync(out, { recursive: true });
const hash = (b) => createHash('sha256').update(b).digest('hex');
const { wb, referenceRows, referenceWhere, inputs } = readSource(resolve('.'));
const stored = JSON.parse(readFileSync('dist/db.json'));
const { db, issues } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: stored.meta.build });
issues.push(...validate(db, wb));
issues.push(...checkData(resolve('data'), resolve('schema')).issues);
const identical = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const htmlPath = `dist/H2C_Material_Selector_${db.meta.snapshot}.html`;
const html = readFileSync(htmlPath, 'utf8');
const reference = compileReference(referenceRows, issues, referenceWhere, db.registry);
const unpack = (id) => JSON.parse(gunzipSync(Buffer.from(html.match(new RegExp(`id="${id}"[^>]*>([^<]+)</script>`))?.[1] ?? '', 'base64')));
const checks = {
  freshCompileMatchesDist: identical(db, stored),
  htmlDatabaseMatchesDist: identical(unpack('db-data'), stored),
  htmlReferenceMatchesDist: identical(unpack('reference-data'), JSON.parse(readFileSync('dist/reference.json'))),
  freshReferenceMatchesDist: identical(reference, JSON.parse(readFileSync('dist/reference.json'))),
  externalScriptOrStylesheet: /<(?:script\b[^>]*\bsrc|link\b[^>]*\bhref)\s*=\s*["']https?:/i.test(html),
};
if (!checks.freshCompileMatchesDist || !checks.htmlDatabaseMatchesDist || !checks.htmlReferenceMatchesDist || !checks.freshReferenceMatchesDist || checks.externalScriptOrStylesheet) issues.push({level:'error',where:'HTML pipeline',message:'Fresh source, compiled data or embedded data drift; or external script/style dependency'});
for (const r of reference.materials) for (const [key, p] of Object.entries(r.properties)) {
  if (p && (!Number.isFinite(p.min) || !Number.isFinite(p.max) || p.min > p.max)) issues.push({level:'error',where:`Reference ${r.id} ${key}`,message:'Invalid reference interval'});
}

const rawChecks = wb.Properties.rows.map((r) => ({
  id:r.MeasurementID, materialId:r.MaterialID, gradeId:r.GradeID, row:r.__row,
  raw:r['Raw value'], rawUnit:r['Raw unit'], value:r['Normalized value'], unit:r['Normalized unit'],
  expected:/^Published value/.test(r['Data status']) ? normalizedRawValue(r) : null,
  status:r['Data status'], sourceId:r.SourceID, locator:r.Locator,
}));
const sourceMap = new Map(db.sources.map((s) => [s.id, s]));
const sourceScopeMismatches = [];
for (const r of [...db.measurements, ...db.profiles, ...db.evidence]) {
  const applicable = sourceMap.get(r.sourceId)?.applicableGrades;
  if (r.gradeId?.startsWith('G') && /G\d{3}-/.test(applicable) && !(applicable.match(/G\d{3}-(?:\d+|R\d+)/g) ?? []).includes(r.gradeId)) sourceScopeMismatches.push(r.id);
}
if (sourceScopeMismatches.length) issues.push({level:'error',where:'source scope',message:sourceScopeMismatches.join(', ')});
const sourceUsage = db.sources.map((s) => ({...s,
  checksumRecorded: /^[a-f0-9]{64}$/i.test(s.sha256 ?? ''),
  records: Object.fromEntries(['grades','measurements','profiles','evidence','prices'].map((k)=>[k,db[k].filter((r)=>r.sourceId===s.id).map((r)=>r.id)])),
  verification:'Source register and references inspected; live retrieval only where listed in source-review.json',
}));
const materialRows = db.materials.map((m) => {
  const own = (key) => db[key].filter((r) => r.materialId === m.id);
  const measured = own('measurements');
  return {
    id:m.id,name:m.name,family:m.family,basePolymer:m.basePolymer,modifier:m.modifier,role:m.role,
    representativeGrade:m.representativeGrade,activeGradeIds:m.gradeIds,
    retiredGradeIds:own('grades').filter((g)=>g.retired).map((g)=>g.id),
    studyGradeIds:own('grades').filter((g)=>/-R\d+$/.test(g.id)).map((g)=>g.id),
    headlineCitations:Object.fromEntries(Object.entries(m.headline).filter(([,h])=>h.known&&h.measurementId).map(([k,h])=>[k,h.measurementId])),
    measurements:measured.map((r)=>r.id),numeric:measured.filter((r)=>r.numeric).length,
    profiles:m.profileIds,evidence:own('evidence').map((r)=>r.id),prices:own('prices').map((r)=>r.id),
    coverage:own('coverage').map((r)=>r.id),
    sources:[...new Set(['grades','measurements','profiles','evidence','prices'].flatMap((k)=>own(k).map((r)=>r.sourceId)))].sort(),
    estimates:Object.entries(m.headline).filter(([,h])=>h.estimate).map(([key,h])=>({key,...h.estimate})),
    limitations:[
      ...(!measured.length?['No property measurements']:[]),
      ...(m.headline.hdt045.known&&!m.headline.hdt045.loadStated?['Headline HDT load unstated']:[]),
      ...(measured.some((r)=>r.numeric&&r.direction==='unknown')?['Some measurement directions unstated']:[]),
      ...(measured.some((r)=>r.numeric&&r.specimenType?.startsWith('Not published'))?['Some specimen forms unstated']:[]),
      ...(own('grades').filter(g=>!g.retired&&!/-R\d+$/.test(g.id)).length>1?['Multiple grades: printing/price/evidence may not describe representative grade']:[]),
      ...(m.excluded?['Outside H2C scope']:[]),
    ],
  };
});
const families = [...new Set(materialRows.map(m=>m.family))].map(family=>{
  const ms=materialRows.filter(m=>m.family===family);
  return {family,materials:ms.map(m=>m.id),basePolymers:[...new Set(ms.map(m=>m.basePolymer))],modifiers:[...new Set(ms.map(m=>m.modifier))],numeric:ms.reduce((n,m)=>n+m.numeric,0),estimates:ms.flatMap(m=>m.estimates.map(e=>({material:m.id,...e}))),interpretation:ms.some(m=>m.basePolymer!==ms[0].basePolymer)?'Navigation family spans distinct polymers; no property transfer between them':'Shared base identity does not establish grade/formulation equivalence'};
});
const provenance=[];
for (const [sheet,{rows}] of Object.entries(wb)) for (const r of rows) {
  const id = r[wb[sheet].header[0]];
  const sourceIds = String(r.SourceID ?? '').split(';').map(s=>s.trim()).filter(Boolean);
  provenance.push({sheet,file:r.__file??'',row:r.__row,id,materialId:r.MaterialID??'',gradeId:r.GradeID??'',sourceId:r.SourceID??'',locator:r.Locator??r['Source locator']??'',urls:sourceIds.map(id=>sourceMap.get(id)?.url??'').join('; ')});
}
const csv=(rows)=>{
  const keys=Object.keys(rows[0]??{}),cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  return [keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\n')+'\n';
};
let changes=null;
if(args[1]){
  const before=JSON.parse(readFileSync(args[1]));
  changes={};
  for(const entity of ['materials','measurements','grades','profiles','evidence']) changes[entity]=db[entity].flatMap(r=>{
    const old=before[entity].find(x=>x.id===r.id);
    if(!old)return [{id:r.id,added:true}];
    const fields=Object.keys(r).filter(k=>!identical(old[k],r[k]) && !(k==='retired'&&r[k]===false));
    return fields.length?[{id:r.id,fields:Object.fromEntries(fields.map(k=>[k,{before:old[k],after:r[k]}]))}]:[];
  });
}
const result={date:new Date().toISOString(),baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceInputs:inputs,sourceSha256:hash(inputs.map(i=>`${i.sha256}  ${i.file}`).join('\n')),htmlSha256:hash(html),counts:db.meta.counts,checks,issues,sourceScopeMismatches,rawReconciled:rawChecks.filter(r=>r.expected!==null).length,rawChecks,materials:materialRows,families,sources:sourceUsage};
writeFileSync(join(out,'audit.json'),JSON.stringify(result,null,2)+'\n');
writeFileSync(join(out,'record-index.csv'),csv(provenance));
if(changes)writeFileSync(join(out,'compiled-changes.json'),JSON.stringify(changes,null,2)+'\n');
const L=['# Filament and family audit matrix','',`Source data SHA256: \`${result.sourceSha256}\` (hash of the per-file hashes in audit.json). Rebuild with \`npm run audit:data\`.`, '', 'Every row received the same automated ownership, citation, raw-value and compilation checks. This is not a claim that every source was independently re-read. `audit.json` carries all record IDs and limitations; `record-index.csv` resolves each ID to its source-table row and source.', '', '## Every filament','', '| ID | Filament | Family / base | Active procurement grades | Numeric / all measurements | Profiles | Evidence | Limitations |','|---|---|---|---|---:|---:|---:|---|'];
for(const m of materialRows)L.push(`| ${m.id} | ${m.name} | ${m.family} / ${m.basePolymer} | ${m.activeGradeIds.join(', ')||'None'} | ${m.numeric} / ${m.measurements.length} | ${m.profiles.length} | ${m.evidence.length} | ${m.limitations.join('; ')||'No additional flag from these checks; exact grade conditions still apply'} |`);
L.push('','## Every family','','| Family | Material IDs | Base polymers | Numeric observations | Interpretation |','|---|---|---|---:|---|');
for(const f of families)L.push(`| ${f.family} | ${f.materials.join(', ')} | ${f.basePolymers.join(', ')} | ${f.numeric} | ${f.interpretation} |`);
writeFileSync(join(out,'MATRIX.md'),L.join('\n')+'\n');
console.log(JSON.stringify({out,counts:result.counts,checks,rawReconciled:result.rawReconciled,errors:issues.filter(i=>i.level==='error'),families:families.length},null,2));
if(issues.some(i=>i.level==='error'))process.exitCode=1;
