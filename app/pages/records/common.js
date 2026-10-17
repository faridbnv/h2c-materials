// What the records page's tables share. A record type is a section (`typeSection`); its records are grouped, each group
// a block with its own table whose head (the group's name and counts, then the column labels) stays in view while its
// rows scroll (`groupBlock`), or, for many small groups, one table with a heading row per group (`flatGroups`). A block
// shows its first rows and the rest on request ("Show all 61", a checkbox, so it works without the script); the
// script (assets/tables.src.js) filters by toggling `hidden` on rows and groups and keeps the counts and medians in step.
//
// Every number is format.js's, every name labels.js's or the facts layer's, everything interpolated is escaped, and a
// record's ID stands only in its own cell (td.id, D124). Display helpers the facts layer lacks are here; they should
// move to material-facts.js / material-words.js when the drawer needs them too.

import { esc, count } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { sourceName, stated } from '../../js/ui/material-facts.js';
import { DIRECTION_WORDS, SPECIMEN_WORDS } from '../../js/ui/labels.js';
import { changedState, testGuessHead } from '../../js/ui/material-words.js';

/** How many rows a group shows before "Show all"; a flat table of many small groups shows more. */
export const CAP = 12;
export const FLAT_CAP = 24;

/** A record type's section: its title and count, a note said once for all its rows, and its groups. */
export function typeSection({ id, title, n, noun, note = '', body, empty }) {
  return `<section class="rs" id="${esc(id)}" data-type="${esc(id)}" data-records="${esc(id)}" data-count="${n}">
<div class="rs-h"><h2>${esc(title)}</h2><span class="rs-n" data-n="${n}" data-noun="${esc(noun)}">${esc(count(n, noun))}</span></div>${note}
${n ? body : `<p class="empty">${esc(empty)}</p>`}
</section>`;
}

/** A row of column headings from [label, cls] pairs. */
const heads = (cols) => cols.map(([label, cls]) => `<th scope="col"${cls ? ` class="${cls}"` : ''}>${esc(label)}</th>`).join('');
const colgroup = (cols) => `<colgroup>${cols.map(([, cls]) => `<col${cls ? ` class="k-${cls.split(' ')[0]}"` : ''}>`).join('')}</colgroup>`;

/** The "Show all" control of a capped block: a checkbox, so the rows open without the script too. */
const more = (n, cap) => (n > cap ? `<label class="rg-more"><input type="checkbox"><span data-more>${esc(`Show all ${fmtNumber(n)}`)}</span></label>` : '');

/**
 * One group as a block: a table whose head is the group's name with its counts, then the column labels; its rows past
 * the cap carry class `c` (hidden until "Show all"). `attrs` are the block's data attributes (data-group, data-unit…).
 */
export function groupBlock({ title, stats = '', note = '', aside = '', attrs = '', cols, rows, cls = '', cap = CAP }) {
  const body = rows.map((r, i) => (i < cap ? r : r.replace(/^<tr/, '<tr class="c"'))).join('');
  return `<div class="rg"${attrs} data-cap="${cap}"><table class="rt${cls ? ` ${cls}` : ''}">${colgroup(cols)}<thead>`
    + `<tr class="rg-h"><th colspan="${cols.length}" scope="colgroup"><span class="rg-t">${esc(title)}</span><span class="rg-s" data-stats>${stats}</span>${aside ? `<span class="rg-main">${esc(aside)}</span>` : ''}${note ? `<span class="rg-note">${esc(note)}</span>` : ''}</th></tr>`
    + `<tr class="rg-c">${heads(cols)}</tr></thead><tbody>${body}</tbody></table>${more(rows.length, cap)}</div>`;
}

/**
 * Many small groups in one table: a heading row per group (its name and count), one head of column labels, and the
 * first `cap` rows of the whole shown (a group whose rows are all past the cap hides with them).
 */
export function flatGroups({ groups, cols, cls = '', noun, cap = FLAT_CAP }) {
  let i = 0;
  const bodies = groups.map(([label, rows, extra = '']) => `<tbody data-group="${esc(label)}"><tr class="gr"><th colspan="${cols.length}" scope="rowgroup">${esc(label)}<span>${esc(count(rows.length, noun))}</span>${extra}</th></tr>`
    + `${rows.map((r) => (i++ < cap ? r : r.replace(/^<tr/, '<tr class="c"'))).join('')}</tbody>`).join('');
  return `<div class="rg rg--flat" data-cap="${cap}"><table class="rt${cls ? ` ${cls}` : ''}">${colgroup(cols)}<thead><tr class="rg-c">${heads(cols)}</tr></thead>${bodies}</table>${more(i, cap)}</div>`;
}

/**
 * Where a record was read: its document by name and its place in it. The name links to the document's row in Documents,
 * which lists the material's own documents; a resin's reference data (D64) cites a producer's document that is not one
 * of them, and is named without a link rather than with one that leads nowhere.
 */
export const sourceCell = (c, sid, locator) => {
  const name = esc(sourceName(c.sourceById.get(sid), sid));
  return `<td class="src">${c.documents.has(sid) ? `<a href="#doc-${esc(sid)}">${name}</a>` : `<span>${name}</span>`}${stated(locator) ? `<small>${esc(locator)}</small>` : ''}</td>`;
};

/** A record's ID, in its own cell: the only place an ID stands as text. */
export const idCell = (id) => `<td class="id">${esc(id ?? '')}</td>`;

/** A source's own words in a cell, or a dash where it states nothing. */
export const rawCell = (text, cls = 'raw') => (stated(text) ? `<td class="${cls}">${esc(String(text).trim())}</td>` : `<td class="${cls} none">—</td>`);

/** A chip: a short fact. With `more`, it opens on a tap or a click to the words behind it. */
export const chip = (words, more = '') => (more && more.trim() !== words
  ? `<details class="ch"><summary>${esc(words)}</summary><span>${esc(more)}</span></details>`
  : `<span class="ch">${esc(words)}</span>`);

/** Several facts behind one chip named for them ("3 more: plate, speed, adhesion"), each on its line when opened. */
export function chipList(label, parts) {
  if (!parts.length) return '';
  return `<details class="ch"><summary>${esc(label)}</summary><span>${parts.map(([k, t]) => `<b>${esc(k)}:</b> ${esc(t)}`).join('<br>')}</span></details>`;
}

// ------------------------------------------------------------------ a measurement's conditions

/** A measurement's orientation in words, or '' where the property has none (density, a glass transition). */
export const orientationWords = (x) => (!x.direction || x.direction === 'not-applicable' ? ''
  : x.direction === 'unknown' ? 'not stated' : DIRECTION_WORDS[x.direction] ?? x.direction);

/** What the bar was: the specimen in words ("printed specimen", "specimen not stated"). */
export const specimenWords = (x) => (!stated(x.specimenType) ? 'specimen not stated' : SPECIMEN_WORDS[x.specimenType] ?? x.specimenType);

/** The standard the sheet names, or null. */
export const standardWords = (x) => (stated(x.standardText) ? x.standardText : null);

/**
 * The conditions a measurement's record states beyond orientation, specimen and standard, as chips: moisture,
 * annealing or as printed, test temperature, notch, the impact test it probably was, and the specimen's print
 * settings; each with the sheet's own words a tap away where they say more than the chip.
 */
export const conditionChips = (x) => conditionChipList(x).join('');

/** The same chips as a list, one HTML string each, so a group of values can state the ones they share once. */
export function conditionChipList(x) {
  const out = [];
  const state = changedState(x, null);
  if (x.moistureState === 'dry') out.push(chip('dry', stated(x.moisture) ? x.moisture : ''));
  else if (x.moistureState === 'conditioned') out.push(chip('after moisture conditioning', stated(x.moisture) ? x.moisture : ''));
  else if (stated(x.moisture)) out.push(chip('moisture', x.moisture));
  const annealed = state.find((s) => s.startsWith('annealed'));
  if (annealed) out.push(chip(annealed, stated(x.postProcessing) ? x.postProcessing : ''));
  else if (x.postProcessingState === 'as-printed') out.push(chip('as printed', stated(x.postProcessing) ? x.postProcessing : ''));
  else if (stated(x.postProcessing)) out.push(chip('post-processing', x.postProcessing));
  if (stated(x.testTemperature)) out.push(chip(`tested at ${String(x.testTemperature).trim()}`));
  if (x.notch === 'Notched' || x.notch === 'Unnotched') out.push(chip(x.notch.toLowerCase()));
  if (x.testGuess) out.push(chip(testGuessHead(x.testGuess).replace(/\.$/, '')));
  if (stated(x.printParameters)) out.push(chip('print settings', x.printParameters));
  return out;
}

// ------------------------------------------------------------------ the counts and medians a group head shows

/** Whether a measurement is a number that counts in a group's median: a point value, not held back or flagged. */
export const countable = (x) => x.numeric && Number.isFinite(x.value) && (x.operator === '=' || x.operator == null) && !x.quarantined && !x.implausible;

/** A unit as it is printed after a number ('' for a dimensionless one). */
export const unitText = (u) => (!u || u === 'Dimensionless' ? '' : u);

/**
 * A group head's words for the values listed: how many, and for each unit the median and range of those that count.
 * The script (tables.src.js `stats`) says the same with the same words when a filter changes what is listed.
 */
export function statsWords(n, noun, byUnit) {
  const parts = [`<span>${esc(count(n, noun))}</span>`];
  for (const [u, vs] of byUnit) {
    if (vs.length < 2) continue;
    const s = [...vs].sort((a, b) => a - b);
    const mid = s.length >> 1;
    const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    const unit = unitText(u) ? ` ${unitText(u)}` : '';
    parts.push(`<span>median ${esc(fmtNumber(median))}${esc(unit)}</span>${s[0] === s[s.length - 1] ? '' : `<span>range ${esc(fmtNumber(s[0]))}–${esc(fmtNumber(s[s.length - 1]))}${esc(unit)}</span>`}`);
  }
  return parts.join('');
}
