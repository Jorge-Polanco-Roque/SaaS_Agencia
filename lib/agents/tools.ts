import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { DbClient } from "@/lib/services/db";
import type { SessionUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { formatMoneda } from "@/lib/services/calculos";
import { resumenCobranza } from "@/lib/services/finanzas";
import { crearCotizacion } from "@/lib/services/cotizaciones";
import { crearSolicitudPago } from "@/lib/services/compras";
import { registrarBitacora } from "@/lib/services/bitacora";

/** Herramientas que requieren aprobación humana (HITL) por ser escrituras. */
export const HERRAMIENTAS_ESCRITURA = [
  "crear_cliente",
  "crear_cotizacion",
  "crear_solicitud_pago",
] as const;

const SIN_PERMISO = "No tienes permiso para esta acción con tu rol.";

/**
 * Construye las herramientas del copiloto ligadas al usuario autenticado.
 * TODO acceso pasa por `db` (cliente con sesión → RLS) y por `lib/services`.
 * Las escrituras validan capacidad y se registran en bitácora.
 */
export function buildTools(db: DbClient, user: SessionUser) {
  // ---------- LECTURA ----------
  const buscarClientes = tool(
    async ({ query }: { query?: string }) => {
      let q = db.from("clientes").select("id, nombre, email, telefono, rfc").limit(10);
      if (query) q = q.ilike("nombre", `%${query}%`);
      const { data, error } = await q;
      if (error) return `Error: ${error.message}`;
      if (!data?.length) return "Sin clientes que coincidan.";
      return JSON.stringify(data);
    },
    {
      name: "buscar_clientes",
      description: "Busca clientes por nombre (o lista los primeros). Devuelve id, nombre y contacto.",
      schema: z.object({ query: z.string().optional().describe("Texto a buscar en el nombre") }),
    }
  );

  const buscarCatalogo = tool(
    async ({ query }: { query?: string }) => {
      let q = db
        .from("productos_servicios")
        .select("id, nombre, tipo, unidad, costo, precio_publico")
        .eq("activo", true)
        .limit(15);
      if (query) q = q.ilike("nombre", `%${query}%`);
      const { data, error } = await q;
      if (error) return `Error: ${error.message}`;
      return data?.length ? JSON.stringify(data) : "Catálogo vacío para esa búsqueda.";
    },
    {
      name: "buscar_catalogo",
      description: "Busca productos/servicios del catálogo (con costo y precio público).",
      schema: z.object({ query: z.string().optional() }),
    }
  );

  const listarCotizaciones = tool(
    async ({ estado }: { estado?: string }) => {
      let q = db
        .from("cotizaciones")
        .select("folio, titulo, estado, total")
        .order("created_at", { ascending: false })
        .limit(15);
      if (estado) q = q.eq("estado", estado as never);
      const { data, error } = await q;
      if (error) return `Error: ${error.message}`;
      return data?.length ? JSON.stringify(data) : "Sin cotizaciones.";
    },
    {
      name: "listar_cotizaciones",
      description:
        "Lista cotizaciones recientes; opcionalmente filtra por estado (borrador, en_validacion, validada, enviada_cliente, confirmada, en_negociacion, rechazada, cancelada).",
      schema: z.object({ estado: z.string().optional() }),
    }
  );

  const resumenFinanzas = tool(
    async () => {
      const hoy = new Date().toISOString().slice(0, 10);
      const { data: facturas } = await db
        .from("facturas")
        .select("monto, estado, fecha_vencimiento, tipo")
        .eq("tipo", "emitida_cliente");
      const c = resumenCobranza(
        (facturas ?? []).map((f) => ({
          monto: f.monto,
          estado: f.estado,
          fecha_vencimiento: f.fecha_vencimiento,
        })),
        hoy
      );
      return `Por cobrar: ${formatMoneda(c.porCobrar)} · Vencido: ${formatMoneda(c.vencido)} · Cobrado: ${formatMoneda(c.cobrado)}`;
    },
    {
      name: "resumen_finanzas",
      description: "Resumen de cobranza: por cobrar, vencido y cobrado.",
      schema: z.object({}),
    }
  );

  // ---------- ESCRITURA (HITL + capacidad + bitácora) ----------
  const crearCliente = tool(
    async (input: { nombre: string; email?: string; telefono?: string; rfc?: string }) => {
      if (!can(user.rol, "crm.gestionar")) return SIN_PERMISO;
      const { data, error } = await db
        .from("clientes")
        .insert({
          org_id: user.orgId,
          created_by: user.id,
          nombre: input.nombre,
          email: input.email ?? null,
          telefono: input.telefono ?? null,
          rfc: input.rfc ?? null,
        })
        .select("id")
        .single();
      if (error || !data) return `Error: ${error?.message}`;
      await registrarBitacora(db, user.orgId, user.id, {
        entidad: "cliente",
        entidadId: data.id,
        accion: "crear",
        meta: { via: "copiloto", nombre: input.nombre },
      });
      return `Cliente "${input.nombre}" creado (id ${data.id}).`;
    },
    {
      name: "crear_cliente",
      description: "Crea un cliente nuevo en el CRM.",
      schema: z.object({
        nombre: z.string().min(2),
        email: z.string().email().optional(),
        telefono: z.string().optional(),
        rfc: z.string().optional(),
      }),
    }
  );

  const crearCotizacionTool = tool(
    async (input: {
      cliente_nombre: string;
      titulo: string;
      items: { descripcion: string; cantidad: number; precio_unitario: number; costo_unitario?: number }[];
    }) => {
      if (!can(user.rol, "cotizacion.crear")) return SIN_PERMISO;
      const { data: cli } = await db
        .from("clientes")
        .select("id, nombre")
        .ilike("nombre", `%${input.cliente_nombre}%`)
        .limit(2);
      if (!cli?.length) return `No encontré al cliente "${input.cliente_nombre}". Créalo primero o revisa el nombre.`;
      if (cli.length > 1) return `Hay varios clientes que coinciden con "${input.cliente_nombre}"; especifica cuál.`;

      const cot = await crearCotizacion(db, user, {
        cliente_id: cli[0].id,
        titulo: input.titulo,
        moneda: "MXN",
        iva_tasa: 0.16,
        descuento: 0,
        items: input.items.map((it) => ({
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          unidad: "pieza",
          precio_unitario: it.precio_unitario,
          costo_unitario: it.costo_unitario ?? 0,
          modalidad: "producto" as const,
          rol: undefined,
          dias: 1,
        })),
      });
      return `Cotización "${cot.titulo}" creada en borrador para ${cli[0].nombre} (total ${formatMoneda(cot.total)}). Falta enviarla a validación.`;
    },
    {
      name: "crear_cotizacion",
      description:
        "Crea una cotización en borrador para un cliente (por nombre) con sus partidas.",
      schema: z.object({
        cliente_nombre: z.string(),
        titulo: z.string(),
        items: z
          .array(
            z.object({
              descripcion: z.string(),
              cantidad: z.number().positive(),
              precio_unitario: z.number().min(0),
              costo_unitario: z.number().min(0).optional(),
            })
          )
          .min(1),
      }),
    }
  );

  const crearSolicitudPagoTool = tool(
    async (input: { concepto: string; monto: number; tipo?: "anticipo" | "liquidacion" | "pago_unico" | "reembolso" }) => {
      if (!can(user.rol, "finanzas.gestionar")) return SIN_PERMISO;
      await crearSolicitudPago(db, user, {
        concepto: input.concepto,
        monto: input.monto,
        tipo: input.tipo ?? "pago_unico",
      });
      return `Solicitud de pago "${input.concepto}" por ${formatMoneda(input.monto)} creada (pendiente de autorización).`;
    },
    {
      name: "crear_solicitud_pago",
      description: "Crea una solicitud de pago (anticipo/liquidación/pago único/reembolso).",
      schema: z.object({
        concepto: z.string(),
        monto: z.number().positive(),
        tipo: z.enum(["anticipo", "liquidacion", "pago_unico", "reembolso"]).optional(),
      }),
    }
  );

  // Filtra escrituras según capacidad del rol (defensa adicional a la del propio tool)
  return [
    buscarClientes,
    buscarCatalogo,
    listarCotizaciones,
    resumenFinanzas,
    can(user.rol, "crm.gestionar") ? crearCliente : null,
    can(user.rol, "cotizacion.crear") ? crearCotizacionTool : null,
    can(user.rol, "finanzas.gestionar") ? crearSolicitudPagoTool : null,
  ].filter((t): t is NonNullable<typeof t> => t !== null);
}
