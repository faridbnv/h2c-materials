# How the material selector works, for an engineer using it

This is for someone choosing a filament for a part on a Bambu Lab H2C who wants to know where the numbers on the
screen come from, what each kind of number means, and how far to trust it. It assumes you read technical data sheets
and know what a tensile test is. It does not assume you have seen the code, and you do not need to.

Live tool: [pdynamics.ca/h2c-materials](https://pdynamics.ca/h2c-materials/). Everything below is also true of the
single HTML file you can download and open with no internet.

## What the tool is, and is not

The tool is a screening and comparison aid. You state requirements (stiffness at least 3 GPa, heat resistance at
least 100 °C, printable on the H2C, resists oils), and it tells you which of about a hundred filaments the recorded
evidence says pass, fail, or cannot be judged, and why, with a link from every number to the document it came from.

It is not a source of design allowables. Every value is what one manufacturer's data sheet says about one product
under that manufacturer's test, and printed parts vary with orientation, settings and moisture far more than moulded
ones. Use it to get to a short list quickly and honestly; then read the exact grade's data sheet and test the part.

## The path from a data sheet to a number on the screen

Seven stages, each a separate piece of the project, so that a mistake in one is caught before the next. Read the
diagram top to bottom: beige is the outside world, blue is data you can open in a text editor, green is computation,
amber is a check that can stop the build, purple is what ships. The dotted lines at the bottom are the checks that run
against the finished article rather than inside it.

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 340, "nodeSpacing": 45, "rankSpacing": 55, "curve": "basis"}}}%%
flowchart TB
    subgraph WORLD["1 · Outside the tool: what other people published"]
        direction LR
        TDS["Manufacturer data sheet<br/>PDF, with its revision"]
        WEB["Product page or wiki"]
        SHOP["Canadian retailer listing<br/>on one sampling day"]
        LIT["Standard, paper or handbook"]
    end

    SRCS["sources.csv · one row per document<br/>publisher · revision · URL · date read<br/>SHA-256 of the file · why it is registered"]
    TRAN{{"Transcription<br/>every value read from the document itself,<br/>never from a summary, a report or memory"}}

    TDS --> SRCS
    WEB --> SRCS
    SHOP --> SRCS
    LIT --> SRCS
    SRCS --> TRAN

    subgraph TBL["2 · data/tables · the source of truth, plain text, one fact in one place"]
        direction LR
        REC["Records<br/>materials · grades · measurements<br/>profiles · evidence · prices"]
        SEL["Editorial choices<br/>headlines: the one measurement a column shows<br/>material_links: what a material cites"]
        REGI["Registry and physics<br/>properties · headline_definitions<br/>polymers · method"]
        CTX["Context<br/>coverage · fatigue_tests · chamber_bands<br/>family_entries · family_members · reference"]
    end
    TRAN --> REC
    TRAN --> SEL
    TRAN --> CTX

    GATE{{"3 · Schema gate · schema/tables<br/>every column typed · no blank cells, only declared missing states<br/>closed vocabularies · every ID points at a row that exists<br/>canonical text form · row counts and hashes in data/manifest.json"}}
    TBL --> GATE
    GATE -- "a bad cell, named by file, line, record and field" --> STOP1(["Build stops"])

    subgraph CMPL["4 · Compile · build/src/compile.js"]
        direction TB
        NORM["normalize · the sheet's own words become typed values<br/>direction · specimen form · moisture state · annealing schedule<br/>HDT standard and load · nozzle, bed, chamber and drying settings"]
        ASSM["Assemble each material<br/>a headline is a pointer to one measurement, never a copied number<br/>gates against the H2C envelope · print window · best sampled offer<br/>related evidence · implied bounds · what coverage claims"]
        NORM --> ASSM
    end
    GATE -- "every table passes" --> NORM

    subgraph ESTG["5 · Estimate stage · build/src/estimate · an overlay on a database that is already complete"]
        direction TB
        OBSV["observations · every measurement of every material, converted<br/>to this column's meaning with a documented offset and spread"]
        GAUS["gaussian · one model per column: polymer identity pulled towards<br/>its chemical group, reinforcement, declared variant, test house, melting point"]
        CALB["calibration · hide each measured value and predict it, with the<br/>spreads and conversions refitted without the material being hidden"]
        SCRN["screening · set each end of the range where the back-test shows<br/>a true value lands beyond it at most 1 case in 10, at 90 in 100 confidence"]
        OBSV --> GAUS --> CALB --> SCRN
    end
    ASSM --> OBSV

    VALD{{"6 · Validate<br/>every record filed under the material its grade belongs to<br/>headlines on the representative grade, printed, dry, as printed<br/>quarantined values in no summary · XY never merged with Z<br/>coverage agrees with the records · calibration still holds"}}
    ASSM --> VALD
    SCRN --> VALD
    VALD -- "any error" --> STOP2(["Build stops"])
    VALD -- "warnings, each reviewed<br/>and accepted with a reason" --> RPT["build/reports/validation-report.md<br/>what the tool cannot yet see"]

    CTRT{{"7 · Contract · schema/db.schema.json<br/>a renamed, dropped or retyped field fails here,<br/>not as a blank in the browser"}}
    VALD --> CTRT
    CTRT --> DBJS["dist/db.json · the compiled database"]
    DBJS --> BNDL["Bundle · compress the data, inline the interface,<br/>the stylesheet and the plotting library"]
    BNDL --> HTML["One HTML file · works offline,<br/>from a local file or a shared drive, no server"]

    subgraph PAGE["8 · The page · nothing here reads a data sheet or recomputes a headline"]
        direction LR
        ENGN["engine · the decision logic<br/>constraints · indices · Pareto · coverage · scenario · search"]
        UIML["interface · table · Ashby chart · parallel lines<br/>coverage lens · compare · why excluded · evidence drawer"]
        ENGN --> UIML
    end
    HTML --> ENGN
    UIML --> USER(["You: requirements in, a short list and its evidence out"])

    subgraph CHK["Kept honest by, outside the build"]
        direction LR
        CK1["npm run verify · gate, lint, 215 tests, source-to-page audit,<br/>review snapshot, 14 interface views, 300 rendered scenarios"]
        CK2["build/snapshot · every headline, gate, template result and<br/>screening end, committed, so a change shows its effect in its own diff"]
        CK3["Nightly · 2,000 random sets of requirements through the<br/>built page, compared with the engine run on its own"]
        CK4["npm run trace · any number back to its measurement,<br/>grade, source and page"]
    end
    HTML -.-> CK1
    DBJS -.-> CK2
    HTML -.-> CK3
    DBJS -.-> CK4

    classDef world fill:#f6f1e7,stroke:#a2957c,color:#2f2a20
    classDef data fill:#e7f0fb,stroke:#3a6ea5,color:#10283f
    classDef build fill:#e8f5ea,stroke:#3f8b58,color:#123020
    classDef check fill:#fdf2e0,stroke:#c2891c,color:#3b2a08
    classDef ship fill:#f1e9f8,stroke:#7a4fa6,color:#291640
    classDef stop fill:#fae6e6,stroke:#a83232,color:#3d1111
    classDef you fill:#eef2f4,stroke:#54646e,color:#1d282e

    class TDS,WEB,SHOP,LIT world
    class SRCS,REC,SEL,REGI,CTX data
    class NORM,ASSM,OBSV,GAUS,CALB,SCRN,BNDL build
    class TRAN,GATE,VALD,CTRT,CK1,CK2,CK3,CK4 check
    class DBJS,HTML,RPT,ENGN,UIML ship
    class STOP1,STOP2 stop
    class USER you
```

Two properties of this shape are worth naming, because they are what make the numbers trustworthy.

**The build fails loudly rather than shipping something plausible.** Every amber box can stop it. A database that has
drifted cannot reach the page at all, so what you are reading was, at the moment it was built, consistent with every
rule the project asserts about itself.

**Estimates are a layer, not an ingredient.** Stage 5 only adds to the database stage 4 produced. The core builds and
validates without it, which is a check that runs on every commit. No measured value, gate or verdict can quietly
depend on inference.

### 1. Sources

Every document the database uses is registered once: publisher, title, revision, the date it was read, its URL, and
the SHA-256 hash of the file that was read. If a manufacturer silently changes a PDF, the hash no longer matches and
the build says so. A source that could not be retrieved is recorded as such and nothing may cite it.

### 2. Tables

The database is nineteen CSV files you can open in any editor. The ones that matter to a reader:

| Table | One row is |
|---|---|
| `materials` | a material as the tool lists it: PLA, PA6-CF, PC FR. An identity, not a product |
| `grades` | one exact commercial product from one manufacturer (Polymaker PolyMide PA6-CF, Bambu PC FR). A material has one or more |
| `measurements` | one published test result of one grade: the property, the value exactly as printed, the unit, the normalised value, the print direction, the specimen, the moisture and annealing state, the standard and load, the source and the page it is on |
| `profiles` | one product's recommended print settings (nozzle, bed, chamber, drying) with the source's own words kept beside the typed numbers |
| `evidence` | one qualitative statement: chemical resistance, food contact, UV, flammability, with its source |
| `prices` | one Canadian retail listing on one day |
| `headlines` | which single measurement stands for a material in each column of the table (see below) |
| `polymers` | what the estimate model knows about each polymer: crystallinity, melting point, water uptake, neat density |
| `coverage` | what was looked for and not found, so a blank is a recorded absence, not an oversight |

How they fit together. Crow's feet mark the "many" end: one material has many grades, one grade has many
measurements, one measurement is published in exactly one source.

```mermaid
erDiagram
    POLYMERS ||--o{ MATERIALS : "gives its physics to"
    MATERIALS ||--o{ GRADES : "is sold as"
    MATERIALS ||--o{ HEADLINES : "shows one value per column"
    MATERIALS ||--o{ COVERAGE : "records what was looked for"
    MATERIALS ||--o{ MATERIAL_LINKS : "cites"
    MATERIALS ||--o| CHAMBER_BANDS : "may carry a researched band"
    GRADES ||--o{ MEASUREMENTS : "was tested, giving"
    GRADES ||--o{ PROFILES : "prints with"
    GRADES ||--o{ PRICES : "is listed at"
    GRADES ||--o{ EVIDENCE : "is reported to resist"
    SOURCES ||--o{ MEASUREMENTS : "publishes"
    SOURCES ||--o{ PROFILES : "publishes"
    SOURCES ||--o{ GRADES : "identifies"
    PROPERTIES ||--o{ MEASUREMENTS : "is what was measured"
    HEADLINE_DEFINITIONS ||--o{ HEADLINES : "defines the column"
    HEADLINES }o--|| MEASUREMENTS : "names the one shown"
    MEASUREMENTS ||--o| FATIGUE_TESTS : "if fatigue, its loading"

    MATERIALS {
        string MaterialID "PLA, PA6-CF, PC FR"
        string Family "how the tool groups it"
        string EstimateIdentity "which polymers row it is modelled as"
        string RepresentativeGrade "the product its headline values come from"
        string Scope "in scope, excluded, or a family entry"
    }
    GRADES {
        string GradeID "one exact commercial product"
        string Manufacturer "Polymaker, Bambu Lab, 3DXTECH"
        string Status "active or retired, never deleted"
        string Variant "declared if it is not what its material describes"
    }
    MEASUREMENTS {
        string Property "what was measured"
        string RawValue "exactly as the sheet prints it"
        number NormalizedValue "the same value in the canonical unit"
        string Direction "XY, Z, or not stated by the source"
        string SpecimenType "printed part, moulded bar, film, filament"
        string MoistureCondition "dry, conditioned, or not stated"
        string PostProcessing "as printed or annealed, with the schedule typed beside it"
        string StandardLoad "ISO 527, HDT at 0.45 MPa, and so on"
        string DataStatus "published, corrected, implausible, quarantined"
        string SourceID "and the page it is on"
    }
    HEADLINES {
        string HeadlineKey "density, stiffness, strength, stretch, heat, price"
        string MeasurementID "the measurement this column shows"
        string Use "the value itself, or context cited beside it"
    }
    POLYMERS {
        string PolymerID "PA6, PETG, TPU"
        string Morphology "amorphous, semicrystalline, elastomer"
        number MeltingPointC "where the polymer publishes none"
        string AsPrinted "does it crystallise in a print"
        string WaterUptake "how far a conditioned value converts to dry"
    }
```

Two rules shape all of them. **Nothing that can be calculated is stored**: a material's headline is a pointer to a
measurement, never a number typed twice; a per-kilogram price is computed from list price and net mass. **Nothing is
deleted**: a wrong or duplicated record is retired with a note, so the audit trail survives.

### 3. The gate and the build

Before anything is computed, every table is checked against a written schema: every column has a type, a required
value or an explicit "Not published" or "Not applicable" (a blank cell is an error, and nothing ever becomes zero),
every ID points at a row that exists, every categorical value is in a closed list. A mistake is reported by file,
line, record and field in about a tenth of a second.

The build then assembles the database and checks what a schema cannot: that a measurement is filed under the
material its grade belongs to, that a headline cites the material's own representative grade, that a value marked
"quarantined" reaches no summary, that the nozzle text "255-275 °C" and the typed numbers beside it agree. Any error
stops the build, so a database that has drifted can never reach the page. Warnings (an imprecise estimate, a heat
value whose load the sheet never stated) are listed per record and each has to be reviewed and accepted with a
written reason before the build is allowed to pass.

Estimates (below) are added last, as a separate layer over a database that is already complete and valid without
them.

### 4. The compiled database and the page

The result is one JSON file, checked against its own contract, then compressed into a single HTML file together
with the interface. The page never reads a data sheet, never computes a headline, and never reaches the network.
What it does compute is the selection: which materials meet your requirements. That logic lives in one place, is
tested on its own, and every night two thousand random sets of requirements are run through the rendered page and
compared with the same logic run outside the browser, so the screen cannot drift from the rules.

## The four kinds of number

This is the most important thing to know. The table shows them differently on purpose, and only the first one is
evidence.

| On screen | What it is | Can it satisfy a requirement? |
|---|---|---|
| `4.43` | **Measured.** One published value from the material's representative product, printed specimen, dry, as printed, in the direction the column names. Hover or open the drawer to see the measurement, the grade, the source and the page | Yes |
| `46*` | **Related.** A real measurement of the same property that was not promoted: another direction, another endpoint (yield instead of ultimate), a moulded resin value, an annealed part. Shown so you know something is known | No |
| `~71–92†` | **Estimated.** The likely range (80 %) of a statistical model of every observation in the database, converted to this column. Never a point, always a range | No. In Explore mode it can rule a material *out* |
| `n/a` | **Not applicable.** The property does not mean anything for this material (heat deflection of a rubber-like elastomer, structural values of a support material) | No; in Explore it screens the same way |
| `—` | **Not published** in any registered source. Hover to see which kind of absence | No |

Two marks qualify a measured value: `80?` means the source named the standard but not the load, so an HDT value of
80 °C may be at 0.45 MPa or 1.8 MPa and can neither pass nor fail a heat requirement outright; `35≈` means the
published mean ± spread contains your threshold, so the mean passes but some parts may not.

## Estimates: what they are and what they may do

About a third of the headline cells have no published value. Rather than leave them blank, the build estimates them
from everything else it knows: the material's own other measurements (a break strength where the ultimate strength
is missing, a flexural modulus where the tensile one is), its other grades, its resin supplier's sheet, and its
polymer family. Each piece of evidence is converted to the column's meaning with a documented offset and spread (a
Z-direction strength converts to an XY one with a wide spread; a break strength to an ultimate one with a narrow one),
and the whole model is checked by hiding every measured value in turn and predicting it: the 80 % range has to
contain the hidden value 80 % of the time, and the build fails if it does not.

Physics the model follows: a fibre raises a semicrystalline polymer's heat deflection towards its melting point but an
amorphous one's only a little past its glass transition; PET and PVA print amorphous and are treated as such; a
conditioned nylon converts to dry by its water uptake; a filled compound cannot be lighter than its polymer except by
porosity; an elastomer has no heat deflection temperature at all.

What an estimate may do is deliberately limited:

- **It never passes a material.** With estimates on, a material whose estimated stiffness is 3.1 to 4.5 GPa still
  reads UNKNOWN against "at least 3 GPa".
- **In Explore mode it may screen a material out**, but only on an end of its range the build has demonstrated. Every
  build hides each measured value as far as the estimate's kind of evidence would, predicts it, and sets the range's
  ends where a new true value falls beyond them no more than 10 % of the time with 90 % confidence. An end the
  material's own data contradict (PP's own 460 % elongation against a family range topping at 118 %) is left open and
  screens nothing. The drawer says, for each estimate, which ends may screen and why.
- **A material's own printed measurement can veto a screen.** If its published yield strength already meets your
  minimum, no estimate of its ultimate strength can remove it.

In Strict mode ("Confirmed only") estimates are neither shown nor used.

## The two modes and the four answers

Every requirement gets one of four answers per material: **PASS**, **FAIL**, **UNKNOWN** (no comparable evidence) and
**INDETERMINATE** (evidence exists and your threshold cuts through it: a published range of 90 to 120 °C against "at
least 100"). The mode decides what happens to the last two.

- **Confirmed only (Strict):** only materials with a PASS on every requirement are candidates. Measured evidence only.
  This is the mode for a shortlist you will act on.
- **Include uncertain (Explore):** materials with UNKNOWN or INDETERMINATE answers stay visible and flagged, so a gap
  in the database does not hide a material that might suit. With **Use estimates** on, estimates may screen as above.
  The SCREENED chip brings screened materials back.

The whole of that logic, for one requirement against one material, is this. The verdict always describes the evidence;
only the mode decides whether the material stays on your list.

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 300, "nodeSpacing": 40, "rankSpacing": 60, "curve": "basis"}}}%%
flowchart TB
    REQ(["One requirement: stiffness at least 3 GPa"]) --> HASV{"Is there a measured value for<br/>this material in this column?"}
    HASV -- "yes" --> COMPLETE{"Did the source state everything<br/>the column needs?"}
    HASV -- "no" --> APPL{"Does the property mean anything<br/>for this material?"}
    COMPLETE -- "yes" --> CMPV{"Compare it with your threshold"}
    APPL -- "yes" --> ESTQ{"Is there an estimate?"}
    ESTQ -- "yes" --> SCRQ{"Does the range the build lets it<br/>screen on wholly fail the requirement?"}
    SCRQ -- "yes" --> VETO{"Does one of the material's own printed<br/>measurements bound this column<br/>and meet the requirement?"}

    subgraph OUTC["The verdict · what the evidence says, whatever mode you are in"]
        direction LR
        PASS["PASS"]
        FAILV["FAIL"]
        INDT["INDETERMINATE<br/>a published range straddles it"]
        BRKT["INDETERMINATE<br/>the load was never stated, so the value<br/>is read as a bracket, which may screen"]
        NAPP["UNKNOWN · n/a<br/>the property does not apply,<br/>and may screen in Explore"]
        UNK1["UNKNOWN<br/>not published in any registered source"]
        UNK2["UNKNOWN<br/>the estimate is shown and decides nothing"]
        UNK3["UNKNOWN<br/>its own measurement vetoes the screen"]
        SCRD["UNKNOWN · SCREENED<br/>removed in Explore; the chip brings it back"]
    end

    CMPV -- "the value meets it" --> PASS
    CMPV -- "the value misses it" --> FAILV
    CMPV -- "a range straddles it" --> INDT
    COMPLETE -- "no" --> BRKT
    APPL -- "no" --> NAPP
    ESTQ -- "no" --> UNK1
    SCRQ -- "no" --> UNK2
    VETO -- "yes" --> UNK3
    VETO -- "no" --> SCRD

    OUTC --> MODE{"Which mode are you in?"}
    MODE -- "Confirmed only:<br/>only a PASS on every requirement" --> KEEP(["On your short list"])
    MODE -- "Include uncertain:<br/>anything that did not FAIL<br/>and was not screened" --> KEEP
    MODE -- "otherwise" --> DROP(["Not a candidate · the Why excluded tab<br/>names the requirement that removed it"])

    classDef good fill:#e8f5ea,stroke:#3f8b58,color:#123020
    classDef bad fill:#fae6e6,stroke:#a83232,color:#3d1111
    classDef grey fill:#eef2f4,stroke:#54646e,color:#1d282e
    classDef ask fill:#fdf2e0,stroke:#c2891c,color:#3b2a08

    class PASS,KEEP good
    class FAILV,DROP bad
    class INDT,BRKT,NAPP,UNK1,UNK2,UNK3,SCRD grey
    class HASV,COMPLETE,CMPV,APPL,ESTQ,SCRQ,VETO,MODE ask
```

The "Why excluded" tab lists which requirement removed how many materials, so you can see which of your requirements
is doing the work.

## Printability on the H2C

The printer's envelope (350 °C nozzle, 120 °C bed, 65 °C chamber) is compared with every product's published print
profile, and a material reports **within**, **exceeds**, **partial** (a chamber window the printer only partly reaches)
or **unknown**. A recommendation ("chamber recommended if possible") is not a requirement and never excludes. Where a
source says a heated chamber is not needed, that counts; "enclosure recommended" counts as nothing. A material with
no product at all shows an estimated nozzle and bed window, marked as such, that decides nothing.

## How to check a number yourself

- **Hover** a value for its measurement ID, grade and source. **Open the drawer** (click the row) for the full
  record: every measurement of the material with its conditions, every estimate with its evidence and limits, the
  print profiles with the source's own words, the chemical evidence with the sheet's own wording.
- **Compare** puts up to six materials side by side with the measurement conditions under each number, and prints.
- **Export** writes a CSV in which estimates are in their own column and can never be mistaken for measurements.
- If you have the repository: `npm run trace -- PETG` prints every headline of a material back to its source file,
  page and hash.

## What is deliberately not there

- No universal material score. Scores would hide which requirement did the work.
- No cross-property substitution: a glass transition is never shown in a heat-deflection column, and a flexural
  strength never stands in for a tensile one.
- No conversion between impact units (J/m and kJ/m²) without the specimen geometry the sheets do not give.
- No live prices. The price is a median of Canadian retail listings on one recorded day.

## Where the limits are

The tool is only as good as the sheets it read. Several products publish values physics rules out (a heat deflection
at 0.45 MPa below the one at 1.8 MPa; a 1.19 GPa modulus on a 68D elastomer); these are kept, flagged, and decide
nothing. Two materials have no measurements at all. Where a polymer has little data of its own, its estimates rest
on its family. The current list of known limits is kept in [DATA-MODEL.md](DATA-MODEL.md) under "Known limits of the
snapshot", and every build's validation report is published beside the page.

## Reading on

[DATA-MODEL.md](DATA-MODEL.md) explains every table and the estimate model in detail. [INTERFACE.md](INTERFACE.md)
explains every screen. [DECISIONS.md](DECISIONS.md) records why each rule is what it is and what broke before it was.
[audits/](audits/) holds every review of the tool and its data, with what was done about each finding.
