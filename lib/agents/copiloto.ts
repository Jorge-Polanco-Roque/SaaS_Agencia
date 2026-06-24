import { createAgent, humanInTheLoopMiddleware } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver, Command } from "@langchain/langgraph";
import type { DbClient } from "@/lib/services/db";
import type { SessionUser } from "@/lib/auth/session";
import { buildTools, HERRAMIENTAS_ESCRITURA } from "./tools";

/**
 * Checkpointer en memoria (persiste dentro del proceso de Next).
 * En producción serverless → sustituir por PostgresSaver sobre Supabase
 * (`@langchain/langgraph-checkpoint-postgres`), tablas creadas con .setup().
 */
const checkpointer = new MemorySaver();

function systemPrompt(user: SessionUser, seccion: string): string {
  return `Eres el Copiloto de JSM, una agencia de promocionales y eventos en México.
Asistes a ${user.nombre} (rol: ${user.rol}) en la sección "${seccion}" de la plataforma.
- Responde en español de México, claro y conciso.
- Usa las herramientas para consultar datos reales antes de afirmar cifras; no inventes.
- Para crear/modificar datos usa las herramientas de escritura; el sistema pedirá aprobación humana.
- Respeta los permisos: si una herramienta indica que no hay permiso, explícalo.
- Montos en MXN. No expongas costos internos en lenguaje dirigido a clientes.`;
}

export function buildCopiloto(db: DbClient, user: SessionUser, seccion: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada");
  }
  const model = new ChatOpenAI({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.2,
  });

  const interruptOn: Record<
    string,
    { allowedDecisions: ("approve" | "edit" | "reject")[] }
  > = Object.fromEntries(
    HERRAMIENTAS_ESCRITURA.map((t) => [
      t,
      { allowedDecisions: ["approve", "edit", "reject"] },
    ])
  );

  return createAgent({
    model,
    tools: buildTools(db, user),
    systemPrompt: systemPrompt(user, seccion),
    checkpointer,
    middleware: [humanInTheLoopMiddleware({ interruptOn })],
  });
}

export interface InterrupcionPendiente {
  herramienta?: string;
  args?: unknown;
  descripcion: string;
}

export interface RespuestaCopiloto {
  tipo: "mensaje" | "aprobacion";
  texto?: string;
  interrupciones?: InterrupcionPendiente[];
}

const ETIQUETA_ACCION: Record<string, string> = {
  crear_cliente: "Crear cliente",
  crear_cotizacion: "Crear cotización",
  crear_solicitud_pago: "Crear solicitud de pago",
};

function describirAccion(nombre?: string, args?: unknown): string {
  if (!nombre) return "Confirmar acción";
  const etiqueta = ETIQUETA_ACCION[nombre] ?? nombre;
  if (args && typeof args === "object") {
    const partes = Object.entries(args as Record<string, unknown>)
      .filter(([, v]) => v != null && typeof v !== "object")
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`);
    if (partes.length) return `${etiqueta} → ${partes.join(" · ")}`;
  }
  return etiqueta;
}

function normalizar(result: any): RespuestaCopiloto {
  const interrupts = result?.__interrupt__;
  if (Array.isArray(interrupts) && interrupts.length) {
    if (process.env.COPILOTO_DEBUG) {
      console.log("[copiloto] interrupt raw >>>", JSON.stringify(interrupts).slice(0, 1200));
    }
    const interrupciones: InterrupcionPendiente[] = interrupts.flatMap((it: any) => {
      const val = it?.value ?? it;
      const reqs = val?.actionRequests ?? val?.action_requests ?? val?.requests ?? [val];
      return (Array.isArray(reqs) ? reqs : [reqs]).map((r: any) => {
        const nombre = r?.name ?? r?.action ?? r?.tool;
        return {
          herramienta: nombre,
          args: r?.args,
          descripcion: describirAccion(nombre, r?.args),
        };
      });
    });
    return { tipo: "aprobacion", interrupciones };
  }
  const msgs = result?.messages ?? [];
  const last = msgs[msgs.length - 1];
  const texto =
    typeof last?.content === "string"
      ? last.content
      : Array.isArray(last?.content)
        ? last.content.map((c: any) => c?.text ?? "").join("")
        : "";
  return { tipo: "mensaje", texto };
}

export async function correrCopiloto(
  db: DbClient,
  user: SessionUser,
  seccion: string,
  threadId: string,
  mensaje: string
): Promise<RespuestaCopiloto> {
  const agent = buildCopiloto(db, user, seccion);
  const result = await agent.invoke(
    { messages: [{ role: "user", content: mensaje }] },
    { configurable: { thread_id: threadId }, recursionLimit: 12 }
  );
  return normalizar(result);
}

export async function resolverInterrupcion(
  db: DbClient,
  user: SessionUser,
  seccion: string,
  threadId: string,
  decision: "approve" | "reject",
  cantidad = 1
): Promise<RespuestaCopiloto> {
  const agent = buildCopiloto(db, user, seccion);
  const decisions = Array.from({ length: Math.max(1, cantidad) }, () => ({
    type: decision,
    ...(decision === "reject" ? { feedback: "Rechazado por el usuario." } : {}),
  }));
  const result = await agent.invoke(
    new Command({ resume: { decisions } }),
    { configurable: { thread_id: threadId }, recursionLimit: 12 }
  );
  return normalizar(result);
}
