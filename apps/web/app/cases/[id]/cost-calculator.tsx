'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchClient } from '../../lib/api-client';

export type OfficialDutyRate = {
  code: string;
  nico: string | null;
  ratePercent: number;
  sourceVersion: string;
  sourceUrl: string | null;
  validFrom: string;
  validTo: string | null;
};

export type CostScenario = {
  id: string;
  currency: string;
  inputs?: { duty_rate_percent?: number; duty_rate_source?: string };
  outputs: {
    customsValueBase: number;
    dutyAmount: number;
    dta: number;
    ivaAmount: number;
    otherFees: number;
    totalLandedCost: number;
  };
  createdAt: string;
};

const FIELD_LABEL: Record<string, string> = {
  customsValueBase: 'Valor en aduana (+ flete + seguro)',
  dutyAmount: 'Arancel',
  dta: 'DTA (8 al millar)',
  ivaAmount: 'IVA',
  otherFees: 'Otros gastos',
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 }).format(value);
}

export function CostCalculator({
  caseId,
  initialScenarios,
  officialDutyRate,
}: {
  caseId: string;
  initialScenarios: CostScenario[];
  officialDutyRate: OfficialDutyRate | null;
}) {
  const router = useRouter();
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [open, setOpen] = useState(initialScenarios.length === 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const dutyRate = String(form.get('duty_rate_percent') ?? '').trim();
      const payload: Record<string, number | string> = {
        customs_value: Number(form.get('customs_value')),
        freight: Number(form.get('freight') || 0),
        insurance: Number(form.get('insurance') || 0),
      };
      if (dutyRate) {
        payload.duty_rate_percent = Number(dutyRate);
        const dutyRateSource = String(form.get('duty_rate_source') ?? '').trim();
        if (!dutyRateSource) {
          throw new Error('Captura la fuente o fundamento de la tasa manual.');
        }
        payload.duty_rate_source = dutyRateSource;
      }
      const scenario = await apiFetchClient<CostScenario>(`/api/v1/classification-cases/${caseId}/cost-scenarios`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setScenarios((current) => [scenario, ...current]);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo calcular el costo');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {scenarios.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {scenarios.map((scenario) => (
            <li key={scenario.id} className="rounded border border-neutral-200 p-3 text-sm dark:border-neutral-800">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">Costo total: {formatCurrency(scenario.outputs.totalLandedCost, scenario.currency)}</span>
                <span className="text-xs text-neutral-400">{new Date(scenario.createdAt).toLocaleDateString('es-MX')}</span>
              </div>
              {scenario.inputs?.duty_rate_source ? <p className="mb-2 text-xs text-neutral-500">Tasa IGI: {scenario.inputs.duty_rate_percent}% · Fuente: {scenario.inputs.duty_rate_source}</p> : null}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-500">
                {Object.entries(FIELD_LABEL).map(([key, label]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <dt>{label}</dt>
                    <dd>{formatCurrency(scenario.outputs[key as keyof typeof scenario.outputs], scenario.currency)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-neutral-200 p-4 dark:border-neutral-800">
          {officialDutyRate ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">IGI oficial disponible</p>
                <span className="text-xs">{officialDutyRate.code}{officialDutyRate.nico ? `/${officialDutyRate.nico}` : ''}</span>
              </div>
              <p className="mt-1 text-xs leading-5">
                Se usara {formatPercent(officialDutyRate.ratePercent)}% de {officialDutyRate.sourceVersion}
                {officialDutyRate.sourceUrl ? (
                  <> · <a className="underline" href={officialDutyRate.sourceUrl} target="_blank" rel="noreferrer">ver fuente</a></>
                ) : null}
                . Captura una tasa manual solo si debes documentar una preferencia, exencion o criterio revisado.
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Valor en aduana
              <input
                name="customs_value"
                type="number"
                step="0.01"
                min="0"
                required
                className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Arancel manual (%)
              <input
                name="duty_rate_percent"
                type="number"
                step="0.01"
                min="0"
                className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-sm">
              Fuente del arancel manual
              <input
                name="duty_rate_source"
                type="text"
                placeholder="Ej. TIGIE/SNICE, tratado preferencial, criterio interno revisado"
                className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Flete (opcional)
              <input
                name="freight"
                type="number"
                step="0.01"
                min="0"
                className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Seguro (opcional)
              <input
                name="insurance"
                type="number"
                step="0.01"
                min="0"
                className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
          </div>
          <p className="text-xs text-neutral-400">
            IVA se calcula al 16% por defecto. Si dejas vacío el arancel manual, TradeLogic usará la tasa oficial vigente cuando esté disponible en el caso aprobado.
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-fit rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              {submitting ? 'Calculando...' : 'Calcular costo'}
            </button>
            {scenarios.length > 0 ? (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
              >
                Cerrar
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-fit rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
        >
          Nuevo cálculo
        </button>
      )}
    </div>
  );
}
