# Stage 2b: fibre content as a number, and Shore hardness as a filter

> **Historical record** (2026-10-18): stage 2b of the screening build, on branch screening-build/stage-2b, before it merged. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** Each fibre-filled product now carries the fibre load its own sheets state, as a number with the page's
> words beside it. 150 of the 252 fibre-filled products have one: 141 from their own sheets and 9 from a twin's sheet
> (two products whose makers print one table). The other 102 state none on any sheet that was read. Shore A and Shore D
> hardness became properties a reader can set a limit on, chart and export. No answer moved, because no preset asks
> either yet: they are inputs for the later stages. The judgement calls are listed in [SPOT-CHECK.md](SPOT-CHECK.md).

## What changes for a reader

**A fibre-filled product shows its fibre load.** Open Polymaker Fiberon PA6-GF25 and its values list "Fibre content
25 %", with the maker's words: "containing 25% glass fiber by weight". The value sits with the product's other physical
values, in the drawer and on its material page under "Other properties". It decides nothing yet. Stage 3b will use it
to cap how stiff a fibre load can make a plastic (the review's change C32), and to flag a claim that contradicts its own
fibre load (C40), such as Spectrum PLA Carbon's 12.5 GPa at a stated 10 %.

**Two new limits in the filter rail: Shore A and Shore D hardness.** Both sit in the Mechanical group and ask "no harder
than". A gasket can now ask for Shore A 90 or softer. 70 products publish Shore A (in 15 materials, nearly all
elastomers) and 89 publish Shore D (in 46 materials). The two scales are never compared with each other. A hardness
whose scale the sheet does not name, a Rockwell value and a moulded plaque's value stay on the record and decide
nothing. The rail now holds twelve limits instead of ten.

**A number only a product's name gives never decides.** Bambu Lab's "TPU 95A HF" prints no hardness test; its 95A comes
from its name. The database always called such a value "a rating the product's name gives, never a test result", but
nothing enforced it, because no limit read hardness. Now the build refuses it as a product's value, so those four TPU
and PEBA products state no Shore A hardness to the new filter. Twelve fibre loads that only a name gives (PA6-GF30)
are recorded the same way.

**Some counts on the page shift.** Where the selector says how many of its limits a material publishes, the count is
now out of twelve ("ASA-CF 11 of 12" where it said "10 of 10"). Which maker a PLA's product list shows first also
changed (SUNLU now, eSUN before), because SUNLU's PLA-METALLIC is PLA's typical product for Shore D.

## How the fibre loads were read

Three Claude Sonnet readers read every registered sheet of the 252 products and wrote each statement in the reading
format, with the page's own words. Then the tool checked each quote against the page's text, and mapped what the page
bore out into rows to add. As the reviewer, Claude Opus 5.5 found the readers had not been given every sheet: their
packets held each product's main sheets, not the maker pages and safety data sheets registered beside them. So the
reviewer read those too. Eleven products the readers found nothing for state a load there, among them 3DJake's ecoPLA CF
(5 %), Fillamentum CPE CF112 (12.5 %) and Siraya Tech's ABS-GF (18 to 22 % on its safety data sheet). For nine products
whose only reading was a name, the reviewer read a sheet that says the figure in words, such as Polymaker's page for
Fiberon PA6-CF20: "containing 20% carbon fiber".

Where two sheets of one product print the same figure, it is recorded once. Where they differ, each keeps its row: a
safety data sheet's 15 to 20 % beside a data sheet's 15 % are two statements.

## The judgement calls, and what was decided

**A figure from the name alone is a rating, not a test (12 products).** FibreX PA12+GF30's sheet prints no percentage,
only its name. A name such as GF30 states the load in percent by the industry's naming, so the figure is kept, with the
name as its raw words and the status "rating the product's name gives".

**A skin-core filament says whose figure it is.** QIDI's NexABS-GF25 and ASA-CF20 Core say the inner core holds 25 % and
20 % and the outer shell none, so the filament as a whole holds less. Those two rows say "the core's content" and are
kept once each. Raise3D's Hyper Core sheets say "most of the carbon fiber (25 wt.%)" lies in the core: the load is the
filament's, as the product names (CF15, CF25, GF25) say. Siraya Tech's PPA-CF Core safety data sheet gives 20 to 25 %
for the filament as sold, so its 25 % is the filament's, and its ABS-CF Core sibling is read the same way.

**A load by volume is another quantity, and is not recorded.** Extrudr DuraPro ASA CF prints "Carbon fiber content ASTM
D785 %vol 12". By weight that is about 19 %, and ASTM D785 is a hardness test, so the row is a template error. The
product's composition keeps the sheet's words.

**"Approximately" stays in the note.** Eryone's sheets say "The carbon fiber content is approximately 15%". The tool held
these as marketing claims, a rule written for temperatures a part "withstands up to approx." A composition stated as
approximate is still the maker's figure, so three are kept with the word in their note. FormFutura's "circa 3%" and
iSANMATE's "about 25%" keep theirs too. Eryone's ABS-CF has a plain "10%" on its product page, which is used instead.

**CarbonFil's two revisions keep a row each.** The undated sheet says 20 %, the sheet of 23-8-2024 says 15 %. A reader
had filed the 15 % under the older sheet, which does not print it. Each figure is now on its own sheet.

**Flashforge PET-GF: 15 %, and a conflict recorded.** The product's description says 30 % glass fibre, from a document
whose text cannot be checked. Its readable data sheet says 15 %. The 15 % is recorded, and the conflict is listed for the
maker in OPEN-PROBLEMS.

**Spectrum ABS Kevlar: kept from the 2025 portfolio.** The 2024 portfolio's line was read at low confidence, because its
layout puts descriptions beside the wrong names. The 2025 portfolio prints the row cleanly: "ABS Kevlar | 10% Aramid
fiber reinforced". That row is used.

**BASF Ultrafuse PET CF15: from its name.** A reader quoted "reinforced with 15 % carbon fiber", but no page of the
sheet prints it. Its title, "Ultrafuse PET CF15", does, and is recorded as a rating.

## What did not move

No answer moved. The decision check compares every material's verdict, listing, group and product answer across 138
cases (six presets in three modes, and 120 single-requirement questions), before and after: nothing changed
([stage-2b-diff.md](stage-2b-diff.md)). The estimate model's output did not change either: the database comparison
shows the two new headlines and the 146 new values only, and no estimate.

## What this stage leaves

- 102 fibre-filled products state no load on any sheet read. They are a gap in what makers publish, not an error
  (OPEN-PROBLEMS §38.2).
- The basis of a load (by weight, by volume, the core's or the filament's) is in words, not in a column. The rule that
  will read these numbers in stage 3b must read the two QIDI rows as an upper bound (OPEN-PROBLEMS §38.3).
- Spectrum's pctg cf10 is filed under CPE-CF, while the FormFutura product whose table it prints is under PCTG-CF. With
  both loads recorded, the pair now shares 8 of its 10 values. Moving it would move answers, so it waits for a ruling
  (OPEN-PROBLEMS §33.8).
- A material page lists Shore hardness under "Other properties" only, as before: no figure draws it.

## Checks run

`data:fmt`, `data:check` (0 issues) and `data:lint` (381 findings, all accepted with a reason, none stale; one new
acceptance, the Spectrum and FormFutura pair above). The migration re-runs as a no-op. `build:diff`: 1,145 differences,
all the two headlines, the 146 values and their counts. `npm test`: 719 tests, all passing. `pages:check` 16 of 16. The
interface views were rewritten with `ui:check -- --write` and read: five views changed (the counts and the PLA maker
order above, and Compare and the Ashby chart listing the two new properties), with no layout failure. `npm run
verify:fast` took 39.1 s with the build cache holding this stage's build (the build itself takes about 40 s after a data change), within the 90 s budget.

## Evidence and where to check

- The readings: [fibre/readings/](fibre/readings/) (three readers' files, the reviewer's `readings-opus-review.csv`, the
  products each reader was given). The tool's check of each reading: [fibre/reconcile/](fibre/reconcile/). What it
  proposed and held: [fibre/proposals/](fibre/proposals/). The reviewer's decisions, one per reading with its reason:
  [fibre/review.csv](fibre/review.csv), applied by [fibre/review.mjs](fibre/review.mjs) into
  [fibre/reviewed/](fibre/reviewed/), which the migration applies.
- Migration `scripts/migrate/m444-fibre-content.mjs`: 146 values added (V015431 to V015576), 12 marked as a name's
  rating. Decision D150.
- Code: `build/src/compile.js` marks a name's rating (`nominal`), `build/src/products.js` refuses it as a headline's
  value, and the drawer (`app/js/ui/material-facts.js`), the charts (`app/js/ui/axes.js`) and the material pages
  (`app/pages/sections/other.js`) follow. `scripts/ingest/read-proposals.mjs` no longer treats a range as a twin of its
  lower end. Tests: `test/products.test.js` (Shore and nominal), `test/ingest-read-proposals.test.js` (the range),
  `test/new-property.test.js` (its made-up property is now rebound resilience, since Shore A is real).
- Decision diff: `node docs/audits/2026-10-18-screening-build/decision-census.mjs --diff after-s2a.json after-s2b.json`.

The record-level change list (`npm run data:diff`):

| Table | Record | Change |
|---|---|---|
| properties | Fibre content | Added: physical, %, applies to the carbon, glass, aramid and natural fibre materials |
| headline_definitions | shoreA, shoreD | Added |
| measurements | V015431 to V015576 | 146 Fibre content values added; 12 with Data status "Nominal from product designation" |
| review | accepted-findings.csv | 1 acceptance added (GRADE-VALUES-TWIN, G090-02 and G144-01) |

## Words used here

- **Twin:** two products whose makers print one table; each reads the other's values where its own sheet is silent.
- **Rating the product's name gives:** a number only the name states (TPU 95A, PA6-GF30), never a test result.
- **Skin-core filament:** a filament with a fibre-rich core inside an unfilled shell.
