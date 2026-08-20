// Motor de Cumplimiento IMMEX:
// 1. Evaluacion de Mercancias Sensibles (Anexo II Decreto IMMEX)
// 2. Calculo de Cambio de Regimen (Importacion Temporal a Definitiva con Actualizacion INPC y Recargos Art. 21 CFF)

export type ImmexSector = 'Siderurgico' | 'Aluminio' | 'Textil_y_Confeccion' | 'Confeccion' | 'Agropecuario' | 'Azucar' | 'General';

export type ImmexSensitivityRecord = {
  tariffCode: string;
  nico?: string;
  sector: ImmexSector;
  description: string;
  maxMonthsPeriod: number;
  requiresSpecialAuthorization: boolean;
  controlMechanism: string;
};

export type ImmexSensitivityResult = {
  isSensitive: boolean;
  sector: ImmexSector;
  maxAllowedMonths: number;
  requiresSpecialPermit: boolean;
  complianceWarning: string;
};

export type ChangeOfRegimeInput = {
  originalImportDate: string; // YYYY-MM-DD
  changeOfRegimeDate: string; // YYYY-MM-DD
  originalCustomsValueMxn: number;
  originalDutyRatePercent: number; // IGI omitido al importar temporal
  inpcImportMonth: number; // Indice Nacional de Precios al Consumidor
  inpcChangeMonth: number;
  surchargesRatePercent?: number; // Tasa de recargos acumulada (Art. 21 CFF, tipicamente ~1.47% mensual)
};

export type ChangeOfRegimeBreakdown = {
  originalDutyAmount: number;
  actualizationFactor: number;
  actualizedDutyAmount: number;
  surchargesAmount: number;
  totalDutyPayable: number;
  dtaFixedFee: number;
  vatPayable: number;
  grandTotalCost: number;
  rulesetVersion: string;
};

export const IMMEX_RULESET_VERSION = 'mx-immex-2026.1';

export function evaluateImmexSensitivity(
  tariffCode: string,
  catalog: ImmexSensitivityRecord[]
): ImmexSensitivityResult {
  const clean = tariffCode.replace(/\D/g, '');

  const match = catalog.find((item) => {
    const itemClean = item.tariffCode.replace(/\D/g, '');
    return clean.startsWith(itemClean) || itemClean.startsWith(clean);
  });

  if (match) {
    return {
      isSensitive: true,
      sector: match.sector,
      maxAllowedMonths: match.maxMonthsPeriod,
      requiresSpecialPermit: match.requiresSpecialAuthorization,
      complianceWarning: `MERCANCÍA SENSIBLE (Anexo II IMMEX - Sector ${match.sector}). Plazo máximo: ${match.maxMonthsPeriod} meses. Control: ${match.controlMechanism}.`,
    };
  }

  return {
    isSensitive: false,
    sector: 'General',
    maxAllowedMonths: 18, // Plazo estandar Art. 108 Ley Aduanera
    requiresSpecialPermit: false,
    complianceWarning: 'Mercancía no sensible. Aplica plazo estándar de permanencia temporal de 18 meses (Art. 108 Fracc. I Ley Aduanera).',
  };
}

export function calculateChangeOfRegime(input: ChangeOfRegimeInput): ChangeOfRegimeBreakdown {
  if (input.originalCustomsValueMxn <= 0 || input.originalDutyRatePercent < 0) {
    throw new Error('Valores de importación deben ser positivos');
  }

  const originalDutyAmount = round2(input.originalCustomsValueMxn * (input.originalDutyRatePercent / 100));

  // Factor de actualizacion conforme al Art. 17-A CFF
  let actualizationFactor = 1.0;
  if (input.inpcChangeMonth > 0 && input.inpcImportMonth > 0 && input.inpcChangeMonth >= input.inpcImportMonth) {
    actualizationFactor = Math.round((input.inpcChangeMonth / input.inpcImportMonth) * 10000) / 10000;
  }

  const actualizedDutyAmount = round2(originalDutyAmount * actualizationFactor);

  // Recargos conforme al Art. 21 CFF
  const surchargesRate = input.surchargesRatePercent ?? 0;
  const surchargesAmount = round2(actualizedDutyAmount * (surchargesRate / 100));

  const totalDutyPayable = round2(actualizedDutyAmount + surchargesAmount);

  // DTA cuota fija para cambio de regimen
  const dtaFixedFee = 425; // Cuota fija de actualizacion para rectificaciones/cambios

  // IVA causado
  const vatBase = round2(input.originalCustomsValueMxn + totalDutyPayable + dtaFixedFee);
  const vatPayable = round2(vatBase * 0.16);

  const grandTotalCost = round2(totalDutyPayable + dtaFixedFee + vatPayable);

  return {
    originalDutyAmount,
    actualizationFactor,
    actualizedDutyAmount,
    surchargesAmount,
    totalDutyPayable,
    dtaFixedFee,
    vatPayable,
    grandTotalCost,
    rulesetVersion: IMMEX_RULESET_VERSION,
  };
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}
