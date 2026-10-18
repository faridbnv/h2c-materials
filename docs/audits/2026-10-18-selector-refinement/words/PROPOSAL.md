# Words: proposal (Part B)

> **Historical record** (2026-10-18): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

> **Working record** (2026-10-18), the words expert of the selector-refinement round. It answers the baseline review
> ([REVIEW-0](../review/REVIEW-0.md), 62/100) and the inventory ([INVENTORY.md](INVENTORY.md)). Changes are ranked. ★ marks
> a string a check reads (guardrail 7). "Pages" marks a shared word that would move a material page (guardrail 6).
> Mocks are in `words/mocks/`, made with `shots.mjs --eval` (text swapped in the built page; no code changed).

## Vision

An engineer reads **the answer, then what qualifies it, then where it comes from**. The drawer mostly does this already
(K07, K19, K26), but two things break the habit. First, the tool's **bookkeeping** sits among the answers:

- how it counted ("n counts the products compared, special formulations left out: on the XY rows…");
- which round read a sentence ("Read 2026-10-05 … by the completeness round (m413)", on 2,667 maker statements);
- which ruling filed a product ("under D57 (R078, m131-…)").

Second, one thing goes by **several names**:

- the H2C check is called "temperature limits", "capability", three ≤ rows and "printability";
- the unknown state is UNKNOWN, INDETERMINATE, "uncertain", "could not be checked" and "publish too little";
- "reported" has three forms;
- the drawer says "special formulation" where the page says "added filler or additive".

The proposal rests on three rules:

1. **One name for one thing, and the page's name where the page has one.** That means *On the H2C*, *Heated chamber*,
   *Nozzle type*, *added filler or additive*, *middle half*, *documents*, *reference specimen*. Coherence (P4) then
   costs nothing: the pages' `PAGE_WORDS` already rewrite the drawer's words into these, so most of the changes below
   leave the pages exactly as they are.
2. **Bookkeeping is kept but moved out of sentences.** It moves behind the ID mark (K11), into a closed line (K13,
   K31), or into the existing "Review notes" / "Record notes" folds. Nothing becomes unreachable, and `drawer-ids.mjs`
   must reach the same set of records.
3. **A caveat is said once, at the top or foot of its view (K27), and a value replaces a status badge.** The drying
   row says "40–65 °C, 3–12 h", not "Published". The beyond-capability callout names the limit, not "its Limitations
   say why". The Price tab opens on the price.

The **verdict vocabulary** comes down from twelve words to two short sets:

- requirements: **PASS / UNKNOWN / FAIL**, plus SCREENED and "not tested" on the main page, unchanged;
- print settings: **Within / Partly within / Beyond / No data**.

**What it moves (measures):**

- M2d: 6 → 1.
- M3c: the lede no longer repeats the status chip; each H2C axis is stated once; one pointer to Products.
- M4: tally, "n counts", "Also drawn", "special formulation", "comparable basis", "not one product's scatter",
  "Not used as a filter", decision codes and "(n of M profiles)" all go to 0 in open text. The pointers fall from 304
  drawers to about 1 per Overview.
- Cold page: about 45 fewer words.

## Changes, ranked

### 1. One "On the H2C" block in the page's words and numbers

| Item | Detail |
|---|---|
| Priority | P2, P4 |
| Answers | F1, F5 (drying and nozzle badges), F7 (nozzle, bed, chamber, drying), M3c, inventory 1, 2, 8 |
| Keeps | K07, K19 (the chip column and one reason line), K39 |
| Fed by | the page's plate: `onTheH2cRows` (`app/pages/findings.js:350`), `typicalWindow` (`material-stats.js`), `scheduleWords`, `windowText` (`material-words.js`); the counts from `printCounts` (`detail.js:705`). In `detail.js:1003–1051`, `ledeWords` (`material-words.js:38`, drawer only) and `GATE_VERDICT` (`labels.js:98`, not used by the pages) |
| Size | M |
| Risk | No check reads these strings. *Exceeds* → *Beyond* also changes the decision brief and Compare, the same way. Shared functions are only read, so no page moves. |

**Before** (`shots/base/drawer-pla-overview-01.png`, `-02.png`):

- The H2C standing, said twice:
  - a chip, *Type on Bambu's H2C list*;
  - a lede that says the same: "A material type on Bambu Lab's H2C list, though not every brand of it is."
- A heading, *H2C printability*.
- A count list: "Its 195 products, against the H2C's limits: Nozzle (350 °C): 195 within; Bed (120 °C): 194 within,
  1 not published; Chamber (65 °C): 183 within, 12 not published".
- A sourcing note: "Where a product's own data sheet is silent: 93 settings from … Products shows which."
- Gate rows that disagree with the count list, with a window chip and a build reason:
  - Within, Nozzle, chip *up to 260 °C*, "Needs up to 210 °C; the H2C reaches 350 °C" (and the same for bed and
    chamber);
  - PEEK: Within, Bed 110–250 °C, against the FAIL requirement row above it.
- Status badges, not values:
  - *Some products*, Hardened nozzle, "…; Products shows which.";
  - *Published*, Drying, "A drying schedule is published (183 of 195 products have drying advice: 74 call for drying,
    105 …); Products gives each one.".
- AMS: "Makers state: "AMS, AMS 2PRO, AMS HT, AMS Lite" (1 of 297 profiles)."
- A closing line: "Ranges across its products, as a guide. Each product's own settings are in Products."

**After** (`words/mocks/overview-after-01.png`, `-02.png`):

- No lede. The chip reads *On Bambu Lab's H2C list*, and its popover keeps the full meaning.
- **On the H2C**, one row per setting:

  | Chip | Setting and value | Line under it |
  |---|---|---|
  | Within | **Nozzle** 195–230 °C | All 195 products within the H2C's 350 °C. |
  | Within | **Bed** 50–60 °C | 194 within the H2C's 120 °C; 1 gives no bed temperature. |
  | Within | **Heated chamber** none needed | 160 of 195 need none; none asks above the H2C's 65 °C; 12 say nothing. |
  | (no chip) | **Nozzle type** standard for most | 6 of 195 need a hardened nozzle: eSUN eStars-PLA, Nobufil PLAx, … and 2 more. |
  | (no chip) | **Drying** 40–65 °C, 3–12 h | 74 products call for it, 105 only for wet filament, 4 say it is not needed. |
  | (no chip) | **AMS** | One profile of 297 states "AMS, AMS 2PRO, AMS HT, AMS Lite". Bambu Lab, for AMS 2 Pro and AMS HT: "Not verified for every grade". |

- One closing line: "Each product's settings come from its own data sheet; where it is silent, from a data sheet it
  shares (11 settings) or the Bambu Lab Filament Guide (93). *Products gives each one.*"
- How the chip is chosen, from the counts:
  - **Within**: every product that gives the setting is within the limit.
  - **Beyond**: none is.
  - **Partly within**: some are.
  - **No data**: none gives the setting.

  PEEK's bed then reads "Partly within, Bed 110–250 °C: 3 of 7 within the H2C's 120 °C; 4 need more". It no longer
  disagrees with the FAIL requirement row.

### 2. Comparison headings: what is left out, said once, in the pages' words; the tally folded

| Item | Detail |
|---|---|
| Priority | P3, P4 |
| Answers | F6; M4 rows: tally, "n counts", "Also drawn", "special formulation" |
| Keeps | K09, K18, K26, K31 (every exclusion is still counted, with its range) |
| Fed by | In `material-words.js`: `medianRule` (143–153), `apartWords` (139), `printApartWords` (272), the Printing n rule (285), `outOfMedianWords` (133), `noMedianWhy` (164), `toughenedSplit`. In `detail.js`: 747, 768, 803, 860, 912, 924–926. `labels.js` `WHY_WORDS` (resin, second, reference). `format.js` `spreadNote` (405–420) |
| Size | M |
| Risk | ★ `test/drawer-comparisons.test.js` (lines 257–270) parses the tally (`^Of the (\d+) results below`, `are drawn above`, `the other (\d+):`), so its regexes move with this change. Pages: `outOfMedianWords` and `whyOne` reach `app/pages/products/card.js` only through `PAGE_WORDS`, which already rewrites them into these words, so the page text stays identical. `WHY_WORDS`' resin, second and reference keys are not read by `whyOne`, which has its own `WHY_ONE`. |

**Before** (`words/mocks/mech-before-01.png`):

- Per row: "Also drawn, not in the median: 39 with no stated orientation (1.44–4.78) and 12 special formulations
  (0.715–4.73)."
- Under the table: "n counts the products compared, special formulations left out: on the XY rows, those whose sheet
  states the bar's orientation (XY); on the others, every product drawn. The median, middle half and range are of these
  alone."
- The pairs: "Both orientations: 31 products for …"
- The share: "Z as a share of XY, for products whose two values are compared, from one document and in one state:
  tensile modulus 89 % (67 %–103 %, 28 products) …"
- The tally: "Of the 814 results below, 460 are drawn above; the other 354: 122 more of products already drawn, 69
  measured on film, …, 7 of the resin, its supplier's value, …"

**After** (`words/mocks/mech-after-01.png`):

- Per row: "Not in the median: 39 with no stated orientation (1.44–4.78), 12 with an added filler or additive
  (0.715–4.73)."
- The n paragraph is cut. The column is headed **Compared**, and the closed line "How XY and Z differ, and what is
  compared" already gives the rule.
- The pairs: "Both XY and Z published: 31 products for tensile modulus, 42 for tensile strength, 37 for elongation at
  break."
- The share: "Kept across the layers, Z as a share of XY (median of the products with both from one document): tensile
  modulus 89 % (67–103 %, 28 products), …"
- The tally becomes a closed line, "814 results: 460 drawn above, 354 not drawn". Open, it reads: "Not drawn: 122 more
  values of products already drawn, 69 measured on film, 66 on moulded bars, …, 7 resin supplier's values, …"
- Printing, per row: "Not in the median: 6 from the Bambu Lab guide (190), 19 with an added filler or additive
  (180–220)". The Printing n sentence is cut.
- The key reads *added filler or additive*, as the pages' key does.
- The main page's spread popover (`spreadNote`) changes too:
  - "interquartile" → "middle half";
  - "report it on a comparable basis" → "state its test's orientation or load".

### 3. Bookkeeping out of the inner tabs' rows

| Item | Detail |
|---|---|
| Priority | P3 |
| Answers | F6, F10; M4 rows: decision codes, "Not used as a filter", "reference grade", "User-supplied reference" |
| Keeps | K11, K13, K21, K22 (one form per record; the ID mark stays on every record) |
| Fed by | In `detail.js`: 633 `knowHowSource`, 640 `knowHowConditions`, 1172 (Environment row), 1110, 700, 1127, 1177, 1226, 1286 `gapRow`, the profile blocks. `material-words.js:386` `knowHowGap`. The pages' rule, `readerText`, `MAINTAINER_WORDS` and `DOMAIN_WORDS` in `app/pages/sections/common.js`, moved to `material-facts.js` so both surfaces use one rule (a code move; the pages stay unchanged) |
| Size | M |
| Risk | ★ `test/know-how.test.js:42` reads the `mark maker-conditions` button class, so keep the class. `drawer-ids.mjs` must reach the same set. |

**Before → after:**

1. **The "review note" button on maker statements.**
   - Notes the pages' rule calls the maintainers' move into the statement's ID popover. That is about 2,700 of 3,004 (2,667 of them alike), such as
     "Read 2026-10-05 in the maker's document by the completeness round … (m413)".
   - Environment notes that restate the tab's lede (about 360 rows: "concentration, duration and temperature not
     specified unless stated…") are dropped from the row. The lede already says it, and the note is still behind the
     ID mark.
   - The rest are relabelled *caveat*, with the head "What the statement leaves out".
2. **The quote's source.** "— product page, p. 1 · *where* · ID" → "— *product page, p. 1* · ID". The source words
   open "Where this is stated".
3. **The "not stated" list on each card.** "Not stated by the maker: applications, benefits, pitfalls, warping, …
   (website checked 2026-09-26)." becomes a closed line, **Not stated by its maker: 12 topics**, with the list and
   the date inside.
4. **"Named on a data sheet without a value: flexural modulus (Polymaker PolySonic PLA), …"** → "Listed on a data
   sheet with no value: flexural modulus (Polymaker PolySonic PLA), …". It moves inside the *Not published for this
   material* box (K21).
5. **The guide block.**
   - Source: "Bambu Lab, Bambu Lab Filament Guide, p. 1, the column headed PLA: Nozzle Temperature; Build Plate & Bed
     Temperature; …" → "Bambu Lab Filament Guide, p. 1, PLA column". The full locator stays behind it.
   - Drying: "Dry Out Before Use: Optional. Drying Condition: Blast Drying Oven: 50 °C, 8 h X1 Series Heatbed: … (read
     as optional: 50 °C for 8 h)" → "Optional: 50 °C for 8 h". The guide's words stay behind *as printed*.
6. **The routing note.** "AMS and H2C nozzle routing: shown on the 1 profile that says more than "verify the exact
   grade". Not used as a filter." → "AMS and nozzle routing: every profile but one says only "verify the exact
   grade"." The sentences "Not used as a filter." and "Not used by any filter." are cut (430 drawers).
7. **Profile rows.** Eight rows of "Not published" become one line: "6 settings not published: enclosure, drying, …".
8. **The sources line on a card.** "3DXTECH, ECOMAX PLA ; …; 3DXTECH, ECOMAX® PLA ; 3DXTECH, ECOMAX® PLA" → "3DXTECH,
   ECOMAX PLA (3 documents)". Each document stays one press away.
9. **Codes in prose.**
   - "recorded as a Variant under D57 (R078, m131-grades-the-sweep-found)" → "recorded as a variant". The full text
     stays under *Record notes*.
   - Known gaps: the rows the pages' `shownGap` rule shows stay open, under the pages' names ("Source conflict" →
     "Sources that disagree"). The others join the existing closed *Review notes*.
10. **Small words.**
    - "and 1 reference grade" / "4 of reference grades" → "and 1 reference specimen, not for sale" / "4 on reference
      specimens" (the pages' words).
    - The publisher "User-supplied reference" → "Reference".

### 4. Beyond capability said once, with the limit it breaks

| Item | Detail |
|---|---|
| Priority | P2, P3 |
| Answers | F15, F1 |
| Keeps | K08, K19 |
| Fed by | `detail.js:989` (the callout); `ledeWords` (`material-words.js:38`, which drops the `H2C_STATUS` lede in the drawer only); `constraints.js:308` (a release input); the per-axis numbers from the product gate results the requirement rows use, never `m.gates.*.reason`, which disagrees (PEEK: 400 against 480 °C) |
| Size | S |
| Risk | Release input (`constraints.js` reason); no check reads it |

**Before** (`shots/base/drawer-peek-overview-01.png`). PEEK says it four times:

- the chip, *Beyond H2C capability*;
- the callout, "Beyond H2C capability. Kept in the database for reference; never a candidate.";
- the lede, "Not on Bambu Lab's list, and it needs more heat than the H2C gives.";
- the requirement row, "FAIL Within H2C capability: Beyond H2C capability; its Limitations say why".

**After:**

- The chip stays, and there is no lede.
- The callout: "**Beyond H2C capability:** its products need a nozzle up to 480 °C and a bed up to 180 °C; the H2C
  reaches 350 °C and 120 °C. Kept for reference, never a candidate."
- A sintering feedstock: "**Beyond H2C capability:** a sintering feedstock; the finished part is the sintered metal or
  ceramic, not the printed polymer."
- The row's reason: "Beyond H2C capability: more heat than the H2C gives, or a sintering feedstock". The pointer to a
  section the reader cannot find is gone.

### 5. One name per requirement; the H2C clause once on the cold page

| Item | Detail |
|---|---|
| Priority | P2, P5 |
| Answers | F11, M2d, inventory 1 and 7 |
| Keeps | K03, K23, K40, K42 |
| Fed by | `templates.js` descriptions (a release input); `start.js:31`, `:168`; `filters.js:231`; `explain.js:56, 97, 104` (with the Why excluded grouping); `brief.js:59`; `main.js:969`; `compare.js:139, 249`; `constraints.js:195` (a release input). `describeConstraint` keeps "Nozzle ≤ 350 °C" for each row inside the group. |
| Size | S |
| Risk | No check reads these strings, and `test/templates.test.js` only forbids "no heated chamber" |

**Before** (`shots/base/main-cold-01.png`, `main-indoor-01.png`):

- Six cards each end "…, within H2C temperature limits."
- The header shows two pills side by side, *Within H2C temperature limits* and *Within H2C capability*.
- Why excluded and the drawer show the first pill as three ≤ rows.
- The drawer's last line: "Also met: Within H2C capability · Build material (not a support) · Nozzle ≤ 350 °C ·
  Bed ≤ 120 °C · Chamber ≤ 65 °C."
- "Reported" has three forms: *reported only*, *Reported, not required* and "is reported, not required".

**After** (`words/mocks/cold-after-01.png`):

- The intro: "Each template fills in the controls and decides nothing; every value stays editable. All six also ask for
  a build material the H2C can print: nozzle, bed and chamber within its limits."
- The cards:
  - "A bracket that lives outside. HDT at 0.45 MPa at least 100 °C, tensile modulus at least 3 GPa, density at most
    1500 kg/m³."
  - "A shape you want to hold in your hand tomorrow. Any build material; price at most 45 CAD/kg is reported, not
    required."
  - "A drone arm or a moving part. Density at most 1250 kg/m³ and tensile modulus at least 2.5 GPa."
  - "A part near a motor or in a car. HDT at 0.45 MPa at least 80 °C."
  - "A jig or a fixture. Tensile modulus at least 5 GPa; HDT at least 90 °C is reported, not required."
  - "A gasket, a strap or a phone case. Elongation at break at least 100 %."
- The pill and the rail checkbox: **Nozzle, bed and chamber within H2C limits**. Why excluded groups its three rows
  under that name.
- The drawer: "Also met: within H2C capability · a build material, not a support · nozzle, bed and chamber within H2C
  limits."
- "reported only" → "reported, not required" everywhere.
- The reason (a release input): "No price observation of its own in the sampled shops" → "No price in the sampled
  shops".

### 6. Requirement verdicts: PASS, UNKNOWN, FAIL

| Item | Detail |
|---|---|
| Priority | P3 |
| Answers | F5 (UNKNOWN against INDETERMINATE) |
| Keeps | K05 (the four material states, unchanged) |
| Fed by | `explain.js:95`: `chip(r.status, r.status === 'INDETERMINATE' ? 'UNKNOWN' : r.status)`. The class and its ◐ mark stay. |
| Size | S |
| Risk | ★ No check reads the drawer row's chip (the fuzz reads the footer's). The engine is unchanged. |

**Before:** "INDETERMINATE Chamber ≤ 65 °C: Recommends up to 140 °C, above the H2C's 65 °C, but does not require it".

**After:** "◐ UNKNOWN Chamber ≤ 65 °C: Recommends up to 140 °C, above the H2C's 65 °C, but does not require it". The
reason already says why it cannot be told, and the table already counts such a material as UNKNOWN.

### 7. The answer first in Price, one count everywhere, numbers as the cells print them

| Item | Detail |
|---|---|
| Priority | P3, P4 |
| Answers | F12; inventory 2, 9, 10; review "Smaller" (14822) |
| Keeps | K41 (the method paragraph stays, after the answer), K29, K34 |
| Fed by | `detail.js:92` (the Price lede, given `m.headline.priceCADkg` in the page's number form, per the coherence lead's M5b rule); `table.js:176` (`shareMark`); `fmtNumber` in `start.js:44`, `TAB_HELP` (`detail.js:77–94`) and `onFileWords` (`material-words.js:44`); never by changing `plural()`, which the pages import; `detail.js:673`, `:709`; `labels.js:371` (`PRINT_NOT_DRAWN`, pages) |
| Size | S |
| Risk | The `PRINT_NOT_DRAWN` grammar fix also corrects the pages where a count is 1 (Pages: the `pages:check` digest moves). The rest stay in the drawer and the table. |

**Price.**

- Before: "54 shop listings, sampled, not live. Canadian shops first; …" The price itself appears nowhere in the tab.
- After: "**33.7 CAD/kg**, the median of 26 products' prices (18–80 CAD/kg), from 54 shop listings sampled 2026-09-10
  to 2026-10-07; not live." Then: "A product's price is the median of its listings: Canadian where it has any (9
  retailers), otherwise foreign (7 sellers) converted to CAD (¤). A struck-through listing is a different product and
  is not used."

**The count in the table.**

- Before: "183 of 183 products".
- After: "183 of 195 products", with the title "183 of 195 products meet all the requirements; 12 publish too little to
  judge and do not count against the material." The drawer's "Of its 195 products, 183 meet … 12 publish too little to
  judge" now matches.

**On file.**

- Before: "On file: 2430 measurements from 281 sources · 3 held back · 1 known gap · no unresolved conflicts".
- After: "2,430 values from 281 documents · 1 known gap", followed by *See the sources*. "Documents" is the Sources
  tab's word and the page's.

**Thousands separators.** "14822 measurements", "1513 published mechanical values" → "14,822", "1,513".

**Grammar of one.**

- "All 1 product are within …" → "Its one product is within …".
- "1 of 1 product have statements from their makers" → "Its one product has statements from its maker".
- "bed, 1 need none and 1 say nothing" → "bed, 1 needs none and 1 says nothing".

### 8. "annealed median" said in the legend's terms

| Item | Detail |
|---|---|
| Priority | P5 |
| Answers | F8 |
| Keeps | K28, K34 |
| Fed by | `table.js:211–217` (`typicalStateMark`) and the legend (`table.js` around 420–440) |
| Size | S |
| Risk | ★ The fuzz cell form (`lo–hi ·`) is a separate span, so it is unaffected |

**Before:** a cell caption, "annealed median", under "Values judged: as printed, dry"; the legend has no entry for it.

**After:**

- The caption: **measured annealed** (and *measured conditioned*).
- A legend entry: "*measured annealed*: the median's value comes from a bar annealed after printing; results still
  judge each product as printed."
- The title is kept, and INTERFACE's row "typical: annealed" is updated at the round's close.

### 9. Main-page control words: one name for the unknown state

| Item | Detail |
|---|---|
| Priority | P5; coordinate with F3 placement (UX, coherence) |
| Answers | Review line 5; F3 |
| Keeps | K05 |
| Fed by | `labels.js:31` (`POLICY_LABELS`, not used by the pages); `index.html:52–56`; `table.js:532`; the header line and the drawer's estimates line (`detail.js` `hiddenEstimates`) |
| Size | S |
| Risk | ★ `ui-fuzz.mjs:360` reads "(\d+) more could not be checked, left out under Confirmed only", and the fuzz reads "Confirmed only" / "Include uncertain", so its patterns move with this change |

**The policy group.**

- Before: "Materials with missing data: *Confirmed only* | *Include uncertain*".
- After: "Materials that could not be checked: *Leave out* | *Include*".

**The estimates toggle.**

- Before: "Let estimates rule out materials · Only under Include uncertain".
- After: "Exclude on estimated values too · only when included".

**The header line.**

- Before: "39 more could not be checked, left out under Confirmed only".
- After: "39 more could not be checked and are left out".

**Rank by.**

- Before: "nothing: sort by column".
- After: "none (sort by a column)".

**The unknown state ends with two phrases.** UNKNOWN / "could not be checked" for a material, and "publish too little to
judge" for a product (the cause, K07). "Uncertain" is retired.

### 10. A product card's provenance said once per card

| Item | Detail |
|---|---|
| Priority | P3 |
| Answers | F6; inventory 5 |
| Keeps | K12, K20; D89's "data sheet shared with" (INTERFACE Words) |
| Fed by | `detail.js:586–608` (`printCard`, `fromNote`, `productValues`), drawer only |
| Size | S |
| Risk | None |

**Before:** "from Bambu Lab's Filament Guide for PLA" after each of Enclosure, Hardened nozzle and Drying. PLA's Products tab
prints it 876 times.

**After:** the cells carry their values only. One line closes the card: "Enclosure, hardened nozzle and drying: from
Bambu Lab's Filament Guide for PLA, where this product's sheet is silent." Values read from a shared sheet get one line
too: "Density and tensile modulus: from the data sheet shared with X."

## Release-input words (the one late commit; no answer moves)

| Input | Before | After |
|---|---|---|
| `templates.js`, six descriptions | "…, within H2C temperature limits." (×6) | the six texts in change 5 |
| `engine/constraints.js:308` (the scope reason) | "Beyond H2C capability; its Limitations say why" | "Beyond H2C capability: more heat than the H2C gives, or a sintering feedstock" |
| `engine/constraints.js:195` (the price reason) | "No price observation of its own in the sampled shops" | "No price in the sampled shops" |
| `drawer_comparisons.csv`, `headline_definitions.csv` | none needed | |

## Cut or quiet (in one place)

**Cut:**

- the Overview lede that repeats the chip;
- the "Its N products, against the H2C's limits" list;
- the window chip and the build's "Needs up to …" reason line;
- "Ranges across its products, as a guide…";
- the n-counts paragraphs;
- "Not used as a filter" and "Not used by any filter";
- "(n of M profiles)";
- "no unresolved conflicts" and "3 held back" on the Overview;
- the per-cell guide note;
- the "where" button, now joined to the source words.

**Folded:**

- the tally;
- "Not stated by the maker";
- the bookkeeping review notes;
- known gaps written in maintainers' words.

**Left as is, with a reason:**

- "SCREENED chip" in Environment prose names a control by its label.
- "Filamant" is the source's own title (a data value).
- The semicolon chains are mostly inside the closed method explainers (K26), whose captions live in `method.csv`,
  outside this round's release inputs.
