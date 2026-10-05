# Decisions

The choices that are not obvious, and the bugs that forced several of them. Each says what would
break if it were reversed, because that is the part that gets lost.

Each decision opens with one line in plain words, for a reader who was not there, and a status line where a later
decision superseded, amended, narrowed or extended it. The index below collects both (`npm run docs:decisions`).

<!-- index: npm run docs:decisions -->

| | Decision | In plain words | Status |
|---|---|---|---|
| D1 | Excel is the authoring format; JSON is the runtime | The page reads JSON that only the build produces; data is no longer written in Excel. | The authoring half superseded by D45 (CSV tables); the JSON runtime stands |
| D2 | Headline values are verified, never recomputed | A number shown for a product is always a recorded measurement, read from its record, never retyped or recomputed. | Amended by D47 (the value is read from the measurement, not typed twice) and D83 (a product's value is chosen by rule, and a material shows its products' spread) |
| D3 | Missing data is four states, never zero | Not published, not enough comparable data, not applicable and quarantined are four different answers, and none of them is ever shown as zero. | In force |
| D4 | INDETERMINATE is not UNKNOWN | "Nobody has measured it" (unknown) and "the evidence straddles your limit" (indeterminate) are different answers and stay apart. | In force |
| D5 | Evidence outranks silence in gate aggregation | When one print profile states a temperature the H2C cannot reach and another says nothing, the stated one decides. | In force |
| D6 | A recommendation is not a requirement | A maker's "recommended if possible" setting above what the H2C gives warns, and never rules a material out. | In force |
| D7 | Only gates that can discriminate become filters | A printing field that almost every source leaves as "verify the exact grade" is shown as evidence, not offered as a filter. | In force |
| D8 | Related evidence reports one measurement, never a cross-grade range | Values of different products were never to be merged into one range, because it would read as one material's uncertainty. | Its refusal of a range superseded by D83, where a material is the labelled spread of its products |
| D9 | No cross-property fallback | A missing value is never filled with a different property: no Vicat or glass transition stands in for heat deflection. | In force |
| D10 | A family estimate may rule out, never rule in | The first estimates could only rule a material out, never qualify it; the design was replaced by the calibrated model. | Superseded by D40, D42, then D43; its rule that an estimate never passes a material lives on in D43 |
| D11 | Estimates never pool across behaviour classes | Elastomers, supports and rigid plastics are never pooled when estimating. | Narrowed by D40, D42 and D43 |
| D12 | Peers sharing a formulation key count once | Several products described by one data sheet count as one piece of evidence, not several. | In force |
| D13 | The reference layer is separate and off by default | The generic reference materials (steels, woods, moulded plastics) are drawn on the chart only when asked for, and are never candidates. | In force |
| D14 | The engine never imports from the interface | The decision logic does not depend on the page, so it can be tested without a browser. | In force |
| D15 | Tabulator was dropped; Plotly kept | The results table is hand-built and the charts use Plotly, except the parallel-lines chart, drawn in SVG. | In force |
| D16 | The data is embedded gzipped | The single HTML page carries its data compressed and unpacks it when it opens. | In force |
| D17 | One vocabulary module, and no second way to name anything | Every property and requirement takes its on-screen name from one place, so nothing is called two different things. | In force |
| D18 | The familiar baseline is a reference, never a candidate | A familiar material you pick for comparison is drawn beside the results and never counted as one of them. | In force |
| D19 | No sampled offer is UNKNOWN, not FAIL | A material no sampled shop listed is unknown for "can I buy it"; only one listed and out of stock fails. | In force; narrowed by D98 (a product is judged on its own offers, never another product's) and D113 (a foreign listing prices a product and is never an offer here) |
| D20 | Category names are authored with the rules that create them | Environment category names are written in the data beside the rules that define them, not assembled by the page. | In force |
| D21 | One control for how much evidence the chart draws | The chart's two overlapping evidence switches became one three-way choice. | Amended by D107 (work and evidence views), D108 (the work views renamed) and D110 (Material typicals in the Draw row, the test pairs under More) |
| D22 | Search matches words, never substrings | Search matches the start of words, so "PLA" does not find thermoplastic polyurethane. | In force |
| D23 | An estimate is drawn as a range, never as a point | An estimated value is drawn as a range, never as a dot, and never joins the Pareto front. | In force |
| D24 | A relaxed condition and an unstated fact are different things | A chart point is marked doubtful only when strict mode would have rejected it, not whenever a source left a detail unstated. | In force |
| D25 | In the measurement plot, a dot is a test and must say so | In the measurement view a dot is one test, and one material's dots are linked so they read as one material. | In force |
| D26 | The verdict describes the evidence; the policy decides eligibility | A requirement nobody could check is unknown in every mode; the mode only decides whether unknowns are shown. | In force |
| D27 | The nozzle question asks what the user lacks | The hardened-nozzle filter asks "I don't have one", so owning more hardware can never remove materials. | In force; extended by D121 (a fibre-filled product with no nozzle guidance is unresolved for aramid and plant fibre as for carbon and glass, and the reason says it is the database's rule) |
| D28 | Limited resistance is not resistance | A chemical-resistance requirement passes only on a plain "resistant" record, not on "limited". | In force |
| D29 | A template names what it cannot check | Each ready-made scenario lists what it does not check, and promises nothing it does not test. | In force; extended by D101 (every template also asks the H2C's print gates; without them the page is in research mode, and says so) |
| D30 | The snapshot date comes from the workbook (now `data/tables/method.csv`) | The data's date is read from the Method table, not written in code; prices keep their own sampling date. | In force; narrowed by D96 (the date is for a reader; a release ID over what decides identifies a page, a scenario and an export) |
| D31 | A quarantined observation backs nothing | A record marked doubtful, such as a price listing for the wrong product, is kept for the record and backs nothing. | In force; amended by D47 (a price median is computed from its sample, so no stored citation is left to check) and m32 (quarantine is a typed column) |
| D32 | A chamber window the printer only partly reaches is partial, and only the chamber has one | A chamber window that starts below the H2C's 65 °C and ends above it is partial, not a failure; nozzle and bed are read by their upper end. | In force |
| D33 | "Enclosure not needed" clears the chamber; "enclosure recommended" does not | A sheet saying no enclosure is needed settles the chamber question; one recommending an enclosure does not. | Amended by D90 and D93: for the nine types Bambu Lab's Filament Guide asks an enclosure for, an enclosure asked for with no temperature, by the guide or by the maker's own sheet, reads as within the H2C's chamber; for every other type the reverse inference is still not made |
| D34 | An estimated chamber band decides nothing | Researched guesses of a chamber temperature are shown, marked, and never pass or exclude a material. | In force |
| D35 | A research report is re-read against its sources, never transcribed | Every value is entered from its original document, re-read and hash-checked, never copied from a report or a summary. | In force |
| D36 | Referential integrity includes ownership, not just existence | The build checks that every record belongs to the material it is filed under, not merely that its identifiers exist. | In force |
| D37 | A headline belongs to the representative grade; study grades are not procurement grades | A material's numbers must not mix products, and a research-only grade is never a buyable product. | Amended by D83: the representative grade retired and each product is judged on its own values; the rule on research grades stands |
| D38 | Environmental evidence is owned by the material; family evidence stays context | A chemical or moisture requirement is judged on the material's own records, never on notes written for a related material. | In force; extended by D64 (where a material has no record of its own in a category, a resin reference for its base polymer is shown, labelled polymer-level, and may screen but never pass); narrowed by D98 (a product is judged on its own records, or its twin's; the material's other records are context) |
| D39 | Coverage is terminal, but it must agree with the records | The findings on what data a material has never change a result, but the build stops if they contradict the records. | In force; extended by D74 (a finding that only restates the records is derived) |
| D40 | Peer observations are context, not exclusion bounds | For a short time, estimates drawn from similar materials were allowed to decide nothing at all. | Superseded by D42, then D43 |
| D41 | Raw values, endpoints and archived identities are enforced | The build stops when a raw value, its unit and its converted value disagree, and a retired product stays out of every active list. | In force |
| D42 | An estimate is a prediction interval from like-for-like evidence, and may only screen | The second estimate design: like-for-like evidence and 95% intervals, allowed to rule out and never to qualify. | Superseded by D43 |
| D43 | An estimate is a calibrated model of every observation, and says how far to trust it | Missing values are estimated by one statistical model per property, checked against known values it had hidden, labelled with how far to trust them, and never allowed to pass a material. | Amended by D48 (which estimates may rule a material out), D83 (a material is estimated only where none of its products publishes the value) and D87 (a family's maker-undisclosed home is not estimated; named so by D106) |
| D44 | Each product has one home; a family is an entry, not a material | Each product is recorded once, under the most specific material it is; a family name such as PA or TPE only leads to its members. | In force |
| D45 | The source of truth is CSV tables under a declared schema | All data is edited in CSV tables checked against a declared schema; the Excel workbooks were retired. | In force; narrowed by D72 (the pre-commit hook's refusal of a removed record admits one the build now derives, through the removal ledger), and its open question on SQLite answered by D75 |
| D46 | A property is a registry row, and may apply to some filaments only | What each property means, its units and which filaments it applies to are rows in a table, so adding one needs no code. | In force; amended by D83, D92 and D94: a new selectable headline is a row alone, each product's value is chosen by rule, and what a value must be (direction, load, notch, test temperature, standard) is a column of the row |
| D47 | What can be calculated is not stored | Anything the build can compute from the records (medians, per-kg prices, grade lists) is computed, never stored beside them. | In force; extended by D70 and D74, and amended by D83: a product's value is chosen by rule, and headlines.csv only pins one |
| D48 | Evidence screens only where a back-test shows it screens reliably | An estimate may rule a material out only where hiding known values shows that kind of estimate to be reliable. | Amended by D55, D58 (the back-test moved to `build/src/estimate/`, and the implied bounds to headline_definitions.csv), D59 and D83 |
| D49 | The values the build decides on are typed columns; raw text stays, and the parsers check it | Decisions read typed columns; the source's own words stay beside them, and the build stops if the two disagree. | In force |
| D50 | Every check has a code, and quality findings are fixed or accepted with a reason | Every check has a stable code, and every data-quality finding is fixed or accepted with a written reason. | In force; its "nothing is deleted" narrowed by D72 |
| D51 | Hand-maintained mappings are keyed by ID and checked at the gate; so are names the code relies on | Hand-kept lookup tables use record identifiers, not names, so renaming something cannot silently break them. | In force; amended by D60: the estimate model's configuration names no material, grade or polymer any more, so EST-MODEL-REFERENCE is retired |
| D52 | The transfer is proven cell by cell; every later correction is re-read, guarded and replayable | The move out of Excel was proven cell by cell, and every correction since is a re-runnable script that refuses to run if the data moved. | In force |
| D53 | The estimate model reads declared states, not wording; and every change shows its downstream effect | Estimates read declared states (dry, conditioned, a declared variant) rather than wording, and every change commits a snapshot of what it did. | Amended by D68 (the state is a column on the row, not an entry of the vocabulary), D73 (EST-WIDE asks only whether the model ignored a value the material publishes; a merely wide estimate is EST-THIN, informational) and D83 (the representative grade retired, and a variant is counted apart from its material's spread) |
| D54 | A published mean ± band is judged on its mean; the band flags a result close to the limit | A value published as "35 ± 4 MPa" is judged as 35; the band only marks a result close to the limit. | In force |
| D55 | A value physics rules out is kept, flagged and decides nothing; only a printed part bounds a printed headline | A published number physics rules out is kept and flagged, and decides nothing; only a printed part's value can set a lower bound. | In force; extended by D82, and amended by D83: nothing selects a headline now, and a flagged value is no product's value (a pin on one stops the build) |
| D56 | The estimate model follows printing physics: crystallisation, water uptake, mixing, and what an elastomer cannot have | Estimates follow printing physics: slow-crystallising plastics, water in nylons, filler density, and what an elastomer cannot have. | Amended by D60 (how a polymer solidifies in a print, its water uptake and its neat density are columns of polymers.csv), D68 (states are columns on the row) and D83 (heat deflection does not apply to an elastomer) |
| D57 | Identity is a record's job: compounds are declared, a replaced name keeps its record, and every build finding is reviewed | Unusual products are declared in the data, a replaced property name keeps its record, and every build warning is reviewed. | In force; amended by D73 (an estimate wide for want of data is EST-THIN, not reviewed) and D83 (the representative grade retired, and the unstated-load finding with the bracket) |
| D58 | Estimates are an overlay on a complete core, and grow by data, not by special cases | The database works without estimates, which only add to it, and the model grows by declaring cases in the data rather than by new code. | In force |
| D59 | A screen rests on an end the back-test has shown, one end at a time, never against the material's own evidence | An estimate may rule a material out only on a side of its range that testing has shown to be reliable, and never against the material's own data. | In force; amended by D83 (m137): the unstated-load bracket is gone, and the back-test hides each material's typical product's value |
| D60 | What the estimate model knows about a polymer, a variant or a product's hardness is data, in tables | What the estimate model knows about a polymer, a variant or a product's hardness lives in tables, not in its configuration. | In force |
| D61 | No meaning lives only in a tooltip | No meaning is available only on mouse hover: every such mark is also a button that explains it, for touch and keyboard. | In force |
| D62 | A narrow screen scrolls what does not fit inside its own box, and never squeezes it | On tablets and phones, tables scroll sideways inside their box rather than squeezing, and the detail panel becomes a proper dialog. | In force |
| D63 | A source's Title is what the publisher printed, and a specimen's print parameters are the tested conditions, not the guide | A source's title is the heading the document prints, never a file name or page chrome, and a specimen's print parameters are only the tested conditions. | In force; extended in phase 5, part 5 (m149): page furniture read as a title is flagged too |
| D64 | Polymer-level behaviour is shown and may screen, never passes | What a resin handbook says about a plastic's chemical resistance is shown where a product has no record of its own; it can rule out but never qualify. | In force |
| D65 | A test method that defines its load states that load; the typed value says so in Parse review | A heat deflection labelled Method A or Method B has the load those standards define, recorded with the reason. | In force; amended by D83 and D84 (m137): a heat deflection with no stated load is its product's value as published, and HDT-LOAD-UNSTATED is gone |
| D66 | A templated safety data sheet is evidence only where it speaks about the product | Boilerplate in a safety data sheet that contradicts the product's own data sheet is not recorded; its composition always is. | In force |
| D67 | A property is a row, not a pair of columns: the reference envelopes are long | Each generic reference material's property ranges are rows, one per property, so a new property needs no new column. | In force; amended in phase 5, part 5 (its dead offset removed, three misspelled names corrected) |
| D68 | A datasheet sentence is data, not a vocabulary: the state is a column on the row | A sheet's sentence is copied as printed, and the state it means (dry, annealed) is a typed column beside it. | In force |
| D69 | A profile's qualitative notes are rows, and an empty column is not a fact | A maker's printing notes (cooling, overhangs) are one row per note, and the Printing tab shows them. | In force |
| D70 | A constant is not a per-material fact, and a summary of the data is not data | A sentence true of every material is one Method rule, and anything computable from the data is computed, not stored. | In force |
| D71 | How a source was classed and how it was reached are states, not sentences | A source's kind and whether it was retrieved are values from fixed lists, with the particulars in notes. | In force |
| D72 | A record may leave a table only where the build derives it, and only through a ledger | Records are never deleted, except one the build now derives, and then only with a ledger row naming the migration and where it went. | In force; amended by D123: a row the build now refuses outright (a chamber band on an alias, m303) leaves through the same ledger, which says why it went nowhere |
| D73 | A reviewed fact belongs in the row, and "not enough data" is not a defect to review | A reviewer's conclusion is written into the data row, and an estimate that is wide only because data is thin is reported, not reviewed. | In force; amended by D83: EST-WIDE reads a usable value of any of the material's products, not of its representative grade |
| D74 | A coverage row is a judgement; that a material has records is derived | The build works out which kinds of data each material has; stored coverage rows are kept only for human judgements. | In force; extended by D114 (absence is derived too, and a converted price is limited price coverage) |
| D75 | A generated SQLite file for asking questions, with the schema's types in it | The build writes a SQLite copy of the tables for asking questions, with missing values as empty beside their reason, and nothing reads it back. | In force |
| D76 | The standards a measurement names are a typed list, and a fragment is not a standard | The standards a measurement names are a checked list beside the source's wording, and a garbled fragment is never read as a standard. | In force; the fragment rows it counted were re-read, the last by m101 (2026-09-21), but for twenty whose sheets print the fragment themselves (OPEN-PROBLEMS §1) |
| D77 | The spread search sees a sample; the model still sees everything | To stay fast, one step of the estimate fit uses a fixed sample of at most 400 values; every other step uses all the data. | In force; extended by D79 (the block solve) |
| D78 | A limit a material's own grades publish is a floor for its shown range | An estimated range never goes past a limit the material's own data sheets publish. | In force |
| D79 | The kernel is solved by block, and the estimates are the dense solve's | The estimate model's large matrix is solved one chemical group at a time, about nine times faster, with the same results to floating-point precision. | In force |
| D80 | A grade's declared load is a fill class of its own, and the grade declares it before the material does | A product declared heavily filled (metal-filled, foamed) is checked against the physical limits of that kind of filler, and the product's declaration comes before its material's. | In force; extended by D82, and by R095: a powder load the maker names is the grade Variant "declared dense filler", judged by the same dense windows, not a modifier ruling |
| D81 | Every grade has its own estimate, from the same model at its own row, calibrated at grade level, and deciding nothing | Each product gets its own estimate from the same model, shown for information and deciding nothing. | Amended by D83: only a product without a comparable value of its own gets one, and with the representative grade gone every grade takes the bounds its own sheets publish |
| D82 | A property with thirty values has a window, drawn from physics and checked against the rows | Every property with thirty or more values has plausibility limits drawn from physics, and each value outside them is checked against its sheet. | In force |
| D83 | A material is the spread of its products, and passes when one of its products meets every requirement | A material is shown as the range of its products, and passes when at least one product meets every requirement on its own values. | Amended by D88 (a printer maker's guide answers a product's silent print gate), D89 (a twin reads its sibling's values and recipe), D98 (a product's environment, stock and evidence are its own) D99 (a product is judged in one state it can be made in), D100 (a material fails only when every product fails; with one unresolved it is unknown) and D113 (a product's price may be converted from a foreign listing, and says so) |
| D84 | Two evidence levels: comparable decides; a value published without its direction or load is counted apart | Values with a stated direction and load decide by default; values published without them are shown and counted apart, and decide only when asked. | Amended by D92 (the layer strength takes no value published without a direction; an impact headline also sets a notch and a test temperature), D94 (a headline may name its test standard, and a value naming only others is no value of it), D95 (a bar printed off the product's recipe is no product value) and D99 (comparable is a screening policy: a verdict names the conditions it admitted unstated, and an annealed or conditioned value decides only in its own state) |
| D85 | The record tier: what a source publishes is kept as printed, in the database only, and decides nothing | Everything else a source prints is kept as printed in the query database only and decides nothing; makers' printing advice is the one part the page shows. | In force |
| D86 | A maker's product line is a product, TPU is read by hardness, and a product moves by its MaterialID | Bambu's one-product lines became products of their real material, TPU is split by Shore hardness, and a product moves between materials keeping its identifiers. | Amended by D106 (m223): the "hardness not stated" class is a family entry, and a TPU that states no rating waits for its maker's; extended by D123 (two grades of one product become one, the records keeping their IDs, as a moved product's do) |
| D87 | A family's "polymer not stated" home, and sintering filaments are recorded, never candidates | Products whose sheets name only a family get a labelled "polymer not stated" material, and metal and ceramic sintering filaments are recorded but never candidates. | Amended in phase 5, part 5 (m146): exclusion is recorded in Scope alone; amended by D106 (m223): a product is searched beyond its sheet before it enters a home, the homes say the maker does not disclose the polymer, and the PLA family's are named PLA blend |
| D88 | Where a product's own sheet is silent, a printer maker's guide decides its print gate, labelled as the guide's | Where a product's own sheet says nothing about a part of how to print it, Bambu Lab's Filament Guide for its material type answers instead, always labelled as the guide's; the product's own sheet always wins, and the guide cannot settle a chamber it gives no temperature for. | Amended by D90 (for the nine types the guide asks an enclosure for, its enclosure is the H2C's heated chamber); amended on 2026-09-27 (m209): the revision read is the one Bambu Lab's guide page links (B-GUIDE, eighteen types); its label reworded by D124 ("from Bambu Lab's Filament Guide for …") |
| D89 | A twin reads its sibling's values and print recipe where its own are silent | A product whose sheet prints the same table as a sibling of the same material shows the sibling's values and print recipe where its own are missing, labelled "data sheet shared with …" (worded "same sheet as …" until D124), and counts as a product in its material's range. | In force; amended by D119 (a twin reads its own maker's sheet before another maker's reprint of the table); extended by D123 (two grades of one product are one grade, not twins); its label reworded by D124 |
| D90 | Where Bambu Lab's guide asks for an enclosure, the H2C's heated chamber meets it | For the nine material types Bambu Lab's Filament Guide says to print in an enclosure, a product whose own sheet says nothing about the chamber counts as printable in the H2C's heated chamber, labelled as the guide's; a maker's own chamber statement always wins, even one the H2C cannot reach. | In force; it amends D88; extended by D93 (a maker's own "enclosure needed" or "recommended", with no temperature, reads the same for the nine types); extended on 2026-09-27 to ASA-CF and PC FR, the two types the guide Bambu Lab links also asks an enclosure for (m209) |
| D91 | A tensile value labelled only by a ±45° raster is an XY value | A test bar a data sheet describes only by its ±45° print pattern is read as printed flat (XY), because that is how makers usually print their XY bars; where the sheet names its own XY bar beside it, the ±45° one stays apart. | In force; it supersedes the reading of a ±45° raster that m33 and lane 4 (m155) applied, for tensile values a sheet labels by that raster alone; extended by m199 (2026-09-27): the ±45° tab's "Ultimate strength" is each of twelve Nanovia products' XY tensile strength |
| D92 | Three more selectable properties: the layer strength, the notched Charpy impact strength and the glass transition | You can now require a strength across the layers, a notched impact strength and a glass transition; each product's value is chosen by the same rule as the others, and a value measured another way (another test, unit, notch, direction or temperature) is shown but never compared. | Amended by D94 (notched Izod is a second impact filter; the Charpy headline no longer shows an Izod value as its nearest evidence); extended in phase 6, final round (m191): an XZ or ZX tensile bar its sheet shows or says stood upright is recorded Z, and counts; extended by D123 (Eryone's template "X-Z" bar is Z by the owner's ruling) |
| D93 | A maker's own "enclosure needed", with no temperature, reads as the guide's tick | For the nine material types Bambu Lab's guide says to print in an enclosure, a product whose own sheet says an enclosure is needed or recommended, and gives no chamber temperature, counts as printable in the H2C's heated chamber, in the maker's own words; a temperature the maker states still decides. | In force; it extends D90. Read for ASA-CF since 2026-09-27 (m210): the guide the build reads (D88, amended) asks an enclosure for it, and the owner's answer of that day reads that ask as D90 does |
| D94 | Notched Izod is a second impact filter, beside notched Charpy, and the two are never mixed | You can now require a notched Izod impact strength as well as a notched Charpy one; they are two different tests, so each has its own filter, each says so, and no number is ever converted from one to the other or from J/m. | In force |
| D95 | A product is judged as it is meant to be printed: colorFabb's lightweight PETs, foamed | When a sheet prints a product's values at two print settings and the product is made to be printed at one of them (a foaming filament, foamed), that one is the product's value; the other is kept and shown beside it, and never decides. | In force |
| D96 | A release is its content: an ID over what decides travels with every page, scenario and export | Each build is named by a digest of the data, rules and engine that decide its answers, not by a date; a scenario saved on one release says so when opened on another, and every published release's page is kept. | In force |
| D97 | A decision value is bound to its own row: its number is one its evidence line prints, and a number has one role | A value enters only if the line it was read from prints that number whole, and a number printed once cannot be both a value and a condition, or two conditions; a page that merely contains the digits somewhere is no longer enough. | In force |
| D98 | A product's verdict rests on its own records: its evidence, its offers, its conflicts | A product passes an environment, stock or evidence requirement only on its own records (or a twin's, which is the same sheet); another product's record, or one filed under the whole material, is shown as context and never passes it. | In force |
| D99 | A product is judged in a state it can be made in: as printed unless annealing is permitted, dry unless conditioned is asked | A product's values are sorted by the state they were measured in (as printed, annealed at a schedule, conditioned by moisture); a verdict uses one state's values only, as printed by default, and says which treatment it needs. | Amended by D107 |
| D100 | A material fails only when every product fails; while one is unresolved, it is unresolved | A material passes when one of its products passes, stays unknown while any product has not been judged and none passes, and fails only when every product fails; the counts of passing, failing and untested products stay beside it. | In force |
| D101 | Every template asks whether the H2C can print the product; browsing without it is research mode | Each ready-made scenario checks each product's nozzle, bed and chamber against the H2C's, as it checks its properties; turning that off is labelled research mode, where a pass says nothing about printing. | In force |
| D102 | One ranking: the table, the chart's guide, its line and the export rank a question the same way | When the candidates are ranked by a goal, every view uses the same ranking, computed from each candidate's passing products' own values; the chart's bubbles are drawn at typical values and are labelled as context, never as the ranking. | Amended by D107 |
| D103 | A chosen product is a local decision record: its brief, its state, its release, and the team's own tests | An engineer can choose the exact product the team will print; the page keeps it with the scenario, with the state and release it was chosen on, and writes a decision brief with its evidence, recipe, open questions and a test plan, where the team records its own results. | In force |
| D104 | A save is one transaction, a fetch is bounded, and a source's bytes are kept by their digest | Editing the tables from a script either writes every file of the change or none, and refuses to overwrite another writer's save; downloading a source gives up after set limits and resumes without starting over; and the downloaded source files can be listed, backed up and restored by their fingerprint. | In force |
| D105 | A query is of one generation; a decision can be traced; the loop is measured | The SQL file you query says which release of the data it is of and never mixes the tables as they are with an older compiled database; one product's decision in a saved scenario can be traced record by record from the command line; and what the build and checks cost is measured step by step. | In force |
| D106 | A product is named for what its maker's documents say it is, searched beyond the data sheet | Before a product is filed as "polymer not stated" or "hardness not stated", its maker's safety data sheet, pages, guides and older editions are searched; it is filed under what they name, and only what no document names stays in a home that says the maker does not disclose it. | In force; it amends D86 (the "hardness not stated" class is a family entry) and D87 (the homes are named for what is true of them) |
| D107 | The Ashby lens is a selection exercise: exact product states, one goal, a line that counts what it is drawn over | The Ashby chart draws each product that meets the requirements at the values of the state its answer is in, ranks and counts those same product states with the goal's line, and keeps material ranges, estimates and failed or unresolved products as labelled context; published catalogue values and test pairs stay available as evidence views. | In force; amended by D108 (no objective stages, no axis limits form, material ranges as D83), then D109 to D112 (the controls, views and marks as they now are) |
| D108 | The Ashby lens has one control row, one place for requirements, a line that filters nothing, and material ranges as the table's | The chart's controls look the same in every view and never change their words as you work; requirements are set only in the filter rail, and the chart's requirement lines open it; the goal's line is a guide that counts what is on its better side and removes nothing; and a material's box is the middle half of its own products, with variants such as wood or metal fills drawn apart. | In force; it amends D107; amended by D109 (the Show and More menus became the Draw and Also rows, the axes moved onto the chart) and D110 (a variant drawn as its shape ringed with a dot, not a diamond) |
| D109 | The Ashby lens keeps every option, in three rows with one planned effect each, and keeps the reader's place | The Ashby chart keeps all its choices, laid out as three labelled rows (what to draw, what else to draw, the goal's line) with the axes on the chart itself; every choice shows its state where it is, does one planned thing and leaves the rest alone; and nothing a press does throws away the reader's zoom, list search, scroll or open folds. | In force; it amends D108; amended by D110 (the view order and names, test pairs and exports under More, details in place of the list, the pills on the chart's top-left corner) |
| D110 | The Ashby lens draws coarse to fine, keeps a shape per filler everywhere, and opens details in place of the list | The Ashby chart's views run from one dot per material (Material typicals) through each material's range to every product; the raw test pairs sit under More; a product's shape says its filler on every view, and its fill says whether it passed; and pressing mark after mark swaps one set of details in the right-hand panel instead of piling them up. | In force; it amends D109 (and D108's variant mark); amended by D111 (Material typicals on the same layout, frame, size and ticks as the other views) |
| D111 | Every view of the Ashby lens is laid out, sized, framed and labelled by one rule | Switching between Material typicals, Material ranges and Products no longer moves anything: the list stays beside the chart, the chart keeps its place and size, the legend sits in one place, the axes are framed on what is drawn and labelled with plain numbers, and what the typicals view says about itself is said the way the other views say it. | In force; it amends D110; amended by D112 (Material typicals drawn as one dot per material) |
| D112 | Material typicals is one dot per material, which says what it stands for and where its passing products are | The Material typicals view draws each material as a single dot at its typical datasheet value, with no box or whiskers around it, and the dot says it is the whole material and how many of its products pass, pointing to Material ranges for those. | In force; it amends D111 |
| D113 | A price may come from a foreign listing, converted at one Bank of Canada rate, and it lists nothing in Canada | A product that no Canadian shop in the sample sells can be priced from its maker's or a seller's foreign listing, in USD or EUR, converted to CAD at one frozen Bank of Canada rate and marked as converted; it never counts as listed or in stock in Canada, and a Canadian price always wins over a converted one. | In force; it amends D19 (a foreign listing prices a product but is never an offer here) and D83 (a converted price is one of a material's products' prices) |
| D114 | Absence is derived too: the coverage page says the same thing for the same records | Where a material has no records of a kind, the build now says so itself, as it already said where it had them; the coverage page therefore shows a gap the same way for every material, and a price read only from a foreign listing as limited. | In force; it extends D74 |
| D115 | A Parse review explains the columns it names; a typed endpoint is a number its cell states | A note that explains why one typed value differs from what the parser reads now names that column, and silences the check for that column alone. A typed temperature must be a number its own cell prints, and an open bound ("> 80 °C") stays open, whatever any note says. | In force; it narrows the Parse review of m08 |
| D116 | What a page states once, its values inherit | A data sheet often says something once for a whole table, such as "all specimens annealed at 80 °C" or "printed specimens, dry". That statement is now recorded once per page, and every value on the page that says nothing for itself inherits it; a value that says the opposite keeps its own words and is flagged. | In force |
| D117 | A row says how many products pass, and shows the passing products' own values | A material's row now says "PASS · 7 of 200 products" instead of a bare PASS, shows the range of the products that pass beside the range of all of them, says when a pass rests on a declared variant or on a value with no test direction or treatment stated, splits an UNKNOWN into how many products measure below and how many publish nothing, and gives every material-level fact (a hardened nozzle, a typical value's state) the count of products it is true of. | In force; it amends D83 (how a material's verdict is shown, not how it is decided) |
| D118 | "Official Bambu product" passes Bambu Lab's own spools | The requirement "Official Bambu product" used to pass every product of a material Bambu sells, so a third-party PLA passed it because Bambu sells a PLA. It now passes only products Bambu Lab makes; the others of that material are "Officially listed family". | In force |
| D119 | What the error-class sweep changed in the rules | Clearing the data audit's error classes changed a few rules: products of one material that print one table share one formulation key even when two makers sell them, and each reads its own maker's sheet first; a review note that no longer explains anything stops the build; a page's statement about specimens never covers a melt flow rate; and the readers learned the spellings the sheets used that they could not read. | In force; it amends D89 and D115 |
| D120 | One setup, one profile: a copy retires, a row per speed or nozzle size is its own, a dry box is a note | A print profile is one setup a data sheet prints for one product. 79 profiles were a second reading of one product's setup from one sheet, mostly because the settings their test bars were printed at were taken for a second setup; the copy is now retired, as a duplicate measurement is, and the build leaves it out. A sheet that prints a nozzle temperature per print speed or per nozzle size gives a profile per row, as the import already did for Spectrum's and Polymaker's speeds. A dry-box recommendation says where the filament is kept while it prints; it is a profile note, not a drying schedule. And the import's sheet reader, which the build's check of every profile runs, reads what the sweep found it missing. | In force; it extends D72's retired duplicates to profiles and amends D119 (what the import's reader reads); D121 takes the import's fibre sentence out of the profiles it wrote it into |
| D121 | A fibre wears a brass nozzle by the database's rule, stated once, never as a sheet's words | That a fibre-filled filament needs a hardened nozzle is the database's rule, not something its data sheet said. The import used to write the rule into each fibre profile as if the sheet had printed it, and the page then told a reader "a source states it needs an abrasion-resistant nozzle" for 174 products whose sheets say nothing of the nozzle. Now a profile holds only what its sheet says, the rule is written once in method.csv, and a fibre-filled product its own sheet, its twin's and the printer maker's guide leave silent is unresolved under "No hardened nozzle", never passed. | In force |
| D122 | A stress at a stated elongation is its own property, never a strength | Elastomer sheets print the stress their test bar carries at 100, 200 or 300 % stretch (an elastomer's "100 % modulus"), and one sheet at 5 and 10 %. With no property for it, the import filed each as a tensile strength, and where a sheet printed no other strength, it became the product's strength and decided answers. Each is now a property of its own, one per stated elongation, which is recorded and shown and never compared with a strength. | In force |
| D123 | The owner's rulings of 2026-10-02: one product one grade, the registered sheets read in full, Eryone's "X-Z" is Z | Three recommendations of the priorities review, taken by the owner. A product the database held on two grades (one per sheet revision or language) is one grade now, with every record moved to it rather than the copy retired with its prices and profiles. Values a sheet the database already holds prints, and nobody transcribed, are recorded: reading a registered, hash-checked sheet again is not an import. And Eryone's template labels its upright tensile bar "X-Z", as two of its sheets say, so that bar is the layer strength on every sheet of the template. | In force; it extends D86 (a merged product's records keep their IDs, as a moved product's do), D89 (twins) and D92 (the layer strength), and amends D72 (a chamber band on an alias leaves through the ledger though nothing derives it) |
| D124 | The page is written for an engineer: answer first, the data sheet's terms, no coinages, IDs out of sentences | Every text on the page is written for one reader, an engineer choosing a filament for a part on the H2C, and for the decision it serves. Engineering and data-sheet terms stay; the words this project coined for its own records ("twin", "admitted for screening", "research mode", "in scope", "Theoretical") are replaced by what that engineer would say. The left rail is ordered as an engineer screens, with the H2C's checks in one group and the part's state in another; the drawer's tabs follow how a material is checked, Products second and Sources last with the known gaps; record IDs leave the page's sentences for a small ID mark. No answer moves. | In force; it rewords the labels of D88 and D89 and the Overview of the drawer described under D83, D103 and D117 |
| D125 | A sheet is read as its page shows it: reading order, page images read where they decide, and every own sheet guarded | The import's sheet reader read a page line by line in the order its text layer gave, so a two-column sheet interleaved its columns and a label lost its value; a font that drew "ti" as a digit hid a label; a web page's spec grid ran onto one line; and a product whose sheet the reader could not read got no print recipe, which no check noticed, because every check started from a profile that existed. The text is now also read in reading order and with its ligatures put back, web pages with their structured data and grids, and broken text layers are flagged and read optically beside the text. Every page of the 1,377 documents tied to a gap was read from its image by Claude Sonnet; a reading entered only where the page's own text bears its numbers out, a second blind reader agrees, or the importer's reader agrees, and Claude Opus decided every class of correction. A product's own sheet that prints a setting no profile holds is now a finding. | In force; it extends D97 (a value is bound to its evidence line), D115 and D116 (context the page states), D119 and D120 (the reader as the guard) and D123 (a registered sheet read in full is not an import) |
| D126 | No number shown contradicts what its own product's measurements prove | An estimate could sit below a strength the same product had measured: 46 materials and 343 products showed an ultimate-strength estimate under their own published break or yield stress, and LCP's HDT at 0.45 MPa was estimated under its own published HDT at 1.8 MPa. The orders physics sets between properties are now a table (`physical_relations.csv`), the lint reads it, every estimate is floored by what its own product's measurements prove, a material's range contains every product's floor, a product's strength taken from yield or break is the larger of the same test's two, and the build refuses a number shown that breaks an order. | In force; it replaces D78's material floor ("held at the highest own printed limit") with containment, and extends D55 (a value physics rules out is kept and flagged) and D84 (what a printed or unstated bar may decide) |
| D127 | Drying is recorded as a sheet states it, and the printer maker's guide fills a silent product's drying | A sheet's drying line was read as a published schedule whatever it said, so "not necessary", "Optional" and "only if the material has absorbed moisture" counted as a product that must be dried, and "6+ hours" lost its open end. Each print profile now says whether drying is required, optional or not needed, and whether its duration has an upper end. Bambu Lab's guide, which already answers a silent product's nozzle, bed and chamber, now answers its drying too, labelled as the guide's. A product that holds a profile of its own no longer reads its twin's statement about wearing a brass nozzle. | In force; it amends D88 (the guide now answers drying) and D89 (a twin's hardened-nozzle statement reaches only a product with no profile of its own) |
| D128 | A page statement can head one table | A heading or footnote recorded once for a page reached every value of its class on that page, so a footnote under the mechanical table also spoke for the physical table beside it. A page statement can now name the table it heads, matched against the values' locators, and a statement that heads one table outranks one that heads the page. | In force; it extends D116 (context the page states) |
| D129 | What the round's blind draw named: a dry box is not drying, a guide speaks for its type only, a nozzle line can answer | A blind check of 40 of the round's records, and of 22 print answers it moved, found errors in families. A dry box's "No" or "not necessary" was held as the product's drying, so 130 profiles read "drying not needed" (and 34 "required") from a sentence about where the spool is kept. Bambu Lab's PLA guide answered for metal-filled and matte PLAs it does not describe, telling a bronze-filled PLA that a brass nozzle will do. A sheet's "has not been annealed" read as annealed. Sheets that say a hardened nozzle is needed on their nozzle line, or that drying is needed only if the filament is wet, were held without it. Each family was looked for everywhere and fixed. | In force; it amends D88 (which products a guide row answers for), D120 (a dry box is a note, now everywhere) and D127 (what the drying parser reads) |

<!-- end index -->

---

## D1. Excel is the authoring format; JSON is the runtime (authoring superseded by D45)

> **In plain words:** The page reads JSON that only the build produces; data is no longer written in Excel.
> **Status:** the authoring half superseded by D45 (CSV tables); the JSON runtime stands.

A browser can parse XLSX, but doing so couples the interface to workbook layout, pushes validation
failures into the user's session, and makes output non-deterministic. The workbook is never written
by anything here.

Since 2026-09-14 the authoring format is CSV tables under a declared schema (D45). The second half
stands: JSON is the runtime, and the build is the only thing that produces it.

## D2. Headline values are verified, never recomputed

> **In plain words:** A number shown for a product is always a recorded measurement, read from its record, never retyped or recomputed.
> **Status:** amended by D47 (the value is read from the measurement, not typed twice) and D83 (a product's value is chosen by rule, and a material shows its products' spread).

The Materials sheet already cites the MeasurementID behind each headline. The build checks the
number equals its citation rather than deriving a headline itself. All 361 reconcile. A price
headline must also cite only the observations its median was built from.

This converts a class of judgement calls into build errors. Corrupting one density cell produces a
named error and no output.

Amended by D47: the number is no longer typed twice. `headlines.csv` selects the measurement and the
value is read from it, so there is nothing left to reconcile; the build checks the selection instead.

*Amended by D83 (2026-09-25):* a product's value is chosen by rule from its own measurements, and a selection in
`headlines.csv` pins it. The value is still a measurement, never recomputed; a material's median and quartiles are
statistics of its products, labelled as such, and never shown as a measurement.

## D3. Missing data is four states, never zero

> **In plain words:** Not published, not enough comparable data, not applicable and quarantined are four different answers, and none of them is ever shown as zero.

Not published, insufficient comparable data, not applicable, quarantined. They mean different things
and are different engineering answers. A tool that renders them all as blank invites the reader to
assume the value is low.

## D4. INDETERMINATE is not UNKNOWN

> **In plain words:** "Nobody has measured it" (unknown) and "the evidence straddles your limit" (indeterminate) are different answers and stay apart.

UNKNOWN means no comparable evidence exists. INDETERMINATE means evidence exists and the threshold
cuts through it. Collapsing them would turn "the source cannot settle this" into "nobody has
measured this", which sends the reader looking for the wrong thing.

## D5. Evidence outranks silence in gate aggregation

> **In plain words:** When one print profile states a temperature the H2C cannot reach and another says nothing, the stated one decides.

A material's process gate aggregates across its profiles with precedence
`within > partial > exceeds-recommended > exceeds > unknown`. `partial` exists for the chamber only
(D32).

PEEK publishes two profiles demanding 390–430 and 400–480 °C against the printer's 350 °C, plus one
that publishes nothing. Letting the silent profile decide reported PEEK as "unknown" and discarded
real evidence. With the precedence corrected, all six excluded materials trip the envelope gate on
their own published requirements, independently agreeing with the workbook's own `Scope` column.
PPS-GF still reports "within", because one of its grades genuinely fits.

*Counted again on 2026-09-27:* the six were the excluded materials of the 2026-09-13 snapshot. Seventeen are out of
scope now ([counts.md](../build/snapshot/counts.md)), and nine of them trip the gate on their own published
requirements. Five industrial high-temperature materials publish no print window at all, and the sintering filaments'
sheets print within the H2C's limits (D87). Scope, not the gate, is what excludes each.

## D6. A recommendation is not a requirement

> **In plain words:** A maker's "recommended if possible" setting above what the H2C gives warns, and never rules a material out.

"Recommended 70-140C if possible" exceeds the 65 °C chamber but does not make the material
unprintable. Treating it as a hard requirement would wrongly exclude printable materials; ignoring
it would hide a real caveat. It returns `exceeds-recommended`, which warns without excluding.

## D7. Only gates that can discriminate become filters

> **In plain words:** A printing field that almost every source leaves as "verify the exact grade" is shown as evidence, not offered as a filter.

Section 8.2A of the brief lists eleven process gates and says they should come first. The Print setup
sheet does not support that: routing and AMS read "verify the exact grade" on 140 of 167 profiles,
enclosure is unpublished on 148, difficulty on all 167.

Five gates ship: scope, H2C status, the three parsed temperatures against the baseline, plus
abrasion and drying. The rest appear as evidence in a material's Printing tab. A filter that passes
everything is worse than no filter, because it teaches the reader to trust a check that checked
nothing.

## D8. Related evidence reports one measurement, never a cross-grade range (its refusal of a range superseded by D83)

> **In plain words:** Values of different products were never to be merged into one range, because it would read as one material's uncertainty.
> **Status:** its refusal of a range superseded by D83, where a material is the labelled spread of its products.

PEBA's three grades measure 7.5, 25 and 30 MPa. "7.5 to 30" reads as one material's uncertainty
rather than three different products, and the Method sheet forbids cross-grade family ranges.

## D9. No cross-property fallback

> **In plain words:** A missing value is never filled with a different property: no Vicat or glass transition stands in for heat deflection.

An earlier version fell back to Vicat or glass transition where a material had no HDT. For TPE that
put a glass transition of −35 °C in a column headed "HDT at 0.45 MPa" — a different physical
quantity, and actively dangerous for anyone screening on heat resistance. Same-property only.

## D10. A family estimate may rule out, never rule in (superseded by D40, D42, then D43)

> **In plain words:** The first estimates could only rule a material out, never qualify it; the design was replaced by the calibrated model.
> **Status:** superseded by D40, D42, then D43; its rule that an estimate never passes a material lives on in D43.

The asymmetry is the whole design. Knowing every measured unreinforced PLA falls between 2.8 and
15.3% elongation is enough to say PLA Lite is not an elastomer. It is not enough to certify PLA Lite
clears a 5% floor, because the bound is drawn from its relatives.

Reversing this would let inference satisfy a requirement, which the brief forbids outright. Before
estimates, a search for elongation at least 100% returned 35 materials including PLA Lite and the
nylons; it now returns 14, of which 8 are genuine elastomers and 6 are supports that honestly have
no peers.

## D11. Estimates never pool across behaviour classes (narrowed by D40, D42 and D43)

> **In plain words:** Elastomers, supports and rigid plastics are never pooled when estimating.
> **Status:** narrowed by D40, D42 and D43.

"All unreinforced materials" spanned TPU at 0.0053 GPa and PLA at 2.88 GPa. Three orders of
magnitude rules nothing out and implies a support material might be as stiff as a structural one.
Elastomers, supports and rigid thermoplastics are separate populations.

## D12. Peers sharing a formulation key count once

> **In plain words:** Several products described by one data sheet count as one piece of evidence, not several.

PA, PA6/66 and CoPA all draw their headline from a single PolyMide datasheet. Counting them as three
peers produced an "estimate" of 2.223 to 2.223 GPa: a precise value dressed as a range, claiming
three corroborations where there is one. The Method sheet states the rule directly.

*Since D44 (2026-09-13), PA and CoPA are family entries that own no product, and the PolyMide CoPA sheet is a product
of PA6/66 alone.*

## D13. The reference layer is separate and off by default

> **In plain words:** The generic reference materials (steels, woods, moulded plastics) are drawn on the chart only when asked for, and are never candidates.

114 generic materials compile to their own file and never enter the candidate set, counts, Pareto
fronts, search or exports. They are bulk and molded values while the candidates are printed and
anisotropic, which is exactly the silent condition-mixing guardrail 4 forbids. On by explicit choice,
with a banner.

## D14. The engine never imports from the interface

> **In plain words:** The decision logic does not depend on the page, so it can be tested without a browser.

It is what makes the decision logic testable without a browser, and it is enforceable by inspection.

## D15. Tabulator was dropped; Plotly kept

> **In plain words:** The results table is hand-built and the charts use Plotly, except the parallel-lines chart, drawn in SVG.

The brief names both. At 102 rows a data grid's virtues do not apply, every cell needs custom
rendering for the provenance typography, and sorting plus export came to about a hundred lines. That
removed 430 KB and a dependency.

Plotly earns its size on log axes, error bars, shapes and lasso. Its parallel-coordinates trace does
not: it needs WebGL, which fails outright on many machines, so that lens is hand-drawn in SVG.

## D16. The data is embedded gzipped

> **In plain words:** The single HTML page carries its data compressed and unpacks it when it opens.

Raw `db.json` is about 3 MB, almost all repeated condition strings; gzipped it is under 200 KB,
inflated at boot with `DecompressionStream`. No schema change, no interning, and the plotting
library rather than the data becomes what the file weighs.

*Measured again on 2026-09-27, after the V2 import:* `db.json` is 24 MB, 1.6 MB gzipped, and 2.2 MB of a 6.8 MB page as
base64. The plotting library is still the larger part.


## D17. One vocabulary module, and no second way to name anything

> **In plain words:** Every property and requirement takes its on-screen name from one place, so nothing is called two different things.

`app/js/ui/labels.js` owns what every property and every criterion is called. Before it, three code
paths described the same property three ways: the drawer said "Stiffness", the table said "Tensile
modulus XY", and the explain panel printed `hdt045 >= 100` because it formatted the raw constraint
object itself.

The leak is the point. A second describe function does not look wrong when you write it; it looks
wrong three screens away, months later, to a reader who now doubts the number next to it. Anything
that names a constraint calls `describeConstraint`, and a new constraint kind without a case there
puts its internal key on screen.

Reversing this reintroduces the class of bug rather than any one instance of it.

## D18. The familiar baseline is a reference, never a candidate

> **In plain words:** A familiar material you pick for comparison is drawn beside the results and never counted as one of them.

4.43 GPa means nothing to someone who has only printed PLA. PLA, PETG, ABS, ASA and PC can each be
set as an anchor, drawn as a row in the table, a labelled cross on the chart and a grey bar in
Compare.

It is off until chosen, and while it is on it is excluded from the counts, the Pareto front, the
shortlist and the exports. Putting it in the results would mean the filters returned a material
nobody asked for, which is exactly the trust problem the rest of this document is about. It shares
that treatment with the generic reference layer (D13) and nothing else: the baseline is real data
out of `db.json` with its own citations, while the reference layer is uncited bulk values.

## D19. No sampled offer is UNKNOWN, not FAIL

> **In plain words:** A material no sampled shop listed is unknown for "can I buy it"; only one listed and out of stock fails.
> **Status:** in force; narrowed by D98 (a product is judged on its own offers, never another product's) and D113 (a foreign listing prices a product and is never an offer here).

The availability criterion answers "only show me what I can buy". A material that no sampled
retailer listed reports UNKNOWN; one that was listed and out of stock reports FAIL.

The asymmetry is the same one that governs estimates. Three Canadian retailers on a single day is
evidence that something *is* purchasable when it appears, and no evidence at all when it does not.
Failing the unsampled ones would assert a market fact the snapshot cannot support, and would do it
in the one part of the tool a user is most likely to act on immediately.

Practically this changes little: in Strict mode both are removed, which is what was asked for. In
Explore the unsampled ones stay visible and flagged, which is the honest reading.

## D20. Category names are authored with the rules that create them

> **In plain words:** Environment category names are written in the data beside the rules that define them, not assembled by the page.

Environment category display names live in `build/mappings/environment-topics.json` (since m09, `schema/vocab/environment-categories.csv`), next to the
topic patterns, and compile into the snapshot in two forms: a heading ("Acid resistance") and a
sentence noun ("acids").

The app previously built a name by appending "resistance" to the internal key, which produced "water
solubility resistance". The obvious fix is a lookup table in the interface, and it is the wrong one:
the engine also names categories in its reason strings, and the engine may not import from `ui/`
(D14). Authoring the name where the category is defined gives both one source and keeps the layer
rule intact.

## D21. One control for how much evidence the chart draws

*Amended by D107 (2026-09-29): the choice became two work views (Decision products, Material overview) and three evidence
views (Catalogue, Test pairs matched, Test pairs mixed), the last three under the chart's More. D108 renamed the work views
Products and Material ranges; D110 put the catalogue, as Material typicals, in the Draw row beside them, and left the two
test-pair views under More.*

> **In plain words:** The chart's two overlapping evidence switches became one three-way choice.
> **Status:** Amended by D107 (work and evidence views), D108 (the work views renamed) and D110 (Material typicals in the Draw row, the test pairs under More).

The Ashby lens had two switches, "Points" (headline against measurements) and "Comparability"
(strict against broad). That reads as four combinations and is three: comparability can do nothing
in headline mode, because a headline is a single fixed value with no measurement conditions left to
match. The two duplicate combinations gave no sign they were duplicates.

Worse, its "Strict" meant measurement conditions while the top bar's "Strict" means missing data,
two unrelated ideas under one word on one screen.

They are now one ordered choice of three, each with a line saying what it does. Nothing was removed:
every state the old pair could reach is still reachable.


## D22. Search matches words, never substrings

> **In plain words:** Search matches the start of words, so "PLA" does not find thermoplastic polyurethane.

A bare substring test for "PLA" matches "Thermoplastic Polyurethane". Searching for the most common
filament on earth returned every TPU and TPE in the database, and nothing about the result looked
wrong: it looked like the tool believed TPU was a kind of PLA.

Each field is split into words and a query term has to begin one. Every search a person actually
types still works — "pa6" finds PA6-CF, "cf" finds the carbon-filled grades, "95" finds TPU 95A,
"support" finds the support materials via their family — and "PLA" can no longer surface a material
because the letters sit inside a longer word.

Slashes are separators, so "Support for PLA/PETG" answers to either name, which is right: it is
genuinely about both.

## D23. An estimate is drawn as a range, never as a point

> **In plain words:** An estimated value is drawn as a range, never as a dot, and never joins the Pareto front.

The chart plotted only measured headlines, so on density against stiffness 25 of the 96 in-scope
materials simply were not there. The table two tabs away listed them with their estimated span, and
in Explore an estimate can screen a material out of a filter (D43), so a reader could see a material
screened by an estimate and find no trace of that estimate on the chart.

They are drawn as a lightly outlined range. Not a dot: a dot needs a value, and the centre of an estimate
is a number nobody measured, which is the one thing this tool refuses to put on a chart. Where the
other axis is measured the range collapses to a thin capped line; when both axes are estimated it is
an almost transparent outlined box. Its outline follows the material family's colour, and measured
points render above it. Each range remains in ordinary data coordinates, so Plotly applies linear
and logarithmic scales consistently.

The layer is off by default because 25 overlapping boxes are less readable than none, but the count
is in the footer whether the layer is on or off. That is the part that matters: the reader is never
left to infer that a quarter of the set does not exist.

Estimated materials never join the Pareto front and never count as plotted candidates. Inference
cannot dominate evidence.

## D24. A relaxed condition and an unstated fact are different things

> **In plain words:** A chart point is marked doubtful only when strict mode would have rejected it, not whenever a source left a detail unstated.

The measurement plot marked a point hollow, and announced "mixed conditions are included here",
whenever a measurement carried any remark at all. One of those remarks is that the source did not
name the specimen form, which on an axis with no direction requirement — density — is the ordinary
case and not a mismatch with anything.

So strict mode, whose whole purpose is to admit nothing questionable, displayed a warning that it
had mixed conditions and drew perfectly comparable points as if they were suspect.

`measurementMatches` now returns `relaxed` separately from `notes`. Only a relaxation, something
strict would have rejected, makes a point hollow or reaches the banner. The rest is context on
hover. A warning that fires when nothing is wrong is worse than no warning, because it teaches the
reader to ignore the one that matters.

## D25. In the measurement plot, a dot is a test and must say so

> **In plain words:** In the measurement view a dot is one test, and one material's dots are linked so they read as one material.

The mode draws one point per grade per measurement, which is the evidence behind the headline and
the only place anisotropy is visible. It was also unreadable: a field of anonymous dots, each
labelled with its own grade and direction until the labels covered the data, and no way to tell six
measurements of one material from six different materials.

Three changes, no loss of information. The dots of one material are joined by a faint line, so a
cluster reads as one thing measured repeatedly. The name goes on the leftmost dot of each material
rather than on every dot, with grade and direction on hover. And the footer leads with the sentence
the mode cannot work without: a dot is not a material.

The footer first said each dot was "one test result". It is a pair of measurements of one grade under
compatible conditions, which the source rarely ties to a single specimen, so the sentence now says
that. The index card counts materials, not dots, for the same reason.

## D26. The verdict describes the evidence; the policy decides eligibility

> **In plain words:** A requirement nobody could check is unknown in every mode; the mode only decides whether unknowns are shown.

A material whose requirement cannot be checked is UNKNOWN in both modes. Strict holds it out of the
results and Explore keeps it flagged, but neither changes what the verdict says.

Strict used to turn "could not be checked" into FAIL. The FAIL count then mixed materials that failed
a test with materials nobody had measured, the excluded list and the export said "does not work" for
both, and the four-state vocabulary the rest of this document defends collapsed into three at the
one level a user reads. Reversing this makes a missing measurement look like a bad material again.

## D27. The nozzle question asks what the user lacks

> **In plain words:** The hardened-nozzle filter asks "I don't have one", so owning more hardware can never remove materials.
> **Status:** In force; extended by D121 (a fibre-filled product with no nozzle guidance is unresolved for aramid and plant fibre as for carbon and glass, and the reason says it is the database's rule).

"I have a hardened nozzle" removed materials: 75 have no abrasion guidance, and Strict held them all
out. More hardware can never make fewer materials printable. The criterion is now "I don't have a
hardened nozzle". It fails a recorded requirement, holds a fibre-filled material with no guidance as
UNKNOWN because the filler is the known cause, and passes the rest with a reason saying no
requirement was recorded. A `hardenedAvailable: true` constraint from an old link passes everything.

This is a deliberate exception to "absence is not evidence", made visible in its wording: the
criterion screens on a recorded requirement, and the rail says a missing record is not proof a
filament is safe for brass. Treating every unrecorded material as UNKNOWN would leave Strict with no
material at all, because no source in the snapshot states "no special nozzle concern".

*Counted again on 2026-09-27:* sources say it now, 110 print profiles and 5 rows of Bambu Lab's guide (Hardened nozzle
`FALSE`), and the criterion still screens only on a recorded requirement.

## D28. Limited resistance is not resistance

> **In plain words:** A chemical-resistance requirement passes only on a plain "resistant" record, not on "limited".

An environment criterion passes only on an unqualified positive record: "resistant", or "insoluble"
for water. "Limited" is INDETERMINATE on its own and alongside a positive record. The rail used to
request `['resistant', 'limited']`, which passed PLA on a solvent screen because one record said its
resistance was limited; and "insoluble" was never accepted, so the water criterion could not pass at
all. Old links carrying the `require` override have it removed on load.

A pass still means resistance to the exposures a source tested, not to every chemical in the class,
and the reason says so. Choosing the exact agent first needs data most records do not carry.

## D29. A template names what it cannot check

> **In plain words:** Each ready-made scenario lists what it does not check, and promises nothing it does not test.
> **Status:** in force; extended by D101 (every template also asks the H2C's print gates; without them the page is in research mode, and says so).

Each template carries `notChecked`, shown beside the result count, and screens out support
materials. The descriptions used to promise outcomes no criterion tested: "survives a hot day in the
sun", "springs back", "prints without a heated chamber". The last was simply false, since the chamber
gate compares against the H2C's own actively heated 65 °C. The indoor template also dropped its
chamber gate, which tested nothing about ease of printing and held out PLA Basic for not publishing
a chamber temperature.

## D30. The snapshot date comes from the workbook (now `data/tables/method.csv`)

> **In plain words:** The data's date is read from the Method table, not written in code; prices keep their own sampling date.
> **Status:** in force; narrowed by D96 (the date is for a reader; a release ID over what decides identifies a page, a scenario and an export).

The build used to carry the snapshot date as a constant. The 2026-09-13 manufacturer audit moved the
Method sheet to a new snapshot, and every filename, "data" label and export would have kept naming
the old one. The date is now read from the Method sheet's Scope / Snapshot row, and the build stops
if that row does not start with a date.

Prices keep their own date. The audit re-sampled no prices, so "sampled 2026-09-10" beside a price
is true and "2026-09-13" would not be. `meta.pricesSampled` carries it.

## D31. A quarantined observation backs nothing

> **In plain words:** A record marked doubtful, such as a price listing for the wrong product, is kept for the record and backs nothing.
> **Status:** in force; amended by D47 (a price median is computed from its sample, so no stored citation is left to check) and m32 (quarantine is a typed column).

The workbook marks a wrong-product price listing by starting its price basis with "Quarantined" and
clearing its CAD/kg. The build keeps the row, so the audit trail survives, and excludes it from the
buy link and from the evidence that a material is in stock. The Price tab shows it struck through.

A price headline must cite only observations in its headline sample. When CA0069 was quarantined the
ABS median moved to 25.99, but the Materials row still cited CA0069 and still said "2 observations",
and the build did not notice because it checked only the value. It checks the citation now.

*Amended by D47 (2026-09-14) and m32 (2026-09-15):* a listing is quarantined by `prices.csv` Quarantined `TRUE`,
with the reason in its Regular price basis, not by the basis's first word, and the price median is computed from the
observations in its Headline sample, so no stored citation is left to go stale.

## D32. A chamber window the printer only partly reaches is partial, and only the chamber has one

> **In plain words:** A chamber window that starts below the H2C's 65 °C and ends above it is partial, not a failure; nozzle and bed are read by their upper end.

A process window was read by its upper end, because the question is whether a material needs more
than the printer gives. For a chamber that failed materials whose own window starts below 65 °C:
ABS-CF publishes 50–70 °C, 50–65 °C of it is reachable, and it failed the chamber criterion outright.
Bambu PPS-CF publishes 60–90 °C and would have failed the same way once its window was recovered.

Such a window is now `partial`, which the engine reports as INDETERMINATE. It is not `within`: most of
the window is out of reach, and Bambu says the upper part improves Z strength. It is not a failure
either, because a setting inside the manufacturer's own window is available.

Nozzle and bed keep the upper-end rule. There the bottom of a window sits at the hardware's rated
maximum, 350 °C or 120 °C, which is not a margin anyone should run at by default, and the six
out-of-scope materials trip the gate on exactly those rows: PEKK's nozzle is 345–375 °C, PSU's
350–380 °C. Applying `partial` everywhere would turn three of those exclusions into caveats.

*The six are the out-of-scope materials of 2026-09-13; D5's note says how the seventeen of 2026-09-27 stand.*

## D33. "Enclosure not needed" clears the chamber; "enclosure recommended" does not

> **In plain words:** A sheet saying no enclosure is needed settles the chamber question; one recommending an enclosure does not.
> **Status:** amended by D90 and D93: for the nine types Bambu Lab's Filament Guide asks an enclosure for, an enclosure asked for with no temperature, by the guide or by the maker's own sheet, reads as within the H2C's chamber; for every other type the reverse inference is still not made.

Five Spectrum data sheets answer the chamber question only in their enclosure row. A material that
does not need to be enclosed does not need a heated chamber, so "not necessary" clears the chamber
gate, and the Printing tab says the answer was read from the enclosure row.

The reverse inference is not made. An enclosure being recommended says nothing about whether 65 °C is
enough, and an enclosure is not an actively heated chamber, so it leaves the chamber unknown. The same
goes for "Recommended" with no number in the chamber row, and for a data sheet that prints "-", which
is its own state: not zero, and not "not required".

*Amended by D90 (2026-09-26) and D93 (2026-09-27):* for the nine types Bambu Lab's Filament Guide asks an enclosure for
(ABS, ABS-GF, ASA, PC, PAHT-CF, PA6-CF, PA6-GF, PPA-CF, PPS-CF), the owner ruled that the H2C's heated, enclosed chamber
is that enclosure. A product of those types whose own sheet is silent reads the guide's tick as within (D90), and one
whose own sheet asks for an enclosure and states no temperature reads the same, in its maker's words (D93). A
temperature a sheet states still decides, and for every other type the reverse inference is still not made.

## D34. An estimated chamber band decides nothing

> **In plain words:** Researched guesses of a chamber temperature are shown, marked, and never pass or exclude a material.

The 2026-09-13 research proposed chamber bands for materials that publish no chamber temperature.
They are kept, in `build/mappings/chamber-estimates.json` (since m09, `data/tables/chamber_bands.csv`), and shown marked †, but unlike a property
estimate (D43) a band cannot even screen a material out.

A property estimate is built from verified measurements of the same property. A chamber band is a
researcher's judgement of a plausible setpoint, and a setpoint is at most a recommendation, which
never removes a candidate (D6). The evidence agrees: of the bands that met a real value, Support for
PA/PET publishes 45–60 °C against a band of 20–45, and PPA-CF 50–80 °C against 80–120. A band that
excluded PPA-CF would have excluded a material whose own data sheet says it partly fits.

A band is attached only where no source publishes a window and none says no heated chamber is needed.
The superseded bands are listed in the validation report, so a reader can see which inferences the
evidence has already overtaken.

## D35. A research report is re-read against its sources, never transcribed

> **In plain words:** Every value is entered from its original document, re-read and hash-checked, never copied from a report or a summary.

The 2026-09-13 research was careful, and still wrong in four places that mattered: it said the Bambu
PPA-CF data sheet had no chamber range (it has 50–80 °C), that PET-GF15 recommends a chamber (its data
sheet says room temperature), that PLA-Lite's HDT was at 0.45 MPa (no load is stated), and it did not
mention that the PET-GF15 mechanical specimens were annealed. It also missed that the three chamber
windows it recovered were three of fourteen, all dropped at the same page break.

So nothing enters the workbook from a report. Each value is re-read from its source, each fetched
file's SHA-256 is recorded, and a source that cannot be retrieved contributes nothing, however
plausible the value attributed to it. The edit is a script with a changelog, and it refuses to run on
any workbook but the one it was written against.

Since D45 the same rule holds for the tables. A scripted edit goes through `scripts/data/table-io.mjs`
and states the value it expects to replace, so it refuses to run on data that has moved;
`npm run data:diff` produces the record-level changelog from the commit itself.

## D36. Referential integrity includes ownership, not just existence

> **In plain words:** The build checks that every record belongs to the material it is filed under, not merely that its identifiers exist.

A `MaterialID`, `GradeID` and `SourceID` can each exist and still describe the wrong relationship.
A measurement filed under PC FR while naming a PLA grade passes three ordinary foreign-key checks
and then puts PLA data on a PC screen.

The validator therefore checks every measurement, profile, price and use record against the
material that owns its grade. It also checks every cited record belongs to the material presenting
it. Mutation tests deliberately create valid-but-wrong relationships and require named errors.

## D37. A headline belongs to the representative grade; study grades are not procurement grades

> **In plain words:** A material's numbers must not mix products, and a research-only grade is never a buyable product.
> **Status:** amended by D83: the representative grade retired and each product is judged on its own values; the rule on research grades stands.

The Materials row is a labelled single-grade observation. If density comes from one grade and
strength from another, the row looks like a property set for a formulation that does not exist.
Every measured headline must therefore cite the representative grade.

`GradeIDs` lists commercial grades that can be selected or procured. Supplemental research grades
carry an `-R#` suffix and stay outside it. PA12's fatigue study grade is useful context, but it does
not make a PA12 product available and cannot become the representative grade.

*Amended by D83 (2026-09-25):* the concern stands and is now met by judging each product on every requirement at once:
no verdict rests on density from one product and strength from another. A material's row shows the spread of its
products, labelled as such, beside how many of them pass. In phase 4 (m137) the representative grade itself retired;
the second half stands: a study or reference grade is no procurement product, and no material's value comes from it.

## D38. Environmental evidence is owned by the material; family evidence stays context

> **In plain words:** A chemical or moisture requirement is judged on the material's own records, never on notes written for a related material.
> **Status:** in force; extended by D64 (where a material has no record of its own in a category, a resin reference for its base polymer is shown, labelled polymer-level, and may screen but never pass); narrowed by D98 (a product is judged on its own records, or its twin's; the material's other records are context).

The Environmental evidence column had become a copy of family application notes for 31 materials.
That made PC FR look chemically evidenced by records written for another polycarbonate material,
while other materials omitted records from their own data sheets.

Environmental evidence now means exactly the material's own exposure, solubility and moisture
records. Use, durability and safety may still cite explicitly labelled family context, because those
fields are narrative and the relationship is visible. Family context cannot settle a grade-level
environment criterion.

## D39. Coverage is terminal, but it must agree with the records

> **In plain words:** The findings on what data a material has never change a result, but the build stops if they contradict the records.
> **Status:** in force; extended by D74 (a finding that only restates the records is derived).

Coverage never feeds selection, so an inconsistency cannot change the candidate list. It can still
send the next researcher in the wrong direction: PC-GF said Print setup was a gap beside two
profiles, while several environmental rows claimed evidence that belonged only to their family.

`coverage-rules.js` defines “own data” once for mechanical, thermal, print, environmental and price
domains. The audit planner and validator both use it. A `Gap` beside data, an evidence claim without
own records, or an incorrect procurement-manufacturer count now stops the build.

## D40. Peer observations are context, not exclusion bounds (superseded by D42, then D43)

> **In plain words:** For a short time, estimates drawn from similar materials were allowed to decide nothing at all.
> **Status:** superseded by D42, then D43.

The systematic data audit found OBC borrowing PP and reinforced PP mechanical spans, flexible
families pooling TPU with PEBA/TPC, and HDT estimates borrowing unstated loads. Even within a
correct family, the observed extremes of a small sample do not bound an unmeasured formulation.
Peer estimates now require the same base polymer and modifier, preserve intervals, and never
determine eligibility. This supersedes D10 and the exclusion claims in historical audits.

## D41. Raw values, endpoints and archived identities are enforced

> **In plain words:** The build stops when a raw value, its unit and its converted value disagree, and a retired product stays out of every active list.

Four decimal-comma values were truncated; two maximum-force strain observations were mislabelled
as break strain; a qualitative No Break result carried numeric status. Raw-to-normalized checks
now stop the build on these inconsistencies. Headline matches must agree in property and unit as
well as value and ownership. Explicitly retired grade mappings are archival, never active procurement.
Tests rebuild the inputs every time; the audit command independently checks the HTML payload.

See [systematic data audit](audits/2026-09-13-systematic-data/REPORT.md) for all findings, cell edits,
source checksums, before/after compiled changes, every filament and every family.


## D42. An estimate is a prediction interval from like-for-like evidence, and may only screen (superseded by D43)

> **In plain words:** The second estimate design: like-for-like evidence and 95% intervals, allowed to rule out and never to qualify.
> **Status:** superseded by D43.

Estimates failed twice, in opposite directions. The first model (D10, D11) pooled display families
and then whole filler classes, took the sample's minimum and maximum, and let that span fail a
material: OBC borrowed polypropylene's elongation, TPU pooled with PEBA, and a handful of peers'
extremes were treated as a bound. The second (D40) kept three same-polymer spans and let none decide
anything, which gave up the reason estimates exist: keeping a PLA out of an elastomer search.

The model now separates which evidence from how wide, and both from what an estimate may do.

**Which evidence.** A ladder, strongest first: the material's own other grades with the headline's
exact test semantics; then other materials of the same polymer identity and reinforcement class;
then a declared close-analogue group, reviewed like code in `build/mappings/estimate-model.json`.
Nothing pools a display family or a behaviour class. A prototype class envelope would have screened
CPE out of "elongation at least 100%" although its own data sheet reports 150%.

**How wide.** Every rung gives a 95% prediction interval for one more formulation, never a sample's
extremes. That includes the material's own other grades: a generic PLA grade at 46 MPa does not
bound the representative grade, and an early version of this model screened PLA out of "strength
at least 60 MPa" on exactly that basis. The spread is a documented, conservative between-formulation
prior, or a sample's own spread where wider (TPU's hardness grades are), on a log scale for
stiffness, strength and elongation. The spread actually seen across the snapshot is computed every
build, and the build fails if the median group exceeds the prior.

**What it may do.** Never pass: the verdict stays UNKNOWN, so the FAIL count stays evidence (D26).
In Explore with Estimates on, it may screen a material out, only when its whole interval fails the
requirement, only from the material's own grades or from peers with at least five independent
formulations, and never when any of the material's own measurements of that property, in any
direction or at any endpoint, could meet the requirement. A screened material is counted under
UNKNOWN, marked "screened", and brought back by the SCREENED chip. Strict never consults estimates.

Reversing any part reintroduces one of the three failures: pooling brings back OBC and TPU,
extremes as bounds bring back over-confident exclusions, and no screening brings back PLA Lite among
the elastomers. The user chose screening, the evidence rungs and the 95% level when this was designed.

## D43. An estimate is a calibrated model of every observation, and says how far to trust it

> **In plain words:** Missing values are estimated by one statistical model per property, checked against known values it had hidden, labelled with how far to trust them, and never allowed to pass a material.
> **Status:** amended by D48 (which estimates may rule a material out), D83 (a material is estimated only where none of its products publishes the value) and D87 (a family's maker-undisclosed home is not estimated; named so by D106).

D42 was honest and too wide to use: PA-CF strength 38–204 MPa beside its own 72 MPa break strength,
TPE elongation 73–4695%, and nothing at all for PA66, PA612 or POM. It had two blind spots. It used
only measurements with the headline's exact semantics, so the break strength, flexural modulus,
Z-direction value or glass transition most gaps already had counted for nothing. And it treated
each material alone, so estimates made no sense side by side: nothing tied PA66-CF to PA66, or PA66
to PA12.

**One model per headline.** A Gaussian model on the scale the property varies on (natural log for
density, stiffness, strength and elongation; °C for heat deflection) takes every observation in the
snapshot. A product's value is its polymer identity, pulled towards its chemical group, plus its
reinforcement by matrix (fibre lifts a semicrystalline bar's heat deflection towards its melting
point, an amorphous one's only a little past Tg), a declared variant, its test house, and for the
heat deflection of polymers that crystallise while printing, its melting point with a documented
positive slope; plus the material's and the product's own deviations.

**Every observation, converted.** A related measurement enters converted to the headline's semantics
with an offset and a spread: documented in `build/mappings/estimate-model.json`, refined by the
median and MAD of grades that publish both. A break strength converts tightly, a Z value loosely, a
moulded resin value very loosely. On each product only the most direct kinds are used, because
3DXTECH's flexural and break strengths disagree with Bambu's ratio and stacking both double-counted.
Hardness informs an elastomer's stiffness through Gent (1958) and Qi et al. (2003). Values outside a
physical range are rejected and reported; evidence that contradicts everything else is down-weighted
and reported.

**Spreads, measured where they can be.** The spread between two products of one material is measured
directly from materials with several products, by the median pairwise difference, so one test house
reporting on another basis does not set it for everyone. The remaining spreads are estimated from
the data (empirical Bayes) above documented floors. The melting-point slope's spread is fixed:
unfilled nylons are too few to learn it, and letting them reverse it put PA66 at 15–91 °C.

**Calibrated, and labelled.** Each measured headline is hidden in turn and predicted from everything
else. The likely range (80%, what the tool shows) and the plausible range (95%, what may screen) are
scaled until they hold the hidden value that often, and the build fails if they drift by more than
0.1 or 0.05. Melting point and glass transition cap heat deflection as soft limits, never a hard
truncation that would pile a range against the cap. Each estimate says what it rests on (this grade's
related measurements, the material's other grades, or the family model alone) and how precise it
is (good, fair, poor, per property). One product has one value: a representative product filed under
two materials, like CarbonX CF PA12 under PA-CF and PA12-CF, gets one estimate.

**Nothing left blank.** Every in-scope headline has a value, an estimate, or a reason it does not
apply: heat deflection of an elastomer (a rigid-bar test; Bambu lists it N/A) and any value of a
support product, unless its own sources publish one. The build fails otherwise. Where no source
characterises an identity, a resin supplier data sheet is recorded as a study grade to anchor it
(Zytel 101L for PA66, Zytel 151L for PA612, Delrin 100P for POM), never as a headline. Nozzle and bed
windows nobody publishes are estimated from same-polymer or same-group products, above the melting
point; like a chamber band, they decide nothing.

**What it may do.** (Which estimates may screen, and what vetoes a screen, are decided by D48.) Unchanged in principle from D42. Never pass. In Explore with Estimates on, screen a
material out only when the plausible range wholly fails, no own measurement could meet the
requirement, and the estimate rests on the material's own evidence or an identity measured on at
least two products. Not applicable screens the same way. Strict neither shows nor uses estimates.

Reversing any part brings back a failure seen in this snapshot: exact-semantics-only brings back
38–204 MPa; no shared structure lets PA66-CF sit below PA66; learned physics slopes reverse; no
calibration makes every width a guess; hard caps collapse ranges to a point.

*Amended by D83 (phase 4, m137, 2026-09-25) and D87 (2026-09-25):* a material is estimated only where none of its
products publishes a comparable value, and "nothing left blank" holds for the five headlines the model estimates
(density, stiffness, strength, elongation and heat deflection) on a material that names an Estimate identity
(HEADLINE-BLANK). The layer strength, the impact strengths and the glass transition are not estimated (D92, D94), and
a family's "polymer not stated" home is not estimated at all: what none of its products publishes is not published
(HEADLINE-UNESTIMATED, at info). Since D44 no product is filed under two materials, so the CarbonX case cannot arise.
The resin sheets that anchor PA66, PA612 and POM are grades of Role `reference` (m04), and no material's value comes
from one (D37).

## D44. Each product has one home; a family is an entry, not a material

> **In plain words:** Each product is recorded once, under the most specific material it is; a family name such as PA or TPE only leads to its members.

The canonical list mixes materials with families and aliases. PA, PA-CF, PA-GF and TPE name families;
CoPA names the copolymer the database calls PA6/66. Their rows had been filled with products that
belong to specific rows, so the tool showed one product as several candidates with identical
numbers: the same PolyMide CoPA data sheet under PA, PA6/66 and CoPA, and CarbonX CF PA12 as both
PA-CF's and PA12-CF's headline. Selection counted each copy, and the estimate model had to invent a
"shared product" rule to keep the copies from disagreeing.

A product is now recorded once, under the most specific material it is. A family or an alias has
Scope `Family entry`, owns nothing, carries no value and is never a candidate; it stays in the list
because its name is how people search (Bambu lists PA, PA-CF and PA-GF as H2C families), and search
answers with its members. Duplicates are retired, never deleted, after the script proves each record
has an identical twin, so the data keeps its audit trail and nothing is lost.

Reversing it brings back double counting, which is worse than a gap because it looks like evidence
agreeing with itself. See [the duplicate-products audit](audits/2026-09-13-duplicate-products/REPORT.md).

## D45. The source of truth is CSV tables under a declared schema

> **In plain words:** All data is edited in CSV tables checked against a declared schema; the Excel workbooks were retired.
> **Status:** in force; narrowed by D72 (the pre-commit hook's refusal of a removed record admits one the build now derives, through the removal ledger), and its open question on SQLite answered by D75.

The workbook had become hard to govern, not too big. Git saw each audited change as a binary blob, so
a 25-cell correction needed a 70,000-line evidence package to be reviewable. Relationships were
semicolon lists inside cells, headline values were typed twice, formula ranges stopped at row 1809
while data ran to 2052, 139 formula caches were stale, and every appended row needed an XML patch
script and a hand edit to an expected row count.

The records now live in `data/tables/*.csv`, one table per entity, and `schema/tables/` declares every
column: type, role, required values, the missing states it accepts, patterns, vocabularies and
references, including identifiers inside lists and prose. `build/src/schema.js` checks all of it before
compile in about 200 ms and names the file, line, record and field. Files are kept in one canonical
form, so a diff shows only what changed, and `data/manifest.json` makes every row-count change
visible in its commit. `npm run verify` is the one gate for people, agents, the pre-commit hook and CI.

*Corrected on 2026-09-27:* the pre-commit hook never ran `verify`. It runs the data gate alone, when a commit touches
`data/` or `schema/`: canonical form, the schema and its references, and no removed record (the rule D72 narrows).
`npm run verify` is the gate before a commit and in CI, and since 2026-09-15 `npm run verify:fast` is the tier for
work in progress.

No database sits in the build path. SQLite was the assessment's recommendation; for one person and
two agents editing a few thousand rows, a schema over text files gives the same integrity checks
without a second representation to keep in step. The same schema can generate one later if concurrent
editing is ever needed. Excel remains a generated, read-only review view (`npm run data:export-xlsx`)
with no import path, so there is still exactly one place data is changed.

The conversion was proven, not assumed: the first CSV build reproduced the workbook build byte for byte,
and every later step either left the compiled database unchanged or listed each difference with its
reason. The replay, and the workbook reader it used, are in `archive/workbook-conversion/`; they stopped running when the workbooks were deleted with the cutover. See
[the migration record](audits/2026-09-14-csv-source-migration/REPORT.md).

Reversing it brings back unreviewable changes and errors found only at build time, by a message that
names a sheet row rather than a field.

## D46. A property is a registry row, and may apply to some filaments only

> **In plain words:** What each property means, its units and which filaments it applies to are rows in a table, so adding one needs no code.
> **Status:** in force; amended by D83, D92 and D94: a new selectable headline is a row alone, each product's value is chosen by rule, and what a value must be (direction, load, notch, test temperature, standard) is a column of the row.

A property's meaning was hardcoded in about a dozen places across the build and the app, differently:
the drawer's Mechanical tab and the coverage rules disagreed about five properties, and the Overview
told users elongation "high means tough" while the filter rail said it is not toughness. Adding one
property meant 12 to 16 coordinated edits.

`data/tables/properties.csv` and `data/tables/headline_definitions.csv` now say what every property and
headline means, and the build and the interface derive their lists from them. A new property is a row;
a new selectable headline is a row plus its selections. `test/new-property.test.js` adds an
elastomer-only Shore A hardness with data alone and follows it to every view.

*Amended by D83 (2026-09-25), D92 (2026-09-26) and D94 (2026-09-27):* a new selectable headline is a row alone.
Nothing selects its values: the build chooses each product's value by rule, and what a value must be is a column of
the row (its direction and what an unstated one is, its load, notch and test temperature, D92, and its standard, D94).

"Applies to" makes sparsity a statement. Outside it a property is not applicable, with a reason, not
missing: the drawer does not report it unmeasured, the filter rail counts availability only against
the materials it applies to, and a measurement recorded against any other material stops the build.

The estimate model stays in code, because conversions between properties are physics, not labels. A
registry row cannot switch estimation on for a headline the model does not know.

Reversing it brings back the drift: a label, unit or tab list that one screen changes and the next does
not.

## D47. What can be calculated is not stored

> **In plain words:** Anything the build can compute from the records (medians, per-kg prices, grade lists) is computed, never stored beside them.
> **Status:** in force; extended by D70 and D74, and amended by D83: a product's value is chosen by rule, and headlines.csv only pins one.

The workbook stored conclusions beside the evidence for them and then checked they agreed: headline
values beside their measurements, price medians beside their observations, per-kg prices beside list
price and mass, each material's grade list beside its grades, environmental evidence beside the
records it had to equal, and printing guidance beside the profile it quoted. Every pair was a place to
forget one half.

Each is now calculated from its evidence, and only the editorial choice is stored: which measurement a
headline shows, which observations a price sample holds, which records a material cites. A stored list
became derived only after a migration proved the derivation equal for every row. Where it was not equal,
the difference was kept as data, not smoothed over: four materials cite a thermal measurement that is
not their HDT value, so `headlines.csv` records them as context.

Two compiled values moved, and both are listed in the migration record. PAHT-CF's price is 124.49
(the median 124.485 rounded half up, where the typed 124.48 was a floating-point display). Two materials
list the same environmental records in table order rather than typed order.

*Amended by D83 (phase 4, m137, 2026-09-25):* which measurement a headline shows is no longer stored either. The build
chooses each product's value by rule, and `headlines.csv` holds a pin, with a reason, only where the rule chooses
wrongly; it holds none. The 477 selections and the 16 context rows, the four materials' among them, are archived in
`docs/audits/2026-09-25-re-center/retired-representative-picks.csv`.


## D48. Evidence screens only where a back-test shows it screens reliably

> **In plain words:** An estimate may rule a material out only where hiding known values shows that kind of estimate to be reliable.
> **Status:** amended by D55, D58 (the back-test moved to `build/src/estimate/`, and the implied bounds to headline_definitions.csv), D59 and D83.

D42 and D43 decided by rule which estimates may screen: the material's own evidence, or an identity
measured on at least two products. The rule was a judgement, and the leak sweep of the 2026-09-14
filtering audit showed its cost: 1,266 (material, requirement) pairs where a range that wholly failed
left the material in, because the rule forbade the screen; and 789 more where any raw related value of
the material, of any endpoint or direction, vetoed it. Neither was measured. The owner asked for the most
reliable method, over earlier rulings.

**A back-test, every build.** For every measured headline the build hides what an evidence class lacks
and predicts it with the production ranges and limits (`build/src/estimates.js`): this grade (the
headline hidden, the grade's other published kinds kept), this material (the whole grade hidden, other
grades kept), and the family model (everything of the material and its product hidden). A screen is wrong
only when the true value lies beyond the plausible range on the side the requirement tests, which a 95%
range allows 2.5% of the time per side. A class is **certified** when it has at least 20 held cases and
neither side misses significantly more often (exact one-sided binomial test at 5%). A calibrated class is
not revoked by sampling noise; a class whose ranges are too narrow is. The result travels in
`meta.estimateModel.properties.*.screening`.

**What screens.** A certified class screens on its plausible range. A class the back-test cannot certify
(too few held cases) screens only where the certified family model agrees: on the union of its range and
the family-only range with the material's own evidence hidden, which is never narrower than a certified
family screen. An estimate carries the range that decides (`screenRange`) and why (`screenBasis`).

**The unstated-load bracket is certified per matrix.** Read as a 1.8 MPa value, a heat deflection with no
stated load brackets the 0.45 MPa value up to the gap grades publishing both loads show. One Gaussian gap
for all matrices failed its back-test (4 of 54 true values above the top): the gap is a few degrees for
an amorphous bar and up to 120 °C for an unfilled semicrystalline one. Each matrix is certified on its
own pairs; today only amorphous (38 pairs) screens, which keeps PLA Lite's case (D43's regression).

**Vetoes are implied bounds.** A measurement vetoes a screen only when it logically bounds the headline
from below and meets the requirement (`estimate-model.json impliedBounds`): ultimate strength is at least
the yield and break stress in any printed direction; strain at break is at least the strain at yield or at
maximum stress; heat deflection at 0.45 MPa is at least the value at 1.8 MPa. A bound never passes. Other
endpoints, flexural values and moulded resin values no longer veto: the estimate carries them through
documented conversions, and the back-test judges the result.

**Measured 2026-09-15** (held cases, true values above and below the plausible range, certified):

| Headline | Class | Held | Above | Below | Certified |
|---|---|---|---|---|---|
| density | this-grade | 0 | 0 | 0 | no (only 0 held cases (20 needed)) |
| density | this-material | 24 | 1 | 0 | yes |
| density | family | 84 | 4 | 1 | yes |
| tensileModulusXY | this-grade | 65 | 2 | 1 | yes |
| tensileModulusXY | this-material | 21 | 1 | 2 | yes |
| tensileModulusXY | family | 68 | 1 | 0 | yes |
| tensileStrengthXY | this-grade | 52 | 1 | 2 | yes |
| tensileStrengthXY | this-material | 10 | 0 | 0 | no (only 10 held cases (20 needed)) |
| tensileStrengthXY | family | 53 | 1 | 1 | yes |
| elongationXY | this-grade | 51 | 1 | 0 | yes |
| elongationXY | this-material | 24 | 2 | 2 | yes |
| elongationXY | family | 69 | 1 | 1 | yes |
| hdt045 | this-grade | 53 | 1 | 1 | yes |
| hdt045 | this-material | 18 | 1 | 1 | no (only 18 held cases (20 needed)) |
| hdt045 | family | 61 | 3 | 2 | yes |
| hdt045 bracket | amorphous | 38 | 2 | 1 | yes |
| hdt045 bracket | semi-unfilled | 3 | 0 | 0 | no (only 3 held cases (20 needed)) |
| hdt045 bracket | semi-filled | 12 | 2 | 0 | no (only 12 held cases (20 needed)) |
| hdt045 bracket | elastomer | 1 | 0 | 0 | no (only 1 held cases (20 needed)) |

The leak sweep that motivated this is a permanent test (`test/screening.test.js`): no material stays a
candidate for a requirement its defended range wholly fails, except by a verified implied bound; the
structural invariants hold; and the certification rule revokes ranges made too narrow. Estimates still
never pass, and Strict still neither shows nor uses them (D43).

*Amended by D55 (2026-09-15):* an implied bound comes only from a printed specimen at its published value, never
from a film, filament, moulded or unstated specimen, value + SD, an annealed twin or a conditioned elongation, and it
also limits the estimate's own range. The certification table above is the one measured on 2026-09-15; the build
records the current one in `meta.estimateModel.properties.*.screening`.

*Amended by D58 (2026-09-15):* the estimates became a stage of their own. The back-test is in
`build/src/estimate/screening.js` (`build/src/estimates.js` is gone), and which measurements imply a bound is
`headline_definitions.csv` Lower bound properties (m27), no longer `estimate-model.json impliedBounds`.

*Amended by D59 (2026-09-15):* a class is no longer certified by failing to disprove it. Each end of its screening
range is a distribution-free tolerance limit of honest hold-outs (at most 10% beyond it, with 90% confidence; 22 cases
at least), an end the material's own evidence lies beyond never screens, and the unstated-load bracket's top is set
the same way.

*Amended by D83 (phase 4, 2026-09-25):* the unstated-load bracket is gone. A heat deflection whose load the sheet
leaves unstated is its product's value only as published (D84), and no material headline is in that state.

## D49. The values the build decides on are typed columns; raw text stays, and the parsers check it

> **In plain words:** Decisions read typed columns; the source's own words stay beside them, and the build stops if the two disagree.

The build read decisions out of free text on every run: a nozzle window from "Classic: 190 - 210 °C", an HDT
load from about twenty spellings, a drying schedule from a sentence. A parser change could move a verdict with no
data change and no diff, and a mis-parse looked like data.

Migration m08 stores what the parsers read in typed columns beside the raw text: for each profile axis the state,
minimum, maximum and whether it is a requirement; the enclosure and drying state, drying temperature and hours; the
hardened-nozzle requirement; and each measurement's Test load MPa. Compile reads the typed columns. The parsers
still run, as a check: if a parser reads the raw text differently from the typed value, the build stops
(PARSE-MISMATCH), unless Parse review explains a deliberate override. m08 was proven to leave the compiled database
byte-identical.

The raw text is kept verbatim, cleaned only of extraction artefacts (m07: ligatures, full-width punctuation in
non-Chinese text, dashes between numbers, run-together words, whitespace), with every parsed value proven unchanged.
Raw columns may therefore spell one thing several ways ("25 - 45 °C", "25-45°C"); the near-duplicate spelling lint
skips them, because their typed columns are what is checked.

Improving a parser is now a visible change. On 2026-09-15 the HDT load parser learned 1.81 and 1.820 MPa, MN/m²,
a decimal comma beside the unit, and ISO 75-2's method letters; the check showed exactly two stored rows affected,
and both were synced in the same migration. The letters are read as loads because ISO 75-2 defines them (A 1.80 MPa,
B 0.45 MPa, C 8.00 MPa); a bare standard with no load stays unstated.

Reversing it lets a parser edit change verdicts silently and hides a mis-parse behind a plausible number.

## D50. Every check has a code, and quality findings are fixed or accepted with a reason

> **In plain words:** Every check has a stable code, and every data-quality finding is fixed or accepted with a written reason.
> **Status:** in force; its "nothing is deleted" narrowed by D72.

Issues were messages. A test asserted on wording, a reader could not look a message up, and warnings could not be
baselined, so a doubling of the data would bury a new problem among old ones.

Every schema, build, validation, audit, contract and lint issue now carries a stable code from one catalogue
(`build/src/rules.js`, generated into `docs/RULES.md` and checked current by verify), with its level, meaning and
fix. Codes never change meaning; a retired check keeps its code out of use.

The data lint (`build/src/lint-rules.js`, `npm run data:lint`) reports what the schema cannot express: extraction
artefacts, near-duplicate spellings outside raw columns, duplicate measurements, rows from one place in one source
with different values and identical conditions (the two-table error, MEAS-CONDITIONS-INDISTINCT), printed mechanical
rows with no direction, uncited sources, local paths, and duplicate or overlapping coverage. `npm run verify` fails
on any finding not in `data/review/accepted-findings.csv`, where each accepted finding has a reason per record, and
on an acceptance that no longer occurs.

Two classes keep deliberate records from reading as defects. A source's Citation role says why it is registered
(cited, corroboration, register, provenance, not-retrieved), and a source recorded as not retrieved may never be
cited. A coverage finding that a later row replaces takes the status Superseded, keeps its text after
"Superseded by C#####", and leaves the views, the coverage checks and the lint; nothing is deleted.

Build warnings are baselined by the review snapshot (D53): each warning is a row with its record.

Reversing it brings back message-matching tests, and warnings nobody can tell apart from last month's.

## D51. Hand-maintained mappings are keyed by ID and checked at the gate; so are names the code relies on

> **In plain words:** Hand-kept lookup tables use record identifiers, not names, so renaming something cannot silently break them.
> **Status:** in force; amended by D60: the estimate model's configuration names no material, grade or polymer any more, so EST-MODEL-REFERENCE is retired.

Three mappings were JSON keyed by material name: family entries and their members, chamber bands, and the
environment topic vocabulary. A renamed material broke them, and only the build noticed, by a name.

Migration m09 moved them to `family_entries.csv`, `family_members.csv` and `chamber_bands.csv` keyed by MaterialID,
and to `schema/vocab/environment-categories.csv` and `environment-topics.csv`, which `evidence.Topic` must match. The
schema gate now reports a wrong reference with its file and line, and m09 was proven to leave the compiled database
byte-identical. The estimate model stays configuration (`build/mappings/estimate-model.json`), because conversions
between properties are physics, not data.

Some code is about a specific property by name (HDT's load, the strength endpoints, elongation's locator rule). Every
such name is declared in `build/src/property-references.js`; the build fails if one is not a registered property
(REGISTRY-CODE-REFERENCE), a test fails if code uses a registered name not declared there, and every material, grade
and property the estimate model names is checked the same way (EST-MODEL-REFERENCE).

*Amended by D60 (m28, m29, 2026-09-15):* the polymer identities, variant classes and Shore hardnesses the
configuration held are tables and measurements now, which the schema gate checks. The configuration names no material,
grade or polymer (`test/references.test.js`), and EST-MODEL-REFERENCE is retired; REGISTRY-CODE-REFERENCE stands.

Reversing it makes a rename a silent break.

## D52. The transfer is proven cell by cell; every later correction is re-read, guarded and replayable

> **In plain words:** The move out of Excel was proven cell by cell, and every correction since is a re-runnable script that refuses to run if the data moved.

The migration proved the first CSV build equal to the workbook build. That proved the conversion, not that the
workbook matched its sources, and not that every cell reached the tables.

**The transfer.** The transfer ledger (`archive/workbook-conversion/transfer-ledger.mjs`, which ran against the workbooks in git history) read the retired workbook with native cell values and classed
every one of its 99,538 cells against its CSV cell or the derivation that replaced it: equal, a named mechanical
change, a stale formula cache kept as the build read it, a reproduced derivation, precision lost, or unexplained. It
found one precision loss (`V000731`, restored) and leaves 0 unexplained. The ledger proves the state at the end of
the mechanical conversion (`CONVERSION_END_COMMIT`); later edits are classed from the record-level data diff, so a
correction never needs a ledger rule of its own.

**The sources.** `npm run audit:sources` fetches every PDF source cited by measurements, checks its SHA-256, and
lists every printed "number unit" with no matching value in the tables, and every property the document names that
the source has no row of (values printed unit-first or without a unit escape a number search). Doubtful layouts are
checked on the rendered page, not the extracted text. Its first run found 173 published values never transcribed,
and the defects in the bug table below.

**The corrections.** Each batch is a migration (m10 to m18) that writes through `scripts/migrate/source-edits.mjs`:
every edit names the value it replaces, so a re-run is a no-op and a run after the data moved stops; every changed
measurement gets a dated note saying what changed and where the source says so. A value is never typed from a
report. Where a sheet contradicts itself (iSANMATE ESD-ABS pairs Method A with 0.45 MPa, and by its loads the higher
load gives the higher temperature), the rows are recorded quarantined with the reason. Where a label and a value
disagree (Eryone's and Flashforge's "X-Z" results at half the X-Y value), the direction is recorded as not published
with the reason.

Reversing it lets a transcription error that looks like data stand, and makes a correction unrepeatable.

## D53. The estimate model reads declared states, not wording; and every change shows its downstream effect

> **In plain words:** Estimates read declared states (dry, conditioned, a declared variant) rather than wording, and every change commits a snapshot of what it did.
> **Status:** amended by D68 (the state is a column on the row, not an entry of the vocabulary), D73 (EST-WIDE asks only whether the model ignored a value the material publishes; a merely wide estimate is EST-THIN, informational) and D83 (the representative grade retired, and a variant is counted apart from its material's spread).

**Moisture.** A value was converted from wet to dry only if its moisture label contained "wet", so 84 rows labelled
"Conditioned: 70% RH", nylons among them, were read as dry. Each Moisture condition value now declares its State
(dry, conditioned, not-stated) in its vocabulary, `build/src/normalize/moisture.js` reads it, and an undeclared
wording stops the build.

**Variants.** A product its material's Modifier / filler does not describe (3DXTECH HyperLite PP, with an additive
for 0.75 g/cc; Spectrum HDPE, whose 1.1 g/cm³ is beyond unfilled polyethylene) pulled its family's estimates. A
grade's Variant now gives its product a covariate with a fixed, loose spread (`gradeVariants`), so its offset is its
own. Its values stay its own, and it may still be a representative grade, because a headline is a single-grade
observation; whether such a product deserves its own material is a scope decision (settled for HyperLite PP in
D57: it is PP Lightweight).

**Bounds.** A published bound ("> 16.5 MPa") had no spread and became the most precise observation there was;
leaving bounds out lost the only evidence that elastomers stretch hundreds of percent. A bound now enters at its
value with a documented half-width (`bounds.oneSided`), never calibrates a conversion or the between-product spread,
and limits its own material's estimate; a lower bound in an unstated direction also bounds XY strength and strain.

**Physical limits.** Every estimate is softly bounded by its property's physical range, and heat deflection by a
45 °C floor, published only where a limit moves the plausible range. Estimates too wide to guide a choice
(EST-WIDE) and reinforced materials estimated below their unfilled sibling (EST-FAMILY-ORDER) are warnings with
records.

**Downstream effects.** `npm run snapshot` commits every headline (value, likely and plausible ranges, the range that
may screen), process gate, template result and warning under `build/snapshot/`, and `npm run ui:check` commits what
a reader sees in headless Chrome (every template in Strict and Explore with estimates, each shared link reopened,
Compare) under `build/snapshot/ui/`. Verify fails if either is stale, so a data or rule change carries its effect in
its own diff. `npm run data:new` and `npm run data:retire` make complete records and finished retirements the easy
path.

Reversing any part brings back a failure seen in this snapshot: wet nylon read as dry, a lightweight PP pulling
polypropylene's density, PEBA's strength pinned to its bound, or a change whose effect nobody saw until a user did.

*Amended by D73 (2026-09-17) and D83 (phase 4, m137, 2026-09-25):* an estimate that is wide because its material
publishes nothing is EST-THIN, informational, and EST-WIDE fires only on an imprecise estimate for a headline one of
the material's products publishes a usable value for. The representative grade retired, so no variant can be one: a
declared variant's values are its own product's, counted apart from its material's spread.

## D54. A published mean ± band is judged on its mean; the band flags a result close to the limit

> **In plain words:** A value published as "35 ± 4 MPa" is judged as 35; the band only marks a result close to the limit.

A measured headline with a band ("35 ± 4 MPa") was compared as the hard interval 31 to 39, so it never passed a
requirement of 33 MPa and decided nothing within its own spread. 128 of 362 headlines carry a band, mostly a specimen
standard deviation from Bambu Lab, Polymaker and Fiberlogy sheets, not a tolerance. The owner ruled (audit
2026-09-15, C-04) that such a value is judged on its mean, as a value without a band is. When the threshold lies
within the band the verdict stands and the result says it is close to the limit (`closeToLimit`, "≈" in the table).
A published range ("42-52") and a one-sided bound ("> 16.5 MPa") are still judged as the intervals they are, and a
bound that vetoes a screen is the published value, never value + SD.

A number in a column that carries a requirement is shown with the digits that keep it on its own side of the
threshold: PC's price of 50.99 read "51" while passing "price < 51".

Reversing it makes a quarter of the measured headlines undecidable next to their own values again, and a table that
rounds a pass into a visible failure.

## D55. A value physics rules out is kept, flagged and decides nothing; only a printed part bounds a printed headline

> **In plain words:** A published number physics rules out is kept and flagged, and decides nothing; only a printed part's value can set a lower bound.
> **Status:** in force; extended by D82, and amended by D83: nothing selects a headline now, and a flagged value is no product's value (a pin on one stops the build).

Some sheets publish what cannot be: PC's HDT at 0.45 MPa below its HDT at 1.8 MPa, a 1.19 GPa modulus on a 68D
elastomer that stretches 650 %, a PA12 glass transition of 158 °C, an HDT on a 26 MPa TPU. They are faithful
transcriptions, so correcting them would invent data (D35), and using them made a TPU pass a rigid-part stiffness
requirement in Strict. The owner ruled (audit 2026-09-15) that they are recorded, flagged, and excluded or
down-weighted. Data status "Published value (physically implausible)" keeps the number with its reason in Notes and
a chip in the drawer; it backs no headline, estimate, conversion, implied bound or plot point, and a headline that
selected one is estimated from the evidence that remains (m24). Lint rules check what one sheet can contradict
within one grade and state (HDT load order, Z above XY, strain below stress / modulus); a finding is flagged or
accepted with a reason.

Implied bounds, which veto a screen and limit an estimate from below, come only from printed specimens at their
published value, never from a moulded bar, a drawn film, a filament strand, an unstated specimen, an annealed value
beside its as-printed twin or a conditioned elongation (D48 amended). ASTM D882 film strengths had kept PLA a
candidate for 140 MPa; Spectrum PA12-CF's unstated 125 MPa kept it in searches for 95 MPa. The same bounds now cut
the material's own estimate: no plausible range reaches below a value its own printed data prove (58 did).

Reversing it lets a sheet's impossible number decide a requirement, and a stronger specimen than a printed part keep
a material in searches its printed parts fail.

*Amended by D83 (phase 4, m137, 2026-09-25):* no headline selects a measurement any more. The rule that chooses each
product's value passes over a flagged one, and a pin on one in `headlines.csv` stops the build
(HEADLINE-SELECTION-INVALID); a material's estimate still rests on the evidence that remains.

## D56. The estimate model follows printing physics: crystallisation, water uptake, mixing, and what an elastomer cannot have

> **In plain words:** Estimates follow printing physics: slow-crystallising plastics, water in nylons, filler density, and what an elastomer cannot have.
> **Status:** amended by D60 (how a polymer solidifies in a print, its water uptake and its neat density are columns of polymers.csv), D68 (states are columns on the row) and D83 (heat deflection does not apply to an elastomer).

*Amended by D60 (m28, 2026-09-15):* the per-polymer facts below (which polymers print amorphous, how much water each
takes up, its neat density range) are columns of `data/tables/polymers.csv`, no longer entries of `estimate-model.json`.
The conversions, offsets and limits stay configuration.

*Amended by D83 (phase 4, 2026-09-25):* heat deflection of an elastomer is not applicable by its headline definition
(`headline_definitions.csv` Applies to, on the polymer's Morphology), for its products as for its estimate. A value an
elastomer's own sheet publishes stays that sheet's measurement, shown and never deciding; before, only the elastomers
whose representative grade happened to publish none were held out.

The owner asked for any correction that makes the estimates more reliable for engineering decisions (audit
2026-09-15). Each is a declared, documented piece of `build/mappings/estimate-model.json`:

- **Crystallisation while printing.** PET, BVOH and PVA, and unfilled PPA, crystallise too slowly to crystallise in a
  print (`printsAmorphous`): their as-printed heat deflection converts with the amorphous class, is capped at the glass
  transition plus a lift, and learns nothing from annealed values. PET's estimate reached 132 °C against its own
  Vicat of 65.9 °C. PPS is not one: printed hot it reaches 241-264 °C unannealed.
- **States.** Post-processing and Specimen type declare a State and a Form in their vocabularies, as Moisture condition
  does (D53). An annealed value beside its as-printed twin is another state, not a repeat (PET-GF15's 81.6 and
  133.7 °C had averaged to a precise 107.65 °C), and repeats under different annealing schedules keep a spread that
  spans them. A headline is never a moulded, film, filament, conditioned or annealed-beside-as-printed value.
- **Water uptake.** The conditioned-to-dry offset follows the polymer: high for PA6, PA66, PA6/66 and PPA (dry modulus
  about twice the conditioned), low for PA12, PA612 and PAHT, none elsewhere.
- **Density.** An unfilled estimate is bounded by the neat polymer's handbook range, a filled one by the rule of
  mixtures at 35 wt% fibre and 5 % porosity; PA12 was estimated 1040-1180 kg/m³ against its own 1010.
- **Elastomers.** Heat deflection is never estimated (ISO 75 ends at 0.2 % outer-fibre strain, which needs a modulus
  near 225 MPa); yield does not convert to an elastomer's ultimate values; Shore A and Shore D have separate offsets.
  This reverses "a published value beats the rule" for TPU.
- **Direction.** A source's orientation label is an unknown direction (Method, Comparison / Directions), and an
  unknown-direction conversion may move below its documented offset, never above: 18 Z results coded unknown had
  taught it offsets that inflated estimates 1.35-1.6x.
- **Own evidence.** A material's only evidence for a headline is never down-weighted as a conflict: PP's own 0.39 GPa
  had given way to PP-CF, PP-GF and two variants (1.5-4.5 GPa).
- **The Vicat cap, not a melting margin.** An unfilled bar is capped by the highest Vicat its own grades publish. A
  cap at the melting point less 20 °C was tried and dropped: PVDF publishes 158 °C, 12 °C under its melting point,
  and the heat deflection back-test lost certification.

Calibration holds (plausible coverage 95-97 % for every headline) and the D48 certifications are unchanged. Reversing
any item brings back a failure seen in this snapshot.

## D57. Identity is a record's job: compounds are declared, a replaced name keeps its record, and every build finding is reviewed

> **In plain words:** Unusual products are declared in the data, a replaced property name keeps its record, and every build warning is reviewed.
> **Status:** in force; amended by D73 (an estimate wide for want of data is EST-THIN, not reviewed) and D83 (the representative grade retired, and the unstated-load finding with the bracket).

- **Compounds and variants.** HyperLite PP is its own material, PP Lightweight, as PLA Aero is (m25); PP describes
  iSANMATE PP. Spectrum PA6 Neat (1.25 g/cm³) is declared an undisclosed dense filler, as Spectrum HDPE is, and both
  materials say their values are a compound's ("About this entry" in the drawer). PC-GF's representative grade is BASF's
  printed, dry data set rather than a sheet stating no specimen (m26).
- **Replaced properties.** "Izod strength" and "Izod impact strength" are one test. properties.csv gains "Replaced by":
  the replaced record stays (nothing is deleted), its replacement must be current, and no measurement or headline may
  use it (m22). A headline or material link re-pointed at another record is an edit, not a deletion
  (`replacedWithin`).
- **Build findings.** Outliers, imprecise estimates, family-order breaks, unstated loads and materials with no
  measurements are reviewed per record in data/review/accepted-findings.csv, and `npm run audit:data` fails on an
  unaccepted or stale one; informational summaries are level info.
- **The rendered app.** `npm run ui:fuzz`, in verify, runs 2,000 seeded random scenarios through the built page in
  every Strict/Explore/estimates setting and compares table, chart, counts, chips and links with the engine. It found
  what the 14-view probe could not: a plot purge that threw in 187 of 200 scenarios.

Reversing any of these lets a lightweight or filled product speak for its polymer, a duplicate property name split
evidence, a new outlier reach the page unreviewed, or an interface defect pass every unit test.

*Amended since it was written:* `npm run verify` runs 300 scenarios since the fast tier split from it (2026-09-15), and
CI runs 2,000 on a new seed every night (`npm run ui:fuzz:full`). Since D73 (2026-09-17) and m137 (D83, 2026-09-25)
the findings reviewed per record are the outliers, the imprecise estimates beside a usable published value, the
family-order breaks and the materials with no measurements; the unstated loads went with the bracket. The
representative grade retired in m137 too, so PC-GF is the spread of its products, BASF's printed, dry data set among
them.

## D58. Estimates are an overlay on a complete core, and grow by data, not by special cases

> **In plain words:** The database works without estimates, which only add to it, and the model grows by declaring cases in the data rather than by new code.

The estimate model absorbed every data discovery as code. Of the eight revisions to estimates and screening between
2026-09-13 and 2026-09-15 (D40 to D56), four were forced by classes of data nobody had declared: Z results coded
unknown, annealed twins, moulded resin sheets, conditioned nylons. Each fix was a branch in a 901-line file, a block in
its configuration, a decision and an accepted finding, and the compiler, the validator and the model's configuration
had grown into one another: compile read the model to find implied bounds, and the validator read it to check
headlines.

**A stage.** `build/src/estimate/` is applied to the compiled database and only adds to it: estimates, not-applicable
statements the model makes, load brackets, estimated print windows and their diagnostics. `build/src/pipeline.js` runs
compile, the stage and validation for every caller. Built with `--no-estimates`, the core database validates and meets
the contract (`test/contract.test.js`), so no headline, gate or check of the core rests on inference. Which measurements
bound a headline from below is a fact about the headline, so it is a registry column (`headline_definitions.csv`
Lower bound, m27), not model configuration. The model's judgements (conflict threshold, calibration clamps, prior
weight of a documented conversion) are named in `estimate-model.json` with their reasons, not literals in code.

**Growth by data.** A case the model cannot express becomes a not-applicable reason, a declared state or class in the
data, or a reviewed finding that says more data is needed. A new conversion kind or physical rule needs its own
decision saying why the data cannot carry it, and a back-test showing it helps.

Reversing it lets a data defect become a model branch again, and lets the core's verdicts depend on inference nobody
can switch off to check.

## D59. A screen rests on an end the back-test has shown, one end at a time, never against the material's own evidence

> **In plain words:** An estimate may rule a material out only on a side of its range that testing has shown to be reliable, and never against the material's own data.
> **Status:** in force; amended by D83 (m137): the unstated-load bracket is gone, and the back-test hides each material's typical product's value.

The owner kept screening and asked that its weaknesses be resolved (2026-09-15). D48's back-test certified an evidence
class unless it could *disprove* it: over at least 20 hidden headlines, neither side missed significantly more than
2.5%. With few cases that test cannot reject much. The stiffness estimates resting on a material's other grades missed
on 4 of 21 held cases (19%) and screened; a class with a true 10% miss rate passed about two times in three; and one
case more or less flipped a class on or off. It had three further gaps:

- **The hold-outs saw what they hid.** A hidden headline had helped learn the conversion offsets that turned its own
  product's other values into its prediction, so calibration and the back-test were optimistic (audit C-09).
- **Both ends were judged together.** A screen on a minimum requirement is wrong only if the true value lies above the
  top; one on a maximum, only below the bottom. A class too narrow on one side lost both, or kept both.
- **The model could overrule the material's own sheet.** PP's elongation screened on 14–118 % against its own 460 %.

**Honest hold-outs.** A hold-out of a material is predicted with spreads refitted without its fold of materials (one in
five; the between-product spread too), and with the conversions refitted without the hidden products (for the family
class, every product of the material), the prediction corrected exactly for the shift in every observation of a changed
kind (`build/src/estimate/calibration.js`, `makeHoldOut`). An independent review checked the algebra. Fitted once on all data, the spreads
had made elongation's hold-out errors 25% narrower in the tail. Every spread now has a documented floor
(`estimate-model.json` floors): without TPU and PEBA, an elastomer's product-to-product spread fell to 0.003 and a
hold-out claimed near-certainty. The corrections widened elongation's plausible ranges by 9%, heat deflection's likely
ranges by 8% and stiffness's by 3%, the size of the leak; calibration still holds. Conflict down-weighting is still
decided once, on all data.

**An end is shown, not merely not disproved.** For each class and each end, the build records where every honestly
predicted true value fell in its prediction, and takes the end at a distribution-free tolerance limit of those positions:
the r-th most extreme, with r the largest count for which a new true value lies beyond the end at most 10% of the time
with 90% confidence (`estimate-model.json screening`). The end is never inside the plausible range the reader sees, and
moves outwards only where the tail proved too thin. It needs no distribution to be right, and no fixed level: a
calibrated class screens where it did, a class with a thin tail screens further out, and with fewer than 22 cases no end
can be shown at all. The unstated-load bracket's top is set the same way from the gaps grades publishing both loads show
(amorphous: 15.8 °C, the second largest of 38), which keeps PLA Lite out of "at least 100 °C".

A 10% bound on how often the true value lies beyond an end is a bound on how often a screen on that end is wrong, and a
loose one: the screen is wrong only if the requirement also lies between the end and the true value. The guarantee
assumes a material whose headline is missing is like the measured ones its class was back-tested on, and it holds per
end at 90% confidence: of the thirty or so ends a build sets, about three may be expected to exceed 10%. Five percent at
90% confidence was considered; it needs 45 cases, which only the family classes have, and it would have reopened the
unstated-load PLA Lite case.

**Open ends.** An end its class cannot show screens only where the family model's end, shown on its own, agrees (their
union), else it is open (`null`) and screens nothing on that side. An end the material's own evidence, converted to the
headline, lies beyond is open too, and the estimate says why (`screenLimit`). The bottom of an unstated-load bracket is
the published value, which the 0.45 MPa value cannot lie below, so a maximum requirement below it now screens for every
matrix, not only a certified one.

**Measured 2026-09-15.** Of 94 estimates, 77 screen on both ends, 13 on one and 4 on neither. Twenty ends no longer
screen against the material's own evidence (PP's elongation among them). One template result changed: PA12 stays a
flagged candidate for the flexible component's 100% elongation, because its class set its top at 174%. Three measured
headlines the honest hold-outs flag as far from their prediction (OBC's density, TPU's elongation, PPS's heat
deflection) are accepted for review with their physical reasons. The per-end table is `build/snapshot/screening.csv`.

The estimate display was also corrected: evidence converted to a heat deflection headline omitted the melting-point
term, so PA12's own 94.7 °C read as "about 108 °C as this headline".

Reversing it lets a thin class screen on the strength of a test that cannot fail it, lets a material's own data sheet be
overruled by its family, and lets calibration grade itself on values it has seen.

*Amended by D83 (phase 4, m137, 2026-09-25):* the unstated-load bracket is gone, with its top and its bottom above: a
heat deflection whose load the sheet leaves unstated is its product's value as published and is counted apart (D84).
The hold-outs hide each material's typical product's value, where they hid its representative grade's headline.

## D60. What the estimate model knows about a polymer, a variant or a product's hardness is data, in tables

> **In plain words:** What the estimate model knows about a polymer, a variant or a product's hardness lives in tables, not in its configuration.

D51 moved hand-kept mappings keyed by name into tables and left the estimate model's configuration alone, because
conversions between properties are physics. But the configuration also held records: 36 polymer identities matched to
materials by the text of their base polymer, nine grades' Shore hardness keyed by GradeID with their quotes, and two
lists of material names. A renamed material or polymer broke them silently until a check written for the purpose
noticed, and no schema, lint, diff or source register covered them.

- **polymers.csv** (m28) holds each identity's group, morphology, melting point, how it solidifies in a print (crystallises
  while printing, prints amorphous, prints amorphous unless fibre-filled, crystallises without following its melting
  point), water uptake and neat density range, with its source or the basis for its numbers. `materials.csv` Estimate
  identity is a foreign key to it and Variant class a vocabulary, so a wrong name fails at the schema gate by file and
  line. The values moved unchanged and no estimate moved.
- **Shore hardness** is a measurement (m29). Every source was re-read from its hash-matched copy: PolyFlex TPU95, TPU for
  AMS and Ultrafuse TPC 45D print theirs, and are published values never transcribed; Bambu TPU 95A HF, 90A and 85A and
  eSUN PEBA-90A print none, and carry Data status "Nominal from product designation". Reading measurements, the model
  now uses every published Shore hardness, including four the configuration's list had missed (I-TPU, a second PolyFlex
  TPU90 record, Spectrum and Kimya PEBA), and elastomer stiffness estimates moved by 1 to 3%. TPC / TPEE's coverage no
  longer calls its mechanical data a gap.
- **What stays configuration** is what is physics or judgement, not a record: conversions and their documented offsets,
  physical limits, spread floors, calibration and screening settings. It names no material, grade or polymer
  (`test/references.test.js`), and EST-MODEL-REFERENCE is retired.

Reversing it puts records back where no schema, diff or source register can see them.

## D61. No meaning lives only in a tooltip

> **In plain words:** No meaning is available only on mouse hover: every such mark is also a button that explains it, for touch and keyboard.

An interface assessment on 2026-09-16 counted 175 elements on the desktop table, and 540 on a tablet, whose meaning was a
native `title` of 25 characters or more and nothing else: what an estimate rests on and which of its ends may screen,
why a measured value is not the headline, which kind of absence a dash is, why a row was screened, what a gate chip
decided, why a price listing is quarantined. The legend above the table told the reader to hover, and the drawer said
"click any number" when only a six-pixel dot beside it was a button.

A native title is not enough, for reasons that do not depend on taste. It never appears on a touch screen. It cannot
be reached from the keyboard, and a screen reader may or may not announce it. On a desktop it arrives after a delay
the page cannot control, disappears when the pointer moves, cannot be selected or copied, and is cut short or wrapped
by the browser: the estimate's is about 600 characters. An engineer on a tablet at the printer had no way to learn what
`~1.9–5.29†` meant.

So a title may repeat what is on screen, and may not be the only place a meaning is said. Every such mark is a real
`<button>` that opens one reused explanation popover (`app/js/ui/popover.js`) by click, tap, Enter or Space, closes on
Escape, a second press, the close button or a click elsewhere, returns focus to the mark, and stays inside the viewport
at 390 px. Where there is a natural next step it offers one: open the estimate, the measurement or the Printing tab. The
text comes from the functions that wrote the titles, and the titles stay, so the wording cannot fork and a mouse still
gets it on hover. The same rule put on screen what had been only a title elsewhere: the lens tabs' purposes, the column
chooser's, the mode control's label below 1100 px, Use estimates under Confirmed only (disabled with its reason instead
of hidden), and the on/off state of the result chips (a ticked or empty box, "Show in table").

The listeners sit on the document, in the capture phase, so a renderer that draws a mark has nothing to wire and
cannot forget to, and a mark inside a table row does its own job without opening the row's drawer. The table's
legend is one line of the same marks, always present in the same order, each opening its definition.

Out of this decision's reach for now: the column headers' technical names, the retailer and date on a buy link, and
the values on the Ashby chart, which are read by pointing at a mark. Each is still a tooltip-only meaning, and each is a
case of this rule, not an exception to it. The Parallel lines chart has since come within it: a tap or Tab reads a line
in a readout above the chart.

Reversing it makes the tool's most important distinctions, measured against estimated against absent, invisible to
anyone not holding a mouse.

## D62. A narrow screen scrolls what does not fit inside its own box, and never squeezes it

> **In plain words:** On tablets and phones, tables scroll sideways inside their box rather than squeezing, and the detail panel becomes a proper dialog.

The interface was laid out for a desktop and wrapped below it. An assessment on 2026-09-16 at 1180, 820 and 390 px found
the results table the worst of it: a fixed-layout table shared the width out by percentages, so at 820 px 46 of 207
cells overprinted their neighbours (estimate ranges ran into the next column, "UNKNOWN" over a density) and at 390 px
132 did, with names broken a letter per line and headings cut to "Res / Der / Stif". The Ashby legend beside the plot
took 60% of a tablet's width and lay over a phone's points. The top bar was two rows at every laptop width and four on
a phone; the view tabs two rows, the drawer's nine tabs three. The drawer covered a tablet or phone screen but Tab walked
out of it into a page nobody could see, and the fixed-height page put the status bar and the shortlist under a phone
browser's toolbar with no way to scroll to them. The probe's layout record (`build/snapshot/ui/30-*.txt`) counted 29
layout failures.

- **Tables scroll sideways in a box, with the name column held, rather than becoming cards.** Each kind of column has a
  minimum width, the table lays out automatically so no cell is narrower than what it holds, and where the minimums do
  not fit the table scrolls in its box with the material's name stuck at the left, as the Data coverage lens already did.
  Cards per row were the other way. They would have made a table of numbers into a list of labelled values: columns
  could no longer be compared down the page, sorting by a column would have no column to show it, and the fuzz and the
  probe, which read rows and cells, would have had two renderings to check. An engineer comparing densities reads down a
  column; the sideways scroll keeps that and costs a swipe. The box scrolls only when its table overflows (it is marked
  after drawing and on resize), because a box that can scroll sideways is also a vertical scroll container and the
  column headings would otherwise stop sticking on a wide screen, where the table fits.
- **The Ashby legend goes below the plot under 900 px, and lists colours only.** Beside the plot it cost the plot most of
  a narrow chart; below it, in rows, it costs height, which the chart gets back (its height follows its width, plus the
  legend's rows). Plotly reserves the legend's real height under an automargined axis, so a wrong estimate of its rows
  shrinks the plot a little and never overlaps the axis title. Shape, hollow and estimate marks moved out of the legend
  into one HTML key under the chart that lists what is drawn: 40-odd family and filler rows had explained neither a
  hollow point nor a dotted box.
- **Below 600 px the page scrolls as a whole.** Fitting the page into one screen, as a desktop does, left the results a
  slot a few rows tall between a two-row top bar, the tabs, a two-row status bar and a two-row shortlist, and a phone's
  dynamic toolbar could cover the last two. Scrolling the page makes everything reachable and gives the results the
  screen. Above 600 px the layout is unchanged, at `100dvh` with a `100vh` fallback.
- **Below 1100 px the drawer is a modal dialog**: it covers the screen there, so the page behind it is inert, Tab cycles
  inside it, a backdrop closes it, and focus returns to its opener. A wider screen keeps it a side panel beside usable
  results, not modal.
- **Strips instead of wrapped rows** for the view tabs and the drawer's tabs, with the active tab kept in view, and a top
  bar of one row from 1101 px (the theme button an icon below 1600 px, keeping its words as its name and title) and two
  on a phone (the title left to the browser tab, Save / share and the theme as named icons).

`npm run ui:check` now fails on a layout failure without a flag; the drawer steps measure the drawer's own tables, since
counting the table behind the drawer again had charged the drawer with the table's failures.

Reversing it brings back overprinted numbers on every screen narrower than a laptop, a legend that hides a phone's
chart, and a full-screen panel that keyboard and screen reader users can walk out of.

## D63. A source's Title is what the publisher printed, and a specimen's print parameters are the tested conditions, not the guide

> **In plain words:** A source's title is the heading the document prints, never a file name or page chrome, and a specimen's print parameters are only the tested conditions.
> **Status:** in force; extended in phase 5, part 5 (m149): page furniture read as a title is flagged too.

Two text columns had been filled with whatever the transcription had to hand. Seventy-eight source Titles were not
titles: 22 product pages carried the page's `<title>` with the store's payment footer glued on ("CARBONX™ ABS+CF Ach
Direct Debit Amazon American Express Apple Pay ... Visa"), 40 Bambu Lab sheets a file-name stub ("B pla basic
filament", "B PC"), 15 PDFs an `.xlsx` or underscore file name, one was "untitled". The drawer cites the Title beside
every value, so a reader was told a measurement came from "Amazon American Express". And 140 measurement rows of
eight sources held, in "Specimen / print parameters", a marketing paragraph ("... 50 ºC bed temperature, having
excellent interlayer adhesion which greatly improve the strength ...") or a description of the source ("Manufacturer
TDS v1.0; standard deviations in parentheses") where the other rows hold the sheet's Specimen Printing Conditions.

- **A Title is the document's own title as the publisher printed it**: a sheet's heading ("Bambu Filament Technical
  Data Sheet - PLA Basic", "Technical Data Sheet: CarbonX™ PP+CF 3D Printing Filament"), a page's `<title>` or main
  heading with the store's name stripped ("CARBONX™ ABS+CF"). It is never a file name, a placeholder or the chrome
  around a page, and it says what is printed even when that differs from what the source is filed under (the PLA
  Basic Gradient sheet is titled "PLA Basic"; the Revision column tells them apart). Lint `SOURCE-TITLE-NOT-TITLE`
  flags payment and store words, a file-name pattern (`B pla`, an underscore, `.xlsx`, `.pdf`) and "untitled" (m34).
- **"Specimen / print parameters" holds only what the sheet ties to its test values**: the Specimen Printing
  Conditions table, the print orientation heading of a results table ("Print direction XY, Flat"; "Print Orientation
  45/45"), in the sheet's words. A recommended printing range, a Print Recommendation table or a PROCESSING block the
  sheet does not say was used for the specimens is a printing guide and belongs in `profiles.csv`, not here: written
  here it reads as the tested condition, and `npm run audit:sources` counts its numbers as transcribed values. Where
  the sheet states nothing for its values the cell is Not published, and a remark worth keeping (the sheet's
  standard deviations, its caveat that properties depend on production conditions) goes to Notes with its page
  (m33).

*Extended in phase 5, part 5 (m149, 2026-09-25):* the lint also flags page furniture a reader took from a sheet's
first line (a credit line such as "supported by", a lone "TM" or "1", the "TECHNICAL" of a two-line heading, a "Page: 1"
or "Version: 3.0" label), and a document that prints no title has Title Not published. m149 wrote the printed title of
the seventy it found.

Reversing it puts payment footers back into citations and lets a marketing paragraph stand where an engineer reads
the print conditions of the bar that was tested.

## D64. Polymer-level behaviour is shown and may screen, never passes

> **In plain words:** What a resin handbook says about a plastic's chemical resistance is shown where a product has no record of its own; it can rule out but never qualify.

Environment criteria answer from a material's own evidence records, and most materials have none in most categories: a
"resists solvents" requirement returned UNKNOWN for the great majority of the database, including every PLA whose data
sheet says nothing about acetone, while a resin producer's reference for the neat polymer has said for decades that PLA
is attacked by it. That reference is real evidence, but about the resin, not the filament: fillers, pigments,
plasticisers and printing change how a grade behaves, and a table that let it pass a material would present a handbook
paragraph as a test of a product nobody tested.

- **The behaviour lives in a table, keyed by polymer.** `data/tables/polymer_environment.csv` holds one row per base
  polymer (a `polymers.csv` identity, the one materials name as their Estimate identity), category and agent, with the
  conditions, a verdict from `schema/vocab/polymer-verdicts.csv`, the finding in the reference's words, and a retrieved
  source. Only a filterable category may be used, and never fatigue or creep: a resin reference cannot speak for a
  printed part under load. The build refuses an unknown polymer, a source that was not retrieved, a category outside
  that set, a verdict outside the vocabulary and a repeated (polymer, category, agent) (`POLYMER-ENV-*`).
- **The build attaches it where the material has nothing of its own, and nowhere else.** For every candidate material
  with an Estimate identity, for every category the polymer publishes in which the material has no `evidence.csv`
  record (narrative ones included), the compiler writes one inferred record, `evidenceType` "Polymer-level reference",
  `inferred: true`, with the agent rows behind it (`db.polymerEvidence`, cited from `evidenceIds.polymer`). Grade-level
  evidence always takes precedence, and the validator proves it (`POLYMER-ENV-PRECEDENCE`). With an empty table the
  compiled database is byte for byte what it was: the layer leaves no key behind, so it is removable.
- **One verdict per category, by one rule.** Every agent `resistant` makes the category `resistant`. The category
  screens only where the reference finds the polymer resistant to nothing in it: at least one agent attacks or
  dissolves it (`not-resistant`, `soluble`) and none is rated `resistant`; `soluble` where an agent dissolves it,
  `not-resistant` otherwise. Anything else is `limited`. Not "any attacked agent screens": a grade-level sheet passes a
  material on the mild exposures it tests (INTERFACE, the filter rail), and a reference that rates PETG resistant to
  30% sulfuric acid and attacked by concentrated sulfuric acid says of the class what that sheet says. Screening PETG
  out of "Resists acids" on the concentrated row would hold it to a harsher test than any measured material faces; on
  the first rule 27 of 32 polymer-covered materials were screened out of acids, most on a concentrated or oxidising
  row beside resistant dilute ones. PA6, attacked at 2%, screens. The rule is `categoryVerdict` in
  `build/src/polymer-environment.js`, and the vocabulary's Screens column, not code, says which verdicts screen.
- **It never passes.** In a requirement's evaluation a polymer-level `resistant` or `limited` leaves the material
  UNKNOWN, with a reason that names the polymer, what the reference says of it and the reference. A polymer-level
  `not-resistant` or `soluble` screens the material out under Include uncertain with inference on, exactly as an
  estimate does (D43, D48): the verdict stays UNKNOWN, `screened` is true, `screenedBy` names the criterion, the
  SCREENED chip brings it back, and Why excluded counts it apart from an estimate's screen. Under Confirmed only it is
  UNKNOWN, as every unresolved criterion is.
- **One switch governs all inference.** "Use estimates" is now "Use estimates and polymer data"; its element ids and
  the scenario field keep their names so links and the fuzz keep working. The reader sees what a result rests on
  (D61): the screened chip says "Screened by the base polymer's published behaviour: Resists solvents", the drawer's
  Environment tab lists the records under "From the base polymer", with a line saying they are the neat resin's
  behaviour and not a test of this grade, and the filter rail counts them apart, "N more from the base polymer, shown
  but never passing". A category with polymer-level records is offered as a filter even where no grade-level record
  states a verdict: it cannot pass there, and the rail says so, but it can screen.

Reversing it either hides evidence an engineer would want to see, or lets a paragraph about a resin pass a filament
nobody tested. Letting it fail a material would be the same mistake in the other direction: the verdict describes the
evidence, and the evidence is not about this grade.

## D65. A test method that defines its load states that load; the typed value says so in Parse review

> **In plain words:** A heat deflection labelled Method A or Method B has the load those standards define, recorded with the reason.
> **Status:** in force; amended by D83 and D84 (m137): a heat deflection with no stated load is its product's value as published, and HDT-LOAD-UNSTATED is gone.

Two Siraya Tech sheets print heat deflection as `93 ℃ / 97 ℃ Method A/B` and `73.5 ℃ / 81 ℃ Method A/B`, naming the
method and never the load. Read literally, neither row carries a load, and `hdt045` cannot use a value whose load is
unknown: both would join the seven headlines `HDT-LOAD-UNSTATED` already warns about, presented as nothing more than
"an HDT". Read as the standards define them, both are unambiguous — ISO 75 and ASTM D648 agree that Method A is the
high load (1.80 and 1.82 MPa) and Method B the low (0.45 and 0.455 MPa), and no third convention exists.

**The load a named method defines is a stated load.** `Test load MPa` is typed to what the method means, and the row's
`Parse review` says that the raw text names the method rather than the load, which standard defines it, and who
decided. The parser reads the raw text and finds no load, so the typed value and the parser disagree on purpose;
`PARSE-MISMATCH` is an error precisely so that this disagreement cannot happen silently, and `Parse review` is where
it is defended. Nothing is inferred about a value the sheet did not print: only about what the words it did print
mean.

- **The method must be named, not guessed.** "ISO 75" alone is not a method; "Method A", "Method B", "HDT A" and
  "ISO 75-2/A" are. A sheet naming a standard without a method keeps `Test load MPa` at `Not published` and stays in
  the `HDT-LOAD-UNSTATED` count, which is what that warning is for.
- **Within-publisher evidence strengthens it but is not the reason.** The same publisher's PPA-CF, PPA-CF Core and
  PPA-GF sheets print "Method A @ 1.80 MPa" and "Method B 0.45 MPa" in full, so its `Method A/B` is demonstrably the
  same mapping. The ruling would hold without that, because the standards agree; the sister sheets are why this
  particular publisher's shorthand needed no owner judgement beyond confirming the rule.
- **A sheet that contradicts the standard is transcribed, not corrected.** One source on file prints "Method A with
  0.45 MPa and Method B with 1.80 MPa", inverting them. Its rows keep the loads the sheet printed, with the
  disagreement in `Standard / load`. The method names the load only where the sheet does not name a different one.

Reversing it would throw away a load the source does state, in the one class the screening back-test had to reach:
`hdt045` would lose the cases these rows carry, and a reader would be told the load is unknown when the sheet named
the test that fixes it. Extending it — typing a load from a bare standard, or from a temperature that looks like a
0.45 MPa result — would be the real error, and is what the "method must be named" clause forbids.

*Amended by D83 and D84 (phase 4, m137, 2026-09-25):* HDT-LOAD-UNSTATED is gone with the unstated-load bracket. A
heat deflection whose sheet names no load, or a standard without its method, is its product's value as published:
shown, counted apart, and deciding only where a scenario admits such values. The rule above still types a named
method's load, so a Method B value is its product's comparable value at 0.45 MPa.

## D66. A templated safety data sheet is evidence only where it speaks about the product

> **In plain words:** Boilerplate in a safety data sheet that contradicts the product's own data sheet is not recorded; its composition always is.

Siraya Tech's four filament safety data sheets are word-for-word identical in sections 5, 7, 10, 12 and 13, across
three different polymers and two different fibres. Only section 3, the composition, differs. Two of the shared
statements are false of the products carrying them: 10.4 "Avoid temperatures above 240 ºC" appears on three sheets
whose own technical data sheets specify a 300-320 °C nozzle, and 5.3 and 10.6 name acetic acid among the
decomposition products of all four, which is what a vinyl-acetate or cellulose-acetate polymer releases and not an
ABS or a polyphthalamide.

A safety data sheet is a `Manufacturer statement`, and the rule for those has always been to record what the
publisher published. But `evidence.csv` rows are read per grade, and a row saying a material must stay below its own
printing temperature is read as a design limit. Transcribing that faithfully would put a false limit on a product,
sourced and page-cited, which is worse than not recording it.

- **Composition is recorded, always.** It is the fact no technical data sheet prints, it is why the class exists, and
  it is per-product on every sheet seen so far. It goes in `grades.Composition / filler` naming the SDS.
- **A shared statement is recorded where it is true of any filament** — ventilation, dust, storage, disposal — with
  `Exposure / conditions` saying it is identical across the publisher's sheets, so a reader knows it is a statement
  about the publisher's filaments generally and not a measurement of this one.
- **A shared statement that contradicts the product's own data sheet is not recorded**, and the migration header says
  which statement, which sheets, and what contradicts it. The finding belongs in the audit record, not in a grade.
- **The test is the contradiction, not the repetition.** A publisher whose sheets repeat a true statement is not
  penalised. 3DXTECH's sheet names hydrogen cyanide, which is what an acrylonitrile polymer does produce, and its
  flammability and stability rows are recorded in full.

Reversing it would let boilerplate become per-grade evidence: a PPA-CF that "must not exceed 240 °C" beside the
profile telling the reader to print it at 320 °C, each with a page citation. Dropping the whole document instead
would lose the composition, which is the only reason this source class was added.

## D67. A property is a row, not a pair of columns: the reference envelopes are long

> **In plain words:** Each generic reference material's property ranges are rows, one per property, so a new property needs no new column.
> **Status:** in force; amended in phase 5, part 5 (its dead offset removed, three misspelled names corrected).

`reference.csv` held a `min` and a `max` column for each of eight properties. Adding a ninth meant two new columns,
a schema change, an edit to the loader's column-pair walk, and 114 rows widened for a value most of them would not
have. That is the shape D46 had already rejected for measured properties, kept here only because the reference layer
is a drawing layer nobody was extending.

- **The envelopes are rows.** `reference_envelopes.csv` holds one row per reference material and property (Name,
  Property, Min, Max), 912 of them. `reference.csv` keeps the identity it owns: Category and Name.
- **The property list is data.** `schema/vocab/reference-properties.csv` declares each property and its unit, and
  `build/src/reference-properties.js` reads it. A ninth reference property is a vocabulary row and its envelope
  rows; no column, no schema change, no code change.
- **The unit is declared once.** It was a literal in the code beside the column names; it is now the vocabulary's
  `Unit` column, which is what the compiled `dist/reference.json` carries into the chart.
- **The order is the vocabulary's.** Every material presents its properties in the declared order, whatever order
  its rows are written in, so a hand-appended envelope cannot reorder a compiled file.
- **Proven, not assumed.** m42 refuses to drop a column unless every one of the 912 envelopes is a numeric pair.
  `npm run build:diff` reports no difference, and `dist/reference.json` is byte-identical to the build before it.

The legacy `offset` on each property is the retired reference workbook's column position. Nothing reads it, and it
stays in code, not in the data, only because `schema/reference.schema.json` still requires it in `meta.properties`.

*Amended in phase 5, part 5 (2026-09-25):* the offset is gone from `dist/reference.json` and its contract, and m148
corrected three misspelled names (Sandstone, Silicon, Plywood) through the removal ledger (D72).

Reversing it brings back a schema change for a number, and a loader that knows the shape of a spreadsheet.

## D68. A datasheet sentence is data, not a vocabulary: the state is a column on the row

> **In plain words:** A sheet's sentence is copied as printed, and the state it means (dry, annealed) is a typed column beside it.

*Amends D53 and D56, which put the state in the vocabulary.*

D53 fixed a real bug by giving each Moisture condition wording a declared State, and D56 did the same for
Post-processing: the build had been reading "wet" out of the words, so 84 conditioned rows, nylons among them, were
read as dry. Declaring the state was right. Declaring it *in the vocabulary* meant the wording was the key, so every
new datasheet sentence was a schema change. By this snapshot `post-processing.csv` held 33 sentences, 25 of them one
manufacturer's annealing paragraph in its own punctuation, and a sheet whose sentence differed by a word stopped the
build until someone added the sentence and declared its state again. m38 and m39 each carried that instruction in
their headers.

- **The state is a typed column.** `Moisture state` and `Post-processing state` sit beside the source's own words in
  `Moisture condition` and `Post-processing`, and the build reads only the columns. This is D49's rule, which every
  other decided value already followed: the profile windows, the drying schedule, the HDT load.
- **The words are still checked.** `readMoistureState` and `readPostProcessingState` read what a wording plainly
  says. Where the words say plainly and the column disagrees, the build stops (PARSE-MISMATCH) unless Parse review
  explains it. "Not annealed" and "unannealed" are read before "anneal", so a sentence that denies annealing is
  never read as annealing.
- **Where the words say nothing, the column decides.** Four wordings in this snapshot say nothing about the state
  of the specimen at test: storage humidity, a drying recommendation, a vacuum-sealing instruction, and resting at
  room temperature, which is not a heat treatment. The reader has no opinion on those, and nothing is inferred.
- **A new wording is data.** Adding a measurement whose sheet phrases its annealing differently is now a row, not a
  vocabulary entry and a second declaration of a state that is already in the row.
- **Specimen type keeps its vocabulary.** Its ten wordings are the database's own, not a publisher's, so declaring
  the Form there still makes a new one a deliberate act. *(Eleven since D95 added "Printed off the product's recipe",
  2026-09-27.)*

Reversing it brings back a build that stops on a sentence, and the pressure that creates to reuse a wording that is
close enough rather than record what the sheet says.

## D69. A profile's qualitative notes are rows, and an empty column is not a fact

> **In plain words:** A maker's printing notes (cooling, overhangs) are one row per note, and the Printing tab shows them.

`profiles.csv` was 56 columns wide. Eleven of them held free text about how a material prints, 363 notes spread
across 172 profiles, so most were empty on most rows. Three — Stringing, Volumetric limit and Difficulty — were
empty on every row of every profile, and had been since the workbook. A twelfth topic meant a column on all 172.

Worse, the notes were not reaching anyone. Only Storage humidity was compiled at all, and nothing rendered it; the
other ten were in the table and nowhere else, so a reader looking for what a manufacturer says about cooling or
overhangs could not see it, and a curator had no reason to record any more of it.

- **A note is a row.** `profile_notes.csv` holds one per profile and topic, the shape used everywhere else here
  (`headlines.csv`, `material_links.csv`, `fatigue_tests.csv`). A topic a source says nothing about has no row.
- **The topic is a vocabulary.** `schema/vocab/profile-topics.csv` names the eleven. A new one is a row there and
  the notes that use it; it was a column on every profile and a schema change. *(Fourteen topics on 2026-09-27.)*
- **The notes are shown.** The Printing tab renders each profile's notes under its typed fields, so all 363 reach
  the reader. That is the point of recording them.
- **An empty column is not a fact.** The three that were never once filled are gone. If a source ever publishes a
  volumetric limit it is a topic and a row, not a column that 171 profiles leave blank to say nothing.
- **A constant is a rule, not a per-profile value.** Temperature-group conflict was one sentence repeated on all 172
  rows. It is a rule of the database, so it belongs in `method.csv`, and its one clause the Method row did not
  already carry (the 45 °C low-temperature chamber guide limit) was added there.

`profiles.csv` keeps what the build decides on: the typed temperature axes, drying, enclosure, abrasion and routing.
Reversing it brings back a table that has to be widened to record a sentence, and evidence nobody can read.

## D70. A constant is not a per-material fact, and a summary of the data is not data

> **In plain words:** A sentence true of every material is one Method rule, and anything computable from the data is computed, not stored.

*Extends D47, which this snapshot had drifted from.*

D47 moved the stored conclusions out of the workbook: headline values, price medians, grade lists. Nine columns of
`materials.csv` had survived it, and three of them contradicted D47 outright. Price basis was a sentence counting a
material's own price observations, which `compilePriceHeadline` counts anyway. Headline basis was three sentences
chosen by the material's Scope and Representative grade, 102 of 103 rows derivable by that rule. Measurement
conditions was two measurement columns joined by a slash, compiled and rendered nowhere.

Four more were constants: Identity source said `LOCAL-CANON` on all 103 rows, Printability rubric `R-PRINT` on all
103, Normalized name repeated Original name on all 103, and Fatigue / creep said one sentence on 99, where the other
four are exactly the four materials with `fatigue_tests.csv` rows. The ten printability ratings were already ten
`evidence.csv` rows, with the same ratings and the same rubric.

- **Derived where the build can derive it.** `headlineBasis` and the price basis are computed, and m45 asserted the
  derivation row by row before dropping the column. `build:diff` shows one difference in 103 for headline basis and
  none at all for the price basis, which is the proof.
- **A constant is a rule, and rules live in `method.csv`.** Two Method rows were added, Scope / Headline basis and
  Scope / Transferable allowables.
- **The caveat that is true of everything is shown once, on everything.** "No transferable long-term allowable" sat
  on 82 materials, which reads as if the other 21 have one. It is true of every material here, so the drawer shows
  it on every material, from the Method row, and a material's own Limitations now record only what it adds.
- **Editorial prose the data contradicts is dropped, not kept.** Impact / toughness said "see distinct impact
  records" on 52 materials while 84 have impact measurements, and two of the 52 have none. m45 prints that cross-tab
  before dropping it. It was not rendered anywhere, so nobody had been reading a wrong thing; nobody had been
  reading it at all.

One sentence was lost text rather than a constant: M077, Support for PLA, said "mechanical values not published".
That is true and specific, so it moved to its Identity notes, which the drawer shows as "About this entry".

`materials.csv` is 16 columns *(15 since m137 dropped Representative grade)*. Reversing this brings back a table
where a reader cannot tell which cells are facts about the material and which are the same sentence 103 times.

## D71. How a source was classed and how it was reached are states, not sentences

> **In plain words:** A source's kind and whether it was retrieved are values from fixed lists, with the particulars in notes.

`sources.csv` described both in prose. Source class held 21 wordings for nine real classes: "Manufacturer TDS",
"Manufacturer TDS (web)", "Manufacturer TDS indexed at authorized distributor" and "Manufacturer TDS hosted by
current brand owner" are one class and three facts about one document. Access status held 17 wordings for four real
states and had no vocabulary at all, so a twelfth spelling of "Retrieved" would have passed the gate, nothing could
be counted, and the one piece of code that had to know — whether a source was reached — tested prose with a regular
expression (`/^not retrieved/i`) that a rewording would have silently defeated.

- **The class is a vocabulary of nine.** Manufacturer TDS, Manufacturer product page or guide, Manufacturer SDS,
  Resin supplier data sheet, Retailer catalogue, Printer documentation, Peer-reviewed study, Safety guidance,
  Reference or register.
- **The state is a vocabulary of four.** `retrieved`, `retrieved-copy` (read from a copy the owner supplied and
  checked against what the publisher serves), `read-only`, `not-retrieved`. D50's rule that nothing may cite a
  source that was not retrieved now reads a declared state, not a sentence.
- **Nothing is paraphrased away.** What each wording carried beyond its class moves to Source note, and Access note
  keeps the retrieval sentence exactly as it was written. Both are shown in the Sources tab, where they were not
  shown before: a reader can now see that a sheet is hosted by the current brand owner, or that the served revision
  differs from the copy that was read.
- **The distinction that mattered survived.** Four sources say the currently-served revision differs from the copy
  the owner supplied. What was read there is the served file, so they are `retrieved`, not `retrieved-copy`, and the
  note says which. The migration's reader is anchored so "the copy the owner supplied" is never mistaken for
  "owner-supplied".

Reversing it brings back a register that cannot be counted, and a check on prose.

## D72. A record may leave a table only where the build derives it, and only through a ledger

> **In plain words:** Records are never deleted, except one the build now derives, and then only with a ledger row naming the migration and where it went.
> **Status:** In force; amended by D123: a row the build now refuses outright (a chamber band on an alias, m303) leaves through the same ledger, which says why it went nowhere.

*Narrows "nothing is deleted" (D45, D50).*

Records are retired, never deleted, and the pre-commit hook and CI enforce it by failing on any removed row. That
rule is right, and it is why a retired grade keeps its ID and a superseded finding keeps its text. But it also makes
one legitimate change impossible: moving a record out of a table because the build can now derive it. There was no
way to do that except to disable the check, which would have disabled it for everything in the same commit.

- **The exception is a ledger, not a flag.** `data/review/removed-records.csv` names the table, the record, the
  migration that moved it and where it went. A removal a row covers passes; every other removal still fails, with
  the same message as before.
- **The ledger is read from the version being checked.** The commit that removes a record is the commit that
  authorises it, so a removal cannot be waved through by a ledger row added later, and a reviewer sees both halves
  in one diff.
- **A dropped column is still not a deleted record.** It never was, and the ledger does not change that: moving a
  column's content into a child table is the shape m31, m42 and m44 used, and it needs no ledger row.
- **The ledger accumulates.** A row that covers nothing in today's diff authorised a removal in an earlier commit,
  which is history, not a defect. It is the audit trail the deleted rows no longer are.

Reversing it leaves only the blunt instrument: `--no-verify`, which turns off every check at once and leaves no
record of what was removed or why.

## D73. A reviewed fact belongs in the row, and "not enough data" is not a defect to review

> **In plain words:** A reviewer's conclusion is written into the data row, and an estimate that is wide only because data is thin is reported, not reviewed.
> **Status:** in force; amended by D83: EST-WIDE reads a usable value of any of the material's products, not of its representative grade.

Two checks had been answered by suppression rather than by the data, and both suppressions were hiding the check.

**Direction.** Thirteen printed mechanical measurements carried Direction "Not published" and an accepted
MEAS-PRINTED-NO-DIRECTION finding each. Every one had been re-read; the reason lived in
`data/review/accepted-findings.csv`, so a reader of the table could not tell them from a row nobody had checked, and
the lint could catch nothing new without a reviewer clearing thirteen old ones first. The reasons were not one case,
so they did not become one value: `Unstated` says the source publishes the printed result and states no direction,
and `Stated, not a usable direction` says the source states an orientation the database cannot use — a 0°-90° raster
it has no value for, or an X-Z label the source's own numbers contradict, with the row's Notes saying which. Both are
an unknown direction to the build, so nothing downstream moved. "Not published" now means what it should: nobody has
looked.

**Wide estimates.** EST-WIDE asked a reviewer to explain every imprecise estimate, and all thirteen answers said the
same thing: the material publishes nothing for that headline, so the range is wide because the evidence is thin.
That is the honest answer, and no amount of reviewing changes it — only data does (D58). Meanwhile the check that
would matter had nowhere to fire.

- **EST-WIDE now asks whether the model ignored evidence it has**: an imprecise estimate for a headline the
  material's own representative grade publishes a usable value for, which would mean the value should have been the
  headline, or the model should have used it. It is reviewed, and it fires on nothing in this snapshot. That is the
  point: a build that raises it again has found something. *(Since D83, m137, 2026-09-25: a usable value any of the
  material's products publishes, its declared variants apart unless it has only those; it fires on nothing on
  2026-09-27 either.)*
- **EST-THIN reports the rest**, at level info, with its records. Nobody accepts it, and a new one is not noise.

Thirteen acceptances of each retired. `build/snapshot/warnings.csv` lost thirteen rows.

Reversing either brings back a review file doing a row's job, and a reviewer's signature standing in for a number.

## D74. A coverage row is a judgement; that a material has records is derived

> **In plain words:** The build works out which kinds of data each material has; stored coverage rows are kept only for human judgements.
> **Status:** in force; extended by D114 (absence is derived too, and a converted price is limited price coverage).

*Extends D39 and D47 to the table D39 created.*

D39 made coverage true: a Gap beside data, or an evidence claim without data, stops the build. What it did not ask
is why a row asserting the second thing was stored at all. By this snapshot 632 of 1,214 coverage rows said
"Evidence recorded", and 541 of those said it in one of eight sentences repeated once per material. "Original
canonical entry retained once" stood on all 103. "See specimen, direction, moisture, preparation and standard before
comparing" stood on 78, and is a caveat about the database, not a finding about a material. "1 in-stock
regular-price observation(s), before tax/shipping" stood on 24, the same sentence D70 had just stopped storing on
the material itself.

None was a judgement about a particular material. Each asserted that the material had records of a kind, and
`coverage-rules.js` already defined what that means precisely enough for the validator to check it.

- **The build derives them.** A (material, domain) pair the records prove and no stored row speaks for gets a row
  from the build, marked `derived`, naming what proves it: the measurement count, the profile IDs, the price
  observations. That is more than the sentence said, and it cannot go stale.
- **A stored row always wins.** Nothing is derived for a pair a stored row speaks for, because a stored row is
  somebody's judgement and this is a restatement of records. The 47 pairs that had both now show the judgement alone.
- **What a reader sees is unchanged, and that was checked.** The 1,121 (material, domain) pairs before and after are
  the same set, with the same weakest status in each. No cell of the coverage grid moved.
- **A derived row carries no identifier.** Its id is `derived-M020-mechanical`, not a C##### key, nothing cites it,
  and the drawer prints "derived from the records" where it would print a record tag. A reader is never shown an ID
  that is not in the tables.
- **Two domains became checkable.** Identity and H2C status were outside `domainData`, so COVERAGE-UNTRUE never
  tested them; they are in it now.
- **One domain is deliberately left alone.** "Post-processing / application" distinguishes grade-specific evidence
  from family notes a material owns, and no rule over evidence domains expresses that: six materials truthfully say
  Gap there beside records of their own. Its 53 templated rows stay stored. A check that would have to be weakened
  to pass is not a check, and a rule that cannot be stated is not derived.

The 541 rows left through the removal ledger (D72) into
[audits/2026-09-17-model-freeze/](audits/2026-09-17-model-freeze/README.md), which holds them verbatim with their
IDs. `coverage.csv` is 673 rows *(866 on 2026-09-27)*, and every one of them says something a reader could not work
out.

Reversing it brings back a table where the eight sentences nobody wrote for a material outnumber the findings
somebody did.

## D75. A generated SQLite file for asking questions, with the schema's types in it

> **In plain words:** The build writes a SQLite copy of the tables for asking questions, with missing values as empty beside their reason, and nothing reads it back.

*Answers the open question in D45.*

D45 chose schema-checked CSV over SQLite and said the same schema could generate one later if it were ever needed.
What made it needed was not concurrent editing: it was that every question spanning more than one record had to be
written as a script. "Which materials publish a 0.45 MPa heat deflection on a printed specimen, and from how many
manufacturers" is a four-table join, and the alternative was a one-off file each time, thrown away, unreviewed, and
wrong in a way nobody would notice.

- **Generated, never authored.** `npm run db:sqlite` writes `dist/h2c.sqlite` from the CSV tables and the schema.
  It is in `dist/`, which is gitignored, and nothing reads it back: there is still exactly one place data changes.
- **The schema's types go in with it.** A `number` column is REAL. A missing state is NULL, and the word that stood
  in its place ("Not published", "Not applicable") is kept in a sibling `<column>_state`. So `AVG()` cannot read a
  missing state as zero, and a query can still tell "no value" from "the source did not publish one" without
  parsing prose. That is D3 carried into SQL rather than abandoned at its edge.
- **Every column name is recoverable.** The naming rule is mechanical and keeps the unit marks a header carries
  ("Nozzle min °C" is `nozzle_min_c`), and `_columns` maps each SQL name back to its CSV header, position, declared
  type and role. A collision is an error, not a silent overwrite.
- **Two views carry the joins that matter.** `v_measurements` gives a measurement with its material, grade and
  source, and with the conditions that decide whether two values may be compared, because leaving those out of the
  convenient view is how a query ends up averaging a dry value with a conditioned one.
  `headlines_compiled` gives what a reader is shown, from `dist/db.json`.
- **How far a value sits from its neighbours (2026-09-21).** `measurement_z` holds every comparable point value
  once, grouped by material, property, unit, direction, the two states and whether the specimen was printed or
  moulded, with the group's median, its median absolute deviation (×1.4826) and the value's robust z. A bound, a
  retired duplicate and a value physics rules out are left out, and a group of one has no z. `v_property_spread`
  gives each group's count, grades, ends and the grade at each end; `v_measurement_z` gives each value with its
  grade, maker and Variant, which is the sweep's working list (`where abs(z) > 3 and variant = 'Not applicable'`).
- **No dependency.** `node:sqlite` is in the standard library from Node 24, which CI now pins and `engines` requires.

`test/sqlite.test.js` checks every table against `data/manifest.json`, that `_columns` reproduces each CSV header in
order, that no row carries both a value and a missing state, that the joined view loses nothing, and that
`measurement_z` holds exactly the comparable values and gives no z to a group of one.

Reversing it brings back the one-off script, and the temptation to read a column of numbers as text.

## D76. The standards a measurement names are a typed list, and a fragment is not a standard

> **In plain words:** The standards a measurement names are a checked list beside the source's wording, and a garbled fragment is never read as a standard.
> **Status:** in force; the fragment rows it counted were re-read, the last by m101 (2026-09-21), but for twenty whose sheets print the fragment themselves (OPEN-PROBLEMS §1).

`Standard / load` is the source's own words, and by this snapshot it held 301 spellings for a few dozen tests:
"ISO 527, GB/T 1040", "ISO527,GB/T1040", "ISO 527-2/50", "ISO 527 (testing speed 5 mm/min)", "D 638". Nothing could
be asked of it. Which Charpy results are comparable, how many products test to ASTM rather than ISO, whether two
sheets used the same flexural method: each was a question about a column that could only be read by eye. The one
typed thing ever taken out of it was the HDT load (D49), and that took a parser with twenty spellings in it.

- **Standards is a typed list beside the raw text.** The standards a row names, at family level, one spelling each,
  from `schema/vocab/standards.csv`. `normalize/standards.js` reads the raw text and the build stops where the two
  disagree (PARSE-MISMATCH), which is D49's shape.
- **Family level, because the part is a condition.** ISO 527-2/50 and ISO 527-1 are both ISO 527: the part and the
  specimen speed are conditions of one test, and the row's own columns carry the conditions.
- **A list, because a sheet naming two tested to two.** Each item is a vocabulary value the schema checks, as
  `properties.csv` Units already is. This is not a list stuffed in a cell; it is one fact with two values.
- **Nothing is inferred.** 2,307 of 2,645 rows name a standard. The rest name none and the column says so: 76 are
  Not published, 42 are a fatigue study's own staircase method, and about 80 are the melt-flow or water-absorption
  condition the sheet prints where a standard would go, which is what that sheet publishes.
- **A fragment reads as no standard, and is named as work.** 133 rows, across 56 sources and 56 materials, carry
  the tail of the Subject column and the head of the Testing Methods column from the original extraction
  ("Modulus", "ter Absorption Rate 25 °C, 55% RH"). They are a transcription defect. The fix is to re-read each
  source and correct the raw text (D35), not to infer a standard from the property. They are listed in
  [OPEN-PROBLEMS.md](OPEN-PROBLEMS.md) and in
  [audits/2026-09-17-model-freeze/](audits/2026-09-17-model-freeze/README.md), with what the cached sheets show.
  *(Closed on 2026-09-21 by m101, after sheets re-read in between had brought the 133 down; each row now holds the
  method its sheet prints, the twenty left print the fragment themselves, and OPEN-PROBLEMS §1 lists them.)*

Guessing would have been easy and would have looked like an improvement: every one of those rows has a property
whose usual standard is obvious. A standard nobody read off the sheet is exactly the kind of value this database
exists not to hold.

Reversing it brings back a column that can only be read by eye, and a parser per question.

## D77. The spread search sees a sample; the model still sees everything

> **In plain words:** To stay fast, one step of the estimate fit uses a fixed sample of at most 400 values; every other step uses all the data.
> **Status:** in force; extended by D79 (the block solve).

The estimate stage is 3.9 seconds of a 4.0 second build, and almost all of it is one thing: the search for the
model's spreads. Each search fits the Gaussian model about 330 times over a grid, the calibration refits it once per
fold on top, and a fit is cubic in the observations it sees, with three dense n×n matrices alive at once. At today's
146 to 313 observations per headline that is seconds. The Version 2 import multiplies observations by about ten, and
cubic is not a slope you wait out: the same search at 3,000 observations is hours, and runs out of memory first.

The search is also the part that needs the data least. It is estimating ten spreads, each a single number, from
whatever the pool shows; it is not predicting any material. So:

- **The spread search sees at most `fitting.spreadSampleMax` observations** (400). Every measured headline stays,
  because the spreads are judged against those. The rest are taken one material at a time in turn, so a polymer
  with two products is heard before a polymer with two hundred is heard twice. Sampling in proportion instead would
  drop the small material altogether, and the spread between materials is what such a material says most about.
  Where there are more materials than room, they are taken at an even step across the sorted identifiers, first and
  last included, because identifiers run in the order materials were added and so cluster by chemistry.
- **The order is by identifier, not random.** The same data builds the same bytes.
- **Everything else still sees every observation**: the posterior the estimates come from, the calibration that
  scales the ranges, and the screening back-test that decides where an estimate may screen. This samples what the
  spreads are searched on, not what the model is fitted to.

Measured on this snapshot by lowering the cap until it bit, since 400 is above today's counts:

| Cap | Build | What the spreads did |
|---|---|---|
| 400 (none today) | 3.9 s | baseline |
| 150 | 3.5 s | one spread of one headline moved one grid step; every calibration scale identical |
| 80 | 1.9 s | four spreads moved, stiffness's calibration scale 1.23 to 1.29 |

So the sample must stay a good multiple of the model's columns, which is what 400 is for: the kernel has about
thirty columns on this snapshot and grows with manufacturers and polymers, not with products.

This is the cheap half of the problem. The exact half, if the stage gets slow again, is to block the kernel by
chemical group with the shared columns solved as a low-rank correction, which changes no result at all. The trigger
is in the plan: any headline above 4,000 observations, or the estimate stage above five minutes. `npm run build`
prints each stage's time so the trend is visible rather than remembered.

*It got slow again on 2026-09-20, two batches after this was written, and the block solve was built: D79.*

Reversing it makes the build's cost cubic in a number the import is about to multiply by ten, for spreads that do
not change.

## D78. A limit a material's own grades publish is a floor for its shown range

> **In plain words:** An estimated range never goes past a limit the material's own data sheets publish.

The estimate model already treated a material's own published limits as observations at the limit with a declared
half-width: a bound a sheet prints (`> 16.5 MPa`), and a bound its own numbers imply (a yield stress under the
ultimate, HDT at 1.8 MPa under HDT at 0.45 MPa). The model's own words for the second half of that rule are "in
the material's own estimate it is also a soft limit with this spread, so no range crosses a limit its own grade
publishes".

A soft limit crosses. On the log scale the limit's spread is 0.02, and a range may sit about that far past it:
when SUNLU's PETG grades arrived, PETG's plausible range began at 49.7 MPa while PETG itself publishes 50.8 MPa.
A reader is then shown a range that says the material might be weaker than it has been measured to be.

- **The shown ranges are held to the material's own limits.** After the quantiles are taken, the plausible range —
  and with it the likely range and the centre — is held inside the strongest lower and upper limit the material's
  own grades publish. Nothing else changes: the limits still enter the fit as soft observations, so they still
  inform the family and still leave room for a product that measures beyond them to be read as one.
- **Only the material's own.** A family's limits, a resin reference's, a sibling grade's filed elsewhere: none of
  them holds a range. This is the rule the screening tests already state — an implied bound is the filament's own.
- **The likely range is held inside the plausible one.** They are quantiles of one distribution at two
  calibrations, and against a near limit the wider calibration piles mass at the limit and can lift its own lower
  end above the narrower one's: PVA's elongation came out likely 220-392 % inside a plausible 221-1610 %, which is
  not a range anyone can be shown. Where the two disagree the plausible range wins, because it is the one that
  carries the limits.

The alternative was to make the limits hard in the fit, which would have thrown away their spread and with it the
model's ability to learn that a maker's bound is sometimes conservative. This changes what is shown, not what is
learned.

## D79. The kernel is solved by block, and the estimates are the dense solve's

> **In plain words:** The estimate model's large matrix is solved one chemical group at a time, about nine times faster, with the same results to floating-point precision.

D77 said the exact half of the scaling problem, if the stage got slow again, was to block the kernel by chemical
group and solve the shared columns as a low-rank correction. It got slow again. `npm run scale` builds twice the
data and read 111 s in September's first week, 177 s after two batches, and 150.5 s after a Cholesky that loaded
each shared entry once instead of twice. Its budget was raised once, from 90 s to 150 s, with the measurement
written beside it, and not a second time: a budget raised the second time it is breached has stopped being one.

**The model's covariance is a sum of column terms, and almost every column belongs to one chemical group.** A
polymer identity sits in one group, a material has one identity, a product has one material — so the identity
columns, the material's own deviation and the product's own deviation are all inside a group. What reaches across
is few: the global mean, the fill classes, fill by morphology, the declared variant classes, the test houses and
the two melting-point covariates. On this snapshot that is 38 to 43 columns against 549 to 927 observations, in
18 to 20 blocks.

So K = D + UU', D block-diagonal and U narrow, and Woodbury solves it for the sum of the blocks' cubes plus a term
in the rank, instead of the whole matrix's cube. Measured on today's data, the sum of the blocks' cubes is 3.3% to
4.7% of n³. The estimate stage went from 36 s to 5.7 s, and `npm run scale` from 150.5 s to 16 s.

**Which columns are local is read off the data, not off the column's name.** It has to be: `v:grade:undisclosed
dense filler` is a product-level column by its name and spans two chemical groups in fact, because the same
undisclosed filler is declared on products of two polymers; and a manufacturer who sells into one group only is a
shared column by its name and local in fact. A column whose observations all fall in one block is local, every
other column is in U, and the solver knows nothing about polymers.

**It is not bit-identical, and this is the first of the three speedups that is not.** The other two — interning
the kernel's column names, and the two-column Cholesky — were the same operations in the same order, and each was
checked by building with and without it and finding the digest over every material's headline block unmoved. This
one adds the same products in a different order, and floating-point addition is not associative. Measured against
a dense solve of the same matrix: the likelihood agrees to 1e-13 relative, the posterior weights to 1e-8, a
prediction's mean to 1e-13, and a posterior variance to about 1e-12 absolute against a prior variance of 0.66.
`test/estimate-solver.test.js` holds all of that, on a fixture and on this database's own observations.

What that cost, in the build, is three numbers and the sentences quoting them:

- `tensileModulusXY`'s this-grade back-test counts 2 of 72 true values above the plausible range where it counted
  3, and `elongationXY`'s this-material back-test counts 3 of 49 below where it counted 2. One hold-out value per
  case sits exactly on its range boundary, and a twelfth-digit difference decides which side.
- `tensileStrengthXY`'s likely coverage reads 0.786 where it read 0.804, which is one held headline of 57.

**No estimate moved and no screen changed.** `build/snapshot/headlines.csv`, `gates.csv`, `templates.csv` and
`warnings.csv` are identical; `screening.csv` differs in those two counts and says `yes` on all 34 ends as
before. A range shown to a reader is three significant figures, and nothing came near moving one.

The alternative was to raise the budget again, which buys a factor of one and a bit and has to be done again next
batch. This buys a factor of nine and buys it in the shape of the problem: what it is cubic in is the largest
chemical group rather than the corpus, and a maker's new PLA grades grow that group while a new polymer adds a
block. `npm run scale` still has something to say, which is the point of keeping it.

## D80. A grade's declared load is a fill class of its own, and the grade declares it before the material does

> **In plain words:** A product declared heavily filled (metal-filled, foamed) is checked against the physical limits of that kind of filler, and the product's declaration comes before its material's.
> **Status:** in force; extended by D82, and by R095: a powder load the maker names is the grade Variant "declared dense filler", judged by the same dense windows, not a modifier ruling.

D57 and R078 say what to do with a filament denser than its named polymer can reach: keep it under that polymer
and declare the load as a grade `Variant`, so its values stay its own and a bronze-filled PLA cannot pull ordinary
PLA's estimates. The estimate model has read that Variant since it was written. The physics windows did not.

`fillOf` in `build/src/lint-rules.js` chose a window by the **material's** `Modifier / filler`, and a material
whose grades carry an undisclosed load is an unfilled material: colorFabb's BronzeFill is a grade of PLA, and PLA
is `Unfilled / unspecified`. So a published density of 3.9 g/cm³ was judged against a window drawn for unfilled
amorphous polymers and came out impossible, as did a flexural modulus of 9 GPa, a tensile modulus of 0.72 GPa and
sixteen others. Every one of them was a permanent accepted finding: a reviewer wrote the same sentence nineteen
times, and would write it again for every metal-filled grade the corpus still holds.

**The obvious fix is wrong, and it was measured.** Mapping such a grade to the existing `any` fill class was
tried on 2026-09-20 and made two rows worse. `any` is the window for a compound whose filler is not disclosed at
all, and it is drawn upward — its soft low assumes a possible fibre load, so it has a **higher floor** than the
unfilled window, not a wider range. A particle-filled grade's problem is the floor: powder interrupts a matrix
rather than reinforcing it, and Eryone's PLA-Lite at 0.72 GPa and Fiberlogy's mineral-filled PP at 14 MPa are
below what any window in the table admitted.

So the fill class says what the filler **does**, and two classes join `unfilled`, `fibre` and `any`:

- **`dense`** — a particle load the maker declares and does not name (grade `Variant` "undisclosed dense filler").
  At the loadings these filaments carry, 60 to 70 wt% for a metal fill, the filler decides the density and the
  matrix barely shows, so the density window is drawn from the filler: 0.9 to 4.0 g/cm³ soft, 8.0 hard, which is
  where a reading stops being a filament at all. The stiffness and strength windows are drawn the other way:
  floors below the unfilled polymer's, because that is what a particle load does.
- **`light`** — a foaming agent (material `Modifier / filler` "Foaming") or a declared lightweight additive
  (grade `Variant`). Its density is set by how much the printer foams it and its maker publishes a range rather
  than a value: colorFabb's LW-ASA prints 0.40 to 1.07 g/cm³ on one line. Stiffness falls with the square of
  relative density and strength roughly with it, so both windows fall with the density.

**The grade declares before the material does.** `fillOf` reads the grade's `Variant` first and the material's
modifier only where the grade declares nothing, which is the one thing that made the old reading wrong.
`windowFor` in `scripts/ingest/propose.mjs` takes the same class, so the reader that proposes a row and the lint
that judges it weigh it against one window.

**The back-test is that nothing moved.** The windows feed the lint and the reader and nothing else — no estimate,
no headline, no gate reads them — and `npm run build:diff` over the whole change reports **0 differences** in the
compiled database. What changed is the review queue: 24 accepted findings stopped occurring and were removed, and
no new finding appeared. Two rows that the `any` window would have flagged (a mineral-filled PP at 14 MPa, a
flexural strength of 18 MPa) are inside the dense windows, which is what those windows are for.

What this does not do is name the filler. A maker who declares the load in words — "loaded with copper particles"
— has named a filler `schema/vocab/modifiers.csv` has no value for, and that is a ruling and a modifier value, as
graphene and natural fibre were (R080). `dense` is for the load a maker declares and does not name.

*Extended by R095 (2026-09-21), the same day:* a powder load the maker names is not a modifier value either. It is the
grade Variant "declared dense filler", with the sheet's words for the load in Composition / filler, and `fillOf` reads
it as `dense`, as it reads "undisclosed dense filler". m161 (2026-09-25) applied it to Spectrum's three PLA Metal
grades.

## D81. Every grade has its own estimate, from the same model at its own row, calibrated at grade level, and deciding nothing

> **In plain words:** Each product gets its own estimate from the same model, shown for information and deciding nothing.
> **Status:** amended by D83: only a product without a comparable value of its own gets one, and with the representative grade gone every grade takes the bounds its own sheets publish.

*Amended by D83 (phase 4, 2026-09-25):* a grade estimate is attached only to a product without a comparable value of
its own; beside its own value it said less than the value and read as a second answer. The representative grade
retired with m137, so no grade takes the material's bounds: every grade takes the physical limits and the bounds its
own sheets publish (`build/src/estimate/grades.js`).

*Asked for by the owner on 2026-09-21: "hierarchical: polymer group, material, grade, all measurements".*

The model already was that hierarchy (D43, D79): a chemical group, an identity pulled towards it, the material's own
deviation and the product's own deviation, fitted to every observation of every grade converted to the headline.
What it published was one estimate per material, predicted at its representative grade's row. A material with a
hundred grades showed the reader one of them.

- **A grade's estimate is the same prediction at the grade's own row**: its formulation and its maker as test house
  (`build/src/estimate/grades.js`). There is no new hierarchy and no refit. A grade that publishes the headline pulls
  its posterior towards what it published; one that publishes nothing gets its material's latent and the spread
  between products. Grades that share a formulation share one posterior and name each other (`sharedWith`).
- **Calibrated at grade level.** A product scatters about its material more than a material about its family's
  prediction, so the material's scales do not hold for grades (strength covered 94 % where 80 % was claimed). Each
  grade that publishes the headline has those values hidden and predicted from the rest, through the material
  calibration's hold-out, with the observation's own noise in the denominator; the likely and plausible scales are
  set from where they fell, and checked with the material's tolerances (`EST-CALIBRATION`, "... grades").
- **The stop rule holds today for heat deflection.** A headline whose grade scales reach the calibration clamp ships
  no grade estimate: heat deflection's plausible scale reaches 3, because a product's own value scatters with its
  load, its annealing and its crystallinity more than the model can say. The report says so, and the snapshot shows
  none.
- **Bounds.** The representative grade takes exactly the material's bounds, so the two agree
  (`test/contract.test.js`); any other grade takes the physical limits and the bounds its own sheets publish, never a
  sibling's, and a variant grade is not held to its polymer's neat density.
- **It decides nothing.** Screening and the headlines read the material's estimate (D48, D59); `constraints.js`
  never reads a grade. `db.grades[].estimate[key]` is added by the estimate stage and absent from the core build.
- **EST-GRADE-OUTLIER** (informational until the sweep) names a grade whose own value, hidden, sits beyond three
  calibrated plausible deviations of its prediction; not where EST-OUTLIER already names the material's headline, and
  never for a grade that is its material's only evidence.

On the day it was built: density 759 hidden grade values (likely 80 %, plausible 95 %), modulus 236, strength 258,
elongation 305; heat deflection 382, not shipped. 1,050 grades carry an estimate, 1.8 MB of `db.json`. `npm run
build:diff` showed the addition and nothing under `db.materials`. The estimate stage costs 3 s more at 1x and the
2x check reads 59 s against a 150 s budget; the downdate in `predict()` is dense, and making it sparse is the lever
if that grows. Reversing it removes the grade cards and nothing else.

## D82. A property with thirty values has a window, drawn from physics and checked against the rows

> **In plain words:** Every property with thirty or more values has plausibility limits drawn from physics, and each value outside them is checked against its sheet.

*Extends D55 and D80.*

The physics windows (`plausibility_windows.csv`) are what turns a value no reader has questioned into a finding
somebody reads. Eighteen properties had them; six with thirty measurements or more did not, so a Raise3D
polycarbonate "decomposing" at 129 °C, below the temperature its own sheet melt-indexes it at, sat in the tables
unremarked. The sweep (PLAN-REMAINING 2.3) gave them windows: elongation at yield, mould shrinkage, continuous
service temperature, decomposition and crystallisation temperature, and tensile strain at strength (m135).

- **Physics draws the window; the rows check it.** Each bound is what the polymer class can do (a glassy polymer
  yields at 2 to 5 %, a thermoplastic that decomposed below 150 °C would decompose in the nozzle), written in the
  row's Basis with the range the data shows. The rows then tell whether the physics was drawn too tight: every
  value outside a soft bound was read against its sheet, two were flagged (D55) and four accepted with what makes
  each credible. A window that raised dozens would have been the window's fault, and none did.
- **The hard bound covers the softest grade of the class, not the typical one.** An elastomer-modified COC yields at
  150 % where a rigid one cannot pass 10. The window for a class holds every grade filed under it, so its hard
  high is the declared softer grade's; the soft high still catches the soft grade for a reader.
- **A window drawn from observation is redrawn when the observation changes.** W0024 and W0080 were drawn before a
  thirty-per-cent carbon PEEK was in the corpus, and their acceptances said so. With two such grades in, a fibre
  high-temperature polymer has its own tensile strength window (W0128) and the fibre modulus window reaches 22 GPa;
  the four accepted findings stopped occurring. Redrawing is not weakening: the bound moves to what physics allows,
  with the grade that showed it named in the Basis.

Properties with fewer than thirty values (fatigue life, compression, tear strength, abrasion, dielectric strength)
have none yet: a window drawn from nine rows is a guess about the next one. Reversing this removes seventeen windows
and W0080's redrawing, and the findings they raise; the two flags would need their own reasons to stand.

## D83. A material is the spread of its products, and passes when one of its products meets every requirement

> **In plain words:** A material is shown as the range of its products, and passes when at least one product meets every requirement on its own values.
> **Status:** amended by D88 (a printer maker's guide answers a product's silent print gate), D89 (a twin reads its sibling's values and recipe), D98 (a product's environment, stock and evidence are its own) D99 (a product is judged in one state it can be made in), D100 (a material fails only when every product fails; with one unresolved it is unknown) and D113 (a product's price may be converted from a foreign listing, and says so).

*Decided by the owner on 2026-09-25 (docs/GOALS.md); supersedes D8's refusal of a range and amends D2 and D37.
Built in re-center phases 1 and 2; the page reads it from phase 3.*

*Amended by D88 (2026-09-25): where a product's own sheet is silent on a part of its print gate, its material's
printer maker's guide decides it, labelled as the guide's.*

*Amended by D89 (2026-09-25): a product whose sheet prints its sibling's table reads the sibling's values and recipe
where its own are silent, so it is judged, not untested.*

Each material showed the values of one hand-picked product, its representative grade. At a hundred materials with a
product or two each that was a fair summary. At 1,119 products it was not: PLA's 198 products were judged by one of
them, 80 % of the values never reached a verdict, and the V2 import changed one verdict among the original materials
across the six templates. Engineering selection (Ashby) screens a material as the range of what it can be, then asks
which products are that; so does this now.

- **A product's values are chosen by rule** (`build/src/products.js`): the tests a headline selection passes, less the
  representative grade, at one of D84's two levels, and among several candidates a fixed order (comparable, printed, as
  printed, dry, the product's own sheet, the headline's first property, a point, the lowest ID). A `headlines.csv`
  selection pins its product's value. On the day it was built the rule alone reproduced all 477 selections.
- **A material's row is the spread of its products**: the procurement products that are not declared variants (D57),
  how many publish a comparable value, their range, median, quartiles from four values, and the typical product
  nearest the median; values published without direction or load, and variants, are counted apart. It is the spread
  of different products, never uncertainty about one, and it is labelled that way: PEBA's 7.5, 25 and 30 MPa are three
  products, which is what D8 feared a range would hide.
- **A verdict is judged product by product** (the product view in `app/js/engine/products.js`, `evaluateProducts` in
  `app/js/engine/constraints.js`): each product is judged on every requirement at once, through a view of the material
  with that product's values and its own print recipe, so D37's concern (a property set for a formulation that does
  not exist) cannot reach a verdict. A material passes when one product passes, and says whether all the products that
  could be judged pass or only some; it fails when none passes and one fails; it is unknown when none could be judged.
  A product with no data is counted as untested and does not count against its material. Print gates are the
  product's own: a product with no profile is unknown on them, never a pass.
- **The material's estimate stands in only where no product publishes a comparable value**, which is the case it was
  calibrated for (D43). A silent product beside siblings that publish is untested, not estimated.
- **Performance indices are computed per product** and a material ranks by the median over its passing products,
  never from medians of different products.

What it did, across the six templates in Include uncertain: 13 materials went from FAIL to PASS (one of their
products meets every requirement the representative did not), 8 from UNKNOWN to PASS, and 36 from UNKNOWN to FAIL
(the representative grade was silent and every product that publishes fails); no PASS was lost (the phase 2
comparison, since folded into `build/snapshot/templates.csv`). Reversing it returns the representative grade as the only
answer, and the data the import brought in stops reaching a verdict again.

**Phase 4 (m137, 2026-09-25): the representative grade retires.** Nothing selects a material's number any more.

- The build derives a material's headline from its products: their median, range and count, and the typical product
  nearest the median; one product's value is the material's and cites its measurement. A material whose every product
  is a declared variant (PP Lightweight) is its variants. The page shows what the build gives, with no transform at
  boot.
- `materials.csv` has no Representative grade column, and `headlines.csv` only pins one product's value where the rule
  chooses wrongly, with a Reason. It holds none: its 477 value rows (every one the rule's own choice) and 16 context
  rows are archived, with each material's representative grade, in
  `docs/audits/2026-09-25-re-center/retired-representative-picks.csv`, and named in `data/review/removed-records.csv`.
- The estimate stage follows. Calibration and the screening back-test hide each material's typical product's value.
  A material's estimate exists only where no product publishes comparably; with one product it is that product's, and
  with several it predicts an unmeasured one of them, which carries the spread between products that a prediction at
  the material's mean left out. A grade estimate is attached only to a product without a comparable value of its own.
  The unstated-load bracket went: no material headline has an unstated load, and D84 counts such values apart.
- Heat deflection does not apply to an elastomer by its headline definition (D56), so no elastomer product's HDT
  decides; TPC-ESD's hand-picked 50 °C had.

What it did, across the six templates: Strict moved nothing; Explore moved one answer (TPC-ESD, in Warm environment,
from FAIL to unknown); Explore with estimates moved nineteen. Thirteen screens lifted, because an estimate that stands
in for every product of a material is wider than one describing a single product (PA66, PA612, PET, PBT, PC-PTFE,
PE-GF, PLA-GR, PLA-EC, ABS-AF and ASA-AF for a 5 GPa stiffness; PLA-EC for 3 GPa; PETG-PTFE and PET-LW for 80 °C);
four were added (PP for 2.5 and 5 GPa, SAN and PE-GF for 100 % elongation); TPC-ESD is screened by not applicable; and
TPU-CF gained a second reason.

## D84. Two evidence levels: comparable decides; a value published without its direction or load is counted apart

> **In plain words:** Values with a stated direction and load decide by default; values published without them are shown and counted apart, and decide only when asked.
> **Status:** amended by D92 (the layer strength takes no value published without a direction; an impact headline also sets a notch and a test temperature), D94 (a headline may name its test standard, and a value naming only others is no value of it), D95 (a bar printed off the product's recipe is no product value) and D99 (comparable is a screening policy: a verdict names the conditions it admitted unstated, and an annealed or conditioned value decides only in its own state).

*Decided by the owner on 2026-09-25 (docs/GOALS.md). Built in re-center phases 1 and 2.*

*Amended by D92 (2026-09-26): a headline says what a value with no stated direction is to it. For the XY headlines it
stays as published; for the layer strength, along Z, it is no value at all. And a headline may set a notch and a test
temperature, which a value must meet as it meets the direction and the load.*

*Amended by D94 and D95 (2026-09-27): a headline may name its test standard, and a value whose standards name others
and not this one is no value of it (notched Izod, ISO 180); and a bar a sheet prints at a setting the product is not
meant for (Specimen type "Printed off the product's recipe") is no product value at either level.*

A value is **comparable** when it is what the headline says: a printed or unstated specimen, the headline's direction,
dry or unstated, at the headline's load. It is **as published** when the source leaves the direction or the test load
unstated. Such values are common (half the modulus rows state no direction) and read like moulded bars: of PLA's
products, 27 state an XY stiffness and none reaches 3 GPa, while 30 of the 46 that state no direction do.

- Comparable values decide by default. An as-published value is shown, counted apart in the material's spread, and
  named in the reason ("published 3.4 GPa without stating the test direction, so it is not compared"); a scenario
  that admits such values lets it decide.
- What a headline is not (a Z, film, filament or moulded value, a conditioned or implausible one, one annealed where
  the product publishes it as printed, one at another load) is no product value at either level, and stays evidence.
- A heat deflection value without its load is as published; phase 4 retires the unstated-load bracket this replaces.

Reversing it either mixes moulded-looking values into printed ones, or hides them; both were tried, in effect, by the
representative grade, which took whichever one somebody picked.

## D85. The record tier: what a source publishes is kept as printed, in the database only, and decides nothing

> **In plain words:** Everything else a source prints is kept as printed in the query database only and decides nothing; makers' printing advice is the one part the page shows.

*Decided by the owner on 2026-09-25 (docs/GOALS.md); replaces R002 and R003's "transcribe everything, to the decision
standard" with "record everything, verify what decides". Built in re-center phase 6, lane 1.*

R003 asked for everything a sheet publishes, and every fact that entered went through the decision tier's checks:
typed columns, a plausibility window, a signed review, a ruling where the product's identity was unsettled. At that
cost per fact the reader kept only what fitted a known number slot. It skipped 39,468 distinct lines on 1,499
documents (a linear shrinkage, an insulation resistance, storage notes), and the values it did read on the 74
documents deferred for their identity alone were never used. All of it sat in 75 MB of proposal files, once per batch
that re-read a document, and the cached text of every fetched document sat in `.cache/`: nobody could ask which
sheets mention annealing.

- **Two tiers.** The decision tier holds the values that pass or fail a product and its print requirements, and
  keeps every strict check. The record tier holds everything else a source publishes, as printed, with its page. It
  attaches to the source, and to the product when the source's product is settled. It needs no ruling and no per-row
  review.
- **Where it lives: `dist/h2c.sqlite` (D75), derived when the file is written** (`scripts/data/record-tier.mjs`).
  Nothing is stored under `data/tables`, because every row is computed from committed files.
  - `source_facts` has one row per distinct line (document, page, text) the reader read without it becoming data.
    `skipped` lines carry the reader's reason. `unapplied` lines are rows the reader made on a document the database
    cites no source for: deferred, held, or a copy. Each fact carries the document's digest and ledger key, the
    source the ledger registered it as, that source's active grades, and the known property the line names.
    That property is found by a heuristic, and the row says which rule found it: the reader's own naming, or a
    `properties.csv` name found in the words.
  - `documents` has every document the ledger, a proposal or `sources.csv` names by digest.
  - `documents_fts` is an FTS5 index of the cached text, one row per page. It is built only where `.cache/text` is
    present and is never committed, because the text is the makers'.
- **What it is not.** It never enters a verdict, an estimate, a headline or a bound. The build does not read it, the
  page does not ship it, and writing it leaves `dist/db.json` unchanged. A fact is not a measurement: it has no typed
  column, no window and no review. If one turns out to decide a verdict, it is re-read and entered in the decision
  tier the normal way. A row a reviewer rejected is left out, because a rejection can mean the page does not print what
  was read. The one planned exception to "database only" is makers' know-how, shown in the panel (lane 3).
- **Light checks.** `test/sqlite.test.js` checks that:
  - each line is held once;
  - every skipped line is a fact, and every fact is a line its proposal read on that page;
  - a registered document's facts carry its source and grades;
  - a named property is one the registry keeps;
  - the report's own example is found by its words and page;
  - `dist/db.json` is unchanged;
  - where the cache is present, the index holds every cached page.

  The only other check is the plan's sample: a person reads 30 to 50 rows per lane against the page image (REPORT,
  phase 6).

On the day it was built it held 42,016 facts: 39,382 skipped lines and 2,634 unapplied rows. They sit on 1,499
documents, 1,117 sources and 951 active grades of 124 materials, and every one of the 74 documents deferred for
identity is among them. The index held 4,482 pages of 2,036 documents. Reversing it has two outcomes. The facts can go
back inside the proposal files, and the team again chooses what to verify without knowing what exists; lane 4's new
properties are chosen from this table. Or they are brought to the decision standard, which is the per-fact cost that
made the reader skip them.

**Makers' know-how: the planned exception, built in lane 3 (m140, 2026-09-25).** A maker's statements about printing
and using its product are the one part of the record the page shows, in the product panel, and they are stored where a
reader can edit them, in `evidence.csv` (Domain "Makers' know-how", a topic in the non-filterable `know-how` category),
rather than derived into the SQLite file, because each one is a reading somebody chose to keep.
- **Shown, never screening, by construction.** `build/src/know-how.js` moves them out of `db.evidence` into
  `db.knowHow`, so no criterion, polymer-level precedence (D64), coverage domain or count can see one (the compiler's
  own environment and category tallies take only filterable categories), and a scenario cannot name their category. A test runs the six templates with them put back
  beside the evidence and requires every answer unchanged.
- **The maker's words, on the page named.** Spaces normalised and full-width punctuation written in ASCII, nothing
  else; the migration re-reads each on its cached, hash-checked page. A maker's product page counts, labelled by its
  source class as marketing text.
- **A silent sheet is a state, not a hole.** Collected, sheet silent (maker site not yet searched), searched with
  nothing published (dated), or no document read, per product and per material, with the same states for the recipe's
  chamber, drying and annealing: derived (D74) from the statements and from `know_how_reads.csv`, the one thing that
  is not derivable, which documents were read. A generated worklist queues the silent ones for a maker-site search.
- **Light, like the rest of the tier.** Agents read the candidates and chose what to keep; no per-row signed review;
  a sample of 50 read against the page.

Reversing it puts the statements back among the evidence, where a later category change could let one decide, or
drops the reads table, and a silent sheet and an unread one look the same again.

## D86. A maker's product line is a product, TPU is read by hardness, and a product moves by its MaterialID

> **In plain words:** Bambu's one-product lines became products of their real material, TPU is split by Shore hardness, and a product moves between materials keeping its identifiers.
> **Status:** amended by D106 (m223): the "hardness not stated" class is a family entry, and a TPU that states no rating waits for its maker's; extended by D123 (two grades of one product become one, the records keeping their IDs, as a moved product's do).

*Decided by the owner on 2026-09-25 (re-center phase 5, docs/GOALS.md). Built in m141.*

The canonical list was Bambu's catalogue, so fourteen Bambu product lines and eSUN's PLA-Lite were materials of their
own, one product each, beside a PLA, PETG and TPU that already held every other maker's matte, tough, translucent,
high-speed and hardness-named products. The tree was inconsistent (D44 says a product has one home, the most specific
material it is), and the only sampled prices sat on those lines, so plain PLA and PETG had none.

- **The eleven PLA, PLA Silk and PETG lines are products of the material they are.** Each old row stays, as an alias
  (Scope Family entry, D44), so its name still finds the product; its coverage findings are superseded by Not
  applicable rows, and it keeps its H2C listing and family-context citations.
- **TPU is read by the Shore hardness its makers rate it**, for every maker, as the owner chose over one TPU: 87A or
  softer, 88 to 92A, 93 to 97A, harder than 95A (98A and above, and Shore D), and hardness not stated. The rating is
  the one in the product's name, else the one its sheet publishes, pinned per product
  (`scripts/migrate/m141-product-lines-and-tpu-hardness-tpu-hardness.csv`); a product that shares its formulation with
  another (R053) shares its class, and products the makers rate differently are not one formulation, whatever their
  sheets print. TPU is a family entry over the five, and Bambu's four TPU rows aliases of their class. A flexible part
  is chosen by its hardness, and a range from 60A to 75D read as one material's.
- **A product moves by its MaterialID** (`scripts/data/records.mjs`, `moveGrade`): the grade, every record filed under
  it and the printing citations of its own profiles and evidence change material; every ID stays. Until m141 a move
  retired the grade and copied it and every record under a new ID (m25, m113, m120), which for 85 products would have
  duplicated 1,502 records and broken every link to them. A GradeID now keeps the number of the material it was first
  filed under; nothing reads the number.

What it did, across the six templates: PLA, PLA Silk and PETG pass the Indoor prototype (their products now carry the
sampled prices; TPU's hardness-not-stated class stays unknown), PETG passes the Lightweight structure on Bambu PETG
Basic, and TPU answers per class (the 95A class passes the Flexible component on 7 of its 25 products, the 90A class on
4 of 12). The fifteen product-line rows leave the results; their products answer inside their materials. Reversing it
brings back one maker's catalogue as the taxonomy, and a TPU that is every hardness at once.

## D87. A family's "polymer not stated" home, and sintering filaments are recorded, never candidates

> **In plain words:** Products whose sheets name only a family get a labelled "polymer not stated" material, and metal and ceramic sintering filaments are recorded but never candidates.
> **Status:** amended in phase 5, part 5 (m146): exclusion is recorded in Scope alone; amended by D106 (m223): a product is searched beyond its sheet before it enters a home, the homes say the maker does not disclose the polymer, and the PLA family's are named PLA blend.

*Decided by the owner on 2026-09-25 (re-center phase 5, docs/GOALS.md, decisions 2 and 3). Built in m142 and m143.*

Seventy-four data sheets sat deferred for their identity. Fifty name only a family ("colorFabb PA Neat", "eSUN TPE
83A", a flexible filament rated only by its Shore hardness), and a family owns no product (D44), so none had a home;
twenty-four waited on an owner ruling (FiberFlex, GreenTEC, WearX, the styrenic elastomers, PI, PEKK, and metal and
ceramic filaments). Their values were read and never used.

- **A family gets a "polymer not stated" material**, one per family entry and declared filler the sheets need: Nylon,
  Nylon-CF and Nylon-GF (members of PA, PA-CF and PA-GF), TPE (a member of TPE), and for the undisclosed
  bio-copolymers the owner named the PLA family, unfilled and with carbon fibre. It is shown and judged like any
  material and labelled in its name. It is **not estimated** (Estimate identity Not applicable): the model identifies a
  material by its polymer, and these products share none that anyone states. A sheet that names its polymer after all
  is filed under that polymer's material, never the home (R167).
- **What files a product there is a ruling**: an identity ruling on the family's word (R168 to R170: "nylon" and "pa"
  are PA, "tpe" is TPE, which the homes take as their base polymer), or a `material` ruling that names the home for
  a product whose words name no family (FiberFlex, GreenTEC). A `material` ruling also reaches a material whose polymer
  has no row (PEKK, the sintering filaments) and a TPU class the rule would pick wrongly; a family entry is never one.
- **A headline none of a home's products publishes is not published**, and judged unknown as an untested product is
  (D83). HEADLINE-BLANK stays an error for a material that names an Estimate identity; one declared not estimated lists
  its blanks under HEADLINE-UNESTIMATED, at info.
- **Heat deflection names its families.** It applied through Morphology, and a Flexible Elastomers material with no
  polymer row (TPS, the TPE home) has Morphology "not modelled", so FiberFlex's 70 °C and purefil TPS 40D's 110 °C
  would have decided heat requirements. hdt045 now applies to the rigid families as well as the three morphologies,
  which leaves out Flexible Elastomers and the sintering filaments; no material that existed before changed.
- **The styrenic elastomers are TPS**, a material of their own under Flexible Elastomers with no polymers.csv row
  (R196, superseding R056, which had filed them under TPE, a family entry).
- **Metal and ceramic sintering filaments are recorded and never a candidate**, as PEEK is: Scope and H2C status
  Excluded, a family of their own, one material per metal or ceramic (316L, silicon carbide, alumina). The printed
  part is a green part that must be debinded and sintered elsewhere, and its properties are the sintered metal's, so
  the sintered values are left to the record tier (R187).

*Amended in phase 5, part 5 (m146, 2026-09-25):* exclusion is recorded once, in Scope. H2C status "Excluded" was Scope
again, kept in step by EXCLUSION, and left the vocabulary: the sintering filaments are Theoretical (their sheets print at
170 to 250 °C on a 40 to 120 °C bed), and the industrial high-temperature materials take "Exceeds H2C limits".

What it did (batch b34, m143): of the 74, 44 entered as 38 products (9 in Nylon, 1 each in Nylon-CF and Nylon-GF, 12
in TPE, 5 in the PLA family and 2 with carbon fibre, 2 in TPS, 4 sintering filaments, WearX in PA6 and MD Flex in TPU
harder than 95A), 6 were registered to products already recorded, 2 are not data sheets, and 22 are deferred with the
gap named. purefil's GreenTEC Pro and Spectrum's GreenyHT, filed under PLA from their sheets' comparison with PLA, moved
to the PLA family's home. Across the six templates the homes add 60 answers, 12 of them PASS: the Nylon home passes the
Lightweight structure on CreatBot Ultra PA, the PLA family's homes pass the Warm environment on 3 of 7 and 1 of 2
products, and TPS passes the Flexible component on Ultrafuse TPS 90A. PLA keeps its answers with two products fewer.
Reversing it sends the 44 sheets back to deferred, and a family-only product has no home again.

## D88. Where a product's own sheet is silent, a printer maker's guide decides its print gate, labelled as the guide's

> **In plain words:** Where a product's own sheet says nothing about a part of how to print it, Bambu Lab's Filament Guide for its material type answers instead, always labelled as the guide's; the product's own sheet always wins, and the guide cannot settle a chamber it gives no temperature for.
> **Status:** amended by D90 (for the nine types the guide asks an enclosure for, its enclosure is the H2C's heated chamber); amended on 2026-09-27 (m209): the revision read is the one Bambu Lab's guide page links (B-GUIDE, eighteen types); its label reworded by D124 ("from Bambu Lab's Filament Guide for …").

*Decided by the owner on 2026-09-25 (docs/GOALS.md, phase 6, decision 1). Built in re-center phase 6, lane 2 (the
owner's decisions), m150.*

*Amended on 2026-09-27 (the owner's answer of that day; m209): the research package of 2026-09-26 reported that Bambu
Lab's Filament Guide page links the ".../250123/..." file, and the page, loaded in headless Chrome, does: its one link
to a filament guide PDF hashes to B-GUIDE's digest. So B-GUIDE, eighteen types in words (Required, Optional), is the
revision Bambu Lab publishes, and `print_guide.csv` rows PG016 to PG033 read it. ASA-CF and PC FR, which only it heads,
are mapped to their materials; TPU for AMS is not, because its material is an alias. The 15-column copy (R-BAMBU-GUIDE-202609),
still served at a token URL no page links, keeps its rows PG001 to PG015 as a record that no material reads. Below,
"current revision" and "January 2025 revision" are m150's reading of the two copies, which this replaced.*

*Amended by D90 (2026-09-26): where the guide asks for an enclosure, its row declares the chamber "enclosed", which
the H2C's heated chamber meets, so a silent product of those nine types is within on the chamber, labelled as the
guide's. "What it cannot decide" below is the reading this replaced.*

Since D83 a product's own profiles screen it, and a part its sheet leaves out is unknown. After lane 2 (m136) and the
twins (D89) that was still most of them: of 1,131 products, 286 were unknown on the nozzle, 389 on the bed and 818 on
the chamber, although the maker of the printer publishes what each common filament type needs.

- **The guide is a registered source, re-read from its bytes.** Bambu Lab's Filament Guide is one page: a column per
  Bambu filament type, a row per property or requirement. Its current revision (R-BAMBU-GUIDE-202609) and its January
  2025 revision (B-GUIDE) were re-fetched on 2026-09-25, and each matched the SHA-256 recorded when it was registered.
  Per type it states a nozzle temperature, a bed temperature per build plate, whether to print with an enclosure, the
  nozzle sizes and materials, whether and how to dry the filament, and an annealing schedule. It states no chamber
  temperature.
- **It is data.** `print_guide.csv` has one row per type the current revision heads, in a print profile's columns: the
  guide's words, the typed columns the profile parsers read from them (PARSE-MISMATCH checks them as a profile's), the
  source and the column and rows each cell stands under. The current revision answers "Print with Enclosure" with a
  drawn tick or cross, written as its glyph; m150 reads each mark by its fill colour in its cell, and checks it against
  the January 2025 revision, which prints Required for every tick and Optional for every cross on the types both carry.
  Every other cell m150 finds by its column heading and row label on the hash-checked page. Two wordings reached the
  parsers: a lone tick or cross as the whole answer to an enclosure question, and the guide's nozzle column ("All
  Size/Material" is any nozzle; "Hardened Steel / Stainless Steel" is stated and settles nothing about brass).
- **It speaks for a material only where it names that material type** (`print_guide_materials.csv`, a reason each,
  reviewed by an agent): its PC is our PC, never PC FR, PC-CF or a PC blend; its PETG HF is PETG, which Bambu's PETG HF
  is a product of (D86); its TPU 95A HF is the TPU 95A class. Fifteen types, fifteen materials. A material the guide
  does not name has no guide, and its silent products stay unknown.
- **What it decides.** Where a product's own profiles, and then its twin's (D89), say nothing on a part of its print
  gate (nozzle window, bed window, chamber, enclosure, hardened nozzle), the product reads its material's guide row, and
  the gate is judged as a profile's would be. A product's own statement always wins, stricter or looser, and words its
  sheet prints that the parser cannot read count as a statement. A chamber and an enclosure are one question: a sheet
  that recommends an enclosure has spoken about the chamber.
- **What it cannot decide.** The chamber, for the nine types it asks an enclosure for (ABS, ABS-GF, ASA, PC, PAHT-CF,
  PA6-CF, PA6-GF, PPA-CF, PPS-CF): it gives no temperature, and an enclosure is not proof that 65 °C is enough, the rule
  every profile follows; their silent products stay unknown, with a reason that says so. For the six it says need none,
  the chamber is cleared as a sheet's "not necessary" clears it. Drying and annealing are a treatment: the guide's drying
  line is recorded and fills nothing. TPU's nozzle line settles no hardened-nozzle question.
- **Labelled everywhere it is shown.** A part read from the guide carries `print.from[part]` with the guide row, the
  source and the label "per Bambu Lab's Filament Guide for PC, not this maker's sheet" ("not this product's data sheet"
  for Bambu Lab's own products); the label is in the gate's reason, so the result panel and the exports carry it, and in
  the product's print card; the products export names it in "Recipe read from"; the Printing tab shows the guide row
  itself. A product's know-how state (D85) reads only its own recipe, so the maker-site worklist is unchanged.

What it did: 507 products read a part of their print gate from the guide (nozzle 126, bed 175, chamber 244, enclosure
446, hardened nozzle 417). Products unknown on the nozzle fell from 286 to 160, the bed from 389 to 214, the chamber from
818 to 574. Only Warm environment screens on print gates: PLA-CF went from FAIL to PASS (3DXTECH's CarbonX CF-PLA, heat
deflection 91 °C, its sheet silent on the chamber), and PLA passes on 8 products where it passed on 4; the material
UNKNOWNs stayed at 66. Of those, 24 have a product that meets everything but the chamber, and for PC (11 products) and
PPA-CF (6) that is the guide's enclosure without a temperature: whether Bambu's own "print with an enclosure" is enough
for the H2C's 65 °C chamber is a question for the owner, not a reading. Reversing it sends 507 products back to unknown
on the parts their sheets leave out.

## D89. A twin reads its sibling's values and print recipe where its own are silent

> **In plain words:** A product whose sheet prints the same table as a sibling of the same material shows the sibling's values and print recipe where its own are missing, labelled "data sheet shared with …" (worded "same sheet as …" until D124), and counts as a product in its material's range.
> **Status:** In force; amended by D119 (a twin reads its own maker's sheet before another maker's reprint of the table); extended by D123 (two grades of one product are one grade, not twins); its label reworded by D124.

*Decided by the owner on 2026-09-25 (docs/GOALS.md, phase 6, decision 2). Built in re-center phase 6, lane 2 (the
owner's decisions).*

R053 records a table once when several products of one material print it: a grade each, citing its own sheet, the
values on one of them, and a Shared formulation key saying the products are one formulation. Under D83 the others
were products with no data. Forty-seven active products were such twins: untested on every requirement, unknown on
every print gate, and never counted among the products that pass, although each one's own sheet prints the numbers.

- **A twin is derived, not stored**: another active procurement product of the same material under the same Shared
  formulation key (`build/src/products.js`). A key never spans two materials (FORMULATION-KEY-SPANS-MATERIALS), so a
  product that reprints another material's table (R166) has no twin and reads nothing, as the owner decided.
- **Values.** Where a product has no value of its own for a headline, it reads its twin's own value: the product that
  holds the values first, then by ID, never a value the twin itself read. It cites the sibling's measurement, carries
  `from: { origin: "twin", gradeId, label: "same sheet as <maker product>" }`, and HEADLINE-CITATION accepts a
  measurement of another product only in that shape. A pin is the sibling's and is not carried. A price is never read:
  it is what the product's own listings cost.
- **Recipe.** Where a product's own profiles say nothing on a part (nozzle, bed, chamber, enclosure, hardened nozzle,
  drying, annealing), it reads its twin's own. "Nothing" means no reading and no words the parser could not read: what
  a product's own sheet says always stands, stricter or looser. A chamber and an enclosure are one question, so a sheet
  that recommends an enclosure has spoken about the chamber. Each part read so is named in `print.from` and in its
  gate's reason. Know-how states (D85) read only the product's own recipe.
- **The spread counts each twin.** A twin is a product sold under its own name, and its own sheet prints those values,
  so it counts in n, the median, the range and the quartiles, as its sibling does; the spread says how many
  (`spread.twins`) and the value's popover says so. A twin that reads a declared variant's sheet is set apart with it
  (D57): SUNLU's High Speed Matte PLA prints PLA Lite's dense-filler table. Where a twin ties the product whose sheet it
  reads, the typical product is that product. The estimate model is unchanged, since it reads measurements by
  formulation key (a table recorded once is one observation, D12); it moves only through the materials' medians and
  typical products, and a twin's grade estimate goes because the twin now has a comparable value (D81).
- **Shown everywhere a value is**: the drawer's product values and print card, the engine's reasons, the products
  export (Values read from, Recipe read from), the chart's product points and the spread's popover.

What it did: 46 of the 47 twins read 160 values (Prusament PETG Recycled's sibling publishes only a hardness), and 42
read a part of their recipe (nozzle 34, bed 36, chamber 15, enclosure 17, hardened nozzle 12, drying 19, annealing 1).
Across the six templates no material's answer moved; the products that pass rose in five of them (in Strict: Outdoor
structural part 36 to 38, Lightweight structure 57 to 59, Warm environment 58 to 59, High-stiffness fixture 28 to 30,
Flexible component 29 to 30), and the untested fell by 1 to 8 in each. Fifty material headlines changed their count, and some
their median: PLA Silk's tensile strength 47.4 to 50 MPa on 17 products where it was 10, four of them SUNLU's Silk
PLA+ packs. 119 estimate ranges moved with the medians; no screen moved. Reversing it sends 47 products back to
untested, and the count of products that pass undercounts every maker that sells one table under several names.

## D90. Where Bambu Lab's guide asks for an enclosure, the H2C's heated chamber meets it

> **In plain words:** For the nine material types Bambu Lab's Filament Guide says to print in an enclosure, a product whose own sheet says nothing about the chamber counts as printable in the H2C's heated chamber, labelled as the guide's; a maker's own chamber statement always wins, even one the H2C cannot reach.
> **Status:** in force; it amends D88; extended by D93 (a maker's own "enclosure needed" or "recommended", with no temperature, reads the same for the nine types); extended on 2026-09-27 to ASA-CF and PC FR, the two types the guide Bambu Lab links also asks an enclosure for (m209).

*Decided by the owner on 2026-09-26 (docs/GOALS.md, "Decided on 2026-09-26, for phase 6", decision 1); amends D88.
Built in m165.*

*Extended on 2026-09-27 (the owner's answer of that day; m209): the revision the build now reads (D88, amended) prints
"Required" for eleven types, ASA-CF and PC FR besides the nine. Their rows declare the chamber "enclosed" with the same
Parse review, so a silent ASA-CF or PC FR product is within on the chamber, labelled as the guide's: ASA-CF passes Warm
environment on 6 products where it passed on 3. D93 still names the nine.*

*Extended by D93 (2026-09-27): a maker's own profile that asks for an enclosure and prints no chamber temperature, for
one of these nine types, may declare its chamber "enclosed" too, and reads as within in the maker's words. "Only a
printer maker's guide may say it" and the twenty-three left unknown, below, are the reading this replaced.*

D88 let a product whose own sheet, and its twin's, say nothing on its print gate read Bambu Lab's Filament Guide for its
type. For nine types (ABS, ABS-GF, ASA, PC, PAHT-CF, PA6-CF, PA6-GF, PPA-CF, PPS-CF) the guide draws a tick under
"Print with Enclosure", which its January 2025 revision prints as "Required", and gives no chamber temperature, so
those products stayed unknown on the chamber: an enclosure is not proof that 65 °C is enough, the rule every profile
follows. The owner ruled that for these types it is. The guide is written for Bambu Lab's own enclosed printers (its
drying rows name the X1 Series), and the H2C is one of them, with a heated, enclosed chamber to 65 °C.

- **It is data, a declared state.** Each of the nine rows of `print_guide.csv` declares Chamber state `enclosed`
  (requirement required) and says why in Parse review; its raw Chamber °C stays "Not published", because the guide
  prints no chamber row. The chamber gate reads `enclosed` as within the H2C, with the reason "Asks for its printer
  maker's enclosure and states no temperature; the H2C's heated, enclosed chamber (65 °C) is that enclosure", followed
  by the guide's label, in the result panel, the print card and the exports. Nothing in the code names a type.
- **Only a printer maker's guide may say it** (PROCESS-ENCLOSED). A profile is a maker's own sheet: one that asks for
  an enclosure without a temperature has not said 65 °C is enough, and it keeps Enclosure state recommended and an
  unknown chamber. A guide row may declare `enclosed` only where it asks for an enclosure, and only for its chamber.
- **A maker's own chamber statement always wins,** stricter or looser, as D88 has it: the guide is read only where the
  product's own profiles and its twin's say nothing on the chamber or the enclosure. Sixteen products of these types
  state a chamber above 65 °C on their own sheets and keep that reading: PolyMax PC FR, PolyLite PC Transparent and
  Nanovia PC V0 (100 °C), Nanovia ABS EF and ASA (90 °C), PolyLite and PolyMax PC (80 °C recommended), and nine windows
  the H2C reaches only in part, among them Bambu Lab's own PPA-CF (50 to 80 °C) and PPS-CF (60 to 90 °C) sheets.
  Twenty-three whose own sheet, or twin's, asks for an enclosure and states no temperature stay unknown.

What it did (m165): 123 products (and two study grades) read the chamber as within from the guide, labelled as its:
ABS 44, ASA 31, PC 15, ABS-GF 10, PA6-CF 6, PPA-CF 6, PAHT-CF 4, PA6-GF 4, PPS-CF 3. Products unknown on the chamber fell
from 574 to 451. Only Warm environment screens on the chamber: PC (FAIL) and PPA-CF (UNKNOWN) now pass, PC on 7 of its
26 products and PPA-CF on 3 of 9, and the products that pass rose from 64 to 117 (ABS 4 to 19, ASA 3 to 17, ABS-GF 2 to 8, PA6-GF 3
to 7, PA6-CF 4 to 7, PAHT-CF 1 to 2). Reversing it sends the 123 products back to unknown on the chamber, and PC and PPA-CF
to their earlier answers. Revisit it if the owner reads the sixteen higher statements, Bambu Lab's own among them, as
saying the guide's tick needs more than 65 °C for a type.

## D91. A tensile value labelled only by a ±45° raster is an XY value

> **In plain words:** A test bar a data sheet describes only by its ±45° print pattern is read as printed flat (XY), because that is how makers usually print their XY bars; where the sheet names its own XY bar beside it, the ±45° one stays apart.
> **Status:** in force; it supersedes the reading of a ±45° raster that m33 and lane 4 (m155) applied, for tensile values a sheet labels by that raster alone; extended by m199 (2026-09-27): the ±45° tab's "Ultimate strength" is each of twelve Nanovia products' XY tensile strength.

*Decided by the owner on 2026-09-26 (docs/GOALS.md, "Decided on 2026-09-26, for phase 6", decision 4); supersedes, for
such values, the reading m33 gave Essentium's "45/45" and m155 gave Nanovia's ±45° tabs. Built in m168.*

A raster is the direction of the lines inside each layer; a build direction is how the bar lies on the plate. m33 read a
±45° raster as neither XY nor Z (Direction `45/45`), and m155 read Nanovia's 0°, ±45° and 90° tabs the same way, so no
value labelled that way could be a product's value. Makers commonly print their flat XY bars with an alternating ±45°
raster: 3DXTECH's sheets state "Infill: 100%, +/- 45°" beside "Specimen Orientation: XY", QIDI's a ±45° infill angle
beside XY and Z columns. The lane 4 recommendation was to keep m33 until a sheet printing both showed they agree; the
owner chose to count them.

- **The rule.** A tensile value (modulus, strength, elongation, strain at strength) that its sheet labels only by a ±45°
  raster is Direction XY, with the raster kept in Specimen / print parameters. Where the sheet labels a bar XY beside its
  ±45° bar for the same product and property, the ±45° one keeps Direction `45/45` and is not the XY value: Essentium's
  PPS-CF prints XY, 45/45 and ZX columns, and its 45/45 tensile, flexural and Izod rows stay. A test holds every record
  to it. A 0°, 90° or 0°-90° raster is still "Stated, not a usable direction".
- **Found everywhere.** Every row whose Direction, Locator, Specimen / print parameters or Notes names a ±45° raster was
  read, and every cached page for such wording (90 documents): the others already carry the build orientation their
  sheet states. Thirteen rows were 45/45: DSM's Arnitel ID 2045 (3), which says "The mechanical data is tested on printed
  tensile bars, printed in two directions: 0°-90° and 45°-45°" (its bytes, not cached on this machine, were re-fetched
  and matched their SHA-256); Nanovia (4); Essentium (6, which stay).
- **Where a sheet prints several raster tabs, the ±45° one is the product's XY value.** Nanovia's product pages print a
  tensile tab per raster: 0° (along the load), ±45° and 90° (across). The import had taken the first tab only, so where a
  page prints a ±45° tab the database lacked, its modulus and its strain at the ultimate strength are added as XY, read
  from the page's hash-checked bytes (20 values on 12 pages); the 0° rows stay recorded with their raster stated, and
  the 90° tabs stay in the record tier. PETG's page repeats the 0° sentence under all three tabs and is left, as m155
  left it. The "Ultimate strength" each tab prints was never read on any tab and waits (OPEN-PROBLEMS §15). *(m199,
  2026-09-27, read the ±45° tab's: see the end of this entry.)*
- **What the sheets that print both show.** Essentium's carbon-fibre PPS-CF: the 45/45 bar reaches 71 % of the XY bar's
  strength and 61 % of its stiffness. Nanovia's ±45° moduli run from 66 % (PETG-GF) to 117 % (PLA EF) of their 0° ones.
  DSM's elastomer prints the same modulus for both rasters. A ±45° value is a flat bar's value, not the stiffest a
  fibre-filled filament can be printed.

What it did (m168): 7 rows became XY and 20 were added. Thirteen products gained a comparable XY modulus (twelve of
Nanovia's, and DSM's Arnitel ID 2045, which gains its XY strength and elongation too); each replaced a value published
without a usable direction but ABS ESD's, which had none, so product values rose from 3,587 to 3,588. Across the six
templates: in Lightweight
structure PLA-NF passes on Nanovia PLA Flax (2.83 GPa) where it failed, ABS-AF fails (Nanovia ABS AF, 1.89 GPa) where it
was unknown, and PLA, ABS-CF and PA6-CF pass on one product more; in High-stiffness fixture PA6, ABS-AF and PLA-NF go from
unknown to fail (their only XY moduli are 3.59, 1.89 and 2.83 GPa); TPC / TPEE passes the Flexible component on DSM's
Arnitel ID 2045 (390 %) as well; PA6-CF passes the Outdoor structural part on one product more. With estimates, COC is
screened out of Lightweight structure and PLA-PHB out of the Outdoor structural part. Reversing it sends 7 rows back to
45/45 and the 20 added values out, and the flat bars of the makers who label them by their raster stop counting.
Revisit it if a sheet printing both an XY and a ±45° bar of an unfilled filament shows them far apart.

m199 (2026-09-27) read what m168 left: each of the twelve pages' ±45° tab prints an "Ultimate strength", the maximum
stress, now the product's XY tensile strength (16 to 77 MPa), read from the same hash-checked bytes. No template asks
it without a stiffness these products already had, and no answer moved.

## D92. Three more selectable properties: the layer strength, the notched Charpy impact strength and the glass transition

> **In plain words:** You can now require a strength across the layers, a notched impact strength and a glass transition; each product's value is chosen by the same rule as the others, and a value measured another way (another test, unit, notch, direction or temperature) is shown but never compared.
> **Status:** amended by D94 (notched Izod is a second impact filter; the Charpy headline no longer shows an Izod value as its nearest evidence); extended in phase 6, final round (m191): an XZ or ZX tensile bar its sheet shows or says stood upright is recorded Z, and counts; extended by D123 (Eryone's template "X-Z" bar is Z by the owner's ruling).

*Built in re-center phase 6, lane 4 (docs/audits/2026-09-25-re-center/REPORT.md, lane 4, item 3; scorecard C1), with
m175 and m176. It amends D84.*

*Amended by D94 (2026-09-27): the owner chose a notched Izod filter beside the Charpy one; each names its test and says
the other is never mixed or converted, and a Charpy cell with no Charpy value no longer shows an Izod value in its place.*

*Extended in phase 6, final round (m191, 2026-09-27): every sheet whose across-layer tensile values carried only an XZ or
ZX label was re-read. Where it shows or says the bar stood upright and was pulled across its layers (BASF's "ZX |
Upright" column, Stratasys's "Upright (ZX)", Essentium's drawing, two Eryone sentences naming their "X-Z" value the
"Z-axis tensile strength"), its tensile rows are Z; the rest keep their label, and the Direction vocabulary now gives
ISO/ASTM 52921's meanings (XZ on its edge, ZX upright). "Which of those are upright bars is not settled", below, is
the reading this narrowed.*

The requirements an engineer states for a printed part include how well its layers hold, how brittle it is and where
it softens. The database held the values, 11,000 rows of them, and none could be asked for: 135 products publish a
tensile strength along Z, about 200 a notched impact strength and 344 a glass transition. Each is now a row of
`headline_definitions.csv`, and each product's value is chosen from its own measurements by the rule of D83. None is
estimated: the estimate model has no conversion for them, and a registry row cannot switch one on (D46).

- **The layer strength** (`tensileStrengthZ`, MPa) is the tensile strength of a bar the source says it printed upright
  and pulled along Z: the same three endpoints as the in-plane strength, direction Z. A value with no stated direction
  is *not* counted apart as D84 counts it for XY: a maker who pulls a bar across its layers says so, and an unstated
  strength is almost always a flat or a moulded bar, at about twice the layer strength. So the table gained a column,
  **Unstated direction**: `as-published` for the three XY headlines (unchanged) and `excluded` here. A bar labelled XZ
  or ZX is left out too: which of those are upright bars is not settled (Eryone's 27 "X-Z" values run from 8.7 to
  47 MPa, and the vocabulary's own meanings for the two labels are not ISO/ASTM 52921's).
- **The notched impact strength** (`charpyNotched`, kJ/m²) is Charpy, notched, in kJ/m² at room temperature: ISO 179
  and the GB/T 1043 that follows it. Charpy rather than Izod because more products publish it comparably, 72 against
  45 for notched Izod in kJ/m². Izod clamps a bar upright and strikes it; Charpy supports it at both ends: the numbers
  are different tests, never mixed. A value in J/m (ASTM D256) is energy per metre of notch and becomes kJ/m² only with
  the bar's thickness, which no sheet here gives. An unnotched bar absorbs several times a notched one's energy, and a
  sheet that does not say which it struck could be either. So two more columns: **Notch** (`Notched`) and **Test
  temperature °C** (23; ISO 291's laboratory atmosphere is 23 ± 2 °C). A value's own test temperature was free text
  that decided nothing; m175 types it as **Test temperature °C** beside the wording, and the parser checks it on every
  build (PARSE-MISMATCH). Polymaker's PC PBT prints a notched XY value of 33 kJ/m² and one of 15 kJ/m² at -30 °C on a
  printed bar. The rule prefers a printed bar, and without the test temperature would have taken 15; it takes 33.
  Direction is XY, and an unstated direction is as published, as D84 has it for the other XY headlines.
- **The glass transition** (`glassTransition`, °C) is the product's own value, almost always by DSC. It is a property
  of the plastic, not of a bar, so it has no direction and no load, and every value that qualifies is comparable. A
  resin supplier's value (Specimen type `Raw material value`) is the raw material's, not the product's, and is not the
  product's value, as for every other headline.
- **What stays out is shown and said.** A fourth column, **Comparison note**, says in a reader's words what a headline
  compares and why its related values that are not its own are left out; the drawer shows it above every related
  property's values (the Izod, Charpy and impact blocks; the tensile strength blocks). What stands in a missing
  headline's place is only in its unit and of its notch, and for the layer strength only a Z value: an Izod value in
  J/m, an unnotched bar or an in-plane strength is another quantity, and an XY strength in a Z column would read as a
  bound it is not. A headline with no direction never gives a direction as the reason a value is not compared (HDT's
  M066 now says "measured at 1.8 MPa"), and a row recorded with direction Not applicable is, to a headline with a
  direction, a direction not stated (Spectrum PA6 Neat's modulus on PA6, M049, V002078).
- **A value at or below zero** has no logarithm, and the glass transition is the first headline with such values (an
  elastomer's is below 0 °C). On a Log axis the chart leaves off a candidate whose value or estimated range reaches
  one, counts it apart from the plotted, and says so; the rendered-page check models it (`ui-fuzz`, I4-log-count).
- **No new table column.** Each of the three is a filter, a chart axis, a key number and a product value in the drawer,
  a Compare row and an export column. The Properties table fits a 1440 px screen with the filters open (D62), and with
  the layer strength and the impact strength as columns it needed 1,226 px in a 1,068 px box and scrolled sideways;
  with the layer strength alone, 1,127 px. From 1600 px either would fit. The glass transition would not be a default column in any case: the table
  has a heat column, and beside it a glass transition invites the wrong reading for a semicrystalline plastic (PA6's
  products put it at 65 °C, and their heat deflection at 142 °C).

What it did: 143 products have a layer strength (48 materials a spread), 201 a notched impact strength (72 comparable,
129 published without a direction; 38 materials a spread, 27 more only values published without a direction), and 344
a glass transition (70 in-scope materials a spread). Across the six templates no answer moved and no product count
changed (`build/snapshot/templates.csv`); the templates ask none of the three. Reversing it takes the three questions
away again, and a cold or unnotched value, or an in-plane one, would decide the first time anyone added them without
the conditions.

## D93. A maker's own "enclosure needed", with no temperature, reads as the guide's tick

> **In plain words:** For the nine material types Bambu Lab's guide says to print in an enclosure, a product whose own sheet says an enclosure is needed or recommended, and gives no chamber temperature, counts as printable in the H2C's heated chamber, in the maker's own words; a temperature the maker states still decides.
> **Status:** in force; it extends D90. Read for ASA-CF since 2026-09-27 (m210): the guide the build reads (D88, amended) asks an enclosure for it, and the owner's answer of that day reads that ask as D90 does.

*Decided by the owner on 2026-09-26 (docs/GOALS.md, "Decided on 2026-09-26, for phase 6", decision 5); extends D90.
Built in m190.*

D90 read Bambu Lab's "print with an enclosure", for ABS, ABS-GF, ASA, PC, PAHT-CF, PA6-CF, PA6-GF, PPA-CF and PPS-CF, as
within the H2C's 65 °C heated chamber for a product whose own sheet is silent. A product whose own sheet asked for an
enclosure had spoken about the chamber (D88), so it never read the guide, and stayed unknown: Polymaker ABS and ASA's
"Closure chamber | Needed" left them unknown where a silent sheet of the same type passed. The owner ruled that the
maker's plain words read as the guide's tick does.

- **It is data, a declared state, as D90's is.** A profile whose sheet asks for an enclosure (Enclosure state
  recommended) and prints no chamber row declares Chamber state `enclosed` and says why in Parse review; its raw Chamber
  °C stays "Not published" and its Enclosure keeps the sheet's words. Chamber requirement is `recommended` where the
  words recommend ("Closed chamber recommended for larger prints", "we strongly recommend printing ABS material inside an
  enclosed printer") and `required` where they say needed, yes, or to print it closed ("Closure chamber | Needed",
  "Enclosed Space | yes", "Sealed printing | Closed printing"). The gate reads it as within, with the reason "Its maker
  asks for an enclosure, in its words "Needed", and states no temperature; for a type the printer maker's guide asks an
  enclosure for, the H2C's heated, enclosed chamber (65 °C) is that enclosure". The print card says "an enclosure its
  maker asks for", and the Printing tab quotes the row. A twin that reads the profile (D89) says "same sheet as …" after
  it. Nothing in the code names a type.
- **Where it may be declared** (PROCESS-ENCLOSED, across rows): only on a chamber, only where the row asks for an
  enclosure and prints no chamber temperature, only for a material whose printer maker's guide row declares `enclosed`
  (the nine types, by `print_guide_materials.csv`), and only where no other profile of the product states its chamber.
- **A maker's temperature still decides.** A sheet that prints a chamber, stricter or looser, is read as it is: the
  sixteen products D90 listed keep their windows, and two Polymaker PCs are left out of this reading because their
  sheets print "Needed (70°C-100°C)" (PolyLite PC Transparent) and "Not needed (70°C-100°C)" (PolyMax PC, P0276, which
  the parser leaves unread).
- **A product's own opposite statement wins too.** The re-read found FormFutura's STYX PA6-CF15 and PA6-GF30 sheets
  saying "No enclosure, or heated chamber needed." Their profiles had missed it and read the "Closed chamber
  recommended" of the Spectrum sheet they share a table with; they now hold their own words.

What it did (m190): 29 profiles on 28 products declare the H2C's chamber in their maker's words (ABS 11, ASA 10, PC 3,
PA6-CF 3, PA6-GF 2), and Kratos PC reads it from its twin, Spectrum PC 275; the two STYX products read their own "not
needed". Products unknown on the chamber fell from 438 to 407. Only Warm environment screens on the chamber, and no
material's answer moved: the products that pass rose from 109 to 120 in each mode (ABS 17 to 18, ASA 14 to 16, PC 6 to
9, PA6-CF 6 to 9, PA6-GF 7 to 9); the other twenty are still untested on a value the template asks for. Reversing it sends 29 products back to
unknown on the chamber while silent sheets of the same types pass. Revisit it with D90 if the owner reads a type's
stated windows (Bambu Lab's own PPA-CF and PPS-CF sheets) as saying the enclosure needs more than 65 °C.

## D94. Notched Izod is a second impact filter, beside notched Charpy, and the two are never mixed

> **In plain words:** You can now require a notched Izod impact strength as well as a notched Charpy one; they are two different tests, so each has its own filter, each says so, and no number is ever converted from one to the other or from J/m.

*Decided by the owner on 2026-09-26 (docs/GOALS.md, "Decided on 2026-09-26, for phase 6", decision 8; the
recommendation was one impact filter until a requirement asked for Izod). Built in phase 6, final round, with m195. It
amends D92.*

D92 made the notched Charpy impact strength selectable and left Izod out, because two impact filters invite mixing them:
161 products published a notched Izod value and no notched Charpy one. The owner chose both. Izod clamps a notched bar
upright and strikes its free end; Charpy supports a bar at both ends and strikes its middle. The bars, the notches and the
numbers differ, and no conversion between them holds across plastics.

- **The headline** (`izodNotched`, kJ/m²) is D92's Charpy row with Izod's test: Izod impact strength, notched, XY, at
  23 ± 2 °C or none stated, an unstated direction counted apart (D84). Not estimated, not a table column, and asked by
  no template.
- **Its standard is ISO 180.** A value in J/m (ASTM D256) is energy per metre of notch, and one to ASTM D256 printed in
  kJ/m² is that value divided by a bar thickness its maker chose and the sheet does not give: a conversion, which the
  owner ruled out. So `headline_definitions.csv` gains a column, **Standard**: a value whose Standards name others and
  not this one is no value of the headline and stays evidence; a value naming no standard counts, as for Charpy, whose
  Standard is Not applicable (every other row's is too). Thirteen products whose only notched Izod in kJ/m² names ASTM
  D256 are shown and not compared.
- **Each says so.** The filter's hint and the drawer's comparison note of each name the other test as never mixed or
  converted; the Charpy row's labels name Charpy ("Notched impact, Charpy") now that "notched impact strength" names two
  filters. Izod leaves the Charpy headline's related properties, and Charpy is not among Izod's: a cell with no value of
  its own test no longer offers the other test's number as its nearest evidence (11 materials' Charpy cells had only
  that to show, and show nothing now; 5 more show a Charpy or unspecified impact value instead).

What it did: 116 products have a notched Izod value, 45 of them comparable (71 published without a direction, counted
apart); 26 in-scope materials have a spread, and 12 more only values published without a direction. The Charpy values
are unchanged (191 products). Across the six templates no answer moved (`build/snapshot/templates.csv` unchanged).
Reversing it leaves Izod-only products without an impact value again, or, if the two were one filter, compares numbers
from two tests as if they were one.


## D95. A product is judged as it is meant to be printed: colorFabb's lightweight PETs, foamed

> **In plain words:** When a sheet prints a product's values at two print settings and the product is made to be printed at one of them (a foaming filament, foamed), that one is the product's value; the other is kept and shown beside it, and never decides.

*Decided by the owner on 2026-09-26 (docs/GOALS.md, "Decided on 2026-09-26, for phase 6", decision 6; recommended and
taken). Built in phase 6, final round, with m197.*

colorFabb's sheets for Lightweight PET and Lightweight PET FLEX print their "Mechanical Properties – 3D Printed" in two
columns, "Value unfoamed @ 210 °C" and "Value foamed @ 260 °C, flow: 60%". The filament carries a foaming agent that
works at 260 °C; printed at 210 °C it is an ordinary PET. The FLEX's modulus is 2.52 GPa unfoamed and 1.50 foamed:
at 2.5 GPa it passes unfoamed and fails foamed, so which column is the product's is a decision, not a reading. A foamed
part is what a buyer of the product prints.

- **The rule is a declared state, not a branch.** The foamed column is Specimen type Printed specimen, the product's
  value by the rule of D83. The unfoamed column is Specimen type **Printed off the product's recipe**, a new value of
  `schema/vocab/specimen-types.csv` whose Form, **off-recipe**, says what the build does with it: like a moulded, film
  or filament value it is no part specimen of the product (products.js), bounds nothing (implied bounds take a printed
  form only) and is no estimate observation; unlike them it is printed, so the physics lint orders it only against
  values of its own column. It is recorded, shown in the drawer with its reason, and counted as the product's evidence.
- **Only where the sheet names the setting the product is meant for.** Two settings a maker offers alike (LEHVOSS's
  "Engineering" and "Fast" profiles, Polymaker's classic and high printing speed) are both the product as printed, and
  both stay Printed specimen.

What it did (m197): 24 values on two sheets, six rows in two columns each (tensile modulus, strength and elongation at
break, flexural modulus and strength, notched Charpy). PET-LW (M141) now publishes its stiffness, 1.29 and 1.50 GPa
foamed, where it was "not published". Across the six templates PET-LW goes from UNKNOWN to FAIL in Lightweight
structure, High-stiffness fixture, Outdoor structural part and Flexible component (Explore, with and without estimates;
`build/snapshot/templates.csv`). Reversing it either leaves the product's values unread, or lets a PET printed as an
ordinary PET stand for a foamed one, which is the lighter, weaker part the product exists to make.

## D96. A release is its content: an ID over what decides travels with every page, scenario and export

> **In plain words:** Each build is named by a digest of the data, rules and engine that decide its answers, not by a date; a scenario saved on one release says so when opened on another, and every published release's page is kept.

*Decided by the owner on 2026-09-28 (docs/GOALS.md, "Decided on 2026-09-28, for version 2.1", decision 6;
recommended and taken). Built in version 2.1, F07 of the review of 2026-09-27.*

The page, its file name, every export and every saved scenario named the database by the date in `method.csv`'s
Scope / Snapshot row, 2026-09-21, which stayed while a week of migrations moved answers. Two pages of one date could
disagree, a scenario saved on one opened on the other with no word, and Pages overwrote the "pinned" page of that date
on each publish.

- **A release ID is a digest of what decides** (`build/src/release.js`): the tables, the schema, the build's rules and
  mappings, the selection engine and the templates' questions, and the build's dependency lockfile, each part digested
  apart with its file names. Twelve hex characters name it; the full digest and each part's are in `db.meta.release` and
  `dist/manifest.json`. The same inputs give the same ID on any day and machine. The interface around the engine is not
  in it: two pages that draw the same answers differently share their release.
- **It travels.** The page shows it (top bar, *Save / share*); its file is `H2C_Material_Selector_<date>_<release>.html`;
  a saved scenario and a link carry it (`release`, and `i` in the link); every CSV export states it.
- **A scenario reopened on another release says so** before its question is asked again, even on the same date, and
  names where the page it was saved on is kept. The same release raises nothing. A scenario from before releases says its
  identity was only a date. Saved again, a scenario records the release its answers now come from.
- **Every release published from `main` is kept** as the GitHub release `h2c-<release>`, with its page and manifest
  (`pages.yml`). The site serves the current release.
- **The date stays, as a date.** `method.csv` still gives the data's date for a reader; D30 holds for where it is
  read from. It no longer identifies anything.

`npm run build:diff` reports the release apart from the database's differences, so a change meant to move nothing
still shows 0 differences while its release moves. Reversing it returns a date as the only identity, and a same-date
change to the evidence is again invisible to anyone holding a saved decision.

## D97. A decision value is bound to its own row: its number is one its evidence line prints, and a number has one role

> **In plain words:** A value enters only if the line it was read from prints that number whole, and a number printed once cannot be both a value and a condition, or two conditions; a page that merely contains the digits somewhere is no longer enough.

*Decided by the owner on 2026-09-28, with the version 2.1 plan (docs/GOALS.md, "Decided on 2026-09-28, for version
2.1"). Built in version 2.1, F06 of the review of 2026-09-27 (A01, D07).*

`ingest:apply` proved a number was printed on the page its Locator names by finding one of its spellings in the page
with every space removed. The review rewrote a fixture's 52 MPa to 5 MPa, kept the evidence line that says 52, and the
guard found nothing wrong: "52" on a page prints a 5, a 2 and the 527 of "ISO 527". The same review re-read Spectrum's
PLA Matt and found V002780 and V002781 tested at 90 °C, which the sheet prints once, as the annealing temperature of
"annealed (4h @ 90°C)": the parser agreed with its typed column, and the number was on the page, so nothing caught it.

- **The value is a number its own evidence line prints** (`countInEvidence`, `scripts/lib/pdf-text.mjs`), for the raw
  value, its spread and its upper bound. The line is read as the reader reads it: the standards it names taken out
  first, a decimal comma, a thousands grouping, a power of ten, a number the extractor split ("2 43 3 .4"); a number
  touched by a digit or a letter ("5" in "52", "3" in "cm3") is no value. `APPLY-VALUE-NOT-IN-EVIDENCE`.
- **A number the line prints once has one role.** Among the value, its spread and bound, the anneal temperature and
  hours and the test temperature, a number claimed twice must be printed twice. `APPLY-CONDITION-ROLE`. The reader
  itself no longer takes an annealing schedule's temperature for a test temperature (`propose.mjs`).
- **A layout the reader cannot bind** (a value set apart from its label, a scan) enters when a person read the row on
  the page image and says so (`review.visual`), as a scan's rows already must (D35). The page-wide test stays, as a
  retrieval check.
- **A batch applied before is not refused after the fact.** A proposal whose document is registered under its own
  SourceID with the same bytes re-runs as a no-op; `npm run audit:witness` asks the binding of the rows already
  recorded and lists what does not bind for a person
  (`docs/audits/2026-09-27-v2.1-review/WITNESS-BINDING.md`). On 2026-09-28: of the 7,739 applied rows it could match to
  the proposal row that wrote them, 577 were read on the page image, 7,151 bind, and 11 do not: ten were corrected
  against their page since (a power of ten the extractor printed as "103"), and one prints its value against its
  label with no space.

Reversing it returns the page-wide test as the only proof, which a corrupted digit, a fragment of another number or a
standard's designation satisfies.

## D98. A product's verdict rests on its own records: its evidence, its offers, its conflicts

> **In plain words:** A product passes an environment, stock or evidence requirement only on its own records (or a twin's, which is the same sheet); another product's record, or one filed under the whole material, is shown as context and never passes it.

*Decided by the owner on 2026-09-28 (docs/GOALS.md, "Decided on 2026-09-28, for version 2.1", decision 1; recommended
and taken). Built in version 2.1, F01 of the review of 2026-09-27 (D01, D05). Amends D38 and D19.*

D83 judged each product on its own values and recipe, and left three criteria reading the material: its environment
records (D38), its offers (D19) and its evidence and conflict findings. So 3DXTECH's 3DXSTAT ESD PETG passed "resists
acids" on Q00107, a record of Polymaker's PolyMax PETG-ESD; ECOMAX PLA was insoluble on Bambu Lab's records and in stock
on Bambu Lab Canada's listing; and one iSANMATE sheet's filler question (C01409) held out every PLA-GF.

- **A product's own records decide**; where it has none, a twin's (D89), which is the same sheet, labelled "same sheet
  as ...". A sibling's record, and one filed under the material with no product (a register note), are context: the
  reason names them, and the product is unknown on that requirement. The base polymer's behaviour (D64) stands where the
  material has no record at all, as before.
- **An offer is the product's own** (`grades[].buy`), never read from a twin or a sibling: another product's stock is not
  this one's. A material's offers together are what the table shows beside its price; they decide nothing.
- **A product's own measurement, or its twin's,** is what "has a product-specific measurement" asks.
- **A coverage finding names the product it is about** (`coverage.csv` GradeID, m213); a conflict about one product
  holds out that product and its twins, never its siblings. C01411, about which resin nGen is, stays the material's.
- **A limit stays in the answer** (D05). The maker's "Fair" and "Fair-Poor" read as limited resistance, as "Good" and
  "Poor" already read as resistant and not; and a record in words the build reduces to no verdict, beside a positive
  one, makes the requirement unresolved rather than being set aside: PolyMax PETG-ESD's weak-acid "Good" beside its
  strong-acid "Fair-Poor" no longer answers "resists acids". The engine is still not told which acid or solvent a part
  meets; a verdict names the records and their exposures.

What it did, over the 136 in-scope materials' 1,077 products (the old and new engine on one database): products passing
acids 142 → 7, alkalis 142 → 7, solvents 7 → 1, oils and grease 44 → 6, water 709 → 41; in stock in Canada 726 → 41,
listed 752 → 46; a product-specific measurement 1,077 → 1,050 (the 27 that have neither their own nor a twin's); no
unresolved conflict 936 → 1,067. Material verdicts moved only where a product's own record decides (oils and grease 5 →
6 materials; no unresolved conflict 128 → 135). No template screens on these, so `build/snapshot/templates.csv` did not
move. Reversing it lets one product's record or stock stand for every product of its material again.

## D99. A product is judged in a state it can be made in: as printed unless annealing is permitted, dry unless conditioned is asked

> **In plain words:** A product's values are sorted by the state they were measured in (as printed, annealed at a schedule, conditioned by moisture); a verdict uses one state's values only, as printed by default, and says which treatment it needs.

*Amended by D107 (2026-09-29): the Ashby decision workspace draws each product at the values of the state its answer is
in, where this decision had kept the chart at published values; Material typicals (the catalogue view until D110) still
draws those. A named state a
product does not publish is that state with no values, never its first state.*

*Decided by the owner on 2026-09-28 (docs/GOALS.md, "Decided on 2026-09-28, for version 2.1", decisions 2 and 5;
recommended and taken). Built in version 2.1, F02 of the review of 2026-09-27 (D03, D04). Amends D83 and D84.*

D83 chose each product's value per headline on its own, preferring as printed, and admitted an annealed value where no
as-printed one existed. So one product's verdict could join values of two states no part is in at once: Fiberon
PET-GF15 passed "XY stiffness at least 4 GPa and heat deflection at least 80 °C" on a modulus measured after annealing
at 120 °C for 16 h and a heat deflection measured as printed; Spectrum PLA Matt passed 100 °C on a bar annealed for 4 h
at 90 °C; Bambu Lab's PA6-CF passed every structural template on values all measured after 80 °C for 12 h, with no
word that the part must be annealed.

- **A product has decision states** (`grades[].states`, `build/src/products.js`): as printed and dry, first and
  always; each annealing schedule its annealed values state; conditioned, where it publishes a conditioned value; and
  their combinations. A state holds the value the rule chooses among that state's measurements only. Which headlines a
  state changes is a column of `headline_definitions.csv` ("Changes with annealing", "Changes with moisture", m214): a
  density is the resin's in every state, a glass transition moves with water but not with annealing.
- **A scenario says what it can do and ask** (`anneal`, `annealMaxC`, `moisture`): used as printed unless annealing is
  permitted, up to an oven temperature or any; dry unless the conditioned service state is asked. A product is judged in
  each state the scenario permits and answered by the best; a verdict in an annealed state carries the annealing it
  needs as a requirement of its own, so every verdict and export names it, and an annealing whose schedule the sheet
  does not state in full settles nothing, because nobody can repeat it.
- **A value in another state is named, never used.** "Published only after annealing at 90 °C for 4 h (V002780: 116
  °C); this product is judged as printed. Permit annealing to judge it in that state." Conditioned asks for conditioned
  values only: nothing is inferred from a dry one, and no correction factor exists.
- **What the screening policy admitted is said** (decision 5). A value carries the conditions that could change it and
  its source left unstated (specimen form, moisture, treatment) and the standards it names; the reason says both, so
  "comparable" reads as a policy, not an equivalence.
- The product's published value, which the table, the chart and the material's spread show, is unchanged: it is what
  the sheet publishes, labelled with its annealing. The states are what decide.

The page asks it in the rail ("How the part is made and used"), and the results header says which state every product
is judged in and how many more materials would pass with annealing, one press away. m215 records Fiberon PET-GF15's
annealed heat deflections on the one schedule its sheet states (a reading, for a person to confirm); m212 is the review's
other correction.

What it did, as printed and dry, in Strict: Outdoor 18 → 14 materials, Lightweight 29 → 26, Warm 34 → 29,
High-stiffness 19 → 15; Indoor and Flexible unchanged. With annealing permitted: 17, 29, 32 and 19. The losses are passes
that rested on an annealed value the scenario never said it could make: PA6-CF, PA6-GF, PA612-CF, PET-CF, PAHT-CF,
PA612-ESD, PC FR, PPS-CF, PPS-GF, ASA Aero and PETG, by their products. `build/snapshot/templates.csv` has a
"Strict, annealing permitted" mode and each row's state; `build/snapshot/states.csv` lists every state value that is not
the published one (638). Reversing it lets a verdict rest again on a set of values no one part has.

## D100. A material fails only when every product fails; while one is unresolved, it is unresolved

> **In plain words:** A material passes when one of its products passes, stays unknown while any product has not been judged and none passes, and fails only when every product fails; the counts of passing, failing and untested products stay beside it.

*Decided by the owner on 2026-09-28 (docs/GOALS.md, "Decided on 2026-09-28, for version 2.1", decision 3; recommended
and taken). Built in version 2.1, F04 of the review of 2026-09-27. Revises D83's third clause deliberately.*

D83 made a material FAIL when no product passed and one failed, even where its other products published nothing. So one
measured failure removed a material whose other products nobody had measured, and a newly measured failing product could
take a material out of Include uncertain, which exists to keep what has not been ruled out. For the Outdoor template, 59
materials failed that way (the review's count).

- **PASS** when one product passes, in a state the scenario permits (D99); **UNKNOWN** when none passes and one is
  unresolved; **FAIL** only when every product fails. A product with no data is still untested, and never counts against
  its material.
- **The counts say which kind of unknown it is.** The evaluation carries its products' pass, fail and untested counts, and
  `someFail` where some were judged and failed; the table's share reads "0 of 31" and says that the material is
  unresolved rather than failed because not every product fails. The reasons are an unresolved product's.
- **Why excluded** counts a material removed by a requirement only when every product fails it.
- Include uncertain is wider, on purpose: a team can see what nobody has measured. Confirmed only is unchanged, because an
  unknown material was never a candidate there.

What it did: Strict moved nothing. Include uncertain keeps 263 more material answers across the six templates, each a
FAIL that became UNKNOWN (Outdoor 52 → 113 candidates, Lightweight 55 → 107, High-stiffness 63 → 113, Flexible 65 → 116,
Warm 92 → 126, Indoor 115 → 130); with estimates on, as many (43 → 92 for Outdoor), because a silent product beside
siblings that publish is untested, not estimated (D83). The acceptance portfolio's S08 (PETG for 100 °C: 31 products fail,
45 publish nothing) failed on the old rule and holds. Three tests that pinned the old clause were rewritten to it, and
`test/metamorphic.test.js` holds the counterexample: adding a failing product cannot remove an unresolved one. Reversing
it lets a measured failure of one product rule out products nobody has measured.

## D101. Every template asks whether the H2C can print the product; browsing without it is research mode

> **In plain words:** Each ready-made scenario checks each product's nozzle, bed and chamber against the H2C's, as it checks its properties; turning that off is labelled research mode, where a pass says nothing about printing.

*Decided by the owner on 2026-09-28 (docs/GOALS.md, "Decided on 2026-09-28, for version 2.1", decision 4; recommended
and taken). Built in version 2.1, F03 of the review of 2026-09-27 (D02). Extends D29.*

GOALS step 2 asks that a product meet every requirement at once, whether the H2C can print it included. Five of the six
templates asked no print gate, and Warm environment asked the nozzle and the chamber but not the bed: FIBREX PA12 GF30
passed the outdoor bracket with a chamber up to 120 °C, and Spectrum's PC 275 and FormFutura's Kratos PC passed the warm
part on a 90-130 °C bed the H2C cannot reach.

- **Every template asks the three print gates** (`PRINTABLE` in `app/js/ui/templates.js`): each product's own nozzle,
  bed and chamber against the H2C's 350, 120 and 65 °C, from its own sheet, its twin's or its material's printer maker's
  guide (D88, D89), labelled which. A partly reachable window or a recommendation above the H2C is unresolved, never a
  failure (D6, D32); a product with no recipe is unknown on them, never a pass.
- **Off is research mode, and says so.** The rail's "Printable on the H2C" sets the three together; without them the
  results header says "Research mode: whether the H2C can print a product is not checked", with a button that asks them.
- **The Indoor prototype tracks its price.** It required a sampled Canadian price at most 45 CAD/kg, and 38 of 1,077
  in-scope products have one, so a general prototype started from 100 unknown materials. Price sits late in the funnel
  (GOALS): it is reported beside each material and product, a sourcing task, never a reason to hold one out.

What it did, Strict (as printed): Outdoor 14 → 5 materials, Lightweight 26 → 11, High-stiffness 15 → 5, Flexible 16 → 6,
Warm 29 unchanged (its nozzle and chamber were asked already, and no material's only passing products exceeded the bed);
Indoor 15 → 70, now asking printability and no longer a price. Every material lost is unresolved, not failed: its
passing products have no recipe, or a window the H2C only partly reaches, and Include uncertain keeps it. With annealing
permitted: 10, 16, 10, 7 and 32. The acceptance portfolio's S01.7, S02 and S11 hold. Reversing it lets a template confirm a
product the printer the tool is for cannot print.

## D102. One ranking: the table, the chart's guide, its line and the export rank a question the same way

> **In plain words:** When the candidates are ranked by a goal, every view uses the same ranking, computed from each candidate's passing products' own values; the chart's bubbles are drawn at typical values and are labelled as context, never as the ranking.

*Amended by D107 (2026-09-29): the chart's line is drawn over the exact product states the ranking reads, and counts
them and their materials apart; its "bubbles at typical values, context" survived as the catalogue view, since D110
Material typicals, which D112 draws as one dot per material with nothing around it. (D107's objective stages, which the
one ranking also read, were removed by D108.)*

*Built in version 2.1, F05 of the review of 2026-09-27 (U01), under the owner's direction of 2026-09-28. Extends D83.*

D83 ranked the table by each passing product's own index, the median over a material's passing products. The Ashby
chart's guide card ranked the same materials by an index of their headline medians, which are medians of different
products, some of which do not pass: for Warm environment by a light, stiff beam, the table read PPA-CF, PP-CF, PA612-CF
and the guide PP-CF, PAHT-CF, PPA-CF. Two answers to one question.

- **One result** (`rankingFor`, `app/js/engine/indices.js`): each candidate on screen ranked by the median index of its
  passing products, each product's index from its own values in the state it passes in (D99), with its best product. The
  table's order, the guide's top ten, the line's count and the candidates-export's Rank columns all read it.
- **A candidate the goal cannot rank says so**: "not ranked: no passing product publishes what E / rho needs", never a
  silent place at the end.
- **The chart's geometry is context.** A bubble sits at its material's typical values; the line is drawn among them, and
  the card says its count is of candidates by their passing products. The Pareto front, drawn through the bubbles, is
  named "Pareto front of typical values".

The acceptance portfolio's S09 asks the three lenses for Warm environment's beam-stiffness order and they agree; a test
holds that a failing product's better index does not lift its material. Reversing it gives one goal two rankings again.

## D103. A chosen product is a local decision record: its brief, its state, its release, and the team's own tests

> **In plain words:** An engineer can choose the exact product the team will print; the page keeps it with the scenario, with the state and release it was chosen on, and writes a decision brief with its evidence, recipe, open questions and a test plan, where the team records its own results.

*Decided by the owner on 2026-09-28 (docs/GOALS.md, "Decided on 2026-09-28, for version 2.1", decision 7; recommended
and taken). Built in version 2.1, F11 of the review of 2026-09-27 (U04, D09). The start of GOALS C14's team layer,
deliberately small.*

The funnel ended at a material shortlist: the saved scenario held material IDs, the product export listed every product
of the materials on screen, and nothing recorded "we chose this product, in this state, subject to this test".

- **Choose this product** (Products tab, beside each product once something is asked): the scenario's `decisions` hold
  the exact product, the state its answer was in, the release and the day it was chosen on, a note, and the team's test
  results. A link carries the choice; the saved file carries the note and the tests too. A product this database no
  longer holds is dropped with a warning.
- **The decision brief** (Save / share, Markdown, `app/js/ui/brief.js`) is written from the engine's own answer for that
  product, never recomputed: the question; the verdict and the state, with the annealing it needs; each requirement's
  result, reason and records; each cited number as printed, with its source, page and SHA-256; the conditions the policy
  admitted unstated; what is not settled, with the template's own limits; how to print and treat it, with where each
  part of the recipe came from; a suggested confirmation test per requirement; and the team's results.
- **A team's test result is its own evidence**, recorded with the decision (date, operator, printer and recipe,
  orientation, conditioning, method, result). It never enters the database, whose sources are makers' documents, and
  no approval workflow, account or server exists: that waits until the team has used this (GOALS, decision 7).

Answers moved: none. Reversing it leaves the choice of a product, and the test that confirms it, outside the tool.


## D104. A save is one transaction, a fetch is bounded, and a source's bytes are kept by their digest

> **In plain words:** Editing the tables from a script either writes every file of the change or none, and refuses to overwrite another writer's save; downloading a source gives up after set limits and resumes without starting over; and the downloaded source files can be listed, backed up and restored by their fingerprint.

*Built in version 2.1, F14 of the review of 2026-09-27 (A04, A06, A07, A08), under the plan the owner asked on
2026-09-28 to be built on the `v2` branch. Built by an agent in a worktree of its own and merged; no person has reviewed
the code.*

The data changed file by file. A migration that stopped part-way left some tables new and the rest old, and two scripts
that had read the same tables could each save, the second over the first without knowing. A fetch had no time or size
limit, and a run that stopped lost what it had fetched. The pipeline's live folders were spelled out in sixteen scripts.
And a re-read needs the source's bytes, which were in one private cache with no way to list, back up or restore them.

- **A save is one transaction** (`scripts/data/table-io.mjs`). `openTables` records the digest of the manifest and of
  every table it read; `save` refuses, writing nothing, when any file it would replace moved since, and names them. It
  stages every file whole, takes a journal (`data/.save-journal.json`, linked into place so it appears whole and only
  once), renames the files into place with the manifest last, and drops the journal. The next `openTables`, `save` or
  `data:fmt` finishes a journal a stopped save left, so after an interruption the world is the old one or the new one,
  whole; `data:check` fails while one is pending. An applied batch writes its tables, acceptance baseline and ledger in
  the same save. The files written are byte for byte what the old save wrote.
- **A fetch is bounded and resumable** (`scripts/ingest/fetch.mjs`): 30 s to answer, 120 s for the body, 30 s of silence,
  64 MB, four tries for a timeout, reset, 408, 425, 429 or 5xx, at most six requests in flight. What still fails is
  `unreachable` or `too-large`, its reason first in the note. Each finished document is journalled as it finishes, and
  bytes are stored whole under their digest, so a stopped run resumes without fetching a finished one again.
- **The live paths are named once** (`scripts/ingest/context.mjs`), where they always were; `H2C_INGEST_ROOT`,
  `H2C_PROPOSALS` and `H2C_DOCUMENT_CACHE` move them for a campaign of its own.
- **The source store** (`npm run data:sources`): `--manifest` says, per registered source, whether its bytes are present
  and hash to its digest and whether its text is cached; `--export` copies the verified bytes out by digest with their
  provenance; `--restore` takes back only bytes that hash to a registered digest. It never fetches. On 2026-09-28: of
  1,648 sources, 1,512 have their bytes and they verify, 123 have none here, 12 record no digest, and one's cached file
  hashes to another digest (OPEN-PROBLEMS §19).

**Amended 2026-09-28, source backup (GOALS step 2 evidence custody, C13).** The owner's private store is on OneDrive
Personal, named by `H2C_SOURCE_BACKUP` in the shell profile; the repository records the variable, not the machine path.
The export includes every verified digest in the source register and import ledger, including held/deferred and
record-tier documents. Its manifest names registration, document key and ledger status. `--derived` preserves cached
text (including older reader versions), optical PDFs and reviewed page images with independent digests. Derived files
restore only after their original document verified. Re-export retains intact files; it never fetches. `doctor` reports
backup age and missing/damaged present digests; `ingest:apply` reminds the reader to re-export after an applied batch.
The first export and an empty-cache restore rehearsal are recorded in
[audit response](audits/2026-09-28-gap-closing/RESPONSE.md). Reviews and the restore rehearsal were performed by a Codex
AI agent; no human evidence review is implied.

**Amended 2026-09-28, later originals at one URL.** URL alone identified a source in the schema/import guard, so a new hash-verified retrieval at an unchanged maker URL could not enter without replacing the old source or inventing a URL. The schema now makes (URL, SHA256) unique. A later retrieval needs a distinct SourceID and digest, a later access date, and an explicit named review pinning the earlier SourceID and its recorded digest. A metadata-only corroboration/register/provenance entry with `Not recorded` needs a written missing-digest reason; it is preserved, never claimed recovered. Same-byte duplicates and reused identifiers remain refused. Sources continue to be joined by SourceID/digest. Tests cover wrong pins, duplicate bytes, reused IDs, missing reviewer and the schema pair. This fixes the custody check; no requirement rule changes.

Answers moved: none: source-store operations change no decision data. Reversing it lets a stopped or concurrent edit leave the tables half
changed, and a stalled download stop an import run.

## D105. A query is of one generation; a decision can be traced; the loop is measured

> **In plain words:** The SQL file you query says which release of the data it is of and never mixes the tables as they are with an older compiled database; one product's decision in a saved scenario can be traced record by record from the command line; and what the build and checks cost is measured step by step.

*Built in version 2.1, F13 and F16 of the review of 2026-09-27 (A05, A11; the plan's 3.3), under the plan the owner asked
on 2026-09-28 to be built on the `v2` branch. Built by an agent in a worktree of its own and merged; no person has
reviewed the code.*

`dist/h2c.sqlite` set the tables as they are beside whatever `dist/db.json` was on disk, so after an edit and before a
build it showed the new measurement beside the old product value, and a query was answered from any file already
written, however old. A decision could be explained only on the page. And `verify:fast` reported one total, so what
spent the budget was a guess.

- **One generation** (`scripts/data/sqlite.mjs`). `_generation` stamps the release the tables, rules and engine make
  (D96), the compiled database it read and its release, the record tier's inputs and the writer's own code; `_tables`
  names each table's tier and release. `dist/db.json` is read only when it is of the release the tables make now;
  otherwise nothing is written and the command says to build (`--build` does). A plain query rewrites a file that is not
  of the inputs, or refuses; `--snapshot` answers from the file as written and says which release it holds. The file is
  written aside and renamed into place.
- **A partial search says so.** The full-text index is measured against every retrieved source: `fulltext` is complete,
  partial or unavailable, `v_sources_without_text` names each missing one and why, and a query of `documents_fts` while
  it is partial says so. On 2026-09-28, 1,500 of 1,642 are indexed.
- **A decision traced** (`npm run trace -- --scenario <file> --product <GradeID>`, `--json`): the saved scenario read
  as the page reads it and the selection run as the page runs it; for the product, the release, the policy, the states
  permitted and each state's verdict, and per requirement its status and reason, what was admitted unstated, and every
  record it rests on with its own words, typed conditions, locator and SHA-256.
- **The loop measured.** `npm run verify:fast` times each step against the 90 s budget (`--enforce-budget` fails over it);
  `npm run bench` measures the build cold and warm by stage, peak memory, sizes, each template's selection and, with
  `--growth`, the largest chemical group grown two and three times (`build/reports/bench.json`). On 2026-09-28, on an
  Apple M4 with Node 26: cold build 15.9 s (the estimate stage 14.0 s), warm 2.0 s, peak 709 MB, the page 6.6 MB;
  `verify:fast` 24 s warm and 78 s cold, and on Node 24, 25 s and 65 s; polylactide's 335 products grown to 670 took the
  estimate stage 37 s, to 1,005 90 s.

Answers moved: none. Reversing it lets a query mix two releases without saying so.

## D106. A product is named for what its maker's documents say it is, searched beyond the data sheet

> **In plain words:** Before a product is filed as "polymer not stated" or "hardness not stated", its maker's safety data sheet, pages, guides and older editions are searched; it is filed under what they name, and only what no document names stays in a home that says the maker does not disclose it.
> **Status:** In force; it amends D86 (the "hardness not stated" class is a family entry) and D87 (the homes are named for what is true of them).

*Decided by the owner on 2026-09-28: materials named "polymer not stated" and "TPU, hardness not stated" hold products
with good data, and naming them so is not acceptable; search the sources beyond the data sheets and name them. Built
in m223 by Claude agents (research and migration); the owner ruled on two nylons (R225, R226). No person has read the
pages. The record is `docs/audits/2026-09-28-polymer-names/`.*

D87 filed a product whose data sheet named only a family ("nylon", "TPE") in the family's "polymer not stated" home,
and D86 kept a class for a TPU whose name and sheet state no Shore rating. Both read only the sheet. Five research
agents searched the 41 products those homes held: their safety data sheets, product pages, printing guides, archived
editions, catalogues and listings. 28 of the 41 are settled by a document their maker published, and the owner filed two
more on the best evidence. Six TPUs print
their rating on the very sheet the database cites, in prose, which the reader does not read.

- **A product is filed under what its maker's documents name.** A safety data sheet's composition decides over a
  product page's marketing word. Fiberlogy's FiberFlex and MattFlex are called TPU on the relaunched site, and every
  safety data sheet since 2017 names a copolyester elastomer, whose density and melting point their sheets print, so
  they are TPC / TPEE. A document the migration cites is fetched, hashed, registered (Citation role `corroboration`)
  and its words checked on the cached page. A page image is read optically and checked by eye, and the source's Access
  note says so.
- **The owner may file a product on the best evidence where the documents fall short,** and the grade says it is
  inferred and why (R205). Yousu Nylon (its own safety data sheet names PA66; its melting point is a PA6's) and Spectrum
  ThermaTech PA (two retailers and a melting range) are PA66 so; they are PA66's first products.
- **What no document names stays in a home that says so:** "Nylon, maker-undisclosed polyamide" and its CF and GF
  siblings, and "TPE, maker-undisclosed elastomer". Each still holds products, is judged like any material, and is not
  estimated. The leads found for each product are in the record, for a later ruling.
- **The bio-based compounds are a PLA blend.** Their makers' documents say PLA-based, with a copolyester where they
  name the partner, so the PLA family's homes are named PLA blend and PLA blend-CF, and are still not estimated.
- **A thermoplastic vulcanizate is a material of its own,** TPV (M175), as TPS is (R196): it names a class of elastomer,
  and its sheet names it.
- **The "hardness not stated" class is a family entry** over the classes its products went to. The reader files a TPU
  that states no rating nowhere; it waits for a ruling that names its maker's rating (`scripts/ingest/classify.mjs`,
  `hardnessSplit`), and never takes the first class.

What it did (`build/snapshot/templates.csv`): no material's verdict changed in any template. 175 rows changed their
product counts: the TPU 95A class passes Indoor prototype on 30 of 30 products and Flexible component on 9 of 30. The
retired TPU class's 16 rows went, and TPV's 12 came. In research mode with estimates, three candidates changed, because
the model now learns from the moved products. Reversing it puts 21 products back under a name that says less than their
makers do.

## D107. The Ashby lens is a selection exercise: exact product states, one goal, a line that counts what it is drawn over

> **In plain words:** The Ashby chart draws each product that meets the requirements at the values of the state its answer is in, ranks and counts those same product states with the goal's line, and keeps material ranges, estimates and failed or unresolved products as labelled context; published catalogue values and test pairs stay available as evidence views.
> **Status:** In force; amended by D108 (no objective stages, no axis limits form, material ranges as D83), then D109 to D112 (the controls, views and marks as they now are).

*Directed by the owner on 2026-09-29: build the external review and plan of 2026-09-28 (the package
ASHBY-MAKEOVER-2026-09-28, B01 to B13) on the branch Ashby-makeover. The design is that plan's recommendation; built by
Claude (an agent), and no person has reviewed it or run the plan's engineering trial yet
(docs/audits/2026-09-29-ashby-makeover/README.md). Amends D21, D99 and D102. Amended by D108 the same day: the objective
stage and the axis limits form below are gone, the views are named Products and Material ranges, and the overview's
material band is the middle half of its products, variants apart. D110 put the catalogue, as Material typicals, beside
them in the Draw row, with the test pairs under More; D112 draws it as one dot per material.*

The chart was a browser of recorded properties beside an answer judged elsewhere. Its product view drew published values
while the answer was judged in a state (D99): a conditioned beam drew 247 dry points, and Fiberon PET-GF15 sat at its
as-printed 81.6 °C while it passed annealed at 133.7 °C. Its line was drawn among materials' typical values, which describe
different products, and counted another population (five ranked, four points above it). It read "73 of 8 candidates", 73
products over 8 materials. A strict "matched pair" could be a dry modulus and a conditioned strength of one sheet (27 of
352). The goal did not set its axes, the line sat under the chart, and a cost goal could not be drawn at all. And the
ranking itself read a state a product does not publish as its first: asked about the conditioned state, 78 materials
ranked on dry stiffness.

- **A named state is that state** (`stateOf`, `app/js/engine/products.js`). A product asked about a state it does not
  publish is judged, ranked and drawn in that state with no values, never its first state; only no name at all means the
  first state. A value the registry declares unchanged by the state (a density) is read from the first state and says so
  (`valueStateOf`). What it moved: 64 of 512 rankings across the templates, all in conditioned modes, each losing only the
  materials that ranked on a state they do not publish; the conditioned scope-only beam ranks one material (Onyx GF, the one
  product publishing a conditioned modulus and a density) where it ranked 78. No verdict moved.
- **One model** (`buildWorkspace`, `app/js/engine/workspace.js`): each product of the materials on screen in the state its
  answer is in, both coordinates from that state, its index, and its bucket: confirmed (passes), unresolved, failed. The
  chart, its result list, the inspector, the line, the stage and the exports read it; nothing is chart-owned.
- **Two work views.** *Decision products* draws the confirmed product states, grouped by material in the list and
  coloured by family; failed and unresolved products are layers off until asked for, counted apart, never ranked, counted
  on the line or put on the front. *Material overview* draws each material as the marginal span of its products on each
  axis, labelled so (the corners are not products), with its products as dots. The catalogue (typical published values)
  and the test-pair views of before stay, as evidence views under More, and say they are not the decision.
- **One goal.** `rankBy` is the goal of the table, the chart and the export; the chart's separate `plot.index` is gone.
  Choosing a goal sets its axes and Log scales in one action; a cost goal draws against *material cost per volume*, each
  product's own CAD/kg price times its own density (a twin's price is never read), and lists the unpriced. The line sits
  above the chart with a numeric box, a slider and steps to the next product state; its count is of the product states it
  is drawn over and their materials, apart from the material ranking (the median of passing products, unchanged).
- **An objective stage.** *Keep products above this line* stores `{ index, cutoff }` in the scenario (`stages`, at most
  three): the confirmed product states at or above it are kept, the materials on screen are those with a kept product, and
  the one ranking reads only them, in the table, the chart, Compare and every export. The requirements' verdicts and the
  status bar do not change. Removing it is one press. A line moved without it filters nothing, and a lasso only focuses
  the chart.
- **Ranges keep their meanings.** A material band is the spread across its products; a whisker is a source's own
  statistic; a dashed range is the estimate's likely interval, beside the products' measured span on the other axis rather
  than their median (13 had collapsed); the engine's screening bounds are shown in the inspector, never drawn. Estimated
  context follows the page's one rule: shown under Include uncertain with estimates on, never under Confirmed only, and
  unavailable for a conditioned question, since an estimate describes dry products as printed. An estimate's inspector
  gives the index over its rectangle's corners, said to be a bound over two independent ranges, not a confidence interval
  or a rank.
- **Evidence pairs are one condition** (`pairCompatibility`, `app/js/ui/axes.js`): a strict pair agrees on moisture,
  treatment and schedule, specimen form, direction and document, or names what one side leaves unstated; mixed
  exploration names every conflict. A value the registry declares unchanged by moisture and annealing may pair across
  them.
- **Scenario version 2.** A version 1 scenario keeps its whole question; where the table's ranking and the chart's guide
  differed, the ranking wins and the reader is told; a chart that had been in use opens in the catalogue or evidence view
  it was saved with, said so, never silently turned into an exact-state picture.

The filter rail can be hidden on a wide screen too, a viewer's choice kept in the browser, so the chart can take the width:
at 1440 x 900 the plot then has at least 700 x 450 px of plotting area, and at 1024 x 768 at least 520 x 360 with the
results under it (`npm run ui:check` fails otherwise). The plan offered estimated context under Confirmed only as well; it
was not built, so that Confirmed only stays measured evidence alone on every view of the page.

What it did: across 64 question and mode answers (six templates, scope only and the review's H2C beam; both policies, dry and
conditioned, with and without annealing) no verdict moved; 64 of 512 rankings moved, as above
(docs/audits/2026-09-29-ashby-makeover/evidence/rank-diff.json). The compiled database moved nothing (`npm run build:diff`:
0 differences; the release moved with the engine). Reversing it draws published values beside answers judged in states,
counts one population under a line drawn over another, and ranks conditioned questions on dry stiffness again.

## D108. The Ashby lens has one control row, one place for requirements, a line that filters nothing, and material ranges as the table's

> **In plain words:** The chart's controls look the same in every view and never change their words as you work; requirements are set only in the filter rail, and the chart's requirement lines open it; the goal's line is a guide that counts what is on its better side and removes nothing; and a material's box is the middle half of its own products, with variants such as wood or metal fills drawn apart.
> **Status:** In force; it amends D107; amended by D109 (the Show and More menus became the Draw and Also rows, the axes moved onto the chart) and D110 (a variant drawn as its shape ringed with a dot, not a diamond).

*Directed by the owner on 2026-09-29, after using the lens D107 built: its menus changed as they worked, a filter could be
set in several places, and PLA's range covered nearly every polymer. They asked for the lens to be reworked as a UI and UX
expert would, a two-level menu allowed where it helps. Built by Claude (an agent); no person has reviewed it, and the
plan's engineering trial has still not run. Amends D107.*

What a reader met, walking the D107 lens through the H2C beam (docs/audits/2026-09-29-ashby-makeover/README.md, "Revision
after the owner's walkthrough"):

- **Menus that changed under the reader.** Each axis option carried a live count ("Stiffness (153 product states · 42
  materials)") that changed with every filter and was cut off by its box; the Axes fold opened and closed itself by the
  goal; Layers and More opened inline and pushed the chart down; a layer (set aside by a stage) came and went.
- **Four ways to narrow the answer.** The filter rail; "Edit requirements", which opened it; *Limits on these axes*
  under More, a second form for the same requirements; and *Keep products above this line*, an objective stage that
  narrowed every lens. The rail's requirements were already drawn on the chart as red dashed lines, as they had been
  before D107.
- **Five counts of one picture**, each a little different: "84 shown", "682 product states, 84 materials", "10 product
  states across 7 materials (of 142)", "33 of 78" in Layers, and the axis menus'.
- **A PLA band that covered everything.** The overview drew each material from the lowest to the highest of its judged
  products, variants included. PLA's band in the scope-only chart ran 800–1400 kg/m³ by 0.43–4.2 GPa over 32 products:
  PolyWood (a lightweight additive, 800 kg/m³) and Eryone PLA-Lite (an undisclosed dense filler, 1400) set the density
  ends, though the build keeps both out of PLA's spread (1170–1329 kg/m³ over 146 products), and one sheet set each
  stiffness end. The table two tabs away summarised PLA differently from the chart.

What changed:

- **One control row** (`toolbar`, `app/js/ui/decision.js`), the same in every view, the evidence views included: the
  view (*Products*, *Material ranges*), each axis as a menu of property names in one fixed order and nothing else, Lin and
  Log, swap, and two menus that open over the chart: **Show** (what else is drawn, and the references for scale) and
  **More** (the evidence views, the exports and the release). An item that does not apply is greyed with its reason, never
  removed; a menu closes on a press outside or Escape. The counts the axis menus carried are the chart's own lines and the
  result list's.
- **The filter rail is the one place a requirement is set.** *Limits on these axes* is gone; the question bar reads the
  rail back under *Asked* with **Change in Filters**; each requirement's label on the chart opens the rail at it.
- **The line is a guide** (`lineControl`): it says how many products, from how many materials, are on its better side,
  and is drawn into the ranking as a rule between the materials on either side of it. The objective stage
  (`objectiveStages`, `scenario.stages`, the set-aside layer, the stage columns of the exports, the table's and Compare's
  stage notes) is removed. The ranking a goal gives is the material ranking of D102 again, over every passing product. A
  scenario saved with stages keeps its question; the line is placed where its goal's stage cut, and the notice says nothing
  is set aside (`validateScenario`).
- **One count**: "N products from K materials" in the line, the chart's line of counts and the exports. With one judged
  state per product, a count of product states is a count of products, and the state is named on every mark.
- **Material ranges as the table's** (`marginal`, `app/js/engine/workspace.js`): the box is the middle half of the
  material's own products on each axis from four products up, with the build's quantile (`build/src/products.js`), and
  their full range below four; whiskers through the medians reach the lowest and highest; a declared variant (the grade's
  Variant column, D57) is drawn as a diamond outside the range. PLA's box in the scope-only chart is now 1230–1250 kg/m³ by
  1.5–2.8 GPa over 29 products, with whiskers to 1170–1310 and 0.43–4.2, and PolyWood, PLA-Lite and SimuBone drawn apart.
- **Less to read first.** The question is two lines; *Reading this chart* is closed until opened, with one line of counts
  above it; the result list's explanation is a sentence with the rest in its tooltip.

Left as it was: the filter rail's family counts, which say how many a click would leave and keep one order; and the
spread that remains inside PLA's box. That spread is the sheets': printed test bars under three standards and speeds (ISO
527, ASTM D638, GB/T 1040 at 50 mm/min), infill mostly unstated, and toughened grades beside plain ones. The chart draws it
honestly; narrowing it is a data question (OPEN-PROBLEMS §20).

What it moved: no verdict and no ranking without a stage (the stage was the only thing the ranking read besides the passing
products); the compiled database nothing (`npm run build:diff`); the release, with the engine. Reversing it brings back
menus whose words change as the reader works, four places to narrow one answer, and a band drawn from the extremes of
every product, variants included.

## D109. The Ashby lens keeps every option, in three rows with one planned effect each, and keeps the reader's place

> **In plain words:** The Ashby chart keeps all its choices, laid out as three labelled rows (what to draw, what else to draw, the goal's line) with the axes on the chart itself; every choice shows its state where it is, does one planned thing and leaves the rest alone; and nothing a press does throws away the reader's zoom, list search, scroll or open folds.
> **Status:** In force; it amends D108; amended by D110 (the view order and names, test pairs and exports under More, details in place of the list, the pills on the chart's top-left corner).

*Directed by the owner on 2026-09-29, after using D108: still very confusing; imagine every combination the menus make
with the filters and the top bar, and how a user would find the one they need; clicks still reset what they were doing;
the list on the right does strange things; estimates mesh the screen. They asked to keep the free choice, with the flow,
the effects and the look planned. Built by Claude (an agent); no person has reviewed it, and the plan's engineering trial
has still not run.*

**What was wrong, measured** (headless Chrome, the H2C beam; `docs/audits/2026-09-29-ashby-makeover/README.md`):

- **Combinations.** The lens alone offers about 4.2 million discrete settings (goal 9, view 5, axes 11 by 11, scales 4,
  layers 8, estimates 2, references 2, familiar filament 6); with the top bar and status chips, about 800 million, before
  the rail's 86 controls. A reader has perhaps four tasks. The count itself was not the trouble: the settings sat in four
  places, some inside menus, some hidden until a mode was on, and several moved each other without saying so (Include
  uncertain raised the header's count and left the chart as it was; estimates needed a switch at the top and another in a
  menu).
- **Resets.** The lens is rebuilt on every change, and with it went the list's search (typed "PA", seven materials; after a
  change of scale, empty, 41), its scroll (a star lower down threw it to the top), its open folds, and the chart's zoom (a
  switch drew the whole picture again).
- **The list.** One row held five presses with five effects, none said: the name zoomed the chart, and the zoom outlived
  goal and mode changes, its way back under the chart, off the screen.
- **Estimates.** For the beam, 40 dashed boxes beside 14 products: 34 of materials the requirements could not settle, 6 of
  materials that fail; 28 spanning more than three times in stiffness, 5 covering more than half the chart.

**What changed:**

- **Three rows, read top to bottom** (`toolbar`, `app/js/ui/decision.js`): *Draw* (Products, Material ranges, Published
  data, and which published data; Export at its end), *Also* (chips: Unsettled, Failing, Estimates, Pareto front; for
  scale, Metals & wood and a familiar filament), *Line*. The axes sit on the chart they set, in a bar across its top
  (`axisBar`): the vertical axis at its left and the horizontal at its right, each by name with its unit and scale, the swap
  between. Every option is in view; the state of each is on its face (a pressed chip); only Export and the kind of
  published data are a second level. An option that does not apply is greyed with its reason.
- **One planned effect per control.** The table below is the contract (`wireControls`, `app/js/ui/ashby.js`): a change
  of axes starts the picture whole, since a zoom on other axes means nothing there; nothing else resets anything.
- **The reader's place is kept** (D109's `listUi` and `zoomMemory`): the list's search, scroll and open folds, the
  page's scroll, the focused control, and the chart's zoom on the same axes survive every redraw. What narrows the picture
  is said on the chart, top right, with the way back: "Zoomed to PA6-CF · Show all", "Picked out: PA6-CF ×". A
  double-click on the chart gives the whole picture back.
- **The list does one thing per control**: the name picks the material out on the chart (the rest fade, nothing zooms);
  ⤢ zooms; "best" opens the product; ☆ shortlists; the fold lists the products. The inspector has its own place under the
  list, so opening it never moves the list's rows; the row of the product opened, from the list or the chart, is kept in
  the list's view.
- **Unsettled products follow Candidate confidence** until their chip is pressed (`layerOn`): Include uncertain lists
  them in the table, so the chart draws them too. The scenario holds `null` for "follow the mode", so a link reopens as it
  was left, however the reader got there.
- **Estimates as a shade.** Only for the materials on screen (not those the requirements failed), and drawn as a faint
  wash with no outline; the picked material's range is outlined. The beam's 40 dashed boxes became 21 washes.

| You change | What changes | What stays as it was |
|---|---|---|
| The goal | the line's formula; the axes and Log scales become the goal's, so the zoom starts whole; the line at the fifth-ranked median | the view, the Also chips, the pick, the list |
| Draw: Products, Material ranges, Published data (and which) | what is drawn | axes, zoom, goal, line, chips, pick, list |
| An axis, a scale, the swap | the axes; the zoom starts whole | the goal (its line says why it is not drawn, with the way back), view, chips, pick, list |
| An Also chip | that layer | everything else, the zoom included |
| The line | its position, its count, and its rule in the ranking | everything else |
| A filter, Candidate confidence, Use estimates | the answer: what is drawn and ranked; Candidate confidence also hands Unsettled back to the mode | axes, zoom, goal, view, the chips the reader set, the list; the pick while its material is on screen |
| A material's name in the list | picks it out, the rest fading, or lets go | the zoom and everything else |
| ⤢ on a row | zooms to its products; "Zoomed to …, Show all" on the chart | the pick and everything else |
| "best" or a product in the list | the inspector opens under the list, and its material is picked out | the list's rows, where they were |
| A mark on the chart | the inspector; its material picked out and its row brought into the list's view | the zoom |
| A drag, a double-click on the chart | zoom in; the whole picture | everything else |

What it moved: no verdict, ranking or count (the engine is untouched; `npm run build:diff`: 0); the chart draws unsettled
products under Include uncertain where it drew none. Reversing it brings back a lens whose every press throws away the
reader's place.

## D110. The Ashby lens draws coarse to fine, keeps a shape per filler everywhere, and opens details in place of the list

> **In plain words:** The Ashby chart's views run from one dot per material (Material typicals) through each material's range to every product; the raw test pairs sit under More; a product's shape says its filler on every view, and its fill says whether it passed; and pressing mark after mark swaps one set of details in the right-hand panel instead of piling them up.
> **Status:** In force; it amends D109 (and D108's variant mark); amended by D111 (Material typicals on the same layout, frame, size and ticks as the other views).

*Directed by the owner on 2026-09-29, after using D109: keep only the typical values as the published view, under a name
that says what it is; the test pairs rarely, as a hidden option; the order typical, ranges, products, left to right; and
the right-hand panel got messy when marks were pressed one after another. They also agreed that shape should mean filler
on every view. Built by Claude (an agent); not reviewed by a person.*

- **Draw, coarse to fine:** *Material typicals* (one dot per material at its products' median datasheet value, as printed
  and dry, whatever state the question asks about), *Material ranges*, *Products*. The test pairs, matched and mixed, are
  under **More**, with the exports, headed "Raw measurements"; while one is drawn, a line under the rows says so, with
  **Back to Products**. The Pareto front is a chip in Material typicals as in Products, drawn only when pressed.
- **Shape is the filler, on every view:** circle unfilled, diamond carbon fibre, square glass fibre, triangle ESD, star
  foaming, hexagon an undisclosed variant (it had been a hollow circle, which on the Products view means "could not be
  settled"). How a shape is drawn is its status: filled passes, hollow could not be settled, small and faint fails. In
  Material ranges a declared variant is its shape ringed with a dot, and a material's medians are a thin plus where its
  whiskers cross (a square there had read as glass fibre).
- **Details replace the list.** Pressing six marks in a row had opened one more material's product list each time (0 to
  5), thrown the list's scroll about (1199, 1064, 2242, 278, 3372) and squeezed the details into an 88 px box under the
  status bar. Now a mark's details take the panel, under a bar with **← Ranking** that never moves; the next mark swaps
  them in place; Ranking brings the list back as it was left, the picked material's row in view. The panel ends where the
  screen does.
- **The pills on the chart's top-left corner.** In the axis bar they wrapped it and moved the chart down; at the top right
  the chart's own tools covered them. The "better" note moved to the bottom right.

`npm run ui:check` presses marks on the chart with the mouse and fails if the list stays under the details, a second panel
appears, Ranking does not bring the list back, or its open folds change. No verdict, ranking or count moved.

## D111. Every view of the Ashby lens is laid out, sized, framed and labelled by one rule

> **In plain words:** Switching between Material typicals, Material ranges and Products no longer moves anything: the list stays beside the chart, the chart keeps its place and size, the legend sits in one place, the axes are framed on what is drawn and labelled with plain numbers, and what the typicals view says about itself is said the way the other views say it.
> **Status:** In force; it amends D110; amended by D112 (Material typicals drawn as one dot per material).

*Directed by the owner on 2026-09-29: a final look at the typicals view and its settings, "something looks off"; make sure
everything is as designed. Found by driving the built page (headless Chrome, seven questions and settings, three screen
sizes, both themes) and measuring what moved. Built by Claude (an agent); not reviewed by a person.*

What was off, and why: Material typicals is the chart from before D107, and it still drew itself by its own rules.

- **Its layout jumped.** It put the list under the chart, off the screen, drew the chart full width with its legend beside
  it, and sized it by width; the other views keep the list beside the chart and fit the chart to the screen. Moving
  between the three views moved the chart, its size and its legend every time. Now one rule sizes every view
  (`lensChartSize`, `app/js/ui/chart.js`), and the list stays beside the chart: switching views changes the marks and
  nothing else (the plot measured at the same place and size in all three).
- **Its frame ran to the whiskers.** It framed the chart on every line drawn, so each material's product extremes set
  the axes: the H2C beam's eight materials, all at 3 GPa or more, sat in the top third of an axis running to 0.5. It is
  framed as the others are, on the points, what is drawn for scale, and a requirement near them.
- **Its Log axes read as stray numbers**, as the other views' did across more than a decade: a "2" above "10", a "5"
  under "0.01". Every Log axis now labels its ticks with the numbers themselves (`logTicks`: 1, 2 and 5 per decade to
  three decades, 1 and 3 to six, then decades), kept so as the reader zooms.
- **It said things another way.** Two banners ("Only 8 points…", the reference caveat) pushed its chart down; its notes
  were always open under a heading, its key had a "Marks" heading, its axis titles had no "· log", and its Line row and
  starter were missing, so the controls changed height. It now says what it draws in one line under the chart and folds
  the rest, as the others do; the caveat is the key's "Grey box" entry and a line in the notes; the Line row stays,
  saying the line is drawn over products, with the way to Material ranges and Products; the starter shows on every view.
- **Its list did not match it.** With no goal the list counted products on these axes (two materials) beside a chart of
  28; its rows offered to zoom and spoke of products drawn. With no goal it lists the materials drawn; rows zoom only
  where products are drawn; a picked material fades the rest here too.
- **Metals & wood** widened this view to steel but not the others, where pressing it could show nothing; every view now
  frames what is drawn for scale, and a reference's name near the left edge runs inward.

No verdict, ranking or count moved.

## D112. Material typicals is one dot per material, which says what it stands for and where its passing products are

> **In plain words:** The Material typicals view draws each material as a single dot at its typical datasheet value, with no box or whiskers around it, and the dot says it is the whole material and how many of its products pass, pointing to Material ranges for those.
> **Status:** In force; it amends D111.

*Directed by the owner on 2026-09-29, after asking whether Material typicals and Material ranges differ and serve their
purposes. They differ in what they stand for, and the drawing hid it: both drew a box and whiskers. Typicals' box was every
product of the material, dry and as printed, whatever the question; ranges' is the products that pass, in the state asked.
Inside a question the typical could sit on the wrong side of a requirement the material passes: in the H2C beam PLA's
typical stiffness is 2.58 GPa, box 1.8 to 2.9 over 43 products, while the one PLA product passing 3 GPa is at 4.2. Built
by Claude (an agent); not reviewed by a person.*

- **One dot per material**, at its typical value (the median of its products' datasheet values, as printed and dry), and
  nothing drawn around it: the spread of a material's products is Material ranges', for the products that pass.
- **The dot says what it is** (`typicalNote`, `app/js/ui/ashby.js`): "Whole material, all its products: the median of
  43 on stiffness, 146 on density, as printed and dry. 1 of its 200 products passes: see Material ranges", in short lines.
  Under the chart, the line of what is drawn ends "Which products pass: Material ranges", a press away.
- Estimated ranges, the Pareto front, references and the familiar filament stay as they were.

`npm run ui:check` fails if a typicals view draws more dots than materials, draws a spread around them, or a dot does not
say it is the whole material and where its passing products are. No verdict, ranking or count moved.

## D113. A price may come from a foreign listing, converted at one Bank of Canada rate, and it lists nothing in Canada

> **In plain words:** A product that no Canadian shop in the sample sells can be priced from its maker's or a seller's foreign listing, in USD or EUR, converted to CAD at one frozen Bank of Canada rate and marked as converted; it never counts as listed or in stock in Canada, and a Canadian price always wins over a converted one.
> **Status:** In force; it amends D19 (a foreign listing prices a product but is never an offer here) and D83 (a converted price is one of a material's products' prices).

*Decided by the owner on 2026-09-30 (GOALS, "Decided on 2026-09-30, the price pass"): a price for each material, CAD
first, then USD, then EUR. prices.csv could hold only CAD: its amount columns were named "CAD" and Currency allowed
nothing else, so a foreign amount had nowhere to go but a CAD column, which the gap-fill handoff of 2026-09-29 forbade.
The contract follows that research's 04-PRICES, cut to what the pass needs. Built by Claude (an agent).*

- **The table is currency-neutral** (m227). List, sale and displayed prices are the amounts the page printed, in its
  Currency (schema/vocab/currencies.csv). Market is a vocabulary that declares whether it is Canadian
  (schema/vocab/markets.csv): a Canadian retailer or maker's store, and Amazon.ca where the seller is the maker's own
  store, are; a USD or European storefront is not, wherever the shop is based. A Canadian listing is in CAD (PRICE-MARKET-CURRENCY). VAT included % holds
  the rate a page states its price includes; Not published, a rate nobody printed, makes a listing uncomparable
  (PRICE-TAX-UNSTATED).
- **One rate per currency is in force**: the latest row of fx_rates.csv for it, a Bank of Canada daily rate read from a
  fetched, hashed Valet document. Every foreign listing of a release is compared at that rate, never at a rate of its own
  day, so two listings seen a week apart are compared on one footing. A currency without one stops the build
  (PRICE-FX-MISSING). No live call: the page is offline.
- **Regular CAD/kg is derived, never stored** (D47): list price, less the stated VAT, per net kilogram, times the rate
  (CAD: 1), to the cent. A Canadian listing's is exactly what it was, and the 104 listings of 2026-09-10 gave the same
  prices, stock and answers after m227 (build:diff: the new meta and rate fields only).
- **A Canadian price is never outvoted.** A product's price is the median of its Canadian headline-sample listings where
  it has any, and of its converted foreign ones only where it has none; a material's is still its plain products' median
  (D83), and says how many of them were converted. The page marks a converted price with ¤ and says from what, at which
  rate date, before VAT, with no claim on shipping, duty or stock here.
- **Canadian listing stays its own fact.** A foreign listing is never a buy link, never the proof a product is in stock
  in Canada, never "Listed in the Canadian price sample", and never closes a material's Canadian-price coverage gap:
  `buy`, the buyable gate and the Canadian-price domain read Canadian listings only (D19, D98). An unpriced product still
  borrows no one's price, a twin's included (D89).
- **What it does not do**: shipping, duty or a landed cost; a recurring fetch; a currency the Bank of Canada does not
  publish. The price sample's size is counted from the data (meta.priceSample), so "three Canadian retailers" no longer
  appears anywhere as a constant.

`test/prices.test.js` checks the arithmetic on made-up listings (a USD half-kilogram spool at the rate in force, a EUR
price with its stated VAT, a rate not printed, a missing rate, a Canadian price beside a converted one), and
`test/database.test.js` that no foreign listing is a buy link and that every product priced from one says so.


## D114. Absence is derived too: the coverage page says the same thing for the same records

> **In plain words:** Where a material has no records of a kind, the build now says so itself, as it already said where it had them; the coverage page therefore shows a gap the same way for every material, and a price read only from a foreign listing as limited.
> **Status:** In force; it extends D74.

*Found on 2026-09-30, when the owner asked whether the coverage page was correct after the price pass. Every cell agreed
with the records (no gap beside data, no evidence claimed without it), but the page said one thing two ways. Built by
Claude (an agent); the record is [the coverage check](audits/2026-09-30-coverage-check/README.md).*

- **The same absence read "Gap" or blank.** D74 derived a row only where the records prove evidence. Stored Gap rows
  stood on some of the first workbook's materials, 63 of them the one templated sentence "Insufficient grade-specific
  evidence in sampled sources. Shared family notes may be available; no numerical substitution."; a material added
  since had none, so the same absence showed "–" on one material and a blank, which the legend did not explain, on the
  next: neither PC-GF nor PC-ASA has a price, and PC-GF's cell read "–", PC-ASA's blank. 221 cells were blank that way.
- **The build derives absence as it derives evidence.** For each domain `coverage-rules.js` defines (H2C status, print
  setup, mechanical, thermal, environmental, price), a pair no stored row speaks for and the records show nothing for
  gets a derived Gap naming what is missing. A stored row still wins. A family entry gets none: it owns no product. The
  Application domain stays stored only (D74), so a blank cell now means one thing: not assessed.
- **Price coverage says how a material is priced.** A Canadian listing is recorded (✓); a price converted from a
  foreign listing only is "Limited comparability" (◐), naming the currencies and the rate date (D113); no price is a Gap,
  which names any listing of the material's that is out of stock. 11 of the 25 templated price Gaps had read "–" beside
  a converted price.
- **The rarely published properties are derived from the measurements.** One templated list stood on 82 materials and
  none on the rest, and five of the lists named six properties the material's own products publish (the fatigue life
  of ASA, PC, PA12 and PC-ABS, the thermal conductivity of PC and PC-PBT). Each material's list is now what its
  measurements leave out.
- **145 templated rows left through the removal ledger** (D72), 63 Gaps in derived domains and 82 rarely-published
  lists, kept verbatim in the audit folder. The build's derived rows replace each with the same status, or a truer one.
- **Two more things the page now says.** A conflict recorded in a domain the grid has no column for (a composition, a
  source contradicting itself) is named under the grid, since the legend promises ✕ for a conflict. And C01110, the
  quarantine of a PLA Pure listing filed under ABS, which showed ABS's price as a conflict beside ABS's own listings,
  is resolved: the listing is filed under PLA Pure (G001-183) since m233.

`test/database.test.js` checks that every derived row agrees with the same rule the validator applies: evidence only
with records, a gap only without, a limited price only where the price is converted.

---

# Bugs worth remembering

Each is pinned by a test. They are listed because all of them produced plausible-looking wrong
answers rather than failing.

| Bug | What it did | Pinned by |
|---|---|---|
| Leading minus in the number pattern | Read the dash in `255-275C` as the sign of -275, which failed the plausibility window and collapsed the range to 255 | `normalize.test.js` |
| Annealing text scraped as a chamber requirement | `Room Temp. Annealing temp. and time 100 °C/16H` wrongly excluded four printable support materials | `normalize.test.js` |
| Silence outranking evidence in gates | Reported PEEK as "unknown" despite two profiles demanding 430 and 480 °C | `database.test.js` |
| Excel booleans | SheetJS renders them `TRUE`/`FALSE` while the stored XML holds `1`/`0`; every price headline failed to verify | `normalize.test.js` |
| `String.replace` with a string payload | `$&` in minified library source scattered the placeholder tag through the bundle 30 times | asserted in `bundle.js` |
| Plotly shape coordinates on log axes | Are in log space; passing raw values put the steel reference rectangle at 10^215 | visual |
| Policy drift | An unrecognised policy made verdict and eligibility disagree, so a shared Explore link rendered as Strict | `constraints.test.js` |
| `text-overflow: ellipsis` on table cells | Clipped the UNKNOWN chip to a stray dot and "Not published" to "Not publis…" | visual |
| Cross-grade estimate ranges | Turned one PolyMide datasheet into "2.223 to 2.223 GPa" | `database.test.js` |
| Compare bar fill was a `span` | An empty inline element ignores width and height, so the lens whose entire purpose is aligned bars drew empty tracks for every material, for as long as it existed | visual |
| Search ran over the filtered set | Setting a heat requirement and searching "PLA" returned nothing, which reads as "PLA is not in this database" | visual |
| A second path describing a constraint | Printed `hdt045 >= 100` in the explain panel while the pill beside it read "Heat resistance at least 100 °C". Found twice more after the first fix | visual, swept per `ARCHITECTURE.md` |
| Degree symbols dropped in gate reasons | "Needs up to 290 C" beside every other temperature in the app written "°C" | `normalize.test.js` |
| Substring search | "PLA" matched "thermo**pla**stic", so searching the most common filament returned every TPU and TPE | `search.test.js` |
| Estimates absent from every chart | A quarter of the in-scope set vanished from the Ashby lens, and Compare printed "Not published" for a value the engine was actively using to exclude the material | visual |
| Any remark treated as a relaxation | Strict measurement mode warned that it had mixed conditions, and drew comparable points hollow, because the source had not named a specimen form | visual |
| Unmatched search diagnosed as hidden results | Searching a name the database does not hold reported "102 materials match, but you have hidden them" and offered a button that changed nothing | visual |
| Scenario import skipped half the state | Loading a file set the requirements but not the lens, columns, baseline or estimates switch, so the screen and the file disagreed | `scenario.test.js` |
| Invalid scenario committed before rendering | `{"constraints":null}` replaced the session and then threw | `scenario.test.js` |
| `location.origin` on a file | Is the string "null", so every link copied from a local file was unusable | visual |
| Compare evidence dots | Rendered by the shared value renderer and never wired, so the dot did nothing exactly where a difference needed checking | visual |
| Chamber rows dropped at a page break | Fourteen Bambu data sheets carry a chamber window as the first row of page 2, and none was transcribed, so PC FR, PAHT-CF and every Bambu PLA and PETG reported "no chamber requirement published" | `database.test.js` |
| A chamber window read by its upper end | ABS-CF's 50–70 °C failed the chamber criterion, though 50–65 °C is reachable | `normalize.test.js` |
| A class envelope used for screening | Would have screened CPE out of "elongation at least 100%" though its data sheet reports 150%; found in the prototype, never shipped | `constraints.test.js` |
| Another grade's value taken as the material's | One PLA grade at 46 MPa screened generic PLA out of "strength at least 60 MPa"; found while building D42, never shipped | `database.test.js` |
| Hardcoded rail counts | "45 of 102 state an abrasion requirement" counted profiles, not materials; the true figure is 27 | derived from data now |
| Bambu chemical table rows omitted | The shared “Other Physical and Chemical Properties” table disappeared for 19 exact grades, leaving 98 source-backed findings out of the database | `database.test.js`, coverage-consolidation plan |
| Environmental evidence copied from family notes | 31 materials appeared to own another material's exposure evidence, while some exact-grade records were omitted | `database.test.js`, `validate.js` |
| Coverage contradicted the records | Rows said `Gap` beside measured/profile data or `Evidence recorded` with no record owned by the material | `database.test.js`, `coverage-rules.js` |
| Existence-only referential checks | A valid measurement and a valid grade could be joined under the wrong material without an error | mutation tests in `database.test.js` |
| Estimates blind to the material's own related evidence | PA-CF strength shown as 38–204 MPa beside its own 72 MPa break strength; the table then showed the 72* and hid the estimate the filter was using | `database.test.js`, D43 |
| A heat load lost at a line break | 22 3DXTECH values printed "at 0.45 MPa (66psi)" were recorded as load not stated, so PLA, PP, PA12-CF, PVDF and 14 more could neither pass nor fail a heat requirement | `database.test.js` |
| A standard number read into its value | iSANMATE's "ISO 11357 80°C" became a glass transition of 1135780 °C | `database.test.js`, plausibility screen in `build/src/estimate/observations.js` |
| A decimal comma and a film method | iSANMATE PLA "110,3 MPa" under ASTM D882, a thin-film test, was recorded as 3 MPa for a printed part | `database.test.js` |
| A method designation read as the value | iSANMATE PETG-GF "Vicat A/120 … 72" was recorded as 120 °C | `database.test.js` |
| An unstated heat load read as open-ended | PLA Lite's 53 °C stayed a candidate for "heat resistance at least 100 °C": a value at an unknown load was bounded below only, though the 0.45 and 1.8 MPa values of an amorphous polymer sit within about 10 °C | `constraints.test.js`, `database.test.js` |
| A conditioned value read as dry | The wet conversion matched the word "wet", so 84 "Conditioned: 70% RH" rows counted as dry; dry nylon stiffness was estimated about 10% low | `database.test.js` (kindOf), D53 |
| Two tables of one data sheet given one set of conditions | PolyMide PA6-GF's dry values said "Conditioned" and its conditioned values carried the dry note; the lint's "duplicate" was the dry and the conditioned result | lint MEAS-CONDITIONS-INDISTINCT, `lint.test.js` |
| Un-notched impacts filed as notched | Every Fiberon block prints notched, then un-notched X-Y and Z; 18 un-notched rows said Notched | m13; source audit |
| Values printed after a separator never transcribed | Bambu's "32.0 kJ/m²; 8.2 kJ/m² (notched)" kept only the first; no Bambu melt index and many Spectrum and Fiberon heat deflections were entered | `npm run audit:sources` |
| A bound treated as an exact value | "> 16.5 MPa" pinned PEBA's strength estimate to 16.4–16.6 MPa; excluding bounds instead dropped OBC's elongation from 868% to 38% | `database.test.js`, D53 |
| A lightweight grade pulling its family | HyperLite PP's 0.81 g/cc was a model outlier and lifted nothing but noise into polypropylene | `database.test.js` (grade variant), D53 |
| HDT load spellings missed | "1.81 MN/m²", "1.820 MPa", "ISO 75-2, HDT A" and "0,45 MPa" read as load not stated | `normalize.test.js`, D49 |
| Moulded values filed as printed | Spectrum PPS AM230 and PEBA values marked "*injection moulding" entered the model as printed specimens | m14; source audit |
| A single bracket gap for every matrix | The unstated-load bracket's top missed 4 of 54 true values, all semicrystalline | screening back-test, D48; the bracket itself retired in m137 (D83) |
| Number-only completeness scan | Values printed "ISO 527 MPa 48" or "Specific Gravity 1.22" were invisible; iSANMATE CF-ABS had one of its eight values | label pass in `audit:sources` |
| A resin reference vetoing a screen | Zytel 101L's moulded 3.1 GPa kept PA66, estimated at 1.5–2.6 GPa, among candidates for "stiffness at least 3 GPa" | `database.test.js` |
| One data sheet under two or three materials | PolyMide CoPA's numbers shown for PA, PA6/66 and CoPA; PA-CF's headline was PA12-CF's; PLA Silk and CoPE shared one formulation key, so the estimate model read CoPE's evidence as PLA Silk's product | `database.test.js`, D44 |
| Heat-deflection physics learned backwards | With too few unfilled nylons, the model's melting-point slope fitted negative and put PA66 at 15–91 °C; found in development, never shipped | `database.test.js` |
| Z results coded as unknown direction | 18 IPCON rows printed "Z" taught the unknown-direction conversions offsets of +0.31 to +0.46; PA6 strength was estimated 88 MPa beside its sheet's 78 | m20, lint MEAS-LOCATOR-DIRECTION, offset cap (D56) |
| Annealed and as-printed values averaged as repeats | PET-GF15's 81.6 and 133.7 °C became one precise 107.65 °C, an outlier warning and a conflict | `database.test.js`, post-processing State (D56) |
| An annealed value as the headline | PPA's heat headline was the "(annealed)" 131 °C; the as-printed 103 °C was never entered, so PPA passed Strict for 104–131 °C | m20, m21, HEADLINE-SELECTION-INVALID |
| A film strength as a lower bound | iSANMATE's ASTM D882 film values (110, 145 MPa) kept PLA a candidate for strength at least 140 MPa | `database.test.js` (implied bounds), D55 |
| Value + SD as a lower bound | 30 ± 23 % read as "at least 53 %"; an unstated moulded-looking 125 MPa kept PA12-CF in searches for 95 MPa | `database.test.js`, D55 |
| A physically impossible value deciding a requirement | TPU for AMS's 1.19 GPa on a 68D elastomer passed Strict for rigid-part stiffness; PC's HDT at 0.45 MPa sat below its HDT at 1.8 MPa | m24, lint MEAS-PHYSICS-*, D55 |
| A heat deflection estimated for an elastomer | TPU's 74 °C, from a 26 MPa sheet, gave an estimate of 70–85 °C that could screen | `database.test.js`, D56 |
| Slow crystallisers treated as crystallised | PET's heat deflection estimate reached 132 °C beside its own Vicat of 65.9 °C | `database.test.js` (printing physics), D56 |
| A material's only evidence down-weighted | PP's own 0.39 GPa and 460 % gave way to PP-CF, PP-GF and two variants: 1.5–4.5 GPa | `database.test.js`, D56 |
| A mean ± spread read as hard limits | "35 ± 4 MPa" never passed 33 MPa; 128 of 362 headlines decided nothing near their own value | `constraints.test.js`, D54 |
| Display rounding across a threshold | PC's price of 50.99 read "51" while passing "price < 51"; 300 contradictions in 174,159 checks | `format.test.js`, UI fuzz |
| An assumption read as published | A scenario assumption's reason said "Published" and its point could lead the Pareto front; a `*` assumption gave an elastomer a passing heat deflection | `scenario.test.js`, UI fuzz |
| A Plotly listener per redraw | 800 chart renders held 1,408 resize listeners and 569 MB; the first fix, purging, raced Plotly's redraw and threw in 187 of 200 fuzz scenarios | UI fuzz, heap probe |
| Replacing a headline refused as a deletion | The no-deletion guard keyed headline rows on every column, so the AGENTS.md recipe "replace the old value row" failed the pre-commit hook | `data-check.test.js` (identity, replacedWithin) |
| Unreviewed build warnings | Outliers, wide estimates and unstated loads were summed into warnings, so a new one never failed verify | `lint.test.js`, `audit:data` (D57) |
| A missing state read as the first | `stateOf` returned a product's dry, as-printed state for a conditioned state it does not publish, so 78 materials ranked a conditioned question on dry stiffness | `workspace.test.js` T03, `workspace-acceptance.test.js` A01 (D107) |
| A container matched a control's selector | The workspace's root carried `data-view`, which the view buttons' click handler selected, so every click anywhere in the Ashby lens redrew it and took keyboard focus away | `ui-probe.mjs` (the Ashby keyboard view), D107 |

## D115. A Parse review explains the columns it names; a typed endpoint is a number its cell states

> **In plain words:** A note that explains why one typed value differs from what the parser reads now names that column, and silences the check for that column alone. A typed temperature must be a number its own cell prints, and an open bound ("> 80 °C") stays open, whatever any note says.
> **Status:** In force; it narrows the Parse review of m08.

*Found on 2026-10-01 by the owner's PM trial and data audit (external package `PM-TRIAL-2026-10-01/data-audit`, root
cause RC1, with RC2). Built by Claude (an agent); the record is [the error-class sweep](audits/2026-10-01-error-classes/README.md).*

- **A review muted its whole row.** m08 (2026-09-14) stored each process window as the smallest and largest number in
  its cell. Eleven Spectrum and Fiberon cells had swallowed the storage paragraph printed beside them, so a bed minimum
  became 3 °C ("for **3**D printers"), 24 °C ("a shelf life of **24** months") and a nozzle minimum 250 °C ("up to
  **250** mm/s"). m102 corrected the cells' words and added a review saying so; the review then silenced every typed
  check of the row, so the old windows stayed. Open bounds were typed the same way: "> 80 °C" as 80–80.
- **A review names its columns.** It opens with `Fields: <typed columns>.` (or `Fields: none.`), and PARSE-MISMATCH is
  silenced for those columns only. PARSE-REVIEW-SCOPE stops the build on a review that names none, or a column its row
  does not have. m274 scoped the 147 existing reviews to exactly the columns each still explains (109; 38 explain none)
  after correcting the nine windows the audit re-read.
- **Two checks no review can silence.** PARSE-TEXT-BOUNDS: a typed nozzle, bed or chamber endpoint is a number its own
  cell states (a tolerance's ends, a Fahrenheit reading and room temperature allowed). OPEN-BOUND-WINDOW: an at-least
  or up-to window is never typed as a single point. The parser now reads "> 80 °C recommended" as an open bound too.
- **An open window is published evidence.** A material's summary window keeps a missing end missing in both
  directions (`cdb795a` did it for the lower end), so "at least 80 °C" is shown as that, and no estimate replaces it.
- **Effect.** No gate verdict moved: every corrected window lies within the H2C either way. Nine profiles' windows,
  six materials' summary windows and the print estimates they fed changed.

## D116. What a page states once, its values inherit

> **In plain words:** A data sheet often says something once for a whole table, such as "all specimens annealed at 80 °C" or "printed specimens, dry". That statement is now recorded once per page, and every value on the page that says nothing for itself inherits it; a value that says the opposite keeps its own words and is flagged.
> **Status:** In force.

*Approved by the owner on 2026-10-01 after the data audit (external package `PM-TRIAL-2026-10-01/data-audit`, root
cause RC3, the largest). Built by Claude (an agent); the record is [the error-class sweep](audits/2026-10-01-error-classes/README.md).*

- **The import read rows one by one.** A heading ("Mechanical properties (dry state)", "printed, non-injection
  moulded"), a footnote ("all specimens were annealed …", an annealing asterisk), a block standard or a test
  temperature applies to many rows and is printed on none of them. Those rows recorded "not stated", so an annealed
  value was admitted for screening as printed, and a printed bar filed as raw material dropped out of comparisons.
  17 such rows were confirmed in the audit's re-read, of 54 confirmed errors.
- **`page_context.csv`.** One row per source page and scope (all, tensile, flexural, impact, thermal, physical): the
  page's words, and the specimen type, moisture state, treatment with its schedule, standard and test temperature it
  states. `compile.js` gives each measurement on that page what its own row leaves unstated, and records which
  page_context row gave it (`pageContext`). The row's own words are never rewritten.
- **A contradiction is flagged, not resolved.** A row that states the opposite of its page (as printed on an
  "all annealed" page) keeps its own reading; CONTEXT-ROW-CONTRADICTS-PAGE asks for a re-read.
- **Finding the pages.** `npm run audit:context` (in verify, where the text cache is) lists every page whose text
  states such a thing while its rows record nothing and no page_context row carries it (CONTEXT-PAGE-UNRECORDED),
  and the value-line checks beside it (direction, notch, bound sign, sub-zero test temperature, standard, a print
  setting a profile does not hold).

## D117. A row says how many products pass, and shows the passing products' own values

> **In plain words:** A material's row now says "PASS · 7 of 200 products" instead of a bare PASS, shows the range of the products that pass beside the range of all of them, says when a pass rests on a declared variant or on a value with no test direction or treatment stated, splits an UNKNOWN into how many products measure below and how many publish nothing, and gives every material-level fact (a hardened nozzle, a typical value's state) the count of products it is true of.
> **Status:** In force; it amends D83 (how a material's verdict is shown, not how it is decided).

*Approved by the owner on 2026-10-01 after the PM trial (external package `PM-TRIAL-2026-10-01`, findings PM-01 to
PM-03, PM-05 to PM-09, PM-11, PM-13). Built by Claude (an agent); the record is
[the error-class sweep](audits/2026-10-01-error-classes/README.md).*

- **What the trial found.** All nine confident wrong answers its engineers drew came from one shape: a row that
  mixed a material-level fact with product-level ones. "PASS" beside a typical value that fails the requirement,
  "hardened nozzle: required" for a material most of whose products need none, "Resists water" for a requirement that
  only asks that a filament not dissolve.
- **The verdict is unchanged; what it says is not.** D83 decides (a material passes when one product passes); the row
  now says how many do (`shareMark`), the requirement cells show the passing products' own range with all products'
  range under it, and a pass carried by a declared variant only, or by an admitted value whose direction or treatment
  the sheet does not state, says so (`variantMark`, `caveatMark`). A typical value that includes annealed or
  conditioned values carries a badge (the owner declined restricting typicals to as-printed values). An UNKNOWN says
  "likely fails: n measured below, m unpublished"; its chip text is unchanged.
- **Names that say what is measured** (m275): "Heat deflection (HDT, 0.45 MPa)", "Stiffness (tensile modulus, XY)",
  "Strength across layers (tensile, Z)"; "Does not dissolve in water"; "Materials with missing data" and "Let
  estimates rule out materials" for the two policy switches; "In the H2C's scope" and "Print checks off". The
  ranking shows each value with its unit and the number of products behind it.

## D118. "Official Bambu product" passes Bambu Lab's own spools

> **In plain words:** The requirement "Official Bambu product" used to pass every product of a material Bambu sells, so a third-party PLA passed it because Bambu sells a PLA. It now passes only products Bambu Lab makes; the others of that material are "Officially listed family".
> **Status:** In force.

*Approved by the owner on 2026-10-01 (the PM trial's finding that the status gate was read as "made by Bambu").
Built by Claude (an agent).*

- `h2cStatusOf` (`app/js/engine/constraints.js`) judges each product: its maker Bambu Lab, Official Bambu product;
  another maker's product of a material whose status is Official, Officially listed family. Every other status is the
  material's, as before. `schema/vocab/h2c-status.csv` says so.
- A selection saved before this release is asked again under the new meaning; the release note it opens with already
  says its answers may differ.

## D119. What the error-class sweep changed in the rules

> **In plain words:** Clearing the data audit's error classes changed a few rules: products of one material that print one table share one formulation key even when two makers sell them, and each reads its own maker's sheet first; a review note that no longer explains anything stops the build; a page's statement about specimens never covers a melt flow rate; and the readers learned the spellings the sheets used that they could not read.
> **Status:** In force; it amends D89 and D115.

*Built by Claude (an agent) in the sweep the owner approved on 2026-10-01; the record is
[the error-class sweep](audits/2026-10-01-error-classes/README.md).*

- **Twins (R053, m281).** Two grades of one material that print at least 80 % of at least five values identically
  are one table under two names (GRADE-VALUES-TWIN), whether one maker prints it twice (EASY and R PET-G), one
  product has two sheets (a revision, a language) or another maker reprints it (3DJake's PCTG, Spectrum's tough
  PLA). They now share one formulation key, so the estimate model counts the table once (D12) and each product reads
  the other's values where its own sheet is silent (D89). GRADE-KEY-PRODUCTS no longer flags a key whose products are
  linked twin by twin. A product reads a twin of its own maker before another maker's reprint. A key still never
  spans two materials (R166): 13 such pairs are accepted with that reason.
- **Reviews (D115).** PARSE-REVIEW-STALE: a print profile's or a measurement's Parse review that names a column agreeing with the parser
  stops the build, because it would silence the next difference in that column.
- **Page statements (D116).** A page's specimen statement does not reach a melt flow rate, which is measured on the
  melt.
- **Print settings are checked by the import's own reader.** `npm run audit:context` runs the importer's sheet reader
  (`scripts/ingest/propose.mjs`, readSheet) over every profile's cached sheet and lists each setting it reads that the
  profile does not hold; a label regex finds only the labels someone listed. A random re-read after the first sweep
  found 8 of 30 profiles still missing a printed setting ("Hot pad", "Closure chamber", "Drying Preparation", a
  question answered a line away); the reader-based check then found 117, and m285 records them. Each later control found
  a further family, each fixed where it lives: the importer cut "º" degrees, a trailing "+" and the hours after a comma;
  eSUN and 3DXTECH print the settings their test bars were made at beside their guidance, and the import took the test
  block on 31 profiles. The check now compares the numbers each held cell states with the reader's, and reads a sheet
  block by block: what sits under "Print test condition", "Printed Specimen Conditions" or "How to make specimens" is
  not guidance (m170), and no longer hides the guidance beside it.
- **Readers.** ISO 75's method letter in "HDT/A", "HDT-A" and "ISO 75: Method A", a stated load outranking a
  mislabelled letter ("Method A (0.45 MPa)"); "ISO-R 75"; DIN's five-digit standards ("DIN 53.504"); test temperatures
  printed "℃", "@23° C", "+24°C"; a window marked "(recommended)" after its numbers; an answered question ("Enclosed
  chamber required No", "Hardened Nozzle nein"); a build chamber up to 250 °C; "< 80°C" as at most 80, not the point 80;
  a bed window "if you have a heated bed" as a recommendation. Each was a spelling sheets print that a reader left unread.
  PARSE-TEXT-BOUNDS no longer counts a number inside a word ("3D", "24 months") as a stated temperature.


## D120. One setup, one profile: a copy retires, a row per speed or nozzle size is its own, a dry box is a note

> **In plain words:** A print profile is one setup a data sheet prints for one product. 79 profiles were a second reading of one product's setup from one sheet, mostly because the settings their test bars were printed at were taken for a second setup; the copy is now retired, as a duplicate measurement is, and the build leaves it out. A sheet that prints a nozzle temperature per print speed or per nozzle size gives a profile per row, as the import already did for Spectrum's and Polymaker's speeds. A dry-box recommendation says where the filament is kept while it prints; it is a profile note, not a drying schedule. And the import's sheet reader, which the build's check of every profile runs, reads what the sweep found it missing.
> **Status:** In force; it extends D72's retired duplicates to profiles and amends D119 (what the import's reader reads); D121 takes the import's fibre sentence out of the profiles it wrote it into.

*Built by Claude (an agent) in the profile root-cause sweep of 2026-10-02, which the owner asked for in place of a
re-read of every profile; the record is [the profile root-cause sweep](audits/2026-10-02-profile-root-causes/README.md).*

- **How the causes were found.** Five random draws after the error-class sweep still found 3 to 9 profiles in 40 wrong,
  a different layout each time. A script marked every line of every guidance sheet where such an error leaves a trace
  a script can see without understanding the layout: a setting-like number or statement no profile of the sheet holds,
  a held number found only under a test-specimen heading or beside another setting's label, a cell not printed as one
  run of words, two profiles of one product that disagree. On the tables before m285 it marked 27 of the 27 known
  errors of those kinds (the other three were typed readings, which PARSE-MISMATCH checks). Six Claude Sonnet readers
  judged the 1,412 marks on 681 sheets; 359 were errors, on 267 profiles, and grouped by cause they were a dozen
  mechanisms, each fixed where it lives and swept across every profile (m290 to m295).
- **Copies (m292; PROFILE-DUPLICATE, PROFILE-SIBLING-SILENT).** Live profiles of one product from one sheet are rows of
  it when a Locator among them names a row (a print speed or speed band, a nozzle size, a foamed column); otherwise all
  but one are copies. A profile that says its sheet prints no guidance (m170) is not compared. The copy keeps its
  cells with Profile "Retired duplicate record" and a Locator naming the profile that stays, and never reaches the
  database (`meta.counts.retiredDuplicates.profiles`). Rows of one sheet share what it prints once for every row: a
  chamber, enclosure, drying or nozzle statement one row holds, every row holds.
- **Rows (m291, m295).** SUNLU's "Zonal Temperature" windows and its unit-less speed bands, Recreus's blocks per nozzle
  size, colorFabb's unfoamed and foamed columns and PolyTerra's high-speed line are profiles of their own, each naming its
  row; the one that was there keeps the general, the first, the 0.4 mm or the unfoamed row.
- **Dry box (m293).** "Dry box recommended: No" and FormFutura's "Drybox: Not necessary" are notes (topic Storage
  humidity), as P0085's "Dry box required" already was; on 43 profiles the dry-box row had run into the nozzle cell.
- **What the import's reader reads now** (`scripts/ingest/propose.mjs`, guidanceBeyondLabels; the lexicon). A setting
  of any kind under a test-bar heading (3DJake's "styles of printing conditions" among them) or in a pellet-processing
  table (LUVOCOM 3F's extrusion "Processing" table, "predry the granulate") is not guidance, and such a block ends where
  a numbered note or a guidance heading begins: six LUVOCOM profiles held the extrusion nozzle window instead of the
  printing one (P0632 held 350–400 °C; its sheet prints 400–450 °C to print). A drying row's hours on the row below
  ("Minimum Time 1 hour") or two rows down are one schedule. Settings run together on one line with slashes are read
  one by one. A drying schedule, an enclosure or a nozzle stated only in a sentence is read, unless the sentence names
  "<type> material" its sheet's title does not (eSUN's carried-over ABS-CF line on its PETG-ESD and TPU-64D sheets). New labels: "Extruder:", "Bed:", "Heizbett Temperatur", "Recommended heat bed temperature to print
  …", "Blast Drying Oven", "Dring Conditions", "Pre-printing Drying Conditions", "Compatible Nozzle Material",
  "Compatible Printer Type", "Seal the Box".
- **What the parsers read now** (`build/src/normalize/process.js`). SUNLU's "Normal temperature", "Normal" and 常温 as room
  temperature; "no need of temperature chamber", "no heating chamber are required", "does not require a heated
  (building, print) chamber" as no heated chamber; "recommended to print using a heated chamber"; "works best with an
  enclosed print area", "Printing in an enclosed printer", "At least closed chamber", "enclosed-chamber printing" as an
  enclosure recommended, and "ideal for use in open desktop 3D printers" as none needed; "Compatible Nozzle Material Any
  common material" and "use of brass nozzle" as no hardened nozzle, "recommended to use steel or ruby nozzles" as one.
  Nine wordings the build had warned it could not read (PARSE-UNREAD) are read, and the reviews that explained them
  name nothing now (m290). A negation reads as one: "not recommended to print using a heated chamber", "do not
  recommend … brass nozzle", "no need to use a steel nozzle"; a stainless or "brass or steel" nozzle is not a hardened
  one.
- **What the guard found next (m295).** With the reader taught, `audit:context` checks every profile again, and a fresh
  draw of 40 after m294 found three more families: a table row "Nozzle" answered with the nozzle a product needs
  ("Standard brass or higher grade will work", "Nozzle hardened"), where profiles held the import's fibre sentence, two
  Siraya TPUs against their sheet's brass; m170's "not printing guidance" profiles whose sheets' numbered notes are
  guidance (Raise3D's "2. Please dry the filament … at least 8 hours at 80-100°C"), five of them copies; and nozzle sizes
  and notes taken from a test-bar block. The reader now drops every kind of setting under a test-bar heading, not only
  temperatures, and a block ends where a numbered note or a guidance heading begins. The guard also flags a held setting
  its sheet prints only under such a heading (LUVOCOM 3F PP-CF's extrusion nozzle), since the reader no longer reads it.
- **Three more draws, each swept.** Draws of 40 after each round found 4, 2 and 2 deciding errors, each a family:
  Raise3D's "Recommended environmental" split around its value, purefil's value two lines under its label, enclosure
  statements in prose (about 30 profiles: "printable without an enclosure", "Please keep the chamber closed"),
  SIDDAMENT's "Seal the Box: No" (18), SUNLU's unit-less speed bands, and a drying window read at whichever end carried
  the unit ("90℃-100℃" gave 90, "70-80℃" gave 80; now the upper end, and a cell joining two methods by its first, 19
  profiles retyped). The reader learned each and the guard swept it (m295).
- **Which profile decides.** A product with several rows (speeds, nozzle sizes, foamed and unfoamed) is judged across
  all of them, as before (`products.js`, aggregateGate): the profile a gate cites is the one that decides it.

## D121. A fibre wears a brass nozzle by the database's rule, stated once, never as a sheet's words

> **In plain words:** That a fibre-filled filament needs a hardened nozzle is the database's rule, not something its data sheet said. The import used to write the rule into each fibre profile as if the sheet had printed it, and the page then told a reader "a source states it needs an abrasion-resistant nozzle" for 174 products whose sheets say nothing of the nozzle. Now a profile holds only what its sheet says, the rule is written once in method.csv, and a fibre-filled product its own sheet, its twin's and the printer maker's guide leave silent is unresolved under "No hardened nozzle", never passed.
> **Status:** In force.

*Built by Claude (an agent) in the open-problems pass of 2026-10-02 (OPEN-PROBLEMS §28, "The import's fibre sentence"),
on the owner's go-ahead for the fixes the priorities review recommended.*

- **What changed (m296).** 174 live profiles held "Use abrasion-resistant nozzle; verify minimum orifice. Fibre
  concentration and length are grade-specific." in their raw Abrasion / clogging cell: the register's words, which the
  import (`scripts/ingest/propose.mjs`, ABRASIVE) copied onto every profile of a material whose filler names a fibre.
  Two of them were not fibre-filled at all (Hyper-PLA+, a Siraya TPU). The cell now says Not published, and its typed
  Hardened nozzle cell follows. Where a sheet does say what nozzle it needs, the profile already held those words (26
  since m282, m285, m290 and m295).
- **Where the rule lives.** method.csv, H2C / Abrasive fillers, and the engine (`app/js/engine/constraints.js`, gate
  `abrasive`): a product with no recorded requirement whose material's filler is a fibre (carbon, glass, aramid, plant;
  the `fibre` facet the build derives from Modifier / filler) is unknown under "No hardened nozzle", with a reason that
  names the rule. Before, only carbon and glass fibre were; aramid and plant fibre now are too, as the import's rule
  always held.
- **What a silent product reads now.** Its twin's statement (D89), then its material's printer maker's guide (D88),
  labelled as theirs. A requirement read so is a source's, and the page says whose.
- **The import** writes Not published where a sheet says nothing of the nozzle. No answer of a template moved: no
  template asks the nozzle question; a scenario that adds "No hardened nozzle" sees an unknown, said as the rule, where
  it saw a failure attributed to a source.

## D122. A stress at a stated elongation is its own property, never a strength

> **In plain words:** Elastomer sheets print the stress their test bar carries at 100, 200 or 300 % stretch (an elastomer's "100 % modulus"), and one sheet at 5 and 10 %. With no property for it, the import filed each as a tensile strength, and where a sheet printed no other strength, it became the product's strength and decided answers. Each is now a property of its own, one per stated elongation, which is recorded and shown and never compared with a strength.
> **Status:** In force.

*Recommended in the priorities review of 2026-10-02 and taken by the owner; built by Claude (an agent).*

- **Properties.** "Tensile stress at 5 % elongation", "… 10 % …", "… 100 % …", "… 200 % …" and "… 300 % elongation"
  (properties.csv, MPa). No headline reads them. A property per stated elongation, not a column for the elongation: it
  needs no code, and the flexural precedent ("Flexural stress at conventional deflection") is the same shape.
- **What moved (m297).** 25 rows on eight products and two retired copies (QIDI PEBA 95A's "tensile stress at 100%
  (X-Y) ISO 527", 9.17 MPa, had been its comparable XY tensile strength; Siraya Tech's Flex TPU 95A and 85A, Rebound
  PEBA 85A and Fibreheart TPU GF, Fiberlogy's FiberFlex Aero, FormFutura's FlexiFil TPC 30D and Spectrum's PP). A product with no other strength now has none, which is what its
  sheet publishes.
- **The import's lexicon** reads "Tensile stress at 100%", "Tensile strength @ 5% Strain" and "Resistance at 100%
  elongation" as these properties (scripts/ingest/lexicon/property-labels.csv), so a new sheet files them so.

## D123. The owner's rulings of 2026-10-02: one product one grade, the registered sheets read in full, Eryone's "X-Z" is Z

> **In plain words:** Three recommendations of the priorities review, taken by the owner. A product the database held on two grades (one per sheet revision or language) is one grade now, with every record moved to it rather than the copy retired with its prices and profiles. Values a sheet the database already holds prints, and nobody transcribed, are recorded: reading a registered, hash-checked sheet again is not an import. And Eryone's template labels its upright tensile bar "X-Z", as two of its sheets say, so that bar is the layer strength on every sheet of the template.
> **Status:** In force; it extends D86 (a merged product's records keep their IDs, as a moved product's do), D89 (twins) and D92 (the layer strength), and amends D72 (a chamber band on an alias leaves through the ledger though nothing derives it).

*Recommended by Claude (an agent) in the priorities review of 2026-10-02 and taken by the owner the same day ("go for
the fixes, including the recommended decisions"); built in the open-problems pass
([the record](audits/2026-10-02-open-problems-pass/README.md)).*

- **One product, one grade (m302).** 29 pairs, each confirmed on both sheets by a Claude Sonnet reader: the grade of
  the newest revision of the maker's own sheet (the English one where two languages are one revision) is kept, and
  every record filed under the other (measurements, profiles, evidence, prices, coverage) moves to it with its ID; the
  other grade retires, naming the one it went to. A product counts once in its material's spread now. Where the merged
  sheets disagree on the chamber, the one that states a temperature decides (D93's declaration on the other is
  withdrawn, PROCESS-ENCLOSED). The coverage campaign's frozen target of a merged grade closes into the kept grade's
  (26 targets; the two that already had a completed outcome keep it; `audit:coverage-status`). Not merged, because their sheets show two formulations: FILAFLEX Foamy's two sheets (95A
  and 85A), SIDDAMENT's "ASA Carbon Fiber" and "ASA CF", and Polymaker PLA Pro V6.0 beside PolyLite PLA Pro V5.6.
- **The registered sheets read in full (m298, m300).** Nobufil's printed "FDM H" column on twelve sheets, BASF Forward
  AM's Extended TDS columns per print direction and their impact tables, Raise3D Industrial PET CF's V4.0 table,
  colorFabb LW-PLA's and LW-PLA-HT's foamed and unfoamed columns (D95), Stratasys PA6/66-GF30-FR's XZ heat deflections,
  PolyMide CoPA's wet table and Nanovia Flex V0's VDE 0282 rows: 242 values, each quote checked on the cached sheet.
  Polymaker's letter-spaced "HOW TO MAKE SPECIMENS" block, Eryone's "All splines are printed under the following
  conditions" and SUNLU's 测试样条 note are page_context rows (D116) and their bars' print parameters (D63).
- **Eryone's "X-Z" (m301).** The tensile rows (strength, modulus, elongation) of the template's "X-Z" bar are
  Direction Z on 27 sheets, 72 rows. m191 read the two sheets that say so; this rules the rest of the template.
- **A band on an alias leaves (m303).** PLA Basic, PLA Matte, PLA Lite, PETG Basic and PETG HF have been aliases since
  m141 and kept researched chamber bands that decided nothing (D34, D44). The build refuses a band on a family entry or
  an alias now (CHAMBER-BAND), so the five rows leave through the removal ledger, which says they went nowhere: the
  first removal there of a row the build does not derive (D72, amended).
- **A flat bar for a headline with no direction.** Where a product publishes a heat deflection (or a density) on a
  flat bar and on an edge or upright one, the flat bar's value is its value (`products.js`, preference): makers test
  flat unless they say otherwise, and an XZ, ZX or Z value is another bar's (Stratasys prints XY and XZ side by side).

## D124. The page is written for an engineer: answer first, the data sheet's terms, no coinages, IDs out of sentences

> **In plain words:** Every text on the page is written for one reader, an engineer choosing a filament for a part on the H2C, and for the decision it serves. Engineering and data-sheet terms stay; the words this project coined for its own records ("twin", "admitted for screening", "research mode", "in scope", "Theoretical") are replaced by what that engineer would say. The left rail is ordered as an engineer screens, with the H2C's checks in one group and the part's state in another; the drawer's tabs follow how a material is checked, Products second and Sources last with the known gaps; record IDs leave the page's sentences for a small ID mark. No answer moves.
> **Status:** In force; it rewords the labels of D88 and D89 and the Overview of the drawer described under D83, D103 and D117.

*Decided by the owner on 2026-10-04 (GOALS, "Decided on 2026-10-04, the engineer-grade interface"), after using the
page; built by Claude (an agent). The owner rejected a first plan that paraphrased the engineering terms away ("Strength
and stiffness" for Mechanical): "The reader is supposed to be an engineer… But our made up words… are out of his/her
mind. When rewriting your english know what you are doing for whom and to what purpose."*

- **The reader and the purpose** are written down once, in INTERFACE, "Words": who reads the page, what each place on it
  serves (a rail control, the results header, the drawer's Overview, Products, the property tabs, Sources, a popover),
  the table of coinages and what replaces them, and how a sentence is written (the answer first, one idea, a caveat
  once per view, no record ID). A reviewer reads every visible string against it.
- **Display names over stored values.** Rail headings (`GROUP_LABEL`), Bambu Lab status (`H2C_STATUS`), filler
  (`FILLER`) and the gate names (`GATE`, with the limits read from the build's H2C baseline) are maps in the interface
  over the values the tables and saved scenarios hold. A link, a saved scenario or an export made before the rename
  still reads, and the fuzz and the probe select by the same ids and data attributes. A requirement is counted in the
  rail group it is shown in (`railGroupOf`), whatever group key it was saved with: the reinforcement, build-material
  and drying checks keep `__group: 'Manufacturing'`, a group the rail no longer shows.
- **The rail** reads Material family, Mechanical, Thermal, Environment, Printing on the H2C, Part condition, Cost and
  availability, Data quality. *Within H2C temperature limits* is one box over the nozzle, bed and chamber gates
  (indeterminate when one or two are asked; `printCheck` in `templates.js` tells all, some and none apart, where the
  page had called two gates of three "not checked"). Part condition is two two-way switches, each saying what it does:
  annealing allowed can only add passes; conditioned judges only conditioned values. The property names are the data
  sheet's (`headline_definitions.csv` Plain, m337), with the comparison basis as the hint and said once per group.
- **The drawer** has eight tabs, Overview, Products, Mechanical, Thermal, Printing, Environment, Price, Sources; Coverage
  is Sources' Known gaps, and its key opens it there. The Overview leads with how many products meet the requirements,
  then the best product's result on each, H2C printability, key properties as a compact list, and the material's
  guidance. A product is one line until opened. Sources lists every document the material's records cite, with the
  products each covers and what it gave, and every product names its sources. Reviewer and migration notes are under
  collapsed "Record notes" and "Review notes", never among the test conditions.
- **Reasons** (`app/js/engine/constraints.js`, `build/src/normalize/process.js`, `build/src/products.js`) say the same
  facts in fewer words and name no record ID; the brief and the exports keep their IDs. "Admitted for screening" became
  the conditions named as not stated.
- **What moved.** Labels and reasons only: `build/snapshot/*.csv` are byte-identical, and `npm run build:diff` lists
  only label, reason, note and example fields. The release ID changes, as for any change to the rules' inputs (D96), so a
  scenario saved before this release says so when reopened. `verify:fast` stays within its budget.


## D125. A sheet is read as its page shows it: reading order, page images read where they decide, and every own sheet guarded

> **In plain words:** The import's sheet reader read a page line by line in the order its text layer gave, so a two-column sheet interleaved its columns and a label lost its value; a font that drew "ti" as a digit hid a label; a web page's spec grid ran onto one line; and a product whose sheet the reader could not read got no print recipe, which no check noticed, because every check started from a profile that existed. The text is now also read in reading order and with its ligatures put back, web pages with their structured data and grids, and broken text layers are flagged and read optically beside the text. Every page of the 1,377 documents tied to a gap was read from its image by Claude Sonnet; a reading entered only where the page's own text bears its numbers out, a second blind reader agrees, or the importer's reader agrees, and Claude Opus decided every class of correction. A product's own sheet that prints a setting no profile holds is now a finding.
> **Status:** In force; it extends D97 (a value is bound to its evidence line), D115 and D116 (context the page states), D119 and D120 (the reader as the guard) and D123 (a registered sheet read in full is not an import).

*Decided by the owner on 2026-10-04 (GOALS, "Decided on 2026-10-04, the reader round"), after opening sheets the tool
called silent and finding the values printed there; built by Claude (Opus deciding and reviewing, Sonnet reading pages
and writing code to specification).*

- **Reading order** (`scripts/lib/pdf-layout.mjs`). Each page's cached spans are cut into blocks by gaps (XY-cut): a
  horizontal cut at 1.5 line heights, a vertical cut only through a clean band with one-sided lines on both sides, so a
  row-aligned property table stays whole. `readSheet` reads the line view and the block view and merges them; an item
  only the blocks give carries `viaLayout`. The cached text and the evidence binding are unchanged. On, it recovered 85
  sheets' items the line view missed (`docs/audits/2026-10-04-reader-round/reader-recall/`).
- **Ligatures** (`repairLigatures`, `scripts/lib/pdf-text.mjs`). purefil's sheets map "ti" and "ft" to digits and "W"
  ("Prin5ng temperature", "SoWening"). The repaired text is a further view at read time only; `spanText` and the cache
  stay as extracted, so a quote is still checked against what the file holds.
- **Web pages** (`scripts/lib/html-text.mjs`, version 5). JSON-LD product data, Shopify product JSON and `__NEXT_DATA__`
  are read before scripts are dropped; `dl` lists, colspan and rowspan, and label/value div grids are read as tables;
  `capture.mjs` opens tabs and accordions before it saves. The cached HTML texts were re-read from their bytes
  (`scripts/audit/refresh-html-cache.mjs`). A grid run onto one line ends a setting where the next "Label:" begins.
- **Broken text** (`scripts/lib/text-quality.mjs`, `npm run ingest:quality`, `npm run ingest:ocr-pass`). A page with no
  text, private-use glyphs, few letters or a label with no number beside it is flagged (187 pages of 138 documents); an
  optical reading goes to `.cache/ocr-text/` beside the text layer, never in its place.
- **Page reading** (`npm run ingest:read-packet`, `ingest:read-reconcile`, `ingest:read-proposals`, and
  `scripts/migrate/read-proposals-apply.mjs`). A packet holds a document's page images, its text and every row the
  tables hold from it; a reader records every setting, value with its conditions, and page statement, and says of every
  held row whether the page confirms it. Each reading is checked against the text layer, the reading-order view, the
  ligature-repaired view and the optical sidecar. A reading that decides something (a print setting the H2C gate reads,
  a headline property, a page statement) and that the text does not bear out, or that contradicts a held row, is read
  again blind; the proposals are mapped to the vocabularies, typed by the parsers, and held where they cannot be
  (13,909 held, each with its reason). A migration applies them, quote by quote and value by value (m342, m351).
- **Corrections are decided by cause, not applied by count.** All 59 automatic corrections of held rows were
  mis-pairings when read again, so none was applied; the readers' flags were compiled and decided on the page one row at
  a time (m343), the physics lint's findings likewise (m344), the tests that pinned earlier data likewise (m345), and the
  guard's findings likewise (m353). What the round learned became a rule of the reader or the guard: a setting printed
  for the test bars is held ("Printed conditions", "conditions of the test specimens", m170), a "± 50 – 60 °C" window is a
  value, "brass or hardened steel compatible" needs no hardened nozzle, and five more wordings the parsers now read
  (m346).
- **The guard** (`npm run audit:context`, CONTEXT-PROFILE-UNRECORDED). A product's own sheet that prints a print-settings
  block no profile of the product holds is a finding; a comparison page that speaks for three formulations or more is
  left to its products' own sheets. Its first run found 36 such sheets, each now a profile of its product (m353).
- **Makers' sites.** Where the registered sheets were silent, the makers' own pages and guides entered through the import
  pipeline: b41 (10 documents, thin materials, m340) and b42 (44 documents, products missing a nozzle or bed, m352). A
  page that names another product line, a slicer preset, a retailer page or a search summary was not admitted (the
  b42 packet's NotAdmitted list says why for each).
- **What moved.** Of 3,351 frozen targets, 853 closed: products missing a nozzle 83 → 28, a bed 103 → 25, drying 520 →
  335; materials with no nozzle 18 → 5, no bed 19 → 5 (`docs/audits/2026-10-04-reader-round/after/PROGRESS.md`). In the
  templates, 11 answers became Strict candidates (8 materials) and 4 left: PPA-CF and ASA-CF, whose makers' pages say
  "Heated Chamber: Recommended" with no temperature (D33, D93). `verify:fast` stays within its budget.

## D126. No number shown contradicts what its own product's measurements prove

> **In plain words:** An estimate could sit below a strength the same product had measured: 46 materials and 343 products showed an ultimate-strength estimate under their own published break or yield stress, and LCP's HDT at 0.45 MPa was estimated under its own published HDT at 1.8 MPa. The orders physics sets between properties are now a table (`physical_relations.csv`), the lint reads it, every estimate is floored by what its own product's measurements prove, a material's range contains every product's floor, a product's strength taken from yield or break is the larger of the same test's two, and the build refuses a number shown that breaks an order.
> **Status:** In force; it replaces D78's material floor ("held at the highest own printed limit") with containment, and extends D55 (a value physics rules out is kept and flagged) and D84 (what a printed or unstated bar may decide).

*Decided by the owner on 2026-10-04 (GOALS, "Decided on 2026-10-04, the reader round", item 3): "some of the ultimate
strength estimates go beyond the strength and break value, these are some constraints that your logic should capture";
the owner chose that a bar whose specimen is not stated bounds as a printed one does. Built by Claude.*

- **The orders are data** (`data/tables/physical_relations.csv`, PR01 to PR11): Tg ≤ Vicat ≤ Tm, Tc ≤ Tm, elongation at
  yield ≤ at break, yield and break stress ≤ the ultimate tensile strength, tensile ≤ flexural strength, the strain at
  strength ≤ elongation at break, HDT at 1.8 MPa ≤ HDT at 0.45 MPa, HDT ≤ Tm, each with its same-test keys, margin and
  scope. The lint's MEAS-PHYSICS pairs read it in place of their constants (`build/src/physical-relations.js`), and a
  break above its own ultimate is flagged where a sheet prints one (m338).
- **Floors.** A product's yield, break or strength bounds its estimate from below when its bar is printed or its specimen
  is not stated, in any direction; a moulded bar, a film, a filament strand and a bar printed off the product's recipe
  bound nothing (`build/src/estimate/lower-bounds.js`). A grade's estimate is floored at its own formulation's highest
  floor. A material's range is the spread of its products, so it must contain every product's proven floor: its upper
  end reaches the highest product floor, and its lower end is floored at the lowest only when every active product has
  one. A heat deflection estimate is held under its semicrystalline polymer's melting point (`bounds.js`).
- **Back-tested** (`build/src/estimate/floors.js`, `docs/audits/2026-10-04-reader-round/estimate-order/backtest.md`).
  Flooring a material at its highest product floor, the first version, broke calibration (likely coverage of tensile
  strength 29.7 %); containment kept it (85.9 / 80.7 / 79.0 % likely for tensile strength, elongation and HDT at 0.45
  MPa, against 81.3 / 80.7 / 77.8 % unfloored). EST-CALIBRATION and the screening certification are unchanged.
- **A product's strength.** Where a product's tensile strength comes from its yield or break stress, it is the larger of
  the two endpoints of the same test (same source, direction, specimen and state), never the smaller (`products.js`).
- **Guards.** EST-ORDER (error) refuses a build whose material or product estimate, range end or centre breaks a
  relation; PRODUCT-ORDER (information) names a product's value lying under another of its measurements from a different
  test, which stays the product's own value until a re-read settles which source is wrong.
- **What moved.** Every shown ultimate-strength estimate now sits at or above its product's own break and yield stress;
  `build/snapshot/` holds the new ranges, and `npm run build:diff` against the branch point lists only estimate ranges,
  product strengths taken as an endpoint maximum, and the findings above.

## D127. Drying is recorded as a sheet states it, and the printer maker's guide fills a silent product's drying

> **In plain words:** A sheet's drying line was read as a published schedule whatever it said, so "not necessary", "Optional" and "only if the material has absorbed moisture" counted as a product that must be dried, and "6+ hours" lost its open end. Each print profile now says whether drying is required, optional or not needed, and whether its duration has an upper end. Bambu Lab's guide, which already answers a silent product's nozzle, bed and chamber, now answers its drying too, labelled as the guide's. A product that holds a profile of its own no longer reads its twin's statement about wearing a brass nozzle.
> **Status:** In force; it amends D88 (the guide now answers drying) and D89 (a twin's hardened-nozzle statement reaches only a product with no profile of its own).

*Decided by the owner on 2026-10-05 (GOALS, "Decided on 2026-10-05, gap round 2", items 1 and 2), and on the reader
round's recommendation for twins (OPEN-PROBLEMS §28); built by Claude (Opus specifying and reviewing, Sonnet coding).*

- **Two typed columns** on profiles and guide rows: `Drying need` (required, optional, not-needed, unknown;
  `schema/vocab/drying-needs.csv`) and `Drying hours open` (TRUE where the duration has no upper end: "6+ hours", "> 5 h",
  "at least 8 h"). `parseDrying` (`build/src/normalize/process.js`) reads them; PARSE-MISMATCH checks them like the other
  typed cells; m355 typed every profile and guide row: 813 profiles required drying, 73 advised it for a condition, 155
  said it was not needed. The blind draw that closed the round found 130 of those 155 were a dry box's answer held as
  the drying cell, and many "required" schedules printed beside a condition the cell left out; after m365 (D129), 748
  require drying, 118 advise it for a condition, 25 say it is not needed.
- **Decisions read the need.** A product's drying axis takes the strongest statement of its profiles (required, then
  optional, then not needed); the material gate and the engine's "drying known" criterion read it, and the page says
  "drying not needed", "optional" or "≥ 6 h".
- **The guide's drying.** `GUIDE_AXES` includes drying: a product whose own sheets and twin say nothing about drying
  reads its material's guide row, labelled as the guide's, and the guide's "Dry Out Before Use: Optional" reads as
  optional, never as required. Products whose drying is unknown fell from 357 to 160.
- **Back-checked** (`docs/audits/2026-10-05-gap-round-2/guide-drying-backcheck.md`): over the 276 products that state
  their own drying beside a guide row, the guide's temperature window contains the maker's in 150 profiles, overlaps it
  in 43 and misses it in 164, most often ABS and ASA, where the guide's 80 °C stands above makers' 50 to 60 °C; and the
  guide calls drying optional where the maker requires it in 201. The guide's drying is general advice for a type, so it
  is always shown as the guide's and never as the product's own.
- **Twins.** 16 products with profiles of their own stopped reading a twin's hardened-nozzle statement; 6 changed their
  abrasive gate.

## D128. A page statement can head one table

> **In plain words:** A heading or footnote recorded once for a page reached every value of its class on that page, so a footnote under the mechanical table also spoke for the physical table beside it. A page statement can now name the table it heads, matched against the values' locators, and a statement that heads one table outranks one that heads the page.
> **Status:** In force; it extends D116 (context the page states).

*Decided by the owner on 2026-10-05 (GOALS, "Decided on 2026-10-05, gap round 2", item 3), after two blind draws found
page statements reaching tables they do not head; built by Claude (Opus specifying and reviewing, Sonnet coding).*

- **`Table`** on `page_context`: a heading or column text a measurement's `Locator` must contain (compared without case,
  spacing or punctuation); `Not applicable` keeps today's reach, the page within the statement's scope.
  `contextFor` (`build/src/page-context.js`) filters on it and orders table, then scope, then page; the import's
  proposals, the reconciler, the apply helper, the lint and CONTEXT-PAGE-UNRECORDED use the same match.
- **Applied** (m356): a detector listed the 17 statements that reach two or more tables; Claude Sonnet read each page,
  and 3 now head one table (a filament density footnote, a Vicat footnote, a specimen box split between the mechanical
  and the heat-deflection tables). The test-specimen blocks m358 recorded name their table where a page holds two.

## D129. What the round's blind draw named: a dry box is not drying, a guide speaks for its type only, a nozzle line can answer

> **In plain words:** A blind check of 40 of the round's records, and of 22 print answers it moved, found errors in families. A dry box's "No" or "not necessary" was held as the product's drying, so 130 profiles read "drying not needed" (and 34 "required") from a sentence about where the spool is kept. Bambu Lab's PLA guide answered for metal-filled and matte PLAs it does not describe, telling a bronze-filled PLA that a brass nozzle will do. A sheet's "has not been annealed" read as annealed. Sheets that say a hardened nozzle is needed on their nozzle line, or that drying is needed only if the filament is wet, were held without it. Each family was looked for everywhere and fixed.
> **Status:** In force; it amends D88 (which products a guide row answers for), D120 (a dry box is a note, now everywhere) and D127 (what the drying parser reads).

*Decided by Claude Opus on 2026-10-05 from the round's blind draw and its probe of moved answers
(`docs/audits/2026-10-05-gap-round-2/blind-draw/`), within the owner's instruction to check the tools by the fixes'
effect (GOALS, "Decided on 2026-10-05, gap round 2", item 5); the readings by Claude Sonnet.*

- **A guide row speaks for its type only.** `print_guide_materials.csv` maps a guide row to the material whose type it
  is, and its Reason names what it is not ("not the particle-filled PLAs"); a product with a Variant (a dense or
  lightweight filler its material does not have) is not that type and reads nothing from the guide
  (`build/src/products.js`). 18 PLA variants stopped reading Bambu Lab's PLA row; 12 lose a chamber answer and the
  indoor-prototype template counts them untested.
- **A dry box is a note, everywhere.** m293 moved Spectrum's dry-box answer out of the nozzle cell; m365 moves it out of
  the Drying cell of 169 profiles (none of those sheets prints a drying row) into a Storage humidity note.
- **The words that condition a drying step are the cell's.** Spectrum's "Drying (if wet) recommended", Flashforge's "In
  case the filament has become wet", Siraya Tech's "Only dry if…", Fillamentum's "In case of moist material": 47 cells
  hold the condition with the schedule and read optional; Extrudr's GreenTEC page's "does not require drying" reads not
  needed. The parser reads a time that starts at 0 h ("Drying time 0–4 h") and "Only dry if" as optional. Polymaker's
  product pages that print a schedule in their specifications and a condition in a tip keep the specification's
  reading (OPEN-PROBLEMS §31).
- **A nozzle line can answer the hardened-nozzle question.** Where a profile's abrasion line is silent, its
  nozzle-material or nozzle-size line answers ("Nozzle Specs: No special concerns", "≥ 0,6 mm, hardened", QIDI's "/ All
  Material"); `readAbrasion` (`build/src/recipe.js`) is the one reader the build, the migrations and the import use.
  Readers found 58 more statements no cell held.
- **A denial of annealing is as printed.** "The printed model has not been annealed" (Flashforge's test-bar note) read as
  annealed; the reader reads the denial first, and the 21 page statements m358 wrote from those notes say as printed.
- **The test bars' one-sentence statements.** SUNLU's footnote "[1] Test specimens were printed at…", Stratasys's
  "Samples were printed with 0.010 in. layer height on the F900", Raise3D's, 3DJake's and Kingroon's notes: 101
  statements on 82 sheets give 548 values their print parameters (240 page statements, as m358), and the conditioning
  sentence older Polymaker and Raise3D sheets print beside their block reaches 165 values' Moisture condition, its state
  still not stated (it names no humidity).
- **Measured.** The draw found 6 of 40 records wrong (4 deciding), and the probe 7 of 30 moved cells; a second draw
  measures what is left (`blind-draw/`).
