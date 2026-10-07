// Rótulos em pt-BR para os valores guardados no banco.

export const TIPOS_REGISTRO = ["LIGACAO", "AGENDAMENTO", "CANCELAMENTO"] as const;
export type TipoRegistro = (typeof TIPOS_REGISTRO)[number];

/** "1 ligação", "3 ligações". */
export function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

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
