# A page per material: assessment and plan, 2026-10-16

> **Historical record** (2026-10-16): an assessment written before anything was built. It describes the tool and its
> data as they were on 2026-10-16 (commit `56f50042`, release of that day); numbers, rules and file names may have
> changed since. For where things stand now, read the [README](../../../README.md) and
> [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

**Asked by:** the owner. **Question:** the drawer reads well, with its dots and bars. Add, for each material, an
independent HTML page like a wiki page, opened from the drawer: a summary written by us, then everything on file for
that material, with charts and statistics beyond what the drawer can hold, designed to be read with pleasure. Judge
its benefit, whether it can be done, and what it costs, critically, against four concerns: the limits of GitHub Pages
and how the pages would be made; the load on CI, the pipeline and the architecture; maintenance and checking; and
whether a design can be both coherent with the tool and remarkable. Ask what needs asking, and write it so it can be
run as a plan if it is worth doing.
**Reviewer:** Claude (an agent), reading the repository and the build's output, timing the drawer's renderer in Node,
and reading GitHub's published limits. No person has reviewed this judgement yet.

## In short

**Doable, worth doing, and not heavy, on three conditions.** Every figure below was measured, and none of the four
concerns is a blocker:

1. **GitHub Pages is not the limit.** The whole set of pages, one per listed material, is about 75 MB of HTML before
   compression (7 MB compressed, which is how Pages serves it) against a 1 GB site limit; the deploy grows by seconds.
2. **The build already has everything the pages need.** The drawer renders every material's eight tabs from the
   compiled database in 3.7 seconds in Node, with no browser. A page renderer is the same kind of code, run once per
   build, writing static files. No new data is read, no new rule decides anything, and the pages are outside the
   release ID by design (what only draws the page is not in it, D96).
3. **The real costs are two, and both are editorial, not technical.** First, a second place that shows the same facts
   as the drawer must never disagree with it: the pages must read the same compiled fields through the same helpers,
   and a test must hold every number on every page against the build. Second, "a summary written by us" is 152
   summaries that someone writes and keeps true; that is the largest piece of work in the proposal, and it needs a
   rule before a word is written (section 6).

The three conditions: **(a)** the pages compute nothing that decides, only what displays, and share the drawer's
helpers; **(b)** a written summary states no number by hand, only through a placeholder the build fills, and says who
wrote it; **(c)** three pages are designed and approved before 152 are generated.

**What it improves** (GOALS, working rule 1): steps 4 and 5 of the method (understand, drill down) and scorecard lines
C5 (material summary), C8 (drill down), C10 (makers' know-how) and C11 (the record). It moves no answer: the decision
diff is zero by construction.

**What to be critical about.** Most materials are thin. Of the 152 the page lists, 38 have one product and 3 have none;
the median is 3 products. A "wiki page" for those is short, and a design that is remarkable for PLA (195 products)
must still be honest and worth opening for a material with one data sheet. The design below takes that as its first
problem, as the drawer did (INTERFACE, "Making absence legible").

---

## 1. What was measured

All on 2026-10-16, against commit `56f50042`, with the commands in section 11.

| What | Figure |
|---|---|
| The selector page as built | 8.28 MB; the database embedded 3.45 MB (gzip and base64), the plotting library 4.29 MB; served compressed at 4.17 MB |
| Materials the page lists | 152: 135 the H2C can print, 17 shown only to say why they are out; 23 group names (family entries) besides |
| Products per listed material | median 3, ninetieth percentile 13, most 195 (PLA); 38 materials with one product, 3 with none, 29 with ten or more |
| Records | 14,817 measured values, 1,835 print profiles, 868 environment records, 7,601 makers' statements, 365 prices, 2,016 documents (2,012 with a URL) |
| Prose already written | Best uses: 29 materials in prose, 32 as pointers to family records, 91 "Not published"; Limitations stated for 30 |
| Rendering every material's eight drawer tabs in Node | 3.7 s for 175 materials, no browser, no errors |
| The HTML that gives | 74.2 MB raw, 6.9 MB compressed; median material 211 KB raw (23 KB compressed); PLA 10.1 MB (705 KB), PETG 4.5 MB, ABS 3.2 MB, ASA 2.4 MB |
| Each material's own data, sliced from the database | median 10 KB compressed; PLA 317 KB; all 175 together 3.1 MB |
| CI today | Verify 418 to 559 s per push, its data and interface jobs side by side (the latest push: data 362 s, interface 524 s); Publish to Pages 61 to 86 s |
| verify:fast today | about 78 s after a data change, 45 s warm, against a 90 s budget (GOALS C13) |
| GitHub Pages limits | a published site of at most 1 GB; a soft 100 GB a month of bandwidth; a deploy that must finish in 10 minutes; the builds-per-hour limit does not apply to an Actions workflow; the deploy artifact is recommended under 1 GB and refused over 10 GB |
| The live site | `https://pdynamics.ca/h2c-materials/`, served by GitHub with `content-encoding: gzip`; the repository is public |

Sources for the limits: GitHub's [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
and the [upload-pages-artifact](https://github.com/actions/upload-pages-artifact) action's README.

## 2. Concern 1: GitHub Pages, and how the pages are made

**Verdict: no risk at this scale, and none at ten times it.**

- **Size.** 152 static pages, each self-contained (its own styles and a small script inline, no library), are about
  75 MB raw and 7 MB as served. Pages allows 1 GB. The selector page beside them is 8 MB. Even if the pages carried
  every record twice they would be under a tenth of the limit.
- **Bandwidth.** A team of a few engineers opening pages of 20 KB to 700 KB compressed is nowhere near 100 GB a
  month. The one page that could matter is PLA at 705 KB compressed; section 5 caps a page's size anyway.
- **Deploy.** The workflow already builds from the tables and copies `dist/` into `_site/`; it would copy one more
  folder. Uploading 75 MB more adds seconds; the 10-minute deploy timeout is far off (today's deploy is 61 to 86 s
  end to end).
- **URLs.** A page per material at `materials/<MaterialID>.html` (`materials/M020.html` for PETG). Material IDs are
  never reused, so a link stays good through a rename; the title carries the name. The custom domain serves the site
  under `/h2c-materials/`, so every link is relative, as the selector's are.
- **How they are made.** By the build, in Node, from the compiled database, as the drawer's HTML already is: a
  renderer that takes `db` and a material ID and returns a string. Nothing is hand-made, nothing is committed under
  `dist/`, and a change to the tables changes the pages on the next build, as it changes the selector.
- **The offline rule** (ARCHITECTURE, "Why one self-contained HTML file") holds for each page: inline styles, inline
  SVG charts drawn by the build, a script of a few kilobytes with no library, no web font unless embedded. A page
  opened from disk works. The one gap is a reader who downloads the single selector file from a GitHub release: its
  "full page" links lead nowhere unless the pages folder is beside it. Section 9 attaches the pages to the release as
  a zip, and the drawer's link says what it needs.

## 3. Concern 2: CI, the pipeline and the architecture

**Verdict: light, if the pages are a stage after the bundle and compute nothing that decides.**

**Where it goes in the architecture.** A stage 8, "pages", after the bundle (ARCHITECTURE, "The build, stage by
stage"). It reads `db` and `reference` as the bundle does and writes `dist/materials/*.html` and
`dist/materials/index.html`. The renderer itself lives in `app/pages/` beside `app/js` and `app/css`, because it is
interface code: `build/src` is one of the release's inputs (`RELEASE_INPUTS` in `build/src/release.js`), and a change
to how a page is drawn must not make a new release, exactly as a change to the drawer does not (D96). The call from
`build/src/index.js` is a thin, stable one. The build already reads `app/` files to bundle them; importing one module
from `app/pages/` is a small step further, written down in ARCHITECTURE's module map.

**What the renderer may read and compute.** This is the condition that keeps the architecture coherent, and it is
the same rule `print-spread.js` follows today (D139): *display only; nothing here is stored, and nothing decides.*

- It reads the compiled fields the drawer reads: `materials[].headline` and `.summary` (each key property's median,
  range, quartiles, typical product, variants, twins), `grades[].headline` and `.print` (each product's own value and
  print gate, with where each came from), `grades[].states`, `measurements`, `profiles`, `evidence`,
  `polymerEvidence`, `knowHow`, `prices`, `sources`, `coverage`, `method`, `registry` and `meta.h2cBaseline`.
- It uses the drawer's own helpers for words and numbers: `format.js` (numbers, ranges, bounds, estimate words),
  `labels.js` (every display name, the gate words, `describeConstraint`), `print-spread.js` (print windows product by
  product), `registry.js`, and `products.js` from the engine (`productsByMaterial`, `stateOf`, and the build's
  `assess` reason codes for why a record is not drawn). A new word goes in `labels.js` and nowhere else (ARCHITECTURE,
  "Adding things").
- It may compute **statistics for display**: a material's rank among all materials on a key property (every
  material's median as a tick, this one marked), a product-by-product scatter of two properties, Z as a share of XY
  per product, a maker-by-maker table, price per kilogram across products, the dates documents were read. None of
  these is stored, none decides, and each is worked out from the compiled fields on every build.
- It may **not** choose a product's value, decide a gate, judge a requirement, or estimate anything. Those are the
  build's and the engine's, and the page shows their results.

**CI load, measured against today.**

| Step | Today | Added | Where |
|---|---|---|---|
| `npm run build` | about 14 s cold for the estimate stage, then the bundle | +4 to 8 s to render 152 pages (the drawer's eight tabs for 175 materials take 3.7 s) | both CI jobs, and every local build |
| Tests in `verify:fast` | 78 s after a data change, 45 s warm | +1 s: a smoke test on five pages | verify:fast |
| Tests in `verify` (data group) | 339 s on CI for the data job's checks | +10 s: every page held against the build | verify, CI data job |
| Interface views and rendered scenarios | 506 s on CI for the build, the views and 300 scenarios | +30 to 60 s: six pages on three screens | verify, CI interface job |
| Publish to Pages | 61 to 86 s | +10 to 20 s: 75 MB more to upload and deploy | pages.yml |

The one budget that matters is `verify:fast`'s 90 s (GOALS, working rule 5). Rendering adds 4 to 8 s to every build,
which leaves 4 to 8 s of headroom after a data change instead of about 12. Two levers, in order: first, render only
what the reader reads and keep the markup lean (the drawer's rows carry buttons and marks a static page does not);
second, cache the rendered pages by content as the database is cached (`build/src/build-cache.js`): the key is the
database's digest with the digest of `app/pages/`, `app/js/ui/` and `app/css/`, and a warm `verify:fast` then pays
under a second. The plan measures after step 2 and adds the cache if the headroom is under 8 s.

**The pipeline is untouched.** No table changes for the pages themselves; the summaries (section 6) add one small
table with a schema and two lint codes, through the usual path. The import pipeline, the estimate stage and the
reader are not involved. `build:diff` shows 0 differences for the whole feature, because the pages are outside
`db.json`; what a change to the pages did shows in a new snapshot file (section 4).

## 4. Concern 3: maintenance and checking

**Verdict: the same discipline the drawer has, applied to a second rendering surface. The risk to manage is
disagreement between the two.**

**The one real risk.** The drawer and the page show the same facts. Two renderers of one fact drift (D102 was one
such lesson: the table, the chart and the export once ranked differently). Three guards:

1. **One source of every number.** Both read the compiled fields; the page never recomputes a median or chooses a
   value. Where the page needs a number the build does not hold, the right fix is to compile it (and then the drawer
   can show it too), never to compute it in the page alone.
2. **Shared helpers for words and formatting**, as above. A number is formatted by `fmtNumber`, a range by
   `fmtRange`, a bound by `fmtBounded`; a gate by `gateVerdict`; a display name by `labels.js`.
3. **A test that reads every page and holds it against the build**, as `test/drawer-comparisons.test.js` holds every
   comparison the drawer draws against `assess` (8,190 records, 5,436 print dots). The invariants are listed in
   section 8.

**What is checked, and where it runs.**

| Check | What it holds | Runs in |
|---|---|---|
| `test/pages-smoke.test.js` | Five pages (the largest, the median, a one-product material, an excluded one, a group name's absence) render without error, carry the release ID, and pass the invariants | `verify:fast` (about 1 s) |
| `test/pages.test.js` | Every listed material has a page; every key figure equals the build's; every dot count equals its counted line; every source link is a URL the database holds; every internal link resolves; no record ID in reader prose; none of the coinages INTERFACE replaces; tags balance; each page under its size budget | `verify` data group, CI |
| `ui-probe` steps `40-pages-<screen>-<material>` | Six pages on laptop, tablet and phone: no exception, no element past the right edge, no clipped cell, the contents rail and figures present; text summary under `build/snapshot/ui/` | `verify` interface group, CI |
| `build/snapshot/pages.csv` | Per material: bytes, sections present, products drawn, values listed, documents listed, summary status | `npm run snapshot`, checked in `verify` |
| `dist/manifest.json` | One digest over the pages set, under `outputs`, so the reproducible-build check covers them | `verify` trend group, weekly |
| Lint `SUMMARY-NUMBER`, `SUMMARY-PLACEHOLDER` | A summary states no number by hand; every placeholder names a key property the material has | `verify:fast` (lint) |
| A blind read | Agents read 40 pages against a checklist (section 8) once per round that touches the pages | the round's record |

**Documents that change**, in the same commit as the code: ARCHITECTURE (stage 8, module map, "Adding things"),
INTERFACE (a section "The material pages": the reader, the purpose of each section, the figure grammar), DECISIONS
(one entry, D141), OPERATING ("Publish": the pages are part of the site), the README's status block (one line),
DATA-DICTIONARY and RULES (generated), and `pages.yml`. GOALS-LOG records the owner's answers to section 7.

**Ongoing cost.** Code: a renderer of perhaps 1,500 to 2,500 lines in `app/pages/`, a stylesheet of 600 to 900 lines,
tests of 300 to 500 lines, probe steps of 50. Each new key property or comparison the data names (D139) appears on the
pages through the registry with no code, as it does in the drawer. Each new word goes in `labels.js`. The summaries
are the ongoing editorial cost (section 6).

## 5. Concern 4: doability, and a design both coherent and remarkable

**Verdict: doable. The hard part is not the code; it is designing for 38 one-product materials as well as for PLA.**

### What the page is, and is not

A material page is a **document**: read top to bottom, linked, printed, cited. The selector is a **workbench**:
filtered, ranked, compared. The two share facts, words and colours, and differ in genre. That difference is what
lets the pages be designed anew without the selector changing: a different grid, a reading scale of type, figures at
full width, a contents rail, captions. It is also what keeps them coherent: the same tokens (`app.css`'s `:root`),
the same status palette reserved for the four verdict states and used for nothing else, the same dot vocabulary as
the drawer (filled: the stated orientation or load; hollow: not stated; square: annealed; diamond: a special
formulation; coloured: sold as toughened), the same words (D124) and the same light and dark themes.

### How it earns "remarkable"

Not through decoration. Through four things the drawer cannot do at 620 px wide:

1. **Context on every number.** Beside each key figure, a strip of every material's median as a faint tick, this
   material marked: where PETG's 46.5 MPa sits among 135 materials. The drawer gives the material's own spread; the
   page gives its place.
2. **Products by name at full width.** The drawer's dot rows with each maker's product labelled, the H2C's limits
   drawn, the median and middle half shaded, and hover or tap lighting the same product on every figure of the page.
3. **Relations drawn, not listed.** Strength against modulus, strength against price per kilogram, Z against XY,
   product by product; the print window of every product on one axis; an environment matrix of category against
   verdict, own records and polymer-level ones told apart.
4. **A written opening.** One paragraph to one page of prose by the team, which the drawer has no room for.

### The problem of thin materials

For the 38 one-product materials and 3 with none, a page cannot pretend. The rule the drawer follows holds: a section
with nothing says so in one line and gives the recorded reason, never a blank or a zero. What fills a thin page with
real content is context: the rank strips (one value still has a place among 135), the base polymer's published
behaviour attached by the build (D64), the family's guidance records, the Bambu Lab Filament Guide row where the
sheet is silent (D88), and the known gaps in the reviewer's words. The prototype step (section 9, step 1) renders a
one-product material on purpose, and the owner judges that page before the design is called finished.

### The design direction, concretely

- **Grid and measure.** One column of prose at 68 to 72 characters; figures break out to about 1,100 px; a sticky
  contents rail on the left from 1,200 px up, a strip of section links above the text below that; on a phone one
  column, 16 px gutters, no sideways scroll (the probe fails it otherwise, as today).
- **Type.** The tool's system stack (no download, works offline), with a reading scale: body 17 px at 1.6, a modular
  scale for headings, display numerals at 40 to 56 px with tabular figures for the key figures. Section numbers as a
  data sheet has them. If the owner wants a distinct typeface, one variable font subset embedded as base64 costs 80 to
  150 KB per page (12 to 23 MB over the set) and is the one decoration this plan would spend on (question 3).
- **Colour.** The tool's tokens: paper and ink, one accent for links and marks, the status palette only for verdicts,
  the claim colour only for a maker's toughened claim (D133). Dark mode by the same tokens.
- **Figures.** Inline SVG drawn by the build: a dot row, a rank strip, a scatter, a range bar, a matrix cell. One
  grammar, one caption style under every figure saying what is drawn and what is left out (D124). Logarithmic scales
  where the drawer uses them, temperatures linear (D139). Every figure also exists as text (its counted line and its
  list), so it prints and is read by a screen reader.
- **Motion.** Hover and focus only: a product lit across every figure, a tooltip with its name and value. Nothing
  moves on load.
- **Print.** A print stylesheet: the page prints as a data-sheet-like document with the figures and without the rail.
- **Words.** D124 in full: the engineer's terms, no coinages, the answer first, one caveat per section at its top, no
  record ID in a sentence (the small ID mark the drawer uses, where a reader traces a number).

### Page anatomy, section by section

Each section names the compiled fields it reads, so an agent can build it without inventing a source.

| # | Section | What it shows | Reads |
|---|---|---|---|
| 0 | Masthead | Name, full name, family, base polymer and filler, Bambu Lab status chip; one line: N products from K makers, M measured values, S documents; data date and release | `materials[]` (name, fullName, family, basePolymer, modifier, h2cStatus), counts from grades, measurements, sources; `meta` |
| 1 | In short (written by us) | The summary, with its placeholders filled; a line saying who wrote it, when, and its review status; a sentence that it decides nothing | `material_summaries.csv` compiled into `materials[].written` |
| 2 | Key figures | Up to eight large figures: density, tensile strength and modulus XY, elongation XY, HDT at 0.45 MPa, Tg, notched Charpy, price per kg; each with median, range, product count, the typical product, and its rank strip among all materials | `materials[].headline`, `.summary`, every material's `headline` for the strips |
| 3 | Printing on the H2C | The print window of every product (nozzle, bed, chamber, drying) on one axis with the H2C's limits; hardened nozzle, drying and AMS statements; where a setting is a shared sheet's or the guide's, said | `grades[].print`, `print-spread.js`, `printGuide`, `meta.h2cBaseline`, `profiles` |
| 4 | Mechanical | Tensile, flexural and impact comparisons at full width with product names; Z as a share of XY; a scatter of strength against modulus; then every property's values with method, orientation, specimen and condition | `registry.comparisons`, `grades[].headline`, `measurements`, `assess` reasons |
| 5 | Thermal | HDT and Tg comparison; Vicat and the rest listed | as above |
| 6 | Physical | Density, shrinkage, moisture uptake and the other physical properties | `measurements`, `properties` |
| 7 | Environment | A matrix of category against verdict; the material's own records and the polymer-level ones apart; each with its finding and document | `evidence`, `polymerEvidence`, `meta.environmentCategories` |
| 8 | Products | A table of every product by maker: verdict-free key values, print window, price, state flags, shared-sheet marks; each row opening the product's card with its values, statements and sources | `grades[]`, `prices`, `knowHow` |
| 9 | What makers say | Statements grouped by topic (Good for, Benefits, Pitfalls, Warping, Precision), each a quote with its document and page; the gap state per product (collected, sheet silent, searched) | `knowHow`, `materials[].knowHow` |
| 10 | Price | Price per kilogram across products as a dot strip; converted listings marked with their rate and date; sampling dates | `prices`, `fxRates`, `meta.priceSample` |
| 11 | Estimated, not measured | Each estimate as the drawer words it, fenced and labelled; what it rests on and what it may screen | `materials[].headline` where origin is an estimate, `meta.estimateModel` |
| 12 | Sources | Every document: kind, publisher, title, access date, link to the original; what each gave; then Known gaps in the reviewer's words | `sources`, `coverage`, `materials[].evidenceIds` |
| 13 | The complete record | Every measured value as a sortable, filterable table (small inline script; readable without it); on a page over its budget, a companion page `M001-records.html` | `measurements` |
| 14 | Footer | Release ID, data date, build date, how to cite the page, "Open in the selector" (a link the engine's `toHash` writes, so it reproduces), the method sentence that data-sheet values are not design allowables | `meta.release`, `method` |

An excluded material's page is sections 0, 1, 12 and 14 with one line in place of the rest: why it is out (its
high-temperature or sintering status). A group name (family entry) gets no page; the index lists its members under it.

## 6. The written summary: the largest cost, and a rule it needs

"A summary written by us" is the part of the proposal with no precedent in the repository. Three facts set its cost:

- There are 152 pages. Today 29 materials have Best uses in prose and 30 have Limitations; the rest say "Not
  published" or point at family records. So about 120 summaries are new writing.
- The rule since D35 is that nothing enters the data from a report, a summary or memory. That rule is about
  **values**, and it must stay. A written summary is **editorial**: it states no fact the records do not, and it
  decides nothing. GOALS already has a place for that: the Record tier, "lightly checked, never deciding".
- Prose that states a number goes stale the day a value is corrected. The drawer avoided this by deriving every
  sentence from the data. A summary that says "about 47 MPa" is wrong after the next migration.

**The proposal.** A table `material_summaries.csv` (one row per material, schema beside it):

| Column | Holds |
|---|---|
| MaterialID | the material |
| Summary | the prose; a number only as a placeholder the build fills, `{tensileStrengthXY.median}`, `{products}`, `{makers}` |
| Written by | who or what wrote it ("Claude Opus from the records of 2026-10-20", "the owner") |
| Written on | the date |
| Review status | `draft`, `reviewed by the owner`, `revise` |
| Notes | what the writer could not say and why |

Two lint codes: `SUMMARY-NUMBER` (a digit followed by a unit, outside a placeholder, fails) and `SUMMARY-PLACEHOLDER`
(a placeholder names a key property the material does not have, or a field the build does not fill). The page prints
the summary with its author line and status; a draft says so in the same line. The build compiles the row into
`materials[].written`, and the drawer's Overview may show its first sentence under the lede later, if the owner wants
that.

**Who writes them.** The owner's practice since 2026-10-05 is that Claude judges filings and drafts prose for review
(GOALS-LOG). Claude Sonnet agents draft each summary from the material's own page and nothing else (the records, the
statements, the known gaps), 120 to 250 words, in D124's terms, with a checklist: every claim points at a section of
the page; no number by hand; no superlative the records do not support; the family's guidance quoted as the family's;
what is not on file said once. Claude Opus judges a sample of 40 against the pages; the owner reviews over time and
sets the status. Estimated effort: one day of agent time for 152 drafts and their judging; the owner's reading is the
owner's.

**What the owner decides** (question 2): that editorial prose of this kind is admitted, as a Record-tier text that
decides nothing, written in a table of its own with its author and status shown.

## 7. Questions to the owner, each with a recommendation

Working rule 6: each with a recommended answer, what it affects later, and when to revisit it. Written so they can be
answered with a yes, a no, or a letter.

**1. Which materials get a page?** Every material the selector lists: the 135 the H2C can print, and the 17 it shows
only to say why they are out (a short page saying so). Names that are only another material's alias or a group name
(PLA Basic, the "PA" family entry) get no page; the index lists them under the material they belong to.
*Recommended: yes.* Affects the index and how many summaries there are. Revisit if a group name gains products of its own.

**2. May we write our own text about a material?** Today every sentence on the page is derived from the data. A
summary "written by us" would be the first text that is our own words. The proposal: yes, with three rules. It never
contains a typed number (a number is a placeholder the build fills from the data, so it cannot go stale). It says who
wrote it, when, and whether you have reviewed it. It never changes any answer. Agents write the first draft of each
from that material's own page; you review them when you have time and mark them reviewed.
*Recommended: yes, under those rules.* Affects one new table, two lint checks and the page's first section. Revisit
at the team trial, to see whether engineers read it.

**3. How should the pages look?** A: the tool's own fonts and colours, set larger with more room, as a document rather
than a workbench. No download, works offline. B: the same, plus one distinctive typeface embedded in every page, which
costs 80 to 150 KB per page. *Recommended: A, and decide on B after seeing the three prototype pages.* Affects page
size and how "coherent" reads. Revisit when the prototypes are on screen.

**4. For a big material, where does the complete list of every measurement go?** PLA has 2,440 values. A: all on the
page, always. B: on the page up to a size limit (3 MB), and beyond that on a separate "all records" page linked from
the section. *Recommended: B.* Today it would move four or five materials' lists (PLA, PETG, ABS, ASA, perhaps PC).
Revisit if more cross the limit.

**5. How are the charts drawn?** A: plain SVG pictures drawn by the build: light, work offline, print well, readable as
text, but no zoom or pan. B: the Plotly library the selector's trade-off chart uses: zoom and pan, but 4.3 MB in every
page. *Recommended: A.* Affects what a figure can do. Revisit if a figure needs what SVG cannot give.

**6. Build three pages first?** PETG (69 products), PLA (the largest) and one material with a single product, shown to
you before the other 149 are generated. *Recommended: yes.* Adds one approval step. Not needed again.

**7. Should each release carry the pages too?** Someone who downloads the single selector file from a GitHub release
has no pages beside it, so its "Full page" links lead nowhere. A zip of the pages attached to each release fixes that.
*Recommended: yes.* Affects the publish workflow. Revisit if releases stop being kept.

**8. Where do readers find the pages?** A **Full page** link in each material's drawer header, and a **Material pages**
link in the selector's top bar that opens an index of every material by family with its product count.
*Recommended: yes to both.* Affects the selector's header and drawer. Revisit at the team trial.

## 8. The checks, specified

**Invariants `test/pages.test.js` holds for every listed material** (P1 to P12):

- P1 A page exists at `dist/materials/<id>.html`, parses as one `<html>` document, and its tags balance.
- P2 The masthead's counts (products, makers, values, documents) equal the counts the drawer's tabs show for the
  material.
- P3 Every key figure's median, range and product count equal `materials[].headline[key]` and `.summary[key]`,
  formatted by the same `fmtNumber`; a key property that is not applicable or has no value says so in the drawer's
  words.
- P4 Every rank strip has one tick per material that has the value and marks this material once.
- P5 Every comparison figure draws exactly the products `assess` admits, with the same reason codes for those not
  drawn, as `test/drawer-comparisons.test.js` holds for the drawer; its counted line adds up to its lists.
- P6 Every print dot equals the product's `grades[].print` setting, and a guide-read setting is drawn hollow and
  never counted (D139).
- P7 Every source link is the URL of a `sources[]` row the material's records cite; a local-file source is said, not
  linked.
- P8 Every internal link resolves: to another page in the set, to the index, or to the selector with a hash
  `fromHash` accepts.
- P9 No record ID (`V\d{6}`, `G\d{3}-\d{2}`, `P\d{4}`, `Q\d{5}`, `S-…`) appears in reader prose outside an ID mark;
  none of the coinages INTERFACE's table replaces appears ("twin", "admitted", "grade" as a noun, "research mode", "in
  scope", "headline", "coverage record").
- P10 The page carries the release ID, the data date and the build date, and they equal `meta`'s.
- P11 The page is under its size budget, and the set under 150 MB raw.
- P12 The summary, where one exists, carries its author line and status, and every placeholder was filled.

**The probe's six pages**: PLA (the largest), PETG, ASA-CF (a filled material), a one-product material, an excluded
material (PEEK), and the index; each on laptop (1180 × 760), tablet (820 × 1100) and phone (390 × 844): no page
error, nothing past the right edge, no clipped cell, the contents rail present at laptop width and absent on the
phone, every figure's SVG present with its caption. Recorded as text under `build/snapshot/ui/40-pages-*.txt`.

**The blind read's checklist** (40 pages, Claude Sonnet agents, judged by Claude Opus): the masthead counts against the
drawer; each key figure against the drawer's Key properties; each figure's caption true of what is drawn; each
section with nothing saying so and giving the reason; the summary's claims each pointing at a section of the page; no
coinage; every link opened; the page read on a phone.

## 9. The plan

Five steps, each with what it delivers and the check that closes it. Steps 1 to 3 are one round; step 4 may be the
same round or the next. Effort is agent time at this project's cadence (the drawer comparisons round built four
comparison headings, their tests, a sweep of 521 headings and a blind read in one day).

### Step 0: decisions (the owner, no code)

Answer section 7. Record the answers in GOALS-LOG ("Decided on …, a page per material"); draft D141 with the three
conditions of "In short" and the display-only rule of section 3. Nothing else starts until question 2 is answered,
because the summary's rule shapes the page's first section.

### Step 1: three pages, by hand-run renderer (about one day)

- `app/pages/render.js` (`renderMaterialPage(db, reference, materialId, { release })` returns HTML), `app/pages/sections/*.js`
  one file per section of the anatomy, `app/pages/svg.js` (dot row, rank strip, scatter, range bar, matrix cell),
  `app/pages/pages.css`, `app/pages/page.js` (the inline script: contents rail, product lighting across figures,
  table sort and filter, theme), `app/pages/index-page.js`.
- `npm run pages -- M020 M001 <one-product id>` writes `dist/materials/` for those alone; the three pages and
  screenshots on three screens go to `screens/` in this folder for the owner.
- Check: `test/pages-smoke.test.js` on the three; the owner's approval of the design, or its revision. **Gate: the
  owner says the one-product page is worth opening.**

### Step 2: every page, wired in (about one day)

- Stage 8 in `build/src/index.js`: after the bundle, render every listed material and the index; write the set's
  digest under `outputs` in `dist/manifest.json`; delete pages of materials no longer listed.
- The per-page budget and the companion records page (question 4).
- The drawer's header gets **Full page** (`materials/<id>.html`, a new tab), with a title saying where the pages are;
  the top bar gets **Material pages** (the index); each page's footer gets **Open in the selector**.
- `pages.yml`: copy `dist/materials/` into `_site/materials/`; zip it for the release (question 7).
- Measure `verify:fast` after a data change; add the content cache for the pages if the headroom is under 8 s.
- Check: `npm run build` writes 152 pages and the index; `build:diff` shows 0 differences; the live site after the
  push serves `materials/M020.html`.

### Step 3: checks and documents (about one day)

- `test/pages.test.js` (P1 to P12), the probe's six pages and their snapshot files, `build/snapshot/pages.csv` in
  `scripts/snapshot.mjs`, the reproducible-build check over the pages' digest.
- ARCHITECTURE, INTERFACE, DECISIONS (D141), OPERATING, README status line, `pages.yml` comments; `npm run docs:rules`
  and `docs:dictionary` regenerate; `npm run docs:links -- --check` passes.
- Check: `npm run verify` green locally, then CI's three jobs green on the push.

### Step 4: the written summaries (about one day of agent time; the owner's reading apart)

- `schema/tables/material_summaries.schema.json`, the table, `TABLE_ORDER`, `TABLES`, `TEXT_TABLES`, the two lint
  codes, the compile step that fills placeholders into `materials[].written`, and section 1 of the page reading it.
- Claude Sonnet agents draft one summary per listed material from its page alone, with section 6's checklist; Claude
  Opus judges 40; every row enters as `draft`.
- Check: lint clean; `test/pages.test.js` P12; the blind read of section 8 includes the summaries' claims.

### Step 5: blind read and close (half a day)

- 40 pages read against the checklist; faults fixed, each with its guard where it was a class.
- `npm run round:close`; the round's working files to the private store (D138); this folder keeps the assessment,
  the screens and the counted verdicts. GOALS-LOG records what was built. Push when the owner says.

### What this plan does not do

- It does not change the selector's design, its drawer, its engine or any answer. The decision diff is zero and
  `templates.csv` is unchanged, checked by `build:diff` and the snapshot.
- It does not add a search over the pages, comments, accounts or a server. The pages are static files on the same
  site, as GOALS keeps the team layer (C14) for later.
- It does not write a page per product. A product's card lives on its material's page; a product URL (`#` to its
  card) is enough today.

## 10. Risks, and what answers each

| Risk | How likely | What answers it |
|---|---|---|
| The page and the drawer disagree on a number | Certain without a guard; the usual cause of a wrong page here | One source of every number, shared helpers, P2 to P6 on every page in `verify` |
| Thin materials make thin pages that a reader stops opening | Likely for 41 materials | Absence said in one line; context sections (rank, polymer, family, guide); the one-product prototype judged by the owner first |
| A summary states a number that later changes | Certain without a rule | Placeholders only; `SUMMARY-NUMBER` lint; author and status on the page |
| Editorial prose read as evidence | Possible | "Decides nothing" said in the section; Record tier by rule (D141); no verdict word in a summary (the checklist) |
| `verify:fast` crosses 90 s | Possible after a data change | Lean markup; the content cache for pages; the full sweep in `verify`, not `verify:fast` |
| PLA's page too heavy to read with pleasure | Likely if every record is rendered inline | The 3 MB / 300 KB budget; a companion records page |
| A design change makes a new release | Would happen if the renderer sat in `build/src` | The renderer in `app/pages/`, outside `RELEASE_INPUTS` (D96) |
| A downloaded single-file release has dead "Full page" links | Certain for that reader | `materials.zip` on the release; the link's title says so |
| The pages drift from D124's words over time | Likely, as the drawer did (the 2026-10-15 proofread) | P9 on every build; the blind read each round |
| Pages' bandwidth or size limits | Not at this scale, nor at ten times | Measured in section 1 |

## 11. How the figures were measured

```bash
# The built page's parts (bundle.js embeds the database and reference as gzip+base64 and inlines Plotly)
ls -la dist/ build/node_modules/plotly.js-dist-min/plotly.min.js
node -e "const h=require('fs').readFileSync(require('fs').readdirSync('dist').filter(f=>f.startsWith('H2C_')).map(f=>'dist/'+f)[0],'utf8'); console.log(h.length, h.match(/id=\"db-data\"[^>]*>([^<]+)</)[1].length)"

# Materials, products per material, prose fields, records per material: from dist/db.json
node -e "const db=require('./dist/db.json'); /* see the counts in section 1 */"

# Rendering every material's eight drawer tabs in Node, and the HTML it gives (the proxy for a static page)
node docs/audits/2026-10-16-material-pages/render-time.mjs   # from the repository root; imports renderDrawer as test/drawer-comparisons.test.js does

# CI durations
gh run list --limit 12 --json name,status,conclusion,createdAt,updatedAt,event

# The live site's compression
curl -sI -H 'Accept-Encoding: gzip, br' https://pdynamics.ca/h2c-materials/
```
