# Batch b27: the optical pool, read and not applied

**Proposed and reviewed on 2026-09-21. Not applied.** 139 documents, 1,211 rows, every one read from a scan.

## Why the batch exists

A scanned sheet is bytes that say nothing to a reader of spans. `ocrmypdf` writes a text layer over the page
images and the result reads like any other document — except that every character came from a guess about a
picture, and a guess is not a transcription (D35). So `apply.mjs` refuses any optically-read row that nobody has
checked against the page image (`APPLY-OCR-UNVERIFIED`), and the batch exists to be checked.

`npm run ingest:ocr -- --all` read 69 scanned documents optically and rendered their pages under
`.cache/pages/<sha256>/`. With the 68 already held `ocr-visual`, the pool is 139 documents.

## What the reader did

A separate agent — `claude-optical`, briefed by [BRIEF-optical-review.md](../../BRIEF-optical-review.md) — opened
every proposal and read each decided row against the page image its Locator names.

| | Rows | Documents |
|---|---:|---:|
| accepted, signed `--visual` | 678 | |
| rejected, with the reason on the row | 151 | |
| decided and signed off `--done` | 829 | 87 |
| left untouched, for a ruling | 382 | 40 |
| | **1,211** | **139** |

## Why it is not applied

**40 documents need a name or a ruling first.** Eleven carry `identity.needsRuling`. The other 29 have a product
name that is page furniture, and would enter a grade under a name the page never prints:

- **18 FormFutura sheets** read as "UTURA" or "UT Ula" — the FormFutura logo in the sheet header. The identity is
  wrong too where it was checked: `0a75c631f3ed2081` is `formfutura-tds-stonefil.pdf`, a stone-filled PLA,
  proposed as plain PLA under M001.
- **8 BASF Forward AM documents** named from a logo or a footer ("forwardAafyT", "run by Mass Additive
  Manufacturing", "Ultrafuse PLA Prot").
- A BigRep sheet whose product reads "vii)", a Fiberlogy one that took the form label "TARDE NAME:" into the
  name, and a Bambu sheet named from its page header.

A name is not a thing to guess at, and R074 to R077 are about exactly this. What frees them is a reader rule for
a name that is the sheet's furniture, or a ruling per product.

## What the rejections were, and what they say about the reader

Most are optical, and a few are not. In the reader's own order of size:

| Kind | Rows | What it looks like |
|---|---:|---|
| a method name read as the value | 10 | SIDDAMENT prints "ISO178" in the method column; the row holds 178 MPa, and twice 150178 |
| a digit misread | 14 | 2200 → 0900, 2205 → 0908, Tg 217 → 317 °C |
| a decimal point lost | 4 | 4.5 % → 45 %, 5.6 ± 1.0 % → 56 ± 10 % |
| a value from the neighbouring row or column | 66 | four QIDI elongations took the "Infill 100%" line above the real one |
| a letter read as a digit in a standard | 5 | ISO 527-2 → ISO 327-2, DIN 53504-S2 → DIN 53504-32 |
| a condition the page states and the row omits | 26 | QIDI's footnoted test conditions, Fiberlogy's annealing footnote on a 100 °C HDT |
| a profile that does not match the page | 23 | nine 3DXTECH sheets print no printing settings at all and carry a profile row |
| a method the page names, recorded "Not published" | 2 | ISO 1133-A dropped from two melt-flow rows |

**62 of the 66 "neighbouring column" rows were one defect and are fixed**: a density row whose method read
"3 ISO 1183", the 3 lifted out of the g/cm³ unit column. The reader no longer does it (m104) and the 61 rows
already in the tables were corrected with it.

## What has to happen before it is applied

1. The 40 documents need a name the sheet prints, or a ruling. Until then their 382 rows are not reviewable.
2. The rejections should be read as a list: several are one reader defect each, and a reader fix is worth more
   than 151 rejected rows.
3. Then `--split`, `--accept` what is left, and a migration.

The reviews themselves are in the proposals and survive all of it: every accepted row carries `visual: true` and
the reader's name, which is what `APPLY-OCR-UNVERIFIED` asks for.
