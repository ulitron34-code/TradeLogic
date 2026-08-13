'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchClient } from '../../lib/api-client';

type CaseActionButtonProps = {
  caseId: string;
  endpoint: 'submit' | 'requeue';
  idleLabel: string;
  pendingLabel: string;
  errorLabel: string;
  variant?: 'primary' | 'secondary';
};

function CaseActionButton({ caseId, endpoint, idleLabel, pendingLabel, errorLabel, variant = 'primary' }: CaseActionButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetchClient(`/api/v1/classification-cases/${caseId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({}),
      });
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : errorLabel);
    } finally {
      setSubmitting(false);
    }
  }

  const className = variant === 'primary'
    ? 'w-fit rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900'
    : 'w-fit rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100';

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={handleClick} disabled={submitting} className={className}>
        {submitting ? pendingLabel : idleLabel}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function SubmitCaseButton({ caseId }: { caseId: string }) {
  return (
    <CaseActionButton
      caseId={caseId}
      endpoint="submit"
      idleLabel="Enviar a analisis"
      pendingLabel="Enviando..."
      errorLabel="No se pudo enviar el caso a analisis"
    />
  );
}

export function RequeueCaseButton({ caseId }: { caseId: string }) {
  return (
    <CaseActionButton
      caseId={caseId}
      endpoint="requeue"
      idleLabel="Reintentar cola"
      pendingLabel="Reintentando..."
      errorLabel="No se pudo reintentar la cola"
      variant="secondary"
    />
  );
}
