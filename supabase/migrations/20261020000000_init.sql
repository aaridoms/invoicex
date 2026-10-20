-- InvoiceX: esquema inicial multiempresa
--
-- Modelo:
--   organizations  negocio/cuenta (lo que en el futuro pagaría una suscripción)
--   memberships    usuarios de cada organización con su rol
--   issuers        empresas emisoras de la organización (razón social, NIF…)
--   invoices       facturas emitidas (inmutables una vez creadas)
--
-- Seguridad: Row Level Security en todas las tablas. Un usuario solo ve los
-- datos de las organizaciones de las que es miembro.

-- ---------------------------------------------------------------------------
-- Organizaciones y miembros
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create type public.member_role as enum ('owner', 'admin', 'member', 'accountant');

create table public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);

-- Rol del usuario actual en una organización (null si no es miembro).
-- security definer: evita que las políticas de memberships se llamen a sí mismas.
create function public.org_role(p_org uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.memberships m
  where m.org_id = p_org and m.user_id = (select auth.uid());
$$;

create function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.org_role(p_org) is not null;
$$;

-- Puede crear y modificar datos (el rol "accountant" es solo lectura)
create function public.can_write_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.org_role(p_org) in ('owner', 'admin', 'member');
$$;

-- Alta de un negocio: crea la organización y hace dueño al usuario actual
create function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  insert into public.organizations (name) values (trim(p_name)) returning id into v_org;
  insert into public.memberships (org_id, user_id, role)
    values (v_org, (select auth.uid()), 'owner');
  return v_org;
end;
$$;

revoke execute on function public.create_organization(text) from anon;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

create policy "Miembros ven su organización" on public.organizations
  for select to authenticated using (public.is_org_member(id));

create policy "Dueños y administradores renombran la organización" on public.organizations
  for update to authenticated
  using (public.org_role(id) in ('owner', 'admin'))
  with check (public.org_role(id) in ('owner', 'admin'));

create policy "Miembros ven a los demás miembros" on public.memberships
  for select to authenticated using (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- Emisores
-- ---------------------------------------------------------------------------

create table public.issuers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  brand_title text not null default '',
  company_name text not null check (char_length(trim(company_name)) > 0),
  tax_id text not null default '',
  address1 text not null default '',
  address2 text not null default '',
  email text not null default '',
  -- Logo ya optimizado en el navegador (JPG pequeño en data URL)
  logo_data_url text not null default '' check (char_length(logo_data_url) <= 400000),
  footer_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, org_id) -- para la clave foránea compuesta de invoices
);

create index issuers_org_id_idx on public.issuers (org_id);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger issuers_touch_updated_at
  before update on public.issuers
  for each row execute function public.touch_updated_at();

alter table public.issuers enable row level security;

create policy "Miembros ven los emisores" on public.issuers
  for select to authenticated using (public.is_org_member(org_id));

create policy "Miembros con escritura crean emisores" on public.issuers
  for insert to authenticated with check (public.can_write_org(org_id));

create policy "Miembros con escritura editan emisores" on public.issuers
  for update to authenticated
  using (public.can_write_org(org_id))
  with check (public.can_write_org(org_id));

-- Un emisor con facturas no se puede borrar (lo impide la clave foránea de invoices)
create policy "Dueños y administradores borran emisores" on public.issuers
  for delete to authenticated using (public.org_role(org_id) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- Facturas
-- ---------------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  issuer_id uuid not null,
  number text not null check (char_length(trim(number)) > 0),
  issue_date date not null,
  -- Copias de los datos tal como salieron en la factura: si luego cambia
  -- el emisor o el cliente, la factura emitida no debe cambiar.
  issuer_snapshot jsonb not null,
  client jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  prices_include_vat boolean not null default false,
  notes text not null default '',
  base numeric(12, 2) not null,
  vat numeric(12, 2) not null,
  total numeric(12, 2) not null,
  pdf_path text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  -- La numeración es por emisor: cada razón social tiene su propia serie
  unique (issuer_id, number),
  -- "no action" (por defecto): impide borrar un emisor con facturas, pero
  -- permite borrar la organización entera en cascada
  foreign key (issuer_id, org_id) references public.issuers (id, org_id)
);

create index invoices_org_created_idx on public.invoices (org_id, created_at desc);

-- Las facturas emitidas son inmutables. Lo único permitido es adjuntar el
-- PDF una vez (pdf_path de null a un valor) justo después de crearla.
create function public.invoices_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.pdf_path is not null
     or (to_jsonb(new) - 'pdf_path') is distinct from (to_jsonb(old) - 'pdf_path') then
    raise exception 'Las facturas emitidas no se pueden modificar'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger invoices_guard_update
  before update on public.invoices
  for each row execute function public.invoices_guard_update();

alter table public.invoices enable row level security;

create policy "Miembros ven las facturas" on public.invoices
  for select to authenticated using (public.is_org_member(org_id));

create policy "Miembros con escritura emiten facturas" on public.invoices
  for insert to authenticated
  with check (public.can_write_org(org_id) and created_by = (select auth.uid()));

create policy "Miembros con escritura adjuntan el PDF" on public.invoices
  for update to authenticated
  using (public.can_write_org(org_id))
  with check (public.can_write_org(org_id));

-- TEMPORAL: hasta tener facturas rectificativas, el dueño puede eliminar.
-- Para cumplir VeriFactu esta política deberá desaparecer.
create policy "El dueño elimina facturas (temporal)" on public.invoices
  for delete to authenticated using (public.org_role(org_id) = 'owner');

-- ---------------------------------------------------------------------------
-- Almacenamiento de PDFs: invoice-pdfs/<org_id>/<invoice_id>.pdf
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoice-pdfs', 'invoice-pdfs', false, 10485760, array['application/pdf']);

-- Organización a la que pertenece una ruta del bucket (null si no es válida)
create function public.storage_path_org(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_name, '/', 1)::uuid
  end;
$$;

create policy "Miembros leen los PDFs de su organización" on storage.objects
  for select to authenticated
  using (bucket_id = 'invoice-pdfs' and public.is_org_member(public.storage_path_org(name)));

create policy "Miembros con escritura suben PDFs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'invoice-pdfs' and public.can_write_org(public.storage_path_org(name)));

create policy "El dueño elimina PDFs (temporal)" on storage.objects
  for delete to authenticated
  using (bucket_id = 'invoice-pdfs' and public.org_role(public.storage_path_org(name)) = 'owner');
