// The findings a section opens with: two to four short sentences, each one idea, saying what the data shows in an
// engineer's words. Every number comes from the facts layer (material-facts.js, material-stats.js, the compiled
// materials[].summary) through format.js; nothing is typed, nothing judges a product or decides an answer. Plain text,
// unescaped: the section escapes it. The bookkeeping (what is counted, what is left out and why) is not said here but
// under each figure's "How this is counted".

import { fmtNumber } from '../js/ui/format.js';
import { envVerdictWords } from '../js/ui/labels.js';
import { plural, andList, lower, cap, windowText, asPublishedWords } from '../js/ui/material-words.js';

/** A share in plain words where it is near a simple fraction ("about two thirds"), else "about 68 %". */
export function fractionWords(r) {
  if (r >= 0.95) return 'nearly all';
  const FRACTIONS = [[1 / 4, 'a quarter'], [1 / 3, 'a third'], [1 / 2, 'half'], [2 / 3, 'two thirds'], [3 / 4, 'three quarters'], [0.9, 'nine tenths']];
  const near = FRACTIONS.find(([f]) => Math.abs(r - f) <= 0.025);
  return near ? `about ${near[1]}` : `about ${Math.round(r * 100)} %`;
}

/** A property's name inside a sentence: lower case, unless it begins with a name (Vicat, Charpy, Izod, Shore) or an abbreviation. */
export const inText = (label) => (/^(?:Vicat|Charpy|Izod|Shore|Rockwell|Barcol)\b/.test(label) ? label : lower(label));

/**
 * Where a count was read, in the words every section uses: "from their own sheet", "from a sheet they share", "from
 * Bambu Lab's guide". `o` is { own, twin, guide }; `n` the total. One source says so once; several are listed.
 */
export function basisWords(o, n) {
  const parts = [[o.own, 'from their own sheet'], [o.twin, 'from a sheet they share'], [o.guide, 'from Bambu Lab\'s guide']].filter(([k]) => k);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0][0] === n ? (n === 1 ? parts[0][1].replace('their', 'its').replace('they share', 'it shares') : `all ${parts[0][1]}`) : `${parts[0][0]} ${parts[0][1]}`;
  return andList(parts.map(([k, w]) => `${k} ${w}`));
}
/** The basis as a sentence's tail: ", 27 from their own sheet and 27 from Bambu Lab's guide", or ", all from their own sheet". */
const basisTail = (o, n) => {
  const single = [['own', 'by their own sheets'], ['twin', 'by a sheet they share'], ['guide', 'by Bambu Lab\'s guide']].find(([k]) => o[k] === n && n);
  if (single) return `, ${n === 1 ? single[1].replace('their own sheets', 'its own sheet').replace('they share', 'it shares') : single[1]}`;
  const w = basisWords(o, n);
  return w ? `: ${w}` : '';
};

/** A share as a whole per cent. */
const pc = (r) => `${Math.round(r * 100)} %`;

/** A temperature span, word-joined: "230–255 °C", or one temperature. */
const span = (w) => `${windowText(w.from, w.to)} °C`;

/**
 * Who a print window rests on, as the subject of "accept": the products counted (their own or a shared sheet gives both
 * ends; a special formulation's window and one read from Bambu Lab's guide are drawn apart, material-stats.js
 * printWindows) and, where they are fewer than the material's products, how many those are, so "all 3" on a material
 * of nine is never read as all of them. `k` is 'all', 'most' or how many accept; `n` the products counted; `total` the
 * material's products. "all 9 products", "both products", "all 3 counted products (of 9)", "2 of the 5 counted
 * products (of 9)". The first screen, the findings and the figure say it in these words alone.
 */
export function acceptSubject(k, n, total = n) {
  const part = n < total;
  const of = part ? ` (of ${total})` : '';
  if (k === 'all') return `${n === 2 ? 'both' : `all ${n}`} ${part ? 'counted ' : ''}products${of}`;
  if (k === 'most') return part ? `most of the ${n} counted products${of}` : 'most products';
  return part ? `${k} of the ${n} counted products${of}` : `${k} of ${n} products`;
}

// ------------------------------------------------------------------ the first screen

/**
 * One comparison line from material-stats.js compareMedians: "tensile modulus 35 % lower, HDT at 0.45 MPa 15 °C higher,
 * tensile strength about the same". Percent for ratios, °C differences for temperatures, "about the same" within 5 %.
 */
export function versusWords(rows) {
  if (!rows.length) return '';
  // Short names: the test is the first screen's own, so "tensile" and "impact" add nothing here.
  const name = (r) => (r.key === 'priceCADkg' ? 'price' : inText(r.h.labels.plain.replace(/^Tensile /, '').replace(/ impact$/, '')));
  // A median of one product is said to be one: a comparison on it is a single sheet's word.
  const one = (r) => (r.n === 1 ? ' (one product)' : '');
  const differ = rows.filter((r) => !r.same).map((r) => {
    if (r.kind === 'diff') return `${name(r)} ${fmtNumber(Math.abs(r.value))} °C ${r.value > 0 ? 'higher' : 'lower'}${one(r)}`;
    // Twice or more is said as a multiple: "2.3 times as high", not "130 % higher".
    if (r.value >= 1) return `${name(r)} ${(r.a / r.b).toFixed(1)} times as high${one(r)}`;
    return `${name(r)} ${Math.round(Math.abs(r.value) * 100)} % ${r.value > 0 ? 'higher' : 'lower'}${one(r)}`;
  });
  const same = rows.filter((r) => r.same).map((r) => `${name(r)}${one(r)}`);
  return [differ.join(', '), same.length ? `${andList(same)} about the same` : ''].filter(Boolean).join('; ');
}

// ------------------------------------------------------------------ at a glance

/**
 * Where the material's typical values stand among every material's (material-stats.js propertyProfile rows), by quarter,
 * and how many products they rest on.
 */
export function glanceFindings(name, rows) {
  const known = rows.filter((r) => r.known && r.at);
  const label = (r) => lower(r.h.labels.plain);
  const high = known.filter((r) => r.at.pct >= 75), low = known.filter((r) => r.at.pct <= 25);
  const are = (xs) => (xs.length === 1 ? 'is' : 'are');
  const out = [];
  if (high.length) out.push(`Against every other material on file, ${name}'s typical ${andList(high.map(label))} ${are(high)} in the top quarter.`);
  if (low.length) out.push(`${high.length ? 'Its' : `Against every other material on file, ${name}'s`} typical ${andList(low.map(label))} ${are(low)} in the bottom quarter.`);
  const mid = known.length - high.length - low.length;
  if (mid && (high.length || low.length)) out.push(`${mid === 1 ? 'Its other key property sits' : `Its other ${mid} key properties sit`} in the middle half.`);
  else if (mid) out.push(`Against every other material on file, ${name}'s typical values all sit in the middle half.`);
  if (known.length < rows.length) {
    const none = rows.length - known.length;
    out.push(`${known.length ? `Only ${known.length} of its ${rows.length} key properties have` : 'None of its key properties has'} a typical value. The other ${none === 1 ? 'is' : `${none} are`} not published, or not on a comparable basis.`);
  } else if (known.length) {
    const ns = known.map((r) => r.n);
    const fewest = known.filter((r) => r.n === Math.min(...ns));
    out.push(`Each typical value rests on ${Math.min(...ns) === Math.max(...ns) ? plural(ns[0], 'product') : `${fmtNumber(Math.min(...ns))} to ${fmtNumber(Math.max(...ns))} products`}${Math.min(...ns) <= 6 && Math.min(...ns) !== Math.max(...ns) ? `, the fewest for ${andList(fewest.map(label))}` : ''}.`);
  }
  return out;
}

// ------------------------------------------------------------------ printing

/**
 * How a setting's counted windows agree, as a phrase with its quantifier first: "most products accept 230–255 °C";
 * `total` the material's products, said where fewer are counted (acceptSubject).
 */
function windowPhrase(pw, total) {
  if (!pw || !pw.n) return null;
  const counted = pw.windows.filter((w) => w.counted);
  if (pw.n === 1) return { q: 'one', text: `${windowText(counted[0].min, counted[0].max)} °C` };
  if (pw.every) return { q: acceptSubject('all', pw.n, total), text: span(pw.every) };
  if (pw.most) return { q: acceptSubject('most', pw.n, total), text: span(pw.most) };
  return { q: null, part: pw.n < total, text: `${acceptSubject(pw.peak.k, pw.n, total)} accept ${span(pw.peak)}` };
}

/**
 * The print findings: the nozzle and bed windows most products accept (material-stats.js printWindows), the heated
 * chamber, a hardened nozzle where one is needed, the drying schedule. At most four sentences.
 */
export function printFindings({ nozzle, bed, chamber, products, chamberOutside, limit, drying, hard, abrasive, dryingGate, outside = [] }) {
  const out = [];
  const n = windowPhrase(nozzle, products), b = windowPhrase(bed, products);
  const on = (p, where) => `${p.text} on the ${where}`;
  if (n && b && n.q && n.q === b.q && n.q !== 'one') out.push(`By their own or a shared sheet, ${n.q} accept ${on(n, 'nozzle')} and ${on(b, 'bed')}.`);
  else {
    for (const [p, where] of [[n, 'nozzle'], [b, 'bed']]) {
      if (!p) continue;
      if (p.q === 'one') {
        const pw = where === 'nozzle' ? nozzle : bed;
        const lows = pw.ends.filter((e) => e.min != null).map((e) => e.min), highs = pw.ends.filter((e) => e.max != null).map((e) => e.max);
        const span1 = (xs) => (Math.min(...xs) === Math.max(...xs) ? `${fmtNumber(xs[0])} °C` : `${fmtNumber(Math.min(...xs))} to ${fmtNumber(Math.max(...xs))} °C`);
        const ends = [lows.length ? `${lows.length === 1 ? 'one gives' : `${lows.length} give`} only a lowest setting, ${span1(lows)}` : null,
          highs.length ? `${highs.length === 1 ? 'one gives' : `${highs.length} give`} only a highest, ${span1(highs)}` : null].filter(Boolean);
        out.push(`One product gives a ${where} window, ${p.text}${ends.length ? `, and ${andList(ends)}` : ''}.`);
      }
      else if (p.q) out.push(`By their own or a shared sheet, ${p.q} accept ${on(p, where)}.`);
      else out.push(`No ${where} temperature suits more than half the ${p.part ? 'counted ' : ''}products: at most ${p.text}.`);
    }
  }
  // Nozzle and bed settings above the H2C's limits (the build's own gate verdicts), said where any product asks for more.
  const over = (outside ?? []).filter((a) => a.axis !== 'chamber' && a.list.length);
  if (over.length) {
    const said = over.map((a, i) => (i ? `${a.list.length === products ? 'all' : a.list.length} for more ${a.axis} heat than its ${fmtNumber(a.limit)} °C`
      : `${a.list.length === products ? `All ${products} products ask` : `${a.list.length} of ${plural(products, 'product')} ask`} for more ${a.axis} heat than the H2C's ${fmtNumber(a.limit)} °C`));
    out.push(`${said.join(', and ')}.`);
  }
  // The heated chamber: how many need none, by where that was read, and what those whose sheets give one ask for.
  const none = (chamber?.states.get('not-required') ?? 0) + (chamber?.states.get('ambient') ?? 0);
  const noneFrom = ['not-required', 'ambient'].map((k) => chamber?.stateOrigins.get(k) ?? {}).reduce((a, o) => ({ own: a.own + (o.own ?? 0), twin: a.twin + (o.twin ?? 0), guide: a.guide + (o.guide ?? 0) }), { own: 0, twin: 0, guide: 0 });
  const given = chamber?.n ?? 0;
  if (chamber && none === products && !given) out.push(`None of its ${plural(products, 'product')} needs a heated chamber${basisTail(noneFrom, none)}.`);
  else if (chamber && (none || given)) {
    if (none) out.push(`${none} of ${plural(products, 'product')} ${none === 1 ? 'needs' : 'need'} no heated chamber${basisTail(noneFrom, none)}.`);
    if (given) {
      const ask = chamber.most && given > 1 ? `mostly ${span(chamber.most)}` : given === 1 ? `${windowText(chamber.windows.find((w) => w.counted).min, chamber.windows.find((w) => w.counted).max)} °C` : `${span(chamber.peak)} for ${chamber.peak.k} of them`;
      out.push(`${given === 1 ? 'The one whose sheet gives a chamber temperature asks for' : `The ${given} whose sheets give a chamber temperature ask for`} ${ask}${chamberOutside ? `, and ${chamberOutside === 1 ? 'one goes' : `${chamberOutside} go`} above the H2C's ${fmtNumber(limit)} °C` : ''}.`);
    }
  }
  // A hardened nozzle, said only where some product needs one.
  if (hard?.need) out.push(hard.need === hard.total ? `${hard.total === 1 ? 'Its product needs' : `All ${hard.total} products need`} a hardened nozzle.` : `${hard.need} of ${hard.total} products need a hardened nozzle.`);
  else if (abrasive === 'requires-hardened') out.push('Its filler calls for a hardened nozzle.');
  // Drying: the typical schedule of the products whose own or shared sheet gives one.
  const t = drying?.temps, h = drying?.hours;
  if (t?.n > 1) out.push(`Products whose own or shared sheet gives a drying schedule typically dry at ${fmtNumber(t.median)} °C${h?.n ? ` for ${fmtNumber(h.median)} h` : ''}.`);
  else if (t?.n === 1) out.push(`One product's sheet gives a drying schedule: ${fmtNumber(t.median)} °C${h?.n ? ` for ${fmtNumber(h.median)} h` : ''}.`);
  else if (dryingGate === 'not-needed') out.push('Its sources say drying is not needed.');
  return out.slice(0, 4);
}

// ------------------------------------------------------------------ strength and stiffness

/**
 * The strength findings: the typical flat (XY) tensile strength and modulus, what is kept across the layers (Z, the
 * median share of products that publish both), and the typical notched impact.
 */
export function strengthFindings(m, { shares, hs }) {
  const s = (k) => m.summary?.[k];
  const v = (k, unit) => fmtNumber(s(k).median, unit);
  const out = [];
  const st = s('tensileStrengthXY'), mo = s('tensileModulusXY');
  if (st?.n && mo?.n) out.push(`Printed flat (XY), typical tensile strength is ${v('tensileStrengthXY', 'MPa')} and modulus ${v('tensileModulusXY', 'GPa')}.`);
  else if (st?.n) out.push(`Printed flat (XY), typical tensile strength is ${v('tensileStrengthXY', 'MPa')}.`);
  else if (st?.asPublished?.n) {
    // Nothing compared: what the sheets give, as published, said once with why it is not compared.
    const h = hs.find((x) => x.key === 'tensileStrengthXY');
    const said = [['tensileStrengthXY', 'a tensile strength', 'MPa'], ['tensileModulusXY', 'a modulus', 'GPa'], ['elongationXY', 'an elongation at break', '%']]
      .map(([k, words, unit]) => [s(k)?.n ? null : s(k)?.asPublished, words, unit]).filter(([a]) => a?.n)
      .map(([a, words, unit], i) => `${i ? a.n : plural(a.n, 'product')} ${i ? '' : a.n === 1 ? 'gives ' : 'give '}${words} of ${a.min === a.max ? fmtNumber(a.min, unit) : `${fmtNumber(a.min)} to ${fmtNumber(a.max, unit)}`}`);
    out.push(`No product states ${h ? asPublishedWords(h).replace(/^no stated /, 'the ') : 'the orientation'} of its tensile bars, so none is compared.`);
    out.push(`As published, ${andList(said)}.`);
  }
  const strength = shares.find((x) => x.key === 'tensileStrengthXY');
  if (strength?.n > 1) {
    const words = fractionWords(strength.median);
    out.push(/%/.test(words) ? `Across the layers, expect ${words} of the flat strength, the median of ${strength.n} products that publish both.`
      : `Across the layers, expect ${words} of the flat strength: ${pc(strength.median)} at the median of ${strength.n} products that publish both.`);
  }
  else if (strength?.n === 1) out.push(`One product publishes both orientations. Its strength across the layers is ${pc(strength.median)} of its flat strength.`);
  else if (s('tensileStrengthZ')?.n) out.push(`Across the layers (Z), typical tensile strength is ${v('tensileStrengthZ', 'MPa')}.`);
  const more = shares.filter((x) => x.key !== 'tensileStrengthXY' && x.n > 1 && /^tensile|^elongation/.test(x.key));
  if (more.length && strength?.n > 1) out.push(`${cap(andList(more.map((x, i) => `${i ? '' : 'the '}${lower(x.name)} ${i ? '' : 'keeps '}${pc(x.median)}`)))}.`);
  const impact = ['charpyNotched', 'izodNotched'].filter((k) => s(k)?.n);
  if (impact.length) {
    const name = (k, i) => { const p = hs.find((x) => x.key === k)?.labels.plain ?? k; return i ? lower(p).replace(/ impact$/, '') : p; };
    const one = (k, i) => (s(k).n > 1 ? `${name(k, i)} ${i ? '' : 'is typically '}${v(k, 'kJ/m²')}, from ${i ? fmtNumber(s(k).n) : plural(s(k).n, 'product')}`
      : `${name(k, i)} ${i ? '' : 'is '}${v(k, 'kJ/m²')}, from ${i ? 'one' : 'one product'}`);
    out.push(`${impact.map(one).join(', and ')}.`);
  }
  return out.slice(0, 4);
}

// ------------------------------------------------------------------ heat

/** The heat findings from the ladder's rows (material-stats.js heatLadder): HDT at each load, the glass transition, the rest as published. */
export function heatFindings(rows, { name = null, amorphous = null } = {}) {
  const out = [];
  const typical = (r) => fmtNumber(r.summary.median, '°C');
  const across = (r, first) => (r.summary.n === 1 ? 'from one product' : `across ${first ? plural(r.summary.n, 'product') : fmtNumber(r.summary.n)}`);
  // HDT at each load, lightest first, with how many products each rests on, and the glass transition beside them.
  const hdt = rows.filter((r) => r.h?.loadMPa != null).sort((a, b) => a.h.loadMPa - b.h.loadMPa);
  const tg = rows.find((r) => r.h && r.h.loadMPa == null);
  if (hdt.length) {
    const many = hdt.some((r) => r.summary.n > 1);
    out.push(`HDT is ${many ? 'typically ' : ''}${andList(hdt.map((r, i) => `${typical(r)} at ${fmtNumber(r.h.loadMPa)} MPa ${across(r, !i)}`))}${tg ? `, with the glass transition at ${typical(tg)} ${across(tg, false)}` : ''}.`);
  } else if (tg) out.push(tg.summary.n === 1 ? `One product gives a glass transition of ${typical(tg)}.` : `The glass transition is typically ${typical(tg)}, across ${plural(tg.summary.n, 'product')}.`);
  // Two loads within 3 °C of each other: said with why, where the polymer's data says it prints amorphous
  // (polymers[].morphology, .asPrinted), and only there.
  if (hdt.length === 2 && tg && amorphous === true && Math.abs(hdt[0].summary.median - hdt[1].summary.median) <= 3) {
    out.push(`As printed, ${name} solidifies amorphous, so it softens near its glass transition (${typical(tg)}) and the two loads give nearly the same HDT.`);
  }
  const pub = rows.filter((r) => !r.compared);
  if (pub.length) {
    const say = (r, i) => `${inText(r.label)} ${r.summary.n === 1 ? `is ${typical(r)}, from one product` : `${i ? '' : 'is '}typically ${typical(r)}`}`;
    out.push(`As published, ${andList(pub.map(say))}.`);
  }
  return out;
}

// ------------------------------------------------------------------ the other sections

/** Physical: the density, and which other properties are published, by how many products. */
export function physicalFindings(m, others) {
  const out = [];
  const d = m.summary?.density;
  if (d?.n) out.push(d.n === 1 ? `One product gives a density of ${fmtNumber(d.median, 'kg/m³')}.`
    : `Density is typically ${fmtNumber(d.median, 'kg/m³')}, the median of ${plural(d.n, 'product')}${d.twins ? `, ${d.twins === 1 ? 'one of them from a sheet it shares' : `${d.twins} of them from a sheet they share`}` : ''}.`);
  const named = others.filter((o) => o.property !== 'Density').sort((a, b) => b.products - a.products).slice(0, 3);
  if (named.length) out.push(`${cap(andList(named.map((o) => lower(o.label))))} ${named.length === 1 ? 'is' : 'are'} published too, each under its own sheet's test conditions.`);
  return out;
}

/**
 * Chemicals and the environment: for the categories with the most statements, the verdict most of them state where
 * two thirds or more agree; then that makers rarely give the conditions.
 */
export function environmentFindings(f, polymer, makerOf) {
  const out = [];
  const telling = (v) => !['narrative', 'no-data'].includes(v);
  // Makers, not statements: one maker's sheet often says the same of each of its products, so a statement count would
  // weigh a maker by how many products it sells. A maker is the product's (grades[].manufacturer), else the document's
  // publisher.
  const makers = (records) => new Set(records.map(makerOf).filter(Boolean));
  const all = makers(f.rows.flatMap((r) => r.records));
  const statements = f.rows.reduce((k, r) => k + r.total, 0);
  if (all.size) out.push(`${all.size === 1 ? 'One maker or publisher speaks' : `${all.size} makers and other publishers speak`} to ${plural(f.rows.length, 'topic')}, in ${plural(statements, 'statement')}. Counted by maker, since one maker often says the same of each of its products:`);
  const top = [...f.rows].filter((r) => r.filterable).map((r) => ({ r, n: makers(r.records).size })).filter((x) => x.n > 1).sort((a, b) => b.n - a.n).slice(0, 4);
  const said = [];
  for (const { r, n } of top) {
    const by = new Map();
    for (const e of r.records) { if (!telling(e.verdict)) continue; const k = makerOf(e); if (!k) continue; (by.get(e.verdict) ?? by.set(e.verdict, new Set()).get(e.verdict)).add(k); }
    const [v, set] = [...by].sort((a, b) => b[1].size - a[1].size)[0] ?? [];
    if (v && set.size / n >= 2 / 3) said.push({ v, text: `${set.size} of ${n} ${said.some((x) => x.v === v) ? 'on' : 'makers that speak to'} ${lower(r.label)}` });
    if (said.length === 3) break;
  }
  // Categories that say the same are said together: "5 of 7 makers that speak to acid resistance, and 4 of 5 on alkali
  // resistance, say not resistant".
  const verdicts = [...new Set(said.map((x) => x.v))];
  const clauses = verdicts.map((v) => { const xs = said.filter((x) => x.v === v); return `${xs.length > 1 ? `${xs.slice(0, -1).map((x) => x.text).join(', ')}, and ${xs.at(-1).text},` : xs[0].text} say ${envVerdictWords(v)}`; });
  if (clauses.length) for (const x of clauses.slice(0, 2)) out.push(`${cap(x)}.`);
  else if (all.size) out[out.length - 1] = out.at(-1).replace(/ Counted by maker.*$/, '');
  if (f.rows.length) out.push('Makers rarely give the concentration, temperature or duration, so these are indications, not design data.');
  if (f.polymer.length) out.push(`${f.rows.length ? 'Where no document tests these products' : 'No document tests these products here'}, reference data for plain ${polymer} resin is shown apart. It never stands for the products.`);
  return out;
}

/** What makers say: how many products have statements, and the engineering topics most makers speak to. */
export function makersFindings(f, open) {
  const out = [`${f.collected} of ${plural(f.total, 'product')} have statements from their makers beyond the numbers, in the makers' own words, not test results.`];
  const top = [...open].filter((t) => t.makers > 1).sort((a, b) => b.makers - a.makers).slice(0, 3);
  if (top.length > 1) out.push(`On how it prints and behaves, most makers speak to ${andList(top.map((t) => lower(t.topic)))}: ${andList(top.map((t) => fmtNumber(t.makers)))} makers.`);
  else if (top.length) out.push(`On how it prints and behaves, most makers speak to ${lower(top[0].topic)}: ${top[0].makers} makers.`);
  return out;
}

/** Price: the typical price per kilogram, its middle half, and how many products have one. */
export function priceFindings(s, priced, products, converted, apart = 0) {
  const out = [];
  if (s?.n > 1) {
    out.push(`Typically ${fmtNumber(s.median, 'CAD/kg')}, the median of ${plural(s.n, 'product')}${s.q1 != null ? `, with the middle half at ${fmtNumber(s.q1)}–${fmtNumber(s.q3, 'CAD/kg')}` : ''}.`);
    out.push(`${priced} of ${plural(products, 'product')} ${priced === 1 ? 'has' : 'have'} a regular price in the sample, never a sale price${apart ? `; ${apart === 1 ? 'one is a special formulation' : `${apart} are special formulations`}, set apart from the median` : ''}.`);
  } else if (s?.n === 1) out.push(`One of its ${plural(products, 'product')} has a regular price in the sample: ${fmtNumber(s.median, 'CAD/kg')}.`);
  if (converted) out.push(converted);
  return out;
}
