'use client';

import { useState } from 'react';

export default function InvoicesPage() {
  const [csvInput, setCsvInput] = useState(`# INVOICE: INV-2026-90412
# DATE: 2026-08-10
# CURRENCY: USD
# INCOTERM: CIF
# VENDOR: Shenzhen Industrial Tech Ltd
# COUNTRY: CN
# BUYER: Maquilas y Ensamble del Norte S.A. de C.V.
Item,PartNumber,Description,Quantity,UOM,UnitPrice,Total
1,SKU-8841,"Stainless Steel Mounting Brackets 50mm",500,PZA,4.50,2250.00
2,SKU-9920,"Optical Proximity Sensor 24VDC",150,PZA,32.00,4800.00
3,SKU-1044,"Hydraulic Pressure Relief Valve 1/2 inch",40,PZA,115.00,4600.00`);

  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleIngest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/invoices/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content: csvInput }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Error al procesar la factura');
      }

      const json = await res.json();
      setParsedResult(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          📑 Ingesta Inteligente de Facturas Internacionales
        </h1>
        <p className="text-sm text-neutral-500">
          Procesa facturas de proveedores internacionales en inglés, chino o alemán y descompone las partidas en candidatos LIGIE.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Pega el contenido de la Factura (CSV, Packing List o Texto Estructurado):
          </label>
          <textarea
            rows={14}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 p-3 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
          <button
            type="button"
            onClick={handleIngest}
            disabled={loading}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {loading ? 'Extrayendo y desglosando partidas...' : 'Desglosar Partidas y Asignar Familias'}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div>
          {parsedResult ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Factura: {parsedResult.invoiceNumber}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Proveedor: {parsedResult.vendorName} ({parsedResult.vendorCountry}) | Incoterm: {parsedResult.incoterm}
                  </p>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 dark:bg-green-950 dark:text-green-300">
                  Total: ${parsedResult.totalInvoiceAmount.toLocaleString()} {parsedResult.currency}
                </span>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Partidas Desglosadas ({parsedResult.totalItemsCount})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {parsedResult.items.map((item: any) => (
                    <div
                      key={item.itemNumber}
                      className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-950"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="text-neutral-900 dark:text-neutral-100">
                            #{item.itemNumber} {item.partNumber ? `[${item.partNumber}]` : ''} {item.description}
                          </strong>
                          <div className="mt-1 text-neutral-500">
                            Cantidad: {item.quantity} {item.unitOfMeasure} × ${item.unitPrice} = <strong>${item.totalPrice}</strong>
                          </div>
                        </div>
                      </div>
                      {item.suggestedTariffFamily && (
                        <div className="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          🎯 Sugerencia: {item.suggestedTariffFamily}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
              Pega una factura comercial y presiona "Desglosar Partidas" para ver el análisis de SKUs y sugerencias arancelarias.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
