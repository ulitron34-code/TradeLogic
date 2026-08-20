import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluateImmexSensitivity,
  type ImmexSensitivityRecord,
  type ImmexSensitivityResult,
  type ImmexSector,
} from '@platform/domain';

let cachedImmexCatalog: ImmexSensitivityRecord[] | null = null;

export function loadImmexSensitivityCatalog(csvPath?: string): ImmexSensitivityRecord[] {
  if (cachedImmexCatalog) return cachedImmexCatalog;

  const defaultPath = resolve(process.cwd(), 'corpus/immex/mercancias_sensibles_anexo2.csv');
  const targetPath = csvPath || defaultPath;

  if (!existsSync(targetPath)) {
    return [];
  }

  const content = readFileSync(targetPath, 'utf-8');
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const records: ImmexSensitivityRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = parseCsvLine(line);
    if (cols.length >= 6) {
      const tariffCode = cols[0];
      const sector = cols[2];
      const description = cols[3];
      if (!tariffCode || !sector || !description) continue;

      const nico = cols[1];
      records.push({
        tariffCode,
        ...(nico ? { nico } : {}),
        sector: sector as ImmexSector,
        description,
        maxMonthsPeriod: parseInt(cols[4] ?? '', 10) || 18,
        requiresSpecialAuthorization: cols[5]?.toLowerCase() === 'true' || cols[5] === '1',
        controlMechanism: cols[6] || '',
      });
    }
  }

  cachedImmexCatalog = records;
  return cachedImmexCatalog;
}

export function checkImmexCompliance(tariffCode: string, csvPath?: string): ImmexSensitivityResult {
  const catalog = loadImmexSensitivityCatalog(csvPath);
  return evaluateImmexSensitivity(tariffCode, catalog);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}
