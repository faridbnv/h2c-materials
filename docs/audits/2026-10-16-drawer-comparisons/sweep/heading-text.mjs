// Print one comparison heading of a dumped drawer as plain text: node heading-text.mjs <file> <heading name>
import { readFileSync } from 'node:fs';
const [file, name] = process.argv.slice(2);
const html = readFileSync(file, 'utf8');
const at = html.indexOf(`<span class="maker-name">${name.replace(/&/g, '&amp;')}</span>`);
if (at < 0) { console.log('(no heading)'); process.exit(0); }
const start = html.lastIndexOf('<details', at);
// The heading ends where the records list begins.
const end = html.indexOf('<div class="imp-records">', at);
const part = html.slice(start, end)
  .replace(/<button type="button" class="imp-dot([^"]*)"[^>]*title="([^"]*)"[^>]*><\/button>/g, (m, c, t) => `[dot${c}: ${t}]`)
  .replace(/<span class="imp-scale">([\s\S]*?)<\/span><\/div>/g, (m, s) => ` ticks: ${[...s.matchAll(/>([^<]+)</g)].map((x) => x[1]).join(' ')}\n`)
  .replace(/<\/(p|tr|div|summary|h4)>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
console.log(part.trim());
