# Quirks the remake keeps, on purpose (and lists)

> **In short.** The old tool has a few oddities. The rebuild reproduces them exactly, because "the rebuild changes
> nothing it was not asked to change" is what lets the parity check mean something (owner ruling OQ-03, plan
> decision ADR-09 item 5, TS-7 "keep and list"). Each is listed here with what it does, who it touches, and why it is
> kept for now. None is hidden, none moves a verdict today, and each can be offered to you later as its own approved
> change. Nothing here needs an answer from you now.

Written 2026-10-21 for WP-23, after the full compatibility run (`npm run parity -- --milestone`), which found no
further quirk: every other difference the run showed was the reprint transition
([reprint-counts-once](transitions/reprint-counts-once.md)) and nothing else.

## 1. A saved link with `x:3` opens as an old (version 1) link

- **What it does.** A link carries the version of the scenario format in its `x` field. The reader
  (`app/js/engine/scenario.js:334`) treats a link as the current version (2) only when `x` is exactly 2, and reads
  every other value, `x:3` included, as version 1. It does not refuse a link from a newer format or say it cannot read
  it. A saved scenario *file* with version 3 is refused ("version 3"), so the two readers disagree.
- **What it affects.** Only a link written by a newer version of the tool and opened in an older one. No link the
  tool writes today has `x:3`, so no current link and no answer is affected. The links check opens one such link
  (`hash/x3-reads-as-v1`) in both readers and requires them to agree.
- **Why it is kept.** Refusing or warning about it would be a visible behaviour change inside structural work. It also
  has a right answer to choose (refuse? warn and read as v2?) that is yours to make.

## 2. The "why excluded" tab ignores your assumptions (`explain.js:45`)

- **What it does.** The tab that ranks your requirements by how many materials each one removes
  (`app/js/ui/explain.js:45`) runs the exclusion count on the database's materials as published. The other views
  apply the scenario's assumptions first (a value you typed in for a material that does not publish it). This one
  passes the materials without them.
- **What it affects.** The counts on that tab, for a scenario that has assumptions. A scenario with none (every
  template, every census case and every scripted scenario the parity check asks) is identical either way. The tab
  can therefore say a requirement removes a material that the main table, with your assumption applied, keeps.
- **Why it is kept.** Applying assumptions there changes what the tab says; that is a behaviour change, so it waits
  for its own approval. The interface rebuild (WP-26) must reproduce the old tab as it is.

## 3. `headline.related` is an object in the database and a list in the engine (WP19-D2)

- **What it does.** In the compiled database 326 headlines hold `related` as an object (`{ count, best, ... }`), all of
  them headlines with no value. The engine's reason sentence reads it as a list of sentences
  (`app/js/engine/constraints.js:196,243`: `related?.length`, `related.join('; ')`). For an object the length is
  undefined, so the sentence "Published related values: ..." is never said.
- **What it affects.** Eight headlines of three materials that have no product on record and are judged on their own
  headline: PA66-CF (M056), PA612 (M058) and PA612-GF (M060). For them the reason reads "Not published in the sampled
  sources; ask the maker..." where a product view would add the related values. The words differ; no verdict, group or
  order moves.
- **Why it is kept.** Choosing which sentence those three materials should say is a wording decision. The typed port
  declares the field as the product view's list and does not cast the database's object into it
  ([defects.md](defects.md), WP19-D2).

## Not quirks, but worth knowing

- **Pages are compared as text, not as bytes.** P-pages reads the visible words, link targets, screen-reader labels and data
  islands of every page (Q2-20: byte-identical HTML does not decide). It does not read `data-*` attributes other than the data
  islands, so a tooltip carried in one (the note on a mark in a strip) is outside it.
- **A release ID does not cover the new build's rules** (WP20-D1, [defects.md](defects.md)). It matters here because the
  reprint transition changes the compiled database while the release ID, which hashes the old build files, stays
  `7c6da496722d`. Listed as an open item in the pull request.
