import Link from 'next/link';
import { apiFetch } from '../lib/api';

type CaseItem = {
  id: string;
  status: string;
  confidence: number | string | null;
  updatedAt: string;
  product: { id: string; name: string; sku: string | null };
  candidates: Array<{ tariffCode: { code: string; nico: string | null } }>;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador', INTAKE: 'En cola', IN_ANALYSIS: 'En análisis', NEEDS_INFORMATION: 'Necesita información',
  NEEDS_REVIEW: 'Necesita revisión', APPROVED: 'Aprobado', REJECTED: 'Rechazado', SUPERSEDED: 'Reemplazado', ARCHIVED: 'Archivado',
};

export default async function CasesPage() {
  const cases = await loadCases();
  if (cases === null) return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><h1 className="text-3xl font-semibold tracking-tight">Expedientes</h1><div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-medium">La API todavía no está disponible.</p><p className="mt-1">Recarga en unos segundos para volver a consultar tus expedientes.</p></div></main>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-medium text-blue-700 dark:text-blue-300">Trabajo operativo</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Expedientes</h1><p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">Cada expediente reúne clasificación, evidencia, jurisprudencia, requisitos, costo y revisión.</p></div>
        <Link href="/classify" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">Nueva clasificación</Link>
      </div>
      {cases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700"><h2 className="font-semibold">Todavía no hay expedientes</h2><p className="mt-2 text-sm text-neutral-500">Describe una mercancía y una operación para abrir el primero.</p><Link href="/classify" className="mt-4 inline-flex rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">Clasificar una mercancía</Link></div>
      ) : (
        <div className="grid gap-3">{cases.map((item) => { const candidate = item.candidates[0]?.tariffCode; return <Link key={item.id} href={`/cases/${item.id}`} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-neutral-500">{item.product.name}</p><h2 className="mt-1 font-semibold">Expediente {item.id.slice(0, 8)}</h2></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{STATUS_LABEL[item.status] ?? item.status}</span></div><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600 dark:text-neutral-400"><span>Confianza: {item.confidence === null ? 'Pendiente' : `${Number(item.confidence).toFixed(0)}%`}</span><span>Fracción: {candidate ? `${candidate.code}${candidate.nico ? `/${candidate.nico}` : ''}` : 'Pendiente'}</span><span>Actualizado: {new Date(item.updatedAt).toLocaleDateString('es-MX')}</span></div></Link>; })}</div>
      )}
    </main>
  );
}

async function loadCases(): Promise<CaseItem[] | null> { try { const { data } = await apiFetch<{ data: CaseItem[] }>('/api/v1/classification-cases'); return data; } catch { return null; } }