"use client";

import { getSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "./AuthShell";
import { Button, Field, Input } from "./ui";

export default function OnboardingForm({ email }) {
  const router = useRouter();
  const [form, setForm] = useState({
    orgName: "",
    companyName: "",
    cif: "",
    address1: "",
    address2: "",
    email: email || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.orgName.trim() || !form.companyName.trim()) {
      setError("El nombre del negocio y la razón social son obligatorios.");
      return;
    }
    setBusy(true);
    setError("");
    const supabase = getSupabase();
    try {
      const { data: orgId, error: orgError } = await supabase.rpc(
        "create_organization",
        { p_name: form.orgName }
      );
      if (orgError) throw orgError;

      const { error: issuerError } = await supabase.from("issuers").insert({
        org_id: orgId,
        brand_title: form.orgName.trim(),
        company_name: form.companyName.trim(),
        tax_id: form.cif.trim(),
        address1: form.address1.trim(),
        address2: form.address2.trim(),
        email: form.email.trim(),
      });
      if (issuerError) throw issuerError;

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Alta del negocio:", err);
      setError("No se pudo crear el negocio. Inténtalo de nuevo.");
      setBusy(false);
    }
  };

  return (
    <AuthShell
      wide
      title="Da de alta tu negocio"
      description="Estos datos aparecerán en tus facturas. Podrás cambiarlos y añadir más empresas en Configuración."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field
          label="Nombre del negocio"
          htmlFor="orgName"
          hint="El nombre con el que lo conoces, p. ej. «Restaurante El Puerto»."
        >
          <Input id="orgName" value={form.orgName} onChange={update("orgName")} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Razón social" htmlFor="companyName">
            <Input
              id="companyName"
              value={form.companyName}
              onChange={update("companyName")}
              placeholder="Ejemplo Hostelería S.L."
              required
            />
          </Field>
          <Field label="NIF/CIF" htmlFor="cif">
            <Input id="cif" value={form.cif} onChange={update("cif")} placeholder="B12345678" />
          </Field>
          <Field label="Dirección" htmlFor="address1">
            <Input id="address1" value={form.address1} onChange={update("address1")} placeholder="Calle Mayor 1" />
          </Field>
          <Field label="Código postal y ciudad" htmlFor="address2">
            <Input id="address2" value={form.address2} onChange={update("address2")} placeholder="41010 Sevilla" />
          </Field>
        </div>
        <Field label="Email de facturación" htmlFor="email">
          <Input id="email" type="email" value={form.email} onChange={update("email")} />
        </Field>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" variant="primary" className="w-full justify-center" disabled={busy}>
          {busy ? "Creando…" : "Empezar a facturar"}
        </Button>
      </form>
    </AuthShell>
  );
}
