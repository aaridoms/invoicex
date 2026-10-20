import SettingsTabs from "@/components/settings/SettingsTabs";
import { PageHeader } from "@/components/ui";

export default function SettingsLayout({ children }) {
  return (
    <div className="mx-auto max-w-6xl px-8 py-7">
      <PageHeader
        title="Configuración"
        description="Empresas, facturación, preferencias y cuenta."
      />
      <SettingsTabs />
      {children}
    </div>
  );
}
