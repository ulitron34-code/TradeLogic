'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type CaseItem = {
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

export function CaseInbox({ cases }: { cases: CaseItem[] }) {
  const [status, setStatus] = useState('ALL');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => cases.filter((item) => {
    const matchesStatus = status === 'ALL' || item.status === status;
    const haystack = `${item.product.name} ${item.product.sku ?? ''} ${item.id}`.toLowerCase();
    return matchesStatus && haystack.includes(query.trim().toLowerCase());
  }), [cases, query, status]);
  const statuses = Array.from(new Set(cases.map((item) => item.status)));

  return <section>
    <div className="mb-4 grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50 md:grid-cols-[1fr_220px_auto] md:items-end">
      <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Buscar expediente</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mercancía, SKU o folio" className="rounded border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" /></label>
      <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Estado</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"><option value="ALL">Todos</option>{statuses.map((value) => <option key={value} value={value}>{STATUS_LABEL[value] ?? value}</option>)}</select></label>
      <p className="text-sm text-neutral-500">{filtered.length} de {cases.length} expedientes</p>
    </div>
    {filtered.length === 0 ? <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">No hay expedientes que coincidan con estos filtros.</div> : <div className="grid gap-3">{filtered.map((item) => { const candidate = item.candidates[0]?.tariffCode; return <Link key={item.id} href={`/cases/${item.id}`} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-neutral-500">{item.product.name}</p><h2 className="mt-1 font-semibold">Expediente {item.id.slice(0, 8)}</h2></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{STATUS_LABEL[item.status] ?? item.status}</span></div><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600 dark:text-neutral-400"><span>Confianza: {item.confidence === null ? 'Pendiente' : `${Number(item.confidence).toFixed(0)}%`}</span><span>Fracción: {candidate ? `${candidate.code}${candidate.nico ? `/${candidate.nico}` : ''}` : 'Pendiente'}</span><span>Actualizado: {new Date(item.updatedAt).toLocaleDateString('es-MX')}</span></div></Link>; })}</div>}
  </section>;
}
