// Material detail drawer.
//
// Tabs are adaptive, not a fixed skeleton. A section with no data does not render blank and it
// does not render as zero: it renders the coverage record that explains the absence. With fracture
// toughness at zero records and compression and CTE at one each, a fixed skeleton would produce
// mostly empty pages. Showing the gap turns that into information.

import { renderValue, chip, esc, fmtNumber, fmtRange, estimateDisplay, wireEvidence, explainButton, scrollTable, markTableOverflow, keepInView } from './format.js';
import { renderWhy } from './explain.js';
import { materialName, gateVerdict, CHAMBER_GUIDANCE, ESTIMATE_STRENGTH, ESTIMATE_PRECISION, screenRangeText, POLICY_LABELS } from './labels.js';
import { REGISTRY, propertiesInDomain, propertyApplies } from './registry.js';
import { evidenceSummary } from '../engine/coverage.js';

/** A temperature window, or nothing if none was published. A zero floor is the build's "ambient". */
const range = (r) => (!r ? null
  : r.min === r.max ? `${fmtNumber(r.max)} °C`
  : r.min === 0 ? `up to ${fmtNumber(r.max)} °C`
  : `${fmtNumber(r.min)}–${fmtNumber(r.max)} °C`);

const stated = (v) => v && !/^(not published|not applicable|not stated|not recorded|n\/a)\b/i.test(String(v).trim());

const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** An internal record ID, kept for anyone tracing a value back to the tables, and set small beside what it names. */
const tag = (id, what = '') => (id ? `<span class="tag" title="${esc(what ? `${what} ID in the database` : 'ID in the database')}">${esc(id)}</span>` : '');

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
  return stated(url) ? '<span>the original is a local file, not linked</span>' : '';
}

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
 * The tabs, by internal key and by the name on screen. The source-grouped tab is called Sources, and counts sources: as
 * "Evidence 22" it counted the same measurements Mechanical and Thermal count, under a name that said nothing of how it
 * differs from them. Its key stays "Evidence", which openMeasurement, links and saved scenarios use.
 */
const TABS = [
  ['Overview', 'Overview'], ['Mechanical', 'Mechanical'], ['Thermal', 'Thermal'], ['Printing', 'Printing'],
  ['Environment', 'Environment'], ['Grades', 'Grades'], ['Price', 'Price'], ['Evidence', 'Sources'], ['Coverage', 'Coverage'],
];

/**
 * One line under the tab strip, saying what the open tab lists and what its number counts. Four tabs counted four
 * different things (measurements, profiles, records, observations) with nothing on screen to say which.
 */
const TAB_HELP = {
  Overview: (n, c) => (c.tested
    ? 'How this material fares against your requirements, whether the H2C can print it, and its key numbers.'
    : 'What this material is, its key numbers, and whether the H2C can print it.'),
  Mechanical: (n) => (n ? `${plural(n, 'mechanical measurement')} on record, grouped by the source that published them.` : 'No mechanical measurement is on record for this material.'),
  Thermal: (n) => (n ? `${plural(n, 'thermal measurement')} on record, grouped by the source that published them.` : 'No thermal measurement is on record for this material.'),
  Printing: (n) => (n ? `${plural(n, 'print profile')}: the temperatures, nozzle, drying and feed each source gives.` : 'No print profile is on record for this material.'),
  Environment: (n, c) => (n ? `${plural(n, 'record')} of how it behaves in chemicals, moisture and other exposure, by category${c.poly?.length ? `, ${c.poly.length} of them the base polymer's published behaviour` : ''}.` : 'No record of chemical, moisture or other exposure is on file for this material.'),
  Grades: (n) => (n ? `${plural(n, 'commercial grade')} recorded under this material.` : 'No commercial grade is recorded under this material.'),
  Price: (n) => (n ? `${plural(n, 'Canadian price observation')} from the sampled retailers.` : 'No sampled Canadian retailer listed this material.'),
  Evidence: (n, c) => (n ? `${plural(n, 'source')} behind this material's ${plural(c.ms.length, 'measurement')}, each with what it published and a link to the original.` : 'No source has published a measurement of this material.'),
  Coverage: (n) => (n ? `${plural(n, 'coverage record')}: what the database holds for this material and what it does not, by domain.` : 'No coverage record is on file for this material.'),
};

/**
 * What an empty tab says. A dashed "Not published" box had been a dead end: it now says nothing is recorded, gives the
 * coverage record's reason where one exists, and offers the Coverage tab, where every domain's state is listed.
 */
function nothingRecorded(records, { toCoverage }) {
  return `<div class="gap empty-tab"><strong>Nothing recorded for this material.</strong>
    ${records.length
      ? records.map((r) => `<div class="empty-why">${esc(r.domain)}, ${esc(r.status.toLowerCase())}: ${esc(r.finding)}</div>`).join('')
      : '<div class="empty-why">No coverage record says why.</div>'}
    ${toCoverage ? '<button type="button" class="btn btn-sm" data-tab-link="Coverage">See what is recorded, in Coverage</button>' : ''}</div>`;
}

// ------------------------------------------------------------------ measurements, grouped by source

/** The conditions a measurement is taken under that a source usually states once for a whole sheet. */
const CONDITION_FIELDS = [
  ['Post-processing', 'postProcessing'], ['Test temperature', 'testTemperature'],
  ['Print parameters', 'printParameters'], ['Notes', 'notes'],
];

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

function measurementRow(x, c, { shared = new Map(), inSources = false } = {}) {
  const cond = [
    x.direction !== 'not-applicable' ? x.direction : null,
    x.specimenType?.startsWith('Not published') ? 'specimen not stated' : x.specimenType,
    x.standardText && x.standardText !== 'Not applicable' ? x.standardText : null,
    x.moisture && x.moisture !== 'Not published' ? x.moisture : null,
    x.notch === 'Notched' || x.notch === 'Unnotched' ? x.notch : null,
  ].filter(Boolean).join(' · ');
  // The conditions that decide whether a number applies to your part: annealed or as printed, at what temperature,
  // printed how. A condition most measurements from this source share is said once, above them (sourceBlock); this one
  // says its own only where it differs, and says it states none where the others do.
  const more = CONDITION_FIELDS.flatMap(([k, f]) => {
    if (!shared.has(f)) return stated(x[f]) ? [[k, x[f]]] : [];
    if (!stated(x[f])) return [[k, 'Not stated for this measurement']];
    return String(x[f]).trim() === shared.get(f) ? [] : [[k, x[f]]];
  });
  // A qualitative result ("No break") is what the source said, so it is shown in its own words.
  const v = x.numeric
    ? `${fmtNumber(x.value)}${x.uncertainty ? ' ± ' + fmtNumber(x.uncertainty) : ''} ${esc(x.unit)}`
    : x.qualitative && x.raw?.value
      ? `${esc(x.raw.value)} <span class="missing">(stated in words, not a number)</span>`
      : `<span class="missing">${esc(x.dataStatus)}</span>`;
  const op = x.operator === '>' || x.operator === '<' ? esc(x.operator) + ' ' : '';
  const s = c.sourceById.get(x.sourceId);
  // Labelled parts, and the source as a way to it: the footer had read "V000554 · G027-01 · B-abs-filament-TDS · p. 2",
  // three codes and no link. In the Sources tab the source is the heading above, so its place on the sheet is enough.
  const source = inSources
    ? (x.locator ? ` · on the source: ${esc(x.locator)}` : '')
    : ` · source: <button type="button" class="link-btn" data-open-source="${esc(x.sourceId)}" title="Opens this source in the Sources tab">${esc(sourceName(s, x.sourceId))}</button>${x.locator ? `, ${esc(x.locator)}` : ''}`;
  return `<div class="evidence-row${c.highlight === x.id ? ' target' : ''}" data-mid="${esc(x.id)}">
    <div><strong>${esc(x.property)}</strong> — ${op}${v}
      ${x.corrected ? '<span class="chip chip-neutral" style="font-size:10px">transcription corrected</span>' : ''}
      ${x.quarantined ? '<span class="chip chip-FAIL" style="font-size:10px">quarantined</span>' : ''}
      ${x.implausible ? explainButton('physically implausible', 'The source publishes this number, but physics rules it out; see Notes. It decides nothing.', { cls: 'chip chip-FAIL chip-small', head: 'Physically implausible' }) : ''}</div>
    ${cond ? `<div class="cond">${esc(cond)}</div>` : ''}
    ${more.length ? `<dl class="kv small cond-more">${more.map(([k, t]) => `<dt>${esc(k)}</dt><dd>${longText(t)}</dd>`).join('')}</dl>` : ''}
    <div class="cond meas-foot">Measurement ${esc(x.id)} · grade ${esc(x.gradeId)}${source}</div>
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

/**
 * One source's measurements. A condition most measurements in the block state in the same words is said once, at the
 * top: ABS repeated one 60-word print-parameter paragraph under all 20 of its measurements. A measurement whose wording
 * differs keeps its own, and one that states none says so. A property the sheet names without a value goes on one line
 * at the end.
 */
function sourceBlock(sid, list, c, { inSources }) {
  const s = c.sourceById.get(sid);
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
  const exceptions = entries.some((x) => [...shared].some(([f, t]) => String(x[f] ?? '').trim() !== t));
  const head = inSources
    ? `<h3 class="src-title" tabindex="-1">${esc(sourceName(s, sid))} ${tag(sid, 'Source')}</h3>
       <div class="src-meta">${[s?.sourceClass, stated(s?.accessDate) ? `accessed ${s.accessDate}` : null].filter(stated).map(esc).join(' · ')}${originalLink(s) ? ` · ${originalLink(s)}` : ''}</div>
       ${[s?.sourceNote, s?.accessNote].filter(stated).length ? `<div class="src-meta">${[s?.sourceNote, s?.accessNote].filter(stated).map(esc).join(' ')}</div>` : ''}`
    : `<div class="src-head">From <button type="button" class="link-btn" data-open-source="${esc(sid)}" title="Opens this source in the Sources tab">${esc(sourceName(s, sid))}</button> ${tag(sid, 'Source')}</div>`;
  const sharedHtml = shared.size
    ? `<div class="shared-conds"><div class="shared-head">For every measurement below from this source${exceptions ? ', except where one says otherwise' : ''}</div>
        <dl class="kv small cond-more">${CONDITION_FIELDS.filter(([, f]) => shared.has(f)).map(([k, f]) => `<dt>${esc(k)}</dt><dd>${longText(shared.get(f))}</dd>`).join('')}</dl></div>`
    : '';
  const namedHtml = named.length
    ? `<div class="np-line">Also on this sheet, not published: ${named.map((x) => `<span class="np-item${c.highlight === x.id ? ' target' : ''}" data-mid="${esc(x.id)}" title="Measurement ${esc(x.id)}">${esc(inSentence(x.property))}${x.direction && !['not-applicable', 'unknown'].includes(x.direction) ? ` (${esc(x.direction)})` : ''}</span>`).join(', ')}.</div>`
    : '';
  return `<section class="src-block${c.highlightSource === sid ? ' target' : ''}" data-source-block="${esc(sid)}">
    ${head}${sharedHtml}
    ${entries.map((x) => measurementRow(x, c, { shared, inSources })).join('')}
    ${namedHtml}
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
  const scope = (name) => (name === m.name ? 'as a family, not specific to one grade' : `as a family, not specific to ${m.name} or its grades`);
  // The record's ID is kept in the title only: the Overview is for reading, and the record is listed, with its ID, in
  // the Environment tab of the material it belongs to.
  const cite = (r) => `<span class="fine-src" title="Evidence record ${esc(r.id)}">source: ${esc(sourceName(c.sourceById.get(r.sourceId), r.sourceId))}</span>`;
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
    // Good for, from the family's own Best uses record, said to be the family's.
    const text = [g.bestUses.prose, ...g.goodFor.map((r) => r.finding)].filter(Boolean);
    if (text.length) {
      out.push(`<h3 class="sec">Good for</h3><p>${text.map(esc).join(' ')}</p>`
        + g.goodFor.map((r) => `<p class="fine">Guidance for ${esc(g.owner(r))} ${esc(g.scope(g.owner(r)))}; ${g.cite(r)}.</p>`).join(''));
    }
  } else if (stated(m.bestUses)) {
    out.push(`<h3 class="sec">Good for</h3><p>${esc(m.bestUses)}</p>`);
  }
  // What is true of this material, then the caveat that is true of every one of them. The second was stored on 82
  // materials until m45; it is a Method rule now, shown once here so a reader still meets it (D70).
  const own = g.limitations ? g.limitations.prose : stated(m.limitations) ? m.limitations : '';
  const standing = c.db.method.find((r) => r.topic === 'Transferable allowables')?.rule;
  if (own || standing) {
    out.push(`<h3 class="sec">Watch out for</h3>${own ? `<p>${esc(own)}</p>` : ''}${standing ? `<p class="fine">${esc(standing)}</p>` : ''}`);
  }
  if (g.guidance.length || g.unresolved.length) {
    const owners = [...new Set(g.guidance.map(g.owner))];
    out.push(`<h3 class="sec">Family guidance</h3>
      ${owners.map((name) => `<p class="fine family-scope">Printer guidance for ${esc(name)} ${esc(g.scope(name))}.</p>
        <ul class="family-guidance">${g.guidance.filter((r) => g.owner(r) === name).map((r) => `<li><b>${esc(r.topic)}:</b> ${esc(r.finding)}
          <span class="fine-line">${g.cite(r)}</span></li>`).join('')}</ul>`).join('')}
      ${g.unresolved.length ? `<p class="fine unresolved">Also referred to, but not found in this database: ${g.unresolved.map(esc).join(', ')}.</p>` : ''}`);
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
  return `<h3 class="sec">From the base polymer ${esc(poly[0].polymerId)}</h3>
    <div class="note">In ${poly.length === 1 ? 'this category' : `these ${poly.length} categories`} no source tested this material or its grades, so the
      published behaviour of the neat ${esc(poly[0].polymerId)} resin is shown instead, from a resin producer's or handbook reference. It is not a test of
      this grade: fillers, pigments and printing change it. It never passes a requirement${screens.length
        ? `; where the reference reports the polymer attacked or dissolved (${screens.map((p) => p.categoryLabel.toLowerCase()).join(', ')}), it screens this material
      out of that requirement with "Use estimates and polymer data" on, and the SCREENED chip brings it back`
        : ', and none of these can screen it out'}.</div>`
    + poly.map((p) => `
      <h4 class="block-title">${esc(p.categoryLabel)}: ${esc(verdictWords(p.verdict))} <span class="chip chip-neutral chip-small">polymer-level</span> ${tag(p.id, 'Inferred record')}</h4>
      ${p.agents.map((a) => `<div class="evidence-row env-row" data-polymer-row="${esc(a.id)}">
        <div><strong>${esc(a.agent)}</strong> · ${esc(verdictWords(a.verdict))}${a.screens ? ' · can screen' : ''}</div>
        <div>${esc(a.finding)}</div>
        ${a.conditions ? `<div class="cond">${esc(a.conditions)}</div>` : ''}
        ${a.notes ? `<div class="cond">${esc(a.notes)}</div>` : ''}
        <div class="cond meas-foot">${esc(p.evidenceType)} for ${esc(p.polymerId)}, not this grade · source: ${esc(sourceName(c.sourceById.get(a.sourceId), a.sourceId))}${a.locator ? `, ${esc(a.locator)}` : ''} ${tag(a.id, 'Polymer row')}</div>
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
    + `${i.measurementId ? ` <span style="font-family:var(--mono)">${esc(i.measurementId)}</span>` : ''}${i.from ? `, ${esc(i.from)}` : ''}`;
  const evidence = e.evidence.length
    ? `<ul class="est-evidence">${e.evidence.map((ev) => `<li>${ev.items.map(item).join('; ')}
        ${ev.sameGrade ? '<span class="tag">this grade</span>' : `<span class="tag">grade ${esc(ev.gradeId)}</span>`}
        → about ${d.num(ev.converted)} ${esc(d.unit)} as this headline. <span class="fine">${esc(ev.conversion)}.</span>
        ${ev.conflict ? '<b>Contradicts the rest of the evidence and is down-weighted.</b>' : ''}</li>`).join('')}</ul>`
    : '';
  const bounds = e.bounds?.length ? ` Limited by ${e.bounds.map((b) => esc(b.why)).join('; ')}.` : '';
  const screen = e.canScreen
    ? ` It may screen this material out of ${esc(screenRangeText(e, d.num, d.unit))}.`
    : ' It screens nothing.';
  return `<details class="est-card" data-estimate="${esc(key)}">
    <summary><span class="est-sum"><b>${esc(label)}</b> <span class="est est-${esc(e.precision)}">~${d.lo}–${d.hi} ${esc(d.unit)}<span class="est-mark">†</span></span>
      · ${esc(e.precision)} precision · ${esc(basis)}</span><span class="est-sum-toggle" aria-hidden="true"></span></summary>
    <div class="est-span">${d.lo} – ${d.hi} ${esc(d.unit)} <span class="fine">likely (${pct(e.levels.likely)}), centred on ${d.centre}${d.inColumn ? `; ${d.inColumn[0]}–${d.inColumn[1]} ${esc(d.columnUnit)} in the table` : ''}</span></div>
    <div class="est-basis">Plausibly ${d.plausible[0]} – ${d.plausible[1]} ${esc(d.unit)} (${pct(e.levels.plausible)}). Precision: <b>${esc(e.precision)}</b>, ${esc(ESTIMATE_PRECISION[e.precision])}.
      ${esc(s.title)}${e.strength !== 'family' ? `; this material's own evidence carries about ${pct(e.ownShare)} of the estimate` : ''}. Family: ${esc(e.family)}.${bounds}
      ${e.sharedWith ? `Its representative product is also recorded under ${esc(e.sharedWith.name)}, so both show the same estimate.` : ''}
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
    <p class="fine est-group-note">Open an estimate for what it rests on. The ranges are calibrated: when each measured value in the
      database is hidden and predicted from the rest, likely ranges like these contain it ${pct(levels.likely)} of the time and
      plausible ranges ${pct(levels.plausible)}. An estimate is never enough to pass a requirement.${anyScreen
        ? ` With "${esc(POLICY_LABELS.exploration)}" and Use estimates on, one may screen this material out of a requirement its range wholly fails, unless one of the material's own measurements could meet it; each estimate says which.`
        : ''}</p>`;
}

/** Said under a Key number whose estimate reads in a smaller unit than its table column: "in MPa, where the table's column is in GPa". */
const unitNote = (e) => {
  const d = estimateDisplay(e, { ownUnit: true });
  return d.rescaled ? `; in ${esc(d.unit)}, where the table's column is in ${esc(d.columnUnit)}` : '';
};

/** An estimated nozzle or bed window, where nothing is published. It decides nothing, and shows only with estimates. */
function windowEstimate(est, what, showEstimates) {
  if (!est || !showEstimates) return '';
  return `<div class="est-card"><h4>${esc(what)}: estimated, not published</h4>
    <div class="est-span">${fmtRange(est.lo, est.hi, ' – ')} ${esc(est.unit)}</div>
    <div class="est-basis">No source publishes this window for the material: ${esc(est.basis)} (${est.peers.map((p) => `${esc(p.name)} ${fmtNumber(p.min)}–${fmtNumber(p.max)}`).join(', ')}).
      A starting point to verify, not a print setting, and it changes no result.</div></div>`;
}

/**
 * What the print profiles record about feeding through an AMS, in their own words. It used to be a verdict chip that
 * read "Not established" for every material, styled like the checks above it that are evaluated; these fields are
 * recorded text, not a verdict, so they are quoted and nothing is inferred from them.
 */
function amsSummary(profiles) {
  if (!profiles.length) return 'Not published. No print profile is on record for this material.';
  // Each distinct wording once, with the grades that carry it when the profiles disagree.
  const wordings = (key) => {
    const by = new Map();
    for (const p of profiles) {
      const t = String(p.routing?.[key] ?? '').trim();
      if (stated(t)) by.set(t, [...(by.get(t) ?? []), p.gradeId]);
    }
    return by;
  };
  const quote = (by) => [...by].map(([t, grades]) => `"${t}"${grades.length < profiles.length ? ` (${[...new Set(grades)].join(', ')})` : ''}`).join('; ');
  const published = wordings('amsPublished');
  const pro = wordings('ams2Pro');
  const ht = wordings('amsHT');
  const parts = [published.size
    ? `Published AMS compatibility: ${quote(published)}.`
    : 'Not published: no source states AMS compatibility for this material.'];
  if (pro.size && quote(pro) === quote(ht)) parts.push(`Recorded for AMS 2 Pro and AMS HT: ${quote(pro)}.`);
  else {
    if (pro.size) parts.push(`Recorded for AMS 2 Pro: ${quote(pro)}.`);
    if (ht.size) parts.push(`Recorded for AMS HT: ${quote(ht)}.`);
  }
  parts.push(profiles.length === 1 ? 'The Printing tab has the profile.' : 'The Printing tab has each profile.');
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
          <div class="sub" style="margin-top:5px">${f.kind === 'alias' ? 'An alias' : 'A family entry'} · H2C: ${esc(m.h2cStatus)}</div>
        </div>
        <button class="icon-btn" id="drawer-close" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="drawer-body">
      <p class="lede">${f.kind === 'alias'
        ? `${esc(m.name)} is another name for the material below. It has no product or values of its own.`
        : `${esc(m.name)} is a family, not one material. It has no product or values of its own, and it is never a candidate: each product is recorded once, under the material it is.`}</p>
      <p class="fine family-no-tabs">No tabs here: measurements, print profiles, grades and prices are recorded under each ${f.kind === 'alias' ? 'material' : 'member'}, so open ${f.members.length === 1 ? 'it' : 'one'} below for its evidence.</p>
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

  const counts = {
    Overview: null,
    Mechanical: ms.filter((x) => tabProperties('Mechanical', m).includes(x.property)).length,
    Thermal: ms.filter((x) => tabProperties('Thermal', m).includes(x.property)).length,
    Printing: profiles.length,
    // What the tab lists. It used to count only the records in categories the filters use, so ABS read 8 over a tab
    // of 13 records and BVOH read 0 over one; the tab itself now says how many of them the filters can use. A
    // polymer-level record is listed there too, under its own heading, and is counted.
    Environment: ev.length + poly.length,
    Grades: grades.length,
    Price: prices.length,
    // Sources, not measurements: Mechanical and Thermal already count those.
    Evidence: new Set(ms.map((x) => x.sourceId)).size,
    Coverage: cov.length,
  };
  const tab = drawerTab in counts ? drawerTab : 'Overview';
  const pinned = state.scenario.shortlist.includes(m.id);
  const c = {
    m, ms, ev, poly, cov, profiles, grades, prices, evaluation, summary, db, counts,
    tested: !!evaluation?.results.length,
    highlight: state.highlightMeasurement, highlightSource: state.highlightSource,
    showEstimates: !!ctx.showEstimates, policy: state.scenario.unknownPolicy,
    sourceById: ctx.sourceById ?? new Map(db.sources.map((s) => [s.id, s])),
    evidenceById: ctx.evidenceById ?? new Map(db.evidence.map((e) => [e.id, e])),
    materialById: new Map(db.materials.map((x) => [x.id, x])),
    gradeById: new Map(db.grades.map((g) => [g.id, g])),
  };

  host.innerHTML = `
  <div class="drawer" role="dialog" aria-label="${esc(m.name)} detail">
    <div class="drawer-head">
      <div style="display:flex;align-items:start;gap:10px">
        <div style="flex:1">
          <h2>${esc(materialName(m.name).primary)}</h2>
          ${materialName(m.name).aka ? `<div class="sub">also called ${esc(materialName(m.name).aka)}</div>` : ''}
          <div class="sub">${esc(m.fullName ?? '')}</div>
          <div class="sub" style="margin-top:5px">
            ${esc(m.family)} · ${esc(m.modifier)} · H2C: ${esc(m.h2cStatus)}
            ${m.excluded ? ' ' + chip('FAIL', 'Excluded from H2C scope') : ''}
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
  // Below 1100 px the nine tabs are one strip that scrolls sideways, redrawn on every change: keep the open one in sight.
  keepInView(host.querySelector('.drawer-tabs'), host.querySelector('.drawer-tabs [aria-selected="true"]'));

  // Opening the tab was never enough. PA6-CF has 21 measurements grouped by source, so "one click
  // to the evidence" was one click plus a hunt. Take the reader to the row, open whatever of it is collapsed, and mark
  // it; a source opened from a footer is taken to the same way.
  const target = (state.highlightMeasurement && host.querySelector(`[data-mid="${CSS.escape(state.highlightMeasurement)}"]`))
    || (state.highlightSource && host.querySelector(`[data-source-block="${CSS.escape(state.highlightSource)}"]`));
  if (target) {
    for (const d of target.querySelectorAll('details')) d.open = true;
    for (let d = target.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
    // The conditions its source states once for every measurement are part of what the reader came for.
    if (state.highlightMeasurement) for (const d of target.closest('.src-block')?.querySelectorAll('.shared-conds details') ?? []) d.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: state.highlightSource ? 'start' : 'center', behavior: 'smooth' }));
  }

  host.querySelector('#drawer-close').addEventListener('click', actions.closeDrawer);
  host.querySelector('#drawer-pin').addEventListener('click', () => actions.togglePin(m.id));
  host.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => actions.setDrawerTab(b.dataset.tab)));
  host.querySelectorAll('[data-tab-link]').forEach((b) => b.addEventListener('click', () => actions.setDrawerTab(b.dataset.tabLink)));
  host.querySelectorAll('[data-open-source]').forEach((b) => b.addEventListener('click', () => actions.openSource(b.dataset.openSource)));
  wireEvidence(host, actions);
}

function tabBody(tab, c) {
  const { m, ms, ev, poly, cov, profiles, grades, prices, evaluation, summary, db, showEstimates, policy } = c;
  const covFor = (t) => cov.filter((r) => (COVERAGE_FOR_TAB[t] ?? []).includes(r.domain));
  const empty = (t) => nothingRecorded(covFor(t), { toCoverage: cov.length > 0 });

  if (tab === 'Overview') {
    // Every headline, labelled and explained exactly as the filter rail and the table label it.
    const HEAD = REGISTRY.headlines.map((h) => [h.labels.plain, h.key, h.labels.hint]);

    // The section that answers "can I print this" now also answers "what do I set it to". The
    // numbers were one tab away, which is one tab too many for the first question anyone asks.
    const gateLine = (g, label, window, extra = '') => {
      if (!g) return '';
      const { state, word } = gateVerdict(g.verdict);
      return `<div class="fact"><span class="chip chip-${state}">${esc(word)}</span>
        <div><b>${esc(label)}</b>${window ? ` ${explainButton(`recorded ${esc(window)}`, 'The range across every recorded print profile, not one setting to dial in. The Printing tab has each profile.',
          { cls: 'set-to', head: 'Recorded across profiles', action: 'printing', id: m.id })}` : ''}
          <br><span class="fact-why">${esc(g.reason)}</span>${extra}</div></div>`;
    };
    // The chamber can be answered three ways: a temperature, a statement in words, or neither. An
    // estimated band is shown only in the third and second cases, and never changes the verdict.
    const guidance = m.print?.chamberGuidance;
    // Confirmed only means measured evidence only, in the drawer as in every lens: the research band is an estimate.
    const est = showEstimates ? m.print?.chamberEstimate : null;
    const chamberExtra = `${!m.print?.chamberC && guidance
        ? `<br><span class="fact-why">In words: ${esc(CHAMBER_GUIDANCE[guidance.state]?.title ?? guidance.label)}</span>` : ''}${est
        ? `<div class="est-card"><h4>Chamber: estimated, not published</h4>
            <div class="est-span">${fmtRange(est.lo, est.hi, ' – ')} ${esc(est.unit)}</div>
            <div class="est-basis">No source publishes a chamber temperature for this material. The 2026-09-13
              research places it in this band, based on ${esc(est.basis)}. It is not a print setting, and it
              changes no result: a band can neither clear nor fail the chamber question.${est.caution ? ` ${esc(est.caution)}` : ''}</div>
          </div>` : ''}`;

    const printable = m.excluded
      ? `<div class="callout bad"><b>Outside the printer's envelope.</b> This material is in the
          database for completeness but is not treated as H2C-printable.</div>`
      : '';

    // With estimates hidden the drawer shows none, as the table does. It says where they are rather than leaving a
    // reader who saw one in Include uncertain to wonder where it went.
    const anyEstimate = HEAD.some(([, k]) => { const h = m.headline[k]; return h && !h.known && h.estimate; })
      || m.print?.nozzleEstimate || m.print?.bedEstimate || m.print?.chamberEstimate;
    const hiddenEstimates = !showEstimates && anyEstimate
      ? `<p class="fine">${policy === 'exploration'
        ? 'Turn on Use estimates in the top bar to see estimated ranges for the missing numbers.'
        : `Estimated ranges for the missing numbers are shown under ${esc(POLICY_LABELS.exploration)}, with Use estimates on.`}</p>`
      : '';

    const lede = `<p class="lede">${esc(m.fullName ?? m.name)}. ${esc(describeFacets(m))}
        ${m.h2cStatus === 'Official Bambu product' ? 'Sold by Bambu for this printer.'
          : m.h2cStatus === 'Officially listed family' ? 'Bambu lists this family, but not necessarily every brand of it.'
          : m.h2cStatus === 'Conditional' ? 'Usable with conditions; check the Printing tab.'
          : 'Included on the strength of its processing requirements, not on any Bambu validation.'}</p>`;

    const numbers = `
      <h3 class="sec">Key numbers</h3>
      <div class="facts">
        ${HEAD.map(([label, k, hint]) => {
          const h = m.headline[k];
          return `<div class="fact-card${h?.known ? '' : ' fact-empty'}">
            <div class="fact-label">${esc(label)}</div>
            <div class="fact-value">${renderValue(h, { showUnit: true, estimates: showEstimates })}</div>
            <div class="fact-hint">${esc(hint)}</div>
            ${h?.caveatText ? `<div class="fact-warn">${esc(h.caveatText)}</div>` : ''}
            ${showEstimates && !h?.known && h?.estimate ? `<div class="fact-warn">estimated ${esc(ESTIMATE_STRENGTH[h.estimate.strength].short)}${unitNote(h.estimate)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <p class="fine">${esc((m.headlineBasis ?? '').replace(/[.\s]*$/, ''))}. Select a measured number, marked with a dot, for the measurement behind it, and a marked value or a dash for what it means.</p>
      ${hiddenEstimates}
      ${m.identity?.notes && m.identity.notes !== 'Not applicable' ? `<p class="fine"><strong>About this entry:</strong> ${esc(m.identity.notes)}</p>` : ''}
      ${estimateGroup(m, HEAD, showEstimates)}`;

    const print = `
      <h3 class="sec">Can the H2C print it?</h3>
      <div class="facts-list">
        ${gateLine(m.gates.nozzle, 'Nozzle temperature', range(m.print?.nozzleC), windowEstimate(m.print?.nozzleEstimate, 'Nozzle', showEstimates))}
        ${gateLine(m.gates.bed, 'Bed temperature', range(m.print?.bedC), windowEstimate(m.print?.bedEstimate, 'Bed', showEstimates))}
        ${gateLine(m.gates.chamber, 'Chamber temperature', range(m.print?.chamberC), chamberExtra)}
        <div class="fact">
          ${m.gates.abrasive === 'requires-hardened'
            // A requirement is not an ambiguity. The half-filled marker meant "we are not sure"
            // while the sentence next to it meant "you need one".
            ? '<span class="chip chip-need">Required</span>'
            : m.gates.abrasive === 'no-special-concern' ? '<span class="chip chip-PASS">Any nozzle</span>'
            : '<span class="chip chip-UNKNOWN">Not recorded</span>'}
          <div><b>Hardened nozzle</b><br><span class="fact-why">${m.gates.abrasive === 'requires-hardened'
            ? 'Abrasive. A brass nozzle will wear out.' : m.gates.abrasive === 'no-special-concern'
            ? 'The source states no special nozzle concern.' : 'No abrasion guidance in the sampled sources.'}</span></div></div>
        <div class="fact">
          ${m.gates.drying === 'required'
            ? '<span class="chip chip-neutral">Guidance published</span>'
            : '<span class="chip chip-UNKNOWN">Not recorded</span>'}
          <div><b>Drying before printing</b><br><span class="fact-why">${m.gates.drying === 'required'
            ? 'A source gives a drying schedule; see the Printing tab for its wording and whether it is a requirement or a recommendation.'
            : 'No drying guidance in the sampled sources. That is not the same as not needing it.'}</span></div></div>
        <div class="fact plain">
          <div><b>Can it run through the AMS?</b><br><span class="fact-why">${esc(amsSummary(profiles))}</span></div></div>
      </div>`;

    const documented = `
      <h3 class="sec">How well documented is it?</h3>
      <div class="facts">
        <div class="fact-card"><div class="fact-label">Measurements</div>
          <div class="fact-value">${summary.numericMeasurements}</div>
          <div class="fact-hint">${summary.quarantined ? `${summary.quarantined} quarantined` : 'numeric, each with a source'}</div></div>
        <div class="fact-card"><div class="fact-label">Grades on record</div>
          <div class="fact-value">${summary.grades || '—'}</div>
          <div class="fact-hint">${summary.exactGradeEvidence ? 'grade-specific evidence exists' : 'no grade-specific evidence'}</div></div>
        <div class="fact-card${summary.gaps ? ' warn' : ''}"><div class="fact-label">Known gaps</div>
          <div class="fact-value">${summary.gaps}</div>
          <div class="fact-hint">recorded as missing</div></div>
        <div class="fact-card${summary.conflicts ? ' warn' : ''}"><div class="fact-label">Unresolved conflicts</div>
          <div class="fact-value">${summary.conflicts}</div>
          <div class="fact-hint">sources disagree</div></div>
      </div>`;

    // With requirements set, the first question is how the material fares against them, and the next whether it can be
    // printed: "Against your requirements" had been the last section, under the numbers, the estimates, the printing
    // checks, the uses and the documentation cards. Without requirements there is nothing to answer first.
    const requirements = c.tested ? `<h3 class="sec">Against your requirements</h3>${renderWhy(evaluation)}` : '';
    const rest = `${usesSection(m, c)}${documented}`;
    return c.tested
      ? `${printable}${lede}${requirements}${print}${numbers}${rest}`
      : `${printable}${lede}${numbers}${print}${rest}`;
  }

  if (tab === 'Mechanical' || tab === 'Thermal') {
    const list = tabProperties(tab, m);
    const rows = ms.filter((x) => list.includes(x.property));
    const present = new Set(rows.map((r) => r.property));
    const absent = list.filter((p) => !present.has(p));
    return `
      ${rows.length ? groupBySource(rows).map(([sid, group]) => sourceBlock(sid, group, c, { inSources: false })).join('') : empty(tab)}
      ${absent.length ? `<h3 class="sec">Not measured for this material</h3>
        <div class="gap">${absent.map(esc).join(' · ')}<br><br>
        Absent from the sampled sources. Not zero, and not a low value.</div>` : ''}
      ${rows.length ? `<h3 class="sec">Coverage</h3>${covFor(tab).length
        ? covFor(tab).map((r) => `<div class="gap"><strong>${esc(r.domain)} — ${esc(r.status)}.</strong> ${esc(r.finding)}</div>`).join('')
        : '<div class="gap">No coverage record for this domain.</div>'}` : ''}`;
  }

  if (tab === 'Printing') {
    if (!profiles.length) return empty('Printing');
    return profiles.map((p) => {
      const g = c.gradeById.get(p.gradeId);
      return `<div class="profile-block">
      <h3 class="block-title">${esc(gradeName(g) || p.gradeId)} · ${esc(stated(p.profile) ? p.profile : 'print profile')} ${tag(p.id, 'Profile')} ${tag(p.gradeId, 'Grade')}</h3>
      <dl class="kv">
        <dt>Nozzle</dt><dd>${esc(p.nozzle.text)} ${gateChip(p.gates.nozzle, 'Nozzle')}</dd>
        <dt>Bed</dt><dd>${esc(p.bed.text)} ${gateChip(p.gates.bed, 'Bed')}</dd>
        <dt>Chamber</dt><dd>${esc(p.chamber.text)} ${gateChip(p.gates.chamber, 'Chamber')}
          ${p.chamber.fromEnclosure ? `<br><span class="missing" style="font-size:11px">Read from the enclosure row: "${esc(p.enclosure)}". Not needing an enclosure means not needing a heated chamber.</span>` : ''}
          ${p.chamber.strippedTail ? `<br><span class="missing" style="font-size:11px">Trailing text not read as a chamber requirement: ${esc(p.chamber.strippedTail)}</span>` : ''}</dd>
        <dt>Nozzle material</dt><dd>${esc(p.nozzleMaterial ?? '')}</dd>
        <dt>Nozzle diameter</dt><dd>${esc(p.nozzleDiameter.text)}</dd>
        <dt>Abrasion</dt><dd>${esc(p.abrasion.text)}</dd>
        <dt>Drying</dt><dd>${longText(p.drying.text)}</dd>
        <dt>Enclosure</dt><dd>${esc(p.enclosure ?? '')}</dd>
        <dt>Plate</dt><dd>${esc(p.plate ?? '')}</dd>
        <dt>Support pairing</dt><dd>${esc(p.supportPairing ?? '')}</dd>
        <dt>Failure modes</dt><dd>${longText(p.failureModes ?? '')}</dd>
      </dl>
      ${p.notes.length ? `<dl class="kv">${p.notes.map((n) => `<dt>${esc(n.topic)}</dt><dd>${longText(n.text)}</dd>`).join('')}</dl>` : ''}
      <h3 class="sec">H2C routing and AMS — evidence, not a filter</h3>
      <div class="note">These fields read "verify exact grade" on most profiles, so the selector does
        not filter on them. They are reproduced here exactly as recorded.</div>
      <dl class="kv" style="margin-top:10px">
        <dt>H2C left</dt><dd>${esc(p.routing.left ?? '')}</dd>
        <dt>H2C right</dt><dd>${esc(p.routing.right ?? '')}</dd>
        <dt>AMS 2 Pro</dt><dd>${esc(p.routing.ams2Pro ?? '')}</dd>
        <dt>AMS HT</dt><dd>${esc(p.routing.amsHT ?? '')}</dd>
        <dt>AMS published</dt><dd>${esc(p.routing.amsPublished ?? '')}</dd>
        <dt>Sources</dt><dd>${[p.sourceId, p.h2cSourceId].filter(stated).map((sid) => `${esc(sourceName(c.sourceById.get(sid), sid))} ${tag(sid, 'Source')}`).join('; ')}</dd>
      </dl></div>`;
    }).join('');
  }

  if (tab === 'Environment') {
    const byCat = {};
    for (const e of ev) (byCat[e.categoryLabel ?? 'Other'] ||= []).push(e);
    if (!ev.length && !poly.length) return empty('Environment');
    // The tab counts every record it lists; which of them a filter can use is said here, not by a second count on the tab.
    const usable = ev.filter((e) => e.filterable).length;
    const own = !ev.length ? `<p class="fine" style="margin:0 0 12px">No record of this material's own; what follows is its base polymer's published behaviour.</p>`
      : `<p class="fine" style="margin:0 0 12px">${ev.length} record${ev.length === 1 ? '' : 's'} of this material. ${usable === ev.length
        ? (ev.length === 1 ? 'Its category is' : 'All are in categories') + ' the Environment filters can use.'
        : usable ? `${usable} ${usable === 1 ? 'is' : 'are'} in categories the Environment filters can use; the rest are evidence only.`
        : `None ${ev.length === 1 ? 'is' : 'are'} in a category the Environment filters can use: evidence only.`}</p>`
      + Object.entries(byCat).map(([label, list]) => `
      <h3 class="sec">${esc(label)}${list[0]?.filterable ? '' : ' — not used for filtering'}</h3>
      ${list.map((e) => `<div class="evidence-row env-row">
        <div><strong>${esc(e.topic)}</strong>${e.agent ? ` · ${esc(e.agent)}` : ''}${e.strength && e.strength !== 'unspecified' ? ` · ${esc(e.strength)}` : ''}</div>
        <div>${esc(e.finding)}</div>
        ${e.exposure ? `<div class="cond">${esc(e.exposure)}</div>` : ''}
        <div class="cond meas-foot">${esc(e.evidenceType)}${stated(e.gradeId) ? ` · grade ${esc(e.gradeId)}` : ''} · source: ${esc(sourceName(c.sourceById.get(e.sourceId), e.sourceId))}${e.locator ? `, ${esc(e.locator)}` : ''} ${tag(e.id, 'Evidence record')}</div>
      </div>`).join('')}`).join('');
    return own + polymerSection(poly, c);
  }

  if (tab === 'Grades') {
    if (!grades.length) return empty('Grades');
    // Colour. The field was collected on every grade, but it does not hold what a buyer wants: on 132 of 144 grades it
    // is the same sentence saying properties may vary by colour, and on the others it names the colour of the specimen
    // that was tested. So the caveat is said once, above the grades, and a grade shows its colour only where the tested
    // one is stated; the same sentence under every grade had read as something different about each.
    const SPEC_COLOUR = /^(white|black|natural|grey|gray|red|blue|green|yellow|orange|clear|transparent)\b/i;
    return `<div class="note">Which colours a grade is sold in is not part of this database: check the retailer listing.
      Pigment can change strength and stiffness, and a data sheet's numbers are for the colour its specimens were printed in.
      Where that colour is recorded, the grade below says so.</div>`
      + grades.map((g) => `<div class="grade-block">
      <h3 class="block-title">${esc(gradeName(g) || g.id)} ${tag(g.id, 'Grade')}</h3>
      <dl class="kv">
        <dt>Manufacturer</dt><dd>${esc(g.manufacturer ?? '')}</dd>
        <dt>Product</dt><dd>${esc(g.product ?? '')}</dd>
        <dt>Composition</dt><dd>${esc(g.composition ?? '')}</dd>
        ${g.variant ? `<dt>Variant</dt><dd>${esc(g.variant)}: its numbers describe this product, not the polymer in general</dd>` : ''}
        <dt>Availability</dt><dd>${esc(g.availability ?? '')}</dd>
        <dt>Certifications</dt><dd>${esc(g.certifications ?? '')}</dd>
        ${SPEC_COLOUR.test((g.colourCaveat ?? '').trim()) ? `<dt>Colour tested</dt><dd>Measured on the <b>${esc(g.colourCaveat.trim())}</b> version. Other colours may differ.</dd>` : ''}
        <dt>Why this grade</dt><dd>${esc(g.rationale ?? '')}</dd>
        <dt>Source</dt><dd>${esc(sourceName(c.sourceById.get(g.sourceId), g.sourceId))} ${tag(g.sourceId, 'Source')}</dd>
      </dl></div>`).join('');
  }

  if (tab === 'Price') {
    if (!prices.length) return empty('Price');
    // A listing with no price per kilogram says why in words, and a quarantined listing's reason sits under its row: "n/a"
    // explained nothing, and the reason for a quarantine had been only a row's title and a button.
    const noPrice = (p) => `${p.retailer} lists it${Number.isFinite(p.displayedPrice) ? ` at ${fmtNumber(p.displayedPrice)} ${p.currency ?? 'CAD'}` : ''} (seen ${p.accessDate}), `
      + `but no usable regular price per kilogram was recorded. ${stated(p.basis) ? `${p.basis.replace(/[.\s]*$/, '')}.` : ''}${stated(p.notes) ? ` ${p.notes}` : ''}`;
    const quarantineWhy = (p) => [String(p.basis ?? '').replace(/^quarantined:\s*/i, ''), p.notes].filter(stated).map((t) => t.replace(/[.\s]*$/, '')).join('. ');
    return `<div class="note">Headline is the median of observations flagged for the headline sample.
      Prices sampled ${esc(db.meta.pricesSampled ?? db.meta.snapshot)}; they are not live. A struck-through row is quarantined: the listing is a different product and backs nothing. Why is said under it.</div>
      ${scrollTable(`<table class="grid price-table"><thead><tr>
      <th>ID</th><th class="retailer">Retailer</th><th class="variant">Variant</th><th class="num">kg</th><th class="num">CAD/kg</th><th>Stock</th><th>In sample</th></tr></thead>
      <tbody>${prices.map((p) => `<tr data-price="${esc(p.id)}"${p.quarantined ? ` class="quarantined" title="${esc(quarantineWhy(p))}"` : ''}>
        <td>${esc(p.id)}${p.quarantined ? ' <span class="chip chip-FAIL chip-small">quarantined</span>' : ''}</td><td class="retailer">${esc(p.retailer)}</td><td class="variant">${esc(p.variant ?? '')}</td>
        <td class="num">${fmtNumber(p.netMassKg)}</td>
        <td class="num">${p.regularPerKg !== null ? fmtNumber(p.regularPerKg)
          // The offer the retailer showed, per kilogram, marked as an offer: 44 of the 104 listings carry a displayed
          // price but no regular price the sample could rely on, and "no price" beside a listing that showed 29.99
          // read as a contradiction. The offer backs no headline; the button says why.
          : Number.isFinite(p.displayedPrice) && p.netMassKg > 0
            ? `${fmtNumber(p.displayedPrice / p.netMassKg)} ${explainButton('offer', noPrice(p), { cls: 'missing offer-price', head: 'Offer price, not the regular price' })}`
            : explainButton('no price', noPrice(p), { cls: 'missing no-price', head: 'Listed, no price' })}</td>
        <td>${esc(p.stock)}</td><td>${p.headlineSample ? 'Yes' : 'No'}</td></tr>
        ${p.quarantined ? `<tr class="quarantine-why"><td colspan="7"><span class="why-text"><b>Quarantined:</b> ${esc(quarantineWhy(p) || 'this listing backs nothing')}.</span></td></tr>` : ''}`).join('')}</tbody></table>`)}`;
  }

  if (tab === 'Evidence') {
    if (!ms.length) return empty('Evidence');
    return groupBySource(ms).map(([sid, group]) => sourceBlock(sid, group, c, { inSources: true })).join('');
  }

  if (tab === 'Coverage') {
    if (!cov.length) return nothingRecorded([], { toCoverage: false });
    return cov.map((r) => `<div class="evidence-row cov-row">
      <div><strong>${esc(r.domain)}</strong> ${chip(statusToState(r.status), r.status)}</div>
      <div>${esc(r.finding)} ${r.derived ? '<span class="fine-src" title="No coverage row is stored for this domain; the build reports what the material\'s own records show">derived from the records</span>' : tag(r.id, 'Coverage record')}</div>
    </div>`).join('');
  }
  return '';
}

/** A plain sentence about what the material is, instead of three coded fields. */
function describeFacets(m) {
  const bits = [];
  const fill = {
    'carbon-fibre': 'Carbon-fibre reinforced', 'glass-fibre': 'Glass-fibre reinforced',
    'esd': 'Static-dissipative', 'foaming': 'Foaming, for lightweight parts',
    'unfilled': 'Unfilled', 'undisclosed': 'A commercial variant whose filler is not disclosed',
  }[m.facets.reinforcement.value];
  if (fill) bits.push(fill);
  if (m.facets.supportMaterial.value) bits.push('a support or interface material rather than a structural one');
  if (m.facets.flexible.value) bits.push('a flexible elastomer');
  return bits.length ? bits.join(', ') + '.' : '';
}

const statusToState = (s) =>
  s === 'Evidence recorded' || s === 'Resolved' ? 'PASS'
  : s === 'Gap' ? 'UNKNOWN'
  : s === 'Conflict' || s === 'Quarantined' ? 'FAIL' : 'INDETERMINATE';

const gateChip = (g, what) => {
  if (!g) return '';
  const v = gateVerdict(g.verdict);
  return explainButton(esc(v.short), g.reason, { cls: `chip chip-${v.state} chip-small`, head: `${what} within the H2C limit: ${v.word}` });
};
