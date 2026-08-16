'use client';

import { useState } from 'react';
import { apiFetchClient } from '../../lib/api-client';

type Member = { id: string; email: string; displayName: string; role: string };
type Assignment = { id: string; status: string; note: string | null; dueAt: string | null; assignee: { id: string; email: string; displayName: string } };

export function AssignmentsPanel({ caseId, members, canAssign }: { caseId: string; members: Member[]; canAssign: boolean }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assigneeId, setAssigneeId] = useState(members[0]?.id ?? '');
  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadAssignments() {
    const response = await apiFetchClient<{ data: Assignment[] }>(`/api/v1/classification-cases/${caseId}/assignments`);
    setAssignments(response.data);
  }

  async function createAssignment() {
    if (!assigneeId) return;
    setLoading(true); setMessage(null);
    try {
      await apiFetchClient(`/api/v1/classification-cases/${caseId}/assignments`, { method: 'POST', body: JSON.stringify({ assignee_id: assigneeId, ...(dueAt ? { due_at: new Date(dueAt).toISOString() } : {}), ...(note.trim() ? { note: note.trim() } : {}) }) });
      setNote(''); setDueAt(''); await loadAssignments(); setMessage('Revisión asignada.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo asignar la revisión.'); }
    finally { setLoading(false); }
  }

  async function updateAssignment(assignment: Assignment, status: string) {
    setLoading(true); setMessage(null);
    try { await apiFetchClient(`/api/v1/classification-case-assignments/${assignment.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await loadAssignments(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo actualizar la asignación.'); }
    finally { setLoading(false); }
  }

  return <section className="mt-4 rounded border border-blue-200 bg-white/70 p-3 dark:border-blue-900 dark:bg-black/10">
    <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Seguimiento de revisión</h3><p className="text-xs text-neutral-500">Asigna responsable, fecha y estado sin salir del expediente.</p></div><button type="button" onClick={() => void loadAssignments()} className="text-xs underline">Actualizar</button></div>
    {canAssign ? <div className="mt-3 grid gap-2 sm:grid-cols-3"><select value={assigneeId} onChange={event => setAssigneeId(event.target.value)} className="rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"><option value="">Responsable...</option>{members.map(member => <option key={member.id} value={member.id}>{member.displayName} · {member.role}</option>)}</select><input type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} className="rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950" /><input value={note} onChange={event => setNote(event.target.value)} placeholder="Nota para el revisor" className="rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950" /><button type="button" disabled={loading || !assigneeId} onClick={() => void createAssignment()} className="w-fit rounded bg-blue-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">Asignar revisión</button></div> : null}
    {assignments.length > 0 ? <ul className="mt-3 flex flex-col gap-2">{assignments.map(assignment => <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-neutral-50 p-2 text-xs dark:bg-neutral-950"><span><strong>{assignment.assignee.displayName}</strong> · {assignment.status}{assignment.dueAt ? ` · vence ${new Date(assignment.dueAt).toLocaleString('es-MX')}` : ''}{assignment.note ? ` · ${assignment.note}` : ''}</span><select value={assignment.status} disabled={loading} onChange={event => void updateAssignment(assignment, event.target.value)} className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"><option>ASSIGNED</option><option>IN_PROGRESS</option><option>COMPLETED</option><option>CANCELLED</option></select></li>)}</ul> : <p className="mt-3 text-xs text-neutral-500">No hay asignaciones cargadas. Pulsa “Actualizar” para consultar el seguimiento.</p>}
    {message ? <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">{message}</p> : null}
  </section>;
}
