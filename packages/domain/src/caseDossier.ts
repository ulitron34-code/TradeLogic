export type DossierCandidate = {
  rank: number;
  code: string;
  nico?: string | null;
  description: string;
  score: number;
  sourceVersion: string;
  sourceUrl?: string | null;
  regulatoryRequirements?: Array<{ title: string; authority: string; sourceVersion: string; sourceUrl: string; mandatory: boolean }>;
};

export type CaseDossierInput = {
  id: string;
  status: string;
  generatedAt: string;
  product: { name: string; sku?: string | null; description?: string | null };
  candidates: DossierCandidate[];
  evidence: Array<{ filename: string; sha256: string; claimType: string }>;
  reviews: Array<{ decision: string; notes?: string | null; createdAt: string }>;
  jurisprudence?: Array<{ ius: number; claveTesis: string; rubro: string; fuente?: string | null; sourceUrl: string; relevance: string }>;
  riskAssessment?: { score: number; band: string; rulesetVersion: string; factors: Array<{ label: string; points: number; explanation: string }> };
  disclaimer: string;
};

export const DOSSIER_RULESET_VERSION = 'mx-tradelogic-dossier-2026.1';

export function buildCaseDossierLines(input: CaseDossierInput): string[] {
  const lines = [
    'TradeLogic - Expediente de clasificacion arancelaria',
    `Version del expediente: ${DOSSIER_RULESET_VERSION}`,
    `Generado: ${input.generatedAt}`,
    `Caso: ${input.id}`,
    `Estado: ${input.status}`,
    '',
    `Producto: ${input.product.name}${input.product.sku ? ` | SKU: ${input.product.sku}` : ''}`,
    ...(input.product.description ? [`Descripcion: ${input.product.description}`] : []),
    '',
    'CANDIDATOS Y FUNDAMENTO',
  ];
  for (const candidate of input.candidates) {
    lines.push(`#${candidate.rank} ${candidate.code}${candidate.nico ? `/${candidate.nico}` : ''} | ${candidate.score} puntos`);
    lines.push(`Descripcion: ${candidate.description}`);
    lines.push(`Fuente: ${candidate.sourceVersion}${candidate.sourceUrl ? ` | ${candidate.sourceUrl}` : ''}`);
    for (const requirement of candidate.regulatoryRequirements ?? []) {
      lines.push(`Requisito ${requirement.mandatory ? 'obligatorio' : 'condicionado'}: ${requirement.title} (${requirement.authority}) | ${requirement.sourceVersion} | ${requirement.sourceUrl}`);
    }
  }
  lines.push('', 'EVIDENCIA DOCUMENTAL');
  for (const evidence of input.evidence) lines.push(`${evidence.filename} | ${evidence.claimType} | SHA-256: ${evidence.sha256}`);
  lines.push('', 'JURISPRUDENCIA RELACIONADA');
  if (input.jurisprudence?.length) {
    for (const precedent of input.jurisprudence) {
      lines.push(`IUS ${precedent.ius} | ${precedent.claveTesis} | ${precedent.relevance}`);
      lines.push(`Rubro: ${precedent.rubro}`);
      lines.push(`Fuente: ${precedent.fuente ?? 'SJF'} | ${precedent.sourceUrl}`);
    }
  } else lines.push('No se encontraron precedentes relacionados por fraccion arancelaria.');
  lines.push('', 'RIESGO OPERATIVO');
  if (input.riskAssessment) {
    lines.push(`Banda: ${input.riskAssessment.band} | Puntaje: ${input.riskAssessment.score}/100 | Reglas: ${input.riskAssessment.rulesetVersion}`);
    for (const factor of input.riskAssessment.factors) lines.push(`${factor.label}: +${factor.points} | ${factor.explanation}`);
  } else lines.push('No se genero evaluacion de riesgo para este snapshot.');
  lines.push('', 'REVISION HUMANA');
  for (const review of input.reviews) lines.push(`${review.createdAt} | ${review.decision}${review.notes ? ` | ${review.notes}` : ''}`);
  lines.push('', 'AVISO', input.disclaimer);
  return lines;
}

export function renderCaseDossierPdf(input: CaseDossierInput): Uint8Array {
  const lines = buildCaseDossierLines(input).flatMap((line) => wrapAscii(line, 105));
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 48) pages.push(lines.slice(index, index + 48));
  if (pages.length === 0) pages.push(['TradeLogic - Expediente vacio']);

  const objects: string[] = [];
  const addObject = (value: string) => { objects.push(value); return objects.length; };
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  for (const page of pages) {
    const commands = ['BT', '/F1 9 Tf', '50 760 Td'];
    page.forEach((line, index) => {
      if (index > 0) commands.push('0 -14 Td');
      commands.push(`(${escapePdf(line)}) Tj`);
    });
    commands.push('ET');
    const stream = commands.join('\n');
    contentIds.push(addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
    pageIds.push(0);
  }
  const pagesId = addObject('');
  for (let index = 0; index < pageIds.length; index += 1) pageIds[index] = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`);
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

function wrapAscii(value: string, width: number): string[] {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?');
  if (normalized.length <= width) return [normalized];
  const chunks: string[] = [];
  for (let index = 0; index < normalized.length; index += width) chunks.push(normalized.slice(index, index + width));
  return chunks;
}

function escapePdf(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
