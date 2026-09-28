import { projectRoot } from '../../../../../scripts/data/table-io.mjs';
import{readFileSync,writeFileSync}from'node:fs';import{readCsv,csvText}from'../../../../../build/src/csv.js';import{cachedText}from'../../../../../scripts/lib/pdf-text.mjs';import{profileFor}from'../../../../../scripts/ingest/propose.mjs';
const root=projectRoot,dir=root+'/archive/ingest-2026-09-18/proposals/b39';const docs=readCsv(root+'/docs/audits/2026-09-28-gap-closing/C-DOCUMENTS.csv').records.map(r=>r.values);const by='Codex AI agent, 2026-09-28';
const pins=[
{gid:'G071-01',url:'/product/ppa-gf/',field:'enclosure',raw:'Enclosed-frame (rec.), open-frame',find:'Printer Type  Enclosed-frame (rec.), open-frame',open:true},
{gid:'G069-01',url:'/product/ppa/',field:'enclosure',raw:'Enclosed-frame (rec.), open-frame',find:'Printer Type  Enclosed-frame (rec.), open-frame',open:true},
{gid:'G144-02',url:'/pctg-cf-filament-black',field:'enclosure',raw:'It is ideal for use in open desktop 3D printers.',find:'It is ideal for use in open desktop 3D printers.',open:true},
{gid:'G151-01',url:'/fibreheart-tpu-gf-filament-tds',field:'enclosure',raw:'Not mandatory, but it is recommended',find:'Enclosure  Not mandatory, but it is recommended',open:true},
...['durapro-abs-cf/','durapro-pc-pbt/','durapro-pc-pbt-cf/'].map((slug,i)=>({gid:['G029-03','G095-02','G131-01'][i],url:slug,field:'enclosure',raw:'Yes',find:'Enclosed chamber required Yes'})),
{gid:'G156-01',url:'/epa-cf-product/',field:'enclosure',raw:'enclosed-chamber printing',find:'enclosed-chamber printing',closed:true},
{gid:'G029-06',url:'/eabs-cf-product',field:'enclosure',raw:'enclosed-chamber printing',find:'enclosed-chamber printing',closed:true},
{gid:'G086-02',url:'Fillamentum-OBC-905-printing-guide.pdf',field:'chamber',raw:'not required, but it helps',find:'Heated chamber/enclosure: not required, but it helps'},
{gid:'G054-03',url:'nylon-pa12gf-filament/',field:'chamber',raw:'does not require a heated print chamber',find:'does not require a heated print chamber',none:true},
{gid:'G134-01',url:'fiberflex-aero-en/',field:'enclosure',raw:'not required',find:'Enclosed chamber: not required'},
{gid:'G158-01',url:'pla-mineral-en/',field:'enclosure',raw:'not required',find:'Enclosed chamber: not required'},
{gid:'G144-03',url:'pctgcf-en/',field:'enclosure',raw:'not required',find:'Enclosed chamber: not required'},
{gid:'G105-01',url:'asa-electrically-conductive/',field:'chamber',raw:'does not require a heated chamber',find:'does not require a heated chamber',none:true},
{gid:'G084-02',url:'prusament-pp-glass-fiber/',field:'enclosure',raw:'Enclosure not required',find:'Enclosure not required'},
{gid:'G164-09',url:'ultra-pa/',field:'chamber',raw:'maintain chamber temperature at 40-60°C',find:'maintain chamber temperature at 40-60°C',range:true},
{gid:'G052-06',url:'nylon-pa12-en/',field:'chamber',raw:'it is recommended to use a 3D printer with an enclosed and heated chamber',find:'it is recommended to use a 3D printer with an enclosed and heated chamber',unknown:true},
{gid:'G112-01',url:'pc-ptfe/',field:'chamber',raw:'It is recommended to print using a heated chamber.',find:'It is recommended to print using a heated chamber.',recommendationOnly:true},
...['carbonx-nylon-12-cf-1','carbonx-abs-cf-1','carbonx-pc-cf-1','fluorx-pvdf-1'].map((slug,i)=>({gid:['G053-01','G029-01','G037-01','G096-01'][i],url:slug,field:'chamber',raw:'Recommended',find:'Heated Chamber',next:true}))
];
for(const d of docs){const path=dir+'/'+d.SHA256.slice(0,16)+'.json';let p=JSON.parse(readFileSync(path));p.discardedAutomaticGrades=p.grades.filter(g=>g.review.status==='rejected');p.grades=p.grades.filter(g=>g.review.status==='accepted');writeFileSync(path,JSON.stringify(p,null,2)+'\n');}
for(const pin of pins){let d=docs.find(d=>d.URL.includes(pin.url));if(!d||!d.GradeIDs.split('; ').includes(pin.gid))throw new Error('wrong product '+pin.gid);let t=cachedText(d.SHA256);let page=t.pages.find(p=>p.lines.some(l=>l.text.includes(pin.find)));let i=page?.lines.findIndex(l=>l.text.includes(pin.find));if(i<0||!page)throw new Error('source words not found '+pin.gid);let line=page.lines[i].text;if(pin.next){if(page.lines[i+1].text!=='Recommended')throw new Error('chamber recommendation changed');line+=' '+page.lines[i+1].text;}
 let pth=dir+'/'+d.SHA256.slice(0,16)+'.json',p=JSON.parse(readFileSync(pth));let profile=profileFor([{field:pin.field,raw:pin.raw,page:page.page,line}],{sourceId:d.SourceID,materialId:p.grades.find(g=>g.key===pin.gid).row.MaterialID,modifier:'',locator:'Exact-product chamber guidance: '+pin.find.replace(/\s+/g,' ')});profile.evidence.text=line;profile.id='chamber-'+pin.gid;profile.gradeKey=pin.gid;
 if(pin.open){profile.row['Enclosure state']='not-needed';profile.row['Parse review']='Exact product is explicitly compatible with open printers, or its enclosure is explicitly not mandatory. This clears the enclosure/chamber need under D33; no temperature is inferred. Raw recommendation remains visible. Codex AI, 2026-09-28.';}
 if(pin.closed){profile.row['Enclosure state']='recommended';profile.row['Parse review']='Exact product instruction specifies enclosed printing, without a heated chamber setpoint. Recorded as an enclosure ask only. Codex AI, 2026-09-28.';}
 if(pin.none){Object.assign(profile.row,{'Chamber state':'not-required','Chamber min °C':'Not applicable','Chamber max °C':'Not applicable','Chamber requirement':'none','Parse review':'Exact manufacturer sentence explicitly says the product does not require a heated chamber. Raw prose is retained; parser misreads require after negation. Codex AI, 2026-09-28.'});}
 if(pin.unknown){Object.assign(profile.row,{'Chamber state':'recommended','Chamber min °C':'Not applicable','Chamber max °C':'Not applicable','Chamber requirement':'recommended','Parse review':'The 3 in 3D names the printing process, not a temperature. Manufacturer recommends heating without a setpoint. Codex AI, 2026-09-28.'});}
 if(pin.range){profile.row['Chamber requirement']='recommended';profile.row['Parse review']='Conditional tuning recommendation, 40-60°C when an enclosure or temperature-controlled box is used; FAQ strongly recommends enclosure. No universal chamber necessity inferred. Codex AI, 2026-09-28.';}
 if(pin.recommendationOnly){Object.assign(profile.row,{'Chamber state':'recommended','Chamber requirement':'recommended','Parse review':'The full manufacturer sentence recommends heating without a setpoint. The generic parser leaves this prose unread; no required temperature or universal necessity inferred. Codex AI, 2026-09-28.'});}
 profile.review={status:'accepted',by,note:'Full captured text and exact product section inspected. Only the chamber/enclosure field enters; original recipes remain. '+(pin.none?'Explicit negative chamber statement.':'')};p.profiles=p.profiles.filter(r=>r.id!==profile.id);p.profiles.push(profile);writeFileSync(pth,JSON.stringify(p,null,2)+'\n');}
writeFileSync(root+'/docs/audits/2026-09-28-gap-closing/C-PINS.json',JSON.stringify(pins,null,2)+'\n');console.log(pins.length+' chamber/enclosure statements pinned');

// Source-only captures corroborate a bounded search; they publish no accepted deciding value.
for (const d of docs) { const path=dir+'/'+d.SHA256.slice(0,16)+'.json'; const p=JSON.parse(readFileSync(path)); if(d.Existing!=='TRUE' && p.source.row['Citation role']==='cited' && !p.profiles.some(r=>r.review.status==='accepted')) { p.source.row['Citation role']='corroboration'; p.source.row['Source note']+=' Consulted for the existing product recipe; no new numeric or affirmative gate fact accepted.'; } writeFileSync(path,JSON.stringify(p,null,2)+'\n'); }
for (const d of docs) {
 const limited=d.GradeIDs.split('; ').some(g=>['G086-01','G064-01','G087-03'].includes(g));
 const accepted=pins.some(p=>d.GradeIDs.split('; ').includes(p.gid)&&d.URL.includes(p.url));
 d.Status=limited?'Access/identity limited; no maker absence asserted':accepted?'Exact-product chamber/enclosure statement accepted; other automatic facts rejected':'Captured exact-product text searched; no usable chamber statement accepted';
}
writeFileSync(root+'/docs/audits/2026-09-28-gap-closing/C-DOCUMENTS.csv',csvText(Object.keys(docs[0]),docs));
