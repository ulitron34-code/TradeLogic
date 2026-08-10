'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

export function DossierDownloadButton({ caseId }: { caseId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!baseUrl) throw new Error('NEXT_PUBLIC_API_BASE_URL no está configurado');
      const response = await fetch(`${baseUrl}/api/v1/classification-cases/${caseId}/dossier.pdf`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (!response.ok) throw new Error('No se pudo generar el expediente PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `tradelogic-${caseId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'No se pudo descargar el expediente');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={download} disabled={pending} className="rounded border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-neutral-700">
        {pending ? 'Generando expediente...' : 'Descargar expediente PDF'}
      </button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
