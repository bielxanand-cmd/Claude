export const CANAIS = ["LIGACAO", "WHATSAPP", "EMAIL"] as const;
export type Canal = (typeof CANAIS)[number];

export const CANAL_LABEL: Record<string, string> = {
  LIGACAO: "Ligação",
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
};

export const CANAL_ICON: Record<string, string> = {
  LIGACAO: "📞",
  WHATSAPP: "💬",
  EMAIL: "✉️",
};

export const RESULTADOS = [
  "NAO_ATENDEU",
  "AGENDOU",
  "RETORNAR",
  "DESQUALIFICADO",
  "NUMERO_INVALIDO",
  "ENVIADO",
] as const;
export type Resultado = (typeof RESULTADOS)[number];

export const RESULTADO_LABEL: Record<string, string> = {
  NAO_ATENDEU: "Não atendeu",
  AGENDOU: "Atendeu - agendou",
  RETORNAR: "Atendeu - retornar depois",
  DESQUALIFICADO: "Desqualificado",
  NUMERO_INVALIDO: "Número inválido",
  ENVIADO: "Mensagem enviada",
};

/** Resultados que contam como conversa (o lead atendeu/respondeu). */
export const CONVERSA = ["AGENDOU", "RETORNAR", "DESQUALIFICADO"];

export const STATUS_LABEL: Record<string, string> = {
  NOVO: "Novo",
  EM_CADENCIA: "Em cadência",
  CONVERSANDO: "Conversando",
  AGENDADO: "Agendado",
  DESQUALIFICADO: "Desqualificado",
  INVALIDO: "Número inválido",
  ENCERRADO: "Encerrado",
};

export const STATUS_FECHADOS = ["AGENDADO", "DESQUALIFICADO", "INVALIDO", "ENCERRADO"];

export const MEETING_LABEL: Record<string, string> = {
  AGENDADA: "Agendada",
  CONFIRMADA: "Confirmada",
  REALIZADA: "Realizada",
  NO_SHOW: "No-show",
  CANCELADA: "Cancelada",
};
