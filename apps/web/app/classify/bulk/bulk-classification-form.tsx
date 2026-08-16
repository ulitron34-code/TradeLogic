'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetchClient } from '../../lib/api-client';

type BulkResponse = { source_filename: string; created: Array<{ rowNumber: number; productId: string; caseId: string }> };

export function BulkClassificationForm() {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResponse | null>(null);

  async function submit() {
    if (!file) return;
    setPending(true); setError(null); setResult(null);
    try {
      const csv = await file.text();
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(csv));
      const sourceSha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const response = await apiFetchClient<BulkResponse>('/api/v1/classification-cases/bulk', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ source_filename: file.name, source_sha256: sourceSha256, csv }) });
      setResult(response);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'No se pudo cargar el archivo.'); }
    finally { setPending(false); }
  }

  return <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><label className="flex flex-col gap-2 text-sm"><span className="font-medium">Archivo CSV</span><input type="file" accept=".csv,text/csv" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setResult(null); }} className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700" /><span className="text-xs text-neutral-500">El archivo se verifica con SHA-256 y no se publica ningún secreto.</span></label><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={submit} disabled={!file || pending} className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? 'Creando expedientes...' : 'Crear expedientes en borrador'}</button><Link href="/cases" className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">Ver expedientes</Link></div>{error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}{result ? <div className="mt-5 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100"><p className="font-semibold">Carga completada</p><p className="mt-1">Se crearon {result.created.length} expedientes en borrador desde {result.source_filename}.</p><Link href="/cases" className="mt-3 inline-block font-medium underline">Abrir bandeja</Link></div> : null}</div>;
}
