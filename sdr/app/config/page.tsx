"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/api";
import type { CadenceStep, ConfigData, Settings, Template } from "@/components/types";
import { usePoll } from "@/components/usePoll";
import { CANAL_LABEL, CANAIS } from "@/lib/constants";
import { DIAS } from "@/lib/time";

export default function Config() {
  const { data, reload } = usePoll<ConfigData>("/api/config", 0);
  if (!data) return <p className="text-slate-400">Carregando...</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Configurações</h1>
      <Geral s={data.settings} onSaved={reload} />
      <Cadencia steps={data.cadence} templates={data.templates} onSaved={reload} />
      <Templates templates={data.templates} onSaved={reload} />
      <Webhook s={data.settings} onSaved={reload} />
    </div>
  );
}

function useSaved() {
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };
  return { msg, flash };
}

function Geral({ s, onSaved }: { s: Settings; onSaved: () => void }) {
  const [f, setF] = useState(s);
  const { msg, flash } = useSaved();
  useEffect(() => setF(s), [s]);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF({ ...f, [k]: v });
  const dias = f.diasUteis.split(",").map(Number);

  async function save() {
    try {
      await api("/api/config", { method: "PATCH", body: f });
      flash("✔ Salvo");
      onSaved();
    } catch (e) { flash((e as Error).message); }
  }

  const text = (k: keyof Settings, label: string, rows = 1) => (
    <div>
      <label className="label">{label}</label>
      {rows > 1
        ? <textarea className="input" rows={rows} value={String(f[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
        : <input className="input" value={String(f[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />}
    </div>
  );
  const num = (k: keyof Settings, label: string, pctMode = false) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type="number" min={0} step={pctMode ? 1 : 1}
        value={pctMode ? Math.round(Number(f[k]) * 100) : Number(f[k])}
        onChange={(e) => set(k, (pctMode ? Number(e.target.value) / 100 : Number(e.target.value)) as never)} />
    </div>
  );

  return (
    <section className="card space-y-4">
      <h2 className="font-semibold">Geral</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {text("nomeSdr", "Seu nome ({sdr})")}
        {text("empresa", "Empresa ({empresa})")}
        <div className="sm:col-span-3">{text("produto", "Produto/serviço em 1-2 frases ({produto})", 2)}</div>
        <div>
          <label className="label">Início do expediente</label>
          <input className="input" type="time" value={f.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} />
        </div>
        <div>
          <label className="label">Fim do expediente</label>
          <input className="input" type="time" value={f.horaFim} onChange={(e) => set("horaFim", e.target.value)} />
        </div>
        <div>
          <label className="label">Dias úteis</label>
          <div className="flex gap-1">
            {DIAS.map((d, i) => (
              <button key={d} type="button"
                className={`rounded px-1.5 py-1 text-xs ${dias.includes(i) ? "bg-indigo-600 text-white" : "bg-slate-100"}`}
                onClick={() => set("diasUteis", (dias.includes(i) ? dias.filter((x) => x !== i) : [...dias, i]).sort().join(","))}>{d}</button>
            ))}
          </div>
        </div>
        {num("metaReunioes", "Meta de reuniões por dia")}
        {num("slaMinutos", "SLA do 1º contato (min)")}
        {num("duracaoReuniao", "Duração da reunião (min)")}
      </div>

      <h3 className="pt-2 font-semibold">Script de ligação</h3>
      <p className="text-xs text-slate-500">Variáveis: {"{nome} {interesse} {horario1} {horario2} {sdr} {empresa} {produto}"}</p>
      <div className="grid gap-3">
        {text("scriptAbertura", "Abertura", 2)}
        <div className="grid gap-3 sm:grid-cols-3">
          {text("pergunta1", "Pergunta de qualificação 1", 2)}
          {text("pergunta2", "Pergunta de qualificação 2", 2)}
          {text("pergunta3", "Pergunta de qualificação 3", 2)}
        </div>
        {text("scriptFechamento", "Fechamento (ofereça dois horários)", 2)}
      </div>

      <h3 className="pt-2 font-semibold">Metas das taxas (usadas no indicador de gargalo)</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {num("metaContato", "Taxa de contato mínima (%)", true)}
        {num("metaAgendamento", "Taxa de agendamento mínima (%)", true)}
        {num("metaNoShow", "Taxa de no-show máxima (%)", true)}
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save}>Salvar</button>
        {msg && <span className="text-sm text-emerald-700">{msg}</span>}
      </div>
    </section>
  );
}

type Draft = { dia: number; canal: string; titulo: string; templateId: number | null; ativo: boolean };

function Cadencia({ steps, templates, onSaved }: { steps: CadenceStep[]; templates: Template[]; onSaved: () => void }) {
  const toDraft = (s: CadenceStep[]): Draft[] => s.map(({ dia, canal, titulo, templateId, ativo }) => ({ dia, canal, titulo, templateId, ativo }));
  const [list, setList] = useState<Draft[]>(toDraft(steps));
  const { msg, flash } = useSaved();
  useEffect(() => setList(toDraft(steps)), [steps]);
  const upd = (i: number, p: Partial<Draft>) => setList(list.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const n = [...list];
    [n[i], n[j]] = [n[j], n[i]];
    setList(n);
  };

  async function save() {
    try {
      await api("/api/cadence", { method: "PUT", body: { steps: list } });
      flash("✔ Cadência salva");
      onSaved();
    } catch (e) { flash((e as Error).message); }
  }

  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">Cadência</h2>
      <p className="text-xs text-slate-500">
        O 1º passo é a tentativa inicial (quando o lead entra). Ao registrar essa tentativa sem sucesso, os demais passos viram tarefas.
        D0 = imediato; Dn = n dias úteis depois, no mesmo horário da 1ª tentativa. Mudanças valem para novos leads.
      </p>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-slate-500">
          <tr><th className="w-20">Dia</th><th className="w-36">Canal</th><th>Título</th><th className="w-56">Template</th><th className="w-16">Ativo</th><th className="w-24" /></tr>
        </thead>
        <tbody>
          {list.map((s, i) => (
            <tr key={i} className={s.ativo ? "" : "opacity-50"}>
              <td className="py-1 pr-2"><div className="flex items-center gap-1">D<input className="input px-1 py-1" type="number" min={0} value={s.dia} onChange={(e) => upd(i, { dia: Number(e.target.value) })} /></div></td>
              <td className="py-1 pr-2">
                <select className="input py-1" value={s.canal} onChange={(e) => upd(i, { canal: e.target.value })}>
                  {CANAIS.map((c) => <option key={c} value={c}>{CANAL_LABEL[c]}</option>)}
                </select>
              </td>
              <td className="py-1 pr-2"><input className="input py-1" value={s.titulo} onChange={(e) => upd(i, { titulo: e.target.value })} /></td>
              <td className="py-1 pr-2">
                <select className="input py-1" value={s.templateId ?? ""} onChange={(e) => upd(i, { templateId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  {templates.filter((t) => t.canal === s.canal).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </td>
              <td className="py-1 text-center"><input type="checkbox" className="accent-indigo-600" checked={s.ativo} onChange={(e) => upd(i, { ativo: e.target.checked })} /></td>
              <td className="whitespace-nowrap py-1 text-right">
                <button className="px-1 text-slate-400 hover:text-slate-700" onClick={() => move(i, -1)} title="Subir">↑</button>
                <button className="px-1 text-slate-400 hover:text-slate-700" onClick={() => move(i, 1)} title="Descer">↓</button>
                <button className="px-1 text-slate-400 hover:text-rose-600" onClick={() => setList(list.filter((_, j) => j !== i))} title="Remover">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2">
        <button className="btn" onClick={() => setList([...list, { dia: (list.at(-1)?.dia ?? 0) + 1, canal: "LIGACAO", titulo: "Nova tentativa", templateId: null, ativo: true }])}>+ Passo</button>
        <button className="btn-primary" onClick={save}>Salvar cadência</button>
        {msg && <span className="text-sm text-emerald-700">{msg}</span>}
      </div>
    </section>
  );
}

function Templates({ templates, onSaved }: { templates: Template[]; onSaved: () => void }) {
  const [edit, setEdit] = useState<Partial<Template> | null>(null);
  const { msg, flash } = useSaved();

  async function save() {
    if (!edit) return;
    try {
      if (edit.id) await api(`/api/templates/${edit.id}`, { method: "PATCH", body: edit });
      else await api("/api/templates", { method: "POST", body: edit });
      setEdit(null);
      flash("✔ Template salvo");
      onSaved();
    } catch (e) { flash((e as Error).message); }
  }

  return (
    <section className="card space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Templates de mensagem</h2>
        <button className="btn ml-auto text-xs" onClick={() => setEdit({ canal: "WHATSAPP", nome: "", corpo: "" })}>+ Template</button>
        {msg && <span className="text-sm text-emerald-700">{msg}</span>}
      </div>
      <p className="text-xs text-slate-500">Variáveis: {"{nome} {interesse} {horario1} {horario2} {sdr} {empresa} {produto} {reuniao}"}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <div key={t.id} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 flex items-center gap-2 text-sm">
              <b>{t.nome}</b><span className="text-xs text-slate-500">{CANAL_LABEL[t.canal]}</span>
              <button className="ml-auto text-xs text-indigo-700 hover:underline" onClick={() => setEdit(t)}>editar</button>
              <button className="text-xs text-slate-400 hover:text-rose-600" onClick={async () => { if (confirm("Excluir template?")) { await api(`/api/templates/${t.id}`, { method: "DELETE" }); onSaved(); } }}>excluir</button>
            </div>
            {t.assunto && <p className="text-xs text-slate-500">Assunto: {t.assunto}</p>}
            <p className="line-clamp-3 whitespace-pre-line text-xs text-slate-600">{t.corpo}</p>
          </div>
        ))}
      </div>
      {edit && (
        <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="input" value={edit.canal} onChange={(e) => setEdit({ ...edit, canal: e.target.value })}>
              <option value="WHATSAPP">WhatsApp</option><option value="EMAIL">E-mail</option>
            </select>
            <input className="input sm:col-span-2" placeholder="Nome do template" value={edit.nome ?? ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} />
          </div>
          {edit.canal === "EMAIL" && <input className="input" placeholder="Assunto" value={edit.assunto ?? ""} onChange={(e) => setEdit({ ...edit, assunto: e.target.value })} />}
          <textarea className="input" rows={6} value={edit.corpo ?? ""} onChange={(e) => setEdit({ ...edit, corpo: e.target.value })} />
          <div className="flex gap-2"><button className="btn-primary" onClick={save}>Salvar</button><button className="btn" onClick={() => setEdit(null)}>Cancelar</button></div>
        </div>
      )}
    </section>
  );
}

function Webhook({ s, onSaved }: { s: Settings; onSaved: () => void }) {
  const [token, setToken] = useState(s.webhookToken ?? "");
  const { msg, flash } = useSaved();
  const [origin, setOrigin] = useState("http://localhost:3000");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/leads`;
  const curl = `curl -X POST ${url} \\\n  -H "Content-Type: application/json" \\\n${token ? `  -H "x-webhook-token: ${token}" \\\n` : ""}  -d '{"nome":"Teste Webhook","telefone":"11999998888","email":"teste@exemplo.com","origem":"Site","interesse":"Diagnóstico"}'`;
  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">Webhook</h2>
      <p className="text-sm">Envie um <code>POST</code> para <code className="rounded bg-slate-100 px-1">{url}</code> com JSON ou form-data. Veja o README para conectar seu formulário.</p>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="label">Token (opcional — se preenchido, o webhook exige o header x-webhook-token ou ?token=)</label>
          <input className="input font-mono" value={token} onChange={(e) => setToken(e.target.value)} placeholder="sem token" />
        </div>
        <button className="btn" onClick={() => setToken(crypto.randomUUID().replace(/-/g, ""))}>Gerar</button>
        <button className="btn-primary" onClick={async () => { await api("/api/config", { method: "PATCH", body: { webhookToken: token } }); flash("✔ Salvo"); onSaved(); }}>Salvar</button>
      </div>
      {msg && <span className="text-sm text-emerald-700">{msg}</span>}
      <div>
        <label className="label">Teste pelo terminal</label>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{curl}</pre>
      </div>
    </section>
  );
}
