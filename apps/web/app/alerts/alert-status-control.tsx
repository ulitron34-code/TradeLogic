'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchClient } from '../lib/api-client';

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierta',
  ACKNOWLEDGED: 'Reconocida',
  SNOOZED: 'Pospuesta',
  RESOLVED: 'Resuelta',
  DISMISSED: 'Descartada',
};

const NEXT_STATUSES: Record<string, string[]> = {
  OPEN: ['ACKNOWLEDGED', 'DISMISSED'],
  ACKNOWLEDGED: ['RESOLVED', 'SNOOZED'],
  SNOOZED: ['ACKNOWLEDGED', 'RESOLVED'],
  RESOLVED: [],
  DISMISSED: [],
};

export function AlertStatusControl({ alertId, status }: { alertId: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextStatuses = NEXT_STATUSES[status] ?? [];

  async function handleClick(nextStatus: string) {
    setPending(nextStatus);
    setError(null);
    try {
      await apiFetchClient(`/api/v1/alerts/${alertId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus }),
      });
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo actualizar la alerta');
    } finally {
      setPending(null);
    }
  }

  if (nextStatuses.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {nextStatuses.map((next) => (
          <button
            key={next}
            type="button"
            onClick={() => handleClick(next)}
            disabled={pending !== null}
            className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-neutral-700"
          >
            {pending === next ? 'Guardando...' : STATUS_LABEL[next]}
          </button>
        ))}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
