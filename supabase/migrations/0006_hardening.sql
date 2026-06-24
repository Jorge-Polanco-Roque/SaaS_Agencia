-- ============================================================
-- JSM Flow — Migración 0006 (Fase 5)
-- Endurecimiento: FORCE RLS + revocar acceso del rol anónimo.
-- El portal del cliente accede vía service_role (bypassrls), no vía anon,
-- por lo que anon no necesita acceso a ninguna tabla.
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','profiles','clientes','contactos','proveedores',
    'productos_servicios','consecutivos','cotizaciones','cotizacion_items',
    'cotizacion_versiones','bitacora','proyectos','tareas','ordenes_compra',
    'orden_compra_items','solicitudes_pago','pagos','facturas','notificaciones'
  ] loop
    -- Sujeta incluso al dueño de la tabla a las políticas RLS
    execute format('alter table %I force row level security;', t);
    -- El rol anónimo no opera sobre datos de negocio
    execute format('revoke all on table %I from anon;', t);
  end loop;
end $$;
