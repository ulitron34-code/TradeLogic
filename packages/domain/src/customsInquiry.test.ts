import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCustomsInquiryDocument, type CustomsInquiryInput } from './customsInquiry.js';

test('generates formal Art. 47 Ley Aduanera inquiry document', () => {
  const input: CustomsInquiryInput = {
    inquiryType: 'ART_47_CONSULTA',
    applicant: {
      companyName: 'Tecnología Global de México S.A. de C.V.',
      rfc: 'TGM1803209A1',
      legalRepresentative: 'Lic. Roberto Morales Soto',
      address: 'Av. Paseo de la Reforma 405, CDMX',
      customsAgentName: 'Agencia Aduanal del Norte S.C.',
      customsPatent: '3490',
    },
    product: {
      name: 'Módulo de Alimentación Ininterrumpida UPS 3kVA',
      brand: 'PowerPro',
      model: 'UPS-3000X',
      commercialDescription: 'Fuente ininterrumpida de poder para servidores',
      technicalDescription: 'Convertidor estático con inversor y banco de baterías de litio',
      materialsComposition: '70% componentes electrónicos y transformador, 20% gabinete de acero, 10% baterías',
      functionAndUsage: 'Respaldar energía eléctrica de equipos de cómputo',
      packagingPresentation: 'Caja unitaria con cables y manual',
      countryOfOrigin: 'China',
      countryOfExport: 'Estados Unidos',
    },
    proposedClassification: {
      tariffCode: '8504.40.99',
      nico: '99',
      generalRuleApplied: 'Regla General 1 y 6 Complementaria',
      legalNotesRationale: 'Corresponde a los demás convertidores estáticos por tener la función de transformar y regular corriente continua y alterna.',
      applicableTesisIus: ['2021456'],
    },
    evidenceList: [
      {
        fileName: 'datasheet-ups3000.pdf',
        documentType: 'Ficha Técnica Oficial',
        sha256Hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      },
    ],
  };

  const doc = generateCustomsInquiryDocument(input);

  assert.equal(doc.inquiryType, 'ART_47_CONSULTA');
  assert.ok(doc.title.includes('ARTÍCULO 47'));
  assert.ok(doc.documentBody.includes('Tecnología Global de México'));
  assert.ok(doc.documentBody.includes('8504.40.99'));
  assert.ok(doc.annexesTable.length === 1);
  assert.ok(doc.annexesTable[0]?.includes('datasheet-ups3000.pdf'));
  assert.ok(doc.legalBasis.some((b) => b.includes('Artículo 47')));
});

test('generates formal PAMA defense document', () => {
  const input: CustomsInquiryInput = {
    inquiryType: 'PAMA_DEFENSA',
    applicant: {
      companyName: 'Importadora Industrial del Bajío S.A.',
      rfc: 'IIB1501108B2',
      legalRepresentative: 'Ing. Carlos Mendoza',
      address: 'Parque Industrial Querétaro',
    },
    product: {
      name: 'Válvula Reguladora de Presión Hidráulica',
      commercialDescription: 'Válvula de control',
      technicalDescription: 'Válvula de acero inoxidable con diafragma para circuitos de presión',
      materialsComposition: '95% acero inox, 5% sellos elastómero',
      functionAndUsage: 'Control de flujo hidráulico',
      packagingPresentation: 'A granel en tarima',
      countryOfOrigin: 'Alemania',
      countryOfExport: 'Alemania',
    },
    proposedClassification: {
      tariffCode: '8481.10.99',
      nico: '99',
      generalRuleApplied: 'Regla General 1',
      legalNotesRationale: 'Válvulas reductoras de presión de la partida 8481.',
    },
    pamaDetails: {
      actNumber: 'PAMA-NL-2026-0842',
      customsOffice: 'Nuevo Laredo',
      actDate: '2026-08-15',
      authorityChallengedCode: '7307.99.99',
      allegedIrregularity: 'La autoridad pretende clasificar como simple accesorio de tubería y no como válvula con mecanismo móvil.',
    },
    evidenceList: [
      {
        fileName: 'plano-mecanico-valvula.pdf',
        documentType: 'Plano Técnico de Despiece',
        sha256Hash: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
      },
    ],
  };

  const doc = generateCustomsInquiryDocument(input);

  assert.equal(doc.inquiryType, 'PAMA_DEFENSA');
  assert.ok(doc.title.includes('PAMA'));
  assert.ok(doc.addressedTo.includes('NUEVO LAREDO'));
  assert.ok(doc.documentBody.includes('PAMA-NL-2026-0842'));
  assert.ok(doc.documentBody.includes('7307.99.99'));
  assert.ok(doc.petitoryClauses.some((p) => p.includes('inmediata liberación')));
});
