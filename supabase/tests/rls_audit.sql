-- ============================================================
-- Auditoría de RLS (gate de Fase 5): toda tabla del esquema public
-- debe tener Row Level Security habilitada y al menos una política.
--
-- Uso:  psql "$DATABASE_URL" -f supabase/tests/rls_audit.sql
-- ============================================================

do $$
declare
  r record;
  v_policies int;
  v_fallos int := 0;
begin
  for r in
    select c.relname, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    if not r.relrowsecurity then
      raise warning 'RLS DESHABILITADA en %', r.relname;
      v_fallos := v_fallos + 1;
      continue;
    end if;

    select count(*) into v_policies
    from pg_policies where schemaname = 'public' and tablename = r.relname;

    if v_policies = 0 then
      raise warning 'Tabla % con RLS pero SIN políticas', r.relname;
      v_fallos := v_fallos + 1;
    end if;
  end loop;

  assert v_fallos = 0, format('Auditoría RLS falló: %s problema(s)', v_fallos);
  raise notice 'OK: todas las tablas public tienen RLS + políticas.';
end $$;
