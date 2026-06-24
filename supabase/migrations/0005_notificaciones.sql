-- ============================================================
-- JSM Flow — Migración 0005 (Fase 4)
-- Log de notificaciones multicanal (email / WhatsApp)
-- ============================================================

create type notif_canal as enum ('email', 'whatsapp');
create type notif_estado as enum ('enviado', 'fallido', 'simulado');

create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  canal notif_canal not null,
  destinatario text not null,
  asunto text,
  cuerpo text not null,
  entidad text,
  entidad_id uuid,
  estado notif_estado not null default 'simulado',
  proveedor_msg_id text,        -- id del mensaje en Resend / WhatsApp
  error text,
  created_at timestamptz not null default now()
);
create index notificaciones_org_idx on notificaciones (org_id, created_at desc);
create index notificaciones_entidad_idx on notificaciones (entidad, entidad_id);

alter table notificaciones enable row level security;
create policy notificaciones_org_all on notificaciones for all
  using (is_member_of(org_id)) with check (is_member_of(org_id));
