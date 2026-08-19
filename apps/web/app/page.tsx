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
    <main className="min-h-screen overflow-hidden bg-[#080d11] text-ivory">
      <section className="relative border-b border-white/10 bg-gradient-to-b from-[#080d11] via-[#09171a] to-[#0c3438] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(67,184,196,0.25),transparent_38%),radial-gradient(circle_at_10%_80%,rgba(198,166,106,0.15),transparent_38%)]" />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-7 lg:px-8 lg:pb-28">
          <header className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-wide">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c6a66a]/50 bg-gradient-to-br from-[#c6a66a]/15 to-[#43b8c4]/5">
                <svg viewBox="0 0 40 40" fill="none" width="22" height="22">
                  <path d="M8 31V9l24 22V9" stroke="#C6A66A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 9l24 22" stroke="#43B8C4" strokeWidth="1" opacity=".7"/>
                </svg>
              </span>
              <span className="font-serif font-bold text-lg tracking-wider text-white">TRADELOGIC</span>
            </Link>
            <Link href="/login" className="rounded-full border border-[#c6a66a]/40 bg-[#c6a66a]/10 px-5 py-2 text-xs font-bold uppercase tracking-widest text-[#f4f1ea] transition hover:bg-[#c6a66a] hover:text-slate-950">
              Entrar a la plataforma
            </Link>
          </header>

          <div className="grid gap-14 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-28">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-[#c6a66a]">Inteligencia aduanera operativa</p>
              <h1 className="max-w-3xl font-serif text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl text-white">
                De la mercancía al fundamento, <em className="not-italic text-[#c6a66a]">con trazabilidad.</em>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
                TradeLogic organiza la clasificación arancelaria, la evidencia y el riesgo regulatorio para que cada decisión pueda revisarse y explicarse.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/login" className="rounded-full bg-[#c6a66a] px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-950 transition hover:bg-[#e5d1a8] hover:shadow-[0_0_20px_rgba(198,166,106,0.35)]">
                  Ver demo operativa ↗
                </Link>
                <a href="#avance" className="rounded-full border border-white/25 bg-white/5 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:border-[#43b8c4] hover:bg-white/10">
                  Conocer el avance
                </a>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/15 bg-gradient-to-br from-[#0c3438]/80 to-[#080d11]/90 p-5 shadow-2xl backdrop-blur-md sm:p-7">
              <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#c6a66a]">Control center</p>
                  <p className="mt-1 font-semibold text-white">Estado de la operación</p>
                </div>
                <span className="rounded-full border border-[#43b8c4]/40 bg-[#43b8c4]/15 px-3 py-1 text-xs font-semibold text-[#43b8c4]">MVP activo</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Metric value="20,227" label="registros FA/NICO" />
                <Metric value="100%" label="fuentes versionadas" />
                <Metric value="5" label="módulos visibles" />
                <Metric value="RLS" label="aislamiento por organización" />
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-[#080d11]/70 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400"><span>Flujo de clasificación</span><span className="text-[#43b8c4]">En construcción</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[78%] rounded-full bg-gradient-to-r from-[#43b8c4] to-[#c6a66a]" /></div>
                <div className="mt-3 flex justify-between text-[11px] text-slate-400"><span>Producto</span><span>Evidencia</span><span>Fracción</span><span>Revisión</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="avance" className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c6a66a]">Lo que ya se puede ver</p>
          <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">La tubería técnica se convierte en trabajo visible.</h2>
          <p className="mt-5 text-base leading-7 text-slate-300">La demostración pública muestra el producto y su dirección. Las áreas operativas permanecen protegidas detrás del acceso autenticado.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {capabilities.map((capability) => (
            <article key={capability.number} className="rounded-[22px] border border-white/12 bg-gradient-to-b from-white/[0.055] to-white/[0.012] p-6 shadow-xl backdrop-blur-md transition hover:-translate-y-1 hover:border-[#43b8c4]/50">
              <span className="text-xs font-bold uppercase tracking-widest text-[#c6a66a]">{capability.number}</span>
              <h3 className="mt-6 text-xl font-bold text-white">{capability.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{capability.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-14 flex flex-col justify-between gap-6 rounded-[22px] border border-[#c6a66a]/30 bg-gradient-to-r from-[#0c3438] to-[#080d11] p-7 sm:flex-row sm:items-center">
          <div><p className="text-xs font-bold uppercase tracking-widest text-[#c6a66a]">Siguiente hito</p><p className="mt-1 text-sm text-slate-200">Activar el worker y validar el flujo completo con datos de piloto.</p></div>
          <Link href="/login" className="w-fit rounded-full bg-[#c6a66a] px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-950 transition hover:bg-[#e5d1a8]">Abrir acceso operativo ↗</Link>
        </div>
        <p className="mt-8 text-center text-xs leading-5 text-slate-400">TradeLogic es un MVP avanzado en validación. Los resultados requieren revisión profesional y los datos de demostración no constituyen asesoría aduanera o legal.</p>
      </section>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}
