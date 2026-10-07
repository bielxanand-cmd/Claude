"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { usuarioAtualId } from "@/server/usuario";
import { ehDiaValido, ehMesValido, hoje, somarDias } from "@/lib/datas";
import { MOTIVOS, ehUm } from "@/lib/rotulos";
import type { Resultado } from "./registros";

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function atualizarTelas() {
  revalidatePath("/", "layout");
}

/**
 * Define a meta diária a partir de uma data. Dias anteriores continuam avaliados
 * com a meta que valia na época. Se já existir meta com a mesma data de vigência,
 * ela é substituída.
 */
export async function salvarMetaDiaria(valor: number, vigenteDesde: string = hoje()): Promise<Resultado> {
  const userId = await usuarioAtualId();
  if (!Number.isInteger(valor) || valor < 0 || valor > 1000) return { ok: false, erro: "Informe um número inteiro de 0 a 1000." };
  if (!ehDiaValido(vigenteDesde)) return { ok: false, erro: "Data de vigência inválida." };
  await db.meta.upsert({
    where: { userId_tipo_vigenteDesde: { userId, tipo: "DIARIA", vigenteDesde } },
    create: { userId, tipo: "DIARIA", valor, vigenteDesde },
    update: { valor },
  });
  atualizarTelas();
  return { ok: true };
}

/**
 * Define a meta mensal a partir de um mês ("aaaa-mm"). `valor` null volta para o
 * modo calculado (meta diária x dias úteis do mês).
 */
export async function salvarMetaMensal(valor: number | null, aPartirDe: string): Promise<Resultado> {
  const userId = await usuarioAtualId();
  if (valor != null && (!Number.isInteger(valor) || valor < 0 || valor > 100000)) {
    return { ok: false, erro: "Informe um número inteiro válido." };
  }
  if (!ehMesValido(aPartirDe)) return { ok: false, erro: "Mês inválido." };
  const vigenteDesde = `${aPartirDe}-01`;
  await db.meta.upsert({
    where: { userId_tipo_vigenteDesde: { userId, tipo: "MENSAL", vigenteDesde } },
    create: { userId, tipo: "MENSAL", valor, vigenteDesde },
    update: { valor },
  });
  atualizarTelas();
  return { ok: true };
}

export async function excluirMeta(id: string): Promise<Resultado> {
  const userId = await usuarioAtualId();
  const meta = await db.meta.findFirst({ where: { id, userId } });
  if (!meta) return { ok: false, erro: "Meta não encontrada." };
  if (meta.tipo === "DIARIA" && (await db.meta.count({ where: { userId, tipo: "DIARIA" } })) <= 1) {
    return { ok: false, erro: "Mantenha pelo menos uma meta diária." };
  }
  await db.meta.delete({ where: { id } });
  atualizarTelas();
  return { ok: true };
}

/** Marca um dia ou um intervalo (ex.: férias) como "dia sem meta". */
export async function adicionarDiasSemMeta(
  de: string,
  ate: string | null,
  motivo: string,
  descricao?: string,
): Promise<Resultado<{ dias: number }>> {
  const userId = await usuarioAtualId();
  const fim = ate || de;
  if (!ehDiaValido(de) || !ehDiaValido(fim)) return { ok: false, erro: "Data inválida." };
  if (fim < de) return { ok: false, erro: "A data final deve ser depois da inicial." };
  if (!ehUm(MOTIVOS, motivo)) return { ok: false, erro: "Motivo inválido." };
  const dias: string[] = [];
  for (let d = de; d <= fim; d = somarDias(d, 1)) dias.push(d);
  if (dias.length > 366) return { ok: false, erro: "Intervalo muito longo (máx. 1 ano)." };
  const desc = descricao?.trim() || null;
  await db.$transaction(
    dias.map((data) =>
      db.diaSemMeta.upsert({
        where: { userId_data: { userId, data } },
        create: { userId, data, motivo, descricao: desc },
        update: { motivo, descricao: desc },
      }),
    ),
  );
  atualizarTelas();
  return { ok: true, dados: { dias: dias.length } };
}

export async function excluirDiaSemMeta(id: string): Promise<Resultado> {
  const userId = await usuarioAtualId();
  await db.diaSemMeta.deleteMany({ where: { id, userId } });
  atualizarTelas();
  return { ok: true };
}

export async function salvarJornadaPadrao(inicio: string, fim: string): Promise<Resultado> {
  const userId = await usuarioAtualId();
  if (!HORA.test(inicio) || !HORA.test(fim) || fim <= inicio) return { ok: false, erro: "Horários inválidos." };
  await db.config.upsert({
    where: { userId },
    create: { userId, jornadaInicio: inicio, jornadaFim: fim },
    update: { jornadaInicio: inicio, jornadaFim: fim },
  });
  atualizarTelas();
  return { ok: true };
}

/** Jornada de um dia específico (padrão: hoje). `null` volta a usar a jornada padrão. */
export async function salvarJornadaDoDia(
  jornada: { inicio: string; fim: string } | null,
  dia: string = hoje(),
): Promise<Resultado> {
  const userId = await usuarioAtualId();
  if (!ehDiaValido(dia)) return { ok: false, erro: "Data inválida." };
  if (!jornada) {
    await db.jornadaDia.deleteMany({ where: { userId, data: dia } });
  } else {
    const { inicio, fim } = jornada;
    if (!HORA.test(inicio) || !HORA.test(fim) || fim <= inicio) return { ok: false, erro: "Horários inválidos." };
    await db.jornadaDia.upsert({
      where: { userId_data: { userId, data: dia } },
      create: { userId, data: dia, inicio, fim },
      update: { inicio, fim },
    });
  }
  atualizarTelas();
  return { ok: true };
}
