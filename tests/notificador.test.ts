import { describe, expect, it } from "vitest";
import { seleccionarDestinatariosContabilidad } from "@/lib/services/notificador";

describe("seleccionarDestinatariosContabilidad", () => {
  it("incluye el correo de entorno cuando existe", () => {
    expect(
      seleccionarDestinatariosContabilidad({ envEmail: "conta@jsm.test" })
    ).toEqual(["conta@jsm.test"]);
  });

  it("incluye perfiles con rol contabilidad y email", () => {
    const r = seleccionarDestinatariosContabilidad({
      perfiles: [
        { rol: "contabilidad", email: "a@jsm.test" },
        { rol: "ejecutivo", email: "exec@jsm.test" },
        { rol: "contabilidad", email: null },
      ],
    });
    expect(r).toEqual(["a@jsm.test"]);
  });

  it("combina entorno + perfiles sin duplicar", () => {
    const r = seleccionarDestinatariosContabilidad({
      envEmail: "a@jsm.test",
      perfiles: [
        { rol: "contabilidad", email: "a@jsm.test" },
        { rol: "contabilidad", email: "b@jsm.test" },
      ],
    });
    expect(r.sort()).toEqual(["a@jsm.test", "b@jsm.test"]);
  });

  it("sin entorno ni perfiles → lista vacía (no-op seguro)", () => {
    expect(seleccionarDestinatariosContabilidad({})).toEqual([]);
  });
});
