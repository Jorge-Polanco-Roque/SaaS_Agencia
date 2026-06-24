-- ============================================================
-- JSM Flow — Migración 0003 (Fase 2)
-- Master de Proyectos + Tareas (Kanban) + Portal del cliente
-- ============================================================

create type proyecto_estado as enum ('activo', 'en_pausa', 'cerrado', 'cancelado');
create type tarea_columna as enum ('por_hacer', 'en_proceso', 'bloqueado', 'hecho');

-- ------------------------------------------------------------
-- Proyectos (se crean al confirmar la cotización)
-- ------------------------------------------------------------
create table proyectos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  cotizacion_id uuid references cotizaciones (id) on delete set null,
  cliente_id uuid not null references clientes (id) on delete restrict,
  nombre text not null,
  estado proyecto_estado not null default 'activo',
  responsable_id uuid references profiles (id),
  fecha_inicio date,
  fecha_entrega date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index proyectos_org_idx on proyectos (org_id);
create index proyectos_cliente_idx on proyectos (cliente_id);
create unique index proyectos_cotizacion_uq
  on proyectos (cotizacion_id)
  where cotizacion_id is not null;

-- ------------------------------------------------------------
-- Tareas (tablero Kanban)
-- ------------------------------------------------------------
create table tareas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  proyecto_id uuid not null references proyectos (id) on delete cascade,
  titulo text not null,
  descripcion text,
  columna tarea_columna not null default 'por_hacer',
  orden int not null default 0,           -- posición dentro de la columna
  responsable_id uuid references profiles (id),
  fecha_limite date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tareas_proyecto_idx on tareas (proyecto_id);
create index tareas_columna_idx on tareas (proyecto_id, columna, orden);

-- ------------------------------------------------------------
-- Portal del cliente: token por cotización (se genera al enviar)
-- ------------------------------------------------------------
alter table cotizaciones add column portal_token uuid;
create unique index cotizaciones_portal_token_uq
  on cotizaciones (portal_token)
  where portal_token is not null;

-- ============================================================
-- RLS
-- ============================================================
alter table proyectos enable row level security;
alter table tareas enable row level security;

create policy proyectos_org_all on proyectos for all
  using (is_member_of(org_id)) with check (is_member_of(org_id));
create policy tareas_org_all on tareas for all
  using (is_member_of(org_id)) with check (is_member_of(org_id));

-- NOTA: el portal del cliente accede vía service_role (omite RLS) usando el
-- portal_token como credencial. No se expone ninguna política pública sobre
-- cotizaciones para usuarios anónimos.
