# Where the import stands

2026-09-19. Regenerate the counts with the commands each line names.

## The database

| | Before the import | Now |
|---|---:|---:|
| materials | 103 | 131 |
| grades | 179 | 375 |
| measurements | 2,645 | 4,801 |
| sources | 300 | 528 |
| profiles | 172 | 427 |
| print notes | 363 | 977 |
| headline selections | 377 | 452 |

```bash
npm run sql --silent -- "select (select count(*) from materials) materials, (select count(*) from grades) grades,
  (select count(*) from measurements) measurements, (select count(*) from sources) sources,
  (select count(*) from profiles) profiles"
```

## The corpus

| | Documents |
|---|---:|
| in the ledger | 1,936 |
| applied: their values are in the database | 363 |
| read and waiting for a batch | 274 |
| the same sheet again, another language's edition, or a revision superseded | 235 |
| the same numbers under another product name, queued as a question | 76 |
| fetched, not yet read | 112 |
| not yet fetched | 861 |
| a dead link, a user guide or a safety sheet | 14 |

Nothing is now unreadable for want of a text layer: 49 scans were read optically, and a value from one of those
does not enter until somebody has read it against the page image.

```bash
npm run ingest:ocr -- --all        # the scans
npm run ingest:fetch -- --provider "<maker>"
```

## The reader

Parity on every value somebody transcribed by hand before this programme, unchanged through eight batches:

| Maker | Sheets | Values reproduced |
|---|---:|---|
| Spectrum | 12 | 113 of 113 |
| 3DXTECH | 27 | 213 of 214 |
| Polymaker | 13 | 223 of 239 |

The 3DXTECH miss is an Izod row whose label the sheet misspells. Polymaker's residue is one sheet: a shared data
table covering several products at once, which the pipeline still reads as one document and one product.

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

## Next

1. The five libraries already read and waiting: colorFabb, Fabru / purefil, Flashforge, Eryone, Fiberlogy.
2. The twelve products held for an identity: four SUNLU, eight Extrudr.
3. The rest of Wave B, then the viewer libraries of Wave C and the retailers of Wave D.
4. The properties the database does not carry, which cost values on every maker's sheets.
