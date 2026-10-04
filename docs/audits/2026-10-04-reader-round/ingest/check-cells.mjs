// b41: every raw cell and note of every proposed profile must be words the cached page prints (whitespace-insensitive,
// full-width tilde and nbsp read as their ASCII spelling). Prints what is not found.
import { readdirSync, readFileSync } from 'node:fs';
const dir = 'docs/audits/2026-10-04-reader-round/ingest/proposals/b41';
const cache = process.env.H2C_DOCUMENT_CACHE;
const norm = (s) => String(s).replace(/[ \s]+/g, ' ').replace(/～/g, '~').replace(/[–—]/g, '-').trim().toLowerCase();
let bad = 0, n = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const p = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
  const t = JSON.parse(readFileSync(`${cache}/text/${p.document.sha256}.json`, 'utf8'));
  const page = norm(t.pages.map((q) => q.lines.map((l) => l.text).join(' ')).join(' '));
  const squeezed = norm(t.pages.map((q) => q.squeezed ?? '').join(' '));
  const has = (s) => page.includes(norm(s)) || squeezed.includes(norm(s));
  for (const pr of p.profiles) {
    const r = pr.row;
    for (const col of ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Enclosure', 'Plate', 'Drying', 'Nozzle material', 'Nozzle diameter', 'Abrasion / clogging']) {
      if (r[col] === 'Not published') continue;
      n++;
      if (!has(r[col])) { bad++; console.log(f, 'CELL', col, '=', r[col]); }
    }
    for (const nt of pr.notes) {
      // notes may join two printed statements with "; "
      for (const part of nt.Text.split('; ')) { n++; if (!has(part.replace(/^[A-Za-z /]+: /, '')) && !has(part)) { bad++; console.log(f, 'NOTE', nt.Topic, '=', part); } }
    }
  }
}
console.log(`${n} checked, ${bad} not found`);
