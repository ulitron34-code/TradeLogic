'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from './supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Centro' },
  { href: '/classify', label: 'Clasificar' },
  { href: '/cases', label: 'Expedientes' },
  { href: '/alerts', label: 'Alertas' },
];

const MORE_ITEMS = [
  { href: '/products', label: 'Mercancías y evidencia' },
  { href: '/invoices', label: 'Facturas / Invoices (Ingesta IA)' },
  { href: '/immex', label: 'Cumplimiento IMMEX / Anexo 24' },
  { href: '/audits', label: 'Auditoría histórica' },
];

export function Nav({ email, organizationName }: { email: string; organizationName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const moreRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) setMoreOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMoreOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => setMoreOpen(false), [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await createClient().auth.signOut();
    } catch {
      // En modo DEV_AUTH_BYPASS no hay sesion real de Supabase que cerrar.
    }
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/" aria-label="Ir a la pagina principal" className="inline-flex cursor-pointer text-sm font-semibold">TradeLogic</Link>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
            return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`inline-flex cursor-pointer rounded px-1 text-sm transition-colors ${active ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'}`}>{item.label}</Link>;
          })}
          <div ref={moreRef} className="relative text-sm">
            <button type="button" aria-expanded={moreOpen} aria-haspopup="menu" onClick={() => setMoreOpen((open) => !open)} className="inline-flex cursor-pointer items-center gap-1 rounded px-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
              Más <span aria-hidden="true" className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {moreOpen ? <div role="menu" className="absolute left-0 top-8 z-30 grid min-w-56 gap-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">{MORE_ITEMS.map((item) => <Link key={item.href} href={item.href} role="menuitem" onClick={() => setMoreOpen(false)} className="rounded px-3 py-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800">{item.label}</Link>)}</div> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-neutral-500">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{organizationName}</span>
          <span>{email}</span>
          <button type="button" onClick={handleLogout} disabled={loggingOut} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-neutral-700">{loggingOut ? 'Saliendo...' : 'Salir'}</button>
        </div>
      </div>
    </nav>
  );
}
