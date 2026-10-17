# Data review fixes, 2026-10-17

> **Historical record** (2026-10-17): written for one round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

> **In short.** Two reviewers scored the new material pages as mechanical engineers and found faults that were in the
> data, not the pages. The owner had them fixed in a round of their own, on branch data-review-fixes, beside the pages
> work, and kept the merge for himself. Claude Opus judged every change on its page and wrote the migrations m422 to
> m432 and D143; Claude Sonnet agents swept the publishers, the broken words, the titles and the test-bar labels, and
> re-read a blind sample. No scenario verdict moved; PP-CF and PP-GF now pass for some of their products where all
> passed, PA612 is screened out of one stiffness question under Explore with estimates, and many counts moved.

## What was found, and what changed

| # | The reviewers' finding | What the pages showed | What changed |
|---|---|---|---|
| 1 | Kingroon's PLA Basic and PETG Basic reprint Bambu Lab's tables; Bambu's rows annealed, Kingroon's not | Kingroon PETG Basic says "All the specimens were annealed and dried at 65 °C for 8 h before testing", as Bambu's does; Kingroon PLA Basic says nothing of annealing or drying, only how its bars were printed | m422: Kingroon PETG's heat deflection and Vicat rows carry the sentence (they are bars, m378); Bambu PETG Translucent's V1.0 sheet, which states it too and whose 19 rows did not carry it, is typed as m376 typed Bambu's other revisions; Kingroon PLA Basic's printed-bar table is a page statement; both Kingroon sheets' unnotched Charpy values recorded. Kingroon PLA stays "treatment not stated". Three MEAS-CROSS-SOURCE-TWIN pairs accepted; each product keeps its own values |
| 2 | Tear strength, compression set, the stresses at 100 to 400 % listed as "not published" on rigid materials | Only Flexible Elastomers publish them, and Spectrum PP tear strength and the 100 % stress | m423: Applies to and a reason on six properties (elastomers; elastomers and polyolefins for the two PP publishes) |
| 3 | Prusament's Horizontal and Vertical XZ bars never compared | Prusa's PLA High Speed sheet defines its anisotropy coefficient as Z over XY tensile strength, and it is its interlayer adhesion over its Horizontal strength; Prusa's page gives three more that check out; the template's later edition heads the column "Horizontal xy" | m424, D143: 201 values of 19 products typed XY and XZ |
| 4 | Implausible values inside a material's range | SUNLU PETG 2.0's 0.5 GPa beside a 1.9 GPa flexural modulus; Spectrum PLA Tough's 0.433 GPa "E-modulus" is its strength over its strain at peak; PLA Z/XY of 246 % and 240 % is elongation, printed as labelled by Polymaker PLA PRO and Raise3D's reprint; 111 % strength already accepted | m425: eleven moduli flagged (SUNLU's two 2.0 sheets, Spectrum PLA Tough, 3DJake's six secant moduli) and their acceptances, which said they backed nothing while they did, removed; the elongations stand as printed |
| 5 | PCTG-GF's moisture gap stale | The gap is derived; its rule counted environmental evidence only, not a maker's "moderately hygroscopic ... pre-dry at 75°C" | m426, D143: a maker's statement on moisture sensitivity counts in the domain; 48 materials' gaps close, two stored Gap rows superseded |
| 6 | One publisher spelt two ways | 28 sets read; 3DJake / 3DJAKE was a host label too | m428: 244 sources, one spelling per company, legal names kept in notes, hosted sheets their makers'; m432: six hosted sheets their logo's maker (the blind read) |
| 7 | Line-break hyphens in makers' statements | 67 words split at line ends | m429: 65 statements written whole; real compounds stay |
| 8 | OCR-garbled titles | 143 with debris, 86 with the heading but not the product | m430: 229 titles as the documents print them |
| 9 | Orientation labels typed unevenly | AzureFilm's sheets draw the ZX bar standing (Z is right); 3D-Fuel's draw nothing (ZX is right); 48 upright tensile bars left ZX; 20 Eryone template rows; YX shown as "not stated" | m427, D143: 82 rows; YX a Direction value of its own |
| 10 | Fiberlogy PCTG+GF10 "sold as toughened" | The maker claims "increased strength, stiffness, and impact resistance" over PCTG | m431: the mark stays; its reason now says why, not that glass fibre toughens it |
| 11 | Bambu's PETG HF row read for every silent PETG product | The guide has no plain PETG column; PETG HF is its one unfilled PETG | m431: the mapping stays; its reason says so in a reader's words |

Kept, with why (each in OPEN-PROBLEMS): QIDI's "Z-X Axis" (a drawing not tied to a column), Raise3D's three sheets
that head a table "(ZX, Flat)" and draw ZX upright, Flashforge's and 3D4Makers' deliberately unusable labels, the
stresses at 5 and 10 % elongation (not named), the products' own Manufacturer spellings (Fabru twice), and 18 more
acceptances that say a value backs nothing while it backs a product's value.

## The checks

- **Decision diff** (`build/snapshot/templates.csv`, against c69ff7b1): no verdict moved. 20 rows' share moved from
  all to some passing products (PP-CF and PP-GF, whose Prusament products now count and fail stiffness), one material
  is screened out under Explore with estimates (PA612, High-stiffness fixture, its estimate now topping at 4.73 GPa),
  and about 50 rows count products differently (PETG, PLA, ASA, PC, PC-CF, PVB).
- **build:diff**: the measurements' direction, conditions and flags; the products' headline values and the materials'
  spreads they feed; every estimate refit; the coverage findings; the sources' publishers and titles; the know-how
  texts. PLA's comparable tensile modulus now runs from 0.95 GPa, PETG's from 1.0.
- **Interface views** (`npm run ui:check -- --write`): 20 views, as above; the PLA drawer no longer lists the
  elastomer tests as not published.
- **verify:fast** stayed within its budget at every commit (42 to 75 s); the full `npm run verify`: see below.

## The blind read

20 records drawn at random from the 868 the round changed, read blind by a Claude Sonnet reader against their documents
([result](blind-draw/RESULT.md)): 18 right, 1 wrong, 1 partly. The wrong one was a publisher: six sheets 3DJake hosts,
which m428 had given to 3DJake because their text names no maker, are headed by their makers' logos (Creality's five
Hyper sheets, nice essentials' PLA Basic), and m432 gives them to their makers. The partly one is a cell the build
fills from a page statement, as the reader asked.

## What is left

In OPEN-PROBLEMS: §6 (18 acceptances that claim a value backs nothing; Koltron's modulus), §15 (Prusa's interlayer
adhesion as a Z strength; QIDI's Z-X column), §30.5 (Raise3D's "(ZX, Flat)"; Bambu PETG Translucent's ± 1430 MPa),
§30.10 (the Kingroon and Raise3D reprints), §36.1 (products' makers spelt two ways; publishers left), §36.2 (PCTG-GF's
estimates, in the frozen estimate stage).
