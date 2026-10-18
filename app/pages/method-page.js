// "How the numbers are worked out": the one page that says how every material page reads its data, written once
// instead of on each of the 76 pages (docs/audits/2026-10-17-pages-reimagined, content/PROPOSAL.md). Each figure's fold
// and each section's note links to its part here by anchor: #typical, #compared, #evidence, #alternatives, #maps,
// #products, #layers, #flexural, #impact, #heat, #temperatures, #settings, #standout, #prices, #estimates, #sources.
// Every number it states comes from the compiled database (the H2C's limits, the price sample, the estimate model's
// levels) or is a rule of the pages' own display code; it decides nothing.

import { esc } from './html.js';
import { documentShell, BRAND } from './shell.js';
import { h2cLimit } from '../js/ui/labels.js';
import { fmtNumber } from '../js/ui/format.js';
import { PAGES_DIR } from '../js/ui/page-rule.js';
import { dayWords } from './findings.js';

/** The page's parts, in reading order: an anchor, a title and its paragraphs (plain text, escaped when written). */
function parts(db) {
  const lim = (axis) => fmtNumber(h2cLimit(axis));
  const ps = db.meta.priceSample;
  const levels = db.materials.map((m) => Object.values(m.headline ?? {}).find((h) => h?.estimate?.levels)?.estimate.levels).find(Boolean) ?? { likely: 0.8, plausible: 0.95 };
  const pct = (p) => `${Math.round(p * 100)} %`;
  return [
    ['typical', 'Typical values and the middle half', [
      'A material is shown across its products. Each figure on its page is the median of the products that publish the property on the basis it is defined at (an orientation, a test load, a notch, room temperature): half of them publish more, half less. Beside it is the middle half of those products, from the lower to the upper quartile, given once four products or more publish the property; with two or three, their lowest and highest; with one, that product\'s value.',
      'A product with an added filler or additive its material\'s name does not describe (a metal, wood or glow powder in a PLA, a lightweight foaming additive) is drawn but kept out of the median, and so, for notched impact, is a product its maker sells as toughened or impact-modified. "Sold as toughened" is the maker\'s statement, not a test result.',
      'The Overview prints values to a reader\'s precision: whole degrees, whole dollars per kilogram from 10, whole per cent from 10, otherwise three significant figures. Each product\'s card on the Products page prints every value exactly as its document publishes it.',
    ]],
    ['compared', 'What is ranked, and what is shown as published', [
      'Printed parts are anisotropic, so a value means little without the way its bar was built and tested. A value is ranked against other products and materials only where its document states what the property is defined at: the bar\'s orientation for a tensile or flexural test, the load for heat deflection, the notch for an impact test. A value whose document leaves that unstated is shown as published, drawn hollow, and left out of the median: it may be a moulded bar, or a bar printed another way.',
      'A bar measured after annealing is drawn as a square and kept, where its product publishes no as-printed value. A value measured after moisture conditioning, on a film or a filament strand, on a moulded bar, or below 100 % infill is on its product\'s card, not drawn.',
    ]],
    ['evidence', 'How well documented', [
      'Under the key properties, one line says how much the material\'s numbers rest on. Well documented: each key property rests on five products or more. Partly documented: some rest on fewer, or are not published. Thinly documented: three products or fewer, or fewer than two key properties ranked; the line then names the documents the values come from, and a figure there should be read as one or two sheets\' word.',
    ]],
    ['alternatives', 'The alternatives', [
      'Each material is set against five others an engineer would weigh it against, chosen by one rule, never by hand. Of the materials with a page, leaving out the special-effect, support and anti-static materials and, for a rigid material, the flexible ones: first up to two of the same base polymer, the other fibre state first (PLA-CF for PLA); then the two with the most products, of the same fibre state, whose median HDT at 0.45 MPa lies within 20 °C or 20 % of this material\'s; then the one with the most products above that; then the nearest in HDT, to five. A material beyond the H2C\'s capability is never an alternative.',
      'The first figure draws each key property of the material and its alternatives on the property\'s own scale: the hairline is a material\'s products from lowest to highest, the bar their middle half, the tick their median. The row of ticks above is every material\'s median.',
    ]],
    ['maps', 'Among all materials', [
      'Two maps place the material among every other: tensile strength against tensile modulus, the chart a materials engineer reads first, and HDT at 0.45 MPa against price. Each grey point is another material\'s medians. The frames are the same on every page of their kind (rigid or flexible), so a reader learns them once; a few materials far beyond them are pinned to the edge. Logarithmic axes show equal ratios as equal steps.',
    ]],
    ['products', 'Each product\'s values', [
      'A strip per property draws one mark per product on the property\'s own scale. Filled marks are ranked; a hollow mark is a value published without its orientation or load; a square was measured after annealing; a diamond is a product with an added filler or additive; the claim colour marks a product sold as toughened. The band is the middle half of the products ranked, the line their median. Hovering a product finds it in every figure on the page, and selecting it opens its card on the Products page.',
    ]],
    ['layers', 'Flat and across the layers', [
      'A tensile bar printed flat (XY) is pulled along its printed lines. A bar printed upright (Z) is pulled across its layers, so its result is how well the layers hold together, and is usually lower. Both are one test (ISO 527 or ASTM D638) on bars built differently: an XY value is never converted into a Z value. A bar labelled XZ or ZX is taken as Z only where its sheet says or shows it stood upright.',
      'Z as a share of XY is worked out product by product, only where one document gives both values in one state; the figure shows each such product and the median share, and beside it the median share of each alternative.',
    ]],
    ['flexural', 'Bending and tension', [
      'A flexural bar (ISO 178, ASTM D790) rests on two supports and is pressed in the middle, so one face is stretched and the other compressed. The stress at the outer face is worked out from elastic beam theory, and a printed bar departs from it: bending loads its outer perimeters most and its infill and layer bonds least, so its flexural and tensile moduli can differ by tens of per cent either way. Flexural strength is usually above tensile strength, for unfilled plastics often by a third to three quarters. Where the bar does not break, sheets report the stress at 3.5 % or 5 % strain. Neither value converts into the other.',
    ]],
    ['impact', 'Notched Charpy and Izod', [
      'Notched Charpy (ISO 179) supports the bar at both ends and strikes it in the middle; notched Izod (ISO 180) clamps it upright at one end and strikes its free end. Both report the energy absorbed per area of the notched section, in kJ/m², but the bars, notches and supports differ, so a Charpy value is not an Izod value and neither is converted. Izod in J/m (ASTM D256) is energy per metre of notch width, and is on the product\'s card, not drawn. An unnotched value is a different test again.',
    ]],
    ['heat', 'Heat deflection and the glass transition', [
      'Heat deflection temperature (ISO 75, ASTM D648) is the temperature at which a loaded bar, heated steadily, bends by a set amount, under 0.45 MPa or under 1.8 MPa; the heavier load gives the lower temperature. The glass transition (Tg), usually measured by DSC on a few milligrams with no load, is where the polymer turns from glassy to rubbery: an amorphous plastic such as PLA or PETG loses its stiffness there, so its HDT sits just below Tg at either load, while a semicrystalline one can carry a light load well above it. None of the three is a service temperature. Vicat softening and melting are shown as each sheet publishes them, under its own method.',
    ]],
    ['temperatures', 'Every temperature on one axis', [
      `One axis holds the temperatures a print needs and those a part meets. For the nozzle, the bed and the heated chamber, each degree is shaded by how many of the products whose own data sheet, or one they share, gives a window accept it, and the span more than half accept is outlined; the H2C's limit closes the row (nozzle ${lim('nozzle')} °C, bed ${lim('bed')} °C, heated chamber ${lim('chamber')} °C). A window read from the Bambu Lab Filament Guide is drawn but not shaded: the guide speaks for every product that reads it. Below, HDT at both loads, the glass transition, and Vicat and melting as published.`,
    ]],
    ['settings', 'Print settings and where they come from', [
      'Each product\'s settings come from its own data sheet where it gives them. Where it is silent, they come from a data sheet it shares with another product (two products sold from one formulation, named on each), and then from the Bambu Lab Filament Guide, its column for the product\'s type, where the guide has one. A product with an added filler or additive does not read the guide. "Most products" is the span more than half of the products that give a window accept.',
    ]],
    ['standout', 'Products that stand out', [
      'On a material with six products or more, the products that hold the most documented record, the highest tensile strength flat and across the layers, the most strength kept across the layers, the highest HDT at 0.45 MPa and notched Charpy, and the lowest price are named, each for one published value. A product with an added filler or additive is not named. These are published values, not recommendations: the selector judges each product against a part\'s requirements. In Thermal properties, products whose HDT lies well above the rest (past one and a half times the middle half above the upper quartile, and at least 15 % above the median) are named with their state.',
    ]],
    ['prices', 'Prices', [
      ps ? `Prices are regular prices, never sale prices, before tax and shipping, for the exact product at 1.75 mm, sampled from ${ps.canadianRetailers} Canadian shops and ${ps.foreignSellers} foreign shops between ${dayWords(ps.from)} and ${dayWords(ps.to)}.` : 'Prices are regular prices, never sale prices, before tax and shipping, for the exact product at 1.75 mm.',
      'A product\'s price per kilogram is the median of its listings, one per seller: its Canadian ones where it has any, else a foreign one converted at the Bank of Canada\'s rate, with the VAT its page states taken off, and marked as converted. A material\'s price is the median of its products\'. A foreign price says nothing about shipping to Canada, duty or Canadian stock.',
    ]],
    ['estimates', 'Estimated values', [
      `Where no product publishes a key property on the basis it is ranked at, the selector estimates it from the products' related values (another endpoint, orientation, load or specimen, and resin data sheets) and from similar materials, with one statistical model per property. Tested by hiding known values and predicting them back, the likely range held the true value ${pct(levels.likely)} of the time and the plausible range ${pct(levels.plausible)}. An estimate is a range, never a product's value; it never makes a material pass a requirement, and nothing else on a page rests on one.`,
    ]],
    ['sources', 'Sources and known gaps', [
      `Every value traces to a document: a data sheet, a maker's product page or guide, a safety data sheet, Bambu Lab's documentation or a study, each fetched, fingerprinted and dated. Each product's card on the Products page names the document and page of each value and links to the original. A known gap is a reviewer's finding about what the documents do not settle, in their words; a property no document publishes is a gap, never a zero or a low value.`,
      `Data-sheet values describe test specimens, not design allowables. Confirm the exact product, its conditioning and your part's geometry with your own print.`,
    ]],
  ];
}

/** The method page: `{ path: 'materials/method.html', html }`. */
export function renderMethodPage(db, env = {}) {
  const list = parts(db);
  const body = `<article class="method">
<header class="method-head"><h1>How the numbers are worked out</h1>
<p class="sec-open">${esc(`How every material page in ${BRAND} reads its data: what a typical value is, what is ranked and what is shown as published, how the figures are drawn and where each number comes from. It is the same for every material, so it is said here once.`)}</p></header>
${list.map(([id, title, paras]) => `<section class="method-part" id="${esc(id)}" data-section="method-${esc(id)}"><h2>${esc(title)}</h2>${paras.map((p) => `<p>${esc(p)}</p>`).join('')}</section>`).join('\n')}
</article>`;
  const html = documentShell({
    kind: 'method',
    title: `How the numbers are worked out: ${BRAND}`,
    description: `How ${BRAND}'s material pages work out and draw their numbers: typical values, what is ranked, the alternatives, the figures, print settings, prices and estimates.`,
    stamps: env.stamps ?? { release: db.meta.release?.id ?? 'unidentified', snapshot: db.meta.snapshot, build: db.meta.build },
    crumbs: [{ href: 'index.html', words: 'Materials' }, { href: 'method.html', words: 'How the numbers are worked out' }],
    sections: list.map(([id, title]) => ({ id, title })),
    tabs: { index: 'index.html' },
    returnHref: env.selectorHref ?? null,
    body,
  });
  return { path: `${PAGES_DIR}/method.html`, html };
}
