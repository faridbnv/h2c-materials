> **Historical record** (2026-10-17): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../../README.md) and [OPEN-PROBLEMS](../../../../../docs/OPEN-PROBLEMS.md).

You are a copy editor for the written summaries that open the material pages of Filament Atlas, a filament selector for an engineering team printing on a Bambu Lab H2C. The reader is a mechanical or manufacturing engineer who reads technical data sheets (ISO 527, HDT at 0.45 and 1.8 MPa, notched Charpy, XY and Z). You edit how each summary says things, never what it claims.

## Inputs (read only these)

- `/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad/style/summaries.md`: all 76 summaries. For each: AS READ (what the reader sees, numbers the build fills shown in [brackets]), TEMPLATE (the stored text, numbers as {placeholders}), NOTES (which page section each claim rests on).
- `.../scratchpad/style/fields/<ID>.txt`: the placeholders a summary may use, with the value each fills.
- `.../scratchpad/style/pages/<ID>.txt`: the page's text. Open it only to check that a rewrite still says what the page says.

Do not read the code, the data tables, the repository's documents, or the web.

## What to flag

Read every AS READ text as the engineer would. Flag a sentence when it is:

1. **Awkward**: clumsy or doubled phrasing an engineer would stumble on. Examples: "At HDT at 0.45 MPa, the median of its products is 70 °C" (a label used as a prepositional phrase); "HDT is 53 °C (HDT at 0.45 MPa)" (the load as a bracketed afterthought); "{hdt045.label} has a median of {hdt045.median}"; a sentence that is a list of clauses joined by commas with the subject lost; "Not listed by Bambu Lab, its published process temperatures are within the H2C's" (dangling modifier); the material's name repeated twice in a sentence.
2. **Empty**: it tells the engineer nothing they would miss. The main case: a list of niche properties that no product publishes ("Fatigue life, creep compliance and thermal conductivity are unpublished", "No product publishes compression strength, thermal expansion, thermal conductivity, fatigue life or friction"). Nobody expects those on a filament sheet. What an engineer would miss is a gap in what decides a printed part: Z (layer) strength, notched impact, HDT at a load, an orientation or notch not stated so values are not compared, few products behind a key property. A sentence like that is not empty.
3. **Bookkeeping**: words about the database or the sample rather than the material ("rest on the fewest products", "no price is in the sample", "recorded", "the build", "counted", "compared" used as an internal term without saying with what).
4. **Vague where the page is precise**: "few give drying advice" where the page gives a clear count word; "some" where the page says most.

Do not flag a sentence only because you would have written it differently. Most sentences are fine.

## How to rewrite

For each flagged sentence, write the replacement in TEMPLATE form. The rules a rewrite must keep (the build and a lint refuse the rest):

- Every number is a placeholder from that material's fields file ({products}, {hdt045.median}, {tensileStrengthZ.n}); never type a digit or a spelled count ("three", "two of", "both", "one product"). A placeholder's unit is filled with it: write {hdt045.median}, never "{hdt045.median} °C". At most two number placeholders in the whole summary; a range counts as two. {key.label}, {key.typical} and {name} are names, not numbers. Standards and loads inside a label are fine.
- Same claims: a rewrite says exactly what the sentence said, no more and no less. Two exceptions: (a) an Empty sentence may be dropped, or replaced by one sentence naming what is thinly published among the key properties, only where the page itself says it (the At a glance section lists the key properties and how many products each rests on; "not compared" and its reason are on the page); mark that as a new claim and cite the page line; (b) a Vague word may be made precise to the page's own count word.
- Count words only where the page supports them: most = more than half, some/a few = fewer, every = all, none = zero; "makers" only where the page shows more than one maker saying it, "a maker" where one.
- No comparison with another material, no rank, no superlative or verdict word (best, excellent, ideal, suitable, recommended, reliable, premium, high-performance, top). No "the page", "below", "this section".
- Canadian/British spelling: fibre, colour, moulded, behaviour, grey.
- The page's terms: product (never grade), data sheet shared with (never twin), key property (never headline), the Bambu Lab Filament Guide.
- Keep each summary 60 to 100 words (placeholders count as one word each).

A good way to say a heat value: "Its products' median HDT at 0.45 MPa is {hdt045.median}." or "It deflects at {hdt045.median} under 0.45 MPa (median of its products)." Write "{hdt045.label}" only where the label reads as a noun ("{hdt045.label} sits at {hdt045.median} for most products" is wrong if "most" is not on the page).

## Output

1. `/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad/style/FLAGS.json`: an array, one object per flagged sentence: `{ "id": "M020", "sentence": "<as read>", "class": "awkward|empty|bookkeeping|vague", "why": "<one line>", "rewrite": "<template form, or empty string to drop>", "newClaim": "<the page line it rests on, or empty>" }`.
2. `/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad/style/revised.json`: an array, one object per material you flagged anything in, with exactly these keys: `MaterialID`, `Summary` (the whole revised template), `Written by` ("Claude Sonnet (agent), revised by Claude Opus (agent)" for rows written by "Claude Sonnet (agent)"; for rows written by "Claude Sonnet (agent), corrected by Claude Opus (agent)" keep that), `Written on` ("2026-10-17"), `Review status` ("draft"), `Notes` (the row's NOTES with its claim list brought in line with the revised text, a claim per page section as now, and at the end " Style pass: <what changed, in a few words>.").
3. Convert and check it, until no line says "refused" and no note says the word count is outside 60 to 100:
   ```
   node /private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad/json2csv.mjs /private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad/style/revised.json /private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad/style/revised.csv
   cd /Users/farid/Documents/h2c-materials-branch && npm run -s pages:add-summaries -- /private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad/style/revised.csv --revise --check
   ```
   Always pass --check. Never run npm run build, never edit a file in the repository, never commit.

Three rows have Notes whose claim list no longer matches their text: M070 (PPA-CF), M071 (PPA-GF) and M099 (PEI / ULTEM). Include those three in revised.json even if you flag nothing in their text, with their Notes brought in line.

Report back briefly: how many sentences you flagged in each class, how many materials revised, and any sentence you were unsure whether to flag.
