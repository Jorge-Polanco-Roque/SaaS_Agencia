"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant" | "system";
  text: string;
}
interface Interrupcion {
  herramienta?: string;
  descripcion: string;
  args?: unknown;
}

function seccionDe(pathname: string): string {
  const seg = pathname.split("/")[1] || "dashboard";
  const map: Record<string, string> = {
    dashboard: "Panel",
    crm: "CRM",
    catalogo: "Catálogo",
    cotizaciones: "Cotizaciones",
    proyectos: "Proyectos",
    compras: "Compras",
    finanzas: "Finanzas",
    admin: "Administración",
  };
  return map[seg] ?? "Panel";
}

export function CopilotoPanel() {
  const pathname = usePathname();
  const seccion = seccionDe(pathname);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendiente, setPendiente] = useState<Interrupcion[] | null>(null);
  const threadId = useRef<string | undefined>(undefined);
  const scroller = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => {
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
    });
  }

  async function post(body: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion, thread_id: threadId.current, ...body }),
      });
      const data = await res.json();
      threadId.current = data.thread_id ?? threadId.current;
      if (!data.ok) {
        setMsgs((m) => [...m, { role: "system", text: data.error ?? "Error" }]);
        setPendiente(null);
      } else if (data.tipo === "aprobacion") {
        setPendiente(data.interrupciones ?? []);
      } else {
        setPendiente(null);
        setMsgs((m) => [...m, { role: "assistant", text: data.texto || "(sin respuesta)" }]);
      }
    } catch {
      setMsgs((m) => [...m, { role: "system", text: "No se pudo contactar al copiloto." }]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  }

  async function enviar() {
    const texto = input.trim();
    if (!texto || loading) return;
    setMsgs((m) => [...m, { role: "user", text: texto }]);
    setInput("");
    scrollDown();
    await post({ mensaje: texto });
  }

  async function decidir(accion: "approve" | "reject") {
    const count = pendiente?.length ?? 1;
    setMsgs((m) => [
      ...m,
      { role: "system", text: accion === "approve" ? "✓ Aprobado" : "✗ Rechazado" },
    ]);
    setPendiente(null);
    await post({ accion, interrupciones: count });
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label="Abrir copiloto"
      >
        <span className="text-base">✦</span> Copiloto
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[32rem] w-[26rem] max-w-[calc(100vw-2.5rem)] flex-col rounded-xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b p-3">
            <div>
              <p className="text-sm font-semibold">Copiloto JSM</p>
              <p className="text-xs text-muted-foreground">Sección: {seccion}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-3">
            {msgs.length === 0 && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Pregúntame por tus cotizaciones, cobranza o pídeme crear algo.
                <br />
                <span className="text-xs">
                  Ej: «¿Cuánto tengo por cobrar?» o «Crea un cliente Acme».
                </span>
              </p>
            )}
            {msgs.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : m.role === "system"
                      ? "mx-auto bg-secondary text-xs text-muted-foreground"
                      : "bg-secondary"
                )}
              >
                {m.text}
              </div>
            ))}

            {pendiente && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                <p className="font-semibold text-amber-800">Requiere tu aprobación</p>
                <ul className="my-2 list-disc pl-5 text-amber-900">
                  {pendiente.map((p, i) => (
                    <li key={i}>{p.descripcion}</li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decidir("approve")} disabled={loading}>
                    Aprobar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decidir("reject")} disabled={loading}>
                    Rechazar
                  </Button>
                </div>
              </div>
            )}

            {loading && (
              <div className="bg-secondary max-w-[60%] rounded-lg px-3 py-2 text-sm text-muted-foreground">
                Pensando…
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
            className="flex gap-2 border-t p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje…"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              Enviar
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
