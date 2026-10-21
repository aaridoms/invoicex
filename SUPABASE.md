# Puesta en marcha de Supabase

InvoiceX guarda los datos en Supabase (Postgres + autenticación + almacenamiento
de PDFs). Estos pasos se hacen una vez por proyecto: uno para desarrollo y, más
adelante, otro para producción.

## 1. Crear el proyecto

1. Entra en [supabase.com](https://supabase.com) → **New project**.
2. Región: una de la UE (por ejemplo *Central EU (Frankfurt)*), por protección de datos.
3. Guarda la contraseña de la base de datos en un gestor de contraseñas.

## 2. Crear las tablas

Abre **SQL Editor** → **New query** y ejecuta, **en orden y una sola vez
cada una**, todas las migraciones de `supabase/migrations/` (pega el
contenido y pulsa **Run**):

1. `20261020000000_init.sql`: tablas, seguridad y almacenamiento.
2. `20261021000000_settings_and_deletion.sql`: ajustes de facturación y borrado de cuenta.
3. `20261022000000_contacts.sql`: clientes y proveedores.

Alternativa por consola (requiere `npx supabase login`):

```bash
npx supabase link --project-ref <id-del-proyecto>
npx supabase db push
```

Las migraciones futuras se añadirán como archivos nuevos en `supabase/migrations/`.

## 3. Variables de entorno

En **Project Settings → API Keys** copia la URL del proyecto y la clave
*publishable* (o la *anon* si tu proyecto usa las claves antiguas) y crea
`.env.local` en la raíz (puedes partir de `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Reinicia `pnpm dev` después de crearlo. **Nunca** uses aquí la clave
*secret* / *service_role*: se vería en el navegador.

## 4. URLs de autenticación

**Authentication → URL Configuration**:

- **Site URL**: la URL de producción en Vercel (o `http://localhost:3000` mientras solo desarrollas).
- **Redirect URLs**: añade
  - `http://localhost:3000/auth/callback`
  - `https://<tu-dominio-de-vercel>/auth/callback`

## 5. Entrar con Google

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto.
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*, nombre «InvoiceX».
3. **Credenciales → Crear credenciales → ID de cliente de OAuth** → *Aplicación web*.
   - **URI de redirección autorizados**: `https://<id-del-proyecto>.supabase.co/auth/v1/callback`
4. Copia el *ID de cliente* y el *secreto*.
5. En Supabase: **Authentication → Sign In / Providers → Google** → actívalo y pega ambos.
6. Para poder **vincular Google a una cuenta existente** desde Configuración → Cuenta,
   activa también **Allow manual linking** en esa misma pantalla.

## 6. Emails (confirmación y recuperar contraseña)

Supabase envía los emails con un servidor de pruebas limitado a unos pocos por
hora. Para uso real configura un SMTP propio en **Authentication → Emails →
SMTP Settings** (por ejemplo Resend, Brevo o el de tu dominio).

## 7. Vercel

En el proyecto de Vercel → **Settings → Environment Variables**, añade las dos
variables del paso 3 y vuelve a desplegar. Sin ellas la app muestra la pantalla
«Falta configurar Supabase».

## Modelo de datos

| Tabla | Para qué |
|---|---|
| `organizations` | El negocio (en el futuro, lo que pagaría una suscripción) |
| `memberships` | Usuarios del negocio y su rol: `owner`, `admin`, `member`, `accountant` (gestor, solo lectura) |
| `issuers` | Empresas emisoras (razón social, NIF, logo…). Numeración propia por emisor |
| `invoices` | Facturas emitidas. **Inmutables**: solo se puede adjuntar el PDF una vez |

Los PDFs se guardan en el bucket privado `invoice-pdfs/<org_id>/<invoice_id>.pdf`.
Todas las tablas tienen Row Level Security: cada usuario solo ve los datos de su
negocio, aunque alguien manipule el código del navegador.
