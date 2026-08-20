// Generador de Escritos Legales Aduaneros:
// 1. Consulta de Clasificacion Arancelaria previa a la importacion (Art. 47 Ley Aduanera).
// 2. Memorial de Pruebas y Alegatos para desvirtuar PAMA / Acta de Irregularidades.

export type InquiryType = 'ART_47_CONSULTA' | 'PAMA_DEFENSA';

export type CustomsInquiryInput = {
  inquiryType: InquiryType;
  applicant: {
    companyName: string;
    rfc: string;
    legalRepresentative: string;
    address: string;
    customsAgentName?: string;
    customsPatent?: string;
  };
  product: {
    name: string;
    brand?: string;
    model?: string;
    commercialDescription: string;
    technicalDescription: string;
    materialsComposition: string;
    functionAndUsage: string;
    packagingPresentation: string;
    countryOfOrigin: string;
    countryOfExport: string;
  };
  proposedClassification: {
    tariffCode: string;
    nico?: string;
    generalRuleApplied: string;
    legalNotesRationale: string;
    applicableTesisIus?: string[];
  };
  pamaDetails?: {
    actNumber: string;
    customsOffice: string;
    actDate: string;
    authorityChallengedCode: string;
    allegedIrregularity: string;
  };
  evidenceList: Array<{
    fileName: string;
    documentType: string;
    sha256Hash: string;
  }>;
};

export type CustomsInquiryDocument = {
  inquiryType: InquiryType;
  title: string;
  addressedTo: string;
  documentBody: string;
  petitoryClauses: string[];
  annexesTable: string[];
  legalBasis: string[];
  generatedAt: string;
  rulesetVersion: string;
};

export const CUSTOMS_INQUIRY_RULESET_VERSION = 'mx-la-2026.1';

export function generateCustomsInquiryDocument(input: CustomsInquiryInput): CustomsInquiryDocument {
  const generatedAt = new Date().toISOString();
  
  if (input.inquiryType === 'ART_47_CONSULTA') {
    return generateArt47Document(input, generatedAt);
  } else {
    return generatePamaDefenseDocument(input, generatedAt);
  }
}

function generateArt47Document(input: CustomsInquiryInput, generatedAt: string): CustomsInquiryDocument {
  const addressedTo = 'ADMINISTRACIÓN GENERAL JURÍDICA / AGENCIA NACIONAL DE ADUANAS DE MÉXICO (ANAM)';
  const title = 'CONSULTA DE CLASIFICACIÓN ARANCELARIA PREVIA A LA IMPORTACIÓN (ARTÍCULO 47 DE LA LEY ADUANERA)';
  
  const legalBasis = [
    'Artículos 8o. de la Constitución Política de los Estados Unidos Mexicanos.',
    'Artículos 18, 18-A y 19 del Código Fiscal de la Federación.',
    'Artículo 47 de la Ley Aduanera vigente.',
    'Reglas Generales 1a., 2a. a), 3a. b) y 6a. de las Complementarias de la LIGIE.',
    'Reglas Generales de Comercio Exterior vigentes (RGCE).',
  ];

  const bodyParts = [
    `ASUNTO: Se formula consulta sobre la correcta clasificación arancelaria y NICO de la mercancía denominada "${input.product.name}".`,
    `PROMOVENTE: ${input.applicant.companyName}, con R.F.C. ${input.applicant.rfc}, señalando como domicilio fiscal en ${input.applicant.address}, representada legalmente por ${input.applicant.legalRepresentative}.`,
    `\nI. ANTECEDENTES Y DESCRIPCIÓN DE LA MERCANCÍA:`,
    `1.1. Denominación comercial: ${input.product.name} (Marca: ${input.product.brand ?? 'Genérica'}, Modelo: ${input.product.model ?? 'S/M'}).`,
    `1.2. Descripción técnica y función: ${input.product.technicalDescription}.`,
    `1.3. Composición y materias constitutivas: ${input.product.materialsComposition}.`,
    `1.4. Uso y destino: ${input.product.functionAndUsage}.`,
    `1.5. Presentación y acondicionamiento para la venta: ${input.product.packagingPresentation}.`,
    `1.6. País de origen: ${input.product.countryOfOrigin}, procedente de: ${input.product.countryOfExport}.`,
    `\nII. OPINIÓN TÉCNICA Y CLASIFICACIÓN PROPUESTA:`,
    `El promovente somete a consideración de esa H. Autoridad que la mercancía descrita debe ubicarse en la Fracción Arancelaria ${input.proposedClassification.tariffCode} ${input.proposedClassification.nico ? `NICO ${input.proposedClassification.nico}` : ''}.`,
    `Motivación técnica y jurídica: ${input.proposedClassification.legalNotesRationale}`,
    `Regla de Interpretación aplicable: ${input.proposedClassification.generalRuleApplied}.`,
    ...(input.proposedClassification.applicableTesisIus?.length
      ? [`Criterio judicial de apoyo: Registro Digital SCJN IUS ${input.proposedClassification.applicableTesisIus.join(', ')}.`]
      : []),
  ];

  const petitoryClauses = [
    'PRIMERO.- Tener por presentada en tiempo y forma la presente consulta sobre la correcta clasificación arancelaria conforme al artículo 47 de la Ley Aduanera.',
    'SEGUNDO.- Admitir las pruebas documentales técnicas y muestras adjuntas debidamente inventariadas con su huella criptográfica SHA-256.',
    'TERCERO.- Emitir resolución formal vinculante determinando la fracción arancelaria y número de identificación comercial que corresponde a la mercancía materia de la consulta.',
  ];

  const annexesTable = input.evidenceList.map(
    (ev, idx) => `Anexo ${idx + 1}: ${ev.fileName} (${ev.documentType}) — Hash SHA-256: ${ev.sha256Hash}`
  );

  return {
    inquiryType: 'ART_47_CONSULTA',
    title,
    addressedTo,
    documentBody: bodyParts.join('\n'),
    petitoryClauses,
    annexesTable,
    legalBasis,
    generatedAt,
    rulesetVersion: CUSTOMS_INQUIRY_RULESET_VERSION,
  };
}

function generatePamaDefenseDocument(input: CustomsInquiryInput, generatedAt: string): CustomsInquiryDocument {
  const pama = input.pamaDetails ?? {
    actNumber: 'ACTA-PAMA-SIN-NUMERO',
    customsOffice: 'ADUANA GENERAL',
    actDate: new Date().toISOString().split('T')[0],
    authorityChallengedCode: 'SIN-DATO',
    allegedIrregularity: 'Presunta inexacta clasificación arancelaria',
  };

  const addressedTo = `TITULAR DE LA ADUANA DE ${pama.customsOffice.toUpperCase()} / AGENCIA NACIONAL DE ADUANAS DE MÉXICO`;
  const title = 'ESCRITO DE PRUEBAS Y ALEGATOS PARA DESVIRTUAR ACTA DE IRREGULARIDADES / PAMA';

  const legalBasis = [
    'Artículos 14 y 16 de la Constitución Política de los Estados Unidos Mexicanos (Garantías de Audiencia y Legalidad).',
    'Artículos 150, 151, 152 y 153 de la Ley Aduanera.',
    'Reglas Generales 1a., 3a. b) y 6a. de las Reglas Complementarias de la LIGIE.',
    'Tesis y Jurisprudencias de la SCJN relativas a la estricta motivación de la autoridad aduanera en clasificación.',
  ];

  const bodyParts = [
    `ASUNTO: Se formulan pruebas y alegatos para desvirtuar el Acta de Inicio de Procedimiento Administrativo en Materia Aduanera número ${pama.actNumber}, de fecha ${pama.actDate}.`,
    `PROMOVENTE: ${input.applicant.companyName}, R.F.C. ${input.applicant.rfc}, con domicilio para oír y recibir notificaciones en ${input.applicant.address}.`,
    `\nI. OBJECIÓN A LA CLASIFICACIÓN SOSTENIDA POR LA AUTORIDAD:`,
    `La autoridad aduanera pretende ubicar indebidamente la mercancía en la fracción ${pama.authorityChallengedCode}, omitiendo considerar las características técnicas intrínsecas y la función determinante del producto: ${input.product.technicalDescription}.`,
    `\nII. DEFENDIBILIDAD DE LA CLASIFICACIÓN DECLARADA:`,
    `La fracción correcta declarada en pedimento es ${input.proposedClassification.tariffCode} ${input.proposedClassification.nico ? `NICO ${input.proposedClassification.nico}` : ''}.`,
    `Sustento legal: ${input.proposedClassification.legalNotesRationale}`,
    `Criterio rector: La materia que le otorga el carácter esencial es ${input.product.materialsComposition}, resultando inaplicable el argumento de la autoridad aduanera.`,
  ];

  const petitoryClauses = [
    'PRIMERO.- Tener por presentado en tiempo y forma el presente escrito de pruebas y alegatos dentro del plazo legal establecido en la Ley Aduanera.',
    'SEGUNDO.- Tener por ofrecidas y admitidas todas y cada una de las pruebas documentales y técnicas anexas con certificación de autenticidad SHA-256.',
    'TERCERO.- Dictar resolución absolutoria declarando desvirtuada la presunta irregularidad y ordenando la inmediata liberación de las mercancías embargadas sin imposición de multas.',
  ];

  const annexesTable = input.evidenceList.map(
    (ev, idx) => `Prueba ${idx + 1}: ${ev.fileName} (${ev.documentType}) — Hash SHA-256: ${ev.sha256Hash}`
  );

  return {
    inquiryType: 'PAMA_DEFENSA',
    title,
    addressedTo,
    documentBody: bodyParts.join('\n'),
    petitoryClauses,
    annexesTable,
    legalBasis,
    generatedAt,
    rulesetVersion: CUSTOMS_INQUIRY_RULESET_VERSION,
  };
}
