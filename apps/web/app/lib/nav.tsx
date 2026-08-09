'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from './supabase/client';

export function Nav({ email, organizationName }: { email: string; organizationName: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products" className="text-sm font-semibold">
            TradeLogic
          </Link>
          <Link href="/products" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
            Productos
          </Link>
          <Link href="/alerts" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
            Alertas
          </Link>
          <span className="text-sm text-neutral-500">{organizationName}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <span>{email}</span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-neutral-700"
          >
            {loggingOut ? 'Saliendo...' : 'Salir'}
          </button>
        </div>
      </div>
    </nav>
  );
}
