#!/usr/bin/env node
// Candidate discovery for the frozen gap-closing campaign. Hash checks and page locators are evidence;
// a keyword hit is a lead, never an accepted decision value or a finding of publisher silence.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { csvText, readCsv } from '../../build/src/csv.js';
import { projectRoot, LEDGER } from '../ingest/context.mjs';
import { locate } from '../data/source-store.mjs';
import { cachedText, documentText } from '../lib/pdf-text.mjs';
const out = join(projectRoot, 'docs/audits/2026-09-28-gap-closing');
const read = (path) => readCsv(path).records.map((r) => r.values);
const targets = read(join(out, 'TARGETS.csv'));
const table = (name) => read(join(projectRoot, `data/tables/${name}.csv`));
const sources = new Map(table('sources').map((s) => [s.SourceID, s]));
const grades = new Map(table('grades').map((g) => [g.GradeID, g]));
const records = [...table('profiles'), ...table('measurements'), ...table('evidence')];
const docRows = [], candidates = [], held = [];
const used = new Map();
for (const t of targets) {
  const ids = new Set([grades.get(t.GradeID)?.SourceID, ...records.filter((r) => r.GradeID === t.GradeID).map((r) => r.SourceID)]);
  for (const s of sources.values()) if ((String(s['Applicable grades']).match(/\bG\d{3}-(?:R\d+|\d+)\b/g) ?? []).includes(t.GradeID)) ids.add(s.SourceID);
  for (const id of ids) if (sources.has(id)) {
    if (!used.has(id)) used.set(id, []);
    used.get(id).push(t);
  }
}
const matches = (requirement, text) => {
  if (/Chamber/.test(requirement)) return /chamber|enclosure|enclosed|ambient|heated.*room|build.*space|Kammer|enc(e|ei)inte/i.test(text);
  if (/Resists acid/.test(requirement)) return /acid|acide|säure|chemical resistance/i.test(text);
  if (/Stiffness/.test(requirement)) return /modulus|module|Young|[XYZ][ -]?[XYZ]|direction|orientation|condition|humid|moisture|anneal|temper/i.test(text);
  if (/Heat resistance/.test(requirement)) return /deflection|HDT|heat distortion|0[.,]45|1[.,]8.*MPa|anneal|temper/i.test(text);
  if (/Stretch/.test(requirement)) return /elongation|break|[XYZ][ -]?[XYZ]|orientation|condition|anneal/i.test(text);
  if (/Density/.test(requirement)) return /density|densité|dichte|specific gravity/i.test(text);
  return false;
};
for (const [id, ts] of [...used].sort(([a],[b]) => a.localeCompare(b))) {
  const s = sources.get(id), found = locate(s.SHA256, id);
  let text = found.bytes === 'present' ? cachedText(s.SHA256) : null;
  if (found.bytes === 'present' && !text && found.path.endsWith('.pdf')) text = await documentText(readFileSync(found.path), { sha: s.SHA256 });
  const doc = { SourceID: id, SHA256: s.SHA256, Bytes: found.bytes, Pages: text?.pages.length ?? 0, OCR: text?.ocr ? 'TRUE' : 'FALSE', GradeIDs: [...new Set(ts.map((t) => t.GradeID))].sort().join('; '), Targets: ts.length,
    Outcome: text ? 'hash-checked text inspected; candidates require source-specific review' : 'unreadable here; no absence asserted' };
  docRows.push(doc);
  if (!text) continue;
  const requirements = [...new Set(ts.map((t) => t.Requirement))];
  for (const p of text.pages) {
    const lines = p.lines.map((l) => typeof l === 'string' ? l : l.text);
    for (let i=0; i<lines.length; i++) {
      const reqs = requirements.filter((r) => matches(r, lines[i]));
      if (!reqs.length) continue;
      candidates.push({ SourceID: id, SHA256: s.SHA256, Page: p.page, Line: i+1, Requirements: reqs.join('; '), Text: lines.slice(Math.max(0,i-1), i+3).join(' | '), OCR: doc.OCR });
    }
  }
}
// Match held documents using the registered source link first. Name similarity remains an identity lead.
const canonical = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
for (const l of read(LEDGER).filter((l) => /held|deferred/.test(l.status))) {
  for (const t of targets) {
    const grade = grades.get(t.GradeID);
    const linked = l.registered_source_id && (grade.SourceID === l.registered_source_id || records.some((r) => r.GradeID === t.GradeID && r.SourceID === l.registered_source_id));
    const maker = canonical(l.manufacturer || l.brand), product = canonical(l.product_raw), gp = canonical(t.Product), gm = canonical(t.Manufacturer);
    const named = maker && gm && (maker.includes(gm) || gm.includes(maker) || canonical(l.brand) === gm) && gp.length>3 && (product.includes(gp) || gp.includes(product) && product.length>3);
    if (!linked && !named) continue;
    if (held.some((h) => h.doc_key === l.doc_key && h.GradeID === t.GradeID)) continue;
    const found = locate(l.sha256, l.registered_source_id || '');
    const text = found.bytes === 'present' ? cachedText(l.sha256) : null;
    held.push({ GradeID: t.GradeID, Product: t.Product, doc_key: l.doc_key, SHA256: l.sha256, Status: l.status, Match: linked ? 'registered source' : 'maker/product name lead; identity unconfirmed', Bytes: found.bytes, Note: l.status_note,
      Candidates: text?.pages.flatMap((p) => p.lines.map((l) => typeof l === 'string' ? l : l.text).filter((line) => targets.some((tt) => tt.GradeID === t.GradeID && matches(tt.Requirement,line))).map((line) => `p. ${p.page}: ${line}`)).join(' | ') || 'No candidate text (not proof of silence)' });
  }
}
mkdirSync(out, { recursive: true });
for (const [file, rows] of [['CACHED-DOCUMENTS.csv',docRows],['CACHED-CANDIDATES.csv',candidates],['HELD-MATCHES.csv',held]]) {
  writeFileSync(join(out,file), csvText(Object.keys(rows[0]??{}),rows));
}
console.log(`${docRows.length} source documents (${docRows.filter((d)=>d.Bytes==='present').length} verified); ${candidates.length} candidate lines; ${held.length} held/deferred product matches`);
