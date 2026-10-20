import SessionProvider from "@/components/SessionProvider";
import SetupNotice from "@/components/SetupNotice";
import Sidebar from "@/components/Sidebar";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Depende de la sesión de cada petición: nunca se genera como estática
export const dynamic = "force-dynamic";

// Pantallas de la aplicación: requieren sesión y pertenecer a un negocio
export default async function AppLayout({ children }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // De momento cada usuario trabaja con su primera organización
  const { data: membership } = await supabase
    .from("memberships")
    .select("role, organizations (id, name)")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!membership?.organizations) redirect("/onboarding");

  const session = {
    user: { id: user.id, email: user.email },
    org: membership.organizations,
    role: membership.role,
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
