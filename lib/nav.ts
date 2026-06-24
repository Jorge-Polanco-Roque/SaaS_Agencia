import type { Capability } from "@/lib/auth/rbac";

export interface NavItem {
  href: string;
  label: string;
  /** Capacidad requerida para ver el ítem (undefined = visible para todos los autenticados). */
  cap?: Capability;
}

/** Navegación principal del área autenticada (CLAUDE.md §4). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Panel" },
  { href: "/crm", label: "CRM", cap: "crm.gestionar" },
  { href: "/catalogo", label: "Catálogo", cap: "catalogo.gestionar" },
  { href: "/cotizaciones", label: "Cotizaciones", cap: "cotizacion.crear" },
  { href: "/proyectos", label: "Proyectos", cap: "proyecto.gestionar" },
  { href: "/compras", label: "Compras", cap: "compras.gestionar" },
  { href: "/finanzas", label: "Finanzas", cap: "finanzas.gestionar" },
  { href: "/admin", label: "Administración", cap: "admin.config" },
];
