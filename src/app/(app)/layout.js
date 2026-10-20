import SessionProvider from "@/components/SessionProvider";
import SetupNotice from "@/components/SetupNotice";
import Sidebar from "@/components/Sidebar";
import { issuerFromRow } from "@/lib/data/issuers";
import { ORG_COLUMNS, orgFromRow } from "@/lib/data/org";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Depende de la sesión de cada petición: nunca se genera como estática
export const dynamic = "force-dynamic";

// Pantallas de la aplicación: requieren sesión y pertenecer a un negocio.
// El layout se renderiza una vez por carga completa (al navegar entre
// apartados Next lo conserva), así que aquí se cargan los datos que usan
// todas las pantallas: usuario, organización, rol y empresas emisoras.
export default async function AppLayout({ children }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = createClient();
  // Verificación local del token (ver lib/supabase/middleware.js)
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");

  // Una sola consulta: membresía + organización + sus emisores.
  // De momento cada usuario trabaja con su primera organización.
  const { data: membership, error } = await supabase
    .from("memberships")
    .select(`role, organizations (${ORG_COLUMNS}, issuers (*))`)
    .eq("user_id", claims.sub)
    .order("created_at")
    .order("created_at", { referencedTable: "organizations.issuers" })
    .limit(1)
    .maybeSingle();
  // Un fallo de la consulta (p. ej. una migración sin aplicar) no debe
  // confundirse con "no tienes negocio": eso mandaría a /onboarding y de
  // vuelta aquí en bucle. Se muestra el error.
  if (error) {
    throw new Error(
      `No se pudieron cargar los datos del negocio (${error.message}). ` +
        "Si acabas de actualizar, comprueba que has aplicado las migraciones de supabase/migrations."
    );
  }
  if (!membership?.organizations) redirect("/onboarding");

  const { issuers = [], ...orgRow } = membership.organizations;
  const session = {
    user: {
      id: claims.sub,
      email: claims.email,
      name: claims.user_metadata?.full_name || "",
    },
    org: orgFromRow(orgRow),
    role: membership.role,
    issuers: issuers.map(issuerFromRow),
  };

  return (
    <SessionProvider value={session}>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </SessionProvider>
  );
}
