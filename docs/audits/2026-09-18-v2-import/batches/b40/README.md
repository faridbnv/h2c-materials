# b40: the gap-fill tranche's product pages

> **Historical record** (2026-09-18): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../../README.md) and [OPEN-PROBLEMS](../../../../../docs/OPEN-PROBLEMS.md).

Applied 2026-09-29 by `m226-batch-b40`: 9 documents, 18 records (9 sources, 9 profiles). Imports are paused (GOALS);
the owner asked on 2026-09-29 for the gap-fill research of 2026-09-28 to be finished (GOALS, "the gap-fill tranche"),
and this batch is the part of it that needed documents the database did not hold. The rest of the tranche was recorded
from documents already registered, by `m225-gap-fill-registered-sources`; the record of both is
[the tranche's audit](../../../2026-09-29-gap-fill-implementation/README.md).

**The documents.** Nine exact-product pages the research saved on 2026-09-29 (UTC), staged from its copies by digest
(`ingest:witness --from`, [WITNESSES.csv](../../../2026-09-29-gap-fill-implementation/WITNESSES.csv)): Extrudr FLEX
Medium ESD, WOOD, PLA Basic CF, FLEX Semisoft, FLEX Hard, FLEX Medium, FLAX and GreenTEC Pro CF, and Recreus Conductive
Filaflex. No URL was registered before, so none is a later revision of a held source.

**What each gives.** One profile for the existing product, holding only the setting its own sheet does not print: the
page's drying schedule ("Drying temperature 60 °C; Drying time 6 h"), and for Conductive Filaflex the 0.4 mm row of its
nozzle table (250 °C), its bed ("Small parts: No heating (room temperature); Large parts: 50-55°C") and its drying
("Temperature: 55°C; Minimum time: 1 hour"). The Extrudr pages' nozzle and build-plate rows agree with the sheets'
profiles and are not recorded twice; each Locator names the sheet's profile. The typed cells are the build's parsers'
reading, as for every profile. No measurement is taken: the proposer's automatic readings of each page are kept in the
proposals, rejected.

**Who reviewed.** Claude (claude-opus-5-5), an agent, named in [review.mjs](review.mjs), which writes the proposals:
it checks each page's bytes against the digest the research recorded and finds each pinned line, in order, on the
page's cached text. The research's own review was another AI model's. No person has signed a row.

**How it ran.** `ingest:witness --from`, then `review.mjs`, then `ingest:apply -- --batch b40 --dry-run` (no refusal),
then the migration, twice (18 records, then 0), then `--finish`. [changelog.csv](changelog.csv) and
[build-diff.txt](build-diff.txt) cover the whole tranche (m225 and m226) against the base commit.

**Decision diff.** The batch alone moves no answer: its drying schedules decide nothing, and Conductive Filaflex's
nozzle and bed are within the H2C while its chamber stays unknown. Held from the same research: Extrudr FLEX HARD CF's
drying, whose page prints 6 h in its FAQ and 12 h in its table (OPEN-PROBLEMS §21).
