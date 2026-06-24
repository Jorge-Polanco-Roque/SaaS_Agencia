/**
 * Rate limiter de ventana fija, en memoria del proceso.
 * Suficiente como primera barrera anti-abuso (login, portal). En despliegues
 * multi-instancia conviene respaldarlo con un store compartido (Redis/Supabase);
 * la interfaz `consume` permite sustituir la implementación sin tocar llamadas.
 */
export interface RateLimitResult {
  ok: boolean;
  restantes: number;
  resetEnMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

/** Consume 1 del cupo de `clave`. `limite` peticiones por `ventanaMs`. */
export function consume(
  clave: string,
  limite: number,
  ventanaMs: number,
  ahora: number = Date.now()
): RateLimitResult {
  const b = store.get(clave);
  if (!b || ahora >= b.resetAt) {
    const resetAt = ahora + ventanaMs;
    store.set(clave, { count: 1, resetAt });
    return { ok: true, restantes: limite - 1, resetEnMs: ventanaMs };
  }
  if (b.count >= limite) {
    return { ok: false, restantes: 0, resetEnMs: b.resetAt - ahora };
  }
  b.count += 1;
  return { ok: true, restantes: limite - b.count, resetEnMs: b.resetAt - ahora };
}

/** Limpia buckets vencidos (llamar ocasionalmente para no crecer sin límite). */
export function limpiar(ahora: number = Date.now()): void {
  for (const [k, b] of store) if (ahora >= b.resetAt) store.delete(k);
}

/** Solo para tests. */
export function _reset(): void {
  store.clear();
}
