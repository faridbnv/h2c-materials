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
`BASELINE.json` preserves the generator's default as-printed/dry policy for each question and `BASELINE-ANSWERS.json` preserves
product and material answers. Existing source-unavailability and unresolved identities are never labelled publisher
silence. A prior NEEDS_VENDOR or limited search is not interpreted as a finding that nothing is published.

## Tranche A: cached-source re-read

The retained SQL queries searched unused source facts and full-text chamber/enclosure/direction/load wording (A-UNUSED-FACTS.txt and A-FTS-HITS.txt).
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

## Tranche B: held-document intake

B-HELD-OUTCOMES.csv retains 14 product/document leads, including the PET-G sheet that moved from deferred to extracted after its optical repair. Only the exact Recreus PET-G 2023 revision settles an authorized fact. b38/m220 retains that original and its distinct source row, adding V011511: HDT 68.0 °C at 0.45 MPa, ISO 75-2, with specimen, direction, moisture and treatment unstated. Its initial optical reading of 63 was corrected against the original page; the source bytes are unchanged. The optical PDF, text and original page images are backed up. Other automatic rows are rejected.

Adjacent Glow-in-the-Dark PETG, PETG Marble, Lightweight PET FLEX MAX, PA12 CF Support and neat HI-TEMP sheets do not become their similarly named targets. Existing Panchroma values are retained, and mixed PolyWood weak/strong-acid ratings do not settle a general acid requirement. The exact target scope is dated in GOALS; the general import pause remains. BACKUP-B.txt records the post-batch incremental export.

State scope: the original worklist runs the portfolio's default policy. S01/S03/S04 also have annealed expectation overrides, and S05 also has conditioned overrides in the acceptance tests. Those override variants are verified by the acceptance portfolio, but are not separate research questions in the frozen 11-question queue. S05 movement above refers to its default dry run; it is not a claim of humid-service suitability. The owner confirmed: finish the frozen targets and record the additional state variants for a follow-up. They are listed separately in STATE-VARIANTS-FOLLOWUP.csv; no additional source research is claimed for them.

B-MOVEMENT.csv/B-CHANGES.csv show **five newly definite product failures**, all on G020-70, and no material-level answer movement. These are Outdoor, Warm environment, S01, S03 and S04. The below-limit 68 °C datum rejects those heat requirements; it does not certify a printed coupon. B-HDT-TRACE.txt and B-DECISION-TRACE.json trace the numeric row and the Warm decision to the original digest. The compiled diff has 40 paths (B-BUILD-DIFF.txt), including the product value and three downstream HDT estimate spreads; B-DATA-DIFF.txt records the source-table additions.

Full B verification passed (VERIFY-B.txt): 401 main and 186 import tests, 46 acceptance expectations, scale/reproducibility, audit with no errors, current snapshot, 67 views and 300 rendered scenarios / 2,586 readings. verify:fast took 60.6 s. The initial run caught a stale generated know-how worklist after recording the new sheet read; it was regenerated and verification repeated.

## Tranche C: bounded maker-site print-settings search

The 65 frozen chamber targets had two outcomes in A (one resolved, one converted to a print test); the remaining **63 products** received the bounded product/download/print-guide pass. C-FETCH.jsonl records 84 URL attempts: 71 successful capture rows and 13 failed requests, with 67 distinct captured originals. One empty original is excluded from deciding evidence. C-DOCUMENTS.csv records the 66 usable document identities; b39 adds 63 distinct source rows and reuses three existing sources. These custody counts are separate from answers moved.

The final dispositions are **23 explicit chamber/enclosure statements**, **37 bounded searches with no usable chamber fact**, and **three access/identity limits** (Dow maker endpoint, exact 3DXTECH ESD-PA12 listing, exact Yousu POM guide). Source-only pages corroborate the search. Limited captures do not assert maker-site absence. Negative print-settings searches do not establish absence of mechanical or environmental data; that research remains limited to authorized cached/held documents.

m221 records only the exact product's chamber/enclosure wording. m222 also records six exact maker paragraphs as know-how: otherwise a chamber-only search would wrongly leave those products labelled as publishing no general know-how. Benefits, limitations, moisture advice and warping words stay in the record tier and never decide numeric or environmental requirements. Five source-only citation roles change from corroboration to cited for those recorded claims; all original digests stay unchanged. The guarded migration repeats with zero changes (C-KNOW-HOW-BINDINGS.csv). Explicit open-printer compatibility or an enclosure that is not mandatory is retained under D33. A qualitative heating recommendation remains unresolved without a setpoint. CreatBot's conditional 40–60 °C tuning recommendation retains its qualifier. The original generic parser left Spectrum PC-PTFE's full recommendation sentence unread/required; its typed state was corrected to recommended with an explicit Parse review, preserving the original words and absent setpoint. No new grade or shared formulation is created.

Against B, **21 product/question answers on 12 distinct products become PASS**, with **19 material/question answers on 11 materials becoming PASS**. Outdoor, High-stiffness and S01 gain IPCON PPA GF; Indoor gains ten passing materials; Lightweight gains two; Warm gains three; Flexible gains Fillamentum OBC 905. S03/S04/S05/S06 material counts do not change. C-MOVEMENT.csv and C-CHANGES.csv retain every answer; C-DATA-DIFF.txt and C-BUILD-DIFF.txt retain the changes to records and compiled paths.

C-SOURCE-BINDINGS.csv verifies all 23 accepted statements against their original digest and full evidence line, with person columns blank. DECISION-TRACE-INDEX.csv links every changed frozen product answer to an end-to-end trace of the final release, its compatible state, requirements, exact records, sources and locators. No vendor contact, human approval or H2C print/coupon test was executed.

## Final disposition of the frozen worklist

Every one of the **3,464 targets** has a row in OUTCOMES.csv, and all **3,507 target/question pairs** are recorded in TARGET-QUESTION-OUTCOMES.csv. **41 target facts now have definite answers in all their frozen questions; 3,423 remain unresolved and have explicit handoffs.** Finishing the authorized research does not mean those missing facts have become known. Cached keyword leads do not prove publisher silence; A-READ-LIMITS.md preserves the limits. HANDOFFS.csv names the missing exact-product fact and the next maker or coupon question.

Cumulatively, **64 product/question answers on 33 products changed**: 25 PASS and 39 FAIL. **21 material/question answers on 13 materials changed**: 20 PASS and one FAIL. No changes are screening-flag-only. FINAL-MOVEMENT.csv and FINAL-CHANGES.csv compare against the unchanged frozen baseline.

| Frozen question | A product answers moved | B | C | Final material PASS (baseline → final) |
|---|---:|---:|---:|---:|
| Outdoor structural part | 1 | 1 | 1 | 5 → 6 |
| Indoor prototype | 1 | 0 | 12 | 70 → 80 |
| Lightweight structure | 1 | 0 | 2 | 11 → 13 |
| Warm environment | 1 | 1 | 3 | 29 → 33 |
| High-stiffness fixture | 4 | 0 | 1 | 5 → 6 |
| Flexible component | 5 | 0 | 1 | 6 → 7 |
| S01 | 1 | 1 | 1 | 5 → 6 |
| S03 | 5 | 1 | 0 | 17 → 17 |
| S04 | 0 | 1 | 0 | 45 → 45 |
| S05 | 5 | 0 | 0 | 9 → 9 |
| S06 | 14 | 0 | 0 | 6 → 6 |

The additional policy variants are queued separately, at the owner's direction: S01 annealed (16 one-fact gaps), S03 annealed (76), S04 annealed (380), and S05 conditioned (1,066), **1,538 queued facts across four distinct policies**. STATE-VARIANTS-FOLLOWUP.json retains the constraints and release. No source research is claimed for that follow-up, and the frozen baseline remains dry/as-printed.

## Final source custody and checks

BACKUP-FINAL.txt records **2,267 original files and 2,712 derived files** in the private store. An empty-cache restore brought back every one with **zero refusals**. MANIFEST-LIVE.csv and MANIFEST-RESTORED.csv match registration, document keys, digests and text status on all 2,403 inventory rows (1,712 registered, 691 ledger-only). The single intentional difference is Kimya's mismatch becoming absent. Text status is 2,263 current, three stale, 125 absent and 12 not recorded; retaining stale reads is evidence preservation, not certification that the current reader parsed them.

The witness audit on the restored cache reports **7,678 currently matchable recorded rows, 7,089 line-bound, 578 historic page-image reviews and the same 11 listed exceptions** (WITNESS-RESTORED.txt). That audit checks proposal evidence lines; the manifest/restore proves the underlying originals and derivatives separately. Historical page-image reviews were not performed anew. DOCTOR-FINAL.txt reports every prerequisite available and zero present digests missing/damaged in the configured backup.

The Kimya targeted request returned **HTTP 404** (KIMYA-RETRIEVAL.txt); correct bytes were not found in the ledger and no source row or digest was replaced. **123 absent originals, 12 sources without recorded digests and that mismatch remain open.** The OneDrive folder remains retained locally; remote cloud upload completion has not been verified.

Full C verification passed (VERIFY-C.txt): 401 main tests, 186 import tests, 46 acceptance expectations, scale (2× compile/validate 111.7 s within its budget), reproducibility, database audit with zero errors, current snapshot, 67 interface views and 300 rendered scenarios / 2,586 readings. Earlier C runs were stopped when final source-review corrections were identified, and this complete run verified the resulting stable data. The cold verify:fast run took 106.7 s and exceeded 90 s; the isolated warm budget check is recorded separately. All source reviews are by the agent; the person's spot-check and team validation remain pending. Work is committed on v2; main and the remote are unchanged.

Final target dispositions: 41 resolved-fact, 2,511 cached-held-search-no-accepted-fact, 37 searched-print-settings-no-usable-fact, 3 access-or-identity-limited, 682 test-conditions-still-needed, 187 compatible-state-still-needed, 1 print-test-now-needed, 2 original-or-reader-unavailable. The newly bounded Siraya window is explicitly a print-test handoff, not a claim that no chamber fact was accepted.

The owner explicitly chose to record the 106.7 s cold fast-check timing for a performance follow-up. OPEN-PROBLEMS §19 retains it; no budget was raised or check weakened. VERIFY-FAST-C-WARM.txt records the isolated enforced-budget warm measurement.

The isolated warm `verify:fast -- --enforce-budget` run passed in **58.5 s**, within 90 s. C-BUILD-DIFF.txt reports **891 compiled paths** against B, covering source/recipe/reading records and the six record-tier claims; no numeric measurement enters in C. The current regenerated worklist has **3,452 one-fact gaps**, including 26 print-test gaps. Clearing a chamber gate also reveals products formerly blocked by two facts as now one fact from an answer, so that moving worklist is not the frozen-target closure count. The frozen 3,464-target register is unchanged.

The current SQLite record tier has 44,084 source facts (42,032 skipped/mapped and 2,052 unapplied) on 1,564 documents, plus 4,810 full-text pages of 2,263 cached documents. Of the registered retrieved sources, **1,572 of 1,706** are indexed; the remaining 134 are explicit. Current source-table counts are 154 conditioned measurements and 90 annealed published values without a repeatable schedule. These are measured residual gaps, not permission to substitute other states.
