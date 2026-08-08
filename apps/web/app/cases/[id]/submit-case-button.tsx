'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchClient } from '../../lib/api-client';

export function SubmitCaseButton({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetchClient(`/api/v1/classification-cases/${caseId}/submit`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo enviar el caso a analisis');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="w-fit rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {submitting ? 'Enviando...' : 'Enviar a analisis'}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
