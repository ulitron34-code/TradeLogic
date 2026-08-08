'use client';

import { useRef, useState } from 'react';
import { apiFetchClient } from '../../lib/api-client';

type Document = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sourceType: string;
  createdAt: string;
};

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function EvidenceUploader({
  productVersionId,
  initialDocuments,
}: {
  productVersionId: string;
  initialDocuments: Document[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setErrorMessage(null);

    try {
      const sha256 = await sha256Hex(file);

      const presigned = await apiFetchClient<{ upload_url: string; storage_key: string }>(
        '/api/v1/documents/presign',
        {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, mimeType: file.type || 'application/octet-stream' }),
        },
      );

      const uploadResponse = await fetch(presigned.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error(`Upload to storage failed (${uploadResponse.status})`);

      const document = await apiFetchClient<Document>('/api/v1/documents', {
        method: 'POST',
        body: JSON.stringify({
          storage_key: presigned.storage_key,
          filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          sha256,
          source_type: 'PRODUCT_EVIDENCE',
          product_version_id: productVersionId,
        }),
      });

      setDocuments((current) => [document, ...current]);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo subir el archivo');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileChange}
          disabled={status === 'uploading'}
          className="text-sm"
        />
        {status === 'uploading' ? <span className="text-sm text-neutral-500">Subiendo...</span> : null}
      </div>
      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
      {documents.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavia no hay evidencia subida.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {documents.map((document) => (
            <li key={document.id} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
              {document.filename}
              <span className="ml-2 text-neutral-500">{Math.ceil(document.sizeBytes / 1024)} KB</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
