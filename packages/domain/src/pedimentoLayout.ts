// Generador y Pre-validador de Layout de Pedimento Aduanero (Anexo 22 RGCE / SAAI M3)

export type PedimentoRegime = 'IMD' | 'ITR' | 'EXP' | 'EXD'; // Importación Definitiva, Temporal, Exportación, etc.

export type PedimentoHeaderInput = {
  pedimentoNumber: string; // 7 digitos
  customsOfficeCode: string; // ej. 240 (Nuevo Laredo), 160 (Manzanillo)
  customsPatent: string; // 4 digitos
  operationType: 1 | 2; // 1: Importacion, 2: Exportacion
  regime: PedimentoRegime;
  customsValueTotal: number;
  commercialValueTotal: number;
  currency: string;
  exchangeRate: number;
  importer: {
    rfc: string;
    companyName: string;
    curp?: string;
  };
};

export type PedimentoItemInput = {
  itemNumber: number;
  tariffCode: string; // 8 digitos
  nico: string; // 2 digitos
  commercialDescription: string;
  valuationMethodCode: number; // 1: Valor de transaccion, etc.
  quantityCommercial: number;
  unitOfMeasureCommercialCode: number; // Anexo 22 (ej. 6: Piezas, 1: Kilos)
  quantityTariff: number;
  unitOfMeasureTariffCode: number;
  commercialValueItem: number;
  customsValueItem: number;
  countryOfOriginCode: string; // 3 letras (ej. CHN, USA, DEU)
  countryOfExportCode: string;
  dutyRatePercent: number;
  dutyFormOfPaymentCode: number; // 0: Efectivo, 6: Exento de tratado
  vatRatePercent: number;
  identifiers?: Array<{ code: string; complement?: string }>; // ej. TL (Tratado libre comercio), ST (Sensible)
  permits?: Array<{ authorityCode: string; permitNumber: string; firmNumber?: string }>; // Permisos y NOMs
};

export type GeneratedPedimentoLayout = {
  headerRecord501: string;
  itemRecords551: string[];
  permitsRecords554: string[];
  totalTaxesSummary: {
    totalIgi: number;
    totalDta: number;
    totalIva: number;
    grandTotalPayable: number;
  };
  validationErrors: string[];
  isValidForTransmission: boolean;
  rulesetVersion: string;
};

export const PEDIMENTO_RULESET_VERSION = 'saai-m3-anexo22-2026.1';

export function generatePedimentoLayout(
  header: PedimentoHeaderInput,
  items: PedimentoItemInput[]
): GeneratedPedimentoLayout {
  const errors: string[] = [];

  // Validaciones del Anexo 22
  if (!header.customsOfficeCode || header.customsOfficeCode.length < 3) {
    errors.push('Clave de aduana inválida (debe ser de 3 dígitos)');
  }
  if (!header.customsPatent || header.customsPatent.length < 4) {
    errors.push('Patente aduanal inválida (debe ser de 4 dígitos)');
  }
  if (header.exchangeRate <= 0) {
    errors.push('El tipo de cambio debe ser mayor a cero');
  }

  // Registro 501 - Datos Generales del Pedimento
  const record501 = [
    '501',
    header.customsOfficeCode.padStart(3, '0'),
    header.customsPatent.padStart(4, '0'),
    header.pedimentoNumber.padStart(7, '0'),
    header.operationType.toString(),
    header.regime,
    header.importer.rfc.padEnd(13, ' '),
    header.importer.companyName.slice(0, 80).padEnd(80, ' '),
    header.exchangeRate.toFixed(4).padStart(9, '0'),
    Math.round(header.customsValueTotal).toString().padStart(12, '0'),
  ].join('|');

  let totalIgi = 0;
  let totalDta = Math.round(header.customsValueTotal * 0.008); // 8 al millar
  let totalIva = 0;

  const itemRecords551: string[] = [];
  const permitsRecords554: string[] = [];

  for (const item of items) {
    const cleanTariff = item.tariffCode.replace(/\D/g, '').padStart(8, '0');
    const cleanNico = (item.nico || '00').replace(/\D/g, '').padStart(2, '0');

    if (cleanTariff.length !== 8) {
      errors.push(`Partida ${item.itemNumber}: Fracción arancelaria debe ser de 8 dígitos (${item.tariffCode})`);
    }

    const itemIgi = Math.round(item.customsValueItem * (item.dutyRatePercent / 100));
    totalIgi += itemIgi;

    const itemIvaBase = item.customsValueItem + itemIgi + (item.customsValueItem * 0.008);
    const itemIva = Math.round(itemIvaBase * (item.vatRatePercent / 100));
    totalIva += itemIva;

    // Registro 551 - Partidas del Pedimento
    const record551 = [
      '551',
      header.customsOfficeCode.padStart(3, '0'),
      header.customsPatent.padStart(4, '0'),
      header.pedimentoNumber.padStart(7, '0'),
      item.itemNumber.toString().padStart(4, '0'),
      cleanTariff,
      cleanNico,
      item.commercialDescription.slice(0, 80).padEnd(80, ' '),
      item.valuationMethodCode.toString(),
      item.quantityCommercial.toFixed(3).padStart(14, '0'),
      item.unitOfMeasureCommercialCode.toString().padStart(2, '0'),
      Math.round(item.customsValueItem).toString().padStart(12, '0'),
      item.countryOfOriginCode.padEnd(3, ' '),
      item.dutyRatePercent.toFixed(2).padStart(6, '0'),
      item.dutyFormOfPaymentCode.toString(),
    ].join('|');
    itemRecords551.push(record551);

    // Registro 554 - Permisos / NOMs por partida
    if (item.permits && item.permits.length > 0) {
      for (const p of item.permits) {
        const record554 = [
          '554',
          header.customsOfficeCode.padStart(3, '0'),
          header.customsPatent.padStart(4, '0'),
          header.pedimentoNumber.padStart(7, '0'),
          item.itemNumber.toString().padStart(4, '0'),
          p.authorityCode.padEnd(3, ' '),
          p.permitNumber.slice(0, 40).padEnd(40, ' '),
          (p.firmNumber || '').slice(0, 20).padEnd(20, ' '),
        ].join('|');
        permitsRecords554.push(record554);
      }
    }
  }

  const grandTotalPayable = totalIgi + totalDta + totalIva;

  return {
    headerRecord501: record501,
    itemRecords551,
    permitsRecords554,
    totalTaxesSummary: {
      totalIgi,
      totalDta,
      totalIva,
      grandTotalPayable,
    },
    validationErrors: errors,
    isValidForTransmission: errors.length === 0,
    rulesetVersion: PEDIMENTO_RULESET_VERSION,
  };
}
