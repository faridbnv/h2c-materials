#!/usr/bin/env node
// GOALS steps 2 and 5, C6/C9: two chamber targets re-read on their original verified pages.
// Spectrum explicitly says its PP needs no heated chamber; a closed enclosure remains recommended.
// Siraya's ABS-CF Core states 60–80 °C if a heated chamber is used. It stays unresolved at 65 °C.
// Review: Codex AI agent, 2026-09-28. No test, direction or material-family assumption is added.
import { readFileSync } from 'node:fs';
import { openTables } from '../data/table-io.mjs';
import { locate } from '../data/source-store.mjs';
import { pageReader } from './printed-on.mjs';
import { sha256 } from '../lib/pdf-text.mjs';
const migration = 'm216-cached-gap-chamber-statements';
const t = openTables(), printed = pageReader(t, migration);
const edits = [
  { id: 'P0175', source: 'S-SPECTRUM-en-tds-spectrum-pp', grade: 'G082-03', page: 1,
    raw: 'material does not require a heated building chamber', state: 'not-required', min: 'Not applicable', max: 'Not applicable', requirement: 'none',
    review: 'm216: the source explicitly says this material does not require a heated building chamber. The prose is typed not-required/none; its separate closed-chamber recommendation is retained. No numeric setpoint is inferred.' },
  { id: 'P0892', source: 'D-SIRAYA-siraya-tech-fibreheart-abs-cf-core-tds', grade: 'G029-08', page: 1,
    raw: 'If your device has a heated chamber, maintain temperatures between 60-80°C to help release residual stress during printing and prevent warping and cracking.',
    state: 'range', min: '60', max: '80', requirement: 'recommended',
    review: 'm216: this 60-80°C window is conditional on using a heated chamber, beside an enclosure recommendation. It is typed recommended, preserving the full source sentence; the H2C reaches only part of the window.' },
];
let changed = 0;
for (const e of edits) {
  const s = t.get('sources', e.source), found = locate(s.SHA256, e.source);
  if (found.bytes !== 'present' || sha256(readFileSync(found.path)) !== s.SHA256 || !printed(e.source,e.page,e.raw)) throw new Error(`${migration}: evidence not verified for ${e.id}`);
  const p = t.get('profiles',e.id);
  if (p.GradeID !== e.grade || p.SourceID !== e.source) throw new Error(`${migration}: identity moved for ${e.id}`);
  const cells = { 'Chamber °C': e.raw, 'Chamber state': e.state, 'Chamber min °C': e.min, 'Chamber max °C': e.max, 'Chamber requirement': e.requirement };
  if (Object.entries(cells).every(([k,v])=>p[k]===v)) continue;
  if (p['Chamber °C'] !== 'Not published') throw new Error(`${migration}: ${e.id} chamber moved`);
  for (const [k,v] of Object.entries(cells)) t.set('profiles',e.id,k,v,{expect:p[k]});
  t.set('profiles',e.id,'Locator',`${p.Locator}; p. ${e.page}: chamber statement`,{expect:p.Locator});
  t.set('profiles',e.id,'Parse review',p['Parse review']==='Not applicable' ? e.review : `${p['Parse review']} ${e.review}`,{expect:p['Parse review']});
  if (!t.rows('know_how_reads').some((r)=>r.SourceID===e.source && r.Scope==='document')) t.append('know_how_reads',{SourceID:e.source,Scope:'document','Read on':'2026-09-28','Read by':`${migration}: Codex AI agent; whole source page re-read`});
  changed++;
}
if (changed) t.save();
console.log(`${migration}: ${changed} chamber statement(s) recorded`);
