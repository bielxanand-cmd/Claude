import { describe, expect, it } from "vitest";
import {
  type MetaRegistro,
  corDoPercentual,
  diaTemMeta,
  ehDiaUtil,
  faltam,
  melhorSequencia,
  metaAtingida,
  metaDiariaVigente,
  metaDoDia,
  metaMensal,
  percentual,
  projecaoDoDia,
  resumirMes,
  sequenciaAtual,
  taxaConversao,
} from "@/lib/metas/regras";

const diaria = (valor: number, vigenteDesde: string): MetaRegistro => ({ tipo: "DIARIA", valor, vigenteDesde });
const mensal = (valor: number | null, vigenteDesde: string): MetaRegistro => ({ tipo: "MENSAL", valor, vigenteDesde });
const semMeta = (...dias: string[]) => new Set(dias);

describe("meta vigente por data", () => {
  const metas = [diaria(5, "2026-09-15"), diaria(3, "2026-08-01"), mensal(80, "2026-08-01")];

  it("usa a meta mais recente cuja vigência já começou", () => {
    expect(metaDiariaVigente(metas, "2026-08-01")).toBe(3);
    expect(metaDiariaVigente(metas, "2026-09-14")).toBe(3);
    expect(metaDiariaVigente(metas, "2026-09-15")).toBe(5);
    expect(metaDiariaVigente(metas, "2027-01-10")).toBe(5);
  });

  it("retorna 0 antes de qualquer meta", () => {
    expect(metaDiariaVigente(metas, "2026-07-31")).toBe(0);
  });

  it("mudar a meta hoje não altera a avaliação de dias passados", () => {
    const antes = [diaria(3, "2026-08-01")];
    const depois = [...antes, diaria(6, "2026-10-07")];
    expect(metaAtingida(metaDiariaVigente(depois, "2026-10-06"), 3)).toBe(true);
    expect(metaDiariaVigente(depois, "2026-10-06")).toBe(metaDiariaVigente(antes, "2026-10-06"));
    expect(metaDiariaVigente(depois, "2026-10-07")).toBe(6);
  });

  it("ignora metas mensais ao buscar a diária", () => {
    expect(metaDiariaVigente([mensal(100, "2026-01-01")], "2026-05-05")).toBe(0);
  });
});

describe("dias úteis e dias sem meta", () => {
  it("considera apenas segunda a sexta", () => {
    expect(ehDiaUtil("2026-10-05")).toBe(true); // segunda
    expect(ehDiaUtil("2026-10-09")).toBe(true); // sexta
    expect(ehDiaUtil("2026-10-10")).toBe(false); // sábado
    expect(ehDiaUtil("2026-10-11")).toBe(false); // domingo
  });

  it("dia marcado como sem meta não tem meta", () => {
    const feriados = semMeta("2026-10-12");
    expect(diaTemMeta("2026-10-12", feriados)).toBe(false);
    expect(diaTemMeta("2026-10-13", feriados)).toBe(true);
    expect(metaDoDia("2026-10-12", [diaria(4, "2026-01-01")], feriados)).toBe(0);
    expect(metaDoDia("2026-10-13", [diaria(4, "2026-01-01")], feriados)).toBe(4);
    expect(metaDoDia("2026-10-10", [diaria(4, "2026-01-01")], feriados)).toBe(0);
  });
});

describe("faltam, percentual e cor", () => {
  it("faltam = max(0, meta - realizado)", () => {
    expect(faltam(5, 2)).toBe(3);
    expect(faltam(5, 5)).toBe(0);
    expect(faltam(5, 8)).toBe(0);
    expect(faltam(0, 0)).toBe(0);
  });

  it("percentual atingido", () => {
    expect(percentual(2, 4)).toBe(50);
    expect(percentual(6, 4)).toBe(150);
    expect(percentual(0, 0)).toBe(0);
  });

  it("cor por faixa", () => {
    expect(corDoPercentual(0)).toBe("vermelho");
    expect(corDoPercentual(49.9)).toBe("vermelho");
    expect(corDoPercentual(50)).toBe("amarelo");
    expect(corDoPercentual(99.9)).toBe("amarelo");
    expect(corDoPercentual(100)).toBe("verde");
  });

  it("meta atingida quando agendamentos >= meta (e meta > 0)", () => {
    expect(metaAtingida(4, 4)).toBe(true);
    expect(metaAtingida(4, 3)).toBe(false);
    expect(metaAtingida(0, 3)).toBe(false);
  });
});

describe("meta mensal", () => {
  // Outubro/2026: 22 dias úteis (01/10 é quinta).
  it("calcula meta diária x dias úteis quando não há meta mensal fixa", () => {
    expect(metaMensal("2026-10", [diaria(4, "2026-01-01")], semMeta())).toEqual({ valor: 88, origem: "calculada" });
  });

  it("desconta dias sem meta", () => {
    expect(metaMensal("2026-10", [diaria(4, "2026-01-01")], semMeta("2026-10-12")).valor).toBe(84);
  });

  it("respeita mudança de meta diária no meio do mês", () => {
    // 01/10 a 14/10: 10 dias úteis x 4; 15/10 a 30/10: 12 dias úteis x 5
    const metas = [diaria(4, "2026-01-01"), diaria(5, "2026-10-15")];
    expect(metaMensal("2026-10", metas, semMeta()).valor).toBe(10 * 4 + 12 * 5);
  });

  it("usa a meta mensal fixa vigente no início do mês", () => {
    const metas = [diaria(4, "2026-01-01"), mensal(70, "2026-10-01")];
    expect(metaMensal("2026-10", metas, semMeta())).toEqual({ valor: 70, origem: "fixa" });
    expect(metaMensal("2026-09", metas, semMeta()).origem).toBe("calculada");
  });

  it("meta mensal null volta a ser calculada", () => {
    const metas = [diaria(4, "2026-01-01"), mensal(70, "2026-09-01"), mensal(null, "2026-10-01")];
    expect(metaMensal("2026-09", metas, semMeta()).valor).toBe(70);
    expect(metaMensal("2026-10", metas, semMeta()).origem).toBe("calculada");
  });
});

describe("resumo do mês e dias com meta atingida", () => {
  const metas = [diaria(3, "2026-01-01")];
  const ag = new Map([
    ["2026-10-01", 3], // qui: atingiu
    ["2026-10-02", 2], // sex: não
    ["2026-10-03", 5], // sáb: sem meta (conta no total)
    ["2026-10-05", 4], // seg: atingiu
    ["2026-10-06", 3], // ter: feriado fictício -> sem meta
    ["2026-10-07", 1], // qua: hoje, em andamento
  ]);
  const r = resumirMes("2026-10", ag, metas, semMeta("2026-10-06"), "2026-10-07");

  it("conta dias atingidos e situação de cada dia", () => {
    expect(r.diasAtingidos).toBe(2);
    const s = Object.fromEntries(r.dias.map((d) => [d.dia, d.situacao]));
    expect(s["2026-10-01"]).toBe("atingida");
    expect(s["2026-10-02"]).toBe("nao-atingida");
    expect(s["2026-10-03"]).toBe("sem-meta");
    expect(s["2026-10-06"]).toBe("sem-meta");
    expect(s["2026-10-07"]).toBe("em-andamento");
    expect(s["2026-10-08"]).toBe("futuro");
  });

  it("totaliza agendamentos e calcula faltam/percentual do mês", () => {
    expect(r.agendamentos).toBe(18);
    expect(r.diasComMeta).toBe(21);
    expect(r.metaMensal).toBe(63);
    expect(r.faltam).toBe(45);
    expect(r.metaMensalAtingida).toBe(false);
    expect(r.diasComMetaEncerrados).toBe(3);
  });

  it("hoje conta como atingido assim que bate a meta", () => {
    const r2 = resumirMes("2026-10", new Map([["2026-10-07", 3]]), metas, semMeta(), "2026-10-07");
    expect(r2.dias.find((d) => d.dia === "2026-10-07")?.situacao).toBe("atingida");
    expect(r2.diasAtingidos).toBe(1);
  });

  it("indica meta mensal batida", () => {
    const tudo = new Map([["2026-10-01", 100]]);
    expect(resumirMes("2026-10", tudo, metas, semMeta(), "2026-10-31").metaMensalAtingida).toBe(true);
  });
});

describe("sequência de dias batendo a meta", () => {
  const metas = [diaria(2, "2026-01-01")];

  it("ignora fins de semana e dias sem meta, e não quebra no dia de hoje em andamento", () => {
    const ag = new Map([
      ["2026-10-01", 1], // qui: quebra
      ["2026-10-02", 2], // sex
      ["2026-10-05", 2], // seg
      ["2026-10-07", 0], // qua: hoje, em andamento
    ]);
    const r = resumirMes("2026-10", ag, metas, semMeta("2026-10-06"), "2026-10-07");
    expect(sequenciaAtual(r.dias, "2026-10-07")).toBe(2);
    expect(melhorSequencia(r.dias)).toBe(2);
  });

  it("zera quando o último dia encerrado não bateu", () => {
    const ag = new Map([["2026-10-05", 2]]);
    const r = resumirMes("2026-10", ag, metas, semMeta(), "2026-10-07");
    expect(sequenciaAtual(r.dias, "2026-10-07")).toBe(0);
  });
});

describe("ritmo e conversão", () => {
  const jornada = { inicio: "08:00", fim: "18:00" };

  it("projeta o fim do dia pelo ritmo atual", () => {
    expect(projecaoDoDia(2, 13 * 60, jornada)).toBe(4); // metade da jornada
    expect(projecaoDoDia(3, 7 * 60, jornada)).toBe(3); // antes do início
    expect(projecaoDoDia(5, 19 * 60, jornada)).toBe(5); // depois do fim
  });

  it("taxa de conversão", () => {
    expect(taxaConversao(5, 50)).toBe(10);
    expect(taxaConversao(1, 0)).toBeNull();
  });
});
