import { createClient } from './supabase/server';

export class ApiError extends Error {
  status: number;
  code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Helper de fetch para Server Components / Server Actions: adjunta el JWT
// de la sesion de Supabase a cada llamada a la API. Para uso en Client
// Components, usar el cliente de supabase/client.ts directamente para
// obtener el token via supabase.auth.getSession().
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured');

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message ?? response.statusText, body.code);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
