# Flexural comparison round, 2026-10-16

> **Historical record** (2026-10-16): written for one round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

> **In short.** The owner asked, of what the drawer already holds, for the flexural results to be drawn as the tensile
> ones are, for a subtle, expandable explanation of how flexural and tensile results relate, and for tensile strain at
> strength under the tensile heading. Claude Opus designed it and wrote the code and the migrations m417 to m419; Claude
> Sonnet agents read all 117 flexural headings and re-read 20 newly drawn values blind. No answer moved (D140).

## What was built

- **Flexural tests, XY and Z** on Mechanical: flexural modulus and strength, an XY row and a Z row each, four rows drawn
  in the drawer alone (m417). Listed under it, not drawn: flexural elongation at break and the stress at conventional
  deflection.
- **How flexural and tensile results relate**, a second closed line under the heading: a method.csv rule, shown through
  drawer_comparisons.csv's new Note topic.
- **Tensile strain at strength** listed under the tensile heading (drawer_comparisons.csv's new Listed properties), not
  drawn: another endpoint than elongation at break, 79 values with 45 of no orientation, and 8 materials with two products.
- A drawer-only row may now draw a value with no stated orientation, hollow and out of the median; the rail's count of
  such values and the product card's note read the selectable headlines only.

## The sweep

A Claude Sonnet agent read all 117 headings as text against the checklist of the drawer comparisons round (every count
added up). Fixed in the drawer: a pair some product publishes both of, but none in one document and state, now says
"None for flexural strength" on the share line (M019 printed a modulus share and was silent on strength); several single
values on a heading with no graph are separated ("One product each: A; B"). Read and kept: Z medians above XY ones where
the two rows are different products (M027, M032); shares of 26 % and 25 % (M156, M073), as the sheets print them;
FormFutura FlexiFil TPC 30D's flexural strength of 20 kgf/cm² (1.96 MPa), a 30D elastomer's; more dots than results
drawn where twins read one sheet (D89). Found and flagged: Flashforge PA6-GF20's bending moduli of 200 and 57.5 MPa,
the sheet's modulus and strength rows swapped, whose strengths were already flagged (m419).

## The blind draw

20 newly drawn flexural values (5 per row) on seed 20261017 ([blind-draw/](blind-draw/RESULT.md)): all 20 as their pages
print them. One reading showed Trilan PC's sheet stating its specimens once, under "Specimen Conditions" (printed on a
Fortus 400mc, solid infill, XY flat), which its rows had not taken: a page statement now gives it to them (m418). An
orientation the reader did not find on the value's page (D11) is stated on the sheet's second page, as m155 recorded.
