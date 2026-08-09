import './globals.css';
import { createClient } from './lib/supabase/server';
import { apiFetch } from './lib/api';
import { Nav } from './lib/nav';

export const metadata = {
  title: 'TradeLogic',
  description: 'Plataforma de inteligencia aduanera y fiscal',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let me: { email: string; organizationName: string } | null = null;
  if (user) {
    // The API is a separate service and may be waking up or temporarily
    // unable to reach Postgres. Do not let that transient failure replace the
    // whole authenticated shell with Next's generic blank error page.
    try {
      me = await apiFetch<{ email: string; organizationName: string }>('/api/v1/me');
    } catch {
      me = null;
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
