# Source backup and decision-gap closure

Work on branch `v2`, baseline `d80d3df`; requested by the owner on 2026-09-28 from
`lively-gliding-allen.md`. GOALS steps 2 and 5, C6/C9 (exact-product decisions and recipes),
and C13 (source custody). All reviews in this campaign are by a Codex AI agent, not a person.

## Item 7: source custody

The export now includes registered and ledger-only documents, with registration, document key and ledger status
in its provenance manifest. `--derived` preserves cached text, optical PDFs and reviewed page images with separate
hashes. Restore verifies source bytes before admitting their derivatives; corrupt derivatives and unsafe paths are
refused. Exports inside the repository are refused, including through a symlink. Existing whole files are retained.

The first OneDrive Personal export contained **2,204 verified documents and 2,611 derived files**, about 1.6 GB.
The owner-specific path is outside the repository and configured as `H2C_SOURCE_BACKUP` in `.zshrc` and `.zprofile`.
Finder confirms the folder as **Always Available on This Device** (the folder's retention status was read back
on 2026-09-28). Cloud upload completion is not inferred from a successful local copy.

An empty-cache restore (`H2C_DOCUMENT_CACHE=/tmp/h2c-restore-rehearsal`) restored every exported file with **zero
refusals**. Both manifests report 2,204 verified entries and the same text counts (2,189 current, 6 stale, 133 absent,
12 not-recorded). The live cache has 123 absent and one mismatch; the empty cache reports 124 absent, because the
mismatching bytes are deliberately excluded. `audit:witness` completed: 7,739 rows, 7,151 bound, 577 visually reviewed
under the existing record, and the same 11 listed exceptions. Those historic visual reviews were not performed anew.

The correct registered Kimya PEBA-S digest was not found under the ledger's digest. Its mismatch remains open for
targeted retrieval, without replacing the recorded bytes or digest. The 123 absent sources remain OPEN-PROBLEMS §19.

Backup regression tests: registered-source restore, ledger-only restore, derived round-trip, tamper refusal and
source-before-derived refusal all pass. `doctor` reports backup age and missing/damaged present digests;
`ingest:apply` reminds the reader to re-export after a batch. No scenario answer changes arise from these operations.

## Item 5: frozen targets

`audit:scenario-gaps --csv` froze **3,464 non-print-test facts** across 1,039 exact products and 11 questions,
including 32 facts affecting multiple questions. The owner confirmed that all targets are in scope.
`TARGETS.csv` names the requirements, expected movement, stop rules, tranches and prior research handoffs;
`BASELINE.json` preserves the question-specific treatment/moisture policy and `BASELINE-ANSWERS.json` preserves
product and material answers. Existing source-unavailability and unresolved identities are never labelled publisher
silence. A prior NEEDS_VENDOR or limited search is not interpreted as a finding that nothing is published.

## Tranche A: cached-source re-read

The record-tier SQL queries searched unused source facts and full-text chamber/enclosure/direction/load wording.
`gap-cached-evidence.mjs` mapped the frozen products to their own sources and records and inspected every cached page
of 1,392 relevant registered documents, 1,360 with verified bytes. It retained 14,166 candidate lines and 14
held/deferred product-name matches for source-specific review. A candidate is a lead, not a decision value.

Two chamber statements are pinned in m216: Spectrum PP expressly requires no heated chamber; Siraya ABS-CF Core
states a conditional 60–80 °C chamber window. Their exact pages and hashes are verified before recording. The
Siraya window remains a print-test question at the H2C's 65 °C limit. m217 records 60 exact-product weak/strong-acid
statements from their own verified Polymaker sheets, preserving both exposures and the manufacturer's scale words.
It adds no environmental or physical rule. All 3,464 targets remain in the frozen register, including those with no
new usable fact in the cached reading.

Movement against the frozen answers (`A-MOVEMENT.csv`, `A-CHANGES.csv`): Warm environment gains one passing material
(Spectrum PP); Indoor prototype gains one passing product within an already passing material; S06 gains 14 definite
product failures and one definite material failure (PC FR (M036)). Other question answers are unchanged. The added
weak/strong-acid rows that mix positive and negative exposures stay unresolved. This is an answer, not a claim of
universal resistance or suitability. Both migrations re-run with zero changes. Schema/lint report zero new findings
and zero stale acceptances. Full verification passed (VERIFY-A.txt): 46 acceptance expectations, 67 interface views and 300 rendered scenarios. verify:fast took 56.0 s, within its 90 s budget. 

### Wider condition pass (m218–m219)

The whole cached pass now includes exact XY/XZ, specimen, moisture and treatment footnotes from BASF, colorFabb, Spectrum, Fiberlogy, Braskem and Stratasys. Raw resin tables remain raw resin; annealed and conditioned tables keep those states. An incorrect 300% elongation inferred from a stress-at-300% label is retired, while its actual 585% break row remains. Spectrum PLA Tough's explicit 432.8 MPa modulus enters as 0.4328 GPa, not its separate 2.493 GPa flexural modulus. Source pins and guarded expectations are in m218/m219; no number comes from a family estimate or adjacent product.

Against the original frozen questions, **38 product answers on 20 distinct products and two material answers moved** (A3-MOVEMENT.csv/A3-CHANGES.csv). Four product/question answers became PASS and 34 became FAIL. Warm environment gains one passing material; S06 has one newly definite material failure. The other nine material-level question counts are unchanged. The two new estimate outliers were checked against their original values and accepted with source-specific reasons; their published values were not altered to suit the model.

The 127 agent re-reads are listed for a person in SPOT-CHECK-DECISIVE.csv. None is signed off by a person. A-READ-LIMITS.md separates the complete cached-text lead scan from source-specific acceptance and from publisher silence.

Full final A verification passed (VERIFY-A3.txt): 401 main tests, 186 import tests, the 46 acceptance expectations, scale and reproducibility, audit with no errors, current snapshot, 67 interface views and 300 rendered scenarios / 2,586 readings. The isolated verify:fast run took 57.3 s, within 90 s. Earlier failed runs are superseded: one fixture diagnostic was corrected; a commit during a running check changed only the manifest commit stamp, so verification was repeated with HEAD stable. A-BUILD-DIFF.txt reports 14,617 paths, including condition/headline/model changes and updated recorded text; A-DATA-DIFF.txt lists every source-table edit. No record is deleted.
