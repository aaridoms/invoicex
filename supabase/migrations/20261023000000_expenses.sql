-- InvoiceX: gastos (facturas recibidas)
-- Se puede ejecutar más de una vez sin error.
--
-- A diferencia de las facturas emitidas, un gasto es un registro propio de
-- lo recibido: se puede corregir y borrar. El archivo original (PDF o foto)
-- se guarda en el bucket privado expense-files.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid references public.contacts (id) on delete set null,
  -- Copia de los datos del proveedor tal como venían en la factura
  supplier jsonb not null default '{}'::jsonb,
  number text not null default '',
  issue_date date not null,
  category text not null default 'otros',
  -- Desglose por tipo de IVA: [{ "rate": 10, "base": 100.00, "cuota": 10.00 }]
  vat_lines jsonb not null default '[]'::jsonb,
  base numeric(12, 2) not null default 0,
  vat numeric(12, 2) not null default 0,
  -- Retención de IRPF (facturas de profesionales); se resta del total
  retention numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  notes text not null default '' check (char_length(notes) <= 2000),
  file_path text,
  file_name text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_org_date_idx on public.expenses (org_id, issue_date desc);
create index if not exists expenses_supplier_idx on public.expenses (supplier_id);

drop trigger if exists expenses_touch_updated_at on public.expenses;
create trigger expenses_touch_updated_at
  before update on public.expenses
  for each row execute function public.touch_updated_at();

alter table public.expenses enable row level security;

drop policy if exists "Miembros ven los gastos" on public.expenses;
create policy "Miembros ven los gastos" on public.expenses
  for select to authenticated using (public.is_org_member(org_id));

drop policy if exists "Miembros con escritura crean gastos" on public.expenses;
create policy "Miembros con escritura crean gastos" on public.expenses
  for insert to authenticated with check (public.can_write_org(org_id));

drop policy if exists "Miembros con escritura editan gastos" on public.expenses;
create policy "Miembros con escritura editan gastos" on public.expenses
  for update to authenticated
  using (public.can_write_org(org_id))
  with check (public.can_write_org(org_id));

drop policy if exists "Miembros con escritura borran gastos" on public.expenses;
create policy "Miembros con escritura borran gastos" on public.expenses
  for delete to authenticated using (public.can_write_org(org_id));

-- ---------------------------------------------------------------------------
-- Archivos: expense-files/<org_id>/<expense_id>/<nombre>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-files', 'expense-files', false, 15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Miembros leen los archivos de gastos" on storage.objects;
create policy "Miembros leen los archivos de gastos" on storage.objects
  for select to authenticated
  using (bucket_id = 'expense-files' and public.is_org_member(public.storage_path_org(name)));

drop policy if exists "Miembros con escritura suben archivos de gastos" on storage.objects;
create policy "Miembros con escritura suben archivos de gastos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'expense-files' and public.can_write_org(public.storage_path_org(name)));

drop policy if exists "Miembros con escritura borran archivos de gastos" on storage.objects;
create policy "Miembros con escritura borran archivos de gastos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'expense-files' and public.can_write_org(public.storage_path_org(name)));
