import { HistoricalAuditForm } from './historical-audit-form';

export default function HistoricalAuditsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Herramienta de recuperación</p>
      <h1 className="mt-1 text-2xl font-semibold">Auditoría histórica</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
        Carga declaraciones históricas para comparar el arancel declarado contra el catálogo vigente con fuente y versión. Los resultados son indicadores para revisión profesional, no una reclamación automática.
      </p>
      <div className="mt-8">
        <HistoricalAuditForm />
      </div>
    </main>
  );
}
