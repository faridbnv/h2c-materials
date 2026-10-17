// The sentences the material drawer (detail.js) and the material pages share, as plain text.
//
// Each function here takes facts (material-facts.js, or a compiled record as the build writes it) and returns words,
// unescaped: the renderer escapes them, as HTML or as anything else. A sentence that embeds a control (a button that
// opens a record, a mark that explains itself) is not here: its frame belongs to the renderer that draws the control, and
// only its plain parts are. Every word for a stored code is labels.js's; every number is format.js's. Nothing here
// decides anything, and nothing reads the page.

import { fmtNumber } from './format.js';
import { DIRECTION_WORDS, SPECIMEN_WORDS, FILLED_WORDS, H2C_STATUS, TOPIC_WORDS, RECIPE_WORDS, PRINT_NOT_DRAWN, OUTSIDE_WORDS, h2cLimit } from './labels.js';
import { hardenedWords } from '../engine/products.js';
import { plural, lower, cap, andList, inSentence, stated } from './text.js';

export { plural, lower, cap, andList, inSentence };

// ------------------------------------------------------------------ a material

/**
 * What the identity line does not say about the material, in a sentence: that it is a support, an elastomer, a foaming
 * grade or a variant whose filler is not disclosed. The filler itself is in the identity line.
 */
export function describeFacets(m) {
  const bits = [];
  if (m.facets.reinforcement.value === 'foaming') bits.push('A foaming filament, for lightweight parts.');
  if (m.facets.reinforcement.value === 'undisclosed') bits.push('A commercial variant whose filler is not disclosed.');
  if (m.facets.supportMaterial.value) bits.push('A support or interface material, not a build material.');
  if (m.facets.flexible.value) bits.push('A flexible elastomer.');
  return bits.join(' ');
}

/** What a material is, in one or two sentences: its facets, then Bambu Lab's standing (the drawer's lede). */
export const ledeWords = (m) => [describeFacets(m), H2C_STATUS[m.h2cStatus]?.lede].filter(Boolean).join(' ');

/** The identity line from material-facts.js identity(): "ASA · carbon-fibre filled · 17 products from 15 makers". */
export const identityLine = (id) => [id.base, FILLED_WORDS[id.reinforcement],
  id.products ? `${plural(id.products, 'product')} from ${plural(id.makers, 'maker')}` : 'no product on file'].filter(Boolean).join(' · ');

/** How much is on file, after "On file:": measurements, documents, held-back values, known gaps and conflicts. */
export const onFileWords = (summary, documents) => `${plural(summary.numericMeasurements, 'measurement')} from ${plural(documents, 'source')}${summary.quarantined ? ` · ${summary.quarantined} held back` : ''} · ${summary.gaps ? plural(summary.gaps, 'known gap') : 'no known gaps'} · ${summary.conflicts ? plural(summary.conflicts, 'unresolved conflict') : 'no unresolved conflicts'}`;

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
export const emptyReasonLine = (r) => `${r.domain ?? ''}, ${r.status.toLowerCase()}: ${r.finding ?? ''}`;

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
  gave.statements ? plural(gave.statements, 'maker statement') : null, gave.environment ? plural(gave.environment, 'environment statement') : null,
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

/** What a hollow dot's sheet leaves unstated: the orientation, or the test load, its row's test is defined at (D84); or,
 *  on a row that says so, where else its value was read (a print setting from the printer maker's guide). */
export const asPublishedWords = (h) => h.openWords ?? (h.direction ? 'no stated orientation' : 'no stated test load');
/** What a row compares its products on, said of the products that state it: the bar's orientation (XY), or the test load. */
export function statedWhat(hs) {
  const dirs = [...new Set(hs.map((h) => h.direction))];
  if (dirs.every(Boolean)) return `the bar's orientation (${dirs.join(' or ')})`;
  return hs.every((h) => h.loadMPa != null) ? 'the test load' : 'the bar\'s orientation or the test load';
}
/** What a filled dot is, in the key: its orientation stated (XY), its test load stated, or, where the rows differ, compared. */
export function filledWords(hs) {
  const dirs = [...new Set(hs.map((h) => h.direction))];
  if (dirs.every(Boolean)) return `orientation stated (${dirs.join(' or ')})`;
  return hs.every((h) => h.loadMPa != null) ? 'test load stated' : 'compared';
}
/** Why a dot is not in its row's median (material-facts.js outOfMedian's code), in words. */
export const outOfMedianWords = (code, h) => (code === 'variant' ? 'special formulation' : code === 'as-published' ? asPublishedWords(h) : code === 'toughened' ? 'sold as toughened' : null);

/** A range of two numbers that never breaks across lines at its dash (U+2060 joins the dash to its numbers). */
export const joinedSpan = (x) => (x.min === x.max ? fmtNumber(x.min) : `${fmtNumber(x.min)}⁠–⁠${fmtNumber(x.max)}`);

/** The products drawn on a row but left out of its median (materials[].summary), by why: "3 with no stated orientation (1.8–3)". */
export const apartWords = (h, s) => [s?.asPublished ? `${s.asPublished.n} with ${asPublishedWords(h)} (${joinedSpan(s.asPublished)})` : null,
  s?.variants ? `${plural(s.variants.n, 'special formulation')} (${joinedSpan(s.variants)})` : null,
  s?.claimed?.setApart ? `${s.claimed.n} sold as toughened (${joinedSpan(s.claimed)})` : null].filter(Boolean);

/** What n counts in a comparison's table, said under it: which products each row compares. */
export function medianRule(hs, m) {
  const apart = hs.some((h) => m.summary?.[h.key]?.claimed?.setApart) ? 'special formulations and products sold as toughened' : 'special formulations';
  // A row a value with no stated orientation or load may stand on compares only the products whose sheet states it
  // (D84); a row that excludes such a value, or has nothing to state, compares every product drawn on it.
  const open = hs.filter((h) => (h.direction && h.unstatedDirection === 'as-published') || (h.loadMPa != null && h.unstatedLoad === 'as-published'));
  const dirs = [...new Set(open.map((h) => h.direction))];
  const onRows = dirs.length === 1 && dirs[0] ? `the ${dirs[0]} row${open.length > 1 ? 's' : ''}` : `the ${andList(open.map((h) => h.labels.plain))} row${open.length > 1 ? 's' : ''}`;
  return open.length === hs.length ? `n counts the products compared: the products whose sheet states ${statedWhat(open)}, except ${apart}.`
    : open.length ? `n counts the products compared, ${apart} left out: on ${onRows}, those whose sheet states ${statedWhat(open)}; on the other${hs.length - open.length > 1 ? 's' : ''}, every product drawn.`
      : `n counts the products compared: every product drawn, except ${apart}.`;
}

/** Why a comparison has no median, where none of the values drawn is compared (after "No median: "). */
export function noMedianWhy(hs, m) {
  const sum = (f) => hs.reduce((a, h) => a + (f(m.summary?.[h.key]) ?? 0), 0);
  const opened = sum((x) => x?.asPublished?.n), variants = sum((x) => x?.variants?.n), claimedN = sum((x) => (x?.claimed?.setApart ? x.claimed.n : 0));
  const drawnN = opened + variants + claimedN;
  const lacking = hs.filter((h) => m.summary?.[h.key]?.asPublished?.n);
  const lack = lacking.every((h) => h.direction) ? 'orientation' : lacking.every((h) => h.loadMPa != null) ? 'test load' : 'orientation or test load';
  const reasons = [opened ? `${opened} ${opened === 1 ? 'states' : 'state'} no ${lack}` : null,
    variants ? `${variants} ${variants === 1 ? 'is a special formulation' : 'are special formulations'}` : null,
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
    return `The median and middle half are of the other ${plural(s.n, 'product')}. ${k.n === 1 ? 'The product its maker sells as toughened or impact-modified gives' : `The ${k.n} products their makers sell as toughened or impact-modified give`} ${span(k)} and ${k.n === 1 ? 'is' : 'are'} set apart, as special formulations are.`;
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

/** A product's spread line in the Products tab's table (materials[].summary): what is left out of the range, by why. */
export function leftOutWords(h, s) {
  const span = (x) => (x.min === x.max ? fmtNumber(x.min) : `${fmtNumber(x.min)}–${fmtNumber(x.max)}`);
  return [s.asPublished ? `${s.asPublished.n} with no stated ${h.direction ? 'orientation' : 'test load'} (${span(s.asPublished)})` : '', s.variants ? `${plural(s.variants.n, 'special formulation')} (${span(s.variants)})` : '',
    s.claimed?.setApart ? `${s.claimed.n} sold as toughened (${span(s.claimed)})` : ''].filter(Boolean);
}

/**
 * The rows a comparison does not draw because no product has a value (material-facts.js comparisonsOf silentListed and
 * silentUnlisted). `where` says where the listed rows' results are: below them in the drawer, on the records page on a
 * material page.
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
    return both.length ? `${pairLabel}: ${plural(both.length, 'product')} (${andList(both.slice(0, 6))}${both.length > 6 ? ' and others' : ''}).` : `No product publishes ${lower(pairLabel)}.`;
  }
  return pairs.length ? `${pairLabel}: ${andList(pairs.map((p, i) => { const n = p.both.length; return `${n ? (i ? n : plural(n, 'product')) : 'none'} for ${graphName(p.gr)}`; }))}.` : '';
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
    : `${graphName(gr)} ${sharePct(middle(s))} (${sharePct(Math.min(...s))}⁠–⁠${sharePct(Math.max(...s))}, ${s.length} products)`);
  return `${shares[0].gr.rows[1].direction} as a share of ${shares[0].gr.rows[0].direction}, for products whose two values are compared, from one document and in one state: ${andList(shares.map(({ gr, shares: s }) => one(gr, s)))}.${
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

/** Under a print setting's graph: its unit, and the H2C's limit, on the scale or above it. */
export const printAxisUnit = (limit, onScale) => `°C${limit == null ? '' : onScale ? `, H2C limit ${fmtNumber(limit)}` : `; H2C limit ${fmtNumber(limit)} °C, above the scale`}`;

/** A print row's values drawn and not counted (print-spread.js rowSummary): from the guide, special formulations. */
export const printApartWords = (s) => [s.guide ? `${s.guide.n} from the guide (${joinedSpan(s.guide)})` : null, s.variants ? `${plural(s.variants.n, 'special formulation')} (${joinedSpan(s.variants)})` : null].filter(Boolean);

/** The lines under the print temperatures' table (material-facts.js printFacts): what n counts, the medians, the products outside the H2C's limits. */
export function printLines(f) {
  const typical = f.typical.map(({ label, low, high }) => {
    if (low == null && high == null) return null;
    // Two medians of different products can cross where few give both ends; then each is said by name.
    if (low != null && high != null && low > high) return `${lower(label)} lowest ${fmtNumber(low)} °C and highest ${fmtNumber(high)} °C`;
    return `${lower(label)} ${low == null || high == null ? fmtNumber(low ?? high) : windowText(low, high)} °C`;
  }).filter(Boolean);
  const outside = f.outside.map((a) => `${lower(a.label)}: ${andList(a.list.map((o) => `${o.name} (${windowText(o.min, o.max)} °C${OUTSIDE_WORDS[o.verdict]})`))}`);
  const limits = f.limits.map((a) => `${lower(a.label)} ${fmtNumber(a.limit)} °C`);
  return [
    `n counts the products whose own data sheet, or one they share, gives the setting; a value read from ${f.guideName} and a special formulation are drawn, not counted.`,
    typical.length ? `Medians of the lowest and highest settings: ${andList(typical)}.` : null,
    outside.length ? `Outside the H2C's limits (${andList(limits)}): ${outside.join('; ')}.` : `No product's setting is outside the H2C's limits (${andList(limits)}).`,
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
  return f.missing.map((a) => `${lower(a.label)}, ${andList([...a.notDrawn.map(([why, n]) => `${n} ${PRINT_NOT_DRAWN[why]}`),
    oneEnd(a.oneEnd.low, 'lowest'), oneEnd(a.oneEnd.high, 'highest')].filter(Boolean))}`).join('; ');
}

/** Where products' settings were read when their own sheet is silent (material-facts.js printCounts().origins), as a list. */
export const printOriginsWords = (origins) => [origins.guide ? `${plural(origins.guide, 'setting')} from the Bambu Lab Filament Guide` : '',
  origins.twin ? `${plural(origins.twin, 'setting')} from a data sheet shared with another product` : ''].filter(Boolean);

/** One axis of the H2C's limits against a material's products (printCounts().axes): "3 within, 1 above or only partly within". */
export const printCountWords = (n) => `${n.within} within${n.over ? `, ${n.over} above or only partly within` : ''}${n.unknown ? `, ${n.unknown} not published` : ''}`;

/** The hardened-nozzle line of a material's printability, by its gate (materials[].gates.abrasive) and its products' share. */
export function hardenedFactWords(gate, hard, someHard) {
  if (someHard) {
    return `${cap(hardenedWords(hard))}: ${hard.needing.slice(0, 4).map((g) => `${g.manufacturer} ${g.product}`).join(', ')}${hard.need > 4 ? ` and ${hard.need - 4} more` : ''}. The others state no need or say nothing; Products shows which.`;
  }
  return gate === 'requires-hardened' ? 'Required: the filler wears out a brass nozzle.' : gate === 'no-special-concern'
    ? 'Its sources state no special nozzle need.' : 'No source mentions nozzle wear.';
}

/** The drying line of a material's printability, by its gate (materials[].gates.drying) and its products' own drying need. */
export function dryingFactWords(gate, products) {
  const count = (need) => products.filter((g) => g.print?.drying?.need === need).length;
  const share = (need) => (count(need) ? ` (${count(need)} of ${plural(products.length, 'product')}); Products gives each one` : '; Printing gives its wording');
  if (gate === 'required') return `A drying schedule is published${share('required')}.`;
  if (gate === 'optional') return `Its sources advise drying only for a condition, such as wet filament${share('optional')}.`;
  if (gate === 'not-needed') return `Its sources say drying is not needed${share('not-needed')}.`;
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

/** The guide row's enclosure statement (printGuide[].enclosureState) and nozzle need (abrasion.requiresHardened), in words. */
export const guideEnclosureWords = (state) => (state === 'recommended' ? 'required' : state === 'not-needed' ? 'not needed' : 'not stated');
export const guideHardenedWords = (requiresHardened) => (requiresHardened === true ? 'hardened nozzle required' : requiresHardened === false ? 'hardened nozzle not needed' : 'nozzle wear not settled');

/** A product's annealing schedules (grades[].print.anneal), each "120 °C for 16 h". */
export const annealWords = (list) => (list ?? []).map((x) => `${x.tempC != null ? `${fmtNumber(x.tempC)} °C` : 'temperature not stated'}${x.hours != null ? ` for ${fmtNumber(x.hours)} h` : ''}`);

// ------------------------------------------------------------------ what makers say (db.knowHow, D124)

/** What a product's makers' documents leave unsaid (material-facts.js knowHowGapFacts), as one line; empty where nothing is. */
export function knowHowGap(f) {
  const site = f.searchedOn ? ` (website checked ${f.searchedOn})` : '';
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
export const makersSilentWords = (n) => [n['sheet-silent'] ? `${plural(n['sheet-silent'], 'data sheet')} say nothing beyond their numbers` : '',
  n['no-document-read'] ? `${n['no-document-read']} ${n['no-document-read'] === 1 ? 'product has' : 'products have'} no document read yet` : '',
  n['searched-nothing'] ? `${n['searched-nothing']} makers' websites were checked and say nothing more` : ''].filter(Boolean);

/** The parts of a recipe the documents of some products leave unsaid (makersSayFacts().recipe), as phrases. */
export const makersRecipeWords = (recipe) => recipe.map(([part, x]) => `${RECIPE_WORDS[part]} (${plural(x, 'product')})`);

// ------------------------------------------------------------------ environment and the resin

/** A polymer-level verdict in words: "not resistant", "soluble". */
export const verdictWords = (v) => String(v ?? '').replace(/-/g, ' ');

/** A statement's topic is worth saying only where it says more than the heading above it ("Solubility" under Water solubility). */
export const topicRepeatsHeading = (topic, heading) => { const w = String(topic ?? '').toLowerCase().match(/[a-z]{4,}/g) ?? []; return w.length > 0 && w.every((x) => heading.toLowerCase().includes(x.slice(0, 5))); };

/** An environment statement's conditions under its category heading: its topic where it says more, its agent and strength. */
export const envConditionWords = (e, heading) => [topicRepeatsHeading(e.topic, heading) ? null : e.topic, e.agent, e.strength && e.strength !== 'unspecified' ? e.strength : null].filter(Boolean).join(' · ');

// ------------------------------------------------------------------ prices

const sentenceEnd = (t) => t.replace(/[.\s]*$/, '');
/** Why a listing with no regular price per kilogram is not used. */
export const noPriceWords = (p) => `${p.retailer}${p.foreign ? ` (${p.market})` : ''} lists it${Number.isFinite(p.displayedPrice) ? ` at ${fmtNumber(p.displayedPrice)} ${p.currency ?? 'CAD'}` : ''} (seen ${p.accessDate}), `
  + `but no regular price per kilogram was recorded, so it is not used. ${stated(p.basis) ? `${sentenceEnd(p.basis)}.` : ''}${stated(p.notes) ? ` ${p.notes}` : ''}`;
/** Why a held-back listing (a different product) is not used, in its reviewer's words. */
export const quarantineWords = (p) => [String(p.basis ?? '').replace(/^quarantined:\s*/i, ''), p.notes].filter(stated).map(sentenceEnd).join('. ');
/** How a foreign listing became CAD per kg (D113): its own price per kg before VAT, the rate and its date. */
export const foreignPriceWords = (p) => `${p.retailer} (${p.market}) lists ${fmtNumber(p.listPrice)} ${p.currency}${p.vatPercent != null ? ` including ${fmtNumber(p.vatPercent)}% VAT` : ''} for ${fmtNumber(p.netMassKg)} kg: `
  + `${fmtNumber(p.regularPerKgNative)} ${p.currency}/kg before VAT, × ${p.fx.cadPerUnit} CAD per ${p.currency} (Bank of Canada, ${p.fx.date}). `
  + 'Used only where no Canadian shop in the sample sells the product. Shipping, duty and Canadian stock are not included.';
/** Why a listing is not used for the price (material-facts.js priceRows().unused). */
export const UNUSED_WORDS = {
  quarantined: 'A different product; not used.',
  'no-regular': 'No regular price per kilogram was recorded.',
  another: 'Another listing of this product is used instead: Canadian listings come before foreign ones.',
};
