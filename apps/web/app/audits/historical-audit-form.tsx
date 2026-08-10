'use client';

import { useState } from 'react';
import { apiFetchClient } from '../lib/api-client';

type Result = { rowNumber: number; tariffCode: string; status: string; declaredDutyAmount: number; expectedDutyAmount: number | null; difference: number | null; reason: string; rateSourceVersion?: string };
type AuditResponse = { runId: string; summary: { total: number; potentialOverpayment: number; potentialUnderpayment: number; reviewRequired: number; noDifference: number }; results: Result[] };

const STATUS_LABEL: Record<string, string> = {
  POTENTIAL_OVERPAYMENT: 'Posible sobrepago',
  POTENTIAL_UNDERPAYMENT: 'Posible subpago',
  REVIEW_REQUIRED: 'Requiere revisión',
  NO_DIFFERENCE: 'Sin diferencia',
};

export function HistoricalAuditForm() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceVersion, setSourceVersion] = useState('audit-2026.1');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);

  async function submit() {
    if (!file) { setError('Selecciona un archivo CSV.'); return; }
    setPending(true); setError(null); setResult(null);
    try {
      const csv = await file.text();
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(csv));
      const sourceSha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const response = await apiFetchClient<AuditResponse>('/api/v1/historical-audits', {
        method: 'POST',
        body: JSON.stringify({ source_filename: file.name, source_sha256: sourceSha256, source_version: sourceVersion, csv }),
      });
      setResult(response);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo analizar el CSV.');
    } finally { setPending(false); }
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Archivo CSV
          <input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700" />
          <span className="text-xs text-neutral-500">Columnas mínimas: entry_date, tariff_code, country_of_origin, customs_value, declared_duty_amount.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Versión del expediente
          <input value={sourceVersion} onChange={(event) => setSourceVersion(event.target.value)} className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" />
          <span className="text-xs text-neutral-500">Identifica la fuente y el corte de datos que estás auditando.</span>
        </label>
      </div>
      <button type="button" onClick={submit} disabled={pending || !file} className="mt-5 rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Analizando…' : 'Analizar declaraciones'}
      </button>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {result ? (
        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-5">
            {Object.entries({ Total: result.summary.total, 'Posibles sobrepagos': result.summary.potentialOverpayment, 'Posibles subpagos': result.summary.potentialUnderpayment, 'Revisión': result.summary.reviewRequired, 'Sin diferencia': result.summary.noDifference }).map(([label, value]) => <div key={label} className="rounded border border-neutral-200 p-3 dark:border-neutral-700"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
          </div>
          <p className="mt-4 text-xs text-neutral-500">Corrida: {result.runId}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {result.results.map((item) => <li key={item.rowNumber} className="rounded border border-neutral-200 p-3 text-sm dark:border-neutral-700"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium">Fila {item.rowNumber} · {item.tariffCode}</span><span>{STATUS_LABEL[item.status] ?? item.status}</span></div><p className="mt-1 text-xs text-neutral-500">{item.reason}{item.rateSourceVersion ? ` Fuente: ${item.rateSourceVersion}.` : ''}</p></li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
