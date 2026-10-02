# Removing the data audit's error classes

GOALS steps 2 and 5; C3, C4, C9, C15. The owner's PM trial and data audit of 2026-10-01 (an external package,
`PM-TRIAL-2026-10-01`, kept beside the gap-fill packages) re-read 502 records against their cached sheets. They found
the numbers faithful (97.7% printed on the cited page) and the errors in the context around them, from nine
mechanisms, RC1 to RC9. This sweep removes each mechanism and adds a guard that keeps it removed; the 54 confirmed
records are its regression cases, not its work list.

| Root cause | Mechanism | Guard | Status |
|---|---|---|---|
| RC1 | A Parse review muted every typed check of its row, so m08's windows read from stray numbers survived | PARSE-REVIEW-SCOPE, PARSE-TEXT-BOUNDS (D115); PARSE-REVIEW-STALE (D119) | Removed (m274, m282) |
| RC2 | Open bounds typed as points ("> 80 °C" as 80–80), and open windows dropped from summaries | OPEN-BOUND-WINDOW; parser; summaries keep a missing end (D115) | Removed (m274, m283) |
| RC3 | A page's heading or footnote not carried to its rows | `page_context.csv` inherited by compile (D116); CONTEXT-ROW-CONTRADICTS-PAGE; `audit:context` CONTEXT-PAGE-UNRECORDED | Removed (m277, m280); 10 statements accepted as not speaking for the rows flagged |
| RC4 | A direction, notch, standard or test temperature taken from the neighbouring row, or not read | `audit:context` CONTEXT-DIRECTION, -NOTCH, -STANDARD, -TEST-TEMPERATURE, -BOUND-SIGN; the readers' spellings (D119) | Removed (m276, m278, m282, m284); 43 accepted where the guard matched a neighbouring line |
| RC5 | One table under two products with no formulation key | GRADE-VALUES-TWIN (lint); GRADE-KEY-PRODUCTS exempts linked twins (D119) | Removed (m281); 13 pairs across two materials accepted (R166) |
| RC6 | Impossible pairs a sheet prints | MEAS-PHYSICS-NOTCH, MEAS-PHYSICS-FLEX-STRAIN | Removed (m280, m282: four values flagged physically implausible, two impact cells unresolved) |
| RC7 | Impact unit and standard disagree (ASTM D256 printed in kJ/m²) | IMPACT-UNIT-STANDARD | 28 accepted: each sheet prints that unit beside that standard; one cell read as printed (m282) |
| RC8 | Print settings under labels the import did not read | lexicon; `audit:context` CONTEXT-PROFILE-SETTING for bed, nozzle, chamber, enclosure, drying and hardened nozzle | Removed (m279, m282, m283) |
| RC9 | A filler in the product's name its material does not have | FILING-FILLER-WORD | Removed (m280, m281: a metal-detectable nylon declared a variant, a flame-retardant PC moved to PC FR) |

Every finding the guards raised in Phase 1 was accepted as "Open in the error-class sweep" until it was re-read; none
is left with that reason. 54 confirmed records were the regression cases: 51 are fixed, one was the audit's error (the
HDT of colorFabb PLA-HP is starred "only injection molded data available"), one closed (a notched and an unnotched
value at different temperatures), and one accepted (an impact value in J/m beside ISO 180, as printed).

## Phase 1a: RC1 and RC2

- `build/src/typed-values.js`: scoped reviews, PARSE-TEXT-BOUNDS, OPEN-BOUND-WINDOW. `build/src/normalize/process.js`:
  "> 80 °C recommended" is an open bound. `build/src/compile.js`: summaries keep open windows; the table, drawer, CSV
  and chamber notes say "at least".
- m274: nine windows read again from their own words (P0046, P0058, P0070, P0095, P0097, P0102, P0114, P0120,
  P0184); 147 reviews scoped (109 to their columns, 38 "Fields: none.").
- Compiled diff: 94 paths, all print windows, gate reasons and print estimates; no gate verdict, headline or template
  answer moved (`build/snapshot` unchanged, 69 interface views unchanged, 300 rendered scenarios agree).

## Phase 1b: the guards for RC3, RC4 and RC8

- `page_context.csv` (schema, `context-scopes` vocabulary), `build/src/page-context.js` and its use in
  `compile.js` (D116); CONTEXT-ROW-CONTRADICTS-PAGE in `lint-rules.js`; `test/page-context.test.js`.
- `scripts/audit/context-witness.mjs`, `npm run audit:context`, in `verify` after `audit-data`; its baseline is
  `data/review/context-witness-accepted.csv`. 364 findings, each accepted as open in the sweep.
- The importer reads "Print Platform Temp." as the bed (`scripts/ingest/lexicon/setting-labels.csv`).
- Regression cases caught by a guard: 46 of 54. Not guarded, fixed directly: two room-temperature test temperatures
  (they decide nothing), one block standard printed above its rows, one film's MD/TD direction, two enclosure and
  chamber statements, and two rows whose value line the check did not locate.

## The PM trial's findings (D117, D118), committed before Phase 2

- `app/js/ui/table.js`: the share ("PASS · 7 of 200 products"), the passing products' range above all products',
  `variantMark`, `caveatMark`, `typicalStateMark`, `unknownMark`, and "hardened nozzle: N of M" in Needs. The drawer and
  Compare say how many products need a hardened nozzle (`hardenedShare`).
- `app/js/engine/constraints.js`: `h2cStatusOf` judges "Official Bambu product" per product (D118); a numeric pass
  carries the caveat of the value it rests on.
- Names: m275 (headline labels), `labels.js`, `filters.js`, `index.html`, `start.js`, `decision.js`; ranking values with
  units and n (`indices.js`).
- Not built: a scenario warning naming D118 (the release note says answers may differ), a glossary popover (PM-20),
  and the split counts in the empty-result explanation.

## Phase 2: clearing every guard's list

Five Sonnet readers read 376 cards from the cached sheets (each page with all its rows and every typed field, each
profile with its sheet, each twin pair with both excerpts); a guard (`PM-TRIAL-2026-10-01/data-audit/apply-fixes.mjs`)
kept a proposal only when its quote was on the hash-checked sheet, its value in the column's vocabulary, the record
unchanged and the edited row passed the typed checks. Claude Opus decided what the readers could not and wrote the
migrations; each re-checks its quotes against the cached sheet (`m277-m279-sweep-shared.mjs`, `onSheet`).

| Migration | What it records | Records |
|---|---|---|
| m276 | the DIN standard each row's own words print, once the reader knew DIN | 66 measurements |
| m277 | what a page states once (specimen, moisture, treatment and schedule, standard, test temperature) | 88 page_context rows |
| m278 | a direction, notch, standard, test temperature or moisture printed on the value's own line | 203 cells, 122 measurements |
| m279 | print settings under labels the import did not read | 118 profile cells |
| m280 | the sheets that contradict themselves: a load pair, a misprinted modulus, impact cells that print a temperature, a footnote that makes a table printed off its recipe, "(Printed, non-injection molded)" rows filed as raw, a declared metal filler | 29 records |
| m281 | twins share one formulation key, and a flame-retardant PC moves to PC FR | 40 grades |
| m282 | what `audit:context` still found, and the regression cases no card reached | 30 records |
| m283 | drying, enclosure and chamber settings, found once the guard looked for them | 53 profile cells |
| m284 | impact test temperatures printed on the value's line | 22 measurements |

What the readers got wrong, and the guard did not catch, was caught by the build or a re-read: colorFabb's p. 2 Notes
("3D printed specimens, XY") were taken for the "Injection molded" table they sit under, which m218 had ruled describe
p. 1 (four page statements and seven directions dropped); six "Printed Specimen Conditions" were entered as print
guidance, which m170 rules out (the test caught them; the guard now skips those profiles). Two readers disagreed on two
bed windows; Opus read both.

Mechanisms found while clearing the lists, each fixed where it lives (D119): the HDT load reader missed "HDT/A" and
"HDT-A" and let a mislabelled letter outvote a stated load; the standards reader missed "ISO-R 75" and "DIN 53.504"; the
test-temperature reader missed "℃", "@23° C" and "+24°C"; the window reader missed a trailing "(recommended)" and cut a
250 °C build chamber at 200 (P0888 was typed 160–160); the enclosure reader took "required No" for a recommendation; one
scoped review (P0795) still hid an unknown bed state, and three became stale when the parser learned their spelling
(PARSE-REVIEW-STALE). The guard itself learned chamber, enclosure, drying and room-temperature impact readings, which
found 75 more instances of RC4 and RC8 than the readers' cards held.

Decision diff (`build/snapshot/templates.csv`): one material answer moved. colorFabb's nGen leaves "Warm environment"
in the Explore modes (unknown to fails): nGen Amphora AM3300 now reads the 71 °C heat deflection its twin's sheet
prints (D89). Passing-product counts moved for nine materials (PCTG 2 to 5 in Indoor prototype, ASA 15 to 17 in Warm
environment, PETG 71 to 70), from twins reading their sibling's values and page statements typing rows. 25 material
headline values moved (tensile modulus in 6 materials, tensile strength 5, glass transition 4, elongation 4, density
3, heat deflection 3). `build:diff`: 20,139 paths, nearly all grade
estimates refitted on the de-duplicated formulations.

## Phase 4: measured again, reviewed, and what that found

**The confident wrong answers.** The PM trial's 146 scenarios ran again on this build (`PM-TRIAL-2026-10-01/harness`):
page and engine agree on all 118 that have an engine answer, as before; one scenario's step named the old "Heat
resistance" label and was renamed. A Sonnet tester re-read the nine scenarios judged confidently wrong in the first
round against their new screens: none is now (`verdicts-v2-confident-wrong.csv`). What it still found unclear: a pass
via a declared variant does not name the variant's product; Compare shows a bare UNKNOWN.

**Fresh random re-reads.** 100 records none of the earlier rounds had read (70 deciding measurements, 30 print profiles;
`data-audit/control-v3.mjs`), then four more draws of 40 profiles none of the rounds had read (`control-v4` to `-v7`),
each after the fixes the previous one led to. Two Sonnet readers for the first, one for each later draw; every
non-correct verdict was re-read by Claude Opus against the cached sheet.

| Population | Data audit, before | Control after m284 | Four profile controls, each after the fixes the last led to | Target |
|---|---|---|---|---|
| Deciding measurements | 6.3 % | 1 of 70 (1.4 %): a "(Dry Status)" heading not carried | | < 2 % |
| Print profiles | 11.5 % | 8 of 30 (27 %) | 8 of 40, 3 of 40, 9 of 40, 3 of 40 (7.5 %) | < 3 % |

The measurements met their target. The profiles did not, and each draw told why: the import read print settings with
a label list and a value reader that each knew only what earlier sheets had taught them, so every draw found a new
family of omissions and part-held cells. Each family was fixed where it lives and swept across every profile, not one
by one: the guard now runs the import's own sheet reader over every profile's sheet, compares what each cell holds with
what the reader reads there, and reads the sheet block by block (D119). What the draws found and the sweeps then fixed:

| Migration | Family | Profiles |
|---|---|---|
| m285 | labels nobody had listed ("Hot pad", "Closure chamber", "Drying Preparation"), a question answered a line away (six Spectrum TPUs typed a hardened nozzle the sheet says No to), "< 80°C" as a point | 114 settings, 6 bounds |
| m287 | part-held cells: drying cut before its hours, "140 ºC +" without its plus, a split number, a fragment of the sentence before; a recommended point read as a window's end; Polymaker's environmental temperature | 66 |
| m288 | the test block taken for guidance (eSUN's "Print test condition", 3DXTECH's specimen conditions); SUNLU's "Room Temp." row; FIBERON's run-together chamber cell | 86 |
| m289 | Polymaker's two-column drying, Creality's horizontal table, prose drying advice, a label split by the text layer | 17 |

The last draw found 3 of 40 (7.5 %), each now fixed with its family; it is the figure to beat with the next draw.
Among the profiles corrected: "TPU 85A class and softer" no longer asks for a hardened nozzle, and PLA Aero passes
Lightweight structure and PP passes Flexible component, because a product of each now has its chamber recorded.

**The independent review** (Claude Sonnet, `review.json`): approve with findings, none high. Acted on (m286): a page
statement (PC00012) that gave QIDI PA12-CF's unannealed Z values the annealing of the column beside them, and one
(PC00041) that reached a glass transition under another table's heading; five raw Standard / load cells that had a
normalised standard written into them; nine 3DJake bed windows recorded as a fragment of "If you have a heated bed the
recommended temperature is …" and so typed required; four Extrudr impact values printed in J/m-sized numbers under a
"kj/m²" header beside ASTM D256, now held out; two measurement reviews made stale by the "℃" reader; PARSE-TEXT-BOUNDS
counting "3D" as a stated 3. A probe of all 88 page statements for a page that holds a second, contrasting table found
no other case. Left open and listed in OPEN-PROBLEMS §28: a page statement covers a property class of a page, not one
table; the migrations' quote check proves a quote is on the sheet, not that it applies to the rows; `audit:context`
runs only where the text cache is, so not in CI; the scoped reviews m274 wrote were scoped by their differences, and
only the profile side is checked for staleness.

