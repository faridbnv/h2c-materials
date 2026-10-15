# Decisions no longer in force

> **In short.** The text of every decision a later one replaced in full or that was withdrawn. Their rules do not hold;
> they are kept so the reasoning that led to the decisions in force can be read. The index at the head of
> [DECISIONS.md](DECISIONS.md) lists them with what replaced each, and links here.

A decision that a later one amended or narrowed stays in DECISIONS.md, because its rule still holds in part. Only one
that holds in no part comes here, moved as it was written (maintainability round, 2026-10-15).

---

## D10. A family estimate may rule out, never rule in (superseded by D40, D42, then D43)

> **In plain words:** The first estimates could only rule a material out, never qualify it; the design was replaced by the calibrated model.
> **Status:** superseded by D40, D42, then D43; its rule that an estimate never passes a material lives on in D43.

The asymmetry is the whole design. Knowing every measured unreinforced PLA falls between 2.8 and
15.3% elongation is enough to say PLA Lite is not an elastomer. It is not enough to certify PLA Lite
clears a 5% floor, because the bound is drawn from its relatives.

Reversing this would let inference satisfy a requirement, which the brief forbids outright. Before
estimates, a search for elongation at least 100% returned 35 materials including PLA Lite and the
nylons; it now returns 14, of which 8 are genuine elastomers and 6 are supports that honestly have
no peers.

## D40. Peer observations are context, not exclusion bounds (superseded by D42, then D43)

> **In plain words:** For a short time, estimates drawn from similar materials were allowed to decide nothing at all.
> **Status:** superseded by D42, then D43.

The systematic data audit found OBC borrowing PP and reinforced PP mechanical spans, flexible
families pooling TPU with PEBA/TPC, and HDT estimates borrowing unstated loads. Even within a
correct family, the observed extremes of a small sample do not bound an unmeasured formulation.
Peer estimates now require the same base polymer and modifier, preserve intervals, and never
determine eligibility. This supersedes D10 and the exclusion claims in historical audits.

## D42. An estimate is a prediction interval from like-for-like evidence, and may only screen (superseded by D43)

> **In plain words:** The second estimate design: like-for-like evidence and 95% intervals, allowed to rule out and never to qualify.
> **Status:** superseded by D43.

Estimates failed twice, in opposite directions. The first model (D10, D11) pooled display families
and then whole filler classes, took the sample's minimum and maximum, and let that span fail a
material: OBC borrowed polypropylene's elongation, TPU pooled with PEBA, and a handful of peers'
extremes were treated as a bound. The second (D40) kept three same-polymer spans and let none decide
anything, which gave up the reason estimates exist: keeping a PLA out of an elastomer search.

The model now separates which evidence from how wide, and both from what an estimate may do.

**Which evidence.** A ladder, strongest first: the material's own other grades with the headline's
exact test semantics; then other materials of the same polymer identity and reinforcement class;
then a declared close-analogue group, reviewed like code in `build/mappings/estimate-model.json`.
Nothing pools a display family or a behaviour class. A prototype class envelope would have screened
CPE out of "elongation at least 100%" although its own data sheet reports 150%.

**How wide.** Every rung gives a 95% prediction interval for one more formulation, never a sample's
extremes. That includes the material's own other grades: a generic PLA grade at 46 MPa does not
bound the representative grade, and an early version of this model screened PLA out of "strength
at least 60 MPa" on exactly that basis. The spread is a documented, conservative between-formulation
prior, or a sample's own spread where wider (TPU's hardness grades are), on a log scale for
stiffness, strength and elongation. The spread actually seen across the snapshot is computed every
build, and the build fails if the median group exceeds the prior.

**What it may do.** Never pass: the verdict stays UNKNOWN, so the FAIL count stays evidence (D26).
In Explore with Estimates on, it may screen a material out, only when its whole interval fails the
requirement, only from the material's own grades or from peers with at least five independent
formulations, and never when any of the material's own measurements of that property, in any
direction or at any endpoint, could meet the requirement. A screened material is counted under
UNKNOWN, marked "screened", and brought back by the SCREENED chip. Strict never consults estimates.

Reversing any part reintroduces one of the three failures: pooling brings back OBC and TPU,
extremes as bounds bring back over-confident exclusions, and no screening brings back PLA Lite among
the elastomers. The user chose screening, the evidence rungs and the 95% level when this was designed.

## D132. Published impact evidence is explained beside the exact product, without changing what decides (withdrawn)

> **In plain words:** Withdrawn the day it was made. Its drawer text told readers that makers were silent on things they had said, and called conditions "not stated" that the page states once for its whole table. The code is reverted; the four maker statements and the later Bambu PLA Tough+ page it recorded stay, under the topics they belong to.
> **Status:** withdrawn on 2026-10-06 (code reverted; its statements re-filed by m384); the impact comparison is redone under GOALS, "Decided on 2026-10-06, later".

**Why it was withdrawn.** A statement holds one topic. Moving eleven into a new topic "Impact and toughness" emptied the
topics they left, so seven products read "Not stated by the maker: layer adhesion" (or applications, or benefits) beside
the very sentence that states it. Its impact panel read each record's own cells and not the heading its page prints once
for a table (D116), so 34 impact records read "not stated" for a schedule, standard, moisture or temperature their page
gives, one of them "Treatment: not stated" above "measured after annealing at 100 °C for 16 h". A "+" in a product name
(PETG+CF, PA12+GF15) was read as a claim of toughness, and the popover of every material's median said it included the
formulations it then listed as left out. No value or answer had moved. m384 puts the eleven back and files the four it
added (R-BAMBU-PLA-TOUGH-20261005's three, Anycubic PLA+'s one) under Benefits and Good for; nothing is deleted. The
text below is the decision as it was made.

The owner approved the bounded published-evidence round on 2026-10-06 (GOALS steps 2, 4 and 5). Its 24 assigned products
were read against held sources; 27 numeric impact readings were confirmed by the readings/reconcile/proposals path,
with no deciding corrections proposed. Eight additional impact targets retain contradictory method/standard labels,
and eight practical chamber questions retain missing setpoints or qualitative recommendations. Neither is guessed.

`Impact and toughness` is a display-only topic under `know-how`. Migration m383 re-topics eleven source statements and
adds four omitted statements. The later saved Bambu Tough+ product page enters by witness digest and a separate source;
it does not reconstruct the lost older page. The same evidence IDs appear under Products and beside Mechanical records.
Claims preserve their comparator and establish no screening, ranking, estimate or calculated improvement ratio.

The existing measurement assessment moved to `app/js/engine/published-values.js`, with the build's original vocabulary
validators supplied as adapters and compiled forms used in the browser. The product population used by the median also
lives there: declared variants remain separate, permitted twins retain their own product weight, and a material whose
products are all variants retains that population. The drawer derives counts, names, sources, annealing and admitted
missing conditions from this exact population. No derived field is stored and no scenario/export format changes.

The execution receipt, bounded holds, source hashes, verification and next action are in
[the packet](audits/2026-10-06-published-evidence/README.md). Source-grounded fixtures check the Bambu preparation schedules,
notched versus unnotched values, PolyLite PETG's 2.6, method contradictions and raw-material J/m values independently of
the refactored rule; complete numerical/state parity and browser checks establish the explanation-only boundary.
