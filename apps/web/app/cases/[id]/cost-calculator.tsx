'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchClient } from '../../lib/api-client';

export type CostScenario = {
  id: string;
  currency: string;
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

export function CostCalculator({ caseId, initialScenarios }: { caseId: string; initialScenarios: CostScenario[] }) {
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
      const scenario = await apiFetchClient<CostScenario>(`/api/v1/classification-cases/${caseId}/cost-scenarios`, {
        method: 'POST',
        body: JSON.stringify({
          customs_value: Number(form.get('customs_value')),
          freight: Number(form.get('freight') || 0),
          insurance: Number(form.get('insurance') || 0),
          duty_rate_percent: Number(form.get('duty_rate_percent')),
        }),
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
              Arancel (%)
              <input
                name="duty_rate_percent"
                type="number"
                step="0.01"
                min="0"
                required
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
            IVA se calcula al 16% por defecto. El arancel se captura manualmente: todavía no hay una fuente de tasas arancelarias reales cargada en la plataforma.
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
