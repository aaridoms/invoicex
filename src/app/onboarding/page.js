import OnboardingForm from "@/components/OnboardingForm";
import SetupNotice from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Tu negocio | InvoiceX",
};

export const dynamic = "force-dynamic";

// Primer paso tras crear la cuenta: dar de alta el negocio y su emisor
export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("memberships")
    .select("org_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (count > 0) redirect("/");

  return <OnboardingForm email={user.email} />;
}
