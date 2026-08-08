'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchClient } from '../../lib/api-client';

export function StartCaseButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      const classificationCase = await apiFetchClient<{ id: string }>('/api/v1/classification-cases', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ product_id: productId }),
      });
      router.push(`/cases/${classificationCase.id}`);
    } catch (submitError) {
      setSubmitting(false);
      setError(submitError instanceof Error ? submitError.message : 'No se pudo iniciar el caso');
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
        {submitting ? 'Iniciando...' : 'Iniciar caso de clasificacion'}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
