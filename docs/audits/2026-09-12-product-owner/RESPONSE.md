# Response to the 12 September audit

What was done with each of the 56 findings in [REPORT.md](REPORT.md), and why.

At the owner's direction, findings about AMS compatibility, price links and brand search were set
aside without assessment. Of the rest, a finding was accepted when it described something the tool
actually asserts that is false or misleading, or a control that does not work. It was declined when
it asked for a new capability, such as grade binding, undo history or exposure-specific chemistry,
rather than a correction.

Verification: 77 tests pass (62 before, 15 added). The rebuilt bundle was driven in headless Chrome
through every flow marked *Fixed* below, at 1440 and 900 CSS pixels, with no console errors.

## Outcome by finding

| ID | Outcome | What changed, or why not |
|---|---|---|
| F01 | Fixed | Template renamed "Warm environment"; it now says the H2C heats its chamber actively and that printing without that heat is not checked |
| F02 | Fixed | Every template carries a "Not checked" line beside the result count; Outdoor names UV and weathering |
| F03 | Fixed | All templates screen out support materials. Indoor dropped the chamber gate, which held out PLA Basic; it returns 20, including PLA Basic, PLA Matte and PETG Basic |
| F04 | Fixed | Descriptions say what is screened, not what the part will do; stretch is no longer described as spring-back |
| F05 | Fixed | Rows read "not tested" until a requirement exists; the CSV and Save / share panel agree |
| F06 | Fixed | "Printable on an H2C" is now "In the H2C research scope", with a note that print settings are not checked. A grade-level printability check was not built |
| F07 | Fixed | Now "I don't have a hardened nozzle". Owning one removes nothing. See DECISIONS D27 |
| F08 | Fixed | "Limited" resistance is unresolved, never PASS. Also found and fixed: "insoluble" never passed the water criterion. D28 |
| F09 | Partly | A pass now says it covers the recorded exposures, not the whole class. Choosing an exact agent first was declined: most records carry no agent |
| F10 | Set aside | AMS, at the owner's direction |
| F11 | Not changed | The CA0069 identity needs the retailer listing checked before the workbook is edited. Left for the owner |
| F12 | Set aside | Price link, at the owner's direction |
| F13 | Partly | The limits panel and the Compare header say a row can combine grades. Binding every requirement to one grade was declined as a new capability |
| F14 | Partly | Windows read "recorded", with a tooltip saying they span profiles. A profile-first recipe was not built |
| F15 | Fixed | A zero floor displays as "up to"; drying reads "guidance published"; a missing badge reads "none recorded". Compiled data unchanged |
| F16 | Partly | The CSV carries intervals and qualifiers. Compact table cells still show the central value |
| F17 | Fixed | Heat values without a stated load carry a visible "?" and a legend line. Re-reviewing the 28 locators is a data task, not done |
| F18 | Declined for now | Fair, but lower priority than the rest; the baseline still names the family, not the grade |
| F19 | Fixed | Evidence rows show post-processing, test temperature, print parameters and notes |
| F20 | Fixed | Source URLs are links. Source IDs on other tabs are still text (F22) |
| F21 | Set aside | Price link, at the owner's direction |
| F22 | Declined | Restructuring the tabs around products is a redesign, not a correction |
| F23 | Fixed | A search with no match says so, explains that brands are not searched, and offers Clear the search. Brand indexing set aside |
| F24 | Fixed | Reset is "Clear requirements" and says what it keeps |
| F25 | Fixed | The last visible result chip stays on and says so; recovery restores the policy's candidates, not FAIL; headings distinguish hidden from excluded |
| F26 | Fixed | Unchecked materials are UNKNOWN in Strict too; the policy only decides eligibility. D26 |
| F27 | Partly | Preferences are labelled "tracked only" and the ranking claim is removed from the README. No ranking implemented |
| F28 | Fixed | The rail keeps open groups and focus across re-renders. Per-lens scroll position not addressed |
| F29 | Fixed | An operator chosen before a number is kept |
| F30 | Fixed | Negative values and unreadable input are refused inline, leaving the applied requirement alone; the hint says when a value applies |
| F31 | Fixed | Applying a template switches to the table, where the requirements header is |
| F32 | Fixed | Compare shows each shortlisted material's current result, with reasons on hover |
| F33 | Fixed | One shortlisted material plus a baseline draws a comparison |
| F34 | Fixed | Evidence dots are wired in every renderer through one helper |
| F35 | Fixed | Related measurements appear in Compare as a tick with their marker; missing values keep their specific wording |
| F36 | Fixed | The scale includes interval tops; a legend explains the marks |
| F37 | Fixed | Compare leads with requirements, policy, template and snapshot, on screen and in print. Paper pagination not checked |
| F38 | Fixed | Below 1100 px the rail is a drawer with Filters, close, backdrop and Escape |
| F39 | Partly | Evidence dots are named buttons with a larger target. Parallel lines still have no keyboard path |
| F40 | Fixed | Enter opens a row only when the row itself has focus |
| F41 | Fixed | One panel slot for both drawers: focus moves in, Escape closes, focus returns. Not a full modal focus trap |
| F42 | Fixed | Startup and import share one hydration function |
| F43 | Partly | Links carry assumptions and the snapshot; file links are built correctly and the panel says they only work locally. Search and lasso are deliberately not carried, and the panel says so |
| F44 | Declined | Browser history and undo are a new capability |
| F45 | Fixed | Files and links are fully validated before anything changes; a bad one is refused with a reason |
| F46 | Fixed | Unticking every axis stays unticked; one usable material is named, not reported as none |
| F47 | Fixed | A dot is described as a pair of measurements of one grade, not a test |
| F48 | Fixed | The index tally counts unique materials; the false "ranked in the table" claim is gone |
| F49 | Partly | Frontier text follows the axes' directions; control names and the estimates message are correct. Lasso state is still not in links |
| F50 | Fixed | A coverage cell opens the Coverage tab; its tooltip explains the record that set the cell |
| F51 | Partly | Plain labels in Parallel and Compare, a corrected stretch hint, lens tooltips, "Save / share". Unit names are unchanged |
| F52 | Partly | "Relax" is "Remove". Duplicated controls kept, since each has useful local access |
| F53 | Partly | "What this database cannot answer" stays visible once requirements are set, and names more gaps. Guided routes not built |
| F54 | Fixed | Availability reads "listed in the Canadian price sample" and "in stock when sampled"; rail counts and dates come from the data. The old "45 of 102" counted profiles, not materials (27) |
| F55 | Fixed | The CSV follows table order and carries requirements, policy, results, failed and unchecked reasons, qualifiers and measurement IDs |
| F56 | Fixed | The drawer has Add to shortlist; the tray shows "N of 6"; the shortlist column is no longer sortable |

## Totals

38 fixed, 11 partly, 3 declined, 1 not changed pending a source check (F11), and 3 set aside at the
owner's direction. F23 counts as fixed for its recovery flow; its brand-search half is among those
set aside.
