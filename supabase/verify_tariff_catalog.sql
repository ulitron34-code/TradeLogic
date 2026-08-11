-- TradeLogic production tariff catalog verification
-- Safe to run in the Supabase SQL editor after the controlled FA/NICO import.
-- Expected source: data/tariff-sources/2026/LIGIE-NICO-2026-04-24.json
-- Copy the final tariff_catalog_verification_json result into artifacts/tariff-catalog-verification.json.

begin;

-- 1. Expected imported row count for the controlled derived catalog.
select
  'expected_rows' as check_name,
  count(*) as actual_rows,
  20227 as expected_rows,
  case when count(*) = 20227 then 'ok' else 'fail' end as status
from "TariffCode"
where "sourceVersion" in ('SNICE-LIGIE-BASE-2021-11-19', 'SNICE-TIGIE-MOD-ABRIL-2026');

-- 2. Source version distribution should match the manifest-derived catalog.
select
  "sourceVersion",
  count(*) as rows
from "TariffCode"
where "sourceVersion" in ('SNICE-LIGIE-BASE-2021-11-19', 'SNICE-TIGIE-MOD-ABRIL-2026')
group by "sourceVersion"
order by "sourceVersion";

-- 3. Natural-key duplicates would make the catalog ambiguous.
select
  'duplicate_natural_keys' as check_name,
  count(*) as duplicate_groups,
  case when count(*) = 0 then 'ok' else 'fail' end as status
from (
  select "countryCode", code, coalesce(nico, '') as nico_key, "validFrom", count(*)
  from "TariffCode"
  where "sourceVersion" in ('SNICE-LIGIE-BASE-2021-11-19', 'SNICE-TIGIE-MOD-ABRIL-2026')
  group by "countryCode", code, coalesce(nico, ''), "validFrom"
  having count(*) > 1
) duplicates;

-- 4. NICO values must be exactly two digits when present.
select
  'invalid_nico' as check_name,
  count(*) as invalid_rows,
  case when count(*) = 0 then 'ok' else 'fail' end as status
from "TariffCode"
where "sourceVersion" in ('SNICE-LIGIE-BASE-2021-11-19', 'SNICE-TIGIE-MOD-ABRIL-2026')
  and nico is not null
  and nico !~ '^[0-9]{2}$';

-- 5. Percentage rates should stay in a sane range; non-percent rates are stored in rateUnit/exportRateUnit text.
select
  'invalid_percentage_rates' as check_name,
  count(*) as invalid_rows,
  case when count(*) = 0 then 'ok' else 'fail' end as status
from "TariffCode"
where "sourceVersion" in ('SNICE-LIGIE-BASE-2021-11-19', 'SNICE-TIGIE-MOD-ABRIL-2026')
  and (
    ("generalRate" is not null and ("generalRate" < 0 or "generalRate" > 100))
    or ("exportRate" is not null and ("exportRate" < 0 or "exportRate" > 100))
  );

-- 6. Machine-readable evidence. Copy this single JSON value into artifacts/tariff-catalog-verification.json.
with catalog_rows as (
  select *
  from "TariffCode"
  where "sourceVersion" in ('SNICE-LIGIE-BASE-2021-11-19', 'SNICE-TIGIE-MOD-ABRIL-2026')
), row_count as (
  select count(*)::int as rows from catalog_rows
), source_distribution as (
  select coalesce(jsonb_object_agg("sourceVersion", rows order by "sourceVersion"), '{}'::jsonb) as source_versions
  from (
    select "sourceVersion", count(*)::int as rows
    from catalog_rows
    group by "sourceVersion"
  ) grouped
), duplicate_groups as (
  select count(*)::int as duplicate_groups
  from (
    select "countryCode", code, coalesce(nico, '') as nico_key, "validFrom", count(*)
    from catalog_rows
    group by "countryCode", code, coalesce(nico, ''), "validFrom"
    having count(*) > 1
  ) duplicates
), invalid_nico as (
  select count(*)::int as invalid_rows
  from catalog_rows
  where nico is not null
    and nico !~ '^[0-9]{2}$'
), invalid_percentage_rates as (
  select count(*)::int as invalid_rows
  from catalog_rows
  where ("generalRate" is not null and ("generalRate" < 0 or "generalRate" > 100))
    or ("exportRate" is not null and ("exportRate" < 0 or "exportRate" > 100))
), summary as (
  select
    row_count.rows,
    source_distribution.source_versions,
    duplicate_groups.duplicate_groups,
    invalid_nico.invalid_rows as invalid_nico_rows,
    invalid_percentage_rates.invalid_rows as invalid_percentage_rate_rows
  from row_count
  cross join source_distribution
  cross join duplicate_groups
  cross join invalid_nico
  cross join invalid_percentage_rates
)
select jsonb_pretty(
  jsonb_build_object(
    'status', case
      when rows = 20227
        and duplicate_groups = 0
        and invalid_nico_rows = 0
        and invalid_percentage_rate_rows = 0
      then 'ok'
      else 'fail'
    end,
    'checkedAt', now(),
    'expectedRows', 20227,
    'rows', rows,
    'sourceVersions', source_versions,
    'checks', jsonb_build_array(
      jsonb_build_object('name', 'expected_rows', 'expectedRows', 20227, 'actualRows', rows, 'status', case when rows = 20227 then 'ok' else 'fail' end),
      jsonb_build_object('name', 'duplicate_natural_keys', 'duplicateGroups', duplicate_groups, 'status', case when duplicate_groups = 0 then 'ok' else 'fail' end),
      jsonb_build_object('name', 'invalid_nico', 'invalidRows', invalid_nico_rows, 'status', case when invalid_nico_rows = 0 then 'ok' else 'fail' end),
      jsonb_build_object('name', 'invalid_percentage_rates', 'invalidRows', invalid_percentage_rate_rows, 'status', case when invalid_percentage_rate_rows = 0 then 'ok' else 'fail' end)
    )
  )
) as tariff_catalog_verification_json
from summary;

rollback;
