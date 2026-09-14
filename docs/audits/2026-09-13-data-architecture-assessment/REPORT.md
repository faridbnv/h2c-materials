# Data architecture assessment and migration options

- **Date:** 2026-09-13
- **Baseline:** `54f606a941fabf07d313b56265ab918a553449d8`
- **Scope:** Read-only assessment of the current database authoring model, source-to-HTML pipeline, validation controls, debugging path and growth limits. No workbook, code, generated data or application behavior was changed. This report is the only deliverable added by this assessment.

## Decision

The concern is **mostly true**, but the weakness is concentrated in the authoring and change-management layer.

The current system has a sound conceptual model and an unusually strong validation pipeline for a spreadsheet-backed project. Materials, grades, measurements, profiles, evidence, prices, sources and coverage are already separated. The compiler verifies headline citations, ownership, raw conversions and the final HTML payload. The browser application consumes a compiled read-only snapshot and does not depend on Excel at runtime.

The source of truth is nevertheless becoming hard to maintain, review and extend. A binary workbook contains relational records, list-valued links, derived summaries, formulas, constants and prose. Database constraints apply only after extraction. Schema rules are implicit across workbook columns, JavaScript parsers, mapping files and documentation. Audited changes require hash-guarded XML scripts and large external changelogs because Git cannot show a useful row-level workbook diff.

This is **not currently a data-volume failure**. The 4,386 workbook records compile and validate quickly, and the compressed application payload is small. It is a governance, edit-safety, traceability and schema-evolution problem. The [original architecture brief](../../background/architecture-brief.md#162-sqlite-as-future-source-of-truth) explicitly described Excel as the V1 choice and SQLite as the next step once the workbook became difficult to govern. That transition condition has now been met.

| Dimension | Current assessment | Why |
|---|---|---|
| Conceptual data model | Strong | Nine relational-style entities, stable IDs, grade/source ownership and explicit missing states are already present. |
| Integrity after build | Strong | The compiler and validator fail on broken references, wrong ownership, headline mismatches, conversion errors and source-to-HTML drift. |
| Edit-time safety | Weak | The workbook contains no Excel data-validation rules; relational and semantic errors are detected after extraction. |
| Change review | Weak | Git reports the source workbook as `Bin old -> new`; row changes need a separate script and changelog. |
| Debugging | Mixed | Record IDs and audit artifacts are good, but tracing a defect crosses workbook XML, cached formula values, parsers, mappings and compiled JSON. |
| Schema evolution | Weak | Header positions, expected row counts, formula lookup bounds and field semantics are manually coordinated. There is no declared schema or migration chain. |
| Present computational scale | Strong | A read-only benchmark extracted, compiled and validated the current workbook in about 0.41 seconds on this machine; the current JSON is 3.57 MB and 212 KB with gzip. |
| Collaboration scale | Weak | A single binary source is difficult to merge, review and edit concurrently. |
| Large analytical scale | Limited | The build and browser load whole arrays and use repeated scans. This is fine now but unsuitable for very large test histories. |

The ratings above are architecture judgments based on the evidence below, not test results or claims about the accuracy of every source value. Source accuracy is covered separately by the [systematic data audit](../2026-09-13-systematic-data/REPORT.md).

## Evidence base

The assessment followed the current source path documented in [ARCHITECTURE.md](../../ARCHITECTURE.md), [PIPELINE.md](../../PIPELINE.md), [DATA-MODEL.md](../../DATA-MODEL.md) and the code that performs extraction, compilation and validation.

### Current inventory

| Item | Observed state |
|---|---:|
| Authoritative workbook | 562,491 bytes |
| Workbook sheets | 9 |
| Workbook data records | 4,386 |
| Materials / grades | 102 / 144 |
| Measurements / numeric measurements | 1,966 / 1,806 |
| Print profiles / use-and-durability records | 167 / 478 |
| Prices / sources / coverage / method rows | 104 / 235 / 1,146 / 44 |
| Main workbook columns across the nine sheets | 181 |
| Formula cells | 6,160 |
| Material headline citations checked | 369 |
| Current tests documented and present | 112 |
| Compiled `db.json` | 3,566,714 bytes |
| Gzipped `db.json` | 212,536 bytes |
| Standalone HTML | 4,781,304 bytes |
| Read-only extract + compile + validate benchmark | 412 ms; 0 errors, 4 standing evidence warnings |

The workbook shape comes from [extract.js](../../../build/src/extract.js); current validation results are in [validation-report.md](../../../build/reports/validation-report.md). The benchmark was a single local observation, useful only to establish that current volume is not the immediate problem.

### What should be preserved

1. **The entity boundaries are appropriate.** Measurements should remain separate from grades, profiles, evidence, prices and sources. A replacement should not flatten the data into one master table.
2. **Raw evidence and interpretation are distinct.** Raw values, reported units, conditions, normalized values, missing states and source locators should remain separately traceable.
3. **The build is a release gate.** The current source → normalize → compile → validate → bundle separation should remain, even if the source format changes.
4. **The semantic checks are valuable.** A database foreign key can establish that a grade exists, but the existing code also checks that it belongs to the material presenting it and that a headline uses the representative grade. Those domain checks must survive migration.
5. **The runtime contract is effective.** `db.json` and `reference.json` are suitable compiled formats for a static, offline application. A source-of-truth migration does not require a browser database or a backend.
6. **The audit principles are sound.** Source hashes, exact grade identity, record IDs, explicit retirement, unresolved conditions and evidence limitations should remain first-class data.

## Finding register

| ID | Priority | Finding | Practical effect |
|---|---|---|---|
| DA-01 | High | The canonical source is a binary file with no useful Git diff | Reviewers cannot inspect the authoritative row changes directly; merges and rollback are coarse. |
| DA-02 | High | Relational constraints are enforced after editing, not while editing | Invalid IDs, ownership and vocabularies can enter the workbook and remain until a build runs. |
| DA-03 | High | Relationships are stored as delimited strings and redundant lists | Updates require parsing and synchronized edits; ordinary database constraints cannot protect the links. |
| DA-04 | High | Authored facts and derived summaries use mixed formulas and constants | Two calculation paths can drift and require special validation and cache handling. |
| DA-05 | High | The pipeline is coupled to sheet coordinates, row counts and formula bounds | Adding data is also a schema/code operation, even when the logical schema did not change. |
| DA-06 | Medium | Free text carries too much machine meaning | Parser maintenance grows with every source vocabulary and can produce plausible wrong values. |
| DA-07 | Medium | The schema and rules are distributed, and builds include wall-clock metadata | Impact analysis and byte-for-byte reproduction require knowledge of several files and conventions. |
| DA-08 | Medium | The audit edit mechanism is safe but expensive | Small authoritative changes produce one-off XML code and large derivative evidence packages. |
| DA-09 | Low now; high at large scale | Full-snapshot compilation and browser loading have no indexed query layer | Current performance is good, but large test-result histories would increase memory, scan time and bundle size. |

### DA-01 — Binary source obscures the authoritative change

Recent workbook commits are recorded by Git only as binary size changes. The systematic audit changed 25 distinct cells, but those facts can be reviewed only through its external apply script, changelog and verification files. The latest audit commit added roughly 70,000 lines of audit artifacts to explain a 1.2 KB workbook-size change.

The audit trail is careful, but it compensates for the source format rather than making the source change naturally reviewable. A row-oriented text change or database transaction log would show the changed record, field, old value and new value directly.

### DA-02 — Integrity begins too late

The workbook contains no Excel data-validation rules on any of its nine sheets. Primary-key uniqueness, foreign-key existence, grade ownership, allowed states and cross-field conditions live in [compile.js](../../../build/src/compile.js) and [validate.js](../../../build/src/validate.js). This protects released output, but it does not help an editor at the moment an invalid value is entered.

A robust target should enforce three layers:

- database constraints for types, nullability, uniqueness and direct relationships;
- semantic validation for material/grade/evidence rules that span several records;
- release parity checks for the compiled JSON and embedded HTML.

SQLite can provide `STRICT` typing plus `CHECK`, `NOT NULL`, `UNIQUE` and foreign-key constraints. Its foreign keys must be explicitly enabled for every connection with `PRAGMA foreign_keys = ON`; the migration and CI code must assert that state rather than assume it. See the official [SQLite STRICT tables](https://www.sqlite.org/stricttables.html) and [foreign-key](https://www.sqlite.org/foreignkeys.html) documentation.

### DA-03 — List-valued foreign keys are relations hidden inside cells

The Materials sheet stores nine relation groups as text: grade IDs and printing, mechanical, thermal, price, use, environmental, durability and safety evidence. They contain 1,395 parsed links. `Sources.Applicable grades` adds 179 more grade links. The largest single material cell holds 13 environmental evidence IDs.

Some of these links are redundant:

- `GradeIDs` can be derived from grades belonging to a material plus a grade role/status;
- environmental evidence can be derived from evidence owned by the material and classified into environmental categories;
- price evidence can be derived from the explicit headline-sample flag;
- the displayed headline value can be derived from the selected `MeasurementID` instead of copied into another cell.

Relations that represent a real editorial choice should become rows in link tables. Relations that are deterministic should become views and should not be authored twice.

### DA-04 — The workbook has two calculation paths

The Materials sheet has 388 formula-backed numeric headline/price cells and 21 numeric headline constants. The Properties sheet has 1,807 formula-backed normalized-value rows and 159 constant normalized-value rows. This split arose as audited rows were appended through direct XML editing.

The existing compiler mitigates the risk: all measured headlines are matched back to their cited measurement, and raw-value reconciliation independently checks numeric conversions. The source is still harder to reason about because the same field may be calculated by Excel in one row and supplied as a cached constant in another.

The target model should store raw facts and the selected evidence relationship. Normalized values and summaries should be produced by one versioned transformation or view. A material headline should not store a second copy of the selected measurement's numeric value.

### DA-05 — Ordinary row growth crosses several boundaries

[extract.js](../../../build/src/extract.js) knows the header row for every sheet and contains an exact expected count for every entity. This makes unreviewed row drift fail loudly, which is safer than silent truncation, but every legitimate append requires code edits to the expected counts.

Workbook formulas also carry physical limits. Material headline lookups currently reference `Properties!…$1809`, while the Properties sheet extends to row 1969. Later headline values are constants, so the compiled database is still correct under current checks, but the formula range demonstrates the maintenance burden.

The shared [workbook XML editor](../../../scripts/workbook_xml.py) must know worksheet part numbers, table part numbers, header rows, cell styles and table ranges. These are storage-layout details rather than domain rules.

### DA-06 — Free text is doing database work

The normalization layer contains about 549 lines across direction, values, thermal, process, chemical and provenance modules. The process parser alone is 232 lines; the environmental map converts 73 source topics to canonical categories. This is appropriate for a **staging/import** layer because source documents are inconsistent. It is risky as the recurring boundary for already-curated canonical data.

The decision log records previously shipped parser defects involving range dashes, annealing temperatures, booleans and ambiguous chamber wording. Tests now pin those cases. The conclusion is to keep parsers for raw source ingestion while storing the reviewed result in typed canonical fields with the raw text and transformation version alongside it.

### DA-07 — The contract exists, but it is implicit and distributed

Field definitions are spread across workbook headers, the Method sheet, normalization code, two mapping JSON files, compiler object construction, validator rules, interface labels and prose decisions. A search found no SQL DDL, formal JSON Schema or ordered schema migrations outside the historical architecture discussion.

This distribution is partly healthy: UI labels, data normalization and decision logic should not be one module. The missing piece is one machine-readable contract that declares entity fields, types, allowed values and relationships. JSON Schema Draft 2020-12 provides a standard vocabulary for validating the compiled JSON structure; it should supplement SQL constraints, not replace relational checks. See the official [JSON Schema 2020-12 specification](https://json-schema.org/draft/2020-12).

`build/src/index.js` also writes the current calendar date into `meta.build`. Two builds of the same commit on different days therefore differ. A release manifest should use the source commit, schema version, input hashes and an optional reproducible build timestamp such as `SOURCE_DATE_EPOCH`.

### DA-08 — Safe workbook changes require disproportionate machinery

There are three audit-specific `apply-workbook-changes.py` programs, three changelogs and a shared XML editor. The hash guards, cell logs and ZIP preservation checks are good safeguards. They also show that a normal row update is now a custom migration against an opaque container.

The replacement should keep hash-guarded, reviewable migrations but express them as row changes under a declared schema. Migration files should be ordered, immutable after release and exercised from an empty database in CI.

### DA-09 — Runtime scale is not the current blocker

The 3.57 MB JSON compresses to about 212 KB, and the whole source compiles and validates in well under a second locally. Moving the browser runtime to SQLite or DuckDB now would add complexity without solving the authoring problem.

The limit appears if the project begins storing millions of specimen-level or time-series observations. The current validator repeatedly filters full arrays per material, and the application inflates the complete database in memory. At that point, large analytical measurements should be separated from the compact selection snapshot. DuckDB can query Parquet directly and use projection and filter pushdown, which makes it suitable for that analytical sidecar; see the official [DuckDB Parquet documentation](https://duckdb.org/docs/stable/data/parquet/overview).

## Architecture alternatives

| Option | Integrity | Review/debug | Editing | Concurrency | Scale | Architectural effect | Fit |
|---|---|---|---|---|---|---|---|
| A. Harden the workbook | Better than now, still post-edit | Limited by binary source | Familiar | Poor | Adequate for current size | Keep XLSX extractor; add controlled lists, relation sheets, generated formulas and a schema manifest | Short transition only |
| B. Versioned relational text + generated SQLite | Strong in CI and build | Excellent row diffs and reproducible queries | CSV/JSON/SQL or generated workbook view | Git branch workflow | Good for this project | Replace XLSX extraction with schema/import/migrations; keep JSON and HTML output | **Recommended target** |
| C. SQLite master + local admin editor | Strong at write time | Good with migration/change-log exports; poor if only the binary DB is committed | Best local guided editing | One writer at a time in practice | High for local project data | Add a small editor and transaction layer; export the existing runtime snapshot | Good if non-technical direct editing is frequent |
| D. PostgreSQL + API + snapshot exporter | Strong | Strong database auditability; Git review requires migrations/exports | Guided web/admin UI | Strong multi-user support | High | Add server, authentication, backups, API and deployment; preserve offline HTML through exports | Only when live collaboration requires it |
| E. Parquet + DuckDB analytical sidecar | Strong analytical typing; not the primary workflow DB | Good queryability, weak manual editing | Import-oriented | Analytical rather than transactional | Very high for observations | Split large test results from catalogue data and join them during analysis/export | Future supplement, not canonical catalogue |

### Option A — Harden Excel without changing the platform

Architecture:

```text
XLSX tables -> schema-aware extractor -> existing semantic compiler/validator -> JSON -> offline HTML
```

This is the smallest migration. Replace list-valued cells with dedicated relation sheets, add Excel data validation for controlled vocabularies, use structured table references instead of fixed row bounds, generate all calculated columns the same way, and add a machine-readable schema manifest checked before extraction.

It lowers accidental entry errors and removes several special cases. It does not solve binary diffs, merge conflicts, one-file locking, one-off XML migrations or the weak separation between raw, canonical and derived data. It is reasonable as a bridge while a relational replacement is proven.

### Option B — Versioned relational text compiled through SQLite

Architecture:

```text
source manifest + raw captures
             |
source-specific import adapters
             v
typed staging rows + normalization findings
             |
reviewed CSV/JSON row changes + ordered SQL migrations
             v
generated SQLite STRICT database
  constraints + indexes + views + integrity checks
             |
existing domain compiler/validator + JSON Schema
             v
db.json + reference.json -> existing standalone HTML
```

The Git-reviewed source is normalized text plus schema/migrations. CI creates the SQLite file from zero and does not treat a committed binary database as the only source of truth. SQLite provides relational queries and constraints during the build, while text files preserve readable pull-request diffs. The workbook can remain a generated review/export artifact for engineers who prefer tables.

This option fixes the current weaknesses with the least product disruption. The browser, selection engine, interface and deployment model remain unchanged. The main change is inside the data layer and build.

### Option C — SQLite as the editable master

Architecture:

```text
local forms/imports -> SQLite transactions -> audit log -> snapshot exporter -> JSON -> offline HTML
```

This gives editors immediate constraint feedback and makes multi-table changes atomic. It needs a thin local editor or disciplined SQL tooling. A raw `.sqlite` file alone would recreate the binary-diff problem, so every accepted transaction should emit a reviewable change set or canonical text export, and schema changes still need ordered migrations.

Choose this over Option B when guided local editing is frequent and Git-native CSV/JSON edits are too awkward. It is still a local, low-operations architecture.

### Option D — PostgreSQL service

Architecture:

```text
admin UI/import workers -> PostgreSQL -> API/query service
                                    -> signed/static release snapshot -> offline HTML
```

PostgreSQL is appropriate when several people must edit simultaneously, approvals and roles are required, inventory changes continuously, or other systems need an API. PostgreSQL supports rich constraints and multiversion concurrency control, so readers and writers can work against consistent transaction snapshots; see its official [constraint](https://www.postgresql.org/docs/current/ddl-constraints.html) and [MVCC](https://www.postgresql.org/docs/current/mvcc-intro.html) documentation.

It materially changes operations: a server, authentication, authorization, backups, monitoring, migrations and an API become product responsibilities. The current offline HTML should still consume a signed/versioned export rather than become dependent on a live server.

### Option E — DuckDB and Parquet for large research data

Use this only if measurement volume becomes many orders of magnitude larger or the product begins querying specimen histories, curves or batch results interactively. Keep catalogue identity, source, grade, workflow and editorial records in SQLite or PostgreSQL. Store large immutable analytical observations in partitioned Parquet and query them with DuckDB during research or snapshot compilation.

DuckDB/Parquet does not solve the present editing and relationship-governance problem by itself, and DuckDB-Wasm would make the single-file application more complex. It is an analytical layer, not the first migration.

## Recommended target design

Use **Option B**: versioned relational text and ordered migrations compiled into a SQLite validation/query database, followed by the existing semantic compiler and offline JSON bundle. Keep Option A only as a short dual-run bridge. Add a local editor later if direct table editing becomes a real barrier.

### Canonical schema boundaries

| Area | Recommended representation | Important constraints |
|---|---|---|
| `materials` | One row per selection identity | Unique stable ID; controlled family/base/modifier/role; representative grade relationship checked for ownership |
| `grades` | One row per exact commercial or study grade | FK to material and source; explicit `procurement`, `study` or `retired` role replaces `GradeIDs` lists |
| `property_definitions` | Property, canonical unit, comparability dimensions | Unique key; allowed units; direction/load requirements; conversion-rule reference |
| `measurements` | Raw observation and reviewed canonical interpretation | FKs to material, grade, property and source; raw text retained; typed value/bounds; explicit missing/qualitative/quarantined state |
| `material_headlines` | Editorial selection of one measurement for one headline key | Unique material + headline key; FK to measurement; no copied numeric value |
| `profiles` | Structured temperatures, guidance states and raw source text | FKs to material/grade/source; typed intervals; raw text retained for audit |
| `evidence` | One finding per source/grade/topic/condition | Controlled topic/category/verdict; raw finding and locator retained |
| `prices` | One market observation per date/SKU | Typed currency/mass/price/stock; explicit sample and quarantine flags |
| `sources` and `source_artifacts` | Bibliographic record plus retrieved artifact metadata | SHA-256, access state, revision/date and locator; source-to-grade scope in a link table |
| `coverage_notes` | Authored unresolved question or caveat | No duplicated status that can be calculated from owned records |
| `method_versions` | Versioned human-readable rule set and structured release settings | Snapshot, H2C limits, schema version and rule-set version are explicit |
| Link tables | Only genuinely editorial many-to-many choices | Composite primary keys and foreign keys; no delimited ID cells |
| Views | Material summary, evidence coverage, price median, print summary | Derived from canonical facts; never edited directly |

### One fact, one owner

The target should remove the main duplication points:

- `material_headlines.measurement_id` owns headline selection; the headline number comes from the measurement;
- `grades.role` and `grades.status` determine procurement membership and retirement;
- environment coverage comes from owned evidence plus category definitions;
- price headlines come from marked sample observations and a versioned median rule;
- normalized measurement values come from one versioned transformation, with raw values retained;
- summary JSON is generated from views and never edited.

### Source-to-release pipeline

1. **Acquire:** register the source URL/file, revision, access date, SHA-256 and retrieval status.
2. **Stage:** source-specific adapters retain the exact raw strings and locators. Parser output includes the parser/rule version and any ambiguity.
3. **Review and promote:** only reviewed staging rows enter canonical tables, in one transaction or one reviewable data patch.
4. **Enforce structural integrity:** run SQLite with foreign keys on, `STRICT` tables, `CHECK` constraints, uniqueness rules and indexes on child keys.
5. **Derive:** build views for headlines, material summaries, coverage, price medians and profile aggregates. Do not store deterministic lists or copied values.
6. **Run semantic validation:** retain the current JavaScript checks for representative-grade ownership, measurement comparability, uncertainty, missing states and what evidence may decide.
7. **Validate the contract:** validate exported `db.json` and `reference.json` against versioned JSON Schemas.
8. **Release:** emit a manifest containing snapshot date, Git commit, schema version, rule-set version, source-data hash, exporter version and output hashes; then bundle the unchanged offline HTML.

### Effect on the current repository

| Current component | Target role | Effect |
|---|---|---|
| `data/H2C_FDM_Material_Database.xlsx` | Generated review/export workbook during transition | Stops being the only authoritative binary after parity is proven |
| `build/src/extract.js` | Legacy import adapter, then retired from normal builds | Sheet positions and expected row-count constants disappear from the release path |
| `build/src/normalize/*` | Reusable raw-to-staging transformations | Parsers remain for source ingestion; reviewed canonical rows are already typed |
| `build/src/compile.js` | Thin canonical-query-to-runtime exporter | SQL views remove repeated scans and copied summary logic; domain-specific assembly remains |
| `build/src/validate.js` | Semantic validator above DB constraints | Smaller focus: engineering meanings that SQL cannot express clearly |
| `build/mappings/*.json` | Versioned controlled vocabularies/rules | Validated against schema and referenced by key from canonical rows |
| `scripts/workbook_xml.py` and audit apply scripts | Legacy migration evidence | No longer needed for ordinary database changes after cutover |
| `scripts/audit-data.mjs` | Query-based audit and release parity tool | Produces row/relationship inventories directly from canonical tables |
| `dist/db.json`, `reference.json`, HTML | Same public runtime contract | No application or hosting migration required |
| Selection engine and UI | Unchanged initially | Data migration cannot silently alter decision semantics |

## Migration sequence and cutover gates

### Phase 1 — Declare the contract

- Define SQL DDL, controlled vocabularies and JSON Schemas from the current nine sheets and compiled objects.
- Decide which fields are raw facts, reviewed canonical values, editorial selections or derived views.
- Create stable mappings from every workbook row to its target table and key.
- Make the release manifest reproducible.

**Gate:** every current column is classified; no field disappears without an explicit disposition and owner.

### Phase 2 — Import the current snapshot without changing behavior

- Build a one-time, read-only XLSX importer into staging tables.
- Promote the current snapshot into the relational schema.
- Replace delimited links with rows and remove deterministic duplication in the generated model.
- Export the current runtime JSON through the new path.

**Gate:** identical entity IDs and record counts; zero foreign-key, uniqueness, type or check violations; every source locator and SHA-256 preserved.

### Phase 3 — Dual-run both pipelines

- Run the XLSX and SQLite paths in CI.
- Compare canonical records field by field and compare compiled runtime JSON after excluding deliberately replaced build metadata and ordering.
- Run all 112 existing tests and the current source-to-HTML payload audit against both outputs.
- Investigate every difference; do not normalize differences away with a broad allowlist.

**Gate:** two consecutive accepted data changes produce explained zero-semantic-difference releases. All existing tests pass on the new export.

### Phase 4 — Switch authority

- Make schema/migrations and relational text data the release inputs.
- Generate the workbook as a human review artifact if it remains useful.
- Keep the legacy importer for one rollback window, then remove it from normal CI.
- Require every data change to include a row-level diff, source/provenance update and applicable validation result.

**Gate:** a new grade, measurement, source and retirement can each be added without editing expected row counts, formula ranges, workbook XML or copied evidence lists.

### Phase 5 — Add infrastructure only when justified

- Add a local SQLite editor if direct text/SQL editing is slowing work.
- Move the same schema to PostgreSQL when simultaneous editing, roles, approvals, live inventory or API consumers become actual requirements.
- Add Parquet/DuckDB only for large analytical observations that should not inflate the selection snapshot.

## Acceptance criteria for the resulting platform

The migration is complete only when all of the following are true:

1. Every canonical record has a stable key and every relationship is a constrained column or link-table row.
2. No authoritative cell or field contains a delimited list of IDs.
3. No derived numeric headline, median, coverage status or relationship list is manually duplicated.
4. Invalid types, IDs, ownership and controlled values fail before a release artifact is produced.
5. Raw source text, exact grade, source ID, locator, artifact hash and normalization-rule version can be retrieved for every promoted observation.
6. A reviewer can understand a data change from the Git diff or database change set without opening a binary workbook.
7. The database can be rebuilt from zero using only versioned inputs and produces a release manifest tied to the exact commit and input hashes.
8. The current semantic validator, raw reconciliation, 112 tests and HTML parity checks all pass.
9. The generated runtime preserves explicit missing, qualitative, quarantined, retired, measured, related and estimated states.
10. The offline application remains a self-contained static artifact with no required server or network call.

## Reproduction notes

All inspection for this report was read-only. No build command was run because the normal build writes `dist/` and `build/reports/`; the existing committed report and a direct in-memory call to the production extractor/compiler/validator were used instead.

| Evidence | Reproduction method |
|---|---|
| Baseline and binary Git history | `git rev-parse HEAD`; `git log --numstat -- data/H2C_FDM_Material_Database.xlsx` |
| Record counts and headers | Read the nine tables with the same SheetJS dependency and header offsets as `build/src/extract.js` |
| Formula/constant split | Read workbook cells with `cellFormula: true`; count `cell.f` by sheet and target column |
| No Excel validation rules | Inspect `xl/worksheets/sheet*.xml` in the XLSX ZIP for `dataValidation` elements |
| Delimited relationships | Parse the nine Materials relationship columns with the compiler's `/[;,]/` delimiter and parse grade IDs from `Sources.Applicable grades` |
| File and compressed sizes | `wc -c` on workbook/JSON/HTML; `gzip -c -9 dist/db.json | wc -c` |
| Current test count | Count top-level `test(` declarations in `test/*.test.js`; total 112 |
| In-memory timing | Import `extractWorkbook`, `compile` and `validate`, execute them without `index.js`, and measure with `performance.now()` |

The in-memory run returned 0 errors and the same 4 evidence warnings recorded in the committed validation report. Before any later migration work, rerun these checks against the then-current commit rather than treating these measurements as permanent constants.

## Recommendation

Begin with a schema-and-import proof of Option B, using the current validated workbook and audit artifacts as the oracle. Do not redesign the application or change engineering decision rules during the storage migration. Preserve the runtime JSON shape first; simplify it only in a separate, measured change after the new source path is stable.

The most valuable first milestone is a generated SQLite database that contains every current row, enforces all direct relationships, exports an equivalent `db.json`, and can be rebuilt from reviewable text inputs. Once that parity is demonstrated, make the workbook a generated reviewer view rather than the database itself.

That target addresses the actual weakness while retaining what already works: exact-grade provenance, explicit uncertainty, strong semantic validation, a deterministic release gate and a compact offline application.
