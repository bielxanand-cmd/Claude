import "server-only";
import { db } from "@/server/db";
import { ehDiaValido } from "@/lib/datas";
import { MOTIVOS, TIPOS_REGISTRO, ehUm } from "@/lib/rotulos";

export const VERSAO_BACKUP = 2;

export async function gerarBackup(userId: string) {
  const [registros, metas, diasSemMeta, jornadas, config] = await Promise.all([
    db.registro.findMany({ where: { userId } }),
    db.meta.findMany({ where: { userId } }),
    db.diaSemMeta.findMany({ where: { userId } }),
    db.jornadaDia.findMany({ where: { userId } }),
    db.config.findUnique({ where: { userId } }),
  ]);
  const sem = <T extends { userId: string }>(xs: T[]) => xs.map(({ userId: _, ...r }) => r);
  return {
    app: "metas-sdr",
    versao: VERSAO_BACKUP,
    exportadoEm: new Date().toISOString(),
    dados: {
      registros: sem(registros),
      metas: sem(metas),
      diasSemMeta: sem(diasSemMeta),
      jornadas: sem(jornadas),
      config: config ? { jornadaInicio: config.jornadaInicio, jornadaFim: config.jornadaFim } : null,
    },
  };
}

class BackupInvalido extends Error {}

const lista = (v: unknown, nome: string): Record<string, unknown>[] => {
  if (!Array.isArray(v)) throw new BackupInvalido(`Campo "${nome}" ausente ou inválido.`);
  return v as Record<string, unknown>[];
};
const str = (v: unknown, campo: string): string => {
  if (typeof v !== "string" || !v) throw new BackupInvalido(`Valor inválido em "${campo}".`);
  return v;
};
const strOuNulo = (v: unknown) => (typeof v === "string" ? v : null);
const data = (v: unknown, campo: string): Date => {
  const d = new Date(str(v, campo));
  if (Number.isNaN(d.getTime())) throw new BackupInvalido(`Data inválida em "${campo}".`);
  return d;
};
function enumDe<T extends readonly string[]>(l: T, v: unknown, campo: string): T[number] {
  if (!ehUm(l, v)) throw new BackupInvalido(`Valor inválido em "${campo}".`);
  return v;
}
const dia = (v: unknown, campo: string) => {
  const s = str(v, campo);
  if (!ehDiaValido(s)) throw new BackupInvalido(`Data inválida em "${campo}".`);
  return s;
};
const intOuNulo = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);

/**
 * Substitui TODOS os dados do usuário pelos do backup. Valida tudo antes de apagar
 * qualquer coisa e executa numa transação: ou restaura tudo, ou nada muda.
 */
export async function restaurarBackup(userId: string, json: unknown): Promise<{ ok: true; resumo: string } | { ok: false; erro: string }> {
  try {
    const b = json as { app?: unknown; versao?: unknown; dados?: Record<string, unknown> };
    if (!b || b.app !== "metas-sdr" || typeof b.dados !== "object" || !b.dados) {
      throw new BackupInvalido("Arquivo não parece um backup do Metas SDR.");
    }
    if (b.versao !== VERSAO_BACKUP) throw new BackupInvalido("Versão de backup não suportada.");
    const d = b.dados;

    const registros = lista(d.registros, "registros").map((r) => {
      const quantidade = intOuNulo(r.quantidade);
      if (quantidade == null || quantidade < 1) throw new BackupInvalido("Quantidade inválida em um lançamento.");
      return {
        id: str(r.id, "registro.id"),
        userId,
        tipo: enumDe(TIPOS_REGISTRO, r.tipo, "registro.tipo"),
        quantidade,
        em: data(r.em, "registro.em"),
        dia: dia(r.dia, "registro.dia"),
      };
    });
    const metas = lista(d.metas, "metas").map((m) => ({
      userId,
      tipo: enumDe(["DIARIA", "MENSAL"] as const, m.tipo, "meta.tipo"),
      valor: intOuNulo(m.valor),
      vigenteDesde: dia(m.vigenteDesde, "meta.vigenteDesde"),
    }));
    if (!metas.some((m) => m.tipo === "DIARIA" && m.valor != null)) throw new BackupInvalido("O backup não tem meta diária.");
    const diasSemMeta = lista(d.diasSemMeta, "diasSemMeta").map((x) => ({
      userId,
      data: dia(x.data, "diaSemMeta.data"),
      motivo: enumDe(MOTIVOS, x.motivo, "diaSemMeta.motivo"),
      descricao: strOuNulo(x.descricao),
    }));
    const jornadas = lista(d.jornadas ?? [], "jornadas").map((j) => ({
      userId,
      data: dia(j.data, "jornada.data"),
      inicio: str(j.inicio, "jornada.inicio"),
      fim: str(j.fim, "jornada.fim"),
    }));
    const cfg = d.config as { jornadaInicio?: unknown; jornadaFim?: unknown } | null;

    await db.$transaction([
      db.registro.deleteMany({ where: { userId } }),
      db.meta.deleteMany({ where: { userId } }),
      db.diaSemMeta.deleteMany({ where: { userId } }),
      db.jornadaDia.deleteMany({ where: { userId } }),
      db.registro.createMany({ data: registros }),
      db.meta.createMany({ data: metas }),
      db.diaSemMeta.createMany({ data: diasSemMeta }),
      db.jornadaDia.createMany({ data: jornadas }),
      ...(cfg && typeof cfg.jornadaInicio === "string" && typeof cfg.jornadaFim === "string"
        ? [
            db.config.upsert({
              where: { userId },
              create: { userId, jornadaInicio: cfg.jornadaInicio, jornadaFim: cfg.jornadaFim },
              update: { jornadaInicio: cfg.jornadaInicio, jornadaFim: cfg.jornadaFim },
            }),
          ]
        : []),
    ]);
    return {
      ok: true,
      resumo: `${registros.length} lançamentos restaurados.`,
    };
  } catch (e) {
    if (e instanceof BackupInvalido) return { ok: false, erro: e.message };
    console.error(e);
    return { ok: false, erro: "Não foi possível restaurar o backup (dados corrompidos)." };
  }
}
