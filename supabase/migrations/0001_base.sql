-- ============================================================
-- JSM Flow — Migración base (Fase 0)
-- organizations, profiles, roles, RLS multi-tenant
-- ============================================================

-- Roles del sistema (ver CLAUDE.md §4.1)
create type app_role as enum (
  'super_admin',
  'ejecutivo',
  'admin',
  'operaciones',
  'compras_finanzas',
  'contabilidad',
  'cliente'
);

-- Organizaciones (tenant)
create table organizations (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

-- Perfiles: 1:1 con auth.users, pertenece a una organización con un rol
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references organizations (id) on delete restrict,
  nombre text not null,
  rol app_role not null default 'ejecutivo',
  created_at timestamptz not null default now()
);

create index profiles_org_id_idx on profiles (org_id);

-- ============================================================
-- Helpers (SECURITY DEFINER para evitar recursión en políticas)
-- ============================================================

-- org_id del usuario autenticado
create or replace function auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

-- rol del usuario autenticado
create or replace function auth_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select rol from profiles where id = auth.uid();
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table organizations enable row level security;
alter table profiles enable row level security;

-- Una organización es visible para sus miembros
create policy "org: miembros pueden ver su organización"
  on organizations for select
  using (id = auth_org_id());

-- Perfiles: visibles dentro de la misma organización
create policy "profiles: ver dentro de la organización"
  on profiles for select
  using (org_id = auth_org_id());

-- Un usuario puede actualizar su propio perfil (no su rol/org — controlado en servidor)
create policy "profiles: editar propio perfil"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- super_admin y admin gestionan perfiles de su organización
create policy "profiles: admin gestiona la organización"
  on profiles for all
  using (org_id = auth_org_id() and auth_role() in ('super_admin', 'admin'))
  with check (org_id = auth_org_id() and auth_role() in ('super_admin', 'admin'));
