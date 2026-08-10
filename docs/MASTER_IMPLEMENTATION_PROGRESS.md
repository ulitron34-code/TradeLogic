# Master plan progress

## First milestone: tariff catalog

- The versioned TariffCode contract now accepts legal metadata, source URL, rate metadata, and effective dates.
- Catalog validation rejects malformed codes, malformed NICO values, missing source versions, duplicate effective records, invalid dates, and overlapping validity windows.
- A dependency-free CSV adapter now accepts the common Spanish LIGIE/NICO column names and preserves non-percentage rate text instead of coercing it to a false percentage.
- Idempotent persistence updates an existing effective version and creates a new version when the effective date changes.
- Tests pass for validation, persistence behavior, deterministic ranking, and landed cost.
- Remaining requirement: load an official LIGIE/NICO dataset and add representative coverage fixtures. No regulatory rate or note is inferred.
