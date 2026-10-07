import { Ban, CalendarCheck, Phone, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarraProgresso, CardNumero, corTexto } from "@/components/comum/indicadores";
import { SeletorMes } from "@/components/comum/seletor-mes";
import { GraficoDiario } from "@/components/graficos/grafico-diario";
import { CalendarioMes } from "@/components/graficos/calendario";
import { usuarioAtualId } from "@/server/usuario";
import { dadosDoMes } from "@/server/queries/mes";
import { ehMesValido, hoje, mesDe } from "@/lib/datas";
import { cn, formatarNumero, formatarPct } from "@/lib/utils";

export default async function MesPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const atual = mesDe(hoje());
  const mes = m && ehMesValido(m) && m <= atual ? m : atual;
  const userId = await usuarioAtualId();
  const d = await dadosDoMes(userId, mes);
  const r = d.resumo;

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard mensal</h1>
        <SeletorMes mes={mes} atual={atual} base="/mes" />
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Agendamentos no mês</div>
            <div className="text-4xl font-semibold tracking-tight sm:text-5xl">
              <span className={corTexto[d.cor]}>{r.agendamentos}</span>
              <span className="text-xl font-normal text-muted-foreground sm:text-2xl"> / {r.metaMensal}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Meta mensal {r.origemMetaMensal === "fixa" ? "fixa" : "calculada (meta diária × dias úteis)"}
            </div>
          </div>
          <div className="text-right">
            <div className={cn("text-3xl font-semibold", corTexto[d.cor])}>{formatarNumero(r.percentual)}%</div>
            <div className="text-sm">
              {r.metaMensalAtingida ? (
                <strong className="text-ok">Meta do mês batida! 🎉</strong>
              ) : (
                <>
                  Faltam <strong>{r.faltam}</strong> para a meta
                </>
              )}
            </div>
          </div>
        </div>
        <BarraProgresso pct={r.percentual} cor={d.cor} className="mt-4 h-3" />
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <CardNumero
          titulo="Dias com meta batida"
          valor={
            <>
              {r.diasAtingidos}
              <span className="text-lg font-normal text-muted-foreground">/{r.diasComMeta}</span>
            </>
          }
          icone={<CalendarCheck />}
          detalhe={d.ehMesAtual ? `${r.diasComMetaEncerrados} dias úteis já encerrados` : "dias úteis no mês"}
        />
        <CardNumero
          titulo="Média por dia útil"
          valor={formatarNumero(r.mediaPorDia, 1)}
          icone={<TrendingUp />}
          detalhe="agendamentos/dia"
        />
        <CardNumero
          titulo="Ligações"
          valor={d.totais.ligacoes}
          icone={<Phone />}
          detalhe={d.ligacoesPorDiaUtil != null ? `${formatarNumero(d.ligacoesPorDiaUtil)} por dia útil` : undefined}
        />
        <CardNumero
          titulo="Cancelados"
          valor={d.totais.cancelados}
          icone={<Ban />}
          detalhe={`de ${d.totais.feitos} agendados (não contam)`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversão</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-12 gap-y-4">
          <div>
            <div className="text-3xl font-semibold">{formatarPct(d.conversao, 1)}</div>
            <div className="text-sm text-muted-foreground">
              Ligações → agendamentos ({d.totais.agendamentos} de {d.totais.ligacoes})
            </div>
          </div>
          <div>
            <div className="text-3xl font-semibold">
              {d.ligacoesPorAgendamento != null ? formatarNumero(d.ligacoesPorAgendamento, 1) : "—"}
            </div>
            <div className="text-sm text-muted-foreground">Ligações por agendamento</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos por dia</CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoDiario dias={r.dias} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendário de metas</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarioMes dias={r.dias} motivos={d.motivosSemMeta} />
        </CardContent>
      </Card>
    </div>
  );
}
