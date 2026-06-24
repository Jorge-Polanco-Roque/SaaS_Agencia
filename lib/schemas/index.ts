import { z } from "zod";

/** Utilidades */
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const email = z
  .string()
  .trim()
  .email("Correo inválido")
  .optional()
  .or(z.literal("").transform(() => undefined));

// ============================================================
// CRM
// ============================================================
export const ClienteSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre requerido").max(200),
  rfc: optionalText,
  email,
  telefono: optionalText,
  notas: optionalText,
});
export type ClienteInput = z.infer<typeof ClienteSchema>;

export const ContactoSchema = z.object({
  cliente_id: z.string().uuid(),
  nombre: z.string().trim().min(2, "Nombre requerido").max(200),
  cargo: optionalText,
  email,
  telefono: optionalText,
});
export type ContactoInput = z.infer<typeof ContactoSchema>;

// ============================================================
// Catálogo
// ============================================================
export const ProveedorSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre requerido").max(200),
  categoria: optionalText,
  contacto: optionalText,
  email,
  telefono: optionalText,
  dias_entrega: z.coerce.number().int().min(0).max(365).optional(),
  notas: optionalText,
  activo: z.coerce.boolean().default(true),
});
export type ProveedorInput = z.infer<typeof ProveedorSchema>;

export const ProductoSchema = z.object({
  tipo: z.enum(["promocional", "evento", "servicio"]),
  nombre: z.string().trim().min(2, "Nombre requerido").max(200),
  descripcion: optionalText,
  unidad: z.string().trim().min(1).max(40).default("pieza"),
  costo: z.coerce.number().min(0).default(0),
  precio_publico: z.coerce.number().min(0).default(0),
  proveedor_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  activo: z.coerce.boolean().default(true),
});
export type ProductoInput = z.infer<typeof ProductoSchema>;

// ============================================================
// Cotizaciones
// ============================================================
export const CotizacionItemSchema = z.object({
  producto_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  descripcion: z.string().trim().min(1, "Descripción requerida").max(500),
  /** producto: piezas · personal: número de personas del rol */
  cantidad: z.coerce.number().positive("Cantidad > 0").default(1),
  unidad: z.string().trim().min(1).max(40).default("pieza"),
  costo_unitario: z.coerce.number().min(0).default(0),
  precio_unitario: z.coerce.number().min(0).default(0),
  /** Modalidad del ítem: producto (default) o personal (rol × personas × días). */
  modalidad: z.enum(["producto", "personal"]).default("producto"),
  /** Rol del personal (supervisor / promotor / coordinador…). Solo si personal. */
  rol: optionalText,
  /** Días de servicio. Producto ⇒ 1; personal ⇒ días contratados. */
  dias: z.coerce.number().int().min(1).default(1),
});
export type CotizacionItemInput = z.infer<typeof CotizacionItemSchema>;

export const CotizacionSchema = z.object({
  cliente_id: z.string().uuid("Selecciona un cliente"),
  titulo: z.string().trim().min(3, "Título requerido").max(200),
  moneda: z.string().trim().default("MXN"),
  iva_tasa: z.coerce.number().min(0).max(1).default(0.16),
  descuento: z.coerce.number().min(0).default(0),
  notas: optionalText,
  items: z.array(CotizacionItemSchema).min(1, "Agrega al menos un ítem"),
});
export type CotizacionInput = z.infer<typeof CotizacionSchema>;

/** Motivo al crear una nueva versión ("¿Mueve?"). */
export const NuevaVersionSchema = CotizacionSchema.extend({
  motivo: z.string().trim().min(3, "Indica el motivo del cambio").max(500),
});
export type NuevaVersionInput = z.infer<typeof NuevaVersionSchema>;

// ============================================================
// Proyectos y tareas (Fase 2)
// ============================================================
const fechaOpcional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

export const TareaSchema = z.object({
  proyecto_id: z.string().uuid(),
  titulo: z.string().trim().min(2, "Título requerido").max(200),
  descripcion: optionalText,
  columna: z
    .enum(["por_hacer", "en_proceso", "bloqueado", "hecho"])
    .default("por_hacer"),
  responsable_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  fecha_limite: fechaOpcional,
});
export type TareaInput = z.infer<typeof TareaSchema>;

export const ProyectoUpdateSchema = z.object({
  nombre: z.string().trim().min(2).max(200).optional(),
  estado: z.enum(["activo", "en_pausa", "cerrado", "cancelado"]).optional(),
  responsable_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  fecha_entrega: fechaOpcional,
  // Campos del Master de Proyectos JSM (configurables; glosario por confirmar §1.4)
  covac_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  hijo_rib: optionalText,
  validacion_num: optionalText,
  pdf_num: optionalText,
});
export type ProyectoUpdateInput = z.infer<typeof ProyectoUpdateSchema>;

/** Movimiento de una tarea en el Kanban: nueva columna + orden de IDs en ella. */
export const MovimientoSchema = z.object({
  proyecto_id: z.string().uuid(),
  tarea_id: z.string().uuid(),
  columna: z.enum(["por_hacer", "en_proceso", "bloqueado", "hecho"]),
  orden_ids: z.array(z.string().uuid()).max(1000),
});
export type MovimientoInput = z.infer<typeof MovimientoSchema>;

/** Portal del cliente: solicitud de cambios. */
export const PortalCambiosSchema = z.object({
  motivo: z.string().trim().min(5, "Describe los cambios").max(1000),
});
export type PortalCambiosInput = z.infer<typeof PortalCambiosSchema>;

// ============================================================
// Compras y Finanzas (Fase 3)
// ============================================================
export const OrdenCompraItemSchema = z.object({
  producto_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  descripcion: z.string().trim().min(1, "Descripción requerida").max(500),
  cantidad: z.coerce.number().positive().default(1),
  unidad: z.string().trim().min(1).max(40).default("pieza"),
  costo_unitario: z.coerce.number().min(0).default(0),
});
export type OrdenCompraItemInput = z.infer<typeof OrdenCompraItemSchema>;

export const OrdenCompraSchema = z.object({
  proyecto_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  proveedor_id: z.string().uuid("Selecciona un proveedor"),
  iva_tasa: z.coerce.number().min(0).max(1).default(0.16),
  notas: optionalText,
  items: z.array(OrdenCompraItemSchema).min(1, "Agrega al menos un ítem"),
});
export type OrdenCompraInput = z.infer<typeof OrdenCompraSchema>;

export const SolicitudPagoSchema = z.object({
  proyecto_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  orden_compra_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  proveedor_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  concepto: z.string().trim().min(3, "Concepto requerido").max(300),
  tipo: z
    .enum(["anticipo", "liquidacion", "pago_unico", "reembolso"])
    .default("pago_unico"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  fecha_requerida: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type SolicitudPagoInput = z.infer<typeof SolicitudPagoSchema>;

export const PagoSchema = z.object({
  solicitud_pago_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  orden_compra_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tipo: z
    .enum(["anticipo", "dispersion", "liquidacion", "abono"])
    .default("abono"),
  /** Concepto contable para la liquidación (entrada/salida). */
  concepto: z
    .enum(["anticipo", "traspaso", "deposito", "entrega", "abono"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  metodo: optionalText,
  referencia: optionalText,
  comprobante_url: optionalText,
  fecha: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type PagoInput = z.infer<typeof PagoSchema>;

export const FacturaSchema = z.object({
  tipo: z.enum(["emitida_cliente", "recibida_proveedor"]),
  proyecto_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  orden_compra_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  cliente_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  proveedor_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  folio: z.string().trim().min(1, "Folio requerido").max(100),
  uuid_sat: optionalText,
  monto: z.coerce.number().min(0).default(0),
  fecha_emision: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  fecha_vencimiento: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type FacturaInput = z.infer<typeof FacturaSchema>;

/** Pull de proveedores: criterio de búsqueda. */
export const PullSchema = z.object({
  requisicion: z.string().trim().min(5, "Describe lo que necesitas").max(1000),
  prioridad: z.enum(["costo", "tiempo", "balance"]).default("balance"),
});
export type PullInput = z.infer<typeof PullSchema>;
