import { apiFetch } from '../lib/api';
import { AlertStatusControl } from './alert-status-control';

type Alert = {
  id: string;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  status: string;
  title: string;
  summary: string;
  createdAt: string;
};

const SEVERITY_STYLE: Record<Alert['severity'], string> = {
  INFO: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  WARNING: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierta',
  ACKNOWLEDGED: 'Reconocida',
  SNOOZED: 'Pospuesta',
  RESOLVED: 'Resuelta',
  DISMISSED: 'Descartada',
};

export default async function AlertsPage() {
  const alerts = await loadAlerts();

  if (alerts === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-3 text-xl font-semibold">Alertas</h1>
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">La API todavía no está disponible.</p>
          <p className="mt-1">Recarga en unos segundos para volver a consultar tus alertas.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-xl font-semibold">Alertas</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Generadas automáticamente cuando una publicación del Diario Oficial menciona una fracción arancelaria que ya usa alguno de tus casos aprobados.
      </p>
      {alerts.length === 0 ? (
        <p className="text-sm text-neutral-500">No hay alertas todavía.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <li key={alert.id} className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLE[alert.severity]}`}>
                    {alert.severity}
                  </span>
                  <span className="text-xs text-neutral-500">{STATUS_LABEL[alert.status] ?? alert.status}</span>
                </div>
                <AlertStatusControl alertId={alert.id} status={alert.status} />
              </div>
              <p className="font-medium">{alert.title}</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{alert.summary}</p>
              <p className="mt-2 text-xs text-neutral-400">{new Date(alert.createdAt).toLocaleString('es-MX')}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

async function loadAlerts(): Promise<Alert[] | null> {
  try {
    const { data } = await apiFetch<{ data: Alert[] }>('/api/v1/alerts');
    return data;
  } catch {
    return null;
  }
}
