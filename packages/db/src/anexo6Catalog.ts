import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseAnexo6CatalogCsv,
  matchAnexo6Criteria,
  type Anexo6CriterionRecord,
  type Anexo6MatchResult,
} from '@platform/domain';

let cachedAnexo6Catalog: Anexo6CriterionRecord[] | null = null;

export function loadAnexo6Catalog(csvPath?: string): Anexo6CriterionRecord[] {
  if (cachedAnexo6Catalog) return cachedAnexo6Catalog;

  const defaultPath = resolve(process.cwd(), 'corpus/anexo6/criterios_clasificacion_rgce.csv');
  const targetPath = csvPath || defaultPath;

  if (!existsSync(targetPath)) {
    return [];
  }

  const content = readFileSync(targetPath, 'utf-8');
  cachedAnexo6Catalog = parseAnexo6CatalogCsv(content);
  return cachedAnexo6Catalog;
}

export function findAnexo6BindingCriteria(
  tariffCode: string,
  productDescription: string,
  csvPath?: string
): Anexo6MatchResult {
  const catalog = loadAnexo6Catalog(csvPath);
  return matchAnexo6Criteria(tariffCode, productDescription, catalog);
}
