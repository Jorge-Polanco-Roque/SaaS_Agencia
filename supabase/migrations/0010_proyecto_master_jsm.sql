-- ============================================================
-- Fase 8.3 — Master de Proyectos: campos del flujo JSM
-- Origen: flujo-trabajo.pdf / flujo-automatizacion.html (lane Compras/Finanzas):
--   "② Master de Proyectos · Ejecutivo de Cuenta + Cóvac · Hijo/RIB ·
--    Validación # · asignar # al PDF Final".
-- NOTA: glosario JSM sin confirmar (CLAUDE.md §1.4). Se modelan como campos
-- CONFIGURABLES, sin reglas duras, hasta validar significado con el cliente.
-- ============================================================

alter table proyectos
  add column if not exists covac_id uuid references profiles (id),  -- 2º responsable / co-validador de cuenta
  add column if not exists hijo_rib text,        -- sub-proyecto / referencia interna (por confirmar)
  add column if not exists validacion_num text,  -- "Validación #"
  add column if not exists pdf_num text;         -- número asignado al PDF final

comment on column proyectos.covac_id is 'Cóvac: co-validador / 2º ejecutivo de cuenta (glosario JSM por confirmar §1.4)';
comment on column proyectos.hijo_rib is 'Hijo / RIB: sub-proyecto o referencia interna (glosario JSM por confirmar §1.4)';
comment on column proyectos.validacion_num is 'Número de validación del Master de Proyectos';
comment on column proyectos.pdf_num is 'Número asignado al PDF final de la cotización';
