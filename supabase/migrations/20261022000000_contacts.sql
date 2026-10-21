-- InvoiceX: clientes y proveedores (contactos)
-- Se puede ejecutar más de una vez sin error.
--
-- Un contacto puede ser cliente, proveedor o ambas cosas. Las facturas se
-- enlazan a él con client_id, pero conservan su copia de los datos del
-- cliente (invoices.client): cambiar la ficha no altera facturas emitidas.

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  tax_id text not null default '',
  address text not null default '',
  city text not null default '', -- código postal y ciudad, como en las facturas
  email text not null default '',
  phone text not null default '',
  notes text not null default '' check (char_length(notes) <= 2000),
  is_client boolean not null default true,
  is_supplier boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_client or is_supplier)
);

create index if not exists contacts_org_name_idx on public.contacts (org_id, lower(name));

-- Un mismo NIF no puede repetirse dentro del negocio (los vacíos sí)
create unique index if not exists contacts_org_tax_id_key
  on public.contacts (org_id, upper(tax_id))
  where tax_id <> '';

drop trigger if exists contacts_touch_updated_at on public.contacts;
create trigger contacts_touch_updated_at
  before update on public.contacts
  for each row execute function public.touch_updated_at();

alter table public.contacts enable row level security;

drop policy if exists "Miembros ven los contactos" on public.contacts;
create policy "Miembros ven los contactos" on public.contacts
  for select to authenticated using (public.is_org_member(org_id));

drop policy if exists "Miembros con escritura crean contactos" on public.contacts;
create policy "Miembros con escritura crean contactos" on public.contacts
  for insert to authenticated with check (public.can_write_org(org_id));

drop policy if exists "Miembros con escritura editan contactos" on public.contacts;
create policy "Miembros con escritura editan contactos" on public.contacts
  for update to authenticated
  using (public.can_write_org(org_id))
  with check (public.can_write_org(org_id));

drop policy if exists "Miembros con escritura borran contactos" on public.contacts;
create policy "Miembros con escritura borran contactos" on public.contacts
  for delete to authenticated using (public.can_write_org(org_id));

-- ---------------------------------------------------------------------------
-- Enlace factura -> cliente
-- ---------------------------------------------------------------------------

alter table public.invoices
  add column if not exists client_id uuid references public.contacts (id) on delete set null;

create index if not exists invoices_client_id_idx on public.invoices (client_id);

-- Inmutabilidad: client_id es una referencia interna (los datos legales del
-- cliente están en invoices.client), así que puede enlazarse o soltarse.
create or replace function public.invoices_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'pdf_path' - 'created_by' - 'client_id')
       is distinct from (to_jsonb(old) - 'pdf_path' - 'created_by' - 'client_id')
     or (new.pdf_path is distinct from old.pdf_path and old.pdf_path is not null)
     or (new.created_by is distinct from old.created_by and new.created_by is not null)
  then
    raise exception 'Las facturas emitidas no se pueden modificar'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
