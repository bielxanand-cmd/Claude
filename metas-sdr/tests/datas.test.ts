import { describe, expect, it } from "vitest";
import {
  deInputDataHora,
  diaDe,
  diasDoMes,
  formatarDia,
  intervaloDoDia,
  mesesEntre,
  somarDias,
  ultimoDiaDoMes,
} from "@/lib/datas";

describe("datas no fuso America/Sao_Paulo", () => {
  it("o dia de um instante é o dia em São Paulo, não em UTC", () => {
    // 02:30 UTC de 08/10 ainda é 23:30 de 07/10 em São Paulo (UTC-3)
    expect(diaDe(new Date("2026-10-08T02:30:00Z"))).toBe("2026-10-07");
    expect(diaDe(new Date("2026-10-08T03:00:00Z"))).toBe("2026-10-08");
  });

  it("intervalo do dia começa à meia-noite de São Paulo", () => {
    const { gte, lt } = intervaloDoDia("2026-10-07");
    expect(gte.toISOString()).toBe("2026-10-07T03:00:00.000Z");
    expect(lt.toISOString()).toBe("2026-10-08T03:00:00.000Z");
  });

  it("lê datetime-local como horário de São Paulo", () => {
    expect(deInputDataHora("2026-10-07T14:30").toISOString()).toBe("2026-10-07T17:30:00.000Z");
  });

  it("aritmética de dias e meses", () => {
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(ultimoDiaDoMes("2028-02")).toBe("2028-02-29");
    expect(diasDoMes("2026-02")).toHaveLength(28);
    expect(mesesEntre("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("formata no padrão dd/mm/aaaa", () => {
    expect(formatarDia("2026-10-07")).toBe("07/10/2026");
  });
});
