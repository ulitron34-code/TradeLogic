import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refresca el token de sesion de Supabase en cada request. Sin esto, la
// sesion del navegador expira silenciosamente y las llamadas a la API
// empiezan a fallar con 401 aunque el usuario siga "logueado" en la UI.
export async function updateSession(request: NextRequest) {
  // Bypass de desarrollo local: deja pasar todas las rutas sin exigir sesion
  // de Supabase. Mismo flag que ya usa la API (DEV_AUTH_BYPASS); en
  // produccion exige ademas ALLOW_DEV_BYPASS_IN_PRODUCTION=true.
  const devBypassAllowed = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_BYPASS_IN_PRODUCTION === 'true';
  if (process.env.DEV_AUTH_BYPASS === 'true' && devBypassAllowed) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isPublicRoute = request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/login');
  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
