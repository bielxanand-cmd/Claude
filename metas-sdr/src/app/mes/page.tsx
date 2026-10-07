import { Ban, CalendarCheck, Phone, Target, TrendingUp, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarraProgresso, CardNumero, corTexto } from "@/components/comum/indicadores";
import { SeletorMes } from "@/components/comum/seletor-mes";
import { GraficoDiario } from "@/components/graficos/grafico-diario";
import { CalendarioMes } from "@/components/graficos/calendario";
import { usuarioAtualId } from "@/server/usuario";
import { dadosDoMes } from "@/server/queries/mes";
import { ehMesValido, hoje, mesDe } from "@/lib/datas";
import { rotuloStatusAgendamento, STATUS_AGENDAMENTO } from "@/lib/rotulos";
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
        <CardNumero titulo="Leads" valor={d.contagens.leads} icone={<UserPlus />} />
        <CardNumero titulo="Ligações" valor={d.contagens.ligacoes} icone={<Phone />} detalhe={`${d.contagens.ligacoesAtendidas} atendidas`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Conversão</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <div className="text-3xl font-semibold">{formatarPct(d.conversao.ligacoesParaAgendamentos, 1)}</div>
              <div className="text-sm text-muted-foreground">
                Ligações → agendamentos ({d.contagens.agendamentos} de {d.contagens.ligacoes})
              </div>
            </div>
            <div>
              <div className="text-3xl font-semibold">{formatarPct(d.conversao.leadsParaAgendamentos, 1)}</div>
              <div className="text-sm text-muted-foreground">
                Leads → agendamentos ({d.contagens.agendamentos} de {d.contagens.leads})
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Target className="size-4" /> Agendamentos por status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STATUS_AGENDAMENTO.map((s) => (
                <div key={s} className="rounded-xl bg-muted p-3">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {s === "CANCELADO" && <Ban className="size-3.5" />}
                    {rotuloStatusAgendamento[s]}
                  </div>
                  <div className="text-2xl font-semibold">{d.status[s]}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Cancelados ({d.contagens.cancelados}) não contam para a meta.
            </p>
          </CardContent>
        </Card>
      </div>

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
