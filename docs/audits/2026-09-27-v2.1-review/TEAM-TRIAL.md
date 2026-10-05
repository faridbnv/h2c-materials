# Version 2.1 team trial

> **Historical record** (2026-09-27): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

The plan's phase 2 gate asks five representative engineers or operators to complete the intended task path, or to
name clearly the evidence that is unresolved, with completion times and misunderstandings recorded
([V2.1-PLAN.md](V2.1-PLAN.md), phase 2). Five is a formative sample, not a statistical proof of usability. **It has not
been run**: this page is the protocol, prepared by an agent on 2026-09-28, and its findings table is empty until people
fill it. The re-center's [team test](../2026-09-25-re-center/team-test.md) was not run either; this replaces it for 2.1.

## How to run it

- About 45 minutes per person: an engineer, a technician, and someone less experienced with materials, at least.
- A fresh build (`npm run build`), opened from `dist/` on a laptop at about 1,024 × 768 or larger; one person on a phone
  if the team uses phones at the printer. Note the release ID in the top bar.
- Say nothing about how the tool works; ask the person to think aloud. Time each task from the question to their answer.
- Record every place they stop, guess wrong or ask, whether they reached the answer, and what they believed the answer
  was. A wrong answer given confidently is the most important finding.

## The tasks

Each is one of the [acceptance portfolio](ACCEPTANCE.md)'s questions, whose source-grounded answer is known.

1. **An outdoor bracket (S01).** "A bracket outside: heat deflection at least 100 °C, stiffness at least 3 GPa, light,
   and printable on our H2C. Which product would you print, and how? We have an oven." Success: they choose a product
   that passes as printed, or allow annealing and choose one that passes annealed and say the schedule; they find its
   recipe; they save its decision brief; they say UV is not verified.
2. **A warm PC part (S02).** "A polycarbonate part near a motor. Can our H2C print Spectrum PC 275?" Success: they find
   that its bed (90-130 °C) is beyond the H2C's, and read that from the product, not the material.
3. **A PET-GF fixture without an oven (S03).** "Fiberon PET-GF15 for a fixture: at least 4 GPa and 80 °C. We cannot
   anneal." Success: they say it is not confirmed as printed, because its stiffness was measured annealed at 120 °C for
   16 h, and that it passes if they can anneal.
4. **A humid room (S05).** "A nylon-carbon fixture in a humid room, at least 6 GPa after it takes up water." Success: they
   switch the service state to conditioned and read that most products publish no conditioned value.
5. **Acids (S06).** "Will PolyMax PETG-ESD survive acids?" Success: they find the weak-acid Good and the strong-acid
   Fair-Poor, and do not call it resistant to acids.
6. **Handing it on (S12, D103).** "Save your choice from task 1 so a colleague can reopen it next week, and tell them what
   is still unverified." Success: the saved scenario and the brief name the product, its state and release, and its
   open questions.

## Findings

Record the date, the release ID and each person's role at the top when the trial is run.

| # | Who (role) | Task | Time | Where they stopped, guessed wrong or asked | Answer they gave | Right? | Suggested change |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

A finding that needs a change goes to the owner, who decides whether it becomes work (GOALS, working rule 8). The
scorecard's C7 waits on this trial, and so do the plan's "practical workflow" line and its before-and-after timings.
