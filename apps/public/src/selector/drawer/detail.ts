// Material detail drawer.
//
// Tabs are adaptive, not a fixed skeleton. A section with no data does not render blank and it
// does not render as zero: it renders the coverage record that explains the absence. With fracture
// toughness at zero records and compression and CTE at one each, a fixed skeleton would produce
// mostly empty pages. Showing the gap turns that into information.
//
// What each tab shows (which records, in which order, counted how, drawn or not and why) is chosen in material-facts.js,
// which the material pages read too, so the two never disagree; its sentences are material-words.js's, its words for
// stored codes labels.js's, and its scales scales.js's. This module draws them: the markup, the sentences that hold a
// control, and the drawer's own state (which product cards are open, the search box's text).

import type { Loose } from '@atlas/pages/loose';
import { renderValue, chip, esc, fmtNumber, dryingWords, diameterWarning, fmtBounded, boundNote, fmtRange, estimateDisplay, wireEvidence, explainButton, scrollTable, markTableOverflow, keepInView, priceSampleSentence, spreadNote, convertedMark, convertedNote, boundSign, medianSign } from '@atlas/pages/facts/format';
import { dayWords } from '@atlas/pages/facts/dates';
import { evidenceLine, keyFiguresBasis } from '@atlas/pages/facts/evidence-line';
import { fmtDisplay, fmtDisplayUnit, spanDisplayUnit } from '@atlas/pages/facts/display-numbers';
import { onTheH2cRows } from '@atlas/pages/facts/print-brief';
import { KEY_FIGURES } from '@atlas/pages/facts/material-highlights';
import { GRAPH_KEY, rowCountWords, graphNumber, graphSpan, graphRange, pairLabelOf, tallyWords } from '@atlas/pages/facts/material-words';
import { renderWhy, shownProduct } from '../explain.ts';
import { describeConstraint, gateVerdict, CHAMBER_GUIDANCE, ESTIMATE_STRENGTH, ESTIMATE_PRECISION, screenRangeText, POLICY_LABELS, H2C_STATUS, h2cStatusLabel, h2cLimit,
  propertyName, STATUS_WORDS, sourceKind, whyWords } from '@atlas/pages/facts/labels';
import { REGISTRY } from '@atlas/pages/facts/registry';
import { stripScale, stack, stackPitch, DOT_PITCH, COLUMN_SHOWN } from '@atlas/pages/facts/scales';
import { pageOf, productsPageOf } from '@atlas/pages/facts/page-rule';
import { pagesBase } from '../pages-base.ts';
import { contributionWords, ledgerRow } from '@atlas/engine/port/ledger.ts';
import { mostDocumentedFirst, orderRow } from '@atlas/pages/facts/product-order';
import {
  stated, isProduct, productName, productNameOrId, sourceName, originalOf, groupBy, groupByMaker, leadMaker, materialContext, productDocuments,
  identity, emptyReasons, gapSplit, largestFirst, measuredIn, measurementFacts, sourceBlockFacts,
  resolvePointers, readerNote, readerText, readerGap, shownGap, makersOwn, GAP_DOMAIN_WORDS, publisherName, familyGuidanceFacts, soldToughened, toughenedClaim, dotMarks, notDrawnWhy, comparisonsOf, printFacts, printCounts, guideFacts,
  routingSaysMore, makersSayFacts, knowHowGapFacts, envGroups, hasEstimates, productEstimates, priceRows,
} from '@atlas/pages/facts/material-facts';
import {
  plural, lower, cap, andList, inSentence, ledeWords, identityLine, onFileWords, NOTHING_ON_FILE, EMPTY_LINES, emptyReasonLine, familyScope,
  conditionLine, measuredValue, testGuessHead, namedOnlyWords, gaveWords, scheduleWords, changedState, LEVEL_NOTE, DRAWER_LEVEL_NOTE,
  asPublishedWords, outOfMedianWords, apartWords, noMedianWhy, toughenedSplit, toughenedClaimWords,
  TOUGHENED_NOTE, TOUGHENED_NOTE_SHORT, leftOutWords, silentRowsWords, pairWords, shareWords, alsoForWords, rangeWords, settingWords, printSettingHead,
  printApartWords, printLines, printSingles, printMissing, printOriginsWords, printCountWords, hardenedFactWords, dryingFactWords, amsSummary,
  guideEnclosureWords, guideHardenedWords, annealWords, knowHowGap, sitesLine, makersSilentWords, makersRecipeWords, verdictWords,
  envConditionWords, noPriceWords, quarantineWords, foreignPriceWords, UNUSED_WORDS, statementVerdictWords, envCaveat, gapFindingWords,
} from '@atlas/pages/facts/material-words';

// The tests read these from here, where they were first written.
export { groupByMaker, notDrawnWhy, resolvePointers };

/**
 * The record IDs behind something on the page, for anyone tracing it back to the tables: one small "ID" mark that opens
 * them. They used to stand in the sentences and the headings ("measurement V006484 · Polymaker FIBERON ASA CF08
 * (G033-11)"), which an engineer read as noise (D124). `parts` are [what, id] pairs; an empty one is left out.
 */
const ids = (...parts: Loose) => {
  const list = parts.filter(([, id]: Loose) => id && stated(id)).map(([what, id]: Loose) => `${what} ${id}`);
  return list.length ? ` ${explainButton('ID', `${list.join('. ')}.`, { cls: 'id-mark', head: list.length === 1 ? 'Record ID' : 'Record IDs', label: `Record ${list.length === 1 ? 'ID' : 'IDs'}: ${list.join(', ')}` })}` : '';
};

/**
 * The link to a source's original, labelled by what it opens. A raw 11 px URL had been the only way to it. A path on the
 * compiler's own disk is not something a reader can open, so it is said, not linked.
 */
function originalLink(s: Loose) {
  // The published parts never carry a path on the owner's machine: the source is marked a private reference and has no address (publicize).
  const o = s?.privateReference ? { url: null, kind: 'private reference', local: true } : originalOf(s);
  if (o && !o.local) return `<a href="${esc(o.url)}" target="_blank" rel="noopener" title="${esc(o.url)} (opens in a new tab; needs an internet connection)">Open the original (${o.kind})</a>`;
  return o ? '<span>original held as a local file</span>' : '';
}

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

/**
 * The first line of a tab's body, saying what it holds (it had been a line under the tab strip, which took the first
 * screen's space on every tab). Products and Sources had read alike: a product is what you buy, a source is a document
 * its numbers were read from, and one document can cover several products. Overview has none: its answer and its
 * headings say what it holds. Price opens on the price itself (its body's first line).
 */
const TAB_HELP: Record<string, (n: Loose, c: Loose) => string> = {
  Grades: (n: Loose, c: Loose) => {
    if (!n) return EMPTY_LINES.Grades;
    const products = c.grades.filter(isProduct);
    const makers = new Set(products.map((g: Loose) => g.manufacturer).filter(stated)).size;
    const refs = n - products.length;
    return `${plural(products.length, 'product')} you can buy, from ${plural(makers, 'maker')}${refs ? `, and ${refs === 1 ? 'one reference specimen' : `${refs} reference specimens`}, not for sale` : ''}. Each shows its result, how to print it, its values and what its maker says. ${productOrderWords(c)}`;
  },
  Mechanical: (n: Loose) => (n ? `${fmtNumber(n)} published mechanical values, by property, with the tensile, flexural and impact results drawn product by product. Each names its product and the document it comes from.` : EMPTY_LINES.Mechanical),
  Thermal: (n: Loose) => (n ? `${fmtNumber(n)} published thermal values, by property, with heat deflection and the glass transition drawn product by product. Each names its product and the document it comes from.` : EMPTY_LINES.Thermal),
  Printing: (n: Loose, c: Loose) => (n ? `Every product's print temperatures drawn together, then ${fmtNumber(n)} print ${n === 1 ? 'profile' : 'profiles'} by maker: the settings each product's documents give.${c.guide ? ' The Bambu Lab Filament Guide comes before the profiles; a product uses it only where its own sheet is silent.' : ''}` : EMPTY_LINES.Printing),
  // The caveat is the method table's (m437), which the material page's Chemicals and environment reads too (C11).
  Environment: (n: Loose, c: Loose) => (n ? [`${fmtNumber(n)} ${n === 1 ? 'statement' : 'statements'} on chemicals, water, UV, fire and handling, by category.`, envCaveat(c.db)].filter(Boolean).join(' ') : EMPTY_LINES.Environment),
  Price: (n: Loose) => (n ? '' : EMPTY_LINES.Price),
  Evidence: (n: Loose) => (n ? `The ${fmtNumber(n)} ${n === 1 ? 'document' : 'documents'} this material's values were read from, by publisher, with links to the originals; then its known gaps. One document can cover several products.` : EMPTY_LINES.Evidence),
};
/**
 * The order the Products tab lists in, said in its first line (C35). The products that meet the requirements come first
 * (passingOrdered), then every product by maker, the maker whose products are most often the material's typical value
 * leading (the order the Printing and Sources tabs use); with no requirement there is the second list alone.
 */
function productOrderWords(c: Loose) {
  const lead = leadMaker(c.m, c);
  const byMaker = `by maker${lead ? `; ${lead} first, its products most often the material's typical value` : ''}`;
  const anyPass = c.tested && (c.evaluation?.products ?? []).some((p: Loose) => p.verdict === 'PASS');
  return anyPass ? `Those that meet your requirements come first: the one shown under Your requirements, then the most documented; all products follow ${byMaker}.` : `${cap(byMaker)}.`;
}

/**
 * The products that meet every requirement, in the order the tab lists them (C35): the product the Overview's Your
 * requirements names first (renderWhy's own choice), then the rest most documented first by the Products page's own key
 * (product-order.js), so one material has one first product on both surfaces.
 */
function passingOrdered(c: Loose) {
  if (!c.tested || !c.evaluation) return [];
  const pass = new Set((c.evaluation.products ?? []).filter((p: Loose) => p.verdict === 'PASS').map((p: Loose) => p.gradeId));
  const ordered = mostDocumentedFirst(c.m, c.grades.filter((g: Loose) => pass.has(g.id)).map(orderRow)).map((r: Loose) => r.g);
  const shown = shownProduct(c.evaluation).gradeId;
  const lead = ordered.find((g: Loose) => g.id === shown);
  return lead ? [lead, ...ordered.filter((g: Loose) => g !== lead)] : ordered;
}

/** The figures a closed product line shows when no requirement asks for others: the first three the product publishes (C36), the Products page's columns. */
const CLOSED_LINE = ['tensileModulusXY', 'tensileStrengthXY', 'hdt045', 'priceCADkg'];

/** The tabs whose count a reader uses (2026-10-18): the products to choose from and the documents behind them, as the page counts them. */
const COUNTED_TABS = ['Grades', 'Evidence'];

/**
 * What an empty tab says: that nothing is on file, the recorded reason where one exists, and the way to the known gaps.
 */
function nothingRecorded(records: Loose, { toGaps }: Loose) {
  return `<div class="gap empty-tab"><strong>${esc(NOTHING_ON_FILE)}</strong>
    ${records.length
      // A recorded reason in a reader's words; a review step's note stays with the known gaps' review notes (readerNote).
      ? records.filter((r: Loose) => readerNote(r.finding ?? r.reason ?? emptyReasonLine(r))).map((r: Loose) => `<div class="empty-why">${esc(emptyReasonLine(r))}</div>`).join('')
      : ''}
    ${toGaps ? '<button type="button" class="btn btn-sm" data-tab-link="Coverage">See its known gaps, in Sources</button>' : ''}</div>`;
}

// ------------------------------------------------------------------ measurements, grouped by source

/** A record's notes, collapsed: the history of the record, one press away. */
const recordNotes = (text: Loose) => (stated(text) ? `<details class="record-notes"><summary>Record notes</summary><div>${esc(text)}</div></details>` : '');

/** Past this many characters a paragraph is shown to its first words, with the rest one press away. */
const LONG_TEXT = 140;

/**
 * A paragraph that may be long, collapsed to its first ~140 characters with an expander. Some print-parameter fields are
 * a data sheet's whole specimen table as recovered text; at full length under each measurement they buried the numbers.
 * A native details element, so the expander is a real control from the keyboard and the browser's find opens it.
 */
function longText(text: Loose) {
  const t = String(text ?? '');
  if (t.length <= LONG_TEXT + 30) return esc(t);
  const cut = t.slice(0, LONG_TEXT).replace(/\s+\S*$/, '');
  return `<details class="longtext"><summary><span class="lt-short">${esc(cut)}…</span> <span class="lt-toggle lt-more">Show all</span><span class="lt-toggle lt-less">Show less</span></summary>`
    + `<span class="lt-full">${esc(t)}</span></details>`;
}

function measurementRow(x: Loose, c: Loose, { shared = new Map(), inSources = false, compact = false, manyProducts = true, extra = '' } = {}) {
  // The conditions that decide whether a number applies to your part: annealed or as printed, at what temperature,
  // printed how. A condition most measurements from this source share is said once, above them (sourceBlock); this one
  // says its own only where it differs, and says it states none where the others do (material-facts.js measurementFacts).
  // Under a property heading the row leads with its product and keeps only the two short conditions.
  const f = measurementFacts(x, c, { shared, compact });
  const cond = conditionLine(x);
  const more = f.more;
  const notes = recordNotes(f.notes);
  const v = f.value.kind === 'number'
    ? esc(measuredValue(x))
    : f.value.kind === 'words'
      ? `${esc(f.value.text)} <span class="missing">(stated in words)</span>`
      : `<span class="missing">${esc(STATUS_WORDS[f.value.status] ?? f.value.status)}</span>`;
  const op = f.operator ? esc(f.operator) + ' ' : '';
  const s = f.source;
  const product = f.product || 'product not named';
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
    ${extra}
    ${cond ? `<div class="cond">${esc(cond)}</div>` : ''}
    ${x.testGuess ? testGuessLine(x.testGuess) : ''}
    ${more.length ? `<dl class="kv small cond-more">${more.map(([k, t]: Loose) => `<dt>${esc(k)}</dt><dd>${longText(t)}</dd>`).join('')}</dl>` : ''}
    <div class="cond meas-foot">${foot}${ids(['Measurement', x.id], ['Product', x.gradeId], ['Source', x.sourceId])}</div>
    ${notes}
  </div>`;
}

/**
 * Which test an impact result whose own words do not settle it probably was (impact_test_guesses.csv, D133): a reviewer's
 * reading, said as one, beside a value that stays apart from both tests.
 */
function testGuessLine(g: Loose) {
  return `<div class="cond test-guess"><b>${esc(testGuessHead(g))}</b> ${esc(g.basis)} <span class="fine">Our reading, not the sheet's words; this value is not compared.</span></div>`;
}

/** A collapsed block per maker or property: the summary counts what is inside, the body shows once opened. */
function makerBlock(name: Loose, n: Loose, noun: Loose, body: Loose, { open = false, cls = 'maker-block' } = {}) {
  return `<details class="${cls}" data-search-group${open ? ' open' : ''}>
    <summary><span class="maker-name">${esc(name)}</span><span class="n" data-all="${esc(plural(n, noun))}">${esc(plural(n, noun))}</span></summary>
    <div class="maker-body">${body}</div>
  </details>`;
}

// The products, by ID, for the parts of the drawer that are drawn without its context (an estimate's evidence list).
let gradeLookup = new Map();
// Which product cards the reader opened or closed, by product, for the material on screen.
const gradeOpen = new Map();
let gradeOpenFor: Loose = null;

// The search box above a long tab. Its text is kept while the same material is open, because the drawer is rebuilt
// on every change of tab or shortlist, and a query that vanished on a tab change read as a broken box.
let drawerQuery = '';
let drawerQueryFor: Loose = null;
const searchBox = (what: Loose) => `<div class="drawer-search-row"><input type="search" class="drawer-search" data-search placeholder="Find ${esc(what)}…" aria-label="Find ${esc(what)}" value="${esc(drawerQuery)}"></div>`;

/** Hide what the query does not name, open the groups that still have something to show, and count what is left. */
function applySearch(host: Loose) {
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

/**
 * One line per headline of what the model says of this grade (D81), only with estimates on. It never passes, and hides the
 * product only where its back-test allows (D137), which in this release none does: it says which.
 */
function gradeEstimateLines(g: Loose, c: Loose) {
  if (!c.showEstimates || (!g.estimate && !g.estimateWithheld)) return '';
  // Only where the product publishes no comparable value of its own: an estimate beside its own measurement said less
  // than the measurement and read as a second answer (a 10 % elongation estimated at "10–10 %").
  const lines = productEstimates(g).map(({ h, e }: Loose) => `<div class="grade-est"><b>${esc(h.labels.plain)}</b> <span class="est est-${esc(e.precision)}">~${fmtNumber(e.lo)}–${fmtNumber(e.hi)} ${esc(e.unit)}<span class="est-mark">†</span></span>
      <span class="fine">centre ${fmtNumber(e.centre)} · ${esc(e.precision)} precision · ${esc(ESTIMATE_STRENGTH[e.strength]?.short ?? e.strength)}</span>${e.screening ? `<span class="fine">Never passes. ${esc(e.canScreen ? 'May hide this product as printed and dry, where its nozzle, bed and chamber are within the H2C\'s.' : `Hides nothing: ${e.screenLimit}.`)}</span>` : ''}</div>`);
  const withheld = withheldEstimateLines(g, c);
  return lines.length || withheld.length ? `<div class="grade-ests"><div class="shared-head">Estimated, where this product publishes no comparable value</div>${[...lines, ...withheld].join('')}</div>` : '';
}

/**
 * An estimate the build withholds because the product's own values, converted, and the model for its kind disagree
 * (D167), said where the estimate would have been, with the values one press away. It had been said only in a
 * requirement's reason, and the card showed nothing, as for a product the model never reached (OPEN-PROBLEMS §38.10).
 */
function withheldEstimateLines(g: Loose, c: Loose) {
  return REGISTRY.headlines.filter((h: Loose) => g.estimateWithheld?.[h.key] && g.headline?.[h.key]?.level !== 'comparable').map((h: Loose) => {
    const w = g.estimateWithheld[h.key];
    const own = [...new Set((w.ownBand?.bands ?? []).flatMap((b: Loose) => b.measurementIds ?? []))].map((id) => c.msById.get(id)).filter(Boolean);
    const names = [...new Set(own.map((x) => lower(x.property)))];
    const band = w.ownBand && w.ownBand.lo != null && w.ownBand.hi != null ? `${fmtNumber(w.ownBand.lo)}–${fmtNumber(w.ownBand.hi)} ${h.unit}` : null;
    const values = own.map((x) => `<button type="button" class="link-btn" data-measurement="${esc(x.id)}" title="Opens the measurement in Sources">${esc(`${fmtNumber(x.value)} ${x.unit}`)}</button>`).join(', ');
    return `<div class="grade-est grade-est-withheld"><b>${esc(h.labels.plain)}</b> <span class="est-none">no estimate</span>
      <span class="fine">${esc(`${names.length ? `Its own ${andList(names)}, measured another way,` : 'Its own values, measured another way,'} put it at ${band ?? 'a range'} once converted, where the model for its kind puts it at ${fmtNumber(w.centre)} ${h.unit}. The two disagree, so no estimate is shown, and its own values stand.`)}${values ? ` Its values: ${values}.` : ''}</span></div>`;
  });
}

/**
 * One document: what it is and where to read it, which products it covers, what else it gave, then its values. A
 * condition most of its values state in the same words is said once, at the top: ABS repeated one 60-word
 * print-parameter paragraph under all 20 of its measurements. A value whose wording differs keeps its own, and one that
 * states none says so. A property the sheet names without a value goes on one line at the end.
 */
function sourceBlock(sid: Loose, d: Loose, c: Loose) {
  const f = sourceBlockFacts(sid, d, c);
  const { s, shared } = f;
  const gave = gaveWords(f.gave);
  const sharedHtml = f.sharedFields.length
    ? `<div class="shared-conds"><div class="shared-head">Applies to every value below${f.exceptions ? ' unless one says otherwise' : ''}</div>
        <dl class="kv small cond-more">${f.sharedFields.map(([k, field]: Loose) => `<dt>${esc(k)}</dt><dd>${longText(shared.get(field))}</dd>`).join('')}</dl></div>`
    : '';
  const namedHtml = f.named.length
    ? `<div class="np-line">Also on this sheet, without a value: ${f.named.map((x: Loose) => `<span class="np-item${c.highlight === x.id ? ' target' : ''}" data-mid="${esc(x.id)}">${esc(namedOnlyWords(x))}</span>`).join(', ')}.</div>`
    : '';
  return `<section class="src-block${c.highlightSource === sid ? ' target' : ''}" data-source-block="${esc(sid)}">
    <h3 class="src-title" tabindex="-1">${esc(f.name)}${ids(['Source', sid])}</h3>
    <div class="src-meta">${[esc(sourceKind(s)), f.accessDate ? `read ${esc(dayWords(f.accessDate))}` : null, originalLink(s) || null].filter(Boolean).join(' · ')}</div>
    ${f.covers.length ? `<div class="src-covers"><b>Covers:</b> ${f.covers.map(esc).join(', ')}</div>` : ''}
    ${gave.length ? `<div class="src-covers"><b>Gave:</b> ${esc(gave.join(', '))}</div>` : ''}
    ${sharedHtml}
    ${f.entries.map((x: Loose) => measurementRow(x, c, { shared, inSources: true, manyProducts: f.manyProducts })).join('')}
    ${namedHtml}
    ${recordNotes([f.about, shared.get('notes')].filter(Boolean).join(' '))}
  </section>`;
}

// ------------------------------------------------------------------ family guidance behind a pointer

/**
 * Typical applications, Limitations and the family's general guidance, from the material's prose fields with their
 * evidence pointers resolved (material-facts.js familyGuidanceFacts, B14). The record's ID is kept in the title only:
 * the Overview is for reading, and the record is listed, with its ID, in the Environment tab of the material it
 * belongs to.
 */
function usesSection(m: Loose, c: Loose) {
  const g = familyGuidanceFacts(m, c);
  const cite = (r: Loose) => `<span class="fine-src" title="Evidence record ${esc(r.id)}">Source: ${esc(sourceName(c.sourceById.get(r.sourceId), r.sourceId))}</span>`;
  const out = [];
  if (g.bestUses) {
    // Typical applications, from the family's own Best uses record, said to be the family's.
    const text = [g.bestUses.prose, ...g.goodFor.map((r: Loose) => r.finding)].filter(Boolean);
    if (text.length) {
      out.push(`<h3 class="sec">Typical applications</h3><p>${text.map((t) => esc(proseOnly(t))).join(' ')}</p>`
        + g.goodFor.map((r: Loose) => `<p class="fine">${cite(r)} (about ${esc(g.owner(r))} in general).</p>`).join(''));
    }
  } else if (stated(m.bestUses)) {
    // Whose sentence it is, where it is a statement on record, as the material page says it ("after Prusa Research", C10).
    const from = g.bestUsesFrom ? c.sourceById.get(g.bestUsesFrom.sourceId) : null;
    const after = g.bestUsesFrom ? ` <span class="fine">after <button type="button" class="link-btn" data-open-source="${esc(g.bestUsesFrom.sourceId)}" title="${esc(`${sourceName(from, g.bestUsesFrom.sourceId)}. Opens this document in Sources`)}">${esc(publisherName(from?.publisher ?? '') || sourceName(from, g.bestUsesFrom.sourceId))}</button></span>` : '';
    out.push(`<h3 class="sec">Typical applications</h3><p>${esc(proseOnly(m.bestUses))}${after}</p>`);
  }
  // What is true of this material. The caveat that is true of every material (method.csv, Transferable allowables) is
  // said once, at the foot of the Overview, not under each material's own limitations (D124).
  if (g.ownLimitations) out.push(`<h3 class="sec">Limitations</h3><p>${esc(proseOnly(g.ownLimitations))}</p>`);
  if (g.guidance.length || g.unresolved.length) {
    out.push(g.owners.map((name: Loose) => `<h3 class="sec">General guidance for ${esc(name)}</h3>
        <p class="fine family-scope">From printing guides ${esc(familyScope(name, m.name))}.</p>
        <ul class="family-guidance">${g.guidance.filter((r: Loose) => g.owner(r) === name).map((r: Loose) => `<li><b>${esc(r.topic)}:</b> ${esc(r.finding)}
          <span class="fine-line">${cite(r)}</span></li>`).join('')}</ul>`).join('')
      + (g.unresolved.length ? `<p class="fine unresolved">Also referred to, but not in this database: ${g.unresolved.map(esc).join(', ')}.</p>` : ''));
  }
  return out.join('');
}

// ------------------------------------------------------------------ polymer-level behaviour

/**
 * The base polymer's published behaviour, one section per category, where the material has no record of its own
 * (D64). Each says on the page, not in a tooltip (D61), that it is the neat resin's behaviour and not a test of this
 * grade, that it never passes, and whether it can screen; then every agent row with its verdict, finding and source.
 */
function polymerSection(poly: Loose, c: Loose) {
  if (!poly.length) return '';
  const screens = poly.filter((p: Loose) => p.screens);
  const P = esc(poly[0].polymerId);
  return `<h3 class="sec">Reference data for ${P} resin (not these products)</h3>
    <div class="note">No document tests this material${poly.length === 1 ? ' in this category' : ` in these ${poly.length} categories`}, so a resin
      producer's or handbook data for plain ${P} is shown. Fillers, pigments and printing change it, so it never passes a
      requirement. ${screens.length
        ? `Where it reports ${P} attacked or dissolved (${esc(screens.map((p: Loose) => p.categoryLabel.toLowerCase()).join(', '))}), it hides this
      material under a requirement on that category, with the materials that could not be checked included and "Use estimates and resin data" on;
      the HIDDEN chip brings it back.`
        : 'None of it can hide this material.'}</div>`
    + poly.map((p: Loose) => `
      <h4 class="block-title">${esc(p.categoryLabel)}: ${esc(verdictWords(p.verdict))} <span class="chip chip-neutral chip-small">resin data</span>${ids(['Inferred record', p.id])}</h4>
      ${p.agents.map((a: Loose) => `<div class="evidence-row env-row" data-polymer-row="${esc(a.id)}">
        <div><strong>${esc(a.agent)}</strong> · ${esc(verdictWords(a.verdict))}${a.screens ? ' · can hide' : ''}</div>
        <div>${esc(a.finding)}</div>
        ${a.conditions ? `<div class="cond">${esc(a.conditions)}</div>` : ''}
        ${a.notes ? `<div class="cond">${esc(a.notes)}</div>` : ''}
        <div class="cond meas-foot">${esc(sourceName(c.sourceById.get(a.sourceId), a.sourceId))}${a.locator ? `, ${esc(a.locator)}` : ''}${ids(['Resin data row', a.id], ['Source', a.sourceId])}</div>
      </div>`).join('')}`).join('');
}

// ------------------------------------------------------------------ estimates

/** Not applicable is a statement about the property rather than an estimate, so it shows whatever the mode. */
function notApplicableCard(h: Loose, label: Loose) {
  return h && !h.known && h.notApplicable
    ? `<div class="est-card na-card"><h4>${esc(label)}: not applicable</h4><div class="est-basis">${esc(h.notApplicable.reason)}</div></div>`
    : '';
}

/**
 * One estimate, as a line that expands to its full record: both ranges, what it rests on, what it may screen, and every
 * measurement behind it, converted. Six lines of prose each, repeated for every missing headline, had pushed "Can the H2C
 * print it?" off the screen; the sentences every estimate shares are said once, under the group (estimateGroup). A
 * material's estimate is read only for a material with no product on record (`productless`); any other is judged product
 * by product, and its estimate is context that hides nothing (D148).
 */
function estimateCard(h: Loose, label: Loose, key: Loose, productless: Loose) {
  const e = h && !h.known && h.estimate;
  if (!e) return '';
  const s = ESTIMATE_STRENGTH[e.strength];
  // The card prints the unit beside its numbers, so an elastomer's stiffness reads in MPa, and says what the table's
  // column shows when that unit is not the card's. Converted evidence is a single number, in the card's unit.
  const d = estimateDisplay(e, { ownUnit: true });
  const pct = (p: Loose) => `${Math.round(p * 100)}%`;
  const measurements = e.evidence.reduce((n: Loose, ev: Loose) => n + ev.items.length, 0);
  // What it rests on, in a few words: how many of the material's own measurements, or the family model alone.
  const basis = measurements && e.strength !== 'family' ? `from ${measurements === 1 ? 'one' : measurements} of its own measurements` : s.short;
  const item = (i: Loose) => `${esc(i.property)} ${fmtNumber(i.value)} ${esc(i.unit)}${i.direction && !['not-applicable', 'unknown'].includes(i.direction) ? ` (${esc(i.direction)})` : ''}`
    + `${i.from ? `, ${esc(i.from)}` : ''}${i.measurementId ? ids(['Measurement', i.measurementId]) : ''}`;
  const evidence = e.evidence.length
    ? `<ul class="est-evidence">${e.evidence.map((ev: Loose) => `<li>${ev.items.map(item).join('; ')}
        ${ev.sameGrade ? '<span class="tag">same product</span>' : `<span class="tag">${esc(productName(gradeLookup.get(ev.gradeId)) || 'another product')}</span>`}
        → about ${d.num(ev.converted)} ${esc(d.unit)} for this property. <span class="fine">${esc(ev.conversion)}.</span>
        ${ev.conflict ? '<b>Disagrees with the rest and is down-weighted.</b>' : ''}</li>`).join('')}</ul>`
    : '';
  const bounds = e.bounds?.length ? ` Limited by ${e.bounds.map((b: Loose) => esc(b.why)).join('; ')}.` : '';
  const screen = !productless ? ' Context only: it hides nothing.'
    : e.canScreen ? ` It can hide this material, which has no product on record, from ${esc(screenRangeText(e, d.num, d.unit))}.`
    : ' It hides nothing.';
  return `<details class="est-card" data-estimate="${esc(key)}">
    <summary><span class="est-sum"><b>${esc(label)}</b> <span class="est est-${esc(e.precision)}">~${d.lo}–${d.hi} ${esc(d.unit)}<span class="est-mark">†</span></span>
      · ${esc(e.precision)} precision · ${esc(basis)}</span><span class="est-sum-toggle" aria-hidden="true"></span></summary>
    <div class="est-span">${d.lo} – ${d.hi} ${esc(d.unit)} <span class="fine">likely (${pct(e.levels.likely)}), centre ${d.centre}${d.inColumn ? `; ${d.inColumn[0]}–${d.inColumn[1]} ${esc(d.columnUnit)} in the table` : ''}</span></div>
    <div class="est-basis">Plausible range ${d.plausible[0]} – ${d.plausible[1]} ${esc(d.unit)} (${pct(e.levels.plausible)}). Precision: <b>${esc(e.precision)}</b>, ${esc(ESTIMATE_PRECISION[e.precision])}.
      ${esc(s.title)}${e.strength !== 'family' ? `. This material's own data carries about ${pct(e.ownShare)} of it` : ''}. Model family: ${esc(e.family)}.${bounds}
      ${e.sharedWith ? `Its product is also filed under ${esc(e.sharedWith.name)}, so both show this estimate.` : ''}
      ${screen} ${productless && e.screenLimit ? esc(`${e.screenLimit.charAt(0).toUpperCase()}${e.screenLimit.slice(1)}`) : ''}</div>
    ${evidence}
  </details>`;
}

/**
 * The estimates of a material's missing headlines, with what they all share said once. Shown only with estimates on.
 * `productless` says the material has no product on record, the one case its estimates are read for a requirement (D148).
 */
function estimateGroup(m: Loose, HEAD: Loose, showEstimates: Loose, productless: Loose) {
  const na = HEAD.map(([label, k]: Loose) => notApplicableCard(m.headline[k], label)).join('');
  const cards = showEstimates ? HEAD.map(([label, k]: Loose) => estimateCard(m.headline[k], label, k, productless)).filter(Boolean) : [];
  if (!cards.length) return na;
  const levels = HEAD.map(([, k]: Loose) => m.headline[k]?.estimate?.levels).find(Boolean) ?? { likely: 0.8, plausible: 0.95 };
  const pct = (p: Loose) => `${Math.round(p * 100)}%`;
  const anyScreen = HEAD.some(([, k]: Loose) => { const h = m.headline[k]; return h && !h.known && h.estimate?.canScreen; });
  return `${na}<h3 class="sec">Estimated, not measured</h3>
    <div class="est-cards">${cards.join('')}</div>
    <p class="fine est-group-note">Estimates fill gaps from related data and similar materials; tested on known values, a likely
      range held ${pct(levels.likely)} of the time and a plausible range ${pct(levels.plausible)}. An estimate never makes a material
      pass.${!productless ? ' This material is judged product by product, on each product\'s own values, so these estimates are context: none hides it.'
        : anyScreen ? ` This material has no product on record, so it is judged on its own values: with materials that could not be checked included and "Use estimates and resin data" on, an estimate hides it from a requirement its whole range misses, unless one of the material's own measurements could meet it.` : ''}</p>`;
}

/** Said under a Key number whose estimate reads in a smaller unit than its table column: "in MPa, where the table's column is in GPa". */
const unitNote = (e: Loose) => {
  const d = estimateDisplay(e, { ownUnit: true });
  return d.rescaled ? `; in ${esc(d.unit)} (the table uses ${esc(d.columnUnit)})` : '';
};

/** An estimated nozzle or bed window, where nothing is published. It decides nothing, and shows only with estimates. */
function windowEstimate(est: Loose, what: Loose, showEstimates: Loose) {
  if (!est || !showEstimates) return '';
  return `<div class="est-card"><h4>${esc(what)}: estimated, not published</h4>
    <div class="est-span">${fmtRange(est.lo, est.hi, ' – ')} ${esc(est.unit)}</div>
    <div class="est-basis">No source publishes this window. Estimated as the ${esc(est.basis)} (${est.peers.map((p: Loose) => `${esc(p.name)} ${fmtNumber(p.min)}–${fmtNumber(p.max)}`).join(', ')}).
      A starting point to verify; it changes no result.</div></div>`;
}

/** What the drawer draws for a family entry: no product and no values, so it says what the entry is, why it has no tabs, and links its members. */
export interface FamilyDrawer { readonly kind: 'family'; readonly m: Loose; readonly lede: string; readonly noTabs: string; readonly heading: string; readonly members: readonly Loose[]; readonly why: string; readonly sub: string; readonly status: string }

/** What the drawer draws for a material: its head, its tabs (with their counts), the line saying what the open tab holds, and the open tab's body as markup. */
export interface MaterialDrawer {
  readonly kind: 'material';
  readonly m: Loose;
  readonly c: Loose;
  readonly id: Loose;
  readonly idLine: string;
  readonly pinned: boolean;
  /** The material's own page, where the page rule gives it one, or null. */
  readonly page: string | null;
  readonly tab: string;
  readonly toGaps: boolean;
  readonly tabs: readonly { readonly key: string; readonly label: string; readonly selected: boolean; readonly empty: boolean; readonly count: string | null; readonly title: string | null }[];
  readonly help: string;
  readonly body: string;
}
export type DrawerModel = FamilyDrawer | MaterialDrawer;

function familyDrawer(m: Loose): FamilyDrawer {
  const f = m.familyEntry;
  return {
    kind: 'family', m, members: f.members, why: proseOnly(f.why),
    lede: f.kind === 'alias'
      ? `${m.name} is another name for the material below. Its products and values are filed there.`
      : `${m.name} names a group of materials, not one material. It is never a candidate: each product is filed under the material it is.`,
    noTabs: `Open ${f.members.length === 1 ? 'it' : 'one'} below for its products, values and print settings.`,
    heading: f.kind === 'alias' ? 'The material' : `${plural(f.members.length, 'member')}`,
    sub: f.kind === 'alias' ? 'Another name' : 'A group name, not a material', status: h2cStatusLabel(m.h2cStatus),
  };
}

/**
 * The drawer of the open material, from the database as the drawer sees it (`db`: the core with this material's detail joined in, see
 * drawer/db.ts), the selector's state and the engine's answer. Null when nothing is open. The drawer never recomputes a decision: its
 * requirements lines, its counts and its sentences are the engine's and the facts layer's.
 */
/** Where a material's pages are, relative to this page, with the trailing slash: the page rule writes them as `materials/<id>.html`, beside the selector's page. */
const atPages = (text: string): string => (pagesBase === 'materials/' ? text : text.replaceAll('href="materials/', `href="${pagesBase}`).replaceAll('data-card-href="materials/', `data-card-href="${pagesBase}`));

export function drawerModel(db: Loose, state: Loose): DrawerModel | null {
  const { selectedMaterialId, drawerTab, selection } = state;
  const m = db.materials.find((x: Loose) => x.id === selectedMaterialId);
  if (!m) return null;
  if (m.familyEntry) return familyDrawer(m);
  if (drawerQueryFor !== m.id) { drawerQuery = ''; drawerQueryFor = m.id; }
  if (gradeOpenFor !== m.id) { gradeOpen.clear(); gradeOpenFor = m.id; }

  // One material's facts, as the material pages read them too (material-facts.js materialContext).
  const c = materialContext(db, m.id, {
    evaluation: selection.evaluations.find((e: Loose) => e.materialId === m.id), scenario: state.scenario, showEstimates: !!state.ctx?.showEstimates,
    highlight: state.highlightMeasurement, highlightSource: state.highlightSource,
  });
  gradeLookup = c.gradeById;
  const { counts } = c;
  // The Coverage tab is Sources' Known gaps now: a request for it (a Data coverage cell, an empty tab's link, an older
  // link) opens Sources there.
  const toGaps = drawerTab === 'Coverage';
  const asked = toGaps ? 'Evidence' : drawerTab;
  const tab = asked in counts ? asked : 'Overview';
  const id = identity(m, c);
  // The material's own page, where the page rule gives it one (page-rule.js): it opens in this tab, carrying the selection.
  const pageRelative = pageOf(m, c.ms);
  const page = pageRelative && pagesBase !== 'materials/' ? pageRelative.replace(/^materials\//, pagesBase) : pageRelative;
  const help = TAB_HELP[tab]?.(counts[tab], c) ?? '';
  const idLine = `${esc(identityLine(id))}
            ${explainButton(esc(h2cStatusLabel(m.h2cStatus)), H2C_STATUS[m.h2cStatus]?.meaning ?? m.h2cStatus, { cls: `chip ${m.excluded ? 'chip-FAIL' : 'chip-neutral'} chip-small h2c-chip`, head: 'Bambu Lab status' })}`;
  return {
    kind: 'material', m, c, id, idLine, page, tab, toGaps, help,
    pinned: state.scenario.shortlist.includes(m.id),
    tabs: TABS.map(([k = '', label = '']) => ({
      key: k, label, selected: k === tab, empty: counts[k] === 0,
      count: COUNTED_TABS.includes(k) && counts[k] !== null ? fmtNumber(counts[k]) : null,
      title: COUNTED_TABS.includes(k) || counts[k] === null ? null : `${label}: ${fmtNumber(counts[k])}`,
    })),
    body: atPages(tabBody(tab, c)),
  };
}

/** The grades' open state and the search text, kept while the same material is open (the drawer is drawn again on a change of tab or shortlist). */
export const drawerState = {
  /** Whether a product's card is open, by product. */
  gradeOpen: (id: string): boolean | undefined => gradeOpen.get(id),
  setGradeOpen: (id: string, open: boolean): void => { gradeOpen.set(id, open); },
  /** Sets the search text the tabs' boxes carry, and hides what it does not name in the drawer drawn in `host`. */
  search: (host: Loose, text: string): void => { drawerQuery = text; applySearch(host); },
  applySearch: (host: Loose): void => { applySearch(host); },
};

// ------------------------------------------------------------------ a material's products (D83)

/** The state a product's result is in (D99): annealed at its sheet's schedule, conditioned, or as printed and dry. */
function stateNote(j: Loose) {
  const s = j.state;
  if (!s || (!s.treatment && s.moisture !== 'conditioned')) return '';
  const bits = [s.treatment ? `annealed ${scheduleWords(s.treatment)}, as its data sheet states` : null, s.moisture === 'conditioned' ? 'moisture-conditioned' : null].filter(Boolean);
  return `<div class="fact-why state-note">Evaluated ${esc(bits.join(', '))}.${s.treatment ? ' The values below measured after annealing are the ones used.' : ''}</div>`;
}

/** What keeps an unresolved product from an answer (D99): the first requirement it could not settle, and why. */
function unsettled(j: Loose, requirementOf: Loose) {
  const r = (j.results ?? []).find((x: Loose) => x.status === 'UNKNOWN' || x.status === 'INDETERMINATE');
  if (!r) return '';
  const what = requirementOf.has(r.criterion) ? describeConstraint(requirementOf.get(r.criterion)) : r.criterion;
  return `<div class="fact-why unsettled"><b>Unresolved:</b> ${esc(what)}. ${esc(r.reason)}.</div>`;
}

/** A product's own value for each headline (build/src/products.js): its measurement, and a mark where it is not comparable. */
function productValues(g: Loose, c: Loose) {
  // Every headline it publishes, those drawn in the drawer alone too (D139).
  const rows = REGISTRY.allHeadlines.filter((h: Loose) => g.headline?.[h.key]).map((h: Loose) => {
    const v = g.headline[h.key];
    // A bound the source published ("> 300 %") reads as one, and the hover says it is a limit and not the value.
    const shown = esc(fmtBounded(v.value, h.unit, v.interval));
    const note = boundNote(v.interval, v.value, h.unit);
    const value = v.measurementId
      ? `<button type="button" class="evidence-value" data-measurement="${esc(v.measurementId)}" title="${esc(note ? `${note} Opens the measurement in Sources` : 'Opens the measurement in Sources')}">${shown}<span class="evidence-dot" aria-hidden="true"></span></button>`
      : `${shown}${v.observations ? ` <span class="fine">(${plural(v.observations, 'listing')})</span>` : ''}`;
    // A value set apart (D172): from a test bar no document describes as printed, or a heat deflection with no stated load.
    const mark = v.level === 'as-published'
      ? ` ${explainButton('set apart', (h.drawerOnly ? DRAWER_LEVEL_NOTE : LEVEL_NOTE[v.caveat]) ?? 'Set apart: shown, never used to pass a requirement.', { cls: 'missing lvl', head: v.caveat === 'load-not-stated' ? 'Test load not stated' : 'Test bar not described as printed' })}`
      // A printed bar whose sheet states no orientation is read as a flat one (D172), and says so.
      : v.admitted?.includes('direction') ? ' <span class="fine">orientation not stated; a printed bar, read as flat</span>'
        // An undescribed bar a heat deflection counts all the same (D177).
        : v.admitted?.includes('bar') ? ' <span class="fine">test bar not described; counted, as a plastic that cannot crystallise deflects near its glass transition however its bar was made</span>' : '';
    const anneal = v.anneal ? ` <span class="fine">annealed${v.anneal.tempC != null ? ` at ${fmtNumber(v.anneal.tempC)} °C` : ''}${v.anneal.hours != null ? ` for ${fmtNumber(v.anneal.hours)} h` : ''}</span>` : '';
    // A value that is only a ceiling for the printed part (CV05), or one its other records contradict (C40, D153).
    const first = g.states?.[0]?.values?.[h.key];
    const flag = first?.measurementId === v.measurementId && first?.ceilingOnly ? ' <span class="fine">a ceiling: the most a printed part reaches</span>'
      : first?.measurementId === v.measurementId && first?.doubtful ? ' <span class="fine">doubtful: its other records disagree</span>' : '';
    return `<dt>${esc(h.labels.plain)}</dt><dd>${value}${mark}${anneal}${fromNote(v.from)}${flag}</dd>`;
  });
  const ledger = ledgerLines(g, c);
  const replaced = replacedLines(g, c);
  if (!rows.length && !ledger) return `<div class="fine">This product publishes none of the key properties comparably: on a test bar its documents describe as printed, or for heat deflection a bar of a plastic that cannot crystallise that its documents do not tie to moulding.</div>${replaced}`;
  return `${rows.length ? `<div class="shared-head">Values</div><dl class="kv small product-values">${rows.join('')}</dl>` : ''}${ledger}${replaced}`;
}

/** A document by name, with the edition it prints where its title does not say it (D171). */
const editionName = (c: Loose, sid: Loose) => {
  const s = c.sourceById.get(sid);
  const n = sourceName(s, sid);
  return esc(stated(s?.revision) && !n.includes(s.revision) ? `${n}, ${s.revision}` : n);
};
/**
 * What a newer edition of a product's sheet, or its data sheet, replaced (D171, grades[].replaced): each figure that differs
 * a lot from the product's value, small, as not used in deciding, with the document that replaced it.
 */
function replacedLines(g: Loose, c: Loose) {
  const list = g.replaced ?? [];
  if (!list.length) return '';
  const items = list.map((r: Loose) => {
    const h = REGISTRY.allHeadlines.find((x: Loose) => x.key === r.key);
    const what = `${esc(h?.labels.plain ?? r.key)} ${esc(fmtNumber(r.value))} ${esc(h?.unit ?? '')}`;
    return r.why === 'older-edition' ? `${what} in an older edition of its sheet (${editionName(c, r.sourceId)}); the newer one (${editionName(c, r.by)}) is used`
      : `${what} on ${editionName(c, r.sourceId)}; the data sheet (${editionName(c, r.by)}) is used`;
  });
  return `<p class="fine replaced-note">Differs a lot in another document of this product, not used in deciding: ${items.join('; ')}.</p>`;
}

/**
 * What the evidence ledger bounds a product to where it publishes no comparable value (D153, D154): the deciding records'
 * interval, each record named, and the rows not yet deciding, said so. As printed and dry, as the table shows the product.
 */
function ledgerLines(g: Loose, c: Loose) {
  const rows = [];
  for (const h of REGISTRY.allHeadlines) {
    const b = g.states?.[0]?.bounds?.[h.key];
    if (!b) continue;
    const words = (x: Loose) => esc(contributionWords(x, h.unit, ledgerRow(c.db, x.rule)?.words));
    const deciding = b.by.filter((x: Loose) => x.status === 'deciding');
    const pending = b.by.filter((x: Loose) => x.status !== 'deciding');
    const range = b.disagree ? 'its records disagree' : b.lo != null && b.hi != null ? `between ${esc(fmtNumber(b.lo))} and ${esc(fmtNumber(b.hi))} ${esc(h.unit)}`
      : b.lo != null ? `at least ${esc(fmtNumber(b.lo))} ${esc(h.unit)}` : b.hi != null ? `at most ${esc(fmtNumber(b.hi))} ${esc(h.unit)}` : '';
    const parts = [
      ...(deciding.length ? [`${range ? `${range}: ` : ''}${deciding.map(words).join('; ')}`] : []),
      ...(pending.length ? [`<span class="fine">not yet deciding: ${pending.map(words).join('; ')}</span>`] : []),
    ];
    rows.push(`<dt>${esc(h.labels.plain)}</dt><dd>${parts.join('<br>')}</dd>`);
  }
  return rows.length ? `<div class="shared-head">Bounds from its other records</div><dl class="kv small product-values ledger-lines">${rows.join('')}</dl>` : '';
}

/**
 * Where a value or a part of a recipe was read when it is not the product's own sheet: a data sheet it shares with
 * another product (D89), or the Bambu Lab Filament Guide (D88). Always said beside it.
 */
const fromNote = (from: Loose) => (from ? ` <span class="fine from-note from-${esc(from.origin)}">${esc(from.label)}</span>` : '');

/**
 * How to print a product, from its own profiles (grades[].print): never its material's union. A part its own profiles
 * are silent on may come from a data sheet it shares or from the Bambu Lab Filament Guide, and says so (D88, D89).
 */
function printCard(g: Loose, c = null) {
  const p = g.print;
  const from = p?.from ?? {};
  const some = !!p?.profileIds.length || Object.keys(from).some((a) => a !== 'anneal');
  if (!some && !p?.anneal?.length) return '<div class="print-card fine">No print settings on file for this product. Its maker\'s other products may be similar, but that is not this product\'s data.</div>';
  // Where a part was read from a data sheet the product shares or from the Bambu Lab Filament Guide, it is said once,
  // under the card, for every part read from it (2026-10-18): PLA's Products tab had printed "from Bambu Lab's Filament
  // Guide for PLA" 876 times, after each cell. An enclosure with no temperature is the H2C's heated chamber: the guide's
  // (D90) or, for the same types, its maker's own words (D93), which the gate's reason quotes (settingWords).
  const NAMES: Record<string, string> = { nozzle: 'nozzle', bed: 'bed', chamber: 'chamber', enclosure: 'enclosure', hardenedNozzle: 'hardened nozzle', drying: 'drying', anneal: 'annealing' };
  const read = new Map<string, string[]>();
  // In the order the card lists its parts, whatever order the published row keeps its keys in.
  for (const key of Object.keys(NAMES)) { const f: Loose = from[key]; if (f) (read.get(f.label) ?? read.set(f.label, []).get(f.label)!).push(NAMES[key] ?? key); }
  const axis = (label: Loose, key: Loose) => (some ? `<dt>${label}</dt><dd>${esc(settingWords(p[key]))} ${gateChip(p[key], label, key)}</dd>` : '');
  const anneal = annealWords(p.anneal);
  return `<div class="print-card"><div class="shared-head">Print settings</div><dl class="kv small">
    ${axis('Nozzle', 'nozzle')}${axis('Bed', 'bed')}${axis('Heated chamber', 'chamber')}
    ${some ? `<dt>Enclosure</dt><dd>${esc(p.enclosure === 'unknown' ? 'not published' : p.enclosure.replace(/-/g, ' '))}</dd>
    <dt>Hardened nozzle</dt><dd>${p.hardenedNozzle === true ? 'required' : p.hardenedNozzle === false ? 'not needed' : 'not published'}</dd>
    <dt>Drying</dt><dd>${esc(dryingWords(p.drying))}</dd>` : ''}
    ${anneal.length ? `<dt>Annealing</dt><dd>${esc(anneal.join('; '))} (some of its values were measured after it)</dd>` : ''}
  </dl>${[...read].map(([label, parts]) => `<p class="fine from-note">${esc(cap(andList(parts)))}: ${esc(label)}, where this product's own sheet is silent.</p>`).join('')}${c ? replacedPrintLines(p, c, NAMES) : ''}</div>`;
}

/**
 * The print settings a product's data sheet or newer edition replaced where they differ (D171, print.replaced): small,
 * as not used in deciding, with the document that replaced them.
 */
function replacedPrintLines(p: Loose, c: Loose, NAMES: Loose) {
  const byId = c.profileById ?? (c.profileById = new Map((c.db?.profiles ?? []).map((x: Loose) => [x.id, x])));
  const items = Object.entries<Loose>(p?.replaced ?? {}).flatMap(([axis, list]) => list.map((r: Loose) => {
    const prof = byId.get(r.profileId);
    const t = prof?.[axis];
    const said = t?.state === 'range' ? `${fmtNumber(t.min)}${t.max != null && t.max !== t.min ? `–${fmtNumber(t.max)}` : ''} °C` : axis === 'drying' ? dryingWords(prof?.drying) : 'another setting';
    return `${NAMES[axis] ?? axis} ${esc(said)} ${r.why === 'older-edition' ? `in an older edition of its sheet (${editionName(c, r.sourceId)})` : `on ${editionName(c, r.sourceId)}`}; ${r.why === 'older-edition' ? 'the newer one' : 'the data sheet'} (${editionName(c, r.by)}) is used`;
  }));
  return items.length ? `<p class="fine replaced-note">Differs in another document of this product, not used in deciding: ${items.join('; ')}.</p>` : '';
}

// What a maker writes about printing and using a product beyond its numbers (db.knowHow, build/src/know-how.js): its
// statements in its own words, by topic, each with its source and page. Shown, never filtered on. Where the product's
// documents say nothing, the state says so and names the maker, instead of an empty section (docs/GOALS.md). The pages
// read the same map from material-facts.js indexDb (knowHowByGrade); this one stays with the drawer's other state.
const knowHowIndex = new WeakMap();
/** The know-how statements of a database, by product. */
function knowHowOf(db: Loose) {
  if (!knowHowIndex.has(db)) {
    const byGrade = new Map();
    for (const k of db.knowHow ?? []) (byGrade.get(k.gradeId) ?? byGrade.set(k.gradeId, []).get(k.gradeId)).push(k);
    knowHowIndex.set(db, byGrade);
  }
  return knowHowIndex.get(db);
}

/**
 * A statement's note as the drawer shows it (2026-10-18): a reader's caveat ("printed geometry, test method, service load
 * and lifetime unstated") beside the quote, one press away; a maintainer's note ("Read 2026-10-05 … (m413)", a restatement
 * of what the tab's line says once) behind the record's ID mark with its IDs, the pages' rule (material-facts.js
 * readerNote). About 2,700 of 3,004 had stood as a "review note" button on every line.
 */
const RESTATES_LEDE = /\b(?:concentration|duration|temperature|exposure time)\b[^.]*\b(?:not (?:specified|stated|given)|unspecified|unstated)\b/i;
const noteOf = (raw: Loose, { lede = false } = {}) => {
  const note = String(raw ?? '').trim();
  if (!note || /^(not published|not applicable|not stated|not recorded|n\/a)\.?$/i.test(note)) return { shown: '', behind: null };
  if (readerNote(note) && !(lede && RESTATES_LEDE.test(note))) {
    return { shown: ` ${explainButton('caveat', note, { cls: 'maker-conditions', head: 'What the statement leaves out' })}`, behind: null };
  }
  return { shown: '', behind: ['Note:', note] };
};

/**
 * A record's prose with the records it names taken out (2026-10-18): "recorded as a Variant under D57 (R078,
 * m131-grades-the-sweep-found)" reads "recorded as a Variant". A parenthesis that is not reader text and a decision
 * named after "under" leave the sentence; the full text stays behind the ID mark.
 */
function proseOnly(text: Loose) {
  const t = String(text ?? '');
  if (readerText(t)) return t;
  return t.replace(/\s*\(([^()]*)\)/g, (all, inner) => (readerText(inner) ? all : '')).replace(/\s+under D\d{2,3}\b/g, '').replace(/[;,]?\s*ruling R\d{3}\b/g, '').replace(/\s+([;,.])/g, '$1').trim();
}

/** Where a statement stands, in a few words (a data sheet or the maker's product page, and the page), opening where. */
function knowHowSource(k: Loose, c: Loose, behind: Loose = null) {
  const s = c.sourceById.get(k.sourceId);
  const kind = s?.sourceClass === 'Manufacturer product page or guide' ? 'product page'
    : s?.sourceClass === 'Manufacturer TDS' ? 'data sheet' : lower(sourceKind(s));
  const page = /^p\. ?\d+/.exec(String(k.locator ?? ''))?.[0];
  const where = `${sourceName(s, k.sourceId)}${stated(k.locator) ? `, ${k.locator}` : ''}.`;
  return `<span class="maker-src">— ${explainButton(esc(`${kind}${page ? `, ${page}` : ''}`), where, { cls: 'src-where', head: 'Where this is stated' })}</span>${ids(['Statement', k.id], ['Source', k.sourceId], ...(behind ? [behind] : []))}`;
}

function makerSays(g: Loose, c: Loose) {
  const k = g.knowHow;
  const own = knowHowOf(c.db).get(g.id) ?? [];
  const topics = c.db.meta.knowHow?.topics ?? [];
  // The product's other evidence records (chemical resistance, flammability and the like): the Environment tab lists
  // them with the material's; here they stay with the product they were published for.
  const records = c.ev.filter((e: Loose) => e.gradeId === g.id);
  const other = records.length ? `<details class="grade-more"><summary>Its environment statements (${records.length})</summary><dl class="kv small">
    ${records.map((e: Loose) => `<dt>${esc(e.categoryLabel ?? e.domain)}</dt><dd>${esc(e.topic)}: ${esc(e.finding)}</dd>`).join('')}</dl></details>` : '';
  if (!k) return other;
  // What its documents leave unsaid, and whether its website was checked (material-facts.js knowHowGapFacts), as one
  // closed line under the quotes (2026-10-18): the list of twelve topics had run under every card.
  const facts = knowHowGapFacts(g, topics);
  const gapText = knowHowGap(facts);
  const n = facts.state === 'collected' ? facts.missing.length + facts.recipe.length : 0;
  const gap = gapText && n > 1
    ? `<details class="grade-more maker-gap"><summary>Not stated by its maker: ${n} topics</summary><p class="fine">${esc(gapText)}</p></details>`
    : gapText ? `<p class="fine">${esc(gapText)}</p>` : '';
  if (!own.length) return `<div class="fine maker-says-gap">${gapText ? esc(gapText) : ''}</div>${other}`;
  const groups = topics.map((t: Loose) => [t, own.filter((x: Loose) => x.topic === t)]).filter(([, list]: Loose) => list.length);
  return `<div class="maker-says"><div class="shared-head">What the maker says</div><dl class="kv small">
    ${groups.map(([t, list]: Loose) => `<dt>${esc(t)}</dt><dd><ul class="maker-quotes">${list.map((x: Loose) => { const n = noteOf(x.exposure); return `<li>“${esc(x.text)}” ${knowHowSource(x, c, n.behind)}${n.shown}</li>`; }).join('')}</ul></dd>`).join('')}
  </dl>${gap}</div>${other}`;
}

/** Across a material's products: how many makers say something on each topic, and where the sheets are silent. */
function makersSayCounts(m: Loose, c: Loose) {
  const f = makersSayFacts(m, c);
  if (!f) return '';
  const silent = makersSilentWords(f.states);
  const recipe = makersRecipeWords(f.recipe);
  return `<h3 class="sec">What makers say</h3>
    <p class="fine"><b>${f.total === 1 ? 'Its one product' : f.collected ? `${f.collected} of ${plural(f.total, 'product')}` : `None of its ${f.total} products`}</b> ${f.collected === 0 ? (f.total === 1 ? 'has no statement from its maker' : 'has a statement from its maker') : f.collected === 1 ? 'has statements from its maker' : 'have statements from their makers'}${f.collected ? ', quoted under each product' : ''}.${silent.length ? ` ${cap(silent.join('; '))}.` : ''} ${sitesLine(f.sitesSearched, f.total)}</p>
    <ul class="print-counts">${f.topics.map((t: Loose) => `<li><b>${esc(t.topic)}</b>: ${t.makers} of ${plural(f.makers, 'maker')}${t.stated ? ` (${plural(t.products, 'product')})` : ''}</li>`).join('')}</ul>
    ${recipe.length ? `<p class="fine">Not stated by their documents: ${esc(andList(recipe))}.</p>` : ''}`;
}

/**
 * The Bambu Lab Filament Guide's row for this material's type (db.printGuide, D88): what it states, and what it is for.
 * It is read for a product only where the product's own sheet, and a data sheet it shares, say nothing on a part of the
 * print check, or on its drying (D127); it is never a profile of this material.
 */
function guideBlock(m: Loose, c: Loose) {
  const f = guideFacts(m, c);
  if (!f) return '';
  const { guide, why, readBy } = f;
  const enclosure = guideEnclosureWords(guide.enclosureState);
  const hardened = guideHardenedWords(guide.abrasion.requiresHardened);
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


// ------------------------------------------------------------------ headlines drawn side by side (D133)

/**
 * The mark beside a product its maker sells as toughened: the maker's words, where, and that they are a claim. The
 * product's name is never the reason (D133).
 */
function toughenedMark(g: Loose, c: Loose) {
  const f = toughenedClaim(g, c);
  if (!f) return '';
  return ` ${explainButton('sold as toughened', toughenedClaimWords(g, f), { cls: 'chip chip-claim chip-small', head: 'Sold as toughened by its maker' })}`;
}

// The dots of one row, on a scale shared by the rows of its graph (scales.js), with faint grid lines at its ticks.
const gridLines = (scale: Loose) => scale.ticks.map((v: Loose) => `<span class="imp-grid" style="left:${scale.pct(v)}%"></span>`).join('');
/** A dot's shape: hollow where shown and not ranked (set apart, D172, or the guide's), square annealed, a diamond an added filler or additive, coloured sold as toughened. */
const dotClass = (h: Loose, e: Loose, c: Loose) => dotMarks(h, e, c).join(' ');
/** Per cent of the track between two columns' counts: closer, the smaller column keeps its height alone. */
const COUNT_GAP = 5;
/** The numbers a graph's table prints for headline `key`: the requirements on it, which no rounding may cross. */
const thresholdsOf = (c: Loose, key: Loose) => (c.scenario?.constraints ?? []).filter((r: Loose) => r.property === key && Number.isFinite(r.value) && r.operator);

/**
 * One headline's row of dots: a product each, the middle half of the ranked ones shaded and their median marked. A dot
 * opens its record (`data-row`), or the target its value carries; `limit` is drawn across the track (the H2C's limit on a
 * print setting, and the range beyond it). The rows a stack needs are drawn closer past the track's height (stackPitch),
 * so a column's height counts its products, and a column of one value taller than its dots can show apart says how many
 * it holds. The products in the median are "ranked" on every graph, a comparison's or a print setting's (C49).
 */
function dotRow(h: Loose, entries: Loose, s: Loose, scale: Loose, c: Loose, gradeLabel: Loose, { limit = '' } = {}) {
  const rows = stack(entries, scale.pct);
  const pitch = stackPitch(rows);
  const band = s?.q1 != null ? `<span class="imp-band" style="left:${scale.pct(s.q1)}%;width:${Math.max(scale.pct(s.q3) - scale.pct(s.q1), 0.5)}%"></span>` : '';
  const median = s?.n > 1 ? `<span class="imp-median" style="left:${scale.pct(s.median)}%" title="${esc(`Median of the ${s.n} ranked: ${graphNumber(s.median, h.unit, thresholdsOf(c, h.key))} ${h.unit}`)}"></span>` : '';
  const dots = entries.map((e: Loose) => {
    const x = c.msById.get(e.v.measurementId);
    const claimed = !!h.toughened && soldToughened(e.g, e.v, c);
    const kind = [e.v.level === 'as-published' ? asPublishedWords(h) : null, ...changedState(x, e.v),
      e.variant ? 'added filler or additive, kept out of the median' : null, claimed ? 'sold as toughened by its maker' : null, e.v.from ? e.v.from.label : null].filter(Boolean);
    const title = `${gradeLabel(e.g)}: ${fmtBounded(e.v.value, h.unit, e.v.interval)}${kind.length ? ` (${kind.join('; ')})` : ''}`;
    const cls = dotClass(h, e, c);
    return `<button type="button" class="imp-dot${cls ? ` ${cls}` : ''}" ${e.v.target ?? `data-row="${esc(e.v.measurementId)}"`} data-grade="${esc(e.g.id)}"
      style="left:${e.x}%;bottom:${Number((3 + e.row * pitch).toFixed(1))}px" title="${esc(title)}" aria-label="${esc(title)}" tabindex="-1"></button>`;
  }).join('');
  // A column of one value with more dots than show apart at full pitch carries its count, over its top dot: the tallest
  // first, and a neighbour whose count would touch it keeps its height alone (print settings sit 5 °C apart).
  const columns = new Map();
  for (const e of entries) { const col = columns.get(e.v.value) ?? { v: e.v.value, n: 0, x: e.x, top: 0 }; col.n++; col.top = Math.max(col.top, e.row); columns.set(e.v.value, col); }
  const placed: Loose = [];
  const tall = [...columns.values()].filter((col) => col.n > COLUMN_SHOWN).sort((a, b) => b.n - a.n)
    .filter((col) => { if (placed.some((x: Loose) => Math.abs(x - col.x) < COUNT_GAP)) return false; placed.push(col.x); return true; }).map((col) => [col.v, col]);
  const counts = tall.map(([v, col]) => `<span class="imp-count" aria-hidden="true" style="left:${col.x}%;bottom:${Number((4 + (col.top + 1) * pitch).toFixed(1))}px" title="${esc(`${plural(col.n, 'product')} at ${fmtNumber(v)} ${h.unit}`)}">${col.n}</span>`).join('');
  const height = 8 + rows * pitch + (tall.length ? 14 : 0);
  return `<div class="imp-row" data-headline="${esc(h.key)}"><span class="imp-label">${esc(h.labels.plain)}<span class="fine">${esc(rowCountWords(s?.n ?? 0, entries.length))}</span></span>
    <span class="imp-track" style="height:${Number(height.toFixed(1))}px">${gridLines(scale)}${limit}${band}${median}${dots}${counts}</span></div>`;
}

/**
 * What each row of dots holds, a test a line: how many products are compared, their median, middle half and range, and
 * the products drawn but left out of the median, by why. Where the rows are in more than one unit, each says its own.
 */
function spreadSummary(hs: Loose, m: Loose, c: Loose) {
  const units = new Set(hs.map((h: Loose) => h.unit));
  const row = (h: Loose) => {
    const s = m.summary?.[h.key];
    const th = thresholdsOf(c, h.key);
    const apart = apartWords(h, s, th);
    // A median that is a published bound keeps its sign, as the key properties print it (C14).
    return `<tr><th scope="row">${esc(h.labels.plain)}${units.size > 1 ? ` <span class="u">${esc(h.unit)}</span>` : ''}</th><td class="num">${s?.n ?? 0}</td><td class="num">${s?.n ? esc(`${medianSign(m, h.key)}${graphNumber(s.median, h.unit, th)}`) : '—'}</td>
      <td class="num">${s?.q1 != null ? esc(graphSpan(s.q1, s.q3, h.unit, th)) : '—'}</td><td class="num">${s?.n ? esc(graphRange(s, h.unit, th)) : '—'}</td></tr>
      ${apart.length ? `<tr class="imp-apart"><td colspan="5">Not ranked: ${esc(apart.join(', '))}.</td></tr>` : ''}`;
  };
  const claimed = hs.map((h: Loose) => [h, m.summary?.[h.key]]).filter(([, s]: Loose) => s?.claimed);
  const toughened = `${claimed.some(([, s]: Loose) => !s.claimed.setApart) ? ` ${claimed.filter(([, s]: Loose) => !s.claimed.setApart).map(([h, s]: Loose) => `${h.labels.plain}: ${toughenedSplit(s, h.unit)}`).map(esc).join(' ')}` : ''}${
    claimed.length ? ` ${TOUGHENED_NOTE}` : ''}`;
  // Where no value drawn is compared, a table of dashes says nothing: one sentence says why there is no median.
  if (hs.every((h: Loose) => !m.summary?.[h.key]?.n)) return `<p class="fine imp-foot imp-no-median">No median: ${esc(noMedianWhy(hs, m))}.${toughened}</p>`;
  return `${scrollTable(`<table class="grid imp-summary"><thead><tr><th>Test${units.size > 1 ? '' : `, <span class="u">${esc(hs[0].unit)}</span>`}</th><th class="num" title="Products ranked: in the median and middle half">Ranked</th><th class="num">Median</th>
      <th class="num">Middle half</th><th class="num">Range</th></tr></thead><tbody>${hs.map(row).join('')}</tbody></table>`)}
    ${toughened ? `<p class="fine imp-foot">${toughened.trim()}</p>` : ''}`;
}

/**
 * The comparisons a tab draws (drawer_comparisons.csv, headline_definitions "Drawer comparison", D133, D139), each one
 * heading among the property blocks that holds everything on its tests: a row of dots per headline, a product each, on
 * a scale shared by the headlines of its unit; a table of what each row's median is of; then every record of the
 * properties its headlines read, under its property, with its document. The record a dot stands for says so, and where
 * it sits. Nothing is converted between the tests. Returns each with the properties whose blocks it takes in and the
 * line each dot's record carries.
 */
function drawerComparisons(m: Loose, c: Loose, tab: Loose) {
  const gradeLabel = productNameOrId;
  return comparisonsOf(m, c, tab).map((f: Loose) => {
    const { cmp, topic, hs, byKey, drawnGraphs, singles, shown } = f;
    // One product's value, named in a sentence with the way to its record.
    const oneValue = ({ h, e }: Loose) => `<button type="button" class="link-btn" data-row="${esc(e.v.measurementId)}">${esc(fmtBounded(e.v.value, h.unit, e.v.interval))}</button>${
      e.v.level === 'as-published' ? `, with ${esc(asPublishedWords(h))}` : ''}`;
    let graph = '';
    if (drawnGraphs.length) {
      // A key only for the marks drawn, and the middle half and median only where a row has them.
      // Above the first graph, in the pages' words (GRAPH_KEY); the middle half and median one item, as there.
      const k = f.key;
      const key = [
        k.filled.length ? `<span><i class="imp-dot"></i> ${esc(GRAPH_KEY.filled)}</span>` : '',
        k.open.length ? `<span><i class="imp-dot open"></i> ${esc(GRAPH_KEY.open)}</span>` : '',
        k.annealed ? `<span><i class="imp-dot annealed"></i> ${esc(GRAPH_KEY.annealed)}</span>` : '',
        k.variant ? `<span><i class="imp-dot variant"></i> ${esc(GRAPH_KEY.variant)}</span>` : '',
        k.claimed ? `<span><i class="imp-dot claimed"></i> ${esc(GRAPH_KEY.claimed)}</span>` : '',
        k.band ? `<span><i class="imp-band-key"></i> ${esc(GRAPH_KEY.band)}</span>` : k.median ? `<span><i class="imp-median-key"></i> ${esc(GRAPH_KEY.median)}</span>` : '',
      ].join('');
      const hint = `Select a dot to open its result below${shown.length > 1 ? `; hover to find the same product in the other row${shown.length > 2 ? 's' : ''}` : ''}.`;
      const strips = drawnGraphs.map((gr: Loose, i: Loose) => {
        const scale = stripScale(gr.dots.map((d: Loose) => d.e.v.value), gr.unit);
        const axis = `<div class="imp-row imp-axis"><span class="fine">${esc(gr.unit)}${scale.log ? ', log scale' : ''}</span><span class="imp-scale">${scale.ticks.map((v: Loose) => `<span${scale.pct(v) >= 99.5 ? ' class="end"' : scale.pct(v) <= 0.5 ? ' class="start"' : ''} style="left:${scale.pct(v)}%">${esc(fmtNumber(v))}</span>`).join('')}</span></div>`;
        return `<div class="imp-strips">
        ${gr.rows.map((h: Loose) => dotRow(h, byKey.get(h.key), m.summary?.[h.key], scale, c, gradeLabel)).join('')}
        ${axis}${i < drawnGraphs.length - 1 ? '</div>' : `
        <p class="fine imp-hint">${hint}</p></div>`}`;
      }).join('');
      // A row whose headlines all go unread is said; its results are listed below where no other row reads them.
      const silentText = silentRowsWords(f.silentListed, f.silentUnlisted);
      const silentLine = silentText ? `<p class="fine imp-foot">${esc(silentText)}</p>` : '';
      const singleLine = singles.length ? `<p class="fine imp-foot">${singles.map((d: Loose) => `${esc(d.h.labels.plain)}: only one product has a value, ${esc(gradeLabel(d.e.g))}'s ${oneValue(d)}.`).join(' ')}</p>` : '';
      // The products that publish both of a pair, by name where there is one pair; and where the pair is one test on
      // bars printed two ways, the share one gives of the other, product by product.
      const pairText = pairWords(pairLabelOf(cmp, hs), f.pairs, f.pairs.map((p: Loose) => p.both.map(gradeLabel)), drawnGraphs.length === 1);
      const bothLine = pairText ? `<p class="fine imp-foot">${esc(pairText)}</p>` : '';
      const shareText = shareWords(f.shares, f.noShare);
      const shareLine = shareText ? `<p class="fine imp-foot">${esc(shareText)}</p>` : '';
      graph = `<p class="imp-key fine">${key}</p>${strips}
        ${spreadSummary(shown, m, c)}${singleLine}${silentLine}${bothLine}${shareLine}`;
    }
    // The line a dot's record carries: its mark, where it sits, and what changed its bar. A twin's dot is its
    // sibling's record (D89), which then carries a line for each product it stands for.
    const lines = new Map();
    for (const o of f.onGraph) {
      const { h, e, x } = o;
      const mark = o.marks.join(' ');
      const whose = o.alsoFor ? alsoForWords(gradeLabel(e.g), e.v.from) : '';
      // The maker's quote is the mark itself: in the reason where it is why, else after the line.
      const chip = o.claimed ? toughenedMark(o.owner, c).trim() : '';
      const place = !o.reason ? 'in the median' : `not in the median (${o.reason === 'toughened' && chip ? chip : esc(outOfMedianWords(o.reason, h))})`;
      const state = changedState(x, e.v);
      const line = `<div class="cond on-graph" data-on-graph="${esc(h.key)}"><i class="imp-dot${mark ? ` ${mark}` : ''}" aria-hidden="true"></i><span><b>On the graph${esc(whose)}:</b> ${place}${
        state.length ? `; ${esc(state.join(', '))}` : ''}.${chip && !place.includes(chip) ? ` ${chip}` : ''}</span></div>`;
      lines.set(o.mid, (lines.get(o.mid) ?? '') + line);
    }
    const compared = hs.filter((h: Loose) => h.comparisonNote).map((h: Loose) => `<p class="fine cmp-note"><b>${esc(h.labels.plain)}.</b> ${esc(h.comparisonNote)}</p>`).join('');
    // How the tests differ and what is compared: the caption and each test's note, one closed line, open on request.
    // A second closed line where the comparison names one: how its tests relate to another heading's (D140).
    const about = `<details class="imp-about"><summary>${esc(cmp.about)}</summary>${f.caption ? `<p class="fine">${esc(f.caption)}</p>` : ''}${compared}</details>${
      f.noteRule ? `<details class="imp-about"><summary>${esc(cmp.note)}</summary><p class="fine">${esc(f.noteRule)}</p></details>` : ''}`;
    // What the results below are, counted by why each is or is not drawn, so the counts under the headings add up.
    const tally = (records: Loose, { secondWord }: Loose = {}) => {
      const t = f.tally(records);
      return { ...t, parts: t.counts.map(([why, n]: Loose) => (why === 'second' && secondWord ? secondWord(n) : whyWords(why, n))) };
    };
    const lead = (records: Loose) => {
      const n = records.length;
      if (graph) {
        // One closed line, the reasons for what is not drawn under it: every record still counted (K31).
        const t = tally(records);
        const said = esc(tallyWords(n, t.drawnN, t.namedN, t.parts.length ? t.rest : 0));
        return t.parts.length ? `<details class="imp-tally"><summary>${said}</summary><p class="fine">Not drawn: ${esc(andList(t.parts))}.</p></details>`
          : `<p class="fine imp-tally">${said}.</p>`;
      }
      if (!singles.length) {
        const t = tally(records);
        return `<p class="fine imp-none">No graph: no product has a value to draw. ${n === 1 ? 'The result below' : `The ${n} results below`}: ${esc(andList(t.parts))}.</p>`;
      }
      if (singles.length > 1) {
        const t = tally(records);
        return `<p class="fine imp-none">No graph: no scale has two products' values to draw. One product each: ${singles.map((d: Loose) => `${esc(gradeLabel(d.e.g))}'s ${esc(lower(d.h.labels.plain))} of ${oneValue(d)}`).join('; ')}.${
          t.parts.length ? ` The other ${t.rest === 1 ? 'result' : `${t.rest} results`} below: ${esc(andList(t.parts))}.` : ''}</p>`;
      }
      const [one] = singles;
      const t = tally(records, { secondWord: (k: Loose) => `${k} more of that product` });
      return `<p class="fine imp-none">No graph: only one product has a value to draw, ${esc(gradeLabel(one.e.g))}'s ${esc(lower(one.h.labels.plain))} of
        ${oneValue(one)}.${t.parts.length ? ` The other ${t.rest === 1 ? 'result' : `${t.rest} results`} below: ${esc(andList(t.parts))}.` : ' It is the only result below.'}</p>`;
    };
    const html = (recordBlocks: Loose, records: Loose) => makerBlock(topic, records.length, 'value', graph
      ? `<section class="imp-compare" data-comparison="${esc(topic)}">${graph}</section>${about}
        <h4 class="imp-sub">Every result, with its document</h4>${lead(records)}<div class="imp-records">${recordBlocks}</div>`
      : `${lead(records)}${about}<div class="imp-records">${recordBlocks}</div>`, { cls: 'prop-block imp-block' });
    return { topic, properties: f.properties, lines, html };
  });
}

/**
 * Print temperatures across a material's products (D139): a closed heading at the top of Printing, a graph per setting
 * with each product's lowest and highest temperature as dots on one °C scale (drying one row), the H2C's limit drawn
 * where it is near the products' values, a table whose medians of the lowest and highest settings are the window most products share, the products outside the H2C's
 * limits by their print gate's verdict, and why the others are not drawn. A dot opens its product's profile below, or
 * the guide's row where its value is the guide's. Nothing is drawn where no setting has two values, one a sheet's.
 */
function printTemperatures(m: Loose, c: Loose) {
  const f = printFacts(m, c);
  if (!f.drawn.length) return '';
  const gradeLabel = productNameOrId;
  const def = (r: Loose) => ({ key: r.key, labels: { plain: r.label }, unit: '°C', openWords: 'from the Bambu Lab Filament Guide' });
  const asDot = (e: Loose) => ({ g: e.g, variant: e.variant, v: { value: e.value, level: e.origin === 'guide' ? 'as-published' : 'comparable',
    from: e.origin === 'twin' ? { label: e.label } : null, target: e.profileId ? `data-profile="${esc(e.profileId)}"` : 'data-guide="1"' } });
  // The limit is drawn where it is near the products' values (scales.js limitOnScale); far above them, the axis says
  // where it is, so PLA's windows are not squeezed against a 350 °C line.
  // Each setting a group headed by its name, its unit and the H2C's limit; the limit a line with the range beyond it washed,
  // as the material pages draw it.
  const strips = f.drawn.map((d: Loose) => {
    const scale = stripScale(d.onScale ? [...d.values, d.limit] : d.values, '°C');
    const line = d.onScale ? `<span class="imp-beyond" style="left:${scale.pct(d.limit)}%"></span><span class="imp-limit" style="left:${scale.pct(d.limit)}%" title="${esc(`The H2C reaches ${d.limit} °C`)}"></span>` : '';
    const rows = d.rows.map((r: Loose) => dotRow(def(r), r.entries.map(asDot), r.summary, scale, c, gradeLabel, { limit: line })).join('');
    return `<div class="imp-strips">
        <p class="imp-ghead"><b>${esc(d.label)}</b> · ${esc(printSettingHead(d.limit, d.onScale))}</p>
        ${rows}
        <div class="imp-row imp-axis"><span class="fine">°C</span><span class="imp-scale">${scale.ticks.map((v: Loose) => `<span${scale.pct(v) >= 99.5 ? ' class="end"' : scale.pct(v) <= 0.5 ? ' class="start"' : ''} style="left:${scale.pct(v)}%">${esc(fmtNumber(v))}</span>`).join('')}</span></div></div>`;
  }).join('');
  const k = f.marks;
  const key = [
    k.own ? `<span><i class="imp-dot"></i> ${esc(GRAPH_KEY.own)}</span>` : '',
    k.guide ? `<span><i class="imp-dot open"></i> ${esc(GRAPH_KEY.guide)}</span>` : '',
    k.variant ? `<span><i class="imp-dot variant"></i> ${esc(GRAPH_KEY.printVariant)}</span>` : '',
    k.band ? `<span><i class="imp-band-key"></i> ${esc(GRAPH_KEY.band)}</span>` : k.median ? `<span><i class="imp-median-key"></i> ${esc(GRAPH_KEY.median)}</span>` : '',
    k.limit ? `<span><i class="imp-limit-key"></i> ${esc(GRAPH_KEY.limit)}</span>` : '',
  ].join('');
  // The table: a line per row, and under each the values drawn and not ranked, in the comparisons' words (C49).
  const table = scrollTable(`<table class="grid imp-summary"><thead><tr><th>Setting, <span class="u">°C</span></th><th class="num" title="Products ranked: their own data sheet, or one they share, gives the setting">Ranked</th><th class="num">Median</th>
      <th class="num">Middle half</th><th class="num">Range</th></tr></thead><tbody>${f.rows.map((r: Loose) => {
    const s = r.summary;
    const apart = printApartWords(s);
    return `<tr><th scope="row">${esc(r.label)}</th><td class="num">${s.n}</td><td class="num">${s.n ? esc(graphNumber(s.median, '°C')) : '—'}</td>
      <td class="num">${s.q1 != null ? esc(graphSpan(s.q1, s.q3, '°C')) : '—'}</td><td class="num">${s.n ? esc(graphRange(s, '°C')) : '—'}</td></tr>
      ${apart.length ? `<tr class="imp-apart"><td colspan="5">Not ranked: ${esc(apart.join(', '))}.</td></tr>` : ''}`;
  }).join('')}</tbody></table>`);
  // What n counts, the window most products share, and the products outside the H2C's limits; then what is not drawn,
  // by setting and why, so the counts above square with the products below.
  const single = printSingles(f);
  const missing = printMissing(f);
  const body = `<section class="imp-compare print-compare" data-comparison="Print temperatures across products">
      <p class="imp-key fine">${key}</p>${strips}
      <p class="fine imp-hint">Select a dot to open its print profile below; hover to find the same product's other dots.</p>
      ${table}
      ${(() => {
        // The window most products give, as the Overview's On the H2C gives it (one statistic for one setting, 2026-10-18);
        // the table above keeps each row's median, middle half and range.
        const rows = onTheH2cRows(c).filter((r: Loose) => ['nozzle', 'bed', 'chamber', 'drying'].includes(r.key) && !/^not (published|stated)$/.test(r.value));
        return rows.length ? `<p class="fine imp-foot">The window most products give, as the Overview gives it: ${esc(andList(rows.map((r: Loose) => `${lower(r.label)} ${r.value}`)))}.</p>` : '';
      })()}
      ${printLines(f).map((l: Loose) => `<p class="fine imp-foot">${esc(l)}</p>`).join('')}
      ${single ? `<p class="fine imp-foot">${esc(single)}</p>` : ''}
      ${missing ? `<p class="fine imp-foot">Not drawn: ${esc(missing)}.</p>` : ''}</section>`;
  // Open: the Printing tab's answer, before its profiles.
  return makerBlock('Print temperatures across products', f.products, 'product', body, { open: true, cls: 'prop-block imp-block print-block' });
}

/** A material's spread across its products, per key property (materials[].summary): median, range, how many. */
function spreadTable(m: Loose, c: Loose) {
  // Every headline, those drawn in the drawer alone too (D139).
  const rows = REGISTRY.allHeadlines.map((h: Loose) => [h, m.summary?.[h.key]]).filter(([, s]: Loose) => s);
  if (!rows.length) return '';
  // At the Overview's and the material page's display precision (display-numbers.js, through graphNumber, never rounded
  // across a requirement), a median that is a published bound with its sign (C14, C17).
  const th = (h: Loose) => thresholdsOf(c, h.key);
  return `${scrollTable(`<table class="grid spread-table"><thead><tr>
    <th>Property</th><th class="num">Median</th><th class="num">Range</th><th class="num">Products</th><th>Kept out of the median</th></tr></thead><tbody>
    ${rows.map(([h, s]: Loose) => `<tr><td>${esc(h.labels.plain)} <span class="u">${esc(h.unit)}</span></td>
      <td class="num">${s.n ? esc(`${medianSign(m, h.key)}${graphNumber(s.median, h.unit, th(h))}`) : '—'}</td>
      <td class="num">${s.n ? esc(graphRange(s, h.unit, th(h))) : '—'}</td>
      <td class="num">${s.n} of ${s.products}</td>
      <td>${leftOutWords(h, s).map(esc).join('; ') || '—'}</td></tr>`).join('')}
  </tbody></table>`)}
  <p class="fine">Median and range of the products that publish it comparably: on a test bar their documents describe as printed (for heat deflection, also a bar of a plastic that cannot crystallise their documents do not tie to moulding), at the test's orientation and load. The range is the products' lowest to highest.</p>
  ${rows.filter(([, s]: Loose) => s.claimed).map(([h, s]: Loose, i: Loose) => `<p class="fine imp-split"><b>${esc(h.labels.plain)}.</b> ${esc(toughenedSplit(s, h.unit))}${i ? '' : ` ${TOUGHENED_NOTE_SHORT}`}</p>`).join('')}`;
}

/**
 * A print profile's settings, the ones it publishes as rows and the ones it does not in one line under them (2026-10-18):
 * eSUN's profiles had shown eight rows of "Not published" each. Nozzle, bed and chamber always keep their row: the H2C's
 * verdict is beside them.
 */
function profileRows(p: Loose, note: Loose) {
  const rows = [
    ['Nozzle', `${esc(p.nozzle.text)} ${gateChip(p.gates.nozzle, 'Nozzle')}`, true],
    ['Bed', `${esc(p.bed.text)} ${gateChip(p.gates.bed, 'Bed')}`, true],
    ['Chamber', `${esc(stated(p.chamber.text) ? p.chamber.text : 'not stated')} ${gateChip(p.gates.chamber, 'Chamber')}
          ${p.chamber.fromEnclosure || p.chamber.state === 'enclosed' ? note(`Read from the enclosure line: "${esc(p.enclosure)}".`) : ''}
          ${p.chamber.strippedTail ? note(`Text after the value, not read as a chamber requirement: ${esc(p.chamber.strippedTail)}`) : ''}`, true],
    ['Nozzle material', p.nozzleMaterial, false], ['Nozzle diameter', p.nozzleDiameter.text, false], ['Abrasion', p.abrasion.text, false],
    ['Drying', p.drying.text, false, true], ['Enclosure', p.enclosure, false], ['Plate', p.plate, false],
    ['Support material', p.supportPairing, false], ['Failure modes', p.failureModes, false, true],
  ];
  const shown = rows.filter(([, v, keep]) => keep || stated(v));
  const silent = rows.filter(([, v, keep]) => !keep && !stated(v)).map(([label]) => lower(label));
  return `<dl class="kv">${shown.map(([label, v, keep, long]) => `<dt>${esc(label)}</dt><dd>${keep ? v : long ? longText(v) : esc(v ?? '')}</dd>`).join('')}</dl>${silent.length
    ? `<p class="fine profile-silent">Not published: ${esc(andList(silent))}.</p>` : ''}`;
}

// ------------------------------------------------------------------ the Overview: the drawer's first screen (D173)

/**
 * The Overview, the first thing an engineer sees on opening a material (D173, the owner's ruling of 2026-10-20: "the
 * drawer's first screen needs redesign … friendly, easy to read"). It had held about 40 numbers under a template: the
 * answer's three counts, each requirement's whole reason, six key figures with their middle halves and counts, seven
 * more on an Also line, and each print setting's counts. It now answers five questions in order, each in a few large
 * figures with its detail one press away:
 *
 * - **Does it meet my requirements, and on which product?** The answer in one sentence that leads with the count that
 *   meets them, then Your requirements, one product's lines, each the first sentence of its reason, the rest under "more".
 * - **What are its numbers?** Key properties as tiles, the median large; a requirement's property is a tile too, marked
 *   "required" (or "reported"). The middle halves, the counts and the other headlines are one press away, under
 *   "Spread across products".
 * - **How do I print it on the H2C?** One row per setting: nozzle, bed and heated chamber, a window and a chip each, the
 *   counts behind the chip, which says how many are within only where some products are not; drying and nozzle type.
 * - **How well documented is it?** The page's word and what is on file, with the way to Sources.
 * - Then what it is for, its limitations, the family's guidance, the estimates, and the method's caveat.
 *
 * Every number is the one the drawer printed before, in the page's display precision: nothing is computed here that
 * the engine, the build or material-facts.js did not already give.
 */
function overviewBody(c: Loose) {
  const { m, grades, evaluation, summary, db, showEstimates, policy } = c;
  // Every headline, labelled and explained exactly as the filter rail and the table label it.
  const HEAD = REGISTRY.headlines.map((h: Loose) => [h.labels.plain, h.key, h.labels.hint, h.labels.technical, h.comparisonNote]);
  // A material with no product on record, the one whose own estimates are read for a requirement (D148). Its grade list
  // is the engine's (products.js productsByMaterial): a resin reference grade such as PA612's Zytel 151L is no product.
  const productless = !(m.gradeIds ?? []).length;

  // Confirmed only means measured evidence only, in the drawer as in every lens: the research band is an estimate.
  const est = showEstimates ? m.print?.chamberEstimate : null;
  const chamberEstimate = est
    ? `<div class="est-card"><h4>Chamber: estimated, not published</h4>
          <div class="est-span">${fmtRange(est.lo, est.hi, ' – ')} ${esc(est.unit)}</div>
          <div class="est-basis">No source publishes a chamber temperature. Research of 13 Sep 2026 places it in this band,
            based on ${esc(est.basis)}. It is not a print setting and changes no result.${est.caution ? ` ${esc(est.caution)}` : ''}</div>
        </div>` : '';

  // Every product's own settings against the H2C's limits (material-facts.js printCounts): the chips, the counts and
  // the beyond-capability line below are worked out from them alone, so none can disagree with another.
  const pc = printCounts(grades);
  const over = pc ? pc.axes.filter((a: Loose) => a.over) : [];
  // Beyond the H2C's capability, said once and short (D173): which settings its products ask more heat of. How many
  // products, against which limit, is On the H2C's, a tile per setting, so the callout no longer repeats six counts.
  const AXIS_WORD: Record<string, string> = { nozzle: 'nozzle', bed: 'bed', chamber: 'chamber' };
  // Where the requirements ask it, the answer and its line say it (Within H2C capability: FAIL), so the callout is not
  // stacked on them in red a second time; elsewhere it is the Overview's first line.
  const scopeSaid = c.tested && evaluation.results.some((r: Loose) => r.constraint?.kind === 'gate' && r.constraint.gate === 'scope' && r.status !== 'PASS');
  const printable = m.excluded && !scopeSaid
    ? `<div class="callout bad"><b>Beyond H2C capability.</b> ${over.length ? `${over.some((a: Loose) => a.over === pc.products) ? (pc.products === 1 ? 'Its product asks' : 'Its products ask') : 'Some of its products ask'} for more heat than the H2C gives at the ${esc(andList(over.map((a: Loose) => AXIS_WORD[a.axis])))}. ` : ''}Kept for reference, never a candidate.</div>`
    : '';

  // With estimates hidden the drawer shows none, as the table does. It says where they are rather than leaving a
  // reader who saw one in Include uncertain to wonder where it went.
  const hiddenEstimates = !showEstimates && hasEstimates(m)
    ? `<p class="fine">${policy === 'exploration'
      ? 'Tick "Use estimates and resin data" in the top bar to see estimates for the missing values.'
      : 'Estimates for the missing values show when materials that could not be checked are included (the top bar\'s Include), with "Use estimates and resin data" ticked.'}</p>`
    : '';

  // What it is, where the identity line in the head does not say it all: a variant's filler, a support material, an
  // elastomer. Bambu Lab's standing is the head's chip (its popover the sentence), no longer said twice.
  const ledeText = ledeWords(m);
  const lede = ledeText ? `<p class="lede">${esc(ledeText)}</p>` : '';

  // ---- the answer: how many of its products meet the requirements, and one product's lines (D146, D173)
  let answer = '';
  if (c.tested) {
    const n = evaluation?.counts;
    const total = n ? n.pass + n.fail + n.untested : 0;
    // The count that meets them leads, in bold; how many fail one and publish too little to judge is the line under it.
    const head = !n ? esc(evaluation.verdict === 'PASS' ? 'It meets all your requirements.' : 'It does not meet all your requirements.')
      : total === 1 ? (n.pass ? '<b>Its one product</b> meets all your requirements.' : '<b>Its one product</b> does not meet all your requirements.')
        : n.pass ? `<b>${n.pass === total ? (total === 2 ? 'Both its products' : `All ${total} of its products`) : `${n.pass} of its ${total} products`}</b> ${n.pass === 1 ? 'meets' : 'meet'} all your requirements.`
          // Where some publish too little to judge, none is shown to meet them yet, which "none meets" overstated.
          : `<b>None of its ${total} products</b> ${n.untested ? 'is shown to meet' : 'meets'} all your requirements.`;
    const rest = !n ? [] : total === 1
      ? [n.fail ? 'it fails at least one' : '', n.untested ? 'it publishes too little to judge' : ''].filter(Boolean)
      : [n.fail ? `${n.fail} ${n.fail === 1 ? 'fails' : 'fail'} at least one` : '', n.untested ? `${n.untested} ${n.untested === 1 ? 'publishes' : 'publish'} too little to judge` : ''].filter(Boolean);
    const show = n?.pass ? '<button type="button" class="link-btn" data-tab-link="Grades">Show the products</button>' : '';
    answer = `<div class="answer answer-${esc(evaluation.verdict)}">${chip(evaluation.verdict)}
        <div class="answer-text"><p class="answer-head">${head}</p>${rest.length || show ? `<p class="answer-sub">${rest.length ? `${esc(cap(andList(rest)))}.` : ''}${show ? ` ${show}` : ''}</p>` : ''}</div></div>
      <h3 class="sec">Your requirements</h3>${renderWhy(evaluation, { productName: (id: Loose) => productName(c.gradeById.get(id)) })}`;
  }

  // ---- Key properties: the material page's six key figures as tiles (D173), and a requirement's property beside them
  const headOf = (k: Loose) => REGISTRY.allHeadlines.find((x: Loose) => x.key === k);
  // The properties a requirement asks about, as the engine read the requirements (its results' own constraints): each
  // "required", or "reported" where every requirement on it is reported, not required.
  const asked = new Map();
  for (const r of c.tested ? evaluation.results : []) {
    if (r.constraint?.kind !== 'numeric') continue;
    const k = r.constraint.property;
    if (asked.get(k) !== 'required') asked.set(k, r.constraint.mandatory === false ? 'reported' : 'required');
  }
  const nameOf = (h: Loose) => explainButton(esc(h.labels.plain), [h.labels.hint, h.comparisonNote].filter(Boolean).join(' '), { cls: 'prop-name', head: h.labels.technical || h.labels.plain });
  const asPublishedNote = (h: Loose, a: Loose) => `As published by ${plural(a.n, 'product')}, ${asPublishedWords(h)}: not compared, so no median. Each value is in ${h.domain === 'thermal' ? 'Thermal' : 'Mechanical'}, with its document.`;
  /**
   * One headline in the spread table under the tiles: the median, its middle half (lowest to highest under four
   * products) and how many products, at the page's display precision (`display-numbers.js`); where no product publishes
   * one with a stated orientation or load, the values as published, as the page says them, never another record with a
   * star (2026-10-18).
   */
  const figure = (k: Loose) => {
    const h = headOf(k);
    if (!h) return null;
    const e = m.headline?.[k], s = m.summary?.[k];
    const unit = h.unit ?? e?.unit ?? '';
    const name = nameOf(h);
    if (e?.known) {
      const n = s?.n ?? e.spread?.n ?? 1;
      const lo = s?.q1 ?? e.spread?.q1, hi = s?.q3 ?? e.spread?.q3;
      const foot = n >= 4 && lo != null && hi != null ? `middle half ${spanDisplayUnit(lo, hi, unit)} · ${plural(n, 'product')}`
        : n >= 2 ? `${spanDisplayUnit(s?.min ?? e.spread?.min, s?.max ?? e.spread?.max, unit)} · ${plural(n, 'product')}` : 'one product';
      const text = `${boundSign(e)}${fmtDisplayUnit(e.value, unit)}`;
      const value = e.spread?.n > 1
        ? explainButton(`<span class="sv">${esc(text)}</span>`, spreadNote(e, c.grades.filter(isProduct).length), { cls: 'spread-value', head: `Median of ${e.spread.n} products`, action: 'products', id: m.id })
        : e.measurementId
          ? `<button type="button" class="evidence-value" data-measurement="${esc(e.measurementId)}" title="Opens the measurement in Sources"><span>${esc(text)}</span><span class="evidence-dot" aria-hidden="true"></span></button>`
          : `<span>${esc(text)}</span>`;
      return { k, name, value: `${value}${convertedMark(e.converted)}`, foot };
    }
    if (showEstimates && e?.estimate) return { k, name, value: renderValue(e, { showUnit: true, estimates: true, materialId: m.id, productless }), foot: 'estimated, not measured' };
    if (e?.notApplicable) return { k, name, value: explainButton('not applicable', `Not applicable. ${e.notApplicable.reason}`, { cls: 'na', head: 'Not applicable' }), foot: '', quiet: true };
    const a = s?.asPublished;
    if (a?.n) {
      // A value set apart (a test bar not described as printed, or no stated load, D172) is no median: it says so, grey, with the hollow mark the
      // graphs and the material page give it (C18).
      return { k, name, value: `<i class="imp-dot open" aria-hidden="true"></i>${explainButton(esc(spanDisplayUnit(a.min, a.max, unit)), asPublishedNote(h, a), { cls: 'kp-pub', head: 'As published' })}`,
        foot: `as published · ${asPublishedWords(h)}`, quiet: true };
    }
    return { k, name, value: '<span class="kp-missing">Not published</span>', foot: '', quiet: true };
  };
  /**
   * One key figure as a tile: its name, the median large with its unit small, and a foot only where the figure is not
   * a median of four or more products (as published, estimated, one to three products). The middle half and the count
   * are the value's popover and the spread table's, one press away.
   */
  const tile = (k: Loose) => {
    const h = headOf(k);
    if (!h) return null;
    const e = m.headline?.[k], s = m.summary?.[k];
    const unit = h.unit ?? e?.unit ?? '';
    const t = { k, name: nameOf(h), asked: asked.get(k) ?? null };
    if (e?.known) {
      const n = s?.n ?? e.spread?.n ?? 1;
      const inner = `<span class="kf-n">${esc(`${boundSign(e)}${fmtDisplay(e.value, unit)}`)}</span>${unit ? `<span class="kf-u">${esc(unit)}</span>` : ''}`;
      const value = e.spread?.n > 1
        ? explainButton(inner, spreadNote(e, c.grades.filter(isProduct).length), { cls: 'spread-value', head: `Median of ${e.spread.n} products`, action: 'products', id: m.id, label: `${h.labels.plain}: ${boundSign(e)}${fmtDisplayUnit(e.value, unit)}, the median of ${e.spread.n} products` })
        : e.measurementId
          ? `<button type="button" class="evidence-value" data-measurement="${esc(e.measurementId)}" title="Opens the measurement in Sources">${inner}<span class="evidence-dot" aria-hidden="true"></span></button>`
          : `<span>${inner}</span>`;
      return { ...t, value: `${value}${convertedMark(e.converted)}`, foot: n >= 4 ? '' : n >= 2 ? `median of only ${n} products` : 'one product\'s value' };
    }
    if (showEstimates && e?.estimate) return { ...t, value: renderValue(e, { showUnit: true, estimates: true, materialId: m.id, productless }), foot: 'estimated, not measured' };
    if (e?.notApplicable) return { ...t, value: explainButton('does not apply', `Not applicable. ${e.notApplicable.reason}`, { cls: 'na', head: 'Not applicable' }), quiet: true };
    const a = s?.asPublished;
    if (a?.n) {
      return { ...t, value: `<i class="imp-dot open" aria-hidden="true"></i>${explainButton(esc(spanDisplayUnit(a.min, a.max, unit)), asPublishedNote(h, a), { cls: 'kp-pub', head: 'As published' })}`,
        foot: `as published, ${asPublishedWords(h)}`, quiet: true };
    }
    return { ...t, value: '<span class="kp-missing">not published</span>', quiet: true };
  };
  const tileKeys = [...KEY_FIGURES, ...HEAD.map(([, k]: Loose) => k).filter((k: Loose) => asked.has(k) && !KEY_FIGURES.includes(k))];
  const tiles = tileKeys.map(tile).filter(Boolean);
  const spreadRows = [...KEY_FIGURES, ...HEAD.map(([, k]: Loose) => k).filter((k: Loose) => !KEY_FIGURES.includes(k))].map(figure).filter(Boolean);
  const more = spreadRows.filter((f) => !tileKeys.includes(f.k)).length;
  const anySpread = HEAD.some(([, k]: Loose) => m.headline[k]?.spread);
  const numbers = `
    <div class="sec-row"><h3 class="sec">Key properties</h3><span class="sec-note">${anySpread ? 'median of its products' : 'as published'}</span></div>
    <div class="kf-grid">${tiles.map((t: Loose) => `<div class="kf${t.asked ? ' kf-asked' : ''}${t.quiet ? ' kf-quiet' : ''}" data-key="${esc(t.k)}">
        <div class="kf-name">${t.name}</div>
        <div class="kf-v">${t.value}${t.asked ? ` <span class="kf-tag" title="${t.asked === 'required' ? 'One of your requirements' : 'In your requirements, reported, not required'}. This is the median of its products; Your requirements gives the value of the product shown.">${t.asked}</span>` : ''}</div>${t.foot ? `<div class="kf-f">${esc(t.foot)}</div>` : ''}</div>`).join('')}</div>
    <details class="kf-more"><summary><span class="chevron" aria-hidden="true"></span>Spread across products${more ? `, and ${plural(more, 'more property', 'more properties')}` : ''}</summary>
      <dl class="key-props key-figs">
        ${spreadRows.map((f) => `<dt>${f.name}</dt><dd class="${f.quiet ? 'kp-empty' : ''}"><span class="kp-v">${f.value}</span>${f.foot ? ` <span class="kp-f">${esc(f.foot)}</span>` : ''}</dd>`).join('')}
      </dl>
      <p class="fine">${anySpread
        // What a figure is, in the material page's sentence (evidence-line.js keyFiguresBasis, C07).
        ? `${esc(keyFiguresBasis(c))} Select a value to see where it comes from.`
        : esc((m.headlineBasis ?? '').replace(/[.\s]*$/, '')) + '.'}</p>
    </details>`;

  // ---- On the H2C (2026-10-18, D173): one row per setting, from the material page's block (print-brief.js
  // onTheH2cRows): nozzle, bed and heated chamber, a window and a chip each, then drying and nozzle type. The chip is
  // the verdict of the product the material's own gate names, the best of its products' (D151); its popover counts the
  // products (setting, below).
  let print = '';
  if (pc) {
    const rowsH2C = Object.fromEntries(onTheH2cRows(c).map((r: Loose) => [r.key, r]));
    const axisOf = (k: Loose) => pc.axes.find((a: Loose) => a.axis === k);
    const verdictOf = (a: Loose) => (!a || a.within + a.over === 0 ? 'unknown' : a.best);
    // Products within at the low end of their makers' windows are said among those within (D151).
    const where = (n: Loose) => `the low end of ${n === 1 ? 'its maker\'s window' : 'their makers\' windows'}`;
    const limitLine = (a: Loose) => {
      const lim = `the H2C's ${fmtNumber(a.limit)} °C`;
      const low = !a.lowEnd ? '' : a.lowEnd === a.within ? `, ${a.within === 1 ? 'at' : 'all at'} ${where(a.within)}` : ` (${a.lowEnd} at ${where(a.lowEnd)})`;
      if (a.within === pc.products) return `${pc.products === 1 ? `Its product is within ${lim}` : pc.products === 2 ? `Both products are within ${lim}` : `All ${pc.products} products are within ${lim}`}${low}.`;
      const bits = [a.within ? `${a.within} within ${lim}${low}` : `none within ${lim}`, a.over ? `${a.over} beyond or only partly within` : null,
        a.unknown ? `${a.unknown} ${a.unknown === 1 ? 'gives' : 'give'} no ${a.axis} temperature` : null].filter(Boolean);
      return `${cap(andList(bits))}.`;
    };
    const estimates: Loose = [];
    /**
     * One setting as a row: its name, the window most products give, and the chip, the best product's verdict. The
     * window's note and every product's count against the limit are the chip's popover. Where some products are within
     * the H2C's limit and some not, the chip says how many are within ("1 of 7 within"), which is why a green chip can
     * stand beside a window most products give above the limit (PEEK's chamber, 90 °C); where none is, the row says so
     * under the window, with the limit.
     */
    const setting = (key: Loose, axis: Loose, extra = '') => {
      const r = rowsH2C[key], a = axisOf(axis);
      if (!r) return '';
      const v = verdictOf(a);
      const { state, word } = gateVerdict(v);
      // A count that the limit's line says again ("All 3 products · All 3 products are within …") is said once (C04).
      const all = pc.products === 1 ? ['one product', 'its one product'] : pc.products === 2 ? ['both products'] : [`all ${pc.products} products`];
      const every = a && a.within === pc.products && all.includes(String(r.note ?? '').trim().toLowerCase());
      const why = [r.note && !every ? `${r.value}: ${r.note}.` : '', a ? limitLine(a) : ''].filter(Boolean).join(' ');
      // Where some products are within and others not, the chip says how many are within, so a green chip never stands
      // unexplained beside a window most products give above the limit (the first-time reader's review, D173).
      const shown = a?.over && a.within ? `${a.within} of ${pc.products} within` : word;
      const mark = why ? explainButton(esc(shown), why, { cls: `chip chip-${state}`, head: `${r.label} on the H2C`, label: `${r.label}: ${shown}. ${why}` }) : `<span class="chip chip-${state}">${esc(shown)}</span>`;
      if (v === 'unknown' && extra) estimates.push(extra);
      const foot = a?.over && !a.within ? `None within the H2C's ${fmtNumber(a.limit)} °C` : '';
      return `<div class="h2c-row" data-print="${key}"><b>${esc(r.label)}</b> <span class="h2c-v">${esc(r.value)}</span>
        <span class="h2c-chip">${mark}</span>${foot ? `<span class="h2c-foot">${esc(foot)}</span>` : ''}</div>`;
    };
    const nozzleType = rowsH2C.hardened;
    const drying = rowsH2C.drying;
    const from = [pc.origins.guide ? `the Bambu Lab Filament Guide (${pc.origins.guide} ${pc.origins.guide === 1 ? 'setting' : 'settings'})` : null,
      pc.origins.twin ? `a data sheet shared with another product (${pc.origins.twin} ${pc.origins.twin === 1 ? 'setting' : 'settings'})` : null,
      // A chamber all three leave silent, read from what the makers of its kind of plastic state (D151).
      pc.origins.family ? `what the makers of its kind of plastic state (${pc.origins.family} ${pc.origins.family === 1 ? 'chamber' : 'chambers'})` : null].filter(Boolean);
    const fromShort = [pc.origins.guide ? 'the Bambu Lab Filament Guide' : null, pc.origins.twin ? 'a data sheet it shares' : null, pc.origins.family ? 'what the makers of its kind of plastic state' : null].filter(Boolean);
    const rows = `${setting('nozzle', 'nozzle', windowEstimate(m.print?.nozzleEstimate, 'Nozzle', showEstimates))}${setting('bed', 'bed', windowEstimate(m.print?.bedEstimate, 'Bed', showEstimates))}${setting('chamber', 'chamber', chamberEstimate)}`;
    // Drying and nozzle type are values, not checks: no chip. Drying's note says whether to dry at all ("most advise it
    // only for wet filament"); nozzle type's tallies the sheets, one press away.
    print = `
    <div class="sec-row"><h3 class="sec">On the H2C</h3>${c.counts.Printing ? '<button type="button" class="link-btn" data-tab-link="Printing">Printing in full</button>' : ''}</div>
    <div class="h2c-list">${rows}
      ${drying ? `<div class="h2c-row plain" data-print="drying"><b>Drying</b> <span class="h2c-v">${esc(drying.value)}</span>${drying.note ? `<span class="h2c-foot">${esc(cap(drying.note))}</span>` : ''}</div>` : ''}
      ${nozzleType ? `<div class="h2c-row plain" data-print="hardened"><b>Nozzle type</b> <span class="h2c-v">${nozzleType.note ? explainButton(esc(nozzleType.value), `${cap(nozzleType.note)}.`, { cls: 'h2c-said', head: 'Nozzle type' }) : esc(nozzleType.value)}</span></div>` : ''}
    </div>
    ${estimates.length ? `<div class="h2c-est">${estimates.join('')}</div>` : ''}
    <p class="fine h2c-from">Settings are each product's own${fromShort.length ? `, or where its sheet is silent, read from ${explainButton(esc(andList(fromShort).replace(/ and ([^,]*)$/, ' or $1')), `Where a product's own data sheet is silent, its settings are read from ${from.join(' or ')}. Products gives each one's.`, { cls: 'from-words', head: 'Where the settings were read' })}` : ''}.</p>`;
  }

  // ---- how well documented, and what is on file (C20, C21): the material page's word (evidence-line.js, its reasons
  // one press away), then the counts, the known gaps counted as Sources lists them.
  const docs = c.counts.Evidence;
  const ev = evidenceLine(c);
  const gapsShown = drawerGaps(c);
  const counted = { gaps: gapsShown.filter((r: Loose) => r.status !== 'Conflict').length, conflicts: gapsShown.filter((r: Loose) => r.status === 'Conflict').length };
  const dataLine = `<p class="data-line" data-tier="${esc(ev.tier)}">${explainButton(`<b>${esc(ev.head)}</b>`, ev.text, { cls: 'evidence-tier', head: ev.head })} · ${esc(onFileWords(summary, docs, counted))}
    <button type="button" class="link-btn" data-tab-link="${gapsShown.length ? 'Coverage' : 'Evidence'}">See the sources</button></p>`;
  // The entry's identity notes are the maintainers' (source IDs, migrations, file names): under Record notes, the
  // drawer's place for them, one press away (C08).
  const about = m.identity?.notes && m.identity.notes !== 'Not applicable'
    ? `<details class="grade-more record-notes"><summary>Record notes</summary><p class="fine">${esc(proseOnly(m.identity.notes))}${proseOnly(m.identity.notes) !== m.identity.notes ? ids(['As recorded:', m.identity.notes]) : ''}</p></details>` : '';
  const standing = db.method.find((r: Loose) => r.topic === 'Transferable allowables')?.rule;
  const footer = standing ? `<p class="fine overview-foot">${esc(standing)}</p>` : '';

  // The first screen, then the rest: what it is for, its limitations and the family's guidance, the estimates of what
  // it does not publish (and the properties that do not apply), the maintainers' notes and the method's caveat.
  const glance = `${printable}${lede}${answer}${numbers}${print}${dataLine}`;
  const rest = `${usesSection(m, c)}${hiddenEstimates}${estimateGroup(m, HEAD, showEstimates, productless)}${about}${footer}`;
  return `<div class="glance">${glance}</div>${rest}`;
}

function tabBody(tab: Loose, c: Loose) {
  const { m, ev, poly, cov, profiles, grades, prices, evaluation, summary, db, showEstimates, policy } = c;
  // An empty tab offers the known gaps only where Sources lists one (C21).
  const empty = (t: Loose) => nothingRecorded(emptyReasons(c, t), { toGaps: drawerGaps(c).length > 0 });

  if (tab === 'Overview') return overviewBody(c);

  if (tab === 'Mechanical' || tab === 'Thermal') {
    // The property first, then every value of it with its product and source, largest first. Grouped by source, PLA's
    // 700 values were sixty blocks to read through for one property; no range is drawn across them (D46). The rarely
    // published properties are the `absent` list, said once; the other gaps are this domain's own.
    const { rows, named, absent, shown, gaps } = measuredIn(c, tab);
    // The rarely published properties no tab lists (fracture toughness, creep compliance, friction: no table holds them),
    // said here once, so the known gap that names them is said where the reader looks and leaves Sources' list (C21).
    const rare = tab === 'Mechanical' && rows.length ? sparseFacts(c).extra : [];
    // Where a selectable property compares only some of these values (a notched Charpy bar at room temperature, a bar
    // pulled along Z), its note says which, and why the rest stay on record but are not compared (D92).
    // What the property is, where properties.csv says it (why there is an impact heading whose test is unclear, D133),
    // then the comparison notes of the selectable properties that read some of its values.
    const describe = (p: Loose) => { const d = REGISTRY.properties.find((x: Loose) => x.name === p)?.description; return stated(d) ? `<p class="fine cmp-note prop-note">${esc(proseOnly(d))}</p>` : ''; };
    const notes = (p: Loose) => describe(p) + REGISTRY.allHeadlines.filter((h: Loose) => h.comparisonNote && h.relatedProperties.includes(p) && !m.headline?.[h.key]?.notApplicable)
      .map((h: Loose) => `<p class="fine cmp-note"><b>${esc(h.labels.plain)}.</b> ${esc(h.comparisonNote)}</p>`).join('');
    const block = (p: Loose, note = notes, lines = new Map()) => {
      const group = rows.filter((x: Loose) => x.property === p).sort(largestFirst);
      return makerBlock(propertyName(p), group.length, 'value', note(p) + group.map((x: Loose) => measurementRow(x, c, { compact: true, extra: lines.get(x.id) ?? '' })).join(''), { cls: 'prop-block' });
    };
    // Headlines drawn side by side (D133, D139) are one heading with every record they are chosen from, in the place of
    // the first of those properties: notched Charpy beside notched Izod, product by product, then the Charpy, Izod and
    // test-unclear records, each property's block inside it. Each comparison note is said once there, not per block.
    const comparisons = drawerComparisons(m, c, tab);
    const blocks = [];
    for (const p of shown) {
      const cmp = comparisons.find((x: Loose) => x.properties.has(p));
      if (!cmp) blocks.push(block(p));
      else if (!cmp.placed) {
        cmp.placed = true;
        const props = shown.filter((q: Loose) => cmp.properties.has(q));
        blocks.push(cmp.html(props.map((q: Loose) => block(q, describe, cmp.lines)).join(''), rows.filter((x: Loose) => props.includes(x.property))));
      }
    }
    const namedHtml = named.length
      ? `<div class="np-line">Named on a data sheet without a value: ${named.map((x: Loose) => `<span class="np-item${c.highlight === x.id ? ' target' : ''}" data-mid="${esc(x.id)}">${esc(inSentence(x.property))} (${esc(productName(c.gradeById.get(x.gradeId)) || 'a product')})</span>`).join(', ')}.</div>`
      : '';
    return `
      ${rows.length ? blocks.join('') + namedHtml : empty(tab)}
      ${absent.length || rare.length ? `<h3 class="sec">Not published for this material</h3>
        <div class="gap">${absent.length ? `${absent.map((p: Loose) => esc(propertyName(p))).join(' · ')}. ` : ''}${rare.length ? `${absent.length ? 'Also ' : ''}${esc(andList(rare.map(inSentence)))}, which few data sheets publish. ` : ''}A gap, not a zero or a low value.</div>` : ''}
      ${gaps.filter(readerGap).length ? `<h3 class="sec">Known gaps</h3>${gaps.filter(readerGap).map((r: Loose) => `<div class="gap"><strong>${esc(GAP_DOMAIN_WORDS[r.domain] ?? r.domain)}: ${esc(r.status.toLowerCase())}.</strong> ${longText(r.finding)}</div>`).join('')}` : ''}${gaps.some((r: Loose) => !readerGap(r)) ? `<p class="fine">Review notes on this tab's records are under Sources, Known gaps.</p>` : ''}`;
  }

  if (tab === 'Printing') {
    const guide = guideBlock(m, c);
    const temperatures = printTemperatures(m, c);
    if (!profiles.length) return temperatures + guide || empty('Printing');
    const leadingMaker = leadMaker(m, c);
    const note = (t: Loose) => `<br><span class="missing" style="font-size:11px">${t}</span>`;
    // AMS and H2C routing are shown on a profile only where it says more than "verify the exact grade", which nearly all
    // say; the tab says so once, at its top.
    const saysMore = routingSaysMore;
    // AMS, moved here from the Overview (2026-10-18): what makers state, once, and the routing's "verify the exact grade"
    // said once for every profile that says only that.
    const more = profiles.filter(saysMore).length;
    const routingNote = `<p class="fine"><b>AMS:</b> ${esc(amsSummary(profiles))} AMS and nozzle routing: ${more === 0 ? 'every profile says only' : more === profiles.length ? 'each profile says more than' : `every profile but ${more === 1 ? 'one' : fmtNumber(more)} says only`} "verify the exact grade".</p>`;
    const profileBlock = (p: Loose) => {
      const g = c.gradeById.get(p.gradeId);
      return `<div class="profile-block" data-profile-id="${esc(p.id)}" data-search-item="${esc([productName(g), g?.manufacturer, p.profile, p.id].filter(stated).join(' '))}">
      <h3 class="block-title">${esc(productName(g) || 'Product not named')}${stated(p.profile) ? ` <span class="fine">${esc(p.profile)}</span>` : ''}${ids(['Profile', p.id], ['Product', p.gradeId])}</h3>
      ${profileRows(p, note)}
      ${p.notes.length ? `<dl class="kv">${p.notes.map((n: Loose) => `<dt>${esc(n.topic)}</dt><dd>${longText(n.text)}</dd>`).join('')}</dl>` : ''}
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
    return temperatures + guide + routingNote + searchBox('a product or maker') + groupBy(profiles, (p: Loose) => c.gradeById.get(p.gradeId)?.manufacturer ?? 'Maker not named', leadingMaker)
      .map(([maker, group]: Loose) => makerBlock(maker, group.length, 'print profile', group.map(profileBlock).join(''), { open: maker === leadingMaker })).join('');
  }

  if (tab === 'Environment') {
    if (!ev.length && !poly.length) return empty('Environment');
    // The categories a requirement can be set on come first; what no filter uses (specimen preparation, safety,
    // disposal, post-processing) is collapsed beneath them.
    const { usable, other } = envGroups(c);
    // A statement's topic is shown only where it says more than the heading above it ("Solubility" under Water solubility).
    const record = (e: Loose, label: Loose) => `<div class="evidence-row env-row">
        <div><strong>${esc(e.finding)}</strong></div>
        ${(() => { const bits = envConditionWords(e, label); return bits ? `<div class="cond">${esc(bits)}</div>` : ''; })()}
        <div class="cond meas-foot">${esc(stated(e.gradeId) ? productName(c.gradeById.get(e.gradeId)) || 'a product' : 'the material in general')} · <button type="button" class="link-btn" data-open-source="${esc(e.sourceId)}" title="Opens this document in Sources">${esc(sourceName(c.sourceById.get(e.sourceId), e.sourceId))}</button>${(() => { const n = noteOf(e.exposure, { lede: true }); return `${n.shown}${ids(['Statement', e.id], ['Source', e.sourceId], ...(n.behind ? [n.behind] : []))}`; })()}</div>
      </div>`;
    // A category a requirement can be set on opens on what its makers' statements say, counted as the material page counts
    // them (material-words.js statementVerdictWords, C22): a count of statements, never the selector's answer, which is
    // each product's, at the Overview's top (D98). The statements below stay as they are.
    const section = ([label, list]: Loose, { verdict = false } = {}) => {
      const v = verdict ? statementVerdictWords(list.filter(makersOwn)) : '';
      return `<h3 class="sec">${esc(label)}${v ? `<span class="env-verdict">: ${esc(lower(v))}</span>` : ''}</h3>${list.map((e: Loose) => record(e, label)).join('')}`;
    };
    return usable.map((x: Loose) => section(x, { verdict: true })).join('')
      + (other.length ? `<details class="grade-more env-other"><summary>Other maker statements (${other.reduce((n: Loose, [, l]: Loose) => n + l.length, 0)}): ${esc(other.map(([l]: Loose) => l.toLowerCase()).join(', '))}</summary>
          ${other.map((x: Loose) => section(x)).join('')}</details>` : '')
      + polymerSection(poly, c);
  }

  if (tab === 'Grades') {
    if (!grades.length) return empty('Grades');
    const judged: Map<string, Loose> = new Map((evaluation?.products ?? []).map((x: Loose) => [x.gradeId, x]));
    // What a product fails, in the pills' words. A criterion is one requirement's, the same for every product, and the
    // material's own results pair each with its requirement.
    const requirementOf = new Map((evaluation?.results ?? []).map((r: Loose) => [r.criterion, r.constraint]));
    const failText = (criteria: Loose) => criteria.map((k: Loose) => (requirementOf.has(k) ? describeConstraint(requirementOf.get(k)) : k)).join('; ');
    // Colour. The field was collected on every grade, but it does not hold what a buyer wants: on 132 of 144 grades it
    // is the same sentence saying properties may vary by colour, and on the others it names the colour of the specimen
    // that was tested. So the caveat is said once, above the products, and a product shows its colour only where the
    // tested one is stated.
    const SPEC_COLOUR = /^(white|black|natural|grey|gray|red|blue|green|yellow|orange|clear|transparent)\b/i;
    const passing = passingOrdered(c);
    // A product's key values in its one-line summary: the ones asked about, else the first three it publishes of the
    // Products page's columns (C36), each with a published bound's sign.
    const asked = new Set((evaluation?.results ?? []).filter((r: Loose) => r.constraint.kind === 'numeric').map((r: Loose) => r.constraint.property));
    const plate = CLOSED_LINE.map((k) => REGISTRY.headlines.find((h: Loose) => h.key === k)).filter(Boolean);
    const keys = (g: Loose) => (asked.size ? REGISTRY.headlines.filter((h: Loose) => g.headline?.[h.key] && asked.has(h.key)) : plate.filter((h) => g.headline?.[h.key])).slice(0, 3)
      .map((h: Loose) => `${h.labels.short} ${fmtBounded(g.headline[h.key].value, h.unit, g.headline[h.key].interval)}`).join(' · ');
    // The documents a product's values, settings and statements come from, each one press from its block in Sources.
    const docsOf = (g: Loose) => productDocuments(c, g);
    // A product's line: the toggle holds the name alone, and the chips and key values sit beside it. The "sold as
    // toughened" mark is a button of its own, and a button inside the toggle closed the toggle where it began, which threw
    // the key values out beside Choose and broke the head (OPEN-PROBLEMS §37.20). A press on the line still opens the card.
    const block = (g: Loose, open: Loose) => {
      const j = judged.get(g.id);
      const isOpen = gradeOpen.has(g.id) ? gradeOpen.get(g.id) : open;
      const verdictChip = c.tested && j ? ` ${chip(j.verdict)}` : '';
      const docs = docsOf(g);
      return `<div class="grade-block" data-search-item="${esc([productName(g), g.product, g.manufacturer, g.id].filter(stated).join(' '))}">
      <div class="grade-head">
        <div class="grade-title" data-grade-title="${esc(g.id)}">
          <button type="button" class="grade-toggle" data-grade-toggle="${esc(g.id)}" aria-expanded="${isOpen}"><span class="chevron" aria-hidden="true"></span><span class="grade-name">${esc(productName(g) || 'Product not named')}</span></button>${verdictChip}${g.variant ? ' <span class="chip chip-neutral chip-small">variant</span>' : ''}${toughenedMark(g, c)}${isProduct(g) ? '' : ' <span class="chip chip-neutral chip-small">reference</span>'}
          ${keys(g) ? `<span class="grade-keys">${esc(keys(g))}</span>` : ''}</div>
        ${c.tested ? `<button type="button" class="btn btn-sm choose-btn" data-choose="${esc(g.id)}" aria-pressed="${c.chosen.has(g.id)}"
          title="${c.chosen.has(g.id) ? 'Chosen: its decision brief is under Save / share. Press to remove it.' : 'Choose this product: its decision brief, print settings and test plan go under Save / share, saved with the scenario'}">${c.chosen.has(g.id) ? '✓ Chosen' : 'Choose this product'}</button>` : ''}
      </div>
      <div class="grade-body" data-grade-body="${esc(g.id)}"${isOpen ? '' : ' hidden'}>
        ${c.tested && j?.verdict === 'FAIL' && j.failedBy?.length ? `<div class="fact-why"><b>Fails:</b> ${esc(failText(j.failedBy))}</div>` : ''}
        ${c.tested && j?.verdict === 'UNKNOWN' ? unsettled(j, requirementOf) : ''}
        ${c.tested && j ? stateNote(j) : ''}
        ${diameterWarning(g) ? `<p class="fine-line warn-text" data-diameter="${esc(g.diameter.found)}">${esc(diameterWarning(g))}</p>` : ''}
        ${printCard(g, c)}
        ${productValues(g, c)}
        ${makerSays(g, c)}
        ${docs.length ? `<div class="grade-docs"><span class="shared-head">Sources</span> ${docs.map((sid: Loose) => `<button type="button" class="link-btn" data-open-source="${esc(sid)}" title="Opens this document in Sources">${esc(sourceName(c.sourceById.get(sid), sid))}</button>`).join('; ')}</div>` : ''}
        ${(() => { const card = productsPageOf(m, c.ms, g.id); return card ? `<div class="grade-card"><a class="card-link" href="${esc(card)}" data-card-href="${esc(card)}" title="This product's values by document, whether each is in the median, and why. The page's Back to your results returns here as you left it.">Its card on the Products page</a></div>` : ''; })()}
        <details class="grade-more"><summary>Product details</summary><dl class="kv">
          <dt>Maker</dt><dd>${esc(g.manufacturer ?? '')}</dd>
          <dt>Product</dt><dd>${esc(g.product ?? '')}${ids(['Product', g.id])}</dd>
          <dt>Composition</dt><dd>${(() => { const t = proseOnly(g.composition); return `${esc(t)}${t !== String(g.composition ?? '') ? ids(['As recorded:', g.composition]) : ''}`; })()}</dd>
          ${g.variant ? `<dt>Variant</dt><dd>${esc(g.variant)}. Its values describe this product, not the polymer in general, so they are kept out of the material's median.</dd>` : ''}
          ${g.diameter ? `<dt>Diameter</dt><dd>${esc(g.diameter.found)}${g.diameter.fits ? '' : ': the H2C takes 1.75 mm'}</dd>` : ''}
          <dt>Certifications</dt><dd>${esc(g.certifications ?? '')}</dd>
          ${SPEC_COLOUR.test((g.colourCaveat ?? '').trim()) ? `<dt>Colour tested</dt><dd>Measured on the <b>${esc(g.colourCaveat.trim())}</b> version. Other colours may differ.</dd>` : ''}
        </dl></details>${stated(g.availability) ? recordNotes(`Availability: ${g.availability}`) : ''}${gradeEstimateLines(g, c)}
      </div></div>`;
    };
    // The maker whose products are most often the material's typical value leads the list and opens where no product
    // passes (the order the first line says).
    const firstMaker = leadMaker(m, c);
    // The products that meet every requirement first, the first of them open with its settings and values (the review
    // of 2026-09-27, F09): that is the answer to "which product". The material's spread and its makers' coverage follow,
    // one press away, open where nothing was asked.
    const context = `<details class="spread-context"${passing.length ? '' : ' open'}><summary>Across its products: median and range, and what their makers say</summary>
      ${spreadTable(m, c)}${makersSayCounts(m, c)}</details>`;
    // The search first (C34), over both lists: with 63 products that pass, it had sat below all of them.
    return searchBox('a product or maker')
      + (passing.length ? makerBlock('Meet all your requirements', passing.length, 'product', passing.map((g: Loose, i: Loose) => block(g, i === 0)).join(''), { open: true, cls: 'maker-block pass-block' }) : '')
      + context
      + '<div class="note">Colours are not tracked here. Pigment can change strength and stiffness, and a data sheet\'s values are for the colour it tested.</div>'
      + groupByMaker(grades, firstMaker).map(([maker, group]: Loose) => makerBlock(maker, group.length, 'product', group.map((g: Loose) => block(g, !passing.length && group.length === 1 && maker === firstMaker)).join(''), { open: !passing.length && maker === firstMaker })).join('');
  }

  if (tab === 'Price') {
    if (!prices.length) return empty('Price');
    // A listing with no price per kilogram says why in words, and a quarantined listing's reason sits under its row. A
    // foreign listing shows what its page printed and how it became CAD per kg (D113): its own price per kg before VAT,
    // the rate and its date. It lists the product in no Canadian shop.
    const noPrice = noPriceWords;
    const quarantineWhy = quarantineWords;
    const foreignWhy = foreignPriceWords;
    const listing = new Map<Loose, Loose>(priceRows(c).map((r: Loose) => [r.p, r]));
    const used = (p: Loose) => (listing.get(p)?.used ? 'yes' : explainButton('no', UNUSED_WORDS[listing.get(p)?.unused] ?? '', { cls: 'missing', head: 'Not used for the price' }));
    // The answer first (2026-10-18): the material's price as its key figure prints it, then how it is made. The tab had
    // opened on three sentences of method and never said the price.
    const e = m.headline?.priceCADkg, sp = m.summary?.priceCADkg;
    // The listings the price is made from, counted as the material page counts them (C16): those used, and those in a
    // foreign currency said in words, "converted", its rate one press away. Every listing stays in the table (V25).
    const usedRows = priceRows(c).filter((r: Loose) => r.used);
    const foreignUsed = usedRows.filter((r: Loose) => r.converted);
    const currencies = [...new Set(foreignUsed.map((r: Loose) => r.p.currency))].join(' and ');
    const converted = e?.converted ? explainButton('converted', convertedNote(e.converted), { cls: 'fx-mark fx-words', head: `Converted from ${e.converted.currencies.join(' and ')}` }) : 'converted';
    const listings = (n: Loose) => `${fmtNumber(n)} ${n === 1 ? 'listing' : 'listings'}`;
    const from = !usedRows.length ? `${listings(prices.length)}` : foreignUsed.length === usedRows.length ? `${listings(usedRows.length)} in ${esc(currencies)}, ${converted}`
      : foreignUsed.length ? `${listings(usedRows.length)}, ${fmtNumber(foreignUsed.length)} of them in ${esc(currencies)}, ${converted}` : listings(usedRows.length);
    const priceLine = e?.known
      ? `<p class="price-answer"><b>${esc(fmtDisplayUnit(e.value, 'CAD/kg'))}</b>, ${(sp?.n ?? e.spread?.n ?? 1) > 1
        ? `the median of ${sp?.n ?? e.spread?.n} products' prices (${esc(spanDisplayUnit(sp?.min ?? e.spread?.min, sp?.max ?? e.spread?.max, 'CAD/kg'))})` : 'one product\'s price'}, from ${from}.</p>`
      : `<p class="price-answer">No product's price is known: ${listings(prices.length)} in the sample, none used.</p>`;
    return `${priceLine}<div class="note">A product's price is the median of its listings: Canadian where it has any, otherwise foreign ones converted to CAD (marked with their currency). ${esc(priceSampleSentence(db.meta))} A struck-through listing is a different product and is not used.</div>
      ${scrollTable(`<table class="grid price-table"><thead><tr>
      <th class="retailer">Shop</th><th class="variant">Listing</th><th class="num">kg</th><th class="num">CAD/kg</th><th>Stock</th><th>Used</th></tr></thead>
      <tbody>${prices.map((p: Loose) => `<tr data-price="${esc(p.id)}"${p.quarantined ? ` class="quarantined" title="${esc(quarantineWhy(p))}"` : ''}>
        <td class="retailer">${esc(p.retailer)}${p.quarantined ? ' <span class="chip chip-FAIL chip-small">different product</span>' : ''}${ids(['Listing', p.id])}</td><td class="variant">${esc(p.variant ?? '')}</td>
        <td class="num">${fmtNumber(p.netMassKg)}</td>
        <td class="num">${p.regularPerKg !== null && p.fx ? `${fmtNumber(p.regularPerKg)} ${explainButton(esc(p.currency), foreignWhy(p), { cls: 'fx-mark', head: `Converted from ${p.currency}`, label: `Converted from ${p.currency}` })}`
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
    const publisher = ([sid]: Loose) => publisherName(c.sourceById.get(sid)?.publisher ?? 'Publisher not named');
    const blocks = docs.length
      ? searchBox('a document or publisher') + groupBy(docs, publisher, leadingMaker).map(([maker, group]: Loose) => makerBlock(maker, group.length, 'document',
        group.map(([sid, d]: Loose) => `<div data-search-item="${esc([sourceName(c.sourceById.get(sid), sid), maker, sid].join(' '))}">${sourceBlock(sid, d, c)}</div>`).join(''),
        { open: maker === leadingMaker || group.some(([sid]: Loose) => sid === c.highlightSource) })).join('')
      : `<div class="gap">${esc(EMPTY_LINES.Evidence)}</div>`;
    // Known gaps: what is missing, uncertain or contested, in the reviewer's words. A row that says only that evidence
    // exists is what the other tabs already show, so it is left out; a reviewer's note on a settled domain is kept, collapsed.
    // Since 2026-10-18 by the pages' rule (material-facts.js readerGap): a gap whose words are a review step's ("Reviewed
    // 2026-09-21 (ruling R166, m122-batch-b31)") joins the review notes, and each is named in a reader's words.
    // Since the coherence round (C21) by the pages' rule too (shownGap, drawerGaps): a gap another tab says is said
    // there, once, and the Overview counts what is listed here. A note that is not a gap stays with the review notes.
    const split = gapSplit(cov);
    const gaps = drawerGaps(c);
    const notes = [...split.gaps.filter((r: Loose) => !readerGap(r)), ...split.notes];
    const gapRow = (r: Loose) => `<div class="evidence-row cov-row">
        <div><strong>${esc(r.domain === 'Sparse properties' ? 'Rarely published properties' : GAP_DOMAIN_WORDS[r.domain] ?? r.domain)}</strong> ${chip(statusToState(r.status), r.status)}${r.derived ? '' : ids(['Coverage record', r.id])}</div>
        <div>${longText(gapFindingWords(r))}</div></div>`;
    return `${blocks}
      <h3 class="sec" id="known-gaps" tabindex="-1">Known gaps</h3>
      ${gaps.length ? gaps.map(gapRow).join('') : `<div class="gap">${esc(EMPTY_LINES.gaps)}</div>`}
      ${notes.length ? `<details class="grade-more review-notes"><summary>Review notes (${notes.length})</summary>${notes.map(gapRow).join('')}</details>` : ''}`;
  }
  return '';
}

/**
 * The known gaps the drawer lists under Sources and counts on the Overview (C21): the material pages' rule (shownGap), so
 * a gap another tab says (the rarely published properties in Mechanical's and Thermal's Not published lists, the price's
 * in Price) is said there, once. A gap that tab does not say after all stays, and is counted: none disappears.
 */
function drawerGaps(c: Loose) {
  return gapSplit(c.cov).gaps.filter((r: Loose) => readerGap(r) && (shownGap(r) || !saidInTab(r, c)));
}
/**
 * The rarely published properties' gap (the derived Sparse properties row) against the Mechanical and Thermal tabs:
 * `named`, the properties it names; `absent`, those the tabs' Not published lists or their named-without-a-value lines
 * name (lower case); `extra`, those they do not (a property no table holds), which the Mechanical tab adds to its list.
 */
function sparseFacts(c: Loose) {
  const r = c.cov.find((x: Loose) => x.domain === 'Sparse properties' && readerGap(x));
  if (!r) return { r: null, named: [], absent: new Set(), extra: [] };
  // A property a sheet names without a value is said as such in its tab ("Named on a data sheet without a value").
  const absent = new Set(['Mechanical', 'Thermal'].flatMap((t) => { const f = measuredIn(c, t); return [...f.absent, ...f.named.map((x: Loose) => x.property)]; }).map((p) => p.toLowerCase()));
  const named = String(r.finding ?? '').replace(/^[^:]*:\s*/, '').replace(/[.\s]+$/, '').split(/,\s*/).filter(Boolean);
  return { r, named, absent, extra: named.filter((p) => !absent.has(p.toLowerCase())) };
}
/** Whether the tab a gap's domain belongs to states it: every rarely published property listed as not published, or the price's absence or conversion. */
function saidInTab(r: Loose, c: Loose) {
  if (r.domain === 'Sparse properties') {
    // Listed in Mechanical's or Thermal's Not published list, or added to Mechanical's, which is drawn where Mechanical
    // has a value; where it has none, its empty tab gives the gap's own words (emptyReasons).
    if (!measuredIn(c, 'Mechanical').rows.length) return emptyReasons(c, 'Mechanical').includes(r) && readerNote(r.finding);
    const f = sparseFacts(c);
    return f.named.length > 0 && f.named.every((p) => f.absent.has(p.toLowerCase()) || f.extra.includes(p));
  }
  if (r.domain === 'Canadian price') {
    // No listing: the empty tab gives the gap's own words; no price known: the tab's first line says so; a foreign price:
    // the tab's first line says it was converted.
    const e = c.m.headline?.priceCADkg;
    return !c.prices.length || !e?.known || !!e.converted;
  }
  return false;
}

const statusToState = (s: Loose) =>
  s === 'Evidence recorded' || s === 'Resolved' ? 'PASS'
  : s === 'Gap' ? 'UNKNOWN'
  : s === 'Conflict' || s === 'Quarantined' ? 'FAIL' : 'INDETERMINATE';

const gateChip = (g: Loose, what: Loose, axis = what.toLowerCase()) => {
  if (!g) return '';
  const v = gateVerdict(g.verdict);
  return explainButton(esc(v.short), g.reason, { cls: `chip chip-${v.state} chip-small`, head: `${what}, against the H2C's ${h2cLimit(axis) ?? ''} °C: ${v.word.toLowerCase()}` });
};
