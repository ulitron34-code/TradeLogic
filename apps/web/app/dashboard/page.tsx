import Link from 'next/link';
import { apiFetch } from '../lib/api';

type Product = { id: string; name: string; sku: string | null; status: string };
type Alert = { id: string; severity: string; status: string; title: string; summary: string };
type CaseItem = { id: string; status: string };

async function loadDashboard() {
  const [productsResult, alertsResult, casesResult] = await Promise.allSettled([
    apiFetch<{ data: Product[] }>('/api/v1/products'),
    apiFetch<{ data: Alert[] }>('/api/v1/alerts'),
    apiFetch<{ data: CaseItem[] }>('/api/v1/classification-cases'),
  ]);

  return {
    products: productsResult.status === 'fulfilled' ? productsResult.value.data : [],
    alerts: alertsResult.status === 'fulfilled' ? alertsResult.value.data : [],
    cases: casesResult.status === 'fulfilled' ? casesResult.value.data : [],
    apiUnavailable: productsResult.status === 'rejected' && alertsResult.status === 'rejected' && casesResult.status === 'rejected',
  };
}

export default async function DashboardPage() {
  const { products, alerts, cases, apiUnavailable } = await loadDashboard();
  const openAlerts = alerts.filter((alert) => !['RESOLVED', 'DISMISSED'].includes(alert.status));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Centro de trabajo</p>
        <h1 className="text-3xl font-semibold tracking-tight">Tu operación aduanera, en un solo lugar</h1>
        <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Revisa productos, prepara expedientes, carga evidencia y atiende alertas regulatorias desde el contexto de cada operación.
        </p>
      </div>

      {apiUnavailable ? (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          La API está despertando o no responde todavía. Puedes recargar en unos segundos; la navegación seguirá disponible.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Link href="/products" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">Productos</p>
          <p className="mt-2 text-3xl font-semibold">{products.length}</p>
          <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">Ver y gestionar catálogo →</p>
        </Link>
        <Link href="/alerts" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">Alertas activas</p>
          <p className="mt-2 text-3xl font-semibold">{openAlerts.length}</p>
          <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">Revisar cambios regulatorios →</p>
        </Link>
        <Link href="/cases" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">Casos</p>
          <p className="mt-2 text-3xl font-semibold">{cases.length}</p>
          <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">Ver expedientes →</p>
        </Link>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Acciones principales</h2>
            <p className="text-sm text-neutral-500">La plataforma te guía por el siguiente trabajo útil.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/products" className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
            <p className="font-medium">1. Organiza productos</p>
            <p className="mt-1 text-sm text-neutral-500">Registra nombre, SKU y descripción operativa.</p>
          </Link>
          <Link href="/products" className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
            <p className="font-medium">2. Prepara evidencia</p>
            <p className="mt-1 text-sm text-neutral-500">Carga documentos desde el detalle de cada producto.</p>
          </Link>
          <Link href="/cases" className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
            <p className="font-medium">3. Da seguimiento a casos</p>
            <p className="mt-1 text-sm text-neutral-500">Revisa clasificación, confianza y costo de importación.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
