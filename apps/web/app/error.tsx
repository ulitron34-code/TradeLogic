'use client';

import { useEffect } from 'react';

export default function GlobalAppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('TradeLogic render error', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-10">
      <p className="text-sm font-medium text-amber-700">TradeLogic</p>
      <h1 className="mt-2 text-2xl font-semibold">No pudimos cargar esta sección</h1>
      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
        Puede ser un despertar temporal de la API o una sesión que necesita actualizarse. Intenta nuevamente; tus datos no se han eliminado.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => reset()} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
          Intentar de nuevo
        </button>
        <a href="/dashboard" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
          Ir al inicio
        </a>
        <a href="/login" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
          Volver al login
        </a>
      </div>
      {error.digest ? <p className="mt-6 text-xs text-neutral-400">Referencia: {error.digest}</p> : null}
    </main>
  );
}
