import{cpSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync,symlinkSync}from'node:fs';
import{tmpdir}from'node:os';import{join}from'node:path';import{createHash}from'node:crypto';import{spawnSync}from'node:child_process';
const root=process.cwd(),fixture=mkdtempSync(join(tmpdir(),'h2c-eighth-guards-')),results=[];
try{
 for(const p of ['scripts','schema','data','build/src','package.json','docs/audits/2026-09-30-coverage-expansion']){mkdirSync(join(fixture,p,'..'),{recursive:true});cpSync(join(root,p),join(fixture,p),{recursive:true});}
 for(const p of ['node_modules','build/node_modules','.cache'])symlinkSync(join(root,p),join(fixture,p));
 const{openTables}=await import(join(fixture,'scripts/data/table-io.mjs'));
 const digest=()=>createHash('sha256').update(readFileSync(join(fixture,'data/manifest.json'))).digest('hex');
 const run=name=>spawnSync(process.execPath,[join(fixture,'scripts/migrate',name+'.mjs')],{cwd:fixture,encoding:'utf8'});
 for(const[name,table,id,field,bad]of[
  ['m262-sunlu-pcl-off-recipe-specimen','measurements','V010184','Normalized value','799'],
  ['m265-siraya-air-source-bounded-nozzle-gate','profiles','P0977','Hardened nozzle','TRUE'],
  ['m266-creatbot-published-water-absorption','measurements','V011543','Normalized value','2.5'],
  ['m267-waltek-full-text-custody-note','evidence','Q05428','Exposure / conditions','Fixture changed custody']
 ]){
  const before=digest(),r=run(name);if(r.status!==0||JSON.parse(r.stdout).written!==0||digest()!==before)throw Error(name+' rerun failed/wrote '+r.stderr);results.push({migration:name,case:'unchanged reapplication',written:0,contentUnchanged:true});
  const t=openTables(),old=t.get(table,id)[field];t.set(table,id,field,bad,{expect:old});t.save();const moved=digest(),refused=run(name);if(refused.status===0||digest()!==moved)throw Error(name+' changed-record guard failed '+refused.stderr);results.push({migration:name,case:'changed expected record',record:id,field,refused:true,contentUnchanged:true});
  const restore=openTables();restore.set(table,id,field,old,{expect:bad});restore.save();
 }
 const r=run('m263-batch-c04-sunlu-siraya-source-conditions');if(r.status===0||!r.stderr.includes('previously applied evidence moved'))throw Error('Historical custody correction must stop old packet');results.push({migration:'m263-batch-c04-sunlu-siraya-source-conditions',case:'later reviewed custody correction stops historical old packet',refused:true});
 writeFileSync(process.argv[2],JSON.stringify({fixture:'Disposable canonical copy; root files untouched',results},null,2)+'\n');console.log(JSON.stringify({guardCases:results.length}));
}finally{rmSync(fixture,{recursive:true,force:true});}
