import Link from 'next/link';
import { BulkClassificationForm } from './bulk-classification-form';

export default function BulkClassifyPage() {
  return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><Link href="/classify" className="text-sm font-medium text-blue-700 dark:text-blue-300">Clasificación guiada</Link><h1 className="mt-2 text-3xl font-semibold tracking-tight">Carga masiva de mercancías</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">Carga hasta 200 mercancías para crear expedientes en borrador. Cada fila queda pendiente de revisión antes de enviarse al análisis.</p><section className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-100"><p className="font-semibold">Columnas mínimas</p><p className="mt-1">name, description</p><p className="mt-1 opacity-80">Opcionales: sku, origin_country, destination_country, material, main_function, presentation.</p></section><section className="mt-6"><BulkClassificationForm /></section></main>;
}
