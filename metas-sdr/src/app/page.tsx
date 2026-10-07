import { CalendarCheck, Flag, Phone, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnelProgresso, BarraProgresso, CardNumero, corTexto } from "@/components/comum/indicadores";
import { LinhaDoTempo } from "@/components/hoje/linha-do-tempo";
import { EditarJornadaHoje, EditarMetaDiaria } from "@/components/hoje/editores";
import { BotoesRegistro } from "@/components/layout/navegacao";
import { usuarioAtualId } from "@/server/usuario";
import { dadosDeHoje } from "@/server/queries/hoje";
import { formatarDiaExtenso, formatarMes } from "@/lib/datas";
import { corDoPercentual } from "@/lib/metas/regras";
import { plural, rotuloMotivo, type Motivo } from "@/lib/rotulos";
import { formatarNumero, cn } from "@/lib/utils";

export default async function HojePage() {
  const userId = await usuarioAtualId();
  const d = await dadosDeHoje(userId);
  const { totais: t, resumoMes: m } = d;
  const motivo =
    d.motivoSemMeta === "FIM_DE_SEMANA" ? "Fim de semana" : d.motivoSemMeta ? rotuloMotivo[d.motivoSemMeta as Motivo] : null;
  const corMes = corDoPercentual(m.percentual);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hoje</h1>
          <p className="text-sm text-muted-foreground">{formatarDiaExtenso(d.dia)}</p>
        </div>
        <EditarMetaDiaria atual={d.metaVigente} />
      </div>

      <BotoesRegistro className="hidden md:grid xl:hidden" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Progresso da meta do dia */}
        <Card className="flex flex-col items-center gap-4 p-6">
          {d.temMeta && d.meta > 0 ? (
            <>
              <AnelProgresso pct={d.percentual} cor={d.cor}>
                <div>
                  <div className={cn("text-5xl font-bold tracking-tight", corTexto[d.cor])}>
                    {formatarNumero(d.percentual)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t.agendamentos} de {d.meta} agendamentos
                  </div>
                </div>
              </AnelProgresso>
              <div className="text-center">
                {d.faltam > 0 ? (
                  <p className="text-lg">
                    Faltam <strong className="text-2xl">{d.faltam}</strong> para a meta
                  </p>
                ) : (
                  <p className="text-lg font-semibold text-ok">Meta do dia batida! 🎉</p>
                )}
              </div>
            </>
          ) : (
            <div className="grid min-h-48 place-items-center text-center">
              <div>
                <Flag className="mx-auto mb-2 size-8 text-muted-foreground" />
                <p className="text-lg font-medium">Dia sem meta</p>
                <p className="text-sm text-muted-foreground">
                  {motivo ?? "Nenhuma meta diária definida"}. Os agendamentos de hoje contam para o mês.
                </p>
              </div>
            </div>
          )}
          <div className="w-full border-t pt-4 text-center">
            <p className="text-sm">
              <TrendingUp className="mr-1 inline size-4 align-[-3px] text-muted-foreground" />
              No ritmo atual você termina o dia com <strong>{d.projecao}</strong>{" "}
              {d.projecao === 1 ? "agendamento" : "agendamentos"}
            </p>
            <div className="mt-1">
              <EditarJornadaHoje inicio={d.jornada.inicio} fim={d.jornada.fim} personalizada={d.jornadaPersonalizada} />
            </div>
          </div>
        </Card>

        <div className="grid min-w-0 grid-cols-1 content-start gap-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <CardNumero
              titulo="Ligações"
              valor={t.ligacoes}
              icone={<Phone />}
              detalhe={t.agendamentos ? `${formatarNumero(t.ligacoes / t.agendamentos, 1)} por agendamento` : "hoje"}
            />
            <CardNumero
              titulo="Agendamentos"
              valor={t.agendamentos}
              icone={<Target />}
              destaque={d.meta > 0 ? corTexto[d.cor] : undefined}
              detalhe={
                t.cancelados > 0
                  ? `${plural(t.cancelados, "cancelado", "cancelados")} (já ${t.cancelados > 1 ? "descontados" : "descontado"})`
                  : "cancelados não contam"
              }
            />
            <CardNumero
              titulo="Faltam"
              valor={d.temMeta ? d.faltam : "—"}
              icone={<Flag />}
              destaque={d.temMeta && d.faltam === 0 ? "text-ok" : undefined}
              detalhe={d.temMeta ? `meta de hoje: ${d.meta}` : "dia sem meta"}
            />
          </div>

          {/* Mês em andamento */}
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between">
              <CardTitle className="flex items-center gap-1.5">
                <CalendarCheck className="size-4" /> {formatarMes(m.mes)}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {m.diasAtingidos}/{m.diasComMeta} dias com meta batida
              </span>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold">
                  {m.agendamentos} <span className="text-base font-normal text-muted-foreground">/ {m.metaMensal}</span>
                </span>
                <span className={cn("font-medium", corTexto[corMes])}>{formatarNumero(m.percentual)}%</span>
              </div>
              <BarraProgresso pct={m.percentual} cor={corMes} />
              <p className="text-sm text-muted-foreground">
                {m.faltam > 0 ? (
                  <>
                    Faltam <strong className="text-foreground">{m.faltam}</strong> agendamentos para a meta do mês.
                  </>
                ) : (
                  <strong className="text-ok">Meta do mês batida!</strong>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos de hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <LinhaDoTempo itens={d.lancamentos} />
        </CardContent>
      </Card>
    </div>
  );
}
