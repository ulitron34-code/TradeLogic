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

const presentationOptions = ['Pieza individual', 'Kit o combo', 'Parte o refacción', 'Materia prima', 'No lo sé todavía'];
const yesNoOptions = ['Sí', 'No', 'No lo sé'];

function makeIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `classify-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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
  const [material, setMaterial] = useState('');
  const [mainFunction, setMainFunction] = useState('');
  const [presentation, setPresentation] = useState(presentationOptions[0]);
  const [components, setComponents] = useState('');
  const [essentialCharacter, setEssentialCharacter] = useState('');
  const [electricFeature, setElectricFeature] = useState(yesNoOptions[2]);
  const [regulatedUse, setRegulatedUse] = useState('');
  const [availableDocuments, setAvailableDocuments] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const productName = useMemo(() => {
    const firstLine = description.trim().split('\n')[0]?.slice(0, 80).trim();
    return firstLine || 'Mercancía por clasificar';
  }, [description]);

  const isKitOrCombo = presentation === 'Kit o combo' || /\b(combo|kit|conjunto|set|paquete)\b/i.test(description);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const attributes = {
      intakeVersion: 'classify-assistant-v1',
      intent,
      originCountry: originCountry || null,
      departureCountry: departureCountry || null,
      destinationCountry: destinationCountry || null,
      declaredValue: value || null,
      currency,
      reference: reference || null,
      material: material || null,
      mainFunction: mainFunction || null,
      presentation,
      components: components || null,
      essentialCharacter: essentialCharacter || null,
      electricFeature,
      regulatedUse: regulatedUse || null,
      availableDocuments: availableDocuments || null,
      needsCompositeGoodsReview: isKitOrCombo,
    };

    const operationalDescription = [
      `Intención: ${intent}`,
      originCountry ? `País de origen: ${originCountry}` : null,
      departureCountry ? `País de procedencia: ${departureCountry}` : null,
      destinationCountry ? `País destino: ${destinationCountry}` : null,
      value ? `Valor declarado: ${value} ${currency}` : null,
      reference ? `Referencia interna: ${reference}` : null,
      material ? `Material/composición: ${material}` : null,
      mainFunction ? `Función principal: ${mainFunction}` : null,
      `Presentación: ${presentation}`,
      components ? `Componentes: ${components}` : null,
      essentialCharacter ? `Carácter esencial indicado: ${essentialCharacter}` : null,
      `Electricidad, batería, radiofrecuencia o iluminación: ${electricFeature}`,
      regulatedUse ? `Uso regulado posible: ${regulatedUse}` : null,
      availableDocuments ? `Documentos disponibles: ${availableDocuments}` : null,
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
          attributes,
        }),
      });

      const classificationCase = await apiFetchClient<{ id: string }>('/api/v1/classification-cases', {
        method: 'POST',
        headers: { 'Idempotency-Key': makeIdempotencyKey() },
        body: JSON.stringify({
          product_id: product.id,
          assumptions: {
            createdFrom: 'classify-assistant-v1',
            intake: attributes,
            pendingQuestions: buildPendingQuestions(attributes),
          },
        }),
      });

      router.push(`/cases/${classificationCase.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo iniciar la clasificación');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-2 sm:grid-cols-4" aria-label="Avance de clasificación">
        {['Intención', 'Mercancía', 'Preguntas', 'Revisión'].map((label, index) => {
          const itemStep = index + 1;
          const active = itemStep === step;
          const complete = itemStep < step;
          return (
            <button
              key={label}
              type="button"
              onClick={() => itemStep <= step && setStep(itemStep)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                active
                  ? 'border-blue-700 bg-blue-50 text-blue-950 dark:border-blue-400 dark:bg-blue-950/30 dark:text-blue-50'
                  : complete
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100'
                    : 'border-neutral-200 text-neutral-500 dark:border-neutral-800'
              }`}
            >
              <span className="font-semibold">{itemStep}. {label}</span>
              <span className="mt-1 block text-xs opacity-75">{active ? 'Paso actual' : complete ? 'Completo' : 'Pendiente'}</span>
            </button>
          );
        })}
      </div>

      {step === 1 ? (
        <>
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
        2. Describe la mercancía
        <textarea
          required
          rows={6}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ej. Combo de balón de básquetbol iluminado, aro y malla en un solo empaque..."
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <span className="text-xs text-neutral-500">Incluye nombre común, uso, componentes, marca/modelo o datos de factura si los tienes.</span>
      </label>
        </>
      ) : null}

      {step === 2 ? (
        <>
      <section className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Material o composición
          <textarea rows={3} value={material} onChange={(event) => setMaterial(event.target.value)} placeholder="Ej. caucho, plástico, acero, textil, electrónica..." className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
          <span className="text-xs text-neutral-500">Ayuda a distinguir capítulos, notas legales y posibles NOM.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Función principal
          <textarea rows={3} value={mainFunction} onChange={(event) => setMainFunction(event.target.value)} placeholder="Ej. uso deportivo, iluminación decorativa, medición, alimento, refacción..." className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
          <span className="text-xs text-neutral-500">Sirve para separar mercancías similares con distinto uso.</span>
        </label>
      </section>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold">3. Presentación</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {presentationOptions.map((option) => (
            <label key={option} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
              <input type="radio" name="presentation" checked={presentation === option} onChange={() => setPresentation(option)} />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      {isKitOrCombo ? (
        <section className="grid gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="font-semibold">Posible conjunto compuesto</h2>
            <p className="mt-1 text-sm opacity-80">El sistema necesita separar componentes y carácter esencial antes de proponer una fracción defendible.</p>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Componentes incluidos
            <textarea rows={3} value={components} onChange={(event) => setComponents(event.target.value)} placeholder="Ej. balón, aro, malla, luces LED, baterías..." className="rounded border border-amber-300 px-3 py-2 text-neutral-950 dark:border-amber-800 dark:bg-neutral-950 dark:text-neutral-100" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Componente que da carácter esencial
            <textarea rows={3} value={essentialCharacter} onChange={(event) => setEssentialCharacter(event.target.value)} placeholder="Ej. el balón por uso deportivo; la luz es accesoria..." className="rounded border border-amber-300 px-3 py-2 text-neutral-950 dark:border-amber-800 dark:bg-neutral-950 dark:text-neutral-100" />
          </label>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <fieldset className="grid gap-2 text-sm">
          <legend className="font-semibold">¿Tiene electricidad, batería, radiofrecuencia o iluminación?</legend>
          {yesNoOptions.map((option) => (
            <label key={option} className="flex items-center gap-2 rounded border border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <input type="radio" name="electricFeature" checked={electricFeature === option} onChange={() => setElectricFeature(option)} />
              {option}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Uso que podría activar regulación
          <textarea rows={4} value={regulatedUse} onChange={(event) => setRegulatedUse(event.target.value)} placeholder="Ej. médico, alimenticio, animal, químico, eléctrico, infantil, seguridad, telecom..." className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
          <span className="text-xs text-neutral-500">Si no sabes, déjalo abierto; quedará como pregunta pendiente.</span>
        </label>
      </section>
        </>
      ) : null}

      {step === 3 ? (
        <>
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

      <label className="flex flex-col gap-1 text-sm">
        Documentos disponibles o faltantes
        <textarea rows={3} value={availableDocuments} onChange={(event) => setAvailableDocuments(event.target.value)} placeholder="Ej. factura, ficha técnica, foto, catálogo, certificado de origen; falta packing list..." className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
      </label>
        </>
      ) : null}

      {step === 4 ? (
        <>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-100">
        Revisa los datos capturados. Al continuar se crea la mercancía interna y el caso de clasificación. Las respuestas quedan como supuestos y pendientes para revisión.
      </div>

      <div className="grid gap-3 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800 sm:grid-cols-2">
        <div><span className="text-neutral-500">Intención:</span> {intent}</div>
        <div><span className="text-neutral-500">Destino:</span> {destinationCountry || 'Pendiente'}</div>
        <div className="sm:col-span-2"><span className="text-neutral-500">Mercancía:</span> {productName}</div>
        <div><span className="text-neutral-500">Presentación:</span> {presentation}</div>
        <div><span className="text-neutral-500">Origen:</span> {originCountry || 'Pendiente'}</div>
        <div className="sm:col-span-2"><span className="text-neutral-500">Datos críticos:</span> {material || mainFunction || components ? 'Capturados para revisión' : 'Faltan datos técnicos; quedarán como pendientes'}</div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {step > 1 ? (
          <button type="button" onClick={() => setStep((current) => current - 1)} className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
            Atrás
          </button>
        ) : null}
        {step < 4 ? (
          <button type="button" onClick={() => setStep((current) => current + 1)} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
            Continuar
          </button>
        ) : null}
        {step === 4 ? (
        <button type="submit" disabled={submitting} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {submitting ? 'Creando caso...' : 'Crear caso de clasificación'}
        </button>
        ) : null}
        <button type="button" onClick={() => router.push('/dashboard')} className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function buildPendingQuestions(attributes: Record<string, unknown>) {
  const pending: string[] = [];
  if (!attributes.material) pending.push('Confirmar material y composición de la mercancía.');
  if (!attributes.mainFunction) pending.push('Confirmar función principal y uso comercial.');
  if (attributes.needsCompositeGoodsReview && !attributes.essentialCharacter) pending.push('Definir carácter esencial del kit o conjunto.');
  if (attributes.electricFeature === 'No lo sé') pending.push('Confirmar si contiene electricidad, batería, radiofrecuencia o iluminación.');
  if (!attributes.availableDocuments) pending.push('Cargar o identificar factura, ficha técnica, imagen o catálogo disponible.');
  if (!attributes.originCountry) pending.push('Confirmar país de origen para tratados y restricciones.');
  return pending;
}
