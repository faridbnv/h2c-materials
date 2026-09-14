# Duplicate products

**Date:** 2026-09-13
**Asked by:** the tool's owner
**Question:** are the generic polyamide rows (PA, PA-CF, PA-GF, PA-ESD) unique, or do they repeat
products recorded elsewhere? Then: does any other family have the same problem?

## Finding

They repeated other rows' products. Every active grade in the workbook was grouped by its data sheet
(formulation key, source URL, and manufacturer with product name). Seven data sheets were filed under
more than one material, and four products sat under a generic row although a row for what they are
exists. Each product's identity was read from its own data sheet.

| Product (data sheet) | Filed under | What the data sheet says it is |
|---|---|---|
| Polymaker PolyMide CoPA | PA, PA6/66, CoPA | "a copolymer of Nylon 6 and Nylon 6,6" |
| 3DXTECH AmideX PA6 Copolymer | PA, PA6/66, CoPA | "AmideX PA6 Copolymer" |
| Spectrum PA6 Neat BK | PA, PA6 (and its price twice) | "PA6-based" |
| 3DXTECH CarbonX CF PA12 | PA-CF and PA12-CF, the headline of both | carbon-fibre PA12 |
| Polymaker Fiberon PA612-CF15 | PA-CF, PA612-CF | PA612-CF |
| Polymaker Fiberon PA612-ESD | PA-ESD, PA612-ESD | PA612-ESD |
| BASF Ultrafuse TPC 45D | TPE and TPC / TPEE, the headline of both | "a flexible, shore 45D ... Thermoplastic Copolyester Elastomer" |
| iSANMATE PA6 CF | PA-CF only | "PA6 CF" |
| 3DXTECH AmideX PA6-GF30 | PA-GF only, its headline | "AmideX PA6-GF30 Glass Fiber Nylon" |
| Polymaker PolyMide PA6-GF | PA-GF only | "a glass fiber reinforced PA6 (Nylon 6) filament" |
| Polymaker PolyFlex TPU90 | TPE only | a TPU |
| 3DXTECH 3DXSTAT ESD PA12 | PA-ESD only | "ESD-Safe Nylon 12 (PA12)"; no PA12-ESD row exists, so it stays |

What that did to the tool:

- PA, PA6/66 and CoPA were three candidates with identical headlines (2.223 GPa, 66.2 MPa, 9.9%,
  110.5 °C) from the same two products. PA-CF showed PA12-CF's numbers. TPE showed TPC / TPEE's.
- Apart from PA-ESD's 3DXSTAT, none of PA, PA-CF, PA-GF, TPE or CoPA held a product of its own.
- The estimate model needed a "shared product" rule so copies could not disagree.

One more, of a different kind: **PLA Silk and CoPE** shared a formulation key because both come from
columns of one Polymaker Panchroma data sheet. They are different products, but the estimate model
read the key as one product, so CoPE's evidence was treated as PLA Silk's.

The rest of the database is clean. The fatigue study cited by ASA, PC, PA12 and PC-ABS covers four
different Stratasys canisters, each with its own key. CPE-CF's Spectrum PCTG CF10 is a carbon-fibre
copolyester, which is how CPE-CF is defined.

## Fix

The owner chose family entries. [apply-workbook-changes.py](apply-workbook-changes.py) made 718
changes, listed in [changelog.csv](changelog.csv):

- **One home per product.** Nine duplicate grades were retired with the retirement marker. Their 147
  measurements and 16 evidence records were marked "Retired duplicate record". The script first proved
  that each one has an identical twin (property, direction, value, unit, conditions, standard, specimen)
  under the grade that keeps the product, and refuses to run otherwise. The duplicate price was
  quarantined.
- **Mis-filed products moved.** iSANMATE PA6 CF went to PA6-CF, both PA6-GF products to PA6-GF, and
  PolyFlex TPU90 to TPU. Each got a new grade under the right material, and every measurement, profile,
  price and evidence record moved with it, and the source register's applicable grade followed. A moved
  price no longer counts toward a price headline.
- **Family entries.** PA, PA-CF, PA-GF and TPE have Scope "Family entry"; CoPA is an alias of PA6/66.
  They own nothing, show no values and are never candidates. Their members are in
  `build/mappings/family-entries.json`, search on their names lists the members, and their drawer links
  them. They keep their H2C status, because Bambu lists PA, PA-CF and PA-GF as families.
- **PA-ESD's own print settings.** Its window had come only from the retired PA612-ESD copy. Its own
  data sheet, whose hash matches the register, prints extrusion 265–285 °C and bed 90–110 °C, now
  recorded.
- **Separate keys** for Panchroma Silk PLA and Panchroma CoPE.

## Result

| | Before | After |
|---|---:|---:|
| Data sheets filed under more than one material | 7 | 0 |
| Candidates in H2C scope | 96 | 91, plus 5 family entries |
| Verified headline citations | 380 | 361, the 19 removed being copies |
| Measurements in the database | 2,049 | 1,902, with 147 retired copies kept in the workbook |
| PA6-GF / PA6-CF / TPU products | 1 / 1 / 2 | 3 / 2 / 3 |

The build fails if a family entry owns an active grade, if the workbook and the mapping disagree, or
if a member is not an in-scope material. A test fails if any data sheet is filed under two materials.
Build 0 errors, 125 tests pass, the data audit reports no errors with HTML payload parity, and the
family entries were checked in the browser.

## Open

- **Generic PP.** Its representative grade is 3DXTECH HyperLite PP, a lightweight grade at 810 kg/m³,
  so generic PP reads lighter than PP is. That is not a duplicate, and it was left for a decision.
- **PA-ESD is represented by a PA12 product.** It is the only ESD nylon without a specific row.
