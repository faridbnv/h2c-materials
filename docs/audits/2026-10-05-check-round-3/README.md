# Check round 3: what decides, checked by code first; the leftovers closed; the causes of our own mistakes fixed

> **Historical record** (2026-10-05): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

**In short.** The owner asked for a round that fills what gap round 2 left, adds checks that work, uses OCR only where it
is needed and otherwise re-checks cheaply with Claude Sonnet, and learns from our own mistakes. The round froze the
9,667 records the tool's answers rest on, confirmed most of them by code against their page's own text, and had Sonnet
read on the page image only the records code could not confirm and that could change an answer, plus samples of the
rest. Of 540 records read, none held a wrong number; 29 held words in the wrong place, and each kind was swept
everywhere (the numbered fixes m369 to m382; decision D131). A sealed sample of 100 deciding records, drawn and set aside
before anything was read and read at the end, found 2 errors in what decides (2 %; the true rate probably lies between
0.2 and 7 %): a temperature parser that read a sheet's °F range as °C, which told the team one
printable product could not be printed, and a dropped drying condition. Both were fixed everywhere. Nine products held
twice became one each, 43 records filed under the wrong product moved, the 123 documents whose bytes were lost were
fetched again, and no material's answer in any template changed. The OCR check could not run: the Mistral account
allowed no requests. Two of our own process mistakes are fixed: a slow timing can no longer hide a real failure, and the
README's status is counted, not written by hand.

## What was asked, and what was done

| Step | What it means | Result |
|---|---|---|
| Freeze what decides | `targets.mjs` → `TARGETS.csv`: every measurement that is a product's value, every profile cell that sets a print gate, every guide cell that answers one | 9,667 records (4,913 values, 4,659 print cells, 95 guide cells) on 1,585 sources; `baseline/` holds the answers before the round |
| A sealed sample | `draw-b.py 20261005` → `draw-b-20261005.csv`, 100 deciding records drawn before anything was read (SHA-256 `326f75303a5844911ea39d2a53e192fc09289316a2a4891311897f6a1fbbff84`) | Read at the end: `blind-draw/draw-b-verdicts-20261005.csv` |
| Leverage | `scripts/audit/leverage.mjs`: which records a plausible misreading would turn into another answer | 1,020 can change an answer; 1,286 more a print state the page shows |
| Code comparison | `ocr/compare.mjs --source text`: is each record's value in its labelled row and its column on the page's own text | 78 % of values and 55 % of print cells confirmed; on the 153-record ground truth (`ocr/ground-truth.csv`), no deliberate mis-pairing confirmed |
| OCR | `ocr/ocr-mistral.mjs`, Mistral's `mistral-ocr-latest` only | Not run: the account allows 0 requests a minute until billing is on |
| Read what code could not confirm | `read/queue.py` → 10 chunks; `read/PROMPT.md`; `read/verdicts-*.csv` | 540 read: 320 that could change an answer (20 changed), samples of the rest (9 changed); no wrong number |
| Detectors | `scripts/audit/table-detectors.mjs`, `scripts/audit/duplicates.mjs` | Composition from build plates (m369), unread drying of test bars (m370), hedges and negations (m371), Vicat-headed HDTs and misfiled rows (m372), duplicates (m373), identities and dense variants (m374) |
| Leftovers of gap round 2 | `second-reads.py`, `leftovers/` | 1,764 second reads closed by a join, 28 read and 21 values added (m379); page statements and partial rows (m370, m375) |
| Families | `sweep/` | 118 rows read on their pages: annealing footnotes, densities, Stratasys columns (m378); Bambu preparations (m376) |
| A blind draw | `blind-draw/draw.py 20261009` | 34 changed records: 31 correct, 3 wrong, all one cell kind (a nozzle row's label tail), swept on 68 profiles (m380) |
| The sealed sample, read | `blind-draw/draw-b-verdicts-20261005.csv` | 98 readable: 83 correct; 15 with a wrong cell (15 %, 9 to 24 %), 2 of them in what decides (2 %, 0.2 to 7 %): a Fahrenheit window read as Celsius (m381, 11 cells) and a dropped drying condition (m382) |
| Lost documents, fetched again | `refetch/refetch.mjs`, `refetch/refetched.csv`, `refetch/verdicts-*.csv` | 123 fetched: 32 the same bytes (restored), 85 later copies (kept, not registered), 6 not loaded; of 134 deciding records on them, 133 hold and one page now prints another nozzle window |

## What the readers found, and why

Every change was words in the wrong place, never a digit:

- **A row label inside its cell.** Spectrum's "Closed chamber for printing | not necessary" held as "for printing not
  necessary" (30 profiles); "Recommended environmental temperature" before a chamber's answer (14); the end of "Ruby or
  hardened nozzle recommended" held as a nozzle material (68). Cause: the import's reader split a label from its answer
  at the wrong word. The cells are fixed; the hardened-nozzle and enclosure readings did not move.
- **A statement read for rows it does not speak for.** An annealing footnote under a mechanical table read for the
  thermal rows (28), a printed-specimen note read for a density (33), the test bars' "Ambient temperature" read as the
  product's chamber (1). Cause: a page statement recorded on every row of its sheet. Swept on every row of the pattern.
- **A statement the rows did not carry.** Six Bambu Lab sheets' "All the specimens were annealed and dried at 55 °C for
  8 h before testing" was missing from their rows (63); seven sheets' rows carried it but were typed as stating no
  moisture (140), because the moisture reader read none of the wordings the tables hold most. The reader now reads them,
  so a typed column that disagrees stops the build.
- **A condition or negation dropped.** "when the spools has been exposed to moisture" (drying became required), "Enclosure
  is not recommended for PLA" (read as recommended), "Nicht benötigt, 50 °C empfohlen" and "Heated Bed Optional" (read as
  a bed the filament requires). The parsers read each now.
- **The wrong product.** Six sheets' records filed under another product than the one the sheet names, among them
  SUNLU's PLA+ sheet on plain PLA, iSANMATE's glass-fibre ABS sheet on plain ABS, and FormFutura values m342 put on a
  Spectrum product. Nine products held on two or three grades (a sheet revision, an ISO re-test, a rename, a page and its
  PDF). MakerBot Tough, filed under ABS, prints a PLA's glass transition.

## Our own mistakes, and their causes

- **A timing failure hid a real failure** (gap round 2): `verify` stopped at the scale check's time budget on a machine
  slowed by OneDrive, so the data audit after it never ran and CI caught an outlier the local run should have. Now every
  step runs and every failure is listed (`scripts/lib/run-steps.mjs`), and the timing is judged last and enforced only in
  CI (`scripts/scale-budget.mjs`).
- **An outlier acceptance flapped** with each refit of the model. It now names the value it was accepted for, and is
  dormant, not stale, while that value stands; one Node version runs locally and in CI.
- **The plain README went stale in a day** (153 materials for 152). Its numbers are now counted from the build
  (`npm run docs:status`) and checked in `verify:fast`.
- **The round's own slips**, found by its replay from clean data: a migration fixed by hand once (m372's parse review)
  is now in the migration; a second verify run was started while data still moved and was stopped and rerun.

## What the sealed sample taught

The code comparison confirms the words a record holds against its page. Both deciding errors the sample found were past
it: the Arnitel guide's cell held the page's words exactly, and the parser read them wrong; colorFabb's drying cell held
the schedule and not the sentence's condition. So a confirmed record is a confirmed transcription, not a confirmed
reading, and the parsers' readings need their own checks: the Fahrenheit window and the condition are now tests
(`test/normalize.test.js`), and a sweep found every other cell the parser had misread the same way.

## What it changed in the answers

`after/DECISION-DIFF.md` explains each move against `baseline/`. No template's material verdict moved; products' counts
moved where duplicates merged and rows changed product. The print answers moved for 12 products: DSM Arnitel ID 2045
can now be printed (its nozzle was read to 473 °C), two products' drying is optional as their pages say, two enclosure
answers follow the page, and seven products read unknown where a Variant now reads no printer guide (OPEN-PROBLEMS §32).

## What it leaves

[OPEN-PROBLEMS §32](../../OPEN-PROBLEMS.md): no image reading of digits (OCR not run), 85 documents held only as later
copies, unread low-leverage records, the sealed sample's cells that decide nothing, products that read no guide,
densities as published, copies kept as two products, and statements read on part of a page.

## Re-derive

```sh
node docs/audits/2026-10-05-check-round-3/targets.mjs          # what decides, and the baseline (run on the round's start)
node scripts/audit/leverage.mjs && node scripts/audit/table-detectors.mjs && node scripts/audit/duplicates.mjs
node docs/audits/2026-10-05-check-round-3/ocr/compare.mjs --source text --out docs/audits/2026-10-05-check-round-3/ocr/compare.csv
python3 docs/audits/2026-10-05-check-round-3/read/queue.py
node docs/audits/2026-10-05-check-round-3/refetch/refetch.mjs      # the lost documents, fetched again (skips what is held)
for m in m369 m370 m371 m372 m373 m374 m375 m376 m377 m378 m379 m380 m381 m382; do node scripts/migrate/$m-*.mjs; done
python3 docs/audits/2026-10-05-check-round-3/after/decision-diff.py
```
