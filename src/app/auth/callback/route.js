import { safeNext } from "@/lib/safeNext";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Vuelta desde Google, desde el email de confirmación o desde el de
// recuperar contraseña: canjea el código por una sesión y continúa.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
