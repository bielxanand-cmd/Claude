"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarDia } from "@/lib/datas";
import { formatarPct } from "@/lib/utils";
import { taxaConversao } from "@/lib/metas/regras";

interface Ponto {
  dia: string;
  ligacoes: number;
  agendamentos: number;
}

function Dica({ active, payload }: { active?: boolean; payload?: { payload: Ponto }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-lg">
      <div className="font-medium">{formatarDia(p.dia)}</div>
      <div>
        Ligações: <strong>{p.ligacoes}</strong>
      </div>
      <div className="text-muted-foreground">
        Agendamentos: {p.agendamentos}
        {p.ligacoes > 0 && ` · conversão ${formatarPct(taxaConversao(p.agendamentos, p.ligacoes), 1)}`}
      </div>
    </div>
  );
}

/** Ligações por dia do mês (uma série, sem meta). */
export function GraficoLigacoes({ dias }: { dias: Ponto[] }) {
  const dados = dias.map((d) => ({ ...d, rotulo: d.dia.slice(8) }));
  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer>
        <BarChart data={dados} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="rotulo" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" stroke="var(--muted-foreground)" />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
          <Tooltip content={<Dica />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="ligacoes" fill="var(--serie-ligacoes)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
