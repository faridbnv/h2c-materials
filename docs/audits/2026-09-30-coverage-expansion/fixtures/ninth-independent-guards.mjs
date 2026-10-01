import {cpSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';
const [root,out]=process.argv.slice(2),fixture=mkdtempSync(join(tmpdir(),'h2c-ninth-independent-')),results=[];
const digest=b=>createHash('sha256').update(b).digest('hex');
const beforeRoot=digest(readFileSync(join(root,'data/manifest.json')));
try{
 for(const p of ['scripts','schema','data','build/src','package.json','docs/audits/2026-09-30-coverage-expansion']){mkdirSync(join(fixture,p,'..'),{recursive:true});cpSync(join(root,p),join(fixture,p),{recursive:true});}
 for(const p of ['node_modules','build/node_modules'])symlinkSync(join(root,p),join(fixture,p));
 const packetPath=join(fixture,'docs/audits/2026-09-30-coverage-expansion/ninth-source-corrections-packet.json'),packetBytes=readFileSync(packetPath),p=JSON.parse(packetBytes);
 mkdirSync(join(fixture,'.cache/sources/by-sha'),{recursive:true});
 for(const s of p.ExpectedSources)cpSync(join(root,'.cache/sources/by-sha',s.SHA256+'.pdf'),join(fixture,'.cache/sources/by-sha',s.SHA256+'.pdf'));
 const {openTables}=await import(join(fixture,'scripts/data/table-io.mjs'));
 const dataDigest=()=>{const t=openTables();return digest(JSON.stringify(t.rows('sources'))+JSON.stringify(t.rows('grades'))+JSON.stringify(t.rows('evidence'))+readFileSync(join(fixture,'data/manifest.json')));};
 const run=()=>spawnSync(process.execPath,[join(fixture,'scripts/migrate/m268-coc-text-and-graphene-source-publishers.mjs')],{cwd:fixture,encoding:'utf8'});
 function expectRefusal(label){const d=dataDigest(),r=run();if(r.status===0||dataDigest()!==d)throw Error(label+': refusal/atomicity failed '+r.stderr);results.push({case:label,refused:true,noPartialWrites:true,error:r.stderr.split('\n').find(x=>x.includes('Error:'))});}
 const d=dataDigest(),r=run();if(r.status!==0||JSON.parse(r.stdout).written!==0||dataDigest()!==d)throw Error('applied rerun failed');results.push({case:'Current fully applied packet reruns zero',written:0,noPartialWrites:true});
 function resetExpected(){const t=openTables();for(const [table,rows,key]of [['sources',p.ExpectedSources,'SourceID'],['grades',p.ExpectedGrades,'GradeID'],...p.Operations.map(o=>[o.Table,[o.Expected],{evidence:'EvidenceID',grades:'GradeID',sources:'SourceID'}[o.Table]])])for(const row of rows)for(const [field,value]of Object.entries(row)){const old=t.get(table,row[key])[field];if(old!==value)t.set(table,row[key],field,value,{expect:old});}t.save();}
 const mutations=[['evidence','Q04832','Finding','Changed deciding source quote'],['grades','G137-03','Composition / filler','Changed composition'],['sources','R-3DJAKE-EN-TDS-PETG-Graphene-Strong','Publisher','Changed publisher'],['grades','G137-01','Manufacturer','Changed unedited maker'],['sources','R-FABRU-PUREFIL-10802-Material-datasheet-COC-tough-purefil-EN','Title','Changed unedited title']];
 for(const phase of ['applied','unapplied'])for(const [table,id,field,bad]of mutations){if(phase==='unapplied')resetExpected();const t=openTables(),old=t.get(table,id)[field];t.set(table,id,field,bad,{expect:old});t.save();expectRefusal(phase+': changed '+id+'.'+field);const restore=openTables();restore.set(table,id,field,old,{expect:bad});restore.save();}
 resetExpected();for(const s of p.ExpectedSources){const at=join(fixture,'.cache/sources/by-sha',s.SHA256+'.pdf'),original=readFileSync(at);writeFileSync(at,Buffer.from('Corrupted private-copy original'));expectRefusal('unapplied: corrupted '+s.SourceID);writeFileSync(at,original);}
 const at=join(fixture,'.cache/sources/by-sha',p.ExpectedSources[0].SHA256+'.pdf'),original=readFileSync(at);rmSync(at);expectRefusal('unapplied: missing exact original');writeFileSync(at,original);
 writeFileSync(packetPath,Buffer.concat([packetBytes,Buffer.from(' ')]));expectRefusal('unapplied: changed packet bytes');writeFileSync(packetPath,packetBytes);
 const init=run();if(init.status!==0||JSON.parse(init.stdout).written!==9||JSON.parse(init.stdout).records.reduce((n,r)=>n+r.fields,0)!==11)throw Error('valid initial application wrong');results.push({case:'Valid unapplied copy applies exactly9records11fields',written:9,fields:11});const dd=dataDigest(),rerun=run();if(rerun.status!==0||JSON.parse(rerun.stdout).written!==0||dataDigest()!==dd)throw Error('postapplication rerun failed');results.push({case:'Valid reapplication zero with data digest unchanged',written:0,noPartialWrites:true});
 if(digest(readFileSync(join(root,'data/manifest.json')))!==beforeRoot)throw Error('Concurrent/root data changed during fixture');
 writeFileSync(out,JSON.stringify({fixture:'Independent disposable canonical copy with four separately copied originals; no root cache symlinks or canonical writes',packet_sha256:digest(packetBytes),cases:results.length,rootManifestUnchanged:true,results},null,2)+'\n');console.log(JSON.stringify({cases:results.length,pass:true}));
}finally{rmSync(fixture,{recursive:true,force:true});}
