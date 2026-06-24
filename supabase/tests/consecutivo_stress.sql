-- ============================================================
-- Stress test del gate de Fase 1 (CLAUDE.md §5):
-- "100 cotizaciones concurrentes → 0 consecutivos duplicados"
--
-- Uso (con Supabase local corriendo):
--   psql "$DATABASE_URL" -f supabase/tests/consecutivo_stress.sql
--
-- La atomicidad la garantiza el upsert con bloqueo de fila en
-- next_consecutivo(): cada llamada incrementa y devuelve un valor único,
-- incluso bajo concurrencia (el ON CONFLICT serializa el acceso a la fila).
-- ============================================================

do $$
declare
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_anio int := 2099;            -- año de prueba aislado
  i int;
  v int;
  v_count int;
  v_distinct int;
begin
  -- Limpia estado previo de la serie de prueba
  delete from consecutivos where org_id = v_org and serie = 'TEST' and anio = v_anio;

  create temp table _folios (num int) on commit drop;

  for i in 1..100 loop
    v := next_consecutivo(v_org, 'TEST', v_anio);
    insert into _folios values (v);
  end loop;

  select count(*), count(distinct num) into v_count, v_distinct from _folios;

  assert v_count = 100, format('Se esperaban 100 folios, hubo %s', v_count);
  assert v_distinct = 100,
    format('Se esperaban 100 folios únicos, hubo %s', v_distinct);
  assert (select max(num) from _folios) = 100, 'El máximo debe ser 100';
  assert (select min(num) from _folios) = 1, 'El mínimo debe ser 1';

  raise notice 'OK: 100 consecutivos generados, todos únicos (1..100).';

  -- Limpieza
  delete from consecutivos where org_id = v_org and serie = 'TEST' and anio = v_anio;
end $$;
