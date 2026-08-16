import Link from 'next/link';
import { ClassifyStartForm } from './classify-start-form';

export default function ClassifyPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm font-medium text-blue-700 dark:text-blue-300">Centro de trabajo</Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Clasificar una mercancía</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Empieza con lenguaje normal. El asistente crea la mercancía interna, abre el caso de clasificación y conserva preguntas pendientes para revisión.
        </p>
      </div>
      <section className="mb-6 grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-950 md:grid-cols-4">
        <div>
          <p className="font-semibold">1. Intención</p>
          <p className="mt-1 text-neutral-500">Importar, exportar o consultar.</p>
        </div>
        <div>
          <p className="font-semibold">2. Mercancía</p>
          <p className="mt-1 text-neutral-500">Descripción, origen y uso.</p>
        </div>
        <div>
          <p className="font-semibold">3. Preguntas</p>
          <p className="mt-1 text-neutral-500">Material, función y conjunto.</p>
        </div>
        <div>
          <p className="font-semibold">4. Caso</p>
          <p className="mt-1 text-neutral-500">Expediente listo para análisis.</p>
        </div>
      </section>
      <section className="mb-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-100">
          <p className="font-semibold">¿Qué obtendrás?</p>
          <p className="mt-1 opacity-80">Un expediente con candidatos de fracción, fundamento, regulaciones, tratados, costos, jurisprudencia relacionada y pendientes.</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-950">
          <p className="font-semibold">Responde con lo que tengas</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">Si falta material, origen o evidencia, el sistema lo marcará como pendiente para no inventar una conclusión.</p>
        </div>
      </section>
      <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <ClassifyStartForm />
      </section>
    </main>
  );
}