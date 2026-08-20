import './globals.css';
import { createClient } from './lib/supabase/server';
import { apiFetch } from './lib/api';
import { Nav } from './lib/nav';

export const metadata = {
  title: 'TradeLogic',
  description: 'Plataforma de inteligencia aduanera y fiscal',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const devBypassAllowed = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_BYPASS_IN_PRODUCTION === 'true';
  const devAuthBypass = process.env.DEV_AUTH_BYPASS === 'true' && devBypassAllowed;

  // Bypass de desarrollo local: no hay sesion real de Supabase que consultar,
  // pero la API sigue resolviendo un usuario/organizacion de prueba (mismo
  // flag DEV_AUTH_BYPASS del lado de la API), asi que igual pedimos /me.
  const user = devAuthBypass ? true : (await (await createClient()).auth.getUser()).data.user;

  let me: { email: string; organizationName: string } | null = null;
  if (user) {
    // The API is a separate service and may be waking up or temporarily
    // unable to reach Postgres. Do not let that transient failure replace the
    // whole authenticated shell with Next's generic blank error page.
    try {
      me = await apiFetch<{ email: string; organizationName: string }>('/api/v1/me');
    } catch {
      me = devAuthBypass ? { email: 'dev@local.bypass', organizationName: 'Modo pruebas (DEV_AUTH_BYPASS)' } : null;
    }
  }

  return (
    <html lang="es-MX">
      <body className="bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {me ? <Nav email={me.email} organizationName={me.organizationName} /> : null}
        {children}
      </body>
    </html>
  );
}
