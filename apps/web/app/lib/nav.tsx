'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from './supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Centro' },
  { href: '/classify', label: 'Clasificar' },
  { href: '/cases', label: 'Expedientes' },
  { href: '/alerts', label: 'Alertas' },
];

export function Nav({ email, organizationName }: { email: string; organizationName: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/dashboard" className="text-sm font-semibold">TradeLogic</Link>
          {NAV_ITEMS.map((item) => <Link key={item.href} href={item.href} className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">{item.label}</Link>)}
          <details className="relative text-sm text-neutral-500">
            <summary className="cursor-pointer list-none hover:text-neutral-900 dark:hover:text-neutral-100">Más</summary>
            <div className="absolute left-0 top-7 z-10 grid min-w-52 gap-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
              <Link href="/products" className="rounded px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">Mercancías y evidencia</Link>
              <Link href="/audits" className="rounded px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">Auditoría histórica</Link>
            </div>
          </details>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-neutral-500">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{organizationName}</span>
          <span>{email}</span>
          <button type="button" onClick={handleLogout} disabled={loggingOut} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-neutral-700">
            {loggingOut ? 'Saliendo...' : 'Salir'}
          </button>
        </div>
      </div>
    </nav>
  );
}