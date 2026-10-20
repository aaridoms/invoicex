import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para componentes de cliente ("use client").
// La seguridad no depende de este código: la aplican las políticas RLS.
let client = null;

export function getSupabase() {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  return client;
}
