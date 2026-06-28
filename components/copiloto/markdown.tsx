import type { ReactNode } from "react";
import { parsearBloques, tokenizarInline } from "./markdown-parse";

/**
 * Renderizador de Markdown ligero y SIN dependencias para las respuestas del
 * copiloto. Cubre lo que produce el LLM: encabezados, **negritas**, *cursivas*,
 * `código`, listas (- / * / 1.) y párrafos con saltos de línea.
 * Construye nodos React (no inyecta HTML → sin riesgo de XSS).
 * La lógica de parseo vive en `markdown-parse.ts` (pura, testeable).
 */

function renderInline(text: string): ReactNode[] {
  return tokenizarInline(text).map((tok, i) => {
    if (tok.t === "code") {
      return (
        <code
          key={i}
          className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em]"
        >
          {tok.v}
        </code>
      );
    }
    if (tok.t === "strong") {
      return (
        <strong key={i} className="font-semibold">
          {tok.v}
        </strong>
      );
    }
    if (tok.t === "em") return <em key={i}>{tok.v}</em>;
    return <span key={i}>{tok.v}</span>;
  });
}

export function Markdown({ children }: { children: string }) {
  const bloques = parsearBloques(children ?? "");

  return (
    <div className="space-y-2 leading-relaxed [overflow-wrap:anywhere]">
      {bloques.map((b, i) => {
        if (b.tipo === "h") {
          const cls = b.nivel <= 2 ? "text-sm font-bold" : "text-sm font-semibold";
          return (
            <p key={i} className={cls}>
              {renderInline(b.texto)}
            </p>
          );
        }
        if (b.tipo === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ul>
          );
        }
        if (b.tipo === "ol") {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ol>
          );
        }
        const lineas = b.lineas.filter((l) => l !== "");
        return (
          <p key={i}>
            {lineas.map((l, j) => (
              <span key={j}>
                {renderInline(l)}
                {j < lineas.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
