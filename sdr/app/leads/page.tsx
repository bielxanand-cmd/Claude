"use client";
import Link from "next/link";
import Papa from "papaparse";
import { useState } from "react";
import { api } from "@/components/api";
import { Modal } from "@/components/Modal";
import type { LeadLite } from "@/components/types";
import { Empty, Score, StatusTag } from "@/components/ui";
import { refreshAll, usePoll } from "@/components/usePoll";
import { STATUS_LABEL } from "@/lib/constants";
import { fmtDate, fmtDuration, fmtTime } from "@/lib/time";

type Row = LeadLite & { speedToLeadSec: number | null; _count: { attempts: number } };

export default function Leads() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [imp, setImp] = useState(false);
  const url = `/api/leads?q=${encodeURIComponent(q)}&status=${status}`;
  const { data } = usePoll<Row[]>(url, 10000);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">Leads</h1>
        <input className="input ml-4 w-64" placeholder="Buscar nome, telefone ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn ml-auto" onClick={() => setImp(true)}>⬆ Importar CSV</button>
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <p className="p-4 text-slate-400">Carregando...</p> : data.length === 0 ? <div className="p-4"><Empty>Nenhum lead.</Empty></div> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Nome</th><th className="px-3 py-2">Contato</th><th className="px-3 py-2">Origem / interesse</th>
                <th className="px-3 py-2">Entrada</th><th className="px-3 py-2">1º contato</th><th className="px-3 py-2">Tent.</th><th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2"><Link href={`/leads/${l.id}`} className="font-medium hover:underline">{l.nome}</Link> <Score value={l.score} /></td>
                  <td className="px-3 py-2 text-xs text-slate-600">{l.telefone}<br />{l.email}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{l.origem}<br />{l.interesse}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{fmtDate(l.createdAt)} {fmtTime(l.createdAt)}</td>
                  <td className="px-3 py-2 text-xs">{fmtDuration(l.speedToLeadSec)}</td>
                  <td className="px-3 py-2 text-center">{l._count.attempts}</td>
                  <td className="px-3 py-2"><StatusTag status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {imp && <ImportModal onClose={() => setImp(false)} />}
    </div>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onFile(f: File) {
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (r) => setRows(r.data),
      error: (e) => setMsg(e.message),
    });
  }

  async function send() {
    if (!rows) return;
    setBusy(true);
    try {
      const r = await api<{ importados: number; linhasComErro: number[] }>("/api/leads/import", { method: "POST", body: { rows } });
      setMsg(`${r.importados} leads importados.${r.linhasComErro.length ? ` Linhas ignoradas (sem nome/telefone/e-mail): ${r.linhasComErro.join(", ")}` : ""}`);
      setRows(null);
      refreshAll();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Importar leads por CSV" onClose={onClose} wide>
      <p className="mb-2 text-sm text-slate-600">
        Primeira linha com cabeçalho. Colunas reconhecidas: <code>nome, telefone, email, origem, interesse, observacao</code> (também em inglês: <code>name, phone, email, source…</code>).
        Opcional: <code>data</code> (data/hora da inscrição, ex.: <code>2026-09-28T10:15:00-03:00</code>); sem ela, vale o horário da importação.
      </p>
      <p className="mb-3 text-xs text-slate-500">Leads importados entram como “Novo” e aparecem no topo com o cronômetro de SLA.</p>
      <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="text-sm" />
      {rows && (
        <div className="mt-3">
          <p className="mb-1 text-sm"><b>{rows.length}</b> linhas encontradas. Prévia:</p>
          <pre className="max-h-40 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(rows.slice(0, 3), null, 2)}</pre>
          <button className="btn-primary mt-2" disabled={busy} onClick={send}>Importar {rows.length} leads</button>
        </div>
      )}
      {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
      <a className="mt-3 block text-xs text-indigo-700 underline" href="/exemplo-leads.csv" download>Baixar CSV de exemplo</a>
    </Modal>
  );
}
