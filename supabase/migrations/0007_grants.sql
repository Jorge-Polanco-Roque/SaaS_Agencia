-- ============================================================
-- JSM Flow — Migración 0007 (Fase 5, fix)
-- Concede privilegios DML a los roles de PostgREST sobre las tablas del
-- negocio. La seguridad de filas la siguen aplicando las políticas RLS
-- (authenticated) y el bypass de service_role. `anon` permanece sin acceso
-- (revocado en 0006); el portal del cliente usa service_role.
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
    execute format(
      'grant select, insert, update, delete on table %I to authenticated, service_role;',
      t
    );
  end loop;
end $$;
