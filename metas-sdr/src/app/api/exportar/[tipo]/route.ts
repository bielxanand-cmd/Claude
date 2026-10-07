import { db } from "@/server/db";
import { usuarioAtualId } from "@/server/usuario";
import { paraCsv } from "@/lib/csv";
import { formatarDataHora, hoje } from "@/lib/datas";
import {
  rotuloOrigem,
  rotuloResultado,
  rotuloStatusAgendamento,
  rotuloStatusLead,
  type Origem,
  type Resultado,
  type StatusAgendamento,
  type StatusLead,
} from "@/lib/rotulos";

const TIPOS = ["leads", "ligacoes", "agendamentos"] as const;

export async function GET(_req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (!(TIPOS as readonly string[]).includes(tipo)) return new Response("Tipo inválido", { status: 404 });
  const userId = await usuarioAtualId();
  let csv: string;

  if (tipo === "leads") {
    const leads = await db.lead.findMany({ where: { userId }, orderBy: { entradaEm: "asc" } });
    csv = paraCsv(
      ["id", "nome", "empresa", "telefone", "email", "origem", "status", "entrada", "observacoes"],
      leads.map((l) => [
        l.id, l.nome, l.empresa, l.telefone, l.email,
        rotuloOrigem[l.origem as Origem], rotuloStatusLead[l.status as StatusLead],
        formatarDataHora(l.entradaEm), l.observacoes,
      ]),
    );
  } else if (tipo === "ligacoes") {
    const ligs = await db.ligacao.findMany({ where: { userId }, orderBy: { realizadaEm: "asc" }, include: { lead: { select: { nome: true } } } });
    csv = paraCsv(
      ["id", "data_hora", "lead_id", "lead", "resultado", "duracao_min", "observacao"],
      ligs.map((c) => [
        c.id, formatarDataHora(c.realizadaEm), c.leadId, c.lead?.nome,
        rotuloResultado[c.resultado as Resultado],
        c.duracaoSeg != null ? (c.duracaoSeg / 60).toFixed(1).replace(".", ",") : null, c.observacao,
      ]),
    );
  } else {
    const ags = await db.agendamento.findMany({ where: { userId }, orderBy: { feitoEm: "asc" }, include: { lead: { select: { nome: true } } } });
    csv = paraCsv(
      ["id", "feito_em", "reuniao_em", "lead_id", "lead", "status", "conta_para_meta", "observacao"],
      ags.map((a) => [
        a.id, formatarDataHora(a.feitoEm), formatarDataHora(a.reuniaoEm), a.leadId, a.lead.nome,
        rotuloStatusAgendamento[a.status as StatusAgendamento], a.status === "CANCELADO" ? "não" : "sim", a.observacao,
      ]),
    );
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tipo}-${hoje()}.csv"`,
    },
  });
}
