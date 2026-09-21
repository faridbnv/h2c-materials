# Brief: the optical pool, read against the page images (batch b27)

For a reader who did not decide these rows. **Nothing here may be corrected — only accepted or rejected.**

## Why a person reads these at all

Every row in batch b27 was read from a **scan**: a document with no text layer, over which `ocrmypdf` wrote one
by guessing at a picture. A guess is not a transcription (D35), so `apply.mjs` refuses any optically-read row
that nobody has checked against the page image (`APPLY-OCR-UNVERIFIED`). This is that check.

- **139 documents, 1,211 rows.** Every one has its page images rendered under `.cache/pages/<sha256>/p-N.png`.
- The proposals are in `docs/audits/2026-09-18-v2-import/proposals/b27/<doc_key>.json`.

## What to do with each row

Open the proposal, take its `document.sha256`, and read the page image the row's `Locator` names
(`p. 2: Tensile Strength` → `.cache/pages/<sha256>/p-2.png`). Then, for each measurement and profile row:

- **Accept it** only if the image prints that number, that unit and that label. Sign it:

  ```bash
  npm run ingest:review -- --batch b27 --doc "<doc_key>" --visual m01,m02,m05 --by "<your name>" \
    --note "read against .cache/pages/<sha>/p-2.png: the page prints …"
  ```

- **Reject it** if the image prints something else, or does not print it at all:

  ```bash
  npm run ingest:review -- --batch b27 --doc "<doc_key>" --reject m03 --by "<your name>" \
    --note "the page prints 44.2 MPa; the row holds 442"
  ```

  **A number that is not on the image is rejected, never corrected.** An optical reading that a person edits is
  a transcription nobody made from a document nobody read. If the right value is plainly on the page and the row
  has it wrong, reject the row and say what the page prints — the reader will be fixed, or the row re-proposed.

- When every row of a document is decided, sign the document off:

  ```bash
  npm run ingest:review -- --batch b27 --doc "<doc_key>" --done --by "<your name>" --note "…"
  ```

## What not to decide

- **The identity.** If the proposal's `identity.needsRuling` is true, or its product name looks wrong, leave the
  document: it is held for a ruling and the rows are not yours to accept. Say so in a note and move on.
- **Anything about the material, the grade or the headline.** This is a reading of a page, not a judgement about
  a product.
- **Conditions the sheet states and the row does not.** If the page says "dry" or "annealed" and the row says
  nothing, that is a rejection with the reason, not an edit.

## What the numbers usually get wrong in an optical reading

Worth looking for, because the reader has seen each of these:

- a decimal point read as nothing (`1.25` → `125`), or a comma as a point;
- `0` for `O`, `1` for `l`, `5` for `S`, `8` for `B`;
- a column's value taken from the row above or below it, where the scan is skewed;
- a unit from the neighbouring column (`MPa` where the page says `GPa`);
- a footnote marker glued to a number (`44 ¹` → `441`).

## When you are done

Report: how many rows you accepted, how many you rejected, how many documents you left for a ruling, and the
kinds of error you found — with the MeasurementID-equivalent (`m01`) and doc_key of each rejection. Do not run
`ingest:apply`; the batch is applied by whoever is running the import, after reading your report.

## Round two (2026-09-21): the grade row, and the five documents left open

The first round signed the measurement and profile rows. `apply.mjs` also refuses a **grade** row read from a scan
that nobody has checked (`APPLY-OCR-UNVERIFIED`), and every one of the 108 documents now in `proposals/b27/` has one:
its `grades[0]`, whose review id is `main`. Twenty other documents are the products batches b28 and b30 already
recorded and have left the batch; do not look for them.

For each document, open `.cache/pages/<sha256>/p-1.png` and read the head of the page:

- **The name is what page 1 prints for the product, and the maker is the one the page names** → sign it:
  `npm run ingest:review -- --batch b27 --doc "<doc_key>" --visual main --by "<your name>" --note "p. 1 prints …"`.
  The maker's own name in front of the product is not part of it ("Fiberlogy ABS" is ABS), and neither is a form
  label ("TRADE NAME:"), the words "Technical Data Sheet", or a revision date.
- **The name is the page's furniture** — a logo read as letters ("UTURA", "forwardAafyT"), a footer ("run by Mass
  Additive Manufacturing"), a single letter ("a"), a heading ("Sheet", "PRODUCT INFORMATION"), a list marker
  ("vii)") — **and the page prints the product's name** → give it that name, exactly as printed:
  `npm run ingest:review -- --batch b27 --doc "<doc_key>" --rename "<name as printed>" --by "<your name>" --note "p. 1 prints \"…\" as the product"`.
- **The page prints no product name at all**, or the document is not a filament's data sheet (an SLS powder, a
  scanner), or the page plainly names a different polymer or filler than the proposal's `identity` (a stone-filled
  PLA proposed as plain PLA) → leave the grade row undecided and put the document in your report with what page 1
  says. The material is not yours to change.

Then finish the five documents that still have undecided rows (28 rows; `node` over `rowsOf` shows them, or
`npm run ingest:review -- --batch b27 --doc "<doc_key>"`), by the rules above, and sign each `--done` again once
every row is decided (a document already `reviewed` stays so).

Report: documents signed, renamed (old name → new, with the line), left open and why; rows decided in the five.
