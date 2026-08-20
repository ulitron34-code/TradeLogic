// Motor de Criterios de Clasificacion Arancelaria del Anexo 6 de las RGCE (SAT)

export type Anexo6CriterionRecord = {
  criterioId: string;
  tariffCode: string;
  nico?: string | undefined;
  rubro: string;
  criterioTexto: string;
  publicacionDof: string;
  vigente: boolean;
};

export type Anexo6MatchResult = {
  hasBindingCriterion: boolean;
  criteria: Anexo6CriterionRecord[];
  matchingReason: string;
};

export function parseAnexo6CatalogCsv(csvContent: string): Anexo6CriterionRecord[] {
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const records: Anexo6CriterionRecord[] = [];
  // Primera linea son headers
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = parseCsvLine(line);
    if (cols.length >= 6) {
      const criterioId = cols[0] ?? '';
      const tariffCode = cols[1] ?? '';
      const nico = cols[2] ? cols[2] : undefined;
      const rubro = cols[3] ?? '';
      const criterioTexto = cols[4] ?? '';
      const publicacionDof = cols[5] ?? '';
      const vigenteStr = cols[6] ?? '';
      const vigente = vigenteStr.toLowerCase() === 'true' || vigenteStr === '1';

      if (criterioId && tariffCode) {
        records.push({
          criterioId,
          tariffCode,
          ...(nico ? { nico } : {}),
          rubro,
          criterioTexto,
          publicacionDof,
          vigente,
        });
      }
    }
  }
  return records;
}

export function matchAnexo6Criteria(
  tariffCode: string,
  productDescription: string,
  catalog: Anexo6CriterionRecord[]
): Anexo6MatchResult {
  const normalizedTariff = tariffCode.replace(/\D/g, '');
  const productWords = tokenize(productDescription);

  const matched = catalog.filter((crit) => {
    if (!crit.vigente) return false;
    const critTariff = crit.tariffCode.replace(/\D/g, '');
    const tariffMatch = critTariff.startsWith(normalizedTariff.slice(0, 4)) || normalizedTariff.startsWith(critTariff.slice(0, 4));
    if (!tariffMatch) return false;

    const critWords = tokenize(`${crit.rubro} ${crit.criterioTexto}`);
    const overlap = critWords.filter((w) => productWords.includes(w));
    return overlap.length >= 1;
  });

  if (matched.length > 0) {
    return {
      hasBindingCriterion: true,
      criteria: matched,
      matchingReason: `Se localizaron ${matched.length} criterio(s) vinculante(s) del SAT en el Anexo 6 de las RGCE aplicables a la partida/fracción.`,
    };
  }

  return {
    hasBindingCriterion: false,
    criteria: [],
    matchingReason: 'No se identificaron criterios específicos de clasificación del Anexo 6 RGCE para esta mercancía.',
  };
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

function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 4);
}
