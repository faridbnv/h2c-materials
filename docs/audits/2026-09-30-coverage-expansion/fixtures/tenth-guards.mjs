// Disposable source/identity/packet guards. No root canonical writes or cache symlinks.
import{cpSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync,symlinkSync}from'node:fs';
import{tmpdir}from'node:os';import{join,extname}from'node:path';import{createHash}from'node:crypto';import{spawnSync}from'node:child_process';
import{openTables}from'../../../../scripts/data/table-io.mjs';import{locate}from'../../../../scripts/data/source-store.mjs';
const[root,out]=process.argv.slice(2),dir=mkdtempSync(join(tmpdir(),'h2c-tenth-guards-')),digest=b=>createHash('sha256').update(b).digest('hex'),results=[];
const rootBefore=digest(readFileSync(join(root,'data/manifest.json'))),audit='docs/audits/2026-09-30-coverage-expansion';
const specs=[['m269-application-five-maker-cached','application-five-maker-cached'],['m270-colorfabb-registered-guide-drying','tenth-cached-guide'],['m271-batch-c05-official-product-guidance','tenth-c05'],['m272-application-tenth-official','application-tenth-official']];
try{
 for(const p of ['scripts','schema','data','build/src','build/mappings','package.json',audit]){mkdirSync(join(dir,p,'..'),{recursive:true});cpSync(join(root,p),join(dir,p),{recursive:true});}
 for(const p of ['node_modules','build/node_modules'])symlinkSync(join(root,p),join(dir,p));
 const files=spawnSync('git',['ls-tree','-r','--name-only','HEAD','data'],{cwd:root,encoding:'utf8'});if(files.status)throw Error(files.stderr);
 for(const f of files.stdout.trim().split('\n')){const r=spawnSync('git',['show','HEAD:'+f],{cwd:root,maxBuffer:32*1024*1024});if(r.status!==0||r.error)throw Error('Cannot read committed baseline: '+f+' '+(r.error??r.stderr));writeFileSync(join(dir,f),r.stdout);}
 const seed=join(dir,'baseline-data');cpSync(join(dir,'data'),seed,{recursive:true});mkdirSync(join(dir,'.cache/sources/by-sha'),{recursive:true});
 const sourceMap=new Map();
 for(const[,name]of specs){const p=JSON.parse(readFileSync(join(dir,audit,name+'-packet.json')));const ss=[...(p.Findings??[]).flatMap(f=>(f.Sources??[]).map(s=>s.RegisteredSource)),...(p.Documents??[]).map(d=>d.Source),...(p.ExpectedSource?[p.ExpectedSource]:[])];for(const s of ss)sourceMap.set(s.SHA256,s);}
 mkdirSync(join(dir,'.cache/text'),{recursive:true});
 for(const s of sourceMap.values()){const p=locate(s.SHA256,s.SourceID);if(p.bytes!=='present'||digest(readFileSync(p.path))!==s.SHA256)throw Error('Original unavailable '+s.SourceID);cpSync(p.path,join(dir,'.cache/sources/by-sha',s.SHA256+extname(p.path)));const text=join(root,'.cache/text',s.SHA256+'.json');try{cpSync(text,join(dir,'.cache/text',s.SHA256+'.json'));}catch(e){if(e.code!=='ENOENT')throw e;}}
 const run=i=>spawnSync(process.execPath,[join(dir,'scripts/migrate',specs[i][0]+'.mjs')],{cwd:dir,encoding:'utf8'});
 const dataDigest=()=>digest(readFileSync(join(dir,'data/manifest.json')));
 const apply=i=>{const r=run(i);if(r.status)throw Error(specs[i][0]+': '+r.stderr);return JSON.parse(r.stdout);};
 const resetTo=i=>{rmSync(join(dir,'data'),{recursive:true,force:true});cpSync(seed,join(dir,'data'),{recursive:true});for(let n=0;n<i;n++)apply(n);};
 const refusal=(i,label)=>{const d=dataDigest(),r=run(i);if(r.status===0||dataDigest()!==d)throw Error(label+': refusal/atomicity failed');results.push({case:label,refused:true,noPartialWrites:true});};
 // Validate the real sequence and each immediate rerun. Earlier guards may intentionally stop after later supersession.
 resetTo(0);for(let i=0;i<specs.length;i++){const r=apply(i),d=dataDigest(),again=apply(i);if(dataDigest()!==d||again.written===true&&again.log.length||typeof again.written==='number'&&again.written!==0)throw Error('Non-idempotent '+specs[i][0]);results.push({case:specs[i][0]+' initial plus immediate zero rerun',admitted:r.records?.length??r.log?.length,noPartialWrites:true});}
 const gids=['G137-03','G142-01','G153-01','G104-01'];
 for(let i=0;i<specs.length;i++){
  resetTo(i);const t=openTables(dir),old=t.get('grades',gids[i]).Manufacturer;t.set('grades',gids[i],'Manufacturer','Deliberately changed expected maker',{expect:old});t.save();refusal(i,specs[i][0]+' changed expected identity');
  resetTo(i);const path=join(dir,audit,specs[i][1]+'-packet.json'),b=readFileSync(path);writeFileSync(path,Buffer.concat([b,Buffer.from(' ')]));refusal(i,specs[i][0]+' changed packet bytes');writeFileSync(path,b);
 }
 // Each new original and the reused guide must be independently hash-bound before admission.
 const guide=JSON.parse(readFileSync(join(dir,audit,'tenth-cached-guide-packet.json'))),c05=JSON.parse(readFileSync(join(dir,audit,'tenth-c05-packet.json')));
 for(const[i,s]of [[1,guide.ExpectedSource],...c05.Documents.map(d=>[2,d.Source])]){resetTo(i);const at=locate(s.SHA256,s.SourceID).path,target=join(dir,'.cache/sources/by-sha',s.SHA256+extname(at)),b=readFileSync(target);writeFileSync(target,'Changed original bytes');refusal(i,'Changed original '+s.SourceID);writeFileSync(target,b);}
 resetTo(2);apply(2);const t=openTables(dir),p=t.rows('profiles').find(p=>p.SourceID==='R-COVERAGE-20261001-941cb5b0f2b9');t.set('profiles',p.ProfileID,'Drying hours','6',{expect:'12'});t.save();refusal(2,'Previously admitted deciding guide schedule moved');
 if(digest(readFileSync(join(root,'data/manifest.json')))!==rootBefore)throw Error('Root data changed during fixture');
 writeFileSync(out,JSON.stringify({basis:'Committed ninth canonical baseline; disposable copies and independently copied verified originals; exact packet digests; no root mutations',cases:results.length,rootManifestUnchanged:true,results},null,2)+'\n');console.log(JSON.stringify({cases:results.length,pass:true}));
}finally{rmSync(dir,{recursive:true,force:true});}
