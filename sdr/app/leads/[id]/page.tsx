"use client";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { typing, useSla } from "@/components/AppShell";
import { api } from "@/components/api";
import { Countdown } from "@/components/Countdown";
import { MeetingActions } from "@/components/MeetingActions";
import { Modal } from "@/components/Modal";
import { SlotPicker } from "@/components/SlotPicker";
import { TemplatePanel } from "@/components/TemplatePanel";
import type { ConfigData, LeadFull, Slots, Task } from "@/components/types";
import { CanalTag, Score, StatusTag } from "@/components/ui";
import { refreshAll, usePoll } from "@/components/usePoll";
import { CANAL_ICON, CANAL_LABEL, CANAIS, RESULTADO_LABEL, STATUS_FECHADOS, type Canal, type Resultado } from "@/lib/constants";
import { primeiroNome, render } from "@/lib/templates";
import { addMinutes, atMinutes, fmtDate, fmtDateTime, fmtDuration, fmtSlot, fmtTime, fromInputValue, hm, nextBusinessDay, toInputValue } from "@/lib/time";

const BOTOES: { r: Resultado; key: string; cls: string }[] = [
  { r: "NAO_ATENDEU", key: "1", cls: "btn" },
  { r: "AGENDOU", key: "2", cls: "btn-green" },
  { r: "RETORNAR", key: "3", cls: "btn border-violet-300 text-violet-700 hover:bg-violet-50" },
  { r: "DESQUALIFICADO", key: "4", cls: "btn-red" },
  { r: "NUMERO_INVALIDO", key: "5", cls: "btn-red" },
  { r: "ENVIADO", key: "6", cls: "btn border-sky-300 text-sky-700 hover:bg-sky-50" },
];

type Resposta = { ok: boolean; txt: string };

export default function LeadPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const taskIdParam = search.get("task") ? Number(search.get("task")) : null;
  const { data: lead, reload } = usePoll<LeadFull>(`/api/leads/${id}`, 0);
  const { data: cfg } = usePoll<ConfigData>("/api/config", 0);
  const { data: slots } = usePoll<Slots>("/api/slots", 60000);
  const sla = useSla();

  const task: Task | null = useMemo(() => {
    if (!lead) return null;
    const pend = lead.tasks.filter((t) => t.status === "PENDENTE");
    return pend.find((t) => t.id === taskIdParam) ?? null;
  }, [lead, taskIdParam]);

  const [canal, setCanal] = useState<Canal>("LIGACAO");
  const [nota, setNota] = useState("");
  const [modal, setModal] = useState<null | "AGENDOU" | "RETORNAR" | "EDIT">(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Resposta[]>([]);

  useEffect(() => { if (task) setCanal(task.canal as Canal); }, [task]);
  useEffect(() => {
    if (!lead) return;
    try {
      const r = lead.respostas ? (JSON.parse(lead.respostas) as Resposta[]) : [];
      setRespostas([0, 1, 2].map((i) => r[i] ?? { ok: false, txt: "" }));
    } catch {
      setRespostas([0, 1, 2].map(() => ({ ok: false, txt: "" })));
    }
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = cfg?.settings;
  const proxReuniao = lead?.meetings.find((m) => ["AGENDADA", "CONFIRMADA"].includes(m.status));
  const vars = useMemo(() => ({
    nome: lead ? primeiroNome(lead.nome) : "",
    interesse: lead?.interesse ?? "nossa solução",
    horario1: slots?.horario1 ? fmtSlot(slots.horario1) : null,
    horario2: slots?.horario2 ? fmtSlot(slots.horario2) : null,
    sdr: s?.nomeSdr, empresa: s?.empresa, produto: s?.produto,
    reuniao: proxReuniao ? fmtSlot(proxReuniao.scheduledAt) : null,
  }), [lead, slots, s, proxReuniao]);

  async function saveRespostas(r: Resposta[]) {
    setRespostas(r);
    await api(`/api/leads/${id}`, { method: "PATCH", body: { respostas: r, score: r.filter((x) => x.ok).length } });
    reload();
  }

  async function registrar(resultado: Resultado, extra: { scheduledAt?: Date; retornoAt?: Date } = {}) {
    if (resultado === "AGENDOU" && !extra.scheduledAt) return setModal("AGENDOU");
    if (resultado === "RETORNAR" && !extra.retornoAt) return setModal("RETORNAR");
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/leads/${id}/attempts`, {
        method: "POST",
        body: { canal, resultado, nota, taskId: task?.id, scheduledAt: extra.scheduledAt?.toISOString(), retornoAt: extra.retornoAt?.toISOString() },
      });
      refreshAll();
      setModal(null);
      setNota("");
      // Se a cadência pede uma ação imediata (ex.: WhatsApp logo após a ligação), continua neste lead.
      const fresh = await api<LeadFull>(`/api/leads/${id}`);
      const now = Date.now() + 5 * 60_000;
      const imediata = fresh.tasks.find((t) => t.status === "PENDENTE" && new Date(t.dueAt).getTime() <= now);
      if (imediata) router.replace(`/leads/${id}?task=${imediata.id}`);
      else router.push("/");
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("[data-modal]") || busy) return;
      const b = BOTOES.find((x) => x.key === e.key);
      if (b) { e.preventDefault(); registrar(b.r); }
      else if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!lead || !cfg || !s) return <p className="text-slate-400">Carregando...</p>;

  const slaLead = sla?.leads.find((l) => l.id === lead.id);
  const fechado = STATUS_FECHADOS.includes(lead.status);
  const pendentes = lead.tasks.filter((t) => t.status === "PENDENTE");
  const perguntas = [s.pergunta1, s.pergunta2, s.pergunta3];
  const templateId = task?.templateId ?? (canal === "EMAIL" ? cfg.templates.find((t) => t.canal === "EMAIL")?.id : null);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">← Fila <span className="kbd">Esc</span></Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{lead.nome}</h1>
            <StatusTag status={lead.status} />
            <Score value={lead.score} />
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-slate-600">
            {lead.telefone && <a href={`tel:${lead.telefone.replace(/[^\d+]/g, "")}`} className="font-mono hover:underline">📞 {lead.telefone}</a>}
            {lead.email && <span>✉️ {lead.email}</span>}
            <span>🏷️ {lead.origem ?? "—"}</span>
            <span>🎯 {lead.interesse ?? "—"}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
          {slaLead && <div className="text-center"><div className="text-xs text-slate-500">SLA</div><Countdown deadline={slaLead.deadline} /></div>}
          <div className="text-right text-xs text-slate-500">
            Entrou {fmtDateTime(lead.createdAt)}{lead.foraDoHorario && " (fora do horário)"}<br />
            1º contato: <b className="text-slate-700">{lead.firstContactAt ? fmtDuration(lead.speedToLeadSec) : "ainda não"}</b>
          </div>
          <button className="btn text-xs" onClick={() => setModal("EDIT")}>Editar</button>
        </div>
        {lead.observacao && <p className="w-full rounded bg-amber-50 px-2 py-1 text-sm text-amber-900">📝 {lead.observacao}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          {/* Registro de resultado */}
          <div className="card space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="section-title mb-0">Registrar tentativa</h3>
              {task && <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">Tarefa: {task.titulo}</span>}
              <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-300">
                {CANAIS.map((c) => (
                  <button key={c} onClick={() => setCanal(c)}
                    className={`px-2.5 py-1 text-xs ${canal === c ? "bg-slate-800 text-white" : "bg-white hover:bg-slate-50"}`}>
                    {CANAL_ICON[c]} {CANAL_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BOTOES.map((b) => (
                <button key={b.r} className={`${b.cls} justify-start py-2`} disabled={busy} onClick={() => registrar(b.r)}>
                  <span className="kbd">{b.key}</span> {RESULTADO_LABEL[b.r]}
                </button>
              ))}
            </div>
            <input className="input" placeholder="Anotação (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
            {err && <p className="text-sm text-rose-600">{err}</p>}
            {fechado && <p className="text-xs text-slate-500">Este lead está “{lead.status.toLowerCase()}”. Registrar uma tentativa não reabre a cadência automaticamente.</p>}
          </div>

          {/* Script */}
          <div className="card space-y-3 text-sm">
            <h3 className="section-title mb-0">📜 Script de ligação</h3>
            <div>
              <div className="label">Abertura</div>
              <p className="rounded-lg bg-slate-50 p-2">{render(s.scriptAbertura, vars)}</p>
            </div>
            <div>
              <div className="label">Qualificação (marque ✓ se o lead se encaixa)</div>
              <ol className="space-y-2">
                {perguntas.map((p, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 p-2">
                    <label className="flex items-start gap-2">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-emerald-600" checked={!!respostas[i]?.ok}
                        onChange={(e) => saveRespostas(respostas.map((r, j) => (j === i ? { ...r, ok: e.target.checked } : r)))} />
                      <span><b>{i + 1}.</b> {render(p, vars)}</span>
                    </label>
                    <input className="input mt-1 py-1 text-xs" placeholder="Resposta..." value={respostas[i]?.txt ?? ""}
                      onChange={(e) => setRespostas(respostas.map((r, j) => (j === i ? { ...r, txt: e.target.value } : r)))}
                      onBlur={() => saveRespostas(respostas)} />
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <div className="label">Fechamento — ofereça dois horários</div>
              <p className="rounded-lg bg-emerald-50 p-2 font-medium text-emerald-900">{render(s.scriptFechamento, vars)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {proxReuniao && (
            <div className="card border-emerald-200 bg-emerald-50">
              <h3 className="section-title">📅 Reunião</h3>
              <p className="mb-2 text-sm"><b>{fmtSlot(proxReuniao.scheduledAt)}</b> · <StatusTag status={proxReuniao.status} meeting /></p>
              <MeetingActions m={proxReuniao} onDone={reload} />
            </div>
          )}

          <TemplatePanel lead={lead} templates={cfg.templates} vars={vars} preferId={templateId} />

          <div className="card">
            <h3 className="section-title">Próximas tarefas ({pendentes.length})</h3>
            {pendentes.length === 0 ? <p className="text-sm text-slate-400">Nenhuma.</p> : (
              <ul className="space-y-1 text-sm">
                {pendentes.map((t) => (
                  <li key={t.id} className={`flex items-center gap-2 ${t.id === task?.id ? "font-semibold" : ""}`}>
                    <span className="w-24 shrink-0 font-mono text-xs text-slate-500">{fmtDate(t.dueAt)} {fmtTime(t.dueAt)}</span>
                    <CanalTag canal={t.canal} />
                    <Link href={`/leads/${lead.id}?task=${t.id}`} className="truncate hover:underline">{t.titulo}</Link>
                    <button className="ml-auto text-xs text-slate-400 hover:text-rose-600" title="Pular esta tarefa"
                      onClick={async () => { await api(`/api/tasks/${t.id}`, { method: "PATCH", body: { status: "CANCELADA" } }); reload(); refreshAll(); }}>
                      pular
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Historico lead={lead} />
        </div>
      </div>

      {modal === "AGENDOU" && (
        <Modal title={`Agendar reunião com ${primeiroNome(lead.nome)}`} onClose={() => setModal(null)}>
          <SlotPicker onPick={(d) => registrar("AGENDOU", { scheduledAt: d })} />
        </Modal>
      )}
      {modal === "RETORNAR" && (
        <RetornoModal cfg={s} onClose={() => setModal(null)} onPick={(d) => registrar("RETORNAR", { retornoAt: d })} />
      )}
      {modal === "EDIT" && <EditLead lead={lead} onClose={() => { setModal(null); reload(); }} />}
    </div>
  );
}

function Historico({ lead }: { lead: LeadFull }) {
  type Ev = { at: string; icon: string; text: React.ReactNode };
  const evs: Ev[] = [
    { at: lead.createdAt, icon: "📥", text: <>Lead entrou ({lead.origem ?? "sem origem"})</> },
    ...lead.attempts.map((a) => ({
      at: a.createdAt, icon: CANAL_ICON[a.canal],
      text: <><b>#{a.numero}</b> {CANAL_LABEL[a.canal]} — {RESULTADO_LABEL[a.resultado]}{a.nota && <span className="text-slate-500"> · “{a.nota}”</span>}</>,
    })),
    ...lead.meetings.map((m) => ({
      at: m.bookedAt, icon: "📅",
      text: <>Reunião marcada para {fmtDateTime(m.scheduledAt)} (tentativa {m.attemptNumero}) · <StatusTag status={m.status} meeting /></>,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return (
    <div className="card">
      <h3 className="section-title">Histórico</h3>
      <ul className="space-y-1.5 text-sm">
        {evs.map((e, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-24 shrink-0 font-mono text-xs text-slate-500">{fmtDate(e.at)} {fmtTime(e.at)}</span>
            <span>{e.icon}</span>
            <span>{e.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RetornoModal({ cfg, onPick, onClose }: { cfg: { horaInicio: string; horaFim: string; diasUteis: string }; onPick: (d: Date) => void; onClose: () => void }) {
  const now = new Date();
  const amanha = nextBusinessDay(cfg, now);
  const opts = [
    { label: "Em 30 min", d: addMinutes(now, 30) },
    { label: "Em 1 hora", d: addMinutes(now, 60) },
    { label: "Em 2 horas", d: addMinutes(now, 120) },
    { label: `${fmtDate(amanha)} ${cfg.horaInicio}`, d: atMinutes(amanha, hm(cfg.horaInicio)) },
    { label: `${fmtDate(amanha)} 14:00`, d: atMinutes(amanha, 14 * 60) },
  ];
  const [custom, setCustom] = useState(toInputValue(addMinutes(now, 180)));
  return (
    <Modal title="Retornar quando?" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o, i) => <button key={o.label} className="btn" autoFocus={i === 1} onClick={() => onPick(o.d)}>{o.label}</button>)}
      </div>
      <div className="mt-3 flex items-end gap-2 border-t pt-3">
        <div className="flex-1">
          <label className="label">Data/hora</label>
          <input type="datetime-local" className="input" value={custom} onChange={(e) => setCustom(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => onPick(fromInputValue(custom))}>Salvar</button>
      </div>
    </Modal>
  );
}

function EditLead({ lead, onClose }: { lead: LeadFull; onClose: () => void }) {
  const [f, setF] = useState({
    nome: lead.nome, telefone: lead.telefone ?? "", email: lead.email ?? "", origem: lead.origem ?? "",
    interesse: lead.interesse ?? "", observacao: lead.observacao ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const campos: [keyof typeof f, string][] = [["nome", "Nome"], ["telefone", "Telefone"], ["email", "E-mail"], ["origem", "Origem"], ["interesse", "Interesse"], ["observacao", "Observação"]];
  return (
    <Modal title="Editar lead" onClose={onClose}>
      <form className="space-y-2" onSubmit={async (e) => {
        e.preventDefault();
        try { await api(`/api/leads/${lead.id}`, { method: "PATCH", body: f }); refreshAll(); onClose(); }
        catch (x) { setErr((x as Error).message); }
      }}>
        {campos.map(([k, l]) => (
          <div key={k}>
            <label className="label">{l}</label>
            <input className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </div>
        ))}
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <div className="flex justify-between pt-2">
          <button type="button" className="btn-red text-xs" onClick={async () => {
            if (!confirm("Excluir este lead e todo o histórico?")) return;
            await api(`/api/leads/${lead.id}`, { method: "DELETE" });
            refreshAll();
            window.location.href = "/leads";
          }}>Excluir lead</button>
          <button className="btn-primary">Salvar</button>
        </div>
      </form>
    </Modal>
  );
}
