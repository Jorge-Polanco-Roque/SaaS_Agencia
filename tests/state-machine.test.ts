import { describe, expect, it } from "vitest";
import {
  puedeTransicionar,
  transicionesDisponibles,
} from "@/lib/services/state-machine";

describe("puedeTransicionar", () => {
  it("ejecutivo puede enviar borrador a validación", () => {
    expect(puedeTransicionar("borrador", "enviar_a_validacion", "ejecutivo").ok).toBe(
      true
    );
  });

  it("ejecutivo NO puede validar (solo admin)", () => {
    expect(puedeTransicionar("en_validacion", "validar", "ejecutivo").ok).toBe(
      false
    );
  });

  it("admin puede validar una cotización en validación", () => {
    expect(puedeTransicionar("en_validacion", "validar", "admin").ok).toBe(true);
  });

  it("no se puede validar desde borrador", () => {
    expect(puedeTransicionar("borrador", "validar", "admin").ok).toBe(false);
  });

  it("confirmar es acción exclusiva del cliente", () => {
    expect(
      puedeTransicionar("enviada_cliente", "confirmar", "admin").ok
    ).toBe(false);
    expect(
      puedeTransicionar("enviada_cliente", "confirmar", null, { esCliente: true })
        .ok
    ).toBe(true);
  });

  it("cliente puede solicitar cambios desde enviada_cliente", () => {
    expect(
      puedeTransicionar("enviada_cliente", "solicitar_cambios", null, {
        esCliente: true,
      }).ok
    ).toBe(true);
  });

  it("CONFORMS: ejecutivo marca conforme_pendiente desde enviada_cliente", () => {
    expect(
      puedeTransicionar("enviada_cliente", "marcar_conforms", "ejecutivo").ok
    ).toBe(true);
  });

  it("PO CONFIRMA: cliente puede confirmar desde conforme_pendiente", () => {
    expect(
      puedeTransicionar("conforme_pendiente", "confirmar", null, {
        esCliente: true,
      }).ok
    ).toBe(true);
  });

  it("cliente puede pedir cambios desde conforme_pendiente", () => {
    expect(
      puedeTransicionar("conforme_pendiente", "solicitar_cambios", null, {
        esCliente: true,
      }).ok
    ).toBe(true);
  });
});

describe("transicionesDisponibles", () => {
  it("excluye transiciones de cliente para roles internos", () => {
    const t = transicionesDisponibles("enviada_cliente", "admin");
    const nombres = t.map((x) => x.transicion);
    expect(nombres).not.toContain("confirmar");
    expect(nombres).not.toContain("solicitar_cambios");
  });

  it("admin en validación puede validar o rechazar", () => {
    const nombres = transicionesDisponibles("en_validacion", "admin").map(
      (x) => x.transicion
    );
    expect(nombres).toContain("validar");
    expect(nombres).toContain("rechazar");
  });
});
