'use client';

import { useState } from 'react';

export function PedimentoLayoutPanel({ caseId, tariffCode, nico }: { caseId: string; tariffCode?: string | null; nico?: string | null }) {
  const [pedimentoNum, setPedimentoNum] = useState('6001234');
  const [customsCode, setCustomsCode] = useState('240'); // Nuevo Laredo
  const [patent, setPatent] = useState('3490');
  const [exchangeRate, setExchangeRate] = useState('18.5000');
  const [customsValue, setCustomsValue] = useState('150000');
  const [loading, setLoading] = useState(false);
  const [layoutResult, setLayoutResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateLayout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/pedimento-layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedimento_number: pedimentoNum,
          customs_office_code: customsCode,
          customs_patent: patent,
          regime: 'IMD',
          exchange_rate: parseFloat(exchangeRate) || 18.5,
          items: [
            {
              item_number: 1,
              tariff_code: tariffCode || '8504.40.99',
              nico: nico || '99',
              commercial_description: 'Mercancía clasificada según expediente',
              valuation_method_code: 1,
              quantity_commercial: 100,
              unit_of_measure_code: 6,
              customs_value_item: parseFloat(customsValue) || 150000,
              country_of_origin: 'USA',
              duty_rate_percent: 0,
              duty_form_of_payment_code: 6,
              vat_rate_percent: 16,
              permits: [
                {
                  authority_code: 'NOM',
                  permit_number: 'NOM-019-SCFI-1998',
                },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Error al generar layout de pedimento');
      }

      const json = await res.json();
      setLayoutResult(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          🚢 Pre-validador y Layout de Pedimento (SAAI M3 / Anexo 22 RGCE)
        </h2>
        <p className="text-xs text-neutral-500">
          Genera los registros 501, 551 y 554 de intercambio aduanero para software de pedimentos y VUCEM.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div>
          <label className="font-medium text-neutral-700 dark:text-neutral-300">Pedimento (7 dígitos)</label>
          <input
            type="text"
            value={pedimentoNum}
            maxLength={7}
            onChange={(e) => setPedimentoNum(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="font-medium text-neutral-700 dark:text-neutral-300">Aduana (3 dígitos)</label>
          <input
            type="text"
            value={customsCode}
            maxLength={3}
            onChange={(e) => setCustomsCode(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="font-medium text-neutral-700 dark:text-neutral-300">Patente (4 dígitos)</label>
          <input
            type="text"
            value={patent}
            maxLength={4}
            onChange={(e) => setPatent(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="font-medium text-neutral-700 dark:text-neutral-300">Tipo Cambio (MXN)</label>
          <input
            type="text"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="font-medium text-neutral-700 dark:text-neutral-300">Valor Aduana (MXN)</label>
          <input
            type="text"
            value={customsValue}
            onChange={(e) => setCustomsValue(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleGenerateLayout}
          disabled={loading}
          className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? 'Validando registros...' : 'Generar Layout SAAI M3'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {layoutResult && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-xs dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2 dark:border-neutral-800">
            <span className={`font-semibold ${layoutResult.isValidForTransmission ? 'text-green-600' : 'text-red-600'}`}>
              {layoutResult.isValidForTransmission ? '✅ Estructura Válida para Transmisión' : '⚠️ Errores de Validación'}
            </span>
            <span className="text-neutral-500">
              Total Impuestos: ${(layoutResult.totalTaxesSummary.grandTotalPayable || 0).toLocaleString()} MXN
            </span>
          </div>

          <div className="mt-3">
            <label className="font-semibold text-neutral-700 dark:text-neutral-300">Registros de Transmisión:</label>
            <pre className="mt-1 rounded bg-black/90 p-3 text-[11px] font-mono text-green-400 overflow-x-auto">
{layoutResult.headerRecord501}
{layoutResult.itemRecords551.join('\n')}
{layoutResult.permitsRecords554.join('\n')}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
