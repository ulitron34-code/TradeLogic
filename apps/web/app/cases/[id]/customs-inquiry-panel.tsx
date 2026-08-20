'use client';

import { useState } from 'react';

export function CustomsInquiryPanel({ caseId }: { caseId: string }) {
  const [inquiryType, setInquiryType] = useState<'ART_47_CONSULTA' | 'PAMA_DEFENSA'>('ART_47_CONSULTA');
  const [companyName, setCompanyName] = useState('Importadora y Logística S.A. de C.V.');
  const [rfc, setRfc] = useState('ILS1804128A1');
  const [representative, setRepresentative] = useState('Lic. Roberto Morales');
  const [address, setAddress] = useState('Av. Paseo de la Reforma 405, CDMX');
  const [loading, setLoading] = useState(false);
  const [documentGenerated, setDocumentGenerated] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_type: inquiryType,
          applicant: {
            company_name: companyName,
            rfc,
            legal_representative: representative,
            address,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Error al generar el escrito');
      }

      const json = await res.json();
      setDocumentGenerated(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            ⚖️ Generador de Escritos Legales (Art. 47 LA / Defensa PAMA)
          </h2>
          <p className="text-xs text-neutral-500">
            Genera automáticamente el memorial formal ante el SAT / ANAM fundamentado en el expediente probatorio.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInquiryType('ART_47_CONSULTA')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              inquiryType === 'ART_47_CONSULTA'
                ? 'bg-amber-700 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
            }`}
          >
            Consulta Art. 47 LA
          </button>
          <button
            type="button"
            onClick={() => setInquiryType('PAMA_DEFENSA')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              inquiryType === 'PAMA_DEFENSA'
                ? 'bg-red-700 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
            }`}
          >
            Defensa PAMA / Pruebas
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
        <div>
          <label className="font-medium text-neutral-700 dark:text-neutral-300">Razón Social Promovente</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="font-medium text-neutral-700 dark:text-neutral-300">R.F.C.</label>
          <input
            type="text"
            value={rfc}
            onChange={(e) => setRfc(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="font-medium text-neutral-700 dark:text-neutral-300">Representante Legal</label>
          <input
            type="text"
            value={representative}
            onChange={(e) => setRepresentative(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="font-medium text-neutral-700 dark:text-neutral-300">Domicilio Fiscal</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {loading ? 'Generando escrito procesal...' : `Redactar Escrito de ${inquiryType === 'ART_47_CONSULTA' ? 'Consulta Art. 47' : 'Defensa PAMA'}`}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {documentGenerated && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-xs font-mono dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300 font-sans">
            <strong>{documentGenerated.title}</strong>
            <span className="text-neutral-500">Reglas: {documentGenerated.rulesetVersion}</span>
          </div>
          <pre className="mt-3 whitespace-pre-wrap text-neutral-800 dark:text-neutral-200 max-h-64 overflow-y-auto">
            {documentGenerated.documentBody}
          </pre>
          <div className="mt-3 border-t border-neutral-200 pt-2 font-sans text-neutral-600 dark:text-neutral-400">
            <strong>Petitorios:</strong>
            <ul className="list-disc pl-4 mt-1">
              {documentGenerated.petitoryClauses.map((p: string, idx: number) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
