import type { CorStatus } from "@/lib/metas/regras";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const corTexto: Record<CorStatus, string> = { vermelho: "text-bad", amarelo: "text-warn", verde: "text-ok" };
export const corTraco: Record<CorStatus, string> = { vermelho: "stroke-bad", amarelo: "stroke-warn", verde: "stroke-ok" };
export const corFundo: Record<CorStatus, string> = { vermelho: "bg-bad", amarelo: "bg-warn", verde: "bg-ok" };

/** Anel de progresso da meta. */
export function AnelProgresso({
  pct,
  cor,
  tamanho = 180,
  children,
}: {
  pct: number;
  cor: CorStatus;
  tamanho?: number;
  children?: React.ReactNode;
}) {
  const espessura = tamanho * 0.09;
  const r = (tamanho - espessura) / 2;
  const circ = 2 * Math.PI * r;
  const preenchido = Math.min(pct, 100) / 100;
  return (
    <div className="relative grid place-items-center" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90" aria-hidden>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" strokeWidth={espessura} className="stroke-muted" />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          fill="none"
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - preenchido)}
          className={cn(corTraco[cor], "transition-[stroke-dashoffset] duration-700")}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Barra de progresso horizontal. */
export function BarraProgresso({ pct, cor, className }: { pct: number; cor: CorStatus; className?: string }) {
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-700", corFundo[cor])} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

/** Card de número grande. */
export function CardNumero({
  titulo,
  valor,
  detalhe,
  icone,
  destaque,
  className,
}: {
  titulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  icone?: React.ReactNode;
  destaque?: string;
  className?: string;
}) {
  return (
    <Card className={cn("flex min-w-0 flex-col gap-1 p-3 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground sm:text-sm">
        <span className="break-words">{titulo}</span>
        {icone && <span className="hidden sm:inline [&_svg]:size-4">{icone}</span>}
      </div>
      <div className={cn("text-2xl font-semibold tracking-tight sm:text-4xl", destaque)}>{valor}</div>
      {detalhe && <div className="text-xs text-muted-foreground sm:text-sm">{detalhe}</div>}
    </Card>
  );
}
