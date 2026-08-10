# Master plan progress

## First milestone: tariff catalog

- The versioned TariffCode contract now accepts legal metadata, source URL, rate metadata, and effective dates.
- Catalog validation rejects malformed codes, malformed NICO values, missing source versions, duplicate effective records, invalid dates, and overlapping validity windows.
- A dependency-free CSV adapter now accepts the common Spanish LIGIE/NICO column names and preserves non-percentage rate text instead of coercing it to a false percentage.
- Idempotent persistence updates an existing effective version and creates a new version when the effective date changes.
- Tests pass for validation, persistence behavior, deterministic ranking, and landed cost.
- Loaded the official SNICE FA/NICO workbook published in April 2026 and merged its 8,183 fracciones, 11,507 NICO records, and 185 April 2026 tariff modifications into a 20,227-row versioned CSV. IGI and IGE preserve numeric percentages and non-percentage text such as `Ex.` and `Prohibida`; affected base rows close on 2026-04-24.
- Added a manifest with SHA-256 fingerprints for the official workbook, modification input, and derived catalog. The derived catalog is validated by an automated domain test and is ready for controlled database import.

## Review control

- Approval now requires both a ranked tariff candidate and documentary evidence linked to the classification case.
- The API review fixture covers the evidence requirement, including organization scoping and documentary-evidence enforcement.

## Regulatory requirements foundation

- Added a versioned `RegulatoryRequirement` relation to tariff codes with authority, requirement type, source URL, source version, effective dates, mandatory flag, and notes.
- Added validation, effective-window logic, idempotent persistence, migration, and tests.
- No NOM, permit, or authority requirement is populated without an authoritative source; tariff nomenclature/rates are now source-backed, while regulatory requirement catalogs remain pending source-backed loading.
- Case detail now requests only currently effective requirements and displays authority, type, source version, mandatory status, and source link beside each tariff candidate.

## Jurisprudence foundation

- Added a versioned `JurisprudenceCase` store with IUS uniqueness, source URL, tariff-fraction references, and optional pgvector embedding.
- Added an SCJN/SJF client with deterministic search payloads, HTML-to-text normalization, and detail retrieval.
- Added idempotent worker ingestion for tariff/legal seed queries and optional `text-embedding-3-small` vectors; embeddings never block ingestion when the provider is unavailable.
- Added pgvector cosine-similarity retrieval primitives for future case-level recommendations.
- Added the recurring `jurisprudence-ingestion` worker queue and its configurable cron schedule.
- The migration and source package are present locally; publication and database execution remain pending until the GitHub/Vercel path and Supabase migration runner are available.

## Risk and origin foundation

- Added a deterministic, explainable legal-risk indicator with factor-level points, ruleset version, human-review gate, and non-legal-advice disclaimer.
- Added a source-backed T-MEC origin-rule contract supporting tariff shift, regional value content, and required-process rules.
- Origin evaluation preserves source URL/version, distinguishes `ELIGIBLE`, `NOT_ELIGIBLE`, and `NEEDS_REVIEW`, and never treats missing evidence as proven eligibility.
- These are calculation foundations only; production use still requires loading official agreement rules and professional validation.
- Case detail API now returns the explainable risk assessment and the web case screen displays score, band, factors, and the disclaimer.

## Expediente PDF

- Added a deterministic PDF renderer that includes the case snapshot, product, ranked candidates, normative sources, regulatory requirements, evidence filenames and SHA-256 hashes, risk factors, reviews, ruleset version, and disclaimer.
- Added a protected organization-scoped API download route at `/api/v1/classification-cases/:caseId/dossier.pdf`.
- The renderer is dependency-free and covered by domain tests; production render/download still requires the API and migration deployment path to be verified remotely.
- The case UI now exposes a protected download button that obtains the Supabase session token and downloads the generated PDF.

## Auditoría histórica

- Added a CSV parser for historical declarations with tariff-code normalization, money validation, and required-column checks.
- Added comparison against explicitly sourced/versioned rates; it reports potential overpayment, potential underpayment, no difference, or review required when no rate is available.
- Added idempotent run/declaration persistence and migration with source fingerprint, summary, row number, and result provenance.
- The database schema now includes unit of measure, IGI, IGE, and rate-unit metadata; production import still requires migration deployment and a controlled pilot dataset.
- Added `POST /api/v1/historical-audits`, which verifies the CSV fingerprint, reads only current `PERCENT` rates from the organization-scoped catalog, persists the run, and returns row-level findings.
- Added `/audits` to the web navigation with a guided CSV upload, client-side SHA-256 calculation, summary counters, and row-level results.

## Validation gate

- The full monorepo build passes for all 11 packages, including API, web, worker, database, jurisprudence, and the new audit workflow.
- The full Turbo test task passes: 19 tasks and 94 assertions across API, domain, database, AI, regulatory, jurisprudence, and worker packages.
- The full monorepo typecheck passes for all 11 packages.
- The isolated pnpm installation now reproduces cleanly from the frozen lockfile after moving only stale generated dependency folders out of the way.
- Worker tests now cover pgvector query parameterization, idempotent jurisprudence ingestion, and the optional embedding path without Redis or network calls.
- Worker tests now also cover regulatory ingestion filtering with accent/case normalization, raw-source persistence, provision creation, impact/alert generation, and content-hash deduplication.
- The new jurisprudence package is included in the workspace lockfile and is covered by the passing full build, typecheck, and test gates.
