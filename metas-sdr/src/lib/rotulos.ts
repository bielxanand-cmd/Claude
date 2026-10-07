// Rótulos em pt-BR para os valores guardados no banco.

export const ORIGENS = ["INBOUND", "OUTBOUND", "INDICACAO", "OUTRO"] as const;
export type Origem = (typeof ORIGENS)[number];
export const rotuloOrigem: Record<Origem, string> = {
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
  INDICACAO: "Indicação",
  OUTRO: "Outro",
};

export const STATUS_LEAD = ["NOVO", "EM_CONTATO", "AGENDADO", "PERDIDO"] as const;
export type StatusLead = (typeof STATUS_LEAD)[number];
export const rotuloStatusLead: Record<StatusLead, string> = {
  NOVO: "Novo",
  EM_CONTATO: "Em contato",
  AGENDADO: "Agendado",
  PERDIDO: "Perdido",
};

export const tomStatusLead: Record<StatusLead, "neutro" | "primario" | "ok" | "ruim"> = {
  NOVO: "neutro",
  EM_CONTATO: "primario",
  AGENDADO: "ok",
  PERDIDO: "ruim",
};

export const RESULTADOS = ["ATENDEU", "NAO_ATENDEU", "CAIXA_POSTAL", "RETORNAR"] as const;
export type Resultado = (typeof RESULTADOS)[number];
export const rotuloResultado: Record<Resultado, string> = {
  ATENDEU: "Atendeu",
  NAO_ATENDEU: "Não atendeu",
  CAIXA_POSTAL: "Caixa postal",
  RETORNAR: "Retornar",
};

export const STATUS_AGENDAMENTO = ["MARCADO", "REALIZADO", "NO_SHOW", "CANCELADO"] as const;
export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[number];
export const rotuloStatusAgendamento: Record<StatusAgendamento, string> = {
  MARCADO: "Marcado",
  REALIZADO: "Realizado",
  NO_SHOW: "No-show",
  CANCELADO: "Cancelado",
};

export const MOTIVOS = ["FERIADO", "FOLGA", "FERIAS", "OUTRO"] as const;
export type Motivo = (typeof MOTIVOS)[number];
export const rotuloMotivo: Record<Motivo, string> = {
  FERIADO: "Feriado",
  FOLGA: "Folga",
  FERIAS: "Férias",
  OUTRO: "Outro",
};

export function ehUm<T extends readonly string[]>(lista: T, v: unknown): v is T[number] {
  return typeof v === "string" && (lista as readonly string[]).includes(v);
}
