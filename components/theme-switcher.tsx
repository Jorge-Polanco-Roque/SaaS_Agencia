"use client";

import { useEffect, useRef, useState } from "react";
import { TEMAS, TEMA_DEFAULT, TEMA_STORAGE_KEY } from "@/lib/themes";
import { cn } from "@/lib/utils";

/** Selector de tema como desplegable accesible, persistido en localStorage. */
export function ThemeSwitcher() {
  const [tema, setTema] = useState<string>(TEMA_DEFAULT);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const guardado = localStorage.getItem(TEMA_STORAGE_KEY) ?? TEMA_DEFAULT;
    setTema(guardado);
    document.documentElement.dataset.theme = guardado;
  }, []);

  useEffect(() => {
    if (!abierto) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto]);

  function aplicar(id: string) {
    setTema(id);
    document.documentElement.dataset.theme = id;
    localStorage.setItem(TEMA_STORAGE_KEY, id);
    setAbierto(false);
  }

  const actual = TEMAS.find((t) => t.id === tema) ?? TEMAS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-border"
          style={{ background: actual.dot }}
        />
        <span className="flex-1 text-left">{actual.nombre}</span>
        <span className="text-xs text-muted-foreground">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <ul
          role="listbox"
          className="absolute bottom-full left-0 z-50 mb-2 max-h-72 w-full overflow-auto rounded-md border bg-card p-1 shadow-xl"
        >
          {TEMAS.map((t) => {
            const activo = t.id === tema;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={activo}
                  onClick={() => aplicar(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary",
                    activo && "bg-secondary font-medium"
                  )}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-border"
                    style={{ background: t.dot }}
                  />
                  <span className="flex-1">{t.nombre}</span>
                  {t.oscuro && (
                    <span className="text-[0.65rem] text-muted-foreground">oscuro</span>
                  )}
                  {activo && <span className="text-primary">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
