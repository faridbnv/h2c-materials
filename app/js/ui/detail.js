// Material detail drawer.
//
// Tabs are adaptive, not a fixed skeleton. A section with no data does not render blank and it
// does not render as zero: it renders the coverage record that explains the absence. With fracture
// toughness at zero records and compression and CTE at one each, a fixed skeleton would produce
// mostly empty pages. Showing the gap turns that into information.

import { renderValue, chip, esc, fmtNumber, dryingWords, fmtBounded, boundNote, fmtRange, estimateDisplay, wireEvidence, explainButton, scrollTable, markTableOverflow, keepInView, priceSampleWords } from './format.js';
import { renderWhy } from './explain.js';
import { materialName, describeConstraint, gateVerdict, CHAMBER_GUIDANCE, ESTIMATE_STRENGTH, ESTIMATE_PRECISION, screenRangeText, POLICY_LABELS, H2C_STATUS, h2cStatusLabel, h2cLimit } from './labels.js';
import { REGISTRY, propertiesInDomain, propertyApplies } from './registry.js';
import { evidenceSummary } from '../engine/coverage.js';
import { hardenedShare, hardenedWords } from '../engine/products.js';

/** A temperature window, or nothing if none was published. A zero floor is the build's "ambient". */
const range = (r) => (!r ? null
  : r.min === null && r.max === null ? 'open-ended windows only'
  : r.max === null ? `at least ${fmtNumber(r.min)} °C`
  : r.min === null ? `up to ${fmtNumber(r.max)} °C`
  : r.min === r.max ? `${fmtNumber(r.max)} °C`
  : r.min === 0 ? `up to ${fmtNumber(r.max)} °C`
  : `${fmtNumber(r.min)}–${fmtNumber(r.max)} °C`);

const stated = (v) => v && !/^(not published|not applicable|not stated|not recorded|n\/a)\b/i.test(String(v).trim());

const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/**
 * The record IDs behind something on the page, for anyone tracing it back to the tables: one small "ID" mark that opens
 * them. They used to stand in the sentences and the headings ("measurement V006484 · Polymaker FIBERON ASA CF08
 * (G033-11)"), which an engineer read as noise (D124). `parts` are [what, id] pairs; an empty one is left out.
 */
const ids = (...parts) => {
  const list = parts.filter(([, id]) => id && stated(id)).map(([what, id]) => `${what} ${id}`);
  return list.length ? ` ${explainButton('ID', `${list.join('. ')}.`, { cls: 'id-mark', head: list.length === 1 ? 'Record ID' : 'Record IDs', label: `Record ${list.length === 1 ? 'ID' : 'IDs'}: ${list.join(', ')}` })}` : '';
};
const tag = (id, what = 'Record') => ids([what, id]);

/**
 * A source by what a reader knows it as, its publisher and title, rather than its ID. The drawer headed sources
 * "B-abs-filament-TDS" and ended every measurement with that code, which named nothing a reader could look for.
 */
const sourceName = (s, id) => (s ? [s.publisher, s.title].filter(stated).join(', ') || id : id);

/**
 * The link to a source's original, labelled by what it opens. A raw 11 px URL had been the only way to it. A path on the
 * compiler's own disk is not something a reader can open, so it is said, not linked.
 */
function originalLink(s) {
  const url = s?.url ?? '';
  if (/^https?:\/\//i.test(url)) {
    const kind = /\.pdf($|[?#])/i.test(url) ? 'PDF' : 'web page';
    return `<a href="${esc(url)}" target="_blank" rel="noopener" title="${esc(url)} (opens in a new tab; needs an internet connection)">Open the original (${kind})</a>`;
  }
  return stated(url) ? '<span>original held as a local file</span>' : '';
}

/** What kind of document a source is, as an engineer would name it. */
const SOURCE_KIND = {
  'Manufacturer TDS': 'Data sheet', 'Manufacturer product page or guide': 'Maker\'s product page or guide', 'Manufacturer SDS': 'Safety data sheet',
  'Resin supplier data sheet': 'Resin supplier\'s data sheet', 'Retailer catalogue': 'Retailer listing', 'Printer documentation': 'Printer documentation',
  'Peer-reviewed study': 'Peer-reviewed study', 'Safety guidance': 'Safety guidance', 'Reference or register': 'Reference',
};
const sourceKind = (s) => SOURCE_KIND[s?.sourceClass] ?? s?.sourceClass ?? 'Source';

/** A grade by its product, with its maker where the product name does not already carry it. */
const gradeName = (g) => {
  if (!g) return '';
  const product = stated(g.product) ? g.product : '';
  const maker = stated(g.manufacturer) ? g.manufacturer : '';
  if (!product) return maker;
  return maker && !product.toLowerCase().startsWith(maker.toLowerCase()) ? `${maker} ${product}` : product;
};

// The Mechanical and Thermal tabs list the registry's properties in those domains (properties.csv),
// the same classification coverage uses. A property that applies only to some materials is listed
// only for them, so a PLA is never told it has "not measured" an elastomer's Shore hardness.
const tabProperties = (tab, m) => propertiesInDomain(tab === 'Mechanical' ? 'mechanical' : 'thermal').filter((p) => propertyApplies(p, m));

const COVERAGE_FOR_TAB = {
  Mechanical: ['Mechanical', 'Sparse properties'],
  Thermal: ['Thermal', 'Sparse properties'],
  Printing: ['Print setup', 'H2C status'],
  Environment: ['Moisture / environmental', 'Post-processing / application'],
  Grades: ['Grades'],
  Price: ['Canadian price'],
  Overview: ['Identity'],
};

/**
 * The tabs, by internal key and by the name on screen, in the order an engineer checks a material (the owner's ruling of
 * 2026-10-04): the answer, the products to buy, what was measured, how to print it, how it behaves, what it costs, and
 * last the documents every number was read from. Products had been sixth. The Coverage tab is the last section of
 * Sources now, its known gaps; its key still opens it there, so a link or a Data coverage cell lands where it did. The
 * keys stay: openMeasurement, links and saved scenarios use them.
 */
const TABS = [
  ['Overview', 'Overview'], ['Grades', 'Products'], ['Mechanical', 'Mechanical'], ['Thermal', 'Thermal'],
  ['Printing', 'Printing'], ['Environment', 'Environment'], ['Price', 'Price'], ['Evidence', 'Sources'],
];

/** The statuses a reader needs to see under Known gaps: what is missing, uncertain or contested. */
const GAP_STATUS = new Set(['Gap', 'Limited comparability', 'Conflict', 'Quarantined', 'Partially resolved', 'Reviewed with limitations']);

/** A material's products and its reference grades (an "-R1" study or resin grade), apart. */
const isProduct = (g) => !/-R\d+$/.test(g.id);

/**
 * One line under the tab strip, saying what the open tab holds. Products and Sources had read alike: a product is what
 * you buy, a source is a document its numbers were read from, and one document can cover several products.
 */
const TAB_HELP = {
  Overview: (n, c) => (c.tested
    ? 'Whether it meets your requirements, whether the H2C can print it, and its key properties.'
    : 'What it is, its key properties, and whether the H2C can print it.'),
  Grades: (n, c) => {
    if (!n) return 'No product is on file under this material.';
    const products = c.grades.filter(isProduct);
    const makers = new Set(products.map((g) => g.manufacturer).filter(stated)).size;
    const refs = n - products.length;
    return `${plural(products.length, 'product')} you can buy, from ${plural(makers, 'maker')}${refs ? `, and ${plural(refs, 'reference grade')}` : ''}. Each shows its result, how to print it, its values and what its maker says.`;
  },
  Mechanical: (n) => (n ? `${plural(n, 'published mechanical value')}, by property. Each names its product and the document it comes from.` : 'No mechanical value is on file for this material.'),
  Thermal: (n) => (n ? `${plural(n, 'published thermal value')}, by property. Each names its product and the document it comes from.` : 'No thermal value is on file for this material.'),
  Printing: (n, c) => (n ? `${plural(n, 'print profile')}, by maker: the settings each product's documents give.${c.guide ? ' The Bambu Lab Filament Guide comes first; a product uses it only where its own sheet is silent.' : ''}` : 'No print profile is on file for this material.'),
  Environment: (n, c) => (n ? `${plural(n, 'statement')} on chemicals, water, UV, fire and handling, by category. Makers rarely give the concentration, temperature or duration: treat them as indications, not design data.` : 'No statement on chemicals, water or other exposure is on file for this material.'),
  Price: (n) => (n ? `${plural(n, 'shop listing')}, sampled, not live. Canadian shops first; a foreign shop only where no Canadian one sells the product.` : 'No sampled shop listed this material.'),
  Evidence: (n) => (n ? `The ${plural(n, 'document')} this material's values were read from, by publisher, with links to the originals; then its known gaps. One document can cover several products.` : 'No document is on file for this material.'),
};

/**
 * What an empty tab says: that nothing is on file, the recorded reason where one exists, and the way to the known gaps.
 */
function nothingRecorded(records, { toGaps }) {
  return `<div class="gap empty-tab"><strong>Nothing on file for this material.</strong>
    ${records.length
      ? records.map((r) => `<div class="empty-why">${esc(r.domain)}, ${esc(r.status.toLowerCase())}: ${esc(r.finding)}</div>`).join('')
      : ''}
    ${toGaps ? '<button type="button" class="btn btn-sm" data-tab-link="Coverage">See its known gaps, in Sources</button>' : ''}</div>`;
}

// ------------------------------------------------------------------ measurements, grouped by source

/**
 * The conditions a measurement is taken under that a source usually states once for a whole sheet. Notes are kept apart:
 * nearly all of them are the record's history ("Added 2026-09-17 (m39): re-read from the source document"), which is for
 * an auditor, so they sit under a collapsed "Record notes" rather than among the test conditions (D124).
 */
const CONDITION_FIELDS = [
  ['Post-processing', 'postProcessing'], ['Test temperature', 'testTemperature'],
  ['Specimen print settings', 'printParameters'], ['Notes', 'notes'],
];
const READER_FIELDS = CONDITION_FIELDS.filter(([, f]) => f !== 'notes');

/** A record's notes, collapsed: the history of the record, one press away. */
const recordNotes = (text) => (stated(text) ? `<details class="record-notes"><summary>Record notes</summary><div>${esc(text)}</div></details>` : '');

/** Past this many characters a paragraph is shown to its first words, with the rest one press away. */
const LONG_TEXT = 140;

/**
 * A paragraph that may be long, collapsed to its first ~140 characters with an expander. Some print-parameter fields are
 * a data sheet's whole specimen table as recovered text; at full length under each measurement they buried the numbers.
 * A native details element, so the expander is a real control from the keyboard and the browser's find opens it.
 */
function longText(text) {
  const t = String(text ?? '');
  if (t.length <= LONG_TEXT + 30) return esc(t);
  const cut = t.slice(0, LONG_TEXT).replace(/\s+\S*$/, '');
  return `<details class="longtext"><summary><span class="lt-short">${esc(cut)}…</span> <span class="lt-toggle lt-more">Show all</span><span class="lt-toggle lt-less">Show less</span></summary>`
    + `<span class="lt-full">${esc(t)}</span></details>`;
}

/**
 * A property the sheet lists without a value. It is a record that the source names the property, not a measurement to
 * read, so it is one name on a line rather than an entry with its own conditions.
 */
const isNamedOnly = (x) => !x.numeric && !x.qualitative && /^not published$/i.test(String(x.dataStatus ?? '').trim());

/** A property name inside a sentence: "glass transition temperature", but "HDT" stays as it is. */
const inSentence = (name) => (/^[A-Z][a-z]/.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : name);

// Stored codes and vocabulary values, as an engineer would read them on the page (D124).
const DIRECTION_WORDS = {
  unknown: 'orientation not stated', 'horizontal-source-label': '"horizontal" (the sheet\'s word)',
  'vertical-xz-source-label': '"vertical XZ" (the sheet\'s word)', 'along-flow': 'along the melt flow', 'raster-45': '±45° raster',
};
const SPECIMEN_WORDS = { 'Raw material value': 'moulded bar (resin supplier\'s value)', 'Printed part': 'printed part', 'Printed specimen': 'printed specimen' };
const PROPERTY_WORDS = { 'Tensile strength (endpoint unspecified)': 'Tensile strength (yield or break not stated)' };
const propertyName = (p) => PROPERTY_WORDS[p] ?? p;
const STATUS_WORDS = { 'Unresolved unit / layout': 'held back: the sheet\'s unit or table layout is unclear' };

function measurementRow(x, c, { shared = new Map(), inSources = false, compact = false, manyProducts = true } = {}) {
  const cond = [
    x.direction && x.direction !== 'not-applicable' ? DIRECTION_WORDS[x.direction] ?? x.direction : null,
    x.specimenType?.startsWith('Not published') ? 'specimen not stated' : SPECIMEN_WORDS[x.specimenType] ?? x.specimenType,
    x.standardText && x.standardText !== 'Not applicable' ? x.standardText : null,
    x.moisture && x.moisture !== 'Not published' ? x.moisture : null,
    x.notch === 'Notched' || x.notch === 'Unnotched' ? x.notch.toLowerCase() : null,
  ].filter(Boolean).join(' · ');
  // The conditions that decide whether a number applies to your part: annealed or as printed, at what temperature,
  // printed how. A condition most measurements from this source share is said once, above them (sourceBlock); this one
  // says its own only where it differs, and says it states none where the others do.
  // Under a property heading the row leads with its product and keeps only the two short conditions.
  const more = (compact ? READER_FIELDS.slice(0, 2) : READER_FIELDS).flatMap(([k, f]) => {
    if (!shared.has(f)) return stated(x[f]) ? [[k, x[f]]] : [];
    if (!stated(x[f])) return [[k, 'not stated']];
    return String(x[f]).trim() === shared.get(f) ? [] : [[k, x[f]]];
  });
  const notes = shared.get('notes') && String(x.notes ?? '').trim() === shared.get('notes') ? '' : recordNotes(x.notes);
  // A qualitative result ("No break") is what the source said, so it is shown in its own words.
  const v = x.numeric
    ? `${fmtNumber(x.value)}${x.uncertainty ? ' ± ' + fmtNumber(x.uncertainty) : ''} ${esc(x.unit)}`
    : x.qualitative && x.raw?.value
      ? `${esc(x.raw.value)} <span class="missing">(stated in words)</span>`
      : `<span class="missing">${esc(STATUS_WORDS[x.dataStatus] ?? x.dataStatus)}</span>`;
  const op = x.operator === '>' || x.operator === '<' ? esc(x.operator) + ' ' : '';
  const s = c.sourceById.get(x.sourceId);
  const product = gradeName(c.gradeById.get(x.gradeId)) || 'product not named';
  // Where the value is on its document, and the way to the document: the source by its name, its page, and the record
  // IDs one press away. In Sources the document is the heading above, so the page (and the product, where the document
  // covers several) is enough.
  const foot = inSources
    ? [manyProducts ? esc(product) : null, x.locator ? esc(x.locator) : null].filter(Boolean).join(' · ')
    : `<button type="button" class="link-btn" data-open-source="${esc(x.sourceId)}" title="Opens this document in Sources">${esc(sourceName(s, x.sourceId))}</button>${x.locator ? `, ${esc(x.locator)}` : ''}`;
  return `<div class="evidence-row${c.highlight === x.id ? ' target' : ''}" data-mid="${esc(x.id)}">
    <div><strong>${compact ? esc(product) : esc(propertyName(x.property))}</strong> — ${op}${v}
      ${x.corrected ? '<span class="chip chip-neutral" style="font-size:10px">transcription corrected</span>' : ''}
      ${x.quarantined ? explainButton('held back', 'The source has a unit or layout problem here that is not resolved, so this value decides nothing.', { cls: 'chip chip-FAIL chip-small', head: 'Held back' }) : ''}
      ${x.implausible ? explainButton('physically implausible', 'The source publishes this number, but physics rules it out (Record notes say why). It decides nothing.', { cls: 'chip chip-FAIL chip-small', head: 'Physically implausible' }) : ''}</div>
    ${cond ? `<div class="cond">${esc(cond)}</div>` : ''}
    ${more.length ? `<dl class="kv small cond-more">${more.map(([k, t]) => `<dt>${esc(k)}</dt><dd>${longText(t)}</dd>`).join('')}</dl>` : ''}
    <div class="cond meas-foot">${foot}${ids(['Measurement', x.id], ['Product', x.gradeId], ['Source', x.sourceId])}</div>
    ${notes}
  </div>`;
}

/** Measurements in the order their sources first appear, each source's together. */
function groupBySource(list) {
  const groups = new Map();
  for (const x of list) {
    if (!groups.has(x.sourceId)) groups.set(x.sourceId, []);
    groups.get(x.sourceId).push(x);
  }
  return [...groups];
}

/** Items grouped by a key in first-appearance order, the group of `first` moved to the front. */
function groupBy(list, keyOf, first = null) {
  const groups = new Map();
  for (const x of list) {
    const k = keyOf(x) ?? 'Not recorded';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  }
  const out = [...groups];
  if (first != null && groups.has(first)) out.sort((a, b) => (a[0] === first ? -1 : b[0] === first ? 1 : 0));
  return out;
}

/**
 * Grades by maker, `first` first. PLA has 198 grades from sixty-odd makers, and a flat list of them was a page a reader
 * scrolled past; a maker is one collapsed line until opened.
 */
export function groupByMaker(grades, first = null) {
  return groupBy(grades, (g) => g.manufacturer, first);
}

/** The maker a material's panel opens on: the one whose product is most often its typical product (D83), else none. */
function leadMaker(m, c) {
  const count = new Map();
  for (const h of Object.values(m.headline ?? {})) {
    const maker = h?.typical && c.gradeById.get(h.typical.gradeId)?.manufacturer;
    if (maker) count.set(maker, (count.get(maker) ?? 0) + 1);
  }
  return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

/** A collapsed block per maker or property: the summary counts what is inside, the body shows once opened. */
function makerBlock(name, n, noun, body, { open = false, cls = 'maker-block' } = {}) {
  return `<details class="${cls}" data-search-group${open ? ' open' : ''}>
    <summary><span class="maker-name">${esc(name)}</span><span class="n" data-all="${esc(plural(n, noun))}">${esc(plural(n, noun))}</span></summary>
    <div class="maker-body">${body}</div>
  </details>`;
}

// The products, by ID, for the parts of the drawer that are drawn without its context (an estimate's evidence list).
let gradeLookup = new Map();
// Which product cards the reader opened or closed, by product, for the material on screen.
const gradeOpen = new Map();
let gradeOpenFor = null;

// The search box above a long tab. Its text is kept while the same material is open, because the drawer is rebuilt
// on every change of tab or shortlist, and a query that vanished on a tab change read as a broken box.
let drawerQuery = '';
let drawerQueryFor = null;
const searchBox = (what) => `<div class="drawer-search-row"><input type="search" class="drawer-search" data-search placeholder="Find ${esc(what)}…" aria-label="Find ${esc(what)}" value="${esc(drawerQuery)}"></div>`;

/** Hide what the query does not name, open the groups that still have something to show, and count what is left. */
function applySearch(host) {
  const q = drawerQuery.trim().toLowerCase();
  for (const item of host.querySelectorAll('[data-search-item]')) item.hidden = !!q && !item.dataset.searchItem.toLowerCase().includes(q);
  for (const group of host.querySelectorAll('[data-search-group]')) {
    const shown = [...group.querySelectorAll('[data-search-item]')].filter((i) => !i.hidden).length;
    group.hidden = !!q && shown === 0;
    if (q && shown) group.open = true;
    const n = group.querySelector('summary .n');
    if (n?.dataset.all) n.textContent = q ? `${shown} of ${n.dataset.all}` : n.dataset.all;
  }
}

/** One line per headline of what the model says of this grade (D81), only with estimates on. It decides nothing. */
function gradeEstimateLines(g, c) {
  if (!c.showEstimates || !g.estimate) return '';
  // Only where the product publishes no comparable value of its own: an estimate beside its own measurement said less
  // than the measurement and read as a second answer (a 10 % elongation estimated at "10–10 %").
  const lines = REGISTRY.headlines.filter((h) => g.estimate[h.key] && g.headline?.[h.key]?.level !== 'comparable').map((h) => {
    const e = g.estimate[h.key];
    return `<div class="grade-est"><b>${esc(h.labels.plain)}</b> <span class="est est-${esc(e.precision)}">~${fmtNumber(e.lo)}–${fmtNumber(e.hi)} ${esc(e.unit)}<span class="est-mark">†</span></span>
      <span class="fine">centre ${fmtNumber(e.centre)} · ${esc(e.precision)} precision · ${esc(ESTIMATE_STRENGTH[e.strength]?.short ?? e.strength)}</span></div>`;
  });
  return lines.length ? `<div class="grade-ests"><div class="shared-head">Estimated, where this product publishes no comparable value</div>${lines.join('')}</div>` : '';
}

/**
 * Every document a material's records cite, with what each gave: its measurements, print profiles, maker statements and
 * environment statements, and the products it covers. Sources had listed only the documents behind a measurement, so a
 * data sheet that gave a product's print settings or its maker's advice was named under that product and nowhere else.
 */
function documentsOf(c) {
  const docs = new Map();
  const doc = (sid) => {
    if (!stated(sid)) return null;
    if (!docs.has(sid)) docs.set(sid, { ms: [], profiles: 0, statements: 0, environment: 0, guide: false, grades: new Set() });
    return docs.get(sid);
  };
  for (const x of c.ms) { const d = doc(x.sourceId); if (d) { d.ms.push(x); if (stated(x.gradeId)) d.grades.add(x.gradeId); } }
  for (const p of c.profiles) for (const sid of [p.sourceId, p.h2cSourceId]) { const d = doc(sid); if (d) { d.profiles++; if (stated(p.gradeId)) d.grades.add(p.gradeId); } }
  const own = new Set(c.grades.map((g) => g.id));
  for (const k of c.db.knowHow ?? []) if (own.has(k.gradeId)) { const d = doc(k.sourceId); if (d) { d.statements++; d.grades.add(k.gradeId); } }
  for (const e of c.ev) { const d = doc(e.sourceId); if (d) { d.environment++; if (stated(e.gradeId)) d.grades.add(e.gradeId); } }
  if (c.guide) { const d = doc(c.guide.sourceId); if (d) d.guide = true; }
  return docs;
}

/**
 * One document: what it is and where to read it, which products it covers, what else it gave, then its values. A
 * condition most of its values state in the same words is said once, at the top: ABS repeated one 60-word
 * print-parameter paragraph under all 20 of its measurements. A value whose wording differs keeps its own, and one that
 * states none says so. A property the sheet names without a value goes on one line at the end.
 */
function sourceBlock(sid, d, c) {
  const s = c.sourceById.get(sid);
  const list = d.ms;
  const named = list.filter(isNamedOnly);
  const entries = list.filter((x) => !isNamedOnly(x));
  // The wording most of the block's measurements share, if more than half of them and at least two do. ABS's sheet
  // states its annealing for 19 of its 20 measurements: requiring all 20 would have repeated it 19 times.
  const common = (f) => {
    const n = new Map();
    for (const x of entries) if (stated(x[f])) n.set(String(x[f]).trim(), (n.get(String(x[f]).trim()) ?? 0) + 1);
    const [text, count] = [...n].sort((a, b) => b[1] - a[1])[0] ?? [];
    return count >= 2 && count > entries.length / 2 ? text : null;
  };
  const shared = new Map(CONDITION_FIELDS.map(([, f]) => [f, common(f)]).filter(([, t]) => t));
  const exceptions = entries.some((x) => [...shared].some(([f, t]) => f !== 'notes' && String(x[f] ?? '').trim() !== t));
  const covers = [...d.grades].map((id) => gradeName(c.gradeById.get(id)) || id);
  const about = [s?.sourceNote, s?.accessNote].filter(stated).join(' ');
  const gave = [d.ms.length ? plural(entries.length, 'value') : null, d.profiles ? `print settings (${plural(d.profiles, 'profile')})` : null,
    d.statements ? plural(d.statements, 'maker statement') : null, d.environment ? plural(d.environment, 'environment statement') : null,
    d.guide ? 'the Bambu Lab Filament Guide entry for this material, in Printing' : null].filter(Boolean);
  const sharedFields = READER_FIELDS.filter(([, f]) => shared.has(f));
  const sharedHtml = sharedFields.length
    ? `<div class="shared-conds"><div class="shared-head">Applies to every value below${exceptions ? ' unless one says otherwise' : ''}</div>
        <dl class="kv small cond-more">${sharedFields.map(([k, f]) => `<dt>${esc(k)}</dt><dd>${longText(shared.get(f))}</dd>`).join('')}</dl></div>`
    : '';
  const namedHtml = named.length
    ? `<div class="np-line">Also on this sheet, without a value: ${named.map((x) => `<span class="np-item${c.highlight === x.id ? ' target' : ''}" data-mid="${esc(x.id)}">${esc(inSentence(x.property))}${x.direction && !['not-applicable', 'unknown'].includes(x.direction) ? ` (${esc(x.direction)})` : ''}</span>`).join(', ')}.</div>`
    : '';
  return `<section class="src-block${c.highlightSource === sid ? ' target' : ''}" data-source-block="${esc(sid)}">
    <h3 class="src-title" tabindex="-1">${esc(sourceName(s, sid))}${ids(['Source', sid])}</h3>
    <div class="src-meta">${[esc(sourceKind(s)), stated(s?.accessDate) ? `read ${esc(s.accessDate)}` : null, originalLink(s) || null].filter(Boolean).join(' · ')}</div>
    ${covers.length ? `<div class="src-covers"><b>Covers:</b> ${covers.map(esc).join(', ')}</div>` : ''}
    ${gave.length ? `<div class="src-covers"><b>Gave:</b> ${esc(gave.join(', '))}</div>` : ''}
    ${sharedHtml}
    ${entries.map((x) => measurementRow(x, c, { shared, inSources: true, manyProducts: d.grades.size > 1 })).join('')}
    ${namedHtml}
    ${recordNotes([about, shared.get('notes')].filter(Boolean).join(' '))}
  </section>`;
}

// ------------------------------------------------------------------ family guidance behind a pointer

/** An evidence record's ID as the tables write it. */
const EVIDENCE_POINTER = /\bQ\d{5}\b/g;

/**
 * Prose fields that point at evidence records instead of saying something. For 47 materials the Best uses cell reads
 * "Family context in Q00282, Q00283, …": IDs of family-level records filed under the family's own material. Shown as
 * written, the drawer printed database plumbing under "Good for". The pointers are resolved here, and the data is left
 * as it is: a record whose topic is Best uses is the "Good for" text, the others are the family's guidance, each named
 * with the material it belongs to and its source, and a pointer that resolves to nothing is listed rather than dropped.
 */
export function resolvePointers(text, evidenceById) {
  const ids = [...new Set(String(text ?? '').match(EVIDENCE_POINTER) ?? [])];
  if (!ids.length) return null;
  const records = ids.map((id) => evidenceById.get(id)).filter(Boolean);
  const unresolved = ids.filter((id) => !evidenceById.has(id));
  // Whatever the cell says besides its pointers, if anything.
  const prose = String(text).replace(/family context in/i, '').replace(EVIDENCE_POINTER, '').replace(/^[\s,;.:]+|[\s,;:]+$/g, '').replace(/(\s*,\s*)+/g, ', ').trim();
  return { records, unresolved, prose: /[a-z]{3}/i.test(prose) ? prose : '' };
}

function familyGuidance(m, c) {
  const fields = [resolvePointers(m.bestUses, c.evidenceById), resolvePointers(m.limitations, c.evidenceById)];
  const records = [...new Map(fields.flatMap((f) => f?.records ?? []).map((r) => [r.id, r])).values()];
  const unresolved = [...new Set(fields.flatMap((f) => f?.unresolved ?? []))];
  const owner = (r) => c.materialById.get(r.materialId)?.name ?? r.materialId;
  const scope = (name) => (name === m.name ? 'for the family in general, not one product' : `for ${name} in general, not ${m.name} or its products`);
  // The record's ID is kept in the title only: the Overview is for reading, and the record is listed, with its ID, in
  // the Environment tab of the material it belongs to.
  const cite = (r) => `<span class="fine-src" title="Evidence record ${esc(r.id)}">Source: ${esc(sourceName(c.sourceById.get(r.sourceId), r.sourceId))}</span>`;
  return {
    bestUses: fields[0],
    limitations: fields[1],
    goodFor: records.filter((r) => /^best uses$/i.test(r.topic)),
    guidance: records.filter((r) => !/^best uses$/i.test(r.topic)),
    unresolved, owner, scope, cite,
  };
}

function usesSection(m, c) {
  const g = familyGuidance(m, c);
  const out = [];
  if (g.bestUses) {
    // Typical applications, from the family's own Best uses record, said to be the family's.
    const text = [g.bestUses.prose, ...g.goodFor.map((r) => r.finding)].filter(Boolean);
    if (text.length) {
      out.push(`<h3 class="sec">Typical applications</h3><p>${text.map(esc).join(' ')}</p>`
        + g.goodFor.map((r) => `<p class="fine">${g.cite(r)} (about ${esc(g.owner(r))} in general).</p>`).join(''));
    }
  } else if (stated(m.bestUses)) {
    out.push(`<h3 class="sec">Typical applications</h3><p>${esc(m.bestUses)}</p>`);
  }
  // What is true of this material. The caveat that is true of every material (method.csv, Transferable allowables) is
  // said once, at the foot of the Overview, not under each material's own limitations (D124).
  const own = g.limitations ? g.limitations.prose : stated(m.limitations) ? m.limitations : '';
  if (own) out.push(`<h3 class="sec">Limitations</h3><p>${esc(own)}</p>`);
  if (g.guidance.length || g.unresolved.length) {
    const owners = [...new Set(g.guidance.map(g.owner))];
    out.push(owners.map((name) => `<h3 class="sec">General guidance for ${esc(name)}</h3>
        <p class="fine family-scope">From printing guides ${esc(g.scope(name))}.</p>
        <ul class="family-guidance">${g.guidance.filter((r) => g.owner(r) === name).map((r) => `<li><b>${esc(r.topic)}:</b> ${esc(r.finding)}
          <span class="fine-line">${g.cite(r)}</span></li>`).join('')}</ul>`).join('')
      + (g.unresolved.length ? `<p class="fine unresolved">Also referred to, but not in this database: ${g.unresolved.map(esc).join(', ')}.</p>` : ''));
  }
  return out.join('');
}

// ------------------------------------------------------------------ polymer-level behaviour

/** A polymer-level verdict in words: "not resistant", "soluble". */
const verdictWords = (v) => String(v ?? '').replace(/-/g, ' ');

/**
 * The base polymer's published behaviour, one section per category, where the material has no record of its own
 * (D64). Each says on the page, not in a tooltip (D61), that it is the neat resin's behaviour and not a test of this
 * grade, that it never passes, and whether it can screen; then every agent row with its verdict, finding and source.
 */
function polymerSection(poly, c) {
  if (!poly.length) return '';
  const screens = poly.filter((p) => p.screens);
  const P = esc(poly[0].polymerId);
  return `<h3 class="sec">Reference data for ${P} resin (not these products)</h3>
    <div class="note">No document tests this material${poly.length === 1 ? ' in this category' : ` in these ${poly.length} categories`}, so a resin
      producer's or handbook data for plain ${P} is shown. Fillers, pigments and printing change it, so it never passes a
      requirement. ${screens.length
        ? `Where it reports ${P} attacked or dissolved (${esc(screens.map((p) => p.categoryLabel.toLowerCase()).join(', '))}), it excludes this
      material with "Let estimates rule out materials" on; the SCREENED chip brings it back.`
        : 'None of it can exclude this material.'}</div>`
    + poly.map((p) => `
      <h4 class="block-title">${esc(p.categoryLabel)}: ${esc(verdictWords(p.verdict))} <span class="chip chip-neutral chip-small">resin data</span>${ids(['Inferred record', p.id])}</h4>
      ${p.agents.map((a) => `<div class="evidence-row env-row" data-polymer-row="${esc(a.id)}">
        <div><strong>${esc(a.agent)}</strong> · ${esc(verdictWords(a.verdict))}${a.screens ? ' · can exclude' : ''}</div>
        <div>${esc(a.finding)}</div>
        ${a.conditions ? `<div class="cond">${esc(a.conditions)}</div>` : ''}
        ${a.notes ? `<div class="cond">${esc(a.notes)}</div>` : ''}
        <div class="cond meas-foot">${esc(sourceName(c.sourceById.get(a.sourceId), a.sourceId))}${a.locator ? `, ${esc(a.locator)}` : ''}${ids(['Resin data row', a.id], ['Source', a.sourceId])}</div>
      </div>`).join('')}`).join('');
}

// ------------------------------------------------------------------ estimates

/** Not applicable is a statement about the property rather than an estimate, so it shows whatever the mode. */
function notApplicableCard(h, label) {
  return h && !h.known && h.notApplicable
    ? `<div class="est-card na-card"><h4>${esc(label)}: not applicable</h4><div class="est-basis">${esc(h.notApplicable.reason)}</div></div>`
    : '';
}

/**
 * One estimate, as a line that expands to its full record: both ranges, what it rests on, what it may screen, and every
 * measurement behind it, converted. Six lines of prose each, repeated for every missing headline, had pushed "Can the H2C
 * print it?" off the screen; the sentences every estimate shares are said once, under the group (estimateGroup).
 */
function estimateCard(h, label, key) {
  const e = h && !h.known && h.estimate;
  if (!e) return '';
  const s = ESTIMATE_STRENGTH[e.strength];
  // The card prints the unit beside its numbers, so an elastomer's stiffness reads in MPa, and says what the table's
  // column shows when that unit is not the card's. Converted evidence is a single number, in the card's unit.
  const d = estimateDisplay(e, { ownUnit: true });
  const pct = (p) => `${Math.round(p * 100)}%`;
  const measurements = e.evidence.reduce((n, ev) => n + ev.items.length, 0);
  // What it rests on, in a few words: how many of the material's own measurements, or the family model alone.
  const basis = measurements && e.strength !== 'family' ? `from ${measurements === 1 ? 'one' : measurements} of its own measurements` : s.short;
  const item = (i) => `${esc(i.property)} ${fmtNumber(i.value)} ${esc(i.unit)}${i.direction && !['not-applicable', 'unknown'].includes(i.direction) ? ` (${esc(i.direction)})` : ''}`
    + `${i.from ? `, ${esc(i.from)}` : ''}${i.measurementId ? ids(['Measurement', i.measurementId]) : ''}`;
  const evidence = e.evidence.length
    ? `<ul class="est-evidence">${e.evidence.map((ev) => `<li>${ev.items.map(item).join('; ')}
        ${ev.sameGrade ? '<span class="tag">same product</span>' : `<span class="tag">${esc(gradeName(gradeLookup.get(ev.gradeId)) || 'another product')}</span>`}
        → about ${d.num(ev.converted)} ${esc(d.unit)} for this property. <span class="fine">${esc(ev.conversion)}.</span>
        ${ev.conflict ? '<b>Disagrees with the rest and is down-weighted.</b>' : ''}</li>`).join('')}</ul>`
    : '';
  const bounds = e.bounds?.length ? ` Limited by ${e.bounds.map((b) => esc(b.why)).join('; ')}.` : '';
  const screen = e.canScreen
    ? ` It can exclude this material from ${esc(screenRangeText(e, d.num, d.unit))}.`
    : ' It excludes nothing.';
  return `<details class="est-card" data-estimate="${esc(key)}">
    <summary><span class="est-sum"><b>${esc(label)}</b> <span class="est est-${esc(e.precision)}">~${d.lo}–${d.hi} ${esc(d.unit)}<span class="est-mark">†</span></span>
      · ${esc(e.precision)} precision · ${esc(basis)}</span><span class="est-sum-toggle" aria-hidden="true"></span></summary>
    <div class="est-span">${d.lo} – ${d.hi} ${esc(d.unit)} <span class="fine">likely (${pct(e.levels.likely)}), centre ${d.centre}${d.inColumn ? `; ${d.inColumn[0]}–${d.inColumn[1]} ${esc(d.columnUnit)} in the table` : ''}</span></div>
    <div class="est-basis">Plausible range ${d.plausible[0]} – ${d.plausible[1]} ${esc(d.unit)} (${pct(e.levels.plausible)}). Precision: <b>${esc(e.precision)}</b>, ${esc(ESTIMATE_PRECISION[e.precision])}.
      ${esc(s.title)}${e.strength !== 'family' ? `. This material's own data carries about ${pct(e.ownShare)} of it` : ''}. Model family: ${esc(e.family)}.${bounds}
      ${e.sharedWith ? `Its product is also filed under ${esc(e.sharedWith.name)}, so both show this estimate.` : ''}
      ${screen} ${e.screenLimit ? esc(`${e.screenLimit.charAt(0).toUpperCase()}${e.screenLimit.slice(1)}`) : ''}</div>
    ${evidence}
  </details>`;
}

/** The estimates of a material's missing headlines, with what they all share said once. Shown only with estimates on. */
function estimateGroup(m, HEAD, showEstimates) {
  const na = HEAD.map(([label, k]) => notApplicableCard(m.headline[k], label)).join('');
  const cards = showEstimates ? HEAD.map(([label, k]) => estimateCard(m.headline[k], label, k)).filter(Boolean) : [];
  if (!cards.length) return na;
  const levels = HEAD.map(([, k]) => m.headline[k]?.estimate?.levels).find(Boolean) ?? { likely: 0.8, plausible: 0.95 };
  const pct = (p) => `${Math.round(p * 100)}%`;
  const anyScreen = HEAD.some(([, k]) => { const h = m.headline[k]; return h && !h.known && h.estimate?.canScreen; });
  return `${na}<h3 class="sec">Estimated, not measured</h3>
    <div class="est-cards">${cards.join('')}</div>
    <p class="fine est-group-note">Estimates fill gaps from related data and similar materials; tested on known values, a likely
      range held ${pct(levels.likely)} of the time and a plausible range ${pct(levels.plausible)}. An estimate never makes a material
      pass.${anyScreen ? ` With ${esc(POLICY_LABELS.exploration)} and "Let estimates rule out materials" on, it can exclude this material from a requirement its whole range misses, unless one of the material's own measurements could meet it.` : ''}</p>`;
}

/** Said under a Key number whose estimate reads in a smaller unit than its table column: "in MPa, where the table's column is in GPa". */
const unitNote = (e) => {
  const d = estimateDisplay(e, { ownUnit: true });
  return d.rescaled ? `; in ${esc(d.unit)} (the table uses ${esc(d.columnUnit)})` : '';
};

/** An estimated nozzle or bed window, where nothing is published. It decides nothing, and shows only with estimates. */
function windowEstimate(est, what, showEstimates) {
  if (!est || !showEstimates) return '';
  return `<div class="est-card"><h4>${esc(what)}: estimated, not published</h4>
    <div class="est-span">${fmtRange(est.lo, est.hi, ' – ')} ${esc(est.unit)}</div>
    <div class="est-basis">No source publishes this window. Estimated as the ${esc(est.basis)} (${est.peers.map((p) => `${esc(p.name)} ${fmtNumber(p.min)}–${fmtNumber(p.max)}`).join(', ')}).
      A starting point to verify; it changes no result.</div></div>`;
}

/**
 * What the print profiles record about feeding through an AMS, in their own words. It used to be a verdict chip that
 * read "Not established" for every material, styled like the checks above it that are evaluated; these fields are
 * recorded text, not a verdict, so they are quoted and nothing is inferred from them.
 */
function amsSummary(profiles) {
  if (!profiles.length) return 'No print profile is on file.';
  // Each distinct wording once, with how many profiles carry it when they disagree.
  const wordings = (key) => {
    const by = new Map();
    for (const p of profiles) {
      const t = String(p.routing?.[key] ?? '').trim();
      if (stated(t)) by.set(t, (by.get(t) ?? 0) + 1);
    }
    return by;
  };
  const quote = (by) => [...by].map(([t, n]) => `"${t}"${n < profiles.length ? ` (${n} of ${profiles.length} profiles)` : ''}`).join('; ');
  const published = wordings('amsPublished');
  const pro = wordings('ams2Pro');
  const ht = wordings('amsHT');
  const parts = [published.size ? `Makers state: ${quote(published)}.` : 'No maker states AMS compatibility.'];
  if (pro.size && quote(pro) === quote(ht)) parts.push(`Bambu's notes for AMS 2 Pro and AMS HT: ${quote(pro)}.`);
  else {
    if (pro.size) parts.push(`Bambu's note for AMS 2 Pro: ${quote(pro)}.`);
    if (ht.size) parts.push(`Bambu's note for AMS HT: ${quote(ht)}.`);
  }
  return parts.join(' ');
}

/** A family entry has no product and no values: the drawer says what it is, why it has no tabs, and links its members. */
function renderFamilyEntry(host, m, actions) {
  const f = m.familyEntry;
  host.innerHTML = `
  <div class="drawer" role="dialog" aria-label="${esc(m.name)}">
    <div class="drawer-head">
      <div style="display:flex;align-items:start;gap:10px">
        <div style="flex:1">
          <h2>${esc(m.name)}</h2>
          <div class="sub">${esc(m.fullName ?? '')}</div>
          <div class="sub" style="margin-top:5px">${f.kind === 'alias' ? 'Another name' : 'A group name, not a material'} · ${esc(h2cStatusLabel(m.h2cStatus))}</div>
        </div>
        <button class="icon-btn" id="drawer-close" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="drawer-body">
      <p class="lede">${f.kind === 'alias'
        ? `${esc(m.name)} is another name for the material below. Its products and values are filed there.`
        : `${esc(m.name)} names a group of materials, not one material. It is never a candidate: each product is filed under the material it is.`}</p>
      <p class="fine family-no-tabs">Open ${f.members.length === 1 ? 'it' : 'one'} below for its products, values and print settings.</p>
      <h3 class="sec">${f.kind === 'alias' ? 'The material' : `${plural(f.members.length, 'member')}`}</h3>
      <div class="facts-list">${f.members.map((x) => `<div class="fact"><button class="btn btn-sm" data-open-member="${esc(x.id)}">${esc(x.name)}</button></div>`).join('')}</div>
      <p class="fine">${esc(f.why)}</p>
    </div>
  </div>`;
  host.querySelector('#drawer-close').addEventListener('click', actions.closeDrawer);
  host.querySelectorAll('[data-open-member]').forEach((b) => b.addEventListener('click', () => actions.openMaterial(b.dataset.openMember)));
}

export function renderDrawer(host, state, actions) {
  const { db, selectedMaterialId, drawerTab, selection, ctx } = state;
  const m = db.materials.find((x) => x.id === selectedMaterialId);
  if (!m) { host.innerHTML = ''; return; }
  if (m.familyEntry) return renderFamilyEntry(host, m, actions);
  if (drawerQueryFor !== m.id) { drawerQuery = ''; drawerQueryFor = m.id; }
  if (gradeOpenFor !== m.id) { gradeOpen.clear(); gradeOpenFor = m.id; }

  const ms = ctx.measurementsByMaterial.get(m.id) ?? [];
  const ev = ctx.evidenceByMaterial.get(m.id) ?? [];
  // The base polymer's published behaviour, attached by the build where the material has no record of its own (D64).
  const poly = ctx.polymerEvidenceByMaterial?.get(m.id) ?? [];
  // A superseded coverage row is an audit trail; the later row that replaces it is shown.
  const cov = (ctx.coverageByMaterial.get(m.id) ?? []).filter((r) => r.status !== 'Superseded');
  const profiles = db.profiles.filter((p) => p.materialId === m.id && !p.retired);
  const grades = db.grades.filter((g) => g.materialId === m.id && !g.retired);
  const prices = db.prices.filter((p) => p.materialId === m.id && !p.retired);
  const evaluation = selection.evaluations.find((e) => e.materialId === m.id);
  const summary = evidenceSummary(m, db);

  const guide = (db.printGuide ?? []).find((x) => x.materials.some((y) => y.materialId === m.id)) ?? null;
  const c = {
    m, ms, ev, poly, cov, profiles, grades, prices, evaluation, summary, db, guide,
    tested: !!evaluation?.results.length,
    highlight: state.highlightMeasurement, highlightSource: state.highlightSource,
    showEstimates: !!ctx.showEstimates, policy: state.scenario.unknownPolicy,
    sourceById: ctx.sourceById ?? new Map(db.sources.map((s) => [s.id, s])),
    evidenceById: ctx.evidenceById ?? new Map(db.evidence.map((e) => [e.id, e])),
    materialById: new Map(db.materials.map((x) => [x.id, x])),
    gradeById: new Map(db.grades.map((g) => [g.id, g])),
    chosen: new Set((state.scenario.decisions ?? []).map((d) => d.gradeId)),
  };
  gradeLookup = c.gradeById;
  c.documents = documentsOf(c);

  const counts = {
    Overview: null,
    Grades: grades.length,
    Mechanical: ms.filter((x) => tabProperties('Mechanical', m).includes(x.property)).length,
    Thermal: ms.filter((x) => tabProperties('Thermal', m).includes(x.property)).length,
    Printing: profiles.length,
    // What the tab lists. It used to count only the records in categories the filters use, so ABS read 8 over a tab
    // of 13 records and BVOH read 0 over one; the tab itself now says how many of them the filters can use. A
    // polymer-level record is listed there too, under its own heading, and is counted.
    Environment: ev.length + poly.length,
    Price: prices.length,
    // Documents, not measurements: Mechanical and Thermal count those.
    Evidence: c.documents.size,
  };
  c.counts = counts;
  // The Coverage tab is Sources' Known gaps now: a request for it (a Data coverage cell, an empty tab's link, an older
  // link) opens Sources there.
  const toGaps = drawerTab === 'Coverage';
  const asked = toGaps ? 'Evidence' : drawerTab;
  const tab = asked in counts ? asked : 'Overview';
  const pinned = state.scenario.shortlist.includes(m.id);
  const products = grades.filter(isProduct);
  const makers = new Set(products.map((g) => g.manufacturer).filter(stated)).size;
  const filler = { 'carbon-fibre': 'carbon-fibre filled', 'glass-fibre': 'glass-fibre filled', esd: 'anti-static (ESD)', foaming: 'foaming', unfilled: 'unfilled' }[m.facets?.reinforcement?.value];
  const identity = [m.basePolymer && m.basePolymer !== m.name ? m.basePolymer : m.family, filler,
    products.length ? `${plural(products.length, 'product')} from ${plural(makers, 'maker')}` : 'no product on file'].filter(Boolean);

  host.innerHTML = `
  <div class="drawer" role="dialog" aria-label="${esc(m.name)} detail">
    <div class="drawer-head">
      <div style="display:flex;align-items:start;gap:10px">
        <div style="flex:1">
          <h2>${esc(materialName(m.name).primary)}</h2>
          ${materialName(m.name).aka ? `<div class="sub">also called ${esc(materialName(m.name).aka)}</div>` : ''}
          ${stated(m.fullName) && m.fullName !== m.name ? `<div class="sub">${esc(m.fullName)}</div>` : ''}
          <div class="sub" style="margin-top:5px">
            ${esc(identity.join(' · '))}
            ${explainButton(esc(h2cStatusLabel(m.h2cStatus)), H2C_STATUS[m.h2cStatus]?.meaning ?? m.h2cStatus, { cls: `chip ${m.excluded ? 'chip-FAIL' : 'chip-neutral'} chip-small h2c-chip`, head: 'Bambu Lab status' })}
          </div>
        </div>
        <button type="button" class="btn btn-sm shortlist-btn" id="drawer-pin" aria-pressed="${pinned}"
          title="${pinned ? 'On the shortlist. Press to remove it.' : 'Add to the shortlist'}"><span aria-hidden="true">${pinned ? '★' : '☆'}</span> Shortlist</button>
        <button class="icon-btn" id="drawer-close" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="drawer-nav">
      <div class="drawer-tabs" role="tablist">
        ${TABS.map(([k, label]) => `
          <button role="tab" data-tab="${k}" aria-selected="${k === tab}" data-empty="${counts[k] === 0}" aria-controls="drawer-panel">
            <span data-label="${label}">${label}</span>${counts[k] === null ? '' : `<span class="n">${counts[k]}</span>`}</button>`).join('')}
      </div>
      <p class="drawer-help" id="drawer-help">${esc(TAB_HELP[tab](counts[tab], c))}</p>
    </div>
    <div class="drawer-body" id="drawer-panel" role="tabpanel" aria-describedby="drawer-help">${tabBody(tab, c)}</div>
  </div>`;

  markTableOverflow(host);
  // Below 1100 px the tabs are one strip that scrolls sideways, redrawn on every change: keep the open one in sight.
  keepInView(host.querySelector('.drawer-tabs'), host.querySelector('.drawer-tabs [aria-selected="true"]'));

  // Opening the tab was never enough. PA6-CF has 21 measurements grouped by source, so "one click
  // to the evidence" was one click plus a hunt. Take the reader to the row, open whatever of it is collapsed, and mark
  // it; a source opened from a footer is taken to the same way.
  const target = (state.highlightMeasurement && host.querySelector(`[data-mid="${CSS.escape(state.highlightMeasurement)}"]`))
    || (state.highlightSource && host.querySelector(`[data-source-block="${CSS.escape(state.highlightSource)}"]`))
    || (toGaps && host.querySelector('#known-gaps'));
  if (target) {
    for (const d of target.querySelectorAll('details')) d.open = true;
    for (let d = target.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
    const body = target.closest('.grade-body');
    if (body) { body.hidden = false; gradeOpen.set(body.dataset.gradeBody, true); }
    // The conditions its source states once for every measurement are part of what the reader came for.
    if (state.highlightMeasurement) for (const d of target.closest('.src-block')?.querySelectorAll('.shared-conds details') ?? []) d.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: state.highlightSource || toGaps ? 'start' : 'center', behavior: 'smooth' }));
  }

  host.querySelector('#drawer-close').addEventListener('click', actions.closeDrawer);
  host.querySelector('#drawer-pin').addEventListener('click', () => actions.togglePin(m.id));
  host.querySelectorAll('[data-choose]').forEach((b) => b.addEventListener('click', () => actions.toggleDecision(b.dataset.choose)));
  host.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => actions.setDrawerTab(b.dataset.tab)));
  host.querySelectorAll('[data-tab-link]').forEach((b) => b.addEventListener('click', () => actions.setDrawerTab(b.dataset.tabLink)));
  host.querySelectorAll('[data-open-source]').forEach((b) => b.addEventListener('click', () => actions.openSource(b.dataset.openSource)));
  // A product card opens and closes in place, and stays as the reader left it when the drawer is drawn again (Choose
  // redraws it).
  host.querySelectorAll('[data-grade-toggle]').forEach((b) => b.addEventListener('click', () => {
    const body = host.querySelector(`[data-grade-body="${CSS.escape(b.dataset.gradeToggle)}"]`);
    if (!body) return;
    body.hidden = !body.hidden;
    b.setAttribute('aria-expanded', String(!body.hidden));
    gradeOpen.set(b.dataset.gradeToggle, !body.hidden);
  }));
  wireEvidence(host, actions);
  const search = host.querySelector('[data-search]');
  if (search) {
    search.addEventListener('input', () => { drawerQuery = search.value; applySearch(host); });
    applySearch(host);
  }
}

// ------------------------------------------------------------------ a material's products (D83)

const scheduleWords = (t) => `at ${t?.tempC != null ? `${fmtNumber(t.tempC)} °C` : 'a temperature its sheet does not state'} for ${t?.hours != null ? `${fmtNumber(t.hours)} h` : 'a time its sheet does not state'}`;

/** The state a product's result is in (D99): annealed at its sheet's schedule, conditioned, or as printed and dry. */
function stateNote(j) {
  const s = j.state;
  if (!s || (!s.treatment && s.moisture !== 'conditioned')) return '';
  const bits = [s.treatment ? `annealed ${scheduleWords(s.treatment)}, as its data sheet states` : null, s.moisture === 'conditioned' ? 'moisture-conditioned' : null].filter(Boolean);
  return `<div class="fact-why state-note">Evaluated ${esc(bits.join(', '))}.${s.treatment ? ' The values below measured after annealing are the ones used.' : ''}</div>`;
}

/** What keeps an unresolved product from an answer (D99): the first requirement it could not settle, and why. */
function unsettled(j, requirementOf) {
  const r = (j.results ?? []).find((x) => x.status === 'UNKNOWN' || x.status === 'INDETERMINATE');
  if (!r) return '';
  const what = requirementOf.has(r.criterion) ? describeConstraint(requirementOf.get(r.criterion)) : r.criterion;
  return `<div class="fact-why unsettled"><b>Unresolved:</b> ${esc(what)}. ${esc(r.reason)}.</div>`;
}

const LEVEL_NOTE = {
  'unstated-direction': 'The source does not state the specimen orientation, so this may be a moulded or differently oriented bar. It is used only if Data quality includes values with no stated orientation or load.',
  'load-not-stated': 'The source does not state the HDT load, so this value is used only if Data quality includes values with no stated orientation or load.',
};

/** A product's own value for each headline (build/src/products.js): its measurement, and a mark where it is not comparable. */
function productValues(g, c) {
  const rows = REGISTRY.headlines.filter((h) => g.headline?.[h.key]).map((h) => {
    const v = g.headline[h.key];
    // A bound the source published ("> 300 %") reads as one, and the hover says it is a limit and not the value.
    const shown = esc(fmtBounded(v.value, h.unit, v.interval));
    const note = boundNote(v.interval, v.value, h.unit);
    const value = v.measurementId
      ? `<button type="button" class="evidence-value" data-measurement="${esc(v.measurementId)}" title="${esc(note ? `${note} Opens the measurement in Sources` : 'Opens the measurement in Sources')}">${shown}<span class="evidence-dot" aria-hidden="true"></span></button>`
      : `${shown}${v.observations ? ` <span class="fine">(${plural(v.observations, 'listing')})</span>` : ''}`;
    const mark = v.level === 'as-published'
      ? ` ${explainButton('not comparable', LEVEL_NOTE[v.caveat] ?? 'Not comparable.', { cls: 'missing lvl', head: 'Orientation or load not stated' })}` : '';
    const anneal = v.anneal ? ` <span class="fine">annealed${v.anneal.tempC != null ? ` at ${fmtNumber(v.anneal.tempC)} °C` : ''}${v.anneal.hours != null ? ` for ${fmtNumber(v.anneal.hours)} h` : ''}</span>` : '';
    return `<dt>${esc(h.labels.plain)}</dt><dd>${value}${mark}${anneal}${fromNote(v.from)}</dd>`;
  });
  return rows.length ? `<div class="shared-head">Values</div><dl class="kv small product-values">${rows.join('')}</dl>` : '<div class="fine">This product publishes none of the key properties on a comparable basis.</div>';
}

/**
 * Where a value or a part of a recipe was read when it is not the product's own sheet: a data sheet it shares with
 * another product (D89), or the Bambu Lab Filament Guide (D88). Always said beside it.
 */
const fromNote = (from) => (from ? ` <span class="fine from-note from-${esc(from.origin)}">${esc(from.label)}</span>` : '');

/**
 * How to print a product, from its own profiles (grades[].print): never its material's union. A part its own profiles
 * are silent on may come from a data sheet it shares or from the Bambu Lab Filament Guide, and says so (D88, D89).
 */
function printCard(g) {
  const p = g.print;
  const from = p?.from ?? {};
  const some = !!p?.profileIds.length || Object.keys(from).some((a) => a !== 'anneal');
  if (!some && !p?.anneal?.length) return '<div class="print-card fine">No print settings on file for this product. Its maker\'s other products may be similar, but that is not this product\'s data.</div>';
  // An enclosure with no temperature is the H2C's heated chamber: the guide's (D90) or, for the same types, its maker's
  // own words (D93), which the gate's reason quotes.
  const win = (a, key) => (a.state === 'range' && a.max == null && a.min != null ? `at least ${fmtNumber(a.min)} °C`
    : a.state === 'range' ? `${a.min != null && a.min !== a.max ? `${fmtNumber(a.min)}–` : ''}${fmtNumber(a.max)} °C`
    : a.state === 'not-required' || a.state === 'ambient' ? 'not required' : a.state === 'unknown' ? 'not published'
      : a.state === 'enclosed' ? 'enclosure needed, no temperature' : a.state.replace(/-/g, ' '));
  const axis = (label, key) => (some ? `<dt>${label}</dt><dd>${esc(win(p[key], key))} ${gateChip(p[key], label)}${fromNote(from[key])}</dd>` : '');
  const anneal = (p.anneal ?? []).map((x) => `${x.tempC != null ? `${fmtNumber(x.tempC)} °C` : 'temperature not stated'}${x.hours != null ? ` for ${fmtNumber(x.hours)} h` : ''}`);
  return `<div class="print-card"><div class="shared-head">Print settings</div><dl class="kv small">
    ${axis('Nozzle', 'nozzle')}${axis('Bed', 'bed')}${axis('Chamber', 'chamber')}
    ${some ? `<dt>Enclosure</dt><dd>${esc(p.enclosure === 'unknown' ? 'not published' : p.enclosure.replace(/-/g, ' '))}${fromNote(from.enclosure)}</dd>
    <dt>Hardened nozzle</dt><dd>${p.hardenedNozzle === true ? 'required' : p.hardenedNozzle === false ? 'not needed' : 'not published'}${fromNote(from.hardenedNozzle)}</dd>
    <dt>Drying</dt><dd>${esc(dryingWords(p.drying))}${fromNote(from.drying)}</dd>` : ''}
    ${anneal.length ? `<dt>Annealing</dt><dd>${esc(anneal.join('; '))} (some of its values were measured after it)${fromNote(from.anneal)}</dd>` : ''}
  </dl></div>`;
}

// What a maker writes about printing and using a product beyond its numbers (db.knowHow, build/src/know-how.js): its
// statements in its own words, by topic, each with its source and page. Shown, never filtered on. Where the product's
// documents say nothing, the state says so and names the maker, instead of an empty section (docs/GOALS.md).
const knowHowIndex = new WeakMap();
/** The know-how statements of a database, by product. */
function knowHowOf(db) {
  if (!knowHowIndex.has(db)) {
    const byGrade = new Map();
    for (const k of db.knowHow ?? []) (byGrade.get(k.gradeId) ?? byGrade.set(k.gradeId, []).get(k.gradeId)).push(k);
    knowHowIndex.set(db, byGrade);
  }
  return knowHowIndex.get(db);
}
const lower = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const andList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const RECIPE_WORDS = { chamber: 'chamber or enclosure need', drying: 'drying schedule', annealing: 'annealing schedule' };
// A topic in a list of what a maker leaves unsaid; a topic the vocabulary gains later reads as its name.
const TOPIC_WORDS = {
  'Good for': 'applications', Benefits: 'benefits', 'Pitfalls and limitations': 'pitfalls', 'Warping and shrinkage': 'warping',
  'Precision and tolerance': 'dimensional accuracy', 'Surface finish': 'surface finish', 'Adhesion between layers': 'layer adhesion',
  'Moisture sensitivity': 'moisture', 'Nozzle wear': 'nozzle wear', 'Odour and emissions': 'odour', 'Supports and removal': 'supports',
  'Printing advice': 'printing advice',
};

/** Where a statement stands, in a few words: a data sheet or the maker's product page, and the page. */
function knowHowSource(k, c) {
  const s = c.sourceById.get(k.sourceId);
  const kind = s?.sourceClass === 'Manufacturer product page or guide' ? 'product page'
    : s?.sourceClass === 'Manufacturer TDS' ? 'data sheet' : lower(sourceKind(s));
  const page = /^p\. ?\d+/.exec(String(k.locator ?? ''))?.[0];
  const where = `${sourceName(s, k.sourceId)}${stated(k.locator) ? `, ${k.locator}` : ''}.`;
  return `<span class="maker-src">— ${esc(kind)}${page ? `, ${esc(page)}` : ''}</span> ${explainButton('where', where, { cls: 'id-mark', head: 'Where this is stated' })}${ids(['Statement', k.id], ['Source', k.sourceId])}`;
}

/**
 * What a statement does not say, recorded by the reviewer who read it ("printed geometry, test method, service load
 * and lifetime unstated"). It qualifies the quote, so it is one press away beside it, never inside the maker's words.
 */
function knowHowConditions(k) {
  const note = String(k.exposure ?? '').trim();
  // Only an entire missing-state cell is empty guidance. "Not published; ..." may explain a real limit.
  return note && !/^(not published|not applicable|not stated|not recorded|n\/a)\.?$/i.test(note)
    ? ` ${explainButton('review note', note, { cls: 'maker-conditions', head: 'Reviewer\'s note on this statement' })}` : '';
}

/** What the maker's documents leave unsaid, as one line, and whether its website was checked. */
function knowHowGap(g, missingTopics, c) {
  const k = g.knowHow;
  const site = k.searchedOn ? ` (website checked ${k.searchedOn})` : '';
  if (k.state === 'no-document-read') return `None of this product's documents has been read beyond its numbers${site}.`;
  const recipe = Object.entries(k.recipe).filter(([, s]) => s !== 'collected' && s !== 'no-document-read').map(([part]) => RECIPE_WORDS[part]);
  const missing = k.state === 'collected' ? missingTopics.map((t) => TOPIC_WORDS[t] ?? lower(t)) : ['anything beyond its numbers'];
  const all = [...missing, ...recipe];
  return all.length ? `Not stated by the maker: ${andList(all)}${site}.` : '';
}

function makerSays(g, c) {
  const k = g.knowHow;
  const own = knowHowOf(c.db).get(g.id) ?? [];
  const topics = c.db.meta.knowHow?.topics ?? [];
  // The product's other evidence records (chemical resistance, flammability and the like): the Environment tab lists
  // them with the material's; here they stay with the product they were published for.
  const records = c.ev.filter((e) => e.gradeId === g.id);
  const other = records.length ? `<details class="grade-more"><summary>Its environment statements (${records.length})</summary><dl class="kv small">
    ${records.map((e) => `<dt>${esc(e.categoryLabel ?? e.domain)}</dt><dd>${esc(e.topic)}: ${esc(e.finding)}</dd>`).join('')}</dl></details>` : '';
  if (!k) return other;
  const gap = knowHowGap(g, topics.filter((t) => !k.topics[t]), c);
  if (!own.length) return `<div class="fine maker-says-gap">${esc(gap)}</div>${other}`;
  const groups = topics.map((t) => [t, own.filter((x) => x.topic === t)]).filter(([, list]) => list.length);
  return `<div class="maker-says"><div class="shared-head">What the maker says</div><dl class="kv small">
    ${groups.map(([t, list]) => `<dt>${esc(t)}</dt><dd><ul class="maker-quotes">${list.map((x) => `<li>“${esc(x.text)}” ${knowHowSource(x, c)}${knowHowConditions(x)}</li>`).join('')}</ul></dd>`).join('')}
  </dl>${gap ? `<p class="fine">${esc(gap)}</p>` : ''}</div>${other}`;
}

/** Whether the makers' own websites were checked for a material's products: none, some or all of them. */
function sitesLine(searched, total) {
  if (!searched) return "Makers' websites not checked yet.";
  if (searched >= total) return `Makers' websites checked for all ${plural(total, 'product')}.`;
  return `Makers' websites checked for ${searched} of them so far.`;
}

/** Across a material's products: how many makers say something on each topic, and where the sheets are silent. */
function makersSayCounts(m, c) {
  const k = m.knowHow;
  const topics = c.db.meta.knowHow?.topics ?? [];
  if (!k || !topics.length) return '';
  const n = k.products;
  const total = Object.values(n).reduce((a, b) => a + b, 0);
  if (!total) return '';
  const silent = [n['sheet-silent'] ? `${plural(n['sheet-silent'], 'data sheet')} say nothing beyond their numbers` : '',
    n['no-document-read'] ? `${n['no-document-read']} ${n['no-document-read'] === 1 ? 'product has' : 'products have'} no document read yet` : '',
    n['searched-nothing'] ? `${n['searched-nothing']} makers' websites were checked and say nothing more` : ''].filter(Boolean);
  const recipe = Object.entries(k.recipe).map(([part, s]) => [part, s['sheet-silent'] + s['searched-nothing']]).filter(([, x]) => x)
    .map(([part, x]) => `${RECIPE_WORDS[part]} (${plural(x, 'product')})`);
  return `<h3 class="sec">What makers say</h3>
    <p class="fine"><b>${n.collected} of ${plural(total, 'product')}</b> have statements from their makers, quoted under each product.${silent.length ? ` ${cap(silent.join('; '))}.` : ''} ${sitesLine(k.sitesSearched ?? 0, total)}</p>
    <ul class="print-counts">${topics.map((t) => `<li><b>${esc(t)}</b>: ${k.topics[t]?.makers ?? 0} of ${plural(k.makers, 'maker')}${k.topics[t] ? ` (${plural(k.topics[t].products, 'product')})` : ''}</li>`).join('')}</ul>
    ${recipe.length ? `<p class="fine">Not stated by their documents: ${esc(andList(recipe))}.</p>` : ''}`;
}

/**
 * The Bambu Lab Filament Guide's row for this material's type (db.printGuide, D88): what it states, and what it is for.
 * It is read for a product only where the product's own sheet, and a data sheet it shares, say nothing on a part of the
 * print check, or on its drying (D127); it is never a profile of this material.
 */
function guideBlock(m, c) {
  const guide = c.guide;
  if (!guide) return '';
  const why = guide.materials.find((y) => y.materialId === m.id).reason;
  const readBy = c.grades.filter((g) => Object.values(g.print?.from ?? {}).some((f) => f.guideId === guide.id)).length;
  const enclosure = guide.enclosureState === 'recommended' ? 'required' : guide.enclosureState === 'not-needed' ? 'not needed' : 'not stated';
  const hardened = guide.abrasion.requiresHardened === true ? 'hardened nozzle required' : guide.abrasion.requiresHardened === false ? 'hardened nozzle not needed' : 'nozzle wear not settled';
  return `<div class="profile-block guide-block"><h3 class="block-title">${esc(guide.name)}${ids(['Guide row', guide.id], ['Source', guide.sourceId])}</h3>
    <p class="fine">Used only where a product's own data sheet is silent on a setting. ${readBy ? `${plural(readBy, 'product')} here ${readBy === 1 ? 'takes' : 'take'} at least one setting from it.` : 'No product here needs it.'}
      ${explainButton('Why this column?', why, { cls: 'link-btn', head: `Why the ${guide.guideType} column` })}</p>
    <dl class="kv">
      <dt>Nozzle</dt><dd>${esc(guide.nozzle.text)} ${gateChip(guide.gates.nozzle, 'Nozzle')}</dd>
      <dt>Bed</dt><dd>${esc(guide.bed.text)} ${gateChip(guide.gates.bed, 'Bed')}</dd>
      <dt>Chamber</dt><dd>${guide.chamber.state === 'unknown' ? 'no temperature stated'
        : guide.chamber.state === 'enclosed' ? "enclosure required, no temperature (the H2C's heated chamber counts)" : esc(guide.chamber.text)} ${gateChip(guide.gates.chamber, 'Chamber')}</dd>
      <dt>Enclosure</dt><dd>${esc(guide.enclosure)}${new RegExp(`\\b${enclosure.split(' ')[0]}`, 'i').test(guide.enclosure) ? '' : ` (${esc(enclosure)})`}</dd>
      <dt>Nozzle type</dt><dd>${esc(guide.nozzleSizeMaterial)}: ${esc(hardened)}</dd>
      <dt>Drying</dt><dd>${longText(guide.drying.text)} <span class="fine">(read as ${esc(dryingWords(guide.drying))})</span></dd>
      <dt>Source</dt><dd>${esc(sourceName(c.sourceById.get(guide.sourceId), guide.sourceId))}, ${esc(guide.locator)}</dd>
    </dl></div>`;
}

/** How many of a material's products the H2C can print, axis by axis, from each product's own settings. */
function productPrintCounts(grades) {
  const products = grades.filter(isProduct);
  if (!products.length) return '';
  const origins = { twin: 0, guide: 0 };
  const count = (axis) => {
    const n = { within: 0, over: 0, unknown: 0 };
    for (const g of products) {
      const from = g.print?.from?.[axis];
      const v = g.print?.profileIds.length || from ? g.print[axis].verdict : 'unknown';
      if (v === 'within') n.within++; else if (v === 'unknown') n.unknown++; else n.over++;
      if (from && v !== 'unknown') origins[from.origin]++;
    }
    return n;
  };
  const axes = [['Nozzle', count('nozzle'), h2cLimit('nozzle')], ['Bed', count('bed'), h2cLimit('bed')], ['Chamber', count('chamber'), h2cLimit('chamber')]];
  const all = axes.every(([, n]) => n.within === products.length);
  const head = all
    ? `<p class="print-answer"><b>All ${plural(products.length, 'product')} are within the H2C's nozzle, bed and chamber limits.</b></p>`
    : `<p class="print-answer"><b>${products.length === 1 ? 'Its product' : `Its ${products.length} products`}, against the H2C's limits:</b></p>
      <ul class="print-counts">${axes.map(([label, n, limit]) => `<li><b>${label}</b> (${limit} °C): ${n.within} within${n.over ? `, ${n.over} above or only partly within` : ''}${n.unknown ? `, ${n.unknown} not published` : ''}</li>`).join('')}</ul>`;
  // Where a product's own sheet is silent, a data sheet it shares (D89) or the Bambu Lab Filament Guide (D88) is read.
  const read = [origins.guide ? `${plural(origins.guide, 'setting')} from the Bambu Lab Filament Guide` : '',
    origins.twin ? `${plural(origins.twin, 'setting')} from a data sheet shared with another product` : ''].filter(Boolean);
  return `${head}${read.length ? `<p class="fine">Where a product's own data sheet is silent: ${esc(read.join('; '))}. Products shows which.</p>` : ''}`;
}

/** A material's spread across its products, per key property (materials[].summary): median, range, how many. */
function spreadTable(m, c) {
  const rows = REGISTRY.headlines.map((h) => [h, m.summary?.[h.key]]).filter(([, s]) => s);
  if (!rows.length) return '';
  const span = (x) => (x.min === x.max ? fmtNumber(x.min) : `${fmtNumber(x.min)}–${fmtNumber(x.max)}`);
  return `${scrollTable(`<table class="grid spread-table"><thead><tr>
    <th>Property</th><th class="num">Median</th><th class="num">Range</th><th class="num">Products</th><th>Left out of the range</th></tr></thead><tbody>
    ${rows.map(([h, s]) => `<tr><td>${esc(h.labels.plain)} <span class="u">${esc(h.unit)}</span></td>
      <td class="num">${s.n ? fmtNumber(s.median) : '—'}</td>
      <td class="num">${s.n > 1 ? `${fmtNumber(s.min)}–${fmtNumber(s.max)}` : s.n ? fmtNumber(s.min) : '—'}</td>
      <td class="num">${s.n} of ${s.products}</td>
      <td>${[s.asPublished ? `${s.asPublished.n} with no stated ${h.direction ? 'orientation' : 'test load'} (${span(s.asPublished)})` : '', s.variants ? `${plural(s.variants.n, 'special formulation')} (${span(s.variants)})` : ''].filter(Boolean).map(esc).join('; ') || '—'}</td></tr>`).join('')}
  </tbody></table>`)}
  <p class="fine">Median and range of the products that report a value on a comparable basis. Different products, not one product's scatter.</p>`;
}

function tabBody(tab, c) {
  const { m, ms, ev, poly, cov, profiles, grades, prices, evaluation, summary, db, showEstimates, policy } = c;
  const covFor = (t) => cov.filter((r) => (COVERAGE_FOR_TAB[t] ?? []).includes(r.domain));
  const empty = (t) => nothingRecorded(covFor(t), { toGaps: cov.length > 0 });

  if (tab === 'Overview') {
    // Every headline, labelled and explained exactly as the filter rail and the table label it.
    const HEAD = REGISTRY.headlines.map((h) => [h.labels.plain, h.key, h.labels.hint, h.labels.technical, h.comparisonNote]);

    // The section that answers "can I print this" also answers "what do I set it to": the window recorded across its
    // products, as a guide, beside the H2C's limit.
    const gateLine = (g, label, window, extra = '') => {
      if (!g) return '';
      const { state, word } = gateVerdict(g.verdict);
      return `<div class="fact"><span class="chip chip-${state}">${esc(word)}</span>
        <div><b>${esc(label)}</b>${window ? ` ${explainButton(esc(window), 'The range across every print profile of its products, not one setting to dial in. Printing has each profile.',
          { cls: 'set-to', head: 'Range across its products', action: 'printing', id: m.id })}` : ''}
          <br><span class="fact-why">${esc(g.reason)}</span>${extra}</div></div>`;
    };
    // The chamber can be answered three ways: a temperature, a statement in words, or neither. An
    // estimated band is shown only in the third and second cases, and never changes the result.
    const guidance = m.print?.chamberGuidance;
    // Confirmed only means measured evidence only, in the drawer as in every lens: the research band is an estimate.
    const est = showEstimates ? m.print?.chamberEstimate : null;
    const chamberExtra = `${!m.print?.chamberC && guidance
        ? `<br><span class="fact-why">${esc(CHAMBER_GUIDANCE[guidance.state]?.title ?? guidance.label)}</span>` : ''}${est
        ? `<div class="est-card"><h4>Chamber: estimated, not published</h4>
            <div class="est-span">${fmtRange(est.lo, est.hi, ' – ')} ${esc(est.unit)}</div>
            <div class="est-basis">No source publishes a chamber temperature. Research of 2026-09-13 places it in this band,
              based on ${esc(est.basis)}. It is not a print setting and changes no result.${est.caution ? ` ${esc(est.caution)}` : ''}</div>
          </div>` : ''}`;

    const printable = m.excluded
      ? `<div class="callout bad"><b>Beyond H2C capability.</b> Kept in the database for reference; never a candidate.</div>`
      : '';

    // With estimates hidden the drawer shows none, as the table does. It says where they are rather than leaving a
    // reader who saw one in Include uncertain to wonder where it went.
    const anyEstimate = HEAD.some(([, k]) => { const h = m.headline[k]; return h && !h.known && h.estimate; })
      || m.print?.nozzleEstimate || m.print?.bedEstimate || m.print?.chamberEstimate;
    const hiddenEstimates = !showEstimates && anyEstimate
      ? `<p class="fine">${policy === 'exploration'
        ? 'Tick "Let estimates rule out materials" in the top bar to see estimates for the missing values.'
        : `Estimates for the missing values show under ${esc(POLICY_LABELS.exploration)}, with "Let estimates rule out materials" ticked.`}</p>`
      : '';

    // What it is, in one or two sentences: its filler and Bambu Lab's standing. The full name is in the header already.
    const lede = `<p class="lede">${esc([describeFacets(m), H2C_STATUS[m.h2cStatus]?.lede].filter(Boolean).join(' '))}</p>`;

    // Key properties: each one's median over its products, with their range, in one compact list. The meaning and the
    // basis of each sit behind its name, so the list stays a list.
    const numbers = `
      <h3 class="sec">Key properties</h3>
      <dl class="key-props">
        ${HEAD.map(([label, k, hint, technical, note]) => {
          const h = m.headline[k];
          return `<dt>${explainButton(esc(label), [hint, note].filter(Boolean).join(' '), { cls: 'prop-name', head: technical || label })}</dt>
            <dd class="${h?.known ? '' : 'kp-empty'}">${renderValue(h, { showUnit: true, estimates: showEstimates })}${showEstimates && !h?.known && h?.estimate ? ` <span class="fine">estimated ${esc(ESTIMATE_STRENGTH[h.estimate.strength].short)}${unitNote(h.estimate)}</span>` : ''}</dd>`;
        }).join('')}
      </dl>
      <p class="fine">${HEAD.some(([, k]) => m.headline[k]?.spread)
        ? 'Median of its products that report the value on a comparable basis, with their range and count: different products, not one product\'s scatter.'
        : esc((m.headlineBasis ?? '').replace(/[.\s]*$/, '')) + '.'} Select a value to see where it comes from.</p>
      ${hiddenEstimates}
      ${estimateGroup(m, HEAD, showEstimates)}`;

    // By product (D83): whether the H2C can print a material is whether it can print its products, each on its own
    // settings. The windows below are the material's recorded range, kept as a guide; the counts are what decide.
    const byProduct = productPrintCounts(grades);
    // The material's hardened-nozzle gate is any product's; the line says how many (PM-03).
    const hard = hardenedShare(grades);
    const someHard = m.gates.abrasive === 'requires-hardened' && hard.total > 1 && hard.need < hard.total;
    const print = `
      <h3 class="sec">H2C printability</h3>
      ${byProduct}
      <div class="facts-list">
        ${gateLine(m.gates.nozzle, 'Nozzle', range(m.print?.nozzleC), windowEstimate(m.print?.nozzleEstimate, 'Nozzle', showEstimates))}
        ${gateLine(m.gates.bed, 'Bed', range(m.print?.bedC), windowEstimate(m.print?.bedEstimate, 'Bed', showEstimates))}
        ${gateLine(m.gates.chamber, 'Chamber', range(m.print?.chamberC), chamberExtra)}
        <div class="fact">
          ${someHard ? `<span class="chip chip-need">Some products</span>`
            : m.gates.abrasive === 'requires-hardened'
            // A requirement is not an ambiguity. The half-filled marker meant "we are not sure"
            // while the sentence next to it meant "you need one".
            ? '<span class="chip chip-need">Required</span>'
            : m.gates.abrasive === 'no-special-concern' ? '<span class="chip chip-PASS">Any nozzle</span>'
            : '<span class="chip chip-UNKNOWN">No data</span>'}
          <div><b>Hardened nozzle</b><br><span class="fact-why">${someHard
            ? esc(`${cap(hardenedWords(hard))}: ${hard.needing.slice(0, 4).map((g) => `${g.manufacturer} ${g.product}`).join(', ')}${hard.need > 4 ? ` and ${hard.need - 4} more` : ''}. The others state no need or say nothing; Products shows which.`)
            : m.gates.abrasive === 'requires-hardened'
            ? 'Required: the filler wears out a brass nozzle.' : m.gates.abrasive === 'no-special-concern'
            ? 'Its sources state no special nozzle need.' : 'No source mentions nozzle wear.'}</span></div></div>
        <div class="fact">
          ${m.gates.drying === 'unknown'
            ? '<span class="chip chip-UNKNOWN">No data</span>'
            : `<span class="chip chip-neutral">${{ required: 'Published', optional: 'Optional', 'not-needed': 'Not needed' }[m.gates.drying]}</span>`}
          <div><b>Drying</b><br><span class="fact-why">${(() => {
            const all = grades.filter(isProduct);
            const count = (need) => all.filter((g) => g.print?.drying?.need === need).length;
            const share = (need) => (count(need) ? ` (${count(need)} of ${plural(all.length, 'product')}); Products gives each one` : '; Printing gives its wording');
            if (m.gates.drying === 'required') return `A drying schedule is published${share('required')}.`;
            if (m.gates.drying === 'optional') return `Its sources advise drying only for a condition, such as wet filament${share('optional')}.`;
            if (m.gates.drying === 'not-needed') return `Its sources say drying is not needed${share('not-needed')}.`;
            return 'No source states whether to dry it. That does not mean it needs none.';
          })()}</span></div></div>
        <div class="fact plain">
          <div><b>AMS</b><br><span class="fact-why">${esc(amsSummary(profiles))}</span></div></div>
      </div>
      <p class="fine">Ranges across its products, as a guide. Each product's own settings are in Products.</p>`;

    // One line on how much is on file, with the way to the documents and the gaps.
    const docs = c.counts.Evidence;
    const dataLine = `<p class="data-line"><b>On file:</b> ${plural(summary.numericMeasurements, 'measurement')} from ${plural(docs, 'source')}${summary.quarantined ? ` · ${summary.quarantined} held back` : ''} · ${summary.gaps ? plural(summary.gaps, 'known gap') : 'no known gaps'} · ${summary.conflicts ? plural(summary.conflicts, 'unresolved conflict') : 'no unresolved conflicts'}
      <button type="button" class="link-btn" data-tab-link="${summary.gaps || summary.conflicts ? 'Coverage' : 'Evidence'}">See the sources</button></p>`;
    const about = m.identity?.notes && m.identity.notes !== 'Not applicable'
      ? `<details class="grade-more"><summary>About this entry</summary><p class="fine">${esc(m.identity.notes)}</p></details>` : '';
    const standing = db.method.find((r) => r.topic === 'Transferable allowables')?.rule;
    const footer = standing ? `<p class="fine overview-foot">${esc(standing)}</p>` : '';

    // With requirements set, the first question is whether a product meets them, then whether the H2C can print it.
    let answer = '';
    if (c.tested) {
      const n = evaluation?.counts;
      const parts = n ? [n.pass ? `${n.pass} ${n.pass === 1 ? 'meets' : 'meet'} all your requirements` : 'none meets all your requirements',
        n.fail ? `${n.fail} ${n.fail === 1 ? 'fails' : 'fail'} at least one` : '', n.untested ? `${n.untested} ${n.untested === 1 ? 'publishes' : 'publish'} too little to judge` : ''].filter(Boolean) : [];
      const total = n ? n.pass + n.fail + n.untested : 0;
      answer = `<div class="answer answer-${esc(evaluation.verdict)}">${chip(evaluation.verdict)}
          <p>${n ? `Of its ${plural(total, 'product')}, ${esc(andList(parts))}.` : esc(evaluation.verdict === 'PASS' ? 'It meets all your requirements.' : 'It does not meet all your requirements.')}
          ${n?.pass ? '<button type="button" class="btn btn-sm" data-tab-link="Grades">Show the products</button>' : ''}</p></div>
        <h3 class="sec">Your requirements</h3>${renderWhy(evaluation, { productName: (id) => gradeName(c.gradeById.get(id)) })}`;
    }
    const rest = `${usesSection(m, c)}${dataLine}${about}${footer}`;
    return c.tested
      ? `${printable}${lede}${answer}${print}${numbers}${rest}`
      : `${printable}${lede}${numbers}${print}${rest}`;
  }

  if (tab === 'Mechanical' || tab === 'Thermal') {
    // The property first, then every value of it with its product and source, largest first. Grouped by source, PLA's
    // 700 values were sixty blocks to read through for one property; no range is drawn across them (D46).
    const list = tabProperties(tab, m);
    const all = ms.filter((x) => list.includes(x.property));
    const rows = all.filter((x) => !isNamedOnly(x));
    const named = all.filter(isNamedOnly);
    const present = new Set(all.map((r) => r.property));
    const absent = list.filter((p) => !present.has(p));
    const byValue = (a, b) => (b.numeric - a.numeric) || ((b.value ?? 0) - (a.value ?? 0));
    // Where a selectable property compares only some of these values (a notched Charpy bar at room temperature, a bar
    // pulled along Z), its note says which, and why the rest stay on record but are not compared (D92).
    const notes = (p) => REGISTRY.headlines.filter((h) => h.comparisonNote && h.relatedProperties.includes(p))
      .map((h) => `<p class="fine cmp-note"><b>${esc(h.labels.plain)}.</b> ${esc(h.comparisonNote)}</p>`).join('');
    const blocks = list.filter((p) => rows.some((x) => x.property === p)).map((p) => {
      const group = rows.filter((x) => x.property === p).sort(byValue);
      return makerBlock(propertyName(p), group.length, 'value', notes(p) + group.map((x) => measurementRow(x, c, { compact: true })).join(''), { cls: 'prop-block' });
    });
    const namedHtml = named.length
      ? `<div class="np-line">Named on a data sheet without a value: ${named.map((x) => `<span class="np-item${c.highlight === x.id ? ' target' : ''}" data-mid="${esc(x.id)}">${esc(inSentence(x.property))} (${esc(gradeName(c.gradeById.get(x.gradeId)) || 'a product')})</span>`).join(', ')}.</div>`
      : '';
    // The rarely published properties are the list above, said once; the other gaps are this domain's own.
    const gaps = covFor(tab).filter((r) => GAP_STATUS.has(r.status) && r.domain !== 'Sparse properties');
    return `
      ${rows.length ? blocks.join('') + namedHtml : empty(tab)}
      ${absent.length ? `<h3 class="sec">Not published for this material</h3>
        <div class="gap">${absent.map((p) => esc(propertyName(p))).join(' · ')}. A gap, not a zero or a low value.</div>` : ''}
      ${gaps.length ? `<h3 class="sec">Known gaps</h3>${gaps.map((r) => `<div class="gap"><strong>${esc(r.domain)}: ${esc(r.status.toLowerCase())}.</strong> ${longText(r.finding)}</div>`).join('')}` : ''}`;
  }

  if (tab === 'Printing') {
    const guide = guideBlock(m, c);
    if (!profiles.length) return guide || empty('Printing');
    const leadingMaker = leadMaker(m, c);
    const note = (t) => `<br><span class="missing" style="font-size:11px">${t}</span>`;
    // AMS and H2C routing are shown on a profile only where it says more than "verify the exact grade", which nearly all
    // say; the tab says so once, at its top.
    const VERIFY = /verify|not verified|no blanket/i;
    const saysMore = (p) => Object.values(p.routing ?? {}).some((v) => stated(v) && !VERIFY.test(String(v)));
    const routingNote = `<p class="fine">AMS and H2C nozzle routing: ${profiles.filter(saysMore).length ? `shown on the ${plural(profiles.filter(saysMore).length, 'profile')} that ${profiles.filter(saysMore).length === 1 ? 'says' : 'say'} more than` : 'every profile says only'} "verify the exact grade". Not used as a filter.</p>`;
    const profileBlock = (p) => {
      const g = c.gradeById.get(p.gradeId);
      return `<div class="profile-block" data-search-item="${esc([gradeName(g), g?.manufacturer, p.profile, p.id].filter(stated).join(' '))}">
      <h3 class="block-title">${esc(gradeName(g) || 'Product not named')}${stated(p.profile) ? ` <span class="fine">${esc(p.profile)}</span>` : ''}${ids(['Profile', p.id], ['Product', p.gradeId])}</h3>
      <dl class="kv">
        <dt>Nozzle</dt><dd>${esc(p.nozzle.text)} ${gateChip(p.gates.nozzle, 'Nozzle')}</dd>
        <dt>Bed</dt><dd>${esc(p.bed.text)} ${gateChip(p.gates.bed, 'Bed')}</dd>
        <dt>Chamber</dt><dd>${esc(stated(p.chamber.text) ? p.chamber.text : 'not stated')} ${gateChip(p.gates.chamber, 'Chamber')}
          ${p.chamber.fromEnclosure || p.chamber.state === 'enclosed' ? note(`Read from the enclosure line: "${esc(p.enclosure)}".`) : ''}
          ${p.chamber.strippedTail ? note(`Text after the value, not read as a chamber requirement: ${esc(p.chamber.strippedTail)}`) : ''}</dd>
        <dt>Nozzle material</dt><dd>${esc(p.nozzleMaterial ?? '')}</dd>
        <dt>Nozzle diameter</dt><dd>${esc(p.nozzleDiameter.text)}</dd>
        <dt>Abrasion</dt><dd>${esc(p.abrasion.text)}</dd>
        <dt>Drying</dt><dd>${longText(p.drying.text)}</dd>
        <dt>Enclosure</dt><dd>${esc(p.enclosure ?? '')}</dd>
        <dt>Plate</dt><dd>${esc(p.plate ?? '')}</dd>
        <dt>Support material</dt><dd>${esc(p.supportPairing ?? '')}</dd>
        <dt>Failure modes</dt><dd>${longText(p.failureModes ?? '')}</dd>
      </dl>
      ${p.notes.length ? `<dl class="kv">${p.notes.map((n) => `<dt>${esc(n.topic)}</dt><dd>${longText(n.text)}</dd>`).join('')}</dl>` : ''}
      ${saysMore(p) ? `<details class="grade-more routing"><summary>AMS and H2C nozzle routing, as recorded</summary>
        <dl class="kv">
          <dt>H2C left</dt><dd>${esc(p.routing.left ?? '')}</dd>
          <dt>H2C right</dt><dd>${esc(p.routing.right ?? '')}</dd>
          <dt>AMS 2 Pro</dt><dd>${esc(p.routing.ams2Pro ?? '')}</dd>
          <dt>AMS HT</dt><dd>${esc(p.routing.amsHT ?? '')}</dd>
          <dt>AMS published</dt><dd>${esc(p.routing.amsPublished ?? '')}</dd>
        </dl></details>` : ''}
      <div class="cond meas-foot">${[p.sourceId, p.h2cSourceId].filter(stated).map((sid) => `<button type="button" class="link-btn" data-open-source="${esc(sid)}" title="Opens this document in Sources">${esc(sourceName(c.sourceById.get(sid), sid))}</button>`).join('; ')}</div></div>`;
    };
    return guide + routingNote + searchBox('a product or maker') + groupBy(profiles, (p) => c.gradeById.get(p.gradeId)?.manufacturer ?? 'Maker not named', leadingMaker)
      .map(([maker, group]) => makerBlock(maker, group.length, 'print profile', group.map(profileBlock).join(''), { open: maker === leadingMaker })).join('');
  }

  if (tab === 'Environment') {
    if (!ev.length && !poly.length) return empty('Environment');
    const byCat = new Map();
    for (const e of ev) {
      const k = e.categoryLabel ?? 'Other';
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k).push(e);
    }
    // The categories a requirement can be set on come first; what no filter uses (specimen preparation, safety,
    // disposal, post-processing) is collapsed beneath them.
    const cats = [...byCat];
    const usable = cats.filter(([, list]) => list[0]?.filterable);
    const other = cats.filter(([, list]) => !list[0]?.filterable);
    // A statement's topic is shown only where it says more than the heading above it ("Solubility" under Water solubility).
    const sameWords = (topic, heading) => { const w = String(topic ?? '').toLowerCase().match(/[a-z]{4,}/g) ?? []; return w.length > 0 && w.every((x) => heading.toLowerCase().includes(x.slice(0, 5))); };
    const record = (e, label) => `<div class="evidence-row env-row">
        <div><strong>${esc(e.finding)}</strong></div>
        ${(() => { const bits = [sameWords(e.topic, label) ? null : e.topic, e.agent, e.strength && e.strength !== 'unspecified' ? e.strength : null].filter(Boolean); return bits.length ? `<div class="cond">${esc(bits.join(' · '))}</div>` : ''; })()}
        <div class="cond meas-foot">${esc(stated(e.gradeId) ? gradeName(c.gradeById.get(e.gradeId)) || 'a product' : 'the material in general')} · <button type="button" class="link-btn" data-open-source="${esc(e.sourceId)}" title="Opens this document in Sources">${esc(sourceName(c.sourceById.get(e.sourceId), e.sourceId))}</button>${stated(e.exposure) ? ` ${explainButton('review note', e.exposure, { cls: 'id-mark', head: 'Reviewer\'s note on this statement' })}` : ''}${ids(['Statement', e.id], ['Source', e.sourceId])}</div>
      </div>`;
    const section = ([label, list]) => `<h3 class="sec">${esc(label)}</h3>${list.map((e) => record(e, label)).join('')}`;
    return usable.map(section).join('')
      + (other.length ? `<details class="grade-more env-other"><summary>Other maker statements (${other.reduce((n, [, l]) => n + l.length, 0)}): ${esc(other.map(([l]) => l.toLowerCase()).join(', '))}</summary>
          <p class="fine">Not used by any filter.</p>${other.map(section).join('')}</details>` : '')
      + polymerSection(poly, c);
  }

  if (tab === 'Grades') {
    if (!grades.length) return empty('Grades');
    const judged = new Map((evaluation?.products ?? []).map((x) => [x.gradeId, x]));
    // What a product fails, in the pills' words. A criterion is one requirement's, the same for every product, and the
    // material's own results pair each with its requirement.
    const requirementOf = new Map((evaluation?.results ?? []).map((r) => [r.criterion, r.constraint]));
    const failText = (criteria) => criteria.map((k) => (requirementOf.has(k) ? describeConstraint(requirementOf.get(k)) : k)).join('; ');
    const typicalOf = new Set(Object.values(m.summary ?? {}).map((s) => s.typical).filter(Boolean));
    // Colour. The field was collected on every grade, but it does not hold what a buyer wants: on 132 of 144 grades it
    // is the same sentence saying properties may vary by colour, and on the others it names the colour of the specimen
    // that was tested. So the caveat is said once, above the products, and a product shows its colour only where the
    // tested one is stated.
    const SPEC_COLOUR = /^(white|black|natural|grey|gray|red|blue|green|yellow|orange|clear|transparent)\b/i;
    const passing = c.tested ? grades.filter((g) => judged.get(g.id)?.verdict === 'PASS') : [];
    // A product's key values in its one-line summary: the ones asked about, else the first three it publishes.
    const asked = new Set((evaluation?.results ?? []).filter((r) => r.constraint.kind === 'numeric').map((r) => r.constraint.property));
    const keys = (g) => REGISTRY.headlines.filter((h) => g.headline?.[h.key] && (asked.size ? asked.has(h.key) : true)).slice(0, 3)
      .map((h) => `${h.labels.short} ${fmtBounded(g.headline[h.key].value, h.unit, g.headline[h.key].interval)}`).join(' · ');
    // The documents a product's values, settings and statements come from, each one press from its block in Sources.
    const docsOf = (g) => [...c.documents].filter(([, d]) => d.grades.has(g.id)).map(([sid]) => sid);
    const block = (g, open) => {
      const j = judged.get(g.id);
      const isOpen = gradeOpen.has(g.id) ? gradeOpen.get(g.id) : open;
      const verdictChip = c.tested && j ? ` ${chip(j.verdict)}` : '';
      const docs = docsOf(g);
      return `<div class="grade-block" data-search-item="${esc([gradeName(g), g.product, g.manufacturer, g.id].filter(stated).join(' '))}">
      <div class="grade-head">
        <button type="button" class="grade-toggle" data-grade-toggle="${esc(g.id)}" aria-expanded="${isOpen}">
          <span class="chevron" aria-hidden="true"></span><span class="grade-name">${esc(gradeName(g) || 'Product not named')}</span>${verdictChip}${g.variant ? ' <span class="chip chip-neutral chip-small">variant</span>' : ''}${isProduct(g) ? '' : ' <span class="chip chip-neutral chip-small">reference</span>'}
          ${keys(g) ? `<span class="grade-keys">${esc(keys(g))}</span>` : ''}</button>
        ${c.tested ? `<button type="button" class="btn btn-sm choose-btn" data-choose="${esc(g.id)}" aria-pressed="${c.chosen.has(g.id)}"
          title="${c.chosen.has(g.id) ? 'Chosen: its decision brief is under Save / share. Press to remove it.' : 'Choose this product: its decision brief, print settings and test plan go under Save / share, saved with the scenario'}">${c.chosen.has(g.id) ? '✓ Chosen' : 'Choose this product'}</button>` : ''}
      </div>
      <div class="grade-body" data-grade-body="${esc(g.id)}"${isOpen ? '' : ' hidden'}>
        ${c.tested && j?.verdict === 'FAIL' && j.failedBy?.length ? `<div class="fact-why"><b>Fails:</b> ${esc(failText(j.failedBy))}</div>` : ''}
        ${c.tested && j?.verdict === 'UNKNOWN' ? unsettled(j, requirementOf) : ''}
        ${c.tested && j ? stateNote(j) : ''}
        ${printCard(g)}
        ${productValues(g, c)}
        ${makerSays(g, c)}
        ${docs.length ? `<div class="grade-docs"><span class="shared-head">Sources</span> ${docs.map((sid) => `<button type="button" class="link-btn" data-open-source="${esc(sid)}" title="Opens this document in Sources">${esc(sourceName(c.sourceById.get(sid), sid))}</button>`).join('; ')}</div>` : ''}
        <details class="grade-more"><summary>Product details</summary><dl class="kv">
          <dt>Manufacturer</dt><dd>${esc(g.manufacturer ?? '')}</dd>
          <dt>Product</dt><dd>${esc(g.product ?? '')}${ids(['Product', g.id])}</dd>
          <dt>Composition</dt><dd>${esc(g.composition ?? '')}</dd>
          ${g.variant ? `<dt>Variant</dt><dd>${esc(g.variant)}. Its values describe this product, not the polymer in general, so they are left out of the material's range.</dd>` : ''}
          <dt>Availability</dt><dd>${esc(g.availability ?? '')}</dd>
          <dt>Certifications</dt><dd>${esc(g.certifications ?? '')}</dd>
          ${SPEC_COLOUR.test((g.colourCaveat ?? '').trim()) ? `<dt>Colour tested</dt><dd>Measured on the <b>${esc(g.colourCaveat.trim())}</b> version. Other colours may differ.</dd>` : ''}
        </dl></details>${gradeEstimateLines(g, c)}
      </div></div>`;
    };
    const firstMaker = passing[0]?.manufacturer ?? grades.find((g) => typicalOf.has(g.id))?.manufacturer ?? null;
    // The products that meet every requirement first, the first of them open with its settings and values (the review
    // of 2026-09-27, F09): that is the answer to "which product". The material's spread and its makers' coverage follow,
    // one press away, open where nothing was asked.
    const context = `<details class="spread-context"${passing.length ? '' : ' open'}><summary>Across its products: median and range, and what their makers say</summary>
      ${spreadTable(m, c)}${makersSayCounts(m, c)}</details>`;
    return (passing.length ? makerBlock('Meet all your requirements', passing.length, 'product', passing.map((g, i) => block(g, i === 0)).join(''), { open: true, cls: 'maker-block pass-block' }) : '')
      + context
      + '<div class="note">Colours are not tracked here. Pigment can change strength and stiffness, and a data sheet\'s values are for the colour it tested.</div>'
      + searchBox('a product or maker') + groupByMaker(grades, null).map(([maker, group]) => makerBlock(maker, group.length, 'product', group.map((g) => block(g, !passing.length && group.length === 1 && maker === firstMaker)).join(''), { open: !passing.length && maker === firstMaker })).join('');
  }

  if (tab === 'Price') {
    if (!prices.length) return empty('Price');
    // A listing with no price per kilogram says why in words, and a quarantined listing's reason sits under its row.
    const noPrice = (p) => `${p.retailer}${p.foreign ? ` (${p.market})` : ''} lists it${Number.isFinite(p.displayedPrice) ? ` at ${fmtNumber(p.displayedPrice)} ${p.currency ?? 'CAD'}` : ''} (seen ${p.accessDate}), `
      + `but no regular price per kilogram was recorded, so it is not used. ${stated(p.basis) ? `${p.basis.replace(/[.\s]*$/, '')}.` : ''}${stated(p.notes) ? ` ${p.notes}` : ''}`;
    const quarantineWhy = (p) => [String(p.basis ?? '').replace(/^quarantined:\s*/i, ''), p.notes].filter(stated).map((t) => t.replace(/[.\s]*$/, '')).join('. ');
    // A foreign listing shows what its page printed and how it became CAD per kg (D113): its own price per kg before
    // VAT, the rate and its date. It lists the product in no Canadian shop.
    const foreignWhy = (p) => `${p.retailer} (${p.market}) lists ${fmtNumber(p.listPrice)} ${p.currency}${p.vatPercent != null ? ` including ${fmtNumber(p.vatPercent)}% VAT` : ''} for ${fmtNumber(p.netMassKg)} kg: `
      + `${fmtNumber(p.regularPerKgNative)} ${p.currency}/kg before VAT, × ${p.fx.cadPerUnit} CAD per ${p.currency} (Bank of Canada, ${p.fx.date}). `
      + 'Used only where no Canadian shop in the sample sells the product. Shipping, duty and Canadian stock are not included.';
    const used = (p) => (p.headlineSample ? 'yes' : explainButton('no', p.quarantined ? 'A different product; not used.' : p.regularPerKg === null ? 'No regular price per kilogram was recorded.' : 'Another listing of this product is used instead: Canadian listings come before foreign ones.', { cls: 'missing', head: 'Not used for the price' }));
    return `<div class="note">The material's price is the median of its products' prices, and a product's price is the median of its
      listings: Canadian where it has any, otherwise foreign ones converted to CAD (¤). ${esc(priceSampleWords(db.meta))}. A struck-through listing is a different product and is not used.</div>
      ${scrollTable(`<table class="grid price-table"><thead><tr>
      <th class="retailer">Retailer</th><th class="variant">Listing</th><th class="num">kg</th><th class="num">CAD/kg</th><th>Stock</th><th>Used</th></tr></thead>
      <tbody>${prices.map((p) => `<tr data-price="${esc(p.id)}"${p.quarantined ? ` class="quarantined" title="${esc(quarantineWhy(p))}"` : ''}>
        <td class="retailer">${esc(p.retailer)}${p.quarantined ? ' <span class="chip chip-FAIL chip-small">different product</span>' : ''}${ids(['Listing', p.id])}</td><td class="variant">${esc(p.variant ?? '')}</td>
        <td class="num">${fmtNumber(p.netMassKg)}</td>
        <td class="num">${p.regularPerKg !== null && p.fx ? `${fmtNumber(p.regularPerKg)} ${explainButton('¤', foreignWhy(p), { cls: 'fx-mark', head: `Converted from ${p.currency}`, label: `Converted from ${p.currency}` })}`
          : p.regularPerKg !== null ? fmtNumber(p.regularPerKg)
          // The price the shop showed, per kilogram, marked as a sale price: it backs no value, and the button says why.
          : Number.isFinite(p.displayedPrice) && p.netMassKg > 0
            ? `${fmtNumber(p.displayedPrice / p.netMassKg)}${p.currency && p.currency !== 'CAD' ? ` ${esc(p.currency)}` : ''} ${explainButton('sale price', noPrice(p), { cls: 'missing offer-price', head: 'Sale price, not the regular price' })}`
            : explainButton('no price', noPrice(p), { cls: 'missing no-price', head: 'Listed without a price' })}</td>
        <td>${esc(p.stock)}</td><td>${used(p)}</td></tr>
        ${p.quarantined ? `<tr class="quarantine-why"><td colspan="6"><span class="why-text"><b>Not used:</b> ${esc(quarantineWhy(p) || 'a different product')}.</span></td></tr>` : ''}`).join('')}</tbody></table>`)}`;
  }

  if (tab === 'Evidence') {
    const docs = [...c.documents];
    const leadingMaker = leadMaker(m, c);
    const publisher = ([sid]) => c.sourceById.get(sid)?.publisher ?? 'Publisher not named';
    const blocks = docs.length
      ? searchBox('a document or publisher') + groupBy(docs, publisher, leadingMaker).map(([maker, group]) => makerBlock(maker, group.length, 'document',
        group.map(([sid, d]) => `<div data-search-item="${esc([sourceName(c.sourceById.get(sid), sid), maker, sid].join(' '))}">${sourceBlock(sid, d, c)}</div>`).join(''),
        { open: maker === leadingMaker || group.some(([sid]) => sid === c.highlightSource) })).join('')
      : '<div class="gap">No document is on file for this material.</div>';
    // Known gaps: what is missing, uncertain or contested, in the reviewer's words. A row that says only that evidence
    // exists is what the other tabs already show, so it is left out; a reviewer's note on a settled domain is kept, collapsed.
    const gaps = cov.filter((r) => GAP_STATUS.has(r.status));
    const notes = cov.filter((r) => !GAP_STATUS.has(r.status) && !r.derived);
    const gapRow = (r) => `<div class="evidence-row cov-row">
        <div><strong>${esc(r.domain === 'Sparse properties' ? 'Rarely published properties' : r.domain)}</strong> ${chip(statusToState(r.status), r.status)}${r.derived ? '' : ids(['Coverage record', r.id])}</div>
        <div>${longText(r.finding)}</div></div>`;
    return `${blocks}
      <h3 class="sec" id="known-gaps" tabindex="-1">Known gaps</h3>
      ${gaps.length ? gaps.map(gapRow).join('') : '<div class="gap">No gap, limitation or conflict is recorded for this material.</div>'}
      ${notes.length ? `<details class="grade-more review-notes"><summary>Review notes (${notes.length})</summary>${notes.map(gapRow).join('')}</details>` : ''}`;
  }
  return '';
}

/**
 * What the header's identity line does not say about the material, in a sentence: that it is a support, an elastomer,
 * a foaming grade or a variant whose filler is not disclosed. The filler itself is in the header.
 */
function describeFacets(m) {
  const bits = [];
  if (m.facets.reinforcement.value === 'foaming') bits.push('A foaming filament, for lightweight parts.');
  if (m.facets.reinforcement.value === 'undisclosed') bits.push('A commercial variant whose filler is not disclosed.');
  if (m.facets.supportMaterial.value) bits.push('A support or interface material, not a build material.');
  if (m.facets.flexible.value) bits.push('A flexible elastomer.');
  return bits.join(' ');
}

const statusToState = (s) =>
  s === 'Evidence recorded' || s === 'Resolved' ? 'PASS'
  : s === 'Gap' ? 'UNKNOWN'
  : s === 'Conflict' || s === 'Quarantined' ? 'FAIL' : 'INDETERMINATE';

const gateChip = (g, what) => {
  if (!g) return '';
  const v = gateVerdict(g.verdict);
  return explainButton(esc(v.short), g.reason, { cls: `chip chip-${v.state} chip-small`, head: `${what}, against the H2C's ${h2cLimit(what.toLowerCase()) ?? ''} °C: ${v.word.toLowerCase()}` });
};
