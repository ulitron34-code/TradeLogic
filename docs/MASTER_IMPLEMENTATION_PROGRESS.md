# Master plan progress

## First milestone: tariff catalog

- The versioned TariffCode contract now accepts legal metadata, source URL, rate metadata, and effective dates.
- Catalog validation rejects malformed codes, malformed NICO values, missing source versions, duplicate effective records, invalid dates, and overlapping validity windows.
- A dependency-free CSV adapter now accepts the common Spanish LIGIE/NICO column names and preserves non-percentage rate text instead of coercing it to a false percentage.
- Idempotent persistence updates an existing effective version and creates a new version when the effective date changes.
- Tests pass for validation, persistence behavior, deterministic ranking, and landed cost.
- Remaining requirement: load an official LIGIE/NICO dataset and add representative coverage fixtures. No regulatory rate or note is inferred.
- An official SNICE April 2026 modification workbook was downloaded, hashed, extracted to 185 normalized CSV rows, and accepted by the TypeScript validator. It remains marked as `downloaded_not_loaded` because it is a modification set, not the complete base catalog.

## Review control

- Approval now requires both a ranked tariff candidate and documentary evidence linked to the classification case.
- The API review fixture covers the evidence requirement. Full execution from this clone is currently limited by incomplete local pnpm dependency links (`fastify` is not resolvable here); this is an environment limitation, not a passed assertion result.

## Regulatory requirements foundation

- Added a versioned `RegulatoryRequirement` relation to tariff codes with authority, requirement type, source URL, source version, effective dates, mandatory flag, and notes.
- Added validation, effective-window logic, idempotent persistence, migration, and tests.
- No NOM, permit, or authority requirement is populated without an authoritative source; the catalog remains explicitly pending source-backed loading.
