'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-MX">
      <body className="bg-white text-neutral-900">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4">
          <h1 className="text-xl font-semibold">No se pudo cargar TradeLogic</h1>
          <p className="text-sm text-neutral-600">
            El servicio de aplicación o su base de datos no respondió correctamente. Espera unos segundos y vuelve a intentarlo.
          </p>
          <button type="button" onClick={() => reset()} className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
