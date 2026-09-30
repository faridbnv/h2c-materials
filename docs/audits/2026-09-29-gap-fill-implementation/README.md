# The gap-fill tranche, implemented (2026-09-29)

The owner asked for the reviewed gap-fill research of 2026-09-28 to be finished, putting only its defensible, useful
improvements into the tool: on a branch of the latest main, in a separate checkout, committed locally and pushed to
main on 2026-09-30, when the owner asked (GOALS, "Decided on 2026-09-29, the gap-fill tranche"). The inputs were two packages outside the repository,
`GAP-FILL-PLAN-2026-09-28` (the plan and its contracts) and `GAP-FILL-RESEARCH-2026-09-28` (the research, its AI
reviews and an isolated rehearsal), and their implementation handoff of 2026-09-29. GOALS steps 2 and 5 (C3, C6, C9,
C10); step 6 only if prices passed their own gate, which they did not. This is the record. It was implemented by Claude
(claude-opus-5-5), an agent; no person has reviewed it.

## Starting point

A fresh clone of `origin/main` at `758cf52` (`git ls-remote` read the same commit at 2026-09-30T00:03Z, 17:04 PDT on
the 29th), release `125a0a09b72a`, branch `claude/gap-fill-implementation` with no upstream: [BASELINE.json](BASELINE.json).
The research read `509f6ef` (release `03663e0b6e97`); the nine commits between are the Ashby lens (D107 to D112) and
change no file under `data/` or `schema/`, so every research identity reconciled by its stable ID. The source bytes
came back from the private store by digest (2,290 of the 2,414 registered and ledger digests, as in the owner's
checkout). `npm run verify` passed on the untouched clone. Remote main moved once while the work ran, by a stylesheet-only
commit (`daa8804`); the branch was rebased onto it, and since the release digest does not read the stylesheet the base
release and every before-count stand. The gates were run again on the rebased branch.

## What entered, and from where

The research proposed 51 technical findings. Re-reading them showed that most were read on newer copies of pages the
database already holds: the same URL, registered on 2026-09-26 (Nanovia) or 2026-09-28 (b39's eSUN and Extrudr pages),
printing the same line. A fact is recorded from the registered document where it prints it; the research's copy,
which differs only in a site's carousel or storefront, stays in the research package rather than entering as a second
revision that says nothing new. Only the pages the database did not hold went through the pipeline.

| | Records | From |
|---|---|---|
| m225, from registered documents | 25 values: eSUN PA-CF's ten XY and Z values (its page, which b39 registered); Nobufil PCTG CF's printed and moulded columns (8, read on the page image); Nanovia's PA Food Industry strength and strain at strength, Flex VX's Tg, Flex's and ISTROFLEX's second hardness scales, ISTROFLEX's "> 300 %" (a bound), TPE 22D's modulus | the product's own registered page or sheet |
| | 1 correction: V008864, Nobufil PCTG CF's HDT A 72 °C, stands under "FDM H" on the page image, not "Injection" as m128 read it | the same sheet |
| | 11 drying schedules: nine filled on profiles citing the page that prints them (six Nanovia, two Extrudr DuraPro, and eSUN PA-CF's, which is not a research finding but stands on the line b39 read P1287's enclosure from), two new profiles on pages held as corroboration, now cited (eSUN TPU LW with its AMS advice, Extrudr FLEX Medium Matt) | the registered pages |
| m226, batch b40 | 9 sources, 9 profiles: eight Extrudr drying schedules and Recreus Conductive Filaflex's 0.4 mm nozzle temperature, bed and drying | the research's saved pages, staged by digest ([WITNESSES.csv](WITNESSES.csv); [b40](../2026-09-18-v2-import/batches/b40/README.md)) |

Every value is bound to its own line on the hash-checked page, as the apply guard binds a pipeline row (D97), and
[RE-READ.csv](RE-READ.csv) finds each again, record by record, from the cached text of verified bytes (47 of 47). Each
migration's second run writes nothing, and a row that moved stops it. The Nobufil columns were read on the rendered page
image: the text cannot say which of two columns a number stands under. One value was surprising and is accepted with its
reason (Nobufil's printed notched Izod, 0,7 kJ/m², MEAS-PHYSICS-WINDOW).

Where the research's proposal and the repository's conventions differed, the repository's won: a drying time published
as a range ("8–12 h", "0–6 h") or a bound ("> 4 hours", "Minimum time: 1 hour") is typed as the build's parser reads
it, the end or the bound, as the 172 profiles already holding such a schedule are; the research had left the hours
empty. The research's rows filed Nobufil's injection bars with direction "Not applicable"; they follow the sheet's
existing injection rows ("Unstated"). Its PA Food Industry rows said the specimens were "ISO 3167 A test specimens";
the registered page's cached text does not hold that heading (the reader drops it), so the rows say "Not published".

## What did not enter

[ADMISSION.csv](ADMISSION.csv) gives every finding its outcome: 45 of 51 admitted, and one fact found on re-reading.
[HOLDS.csv](HOLDS.csv) lists what is held and what would release it; OPEN-PROBLEMS §21 carries the ones a reader needs.

- **Held as the research held them**: Nanovia Flex V0's "Tensile resistance 27 MPa VDE282 part 10" (no faithful
  property or standard) and Extrudr FLEX HARD CF's drying (its own page says 6 h in its FAQ and 12 h in its table).
- **A conflict**: Spectrum GreenyHT's shop data calls it a "Bio-Based Copolyester (PLA-Free)"; m223 filed it a PLA
  blend. Nothing is refiled.
- **Context only**: eSUN PA-CF's page heat deflection ("155 10/10", no load), a 3D4Makers-branded compound that is not
  LEHVOSS's product, and a FormFutura sheet that is Helios Support's, not Crystal Flex's.
- **The research's 2,180 task outcomes** (404 pilot, 1,776 production: bounded searches, vendor-needed handoffs) are
  its record of where it looked. They are not facts, and none is written into `coverage.csv`: a search that ended is not
  a finding that changes a question.

## Prices

None entered, and the currency contract was not built. [PRICES.csv](PRICES.csv) gives each of the 136 frozen targets
its outcome. Applying the plan's own rules to the research's 56 regular-offer candidates leaves eight a comparison
could use: an offer in stock when captured, whose tax can be separated, for an in-scope material with no price (PETG-GF,
TPC, PBT-GF, PLA-NF, PETG-GR, PLA-GR, PLA-CE and the undisclosed-polyamide home). The rest are 27 Bambu Lab Canada
offers for materials already priced and two second sellers (a refresh, which GOALS leaves to the refresh routine that
comes with the team layer), and 19 that were sold out, back-ordered or tax-mixed when captured. All eight are EUR or
JPY. Each needs the contract of 04-PRICES: a currency-neutral `prices.csv`, a frozen and registered exchange rate, a
derived CAD-equivalent kept apart from a Canadian listing and its "Canadian" wording across the page, and a legacy
parity proof over the 104 CAD rows. None has the rendered selected-offer capture the research could not make, and a
capture today would be a new retrieval of a price that moves. Eight single-seller foreign hints do not justify that
shared change against the owner's standing decision that price waits (phase 6, decision 3), so the gate is not met:
the research evidence stays in its package, and no unused model or relabelled amount entered. The rendered recheck was
not run: it could only lower the eight.

On 2026-09-30 the owner was shown where a price would decide something and chose to keep price waiting (GOALS). The
count, from this build ([price-targets.mjs](price-targets.mjs)): 732 products pass at least one of the eleven default
questions and 34 of them have a price the comparison can use; 62 of the 92 materials they belong to have none, and most
of those products come from makers with Canadian sellers (Spectrum, Polymaker, eSUN, 3DXTECH, FormFutura, SUNLU). The
recommendation recorded for when price resumes: a Canadian offer for each passing material's best product, in the
current CAD contract, captured and staged like b40; the currency contract only for passing products no Canadian seller
carries.

## Estimates

The model is unchanged. [ESTIMATES.csv](ESTIMATES.csv) gives the 203 dispositions: two are replaced by product values
(PA6/66-CF's strength and elongation, from eSUN's page, as the research's rehearsal found), and 201 stay the research's
reviewed record, with the cell's state now. The admitted rows recalibrate the model as any data do: 129 estimated cells
of 50 materials and 762 products' estimates moved, and two screens in Explore with estimates changed (PA6 now screened
from Flexible component, PET from Warm environment by 0.2 °C at the top of its screening range). Nothing was generated
for the 22 cells the research found not defensibly estimable or the 31 not applicable. FiberFlex Aero's stresses at 5 %
and 10 % strain stay held (OPEN-PROBLEMS §11).

## What it moved

| | Before | After |
|---|---:|---:|
| Measurements (active) | 11,212 | 11,237 |
| Print profiles | 1,305 | 1,316 |
| Sources | 1,739 | 1,748 |
| Product values (one per product and headline) | 4,347 | 4,357 |
| Material values from products | 659 | 663 |
| Material values estimated | 150 | 148 |
| Products with a nozzle verdict / bed verdict | 1,007 / 953 | 1,008 / 954 |
| Products with a drying schedule | 443 | 462 |
| Facts one step from an answer (SCENARIO-GAPS.md) | 3,467 | 3,468 |

The four material headlines gained are PA6/66-CF's XY and Z strength and elongation, and the undisclosed-elastomer
home's glass transition (Flex VX). Ten product values are new: three comparable (eSUN PA-CF), the rest as published
(D84), because their pages state no direction (Nobufil's "FDM H", Nanovia's). Recreus Conductive Filaflex's nozzle and
bed are within the H2C now; its chamber is still unknown, so it is one fact from an answer on Indoor prototype. PCTG-CF's
table cell (a hint, marked *) shows Nobufil's printed 39 MPa where it showed AthenaX CF10's 70 MPa of unstated specimen:
the rule prefers a printed bar.

**Decision diff.** `build/snapshot/templates.csv` moved two answers: PA6/66-CF on Flexible component, in Explore and in
Explore with estimates, from UNKNOWN to FAIL, on eSUN's published 7.42 % XY elongation against the template's 100 %.
The frozen replay of the research's fifteen questions ([FROZEN-QUESTIONS.json](FROZEN-QUESTIONS.json), 18,195
evaluations, both databases answered by this checkout's engine; [replay.mjs](replay.mjs),
[FROZEN-REPLAY.json](FROZEN-REPLAY.json)) finds the same two: the material and its one product, UNKNOWN to FAIL on
Flexible component. No new PASS, and no answer lost. The research's rehearsal, on its older commit, found the same.

**Source-grounded expectations.** [oracles.mjs](oracles.mjs) asks eleven questions written from the cited pages of the
compiled database ([ORACLES.json](ORACLES.json)): all pass. They are not the engine's parity tests.

## The page

`npm run ui:check -- --write` rewrote eleven of 69 views; each difference is one of the above (the table rows for
PA6/66-CF, PCTG-CF and the elastomer home, the estimate columns, the Flexible and Warm environment counts, the compare
tracks' extremes). No layout failure on the laptop, tablet or phone. [ui-qa.mjs](ui-qa.mjs) opened the built page in
headless Chrome and took 19 screenshots of the changed drawers (PA6/66-CF, PCTG-CF, TPU-EC, the elastomer home) at
1180, 820 and 390 px; an agent read them. The drawers show each new value with its source and the raw drying and
recipe words beside the typed schedule. One thing reads wrongly, and did before: a lower bound shows as its number
("300 %*" for "> 300 %"), with no "more than" (OPEN-PROBLEMS §21). Screenshots are kept outside the repository with
the control database; their digests are in the run's rows.json. No person has looked, and no other browser or screen
reader was tried.

## Checks

- `npm run verify` (the full gate: format, schema, lint, generated docs, build and tests, import tests, scale,
  reproducibility, audit, snapshot, 69 interface views, 300 rendered scenarios) passed on the tranche and again on the
  rebased branch: 435 and 186 tests, no failure, 69 views matching with no layout failure, 300 scenarios agreeing (7 min
  2 s). `verify:fast` inside it took 52.0 s, within its 90 s budget; one earlier run took 100.5 s while the private
  store's cloud copy was syncing, and a rerun alone took 50.0 s. The untouched clone's cold run took 156.6 s (§19).
- `git diff --check` is clean.
- `npm run data:diff` and `npm run build:diff`: [changelog.csv](../2026-09-18-v2-import/batches/b40/changelog.csv) (97
  record changes) and [build-diff.txt](../2026-09-18-v2-import/batches/b40/build-diff.txt), both for the whole tranche
  against the base commit.
- `npm run audit:witness`: 11 listed, as before; `audit:know-how` and `audit:scenario-gaps` regenerated.
- `npm run audit:sources` reads a PDF by SourceID, not by digest, and would fetch every sheet again from the web; it was
  run on the one PDF the tranche touched (Nobufil PCTG CF), from its verified bytes: every value on the page is in the
  tables. The three numbers it lists (3960, 97, 2633) are its reader joining the two columns ("39 60"), and the fourth
  is the storage temperature.
- The private source store was re-exported with derived evidence after the batch (`data:sources --export --derived`),
  and `npm run doctor` read it.

## What is left

OPEN-PROBLEMS §21, and §11's Nobufil and stress-at-elongation items, which the tranche narrowed. For the owner:
Spectrum GreenyHT's identity, and whether foreign relative prices are wanted before the team layer's refresh routine.
For Extrudr: FLEX HARD CF's drying, and whether its product pages' tables are a newer formulation.
