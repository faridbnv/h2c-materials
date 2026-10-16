// The print temperatures heading of a dumped Printing tab as plain text, dots collapsed to a count per row.
import { readFileSync } from 'node:fs';
const html = readFileSync(process.argv[2], 'utf8');
const at = html.indexOf('<span class="maker-name">Print temperatures across products</span>');
if (at < 0) { console.log('(no heading)'); process.exit(0); }
const start = html.lastIndexOf('<details', at);
const end = html.indexOf('</section>', at);
console.log(html.slice(start, end)
  .replace(/(<button type="button" class="imp-dot[^>]*><\/button>\s*)+/g, (m) => ` (${(m.match(/<button/g) || []).length} dots) `)
  .replace(/<span class="imp-scale">([\s\S]*?)<\/span><\/div>/g, (m, s) => ` ticks: ${[...s.matchAll(/>([^<]+)</g)].map((x) => x[1]).join(' ')}\n`)
  .replace(/<span class="imp-limit"[^>]*><\/span>/g, '').replace(/<\/(p|tr|div|summary|h4)>/g, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim());
