'use client';

import { createClient } from './supabase/client';
import { ApiError } from './api-error';

// Version de apiFetch (lib/api.ts) para Client Components: ese helper usa
// el cliente de Supabase para Server Components (next/headers), que no
// funciona en el navegador. La subida de evidencia necesita correr en el
// cliente porque calcula el sha256 con Web Crypto sobre el archivo elegido.
export async function apiFetchClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured');

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message ?? response.statusText, body.code);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
