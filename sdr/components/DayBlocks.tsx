"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSla } from "./AppShell";
import type { QueueData } from "./types";
import { StatusTag } from "./ui";
import { fmtDate, fmtTime, toInputValue } from "@/lib/time";

export function DayBlocks({ bloco, q }: { bloco: "ABERTURA" | "FECHAMENTO"; q: QueueData }) {
  return bloco === "ABERTURA" ? <Abertura q={q} /> : <Fechamento q={q} />;
}

function Abertura({ q }: { q: QueueData }) {
  const followups = q.atrasados.length + q.doDia.length;
  return (
    <div className="card border-amber-200 bg-amber-50">
      <h2 className="mb-1 font-semibold">☀️ Abertura do dia (primeiros 30 min)</h2>
      <p className="mb-3 text-sm text-slate-600">
        Comece pelos leads que chegaram fora do horário, depois ataque os {followups} follow-up{followups === 1 ? "" : "s"} do dia.
      </p>
      <h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Leads que chegaram fora do horário ({q.foraDoHorario.length})</h3>
      {q.foraDoHorario.length === 0 ? <p className="text-sm text-slate-500">Nenhum.</p> : (
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {q.foraDoHorario.map((l) => (
            <li key={l.id} className="flex items-center gap-2">
              <span className={l.firstContactAt ? "text-emerald-600" : "text-rose-600"}>{l.firstContactAt ? "✔" : "●"}</span>
              <Link href={`/leads/${l.id}`} className="hover:underline">{l.nome}</Link>
              <span className="text-xs text-slate-400">{fmtDate(l.createdAt)} {fmtTime(l.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Fechamento({ q }: { q: QueueData }) {
  const sla = useSla();
  const key = `fechamento-${toInputValue(new Date()).slice(0, 10)}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(key) ?? "{}"));
    } catch {}
  }, [key]);
  const toggle = (k: string) => {
    const n = { ...done, [k]: !done[k] };
    setDone(n);
    try { localStorage.setItem(key, JSON.stringify(n)); } catch {}
  };
  const pendAmanha = q.reunioesAmanha.filter((m) => m.status !== "CONFIRMADA").length;
  const pendHoje = q.atrasados.length + q.doDia.filter((t) => t.disponivel).length + q.confirmacoes.length;
  const p = sla?.progresso;

  const Item = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <li className="flex gap-2">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-indigo-600" checked={!!done[k]} onChange={() => toggle(k)} />
      <div className={done[k] ? "text-slate-400 line-through" : ""}>{children}</div>
    </li>
  );

  return (
    <div className="card border-indigo-200 bg-indigo-50">
      <h2 className="mb-3 font-semibold">🌙 Fechamento do dia (últimos 30 min)</h2>
      <ul className="space-y-3 text-sm">
        <Item k="confirmar">
          <b>Confirmar reuniões do próximo dia útil</b> — {q.reunioesAmanha.length} reunião(ões), {pendAmanha} sem confirmação.
          {q.reunioesAmanha.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {q.reunioesAmanha.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <span className="font-mono">{fmtDate(m.scheduledAt)} {fmtTime(m.scheduledAt)}</span>
                  <Link href={`/leads/${m.leadId}`} className="hover:underline">{m.lead?.nome}</Link>
                  <StatusTag status={m.status} meeting />
                </li>
              ))}
            </ul>
          )}
        </Item>
        <Item k="pendencias">
          <b>Revisar pendências</b> — {pendHoje} tarefa(s) vencida(s) ainda abertas. Faça, reagende ou encerre.
        </Item>
        <Item k="resumo">
          <b>Ver o resumo do dia</b> — {p ? `${p.agendadasHoje}/${p.meta} reuniões agendadas.` : ""}{" "}
          <Link href="/dashboard" className="text-indigo-700 underline">Abrir dashboard</Link>
        </Item>
      </ul>
    </div>
  );
}
