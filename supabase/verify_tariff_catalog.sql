-- TradeLogic production tariff catalog verification
-- Safe to run in the Supabase SQL editor after the controlled FA/NICO import.
-- Expected source: data/tariff-sources/2026/LIGIE-NICO-2026-04-24.json

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

rollback;