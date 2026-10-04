// Which readings the reader round has read twice (2026-10-04): record everything, verify what decides (GOALS working
// rule 2). A second, blind Sonnet read is asked only where a reading would decide something and nothing else bears it
// out: a new or contradicting print setting (nozzle, bed, chamber, enclosure, drying, hardened nozzle) or headline
// property, and a page statement that would change what its held rows mean. The page's own text pairing the label with
// the number (agreed-text) or the importer's reader reading the same thing (agreed-reader) stands for that read. A
// record-tier reading only an image shows is sampled one in ten; an unmapped one enters no table and is not read again.
//
//   node docs/audits/2026-10-04-reader-round/second-read-tasks.mjs <reconcile run dir> <round dir> [--chunk 150] [--prefix chunk]
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { readCsv, csvText } from '../../../build/src/csv.js';

const [run, round] = process.argv.slice(2);
const chunkSize = Number(process.argv[process.argv.indexOf('--chunk') + 1]) || 150;
const prefix = process.argv.includes('--prefix') ? process.argv[process.argv.indexOf('--prefix') + 1] : 'chunk';
const SETTINGS = new Set(['nozzle', 'bed', 'chamber', 'drying', 'enclosure', 'hardened_nozzle']);
const HEADLINE = /^(Tensile (yield |break )?strength|Tensile modulus|Elongation at break|Density|HDT|Glass transition temperature|Charpy|Izod)/;
const decides = (r) => (r.Kind === 'setting' ? SETTINGS.has(r.Field) : r.Kind === 'value' && HEADLINE.test(r.Field ?? ''));
const sampled = (r) => parseInt(createHash('sha256').update(r.RowID).digest('hex').slice(0, 8), 16) % 10 === 0;

const rows = ['new-settings.csv', 'new-values.csv', 'mismatches.csv', 'context.csv']
  .filter((f) => existsSync(join(run, f)))
  .flatMap((f) => readCsv(join(run, f)).records.map((r) => r.values))
  .filter((r) => r.SecondRead === 'pending');
const ask = rows.filter((r) => (r.Class === 'context' || r.Class === 'context-held' ? true : decides(r) ? ['new', 'mismatch'].includes(r.Class) : r.Presence === 'visual-only' && sampled(r)));

// One reader opens a page once: tasks are grouped by document, and a chunk ends at about chunkSize tasks.
const bySource = new Map();
for (const r of ask) (bySource.get(r.SourceID) ?? bySource.set(r.SourceID, []).get(r.SourceID)).push(r);
const chunks = [];
let current = [];
for (const [, list] of [...bySource].sort(([a], [b]) => a.localeCompare(b))) {
  if (current.length && current.length + list.length > chunkSize) { chunks.push(current); current = []; }
  current.push(...list);
}
if (current.length) chunks.push(current);

const out = join(round, 'second');
mkdirSync(join(out, 'out'), { recursive: true });
// Where on the page the item is (its column's direction, moisture state, treatment and test conditions) is given; what
// the page prints there is not.
const cols = ['task_id', 'source_id', 'page', 'kind', 'field', 'product', 'label', 'locator', 'direction', 'moisture', 'post_processing', 'test_conditions', 'images', 'text'];
chunks.forEach((list, i) => {
  const name = `${prefix}-${String(i + 1).padStart(2, '0')}`;
  const tasks = list.map((r) => ({
    task_id: r.RowID, source_id: r.SourceID, page: r.Page, kind: r.Kind, field: r.Field, product: r.Product, label: r.Label,
    locator: r.TableHeading ?? '', direction: r.Direction, moisture: r.Moisture, post_processing: r.PostProcessing, test_conditions: r.TestConditions, images: join(round, r.SourceID, `p-${r.Page}.png`), text: join(round, r.SourceID, 'text.txt'),
  }));
  writeFileSync(join(out, `${name}.csv`), csvText(cols, tasks));
});
const count = (xs, f) => xs.reduce((o, x) => ((o[f(x)] = (o[f(x)] ?? 0) + 1), o), {});
console.log(`${ask.length} of ${rows.length} pending readings asked again, in ${chunks.length} chunk(s) -> ${out}`);
console.log(count(ask, (r) => `${r.Class} ${decides(r) ? 'decides' : 'record'} ${r.Presence}`));
