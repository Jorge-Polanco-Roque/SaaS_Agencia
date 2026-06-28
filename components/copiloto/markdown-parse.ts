/**
 * Parser de Markdown ligero y SIN dependencias (lógica pura, testeable).
 * Convierte el texto del copiloto en bloques que el componente <Markdown/>
 * renderiza como nodos React. Cubre: encabezados, listas (- / * / 1.) y párrafos.
 */
export type Bloque =
  | { tipo: "p"; lineas: string[] }
  | { tipo: "ul"; items: string[] }
  | { tipo: "ol"; items: string[] }
  | { tipo: "h"; nivel: number; texto: string };

export function parsearBloques(src: string): Bloque[] {
  const lineas = (src ?? "").replace(/\r\n/g, "\n").split("\n");
  const bloques: Bloque[] = [];

  for (const lineaRaw of lineas) {
    const trimmed = lineaRaw.trim();
    const ultimo = bloques[bloques.length - 1];

    if (trimmed === "") {
      if (ultimo && ultimo.tipo === "p") ultimo.lineas.push("");
      continue;
    }

    const enc = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (enc) {
      bloques.push({ tipo: "h", nivel: enc[1].length, texto: enc[2] });
      continue;
    }

    const ul = /^[-*+]\s+(.*)$/.exec(trimmed);
    if (ul) {
      if (ultimo && ultimo.tipo === "ul") ultimo.items.push(ul[1]);
      else bloques.push({ tipo: "ul", items: [ul[1]] });
      continue;
    }

    const ol = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (ol) {
      if (ultimo && ultimo.tipo === "ol") ultimo.items.push(ol[1]);
      else bloques.push({ tipo: "ol", items: [ol[1]] });
      continue;
    }

    if (ultimo && ultimo.tipo === "p" && ultimo.lineas[ultimo.lineas.length - 1] !== "") {
      ultimo.lineas.push(trimmed);
    } else {
      bloques.push({ tipo: "p", lineas: [trimmed] });
    }
  }

  return bloques;
}

/** Tokens inline para el render: texto plano, negrita, cursiva o código. */
export type TokenInline =
  | { t: "text"; v: string }
  | { t: "strong"; v: string }
  | { t: "em"; v: string }
  | { t: "code"; v: string };

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_)/g;

export function tokenizarInline(text: string): TokenInline[] {
  const out: TokenInline[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push({ t: "text", v: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("`")) out.push({ t: "code", v: tok.slice(1, -1) });
    else if (tok.startsWith("**") || tok.startsWith("__"))
      out.push({ t: "strong", v: tok.slice(2, -2) });
    else out.push({ t: "em", v: tok.slice(1, -1) });
    last = m.index + tok.length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}
