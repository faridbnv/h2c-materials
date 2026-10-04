// Print a cached document's text, page by page: node text.mjs <sha-prefix> [grep]   (prefix "summary" lists every document's line counts)
import { readdirSync, readFileSync } from 'node:fs';
const dir = `${process.env.H2C_DOCUMENT_CACHE}/text`;
const lines = (p) => (p.lines ?? []).map((l) => (typeof l === 'string' ? l : l.text ?? JSON.stringify(l)));
if (process.argv[2] === 'summary') {
  for (const pre of process.argv.slice(3)) {
    const f = readdirSync(dir).find((x) => x.startsWith(pre));
    const t = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    console.log(pre, t.extractor, t.pages.length, 'pages; lines per page:', t.pages.map((p) => p.lines.length).join(','), '; squeezed chars:', t.pages.map((p) => (p.squeezed ?? '').length).join(','));
  }
} else {
  const f = readdirSync(dir).find((x) => x.startsWith(process.argv[2]));
  const t = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
  const re = process.argv[3] ? new RegExp(process.argv[3], 'i') : null;
  for (const [i, p] of (t.pages ?? []).entries()) {
    console.log(`--- page ${p.page ?? i + 1} (${lines(p).length} lines)`);
    for (const s of lines(p)) if (!re || re.test(s)) console.log(s);
  }
}
