-- ============================================================================
-- mcp_tokens — Personal Access Tokens para el MCP server (CLAUDE.md §3.2 / Fase 4)
-- ============================================================================
-- Esta migración pertenece al esquema de la APP JSM Flow. Cópiala a
-- ../proyecto_agencia/supabase/migrations/ y aplícala con `supabase db reset`/`db push`.
--
-- Modelo: un PAT es un token opaco (prefijo `jsmpat_`) que el usuario guarda en su cliente
-- MCP. Guardamos solo su HASH (sha256) y el REFRESH TOKEN de Supabase (cifrado por la app a
-- nivel de columna o por pgcrypto/KMS). El MCP, al recibir el PAT, lo busca con service_role,
-- intercambia el refresh token por un access token fresco y opera SIEMPRE bajo RLS con ese
-- access token (nunca con service_role para datos de dominio).
--
-- Aislamiento: el acceso al PAT se controla por user_id/org_id; estas filas son infraestructura
-- (las consulta solo el server con service_role), por eso van con RLS restrictiva.

create table if not exists public.mcp_tokens (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  nombre          text not null,                       -- etiqueta legible ("MacBook de Jorge")
  token_hash      text not null unique,                -- sha256(hex) del PAT en claro
  refresh_token   text not null,                       -- refresh token de Supabase (cifrar en reposo)
  scopes          text[] not null default '{}',        -- reservado (futuro: limitar tools)
  revoked         boolean not null default false,
  created_at      timestamptz not null default now(),
  last_used_at    timestamptz
);

create index if not exists mcp_tokens_user_idx on public.mcp_tokens(user_id);
create index if not exists mcp_tokens_org_idx  on public.mcp_tokens(org_id);

alter table public.mcp_tokens enable row level security;
alter table public.mcp_tokens force row level security;

-- Sin políticas para roles anon/authenticated: solo service_role (que omite RLS) puede leerla
-- desde el MCP server. Un usuario nunca consulta esta tabla directamente desde la app cliente.
revoke all on public.mcp_tokens from anon, authenticated;
-- service_role omite RLS pero necesita el GRANT a nivel de tabla para operar.
grant all on public.mcp_tokens to service_role;
