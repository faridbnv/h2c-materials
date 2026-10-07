// The cached text of a registered source, page by page: node page-text.mjs <SourceID> [regex] [max lines]. Reads nothing
// else; a blind reader uses it where no page image was rendered for the round.
import { readCsv } from '../../../../build/src/csv.js';
import { loadDocument } from '../../../../scripts/ingest/read-common.mjs';
const src = new Map(readCsv(new URL('../../../../data/tables/sources.csv', import.meta.url).pathname).records.map((r) => [r.values.SourceID, r.values]));
const [id, pattern, max] = process.argv.slice(2);
const s = src.get(id); const doc = await loadDocument({ sha: s.SHA256, sourceId: id });
const re = pattern ? new RegExp(pattern, 'i') : null;
let n = 0;
for (const [p, pg] of doc.pages) for (const l of pg.line) if (!re || re.test(l)) { if (n++ < Number(max ?? 40)) console.log(`p${p}: ${l.slice(0, 200)}`); }
