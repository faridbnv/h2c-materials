// b44: every raw cell and note of every proposed profile must be words the cached page prints (whitespace-insensitive,
// full-width tilde and nbsp read as their ASCII spelling). Prints what is not found.
//   H2C_DOCUMENT_CACHE=<cache> node docs/audits/2026-10-05-gap-round-2/ingest/check-cells.mjs [b44]
import { readdirSync, readFileSync } from 'node:fs';
const dir = `docs/audits/2026-10-05-gap-round-2/ingest/proposals/${process.argv[2] ?? 'b44'}`;
const cache = process.env.H2C_DOCUMENT_CACHE;
const norm = (s) => String(s).replace(/[ \s]+/g, ' ').replace(/～/g, '~').replace(/[–—]/g, '-').replace(/[’‘]/g, "'").trim().toLowerCase();
let bad = 0, n = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const p = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
  const t = JSON.parse(readFileSync(`${cache}/text/${p.document.sha256}.json`, 'utf8'));
  const page = norm(t.pages.map((q) => q.lines.map((l) => l.text).join(' ')).join(' '));
  const squeezed = norm(t.pages.map((q) => q.squeezed ?? '').join(' '));
  // the squeezed text has its spaces removed (it joins a sentence the page's columns interleave)
  const has = (s) => page.includes(norm(s)) || squeezed.includes(norm(s).replace(/ /g, ''));
  for (const pr of p.profiles) {
    const r = pr.row;
    for (const col of ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Enclosure', 'Plate', 'Drying', 'Nozzle material', 'Nozzle diameter', 'Abrasion / clogging']) {
      if (r[col] === 'Not published') continue;
      n++;
      if (!has(r[col])) { bad++; console.log(f, p.grades[0].row.GradeID, 'CELL', col, '=', r[col]); }
    }
    for (const nt of pr.notes) {
      // notes may join two printed statements with "; "
      for (const part of nt.Text.split('; ')) { n++; if (!has(part.replace(/^[A-Za-z /]+: /, '')) && !has(part)) { bad++; console.log(f, p.grades[0].row.GradeID, 'NOTE', nt.Topic, '=', part); } }
    }
  }
}
console.log(`${n} checked, ${bad} not found`);
