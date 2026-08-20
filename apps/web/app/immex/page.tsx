'use client';

import { useState } from 'react';

export default function ImmexPage() {
  const [tariffCode, setTariffCode] = useState('7208.10.01');
  const [customsValue, setCustomsValue] = useState('500000');
  const [dutyRate, setDutyRate] = useState('15');
  const [inpcImport, setInpcImport] = useState('130.5');
  const [inpcChange, setInpcChange] = useState('138.2');
  const [surcharges, setSurcharges] = useState('14.7');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleEvaluate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/immex/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tariff_code: tariffCode,
          change_of_regime: {
            original_import_date: '2025-01-10',
            change_of_regime_date: '2026-08-15',
            original_customs_value_mxn: parseFloat(customsValue) || 500000,
            original_duty_rate_percent: parseFloat(dutyRate) || 15,
            inpc_import_month: parseFloat(inpcImport) || 130.5,
            inpc_change_month: parseFloat(inpcChange) || 138.2,
            surcharges_rate_percent: parseFloat(surcharges) || 14.7,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Error al evaluar cumplimiento IMMEX');
      }

      const json = await res.json();
      setResult(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          🏭 Módulo de Cumplimiento IMMEX y Cambio de Régimen
        </h1>
        <p className="text-sm text-neutral-500">
          Evalúa fracciones sensibles del Anexo II del Decreto IMMEX y calcula los costos de regularización (cambio de régimen de temporal a definitiva con INPC y recargos CFF).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Parámetros de la Importación Temporal
          </h2>

          <div>
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Fracción Arancelaria a Evaluar</label>
            <input
              type="text"
              value={tariffCode}
              onChange={(e) => setTariffCode(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Valor en Aduana (MXN)</label>
              <input
                type="text"
                value={customsValue}
                onChange={(e) => setCustomsValue(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Tasa IGI Omitida (%)</label>
              <input
                type="text"
                value={dutyRate}
                onChange={(e) => setDutyRate(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">INPC Importación</label>
              <input
                type="text"
                value={inpcImport}
                onChange={(e) => setInpcImport(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">INPC Cambio Régimen</label>
              <input
                type="text"
                value={inpcChange}
                onChange={(e) => setInpcChange(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">Recargos (%)</label>
              <input
                type="text"
                value={surcharges}
                onChange={(e) => setSurcharges(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleEvaluate}
            disabled={loading}
            className="w-full rounded-lg bg-neutral-900 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {loading ? 'Calculando...' : 'Evaluar Sensibilidad y Simular Cambio de Régimen'}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div>
          {result ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
              <div className="border-b border-neutral-200 pb-3 dark:border-neutral-800">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                    result.sensitivity.isSensitive
                      ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                  }`}
                >
                  {result.sensitivity.isSensitive ? '⚠️ MERCANCÍA SENSIBLE IMMEX' : '✅ Mercancía General No Sensible'}
                </span>
                <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">
                  {result.sensitivity.complianceWarning}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-neutral-500">
                  <span>Plazo Máximo: <strong>{result.sensitivity.maxAllowedMonths} meses</strong></span>
                  <span>Sector: <strong>{result.sensitivity.sector}</strong></span>
                </div>
              </div>

              {result.regimeCalculation && (
                <div className="space-y-2 text-xs">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Desglose de Cambio de Régimen (Art. 21 CFF + Art. 17-A CFF)
                  </h3>
                  <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span>IGI Histórico Omitido:</span>
                      <strong>${result.regimeCalculation.originalDutyAmount.toLocaleString()} MXN</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Factor de Actualización INPC:</span>
                      <strong>×{result.regimeCalculation.actualizationFactor}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>IGI Actualizado:</span>
                      <strong>${result.regimeCalculation.actualizedDutyAmount.toLocaleString()} MXN</strong>
                    </div>
                    <div className="flex justify-between text-amber-700 dark:text-amber-400">
                      <span>Recargos por Mora:</span>
                      <strong>+${result.regimeCalculation.surchargesAmount.toLocaleString()} MXN</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>DTA Cuota Fija:</span>
                      <strong>+${result.regimeCalculation.dtaFixedFee} MXN</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA Causado (16%):</span>
                      <strong>+${result.regimeCalculation.vatPayable.toLocaleString()} MXN</strong>
                    </div>
                    <div className="border-t border-neutral-300 dark:border-neutral-700 pt-1.5 flex justify-between font-sans font-bold text-xs text-neutral-900 dark:text-neutral-100">
                      <span>Gran Total a Pagar al SAT:</span>
                      <span>${result.regimeCalculation.grandTotalCost.toLocaleString()} MXN</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
              Ingresa una fracción arancelaria y presiona "Evaluar" para consultar las reglas de sensibilidad IMMEX y calcular la liquidación fiscal por cambio de régimen.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
