# A page per material (D141): execution plan

> **Historical record** (2026-10-16): the plan the owner approved before the round began; the round's [README](README.md) says what was built. The
> decision it names D141 is **D142**: main took D141 on 2026-10-17 for the plausibility-window fix.

## Context

The owner is happy with the selector and its drawer and asked for an independent, well-designed static HTML page per
material, opened from the drawer: a summary written by us, then the material's data as processed, usable figures and
statistics beyond what the 620 px drawer can hold, with every raw record one link away. The assessment of 2026-10-16
([docs/audits/2026-10-16-material-pages/README.md](../2026-10-16-material-pages/README.md))
found it doable and light: the drawer already renders every material's eight tabs from the compiled database in 3.7 s
in Node; GitHub Pages is nowhere near its limits (1 GB; the whole set is tens of MB). The two real risks are (1) two
renderings of one fact drifting apart and (2) hand-written prose going stale. This plan is built around removing both.

**The owner's answers (2026-10-16), fixed:**

| # | Question | Answer |
|---|---|---|
| 1 | Which materials | A data threshold: **at least 3 products and 20 measured values with a number** → 76 of 152 today (6 of them "beyond H2C capability", which get a full page with a callout). Smallest qualifying: PCTG-GF (3 products, 20 values); largest: PLA (195 products) |
| 2 | Written summary | Yes, under rules: no typed number (placeholders the build fills), author/date/review status shown, decides nothing; agents draft, the owner reviews |
| 3 | Typography | An embedded typeface, done professionally |
| 4 | Raw data | Processed, selected data on the page; every raw record on a records page per material, linked from each section |
| 5 | Charts | Inline SVG drawn by the build, one professional, consistent chart grammar |
| 6 | Prototype first | PETG (M020), PLA (M001), PCTG-GF (M110) approved before the rest |
| 7 | Release zip | Yes |
| 8 | Entry point | Only a "Full page" link in the drawer header (no top-bar link); an index page exists but is not linked from the selector |

Execution by agents: logic and design on **Opus**, simple labour (tests from a specification, font subsetting,
screenshots, sweeps, drafting, proofreading) on **Sonnet**. No answer moves: `build:diff` stays at 0 differences and
`templates.csv` unchanged throughout.

---

## 1. Single source of truth: how the pages cannot diverge

| Layer | One place | Used by |
|---|---|---|
| Facts | `dist/db.json` as the build compiles it (materials[].headline/.summary/.print, grades[].headline/.print, measurements, profiles, evidence, knowHow, prices, sources, coverage, method, registry, meta). **The pages compute no deciding value**; where a page needs a number the build does not hold, compile it (never compute it in the page alone) | drawer, pages, tests, snapshot |
| Shaping (select, count, group, summarise) | **new `app/js/ui/material-facts.js`**: pure data, no markup, no sentences. Extracted from `detail.js` with the drawer's HTML unchanged by one byte | drawer and pages |
| Scales | **new `app/js/ui/scales.js`** (`stripScale`, `roundStep`, `stack`, `limitOnScale`): log at 1, 2, 5 per decade when max/min > 10; temperatures linear from the round step below the lowest, ≥ 10 °C span | drawer and page figures |
| Words | `app/js/ui/labels.js` (every display name, moved from detail.js: DIRECTION_WORDS, SPECIMEN_WORDS, SOURCE_KIND, WHY_WORDS, TOPIC_WORDS…) and **new `app/js/ui/material-words.js`** (plain-text sentences shared by both renderers, returned unescaped) | drawer and pages |
| Numbers | `app/js/ui/format.js` (`fmtNumber`, `fmtRange`, `fmtBounded`, `boundNote`; extract `relatedNote`, `spreadNote`) | everywhere |
| Which materials have a page | **new `app/js/ui/page-rule.js`**: `PAGE_RULE = { minProducts: 3, minValues: 20 }`, `pageOf(m, ms) → 'materials/M020.html' | null` (numeric measurements; `m.gradeIds.length` equals the active products, verified) | build stage, drawer link, index page, README status, tests |
| Design tokens | **new `app/css/tokens.css`** (palette light/dark, `--claim`, `--radius`, `--mono`, `--sans`); `bundle.js` concatenates tokens.css + app.css into the selector's one `<style>` (no CSS `@import`) | selector and pages |
| Why-not-drawn reasons | keep the drawer's `refusedBy`/`NOT_DRAWN_ORDER` copy (moved into material-facts); the build's `assess` cannot be bundled (its deps read CSV via `node:path`). Guards: existing `test/drawer-comparisons.test.js` + `pages.check.js` P5 calls `assess` directly | |
| Checks | `pages.check.js` holds every number on every page against the build; `build/snapshot/pages.csv` makes page changes a reviewable diff; `manifest.outputs['materials/']` puts pages under the reproducible-build check | |

Dependency direction: `app/pages` → `app/js/ui` → `app/js/engine`. `ui` never imports `pages`. `app/pages` stays
**outside `RELEASE_INPUTS`** (D96: a design change makes no new release); `test/release.test.js` gets the assertion.

**How to extend later (no or little page code):** a new headline, comparison or property row in the tables appears
on the pages through the registry as it does in the drawer; a new material gets a page the build it qualifies; a new
section is one file in `app/pages/sections/` + one line in `SECTIONS` + its empty-state line; a new scatter is one
line in `figures.js`; a new record table is one file in `app/pages/records/` (plus the usual table registration).

---

## 2. Architecture and file layout

```
app/js/ui/material-facts.js   indexDb(db); materialContext(db, id, {ctx, evaluation, scenario, showEstimates}) → c (the drawer's c);
                              tabCounts(c); documents(c); identity(m,c); spreadEntries; dotMarks; outOfMedian; shareOf;
                              refusedBy/notDrawnWhy/NOT_DRAWN_ORDER; comparisonsOf(m,c,tab) → data only (graphs, dots,
                              pairs, caption, onGraph, tally()); printFacts(m,c); printCounts(grades); makersSayFacts;
                              knowHowGapFacts; familyGuidanceFacts; measurementFacts; sourceBlockFacts; envGroups; gapSplit;
                              emptyReasons; NEW page-first: productRows(c), environmentMatrix(c), priceRows(c), rankTable(db)
app/js/ui/scales.js           the one scale rule (from detail.js stripScale/stack)
app/js/ui/material-words.js   shared plain sentences (toughenedSplit, knowHowGap, amsSummary, describeFacets, printLines, EMPTY_LINES…)
app/js/ui/page-rule.js        PAGE_RULE, PAGES_DIR, pageFacts, pageOf
app/css/tokens.css            shared tokens; app.css keeps --rail, --drawer, --t-* scale

app/pages/
  render.js        renderSite(db, env) → { files: [[path, text]], stats }; renderMaterialPage; renderRecordsPage; prepare(db)
                   (prepare = useRegistry + setH2cBaseline + setEnvironmentLabels, as main.js does; called every time)
  stage.js         Node only: pagesStage({projectRoot, db, dbJson, meta, selectorFile}) — cache, write, digest, budgets
  shell.js         documentShell({title, kind, materialId, stamps, rail, body, products})
  budget.js        PAGE_BUDGET (main ≤ 1.5 MB raw / 200 KB gz; records ≤ 6 MB / 750 KB; set ≤ 150 MB; revised 1.5× PLA after prototypes)
  figures.js       FIGURE_PAIRS = [['tensileModulusXY','tensileStrengthXY'], ['priceCADkg','tensileStrengthXY']]
  sections/index.js  SECTIONS = [masthead, inShort, keyFigures, printing, mechanical, thermal, physical, environment,
                                 products, makersSay, price, estimates, sources, footer]
  sections/<id>.js   export default { id, title, records?: '#anchor', render(c, env) → { html, empty, stats } }
  records/index.js   RECORD_SECTIONS = [measurements, profiles, statements, environment, prices, documents, reviewNotes]
  charts/{scale,marks,axis,dotplot,context,scatter,figure}.js   the chart grammar (styled by CSS class only)
  index-page.js    renderIndexPage(db, env)  (by family → polymer; a material without a page says why)
  assets/pages.css, assets/page.js (classic script ≤ 20 KB), assets/fonts/ (subset WOFF2 + OFL.txt + FONTS.md)
scripts/pages/render.mjs        npm run pages -- M020 M001 M110 | --all   (dev render into dist/materials)
scripts/pages/subset-fonts.mjs  one-off font subsetting (subset-font as ROOT devDependency, never build/)
scripts/pages/fields.mjs, page-text.mjs, add-summaries.mjs   summary tooling (step 4)
build/src/written.js            attachWritten(materials, rows, …) — fills summary placeholders at compile
build/src/index.js              stage 8 thin call (after bundle), --no-pages; manifest outputs['materials/']
build/src/build-cache.js        + digestFiles(roots) for the pages cache key
```

**Env passed to the renderer:** `{ index: indexDb(db), ranks: rankTable(db), stamps: {release, snapshot, build},
selectorHref: '../H2C_Material_Selector_<snapshot>_<release>.html', assets }` (snapshot/tests pass `assets: null`).
No-scenario context: `materialContext(db, id, { showEstimates: true })` → `tested=false`, no evaluation, no chosen.

**Assets:** shared `materials/assets/{pages.css, page.js}` with relative links (one cached stylesheet, lean pages);
fonts embedded in pages.css as `data:font/woff2;base64` (Chrome refuses `@font-face url()` and module scripts from
`file://`, so the release zip opened from disk keeps fonts and script this way). ~450 KB CSS (≈340 KB gz).

**Typefaces (OFL 1.1, no Reserved Font Name, verified):** Inter Variable (body 17 px/1.6, tables 15 px, captions
14 px, key-figure numerals 44 px wght 600, `tabular-nums lining-nums`) and Newsreader Variable roman+italic (masthead
52 px, section titles 28 px, summary prose 19 px/1.55, `font-optical-sizing: auto`). Scale 1.25 from 17 px;
`font-synthesis: none`; fallbacks `--sans`/Georgia; `--mono` for IDs only. Subset: Latin + Latin Ext-A + the symbols
the pages use (°, ±, ², ³, µ, ×, –, —, ≥, ≤, →, −, ≈, ★☆✓✗, word joiner U+2060, super/subscripts); ~250 KB total.

**Layout:** prose measure 68ch; figures to 1,100 px; sticky contents rail ≥ 1,080 px, a scrolling strip of section
links below; 16 px gutters on phones, no sideways scroll; print stylesheet (no rail, `break-inside: avoid`). Status
palette never appears in a figure (no verdicts on a page); the Bambu Lab status chip is neutral.

### Page anatomy (processed on the page; every record on `<id>-records.html`)

Every section is always present (`section[data-section][data-empty]`); an empty one shows one line with the recorded
reason (`emptyReasons`, the reviewer's words) and the link to the records page.

| # | Section | Reads | Shows / computes for display |
|---|---|---|---|
| 0 | Masthead | materialName, fullName, identity(), tabCounts, evidenceSummary, meta | name, full name, polymer · filler · status chip; products, makers, values, documents; data date, release. Excluded: callout "Beyond H2C capability: kept for reference, never a candidate" |
| 1 | In short | describeFacets + H2C_STATUS lede (first line); `materials[].written` | the written summary with filled placeholders, byline "Written by … on … · status", "It decides nothing" |
| 2 | Key figures (one card per registry headline, price included) | m.headline/m.summary, rankTable | median, range, middle half, n, typical product; **context strip**: every material's median as a faint tick, this one's range/median in accent, "above the medians of N of M materials" |
| 3 | Printing on the H2C | grades[].print, printFacts, printCounts, hardenedShare/Words, amsSummary, guide | print-window dot plot (lowest/highest nozzle, bed, chamber, drying; H2C limit line); counts within/over limits in words; where settings came from (shared sheet, Bambu guide) |
| 4 | Mechanical | comparisonsOf(Mechanical), tabProperties, FIGURE_PAIRS | tensile, flexural, impact dot plots full width with median tables and counted lines; Z/XY share; strength-vs-modulus scatter; Z-vs-XY scatter per pair; other properties counted with a records link; "Not published" list |
| 5 | Thermal | as 4 | HDT at 0.45/1.8 MPa and Tg plot; Vicat etc. counted |
| 6 | Physical | propertiesInDomain('physical') | per property: values and products, records link |
| 7 | Environment | environmentMatrix, envGroups, c.poly | category × verdict-class matrix (own records; polymer-level apart, labelled resin data); up to 3 findings per category |
| 8 | Products | productRows, registry headlines, print windows | sortable table by maker: key values (drawer marks), print window, price, state flags, shared-sheet marks; `#product-<GradeID>` anchors; records link filtered to the product |
| 9 | What makers say | makersSayFacts, knowHowByGrade, knowHowGapFacts | topic table (makers, products); per topic one statement from each of the 4 makers with most products (rule stated in caption); gap states |
| 10 | Price | grades[].headline.priceCADkg, priceSampleWords, fxRates | CAD/kg strip (filled Canadian, hollow converted); sampling dates |
| 11 | Estimated, not measured | m.headline[k].estimate, m.print.*Estimate, estimateDisplay | fenced, marked †, what each rests on and may screen |
| 12 | Sources | documents(c), sourceBlockFacts, gapSplit | documents by publisher and kind, access-date span; **Known gaps** in the reviewer's words |
| 13 | Footer | meta, method 'Transferable allowables', toHash/newScenario | "Release … · data of … · build …"; how to cite; **Open in the selector** (`selectorHref#toHash({...newScenario(meta), openMaterial: id})`); "Generated on every build. Nothing on this page decides an answer." |

**Records page:** header (name, counts per type, text filter, product select via `#product=G…`; all visible without
JS). Tables: Measurements (property order, product, value with operator/±/unit, orientation, specimen, standard,
moisture, notch, post-processing, test temperature, print settings collapsed, **Drawn** = mark + "in the median"/why
via whyWords, source + page, `td.id`); Print profiles; Maker statements (`<q>`); Environment; Price listings;
Documents (sourceBlockFacts: covers, gave, link to the original); Review notes. IDs only in `td.id` cells (D124).

**Chart grammar:** HTML rows (`.fig-label` + `svg.fig-track` 100 % wide); x in **percent**, y in px; one hidden
symbol sprite (`#mk-dot`, `#mk-square`, `#mk-diamond`) and `<use class="mk mk--open mk--annealed mk--variant
mk--claimed" x="41.2%" data-grade data-mid>`; `.band` (middle half), `.median`, `.limit`, `.tick`, `.tick--this`,
`.lit`. Kinds: dotplot (comparisons, print, price), context strip (key figures), scatter (FIGURE_PAIRS, Z-vs-XY with
shared domain and diagonal), matrix (HTML `table.grid`). Every figure: title, key of marks actually drawn,
`<figcaption>` saying what is drawn and left out (the counted line), summary table; `role="img"` + `aria-label`.

**Markup contract (test hooks):** `main[data-page=material|records|index][data-material][data-release][data-snapshot][data-build]`;
`section[data-section][data-empty]` + `p.empty`; masthead `[data-count=products|makers|values|documents]`;
`div.kf[data-kf][data-median][data-min][data-max][data-n]`; `svg[data-rank]` with `.tick` and one `.tick--this`;
`figure[data-comparison]` → `.fig-row[data-headline]` → `use.mk[data-grade][data-mid]`; `figure[data-print]` →
`.fig-row[data-row]` → `use.mk[data-grade][data-profile]`; records `tr[data-mid]` with `td.drawn[data-why]`, `td.id`;
summary `[data-written-status]`, `span.filled[data-field][data-value]`; source words in `q`, `.src`, `.raw`.

**page.js (classic, ≤ 20 KB):** contents rail via IntersectionObserver; lighting one `data-grade` across every figure
on hover/focus, tooltip names from `<script type="application/json" id="product-names">`, click → `#product-X`;
`th[data-sort]` sort by `td[data-v]`; records filter and product select; theme from `localStorage['h2c-theme']`.

### Build stage 8 (`build/src/index.js`)

```js
const withPages = !process.argv.includes('--no-pages') && withEstimates;
const dbJson = JSON.stringify(db); writeFileSync('dist/db.json', dbJson);
const out = await bundle(...);                                  // stage 7 first: pages link to its file name
const pages = withPages
  ? await (await import('../../app/pages/stage.js')).pagesStage({ projectRoot, db, dbJson, meta, selectorFile: basename(out.path) })
  : (rmSync('dist/materials', { recursive: true, force: true }), null);
writeFileSync('dist/manifest.json', JSON.stringify(releaseManifest(out.path, SNAPSHOT, RELEASE, pages), null, 2) + '\n');
```

- **Cache:** `digestFiles(['app/pages','app/js/ui','app/js/engine','app/css'])` (same late-mtime guard as the code
  digest) → `keyOf(code, { db: sha256(dbJson), selectorFile }, { format: 'h2c-pages 1' })`; `readEntry ?? claim →
  renderSite → writeEntry`; honours `cacheEnabled()` and `H2C_NO_BUILD_CACHE`. Stored: `{ files, stats }`.
- **Write:** to `dist/.materials-<pid>/`, then replace `dist/materials/` (no stale pages, no half-written folder).
- **Manifest:** `outputs['materials/']` = sha256 over sorted `"<sha256>  materials/<path>"` lines; `pages: {pages,
  recordsPages, bytes}`. `reproducible.check.js` already hashes manifest.json cold vs cached → pages covered.
- **Budgets:** warn over budget, fail the build over 2×; `pages.check.js` fails over budget (Verify gates Publish).
- **Time:** expected 2–4 s cold, <0.5 s warm. Measure `rm -rf .cache/build && npm run verify:fast` at step 3; if
  > 85 s, `scripts/ensure-db.mjs` passes `--no-pages` and `GROUPS.data` gets a build step before `pages:check`.
- `scripts/build-diff.mjs` passes `--no-pages`.

### The summaries table

`data/tables/material_summaries.csv` + `schema/tables/material_summaries.schema.json` (key MaterialID → materials;
Summary; Written by; Written on (date); Review status ∈ `schema/vocab/summary-status.csv` = draft | reviewed by the
owner | revise; Notes). Register: `TABLES` (load.js), `TABLE_ORDER` after coverage (schema.js), `TEXT_TABLES`
(lint-rules.js), `npm run data:fmt`, `synthesize.mjs` (`copy('material_summaries', …, ['MaterialID'])`),
`db.schema.json` `$defs.material.written` (null | {by, on, status, parts:[{text}|{field, value, unit?, bound?}]}),
`docs:dictionary`/`docs:rules`.

**Placeholders** `{field}`: `{key.median|min|max|q1|q3|range|n|products|typical|label}` for any registry headline key
(compiled summary; refused when n=0, q1/q3 under 4 products); `{products} {makers} {values} {profiles} {name}`.
Estimates never fillable. **Compile:** `build/src/written.js attachWritten(...)` right after attachProducts' headlineBasis
loop; parts keep raw numbers, the page formats them with `fmtNumber`/`fmtBounded` so they read like the key figures.
**Checks:** lint `SUMMARY-NUMBER` (a number outside a placeholder; ISO/ASTM/UL designations and tokens like PA6/H2C
exempt) in `lintData`; compile error `SUMMARY-PLACEHOLDER` in `rules.js` (unknown field, unfillable value, stray brace).
**On the page:** Newsreader paragraph, `span.filled` per value, byline with status words from `labels.js`
(SUMMARY_STATUS), "Every figure in it is filled from the data when the page is built. It decides nothing."

**Drafting (Sonnet, 8 agents × ~10 materials):** inputs = the rendered page's text (`page-text.mjs`) and the fillable
fields with values (`fields.mjs`), nothing else. Checklist: 120–250 words, answer first; every claim traceable to a
named section (listed in Notes); no number by hand; no comparison with other materials, no superlative, no verdict
words; family guidance said as the family's; what is not on file said once; D124 terms; repository spelling; status
draft; Written by "Claude Sonnet (agent), from the page of release <id>". Opus applies rows via `add-summaries.mjs`
(table-io) and **judges 40** (10 largest/20 middle/10 smallest) → `summaries/JUDGED.csv`; >4/40 false claims → second
Sonnet pass with the fault class added.

---

## 3. Steps, agents, gates

| Step | Who does what | Closes when |
|---|---|---|
| **1. Facts layer, scales, words, page rule, tokens** | **Opus:** extract tranche 1 from `detail.js` into `material-facts.js`, `scales.js`, `material-words.js`, labels maps; `page-rule.js`; `tokens.css` + `bundle.js` concat + `index.html` second `<link>`; `drawer-golden.mjs` (SHA-256 of every rendered tab: 175 materials × 8 tabs × estimates on/off + Overview/Products under templates 0, 3, 4) run before and after. **Sonnet:** `test/material-facts.test.js` from Opus's signatures (materialContext keys; tabCounts = drawer counts; pageOf ⇔ rule; gradeIds = active products; scale rules; productName vs build productName) | Golden digests identical; drawer/comparison/impact/print-spread/know-how tests green; `npm run ui:check` 0 differences; `ui:fuzz --n 300`; `build:diff` 0; verify:fast green |
| **2. Design system, chart grammar, renderer, prototypes** | **Opus (loads `frontend-design` and `dataviz` skills first):** `app/pages/**`, `pages.css`, `page.js`, markup contract, `scripts/pages/render.mjs`; renders M020, M001, M110 + their records pages; measures sizes/time; sets budgets. **Sonnet:** `subset-fonts.mjs` (download Inter/Newsreader releases with SHA-256 checks, verify no RFN, subset with pinned axes → WOFF2, `FONTS.md`, licence files); `test/pages-smoke.test.js` (E1 below); screenshots 4 pages × 3 screens × 2 themes into the round folder `screens/` | Smoke green; cold render time for all 76 recorded; screens captured |
| **GATE (owner)** | Owner reviews M020, M001, M110 (and Safari by hand: `<use x="%">`, data: fonts). Decisions asked with recommendations: values = numeric (76 pages); density strip from zero (keep shared rule); full page for excluded materials (yes); quote-selection rule; fonts as seen; Full page opens a new tab (yes) | Owner says go, or revisions |
| **3. Stage 8 and wiring** | **Opus:** `index.js` call + `--no-pages`; `digestFiles`; `stage.js` (cache, atomic write, digest, budgets); index page; drawer header link `<a class="btn btn-sm page-link" href="materials/<id>.html" target="_blank" rel="noopener" title="…zip beside it…">Full page ↗</a>` only when `pageOf(m, c.ms)`; `pages.yml` (zip + release asset + `cp -r dist/materials _site/materials`); `build-diff --no-pages`; `docs-status` line; ARCHITECTURE/INTERFACE/OPERATING sections; D141 draft. **Sonnet (from Opus's spec, in parallel):** `test/pages.check.js` (P1–P14), probe steps `50-page-<screen>-<slug>` (E3), `build/snapshot/pages.csv` (E4), `release.test.js` assertion, `reproducible.check.js` explicit assert | Build writes 76 + 76 + index + assets; `build:diff` 0; full `npm run verify` green locally; cold verify:fast ≤ 85 s (else the fallback) |
| **4. Summaries** | **Opus:** schema, vocab, table, `written.js`, compile hook, `db.schema`, both codes, synthesize, "In short" section, `fields.mjs`, `page-text.mjs`, `add-summaries.mjs`, AGENTS recipe. **Sonnet:** `test/summaries.test.js` (synthetic wb: every field kind, every refusal, lint regex cases); **8 agents draft 76 rows**. **Opus:** judges 40 | Lint clean; 0 SUMMARY-PLACEHOLDER; P12 green; JUDGED ≤ 4/40 false claims |
| **5. Blind read and close** | **Sonnet:** 4 readers × 10 pages (E6) → `blind-read/VERDICTS.csv`; 1 proofreader for living docs. **Opus:** fix each fault class with a guard; D141 final; GOALS-LOG entry; round README; `docs:rules`/`dictionary`/`decisions`; `docs:links --check`; `npm run round:close` | `npm run verify` green; `round:close` says nothing open; **push only at the owner's word** |

Estimated agent time: Opus ≈ 27–30 h, Sonnet ≈ 15 h, over roughly 3–4 working days; steps 1–3 are one round,
4–5 the same or the next. Release IDs change at steps 1, 3 and 4 (build/src, schema, data/tables are inputs); no
answer moves; later design-only changes make no release.

Round folder: `docs/audits/<start-date>-material-pages-round/README.md` (scope, gate record, `screens/`,
`drawer-golden.mjs`, `summaries/JUDGED.csv`, `blind-read/VERDICTS.csv`), linking back to the assessment.

---

## 4. Verification

**E1 `test/pages-smoke.test.js`** (verify:fast, ~1 s): chosen by rule (most products; median values; fewest values;
first excluded qualifying; plus a group name and a one-product material asserting `pageOf() === null`). Renders 4 main
pages + the smallest records page in-process: one doctype, balanced tags (`test/lib/page-html.js`); stamps = meta;
`data-section` order = SECTIONS with `p.empty` where empty; key-figure text = `fmtNumber(headline.value)`; no record
ID in prose (outside `td.id`, attributes, `q`, `.src`, `.raw`); every href is an anchor, a page in the set, index,
assets, the selector hash, or a `sources[]` URL.

**E2 `test/pages.check.js`** (`npm run pages:check`; `GROUPS.data` after 'snapshot'; reads `dist/materials/` vs
`dist/db.json`): P1 files exist exactly for `pageOf ≠ null` (+ records, index, assets), balanced; P2 masthead counts =
tabCounts/identity/evidenceSummary; P3 key figures = headline/summary via fmtNumber (not-applicable reason as the
drawer's); P4 rank ticks = materials with a known value, one `tick--this`; P5 comparison marks = spreadEntries,
`data-mid` = measurementId, classes as drawer-comparisons.test, records `td.drawn[data-why]` = notDrawnWhy mapped to
`assess` called directly (resin→moulded), counted line adds up; P6 print marks = grades[].print min/max and
drying.tempC, guide values hollow and uncounted, limit = h2cBaseline; P7 external hrefs = cited sources' URLs; P8
internal links resolve, selector hash passes `fromHash` with `openMaterial === id`; P9 no IDs, none of INTERFACE's
coinages; P10 stamps; P11 budgets, page.js ≤ 20 KB; P12 summaries: byline, status, every `span.filled` = compiled
part, no stray `{`, every summary row's material has a page; P13 the drawer header has the href exactly for page
materials; P14 `dist/materials` equals a fresh `renderSite(dist/db.json)` byte for byte, fonts are data: URIs,
licences beside fonts.

**E3 probe** (`scripts/ui-probe.mjs`): `openPage(url)` waits for `main[data-page]` + `document.fonts.ready`;
`measureLayout(screen, { tables: 'main table.grid' })`; `recordPage(screen, slug)` → `50-page-<screen>-<slug>` for
m001-pla, m020-petg, m033-asa-cf, m110-pctg-gf, m097-peek, index, m001-records, m110-records on laptop/tablet/phone (24
files): layout lines, sections present/empty, figures with svg+caption, rail state, fonts loaded, lighting ok, sort ok.
Fails on overflow, spill, clipped cells, figure without caption, rail on a phone or missing at 1,180 px.

**E4 `build/snapshot/pages.csv`** (in-process `renderSite(db, {stamps masked, assets: null})`): MaterialID, Material,
Page, Why, Products, Makers, Values, Documents, Sections, Figures, Dots, RecordsRows, KB, RecordsKB, Summary.

**E5** reproducibility via `manifest.outputs['materials/']`. **E6 blind read** (40 pages, 4 Sonnet × 10, Opus judges):
masthead vs drawer; key figures vs drawer's Key properties; captions vs marks (count = n); empty sections give reasons;
summary claims trace to sections; no coinage/IDs; all internal + 3 external links opened; phone screenshot; 5 random
records traced to the drawer's Sources.

**End-to-end:** `npm run build` → open `dist/H2C_Material_Selector_*.html`, open PETG's drawer → **Full page ↗** opens
`dist/materials/M020.html` from disk with fonts and lighting working; `../index.html`/selector link reopens the drawer
on PETG; `npm run verify` green; after push, CI's data + interface jobs green and `https://pdynamics.ca/h2c-materials/materials/M020.html`
serves; the GitHub release carries `H2C_Material_Pages_<snapshot>_<release>.zip`.

---

## 5. Documents touched

ARCHITECTURE (Stage 8; module map rows; "Adding things: a new section / a new figure"; single-file note), INTERFACE
("The material pages": reader, anatomy, figure grammar, records page, threshold sentence from PAGE_RULE; purpose-table
rows; the drawer link), DECISIONS **D141** "A material with three products and twenty values has a page of its own,
generated by the build and deciding nothing" (display only + one facts layer; renderer outside the release; one
threshold function; processed vs records; summary rules; one SVG grammar + OFL fonts; zip; drawer-only entry; checks),
DATA-MODEL (table + `written`), AGENTS.md recipe "Write or revise a material's summary", OPERATING "Publish", README
status line (generated), GOALS-LOG "Decided on 2026-10-16: a page per material" (the eight answers), RULES and
DATA-DICTIONARY (generated), `.github/workflows/pages.yml`.

## 6. Risks and their answers

| Risk | Answer |
|---|---|
| Drawer and page disagree | one facts layer; P2–P6/P12 on every page in verify; golden digests at step 1 |
| Summaries go stale or read as evidence | placeholders only + SUMMARY-NUMBER/PLACEHOLDER; byline, status, "decides nothing" |
| Each owner review of summaries makes a new release ID | review in batches, one commit per batch (kept in tables for the schema gate, lint, diff and record) |
| SUMMARY-PLACEHOLDER stops an unrelated migration when a value disappears | keep the error; message names material and field; recipe says re-word |
| verify:fast headroom | cache + measure at step 3; fallback moves the render out of verify:fast |
| Safari: `<use x="%">`, data: fonts | owner checks at the gate; fallback `<circle cx="%">`/`<rect>` |
| Prose frames duplicated (tranche 1) | numbers held by tests, words by the blind read; tranche 2 segment arrays |
| Records pages grow (PLA ~4 MB of 6) | warn at 80 %; first change: split by domain |
| Partial dev render left in dist/materials | P14 fails it, says run `npm run build` |
| Older releases have no zip | only the release built gets it |
