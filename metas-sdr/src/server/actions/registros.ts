"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { usuarioAtualId } from "@/server/usuario";
import { deInputDataHora, diaDe, ehDiaValido, hoje } from "@/lib/datas";
import { TIPOS_REGISTRO, ehUm } from "@/lib/rotulos";

export type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string };

export interface RegistroEntrada {
  tipo: string;
  quantidade: number;
  /** "aaaa-mm-ddTHH:mm" (horário de São Paulo); padrão: agora. */
  em?: string;
  /** Só para CANCELAMENTO: dia em que o agendamento foi feito (padrão: hoje). */
  diaAgendamento?: string;
}

function ler(e: RegistroEntrada, emAtual?: Date) {
  if (!ehUm(TIPOS_REGISTRO, e.tipo)) return { erro: "Tipo de lançamento inválido." } as const;
  if (!Number.isInteger(e.quantidade) || e.quantidade < 1 || e.quantidade > 500) {
    return { erro: "Informe uma quantidade de 1 a 500." } as const;
  }
  const em =
    typeof e.em === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(e.em) ? deInputDataHora(e.em) : (emAtual ?? new Date());
  let dia = diaDe(em);
  if (e.tipo === "CANCELAMENTO") {
    dia = e.diaAgendamento ?? hoje();
    if (!ehDiaValido(dia)) return { erro: "Informe o dia em que o agendamento foi feito." } as const;
    if (dia > hoje()) return { erro: "O agendamento não pode ser de um dia futuro." } as const;
  }
  return { dados: { tipo: e.tipo, quantidade: e.quantidade, em, dia } } as const;
}

async function seguro<T>(fn: () => Promise<Resultado<T>>): Promise<Resultado<T>> {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível salvar. Tente novamente." };
  }
}

export async function criarRegistro(e: RegistroEntrada): Promise<Resultado> {
  return seguro(async () => {
    const userId = await usuarioAtualId();
    const r = ler(e);
    if ("erro" in r) return { ok: false, erro: r.erro! };
    await db.registro.create({ data: { ...r.dados, userId } });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function atualizarRegistro(id: string, e: RegistroEntrada): Promise<Resultado> {
  return seguro(async () => {
    const userId = await usuarioAtualId();
    const atual = await db.registro.findFirst({ where: { id, userId } });
    if (!atual) return { ok: false, erro: "Lançamento não encontrado." };
    const r = ler({ ...e, tipo: atual.tipo }, atual.em);
    if ("erro" in r) return { ok: false, erro: r.erro! };
    await db.registro.update({ where: { id }, data: { quantidade: r.dados.quantidade, em: r.dados.em, dia: r.dados.dia } });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function excluirRegistro(id: string): Promise<Resultado> {
  return seguro(async () => {
    const userId = await usuarioAtualId();
    await db.registro.deleteMany({ where: { id, userId } });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
