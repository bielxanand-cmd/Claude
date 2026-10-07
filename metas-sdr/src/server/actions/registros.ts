"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { usuarioAtualId } from "@/server/usuario";
import { deInputDataHora } from "@/lib/datas";
import { ORIGENS, RESULTADOS, STATUS_AGENDAMENTO, STATUS_LEAD, ehUm } from "@/lib/rotulos";

export type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string };

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const dataHora = (v: unknown, padrao?: Date): Date | null => {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return deInputDataHora(v);
  return padrao ?? null;
};

function atualizarTelas() {
  revalidatePath("/", "layout");
}

async function erroComoResultado<T>(fn: () => Promise<Resultado<T>>): Promise<Resultado<T>> {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível salvar. Tente novamente." };
  }
}

// ---------------- Leads ----------------

export interface LeadEntrada {
  nome: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  origem: string;
  status?: string;
  observacoes?: string;
  /** "aaaa-mm-ddTHH:mm" (horário de São Paulo); padrão: agora. */
  entradaEm?: string;
}

function lerLead(e: LeadEntrada) {
  const nome = texto(e.nome);
  if (!nome) return { erro: "Informe o nome do lead." } as const;
  if (!ehUm(ORIGENS, e.origem)) return { erro: "Origem inválida." } as const;
  if (e.status !== undefined && !ehUm(STATUS_LEAD, e.status)) return { erro: "Status inválido." } as const;
  return {
    dados: {
      nome,
      empresa: texto(e.empresa),
      telefone: texto(e.telefone),
      email: texto(e.email),
      origem: e.origem,
      observacoes: texto(e.observacoes),
      ...(e.status ? { status: e.status } : {}),
    },
  } as const;
}

export async function criarLead(e: LeadEntrada): Promise<Resultado<{ id: string }>> {
  return erroComoResultado(async () => {
    const userId = await usuarioAtualId();
    const r = lerLead(e);
    if ("erro" in r) return { ok: false, erro: r.erro! };
    const lead = await db.lead.create({
      data: { ...r.dados, userId, entradaEm: dataHora(e.entradaEm, new Date())! },
    });
    atualizarTelas();
    return { ok: true, dados: { id: lead.id } };
  });
}

export async function atualizarLead(id: string, e: LeadEntrada): Promise<Resultado> {
  return erroComoResultado(async () => {
    const userId = await usuarioAtualId();
    const r = lerLead(e);
    if ("erro" in r) return { ok: false, erro: r.erro! };
    const entradaEm = dataHora(e.entradaEm);
    const { count } = await db.lead.updateMany({
      where: { id, userId },
      data: { ...r.dados, ...(entradaEm ? { entradaEm } : {}) },
    });
    if (!count) return { ok: false, erro: "Lead não encontrado." };
    atualizarTelas();
    return { ok: true };
  });
}

export async function excluirLead(id: string): Promise<Resultado> {
  return erroComoResultado(async () => {
    const userId = await usuarioAtualId();
    await db.lead.deleteMany({ where: { id, userId } });
    atualizarTelas();
    return { ok: true };
  });
}

// ---------------- Ligações ----------------

export interface LigacaoEntrada {
  leadId?: string | null;
  resultado: string;
  duracaoMin?: string | number | null;
  observacao?: string;
  realizadaEm?: string;
}

async function lerLigacao(userId: string, e: LigacaoEntrada) {
  if (!ehUm(RESULTADOS, e.resultado)) return { erro: "Escolha o resultado da ligação." } as const;
  const leadId = texto(e.leadId);
  if (leadId && !(await db.lead.findFirst({ where: { id: leadId, userId }, select: { id: true } }))) {
    return { erro: "Lead não encontrado." } as const;
  }
  const min = e.duracaoMin === "" || e.duracaoMin == null ? null : Number(e.duracaoMin);
  if (min != null && (!Number.isFinite(min) || min < 0)) return { erro: "Duração inválida." } as const;
  return {
    dados: {
      leadId,
      resultado: e.resultado,
      duracaoSeg: min == null ? null : Math.round(min * 60),
      observacao: texto(e.observacao),
    },
  } as const;
}

export async function criarLigacao(e: LigacaoEntrada): Promise<Resultado> {
  return erroComoResultado(async () => {
    const userId = await usuarioAtualId();
    const r = await lerLigacao(userId, e);
    if ("erro" in r) return { ok: false, erro: r.erro! };
    await db.$transaction(async (tx) => {
      await tx.ligacao.create({ data: { ...r.dados, userId, realizadaEm: dataHora(e.realizadaEm, new Date())! } });
      // Primeiro contato com um lead novo: passa para "em contato".
      if (r.dados.leadId) {
        await tx.lead.updateMany({ where: { id: r.dados.leadId, userId, status: "NOVO" }, data: { status: "EM_CONTATO" } });
      }
    });
    atualizarTelas();
    return { ok: true };
  });
}

export async function atualizarLigacao(id: string, e: LigacaoEntrada): Promise<Resultado> {
  return erroComoResultado(async () => {
    const userId = await usuarioAtualId();
    const r = await lerLigacao(userId, e);
    if ("erro" in r) return { ok: false, erro: r.erro! };
    const realizadaEm = dataHora(e.realizadaEm);
    const { count } = await db.ligacao.updateMany({
      where: { id, userId },
      data: { ...r.dados, ...(realizadaEm ? { realizadaEm } : {}) },
    });
    if (!count) return { ok: false, erro: "Ligação não encontrada." };
    atualizarTelas();
    return { ok: true };
  });
}

export async function excluirLigacao(id: string): Promise<Resultado> {
  return erroComoResultado(async () => {
    const userId = await usuarioAtualId();
    await db.ligacao.deleteMany({ where: { id, userId } });
    atualizarTelas();
    return { ok: true };
  });
}

// ---------------- Agendamentos ----------------

export interface AgendamentoEntrada {
  /** Lead existente... */
  leadId?: string | null;
  /** ...ou nome de um lead novo, criado junto com o agendamento. */
  novoLeadNome?: string;
  novoLeadOrigem?: string;
  reuniaoEm: string;
  status?: string;
  observacao?: string;
  feitoEm?: string;
}

export async function criarAgendamento(e: AgendamentoEntrada): Promise<Resultado> {
  return erroComoResultado(async () => {
    const userId = await usuarioAtualId();
    const reuniaoEm = dataHora(e.reuniaoEm);
    if (!reuniaoEm) return { ok: false, erro: "Informe a data e hora da reunião." };
    const status = e.status ?? "MARCADO";
    if (!ehUm(STATUS_AGENDAMENTO, status)) return { ok: false, erro: "Status inválido." };

    const leadId = texto(e.leadId);
    const novoNome = texto(e.novoLeadNome);
    if (!leadId && !novoNome) return { ok: false, erro: "Escolha um lead ou digite o nome de um novo." };
    if (leadId && !(await db.lead.findFirst({ where: { id: leadId, userId }, select: { id: true } }))) {
      return { ok: false, erro: "Lead não encontrado." };
    }
    const origem = ehUm(ORIGENS, e.novoLeadOrigem) ? e.novoLeadOrigem : "OUTBOUND";
    const feitoEm = dataHora(e.feitoEm, new Date())!;

    await db.$transaction(async (tx) => {
      const id = leadId ?? (await tx.lead.create({ data: { userId, nome: novoNome!, origem, entradaEm: feitoEm } })).id;
      await tx.agendamento.create({
        data: { userId, leadId: id, reuniaoEm, feitoEm, status, observacao: texto(e.observacao) },
      });
      await tx.lead.update({ where: { id }, data: { status: "AGENDADO" } });
    });
    atualizarTelas();
    return { ok: true };
  });
}

export async function atualizarAgendamento(id: string, e: AgendamentoEntrada): Promise<Resultado> {
  return erroComoResultado(async () => {
    const userId = await usuarioAtualId();
    const reuniaoEm = dataHora(e.reuniaoEm);
    if (!reuniaoEm) return { ok: false, erro: "Informe a data e hora da reunião." };
    if (e.status !== undefined && !ehUm(STATUS_AGENDAMENTO, e.status)) return { ok: false, erro: "Status inválido." };
    const leadId = texto(e.leadId);
    if (leadId && !(await db.lead.findFirst({ where: { id: leadId, userId }, select: { id: true } }))) {
      return { ok: false, erro: "Lead não encontrado." };
    }
    const feitoEm = dataHora(e.feitoEm);
    const { count } = await db.agendamento.updateMany({
      where: { id, userId },
      data: {
        reuniaoEm,
        observacao: texto(e.observacao),
        ...(e.status ? { status: e.status } : {}),
        ...(leadId ? { leadId } : {}),
        ...(feitoEm ? { feitoEm } : {}),
      },
    });
    if (!count) return { ok: false, erro: "Agendamento não encontrado." };
    atualizarTelas();
    return { ok: true };
  });
}

export async function mudarStatusAgendamento(id: string, status: string): Promise<Resultado> {
  return erroComoResultado(async () => {
    const userId = await usuarioAtualId();
    if (!ehUm(STATUS_AGENDAMENTO, status)) return { ok: false, erro: "Status inválido." };
    await db.agendamento.updateMany({ where: { id, userId }, data: { status } });
    atualizarTelas();
    return { ok: true };
  });
}

export async function excluirAgendamento(id: string): Promise<Resultado> {
  return erroComoResultado(async () => {
    const userId = await usuarioAtualId();
    await db.agendamento.deleteMany({ where: { id, userId } });
    atualizarTelas();
    return { ok: true };
  });
}
