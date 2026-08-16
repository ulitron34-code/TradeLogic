'use client';

import { useEffect, useState } from 'react';
import { apiFetchClient } from '../../lib/api-client';

type Person = { id: string; displayName: string; email: string };
type OrganizationMember = Person & { role: string };
type ReviewRequest = {
  id: string;
  status: 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  note: string | null;
  response: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  requestedBy: Person;
  assignee: Person | null;
};

const STATUS_LABEL: Record<ReviewRequest['status'], string> = {
  REQUESTED: 'Solicitada', IN_PROGRESS: 'En revisión', COMPLETED: 'Completada', CANCELLED: 'Cancelada',
};

export function ReviewRequestsPanel({ caseId, members, canAssign }: { caseId: string; members: OrganizationMember[]; canAssign: boolean }) {
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await apiFetchClient<{ data: ReviewRequest[] }>(`/api/v1/classification-cases/${caseId}/review-requests`);
      setRequests(result.data); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las solicitudes.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [caseId]);

  async function update(request: ReviewRequest, changes: { status?: ReviewRequest['status']; assignee_id?: string | null }) {
    try {
      await apiFetchClient(`/api/v1/classification-case-review-requests/${request.id}`, { method: 'PATCH', body: JSON.stringify(changes) });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la solicitud.'); }
  }

  return <section className="mt-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Solicitudes de revisión</h2><p className="mt-1 text-xs text-neutral-500">Seguimiento trazable de quién pidió la revisión y qué ocurrió después.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700">{loading ? 'Actualizando…' : 'Actualizar'}</button></div>
    {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    {!loading && requests.length === 0 ? <p className="mt-3 text-xs text-neutral-500">Todavía no hay solicitudes registradas.</p> : null}
    {requests.length > 0 ? <ul className="mt-3 grid gap-2">{requests.map(request => <li key={request.id} className="rounded-lg bg-neutral-50 p-3 text-xs dark:bg-neutral-950">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{STATUS_LABEL[request.status]}</span><select value={request.status} onChange={event => void update(request, { status: event.target.value as ReviewRequest['status'] })} className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"><option value="REQUESTED">Solicitada</option><option value="IN_PROGRESS">En revisión</option><option value="COMPLETED">Completada</option><option value="CANCELLED">Cancelada</option></select></div>
      <p className="mt-1 text-neutral-600 dark:text-neutral-400">Solicitó: {request.requestedBy.displayName} · {new Date(request.requestedAt).toLocaleString('es-MX')}</p>
      {canAssign ? <select value={request.assignee?.id ?? ''} onChange={event => void update(request, { assignee_id: event.target.value || null })} className="mt-2 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"><option value="">Sin responsable</option>{members.map(member => <option key={member.id} value={member.id}>{member.displayName} · {member.role}</option>)}</select> : request.assignee ? <p className="mt-1 text-neutral-600 dark:text-neutral-400">Responsable: {request.assignee.displayName}</p> : null}
      {request.note ? <p className="mt-2">Nota: {request.note}</p> : null}{request.response ? <p className="mt-1">Respuesta: {request.response}</p> : null}
    </li>)}</ul> : null}
  </section>;
}
