"use client";
import Link from "next/link";
import { MeetingActions } from "@/components/MeetingActions";
import type { Meeting } from "@/components/types";
import { Empty, StatusTag } from "@/components/ui";
import { usePoll } from "@/components/usePoll";
import { fmtDate, fmtTime, sameDay, startOfDay } from "@/lib/time";

export default function Reunioes() {
  const { data, reload } = usePoll<Meeting[]>("/api/meetings", 15000);
  const hoje = startOfDay(new Date());
  const passadas = (data ?? []).filter((m) => new Date(m.scheduledAt) < hoje);
  const futuras = (data ?? []).filter((m) => new Date(m.scheduledAt) >= hoje);
  const dias = new Map<string, Meeting[]>();
  for (const m of futuras) {
    const k = startOfDay(new Date(m.scheduledAt)).toISOString();
    dias.set(k, [...(dias.get(k) ?? []), m]);
  }
  const pendentesOntem = passadas.filter((m) => ["AGENDADA", "CONFIRMADA"].includes(m.status));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reuniões</h1>
      {pendentesOntem.length > 0 && (
        <div className="card border-amber-200 bg-amber-50">
          <h2 className="section-title">Registre o resultado das últimas reuniões</h2>
          <List list={pendentesOntem} reload={reload} />
        </div>
      )}
      {!data ? <p className="text-slate-400">Carregando...</p> : dias.size === 0 ? <Empty>Nenhuma reunião nos próximos dias.</Empty> : (
        [...dias.entries()].map(([k, list]) => (
          <div key={k} className="card">
            <h2 className="section-title">
              {sameDay(new Date(k), new Date()) ? "Hoje" : fmtDate(k)}
              <span className="rounded-full bg-slate-200 px-2 text-xs text-slate-600">{list.filter((m) => m.status !== "CANCELADA").length}</span>
            </h2>
            <List list={list} reload={reload} />
          </div>
        ))
      )}
    </div>
  );
}

function List({ list, reload }: { list: Meeting[]; reload: () => void }) {
  return (
    <ul className="divide-y">
      {list.map((m) => (
        <li key={m.id} className={`flex flex-wrap items-center gap-3 py-2 ${m.status === "CANCELADA" ? "opacity-50" : ""}`}>
          <span className="w-28 whitespace-nowrap font-mono font-semibold">{fmtDate(m.scheduledAt).split(" ")[1]} {fmtTime(m.scheduledAt)}</span>
          <Link href={`/leads/${m.leadId}`} className="font-medium hover:underline">{m.lead?.nome}</Link>
          <span className="text-xs text-slate-500">{m.lead?.interesse} · marcada na {m.attemptNumero}ª tentativa</span>
          <StatusTag status={m.status} meeting />
          <div className="ml-auto"><MeetingActions m={m} onDone={reload} compact /></div>
        </li>
      ))}
    </ul>
  );
}
