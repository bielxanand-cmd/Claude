import { db } from "@/server/db";
import { usuarioAtualId } from "@/server/usuario";
import { carregarRegras, totaisPorDia } from "@/server/queries/regras-usuario";
import { paraCsv } from "@/lib/csv";
import { formatarDataHora, formatarDia, hoje } from "@/lib/datas";
import { metaDoDia } from "@/lib/metas/regras";

const TIPOS = ["resumo", "lancamentos"] as const;
const ROTULO = { LIGACAO: "Ligações", AGENDAMENTO: "Agendamentos", CANCELAMENTO: "Cancelamento" } as const;

export async function GET(_req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (!(TIPOS as readonly string[]).includes(tipo)) return new Response("Tipo inválido", { status: 404 });
  const userId = await usuarioAtualId();
  let csv: string;

  if (tipo === "resumo") {
    const [regras, totais] = await Promise.all([carregarRegras(userId), totaisPorDia(userId, "0000-01-01", "9999-12-31")]);
    const diaHoje = hoje();
    const dias = [...totais.keys()].sort();
    csv = paraCsv(
      ["dia", "ligacoes", "agendamentos_feitos", "cancelados", "agendamentos_validos", "meta", "meta_atingida"],
      dias.map((d) => {
        const t = totais.get(d)!;
        const meta = metaDoDia(d, regras.metas, regras.diasSemMeta);
        const atingida = meta ? (t.agendamentos >= meta ? "sim" : d < diaHoje ? "não" : "") : "sem meta";
        return [formatarDia(d), t.ligacoes, t.feitos, t.cancelados, t.agendamentos, meta || null, atingida];
      }),
    );
  } else {
    const regs = await db.registro.findMany({ where: { userId }, orderBy: { em: "asc" } });
    csv = paraCsv(
      ["lancado_em", "tipo", "quantidade", "conta_no_dia"],
      regs.map((r) => [formatarDataHora(r.em), ROTULO[r.tipo], r.quantidade, formatarDia(r.dia)]),
    );
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tipo === "resumo" ? "resumo-diario" : "lancamentos"}-${hoje()}.csv"`,
    },
  });
}
