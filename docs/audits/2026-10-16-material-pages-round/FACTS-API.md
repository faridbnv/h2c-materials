# The shared facts layer: its API (material pages round, step 1)

> **Historical record** (2026-10-16): written for one round, at step 1. It describes the modules as they were then; the
> code is the authority, and names may have changed since. For where things stand now, read the
> [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** The material drawer (`app/js/ui/detail.js`) and the material pages (step 2, `app/pages/`) show one
> material's facts, and must never disagree. Everything the drawer chose, counted, grouped and summarised before it
> wrote HTML now lives in **`app/js/ui/material-facts.js`** (data, no words, no markup); the plain sentences both will
> say are in **`material-words.js`**; the words for stored codes are in **`labels.js`**; the one scale rule is
> **`scales.js`**; the threshold for having a page is **`page-rule.js`**. The drawer was moved onto them with its HTML
> unchanged by one byte (the golden check below). A page renderer and a test writer can work from this file alone.

## 1. Before you call anything

The modules are plain ES modules with no DOM and no browser global; they run in Node and in the page. Three pieces of
module state must be set from the database first, exactly as `app/js/main.js` sets them at start-up:

```js
import { useRegistry } from '../js/ui/registry.js';
import { setH2cBaseline, setEnvironmentLabels } from '../js/ui/labels.js';

useRegistry(db.registry);                              // REGISTRY: headlines, comparisons, properties (most functions read it)
setH2cBaseline(db.meta.h2cBaseline);                   // h2cLimit(): the H2C's nozzle, bed and chamber limits (printFacts, printCounts)
setEnvironmentLabels(db.meta.environmentCategories);   // envLabel()/envNoun() (describeConstraint; not read by the facts layer itself)
```

Call all three every time a renderer starts, in this order, before `materialContext`. Without `useRegistry` every
headline list is empty; without `setH2cBaseline` the limits fall back to 350, 120 and 65 °C, which are today's but are
not read from the build. `db` is `dist/db.json` as the build compiles it, parsed; nothing here changes it.

**Escaping.** Every word function returns plain text, unescaped. A renderer escapes it (`esc` in `format.js`). The
drawer inserts a few of them unescaped where it always had (`sitesLine`, `makersSilentWords`, `TOUGHENED_NOTE`,
`TOUGHENED_NOTE_SHORT`, `onFileWords`, `printCountWords`): they hold no data from a source, only counts and fixed
words, and escaping their apostrophes and quotes would have changed the drawer's bytes. A page escapes them.

**Layering.** `text.js` ← `labels.js` ← `format.js` ← `material-words.js`; `material-facts.js` reads `registry.js`,
`labels.js` (the H2C's limits, `materialName`), `scales.js`, `print-spread.js`, `text.js` and the engine's
`coverage.js`. Facts and words do not import each other: where a word function needs a product's name, the facts
carry it (`name` fields). Nothing in `app/js/engine` imports from `app/js/ui`. `app/pages` may import all of these;
none of them imports `app/pages`.

## 2. The material context: `materialContext`

```js
materialContext(db, materialId, { ctx, evaluation, scenario, showEstimates, highlight, highlightSource } = {}) → c | null
```

One material's facts: the object the drawer calls `c` and every function below reads. **null** for a family entry or an
unknown ID. A page calls `materialContext(db, id, { showEstimates: true })`; the drawer passes main.js's `ctx`, the
engine's evaluation and the scenario.

| Option | Meaning | Default |
|---|---|---|
| `ctx` | The selector's context (main.js `buildContext`): its `measurementsByMaterial`, `evidenceByMaterial`, `polymerEvidenceByMaterial`, `coverageByMaterial`, `sourceById`, `evidenceById` are read where present. A context without `polymerEvidenceByMaterial` (the tests') gives `poly: []` | none: the database's own groups (`indexDb`), the same as main.js builds |
| `evaluation` | The engine's answer for this material (`runSelection(...).evaluations` entry) | `null` |
| `scenario` | The question: `unknownPolicy` and `decisions` are read | none |
| `showEstimates` | Whether estimates are shown | `!!ctx?.showEstimates` (false without a context) |
| `highlight`, `highlightSource` | A measurement ID and a source ID the reader asked for (the drawer marks them) | `null` |

Keys of `c` (all the database's own objects, never copies):

| Key | What it holds |
|---|---|
| `m` | the material (`materials[]`) |
| `ms` | its measurements, database order |
| `ev` | its environment statements (`evidence[]`) |
| `poly` | the resin's reference records (`polymerEvidence[]`, D64) |
| `cov` | its coverage rows, without the superseded ones |
| `profiles`, `grades`, `prices` | its print profiles, grades (products and `-R#` reference grades) and shop listings, without the retired |
| `evaluation` | as passed, or `null` |
| `summary` | `evidenceSummary(m, db)` (engine/coverage.js): `{ measurements, numericMeasurements, quarantined, grades, exactGradeEvidence, evidenceRecords, gaps, conflicts, limitedComparability }` |
| `db` | the database |
| `guide` | its Bambu Lab Filament Guide row (`printGuide[]`, D88), or `null` |
| `tested` | `!!evaluation?.results.length`: requirements were set |
| `highlight`, `highlightSource` | as passed |
| `showEstimates` | as resolved above |
| `policy` | `scenario?.unknownPolicy ?? null` |
| `sourceById`, `evidenceById`, `materialById`, `gradeById` | lookups over the whole database |
| `chosen` | Set of the grade IDs in `scenario.decisions` |
| `msById` | Map of this material's measurements by ID (not the database's: a twin's sibling is in the same material) |
| `knowHowById` | Map of every maker statement (`knowHow[]`) by ID |
| `documents` | `documents(c)` |
| `counts` | `tabCounts(c)` |

With no scenario: `tested` false, `evaluation` null, `chosen` empty, `policy` null.

## 3. `app/js/ui/material-facts.js`

Pure data: no markup, no sentences. Every function reads compiled fields only; none decides anything.

### Products, documents and groups

| Export | Contract |
|---|---|
| `stated(v)` | Truthy where a stored cell states something: not empty, and not a missing state (`Not published`, `Not applicable`, `Not stated`, `Not recorded`, `N/A`, any case, at the start). Re-exported from `text.js` |
| `isProduct(g)` | `true` for a product, `false` for a reference grade (ID ending `-R<n>`) |
| `productName(g)` | The drawer's `gradeName`, verbatim: `grades[].product`, prefixed with `grades[].manufacturer` where the product name does not start with it; `''` where neither is stated or `g` is missing |
| `productNameOrId(g)` | `productName(g) \|\| g.id`: what a dot or a list names a product by |
| `sourceName(s, id)` | `sources[].publisher` and `.title` (the stated ones) joined by ", ", else `id` |
| `originalOf(s)` | `{ url, kind: 'PDF' \| 'web page', local: false }` for an http(s) `sources[].url`; `{ url, kind: null, local: true }` for any other stated path (said, never linked); `null` where none |
| `groupBy(list, keyOf, first = null)` | `[[key, items], …]` in first-appearance order, a missing key as `'Not recorded'`, the group `first` moved to the front |
| `groupByMaker(grades, first)` | `groupBy` on `grades[].manufacturer` (also re-exported by detail.js) |
| `leadMaker(m, c)` | The maker whose product is most often the material's typical product (`materials[].headline[key].typical.gradeId`, selectable headlines only), ties by name; `null` where none |
| `indexDb(db)` | Cached per database object (WeakMap): `{ materialById, gradeById, sourceById, evidenceById, knowHowById, measurementsByMaterial, evidenceByMaterial, polymerEvidenceByMaterial, coverageByMaterial, profilesByMaterial, gradesByMaterial, pricesByMaterial, knowHowByGrade, guideByMaterial }`; the `…ByMaterial` lists in database order, profiles, grades and prices without the retired; `guideByMaterial` the first guide row naming the material. A caller that changes `db` after the first call must pass a new object |
| `materialContext(…)` | Section 2 |
| `documents(c)` | `Map(sourceId → { ms: [measurements], profiles: n, statements: n, environment: n, guide: bool, grades: Set(gradeId) })`, every document the material's records cite, in the order first cited: measurements, then profiles (`sourceId` and `h2cSourceId`), then maker statements of its own grades (`knowHow[]`, database order), then environment statements, then the guide's source |
| `productDocuments(c, g)` | The source IDs of `c.documents` that cover grade `g`, in Sources' order |
| `tabCounts(c)` | `{ Overview: null, Grades, Mechanical, Thermal, Printing, Environment, Price, Evidence }`: grades (products and reference grades); measurement records of the tab's properties (named-without-value ones included); profiles; `ev.length + poly.length`; listings; documents. These are the drawer's tab counts |
| `identity(m, c)` | `{ primary, aka, fullName, base, reinforcement, products, makers, h2cStatus, excluded }`: `materialName(m.name)` split; `m.fullName` only where stated and not the name; `m.basePolymer` unless it is the name, else `m.family`; `m.facets.reinforcement.value`; products (not reference grades) and their distinct stated makers. `material-words.js identityLine` says it |

### Measurements and their properties

| Export | Contract |
|---|---|
| `tabProperties(tab, m)` | The registered property names of a tab's domain (`'Mechanical'` → mechanical, anything else → thermal), registry order, that apply to the material (`propertyApplies`) and are not replaced |
| `COVERAGE_FOR_TAB` | Tab key → coverage domains whose rows say why it is empty |
| `GAP_STATUS` | Set of coverage statuses shown as known gaps |
| `emptyReasons(c, tab)` | `c.cov` rows of the tab's `COVERAGE_FOR_TAB` domains |
| `gapSplit(cov)` | `{ gaps: rows with a GAP_STATUS status, notes: the others not derived }` |
| `CONDITION_FIELDS`, `READER_FIELDS` | `[[label, field]]` of the conditions a sheet states once (post-processing, test temperature, print settings, notes); READER_FIELDS without notes |
| `isNamedOnly(x)` | A measurement that only names its property (`!numeric && !qualitative && dataStatus === 'Not published'`) |
| `largestFirst(a, b)` | Sort comparator: numeric first, larger value first |
| `measuredIn(c, tab)` | `{ properties, all, rows, named, absent, shown, gaps }` for Mechanical or Thermal: the tab's properties; their records; those with a value; those named only; properties no record names; properties with a value (registry order); the domain's own known gaps (not "Sparse properties") |
| `measurementFacts(x, c, { shared, compact })` | `{ x, more: [[label, text]], notes, value, operator, source, product }`: the reader conditions this record states where they differ from `shared` (`Map(field → words)` from `sourceBlockFacts`), `'not stated'` where it states none and the block does; `compact` keeps the first two; `notes` null where they are the block's; `value` `{ kind: 'number' }`, `{ kind: 'words', text }` (`raw.value` of a qualitative result) or `{ kind: 'status', status }` (`dataStatus`); `operator` `'>'`/`'<'` or null; `source` the `sources[]` row; `product` `productName` or null |
| `sourceBlockFacts(sid, d, c)` | For one entry of `documents(c)`: `{ sid, s, name, accessDate (stated or null), original (originalOf), entries, named, shared, sharedFields, exceptions, covers: [names], manyProducts, about, gave: { values (entries.length, or null where the document gave no measurement), profiles, statements, environment, guide } }`. A condition is `shared` where more than half the values, and at least two, state it in the same words |

### Family guidance behind a pointer (B14)

| Export | Contract |
|---|---|
| `EVIDENCE_POINTER` | `/\bQ\d{5}\b/g` |
| `resolvePointers(text, evidenceById)` | null where the text holds no pointer; else `{ records, unresolved: [ids], prose }` (also re-exported by detail.js) |
| `familyGuidanceFacts(m, c)` | `{ bestUses, limitations, goodFor, guidance, unresolved, owner(r), owners, ownLimitations }` from `m.bestUses` and `m.limitations`: each field's resolution; the records whose topic is Best uses, and the others; the pointers to nothing; the name of the material a record belongs to; those names in order; the material's own limitations text (`''` where none) |

### Comparisons drawn product by product (D133, D139, D140)

| Export | Contract |
|---|---|
| `spreadEntries(m, c, key)` | `[{ g, v, variant }]`: each of `m.gradeIds` (not retired) that has `grades[].headline[key]`, with that value `v` and whether it is a special formulation (its own `variant`, or a twin's variant sibling; none where every product is a variant). These are the products the build's spread counts |
| `TOUGHENED` | `'Toughened or impact-modified'`, the claim in `grades[].claims` |
| `soldToughened(g, v, c)` | Whether `g` (or the sibling whose sheet `v` reads, `v.from.origin === 'twin'`) claims TOUGHENED |
| `toughenedClaim(g, c)` | `{ claim, statement (knowHow row or null), where (source name and locator, words) }` for `g`'s own claim, or null |
| `dotMarks(h, e, c)` | A dot's marks: any of `'open'` (`v.level === 'as-published'`), `'annealed'` (`v.anneal`), `'variant'`, `'claimed'` (sold as toughened, on a headline with `toughened`); `[]` for a plain dot. The drawer's CSS classes are these joined by a space |
| `outOfMedian(h, e, s, c)` | Why a dot is out of its row's median: `'variant'`, `'as-published'`, `'toughened'` (only where `s.claimed.setApart`), or `null`. `s` is `materials[].summary[h.key]`. Words: `outOfMedianWords` |
| `shareOf(a, b, byKey, c)` | Z as a share of XY for headlines `a` and `b` of one property in two orientations: `[ratio]` per product whose two values are comparable, not variants, from one document, in one annealing state; `null` where none or the pair is not one property in two directions |
| `NOT_DRAWN_ORDER` | The reason codes in the order `assess` asks them. **The other copy is `ASSESS_ORDER` in `build/src/products.js`**, which cannot be bundled; this one adds `'resin'` and lacks `'notConditioned'` and `'notAnnealed'` (they arise only when assess is asked about a state). `test/drawer-comparisons.test.js` holds the two together |
| `refusedBy(x, h, c)` | Why headline `h` refuses record `x`: a NOT_DRAWN_ORDER code, `'unit:<unit>'`, or null where it takes it |
| `notDrawnWhy(x, hs, c, drawnIds, namedIds)` | `'drawn'`, `'named'`, `'held'`, `'noNumber'`, `'property:<name>'`, the furthest `refusedBy` code of the headlines reading its property, else `'retired'`, `'reference'` or `'second'` (also re-exported by detail.js). Words: `labels.js whyWords` |
| `comparisonsOf(m, c, tab)` | The data of every comparison heading the tab draws, registry order (below) |

`comparisonsOf` returns one object per comparison that has two of its headlines applying to the material (not
`notApplicable`, reading a property of the tab) and a numeric, not held-back record behind it:

| Field | What it holds |
|---|---|
| `cmp`, `topic` | the `registry.comparisons` row, and its `name` |
| `hs` | its headlines (`registry.headlines`, drawer-only ones too) |
| `properties` | Set of what it reads (value and related properties) and lists (`cmp.listed`, in the tab) |
| `byKey` | Map(headline key → `spreadEntries`) |
| `graphs` | one per unit, `{ unit, rows: [h with a value], dots: [{ h, e }] }` |
| `drawnGraphs` | the graphs with two dots or more (drawn); `singles` the one dot of each graph with one |
| `shown`, `dots` | the rows and dots drawn |
| `silent`, `silentListed`, `silentUnlisted` | headlines no product has; split by whether their records are listed below (a property no other row reads) |
| `caption`, `noteRule` | `method.csv` rules for the topic and for `cmp.note` (or `''`/null) |
| `key` | the marks drawn: `{ filled: [h], open: [h], annealed, variant, claimed, band (some summary has q1), median (some summary has n > 1) }` |
| `pairs` | for a comparison with a `pairLabel`, each two-row drawn graph: `{ gr, both: [grades with a value on both rows], shares: shareOf(…) }` |
| `shares`, `noShare` | pairs with a share; pairs some product publishes both of, in two different orientations, with none |
| `drawnIds`, `namedIds` | measurement IDs drawn, and named in a sentence |
| `onGraph` | one line per drawn dot, in drawing order: `{ mid, h, e, x (its record, or undefined), marks, owner (the grade whose claim is quoted: the sibling for a twin), alsoFor (the record is another product's), claimed, reason (outOfMedian) }`. Several lines can share a `mid` (a twin's dot on its sibling's record) |
| `tally(records)` | `{ drawnN, namedN, counts: [[why, n]] largest first, ties in first-seen order, rest }` over `notDrawnWhy`. The drawer's counted line ("Of the 269 results below, 63 are drawn above; the other 206: …") is these counts in `whyWords` |

### Printing

| Export | Contract |
|---|---|
| `printFacts(m, c)` | Print temperatures across products (D139), from `print-spread.js printSpread` over the products: `{ axes, guideName, drawn, dots, products, marks, rows, typical, outside, limits, single, missing }` (below). Nothing is drawn where `drawn` is empty |
| `printCounts(grades)` | null without a product; else `{ products, axes: [{ axis, label, limit, within, over, unknown }] (nozzle, bed, chamber), all, origins: { twin, guide } }` from `grades[].print[axis].verdict` (a product with no profile and no borrowed setting counts unknown) and `print.from[axis].origin` |
| `guideFacts(m, c)` | null without a guide row; else `{ guide, why (its mapping's reason), readBy (products taking a setting from it) }` |
| `routingSaysMore(p)` | Whether a profile's `routing` cells say more than "verify the exact grade" |

`printFacts` fields:

| Field | What it holds |
|---|---|
| `axes` | `printSpread(products)`: four settings `{ axis: nozzle\|bed\|chamber\|drying, label, limit (bool), rows: [{ key, label, entries: [{ g, origin: own\|twin\|guide, label, variant, profileId, value }], summary }], outside: [{ g, verdict, min, max, origin }], notDrawn: Map(why → n), oneEnd: { low, high } }` |
| `guideName` | the guide row's name, else "Bambu Lab's Filament Guide" |
| `drawn` | settings with two values or more, one of them a sheet's: `{ a (the axes entry), axis, label, values, limit (h2cLimit, or null for drying), onScale (scales.js limitOnScale), rows (with a value) }` |
| `dots`, `products` | `[{ a, e }]` drawn; how many products |
| `marks` | the key's: `{ own, guide, variant, band, median, limit }` |
| `rows` | every drawn row with a value (the table's rows) |
| `typical` | per drawn setting `{ label, low, high }`: the medians of its lowest and highest rows, null where none (drying has one row: `high` null) |
| `outside`, `limits` | `{ label, axis, list: [{ g, name, verdict, min, max, origin }] }` per setting with products outside the H2C's limits; `{ label, axis, limit }` per setting with a limit |
| `single` | settings with a value but not drawn: `{ label, axis, own: { g, name, window } \| null, guide: { window, readers } \| null }`, a window `{ min, max }` or `{ tempC }` |
| `missing` | settings with products not drawn: `{ label, axis, notDrawn: [[why, n]], oneEnd: { low, high } }`; words `labels.js PRINT_NOT_DRAWN` |

### Makers' statements, environment

| Export | Contract |
|---|---|
| `makersSayFacts(m, c)` | null where nothing is counted; else from `materials[].knowHow`: `{ states (products per know-how state), total, collected, sitesSearched, makers, topics: [{ topic, makers, stated, products }] (db.meta.knowHow.topics order), recipe: [[part, products silent]] }` |
| `knowHowGapFacts(g, topics)` | null without `grades[].knowHow`; else `{ state, searchedOn, missing: [topics it says nothing on], recipe: [parts not collected] }`. Words: `knowHowGap` |
| `envGroups(c)` | `{ usable, other }`, each `[[categoryLabel, records]]` in first-appearance order: categories a requirement can be set on (`filterable`), and the rest |
| `environmentMatrix(c)` | **Page-first.** `{ rows: [{ label, category, filterable, records, counts: { verdict: n }, total }] (usable first), verdicts: [every verdict that occurs, first-appearance order], polymer: [{ label, category, verdict, screens, agents }] }` from `evidence[].verdict` as stored and `polymerEvidence[]` |

### Products, prices, ranks and estimates (page-first)

The drawer uses `hasEstimates`, `productEstimates` and `priceRows`; the other three are for the pages.

| Export | Contract |
|---|---|
| `hasEstimates(m)` | A selectable headline with an estimate and no known value, or an estimated nozzle, bed or chamber window |
| `productEstimates(g)` | `[{ h, e }]` of `grades[].estimate[key]` where the product has no comparable value of its own (selectable headlines). The drawer shows them only with estimates on |
| `productRows(c)` | One row per grade, database order: `{ g, id, name, maker, product (not a reference grade), variant, toughened (own claim), typicalOf: [headline keys it is the typical product of], values: { key: grades[].headline[key] } (every headline, drawer-only too), print (grades[].print), price (headline.priceCADkg or null), documents (source IDs), estimates (productEstimates) }` |
| `priceRows(c)` | One row per listing: `{ p, id, product, used (headlineSample), unused: 'quarantined' \| 'no-regular' \| 'another' \| null, perKg (regularPerKg), converted (from a foreign currency), salePerKg (displayed price per kg where no regular one), currency, foreign, accessDate, quarantined }`. Words: `UNUSED_WORDS[unused]` |
| `rankTable(db)` | `{ [key]: { key, unit, drawerOnly, entries: [{ id, name, value }] } }` for every `db.registry.headlines` key: every material that is not a family entry whose `materials[].headline[key]` is known (a measured median, never an estimate), ascending by value, then ID. Reads `db.registry` directly, so needs no `useRegistry` |
| `rankOf(rank, materialId)` | `{ of, below, above, index }` for one material in one `rankTable` entry (`index` -1 where it has no value) |

## 4. `app/js/ui/material-words.js`

Plain text, unescaped. Each reads facts or compiled records and returns words; numbers through `fmtNumber`.

| Export | Returns |
|---|---|
| `plural`, `lower`, `cap`, `andList`, `inSentence` | Re-exported from `text.js` (section 7) |
| `describeFacets(m)` | What the identity line does not say (foaming, undisclosed filler, support, elastomer), from `m.facets` |
| `ledeWords(m)` | `describeFacets(m)` and `H2C_STATUS[m.h2cStatus].lede`: the drawer's lede |
| `identityLine(id)` | `identity()` as "ASA · carbon-fibre filled · 17 products from 15 makers" (`FILLED_WORDS`) |
| `onFileWords(summary, documents)` | What follows "On file:": measurements, sources, held back, known gaps, conflicts |
| `NOTHING_ON_FILE`, `EMPTY_LINES` | "Nothing on file for this material."; each tab's empty line by drawer tab key, plus `gaps` (no known gap) |
| `emptyReasonLine(r)` | One coverage row: "domain, status: finding" |
| `familyScope(name, materialName)` | Whose guidance it is: "for the family in general, not one product" or "for X in general, not Y or its products" |
| `conditionLine(x)` | A measurement's orientation, specimen, standard, moisture and notch, joined by " · " (`DIRECTION_WORDS`, `SPECIMEN_WORDS`) |
| `measuredValue(x)` | "52.3 ± 1.1 MPa" |
| `testGuessHead(g)` | "Which test: probably Charpy." and the like (`measurements[].testGuess`) |
| `namedOnlyWords(x)` | A property named without a value, in a list |
| `gaveWords(gave)` | `sourceBlockFacts().gave` as a list of phrases |
| `scheduleWords(t)` | "at 80 °C for 4 h", with what is not stated said so |
| `changedState(x, v)` | `[phrases]` for an annealed or conditioned bar, from the typed fields, "(stated once on its page)" where a page heading supplied it (D116) |
| `LEVEL_NOTE`, `DRAWER_LEVEL_NOTE` | Why a value is not comparable, by caveat; the drawer-only headline's |
| `asPublishedWords(h)`, `statedWhat(hs)`, `filledWords(hs)` | A hollow dot's unstated condition; what a row compares on; what a filled dot is, in the key |
| `outOfMedianWords(code, h)` | `outOfMedian`'s code in words |
| `joinedSpan(x)` | "min–max" with word joiners round the dash, or one number |
| `apartWords(h, s)`, `medianRule(hs, m)`, `noMedianWhy(hs, m)` | A row's values left out of its median; what n counts; why there is no median (after "No median: ") |
| `toughenedSplit(s, unit)`, `toughenedClaimWords(g, f)` | What the products sold as toughened give against the others (D133); the toughened mark's explanation |
| `TOUGHENED_NOTE`, `TOUGHENED_NOTE_SHORT` | That "Sold as toughened" is the maker's statement, under a comparison and under the Products table |
| `leftOutWords(h, s)` | The Products tab's "Left out of the range" phrases |
| `silentRowsWords(listed, unlisted)` | The rows a comparison does not draw |
| `graphName(gr)`, `pairWords(pairLabel, pairs, names, oneGraph)` | A graph by its first row; the products that publish both of a pair (`names` are `pairs[i].both` as names) |
| `sharePct(r)`, `shareWords(shares, noShare)` | A share in per cent; Z as a share of XY |
| `alsoForWords(name, from)` | " for X too (data sheet shared with Y)" on a twin's record |
| `rangeWords(r)` | A material's recorded window (`materials[].print.nozzleC` …) |
| `settingWords(a)` | One product's print setting (`grades[].print.nozzle` …) |
| `windowText(lo, hi)` | A window without its unit, word-joined dash |
| `printAxisUnit(limit, onScale)`, `printApartWords(s)` | Under a print graph; a print row's values drawn and not counted |
| `printLines(f)`, `printSingles(f)`, `printMissing(f)` | From `printFacts`: what n counts, the medians, the products outside the limits; the settings one sheet or the guide gives; what is not drawn (after "Not drawn: ") |
| `printOriginsWords(origins)`, `printCountWords(n)` | From `printCounts`: settings read from a shared sheet or the guide; one axis's counts |
| `hardenedFactWords(gate, hard, someHard)`, `dryingFactWords(gate, products)` | The printability lines for the hardened nozzle (`materials[].gates.abrasive`, engine `hardenedShare`) and drying (`gates.drying`, products' `print.drying.need`) |
| `amsSummary(profiles)` | What the profiles quote about the AMS |
| `guideEnclosureWords(state)`, `guideHardenedWords(v)` | The guide row's enclosure and nozzle statements |
| `annealWords(list)` | A product's annealing schedules |
| `knowHowGap(f)` | From `knowHowGapFacts`: what the maker leaves unsaid |
| `sitesLine(searched, total)`, `makersSilentWords(states)`, `makersRecipeWords(recipe)` | From `makersSayFacts` |
| `verdictWords(v)`, `topicRepeatsHeading(topic, heading)`, `envConditionWords(e, heading)` | A resin verdict; whether a topic repeats its heading; an environment statement's conditions |
| `noPriceWords(p)`, `quarantineWords(p)`, `foreignPriceWords(p)`, `UNUSED_WORDS` | Why a listing has no regular price; why a held-back listing is not used; how a foreign price became CAD per kg (D113); why a listing is not used, by `priceRows().unused` |

## 5. Words moved into `app/js/ui/labels.js`

Unchanged from detail.js; each maps a stored code to the words on the page.

| Export | Maps |
|---|---|
| `DIRECTION_WORDS` | `measurements[].direction` codes |
| `SPECIMEN_WORDS` | `measurements[].specimenType` values |
| `PROPERTY_WORDS`, `propertyName(p)` | Property names that say less than a data sheet would |
| `STATUS_WORDS` | A held-back measurement's Data status |
| `SOURCE_KIND`, `sourceKind(s)` | `sources[].sourceClass` |
| `FILLED_WORDS` | `facets.reinforcement.value`, in the identity line |
| `WHY_WORDS`, `whyWords(key, n)` | `notDrawnWhy` codes, counted |
| `RECIPE_WORDS`, `TOPIC_WORDS` | Recipe parts and know-how topics a maker leaves unsaid |
| `PRINT_NOT_DRAWN` | `printSpread` not-drawn reasons, counted |
| `OUTSIDE_WORDS` | A gate verdict outside the H2C's limits, after a window |

## 6. `app/js/ui/scales.js`: the one scale rule

| Export | Contract |
|---|---|
| `stripScale(values, unit)` | `{ log, from, hi, ticks, pct(v) }`, `pct` in per cent of the track (0–100, clamped). `°C`: linear, from the round step at or below the lowest, at least `MIN_SPAN_C` (10 °C) about the values. Otherwise logarithmic at 1, 2, 5 per decade where every value is positive and the largest is more than `LOG_RATIO` (10) times the smallest; else linear from zero to the first round step past the largest |
| `roundStep(span)` | The step of 1, 2, 2.5, 5 or 10 × 10ⁿ giving four to eight ticks |
| `stack(entries, pct)` | Sets `e.x` (per cent) and `e.row` on entries `{ v: { value } }` so dots closer than `DOT_GAP` (2.4 %) stack, up to `MAX_ROWS` (6); returns the rows used (≥ 1). It mutates the entries |
| `limitOnScale(limit, values)` | Whether a print limit is drawn on the scale: within the larger of a quarter of the values' span and `LIMIT_NEAR_C` (10 °C) above the highest; never for null |
| `LOG_RATIO`, `DOT_GAP`, `MAX_ROWS`, `NICE`, `MIN_SPAN_C`, `LIMIT_NEAR_C` | The constants above |

## 7. `app/js/ui/text.js`

New, so that `labels.js`, `material-words.js` and `material-facts.js` can share these without importing each other:
`stated(v)`, `plural(n, word, many)`, `lower(t)` (keeps an abbreviation's capitals), `cap(t)`, `andList(xs)` ("a, b and
c"), `inSentence(name)` (a property name inside a sentence).

## 8. `app/js/ui/format.js` additions

| Export | Contract |
|---|---|
| `relatedNote(entry)` | The explanation renderValue gives a related value (`materials[].headline[key].related`): nearest value, property and orientation, why not compared, how many more, that no filter uses it |
| `spreadNote(entry)` | The explanation of a median of products (`headline[key].spread`): n, range, middle half, twins, bounds, products not reporting it, values set apart, products sold as toughened |

## 9. `app/js/ui/page-rule.js`

| Export | Contract |
|---|---|
| `PAGE_RULE` | `{ minProducts: 3, minValues: 20 }` |
| `PAGES_DIR` | `'materials'` |
| `pageFacts(m, ms)` | `{ products: m.gradeIds.length, values: ms.filter((x) => x.numeric).length }`. `m.gradeIds` is exactly the material's active products that are not reference grades (checked for all 152 materials on 2026-10-16) |
| `pageOf(m, ms)` | `'materials/<id>.html'` where both thresholds are met, else null; null for a family entry. 76 materials today (6 of them beyond H2C capability; smallest PCTG-GF, 3 products and 20 values; largest PLA). `ms` are the material's measurements (`c.ms`, or `indexDb(db).measurementsByMaterial.get(id)`) |

The drawer does not link to the pages yet; step 3 adds the link where `pageOf(m, c.ms)` is not null.

## 10. What stayed in `detail.js`, and why

- **Every HTML builder** (`measurementRow`, `sourceBlock`, `usesSection`, `polymerSection`, `printCard`, `productValues`,
  `makerSays`, `guideBlock`, `productPrintCounts`, `dotRow`, `spreadSummary`, `drawerComparisons`, `printTemperatures`,
  `spreadTable`, `tabBody`, the header and tab strip), each now drawing from the facts and words above.
- **Sentences that hold a control**, whose frame is the renderer's: the counted line under a comparison (it names a
  value as a button), "only one product has a value, X's [value]", the answer block with Show the products, the hidden
  estimates line, the "What makers say" paragraph, the profile routing note, TAB_HELP (the drawer's own help line).
  Their plain parts (`whyWords`, `pairWords`, `printLines` …) are shared.
- **Estimates** (`estimateCard`, `estimateGroup`, `notApplicableCard`, `windowEstimate`, `unitNote`,
  `gradeEstimateLines`): they are formatting of compiled estimate records (`estimateDisplay` in format.js already holds
  their numbers), with long sentences that embed escaped values. Splitting them is more trouble than it is worth in this
  tranche; the page's "Estimated, not measured" section can read `m.headline[key].estimate` through `estimateDisplay` and
  `hasEstimates`, or take this split in tranche 2.
- **The scenario-only parts** (`stateNote`, `unsettled`, the answer block, Choose): a page has no scenario.
- **`statusToState`, `gateChip`, `ids`, `recordNotes`, `longText`, `originalLink`, `makerBlock`, `searchBox`,
  `knowHowSource`, `knowHowConditions`, `toughenedMark`, `fromNote`**: markup, chips and controls.
- **Module state**: `gradeLookup`, `gradeOpen`, `drawerQuery`, `knowHowIndex`. `knowHowIndex` builds the same map as
  `indexDb(db).knowHowByGrade`; it was left as the drawer's own state on purpose and could read `indexDb` in tranche 2.
- **Exports**: `renderDrawer`, and `notDrawnWhy`, `groupByMaker`, `resolvePointers` re-exported from material-facts.js,
  so the existing tests run untouched.

Removed as dead: `groupBySource` and `tag`, which nothing called.

## 11. Copies that remain, and how they differ

- **Product names.** Four functions name a product by maker and product: `productName` here (the drawer's), which treats
  the database's missing states as unstated (`Not published`, `N/A` …); `productName` in `build/src/products.js`,
  `productLabel` in `ui/brief.js` and `gradeName` in `engine/constraints.js`, which treat any value starting "Not " as
  unstated and fall back to the ID. They give the same name for all 1,180 grades today; they would differ on a product
  or maker cell reading "N/A" or "Not specified". The step-1 test asks for this comparison.
- **Reason codes.** `NOT_DRAWN_ORDER` here and `ASSESS_ORDER` in `build/src/products.js` (section 3); each names the
  other in a comment.
- **Spans.** Three on purpose: `joinedSpan` (word joiners, under graphs), the Products table's plain en dash, and
  `toughenedSplit`'s "a to b unit".
- **The tests' own copies** (`test/print-spread.test.js` restates `stated`, `gradeName`, `windowText`, the not-drawn
  words; `test/drawer-comparisons.test.js` restates `spreadEntries`): left alone, so the tests stay an independent
  reading.

## 12. The golden check

`docs/audits/2026-10-16-material-pages-round/drawer-golden.mjs` renders the drawer in Node with the tests' fake host and
prints one SHA-256 per render and one over them all, deterministically (two runs give the same bytes):

```bash
node docs/audits/2026-10-16-material-pages-round/drawer-golden.mjs > after.txt   # after npm run build
```

11,900 renders: every material (175, family entries included) on every tab key (Overview, Grades, Mechanical, Thermal,
Printing, Environment, Price, Evidence, Coverage) in the tests' minimal context with estimates off and on, and in
main.js's context as Confirmed only, Include uncertain, and Include uncertain with estimates unticked and the material
shortlisted; Sources and Mechanical with a measurement or a document asked for; and the Overview and Products tabs under
templates 0, 3 and 4 answered by `runSelection` as main.js answers them, Confirmed only and Include uncertain, with each
material's first passing product chosen, and template 0 with annealing allowed and the part conditioned. Before and
after step 1: `TOTAL 11900 987c80dd4b5038ad1332ecd971e7adad621ccee49d9fd851806a24d1d0dc5e65`, every line equal. Tried
on purpose, a one-character change to a scale constant (`DOT_GAP`) changed 137 lines and one to a direction word 37; a
change to a branch the data never reaches (no material without a known gap, no record refused as both moulded and
resin) changed none, as it cannot.
