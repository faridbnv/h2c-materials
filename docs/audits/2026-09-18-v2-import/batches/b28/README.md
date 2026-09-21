# Batch b28: FormFutura's own library, and what reading it showed up

Applied 2026-09-21 by `m110-batch-b28`: 47 documents, 542 records — 3 materials, 47 grades, 47 sources, 383
measurements, 40 print profiles. FormFutura's 64 gated documents are no longer gated: 40 of its 68 are applied,
7 are products already recorded, 6 are the same bytes as a 3DJake copy, and 15 wait with a reason on the row.

## How the documents arrived

FormFutura serves its library from SharePoint, which answers 403 to anything without a session (R084). The owner
obtained the library itself — 358 PDFs, 227 MB, in `_temp FormFutura Filaments/` beside the repository and ignored
by git — and `ingest:fetch --stage <folder> --provider FormFutura --recursive --create --root-url <library>` took
from it only what is a data sheet:

| Files | What they are | What happened |
|---:|---|---|
| 68 | technical data sheets | staged: 64 against their gated rows, 2 as new rows (LEHVOSS's PAHT 9825 NT; a second revision of ReForm rPLA), 2 reported as bytes the ledger already held |
| 202 | safety data sheets, in three languages | counted, not staged |
| 23, 17, 14, 8, 8, 20 | case studies, declarations, spool drawings, website texts, leaflets, other | counted, not staged |

Two rows carry one file name, `TDS - High Gloss PLA.pdf`, under High Gloss PLA and its ColorMorph folder; the
staging tool tells them apart by the folder the file sits in. Nine of FormFutura's sheets are byte for byte the
3DJake copies applied in earlier batches, and are `duplicate-of` them.

## Parity

Before the batch, FormFutura's layout read 131 of 132 values on its sheets with a text layer (`--compare
--provider FormFutura`, 26 sheets counting the copies); the census over its own two transcribed sheets read 12 of
26 only because one of them, High Precision PET (`S-PET-TDS`), is a scan with no text layer. With the batch's
sheets in the census FormFutura reads **295 of 309 (95 %)**, and the whole census 8,950 of 9,249 (96.8 %), no maker
down.

## What the reader got wrong, and what was fixed before anything entered

The first proposal of this batch filed a brass-filled PLA as PEEK, named two products "DISCOVER", four
"Update Date: 2025/12/1" and one "HT", put CreatBot's PLA-CF under plain PLA, and was about to give seven Fiberon
products already in the tables a second grade each. None of that entered. Each was a reader defect, fixed in the
reader and measured over all 1,634 cached documents before and after (an identity census; 76 names changed, every
one read; parity unchanged at 8,562 of 8,861):

| Defect | Fix |
|---|---|
| a name that is the page's furniture — a logo, a sponsor, a date | `pageFurniture`: the page's own line for the listed product, else held `reader:name-not-a-name` |
| "Technical Data Sheet：CreatBot PLA-CF", with a full-width colon | the colon is a separator |
| "Update Date: 2025/12/1" read as Kingroon's product | a line that begins with a date is not a name |
| "a metal-filled PLA-based filament" lost to "PEEK … hotends" | a stated "X-based" is the composition row's statement |
| a declared metal load held as a modifier question | the grade Variant "declared dense filler" (R095) |
| EasyWood, EasyCork, StoneFil, MetalFil unread as finishes | the variant lexicon knows FormFutura's fused names |
| "FIBERON PPS CF10" against 3DJake's "PPS CF10" | the grade lookup takes the maker's own brand words off both |
| `--split` wrote "held: twin" over registered rows | registered is terminal there too |
| "180180 °C": a text layer that draws each glyph twice | held whole, `reader:doubled-glyphs` |
| "<10⁹ Ω" not found on the page by the apply guard | a superscript power of ten is a power of ten |
| a CreatBot label ending in "Z" read as Unstated | an axis that is the label's last word is the row's direction |
| ASTM D882 tensile values recorded as an unstated specimen | a D882 value is a film's |

## Identities the sheets settle, recorded as rulings

R089 records the owner's decision of 2026-09-21: identity verdicts are the agent's, on a maker's own document.
Under it:

- **R090** ABSpro is ABS: "a modified ABS … reinforced with Styrene Maleic Anhydride and PolyCarbonate", 1.02 g/cc.
- **R091** ABSpro Flame Retardant is PC-ABS: "contains a high percentage of PolyCarbonate, ABS".
- **R092** PLACTIVE is PLA: "a Nanocomposite developed with a high quality PLA".
- **R093, R094** LEHVOSS's unfilled and mineral-filled high-temperature polyamides are PAHT and PAHT-CE, two new
  materials; PLA-PHB (R088) arrives with Fillamentum's NonOilen.
- **R095** a load the maker declares is the Variant "declared dense filler", judged by the dense windows.
- **R096** LUVOCOM 3F is LEHVOSS's whoever sells it; m108 moved five 3D4Makers grades to their maker.

## What the review decided by hand

- **Three moduli physics rules out, kept and flagged (D55):** Filament2Print's ASA and PETG print an "elastic
  modulus" of 0.32 and 0.36 GPa, which is their yield stress over a 10 % strain, beside flexural moduli of 1.84
  and 1.95 GPa; EasyFil ePLA prints a flexural modulus of 3.8 MPa. CreatBot's ASA prints a melting temperature of
  98 °C for an amorphous polymer, flagged the same way.
- **Two rows rejected:** PLACTIVE's two "heat deflections" are footnotes, a melt-flow condition and a viscosity test.
- **Decimal commas:** Filament2Print prints every value of its ASA and PETG sheets with a comma and three places
  ("1836,740 MPa"), so each ambiguous one is a decimal.
- **Four surprising values accepted with a reason:** High Precision PLA's flexural strength of 192 MPa, PPSU's
  notched Izod of 690 J/m, EasyCork's tensile modulus of 1.05 GPa, StoneFil's melt-flow rate of 94 g/10 min.
- **FormFutura's LUVOCOM 3F PEEK 9581 NT** prints G097-04's values under its colour code: registered to it.

## What waits, and on what

| Documents | Why | Next |
|---:|---|---|
| 8 | FormFutura support and specialty sheets: Atlas and Helios Support (PVA blends), BVOH, 3Diakon (PMMA, no polymer row), Crystal Flex (an SBC, no polymer row), SKULPT (no polymer stated), MDflex (the page prints no name in text), Pegasus PP (ultralight) | PLAN-REMAINING 1.3 and 1.4 |
| 4 | Kingroon's PLA Basic, PETG Basic and TPU 90A print Bambu's numbers; FormFutura's PEI ULTEM 9085 prints 3D4Makers' | twins (R053), 1.7 |
| 1 | Filament2Print's XECARB PA12-CF sheet: a text layer that draws every glyph twice | `deferred` or the page image, 1.7 |
| 5 | FormFutura twins of its own sheets (LimoSolve, MagicFil, ReForm rApollo, TitanX, rTPU) | twins, 1.7 |

## Found in the data already recorded, and corrected in their own migrations

- **m107:** the amorphous dense density window D80 described and never wrote; seven acceptances retired.
- **m108:** LUVOCOM 3F is LEHVOSS's; five grades and three coverage counts.
- **m109:** 81 tensile rows measured by ASTM D882 are film values; two acceptances retired.
- **MEAS-PHYSICS-ORDER** now compares one kind of specimen (its own commit).
- **m111:** 53 moulded ISO 3167 bars that were recorded as an unstated specimen (LEHVOSS's "MPTS", "molded
  sample"); 58 heat deflections whose own label names ISO 75's method letter, "HDT A" or "HDT/B", with no typed
  load; and 38 whose load the sheet prints after the value ("119 °C ISO 75 0.45 MPa", "89 ℃（0.45Mpa）"), each
  re-read from its source. Headline heat deflections with an unstated load fall from 13 of 91 to 8 of 89, and
  the two LEHVOSS materials' moulded 1.8 MPa values leave their headlines for context (D55).

Two applied grades were found filed too broadly by the identity census and are left for the sweep (PLAN-REMAINING
§2.3): 3D4Makers' ABSKevlar under ABS rather than ABS-AF, and its PETGCarbon under PETG rather than PETG-CF.
