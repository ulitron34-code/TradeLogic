import Link from 'next/link';
import { apiFetch } from '../lib/api';

type Product = { id: string; name: string; sku: string | null };
type Alert = { id: string; severity: string; status: string; title: string; summary: string };
type CaseItem = { id: string; status: string };
type Catalog = { status: 'ok' | 'incomplete'; expectedRows: number; rows: number };
type WorkTask = { title: string; detail: string; href: string; action: string; tone: 'blue' | 'amber' | 'emerald' };

const primaryActions = [
  { title: 'Clasificar una mercancía', detail: 'Describe lo que quieres importar o exportar y responde unas preguntas guiadas.', href: '/classify', primary: true },
  { title: 'Continuar expedientes', detail: 'Revisa clasificación, evidencia, jurisprudencia, requisitos y costos en un solo lugar.', href: '/cases', primary: false },
  { title: 'Atender alertas', detail: 'Consulta cambios y pendientes que pueden afectar tus operaciones.', href: '/alerts', primary: false },
];

async function loadDashboard() {
  const [products, alerts, cases, catalog] = await Promise.allSettled([
    apiFetch<{ data: Product[] }>('/api/v1/products'), apiFetch<{ data: Alert[] }>('/api/v1/alerts'),
    apiFetch<{ data: CaseItem[] }>('/api/v1/classification-cases'), apiFetch<Catalog>('/api/v1/tariff-catalog/status'),
  ]);
  return {
    products: products.status === 'fulfilled' ? products.value.data : [], alerts: alerts.status === 'fulfilled' ? alerts.value.data : [],
    cases: cases.status === 'fulfilled' ? cases.value.data : [], catalog: catalog.status === 'fulfilled' ? catalog.value : null,
    apiUnavailable: products.status === 'rejected' && alerts.status === 'rejected' && cases.status === 'rejected',
  };
}

function buildTasks(cases: CaseItem[], alerts: Alert[], products: Product[]): WorkTask[] {
  const tasks: WorkTask[] = [];
  const drafts = cases.filter((item) => ['DRAFT', 'NEEDS_INFORMATION'].includes(item.status));
  const review = cases.filter((item) => ['NEEDS_REVIEW', 'SUBMITTED', 'IN_REVIEW', 'PENDING_REVIEW'].includes(item.status));
  const processing = cases.filter((item) => ['INTAKE', 'IN_ANALYSIS'].includes(item.status));
  const openAlerts = alerts.filter((item) => !['RESOLVED', 'DISMISSED'].includes(item.status));
  if (drafts.length) tasks.push({ title: `${drafts.length} clasificación(es) con datos pendientes`, detail: 'Completa descripción, evidencia o atributos antes del análisis.', href: '/cases', action: 'Continuar casos', tone: 'amber' });
  if (review.length) tasks.push({ title: `${review.length} caso(s) en revisión`, detail: 'Revisa candidatos, confianza y fundamentos antes de aprobar.', href: '/cases', action: 'Ver revisión', tone: 'blue' });
  if (processing.length) tasks.push({ title: `${processing.length} caso(s) en procesamiento`, detail: 'El worker está preparando candidatos y fundamento.', href: '/cases', action: 'Ver procesamiento', tone: 'blue' });
  if (openAlerts.length) tasks.push({ title: `${openAlerts.length} alerta(s) regulatorias abiertas`, detail: 'Confirma si el cambio afecta mercancías o expedientes activos.', href: '/alerts', action: 'Atender alertas', tone: 'amber' });
  if (!products.length) tasks.push({ title: 'Aún no hay mercancías registradas', detail: 'Inicia una clasificación desde lenguaje normal; la ficha se crea detrás del flujo.', href: '/classify', action: 'Clasificar mercancía', tone: 'emerald' });
  return tasks.slice(0, 4);
}

const toneClass = (tone: WorkTask['tone']) => ({ blue: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-100', amber: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100', emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100' }[tone]);

export default async function DashboardPage() {
  const { products, alerts, cases, catalog, apiUnavailable } = await loadDashboard();
  const openAlerts = alerts.filter((item) => !['RESOLVED', 'DISMISSED'].includes(item.status));
  const tasks = buildTasks(cases, alerts, products);
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <section className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"><div><p className="text-sm font-medium text-blue-700 dark:text-blue-300">Centro de trabajo</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">¿Qué necesitas resolver hoy?</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">Empieza con una mercancía y una operación. TradeLogic organiza clasificación, fundamento, regulaciones, costos y expediente sin mostrarte la arquitectura interna.</p></div><div className="grid grid-cols-3 gap-3 text-sm">{[['Mercancías', products.length], ['Expedientes', cases.length], ['Alertas', openAlerts.length]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800"><p className="text-neutral-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div></section>
    {apiUnavailable && <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">La API está despertando o no responde todavía. Recarga en unos segundos para ver datos vivos.</div>}
    <section className="grid gap-4 md:grid-cols-3">{primaryActions.map((action) => <Link key={action.title} href={action.href} className={action.primary ? 'rounded-lg border border-blue-700 bg-blue-700 p-5 text-white shadow-sm transition hover:bg-blue-800 md:col-span-2' : 'rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900'}><p className={action.primary ? 'text-xl font-semibold' : 'font-semibold'}>{action.title}</p><p className={action.primary ? 'mt-2 max-w-2xl text-sm leading-6 text-blue-50' : 'mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400'}>{action.detail}</p><p className={action.primary ? 'mt-4 text-sm font-semibold' : 'mt-4 text-sm font-semibold text-blue-700 dark:text-blue-300'}>Abrir</p></Link>)}</section>
    <div className="mt-4 flex flex-wrap gap-4 text-sm"><Link href="/products" className="text-blue-700 hover:underline dark:text-blue-300">Mercancías y evidencia â†’</Link><Link href="/audits" className="text-blue-700 hover:underline dark:text-blue-300">Auditoría histórica â†’</Link></div>
    <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.8fr]"><div><div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Pendientes</h2><p className="text-sm text-neutral-500">Una acción principal por bloqueo operativo.</p></div><Link href="/cases" className="text-sm font-medium text-blue-700 dark:text-blue-300">Ver expedientes</Link></div>{tasks.length ? <div className="grid gap-3">{tasks.map((task) => <Link key={task.title} href={task.href} className={`rounded-lg border p-4 ${toneClass(task.tone)}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">{task.title}</h3><p className="mt-1 text-sm opacity-80">{task.detail}</p></div><span className="text-sm font-semibold">{task.action}</span></div></Link>)}</div> : <div className="rounded-lg border border-dashed border-neutral-300 p-6 dark:border-neutral-700"><h3 className="font-semibold">No hay pendientes críticos</h3><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Cuando falten documentos o un caso requiera revisión, aparecerá aquí su siguiente acción.</p></div>}</div><aside><div className="mb-4"><h2 className="text-lg font-semibold">Estado de la plataforma</h2><p className="text-sm text-neutral-500">Datos base y actividad reciente.</p></div><div className="grid gap-3"><div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"><p className="text-sm text-neutral-500">Catálogo FA/NICO</p><p className="mt-1 text-2xl font-semibold">{catalog ? `${catalog.rows.toLocaleString('es-MX')}/${catalog.expectedRows.toLocaleString('es-MX')}` : 'Sin lectura'}</p><p className={catalog?.status === 'ok' ? 'mt-1 text-sm text-emerald-700 dark:text-emerald-300' : 'mt-1 text-sm text-amber-700 dark:text-amber-300'}>{catalog?.status === 'ok' ? 'Catálogo completo' : 'Revisar importación del catálogo'}</p></div><div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"><p className="font-medium">{products.length || cases.length ? 'Actividad disponible' : 'Sin actividad todavía'}</p><p className="mt-1 text-sm text-neutral-500">La primera clasificación crea la mercancía y abre el expediente.</p></div></div></aside></section>
  </main>;
}