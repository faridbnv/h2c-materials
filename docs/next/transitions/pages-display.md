# The pages transitions: four visible changes, and the reprint ruling's medians as the pages print them

> **In short.** The material pages now come from TypeScript (`packages/pages`), fed by the new build. Your ruling Q2-20 lets the
> pages change as long as nothing else does, and parity compares the words and links of every page rather than its bytes. On the
> same data the new pages read **word for word and link for link as the old ones, apart from four small changes you asked for or
> accepted**. They are listed here with a count and an example each: **534 differences on 166 of the 248 pages**. A second, separate
> list holds the numbers the reprint transition you approved on 2026-10-21 moves on the pages: **491 differences on 68 Overviews**.
> No science value moves in either (they come from the build, which this change does not touch). **It needs your approval
> (Tier 1: `parity/transitions/**`).**

**Status: waiting for your approval.** Nothing is merged until you attest it.

## What was ported

`packages/pages` holds the facts-and-words layer (`src/facts/`, the DOM-free modules the drawer and the pages share), the page
renderers (typed string functions: Q2-20 allows them), and the two page scripts (`browser/`), bundled for the browser into one
`assets/page.js` of **18.1 KB** (the old one was 28.0 KB; the budget is 30 KB). The command is
`node packages/pages/src/cli.ts --db <db.json> --out <dir>`; it writes the files the old build's stage 8 writes under `materials/`:
82 Overviews, 82 Products pages and 82 stubs, the index, the method page, the stylesheet and the two font licences.

Four checks say it is a port and not a rewrite:

- **P-erase.** 50 of the 57 ported files differ from their old `.js` file by type labels only (`npm run parity:erase`, 113 pairs in all).
  The other seven carry the changes below or a typing fix that is not a label (`Number(a === b)` where the old file subtracted two booleans).
- **The same database gives the same pages.** Before the four changes were made, the renderer run on the old build's database with the
  old selector address wrote HTML byte-for-byte equal to the old build's, in all 248 pages (`diff -r`; the stylesheet differs in its
  first comment line and the script is the new bundle).
- **The old tests.** 146 of the old unit tests (24 files, `drawer-comparisons` among them) run unedited against the new facts layer
  and pass (`tests/remake/pages.test.mjs`; a fault planted in a copy of the layer makes them fail).
- **The old page invariants.** `test/pages.check.js` (P1 to P14) run on the new pages: 14 of 16 pass. The two that fail are the
  two the changes below are meant to move: P8 (the way back is the old file name) and P14 (a fresh render equals `dist/materials/`
  byte for byte, which the old renderer wrote).

## The four changes

| | Change | Where you see it | Differences | Pages |
|---|---|---|---:|---:|
| a | The way back to the selector uses its stable address, not the release-stamped file name (AR-19) | the "Open in the selector" button and the index's link, on every page | 333 | 166 |
| b | The method page labels the test answers as written by an agent and not yet reviewed by a person (OQ-11 A) | a new part, "Test answers", at the end of the method page | 2 | 1 |
| c | A value read from a twin's shared sheet is said to count once in the material's median (the reprint ruling) | four places, below | 197 | 43 |
| d | A source that is a path on your machine shows its title and "private reference", never a link (R3 C) | the document list on the pages that cite one | 2 | 2 |

### a. The selector's stable address (AR-19)

The pages used to link to `../H2C_Material_Selector_2026-09-21_7c6da496722d.html`, a name that carries the release. They now link to
`../`, the selector at the root of the site (the deployed site serves the selector there). The scenario after the `#` is unchanged.
It stops the release from being threaded through every page.

- Before: `Open in the selector ⟨../H2C_Material_Selector_2026-09-21_7c6da496722d.html#{"x":2,...}⟩`
- After: `Open in the selector ⟨../#{"x":2,...}⟩`

A cost to know: opened from a folder on a disk, `../` is the folder and not the selector. On the site, and on the preview, it is the
selector. A deployer can still give another address (`--selector <address>`, or `--no-selector` for none).

### b. The test answers label (OQ-11 A)

A new part at the end of "How the numbers are worked out", in the page bar too:

> **Test answers.** The tool is checked against test answers: for example cases, the answer the selector should give and the record it
> rests on. These are test answers written by an agent, not yet reviewed by a person. Until a person has reviewed them, a passing check
> shows that the tool still gives the answers it gave before; it does not show that those answers are right. The label comes off each
> test answer when a person has reviewed it.

### c. A shared table counts once (the reprint ruling)

The reprint transition made a table that two products share count once in the median, but the pages still said "as the median counts
each". Four places now say what is true (the words are short on purpose):

| Place | Before | After | Differences (pages) |
|---|---|---|---:|
| The note under a sheet table | "In grey, a value a product reads from a data sheet it shares, where its own sheet is silent." | "... where its own sheet is silent. The median counts that table once." | 23 (14) |
| The hover on a value read from a shared sheet | "From the data sheet shared with Polymaker Fiberon PPS-GF20" | "... PPS-GF20. Counted once in the median" | 42 (14) |
| A product's card on its Products page | "Data sheet shared with Polymaker Fiberon PPS-GF20: their values are one table, recorded once." | "... recorded once and counted once in the material's median." | 131 (29) |
| The method page, on the strips | "Two products that share one data sheet are two marks at its value, as the median counts each, the second saying so." | "... are two marks at its value, the second saying so; the median counts that value once." | 1 (1) |

The one place that is not in the list is the tooltip a mark in a strip carries (`data-note`): parity does not read it, so it was left as it was.

### d. Private references (R3 C)

Every source link on a page goes through `publicSourceLink` (`packages/publish/src/source-link.ts`). A source whose address is a path on
a machine (`/Users/...`, `~/...`, `file:`, a drive or share) shows its title and a "private reference" tag and has no link. The data
holds four such sources; two are cited, by PLA (M001) and by PLA-GF (M019):

- Before: `Reference, Plastics Engineering: pseudo-elastic design  Reference, read 10 Sep 2026; gave 1 statement on chemicals or use`
- After: `... gave 1 statement on chemicals or use  private reference`

The old pages never printed the path either (the check scan finds none in old or new pages); what changes is that the page now says why there is no link.

## The reprint ruling's medians (a second list)

`parity/transitions/2026-10-22-pages-reprint-medians.json` is **not a change to the pages**. The new pages are rendered from the new build's
database, and that database carries the reprint transition you approved on 2026-10-21, so the medians, middle halves and typical products
it moves show on the pages: **491 differences on the Overviews of 68 materials** (PLA's notched impact median 6 becomes 6.1 and its
tensile strength median 30.3 becomes 30; PLA Silk's HDT 57 becomes 55 °C and the sentence that quotes it changes with it; TPU 95A class
moves on every page that sets a material against it). The list is exactly the difference between the new renderer's pages on the old database and on the new one.
It is kind "science" because the numbers moved, and it cites the approved ruling.

## How it was measured

1. `npm run parity -- --new --surface pages` renders the old build's `dist/materials` against the pages `packages/pages` writes from the
   database the new build wrote, and lists every difference as a run of changed lines (a page can hold several). It found 1,025.
2. The same renderer was run on the old database (`node packages/pages/src/cli.ts --db dist/db.json --out <dir>`) and compared with `dist/materials`: **534
   differences, every one of them in the 1,025**. Those 534 are `2026-10-22-pages-display.json`; the other **491** are
   `2026-10-22-pages-reprint-medians.json`. The split is therefore by construction (renderer change or database change), not by reading the words.
3. A run passes only when it sees exactly the 1,025 (one more or one fewer fails): `parity -- --new --surface pages` reads
   `RESULT: matches-transition (1025 listed, 0 unexpected, 0 missing)`. The files' digests are
   `sha256:61948215d46276558eef204a2bf11ae6f7bfdba6fa4c4ccb590a430dd09c0b2c` (display) and
   `sha256:f310a71d94c272970f938ab92235a094d3ba53eb50f0beab3c01ba54997ff1a1` (reprint medians).

What this does not prove: that the page script behaves as the old one in a browser (it is the same code, typed and minified; it was
checked for syntax, size and the presence of both scripts, and not run in a browser here), nor that the pages are right. Parity shows only that they did not change.
