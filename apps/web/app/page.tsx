import Link from 'next/link';

const capabilities = [
  {
    number: '01',
    title: 'Clasificación explicable',
    text: 'Ranking determinista de fracciones y NICO con fuente, vigencia, coincidencias y revisión humana.',
  },
  {
    number: '02',
    title: 'Expediente defendible',
    text: 'Producto, evidencia técnica, precedentes, requisitos regulatorios, auditoría y PDF en un mismo flujo.',
  },
  {
    number: '03',
    title: 'Vigilancia operativa',
    text: 'Catálogo FA/NICO, cambios regulatorios y alertas conectados a los casos que realmente importan.',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f7fb] text-slate-950">
      <section className="relative border-b border-slate-200 bg-[#0b172a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(45,212,191,0.22),transparent_35%),radial-gradient(circle_at_10%_80%,rgba(59,130,246,0.2),transparent_35%)]" />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-7 lg:px-8 lg:pb-28">
          <header className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-wide">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-300 font-black text-slate-950">T</span>
              TRADELOGIC
            </Link>
            <Link href="/login" className="rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
              Entrar a la plataforma
            </Link>
          </header>

          <div className="grid gap-14 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-28">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-teal-300">Inteligencia aduanera operativa</p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
                De la mercancía al fundamento, con trazabilidad.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
                TradeLogic organiza la clasificación arancelaria, la evidencia y el riesgo regulatorio para que cada decisión pueda revisarse y explicarse.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/login" className="rounded-full bg-teal-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-200">
                  Ver demo operativa
                </Link>
                <a href="#avance" className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  Conocer el avance
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/[0.07] p-5 shadow-2xl backdrop-blur sm:p-7">
              <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Control center</p>
                  <p className="mt-1 font-semibold">Estado de la operación</p>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">MVP activo</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Metric value="20,227" label="registros FA/NICO" />
                <Metric value="100%" label="fuentes versionadas" />
                <Metric value="5" label="módulos visibles" />
                <Metric value="RLS" label="aislamiento por organización" />
              </div>
              <div className="mt-5 rounded-2xl bg-slate-950/45 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400"><span>Flujo de clasificación</span><span className="text-teal-300">En construcción</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[78%] rounded-full bg-gradient-to-r from-blue-400 to-teal-300" /></div>
                <div className="mt-3 flex justify-between text-[11px] text-slate-500"><span>Producto</span><span>Evidencia</span><span>Fracción</span><span>Revisión</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="avance" className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-700">Lo que ya se puede ver</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">La tubería técnica se convierte en trabajo visible.</h2>
          <p className="mt-5 text-base leading-7 text-slate-600">La demostración pública muestra el producto y su dirección. Las áreas operativas permanecen protegidas detrás del acceso autenticado.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {capabilities.map((capability) => (
            <article key={capability.number} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-sm font-bold text-blue-700">{capability.number}</span>
              <h3 className="mt-8 text-xl font-semibold">{capability.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{capability.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-14 flex flex-col justify-between gap-6 rounded-3xl border border-teal-200 bg-teal-50 p-7 sm:flex-row sm:items-center">
          <div><p className="text-sm font-semibold text-teal-950">Siguiente hito</p><p className="mt-1 text-sm text-teal-900/75">Activar el worker y validar el flujo completo con datos de piloto.</p></div>
          <Link href="/login" className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Abrir acceso operativo</Link>
        </div>
        <p className="mt-8 text-center text-xs leading-5 text-slate-500">TradeLogic es un MVP avanzado en validación. Los resultados requieren revisión profesional y los datos de demostración no constituyen asesoría aduanera o legal.</p>
      </section>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl bg-white/[0.08] p-4"><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>;
}
