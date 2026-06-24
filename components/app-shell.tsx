"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(app)/actions";

export function AppShell({
  items,
  nombre,
  rolLabel,
  children,
}: {
  items: NavItem[];
  nombre: string;
  rolLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cierra el cajón al navegar (móvil)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Backdrop (solo móvil) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Barra lateral */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r bg-card transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            JSM Flow
          </p>
          <button
            className="text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav items={items} />
        </div>
        <div className="space-y-4 border-t p-4">
          <ThemeSwitcher />
          <div>
            <p className="truncate text-sm font-medium">{nombre}</p>
            <p className="text-xs text-muted-foreground">{rolLabel}</p>
          </div>
          <form action={logout}>
            <Button variant="outline" size="sm" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Barra superior (solo móvil) */}
        <header className="flex items-center gap-3 border-b bg-card p-3 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-secondary"
          >
            ☰
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            JSM Flow
          </span>
        </header>

        <main className="flex-1 overflow-y-auto bg-secondary/40">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
