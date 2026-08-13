'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchClient } from '../lib/api-client';

const intentOptions = [
  'Importar a México',
  'Exportar desde México',
  'Consultar clasificación',
  'Revisar operación histórica',
];

export function ClassifyStartForm() {
  const router = useRouter();
  const [intent, setIntent] = useState(intentOptions[0]);
  const [description, setDescription] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [departureCountry, setDepartureCountry] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('México');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const productName = useMemo(() => {
    const firstLine = description.trim().split('\n')[0]?.slice(0, 80).trim();
    return firstLine || 'Mercancía por clasificar';
  }, [description]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const operationalDescription = [
      `Intención: ${intent}`,
      originCountry ? `País de origen: ${originCountry}` : null,
      departureCountry ? `País de procedencia: ${departureCountry}` : null,
      destinationCountry ? `País destino: ${destinationCountry}` : null,
      value ? `Valor declarado: ${value} ${currency}` : null,
      reference ? `Referencia interna: ${reference}` : null,
      '',
      'Descripción libre:',
      description,
    ].filter(Boolean).join('\n');

    try {
      const product = await apiFetchClient<{ id: string }>('/api/v1/products', {
        method: 'POST',
        body: JSON.stringify({
          name: productName,
          ...(reference ? { sku: reference } : {}),
          description: operationalDescription,
        }),
      });
      router.push(`/products/${product.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo iniciar la clasificación');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold">1. ¿Qué quieres hacer?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {intentOptions.map((option) => (
            <label key={option} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
              <input type="radio" name="intent" checked={intent === option} onChange={() => setIntent(option)} />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      <section className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          País de origen
          <input value={originCountry} onChange={(event) => setOriginCountry(event.target.value)} placeholder="Ej. China" className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          País de procedencia
          <input value={departureCountry} onChange={(event) => setDepartureCountry(event.target.value)} placeholder="Ej. Estados Unidos" className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          País destino
          <input value={destinationCountry} onChange={(event) => setDestinationCountry(event.target.value)} className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        </label>
      </section>

      <label className="flex flex-col gap-1 text-sm">
        Describe la mercancía
        <textarea
          required
          rows={7}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ej. Combo de balón de básquetbol iluminado, aro y malla en un solo empaque..."
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <span className="text-xs text-neutral-500">Incluye material, función, presentación, marca/modelo o documentos disponibles si los conoces.</span>
      </label>

      <section className="grid gap-4 md:grid-cols-[1fr_0.5fr_1fr]">
        <label className="flex flex-col gap-1 text-sm">
          Valor opcional
          <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ej. 12500" className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Moneda
          <select value={currency} onChange={(event) => setCurrency(event.target.value)} className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
            <option>USD</option>
            <option>MXN</option>
            <option>EUR</option>
            <option>CAD</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Referencia interna opcional
          <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="SKU, factura, PO o folio" className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        </label>
      </section>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-100">
        Al continuar se crea la mercancía interna y se abre su expediente. Desde ahí podrás cargar evidencia y abrir el caso de clasificación.
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={submitting} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {submitting ? 'Iniciando...' : 'Iniciar clasificación'}
        </button>
        <button type="button" onClick={() => router.push('/dashboard')} className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}
