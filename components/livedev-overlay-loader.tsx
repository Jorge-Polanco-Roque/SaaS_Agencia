"use client";

import { useEffect } from "react";

// Carga el widget de feedback Live-Dev (UAT). El bundle externo ya provee su
// propio botón flotante "● Live-Dev"; aquí solo lo configuramos e inyectamos
// una vez. No-op si faltan llaves o el flag lo apaga. Ver §16 de CLAUDE.md.
export function LiveDevOverlayLoader({
  appId,
  token,
  apiUrl = "https://web-production-4be48.up.railway.app",
  enabled = true,
}: {
  appId?: string;
  token?: string;
  apiUrl?: string;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled || !appId || !token || typeof window === "undefined") return;
    (window as unknown as Record<string, unknown>).__LIVEDEV__ = {
      apiUrl,
      token,
      appId,
    };
    if (document.querySelector("[data-livedev-loaded]")) return;

    const script = document.createElement("script");
    script.setAttribute("data-livedev-loaded", "true");
    script.src = `${apiUrl}/livedev-overlay.js`;
    script.async = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, [appId, token, apiUrl, enabled]);

  return null;
}
