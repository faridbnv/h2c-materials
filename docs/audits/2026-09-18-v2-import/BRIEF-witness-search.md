# Brief: a maker's own words for a product's polymer (R089)

For a reader who did not read these sheets. **Read-only: nothing in the repository is changed.**

## Why

Some filament data sheets print numbers and never say what the filament is made of. Under R089 the owner has
delegated the identity verdict, on one condition: the polymer must come from **a document the maker published**
that names this product and its polymer. A shop listing, a review, a forum post or a comparison site is a pointer
to such a document, never the evidence itself (D35). What no maker document settles goes back to the owner.

## The list

`witness-search-input.csv` (path given in your task): one row per product, with

| Column | What it is |
|---|---|
| `doc_key` | the document's key in the ledger — echo it back unchanged |
| `provider`, `maker`, `product` | who hosts the sheet, who made the filament, the product's name |
| `sheet_url` | the data sheet itself |
| `source_page` | the page the sheet was found on, often a shop's |
| `current_reading`, `strength` | what the pipeline reads so far, and how strongly (`narrowed`: its density and melting point admit one polymer; `unread`: nothing) |
| `what_the_sheet_says` | what the sheet does publish |

The repository's research notes are pointers worth reading first: `docs/audits/2026-09-18-v2-import/research/`
(`unnamed-polymers.md`, `extrudr-polymers.md`, `eight-polymers.md`, `pcl-and-easy-pa.md`) and the inventory
workbook `H2C-Filament-TDS-Inventory.xlsx` (its "Notes" and "Evidence page" columns).

## What to do with each row

Find **one URL on the maker's own domain** (or the maker's own document hosted elsewhere, such as a PDF the maker
links from its own site) that names this product and the polymer it is made of in the same sentence or table row.
Good witnesses, in order: the maker's product page, the maker's safety data sheet (its composition section names
the polymer), a technical data sheet revision that does name it, the maker's catalogue.

Fetch the URL yourself and copy the exact line.

## What to return

A CSV with these columns, one row per input row, in the input's order:

| Column | What to write |
|---|---|
| `doc_key` | as given |
| `url` | the maker-published URL, or empty |
| `polymer` | the polymer as that document names it (e.g. `PLA`, `PETG`, `PA12`, `TPU`, `ASA`, `PP`, `PVA`), or empty |
| `quote` | the exact line naming product and polymer, under 200 characters, or empty |
| `publisher` | who published the page (the maker's name, or the domain) |
| `note` | anything the owner should know: a contradiction, a blend, a filler, why nothing was found |

Leave `url` empty rather than giving a shop page. If the maker's documents disagree with each other, give the
one naming the product most specifically and say so in `note`. Do not guess, and do not use what you know about a
product from memory: a line you did not read on a fetched page is not evidence.

## When you are done

Report how many rows have a maker-published witness, how many do not, and the makers whose sites could not be
reached. Do not edit anything in the repository.
