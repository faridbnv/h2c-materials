// The table of the selector (WP-26), ported from the old table (app/js/ui/table.js): its columns, its cells and the words in them. The
// markup of a cell is the facts layer's own (renderValue, explainButton), so a number is worded where it is worded for the material pages
// and the drawer. The order of the rows is the engine's (packages/engine/src/table.ts); the page draws the structure with Vue and puts
// each cell's markup in its td. The exports (CSV) and the download belong to the export (WP-27).
//
// Two column sets, because two different questions are asked of the same list. "Properties" answers
// which material is right; "Printing" answers whether the machine can run it and what to set. The
// second used to be unreachable: nozzle and bed temperatures sat one tab deep in the drawer, and
// the 104 purchase links in the data were rendered nowhere at all.

import { sortRows } from '@atlas/engine/browser';
import type { TableState } from '@atlas/engine/browser';
import { INDICES, indexById, rankingFor } from '@atlas/engine/port/indices.ts';
import { boundOf, GROUP, GROUP_ORDER } from '@atlas/engine/port/constraints.ts';
import { hardenedShare, hardenedWords } from '@atlas/engine/port/products.ts';
import { matchingProducts } from '@atlas/engine/port/search.ts';
import { dayWords } from '@atlas/pages/facts/dates';
import { chip, esc, explainButton, fmtBoundedKind, fmtNumber, fmtRange, renderValue, scrollTable } from '@atlas/pages/facts/format';
import { CHAMBER_GUIDANCE, POLICY_CONTROL, POLICY_LABELS, describeConstraint, failWhy, hiddenWhy, materialName, prop, screenedChip } from '@atlas/pages/facts/labels';
import type { Loose } from '@atlas/pages/loose';
import { tableHeadlines } from '@atlas/pages/facts/registry';

/** Materials a printer owner already has a feel for, offered as the comparison anchor. */
/** A material's products and its reference grades (an "-R1" study or resin grade), apart (the facts layer's rule, material-facts.ts isProduct, which the table must not import whole: it would bring the drawer's facts into the first screen). */
const isProduct = (g: Loose) => !/-R\d+$/.test(g.id);

export const BASELINE_NAMES = ['PLA', 'PETG', 'ABS', 'ASA', 'PC'];

const P = (key: Loose, over: Loose = {}) => ({ key, kind: 'headline', label: prop(key).short, unit: prop(key).unit, title: `${prop(key).technical} — ${prop(key).hint}`, ...over });

/**
 * The shortlist's star, a narrow column straight after the material's name (C39): at the table's end it sat beyond a
 * laptop's right edge (x = 1364 in a 1280 px window, with the rail open), while Compare tells the reader to use it.
 */
const PIN_COLUMN = { key: 'pin', label: 'Shortlist', kind: 'pin', width: '44px' };

export const COLUMN_SETS: Record<string, Loose> = {
  properties: {
    label: 'Properties',
    help: 'Key properties of each material',
    // Headline columns come from the registry (headline_definitions.csv, Table column). Up to five
    // measured columns keep their 11%; more share the same width. A percentage is the width a column takes where the
    // table has room; the stylesheet gives each kind of column a minimum, below which the table scrolls sideways.
    get columns() {
      const heads = tableHeadlines();
      const measured = heads.filter((h: Loose) => h.kind === 'measurement');
      const width = measured.length <= 5 ? '11%' : `${Math.floor((55 / measured.length) * 10) / 10}%`;
      return [
        { key: 'name', label: 'Material', kind: 'name', width: '20%' },
        PIN_COLUMN,
        { key: 'verdict', label: 'Result', kind: 'state', width: '11%' },
        ...heads.map((h: Loose) => (h.kind === 'price'
          ? { key: h.key, label: prop(h.key).short, unit: prop(h.key).unit, kind: 'price', width: '12%' }
          : P(h.key, { width }))),
      ];
    },
  },
  printing: {
    label: 'Printing',
    help: 'Print temperatures: each window spans the material\'s products; each product\'s own is in its Products tab',
    columns: [
      { key: 'name', label: 'Material', kind: 'name', width: '22%' },
      PIN_COLUMN,
      { key: 'verdict', label: 'Result', kind: 'state', width: '11%' },
      { key: 'nozzleC', label: 'Nozzle', unit: '°C', kind: 'print', width: '12%' },
      { key: 'bedC', label: 'Bed', unit: '°C', kind: 'print', width: '12%' },
      { key: 'chamberC', label: 'Chamber', unit: '°C', kind: 'print', width: '12%' },
      { key: 'needs', label: 'Also needs', kind: 'needs', width: '19%' },
      { key: 'priceCADkg', label: 'Price', unit: 'CAD/kg', kind: 'price', width: '12%' },
    ],
  },
};

/**
 * The columns a set shows: all of them once a requirement is set, and every one but Result before (D174). With nothing
 * asked there is no result to show, and a column of "not tested" read as "nobody ran the test".
 */
export const visibleColumns = (columnSet: Loose, tested: Loose) => (COLUMN_SETS[columnSet] ?? COLUMN_SETS.properties).columns.filter((c: Loose) => tested || c.kind !== 'state');

/**
 * The sort after switching column sets: kept when the new set shows the sorted column (name, result, price, or a
 * property both sets carry), else by name. It used to reset to name for anything but name, result or price.
 */
export function sortForColumnSet(sort: Loose, columnSet: Loose) {
  const columns = (COLUMN_SETS[columnSet] ?? COLUMN_SETS.properties).columns;
  return columns.some((c: Loose) => c.key === sort.key && c.kind !== 'pin') ? sort : { key: 'name', dir: 'asc' };
}

/** What the reader is told when a column switch had to drop the sort: which column went, and what the order is now. */
export function sortNoticeText(notice: Loose) {
  if (!notice) return '';
  const from = COLUMN_SETS[notice.from] ?? COLUMN_SETS.properties;
  const to = COLUMN_SETS[notice.to] ?? COLUMN_SETS.properties;
  const label = from.columns.find((c: Loose) => c.key === notice.key)?.label ?? notice.key;
  return `Now sorted by material name: ${label} is not a column in ${to.label}.`;
}

/**
 * The class a column's heading and cells carry, which is what the stylesheet sizes by: a minimum width per kind of
 * column (a number, a result, a name) rather than a share of whatever width the screen has.
 */
const columnClass = (c: Loose) => (c.kind === 'headline' || c.kind === 'price' || c.kind === 'print' ? 'num'
  : c.kind === 'name' ? 'name' : c.kind === 'state' ? 'state' : c.kind === 'needs' ? 'needs' : '');

/** Display form of a print window. A zero lower bound is how the build records "ambient". */
export const printRange = (r: Loose) => (!r ? null
  : r.min === null && r.max === null ? 'open-ended'
  : r.max === null ? `at least ${fmtNumber(r.min)}`
  : r.min === null ? `upper bound ${fmtNumber(r.max)}`
  : r.min === r.max ? fmtNumber(r.max)
  : r.min === 0 ? `up to ${fmtNumber(r.max)}`
  : `${fmtNumber(r.min)}\u2013${fmtNumber(r.max)}`);

/**
 * How many of a material's products meet every requirement (D83), under its verdict: "3 of 27 products" is three
 * passing of its twenty-seven. The products that publish too little to judge are counted, in the popover, as not
 * counting against the material.
 */
export function shareMark(e: Loose) {
  const c = e?.counts;
  if (!c) return '';
  const judged = c.pass + c.fail;
  const plural = (n: Loose, w: Loose) => `${n} ${w}${n === 1 ? '' : 's'}`;
  // Counted against all its products, as the drawer counts them ("183 of 195 products", REVIEW-0 F12): "183 of 183"
  // beside the drawer's "Of its 195 products" read as two different materials.
  const text = judged ? `${c.pass} of ${plural(c.products, 'product')}` : 'none judged';
  const title = judged
    ? `${c.pass} of its ${plural(c.products, 'product')} ${c.pass === 1 ? 'meets' : 'meet'} all the requirements`
      + `${c.fail ? `; ${c.fail} ${c.fail === 1 ? 'fails' : 'fail'} at least one` : ''}.`
      + `${c.untested ? ` The ${c.untested === 1 ? 'one that publishes' : `${c.untested} that publish`} too little to judge ${c.untested === 1 ? 'does' : 'do'} not count against the material.` : ''}`
      // D100: a material fails only when every product fails; one unmeasured product leaves it unresolved.
      + `${!c.pass && c.fail && c.untested ? ' None passes, but not every product fails, so the material is unresolved, not failed.' : ''}`
      + ' Its Products tab lists each and why.'
    : `None of its ${plural(c.products, 'product')} publishes enough to judge against these requirements.`;
  return ` ${explainButton(text, title, { cls: 'share', head: 'Products that pass', action: 'products', id: e.materialId })}`;
}

/** A pass carried only by declared Variants (a foamed or densely filled grade) says so (PM-01, D57). */
export function variantMark(m: Loose, e: Loose) {
  if (e?.verdict !== 'PASS') return '';
  const passing = (e.products ?? []).filter((p: Loose) => p.verdict === 'PASS');
  const variants = passing.filter((p: Loose) => p.variant);
  if (!passing.length || variants.length < passing.length) return '';
  return `<span class="row-sub via-variant" title="Only declared variants of this material pass; its standard products do not.">via ${variants.length === 1 ? 'a declared variant' : 'declared variants'} (${[...new Set(variants.map((p: Loose) => p.variant))].join(', ')})</span>`;
}

/**
 * A typical value measured after annealing or conditioning, under a header that judges as printed and dry (PM-06): the
 * drawer's square on the median's line, filled for annealed, open for conditioned, with the legend's entry and its title
 * saying what it means. A third line, "annealed median", had read as contradicting "Values judged: as printed, dry", and
 * had no legend entry (REVIEW-0 F8, 2026-10-18). The mark has no text, so a cell's text stays the value and its range.
 */
export const STATE_MARK_NOTE: Record<string, string> = {
  annealed: 'Annealed median: the median comes from a bar annealed after printing; requirements still judge each product as printed.',
  conditioned: 'Conditioned median: the median comes from a bar conditioned in moist air; requirements still judge each product dry unless Part condition says otherwise.',
};
export function typicalStateMark(h: Loose, measurementState: Loose) {
  const st = measurementState(h?.typical?.measurementId);
  if (!st) return '';
  const kinds = [st.annealed ? 'annealed' : null, st.conditioned ? 'conditioned' : null].filter(Boolean);
  return kinds.map((k: Loose) => `<span class="state-mark state-${k}" role="img" aria-label="${k} median" title="${esc(STATE_MARK_NOTE[k])}"></span>`).join('');
}
/** The mark on the median's line: before the range, which is a line of its own in a cell. */
const withStateMark = (value: Loose, mark: Loose) => {
  if (!mark) return value;
  const at = value.indexOf('<span class="spread"');
  return at < 0 ? value + mark : value.slice(0, at) + mark + value.slice(at);
};

/**
 * What would settle an unresolved row (D155, C05): its group, and the product that puts it there with that product's own
 * numbers, as the engine words it ("One check away on 1 of 17 products: ..."). A hidden row says why in one short phrase
 * ("does not apply: HDT is a rigid-bar test"), and its chip the rest (stage 3d).
 */
export function unknownMark(e: Loose) {
  if (e?.verdict !== 'UNKNOWN') return '';
  if (e.group === GROUP.HIDDEN || e.screened) { const why = hiddenWhy(e); return why ? `<span class="row-sub hidden-why" data-testid="hidden-why">${esc(why)}</span>` : ''; }
  if (!e.groupReason) return '';
  return `<span class="row-sub group-reason" data-testid="group-reason">${esc(e.groupReason)}</span>`;
}

/**
 * A pass of a nylon judged dry says so on its row (stage 3d; the review's R05: PA6-CF met the outdoor bracket on dry
 * stiffness). Read from the data: the material's polymer takes up much water (polymers.csv Water uptake high), the
 * scenario judges the part dry, and a required number is one humid air lowers (a stiffness, a strength, a heat value).
 */
const HUMID_LOWERS: [RegExp, string][] = [[/Modulus/, 'stiffness'], [/Strength/, 'strength'], [/^hdt/, 'heat deflection'], [/^glassTransition$/, 'glass transition']];
export function humidMark(m: Loose, e: Loose, { facts, db, scenario }: Loose) {
  if (e?.verdict !== 'PASS' || scenario?.moisture === 'conditioned') return '';
  const polymerId = m.estimateIdentity;
  if (!polymerId || !facts.waterUptakeHigh.includes(polymerId)) return '';
  const moist = new Set((db.registry?.headlines ?? []).filter((h: Loose) => h.changesWithMoisture).map((h: Loose) => h.key));
  const asked = (scenario?.constraints ?? []).filter((c: Loose) => c.kind === 'numeric' && c.mandatory !== false && moist.has(c.property)).map((c: Loose) => c.property);
  // Stiffness first, the quantity humid air changes most, then strength and heat.
  const words = HUMID_LOWERS.filter(([re]) => asked.some((k: Loose) => re.test(k))).map(([, w]) => w);
  if (!words.length) return '';
  const said = words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
  return `<span class="row-sub humid-dry" title="${esc(`${polymerId} takes up much water from humid air, which lowers its ${said}: a conditioned nylon's modulus can be half its dry one. Its products pass here on values measured dry or with the moisture unstated. Set Part condition to conditioned to judge it in humid air.`)}">judged dry; humid air lowers its ${esc(said)}</span>`;
}

/** What a failing row failed first, in a short phrase under its result: the drawer gives every requirement (stage 3d). */
export function failMark(e: Loose) {
  if (e?.verdict !== 'FAIL') return '';
  const why = failWhy(e);
  return why ? `<span class="row-sub fail-why" data-testid="fail-why">${esc(why)}</span>` : '';
}

/**
 * The passing products' own values for one requirement (the PM trial, PM-01): a material passes when one product does,
 * so its row says what the passing products measure, not the median of every product.
 */
export function passingValues(e: Loose, key: Loose) {
  const obs = (e?.products ?? []).filter((p: Loose) => p.verdict === 'PASS')
    .flatMap((p: Loose) => (p.results ?? []).filter((r: Loose) => r.constraint?.kind === 'numeric' && r.constraint.property === key && Number.isFinite(r.observed)).map((r: Loose) => ({ value: r.observed, bound: boundOf(r.interval) })));
  if (!obs.length) return null;
  const [min, max] = [Math.min(...obs.map((o: Loose) => o.value)), Math.max(...obs.map((o: Loose) => o.value))];
  // A passing product's published bound ("> 300 %") is said to be one, at whichever end of the passing values it falls.
  const kindAt = (v: Loose) => { const b = obs.find((o: Loose) => o.value === v && o.bound)?.bound; return b ? (b.sign === '>' || b.sign === '≥' ? 'lower' : 'upper') : null; };
  return { min, max, n: obs.length, minBound: kindAt(min), maxBound: kindAt(max) };
}


// ------------------------------------------------------------------ the view of the table

/** One cell: the class of its td and the markup inside it (the page's own words, escaped here). */
export interface CellView { readonly cls: string; readonly html: string }
/** One row of a table. */
export interface RowView { readonly id: string; readonly selected: boolean; readonly baseline: boolean; readonly cells: readonly CellView[] }
/** A column heading. `pin` is the shortlist's star, which cannot be sorted. */
export interface HeadView {
  readonly key: string; readonly pin: boolean; readonly cls: string; readonly title: string | null;
  readonly label: string; readonly unit: string | null; readonly arrow: string; readonly ariaSort: string | null; readonly sub: boolean;
}
/** A table under one group's heading (D155), or the one table of a list that is not grouped (`group` null). */
export interface GroupView {
  readonly group: string | null;
  /** The heading and note above the table; `folded` puts them and the table inside a details element, closed unless the reader opened it. */
  readonly heading: string; readonly note: string; readonly folded: boolean;
  readonly reference: RowView | null;
  readonly rows: readonly RowView[];
}
export interface TableView {
  readonly columns: readonly Loose[];
  readonly head: readonly HeadView[];
  readonly colsets: readonly { readonly key: string; readonly label: string; readonly help: string; readonly pressed: boolean }[];
  readonly colsetHelp: string;
  readonly rankOptions: readonly { readonly id: string; readonly label: string }[];
  readonly baselineOptions: readonly { readonly id: string; readonly name: string }[];
  readonly legend: string;
  readonly sortNote: string;
  /** The line under the bar when the reader ordered by a column while a goal ranks the table. */
  readonly rankNote: string;
  readonly family: string;
  readonly empty: string;
  readonly groups: readonly GroupView[];
  readonly excluded: string;
}

/** The column set the scenario shows, and whether a requirement is asked (so whether the Result column is there). */
export function columnsOf(state: Loose): Loose[] {
  const set = COLUMN_SETS[state.columnSet] ? state.columnSet : 'properties';
  return visibleColumns(set, state.scenario.constraints.length > 0);
}

/** The state the engine's order reads (packages/engine/src/table.ts). */
export function sortStateOf(state: Loose, ranks: Loose): TableState {
  return { scenario: state.scenario, sort: state.sort, columns: columnsOf(state).map((c: Loose) => ({ key: c.key, kind: c.kind })), ranks, showEstimates: !!state.ctx?.showEstimates, sortOverride: state.sortOverride };
}

/** Each row's rank under the scenario's goal, or null when it ranks by nothing: the one ranking every lens reads (D102). */
export function rankOf(rows: Loose, state: Loose): Loose {
  const index = state.scenario?.rankBy ? indexById(state.scenario.rankBy) : null;
  return rankingFor(rows, state.ctx, index)?.byMaterial ?? null;
}

function headOf(columns: readonly Loose[], sort: Loose): HeadView[] {
  return columns.map((c) => {
    // The shortlist column has nothing meaningful to sort by, so it does not pretend to.
    // Its heading is the star itself, its name for a screen reader and a hover: the column holds only the star.
    if (c.kind === 'pin') return { key: c.key, pin: true, cls: 'pin-col', title: c.label, label: c.label, unit: null, arrow: '', ariaSort: null, sub: false };
    const active = sort.key === c.key;
    return {
      key: c.key, pin: false, cls: `${columnClass(c)}${c.kind === 'headline' || c.kind === 'price' ? ' has-sub' : ''}`, title: c.title ?? null, label: c.label, unit: c.unit ?? null,
      arrow: active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '', ariaSort: active ? `${sort.dir}ending` : null,
      // A column of products' values says once, under its name, what its cells give: the median over the range of the
      // products. The drawer and the material pages give the middle half under the same median, and the table's bare
      // "0.95–4.24 · 55" read as that (OPEN-PROBLEMS §37.20); the word in every cell widened the table past a 1440 px screen.
      sub: c.kind === 'headline' || c.kind === 'price',
    };
  });
}

/** The marks line above the table, as markup (one explanation button each). */
function legendOf(state: Loose, columns: readonly Loose[], showEstimates: boolean): string {
  // One line of marks above the table, always the same entries in the same order, each a button that opens its
  // definition. It used to be a paragraph whose entries came and went with the rows, told the reader to hover, and had no
  // entry for the estimated windows the Printing columns show. The estimate entry shows whenever estimates do, in both
  // column sets.
  const likely = Math.round((state.db.meta.estimateModel?.levels?.likely ?? 0.8) * 100);
  const common = [
    explainButton('<span class="dash">—</span> not published',
      'No source on file publishes it. A gap, not a zero or a low value. Select a dash for which kind of gap it is.',
      { cls: 'lg', head: 'Not published' }),
    explainButton('<b>2.3</b> <span class="spread">1.0–3.0 · 27</span> median and range',
      'A material is the spread of its products: the median, then the range from the lowest product to the highest and how many products report the value on a comparable basis (a printed bar, said or implied by its document, its orientation stated or read flat; dry or unstated). Different products, not one product\'s scatter. The drawer and the material page give the middle half of the products instead of the range.',
      { cls: 'lg', head: 'Median and range' }),
    explainButton('<b>1.2</b><span class="evidence-dot" aria-hidden="true"></span> one measurement',
      'A value from one measurement: one product publishes it, or it is a product\'s own value. Select it for its test conditions and source page.',
      { cls: 'lg', head: 'One measurement' }),
    explainButton('<span class="related-mark">*</span> published, not comparable',
      'Published for this material, but no product reports it on a comparable basis: its test bar is not described as printed (a heat deflection counts all the same where the plastic cannot crystallise and its document points to no moulded bar), or it is another load, state, bar or endpoint. A requirement reads it only through a conversion row of the evidence ledger, in that row\'s one safe direction, and its answer then names the row. Select a starred value for the reason.',
      { cls: 'lg', head: 'Published, not comparable' }),
    showEstimates ? explainButton('<span class="lg-est">~a–b<span class="est-mark">†</span></span> estimate, <i>italic</i> = rough',
      `Estimate, not a measurement: the likely (${likely}%) range from related values and similar materials. It never makes a material pass, and it hides one only where the material has no product on record; any other material is judged on its products' own values. Italic means an order of magnitude only. An estimated print window is a starting point and changes no result.`,
      { cls: 'lg', head: 'Estimate, not a measurement' }) : '',
    explainButton('<span class="na">n/a</span> not applicable',
      'The property does not apply to this material, such as HDT of an elastomer. Not a gap. A requirement on it hides the material when the materials that could not be checked are included, whatever the estimates switch says; the HIDDEN chip brings it back.',
      { cls: 'lg', head: 'Not applicable' }),
  ].filter(Boolean);
  // The currencies a converted price on screen came from, and whether an annealed or conditioned median is on screen.
  const foreignCurrencies = [...new Set(state.db.materials.flatMap((m: Loose) => m.headline?.priceCADkg?.converted?.currencies ?? []))].sort();
  const anyState = { annealed: false, conditioned: false };
  for (const { material: m } of state.rows ?? []) {
    for (const k of columns.filter((c) => c.kind === 'headline').map((c) => c.key)) {
      const st = state.facts.typicalStates[m.headline?.[k]?.typical?.measurementId];
      if (st) { anyState.annealed ||= !!st.annealed; anyState.conditioned ||= !!st.conditioned; }
    }
  }
  // The marks only a few cells carry, behind one fold, so the legend stays one line (REVIEW-0 F10, 2026-10-18). An
  // estimate is in many cells wherever estimates show, so it stays on the line.
  const rare = [
    explainButton('<span class="load-mark">≈</span> close to the limit',
      'A published mean ± scatter with the threshold inside the scatter. Judged on the mean.',
      { cls: 'lg', head: 'Close to the limit' }),
    // Only where a price on screen was converted, like the estimate entry only where estimates show (D113).
    (state.db.meta.priceSample?.foreignSellers ?? 0) > 0 ? explainButton(`<span class="fx-mark">${esc(foreignCurrencies.join(', ') || 'USD')}</span> converted to CAD`,
      'A price from a foreign listing, for a product no sampled Canadian shop sells: converted to CAD at the Bank of Canada rate, before VAT, the currency it came from beside it. Shipping and duty are not included.',
      { cls: 'lg', head: 'Converted price' }) : '',
    // An annealed median, where one is on screen: the drawer's square (REVIEW-0 F8).
    anyState.annealed ? explainButton('<span class="state-mark state-annealed" aria-hidden="true"></span> annealed median', (STATE_MARK_NOTE['annealed'] ?? '').replace(/^Annealed median: t/, 'T'),
      { cls: 'lg', head: 'Annealed median' }) : '',
    anyState.conditioned ? explainButton('<span class="state-mark state-conditioned" aria-hidden="true"></span> conditioned median', (STATE_MARK_NOTE['conditioned'] ?? '').replace(/^Conditioned median: t/, 'T'),
      { cls: 'lg', head: 'Conditioned median' }) : '',
  ].filter(Boolean);
  // On a phone the legend's line is three lines, so it shows the first two marks, the dash and the median over its range,
  // and folds the rest with the rare ones (OPEN-PROBLEMS §19: the first candidate in the first screen). The folded marks are
  // drawn twice, on the line for a wider screen and in the fold for a phone, and only one of the two is ever displayed.
  const moreWords = (n: number) => (n === 1 ? 'One more mark' : `${n} more marks`);
  const wide = common.slice(2), folded = [...wide, ...rare];
  return common.slice(0, 2).join('') + `<span class="lg-wide">${wide.join('')}</span>`
    + `<details class="legend-more${rare.length ? '' : ' lg-narrow-only'}"><summary><span class="chevron" aria-hidden="true"></span>`
    + `${rare.length ? `<span class="lg-wide">${moreWords(rare.length)}</span>` : ''}<span class="lg-narrow">${moreWords(folded.length)}</span></summary>`
    + `<div class="legend-more-body"><span class="lg-narrow">${wide.join('')}</span>${rare.join('')}</div></details>`;
}

/** The hits the filters removed, listed apart with the criterion that removed them, as markup. */
function excludedOf(state: Loose): string {
  const { scenario } = state;
  // Hits the filters removed. A search that finds nothing because the requirements already
  // excluded the match reads as "this material is not in the database", which is false.
  const excluded: Loose[] = state.searchExcluded ?? [];
  if (!excluded.length) return '';
  const hiddenOnly = excluded.filter(({ evaluation: e }: Loose) => !e.failed.length && !e.heldBy.length && !e.screened).length;
  // Three cases, each with its reason. When some were ruled out and the rest merely hidden, the heading used to end
  // at "not in the results" and give no reason at all.
  const ruledOut = excluded.length - hiddenOnly;
  const excludedReason = hiddenOnly === excluded.length
    ? ', because the result filters at the bottom hide them'
    : !hiddenOnly ? `: ${excluded.length === 1 ? 'it does' : 'they do'} not meet your requirements`
    : `: ${ruledOut} ${ruledOut === 1 ? 'is' : 'are'} ruled out by your requirements, and the result filters at the bottom hide the other ${hiddenOnly}`;
  return `
    <div class="excluded-group" data-testid="excluded">
      <h3>${excluded.length} more match${excluded.length === 1 ? 'es' : ''} "${esc(state.search)}"
        but ${excluded.length === 1 ? 'is' : 'are'} not in the results${excludedReason}</h3>
      ${scrollTable(`<table class="grid">
        <colgroup><col style="width:26%"><col style="width:44px"><col style="width:14%"><col></colgroup>
        <thead><tr><th class="name">Material</th><th class="pin-col" title="Shortlist" aria-label="Shortlist"><span aria-hidden="true">☆</span></th><th class="state">Result</th><th class="why-col">What ruled it out</th></tr></thead>
        <tbody>${excluded.map(({ material: m, evaluation: e }: Loose) => {
          const { primary, aka } = materialName(m.name);
          const why = e.failed.length
            ? e.failed.map((r: Loose) => `${esc(describeConstraint(r.constraint))} — ${esc(r.reason)}`).join('<br>')
            : e.screened
              ? e.unresolved.filter((r: Loose) => r.screened).map((r: Loose) => `${esc(describeConstraint(r.constraint))} — ${esc(r.reason)}`).join('<br>')
                + '<br>Not a failure. The HIDDEN chip at the bottom shows these.'
            : e.heldBy.length
              ? `Could not be checked against ${esc(e.unresolved.map((r: Loose) => describeConstraint(r.constraint)).join(', '))}.`
                + ` Not a failure: it is left out because ${POLICY_CONTROL.toLowerCase()} are set to "${POLICY_LABELS['strict']}".`
              : 'Hidden by the result filters at the bottom of the screen.';
          const on = scenario.shortlist.includes(m.id);
          return `<tr data-material="${esc(m.id)}" tabindex="0" data-testid="excluded-row">
            <td class="name">${esc(primary)}${aka ? `<span class="row-sub">also called ${esc(aka)}</span>` : ''}</td>
            <td class="pin-col"><button type="button" class="btn btn-sm shortlist-btn" data-pin="${esc(m.id)}" aria-label="Shortlist ${esc(m.name)}"
              title="${on ? 'On the shortlist. Press to remove it.' : 'Add to the shortlist'}"
              aria-pressed="${on}">${on ? '★' : '☆'}</button></td>
            <td class="state">${chip(e.verdict)}</td>
            <td class="why-cell" data-testid="excluded-why">${why}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`)}
    </div>`;
}

/** A search for a family's name says what the family is and names its members, which the table then lists. */
function familyOf(state: Loose): string {
  const families: Loose[] = state.searchFamilies ?? [];
  // The family's own name opens its entry, which says what it is and why it has no tabs of its own.
  return families.length ? `<div class="family-note">${families.map((f) => `<p><button class="link-btn family-name" data-open-member="${esc(f.id)}" title="Opens what ${esc(f.name)} is in this database"><b>${esc(f.name)}</b></button>
      ${f.familyEntry.kind === 'alias' ? 'is another name for' : 'names a group of materials, not one material. Its members are'}
      ${f.familyEntry.members.map((x: Loose) => `<button class="link-btn" data-open-member="${esc(x.id)}">${esc(x.name)}</button>`).join(', ')}.
      <span class="fine">${esc(f.familyEntry.why)}</span></p>`).join('')}</div>` : '';
}

export function tableView(state: Loose): TableView {
  const { sort, scenario } = state;
  const setKey = COLUMN_SETS[state.columnSet] ? state.columnSet : 'properties';
  // Nothing has been asked, so nothing has passed. A green PASS on every row of a blank screen
  // asserted a test that never ran, including on the materials outside the printer's scope.
  const tested = scenario.constraints.length > 0;
  // So before any requirement the table has no Result column (D174): a result is the answer to a question, and none has
  // been asked. Every row had read "not tested", which an engineer reads as "nobody ran the test" (OPEN-PROBLEMS §37.20).
  // The column arrives with the first requirement, beside the name, where it always stood.
  const COLUMNS = visibleColumns(setKey, tested);
  const showEstimates = !!state.ctx?.showEstimates;

  const ranks = rankOf(state.rows, state);
  const sorted: Loose[] = sortRows(state.rows, sortStateOf(state, ranks));
  const index = ranks ? indexById(scenario.rankBy) : null;

  // A material with no product on record is the one whose own estimate is read for a requirement (D148).
  const productless = (m: Loose) => !(state.ctx?.productsByMaterial?.get(m.id)?.length);
  // How many products a material has, as the drawer's head counts them (reference specimens are not for sale): a median's
  // explanation counts its parts against it (§37.20).
  const productCount = (m: Loose) => (state.ctx?.productsByMaterial?.get(m.id) ?? []).filter(isProduct).length;
  // A product as a cell's popover names it: its maker and product.
  const productLabel = (id: Loose) => { const g = state.gradeById.get(id); return g ? `${g.manufacturer} ${g.product}` : id; };
  const measurementState = (id: Loose) => (id ? (state.facts.typicalStates[id] ?? { annealed: false, conditioned: false }) : null);

  const BASELINE_CHIP = explainButton('baseline', 'Reference only. Not a candidate and not counted.', { cls: 'chip chip-neutral', head: 'Reference row' });
  const cells = (m: Loose, e: Loose, { ghost = false } = {}): CellView[] => {
    // This row's results on one property: the thresholds its number must not be rounded across, and whether it is close.
    const on = (key: Loose) => (e?.results ?? []).filter((r: Loose) => r.constraint?.kind === 'numeric' && r.constraint.property === key);
    return COLUMNS.map((c: Loose): CellView => {
      const cls = c.kind === 'name' ? 'name' : c.kind === 'state' ? 'state' : c.kind === 'pin' ? 'pin-col' : c.kind === 'needs' ? 'needs' : c.kind === 'headline' || c.kind === 'price' || c.kind === 'print' ? 'num' : '';
      const cell = (html: string): CellView => ({ cls, html });
      if (c.kind === 'name') {
        // Family sits under the name rather than in its own column: it repeated the name outright
        // on 34 of 96 rows and cost 13% of the width to do it.
        //
        // "TPC / TPEE" and "PEI / ULTEM" are one material under two names, and reading as two was
        // the whole confusion. The second name moves to the subtitle line.
        const { primary, aka } = materialName(m.name);
        const asm = m.assumptionDependent ? ` ${explainButton('assumed', 'Depends on a scenario assumption: a value you supplied stands in for a missing one, and it is not observed data.',
          { cls: 'chip chip-UNKNOWN', head: 'Scenario assumption' })}` : '';
        const sub = [aka ? `also called ${aka}` : null,
          m.family && !m.name.startsWith(m.family) ? m.family : null].filter(Boolean).join(' · ');
        // Ranked by a goal: its place, and the product that ranks best, which is the one to look at first.
        const r = ranks && !ghost ? ranks.get(m.id) : null;
        const best = r?.best?.gradeId ? state.gradeById.get(r.best.gradeId) : null;
        // A candidate the goal cannot rank says so (D102), rather than sorting silently after the ranked.
        const unranked = ranks && !ghost && !r && e?.verdict === 'PASS'
          ? `<span class="row-sub rank-line unranked">not ranked: no passing product publishes what ${esc(index?.formula)} needs</span>` : '';
        const rank = r ? `<span class="row-sub rank-line" title="${esc(`${index?.designCase}: ${index?.formula}, the median over ${r.products} passing product${r.products === 1 ? '' : 's'}${best ? `; best ${best.manufacturer} ${best.product}` : ''}`)}">#${r.place}${best ? ` · best: ${esc(`${best.manufacturer} ${best.product}`)}` : ''}</span>` : '';
        // A search that found the material by a product says which, with that product's own verdict: the material's may
        // rest on another maker's (U03).
        const matched = state.search && !ghost ? matchingProducts(m, state.search, state.ctx?.productsByMaterial?.get(m.id) ?? []) : [];
        const verdictOf = new Map((e?.products ?? []).map((p: Loose) => [p.gradeId, p.verdict]));
        const found = matched.length
          ? `<span class="row-sub matched">matches ${matched.slice(0, 3).map((g: Loose) => `${esc(`${g.manufacturer} ${g.product}`)}${tested && verdictOf.has(g.id) ? ` ${chip(verdictOf.get(g.id))}` : ''}`).join(', ')}${matched.length > 3 ? `, and ${matched.length - 3} more` : ''}${tested && e?.verdict === 'PASS' && !matched.some((g: Loose) => verdictOf.get(g.id) === 'PASS') ? '; the material passes on another product' : ''}</span>` : '';
        // The baseline says what it is in its Result cell; before a requirement, with no such column, beside its name.
        const ref = ghost && !tested ? ` ${BASELINE_CHIP}` : '';
        return cell(`${esc(primary)}${ref}${asm}${sub ? `<span class="row-sub">${esc(sub)}</span>` : ''}${rank}${unranked}${found}`);
      }
      if (c.kind === 'text') return cell(esc(m[c.key] ?? ''));
      if (c.kind === 'state') {
        // The screened chip names the requirement and what held the row out, an estimate or the base polymer's published
        // behaviour (D64), and opens it: the estimate on the Overview, the polymer's rows on the Environment tab.
        const scr = e?.screened ? screenedChip(e) : null;
        // Drawn only once a requirement is set (visibleColumns): before that the table has no Result column.
        return ghost
          ? cell(BASELINE_CHIP)
          : cell(`${chip(e.verdict)}${scr ? ` ${explainButton('hidden', scr.text, { cls: `chip chip-screened${scr.inferred ? '' : ' by-definition'}`, head: scr.head, action: scr.action, id: m.id }).replace('<button ', '<button data-testid="screened-chip" ')}` : ''}${shareMark(e)}${variantMark(m, e)}${humidMark(m, e, state)}${unknownMark(e)}${failMark(e)}`);
      }
      if (c.kind === 'pin') {
        if (ghost) return cell('');
        // A toggle keeps one name, and says whether it is on by aria-pressed and a filled, highlighted star.
        const pinned = scenario.shortlist.includes(m.id);
        return cell(`<button type="button" class="btn btn-sm shortlist-btn" data-pin="${esc(m.id)}" aria-pressed="${pinned}"
          title="${pinned ? 'On the shortlist. Press to remove it.' : 'Add to the shortlist'}" aria-label="Shortlist ${esc(m.name)}">${pinned ? '★' : '☆'}</button>`);
      }
      if (c.kind === 'print') {
        const r = m.print?.[c.key];
        // The chamber is often answered in words: "not required", "recommended", or a data sheet's
        // "-". Those are evidence and are shown as words, never as a number. An estimated band, where
        // one exists, is marked the way every other estimate is and only while estimates are on.
        if (!r && c.key === 'chamberC' && (m.print?.chamberGuidance || m.print?.chamberEstimate)) {
          const g = m.print.chamberGuidance && Object.entries<Loose>(CHAMBER_GUIDANCE).find(([state]) => state === m.print.chamberGuidance.state)?.[1];
          const est = showEstimates ? m.print.chamberEstimate : null;
          const word = g ? explainButton(esc(g.word), g.title, { cls: 'missing', head: 'Chamber, in words' }) : '';
          const band = est ? explainButton(`~${fmtRange(est.lo, est.hi)}<span class="est-mark">†</span>`,
            `Estimated, not published: ${est.basis}. Not a print setting; it changes no result.`,
            { cls: 'est', head: 'Estimated chamber band', action: 'estimate', id: m.id }) : '';
          if (word || band) return cell(`${word}${word && band ? '<br>' : ''}${band}`);
        }
        const windowEst = !r && showEstimates && (c.key === 'nozzleC' ? m.print?.nozzleEstimate : c.key === 'bedC' ? m.print?.bedEstimate : null);
        if (windowEst) {
          return cell(explainButton(`~${fmtRange(windowEst.lo, windowEst.hi)}<span class="est-mark">†</span>`,
            `Estimated, not published: ${windowEst.basis}. A starting point to verify; it changes no result.`,
            { cls: 'est', head: `Estimated ${c.label.toLowerCase()} window`, action: 'estimate', id: m.id }));
        }
        if (!r) {
          return cell(explainButton('—', `No ${c.label.toLowerCase()} temperature published for this material`,
            { cls: 'missing dash', head: 'Not published', label: 'Not published' }));
        }
        // A range across every recorded profile, not one setting to dial in. The drawer's Printing
        // tab has each profile on its own.
        const t = r.profiles > 1 ? `Range across ${r.profiles} print profiles, not one setting. The Printing tab has each.` : 'From one print profile. The Printing tab has it.';
        return cell(explainButton(printRange(r), t, { cls: 'print-window', head: `${c.label} temperature`, action: 'printing', id: m.id }));
      }
      if (c.kind === 'needs') {
        const bits: string[] = [];
        if (m.gates.abrasive === 'requires-hardened') {
          const share = hardenedShare(state.ctx?.productsByMaterial?.get(m.id));
          const some = share.total && share.need < share.total;
          bits.push(explainButton(some ? `hardened nozzle: ${share.need} of ${share.total}` : 'hardened nozzle',
            some ? `${hardenedWords(share)}: ${share.needing.slice(0, 4).map((g: Loose) => `${g.manufacturer} ${g.product}`).join(', ')}${share.need > 4 ? ` and ${share.need - 4} more` : ''}. The others state no need or say nothing.` : 'Abrasive filler: a brass nozzle wears out.',
            { cls: 'need', head: 'Hardened nozzle', action: 'printing', id: m.id }));
        }
        if (m.gates.drying === 'required') {
          bits.push(explainButton('drying', 'A source gives a drying schedule. The Printing tab has its wording, and whether it is required or recommended.',
            { cls: 'need', head: 'Drying', action: 'printing', id: m.id }));
        } else if (m.gates.drying === 'optional') {
          bits.push(explainButton('drying optional', 'A source advises drying only for a condition, such as wet filament. The Printing tab has its wording.',
            { cls: 'need', head: 'Drying', action: 'printing', id: m.id }));
        }
        if (!bits.length) {
          return cell(explainButton('none stated', 'No source states a hardened-nozzle or drying need. That is not the same as needing nothing.',
            { cls: 'missing', head: 'None stated' }));
        }
        return cell(bits.join(' '));
      }
      if (c.kind === 'price') {
        const h = m.headline.priceCADkg;
        const inner = renderValue(h, { compact: true, estimates: showEstimates, results: on('priceCADkg'), materialId: m.id, productless: productless(m), products: productCount(m) });
        if (!m.buy) return cell(inner);
        const t = `${m.buy.retailer}: ${m.buy.variant ?? ''} (${m.buy.stock}, seen ${dayWords(m.buy.accessDate)})`;
        const notStocked = 'No sampled Canadian listing was in stock when sampled. Prices and stock are snapshots, not live.';
        const link = (content: string, extra = '') => `<a class="buy${extra}" href="${esc(m.buy.url)}" target="_blank" rel="noopener"
          title="${esc(t)}">${content}<span class="buy-mark" aria-label="opens the retailer page">↗</span></a>`;
        // A listing with no usable price says so in words, on one line: "listed, no price" and "out of stock" wrapped to
        // three lines in a desktop column and doubled the row. Who lists it, when, and whether it was in stock are one
        // press away on the words; the arrow beside them opens the listing. A dash with a link arrow had read as nothing
        // to buy.
        if (!h?.known) {
          const why = `${m.buy.retailer} lists it (seen ${dayWords(m.buy.accessDate)}), but the listing has no usable price.`
            + `${m.buy.anyInStock ? '' : ` ${notStocked}`} The arrow opens the listing.`;
          return cell(`<span class="unpriced">${explainButton('no price', why, { cls: 'no-price', head: 'Listed, no price' })}${link('', ' buy-arrow')}</span>`);
        }
        // A link cannot hold a button, so a price carrying a mark of its own keeps it outside the link. Stock is a small
        // second line, and only here, under a price it qualifies. The arrow sits on the median's line, before the range: after
        // the range it took a third line of its own in the narrow price column, and the row's height with it (the cold page's
        // three rows, §37.20).
        const nested = inner.includes('<button');
        const oos = m.buy.anyInStock ? '' : explainButton('out of stock', notStocked, { cls: 'oos', head: 'Out of stock' });
        if (!nested) return cell(`${link(inner)}${oos}`);
        const at = inner.indexOf('<span class="spread"');
        const arrow = link('', ' buy-arrow');
        return cell(`${at < 0 ? inner + arrow : inner.slice(0, at) + arrow + inner.slice(at)}${oos}`);
      }
      // An unresolved row's estimate on a required number is its deciding product's, the one its reason names (D155, C05):
      // the cell and the reason are one computation. A material with no product reads its own, as before (D148).
      const own = tested && e?.verdict === 'UNKNOWN' && showEstimates && !m.headline[c.key]?.known && !m.headline[c.key]?.notApplicable && e.gradeId
        ? on(c.key).find((r: Loose) => r.estimated && r.estimate) : null;
      const shown = own ? { known: false, missing: m.headline[c.key]?.missing ?? 'not-published', estimate: own.estimate } : m.headline[c.key];
      const all = withStateMark(renderValue(shown, { compact: true, estimates: showEstimates, results: on(c.key), materialId: m.id, productless: productless(m), product: own ? productLabel(e.gradeId) : null, products: productCount(m) }), typicalStateMark(m.headline[c.key], measurementState));
      // A material that passes a requirement on some of its products shows those products' values first, and every
      // product's typical and range under it, labelled (PM-01).
      const pass = tested && e?.verdict === 'PASS' && on(c.key).length ? passingValues(e, c.key) : null;
      if (pass) {
        const words = pass.min === pass.max ? fmtBoundedKind(fmtNumber(pass.min), pass.minBound, true)
          : `${fmtBoundedKind(fmtNumber(pass.min), pass.minBound)}–${fmtBoundedKind(fmtNumber(pass.max), pass.maxBound)}`;
        return cell(`<span class="passing-values" title="${esc(`The value of each product that passes, for this requirement (${pass.n} product${pass.n === 1 ? '' : 's'}). Under it: every product of the material.${pass.minBound || pass.maxBound ? ' A value marked as a published bound (a sign before it, or a + after it) is a limit, not the value.' : ''}`)}">passing: ${words}</span><span class="row-sub all-products">all products: ${all}</span>`);
      }
      return cell(all);
    });
  };

  const rowOf = (m: Loose, e: Loose, ghost = false): RowView => ({ id: m.id, selected: state.selectedMaterialId === m.id, baseline: ghost, cells: cells(m, ghost ? null : e, { ghost }) });
  const bodyOf = (list: Loose[]): RowView[] => list.map(({ material: m, evaluation: e }) => rowOf(m, e));

  // The familiar anchor. 4.43 GPa is not a number anyone has a feel for; "about half again as stiff
  // as PLA" is. The baseline sits at the top of its own column values, in every column, and is
  // never a candidate: it has no verdict, no star, and does not count towards anything.
  const baseline = state.baseline ? state.db.materials.find((m: Loose) => m.id === state.baseline) : null;
  const reference = baseline ? rowOf(baseline, null, true) : null;

  // Baseline picker: the anchor is offered, never imposed.
  const anchors = BASELINE_NAMES.map((n) => state.db.materials.find((m: Loose) => m.name === n)).filter(Boolean);

  // Under Include the list is sorted by what would settle each material (D155): the groups present the verdicts and
  // change none of them, nor any count or export. "Unlikely to meet" starts folded and is counted; hidden and failed
  // rows appear only behind their chips.
  const grouped = tested && scenario.unknownPolicy === 'exploration';
  const inGroup = (g: Loose) => sorted.filter((r) => (r.evaluation.group ?? GROUP.MEETS) === g);
  const [meets = [], oneCheck = [], notEnough = [], unlikely = [], hidden = [], failed = []] = GROUP_ORDER.map(inGroup);
  const likelyCount = notEnough.filter((r) => r.evaluation.likely).length;
  // With estimates off nothing is ordered or tagged by an estimate, so the note does not say it is (stage 3d).
  const estimatesOn = showEstimates;
  const groups: GroupView[] = [];
  if (sorted.length) {
    if (!grouped) groups.push({ group: null, heading: '', note: '', folded: false, reference, rows: bodyOf(sorted) });
    else {
      if (meets.length || reference) groups.push({ group: GROUP.MEETS, heading: `Meets every requirement (${meets.length})`, note: '', folded: false, reference, rows: bodyOf(meets) });
      if (oneCheck.length) groups.push({ group: GROUP.ONE_CHECK, heading: `One check away (${oneCheck.length})`, note: 'One question to the maker or one test print settles it: its print settings, or a value on the line. Still UNKNOWN until it is settled.', folded: false, reference: null, rows: bodyOf(oneCheck) });
      if (notEnough.length) {
        groups.push({ group: GROUP.NOT_ENOUGH, heading: `Not enough data (${notEnough.length})`, folded: false, reference: null, rows: bodyOf(notEnough),
          note: `More than one question is open, or a value is not published the way you asked. ${estimatesOn && likelyCount ? `The ${likelyCount === 1 ? 'one' : likelyCount} tagged likely ${likelyCount === 1 ? 'comes' : 'come'} first: ${likelyCount === 1 ? 'its' : 'their'} estimated range meets every open number. ` : ''}${estimatesOn ? `${likelyCount ? 'Then' : 'Ordered'} by how close each one's estimate or value comes to the limits; an estimate never passes.` : 'Ordered by how close the deciding product\'s values come to the limits.'}` });
      }
      if (unlikely.length) {
        groups.push({ group: GROUP.UNLIKELY, heading: `Unlikely to meet (${unlikely.length}): folded, still counted and in the download`, folded: true, reference: null, rows: bodyOf(unlikely),
          note: 'A product measured the way you asked misses and none meets it, or every open product\'s own estimate misses. Not a failure: the products that publish nothing are untested.' });
      }
      if (hidden.length) groups.push({ group: GROUP.HIDDEN, heading: `Hidden (${hidden.length})`, note: 'Held out of the list by a definition or by inference, never by a failure: each row says why. The HIDDEN chip at the bottom shows them.', folded: false, reference: null, rows: bodyOf(hidden) });
      if (failed.length) groups.push({ group: GROUP.FAIL, heading: `Fail (${failed.length})`, note: '', folded: false, reference: null, rows: bodyOf(failed) });
    }
  }

  return {
    columns: COLUMNS,
    head: headOf(COLUMNS, sort),
    colsets: Object.entries(COLUMN_SETS).map(([key, v]) => ({ key, label: v.label, help: v.help, pressed: key === setKey })),
    colsetHelp: COLUMN_SETS[setKey].help,
    rankOptions: INDICES.map((i) => ({ id: i.id, label: i.designCase })),
    baselineOptions: anchors.map((m: Loose) => ({ id: m.id, name: m.name })),
    legend: legendOf(state, COLUMNS, showEstimates),
    sortNote: state.sortNotice ? sortNoticeText(state.sortNotice) : '',
    rankNote: ranks && state.sortOverride ? `Ordered by a column; each row keeps its rank by ${index?.designCase.toLowerCase()}.` : '',
    family: familyOf(state),
    empty: sorted.length ? '' : `Nothing matching "${state.search}" meets your requirements.`,
    groups,
    excluded: excludedOf(state),
  };
}
