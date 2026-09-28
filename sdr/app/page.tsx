"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { typing, useSla } from "@/components/AppShell";
import { Countdown } from "@/components/Countdown";
import { DayBlocks } from "@/components/DayBlocks";
import type { QueueData, QueueTask, SlaLead } from "@/components/types";
import { CanalTag, Empty, Score, StatusTag } from "@/components/ui";
import { usePoll } from "@/components/usePoll";
import { fmtDate, fmtTime, sameDay } from "@/lib/time";

type Item =
  | { kind: "sla"; key: string; href: string; lead: SlaLead }
  | { kind: "task"; key: string; href: string; task: QueueTask; section: "confirmacoes" | "atrasados" | "doDia" };

const SECTIONS = [
  { id: "sla", n: 1, title: "Leads novos no SLA", empty: "Nenhum lead aguardando. 🎉" },
  { id: "confirmacoes", n: 2, title: "Confirmar reuniões", empty: "Nenhuma confirmação pendente." },
  { id: "atrasados", n: 3, title: "Follow-ups atrasados", empty: "Nada atrasado." },
  { id: "doDia", n: 4, title: "Follow-ups de hoje", empty: "Sem follow-ups para hoje." },
] as const;

export default function Plantao() {
  const sla = useSla();
  const { data: q } = usePoll<QueueData>("/api/queue", 8000);
  const router = useRouter();
  const [sel, setSel] = useState(0);
  const [bloco, setBloco] = useState<"ABERTURA" | "FECHAMENTO" | null | undefined>(undefined);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (const l of sla?.leads ?? []) out.push({ kind: "sla", key: `l${l.id}`, href: `/leads/${l.id}`, lead: l });
    for (const s of ["confirmacoes", "atrasados", "doDia"] as const)
      for (const t of q?.[s] ?? []) out.push({ kind: "task", key: `t${t.id}`, href: `/leads/${t.leadId}?task=${t.id}`, task: t, section: s });
    return out;
  }, [sla, q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || document.querySelector("[data-modal]")) return;
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
      else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
      else if (e.key === "Enter" && items[sel]) router.push(items[sel].href);
      else if (e.key === " " && items[0]) { e.preventDefault(); router.push(items[0].href); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, sel, router]);

  useEffect(() => {
    document.getElementById(`qi-${sel}`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const blocoAtivo = bloco === undefined ? q?.bloco ?? null : bloco;
  const next = items[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">O que fazer agora</h1>
          {next && (
            <Link href={next.href} className="btn-primary ml-2">
              ▶ Atender próximo <span className="kbd bg-indigo-500 text-indigo-50">Espaço</span>
            </Link>
          )}
          <div className="ml-auto flex gap-1 text-xs">
            <button className={`btn text-xs ${blocoAtivo === "ABERTURA" ? "border-indigo-400 bg-indigo-50" : ""}`}
              onClick={() => setBloco(blocoAtivo === "ABERTURA" ? null : "ABERTURA")}>☀️ Abertura</button>
            <button className={`btn text-xs ${blocoAtivo === "FECHAMENTO" ? "border-indigo-400 bg-indigo-50" : ""}`}
              onClick={() => setBloco(blocoAtivo === "FECHAMENTO" ? null : "FECHAMENTO")}>🌙 Fechamento</button>
          </div>
        </div>

        {q && blocoAtivo && <DayBlocks bloco={blocoAtivo} q={q} />}

        {SECTIONS.map((s) => {
          const list = items.map((it, i) => ({ it, i })).filter(({ it }) => (it.kind === "sla" ? s.id === "sla" : it.section === s.id));
          return (
            <section key={s.id}>
              <h2 className="section-title">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[11px] text-white">{s.n}</span>
                {s.title}
                <span className="rounded-full bg-slate-200 px-2 text-xs text-slate-600">{list.length}</span>
              </h2>
              {list.length === 0 ? (
                <Empty>{q ? s.empty : "Carregando..."}</Empty>
              ) : (
                <ul className="space-y-1.5">
                  {list.map(({ it, i }) => (
                    <li key={it.key} id={`qi-${i}`}>
                      <Link href={it.href}
                        className={`flex items-center gap-3 rounded-lg border bg-white px-3 py-2 hover:border-indigo-300 hover:shadow-sm ${sel === i ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-200"}`}
                        onMouseEnter={() => setSel(i)}>
                        {it.kind === "sla" ? <SlaRow lead={it.lead} /> : <TaskRow t={it.task} section={it.section} />}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <aside className="space-y-4">
        <div className="card">
          <h3 className="section-title">Reuniões de hoje</h3>
          {!q?.reunioesHoje.length ? <Empty>Nenhuma reunião hoje.</Empty> : (
            <ul className="space-y-1.5 text-sm">
              {q.reunioesHoje.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{fmtTime(m.scheduledAt)}</span>
                  <Link href={`/leads/${m.leadId}`} className="truncate hover:underline">{m.lead?.nome}</Link>
                  <span className="ml-auto"><StatusTag status={m.status} meeting /></span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/reunioes" className="mt-2 block text-xs text-indigo-700 hover:underline">Ver todas →</Link>
        </div>
        {!!sla?.aguardandoExpediente.length && (
          <div className="card">
            <h3 className="section-title">Chegaram fora do horário</h3>
            <p className="mb-2 text-xs text-slate-500">O SLA começa a contar na abertura do expediente.</p>
            <ul className="space-y-1 text-sm">
              {sla.aguardandoExpediente.map((l) => (
                <li key={l.id}><Link className="hover:underline" href={`/leads/${l.id}`}>{l.nome}</Link> <span className="text-xs text-slate-400">{fmtDate(l.createdAt)} {fmtTime(l.createdAt)}</span></li>
              ))}
            </ul>
          </div>
        )}
        <div className="card text-xs text-slate-500">
          <b className="text-slate-700">Dica:</b> use <span className="kbd">J</span>/<span className="kbd">K</span> para navegar, <span className="kbd">Enter</span> para abrir e <span className="kbd">?</span> para ver todos os atalhos.
        </div>
      </aside>
    </div>
  );
}

function SlaRow({ lead }: { lead: SlaLead }) {
  return (
    <>
      <Countdown deadline={lead.deadline} />
      <div className="min-w-0">
        <div className="font-semibold">{lead.nome}</div>
        <div className="truncate text-xs text-slate-500">
          {lead.interesse ?? "—"} · {lead.origem ?? "sem origem"} · entrou {fmtTime(lead.createdAt)}
          {lead.foraDoHorario && " (fora do horário)"}
        </div>
      </div>
      <span className="ml-auto text-sm font-semibold text-rose-600">📞 Ligar agora</span>
    </>
  );
}

function TaskRow({ t, section }: { t: QueueTask; section: string }) {
  const due = new Date(t.dueAt);
  const when = section === "atrasados" ? `${fmtDate(due)} ${fmtTime(due)}` : t.disponivel ? `desde ${fmtTime(due)}` : `às ${fmtTime(due)}`;
  return (
    <>
      <CanalTag canal={t.canal} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{t.lead.nome}</span>
          <Score value={t.lead.score} />
        </div>
        <div className="truncate text-xs text-slate-500">
          {t.titulo}
          {t.meeting && ` · reunião ${sameDay(new Date(t.meeting.scheduledAt), new Date()) ? "hoje" : fmtDate(t.meeting.scheduledAt)} ${fmtTime(t.meeting.scheduledAt)}`}
          {" · lead de "}{fmtDate(t.lead.createdAt)}
        </div>
      </div>
      <span className={`ml-auto whitespace-nowrap text-xs ${section === "atrasados" ? "font-semibold text-rose-600" : t.disponivel ? "text-emerald-700" : "text-slate-400"}`}>
        {when}
      </span>
    </>
  );
}
