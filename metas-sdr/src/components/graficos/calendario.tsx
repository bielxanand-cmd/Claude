import { Check, Minus, X } from "lucide-react";
import type { ResultadoDia } from "@/lib/metas/regras";
import { diaDaSemana, formatarDia } from "@/lib/datas";
import { cn } from "@/lib/utils";

const estilo: Record<ResultadoDia["situacao"], string> = {
  atingida: "bg-ok-soft border-ok/40",
  "nao-atingida": "bg-bad-soft border-bad/40",
  "em-andamento": "bg-accent border-primary/50",
  "sem-meta": "bg-muted border-transparent text-muted-foreground",
  futuro: "bg-card border-dashed text-muted-foreground",
};

const SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Calendário do mês: verde = meta atingida, vermelho = não atingida, cinza = sem meta. */
export function CalendarioMes({ dias, motivos }: { dias: ResultadoDia[]; motivos: Record<string, string> }) {
  const vazios = (diaDaSemana(dias[0].dia) + 6) % 7; // semana começando na segunda
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground sm:gap-1.5 sm:text-xs">
        {SEMANA.map((s) => (
          <div key={s}>{s}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: vazios }, (_, i) => (
          <div key={`v${i}`} />
        ))}
        {dias.map((d) => {
          const titulo = [
            formatarDia(d.dia),
            `${d.agendamentos} agendamento(s)`,
            d.temMeta ? `meta ${d.meta}` : motivos[d.dia] ? `sem meta: ${motivos[d.dia]}` : "sem meta",
          ].join(" · ");
          return (
            <div
              key={d.dia}
              title={titulo}
              className={cn("flex h-14 flex-col justify-between rounded-lg border p-1 sm:h-[4.5rem] sm:p-1.5", estilo[d.situacao])}
            >
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span>{Number(d.dia.slice(8))}</span>
                {d.situacao === "atingida" && <Check className="size-3 text-ok" aria-label="atingida" />}
                {d.situacao === "nao-atingida" && <X className="size-3 text-bad" aria-label="não atingida" />}
                {d.situacao === "sem-meta" && <Minus className="size-3" aria-label="sem meta" />}
              </div>
              {(d.situacao !== "futuro" || d.agendamentos > 0) && (
                <div className="text-right text-sm font-semibold sm:text-lg">
                  {d.agendamentos}
                  {d.temMeta && <span className="text-[10px] font-normal text-muted-foreground sm:text-xs">/{d.meta}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-ok/40 bg-ok-soft" /> Meta atingida</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-bad/40 bg-bad-soft" /> Não atingida</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-muted" /> Sem meta</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-primary/50 bg-accent" /> Hoje</span>
      </div>
    </div>
  );
}
