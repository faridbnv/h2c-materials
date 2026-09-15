const ROOT = decodeURIComponent(new URL('../../../../../', import.meta.url).pathname);
import fs from 'node:fs'; import path from 'node:path';
const db = JSON.parse(fs.readFileSync((ROOT + 'dist/db.json'),'utf8'));
const keys = new Map();
const walk = (o, p, depth) => { if (depth>6||o==null||typeof o!=='object') return; if (Array.isArray(o)) { for (const x of o.slice(0,400)) walk(x,p+'[]',depth+1); return; }
  for (const [k,v] of Object.entries(o)) { const kp = /^(headline|properties|environmentCategories|conversions|screening|spreads|bracketScreening|facets)$/.test(p.split('.').pop())? p+'.*' : p+'.'+k;
    if (!/^[a-zA-Z_]\w*$/.test(k)) { walk(v,p+'.*',depth+1); continue; }
    if (!keys.has(k)) keys.set(k,new Set()); keys.get(k).add(p); walk(v, p+'.'+k, depth+1);} };
for (const k of ['materials','grades','measurements','profiles','evidence','prices','sources','coverage','registry']) walk(db[k], k, 0);
walk(db.meta,'meta',0);
const files=[]; const rd=(d)=>{for(const f of fs.readdirSync(d)){const p=path.join(d,f); if(fs.statSync(p).isDirectory()) rd(p); else if(/\.js$/.test(f)) files.push(p);}}; rd((ROOT + 'app/js'));
const src = files.map(f=>fs.readFileSync(f,'utf8')).join('\n');
const dead=[]; for (const [k,ps] of keys) { const re=new RegExp(`(\\.|\\b['"\`])${k}\\b|\\b${k}\\s*[,}:]`); if(!re.test(src)) dead.push(k+' <- '+[...ps].slice(0,2).join(', ')); }
console.log('DB keys never mentioned in app/js ('+dead.length+'):\n'+dead.join('\n'));
// fields read off headline / estimate / loadBracket objects
const acc = new Map(); for (const m of src.matchAll(/\b(h|est|estimate|b|bracket|loadBracket|headline|e|hl)\??\.(\w+)/g)) { const k=m[2]; if(!acc.has(k)) acc.set(k,new Set()); acc.get(k).add(m[1]); }
const absent=[...acc].filter(([k])=>!keys.has(k)).map(([k,v])=>k+' via '+[...v].join('/'));
console.log('\nAccessed on h/est/b/... but not a db key:\n'+absent.join('\n'));
