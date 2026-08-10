import { readFile } from 'node:fs/promises';
import { parseTariffCatalogCsv, validateTariffCatalog } from '@platform/domain';
import { db, upsertTariffCatalog } from '@platform/db';

type Options = {
  input: string;
  sourceVersion: string;
  sourceUrl: string;
  validFrom?: string;
  apply: boolean;
};

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
  return { input, sourceVersion, sourceUrl, ...(validFrom ? { validFrom } : {}), apply };
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

  const records = validation.records.map(record => ({
    ...record,
    generalRate: record.generalRate,
  }));
  console.log(JSON.stringify({ mode: options.apply ? 'apply' : 'dry-run', records: records.length, sourceVersion: options.sourceVersion }));

  if (!options.apply) return;
  const result = await upsertTariffCatalog(db, records);
  console.log(JSON.stringify(result));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
