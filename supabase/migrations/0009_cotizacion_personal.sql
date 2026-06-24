-- ============================================================
-- Fase 8.1 — Modelo de personal en cotización (rol × personas × días)
-- Cliente (init.md): "promotoría a 6 meses (supervisor/promotor/coordinador)
-- personas por x días". Un ítem de personal cotiza tarifa por persona/día:
--   importe = cantidad (personas) × dias × precio_unitario.
-- Retrocompatible: modalidad 'producto' (default) sigue cantidad × precio_unitario
-- (dias = 1 implícito).
-- ============================================================

alter table cotizacion_items
  add column if not exists modalidad text not null default 'producto'
    check (modalidad in ('producto', 'personal')),
  add column if not exists rol text,                 -- p.ej. supervisor / promotor / coordinador
  add column if not exists dias integer not null default 1
    check (dias >= 1);

comment on column cotizacion_items.importe is
  'producto: cantidad × precio_unitario · personal: cantidad(personas) × dias × precio_unitario';
comment on column cotizacion_items.cantidad is
  'producto: cantidad de piezas · personal: número de personas del rol';
