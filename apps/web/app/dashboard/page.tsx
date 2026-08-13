import Link from 'next/link';
import { apiFetch } from '../lib/api';

type Product = { id: string; name: string; sku: string | null; status: string; updatedAt?: string };
type Alert = { id: string; severity: string; status: string; title: string; summary: string };
type CaseItem = { id: string; status: string };
type TariffCatalogStatus = {
  status: 'ok' | 'incomplete';
  expectedRows: number;
  rows: number;
  currentRows: number;
  sourceVersions: Record<string, number>;
  checks: Array<{ name: string; status: 'ok' | 'fail' }>;
};

type WorkTask = {
  title: string;
  detail: string;
  href: string;
  action: string;
  tone: 'blue' | 'amber' | 'emerald' | 'neutral';
};

const primaryActions = [
  {
    title: 'Clasificar una mercancía',
    detail: 'Describe lo que quieres importar o exportar; TradeLogic abre la ficha interna y prepara el expediente.',
    href: '/classify',
    primary: true,
  },
  {
    title: 'Revisar permisos y regulaciones',
    detail: 'Consulta alertas y requisitos ligados a fracciones usadas en tus operaciones.',
    href: '/alerts',
  },
  {
    title: 'Calcular costo de importación',
    detail: 'Abre un caso y estima IGI, IVA, DTA, tipo de cambio y escenarios con supuestos visibles.',
    href: '/cases',
  },
  {
    title: 'Validar antes del embarque',
    detail: 'Reúne factura, ficha técnica y evidencia para detectar faltantes antes de mover mercancía.',
    href: '/products',
  },
  {
    title: 'Auditar operaciones anteriores',
    detail: 'Carga declaraciones históricas para encontrar riesgos, sobrepagos o criterios inconsistentes.',
    href: '/audits',
  },
  {
    title: 'Revisar alertas y pendientes',
    detail: 'Atiende cambios regulatorios, casos detenidos y expedientes listos para revisión.',
    href: '/alerts',
  },
];

async function loadDashboard() {
  const [productsResult, alertsResult, casesResult, tariffCatalogResult] = await Promise.allSettled([
    apiFetch<{ data: Product[] }>('/api/v1/products'),
    apiFetch<{ data: Alert[] }>('/api/v1/alerts'),
    apiFetch<{ data: CaseItem[] }>('/api/v1/classification-cases'),
    apiFetch<TariffCatalogStatus>('/api/v1/tariff-catalog/status'),
  ]);

  return {
    products: productsResult.status === 'fulfilled' ? productsResult.value.data : [],
    alerts: alertsResult.status === 'fulfilled' ? alertsResult.value.data : [],
    cases: casesResult.status === 'fulfilled' ? casesResult.value.data : [],
    tariffCatalog: tariffCatalogResult.status === 'fulfilled' ? tariffCatalogResult.value : null,
    apiUnavailable: productsResult.status === 'rejected' && alertsResult.status === 'rejected' && casesResult.status === 'rejected',
  };
}

function tariffCatalogLabel(status: TariffCatalogStatus | null) {
  if (!status) return { value: 'Sin lectura', detail: 'Revisar catálogo FA/NICO' };
  if (status.status === 'ok') return { value: status.rows.toLocaleString('es-MX'), detail: 'Catálogo FA/NICO completo' };
  return { value: `${status.rows.toLocaleString('es-MX')}/${status.expectedRows.toLocaleString('es-MX')}`, detail: 'Importación FA/NICO pendiente' };
}

function buildPendingTasks(cases: CaseItem[], alerts: Alert[], products: Product[]): WorkTask[] {
  const openAlerts = alerts.filter((alert) => !['RESOLVED', 'DISMISSED'].includes(alert.status));
  const casesInReview = cases.filter((item) => ['SUBMITTED', 'IN_REVIEW', 'PENDING_REVIEW'].includes(item.status));
  const draftCases = cases.filter((item) => ['DRAFT', 'NEEDS_INFORMATION'].includes(item.status));
  const tasks: WorkTask[] = [];

  if (draftCases.length > 0) {
    tasks.push({
      title: `${draftCases.length} clasificación(es) con datos pendientes`,
      detail: 'Completa descripción, evidencia o atributos antes de enviar a análisis.',
      href: '/cases',
      action: 'Continuar casos',
      tone: 'amber',
    });
  }

  if (casesInReview.length > 0) {
    tasks.push({
      title: `${casesInReview.length} caso(s) en revisión`,
      detail: 'Revisa candidatos, confianza y fundamentos antes de congelar el expediente.',
      href: '/cases',
      action: 'Ver revisión',
      tone: 'blue',
    });
  }

  if (openAlerts.length > 0) {
    tasks.push({
      title: `${openAlerts.length} alerta(s) regulatorias abiertas`,
      detail: 'Confirma si el cambio afecta mercancías, fracciones o expedientes activos.',
      href: '/alerts',
      action: 'Atender alertas',
      tone: 'amber',
    });
  }

  if (products.length === 0) {
    tasks.push({
      title: 'Aún no hay mercancías registradas',
      detail: 'Inicia una clasificación desde lenguaje normal; la ficha técnica se crea detrás del flujo.',
      href: '/classify',
      action: 'Clasificar mercancía',
      tone: 'emerald',
    });
  }

  return tasks.slice(0, 4);
}

function toneClass(tone: WorkTask['tone']) {
  const classes = {
    blue: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100',
    neutral: 'border-neutral-200 bg-white text-neutral-950 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100',
  };
  return classes[tone];
}

export default async function DashboardPage() {
  const { products, alerts, cases, tariffCatalog, apiUnavailable } = await loadDashboard();
  const openAlerts = alerts.filter((alert) => !['RESOLVED', 'DISMISSED'].includes(alert.status));
  const catalogSummary = tariffCatalogLabel(tariffCatalog);
  const pendingTasks = buildPendingTasks(cases, alerts, products);
  const recentProducts = products.slice(0, 3);
  const recentCases = cases.slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Centro de trabajo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">¿Qué necesitas resolver hoy?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            Describe la operación en términos normales. TradeLogic organiza la mercancía, evidencia, clasificación, requisitos, costos y expediente sin obligarte a pensar en módulos técnicos.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <p className="text-neutral-500">Mercancías</p>
            <p className="mt-1 text-2xl font-semibold">{products.length}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <p className="text-neutral-500">Casos</p>
            <p className="mt-1 text-2xl font-semibold">{cases.length}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <p className="text-neutral-500">Alertas</p>
            <p className="mt-1 text-2xl font-semibold">{openAlerts.length}</p>
          </div>
        </div>
      </section>

      {apiUnavailable ? (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          La API está despertando o no responde todavía. Puedes iniciar la navegación y recargar en unos segundos para ver datos vivos.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {primaryActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className={
              action.primary
                ? 'rounded-lg border border-blue-700 bg-blue-700 p-5 text-white shadow-sm transition hover:bg-blue-800 lg:col-span-2'
                : 'rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900'
            }
          >
            <p className={action.primary ? 'text-xl font-semibold' : 'font-semibold'}>{action.title}</p>
            <p className={action.primary ? 'mt-2 max-w-2xl text-sm leading-6 text-blue-50' : 'mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400'}>{action.detail}</p>
            <p className={action.primary ? 'mt-4 text-sm font-semibold text-white' : 'mt-4 text-sm font-semibold text-blue-700 dark:text-blue-300'}>Abrir</p>
          </Link>
        ))}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Pendientes</h2>
              <p className="text-sm text-neutral-500">Una sola acción principal por bloqueo operativo.</p>
            </div>
            <Link href="/cases" className="text-sm font-medium text-blue-700 dark:text-blue-300">Ver casos</Link>
          </div>
          {pendingTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 p-6 dark:border-neutral-700">
              <h3 className="font-semibold">No hay pendientes críticos</h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Cuando falten documentos, haya alertas abiertas o un caso requiera revisión, aparecerá aquí con su siguiente acción.</p>
              <Link href="/classify" className="mt-4 inline-flex rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
                Clasificar una mercancía
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {pendingTasks.map((task) => (
                <Link key={task.title} href={task.href} className={`rounded-lg border p-4 ${toneClass(task.tone)}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold">{task.title}</h3>
                      <p className="mt-1 text-sm opacity-80">{task.detail}</p>
                    </div>
                    <span className="text-sm font-semibold">{task.action}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Actividad reciente</h2>
            <p className="text-sm text-neutral-500">Últimos expedientes y estado de datos base.</p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="text-sm text-neutral-500">Catálogo FA/NICO</p>
              <p className="mt-1 text-2xl font-semibold">{catalogSummary.value}</p>
              <p className={tariffCatalog?.status === 'ok' ? 'mt-1 text-sm text-emerald-700 dark:text-emerald-300' : 'mt-1 text-sm text-amber-700 dark:text-amber-300'}>{catalogSummary.detail}</p>
            </div>
            {recentProducts.length === 0 && recentCases.length === 0 ? (
              <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <p className="font-medium">Sin actividad todavía</p>
                <p className="mt-1 text-sm text-neutral-500">La primera clasificación creará la mercancía y abrirá el flujo de expediente.</p>
              </div>
            ) : null}
            {recentProducts.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
                <p className="font-medium">{product.name}</p>
                <p className="mt-1 text-sm text-neutral-500">{product.sku ? `SKU ${product.sku}` : 'Mercancía registrada'}</p>
              </Link>
            ))}
            {recentCases.map((item) => (
              <Link key={item.id} href={`/cases/${item.id}`} className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
                <p className="font-medium">Caso de clasificación</p>
                <p className="mt-1 text-sm text-neutral-500">Estado: {item.status}</p>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
