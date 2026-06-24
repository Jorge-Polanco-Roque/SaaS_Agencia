-- ============================================================
-- JSM Flow — Migración 0008 (Fase 7)
-- Conversaciones del copiloto (metadatos para listar en la UI).
-- El historial del chat lo gestiona el checkpointer de LangGraph.
-- ============================================================

create table conversaciones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  seccion text not null default 'general',
  titulo text,
  thread_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversaciones_org_user_idx on conversaciones (org_id, user_id, updated_at desc);

alter table conversaciones enable row level security;
alter table conversaciones force row level security;

-- Cada quien ve y opera SOLO sus propias conversaciones, dentro de su org.
create policy conversaciones_propias on conversaciones for all
  using (org_id = auth_org_id() and user_id = auth.uid())
  with check (org_id = auth_org_id() and user_id = auth.uid());

grant select, insert, update, delete on table conversaciones to authenticated, service_role;
