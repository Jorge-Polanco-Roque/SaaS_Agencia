-- ============================================================
-- Fase 8.5 — Liquidación con composición contable
-- Flujo JSM (lane Compras/Finanzas → "Liquidación"):
--   + Anticipo / Traspaso   (entradas)
--   − Depósito
--   − Traspaso / Entrega $   (salidas)
-- Se clasifica cada movimiento con un `concepto` para poder armar el estado de
-- cuenta de liquidación (neto = entradas − salidas). El SIGNO por concepto vive
-- en la capa de servicio (configurable; glosario JSM por confirmar §1.4).
-- ============================================================

alter table pagos
  add column if not exists concepto text;  -- anticipo | traspaso | deposito | entrega | abono

comment on column pagos.concepto is
  'Concepto contable de liquidación: anticipo/traspaso (entrada) · deposito/entrega (salida). Signo en lib/services/liquidacion.ts';
