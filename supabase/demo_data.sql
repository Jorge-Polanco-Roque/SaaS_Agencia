-- ============================================================
-- JSM Flow — Datos demo para poblar Panel y Finanzas.
-- Ejecutar contra la DB local:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/demo_data.sql
-- Idempotente: limpia primero lo marcado como DEMO (titulo/concepto con prefijo).
-- ============================================================

do $$
declare
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_owner uuid;
  v_admin uuid;
  v_clientes uuid[];
  v_cli uuid;
  v_provs uuid[];
  v_prov uuid;
  v_cot uuid;
  v_proy uuid;
  v_oc uuid;
  v_folio int := 100;
  r record;
begin
  select id into v_owner from profiles where org_id = v_org and rol = 'ejecutivo' limit 1;
  select id into v_admin from profiles where org_id = v_org and rol = 'admin' limit 1;
  if v_owner is null then v_owner := (select id from profiles where org_id = v_org limit 1); end if;

  -- ---- limpieza de corridas previas (solo DEMO) ----
  delete from facturas where org_id = v_org and folio like 'DEMO-%';
  delete from pagos where org_id = v_org and referencia like 'DEMO-%';
  delete from solicitudes_pago where org_id = v_org and concepto like 'DEMO %';
  delete from ordenes_compra where org_id = v_org and notas like 'DEMO%';
  delete from cotizaciones where org_id = v_org and titulo like 'DEMO %';

  -- ---- clientes (asegura variedad) ----
  insert into clientes (org_id, nombre, rfc, email, telefono)
  select v_org, x.nombre, x.rfc, x.email, x.tel from (values
    ('Laboratorios Vida SA','LVI160101AAA','compras@labvida.test','5551110001'),
    ('Grupo Escolar Azteca','GEA170202BBB','admin@azteca.test','5551110002')
  ) as x(nombre,rfc,email,tel)
  where not exists (select 1 from clientes c where c.org_id=v_org and c.nombre=x.nombre);

  select array(select id from clientes where org_id = v_org order by created_at) into v_clientes;
  select array(select id from proveedores where org_id = v_org order by created_at) into v_provs;

  -- ---- cotizaciones (varios meses y estados) ----
  for r in
    select * from (values
      -- cliente_idx, titulo, estado, subtotal, meses_atras
      (1,'Promocionales farmacéutico Q1','confirmada', 58000.0, 5),
      (2,'Kit eventos corporativo feb','confirmada', 32000.0, 4),
      (1,'Activación marca marzo','confirmada', 75000.0, 3),
      (3,'Material escolar abril','confirmada', 41000.0, 2),
      (2,'Evento médico mayo','confirmada', 95000.0, 1),
      (1,'Promocionales junio','confirmada', 120000.0, 0),
      (4,'Termos y libretas junio','confirmada', 28000.0, 0),
      (2,'Carpa y mobiliario','enviada_cliente', 64000.0, 0),
      (3,'Promotoría 6 meses','enviada_cliente', 210000.0, 0),
      (1,'Stand feria salud','en_validacion', 48000.0, 0),
      (4,'Regalos fin de año','borrador', 35000.0, 0),
      (2,'Ajuste evento (cambios)','en_negociacion', 52000.0, 0)
    ) as t(cli_idx, titulo, estado, subtotal, meses)
  loop
    v_cli := v_clientes[ least(r.cli_idx, array_length(v_clientes,1)) ];
    v_cot := gen_random_uuid();
    v_folio := v_folio + 1;

    insert into cotizaciones (
      id, org_id, cliente_id, owner_id, estado, serie,
      folio_anio, folio_num, folio, titulo, moneda, iva_tasa, descuento,
      subtotal, iva, total, costo_total, margen,
      validada_por, validada_at, enviada_at, created_at, updated_at
    ) values (
      v_cot, v_org, v_cli, v_owner, r.estado::cotizacion_estado, 'COT',
      case when r.estado in ('validada','enviada_cliente','confirmada','en_negociacion') then 2026 end,
      case when r.estado in ('validada','enviada_cliente','confirmada','en_negociacion') then v_folio end,
      case when r.estado in ('validada','enviada_cliente','confirmada','en_negociacion') then 'COT-2026-' || lpad(v_folio::text,5,'0') end,
      'DEMO ' || r.titulo, 'MXN', 0.16, 0,
      r.subtotal, round(r.subtotal*0.16,2), round(r.subtotal*1.16,2),
      round(r.subtotal*0.6,2), round(r.subtotal*0.4,2),
      case when r.estado in ('validada','enviada_cliente','confirmada','en_negociacion') then v_admin end,
      case when r.estado in ('validada','enviada_cliente','confirmada','en_negociacion') then now() - make_interval(months => r.meses) end,
      case when r.estado in ('enviada_cliente','confirmada','en_negociacion') then now() - make_interval(months => r.meses) end,
      now() - make_interval(months => r.meses), now() - make_interval(months => r.meses)
    );

    insert into cotizacion_items (org_id, cotizacion_id, descripcion, cantidad, unidad, costo_unitario, precio_unitario, importe, orden)
    values (v_org, v_cot, r.titulo, 1, 'servicio', round(r.subtotal*0.6,2), r.subtotal, r.subtotal, 0);

    -- proyecto + tareas + factura para las confirmadas
    if r.estado = 'confirmada' then
      v_proy := gen_random_uuid();
      insert into proyectos (id, org_id, cotizacion_id, cliente_id, nombre, estado, responsable_id, fecha_inicio, created_at)
      values (v_proy, v_org, v_cot, v_cli, 'DEMO ' || r.titulo, 'activo', v_owner,
              (now() - make_interval(months => r.meses))::date, now() - make_interval(months => r.meses));

      insert into tareas (org_id, proyecto_id, titulo, columna, orden)
      values
        (v_org, v_proy, 'Confirmar inventario con proveedor', 'hecho', 0),
        (v_org, v_proy, 'Generar orden de compra', 'hecho', 1),
        (v_org, v_proy, 'Coordinar producción/entrega', 'en_proceso', 2),
        (v_org, v_proy, 'Seguimiento de pago', 'por_hacer', 3);

      -- factura emitida al cliente: variedad de cobranza
      insert into facturas (org_id, tipo, proyecto_id, cliente_id, folio, monto, moneda, estado, fecha_emision, fecha_vencimiento, cobrada_at, created_by)
      values (
        v_org, 'emitida_cliente', v_proy, v_cli,
        'DEMO-F-' || v_folio, round(r.subtotal*1.16,2), 'MXN',
        (case when r.meses >= 3 then 'pagada' else 'registrada' end)::factura_estado,
        (now() - make_interval(months => r.meses))::date,
        (now() - make_interval(months => r.meses) + interval '30 days')::date,
        case when r.meses >= 3 then now() - make_interval(months => r.meses) + interval '20 days' end,
        v_admin
      );
    end if;
  end loop;

  -- ---- órdenes de compra + pagos (saldo a proveedores) ----
  for r in
    select * from (values
      ('autorizada', 90000.0, 0.5),   -- 50% pagado
      ('autorizada', 45000.0, 1.0),   -- liquidada
      ('por_autorizar', 60000.0, 0.0)
    ) as t(estado, subtotal, pagado_frac)
  loop
    v_prov := v_provs[ 1 + (floor(random()*greatest(array_length(v_provs,1),1)))::int ];
    if v_prov is null then v_prov := v_provs[1]; end if;
    v_oc := gen_random_uuid();
    v_folio := v_folio + 1;

    insert into ordenes_compra (
      id, org_id, proveedor_id, serie, folio_anio, folio_num, folio, estado,
      moneda, iva_tasa, subtotal, iva, total, notas, created_by, autorizada_por, autorizada_at, created_at
    ) values (
      v_oc, v_org, v_prov, 'OC', 2026, v_folio,
      case when r.estado='autorizada' then 'OC-2026-' || lpad(v_folio::text,5,'0') end,
      r.estado::oc_estado, 'MXN', 0.16, r.subtotal, round(r.subtotal*0.16,2), round(r.subtotal*1.16,2),
      'DEMO orden', v_owner,
      case when r.estado='autorizada' then v_admin end,
      case when r.estado='autorizada' then now() - interval '10 days' end,
      now() - interval '12 days'
    );
    insert into orden_compra_items (org_id, orden_compra_id, descripcion, cantidad, unidad, costo_unitario, importe, orden)
    values (v_org, v_oc, 'Insumos del evento', 1, 'lote', r.subtotal, r.subtotal, 0);

    if r.pagado_frac > 0 then
      insert into pagos (org_id, orden_compra_id, proveedor_id, tipo, monto, moneda, metodo, referencia, fecha, created_by)
      values (v_org, v_oc, v_prov, 'anticipo', round(r.subtotal*1.16*r.pagado_frac,2), 'MXN', 'transferencia', 'DEMO-P-' || v_folio, (now() - interval '8 days')::date, v_admin);
    end if;
  end loop;

  -- ---- solicitudes de pago ----
  insert into solicitudes_pago (org_id, concepto, tipo, monto, estado, solicitado_por, created_at)
  values
    (v_org, 'DEMO Anticipo proveedor carpa', 'anticipo', 25000, 'pendiente', v_owner, now() - interval '2 days'),
    (v_org, 'DEMO Liquidación material escolar', 'liquidacion', 18000, 'autorizada', v_owner, now() - interval '5 days'),
    (v_org, 'DEMO Reembolso viáticos', 'reembolso', 3200, 'pendiente', v_owner, now() - interval '1 day');

  raise notice 'Datos demo cargados.';
end $$;
