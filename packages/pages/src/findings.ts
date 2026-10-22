// The Overview's words: every sentence a material's page says in its own voice, from the facts layer (material-facts.js,
// material-stats.js, material-highlights.js) and the compiled fields, never typed. The rules are content/PROPOSAL.md's
// (docs/audits/2026-10-17-pages-reimagined): the answer first, one idea a sentence, a caveat said once (the evidence
// line), the fact rather than the bookkeeping, engineering terms kept and the project's own words left out.
//
// A sentence is a Say: `{ text, html, toString() }`, the plain words and the same words as markup, each compiled value
// in it wrapped `<span data-v="<unrounded>" data-key="<headline key>" data-stat="median|q1|q3|min|max|n|product">` so the
// page check can hold it to the facts. Build one with the `say` tag and `num` (or `plain`), join them with `joinSay` and
// `andSay`. Nothing here decides anything or judges a product.
//
// The contract with the frame (track A): identitySentence, evidenceLine, onTheH2cRows, onTheH2cLine, standOutLines and
// productsHandoffWords, each from a material's context (material-facts.js materialContext).

import type { Loose } from './loose.ts';

import { esc } from './html.ts';
import { dayWords } from './facts/dates.ts';
import { fmtNumber, readableUnit, priceSampleSentence, medianSign } from './facts/format.ts';
import { REGISTRY } from './facts/registry.ts';
import { propertyName } from './facts/labels.ts';
import { identity, productNameOrId, printFacts, printCounts, priceRows, stated, groupByMaker } from './facts/material-facts.ts';
import { compareMedians, printsAmorphous, heatLadder, publishedEnds } from './facts/material-stats.ts';
import { plural, lower, cap, andList, scheduleWords, inText, statementVerdictWords } from './facts/material-words.ts';
import { standOut, standOutProducts, standing, productsOf, KEY_FIGURES } from './facts/material-highlights.ts';
import { glue, countWords, onTheH2cRows, nozzleSay, dryingSpanWords } from './facts/print-brief.ts';
import { isSay, plain, markup, fmtD, num, say, joinSay, andSay, capSay, spanSay } from './facts/say.ts';
import { evidenceLine, keyFiguresBasis, nWords } from './facts/evidence-line.ts';

// ------------------------------------------------------------------ sentences with their numbers marked

// The Say machinery (say, num, plain and the rest) is app/js/ui/say.js's, and the evidence line app/js/ui/evidence-line.js's,
// since the coherence round (2026-10-18), so the drawer prints what the page prints from the same functions; both are
// re-exported here for the pages' modules, with the words the drawer shares (print-brief.js, material-words.js).
export { glue, countWords, onTheH2cRows, nozzleSay, dryingSpanWords };
export { isSay, plain, markup, fmtD, num, say, joinSay, andSay, capSay, spanSay };
export { evidenceLine, keyFiguresBasis, nWords, inText };
/** What the statements on one exposure say (material-words.js statementVerdictWords, which the drawer prints too). */
export const verdictWords = statementVerdictWords;

// The date words live in app/js/ui/dates.js since 2026-10-18 (coherence round), so the drawer prints a date as the
// page does; re-exported here for the pages' modules.
export { dayWords, daysWords } from './facts/dates.ts';

const headline = (key: Loose) => REGISTRY.allHeadlines.find((h: Loose) => h.key === key) ?? null;
const labelOf = (key: Loose) => headline(key)?.labels.plain ?? key;

/** A link to a product's card on the material's Products page. */
export const productHref = (c: Loose, gradeId: Loose) => `${c.m.id}-products.html#${gradeId}`;
/** A product's name as a link to its card. */
export const productLink = (c: Loose, g: Loose): Loose => markup(`<a class="prod" href="${esc(productHref(c, g.id))}" data-grade="${esc(g.id)}">${esc(productNameOrId(g))}</a>`, productNameOrId(g));

// ------------------------------------------------------------------ what the material is (the head)

/** A filler as an adjective before the polymer: "Glass-fibre-filled PCTG". */
const FILLER_ADJ: Record<string, Loose> = {
  'Glass fibre': 'Glass-fibre-filled', 'Carbon fibre': 'Carbon-fibre-filled', 'Aramid fibre': 'Aramid-fibre-filled', 'Natural fibre': 'Natural-fibre-filled',
  'Glass spheres': 'Glass-sphere-filled', Ceramic: 'Ceramic-filled', PTFE: 'PTFE-filled', Graphene: 'Graphene-filled', 'Metal powder': 'Metal-powder-filled',
  'ESD formulation': 'Anti-static (ESD)', 'Electrically conductive': 'Electrically conductive', Foaming: 'Foaming, lightweight',
};
/** The polymer group a name adds to an abbreviation where the abbreviation does not say it (polymers[].group). */
const GROUP_WORD: Record<string, Loose> = { copolyester: 'copolyester', elastomer: 'elastomer' };
/** A full name in sentence case: "Polyamide 6 (nylon 6)"; abbreviations and Shore keep their capitals. */
const sentenceCase = (t: Loose) => cap(String(t).split(/(\s+|\/|\(|\)|-)/).map((w, i) => (i && /^[A-Z][a-z]/.test(w) && !/^(Shore|Nylon)$/.test(w) ? w.toLowerCase() : w)).join(''));

/** What a material is, in an engineer's words: "Glass-fibre-filled PCTG copolyester", "Polylactic acid", "Silk PLA". */
export function whatItIs(m: Loose, db: Loose) {
  const poly = (db.polymers ?? []).find((p: Loose) => p.id === m.estimateIdentity);
  const base = stated(m.basePolymer) ? m.basePolymer : m.name;
  const full = stated(m.fullName) ? m.fullName : m.name;
  let words: Loose;
  if (/not disclosed/i.test(full)) words = sentenceCase(full);
  else if (FILLER_ADJ[m.modifier]) {
    const group = GROUP_WORD[poly?.group];
    words = `${FILLER_ADJ[m.modifier]} ${base}${group && !base.toLowerCase().includes(group) ? ` ${group}` : ''}`;
  } else if (/variant/i.test(m.modifier ?? '') && / - /.test(full)) words = `${sentenceCase(full.split(' - ').slice(1).join(' - '))} ${base}`;
  else words = sentenceCase(full);
  return m.facets?.supportMaterial?.value ? `${words}, a support material` : words;
}

/** Words a name may say another way: "Fiber" and "Fibre", "Reinforced" and "filled", ESD and anti-static. */
const SAME_WORD: Record<string, Loose> = { fiber: 'fibre', reinforced: 'filled', electrostatic: 'static', dissipative: 'static', esd: 'static', anti: 'static', lightweight: 'foaming' };
const STOP = new Set(['a', 'an', 'and', 'of', 'the', 'for', 'in', 'with']);
const wordsOf = (t: Loose): Loose => new Set(String(t ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)).map((w) => SAME_WORD[w] ?? w));

/**
 * Bambu Lab's standing in a sentence an engineer would write (labels.js H2C_STATUS says it as a filter label): what the
 * listing covers, and for an unlisted material what the page shows instead. A material beyond the H2C's capability says
 * so in the head's callout, so it has none here.
 */
function standingLede(m: Loose) {
  // A type's name where it is one short abbreviation ("PLA", "PETG-GF"); a descriptive name reads as "this material type".
  const named = /^[A-Z0-9][A-Z0-9+/-]*$/.test(m.name);
  switch (m.h2cStatus) {
    case 'Official Bambu product': return 'Bambu Lab sells its own filament of this material for the H2C.';
    case 'Officially listed family': return `Bambu Lab lists ${named ? `${m.name} as a material type` : 'this material type'} for the H2C; the listing covers the type, not each brand.`;
    case 'Conditional': return 'Bambu Lab does not list this material for the H2C; Printing on the H2C, below, gives the conditions it prints under.';
    case 'Theoretical': return 'Bambu Lab does not list this material for the H2C; its published process temperatures are within the printer\'s limits.';
    default: return '';
  }
}

/** The head's identity sentence: what it is where the full name above it does not say so, its products and makers, and Bambu Lab's standing. */
export function identitySentence(c: Loose): Loose {
  const id = identity(c.m, c);
  const lede = c.m.excluded ? '' : standingLede(c.m);
  const makers = id.makers === 1 ? 'one maker' : `${fmtNumber(id.makers)} makers`;
  // The head shows the name and the full name above this line: what the material is is said only where it adds a word
  // to them ("a support material"), never to restate a filler or variant the full name already names.
  const what = whatItIs(c.m, c.db);
  const shown = wordsOf(`${c.m.fullName} ${c.m.name} ${c.m.basePolymer}`);
  const support = /, a support material$/.test(what);
  const core = what.replace(/, a support material$/, '');
  // A group word ("copolyester") and "filled" (said of a filler the full name names) add nothing a reader lacks.
  const group = new Set([...Object.values(GROUP_WORD), 'filled']);
  const adds = [...wordsOf(core)].some((w) => !shown.has(w) && !group.has(w));
  const count = plural(id.products, 'product');
  if (adds) return say`${what}, ${count} from ${makers}.${lede ? ` ${lede}` : ''}`;
  if (support && !shown.has('support')) return say`A support material, ${count} from ${makers}.${lede ? ` ${lede}` : ''}`;
  return say`${cap(count)} from ${makers}.${lede ? ` ${lede}` : ''}`;
}

// ------------------------------------------------------------------ how well documented (the evidence line)

// The evidence line (evidenceLine, and keyFiguresBasis, its definition of a key property's figure) is
// app/js/ui/evidence-line.js's since 2026-10-18, so the drawer's On file line says it too; re-exported above.

// ------------------------------------------------------------------ printing on the H2C, in brief

// The window, chamber, drying and nozzle-type rows of *On the H2C* (onTheH2cRows) live in app/js/ui/print-brief.js since
// 2026-10-18, so the drawer prints the same block from the same functions; they are re-exported above.

/** One line on the H2C's limits: within all of them, or which settings ask for more than it gives. */
export function onTheH2cLine(c: Loose): Loose {
  // A material beyond the H2C's capability says so in its head: the plate does not say it again.
  if (c.m.excluded) return plain('');
  const pf = printFacts(c.m, c);
  const counts = printCounts(c.grades);
  const total = productsOf(c).length;
  const over = pf.outside.filter((a: Loose) => a.list.length);
  if (over.length) {
    const AXIS: Record<string, Loose> = { nozzle: 'nozzle', bed: 'bed', chamber: 'chamber' };
    return plain(`${cap(andList(over.map((a: Loose, i: Loose) => `${a.list.length === total ? (total === 2 ? 'both products' : `all ${fmtNumber(total)} products`) : `${fmtNumber(a.list.length)} of ${i ? fmtNumber(total) : plural(total, 'product')}`} ${a.list.length === 1 ? 'asks' : 'ask'} for more ${AXIS[a.axis] ?? lower(a.label)} heat than the H2C's ${fmtNumber(pf.limits.find((l: Loose) => l.axis === a.axis)?.limit)} °C`)))}.`);
  }
  if (counts?.all) return plain('Every product\'s settings are within the H2C\'s limits.');
  return plain('No product asks for more than the H2C gives.');
}

// ------------------------------------------------------------------ products that stand out, and the hand-off

/** A product value's state, in words: sold as toughened, measured after annealing, the products that read its sheet. */
function stateWords(x: Loose): Loose {
  const bits: Loose[] = [];
  if (x.toughened) bits.push('sold as toughened');
  if (x.v?.anneal) bits.push(`measured after annealing ${scheduleWords(x.v.anneal)}`);
  if (x.v?.converted) bits.push('converted from a foreign price');
  return bits;
}

/**
 * The products that stand out (material-highlights.js standOutProducts), a fact a line: `[{ gradeId, label, name, href,
 * detail (Say), text, html }]`, the html with the product's name linked to its card; [] under six products.
 */
export function standOutLines(c: Loose): Loose {
  return standOutProducts(c).map((x: Loose) => {
    const h = x.key ? headline(x.key) : null;
    let detail: Loose;
    if (x.kind === 'documented') detail = plain(x.others ? `, and ${plural(x.others, 'other')} that ${x.others === 1 ? 'publishes' : 'publish'} as much.` : ', with values for more properties than any other.');
    else if (x.kind === 'layers') detail = say`, ${Math.round(x.share * 100)} % of its flat tensile strength (the median product keeps ${Math.round(x.median * 100)} %).`;
    else {
      const bits = stateWords(x);
      const also = x.also ? `, and it keeps the most strength across the layers, ${Math.round(x.also.share * 100)} % of its flat value` : '';
      const readers = x.readers?.length ? ` (${andList(x.readers.map(productNameOrId))} ${x.readers.length === 1 ? 'shares its' : 'share its'} data sheet)` : '';
      detail = say`, ${num(x.v.value, { key: x.key, stat: 'product', unit: h?.unit, grade: x.g.id })}${readers}${bits.length ? `, ${andList(bits)}` : ''}${also}.`;
    }
    const link = productLink(c, x.g);
    return { gradeId: x.g.id, kind: x.kind, label: x.label, name: productNameOrId(x.g), href: productHref(c, x.g.id), detail,
      text: `${x.label}: ${link.text}${detail.text}`, html: `${esc(x.label)}: ${link.html}${detail.html}` };
  });
}

/**
 * The Products hand-off's words: `{ lede (Say: the products and who makes them), button ('Compare the 195 products'),
 * href, closing (Say, or null where no product is named as standing out) }`.
 */
export function productsHandoffWords(c: Loose): Loose {
  const products = productsOf(c);
  const makers = groupByMaker(products).filter(([k]: Loose) => stated(k)).map(([maker, gs]: Loose) => ({ maker, n: gs.length })).sort((a: Loose, b: Loose) => b.n - a.n || a.maker.localeCompare(b.maker));
  const n = products.length;
  const several = makers.filter((x: Loose) => x.n > 1);
  const lede = makers.length <= 3
    ? plain(`${cap(nWords(n, 'product'))} from ${makers.length === 1 ? `one maker, ${makers[0].maker}` : `${countWords(makers.length)} makers: ${andList(makers.map((x: Loose) => x.maker))}`}.`)
    : !several.length ? plain(`${fmtNumber(n)} products, one from each of ${fmtNumber(makers.length)} makers.`)
      : plain(`${fmtNumber(n)} products from ${fmtNumber(makers.length)} makers; the most from ${andList(several.slice(0, 3).map((x: Loose) => `${x.maker} (${x.n})`))}.`);
  return {
    lede, button: `Compare the ${n === 2 ? 'two' : fmtNumber(n)} products`, href: `${c.m.id}-products.html`,
    closing: standOutProducts(c).length ? plain('These are published values, not recommendations: the selector judges each product against your requirements.') : null,
  };
}

// ------------------------------------------------------------------ among the materials

/** The properties the standing sentence speaks of, in the order an engineer reads a sheet. */
const STANDING_KEYS = ['tensileModulusXY', 'tensileStrengthXY', 'tensileStrengthZ', 'elongationXY', 'charpyNotched', 'hdt045', 'density', 'priceCADkg'];

/** Where the material sits among every material: its high and low properties, and those in the middle half. */
export function standingWords(c: Loose, ranks: Loose): Loose {
  const m = c.m;
  const rows = STANDING_KEYS.map((key) => ({ key, at: standing(m, ranks, key) })).filter((r) => r.at && m.summary?.[r.key]?.n);
  if (!rows.length) return null;
  const high = rows.filter((r) => r.at.pct >= 75), low = rows.filter((r) => r.at.pct <= 25), mid = rows.filter((r) => r.at.pct > 25 && r.at.pct < 75);
  const lbl = (rs: Loose) => andList(rs.map((r: Loose) => inText(labelOf(r.key))));
  if (!high.length && !low.length) return plain(`Among the materials, ${m.name} sits in the middle half on every property it publishes comparably.`);
  const has = [high.length ? `a high ${lbl(high)}` : null, low.length ? `a low ${lbl(low)}` : null].filter(Boolean);
  const quarter = high.length && low.length ? 'the top or bottom quarter' : high.length ? 'the top quarter' : 'the lowest quarter';
  const n = high.length + low.length;
  const which = n === 1 ? 'it is' : n === 2 ? 'both are' : 'each is';
  return joinSay([`Among the materials, ${m.name} has ${has.join(has.length > 1 && high.length > 1 ? ', and ' : ' and ')}: ${which} in ${quarter} of the materials that publish ${n === 2 ? 'them' : 'it'}.`,
    // Two named at most: a longer list is the rest, and the figure below names each.
    mid.length > 2 ? 'The rest of its key properties sit in the middle half.' : mid.length ? `Its ${lbl(mid)} ${mid.length === 1 ? 'sits' : 'sit'} in the middle half.` : null]);
}

/** How one median differs from another's, as an engineer says it, or null where the two are about the same. */
const ADJ: Record<string, Loose> = {
  tensileModulusXY: ['stiffer', 'less stiff', 'as stiff'], tensileStrengthXY: ['stronger flat', 'weaker flat', 'as strong flat'],
  tensileStrengthZ: ['stronger across the layers', 'weaker across the layers', 'as strong across the layers'],
  charpyNotched: ['tougher in notched impact', 'less tough in notched impact', 'as tough in notched impact'],
  priceCADkg: ['more expensive', 'less expensive', 'as expensive'],
};
function differ(r: Loose, other: Loose): Loose {
  const on = other.summary?.[r.key]?.n ?? 0;
  if (r.n < 2 || on < 2) return null;
  if (r.kind === 'diff') return Math.abs(r.value) <= 3 ? null : { r, size: Math.abs(r.value) / Math.max(1, Math.abs(r.b)), hdt: true };
  if (r.same) return null;
  return { r, size: Math.abs(Math.log(r.a / r.b)) };
}
const differWords = ({ r }: Loose) => {
  const [more, less, as] = ADJ[r.key] ?? ['higher', 'lower', 'as high'];
  if (r.a / r.b >= 2) return `${(r.a / r.b).toFixed(1)} times ${as}`;
  return `${Math.round(Math.abs(r.value) * 100)} % ${r.value > 0 ? more : less}`;
};

/** The first two alternatives (material-stats.js peerSet), against this material, in a sentence each. */
export function peersWords(c: Loose, peers: Loose): Loose {
  const m = c.m;
  const out: Loose[] = [];
  for (const p of peers ?? []) {
    if (out.length === 2) break;
    const rows = compareMedians(m, p, KEY_FIGURES);
    // A filled material against its own unfilled polymer: what the filler does to it, said first.
    const base = p.basePolymer === m.basePolymer && /unfilled/i.test(p.modifier ?? '') && FILLER_ADJ[m.modifier];
    const hdt = rows.find((r: Loose) => r.key === 'hdt045');
    if (base && hdt && (m.summary?.hdt045?.n ?? 0) >= 2 && (p.summary?.hdt045?.n ?? 0) >= 2) {
      const d = hdt.a - hdt.b;
      const verb = Math.abs(d) <= 3 ? `adds little to ${p.name}'s heat resistance` : d > 0 ? `raises ${p.name}'s HDT at 0.45 MPa by ${fmtD(Math.abs(d), '°C')}` : `lowers ${p.name}'s HDT at 0.45 MPa by ${fmtD(Math.abs(d), '°C')}`;
      out.push(say`${cap(lower(m.modifier))} ${verb}: ${m.name}'s HDT at 0.45 MPa is ${num(hdt.a, { key: 'hdt045', unit: '°C' })} against ${fmtD(hdt.b, '°C')}.`);
      continue;
    }
    const diffs = rows.map((r: Loose) => differ(r, p)).filter(Boolean).sort((a: Loose, b: Loose) => b.size - a.size).slice(0, 3);
    if (!diffs.length) {
      const both = rows.filter((r: Loose) => r.n >= 2 && (p.summary?.[r.key]?.n ?? 0) >= 2);
      if (both.length === 1) out.push(say`Against ${p.name}, ${m.name}'s ${inText(both[0].h.labels.plain)} is about the same: ${num(both[0].a, { key: both[0].key, unit: both[0].h.unit })} against ${fmtD(both[0].b, both[0].h.unit)}.`);
      else if (both.length) out.push(plain(`Against ${p.name}, ${m.name}'s medians are about the same on ${andList(both.map((r: Loose) => inText(r.h.labels.plain)))}.`));
      continue;
    }
    const adj = diffs.filter((x: Loose) => !x.hdt).map(differWords);
    const heat = diffs.find((x: Loose) => x.hdt);
    const heatWords: Loose = heat ? `its HDT at 0.45 MPa is ${fmtD(Math.abs(heat.r.value), '°C')} ${heat.r.value > 0 ? 'higher' : 'lower'}` : null;
    out.push(plain(adj.length ? `Against ${p.name}, ${m.name} is ${andList(adj)}${heatWords ? `, and ${heatWords}` : ''}.` : `Against ${p.name}, ${m.name}'s ${heatWords.replace(/^its /, '')}.`));
  }
  return out;
}

// ------------------------------------------------------------------ mechanical properties

/** A value's display in a unit a reader reads easily (a soft elastomer's 0.0159 GPa as 15.9 MPa, format.js readableUnit). */
const readable = (v: Loose, unit: Loose, ref = v) => { const r = readableUnit(unit, ref); return fmtD(v * r.factor, r.unit); };
/** A summary's median as a Say, with its unit. */
const med = (m: Loose, key: Loose): Loose => { const s = m.summary[key]; const unit = headline(key)?.unit; return num(s.median, { key, unit, shown: `${medianSign(m, key)}${readable(s.median, unit, s.max ?? s.median)}` }); };
/** A summary's published-only span: "55 MPa", "39–70 MPa". */
const openSpan = (m: Loose, key: Loose): Loose => {
  const a = m.summary[key].asPublished, unit = headline(key)?.unit, r = readableUnit(unit, a.max);
  if (r.factor === 1) return spanSay(a.min, a.max, { key, unit, stats: ['asPublished.min', 'asPublished.max'] });
  return a.min === a.max ? num(a.min, { key, stat: 'asPublished.min', shown: readable(a.min, unit, a.max) })
    : say`${num(a.min, { key, stat: 'asPublished.min', shown: fmtD(a.min * r.factor) })}\u2060–\u2060${num(a.max, { key, stat: 'asPublished.max', shown: readable(a.max, unit) })}`;
};

/** The mechanical section's opening: the flat tensile values, with elongation, and the bending values, two sentences. */
export function mechanicalWords(c: Loose): Loose {
  const m = c.m;
  const s = (k: Loose) => m.summary?.[k];
  const out: Loose[] = [];
  if (s('tensileStrengthXY')?.n) {
    const mod = s('tensileModulusXY')?.n ? say` at a modulus of ${med(m, 'tensileModulusXY')}` : '';
    const el = s('elongationXY')?.n ? say`, and breaks at ${med(m, 'elongationXY')} elongation` : '';
    out.push(say`Printed flat (XY), ${m.name} typically reaches a tensile strength of ${med(m, 'tensileStrengthXY')}${mod}${el}.`);
  } else {
    const open = [['tensileStrengthXY', 'a tensile strength'], ['tensileModulusXY', 'a modulus'], ['elongationXY', 'an elongation at break']].filter(([k]) => !s(k)?.n && s(k)?.asPublished?.n);
    if (open.length) out.push(say`As published, its products give ${andSay(open.map(([k, w]) => say`${w} of ${openSpan(m, k)}`))}.`);
    else if (s('tensileModulusXY')?.n) out.push(say`Printed flat (XY), ${m.name}'s tensile modulus is typically ${med(m, 'tensileModulusXY')}.`);
  }
  if (s('flexuralStrengthXY')?.n && s('flexuralModulusXY')?.n) out.push(say`In bending, its flexural strength is typically ${med(m, 'flexuralStrengthXY')} at a flexural modulus of ${med(m, 'flexuralModulusXY')}.`);
  // Impact: where no product publishes a notched value, what its sheets give instead, in one clause.
  if (!s('charpyNotched')?.n && !s('izodNotched')?.n && !s('charpyNotched')?.asPublished?.n && !s('izodNotched')?.asPublished?.n) {
    const impact = c.ms.filter((x: Loose) => /impact/i.test(x.property) && x.numeric);
    if (impact.length && impact.every((x: Loose) => /unnotched/i.test(x.notch ?? ''))) out.push(plain('Its sheets publish only unnotched impact values.'));
  }
  return out.slice(0, 3);
}

// ------------------------------------------------------------------ thermal properties

/** The thermal section's opening: where it softens and why, the products well above the rest, Vicat and melting. */
export function thermalWords(c: Loose, { table = false }: Loose = {}): Loose {
  const m = c.m;
  const s = (k: Loose) => m.summary?.[k];
  const out: Loose[] = [];
  const a = s('hdt045'), b = s('hdt18'), tg = s('glassTransition');
  const amorphous = printsAmorphous(m, c.db);
  const at = (k: Loose, x: Loose): Loose => (x.n >= 4 ? med(m, k) : spanSay(x.min, x.max, { key: k, unit: '°C' }));
  if (a?.n && b?.n && tg?.n && amorphous === true && Math.abs(a.median - b.median) <= 3) {
    out.push(say`${m.name} is amorphous as printed, so it softens at its glass transition, typically ${med(m, 'glassTransition')}: its HDT is ${at('hdt045', a)} under 0.45 MPa and ${at('hdt18', b)} under 1.8 MPa.`);
  } else if (a?.n) {
    const lead = a.n >= 4 ? say`${m.name}'s HDT is typically ${at('hdt045', a)} under 0.45 MPa` : say`Its products put HDT at ${at('hdt045', a)} under 0.45 MPa`;
    out.push(say`${lead}${b?.n ? say` and ${at('hdt18', b)} under 1.8 MPa` : ''}${tg?.n ? say`, ${tg.n >= 4 ? 'with its glass transition typically at' : 'against a glass transition of'} ${at('glassTransition', tg)}` : ''}.`);
    if (amorphous === false && tg?.n && a.median - tg.median >= 20) out.push(plain(`Semicrystalline, it carries light load well above its glass transition.`));
  } else if (tg?.n) out.push(say`Its glass transition is ${tg.n >= 4 ? 'typically ' : ''}${at('glassTransition', tg)}.`);
  // The products well above the rest, by name, with their state.
  const so = standOut(m, c, 'hdt045');
  if (so?.list.length) {
    const named = so.list.slice(0, 3).map((e: Loose) => say`${productNameOrId(e.g)} (${num(e.v.value, { key: 'hdt045', stat: 'product', unit: '°C', grade: e.g.id })}${e.v.anneal ? `, annealed ${scheduleWords(e.v.anneal)}` : ''})`);
    const lo = Math.min(...so.list.map((e: Loose) => e.v.value)), hi = Math.max(...so.list.map((e: Loose) => e.v.value));
    out.push(so.list.length === 1
      ? say`One product publishes far more at 0.45 MPa: ${named[0]}.`
      : say`${cap(nWords(so.list.length, 'product'))} publish ${fmtD(lo)} to ${fmtD(hi, '°C')} at 0.45 MPa${so.annealed ? `, ${countWords(so.annealed)} of them after annealing` : ''}. The highest are ${andSay(named)}.`);
  }
  // Vicat and melting, as published, where no table says them.
  if (!table) {
    const rows = heatLadder(m, c, ['Vicat softening temperature', 'Melting temperature']).filter((r: Loose) => !r.compared);
    // One product with values from two documents is said as both, never as their median ("77–89 °C").
    // A range its sheet prints is said as that range ("180–200 °C"), never its low end alone.
    const raw = (prop: Loose) => c.ms.filter((x: Loose) => x.property === prop && x.numeric && x.unit === '°C' && !x.quarantined && !x.implausible).flatMap(publishedEnds);
    const value = (r: Loose) => { if (r.summary.n > 1) return `typically ${fmtD(r.summary.median, '°C')}`; const vs = raw(r.id); const lo = Math.min(...vs), hi = Math.max(...vs); return `${lo === hi ? fmtD(lo, '°C') : `${fmtD(lo)}–${fmtD(hi, '°C')}`}, from one product`; };
    const said = rows.map((r: Loose, i: Loose) => `${r.id === 'Vicat softening temperature' ? 'Vicat softening' : 'melting'} ${i ? '' : 'is '}${value(r)}`);
    if (said.length) out.push(plain(`As published, ${andList(said)}.`));
  }
  return out;
}

// ------------------------------------------------------------------ printing on the H2C

// ------------------------------------------------------------------ density and price

/** The density sentence. */
export function densityWords(c: Loose): Loose {
  const m = c.m;
  const d = m.summary?.density;
  if (!d?.n) return null;
  if (d.n === 1) return say`One product gives a density of ${med(m, 'density')}.`;
  if (d.min === d.max) return say`All ${countWords(d.n)} products give a density of ${med(m, 'density')}.`;
  if (d.n < 4) return say`Its ${countWords(d.n)} products give a density of ${spanSay(d.min, d.max, { key: 'density', unit: 'kg/m³' })}.`;
  return say`${m.name}'s density is typically ${med(m, 'density')}${d.q1 != null ? say`, the middle half ${spanSay(d.q1, d.q3, { key: 'density', unit: 'kg/m³', stats: ['q1', 'q3'] })}` : ''}, across ${num(d.n, { key: 'density', stat: 'n', shown: plural(d.n, 'product') })}.`;
}

/** The price sentences: the typical price and the lowest, or the one product's, and the Canadian listings not used. */
export function priceWords(c: Loose): Loose {
  const m = c.m;
  const s = m.summary?.priceCADkg;
  const out: Loose[] = [];
  const rows = priceRows(c);
  if (s?.n > 1) {
    const low = standOutProducts(c).find((x: Loose) => x.kind === 'low' && x.key === 'priceCADkg')
      ?? (() => { const e = productsOf(c).filter((g: Loose) => g.headline?.priceCADkg && !g.variant).sort((a: Loose, b: Loose) => a.headline.priceCADkg.value - b.headline.priceCADkg.value)[0]; return e ? { g: e, v: e.headline.priceCADkg } : null; })();
    out.push(say`${m.name} typically costs ${med(m, 'priceCADkg')}${s.q1 != null ? say`, the middle half ${spanSay(s.q1, s.q3, { key: 'priceCADkg', unit: 'CAD/kg', stats: ['q1', 'q3'] })}` : ''}, across the ${num(s.n, { key: 'priceCADkg', stat: 'n', shown: plural(s.n, 'product') })} with a regular price in the sample${low ? say`; the lowest is ${productLink(c, low.g)} at ${num(low.v.value, { key: 'priceCADkg', stat: 'product', unit: 'CAD/kg', grade: low.g.id })}` : ''}.`);
  } else if (s?.n === 1) {
    const g = c.gradeById.get(s.typical);
    const listing = rows.find((r: Loose) => r.used && r.p.gradeId === s.typical);
    const fx = listing?.converted && listing.p.fx ? `, from ${listing.p.retailer}'s listing in ${listing.p.currency}, converted at the Bank of Canada rate of ${dayWords(listing.p.fx.date)}` : '';
    out.push(say`One product has a sampled price: ${g ? productLink(c, g) : 'one product'} at ${num(s.median, { key: 'priceCADkg', unit: 'CAD/kg' })}${fx}.${listing?.converted ? ' No Canadian shop in the sample sells it.' : ''}`);
  }
  // A Canadian shop's listing of a product with no price in the sample: the reader learns the product is sold here.
  const priced = new Set(rows.filter((r: Loose) => r.used).map((r: Loose) => r.p.gradeId));
  const unpriced = (s?.n ?? 0) >= 4 ? [] : rows.filter((r: Loose) => !r.used && !r.foreign && r.unused === 'no-regular' && !priced.has(r.p.gradeId));
  for (const r of unpriced.slice(0, 3)) {
    const g = r.product;
    out.push(say`${r.p.retailer} lists ${g ? productLink(c, g) : 'a product'}${/out of stock/i.test(r.p.stock ?? '') ? ', out of stock when sampled,' : ''} with no regular price recorded.`);
  }
  return out;
}

/** The sampling sentence, said once, last: format.js priceSampleSentence, which the drawer's Price tab prints too. */
export const priceSampleLine = (c: Loose): Loose => plain(priceSampleSentence(c.db.meta));

// ------------------------------------------------------------------ chemicals and environment

// What the statements on one exposure say (verdictWords) is material-words.js statementVerdictWords since 2026-10-18,
// so the drawer's Environment headings give the page's answer; re-exported above.

// ------------------------------------------------------------------ statements chosen by rule

/**
 * A statement worth quoting first: a number with its unit, a printing condition (a nozzle, annealing, drying, an
 * enclosure), or an instruction, a verb where an instruction stands (at a sentence's start, or after "should", "must",
 * "recommend"): "Use a hardened nozzle", "it is recommended to dry", never the "use" of "safe for home use".
 */
const NUMBER_UNIT = /\d\s?(?:°C|°F|%|mm\/s|mm|µm|h\b|hrs?\b|hours?|min(?:utes)?\b)/i;
const CONDITION = /\b(?:nozzles?|anneal(?:ed|ing)?|dry(?:ing)?|dried|dry ?box|dryer|desiccant|enclosure|heated chamber|build plate|glue stick|bed temperature)\b/i;
const INSTRUCTION = /(?:^|[.;:!]\s+|\b(?:should|must|needs? to|recommend(?:ed|s)?(?: to)?|advised? to|best to|try to|please|we suggest)\s+(?:to\s+)?(?:be\s+)?)(?:use|using|set|avoid|keep|store|reduce|increase|lower|raise|print|preheat|measure|scale|enable|disable|apply|clean|turn)\b/i;
const SPECIFIC = { test: (t: Loose) => NUMBER_UNIT.test(t) || CONDITION.test(t) || INSTRUCTION.test(t) };
/** A claim that sells and instructs nothing: never quoted where the topic has an instructive statement. */
const CLAIM = /\b(?:odou?rless|odou?r[- ]free|(?:fully |100 ?% )?biodegradable|compostable|eco[- ]?friendly|easy to print|easy[- ]to[- ]use|hassle[- ]free|perfect|amazing|excellent|superior|premium|best[- ]in[- ]class|unmatched|outstanding)\b/i;
/** Whether a statement instructs: a number with its unit, a condition, or an instruction (use, dry, set, avoid, anneal, nozzle). */
export const instructive = (t: Loose) => SPECIFIC.test(String(t ?? ''));
/** Topics that sell rather than inform: quoted after the others. */
const SELLING = new Set(['Benefits', 'Good for']);
/**
 * Statements ordered as a page quotes them: an instructive one first (a number with its unit, a condition, or an
 * instruction; `prefer` adds a pattern of its own), then a sentence of readable length (six to forty words), a data
 * sheet's before a product page's, one that informs before one that sells, and the maker with the most products here;
 * at most one of a text. Where any statement instructs, a pure claim ("odourless", "easy to print") is left out.
 */
export function quoteOrder(list: Loose, c: Loose, { prefer = null, perProduct = false }: Loose = {}) {
  const makers = new Map();
  for (const g of productsOf(c)) makers.set(g.manufacturer, (makers.get(g.manufacturer) ?? 0) + 1);
  const sheet = (k: Loose): Loose => (/TDS|data sheet/i.test(c.sourceById.get(k.sourceId)?.sourceClass ?? '') ? 0 : 1);
  const words = (t: Loose) => String(t ?? '').trim().split(/\s+/).length;
  const text = (k: Loose) => k.text ?? k.finding ?? '';
  const claim = (k: Loose) => CLAIM.test(text(k)) && !instructive(text(k));
  const score = (k: Loose) => {
    const t = text(k);
    return [prefer ? (prefer.test(t) ? 0 : 1) : 0, instructive(t) ? 0 : 1, words(t) >= 6 && words(t) <= 40 ? 0 : 1, sheet(k), claim(k) ? 1 : 0, SELLING.has(k.topic) ? 1 : 0,
      -(makers.get(c.gradeById.get(k.gradeId)?.manufacturer) ?? 0)];
  };
  const anyInstructs = list.some((k: Loose) => instructive(text(k)));
  const keyed = list.filter((k: Loose) => !(anyInstructs && claim(k))).map((k: Loose) => ({ k, s: score(k) }));
  keyed.sort((a: Loose, b: Loose) => { for (let i = 0; i < a.s.length; i++) if (a.s[i] !== b.s[i]) return a.s[i] - b.s[i]; return String(a.k.id).localeCompare(String(b.k.id)); });
  const seen = new Set(), products = new Set();
  return keyed.map((x: Loose) => x.k).filter((k: Loose) => {
    const key = String(text(k)).slice(0, 80);
    if (seen.has(key) || (perProduct && stated(k.gradeId) && products.has(k.gradeId))) return false;
    seen.add(key);
    products.add(k.gradeId);
    return true;
  });
}

// ------------------------------------------------------------------ kept for the frame's first screen until it is rebuilt

/** Where a key property's nearest value on file lacks the condition it is compared on, in short words (the first screen's). */
export function nearestLacks(h: Loose, b: Loose, x: Loose): Loose {
  const unstated = (v: Loose) => !v || /^(unknown|not-stated|Not published|Not applicable|not-applicable)$/i.test(String(v));
  const out: Loose[] = [];
  const name = propertyName(b.property ?? '');
  if (b.property && !h.valueProperties?.includes(b.property)) out.push(/test unclear/i.test(name) ? 'test unclear' : lower(name));
  if (h.loadMPa != null) out.push(b.loadMPa != null ? (b.loadMPa !== h.loadMPa ? `at ${fmtNumber(b.loadMPa)} MPa` : null) : 'load not stated');
  if (h.notch) out.push(unstated(x?.notch) ? 'notch not stated' : x.notch !== h.notch ? lower(x.notch) : null);
  const moulded = b.printed === false && /moulded|resin/i.test(`${x?.specimenForm ?? ''} ${b.why ?? ''}`);
  if (moulded) out.push('a moulded bar');
  else if (h.direction) out.push(unstated(b.direction) ? 'orientation not stated' : b.direction !== h.direction ? `${b.direction} bar` : null);
  if (h.testTemperatureC != null && Number.isFinite(x?.testTemperatureC) && Math.abs(x.testTemperatureC - h.testTemperatureC) > 3) out.push(`tested at ${fmtNumber(x.testTemperatureC)} °C`);
  return out.filter(Boolean);
}

/** Who a print window rests on (the old first screen's words): "all 3 products", "most products". */
export function acceptSubject(k: Loose, n: Loose, total = n) {
  if (k === 'all') return n === total ? (n === 2 ? 'both products' : `all ${n} products`) : `all ${n} that give one`;
  if (k === 'most') return 'most products that give one';
  return `${k} of ${n} that give one`;
}

/** One comparison line (the old first screen's): "tensile modulus 35 % lower, HDT at 0.45 MPa 15 °C higher". */
export function versusWords(rows: Loose) {
  if (!rows.length) return '';
  const name = (r: Loose) => (r.key === 'priceCADkg' ? 'price' : inText(r.h.labels.plain.replace(/^Tensile /, '').replace(/ impact$/, '')));
  const differ = rows.filter((r: Loose) => !r.same).map((r: Loose) => (r.kind === 'diff' ? `${name(r)} ${fmtNumber(Math.abs(r.value))} °C ${r.value > 0 ? 'higher' : 'lower'}`
    : r.value >= 1 ? `${name(r)} ${(r.a / r.b).toFixed(1)} times as high` : `${name(r)} ${Math.round(Math.abs(r.value) * 100)} % ${r.value > 0 ? 'higher' : 'lower'}`));
  const same = rows.filter((r: Loose) => r.same).map(name);
  return [differ.join(', '), same.length ? `${andList(same)} about the same` : ''].filter(Boolean).join('; ');
}

