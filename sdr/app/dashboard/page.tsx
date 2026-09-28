"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { pct } from "@/components/ui";
import { usePoll } from "@/components/usePoll";
import { addDays, fmtDate, fmtDuration, toInputValue } from "@/lib/time";

type Etapa = { etapa: string; label: string; valor: number | null; meta: number; indice: number | null; dica: string };
type M = {
  range: "day" | "week"; inicio: string; fim: string; meta: number; diasUteis: number;
  reunioesAgendadas: number; leadsRecebidos: number; speedMedioSec: number | null; pctDentroSla: number | null;
  dentroSla: number; avaliaveisSla: number; trabalhados: number; conversas: number; agendaram: number; tentativasTotal: number;
  taxaContato: number | null; taxaAgendamento: number | null; taxaNoShow: number | null; realizadas: number; noShows: number;
  tentativas: { tentativa: string; reunioes: number }[];
  serie: { dia: string; leads: number; agendadas: number; realizadas: number; noShow: number }[];
  etapas: Etapa[]; gargalo: Etapa | null;
};

const BAR = "#4f46e5";
const axis = { fontSize: 12, fill: "#64748b" };

export default function Dashboard() {
  const [range, setRange] = useState<"day" | "week">("day");
  const [ref, setRef] = useState(() => new Date());
  const { data: m } = usePoll<M>(`/api/metrics?range=${range}&date=${encodeURIComponent(ref.toISOString())}`, 15000);
  const step = range === "day" ? 1 : 7;

  const pctMeta = m ? Math.min(100, (m.reunioesAgendadas / Math.max(1, m.meta)) * 100) : 0;
  const titulo = m ? (range === "day" ? fmtDate(m.inicio) : `${fmtDate(m.inicio)} – ${fmtDate(m.fim)}`) : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="ml-4 flex overflow-hidden rounded-lg border border-slate-300">
          {(["day", "week"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 text-sm ${range === r ? "bg-slate-800 text-white" : "bg-white"}`}>
              {r === "day" ? "Dia" : "Semana"}
            </button>
          ))}
        </div>
        <button className="btn px-2" onClick={() => setRef(addDays(ref, -step))} aria-label="Anterior">‹</button>
        <span className="min-w-40 text-center text-sm font-medium">{titulo}</span>
        <button className="btn px-2" onClick={() => setRef(addDays(ref, step))} aria-label="Próximo">›</button>
        <button className="btn text-xs" onClick={() => setRef(new Date())}>Hoje</button>
        <input type="date" className="input w-auto" value={toInputValue(ref).slice(0, 10)}
          onChange={(e) => e.target.value && setRef(new Date(`${e.target.value}T12:00:00-03:00`))} />
      </div>

      {!m ? <p className="text-slate-400">Carregando...</p> : (
        <>
          {/* Meta */}
          <div className="card">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Reuniões agendadas {range === "day" ? "no dia" : "na semana"}</div>
                <div className="text-4xl font-bold tabular-nums">{m.reunioesAgendadas}<span className="text-xl text-slate-400"> / {m.meta}</span></div>
              </div>
              <div className="ml-auto text-sm text-slate-500">
                {m.reunioesAgendadas >= m.meta ? "✅ Meta batida!" : `Faltam ${m.meta - m.reunioesAgendadas}`}
              </div>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={m.reunioesAgendadas} aria-valuemax={m.meta}>
              <div className={`h-full rounded-full ${pctMeta >= 100 ? "bg-emerald-500" : "bg-indigo-600"}`} style={{ width: `${pctMeta}%` }} />
            </div>
          </div>

          {/* Gargalo */}
          <Gargalo m={m} />

          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Speed-to-lead médio" value={fmtDuration(m.speedMedioSec)} sub={`${m.leadsRecebidos} leads recebidos`} />
            <Kpi label="Atendidos em até 5 min" value={pct(m.pctDentroSla)} sub={`${m.dentroSla} de ${m.avaliaveisSla} leads`} good={m.pctDentroSla != null && m.pctDentroSla >= 0.8} />
            <Kpi label="Taxa de contato" value={pct(m.taxaContato)} sub={`${m.conversas} conversas / ${m.trabalhados} leads trabalhados`} />
            <Kpi label="Taxa de agendamento" value={pct(m.taxaAgendamento)} sub={`${m.agendaram} agendaram / ${m.conversas} conversas`} />
            <Kpi label="Taxa de no-show" value={pct(m.taxaNoShow)} sub={`${m.noShows} no-show / ${m.realizadas + m.noShows} reuniões que já passaram`} />
            <Kpi label="Reuniões realizadas" value={String(m.realizadas)} sub="no período (pela data da reunião)" />
            <Kpi label="Tentativas registradas" value={String(m.tentativasTotal)} sub={m.trabalhados ? `${(m.tentativasTotal / m.trabalhados).toFixed(1)} por lead trabalhado` : ""} />
            <Kpi label="Conversão lead → reunião" value={pct(m.leadsRecebidos ? m.reunioesAgendadas / m.leadsRecebidos : null)} sub="meta de referência: ~17%" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="section-title">Em qual tentativa as reuniões saem</h2>
              <p className="mb-2 text-xs text-slate-500">Reuniões agendadas no período, pelo nº da tentativa em que o lead agendou.</p>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={m.tentativas} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="tentativa" tick={axis} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
                    <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v) => [v, "Reuniões"]} labelFormatter={(l) => `${l} tentativa`} />
                    <Bar dataKey="reunioes" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={48}>
                      <LabelList dataKey="reunioes" position="top" className="fill-slate-600 text-xs" formatter={(v: number) => (v ? v : "")} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h2 className="section-title">{range === "week" ? "Reuniões agendadas por dia" : "Funil do dia"}</h2>
              {range === "week" ? (
                <>
                  <p className="mb-2 text-xs text-slate-500">Linha tracejada = meta diária ({Math.round(m.meta / Math.max(1, m.diasUteis))}).</p>
                  <div className="h-64">
                    <ResponsiveContainer>
                      <BarChart data={m.serie.map((d) => ({ ...d, label: fmtDate(d.dia) }))} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
                        <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} domain={[0, (max: number) => Math.max(max, Math.ceil(m.meta / Math.max(1, m.diasUteis)))]} />
                        <ReferenceLine y={m.meta / Math.max(1, m.diasUteis)} stroke="#64748b" strokeDasharray="4 4" />
                        <Tooltip cursor={{ fill: "#f1f5f9" }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null;
                            const d = payload[0].payload as M["serie"][number] & { label: string };
                            return (
                              <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow">
                                <b>{d.label}</b><br />{d.agendadas} agendadas · {d.leads} leads<br />{d.realizadas} realizadas · {d.noShow} no-show
                              </div>
                            );
                          }} />
                        <Bar dataKey="agendadas" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={40}>
                          <LabelList dataKey="agendadas" position="top" className="fill-slate-600 text-xs" formatter={(v: number) => (v ? v : "")} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <Funil m={m} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div className="card">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${good ? "text-emerald-700" : ""}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function Funil({ m }: { m: M }) {
  const etapas = [
    { label: "Leads recebidos", v: m.leadsRecebidos },
    { label: "Leads trabalhados", v: m.trabalhados },
    { label: "Conversas", v: m.conversas },
    { label: "Agendaram", v: m.agendaram },
  ];
  const max = Math.max(1, ...etapas.map((e) => e.v));
  return (
    <ul className="space-y-3 pt-2">
      {etapas.map((e) => (
        <li key={e.label}>
          <div className="mb-1 flex justify-between text-sm"><span>{e.label}</span><b className="tabular-nums">{e.v}</b></div>
          <div className="h-3 rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${(e.v / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function Gargalo({ m }: { m: M }) {
  return (
    <div className={`card ${m.gargalo ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-60 flex-1">
          <div className="text-xs font-semibold uppercase text-slate-500">Gargalo</div>
          {m.gargalo ? (
            <>
              <div className="text-lg font-bold">⚠️ {m.gargalo.label}: {pct(m.gargalo.valor)} <span className="text-sm font-normal text-slate-500">(meta {pct(m.gargalo.meta)})</span></div>
              <p className="text-sm text-slate-700">{m.gargalo.dica}</p>
            </>
          ) : (
            <div className="text-lg font-bold">✅ {m.etapas.some((e) => e.indice != null) ? "Todas as etapas dentro da meta" : "Ainda sem dados suficientes"}</div>
          )}
        </div>
        <ul className="grid flex-1 gap-2 sm:grid-cols-3">
          {m.etapas.map((e) => {
            const ok = e.indice == null ? null : e.indice >= 1;
            return (
              <li key={e.etapa} className="rounded-lg bg-white/70 px-3 py-2 text-sm">
                <div className="text-xs text-slate-500">{e.label}</div>
                <div className="font-semibold">
                  {ok == null ? "—" : ok ? "✔" : "✖"} {pct(e.valor)} <span className="font-normal text-slate-400">/ meta {pct(e.meta)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                  <div className={`h-full rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, (e.indice ?? 0) * 100)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
