// Ingesta y Desglose Inteligente de Facturas Comerciales Internacionales (Invoice / Packing List)

export type CommercialInvoiceItem = {
  itemNumber: number;
  partNumber?: string | undefined;
  description: string;
  originalLanguage?: string | undefined;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  totalPrice: number;
  suggestedTariffFamily?: string | undefined;
  extractedKeywords: string[];
};

export type CommercialInvoiceInput = {
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  incoterm?: string | undefined;
  vendor: {
    name: string;
    country: string;
    taxId?: string | undefined;
  };
  buyer: {
    name: string;
    country: string;
    taxId?: string | undefined;
  };
  rawTextContent?: string | undefined;
  items: CommercialInvoiceItem[];
};

export type ParsedInvoiceResult = {
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  incoterm: string;
  vendorName: string;
  vendorCountry: string;
  buyerName: string;
  totalItemsCount: number;
  totalInvoiceAmount: number;
  items: CommercialInvoiceItem[];
  rulesetVersion: string;
};

export const COMMERCIAL_INVOICE_RULESET_VERSION = 'mx-inv-2026.1';

export function parseCommercialInvoiceCsv(csvContent: string): ParsedInvoiceResult {
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    throw new Error('CSV content is empty');
  }

  const items: CommercialInvoiceItem[] = [];
  let invoiceNumber = 'INV-AUTO-PARSED';
  let invoiceDate = new Date().toISOString().split('T')[0] ?? '2026-08-19';
  let currency = 'USD';
  let incoterm = 'FOB';
  let vendorName = 'PROVEEDOR INTERNACIONAL';
  let vendorCountry = 'CN';
  let buyerName = 'IMPORTADOR NACIONAL';

  // Analizar cabeceras o filas tabulares
  let isTable = false;
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Metadata en comentarios o pares clave-valor
    if (line.startsWith('#') || line.includes(':')) {
      const parts = line.replace(/^#\s*/, '').split(':');
      const key = parts[0] ?? '';
      const val = parts.slice(1).join(':').trim();
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('invoice') || lowerKey.includes('factura')) invoiceNumber = val || invoiceNumber;
      if (lowerKey.includes('date') || lowerKey.includes('fecha')) invoiceDate = val || invoiceDate;
      if (lowerKey.includes('currency') || lowerKey.includes('moneda')) currency = val.toUpperCase() || currency;
      if (lowerKey.includes('incoterm')) incoterm = val.toUpperCase() || incoterm;
      if (lowerKey.includes('vendor') || lowerKey.includes('seller') || lowerKey.includes('proveedor')) vendorName = val || vendorName;
      if (lowerKey.includes('country') || lowerKey.includes('pais')) vendorCountry = val || vendorCountry;
      if (lowerKey.includes('buyer') || lowerKey.includes('comprador')) buyerName = val || buyerName;
      continue;
    }

    if (!isTable && (line.toLowerCase().includes('description') || line.toLowerCase().includes('item') || line.toLowerCase().includes('sku') || line.toLowerCase().includes('precio'))) {
      headers = parseCsvLine(line).map((h) => h.toLowerCase());
      isTable = true;
      continue;
    }

    if (isTable) {
      const cols = parseCsvLine(line);
      if (cols.length < 2) continue;

      const itemNumber = items.length + 1;
      let partNumber: string | undefined;
      let description = cols[0] ?? 'Mercancía';
      let quantity = 1;
      let unitOfMeasure = 'PZA';
      let unitPrice = 0;
      let totalPrice = 0;

      for (let h = 0; h < headers.length; h++) {
        const header = headers[h] ?? '';
        const val = cols[h] || '';

        if (header.includes('part') || header.includes('sku') || header.includes('codigo') || header.includes('item')) {
          partNumber = val || undefined;
        } else if (header.includes('desc') || header.includes('name') || header.includes('producto')) {
          description = val;
        } else if (header.includes('qty') || header.includes('cant') || header.includes('quantity')) {
          quantity = parseFloat(val) || 1;
        } else if (header.includes('unit') && (header.includes('meas') || header.includes('medida') || header.includes('uom'))) {
          unitOfMeasure = val || 'PZA';
        } else if (header.includes('price') || header.includes('precio') || header.includes('unitario')) {
          unitPrice = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
        } else if (header.includes('total') || header.includes('amount') || header.includes('importe')) {
          totalPrice = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
        }
      }

      if (totalPrice === 0 && unitPrice > 0) {
        totalPrice = Math.round(quantity * unitPrice * 100) / 100;
      }

      const keywords = extractKeywords(description);
      const suggestedFamily = inferTariffFamily(keywords);

      items.push({
        itemNumber,
        ...(partNumber ? { partNumber } : {}),
        description,
        quantity,
        unitOfMeasure,
        unitPrice,
        totalPrice,
        ...(suggestedFamily ? { suggestedFamily } : {}),
        extractedKeywords: keywords,
      });
    }
  }

  // Si no encontro cabecera tabular, intentar parseo generico
  if (items.length === 0) {
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (!line || line.startsWith('#')) continue;
      const cols = parseCsvLine(line);
      if (cols.length >= 2) {
        const desc = cols[0] ?? 'Mercancía';
        const qty = parseFloat(cols[1] ?? '1') || 1;
        const price = parseFloat(cols[2] ?? '0') || 0;
        const kws = extractKeywords(desc);
        const fam = inferTariffFamily(kws);
        items.push({
          itemNumber: idx + 1,
          description: desc,
          quantity: qty,
          unitOfMeasure: 'PZA',
          unitPrice: price,
          totalPrice: Math.round(qty * price * 100) / 100,
          ...(fam ? { suggestedTariffFamily: fam } : {}),
          extractedKeywords: kws,
        });
      }
    }
  }

  const totalInvoiceAmount = items.reduce((acc, curr) => acc + curr.totalPrice, 0);

  return {
    invoiceNumber,
    invoiceDate,
    currency,
    incoterm,
    vendorName,
    vendorCountry,
    buyerName,
    totalItemsCount: items.length,
    totalInvoiceAmount: Math.round(totalInvoiceAmount * 100) / 100,
    items,
    rulesetVersion: COMMERCIAL_INVOICE_RULESET_VERSION,
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

function extractKeywords(desc: string): string[] {
  return desc
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 3);
}

function inferTariffFamily(keywords: string[]): string | undefined {
  const kws = new Set(keywords);
  if (kws.has('bracket') || kws.has('steel') || kws.has('screw') || kws.has('pipe') || kws.has('metal') || kws.has('tornillo')) {
    return 'Capítulo 73 (Manufacturas de fundición, hierro o acero)';
  }
  if (kws.has('sensor') || kws.has('circuit') || kws.has('switch') || kws.has('cable') || kws.has('power') || kws.has('adapter') || kws.has('inverter')) {
    return 'Capítulo 85 (Máquinas, aparatos y material eléctrico)';
  }
  if (kws.has('valve') || kws.has('pump') || kws.has('engine') || kws.has('bearing') || kws.has('compressor') || kws.has('motor')) {
    return 'Capítulo 84 (Reactores nucleares, calderas, máquinas y aparatos mecánicos)';
  }
  if (kws.has('plastic') || kws.has('polymer') || kws.has('nylon') || kws.has('gasket') || kws.has('polimero')) {
    return 'Capítulo 39 (Plásticos y sus manufacturas)';
  }
  if (kws.has('cotton') || kws.has('shirt') || kws.has('garment') || kws.has('fabric') || kws.has('polyester')) {
    return 'Capítulo 61/62 (Prendas y complementos de vestir)';
  }
  return undefined;
}
