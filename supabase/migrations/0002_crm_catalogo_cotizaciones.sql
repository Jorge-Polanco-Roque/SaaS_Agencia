-- ============================================================
-- JSM Flow — Migración 0002 (Fase 1)
-- CRM + Catálogo + Cotizaciones + Consecutivos + Bitácora
-- Toda tabla lleva org_id + RLS por organización (CLAUDE.md §4).
-- ============================================================

-- ------------------------------------------------------------
-- Helper de RLS reutilizable: pertenencia a la organización
-- ------------------------------------------------------------
create or replace function is_member_of(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_org = auth_org_id();
$$;

-- ============================================================
-- CRM
-- ============================================================
create table clientes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  nombre text not null,
  rfc text,
  email text,
  telefono text,
  notas text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clientes_org_idx on clientes (org_id);

create table contactos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  cliente_id uuid not null references clientes (id) on delete cascade,
  nombre text not null,
  cargo text,
  email text,
  telefono text,
  created_at timestamptz not null default now()
);
create index contactos_cliente_idx on contactos (cliente_id);

-- ============================================================
-- Catálogo
-- ============================================================
create table proveedores (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  nombre text not null,
  categoria text,                       -- Amazon, DF, Sorteo, KFC, etc.
  contacto text,
  email text,
  telefono text,
  dias_entrega int,                     -- lead time típico (Tiempo × días)
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index proveedores_org_idx on proveedores (org_id);

create type producto_tipo as enum ('promocional', 'evento', 'servicio');

create table productos_servicios (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  tipo producto_tipo not null default 'promocional',
  nombre text not null,
  descripcion text,
  unidad text not null default 'pieza',
  costo numeric(12, 2) not null default 0,           -- interno (no se expone al cliente)
  precio_publico numeric(12, 2) not null default 0,  -- precio general al público
  proveedor_id uuid references proveedores (id) on delete set null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index productos_org_idx on productos_servicios (org_id);

-- ============================================================
-- Consecutivos (folios de cotización) — generación atómica
-- ============================================================
create table consecutivos (
  org_id uuid not null references organizations (id) on delete cascade,
  serie text not null,          -- p.ej. 'COT'
  anio int not null,
  ultimo int not null default 0,
  primary key (org_id, serie, anio)
);

-- Devuelve el siguiente número de forma atómica (upsert con bloqueo de fila).
-- Seguro bajo concurrencia: 100 llamadas → 100 números únicos.
create or replace function next_consecutivo(p_org uuid, p_serie text, p_anio int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num int;
begin
  insert into consecutivos (org_id, serie, anio, ultimo)
  values (p_org, p_serie, p_anio, 1)
  on conflict (org_id, serie, anio)
  do update set ultimo = consecutivos.ultimo + 1
  returning ultimo into v_num;
  return v_num;
end;
$$;

-- ============================================================
-- Cotizaciones
-- ============================================================
create type cotizacion_estado as enum (
  'borrador',
  'en_validacion',
  'validada',
  'rechazada',
  'enviada_cliente',
  'confirmada',
  'en_negociacion',
  'cancelada'
);

create table cotizaciones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  cliente_id uuid not null references clientes (id) on delete restrict,
  owner_id uuid not null references profiles (id),
  estado cotizacion_estado not null default 'borrador',
  -- Folio/consecutivo: se asigna al validar (no antes)
  serie text not null default 'COT',
  folio_anio int,
  folio_num int,
  folio text,                                   -- p.ej. COT-2026-00007
  version int not null default 1,
  titulo text not null,
  moneda text not null default 'MXN',
  iva_tasa numeric(5, 4) not null default 0.16, -- 16% por defecto
  descuento numeric(12, 2) not null default 0,
  -- Totales calculados (persistidos para reporting)
  subtotal numeric(12, 2) not null default 0,
  iva numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  costo_total numeric(12, 2) not null default 0,
  margen numeric(12, 2) not null default 0,     -- subtotal - costo_total
  notas text,
  validada_por uuid references profiles (id),
  validada_at timestamptz,
  enviada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cotizaciones_org_idx on cotizaciones (org_id);
create index cotizaciones_cliente_idx on cotizaciones (cliente_id);
create unique index cotizaciones_folio_uq
  on cotizaciones (org_id, serie, folio_anio, folio_num)
  where folio_num is not null;

create table cotizacion_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  cotizacion_id uuid not null references cotizaciones (id) on delete cascade,
  producto_id uuid references productos_servicios (id) on delete set null,
  descripcion text not null,
  cantidad numeric(12, 2) not null default 1,
  unidad text not null default 'pieza',
  costo_unitario numeric(12, 2) not null default 0,
  precio_unitario numeric(12, 2) not null default 0,
  importe numeric(12, 2) not null default 0,    -- cantidad * precio_unitario
  orden int not null default 0
);
create index cotizacion_items_cot_idx on cotizacion_items (cotizacion_id);

-- Historial de versiones (snapshot al modificar — soporta "¿Mueve?")
create table cotizacion_versiones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  cotizacion_id uuid not null references cotizaciones (id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  motivo text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);
create index cotizacion_versiones_cot_idx on cotizacion_versiones (cotizacion_id);

-- ============================================================
-- Bitácora (trazabilidad / Track ID — CLAUDE.md §4.2)
-- ============================================================
create table bitacora (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  entidad text not null,            -- 'cotizacion', 'cliente', ...
  entidad_id uuid not null,
  accion text not null,             -- 'crear', 'transicion', 'enviar', ...
  estado_anterior text,
  estado_nuevo text,
  actor_id uuid references profiles (id),
  meta jsonb,
  created_at timestamptz not null default now()
);
create index bitacora_entidad_idx on bitacora (org_id, entidad, entidad_id);

-- ============================================================
-- RLS — todas las tablas restringidas a la organización
-- ============================================================
alter table clientes enable row level security;
alter table contactos enable row level security;
alter table proveedores enable row level security;
alter table productos_servicios enable row level security;
alter table consecutivos enable row level security;
alter table cotizaciones enable row level security;
alter table cotizacion_items enable row level security;
alter table cotizacion_versiones enable row level security;
alter table bitacora enable row level security;

-- Política uniforme: miembros de la org pueden operar sobre filas de su org.
-- (Las restricciones por rol se aplican en los Server Actions / servicios.)
do $$
declare t text;
begin
  foreach t in array array[
    'clientes','contactos','proveedores','productos_servicios',
    'cotizaciones','cotizacion_items','cotizacion_versiones','bitacora'
  ] loop
    execute format(
      'create policy %1$s_org_all on %1$s for all
         using (is_member_of(org_id))
         with check (is_member_of(org_id));', t);
  end loop;
end $$;

-- consecutivos: solo lectura para miembros; la escritura va por la función
-- security definer next_consecutivo (evita manipulación directa del contador).
create policy consecutivos_org_select on consecutivos for select
  using (is_member_of(org_id));
