# Batch b26: what a browser had to draw first

Applied 2026-09-21 by `m103-batch-b26`: 4 records from 1 document, out of 24 proposed. The batch is small and
the phase behind it is not: it is the first document that entered because a browser drew it.

## The document

MakerBot's support article for Method PETG prints its table from a script after the page loads, so the bytes the
server sends carry no values and the ledger called it unreadable. `ingest:capture` opened it in headless Chrome,
waited for a value to appear in the page's text, and hashed the document the browser ended up with — a different
document from the one the server sent, recorded as one. The article is headed "Method material: PETG" and prints
a tensile modulus of 1,900 MPa, a tensile strength of 44 MPa and a thermal resistance of 76 °C.

Two readings were the reviewer's, both against the captured page:

- **The product name.** The reader took "Refresh" from the page's own navigation. The article's title and the
  maker's catalogue both call it MakerBot PETG, which is what the grade says. A captured page begins with
  navigation where a data sheet begins with its title, and that is a reader gap this batch names rather than
  fixes: one document is not twenty, and the rule that would fix it — prefer a captured page's own `<title>` —
  touches every name the reader reads.
- **The comma in "1,900 MPa".** A thousands separator, because 1.9 MPa is nothing's tensile modulus and 1.9 GPa
  is a PETG's.

## What the captures found, and where the rest of it went

Twenty-three documents read as `unreadable` for the same reason and only one of them was that. The captures
settled what the others are:

| What | Documents | Where they went |
|---|---:|---|
| BASF's hub product pages are **file indexes** | 16 | `not-a-data-sheet`; `ingest:harvest` read 37 documents out of them, 34 fetched |
| … of which, ready for a batch | 19 | the reader pools (several-values 11, language 3) and this queue |
| … of which, scans | 12 | `needs-ocr`, for the optical pipeline |
| … of which, repeat another sheet | 5 | `twin-check` |
| BASF pages that draw their own failure ("No content received") | 4 | `unreachable`, dated |
| MakerBot support articles that are prose and no table | 4 | `not-a-data-sheet` |
| BASF's range page for its engineering filaments | 1 | `not-a-data-sheet`: it runs several products' tables together and states no value that belongs to one |
| INTAMSYS product pages | 33 | `gated`: the page links the safety sheet and puts the technical one behind a form (R084) |

Two of the twenty-four proposed turned out to repeat sheets the database already holds — Eryone's Hyper Speed TPU
(G039-21) and AzureFilm's ABS (G027-41) — and are `registered`.

## Two traps in the tooling, closed

- **`registered` is terminal by every route.** `--twins` wrote it as a hold (`held: registered — …`) while
  `writeHolds` has written it as a status since the queue was consolidated. The two documents above were freed
  again by the next run that found no proposal holding them, and proposed a third time.
- **A product has two names, and either finding its grade is the product being found.** `recordedAlready` asked
  only by the catalogue's name, which the ledger carries. AzureFilm's ABS sits in the ledger as 3DJake's "ABS P"
  and in the tables as AzureFilm's "ABS", so the lookup said the product was not recorded while the twin phase,
  which asks by the sheet's own name, said it was. It now asks by both.
