'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function redirectAuthenticatedUser() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!cancelled && session) {
          router.replace('/dashboard');
          router.refresh();
        }
      } catch {
        // Keep login form visible
      }
    }

    void redirectAuthenticatedUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión. Revisa la configuración de Supabase en Vercel.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#080d11] px-4 text-[#f4f1ea] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(67,184,196,0.22),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(198,166,106,0.12),transparent_40%)] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md rounded-[22px] border border-white/12 bg-gradient-to-b from-[#0c3438]/90 to-[#080d11]/95 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#c6a66a]/50 bg-gradient-to-br from-[#c6a66a]/15 to-[#43b8c4]/5">
              <svg viewBox="0 0 40 40" fill="none" width="26" height="26">
                <path d="M8 31V9l24 22V9" stroke="#C6A66A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 9l24 22" stroke="#43B8C4" strokeWidth="1" opacity=".7"/>
              </svg>
            </span>
            <span className="font-serif font-bold text-2xl tracking-wider text-white">TRADELOGIC</span>
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c6a66a]">
            Inteligencia aduanera & fiscal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-xs uppercase tracking-wider text-[#a8b3b9] font-semibold">
            Correo electrónico
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="usuario@organizacion.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-white/15 bg-[#080d11]/80 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-[#c6a66a] focus:ring-1 focus:ring-[#c6a66a]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs uppercase tracking-wider text-[#a8b3b9] font-semibold">
            Contraseña
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-white/15 bg-[#080d11]/80 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-[#c6a66a] focus:ring-1 focus:ring-[#c6a66a]"
            />
          </label>
          {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-[#c6a66a] px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-950 transition hover:bg-[#e5d1a8] disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 border-t border-white/10 pt-4 text-center">
          <Link href="/" className="text-xs text-[#43b8c4] hover:underline">
            ← Volver a la página principal
          </Link>
        </div>
      </div>
    </main>
  );
}
