import LoginForm from "@/components/LoginForm";
import SetupNotice from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeNext } from "@/lib/safeNext";

export const metadata = {
  title: "Entrar | InvoiceX",
};

export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  return (
    <LoginForm
      next={safeNext(searchParams?.next)}
      authError={searchParams?.error === "auth"}
    />
  );
}
