import type { AppRole } from "@/lib/supabase/database.types";

/** Permisos por capacidad de dominio. Fuente única de verdad para guards de UI/servidor. */
export const CAPABILITIES = {
  "crm.gestionar": ["super_admin", "admin", "ejecutivo"],
  "catalogo.gestionar": ["super_admin", "admin", "operaciones"],
  "cotizacion.crear": ["super_admin", "admin", "ejecutivo"],
  "cotizacion.validar": ["super_admin", "admin"],
  "cotizacion.ver_costos": [
    "super_admin",
    "admin",
    "ejecutivo",
    "operaciones",
    "compras_finanzas",
    "contabilidad",
  ],
  "proyecto.gestionar": ["super_admin", "admin", "compras_finanzas", "ejecutivo"],
  "compras.gestionar": ["super_admin", "admin", "operaciones", "compras_finanzas"],
  "finanzas.gestionar": ["super_admin", "admin", "compras_finanzas", "contabilidad"],
  "pago.autorizar": ["super_admin", "admin", "contabilidad"],
  "admin.config": ["super_admin", "admin"],
} as const satisfies Record<string, readonly AppRole[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(rol: AppRole | null | undefined, cap: Capability): boolean {
  if (!rol) return false;
  return (CAPABILITIES[cap] as readonly AppRole[]).includes(rol);
}

/** Etiquetas legibles por rol (UI en español). */
export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  ejecutivo: "Ejecutivo de Cuenta",
  admin: "Administración",
  operaciones: "Operaciones",
  compras_finanzas: "Compras / Finanzas",
  contabilidad: "Contabilidad",
  cliente: "Cliente",
};
