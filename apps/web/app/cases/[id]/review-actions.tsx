'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchClient } from '../../lib/api-client';

type Decision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

const DECISION_LABEL: Record<Decision, string> = {
  APPROVED: 'Aprobar',
  CHANGES_REQUESTED: 'Pedir cambios',
  REJECTED: 'Rechazar',
};

export function ReviewActions({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDecision(decision: Decision) {
    setPending(decision);
    setError(null);
    try {
      await apiFetchClient(`/api/v1/classification-cases/${caseId}/review`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ decision, ...(notes ? { notes } : {}) }),
      });
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo registrar la revision');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <label className="flex flex-col gap-1 text-sm">
        Notas (opcional)
        <textarea
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(DECISION_LABEL) as Decision[]).map((decision) => (
          <button
            key={decision}
            type="button"
            onClick={() => handleDecision(decision)}
            disabled={pending !== null}
            className="rounded border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            {pending === decision ? 'Guardando...' : DECISION_LABEL[decision]}
          </button>
        ))}
      </div>
    </div>
  );
}
