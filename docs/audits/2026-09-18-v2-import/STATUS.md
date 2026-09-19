# Where the import stands

2026-09-18. Regenerate the counts with the commands each line names.

## The database

| | Before the import | Now |
|---|---:|---:|
| materials | 103 | 113 |
| grades | 179 | 240 |
| measurements | 2,645 | 3,133 |
| sources | 300 | 362 |
| profiles | 172 | 237 |
| print notes | 363 | 593 |

```bash
npm run sql --silent -- "select (select count(*) from materials) materials, (select count(*) from grades) grades,
  (select count(*) from measurements) measurements, (select count(*) from sources) sources,
  (select count(*) from profiles) profiles"
```

## The corpus

| | Documents |
|---|---:|
| in the ledger | 1,936 |
| fetched and read | 226 (Spectrum) + 3D-Fuel |
| the same sheet already read | 84 |
| another language's edition of one already read | 10 |
| the same numbers under another product name, queued as a question | 40 |
| a safety data sheet, not a technical one | 1 |
| applied | 63 |
| held for an owner's ruling | 14 |

```bash
npm run ingest:status
```

## The reader

100% parity on the twelve Spectrum sheets transcribed by hand before this programme: 113 of 113 recorded values,
on property, value, unit, direction, load and notch.

```bash
npm run ingest:propose -- --provider Spectrum --compare
```

## Batches

| Batch | Maker | Documents | Applied |
|---|---|---:|---|
| [b01-spectrum](batches/b01-spectrum/README.md) | Spectrum | 10 | m53, 2026-09-18 |
| [b02-spectrum](batches/b02-spectrum/README.md) | Spectrum | 53 | m54, 2026-09-18 |

## Next

1. The fourteen Spectrum documents in [rulings/pending.csv](rulings/pending.csv) (Q003, Q004, Q005).
2. Wave B: the large PDF libraries, one maker per batch, parity first each time.
3. Wave C: the scanned, web and viewer sheets. Wave D: the retailers.
4. The estimate stage at twice today's data (Phase 5 of the plan).
