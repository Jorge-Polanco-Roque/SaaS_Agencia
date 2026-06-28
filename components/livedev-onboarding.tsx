"use client";

import { useEffect, useState } from "react";

// Explica el widget Live-Dev la PRIMERA vez que el usuario pulsa el pill
// "● Live-Dev" (lo inyecta el bundle externo). Intercepta ese primer clic,
// muestra una intro y luego abre el overlay disparando el atajo del widget
// (Shift+Ctrl/Cmd+L, que el bundle ya escucha). Ver §16 de CLAUDE.md.
const FLAG = "jsm-livedev-onboarded";

function activarOverlay() {
  // El bundle escucha: e.key === "L" && e.shiftKey && (e.ctrlKey || e.metaKey)
  const ev = new KeyboardEvent("keydown", {
    key: "L",
    code: "KeyL",
    shiftKey: true,
    ctrlKey: true,
    metaKey: true,
    bubbles: true,
  });
  document.dispatchEvent(ev);
}

export function LiveDevOnboarding() {
  const [abierto, setAbierto] = useState(false);
  const [noMostrar, setNoMostrar] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function onClickCapture(e: MouseEvent) {
      const target = e.target as Element | null;
      if (!target?.closest?.(".livedev-toggle")) return;
      // Si ya fue presentado, dejamos pasar el clic al widget.
      if (localStorage.getItem(FLAG)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setAbierto(true);
    }

    // Capture en document: corre antes que el listener propio del botón.
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, []);

  function continuar() {
    if (noMostrar) localStorage.setItem(FLAG, "1");
    setAbierto(false);
    // Pequeño respiro para que el modal cierre antes de abrir el overlay.
    requestAnimationFrame(() => activarOverlay());
  }

  function cerrar() {
    if (noMostrar) localStorage.setItem(FLAG, "1");
    setAbierto(false);
  }

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="livedev-onboarding-title"
      onClick={cerrar}
    >
      <div
        className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#c026d3)" }}
          >
            ●
          </span>
          <h2 id="livedev-onboarding-title" className="text-lg font-semibold">
            Reportar con Live-Dev
          </h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Este botón te deja avisar de cualquier problema o idea{" "}
          <span className="font-medium text-foreground">sin salir de la app</span>.
          Funciona así:
        </p>

        <ol className="my-4 space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="font-semibold text-primary">1.</span>
            <span>
              <span className="font-medium">Señala</span> el elemento de la
              pantalla sobre el que quieres comentar (se resalta al pasar el
              cursor).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-primary">2.</span>
            <span>
              <span className="font-medium">Escribe</span> un título y tu
              comentario; opcionalmente adjunta una captura de pantalla.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-primary">3.</span>
            <span>
              Al enviar, se crea automáticamente una{" "}
              <span className="font-medium">tarea para el equipo</span> con lo que
              señalaste. Nosotros le damos seguimiento.
            </span>
          </li>
        </ol>

        <p className="mb-4 text-xs text-muted-foreground">
          Atajo de teclado: <kbd className="rounded border px-1">Shift</kbd> +{" "}
          <kbd className="rounded border px-1">Ctrl/Cmd</kbd> +{" "}
          <kbd className="rounded border px-1">L</kbd>.
        </p>

        <label className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={noMostrar}
            onChange={(e) => setNoMostrar(e.target.checked)}
          />
          No volver a mostrar esta introducción
        </label>

        <div className="flex justify-end gap-2">
          <button
            onClick={cerrar}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Cerrar
          </button>
          <button
            onClick={continuar}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#c026d3)" }}
          >
            Empezar a reportar
          </button>
        </div>
      </div>
    </div>
  );
}
