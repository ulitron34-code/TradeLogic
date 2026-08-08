'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchClient } from '../lib/api-client';

export function CreateProductForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const product = await apiFetchClient<{ id: string }>('/api/v1/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          ...(sku ? { sku } : {}),
          description,
        }),
      });
      router.push(`/products/${product.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear el producto');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
      >
        Nuevo producto
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3 rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        SKU (opcional)
        <input
          value={sku}
          onChange={(event) => setSku(event.target.value)}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Descripcion
        <textarea
          required
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {submitting ? 'Creando...' : 'Crear'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
