# Runbook de despliegue — JSM Flow

Despliegue: **Vercel** (app Next.js) + **Supabase** (Postgres/Auth/Storage).

## 1. Supabase (datos)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Enlaza el repo local:
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>
   ```
3. Aplica las migraciones (en orden `0001`…`0006`):
   ```bash
   npx supabase db push
   ```
4. (Opcional, solo entornos no productivos) carga datos demo:
   ```bash
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
5. Verifica seguridad:
   ```bash
   psql "$DATABASE_URL" -f supabase/tests/rls_audit.sql        # RLS en todas las tablas
   psql "$DATABASE_URL" -f supabase/tests/consecutivo_stress.sql
   ```
6. Toma las llaves en *Project Settings → API*: `URL`, `anon key`, `service_role key`.

## 2. Vercel (app)

1. Importa el repo en Vercel.
2. Variables de entorno (Production + Preview) — ver `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` *(server-only; nunca con prefijo NEXT_PUBLIC)*
   - `OPENAI_API_KEY`, `OPENAI_MODEL`
   - `RESEND_API_KEY`, `RESEND_FROM`, `NOTIFY_ADMIN_EMAIL`
   - `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`
   - `CRON_SECRET` *(habilita el cron de cobranza; Vercel lo manda como `Authorization: Bearer`)*
3. Deploy. El build corre `next build`; `vercel.json` registra el **cron diario** de cobranza (`/api/cron/cobranza`, 15:00 UTC ≈ 9:00 CT).

## 3. WhatsApp (Meta Cloud API)

1. App en Meta for Developers → producto WhatsApp; número verificado y plantillas aprobadas.
2. Webhook: `https://<dominio>/api/whatsapp/webhook`, *verify token* = `WHATSAPP_VERIFY_TOKEN`.
3. Sin credenciales el sistema **degrada a "simulado"** y registra en `notificaciones`.

## 4. Verificación post-deploy

- `GET /api/health` → `{ ok: true, env: {...} }`.
- Login con un usuario real; revisar que cada rol ve solo su organización (RLS).
- Crear cotización → validar → enviar → confirmar en `/portal/<token>` → verificar que se crea el proyecto.

## 5. Backups y recuperación

- Supabase: backups automáticos diarios (plan Pro) + PITR. Para respaldo manual:
  ```bash
  npx supabase db dump -f backup_$(date +%F).sql
  ```
- Restauración: crear proyecto nuevo y `psql < backup.sql`, o usar PITR desde el panel.

## 6. Rollback

- App: en Vercel, *Promote* el deploy previo (Instant Rollback).
- Datos: las migraciones son aditivas; para revertir una, escribe una migración compensatoria nueva (no edites migraciones ya aplicadas).

## 7. Observabilidad

- Logs de funciones en Vercel; logs SQL/políticas en Supabase.
- `notificaciones` y `bitacora` sirven como auditoría de mensajería y de flujo.
- Recomendado: conectar un uptime monitor a `GET /api/health`.
