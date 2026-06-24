-- ============================================================
-- Fase 8.4 — PO CONFIRMA vs CONFORMS
-- Flujo JSM (decisión "¿Cliente confirma?"):
--   · SÍ  → PO CONFIRMA  → estado 'confirmada' (genera proyecto)
--   · NO confirma aún → CONFORMS → estado 'conforme_pendiente' (en seguimiento;
--     el cliente todavía puede confirmar o pedir cambios)
-- Se agrega el estado intermedio para distinguir "confirmó" de "falta confirmar".
-- ============================================================

alter type cotizacion_estado add value if not exists 'conforme_pendiente' after 'enviada_cliente';
