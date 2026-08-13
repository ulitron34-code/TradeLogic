import Link from 'next/link';
import { ClassifyStartForm } from './classify-start-form';

export default function ClassifyPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm font-medium text-blue-700 dark:text-blue-300">Centro de trabajo</Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Clasificar una mercancía</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Empieza con lenguaje normal. TradeLogic guardará la descripción operativa y preparará el expediente para evidencia, análisis, revisión y costo.
        </p>
      </div>
      <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <ClassifyStartForm />
      </section>
    </main>
  );
}
