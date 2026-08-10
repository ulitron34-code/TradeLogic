import { readFile } from 'node:fs/promises';
import { parseTariffCatalogCsv, validateTariffCatalog } from '@platform/domain';

type Options = {
  input: string;
  sourceVersion: string;
  sourceUrl: string;
  validFrom?: string;
  expectedRecords?: number;
  apply: boolean;
};

function parsePositiveInteger(name: string, value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function optionsFromArgs(args: string[]): Options {
  const values = new Map<string, string>();
  let apply = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === '--apply') {
      apply = true;
      continue;
    }
    if (!argument.startsWith('--')) continue;
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
    values.set(argument.slice(2), value);
    index += 1;
  }

  const input = values.get('input');
  const sourceVersion = values.get('source-version');
  const sourceUrl = values.get('source-url');
  if (!input || !sourceVersion || !sourceUrl) {
    throw new Error('--input, --source-version and --source-url are required');
  }
  const validFrom = values.get('valid-from');
  const expectedRecordsValue = values.get('expected-records');
  const expectedRecords = expectedRecordsValue ? parsePositiveInteger('--expected-records', expectedRecordsValue) : undefined;

  return {
    input,
    sourceVersion,
    sourceUrl,
    ...(validFrom ? { validFrom } : {}),
    ...(expectedRecords ? { expectedRecords } : {}),
    apply,
  };
}

function assertExpectedRecordCount(records: number, expectedRecords?: number): void {
  if (expectedRecords === undefined) return;
  if (records !== expectedRecords) {
    throw new Error(`Expected ${expectedRecords} validated records, got ${records}. Refusing to continue.`);
  }
}

async function main() {
  const options = optionsFromArgs(process.argv.slice(2));
  const csv = await readFile(options.input, 'utf8');
  const parsed = parseTariffCatalogCsv(csv, {
    sourceVersion: options.sourceVersion,
    sourceUrl: options.sourceUrl,
    ...(options.validFrom ? { defaultValidFrom: options.validFrom } : {}),
  });
  const validation = validateTariffCatalog(parsed);
  if (validation.errors.length > 0) {
    throw new Error(`Catalog validation failed:\n${validation.errors.join('\n')}`);
  }

  const records = validation.records.map(record => ({ ...record }));
  assertExpectedRecordCount(records.length, options.expectedRecords);

  console.log(
    JSON.stringify({
      mode: options.apply ? 'apply' : 'dry-run',
      records: records.length,
      expectedRecords: options.expectedRecords ?? null,
      sourceVersion: options.sourceVersion,
      input: options.input,
    }),
  );

  if (!options.apply) {
    console.log(JSON.stringify({ status: 'dry-run-ok', next: 'Re-run with --apply only from the controlled target environment.' }));
    return;
  }

  const { db, upsertTariffCatalog } = await import('@platform/db');
  try {
    const result = await upsertTariffCatalog(db, records);
    console.log(JSON.stringify({ status: 'applied', ...result }));
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
