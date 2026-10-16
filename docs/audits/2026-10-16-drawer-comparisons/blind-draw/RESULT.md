# Blind draw of newly drawn values (2026-10-16)

> **Historical record** (2026-10-16): written for one round. It describes the tool and its data as they were then; for where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

40 product values the drawer now draws for the first time were drawn on seed 20261016 (`draw.mjs`): 14 HDT at 1.8 MPa,
13 tensile moduli Z, 13 elongations at break Z, each its product's own record whose sheet's text is cached. Two Claude
Sonnet readers read them blind from the page image and text (`input.csv`, `verdicts-a.csv`, `verdicts-b.csv`), never
seeing the record (`key.csv`); Claude Opus compared each reading with the record.

| Verdict | Tasks |
|---|---:|
| Value, unit, orientation and load as the page prints them | 40 |
| Wrong value or column | 0 |

What the readers flagged, and how each stands:

- **Five Eryone values printed "X-Z"** (D22, D23, D25, D28, D39, D40), recorded Z: the owner's ruling D123, Eryone's
  template labels its upright bar "X-Z". Right.
- **A Stratasys HIPS value printed "ZX (upright)"** (D38), recorded Z: m191, a bar the sheet shows upright is Z. Right.
- **Two Spectrum heat deflections printed with no load** (D03, D12), recorded at 1.8 MPa: their Parse review names
  Spectrum's Product Portfolio 2024, which prints "HDT A" for each figure (m202). Right.
- **Filament2Print ASA's "Vicat Softening Temperature 68 °C @ 1.8 MPa, ISO 75"** (D14), recorded as a heat deflection:
  the reader round's ruling (an ISO 75 method and a load are a heat deflection's). Right.
- **FormFutura TitanX's "HDT A"** (D11), recorded at 1.8 MPa: ISO 75 method A, as D49 reads it. Right.
- **Fiberon PA6-GF25's heat deflection under the sheet's annealing footnote** (D05): the reading OPEN-PROBLEMS §32.10
  records (the footnote's words cover every bar; a reader going by where it stands would say otherwise). Not counted
  as an error.
- **Bambu Lab TPU 95A HF's "> 480 %"** (D32) is held as a bound with its operator. Right.
