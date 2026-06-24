-- ============================================================
-- JSM Flow — Migración 0004 (Fase 3)
-- Compras (órdenes de compra) + Finanzas (solicitudes, pagos, facturas)
-- ============================================================

create type oc_estado as enum (
  'borrador', 'por_autorizar', 'autorizada', 'rechazada', 'cerrada', 'cancelada'
);
create type solicitud_tipo as enum (
  'anticipo', 'liquidacion', 'pago_unico', 'reembolso'
);
create type solicitud_estado as enum (
  'pendiente', 'autorizada', 'rechazada', 'pagada'
);
create type pago_tipo as enum ('anticipo', 'dispersion', 'liquidacion', 'abono');
create type factura_tipo as enum ('emitida_cliente', 'recibida_proveedor');
create type factura_estado as enum ('registrada', 'pagada', 'cancelada');

-- ------------------------------------------------------------
-- Órdenes de compra (PO) ligadas a proyecto y proveedor
-- ------------------------------------------------------------
create table ordenes_compra (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  proyecto_id uuid references proyectos (id) on delete set null,
  proveedor_id uuid not null references proveedores (id) on delete restrict,
  serie text not null default 'OC',
  folio_anio int,
  folio_num int,
  folio text,
  estado oc_estado not null default 'borrador',
  moneda text not null default 'MXN',
  iva_tasa numeric(5, 4) not null default 0.16,
  subtotal numeric(14, 2) not null default 0,
  iva numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  notas text,
  created_by uuid references profiles (id),
  autorizada_por uuid references profiles (id),
  autorizada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index oc_org_idx on ordenes_compra (org_id);
create index oc_proyecto_idx on ordenes_compra (proyecto_id);
create unique index oc_folio_uq
  on ordenes_compra (org_id, serie, folio_anio, folio_num)
  where folio_num is not null;

create table orden_compra_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  orden_compra_id uuid not null references ordenes_compra (id) on delete cascade,
  producto_id uuid references productos_servicios (id) on delete set null,
  descripcion text not null,
  cantidad numeric(14, 2) not null default 1,
  unidad text not null default 'pieza',
  costo_unitario numeric(14, 2) not null default 0,
  importe numeric(14, 2) not null default 0,
  orden int not null default 0
);
create index oc_items_oc_idx on orden_compra_items (orden_compra_id);

-- ------------------------------------------------------------
-- Solicitudes de pago (los "forms de solicitud de pago")
-- ------------------------------------------------------------
create table solicitudes_pago (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  proyecto_id uuid references proyectos (id) on delete set null,
  orden_compra_id uuid references ordenes_compra (id) on delete set null,
  proveedor_id uuid references proveedores (id) on delete set null,
  concepto text not null,
  tipo solicitud_tipo not null default 'pago_unico',
  monto numeric(14, 2) not null,
  moneda text not null default 'MXN',
  estado solicitud_estado not null default 'pendiente',
  fecha_requerida date,
  solicitado_por uuid references profiles (id),
  autorizado_por uuid references profiles (id),
  autorizado_at timestamptz,
  created_at timestamptz not null default now()
);
create index sp_org_idx on solicitudes_pago (org_id);
create index sp_estado_idx on solicitudes_pago (org_id, estado);

-- ------------------------------------------------------------
-- Pagos (dispersión / anticipos / liquidación) + comprobante
-- ------------------------------------------------------------
create table pagos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  solicitud_pago_id uuid references solicitudes_pago (id) on delete set null,
  orden_compra_id uuid references ordenes_compra (id) on delete set null,
  proyecto_id uuid references proyectos (id) on delete set null,
  proveedor_id uuid references proveedores (id) on delete set null,
  tipo pago_tipo not null default 'abono',
  monto numeric(14, 2) not null,
  moneda text not null default 'MXN',
  metodo text,
  referencia text,
  comprobante_url text,
  fecha date not null default current_date,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);
create index pagos_org_idx on pagos (org_id);
create index pagos_oc_idx on pagos (orden_compra_id);

-- ------------------------------------------------------------
-- Facturas (registro / integración — NO timbra; CLAUDE.md §1.3)
-- ------------------------------------------------------------
create table facturas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete restrict,
  tipo factura_tipo not null,
  proyecto_id uuid references proyectos (id) on delete set null,
  orden_compra_id uuid references ordenes_compra (id) on delete set null,
  cliente_id uuid references clientes (id) on delete set null,
  proveedor_id uuid references proveedores (id) on delete set null,
  folio text not null,
  uuid_sat text,
  xml_url text,
  pdf_url text,
  monto numeric(14, 2) not null default 0,
  moneda text not null default 'MXN',
  estado factura_estado not null default 'registrada',
  fecha_emision date not null default current_date,
  fecha_vencimiento date,
  cobrada_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);
create index facturas_org_idx on facturas (org_id);
create index facturas_cobranza_idx on facturas (org_id, tipo, estado);

-- ============================================================
-- RLS
-- ============================================================
alter table ordenes_compra enable row level security;
alter table orden_compra_items enable row level security;
alter table solicitudes_pago enable row level security;
alter table pagos enable row level security;
alter table facturas enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'ordenes_compra','orden_compra_items','solicitudes_pago','pagos','facturas'
  ] loop
    execute format(
      'create policy %1$s_org_all on %1$s for all
         using (is_member_of(org_id))
         with check (is_member_of(org_id));', t);
  end loop;
end $$;
