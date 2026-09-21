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
