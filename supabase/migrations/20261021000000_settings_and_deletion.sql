-- InvoiceX: ajustes de facturación por negocio y borrado de datos (RGPD)
-- Se puede ejecutar más de una vez sin error (if not exists / or replace).

-- ---------------------------------------------------------------------------
-- Valores por defecto de las facturas y serie de numeración
-- ---------------------------------------------------------------------------
-- number_prefix admite {AAAA} (año de la factura). Si lo incluye, la
-- numeración se reinicia cada año de forma natural: 2026-0001, 2027-0001…

alter table public.organizations
  add column if not exists default_vat numeric(4, 2) not null default 10
    check (default_vat in (0, 4, 10, 21)),
  add column if not exists default_prices_include_vat boolean not null default false,
  add column if not exists default_notes text not null default ''
    check (char_length(default_notes) <= 2000),
  add column if not exists number_prefix text not null default '{AAAA}-'
    check (char_length(number_prefix) <= 20),
  add column if not exists number_digits smallint not null default 4
    check (number_digits between 1 and 8);

-- ---------------------------------------------------------------------------
-- Borrar un usuario no debe fallar por las facturas que creó: el autor pasa
-- a null y la factura se conserva (obligación legal de conservarla)
-- ---------------------------------------------------------------------------

alter table public.invoices alter column created_by drop not null;
alter table public.invoices drop constraint if exists invoices_created_by_fkey;
alter table public.invoices
  add constraint invoices_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

-- La inmutabilidad permite ahora dos únicos cambios: adjuntar el PDF una vez
-- y que el autor pase a null al borrar su cuenta.
create or replace function public.invoices_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'pdf_path' - 'created_by')
       is distinct from (to_jsonb(old) - 'pdf_path' - 'created_by')
     or (new.pdf_path is distinct from old.pdf_path and old.pdf_path is not null)
     or (new.created_by is distinct from old.created_by and new.created_by is not null)
  then
    raise exception 'Las facturas emitidas no se pueden modificar'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Borrado del negocio y de la cuenta
-- Los PDFs del bucket se borran antes desde la app (Storage API), porque la
-- base de datos no puede borrar los archivos.
-- ---------------------------------------------------------------------------

-- Borra un negocio con todo su contenido. Solo el dueño.
create or replace function public.delete_organization(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.org_role(p_org) is distinct from 'owner' then
    raise exception 'Solo el dueño puede eliminar el negocio';
  end if;
  delete from public.organizations where id = p_org;
end;
$$;

-- Borra la cuenta del usuario actual y los negocios de los que es dueño
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  delete from public.organizations o
  where exists (
    select 1 from public.memberships m
    where m.org_id = o.id and m.user_id = v_uid and m.role = 'owner'
  );
  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_organization(uuid) from anon;
revoke execute on function public.delete_my_account() from anon;
