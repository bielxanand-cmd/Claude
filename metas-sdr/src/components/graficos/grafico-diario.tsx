"use client";

import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ResultadoDia } from "@/lib/metas/regras";
import { formatarDia } from "@/lib/datas";

const corBarra: Record<ResultadoDia["situacao"], string> = {
  atingida: "var(--ok)",
  "nao-atingida": "var(--bad)",
  "em-andamento": "var(--primary)",
  "sem-meta": "var(--muted-foreground)",
  futuro: "var(--muted-foreground)",
};

const rotuloSituacao: Record<ResultadoDia["situacao"], string> = {
  atingida: "Meta atingida",
  "nao-atingida": "Meta não atingida",
  "em-andamento": "Em andamento",
  "sem-meta": "Dia sem meta",
  futuro: "Ainda não chegou",
};

interface Ponto {
  dia: string;
  rotulo: string;
  agendamentos: number;
  meta: number | null;
  situacao: ResultadoDia["situacao"];
}

/** Marca da meta diária: um traço horizontal sobre cada dia com meta. */
function TracoMeta({ cx, cy, value }: { cx?: number; cy?: number; value?: number | null }) {
  if (cx == null || cy == null || value == null) return null;
  return <line x1={cx - 11} x2={cx + 11} y1={cy} y2={cy} stroke="var(--foreground)" strokeWidth={2} strokeLinecap="round" />;
}

function Dica({ active, payload }: { active?: boolean; payload?: { payload: Ponto }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-lg">
      <div className="font-medium">{formatarDia(p.dia)}</div>
      <div>
        Agendamentos: <strong>{p.agendamentos}</strong>
      </div>
      {p.meta != null && <div className="text-muted-foreground">Meta do dia: {p.meta}</div>}
      <div className="text-muted-foreground">{rotuloSituacao[p.situacao]}</div>
    </div>
  );
}

/** Agendamentos por dia (barras, cor pela situação) com a linha da meta diária. */
export function GraficoDiario({ dias }: { dias: ResultadoDia[] }) {
  const dados: Ponto[] = dias.map((d) => ({
    dia: d.dia,
    rotulo: d.dia.slice(8),
    agendamentos: d.agendamentos,
    meta: d.temMeta ? d.meta : null,
    situacao: d.situacao,
  }));
  return (
    <div className="grid gap-3">
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer>
          <ComposedChart data={dados} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="rotulo" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" stroke="var(--muted-foreground)" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
            <Tooltip content={<Dica />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="agendamentos" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {dados.map((d) => (
                <Cell key={d.dia} fill={corBarra[d.situacao]} fillOpacity={d.situacao === "sem-meta" || d.situacao === "futuro" ? 0.45 : 1} />
              ))}
            </Bar>
            <Line dataKey="meta" stroke="none" dot={<TracoMeta />} activeDot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Legenda />
    </div>
  );
}

function Legenda() {
  const itens = [
    { cor: "bg-ok", rotulo: "Meta atingida" },
    { cor: "bg-bad", rotulo: "Não atingida" },
    { cor: "bg-primary", rotulo: "Hoje" },
    { cor: "bg-muted-foreground/45", rotulo: "Sem meta" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {itens.map((i) => (
        <span key={i.rotulo} className="inline-flex items-center gap-1.5">
          <span className={`size-2.5 rounded-sm ${i.cor}`} /> {i.rotulo}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="w-4 rounded border-t-2 border-foreground" /> Meta diária
      </span>
    </div>
  );
}
