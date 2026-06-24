-- ============================================================
-- JSM Flow — Seed de desarrollo
-- Crea una organización demo y usuarios de prueba (uno por rol).
-- Pensado para `supabase db reset` en entorno LOCAL.
-- ============================================================

-- Organización demo (id fijo para reproducibilidad)
insert into organizations (id, nombre)
values ('00000000-0000-0000-0000-000000000001', 'JSM Agencia (Demo)')
on conflict (id) do nothing;

-- Los usuarios demo y sus profiles se crean con la API de administración
-- (maneja correctamente auth.identities y el hashing): `npm run seed:users`.
-- Aquí solo va la organización y los datos de negocio.

-- ============================================================
-- Datos demo de Fase 1: clientes, proveedores y catálogo
-- ============================================================
do $$
declare
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_amazon uuid;
  v_local uuid;   -- Promocionales DF
  v_sorteo uuid;  -- Sorteo
  v_kfc uuid;     -- KFC (proveedor de eventos/alimentos del flujo JSM)
begin
  -- Clientes
  insert into clientes (org_id, nombre, rfc, email, telefono)
  values
    (v_org, 'Farmacéutica del Norte SA', 'FNO101010AAA', 'compras@fnorte.test', '8112345678'),
    (v_org, 'Eventos Corporativos MX', 'ECM200200BBB', 'hola@eventosmx.test', '5544332211')
  on conflict do nothing;

  -- Proveedores base del flujo JSM (Amazon · DF · Sorteo · KFC)
  insert into proveedores (org_id, nombre, categoria, dias_entrega, email)
  values (v_org, 'Amazon Business', 'Amazon', 3, 'b2b@amazon.test')
  returning id into v_amazon;

  insert into proveedores (org_id, nombre, categoria, dias_entrega, email)
  values (v_org, 'Promocionales DF', 'DF', 7, 'ventas@promodf.test')
  returning id into v_local;

  insert into proveedores (org_id, nombre, categoria, dias_entrega, email)
  values (v_org, 'Sorteo Promo', 'Sorteo', 10, 'ventas@sorteo.test')
  returning id into v_sorteo;

  insert into proveedores (org_id, nombre, categoria, dias_entrega, email)
  values (v_org, 'KFC Eventos', 'KFC', 2, 'catering@kfc.test')
  returning id into v_kfc;

  -- ============================================================
  -- Catálogo base JSM: 25 promocionales + 25 eventos + servicios de personal
  -- (costo interno / precio_publico). Cliente: init.md "Promocionales (25) y eventos (25)".
  -- ============================================================
  insert into productos_servicios (org_id, tipo, nombre, descripcion, unidad, costo, precio_publico, proveedor_id)
  values
    -- ── 25 PROMOCIONALES ──
    (v_org, 'promocional', 'Termo personalizado 600ml', 'Acero inoxidable con logo', 'pieza', 85, 180, v_local),
    (v_org, 'promocional', 'Libreta ecológica', 'Pasta dura, hojas recicladas', 'pieza', 28, 65, v_local),
    (v_org, 'promocional', 'Pluma metálica', 'Grabado láser', 'pieza', 12, 35, v_amazon),
    (v_org, 'promocional', 'Taza de cerámica 11oz', 'Sublimación a color', 'pieza', 22, 55, v_local),
    (v_org, 'promocional', 'Mochila ejecutiva', 'Poliéster con compartimento laptop', 'pieza', 180, 390, v_amazon),
    (v_org, 'promocional', 'Gorra bordada', 'Algodón, bordado de logo', 'pieza', 45, 110, v_local),
    (v_org, 'promocional', 'Playera cuello redondo', 'Algodón 180g, serigrafía', 'pieza', 55, 130, v_local),
    (v_org, 'promocional', 'USB 32GB', 'Memoria con grabado láser', 'pieza', 70, 160, v_amazon),
    (v_org, 'promocional', 'Power bank 10000mAh', 'Batería portátil con logo', 'pieza', 150, 320, v_amazon),
    (v_org, 'promocional', 'Bolsa ecológica de yute', 'Asas reforzadas, serigrafía', 'pieza', 30, 75, v_local),
    (v_org, 'promocional', 'Paraguas automático', 'Doble tela, antiviento', 'pieza', 95, 210, v_local),
    (v_org, 'promocional', 'Llavero metálico', 'Grabado láser, caja individual', 'pieza', 15, 40, v_amazon),
    (v_org, 'promocional', 'Set de escritura', 'Pluma + lápiz en estuche', 'pieza', 60, 140, v_local),
    (v_org, 'promocional', 'Cilindro deportivo 750ml', 'Libre de BPA, tapa flip', 'pieza', 48, 115, v_local),
    (v_org, 'promocional', 'Audífonos inalámbricos', 'Bluetooth con estuche de carga', 'pieza', 220, 460, v_amazon),
    (v_org, 'promocional', 'Mouse pad personalizado', 'Antideslizante, full color', 'pieza', 25, 60, v_local),
    (v_org, 'promocional', 'Hielera plegable 12L', 'Tela térmica con logo', 'pieza', 110, 240, v_local),
    (v_org, 'promocional', 'Kit antibacterial', 'Gel + cubrebocas + toallitas', 'kit', 40, 95, v_local),
    (v_org, 'promocional', 'Cuaderno A5 con liga', 'Tapa dura personalizada', 'pieza', 35, 85, v_local),
    (v_org, 'promocional', 'Termo café 350ml', 'Doble pared, acero', 'pieza', 75, 165, v_amazon),
    (v_org, 'promocional', 'Bocina bluetooth compacta', 'Resistente al agua', 'pieza', 130, 290, v_amazon),
    (v_org, 'promocional', 'Lanyard sublimado', 'Cinta con gancho metálico', 'pieza', 18, 45, v_sorteo),
    (v_org, 'promocional', 'Antiestrés personalizado', 'Espuma con logo', 'pieza', 14, 38, v_sorteo),
    (v_org, 'promocional', 'Kit de viaje', 'Almohada + antifaz + estuche', 'kit', 90, 200, v_local),
    (v_org, 'promocional', 'Calendario de escritorio', 'Personalizado, base reciclada', 'pieza', 32, 78, v_local),
    -- ── 25 EVENTOS ──
    (v_org, 'evento', 'Renta de carpa 6x6', 'Incluye montaje y desmontaje', 'servicio', 1800, 3500, v_local),
    (v_org, 'evento', 'Flete de transportación', 'Camioneta 3.5T por día', 'día', 1500, 2800, v_local),
    (v_org, 'evento', 'Renta de mobiliario (mesa redonda)', 'Mesa para 10 personas', 'pieza', 120, 280, v_local),
    (v_org, 'evento', 'Renta de sillas Tiffany', 'Silla con cojín', 'pieza', 35, 80, v_local),
    (v_org, 'evento', 'Equipo de audio profesional', 'Bocinas, mezcladora, micrófonos', 'servicio', 4500, 8900, v_local),
    (v_org, 'evento', 'Iluminación escénica', 'Cabezas móviles + control DMX', 'servicio', 3800, 7500, v_local),
    (v_org, 'evento', 'Pantalla LED 3x2m', 'Renta por día con operador', 'día', 6000, 11500, v_local),
    (v_org, 'evento', 'Servicio de banquete', 'Menú 3 tiempos por persona', 'persona', 280, 520, v_kfc),
    (v_org, 'evento', 'Coffee break corporativo', 'Café, pan y fruta por persona', 'persona', 75, 160, v_kfc),
    (v_org, 'evento', 'Barra de bebidas', 'Bartender + insumos por persona', 'persona', 140, 290, v_kfc),
    (v_org, 'evento', 'Pista de baile iluminada', 'Módulos LED 5x5m', 'servicio', 5200, 9800, v_local),
    (v_org, 'evento', 'Templete / escenario', 'Estructura 4x3m con faldón', 'servicio', 2600, 5200, v_local),
    (v_org, 'evento', 'Generador de energía', 'Planta 20kVA por día', 'día', 2200, 4300, v_local),
    (v_org, 'evento', 'Renta de carpa 10x20', 'Estructura para 200 personas', 'servicio', 6800, 13500, v_local),
    (v_org, 'evento', 'Fotografía y video', 'Cobertura de evento por día', 'día', 3500, 7200, v_local),
    (v_org, 'evento', 'Animación infantil', 'Show + botarga 3 horas', 'servicio', 1800, 3800, v_sorteo),
    (v_org, 'evento', 'Inflable para fiesta infantil', 'Castillo brincolín por día', 'día', 900, 2000, v_sorteo),
    (v_org, 'evento', 'Mesa de dulces', 'Estación temática por persona', 'persona', 60, 140, v_sorteo),
    (v_org, 'evento', 'Edecanes para evento', 'Por edecán, jornada 8h', 'día', 650, 1300, v_local),
    (v_org, 'evento', 'Master de ceremonias', 'Conductor profesional', 'evento', 4000, 8000, v_local),
    (v_org, 'evento', 'Stand modular 3x3', 'Diseño, montaje y desmontaje', 'servicio', 5500, 10800, v_local),
    (v_org, 'evento', 'Registro digital de asistentes', 'Tablets + software por día', 'día', 1500, 3200, v_amazon),
    (v_org, 'evento', 'Sorteo / dinámica promocional', 'Tómbola + premios + operación', 'servicio', 2000, 4200, v_sorteo),
    (v_org, 'evento', 'Transporte de invitados', 'Autobús 40 pasajeros por día', 'día', 4800, 9200, v_local),
    (v_org, 'evento', 'Limpieza post-evento', 'Cuadrilla por jornada', 'servicio', 1200, 2600, v_local),
    -- ── SERVICIOS DE PERSONAL (promotoría · tarifa por persona/día por rol) ──
    (v_org, 'servicio', 'Promotor', 'Promotor capacitado en piso', 'día', 600, 1100, v_local),
    (v_org, 'servicio', 'Supervisor de promotoría', 'Supervisa equipo en campo', 'día', 950, 1700, v_local),
    (v_org, 'servicio', 'Coordinador de promotoría', 'Coordina logística y reportes', 'día', 1300, 2300, v_local)
  on conflict do nothing;
end $$;
