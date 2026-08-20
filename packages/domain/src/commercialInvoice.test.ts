import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommercialInvoiceCsv } from './commercialInvoice.js';

test('parses commercial invoice CSV with metadata headers and tabular items', () => {
  const csvData = `# INVOICE: INV-2026-90412
# DATE: 2026-08-10
# CURRENCY: USD
# INCOTERM: CIF
# VENDOR: Shenzhen Industrial Tech Ltd
# COUNTRY: CN
# BUYER: Maquilas y Ensamble del Norte S.A. de C.V.
Item,PartNumber,Description,Quantity,UOM,UnitPrice,Total
1,SKU-8841,"Stainless Steel Mounting Brackets 50mm",500,PZA,4.50,2250.00
2,SKU-9920,"Optical Proximity Sensor 24VDC",150,PZA,32.00,4800.00
3,SKU-1044,"Hydraulic Pressure Relief Valve 1/2 inch",40,PZA,115.00,4600.00`;

  const parsed = parseCommercialInvoiceCsv(csvData);

  assert.equal(parsed.invoiceNumber, 'INV-2026-90412');
  assert.equal(parsed.currency, 'USD');
  assert.equal(parsed.incoterm, 'CIF');
  assert.equal(parsed.vendorName, 'Shenzhen Industrial Tech Ltd');
  assert.equal(parsed.totalItemsCount, 3);
  assert.equal(parsed.totalInvoiceAmount, 11650.00);

  // Validar despiece inteligente
  assert.equal(parsed.items[0]?.partNumber, 'SKU-8841');
  assert.ok(parsed.items[0]?.suggestedTariffFamily?.includes('Capítulo 73'));

  assert.equal(parsed.items[1]?.partNumber, 'SKU-9920');
  assert.ok(parsed.items[1]?.suggestedTariffFamily?.includes('Capítulo 85'));

  assert.equal(parsed.items[2]?.partNumber, 'SKU-1044');
  assert.ok(parsed.items[2]?.suggestedTariffFamily?.includes('Capítulo 84'));
});

test('handles CSV without metadata headers gracefully', () => {
  const simpleCsv = `Description,Quantity,Price
"Industrial Plastic Gasket Seal",200,1.80
"Cotton Work Shirt Blue",50,14.00`;

  const parsed = parseCommercialInvoiceCsv(simpleCsv);

  assert.equal(parsed.totalItemsCount, 2);
  assert.equal(parsed.totalInvoiceAmount, 1060.00);
  assert.ok(parsed.items[0]?.suggestedTariffFamily?.includes('Capítulo 39'));
  assert.ok(parsed.items[1]?.suggestedTariffFamily?.includes('Capítulo 61/62'));
});
