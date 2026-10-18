// The sentences the material drawer (detail.js) and the material pages share, as plain text.
//
// Each function here takes facts (material-facts.js, or a compiled record as the build writes it) and returns words,
// unescaped: the renderer escapes them, as HTML or as anything else. A sentence that embeds a control (a button that
// opens a record, a mark that explains itself) is not here: its frame belongs to the renderer that draws the control, and
// only its plain parts are. Every word for a stored code is labels.js's; every number is format.js's. Nothing here
// decides anything, and nothing reads the page.

import { fmtNumber } from './format.js';
import { DIRECTION_WORDS, SPECIMEN_WORDS, FILLED_WORDS, H2C_STATUS, TOPIC_WORDS, RECIPE_WORDS, PRINT_NOT_DRAWN, PRINT_NOT_DRAWN_ONE, OUTSIDE_WORDS, h2cLimit, namedFiller, envVerdictWords } from './labels.js';
import { hardenedWords } from '../engine/products.js';
import { plural, lower, cap, andList, inSentence, stated } from './text.js';
import { dryingAdvice } from './material-stats.js';
import { productName } from './material-facts.js';
import { dayWords } from './dates.js';

export { plural, lower, cap, andList, inSentence };

/** A property's name inside a sentence: lower case, unless it begins with a name (Vicat, Charpy, Izod, Shore) or an abbreviation. */
export const inText = (label) => (/^(?:Vicat|Charpy|Izod|Shore|Rockwell|Barcol)\b/.test(label) ? label : lower(label));

// ------------------------------------------------------------------ a material

/**
 * What the identity line does not say about the material, in a sentence: that it is a support, an elastomer, a foaming
 * grade, a variant with a filler the materials table names (labels.js namedFiller), or one whose filler is not
 * disclosed. The filler itself is in the identity line.
 */
export function describeFacets(m) {
  const bits = [];
  if (m.facets.reinforcement.value === 'foaming') bits.push('A foaming filament, for lightweight parts.');
  if (m.facets.reinforcement.value === 'undisclosed') {
    const named = namedFiller(m);
    bits.push(named ? `A variant with ${named.words}.` : 'A commercial variant whose filler is not disclosed.');
  }
  if (m.facets.supportMaterial.value) bits.push('A support or interface material, not a build material.');
  if (m.facets.flexible.value) bits.push('A flexible elastomer.');
  return bits.join(' ');
}

/**
 * What a material is beyond its identity line (the drawer's lede): a variant's filler, a support material, an elastomer.
 * Bambu Lab's standing is the head's chip and its popover since 2026-10-18; the lede had said it a second time.
 */
export const ledeWords = (m) => describeFacets(m);

/** The identity line from material-facts.js identity(): "ASA · carbon-fibre filled · 17 products from 15 makers". */
export const identityLine = (id) => [id.base, FILLED_WORDS[id.reinforcement],
  id.products ? `${plural(id.products, 'product')} from ${plural(id.makers, 'maker')}` : 'no product on file'].filter(Boolean).join(' · ');

/**
 * How much is on file, after how well documented it is: measurements and the documents they were read from (the Sources
 * tab's and the page's word), held-back values, known gaps and conflicts where there are any (none is said by their
 * absence). `shown` counts the known gaps the reader is shown under Sources' Known gaps ({ gaps, conflicts }), so a count
 * adds up where it is followed (C21); without it, the summary's own counts.
 */
export const onFileWords = (summary, documents, shown = summary) => [
  `${fmtNumber(summary.numericMeasurements)} ${summary.numericMeasurements === 1 ? 'measurement' : 'measurements'} from ${fmtNumber(documents)} ${documents === 1 ? 'document' : 'documents'}`,
  summary.quarantined ? `${summary.quarantined} held back` : null, shown.gaps ? plural(shown.gaps, 'known gap') : null,
  shown.conflicts ? plural(shown.conflicts, 'unresolved conflict') : null].filter(Boolean).join(' · ');

/** What an empty tab or section says first. */
export const NOTHING_ON_FILE = 'Nothing on file for this material.';
/** Each tab's line when it holds nothing (by the drawer's tab keys), and the known gaps' when none is recorded. */
export const EMPTY_LINES = {
  Grades: 'No product is on file under this material.',
  Mechanical: 'No mechanical value is on file for this material.',
  Thermal: 'No thermal value is on file for this material.',
  Printing: 'No print profile is on file for this material.',
  Environment: 'No statement on chemicals, water or other exposure is on file for this material.',
  Price: 'No sampled shop listed this material.',
  Evidence: 'No document is on file for this material.',
  gaps: 'No gap, limitation or conflict is recorded for this material.',
};
/** One recorded reason a section is empty (a coverage row, material-facts.js emptyReasons), in the reviewer's words. */
export const emptyReasonLine = (r) => `${r.domain ?? ''}, ${r.status.toLowerCase()}: ${gapFindingWords(r)}`;
/**
 * A known gap's finding as a reader is shown it: the rarely published properties' list in lower case inside its sentence
 * ("Not published by its own products: compression strength, coefficient of thermal expansion, …"), as a sentence names a
 * property (C06).
 */
export const gapFindingWords = (r) => {
  const t = String(r?.finding ?? '');
  if (r?.domain !== 'Sparse properties') return t;
  const at = t.indexOf(': ');
  return at < 0 ? t : `${t.slice(0, at + 2)}${t.slice(at + 2).split(', ').map(inSentence).join(', ')}`;
};

/** Which material a family's guidance speaks for, said beside it (material-facts.js familyGuidanceFacts). */
export const familyScope = (name, materialName) => (name === materialName ? 'for the family in general, not one product' : `for ${name} in general, not ${materialName} or its products`);

// ------------------------------------------------------------------ a measurement

/** A measurement's test conditions on one line: orientation, specimen, standard, moisture, notch. Empty where none. */
export const conditionLine = (x) => [
  x.direction && x.direction !== 'not-applicable' ? DIRECTION_WORDS[x.direction] ?? x.direction : null,
  x.specimenType?.startsWith('Not published') ? 'specimen not stated' : SPECIMEN_WORDS[x.specimenType] ?? x.specimenType,
  x.standardText && x.standardText !== 'Not applicable' ? x.standardText : null,
  x.moisture && x.moisture !== 'Not published' ? x.moisture : null,
  x.notch === 'Notched' || x.notch === 'Unnotched' ? x.notch.toLowerCase() : null,
].filter(Boolean).join(' · ');

/** A numeric measurement's value as its source gives it: "52.3 ± 1.1 MPa". */
export const measuredValue = (x) => `${fmtNumber(x.value)}${x.uncertainty ? ' ± ' + fmtNumber(x.uncertainty) : ''} ${x.unit ?? ''}`;

/** Which test an impact result whose own words do not settle it probably was (impact_test_guesses.csv, D133). */
export const testGuessHead = (g) => (g.test === 'Cannot tell' ? 'Which test: cannot tell.' : g.test === 'Another test' ? 'Neither Charpy nor Izod.' : `Which test: probably ${g.test}.`);

/** A property the sheet names without a value, inside a list: "glass transition temperature (XY)". */
export const namedOnlyWords = (x) => `${inSentence(x.property)}${x.direction && !['not-applicable', 'unknown'].includes(x.direction) ? ` (${x.direction})` : ''}`;

/** What a document gave (material-facts.js sourceBlockFacts().gave), as a list: "12 values", "print settings (2 profiles)". */
export const gaveWords = (gave) => [gave.values != null ? plural(gave.values, 'value') : null, gave.profiles ? `print settings (${plural(gave.profiles, 'profile')})` : null,
  gave.statements ? plural(gave.statements, 'maker statement') : null, gave.environment ? plural(gave.environment, 'statement on chemicals or use', 'statements on chemicals or use') : null,
  gave.guide ? 'the Bambu Lab Filament Guide entry for this material, in Printing' : null].filter(Boolean);

// ------------------------------------------------------------------ states a value is in

/** An annealing schedule: "at 80 °C for 4 h", with what the sheet does not state said so. */
export const scheduleWords = (t) => `at ${t?.tempC != null ? `${fmtNumber(t.tempC)} °C` : 'a temperature its sheet does not state'} for ${t?.hours != null ? `${fmtNumber(t.hours)} h` : 'a time its sheet does not state'}`;

// What was done to a bar that changes its result (annealed, conditioned), in words, from the typed fields the build
// reads, never the cell's own words: a page that states once, for its whole table, that every bar was annealed has
// annealed bars, whatever each row's cell says (D116). A bar as printed, or whose treatment is not stated, says nothing.
const onPage = (x, field) => (x?.pageContext?.[field] ? ' (stated once on its page)' : '');
/** The states that changed a value's bar, as phrases: [] for a bar as printed and dry. `v` is the product's value, if any. */
export function changedState(x, v) {
  const anneal = v?.anneal ?? (x?.postProcessingState === 'annealed' ? x.anneal ?? {} : null);
  return [anneal ? `annealed ${scheduleWords(anneal)}${onPage(x, 'postProcessingState')}` : null,
    x?.moistureState === 'conditioned' ? `after moisture conditioning${onPage(x, 'moistureState')}` : null].filter(Boolean);
}

/** Why a product's value is not comparable (its level is as-published), by its headline's caveat. */
export const LEVEL_NOTE = {
  'unstated-direction': 'The source does not state the specimen orientation, so this may be a moulded or differently oriented bar. It is used only if Data quality includes values with no stated orientation or load.',
  'load-not-stated': 'The source does not state the HDT load, so this value is used only if Data quality includes values with no stated orientation or load.',
};
// A headline drawn in the drawer alone (D139) decides nothing, whatever Data quality admits.
export const DRAWER_LEVEL_NOTE = 'The source does not state the specimen orientation, so this may be a moulded or differently oriented bar. It is drawn hollow in its comparison and left out of the median; no answer reads it.';

// ------------------------------------------------------------------ a comparison's rows (D133, D139)

// The graphs' tables print a median, middle half and range as the material pages print them (display-numbers.js), never
// rounded across a requirement on the property (format.js fmtAgainst's rule). Imported here, beside the words that use them.
import { fmtDisplay } from './display-numbers.js';
import { fmtAgainst } from './format.js';

const SIDE = { '>=': (a, b) => a >= b, '>': (a, b) => a > b, '<=': (a, b) => a <= b, '<': (a, b) => a < b };
/**
 * A number in a graph's table at the pages' display precision: "79" for an HDT of 78.9 °C, "12" for 12.3 %. Where that
 * would put it on the other side of a requirement on its property (`thresholds`, `{ operator, value }`), it keeps the
 * digits that hold it on its own side, as the table does.
 */
export function graphNumber(v, unit, thresholds = []) {
  const s = fmtDisplay(v, unit);
  const shown = Number(s.replace(/,/g, ''));
  const crosses = thresholds.some(({ operator, value }) => SIDE[operator] && (!Number.isFinite(shown) || SIDE[operator](shown, value) !== SIDE[operator](v, value)));
  return crosses ? fmtAgainst(v, thresholds) : s;
}
/** A span of two numbers in a graph's table (graphNumber each), word-joined at its dash; one number where both print alike. */
export function graphSpan(lo, hi, unit, thresholds = []) {
  const a = graphNumber(lo, unit, thresholds), b = graphNumber(hi, unit, thresholds);
  return a === b ? a : `${a}⁠–⁠${b}`;
}
/** A spread's range (`{ min, max }`) as a graph's table prints it. */
export const graphRange = (x, unit, thresholds = []) => graphSpan(x.min, x.max, unit, thresholds);

/** What a hollow dot's sheet leaves unstated: the orientation, or the test load, its row's test is defined at (D84); or,
 *  on a row that says so, where else its value was read (a print setting from the printer maker's guide). */
export const asPublishedWords = (h) => h.openWords ?? (h.direction ? 'no stated orientation' : 'no stated test load');
/** What a row compares its products on, said of the products that state it: the bar's orientation (XY), or the test load. */
export function statedWhat(hs) {
  const dirs = [...new Set(hs.map((h) => h.direction))];
  if (dirs.every(Boolean)) return `the bar's orientation (${dirs.join(' or ')})`;
  return hs.every((h) => h.loadMPa != null) ? 'the test load' : 'the bar\'s orientation or the test load';
}
/**
 * The key of a comparison's graphs, in the material pages' words (app/pages/charts/kit.js KEY), so a mark means one thing
 * in the drawer and on the page: hollow is shown, not ranked, and the key says why.
 */
export const GRAPH_KEY = {
  filled: 'a product',
  open: 'as published: orientation or load not stated',
  annealed: 'measured after annealing',
  variant: 'added filler or additive, kept out of the median',
  claimed: 'sold as toughened (maker\'s statement)',
  band: 'middle half and median',
  median: 'median',
  // Print temperatures: a value read from the guide is drawn hollow, and never counted.
  own: 'a product\'s data sheet',
  guide: 'from the Bambu Lab Filament Guide, not counted',
  printVariant: 'added filler or additive, not counted',
  limit: 'the H2C\'s limit, and beyond it',
};

/** A row's count, as the pages' strips say it: "55 ranked of 106 shown", "12 products, all ranked", "6 shown, none ranked". */
export const rowCountWords = (n, shown, word = 'ranked') => (n === shown ? `${plural(shown, 'product')}, all ${word}`
  : n ? `${n} ${word} of ${shown} shown` : `${shown} shown, none ${word}`);
/** A comparison's counted line, closed: "814 results: 460 drawn above, 354 not drawn" (its reasons open beneath it). */
export const tallyWords = (n, drawn, named, rest) => `${plural(n, 'result')}: ${[`${drawn} drawn above`, named ? `${named} named above` : null, rest ? `${rest} not drawn` : null].filter(Boolean).join(', ')}`;
/** Why a dot is not in its row's median (material-facts.js outOfMedian's code), in words. */
export const outOfMedianWords = (code, h) => (code === 'variant' ? 'added filler or additive' : code === 'as-published' ? asPublishedWords(h) : code === 'toughened' ? 'sold as toughened' : null);

/** A range of two numbers that never breaks across lines at its dash (U+2060 joins the dash to its numbers). */
export const joinedSpan = (x) => (x.min === x.max ? fmtNumber(x.min) : `${fmtNumber(x.min)}⁠–⁠${fmtNumber(x.max)}`);

/**
 * The products drawn on a row but not ranked (materials[].summary), by why, each with its range as the table prints it:
 * "39 with no stated orientation (1.44–4.78)", "12 with an added filler or additive (0.715–4.73)".
 */
export const apartWords = (h, s, thresholds = []) => [s?.asPublished ? `${s.asPublished.n} with ${asPublishedWords(h)} (${graphRange(s.asPublished, h.unit, thresholds)})` : null,
  s?.variants ? `${s.variants.n} with an added filler or additive (${graphRange(s.variants, h.unit, thresholds)})` : null,
  s?.claimed?.setApart ? `${s.claimed.n} sold as toughened (${graphRange(s.claimed, h.unit, thresholds)})` : null].filter(Boolean);

/** Why a comparison has no median, where none of the values drawn is compared (after "No median: "). */
export function noMedianWhy(hs, m) {
  const sum = (f) => hs.reduce((a, h) => a + (f(m.summary?.[h.key]) ?? 0), 0);
  const opened = sum((x) => x?.asPublished?.n), variants = sum((x) => x?.variants?.n), claimedN = sum((x) => (x?.claimed?.setApart ? x.claimed.n : 0));
  const drawnN = opened + variants + claimedN;
  const lacking = hs.filter((h) => m.summary?.[h.key]?.asPublished?.n);
  const lack = lacking.every((h) => h.direction) ? 'orientation' : lacking.every((h) => h.loadMPa != null) ? 'test load' : 'orientation or test load';
  const reasons = [opened ? `${opened} ${opened === 1 ? 'states' : 'state'} no ${lack}` : null,
    variants ? `${variants} ${variants === 1 ? 'has' : 'have'} an added filler or additive` : null,
    claimedN ? `${claimedN} ${claimedN === 1 ? 'is' : 'are'} sold as toughened` : null].filter(Boolean);
  return reasons.length === 1 && opened ? `none of the ${drawnN === 1 ? 'value' : `${drawnN} values`} drawn states ${statedWhat(lacking)}, and only those that do are compared`
    : `none of the ${drawnN === 1 ? 'value' : `${drawnN} values`} drawn is compared: ${andList(reasons)}`;
}

/**
 * What a spread's products sold as toughened give, and what the others give (D133): the reason a wide range is not the
 * material's. Named, both stay in the median; set apart, the median is the others' and the toughened ones are listed.
 */
export function toughenedSplit(s, unit) {
  const k = s.claimed;
  const span = (x) => (x.min === x.max ? fmtNumber(x.min, unit) : `${fmtNumber(x.min)} to ${fmtNumber(x.max, unit)}`);
  if (k.setApart) {
    return `The median and middle half are of the other ${plural(s.n, 'product')}. ${k.n === 1 ? 'The product its maker sells as toughened or impact-modified gives' : `The ${k.n} products their makers sell as toughened or impact-modified give`} ${span(k)} and ${k.n === 1 ? 'is' : 'are'} set apart, as products with an added filler or additive are.`;
  }
  if (!k.others) {
    return s.n === 1 ? `That product is one its maker sells as toughened or impact-modified (${span(k)}).`
      : `All ${s.n} are products their makers sell as toughened or impact-modified (${span(k)}).`;
  }
  const others = ` The other ${k.others.n} give ${span(k.others)}${k.others.n > 1 ? `, median ${fmtNumber(k.others.median)}` : ''}.`;
  return `${k.n} of the ${s.n} ${k.n === 1 ? 'is a product its maker sells' : 'are products their makers sell'} as toughened or impact-modified (${span(k)}).${others}`;
}
/** The explanation of a product's "sold as toughened" mark (material-facts.js toughenedClaim): the maker's words, where, and that they are a claim. */
export const toughenedClaimWords = (g, f) => `${g.manufacturer ?? 'Its maker'} sells it as toughened or impact-modified: "${f.statement?.text ?? f.claim.evidenceId}"${f.where ? ` (${f.where})` : ''}. `
  + 'This is the maker\'s statement, not a test result; its published values are beside it.';
/** Said once under a comparison's table where a product sold as toughened is drawn (D133). */
export const TOUGHENED_NOTE = '"Sold as toughened" is the maker\'s own statement about its product, quoted on its value\'s line in the lists below; it is not a test result, and a product sold as toughened can publish a low value.';
/** The same, under the Products tab's spread table. */
export const TOUGHENED_NOTE_SHORT = '"Sold as toughened" is the maker\'s statement, not a test result.';

/** A product's spread line in the Products tab's table (materials[].summary): what is kept out of the median, by why, at the display precision. */
export function leftOutWords(h, s) {
  const span = (x) => graphRange(x, h.unit);
  return [s.asPublished ? `${s.asPublished.n} with no stated ${h.direction ? 'orientation' : 'test load'} (${span(s.asPublished)})` : '', s.variants ? `${s.variants.n} with an added filler or additive (${span(s.variants)})` : '',
    s.claimed?.setApart ? `${s.claimed.n} sold as toughened (${span(s.claimed)})` : ''].filter(Boolean);
}

/**
 * The rows a comparison does not draw because no product has a value (material-facts.js comparisonsOf silentListed and
 * silentUnlisted). `where` says where the listed rows' results are: below them in the drawer, in each product's card on
 * a material's Products page.
 */
export function silentRowsWords(listed, unlisted, where = 'listed below') {
  const said = (rows, isListed) => (rows.length ? `${andList(rows.map((h) => h.labels.plain))}: no product has one, so ${rows.length > 1 ? 'they have' : 'it has'} no row${isListed ? `; ${rows.length > 1 ? 'their' : 'its'} results are ${where}` : ''}.` : '');
  return [said(listed, true), said(unlisted, false)].filter(Boolean).join(' ');
}

/** A graph named by its first row, without the row's orientation: "tensile modulus". */
export const graphName = (gr) => lower(gr.rows[0].labels.plain.replace(/\s*\([^)]*\)$/, ''));

/**
 * The products that publish both of a pair (comparisonsOf().pairs), by name where there is one pair and one graph, else
 * counted per graph. `names` are the product names of each pair's `both`, in order.
 */
export function pairWords(pairLabel, pairs, names, oneGraph) {
  if (pairs.length === 1 && oneGraph) {
    const both = names[0];
    return both.length ? `${pairLabel}: ${plural(both.length, 'product')} (${andList(both.slice(0, 6))}${both.length > 6 ? ' and others' : ''}).` : `No product publishes ${lower(pairLabel.replace(/ published$/, ''))}.`;
  }
  return pairs.length ? `${pairLabel}: ${andList(pairs.map((p, i) => { const n = p.both.length; return `${n ? (i ? n : plural(n, 'product')) : 'none'} for ${graphName(p.gr)}`; }))}.` : '';
}

/**
 * The label of a comparison's "both" line: for a pair of orientations, what the products publish ("Both XY and Z
 * published"); otherwise its drawer_comparisons.csv pair label ("Both tests").
 */
export function pairLabelOf(cmp, hs) {
  const dirs = [...new Set(hs.map((h) => h.direction).filter(Boolean))];
  return dirs.length === 2 ? `Both ${dirs.join(' and ')} published` : cmp.pairLabel;
}

/** A share as a whole per cent: "64 %". */
export const sharePct = (r) => `${Math.round(r * 100)} %`;
/** The median of a list of numbers. */
const middle = (xs) => { const s = [...xs].sort((p, q) => p - q), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
/**
 * Z as a share of XY, for the pairs whose products' two values are compared from one document and in one state
 * (comparisonsOf().shares and noShare). Empty where no pair has a share.
 */
export function shareWords(shares, noShare) {
  if (!shares.length) return '';
  // A share every product gives alike is said once, without a range of one number.
  const one = (gr, s) => (sharePct(Math.min(...s)) === sharePct(Math.max(...s)) ? `${graphName(gr)} ${sharePct(s[0])} (${plural(s.length, 'product')})`
    : `${graphName(gr)} ${sharePct(middle(s))} (${Math.round(Math.min(...s) * 100)}⁠–⁠${sharePct(Math.max(...s))}, ${s.length} products)`);
  return `Kept across the layers, ${shares[0].gr.rows[1].direction} as a share of ${shares[0].gr.rows[0].direction} (median of the products with both from one document): ${andList(shares.map(({ gr, shares: s }) => one(gr, s)))}.${
    noShare.length ? ` None for ${andList(noShare.map(({ gr }) => graphName(gr)))}.` : ''}`;
}

/** Where a dot's record stands for another product too (a twin reads its sibling's sheet, D89): " for X too (data sheet shared with Y)". */
export const alsoForWords = (name, from) => ` for ${name} too (${from?.label ?? 'the same sheet'})`;

// ------------------------------------------------------------------ printing

/** A material's recorded window across its products (materials[].print.nozzleC and the like), or null where none was published. */
export const rangeWords = (r) => (!r ? null
  : r.min === null && r.max === null ? 'open-ended windows only'
  : r.max === null ? `at least ${fmtNumber(r.min)} °C`
  : r.min === null ? `up to ${fmtNumber(r.max)} °C`
  : r.min === r.max ? `${fmtNumber(r.max)} °C`
  : r.min === 0 ? `up to ${fmtNumber(r.max)} °C`
  : `${fmtNumber(r.min)}–${fmtNumber(r.max)} °C`);

/** One of a product's print settings as its print gate reads it (grades[].print.nozzle and the like): "220–250 °C". */
export const settingWords = (a) => (a.state === 'range' && a.max == null && a.min != null ? `at least ${fmtNumber(a.min)} °C`
  : a.state === 'range' ? `${a.min != null && a.min !== a.max ? `${fmtNumber(a.min)}–` : ''}${fmtNumber(a.max)} °C`
  : a.state === 'not-required' || a.state === 'ambient' ? 'not required' : a.state === 'unknown' ? 'not published'
    : a.state === 'enclosed' ? 'enclosure needed, no temperature' : a.state.replace(/-/g, ' '));

/** A window as its sheet gives it, without its unit: both ends, one value, or one end open ("at least 50"). */
export const windowText = (lo, hi) => (lo != null && hi == null ? `at least ${fmtNumber(lo)}` : lo == null ? `up to ${fmtNumber(hi)}`
  : lo === hi ? fmtNumber(lo) : `${fmtNumber(lo)}⁠–⁠${fmtNumber(hi)}`);

/** Over a print setting's graph, after its name: its unit, and the H2C's limit, drawn on the scale or above it. */
export const printSettingHead = (limit, onScale) => `°C${limit == null ? '' : ` · the H2C reaches ${fmtNumber(limit)} °C${onScale ? '' : ', above this scale'}`}`;

/** A print row's values drawn and not counted (print-spread.js rowSummary), each with its range: from the guide, an added filler or additive. */
export const printApartWords = (s) => [s.guide ? `${s.guide.n} from the guide (${graphRange(s.guide, '°C')})` : null,
  s.variants ? `${s.variants.n} with an added filler or additive (${graphRange(s.variants, '°C')})` : null].filter(Boolean);


/** The H2C's settings by axis, as a sentence names them: the chamber is the heated chamber. */
const AXIS_WORDS = { nozzle: 'nozzle', bed: 'bed', chamber: 'heated chamber' };
/**
 * The H2C's limits as one list, the same on both surfaces (the page's On the H2C foot, the drawer's Printing): "nozzle
 * 350 °C, bed 120 °C, heated chamber 65 °C". `axes` [{ axis, limit }].
 */
export const h2cLimitsText = (axes) => axes.filter((a) => a.limit != null).map((a) => `${AXIS_WORDS[a.axis] ?? a.axis} ${fmtNumber(a.limit)} °C`).join(', ');

/** The lines under the print temperatures' table (material-facts.js printFacts): what n counts, the medians, the products outside the H2C's limits. */
export function printLines(f) {
  const typical = f.typical.map(({ label, low, high }) => {
    if (low == null && high == null) return null;
    // Two medians of different products can cross where few give both ends; then each is said by name.
    // At the table's precision (graphNumber), so a median reads alike in both.
    if (low != null && high != null && low > high) return `${lower(label)} lowest ${graphNumber(low, '°C')} °C and highest ${graphNumber(high, '°C')} °C, medians of different products`;
    return `${lower(label)} ${low == null || high == null ? graphNumber(low ?? high, '°C') : graphSpan(low, high, '°C')} °C`;
  }).filter(Boolean);
  const outside = f.outside.map((a) => `${lower(a.label)}: ${andList(a.list.map((o) => `${o.name} (${windowText(o.min, o.max)} °C${OUTSIDE_WORDS[o.verdict]})`))}`);
  // Within, but only at the low end of the maker's window (D151): a pass, said so.
  const lowEnd = (f.lowEnd ?? []).map((a) => `${lower(a.label)}: ${andList(a.list.map((o) => `${o.name} (${windowText(o.min, o.max)} °C)`))}`);
  // The limits as the material page's On the H2C says them (print-brief.js h2cLimitsText), and "beyond", the chips' word (C04).
  const limits = h2cLimitsText(f.limits);
  return [
    outside.length ? `Beyond the H2C's limits (${limits}): ${outside.join('; ')}.` : `No product's setting is beyond the H2C's limits: ${limits}.`,
    lowEnd.length ? `Within, at the low end of the maker's window: ${lowEnd.join('; ')}.` : null,
  ].filter(Boolean);
}

/** A setting one product's sheet, or only the guide, gives (printFacts().single): said with its window. Empty where none. */
export function printSingles(f) {
  const windowOf = (w) => ('tempC' in w ? fmtNumber(w.tempC) : windowText(w.min, w.max));
  return f.single.map((a) => (a.own ? `${a.label}: only ${a.own.name}'s sheet gives one (${windowOf(a.own.window)} °C).`
    : `${a.label}: only ${f.guideName} gives one (${windowOf(a.guide.window)} °C), read by ${plural(a.guide.readers, 'product')}.`)).join(' ');
}

/** The settings not drawn, by why (printFacts().missing), after "Not drawn: ". Empty where every product is drawn. */
export function printMissing(f) {
  const oneEnd = (n, end) => (n ? `${n} ${n === 1 ? 'gives' : 'give'} only a ${end} setting` : null);
  return f.missing.map((a) => `${lower(a.label)}, ${andList([...a.notDrawn.map(([why, n]) => `${n} ${(n === 1 ? PRINT_NOT_DRAWN_ONE : PRINT_NOT_DRAWN)[why]}`),
    oneEnd(a.oneEnd.low, 'lowest'), oneEnd(a.oneEnd.high, 'highest')].filter(Boolean))}`).join('; ');
}

/** Where products' settings were read when their own sheet is silent (material-facts.js printCounts().origins), as a list. */
export const printOriginsWords = (origins) => [origins.guide ? `${plural(origins.guide, 'setting')} from the Bambu Lab Filament Guide` : '',
  origins.twin ? `${plural(origins.twin, 'setting')} from a data sheet shared with another product` : ''].filter(Boolean);

/**
 * One axis of the H2C's limits against a material's products (printCounts().axes): "3 within (1 at the low end of its
 * maker's window), 1 beyond or only partly within".
 */
export const printCountWords = (n) => `${n.within} within${n.lowEnd ? ` (${n.lowEnd} at the low end of ${n.lowEnd === 1 ? 'its maker\'s window' : 'their makers\' windows'})` : ''}${n.over ? `, ${n.over} beyond or only partly within` : ''}${n.unknown ? `, ${n.unknown} not published` : ''}`;

/** The hardened-nozzle line of a material's printability, by its gate (materials[].gates.abrasive) and its products' share. */
export function hardenedFactWords(gate, hard, someHard) {
  if (someHard) {
    return `${cap(hardenedWords(hard))}: ${hard.needing.slice(0, 4).map((g) => productName(g)).join(', ')}${hard.need > 4 ? ` and ${hard.need - 4} more` : ''}. The others state no need or say nothing; Products shows which.`;
  }
  return gate === 'requires-hardened' ? 'Required: the filler wears out a brass nozzle.' : gate === 'no-special-concern'
    ? 'Its sources state no special nozzle need.' : 'No source mentions nozzle wear.';
}

/** What the products with drying advice (material-stats.js dryingAdvice) ask for, where not all ask the same: "3 call for drying and 1 says it is not needed". Empty otherwise. */
export function dryingNeedsWords(a) {
  const needs = [[a.needs.required, 'call', 'calls', 'for drying'], [a.needs.optional, 'advise', 'advises', 'it only for wet filament'], [a.needs['not-needed'], 'say', 'says', 'it is not needed']].filter(([n]) => n);
  return needs.length > 1 ? andList(needs.map(([n, many, one, w]) => `${n} ${n === 1 ? one : many} ${w}`)) : '';
}

/**
 * The drying line of a material's printability, by its gate (materials[].gates.drying), with how many of its products
 * have drying advice counted as the material page counts it (material-stats.js dryingAdvice: their own sheet, a sheet
 * they share or the Bambu Lab Filament Guide), and how many of those call for drying where not all do.
 */
export function dryingFactWords(gate, products) {
  const a = dryingAdvice(products);
  const split = dryingNeedsWords(a) ? `: ${dryingNeedsWords(a)}` : '';
  const share = () => (a.have ? ` (${a.have} of ${plural(products.length, 'product')} ${a.have === 1 ? 'has' : 'have'} drying advice${split}); Products gives each one` : '; Printing gives its wording');
  if (gate === 'required') return `A drying schedule is published${share()}.`;
  if (gate === 'optional') return `Its sources advise drying only for a condition, such as wet filament${share()}.`;
  if (gate === 'not-needed') return `Its sources say drying is not needed${share()}.`;
  return 'No source states whether to dry it. That does not mean it needs none.';
}

/**
 * What the print profiles record about feeding through an AMS, in their own words. It used to be a verdict chip that
 * read "Not established" for every material, styled like the checks above it that are evaluated; these fields are
 * recorded text, not a verdict, so they are quoted and nothing is inferred from them.
 */
export function amsSummary(profiles) {
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
  // Where profiles disagree, each wording says how many carry it, in words a reader reads (it had been "(1 of 297 profiles)").
  const quote = (by) => [...by].map(([t, n]) => `"${t}"${n < profiles.length ? `, on ${n === 1 ? 'one profile' : `${fmtNumber(n)} profiles`}` : ''}`).join('; ');
  const published = wordings('amsPublished');
  const pro = wordings('ams2Pro');
  const ht = wordings('amsHT');
  const parts = [published.size ? `Makers state: ${quote(published)}.` : 'No maker states AMS compatibility.'];
  if (pro.size && quote(pro) === quote(ht)) parts.push(`Bambu Lab, for AMS 2 Pro and AMS HT: ${quote(pro)}.`);
  else {
    if (pro.size) parts.push(`Bambu Lab, for AMS 2 Pro: ${quote(pro)}.`);
    if (ht.size) parts.push(`Bambu Lab, for AMS HT: ${quote(ht)}.`);
  }
  return parts.join(' ');
}

/** The guide row's enclosure statement (printGuide[].enclosureState) and nozzle need (abrasion.requiresHardened), in words. */
export const guideEnclosureWords = (state) => (state === 'recommended' ? 'required' : state === 'not-needed' ? 'not needed' : 'not stated');
export const guideHardenedWords = (requiresHardened) => (requiresHardened === true ? 'hardened nozzle required' : requiresHardened === false ? 'hardened nozzle not needed' : 'nozzle wear not settled');

/** A product's annealing schedules (grades[].print.anneal), each "120 °C for 16 h". */
export const annealWords = (list) => (list ?? []).map((x) => `${x.tempC != null ? `${fmtNumber(x.tempC)} °C` : 'temperature not stated'}${x.hours != null ? ` for ${fmtNumber(x.hours)} h` : ''}`);

// ------------------------------------------------------------------ what makers say (db.knowHow, D124)

/** What a product's makers' documents leave unsaid (material-facts.js knowHowGapFacts), as one line; empty where nothing is. */
export function knowHowGap(f) {
  const site = f.searchedOn ? ` (website checked ${dayWords(f.searchedOn)})` : '';
  if (f.state === 'no-document-read') return `None of this product's documents has been read beyond its numbers${site}.`;
  const missing = f.state === 'collected' ? f.missing.map((t) => TOPIC_WORDS[t] ?? lower(t)) : ['anything beyond its numbers'];
  const all = [...missing, ...f.recipe.map((part) => RECIPE_WORDS[part])];
  return all.length ? `Not stated by the maker: ${andList(all)}${site}.` : '';
}

/** Whether the makers' own websites were checked for a material's products: none, some or all of them. */
export function sitesLine(searched, total) {
  if (!searched) return "Makers' websites not checked yet.";
  if (searched >= total) return `Makers' websites checked for all ${plural(total, 'product')}.`;
  return `Makers' websites checked for ${searched} of them so far.`;
}

/** Where a material's products' documents are silent (material-facts.js makersSayFacts().states), as phrases. */
export const makersSilentWords = (n) => [n['sheet-silent'] ? `${plural(n['sheet-silent'], 'data sheet')} ${n['sheet-silent'] === 1 ? 'says' : 'say'} nothing beyond their numbers` : '',
  n['no-document-read'] ? `${n['no-document-read']} ${n['no-document-read'] === 1 ? 'product has' : 'products have'} no document read yet` : '',
  n['searched-nothing'] ? (n['searched-nothing'] === 1 ? "1 maker's website was checked and says nothing more" : `${n['searched-nothing']} makers' websites were checked and say nothing more`) : ''].filter(Boolean);

/** The parts of a recipe the documents of some products leave unsaid (makersSayFacts().recipe), as phrases. */
export const makersRecipeWords = (recipe) => recipe.map(([part, x]) => `${RECIPE_WORDS[part]} (${plural(x, 'product')})`);

// ------------------------------------------------------------------ environment and the resin

/** A polymer-level verdict in words: "not resistant", "soluble". */
export const verdictWords = (v) => String(v ?? '').replace(/-/g, ' ');

/**
 * What the statements on one exposure say, counted in one unit, statements, so the counts add up to the row's total:
 * the verdict all of them give; the verdict two thirds or more give, with its count; else "mixed", with how many
 * disagree. A statement in words with no verdict is counted as "without a verdict". The material page's Chemicals table
 * and the drawer's Environment headings print it (moved from app/pages/findings.js, 2026-10-18, C22). It counts makers'
 * statements; it is not the selector's answer to an environment requirement, which is a product's.
 */
export function statementVerdictWords(records) {
  // A "no data" statement says nothing, so it is not counted; a statement in words alone counts but gives no verdict.
  const said = records.filter((e) => e.verdict !== 'no-data');
  const n = said.length;
  if (!n) return records.length ? 'No data published' : '';
  const counts = new Map();
  for (const e of said) if (e.verdict !== 'narrative') counts.set(e.verdict, (counts.get(e.verdict) ?? 0) + 1);
  const list = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const of = (k) => (k === n ? (n === 1 ? 'in its one statement' : n === 2 ? 'in both statements' : `in all ${fmtNumber(n)} statements`) : `in ${fmtNumber(k)} of ${fmtNumber(n)} statements`);
  if (!list.length) return `Described without a verdict, ${of(n)}`;
  const [top, k] = list[0];
  const word = cap(envVerdictWords(top));
  // One verdict, the others in words only: it is that verdict, however few say it.
  if (list.length === 1) return `${word}, ${of(k)}${k / n < 2 / 3 ? (n - k === 1 ? '; the other gives no verdict' : '; the others give no verdict') : ''}`;
  if (k / n >= 2 / 3) return `${word}, ${of(k)}`;
  const disagree = list.reduce((s, [, x]) => s + x, 0);
  return `Mixed, ${fmtNumber(disagree)} statements disagree`;
}

/**
 * The caveat on makers' environment statements, said once, from the method table (method.csv, Evidence, Environment
 * statements; m437, C11): the drawer's Environment tab and the material page's Chemicals and environment read it. ''
 * where the table has no such rule.
 */
export const envCaveat = (db) => db?.method?.find((r) => r.topic === 'Environment statements')?.rule ?? '';

/** A statement's topic is worth saying only where it says more than the heading above it ("Solubility" under Water solubility). */
export const topicRepeatsHeading = (topic, heading) => { const w = String(topic ?? '').toLowerCase().match(/[a-z]{4,}/g) ?? []; return w.length > 0 && w.every((x) => heading.toLowerCase().includes(x.slice(0, 5))); };

/** An environment statement's conditions under its category heading: its topic where it says more, its agent and strength. */
export const envConditionWords = (e, heading) => [topicRepeatsHeading(e.topic, heading) ? null : e.topic, e.agent, e.strength && e.strength !== 'unspecified' ? e.strength : null].filter(Boolean).join(' · ');

// ------------------------------------------------------------------ prices

const sentenceEnd = (t) => t.replace(/[.\s]*$/, '');
/** Why a listing with no regular price per kilogram is not used. */
export const noPriceWords = (p) => `${p.retailer}${p.foreign ? ` (${p.market})` : ''} lists it${Number.isFinite(p.displayedPrice) ? ` at ${fmtNumber(p.displayedPrice)} ${p.currency ?? 'CAD'}` : ''} (seen ${dayWords(p.accessDate)}), `
  + `but no regular price per kilogram was recorded, so it is not used. ${stated(p.basis) ? `${sentenceEnd(p.basis)}.` : ''}${stated(p.notes) ? ` ${p.notes}` : ''}`;
/** Why a held-back listing (a different product) is not used, in its reviewer's words. */
export const quarantineWords = (p) => [String(p.basis ?? '').replace(/^quarantined:\s*/i, ''), p.notes].filter(stated).map(sentenceEnd).join('. ');
/** How a foreign listing became CAD per kg (D113): its own price per kg before VAT, the rate and its date. */
export const foreignPriceWords = (p) => `${p.retailer} (${p.market}) lists ${fmtNumber(p.listPrice)} ${p.currency}${p.vatPercent != null ? ` including ${fmtNumber(p.vatPercent)}% VAT` : ''} for ${fmtNumber(p.netMassKg)} kg: `
  + `${fmtNumber(p.regularPerKgNative)} ${p.currency}/kg before VAT, × ${p.fx.cadPerUnit} CAD per ${p.currency} (Bank of Canada, ${dayWords(p.fx.date)}). `
  + 'Used only where no Canadian shop in the sample sells the product. Shipping, duty and Canadian stock are not included.';
/** Why a listing is not used for the price (material-facts.js priceRows().unused). */
export const UNUSED_WORDS = {
  quarantined: 'A different product; not used.',
  'no-regular': 'No regular price per kilogram was recorded.',
  another: 'Another listing of this product is used instead: Canadian listings come before foreign ones.',
};
