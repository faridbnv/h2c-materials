# Print profiles fixed by cause, not by re-reading every one

GOALS steps 2 and 5; C9, C15. Decision D120. On 2026-10-02 the owner asked for a middle ground between another random
draw and a re-read of all 1,323 print profiles: find the causes, then fix every profile each cause touched, with Claude
Sonnet reading wherever reading was needed.

## Why

Five fresh random draws after the error-class sweep found 8 of 30, 8 of 40, 3 of 40, 9 of 40 and 3 of 40 profiles
wrong. Each draw found a sheet layout the import had not read, and each family was swept (m285–m289); but a draw finds
one family at a time, and a re-read of every profile was estimated at about 2.5 million tokens.

## Method

1. **Mark every place an error could hide** (`PM-TRIAL-2026-10-01/data-audit/profiles/detect.mjs`). An omitted, part-held
   or misplaced setting leaves a trace a script can see without understanding the layout: a setting-like number or
   statement on the sheet that no profile of the sheet holds; a held number found only under a test-specimen heading
   or beside another setting's label; a cell not printed as one run of words; two profiles of one product that
   disagree. On the tables before m285 the marks caught **27 of the 27** errors of those kinds the five draws had found
   (the other three were typed readings, which PARSE-MISMATCH checks). Today's tables: 1,412 marks on 681 sheets.
2. **Read only the marks.** Six Claude Sonnet readers judged the marks with two lines either side and the heading above
   (`profiles/BRIEF.md`, `profiles/verdicts/`): 767 not guidance, 244 already held, 42 unsure, **359 errors on 267
   profiles**.
3. **Group the errors by cause** (`profiles/aggregate.mjs`) and fix each where it lives: the import's sheet reader
   (`scripts/ingest/propose.mjs`, its lexicon), the parsers (`build/src/normalize/process.js`), the rules
   (`build/src/lint-rules.js`). The reader is what `npm run audit:context` checks every profile against, so a cause it
   learns is checked on all 1,285 live profiles, not on the marks alone.
4. **Sweep each cause across every profile** by migration, each value quote-checked on its cached sheet (m290–m295), and
   what the taught guard then found besides.
5. **Measure** with fresh random draws of profiles no round had read, reviewed independently. Where a draw found a
   layout the marks had missed, the detectors were widened there (a unit in brackets, "(°C)"; what each product of a
   two-product sheet holds; an enclosure statement beside a held chamber; a value whose label is above it) and only the
   204 new marks were read (`profiles/verdicts/delta-*.csv`): 15 more errors, each a family the reader then learned.

## Causes, and what fixed them

| Cause | Mechanism now | Migration | Cells or profiles |
|---|---|---|---|
| Drying stated in a sentence or footnote, or its hours on another row | reader reads a schedule in a sentence (with or without its unit) and joins a time row, also two lines down; parsers read the forms | m290, m295 | ~100 cells |
| One product's setup read twice from one sheet (mostly a test bar's settings taken for a second setup, later made to match) | PROFILE-DUPLICATE, PROFILE-SIBLING-SILENT; a copy is "Retired duplicate record" and never reaches the database (D120) | m292, m295 | 79 retired |
| A nozzle temperature per print speed, nozzle size or foamed state, read as one row or two rows joined | reader reads SUNLU's zonal and unit-less speed bands, Recreus's nozzle blocks and colorFabb's two columns as rows; a profile per row | m291, m295 | 41 added |
| Dry-box advice read as drying, or run into the nozzle cell | a profile note (Storage humidity) | m293 | 108 notes, 48 cells |
| Settings run together on one line with slashes (LUVOCOM 3F's "… / print bed temperature: > 50 °C / …") | reader reads each segment as a line | m295 | 6 beds |
| A sentence on a sheet that names another product (eSUN's carried-over "printing ABS-CF material within a closed chamber printer") | reader leaves out a clause naming a type its sheet's title does not | — | 2 kept out |
| Labels the import did not know, or set apart from their values ("Extruder:", "Bed:", "Heizbett Temperatur", "Blast Drying Oven", "Dring Conditions", "Pre-printing Drying Conditions", "Compatible Nozzle Material", "Compatible Printer Type", "Room Temp. Normal temperature/常温", Raise3D's split "Recommended environmental … temperature", purefil's value two lines under its label) | lexicon and reader | m290, m295 | ~45 cells |
| An enclosure stated in a sentence ("printable without an enclosure", "an enclosed printer is recommended", "Please keep the chamber closed") | parsers; the reader reads any clause the parser reads; D93 declared where the guide asks an enclosure | m290, m294, m295 | ~30 cells |
| A setting from a pellet-processing table or a test-bar block | reader drops every kind of setting there; a block ends at a numbered note or a guidance heading; the guard flags a held setting printed only there | m290, m295 | 7 nozzle cells, 19 nozzle sizes |
| A "Nozzle" row answered with the nozzle a product needs, or a nozzle sentence, where the profile held the import's fibre sentence | reader reads it as a nozzle statement; parsers read brass, hardened, ruby and their negations | m290, m295 | ~30 cells |
| m170's "not printing guidance" profiles whose numbered notes are guidance | the guard checks those profiles too | m295 | 6 profiles |
| Wordings the parsers could not read (nine PARSE-UNREAD warnings), and a drying window read at whichever end carried its unit | parsers | m290, m295 | 7 reviews rescoped, 19 cells retyped |

## What moved

`npm run build:diff` against c56ba48; `build/snapshot` and the 69 interface views are updated with the change. No
template verdict changed; 72 template rows changed their product counts (PA6-GF, POM, PP, PC, PET-GF, PETG, ASA and four
PLA variants). In 12, PA6-GF's passes went from all products to some, because purefil's PA6 GF10 (G051-08) now has its
own sheet's bed, 120–140 °C, above the H2C's 120 °C, where the printer maker's guide used to answer (OPEN-PROBLEMS §28:
the sheet prints a second bed row, which looks like its drying slot mislabelled).

Product print gates, from the products' own sheets: 42 products now have a published drying schedule, 17 a bed, 8 a
chamber, 6 a nozzle window and 18 an enclosure statement they lacked. Stricter, as their sheets say: two Raise3D PCs ask
for a chamber of 70–80 °C (beyond the H2C's 65 °C, one as a recommendation) and one 50–70 °C (partly reached); purefil's
POM asks for a 120–150 °C bed; SIDDAMENT's PETG Matte says "Seal the Box: Yes", which for a type the guide does not
enclose leaves its chamber unknown (D33); eStars-PLA asks for a hardened nozzle ("Luminous PLA is easy to grind nozzle"),
and eSUN PLA Clear reads it as its twin (D89). Looser: a Siraya Tech TPU no longer asks for a hardened nozzle (its sheet
says brass will work), and LUVOCOM 3F PP-CF no longer has a nozzle window, its only one having been an extrusion table's.
Five materials gained a published drying schedule or nozzle statement (PA66, PP-GF, ASA-AF, silicon-carbide sintering,
PVC). Nine PARSE-UNREAD warnings are gone. Live profiles: 1,285 (1,323, less 79 copies, plus 41 rows).

## Measured

| Draw (40 fresh profiles each) | Deciding fields wrong | Notes or nozzle size wrong |
|---|---|---|
| v8, after m294 | 4 (one of them low confidence) | 9 |
| v9, after the first part of m295 | 4 | 5 |
| v10, after the second part of m295 | 2 | 4 |
| v11, after the third part of m295 | 2, and one bed row the text layer garbled | 9 |

Deciding fields are the nozzle, bed and chamber windows, the enclosure, drying and the hardened nozzle; the five draws
before this sweep judged only those (8 of 30, 8 of 40, 3 of 40, 9 of 40, 3 of 40). Each of v8's and v9's errors was a
layout family; the reader learned each, the guard swept it across every profile, and m295 recorded what it found. v10's
two were SIDDAMENT's "Seal the Box: No" (18 profiles) and a nozzle in eSUN's run-together list of recommendations;
v11's, a drying window read at whichever end carried its unit (19 profiles retyped at the upper end) and a bed cell whose
removal temperature widened the window (P0662). Every error the draws found is fixed with its family. Over the four
draws, 12 of 160 profiles had a deciding field wrong (7.5 %), against 31 of 190 in the five before the sweep (16 %);
the last two found 2 of 40 each (5 %). The target, under 3 %, is not yet shown, and the next draw would show it.

## Independent review

Claude Sonnet, `review.json`: approve with findings, none high; 30 of 30 spot-checked edits supported by their sheets;
the migrations replay byte-identically from c56ba48. Acted on: the test-block look-back crossed a "Recommended …"
heading (it now ends there, and at a numbered note); an infill look-ahead dropped real windows (removed, and 3DJake's
test heading named instead); the guard could not see what the reader drops (it now flags a held setting printed only in
such a block, which found P0941); drying the printed part read as a filament schedule; negations read the wrong way
round ("not recommended to print using a heated chamber", "do not recommend … brass", "no need to use a steel
nozzle"); "stainless" and "brass or steel" read as hardened; a window with a unit on both ends cut; m291 and m293 now
stop when the data moved; the row rule now reads the row's own words, not any "speed". The review read the change as it
stood after the first control draw (v8); what m295 added after it, for the families v9 to v11 found, was checked by the
guard, the replay from c56ba48 and `npm run verify`, not by a second review.

## Left open (OPEN-PROBLEMS §28)

- 56 profile notes (34 layer heights, 12 wall counts, 10 speeds) were taken from test-bar blocks before this sweep. A
  note has no way to retire, and a removal is refused; the owner decides whether notes get one.
- 174 live profiles still hold the import's fibre sentence where their sheets say nothing of the nozzle (26 now hold
  their sheet's own words, 20 of them since this sweep); it belongs in `method.csv` as the rule it is.
- A twin reads its sibling's nozzle statement even where the statement is about the sibling's own additive (eSUN PLA
  Clear from eStars-PLA's luminous pigment).
- "Enclosed-frame (rec.), open-frame" stays a reviewer's reading; the reader joins "85, 6h" into a decimal (P0445);
  SUNLU PLA Basic's bed row is garbled in the text layer (P1239).
- Siraya Tech's Fibreheart Flex TPU 95A sheet is two products under two materials (G129-03, G039-66).
- Purefil PA6 GF10's two bed rows (above), which move a product's gate; the maker could settle it.
- Nozzle-size lists held by their first value; the nozzle size decides nothing today.

## Cost

Claude Sonnet: six mark readers (about 750k tokens), two delta readers (about 170k), four control readers (about 400k)
and the reviewer (about 230k): about 1.55 million.
Claude Opus wrote the detectors, the mechanisms and the migrations. A re-read of every profile was estimated at about
2.5 million tokens and would not have taught the reader or the guard anything.
