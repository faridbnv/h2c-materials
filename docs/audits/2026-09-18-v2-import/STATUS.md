# Where the import stands

2026-09-18. Regenerate the counts with the commands each line names.

## The database

| | Before the import | Now |
|---|---:|---:|
| materials | 103 | 128 |
| grades | 179 | 306 |
| measurements | 2,645 | 4,016 |
| sources | 300 | 446 |
| profiles | 172 | 358 |
| print notes | 363 | 798 |
| headline selections | 377 | 447 |

```bash
npm run sql --silent -- "select (select count(*) from materials) materials, (select count(*) from grades) grades,
  (select count(*) from measurements) measurements, (select count(*) from sources) sources,
  (select count(*) from profiles) profiles"
```

## The corpus

| | Documents |
|---|---:|
| in the ledger | 1,936 |
| fetched and read | 226 Spectrum, 75 3DXTECH, 96 Polymaker, 3D-Fuel |
| the same sheet already read | 84 |
| another language's edition of one already read | 10 |
| the same numbers under another product name, queued as a question | 40 |
| a safety data sheet, not a technical one | 1 |
| applied | 146 |
| held for an owner's ruling | 34 |

```bash
npm run ingest:status
```

## The reader

Full parity on both makers read so far, on every value somebody transcribed by hand before this programme:

| Maker | Sheets | Values reproduced |
|---|---:|---|
| Spectrum | 12 | 113 of 113 |
| 3DXTECH | 27 | 213 of 214 |
| Polymaker | 13 | 223 of 239 |

The 3DXTECH miss is an Izod row whose unit the extraction dropped. Polymaker's residue is one sheet: a shared
data table covering several products at once, which the pipeline reads as one document and one product.

```bash
npm run ingest:propose -- --provider Spectrum --compare
npm run ingest:propose -- --provider "3DXTECH" --compare
npm run ingest:propose -- --provider "Polymaker" --compare
```

## Batches

| Batch | Maker | Documents | Applied |
|---|---|---:|---|
| [b01-spectrum](batches/b01-spectrum/README.md) | Spectrum | 10 | m53, 2026-09-18 |
| [b02-spectrum](batches/b02-spectrum/README.md) | Spectrum | 53 | m54, 2026-09-18 |
| [b03-3dxtech](batches/b03-3dxtech/README.md) | 3DXTECH | 32 | m56, 2026-09-18 |
| [b04-polymaker](batches/b04-polymaker/README.md) | Polymaker | 51 | m57, 2026-09-19 |

## Next

1. The thirty-four held documents in [rulings/pending.csv](rulings/pending.csv) (Q003 to Q007), fifteen of them
   Polymaker support, soluble and wood-filled products.
2. Wave B: the large PDF libraries, one maker per batch, parity first each time.
3. Wave C: the scanned, web and viewer sheets. Wave D: the retailers.
4. The estimate stage at twice today's data (Phase 5 of the plan).
