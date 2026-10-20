import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "./config";

// Rutas accesibles sin sesión
const PUBLIC_PATHS = ["/login", "/auth"];

const isPublic = (pathname) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

// Refresca la sesión en cada petición y manda a /login si no hay usuario
export async function updateSession(request) {
  let response = NextResponse.next({ request });

  // Sin configurar Supabase la app muestra instrucciones (ver isSupabaseConfigured)
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() refresca la sesión si ha caducado y verifica la firma del
  // token en local con las claves públicas del proyecto (cacheadas): no hace
  // un viaje a Supabase en cada navegación como getUser(). Si el proyecto
  // usara claves simétricas antiguas, recurre a getUser() automáticamente.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;

  const { pathname } = request.nextUrl;
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
