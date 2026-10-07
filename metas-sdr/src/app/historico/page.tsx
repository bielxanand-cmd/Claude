import Link from "next/link";
import { CalendarCheck, Flame, Trophy, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardNumero, corTexto } from "@/components/comum/indicadores";
import { GraficoMeses } from "@/components/graficos/grafico-meses";
import { usuarioAtualId } from "@/server/usuario";
import { dadosHistorico } from "@/server/queries/historico";
import { formatarMes } from "@/lib/datas";
import { corDoPercentual } from "@/lib/metas/regras";
import { cn, formatarNumero, formatarPct } from "@/lib/utils";

export default async function HistoricoPage() {
  const userId = await usuarioAtualId();
  const h = await dadosHistorico(userId);
  const melhor = h.linhas.find((l) => l.mes === h.melhorMes);
  const linhasDesc = [...h.linhas].reverse();

  return (
    <div className="grid grid-cols-1 gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Histórico mês a mês</h1>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <CardNumero
          titulo="Sequência atual"
          valor={h.sequenciaAtual}
          icone={<Flame />}
          destaque={h.sequenciaAtual > 0 ? "text-warn" : undefined}
          detalhe={`dias úteis seguidos batendo a meta · recorde: ${h.melhorSequencia}`}
        />
        <CardNumero
          titulo="Melhor mês"
          valor={melhor ? formatarMes(melhor.mes, true) : "—"}
          icone={<Trophy />}
          detalhe={melhor ? `${formatarNumero(melhor.resumo.percentual)}% da meta · ${melhor.resumo.agendamentos} agendamentos` : undefined}
        />
        <CardNumero
          titulo="Metas mensais batidas"
          valor={
            <>
              {h.mesesBatidos}
              <span className="text-lg font-normal text-muted-foreground">/{h.linhas.length}</span>
            </>
          }
          icone={<Medal />}
          detalhe="meses"
        />
        <CardNumero titulo="Dias com meta batida" valor={h.totalDiasBatidos} icone={<CalendarCheck />} detalhe="no período todo" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoMeses
            dados={h.linhas.map((l) => ({
              mes: l.mes,
              agendamentos: l.resumo.agendamentos,
              meta: l.resumo.metaMensal,
              batida: l.resumo.metaMensalAtingida,
              emAndamento: l.emAndamento,
              diasAtingidos: l.resumo.diasAtingidos,
              diasComMeta: l.resumo.diasComMeta,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhe por mês</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 sm:px-5">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Mês</th>
                <th className="px-3 py-2 text-right font-medium">Agend.</th>
                <th className="px-3 py-2 text-right font-medium">Meta</th>
                <th className="px-3 py-2 text-right font-medium">% atingido</th>
                <th className="px-3 py-2 text-right font-medium">Dias c/ meta batida</th>
                <th className="px-3 py-2 font-medium">Meta mensal</th>
                <th className="px-3 py-2 text-right font-medium">Ligações</th>
                <th className="px-3 py-2 text-right font-medium">Leads</th>
                <th className="px-3 py-2 text-right font-medium">Lig.→Agend.</th>
                <th className="px-3 py-2 text-right font-medium">Lead→Agend.</th>
                <th className="px-3 py-2 text-right font-medium">Cancel.</th>
              </tr>
            </thead>
            <tbody>
              {linhasDesc.map((l) => {
                const r = l.resumo;
                return (
                  <tr key={l.mes} className={cn("border-b last:border-0", l.mes === h.melhorMes && "bg-ok-soft/40")}>
                    <td className="px-3 py-2.5 font-medium">
                      <Link href={`/mes?m=${l.mes}`} className="hover:underline">
                        {formatarMes(l.mes)}
                      </Link>
                      {l.mes === h.melhorMes && <Trophy className="ml-1.5 inline size-3.5 text-warn" aria-label="melhor mês" />}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">{r.agendamentos}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{r.metaMensal}</td>
                    <td className={cn("px-3 py-2.5 text-right font-medium", corTexto[corDoPercentual(r.percentual)])}>
                      {formatarNumero(r.percentual)}%
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {r.diasAtingidos}
                      <span className="text-muted-foreground">/{r.diasComMeta}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.metaMensalAtingida ? (
                        <Badge tom="ok">Sim</Badge>
                      ) : l.emAndamento ? (
                        <Badge tom="primario">Em andamento</Badge>
                      ) : (
                        <Badge tom="ruim">Não</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">{l.ligacoes}</td>
                    <td className="px-3 py-2.5 text-right">{l.leads}</td>
                    <td className="px-3 py-2.5 text-right">{formatarPct(l.convLigacoes, 1)}</td>
                    <td className="px-3 py-2.5 text-right">{formatarPct(l.convLeads, 1)}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{l.cancelados}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
