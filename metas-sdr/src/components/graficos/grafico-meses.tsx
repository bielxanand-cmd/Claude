"use client";

import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarMes } from "@/lib/datas";

export interface PontoMes {
  mes: string;
  agendamentos: number;
  meta: number;
  batida: boolean;
  emAndamento: boolean;
  diasAtingidos: number;
  diasComMeta: number;
}

function TracoMeta({ cx, cy, value }: { cx?: number; cy?: number; value?: number | null }) {
  if (cx == null || cy == null || !value) return null;
  return <line x1={cx - 22} x2={cx + 22} y1={cy} y2={cy} stroke="var(--foreground)" strokeWidth={2} strokeLinecap="round" />;
}

function Dica({ active, payload }: { active?: boolean; payload?: { payload: PontoMes }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-lg">
      <div className="font-medium">{formatarMes(p.mes)}</div>
      <div>
        Agendamentos: <strong>{p.agendamentos}</strong> / meta {p.meta}
      </div>
      <div className="text-muted-foreground">
        Dias com meta batida: {p.diasAtingidos}/{p.diasComMeta}
      </div>
    </div>
  );
}

/** Agendamentos por mês com o traço da meta mensal. */
export function GraficoMeses({ dados }: { dados: PontoMes[] }) {
  const cor = (p: PontoMes) => (p.batida ? "var(--ok)" : p.emAndamento ? "var(--primary)" : "var(--bad)");
  return (
    <div className="grid gap-3">
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <ComposedChart
            data={dados.map((d) => ({ ...d, rotulo: formatarMes(d.mes, true) }))}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="rotulo" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
            <Tooltip content={<Dica />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="agendamentos" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {dados.map((d) => (
                <Cell key={d.mes} fill={cor(d)} />
              ))}
            </Bar>
            <Line dataKey="meta" stroke="none" dot={<TracoMeta />} activeDot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ok" /> Meta mensal batida</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-bad" /> Não batida</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" /> Mês em andamento</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 rounded border-t-2 border-foreground" /> Meta do mês</span>
      </div>
    </div>
  );
}
