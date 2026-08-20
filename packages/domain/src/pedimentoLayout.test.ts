import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePedimentoLayout, type PedimentoHeaderInput, type PedimentoItemInput } from './pedimentoLayout.js';

test('generates valid SAAI M3 pedimento layout with 501, 551 and 554 records', () => {
  const header: PedimentoHeaderInput = {
    pedimentoNumber: '6001234',
    customsOfficeCode: '240', // Nuevo Laredo
    customsPatent: '3490',
    operationType: 1, // Importación
    regime: 'IMD', // Importación Definitiva
    customsValueTotal: 250000,
    commercialValueTotal: 250000,
    currency: 'MXN',
    exchangeRate: 18.5000,
    importer: {
      rfc: 'MEX1804128A1',
      companyName: 'Manufacturas del Norte S.A. de C.V.',
    },
  };

  const items: PedimentoItemInput[] = [
    {
      itemNumber: 1,
      tariffCode: '8504.40.99',
      nico: '99',
      commercialDescription: 'Fuentes de alimentación conmutadas',
      valuationMethodCode: 1,
      quantityCommercial: 500,
      unitOfMeasureCommercialCode: 6, // Piezas
      quantityTariff: 500,
      unitOfMeasureTariffCode: 6,
      commercialValueItem: 250000,
      customsValueItem: 250000,
      countryOfOriginCode: 'USA',
      countryOfExportCode: 'USA',
      dutyRatePercent: 0, // Exento por T-MEC
      dutyFormOfPaymentCode: 6, // Exento tratado
      vatRatePercent: 16,
      permits: [
        {
          authorityCode: 'NOM',
          permitNumber: 'NOM-019-SCFI-1998-CERT-8842',
        },
      ],
    },
  ];

  const layout = generatePedimentoLayout(header, items);

  assert.equal(layout.isValidForTransmission, true);
  assert.equal(layout.validationErrors.length, 0);

  // Registro 501
  assert.ok(layout.headerRecord501.startsWith('501|240|3490|6001234|1|IMD|MEX1804128A1'));

  // Registro 551
  assert.equal(layout.itemRecords551.length, 1);
  assert.ok(layout.itemRecords551[0]?.includes('85044099|99|Fuentes de alimentación conmutadas'));

  // Registro 554 (Permiso NOM)
  assert.equal(layout.permitsRecords554.length, 1);
  assert.ok(layout.permitsRecords554[0]?.includes('NOM|NOM-019-SCFI-1998-CERT-8842'));

  // Impuestos
  assert.equal(layout.totalTaxesSummary.totalIgi, 0);
  assert.equal(layout.totalTaxesSummary.totalDta, 2000); // 8 al millar de 250,000
});

test('catches invalid customs code and invalid tariff digits', () => {
  const header: PedimentoHeaderInput = {
    pedimentoNumber: '1',
    customsOfficeCode: '2', // Invalido
    customsPatent: '1', // Invalido
    operationType: 1,
    regime: 'IMD',
    customsValueTotal: 1000,
    commercialValueTotal: 1000,
    currency: 'MXN',
    exchangeRate: 0, // Invalido
    importer: { rfc: 'XXX', companyName: 'Test' },
  };

  const items: PedimentoItemInput[] = [
    {
      itemNumber: 1,
      tariffCode: '123', // Invalido
      nico: '0',
      commercialDescription: 'Test',
      valuationMethodCode: 1,
      quantityCommercial: 1,
      unitOfMeasureCommercialCode: 6,
      quantityTariff: 1,
      unitOfMeasureTariffCode: 6,
      commercialValueItem: 1000,
      customsValueItem: 1000,
      countryOfOriginCode: 'USA',
      countryOfExportCode: 'USA',
      dutyRatePercent: 5,
      dutyFormOfPaymentCode: 0,
      vatRatePercent: 16,
    },
  ];

  const layout = generatePedimentoLayout(header, items);
  assert.equal(layout.isValidForTransmission, false);
  assert.ok(layout.validationErrors.length >= 3);
});
