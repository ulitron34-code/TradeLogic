'use client';

import { useState } from 'react';
import { apiFetchClient } from '../../lib/api-client';

export function RequestReviewButton({ caseId }: { caseId: string }) {
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function requestReview() {
    setPending(true); setMessage(null);
    try { await apiFetchClient(`/api/v1/classification-cases/${caseId}/request-review`, { method: 'POST', body: JSON.stringify({ note: note.trim() || undefined }) }); setMessage('Solicitud enviada al equipo revisor.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo solicitar la revisión.'); } finally { setPending(false); }
  }

  return <div className="mt-3"><button type="button" onClick={() => setOpen((value) => !value)} className="rounded border border-blue-300 px-3 py-2 text-sm font-medium text-blue-800 dark:border-blue-800 dark:text-blue-200">Solicitar revisión colaborativa</button>{open ? <div className="mt-3 grid gap-2"><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Indica qué debe revisar el equipo..." className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950" /><button type="button" onClick={requestReview} disabled={pending} className="w-fit rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? 'Enviando...' : 'Enviar solicitud'}</button></div> : null}{message ? <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{message}</p> : null}</div>;
}
