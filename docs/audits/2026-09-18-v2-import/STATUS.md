# Where the import stands

2026-09-19. Regenerate the counts with the commands each line names.

## The database

| | Before the import | Now |
|---|---:|---:|
| materials | 103 | 143 |
| grades | 179 | 509 |
| measurements | 2,645 | 6,140 |
| sources | 300 | 681 |
| profiles | 172 | 542 |
| print notes | 363 | 1,240 |
| headline selections | 377 | 474 |

```bash
npm run sql --silent -- "select (select count(*) from materials) materials, (select count(*) from grades) grades,
  (select count(*) from measurements) measurements, (select count(*) from sources) sources,
  (select count(*) from profiles) profiles"
```

## The corpus

| | Documents |
|---|---:|
| in the ledger | 1,936 |
| applied: their values are in the database | 516 |
| read and waiting for a batch | 538 |
| the same sheet again, another language's edition, or a revision superseded | 208 |
| the same numbers under another product name, queued as a question | 139 |
| not yet fetched | 404 |
| behind a login or a request form | 64 |
| a safety data sheet, not a data sheet | 29 |
| fetched, and carries no numbers to read | 23 |
| a dead link, or out of scope | 15 |

Nothing waits for a text layer: 49 scans were read optically, and a value from one of those does not enter until
somebody has read it against the page image. The 23 that carry no numbers are web pages whose tables are drawn
by a script the capture did not run; they are a fetch problem, not a reading one.

```bash
npm run ingest:ocr -- --all        # the scans
npm run ingest:fetch -- --provider "<maker>"
```

## The reader

Parity on every value somebody transcribed by hand before this programme, unchanged through eight batches:

| Maker | Sheets | Values reproduced |
|---|---:|---|
| Spectrum | 85 | 656 of 656 |
| 3DXTECH | 60 | 472 of 473 |
| Polymaker | 49 | 770 of 810 |
| Fillamentum | 3 | 22 of 23 |
| eSUN | 2 | 21 of 23 |
| BASF Forward AM | 3 | 26 of 57 |

The 3DXTECH miss is an Izod row whose label the sheet misspells. Polymaker's residue is one sheet: a shared data
table covering several products at once, which the pipeline still reads as one document and one product. What
Fillamentum, eSUN and BASF still miss is in [PLAN-REMAINING.md](PLAN-REMAINING.md) §2, and most of it is one
thing: a table read by its columns.

Spectrum's count rose by one when the database did. Two of its heat deflection rows held 90 °C, which is the
temperature the sheet prints in brackets as its annealing schedule; m75 corrected them to the 116 and 66 °C the
sheet publishes, and the reader and the database agree again.

```bash
npm run ingest:propose -- --provider Spectrum --compare
npm run ingest:propose -- --provider "3DXTECH" --compare
npm run ingest:propose -- --provider "Polymaker / Fiberon" --compare
```

## Batches

| Batch | Maker | Documents | Applied |
|---|---|---:|---|
| [b01-spectrum](batches/b01-spectrum/README.md) | Spectrum | 10 | m53, 2026-09-18 |
| [b02-spectrum](batches/b02-spectrum/README.md) | Spectrum | 53 | m54, 2026-09-18 |
| [b03-3dxtech](batches/b03-3dxtech/README.md) | 3DXTECH | 32 | m56, 2026-09-18 |
| [b04-polymaker](batches/b04-polymaker/README.md) | Polymaker | 51 | m57, 2026-09-19 |
| b05-held | 3DXTECH, held documents | 11 | m58, 2026-09-19 |
| b06-ppe | 3DXTECH THERMAX PPE/PS | 1 | m61, 2026-09-19 |
| [b07-extrudr](batches/b07-extrudr/README.md) | Extrudr | 24 | m63, 2026-09-19 |
| [b08-sunlu](batches/b08-sunlu/README.md) | SUNLU | 38 | m65, 2026-09-19 |
| [b09](batches/b09/README.md) | Eryone, Flashforge, colorFabb, Fabru / purefil, Fiberlogy | 134 | m72, 2026-09-19 |
| [b10](batches/b10/README.md) | Fillamentum | 16 | m76, 2026-09-19 |

## Next

0. The 8 documents b10 held: seven identities for the owner and one sheet whose table prints a value column per
   build orientation ([batches/b10/README.md](batches/b10/README.md)).
1. The 73 documents b09 held: the optically read ones need a reader against the page image, and the rest need an
   identity ruling apiece (`batches/b09/README.md` names each).
2. The twelve products held before that for an identity: four SUNLU, eight Extrudr.
3. The 554 documents already read and waiting across about two dozen makers, then the 404 not yet fetched.
4. The 139 twin-check decisions, under R053: a grade each, citing its own sheet, the values recorded once.
5. The estimate model's block solve. The stage is 40 s on today's data and cubic in it; `npm run scale` reads
   111 s at twice the data against a 150 s budget, so this stops being deferrable within two or three batches
   (`batches/b09/README.md`, "What it costs").
6. The 64 gated documents, which need the owner's credentials.
7. The properties the database does not carry, which cost values on every maker's sheets.
