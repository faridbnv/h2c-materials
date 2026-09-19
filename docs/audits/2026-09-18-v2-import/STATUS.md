# Where the import stands

2026-09-18. Regenerate the counts with the commands each line names.

## The database

| | Before the import | Now |
|---|---:|---:|
| materials | 103 | 128 |
| grades | 179 | 271 |
| measurements | 2,645 | 3,384 |
| sources | 300 | 395 |
| profiles | 172 | 269 |
| print notes | 363 | 625 |
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
| fetched and read | 226 Spectrum, 75 3DXTECH, 3D-Fuel |
| the same sheet already read | 84 |
| another language's edition of one already read | 10 |
| the same numbers under another product name, queued as a question | 40 |
| a safety data sheet, not a technical one | 1 |
| applied | 95 |
| held for an owner's ruling | 19 |

```bash
npm run ingest:status
```

## The reader

Full parity on both makers read so far, on every value somebody transcribed by hand before this programme:

| Maker | Sheets | Values reproduced |
|---|---:|---|
| Spectrum | 12 | 113 of 113 |
| 3DXTECH | 27 | 213 of 214 |

The one miss is an Izod row whose unit the extraction dropped from the line.

```bash
npm run ingest:propose -- --provider Spectrum --compare
npm run ingest:propose -- --provider "3DXTECH" --compare
```

## Batches

| Batch | Maker | Documents | Applied |
|---|---|---:|---|
| [b01-spectrum](batches/b01-spectrum/README.md) | Spectrum | 10 | m53, 2026-09-18 |
| [b02-spectrum](batches/b02-spectrum/README.md) | Spectrum | 53 | m54, 2026-09-18 |
| [b03-3dxtech](batches/b03-3dxtech/README.md) | 3DXTECH | 32 | m56, 2026-09-18 |

## Next

1. The nineteen held documents in [rulings/pending.csv](rulings/pending.csv) (Q003 to Q007).
2. Wave B: the large PDF libraries, one maker per batch, parity first each time.
3. Wave C: the scanned, web and viewer sheets. Wave D: the retailers.
4. The estimate stage at twice today's data (Phase 5 of the plan).
