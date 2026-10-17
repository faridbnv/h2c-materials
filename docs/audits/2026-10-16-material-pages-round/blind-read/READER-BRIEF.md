> **Historical record** (2026-10-17): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../OPEN-PROBLEMS.md).

You are a blind reader of the material pages of Filament Atlas, a filament selector for an engineering team that prints on a Bambu Lab H2C. Each material with enough data has a static page (a summary, its typical values and where they sit among the materials, figures, how to print it, its products, what makers say, sources and known gaps) and a records page that lists every record behind it. The selector's drawer shows the same material in tabs. Your job is to find where a page is wrong, inconsistent or unclear for an engineer, by checking it against itself, its records page, the drawer and the documents. You have not seen how any of it is made, and you must not look.

## Your pages

Ten materials, listed at the end. For each material `<ID>`:
- the page: `/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad/blind/site/materials/<ID>.html`
- its records page: `.../blind/site/materials/<ID>-records.html`
- the drawer's text, every tab: `.../blind/drawer/<ID>.txt`

(`...` stands for `/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad`.)

Read a page as text with `node .../blind/text.mjs <file.html>` (section by section, tables as rows), and read its HTML where you need what the text leaves out (a mark's data-v or title, an anchor's id, a link's href). Look at it rendered too. Do NOT read the repository's source code, tests, data tables, documents or audits (no files under app/, build/, data/, scripts/, test/, docs/, schema/). Two exceptions: you may read `scripts/lib/cdp.mjs` to learn how to drive headless Chrome (`findChrome`, `launchChrome`; then the DevTools protocol: `Emulation.setDeviceMetricsOverride` with width 390, `Page.navigate` to the file:// URL, `Page.captureScreenshot`), and you may run the sqlite3 query below. Save screenshots under `.../blind/shots/r<K>/` and look at them with your Read tool.

To trace a record to its document: the records page gives each record's document (with its ID, title and a link to the original) and the page and line it was read from. The cached text of every document can be read with
`sqlite3 .../blind/h2c.sqlite "select page, text from documents_fts where sourceid = '<document ID>' order by page"`
(add `and text like '%<a word>%'` to narrow it). You may also open the original link with WebFetch.

## What to check, on each page (one verdict per check)

- **C1 Masthead against the drawer.** The masthead's typical values (each with "median of N products" or "one product"), its nozzle and bed windows, its Polymer, Filler, Bambu Lab status and "Products N from M makers" against the drawer's Overview and Products tabs. Same numbers, same counts, same words for the same thing.
- **C2 First screen against At a glance.** Each first-screen number against the At a glance table's Typical, Range and Products compared; the "Against PLA / Against PETG" lines against the two materials' values where the page gives them (a percentage that cannot be right from the numbers shown is a fault).
- **C3 Figures.** Each figure's title and caption against its marks and its "How this is counted" text: counts that add up (products drawn + not drawn = products), the same count said the same way in the title, the caption and the findings above it, a mark's hover value (its data-v or title) matching the table.
- **C4 Empty and thin sections.** Every section that is missing or says little gives its reason in words an engineer understands, and the reason is true by the records page.
- **C5 The summary (In short).** Each claim it makes traces to a section of the page that says it. A count word ("most", "every", "a few", "a single product") must match the page's count; "makers" needs more than one maker saying it; nothing the page does not say.
- **C6 Words.** No record ID (V000123, G020-01, S-...), no project word (headline, grade for a product, twin, quarantined, screened, coverage record, migration, estimate band, "recorded with no document cited", review dates) in the page's reading path. Quotations of a maker and the records page's tables are exempt.
- **C7 Links.** Every internal link resolves to a file and an anchor that exists (check the id is on the target page); open three external links (a document's original) and say whether each leads to that document.
- **C8 Phone width.** Render the page at 390 px wide, top to bottom. Nothing runs off the right edge or overlaps; tables scroll in their own box; the contents rail and the figures are readable.
- **C9 Five records traced.** Pick five records at random on the records page (measurements and print profiles mostly). For each, find the value in the document's cached text (or the original) on the page it names, and say whether the record holds what the document prints (value, unit, conditions such as orientation, load, specimen). Name each record's ID.
- **C10 Anything else** that would mislead an engineer or make them distrust the page: a number that contradicts another, a sentence that says the opposite of a figure, a claim with nothing behind it.

## Output

Write `.../blind/r<K>.csv` (K is your reader number), UTF-8, with this header and one row per check per page (ten pages × ten checks = at least 100 rows), plus one more row for each additional fault you find under a check:

```
Reader,MaterialID,Check,Verdict,Where,Found,Expected,Note
```

- Verdict: `pass`, `fault` or `unsure`. A fault is something a reader would be misled by or that is plainly wrong; a nit is a pass with a Note.
- Where: the section and, if useful, the line or figure ("Printing, Figure 5.1 title").
- Found: what the page says, quoted exactly where you can. Expected: what it should say, or what the other place (drawer, table, document) says.
- For C9, put the five record IDs and the result for each in Note even when all pass.

Quote every field (CSV with double quotes; double a quote inside). Be specific and literal: a reviewer will check each fault on the page. Do not invent faults, and do not be generous.

Do not edit any file in the repository, do not run npm run build or any command that writes into the repository, and do not commit. Write only under `.../blind/`.

Report back: the count of faults by check, the three most serious faults in a line each, and anything you could not check and why.
