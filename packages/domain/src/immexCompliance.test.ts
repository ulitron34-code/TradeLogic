import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateImmexSensitivity,
  calculateChangeOfRegime,
  type ImmexSensitivityRecord,
  type ChangeOfRegimeInput,
} from './immexCompliance.js';

const sampleImmexCatalog: ImmexSensitivityRecord[] = [
  {
    tariffCode: '7208.10.01',
    nico: '00',
    sector: 'Siderurgico',
    description: 'Laminados planos de acero',
    maxMonthsPeriod: 9,
    requiresSpecialAuthorization: true,
    controlMechanism: 'Permiso Previo SE',
  },
  {
    tariffCode: '5208.11.01',
    nico: '00',
    sector: 'Textil_y_Confeccion',
    description: 'Tejidos de algodón',
    maxMonthsPeriod: 6,
    requiresSpecialAuthorization: true,
    controlMechanism: 'Padrón Sectorial 11',
  },
];

test('identifies sensitive steel goods in IMMEX Anexo II', () => {
  const result = evaluateImmexSensitivity('7208.10.01', sampleImmexCatalog);
  assert.equal(result.isSensitive, true);
  assert.equal(result.sector, 'Siderurgico');
  assert.equal(result.maxAllowedMonths, 9);
  assert.equal(result.requiresSpecialPermit, true);
});

test('identifies non-sensitive goods and assigns default 18 months', () => {
  const result = evaluateImmexSensitivity('8504.40.99', sampleImmexCatalog);
  assert.equal(result.isSensitive, false);
  assert.equal(result.maxAllowedMonths, 18);
});

test('calculates change of regime with INPC actualization and surcharges', () => {
  const input: ChangeOfRegimeInput = {
    originalImportDate: '2025-01-10',
    changeOfRegimeDate: '2026-08-15',
    originalCustomsValueMxn: 100000,
    originalDutyRatePercent: 15, // IGI 15%
    inpcImportMonth: 130.5,
    inpcChangeMonth: 138.2, // Factor ~1.0590
    surchargesRatePercent: 14.7, // 10 meses de mora al 1.47%
  };

  const calc = calculateChangeOfRegime(input);

  assert.equal(calc.originalDutyAmount, 15000);
  assert.equal(calc.actualizationFactor, 1.059);
  assert.equal(calc.actualizedDutyAmount, 15885);
  assert.equal(calc.surchargesAmount, 2335.09);
  assert.equal(calc.totalDutyPayable, 18220.09);
  assert.equal(calc.dtaFixedFee, 425);
  assert.ok(calc.grandTotalCost > 30000);
});
