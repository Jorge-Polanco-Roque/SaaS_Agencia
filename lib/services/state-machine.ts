import type { CotizacionEstado } from "@/lib/supabase/database.types";
import { can, type Capability } from "@/lib/auth/rbac";
import type { AppRole } from "@/lib/supabase/database.types";

/**
 * Máquina de estados de la cotización (CLAUDE.md §4.2, Fase 1: hasta enviada_cliente
 * + confirmación/negociación del cliente).
 */
export type Transicion =
  | "enviar_a_validacion"
  | "validar"
  | "rechazar"
  | "enviar_a_cliente"
  | "marcar_conforms"
  | "confirmar"
  | "solicitar_cambios"
  | "cancelar";

interface ReglaTransicion {
  desde: CotizacionEstado[];
  hacia: CotizacionEstado;
  /** Capacidad requerida. 'cliente' = acción del portal (sin capacidad interna). */
  cap: Capability | "cliente";
  etiqueta: string;
}

export const TRANSICIONES: Record<Transicion, ReglaTransicion> = {
  enviar_a_validacion: {
    desde: ["borrador", "rechazada"],
    hacia: "en_validacion",
    cap: "cotizacion.crear",
    etiqueta: "Enviar a validación",
  },
  validar: {
    desde: ["en_validacion"],
    hacia: "validada",
    cap: "cotizacion.validar",
    etiqueta: "Validar (asigna folio)",
  },
  rechazar: {
    desde: ["en_validacion"],
    hacia: "rechazada",
    cap: "cotizacion.validar",
    etiqueta: "Rechazar",
  },
  enviar_a_cliente: {
    desde: ["validada", "en_negociacion"],
    hacia: "enviada_cliente",
    cap: "cotizacion.crear",
    etiqueta: "Enviar al cliente",
  },
  marcar_conforms: {
    desde: ["enviada_cliente"],
    hacia: "conforme_pendiente",
    cap: "cotizacion.crear",
    etiqueta: "Marcar CONFORMS (en seguimiento)",
  },
  confirmar: {
    desde: ["enviada_cliente", "conforme_pendiente"],
    hacia: "confirmada",
    cap: "cliente",
    etiqueta: "Cliente confirma (PO CONFIRMA)",
  },
  solicitar_cambios: {
    desde: ["enviada_cliente", "conforme_pendiente"],
    hacia: "en_negociacion",
    cap: "cliente",
    etiqueta: "Cliente pide cambios",
  },
  cancelar: {
    desde: [
      "borrador",
      "en_validacion",
      "validada",
      "rechazada",
      "enviada_cliente",
      "conforme_pendiente",
      "en_negociacion",
    ],
    hacia: "cancelada",
    cap: "cotizacion.crear",
    etiqueta: "Cancelar",
  },
};

export interface PuedeTransicionar {
  ok: boolean;
  motivo?: string;
}

/** Valida si una transición es legal desde el estado actual y para el rol dado. */
export function puedeTransicionar(
  estado: CotizacionEstado,
  transicion: Transicion,
  rol: AppRole | null,
  opts: { esCliente?: boolean } = {}
): PuedeTransicionar {
  const regla = TRANSICIONES[transicion];
  if (!regla) return { ok: false, motivo: "Transición desconocida" };
  if (!regla.desde.includes(estado)) {
    return {
      ok: false,
      motivo: `No se puede "${regla.etiqueta}" desde estado "${estado}"`,
    };
  }
  if (regla.cap === "cliente") {
    if (!opts.esCliente)
      return { ok: false, motivo: "Acción exclusiva del cliente" };
    return { ok: true };
  }
  if (!can(rol, regla.cap)) {
    return { ok: false, motivo: "No tienes permiso para esta acción" };
  }
  return { ok: true };
}

/** Transiciones que un rol interno puede ejecutar desde un estado (para UI). */
export function transicionesDisponibles(
  estado: CotizacionEstado,
  rol: AppRole | null
): { transicion: Transicion; etiqueta: string }[] {
  return (Object.keys(TRANSICIONES) as Transicion[])
    .filter((t) => TRANSICIONES[t].cap !== "cliente")
    .filter((t) => puedeTransicionar(estado, t, rol).ok)
    .map((t) => ({ transicion: t, etiqueta: TRANSICIONES[t].etiqueta }));
}

export const ESTADO_LABELS: Record<CotizacionEstado, string> = {
  borrador: "Borrador",
  en_validacion: "En validación",
  validada: "Validada",
  rechazada: "Rechazada",
  enviada_cliente: "Enviada al cliente",
  conforme_pendiente: "CONFORMS (en seguimiento)",
  confirmada: "Confirmada (PO CONFIRMA)",
  en_negociacion: "En negociación",
  cancelada: "Cancelada",
};
