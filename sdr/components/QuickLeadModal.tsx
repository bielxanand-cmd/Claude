"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "./api";
import { Modal } from "./Modal";
import { refreshAll } from "./usePoll";

export function QuickLeadModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({ nome: "", telefone: "", email: "", origem: "Manual", interesse: "", observacao: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent, abrir: boolean) {
    e.preventDefault();
    if (!f.nome.trim()) return setErr("Informe o nome.");
    setBusy(true);
    try {
      const r = await api<{ id: number }>("/api/leads/manual", { method: "POST", body: f });
      refreshAll();
      onClose();
      if (abrir) router.push(`/leads/${r.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Novo lead" onClose={onClose}>
      <form onSubmit={(e) => submit(e, true)} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Nome *</label>
          <input className="input" autoFocus value={f.nome} onChange={set("nome")} />
        </div>
        <div>
          <label className="label">Telefone / WhatsApp</label>
          <input className="input" value={f.telefone} onChange={set("telefone")} placeholder="(11) 91234-5678" />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" value={f.email} onChange={set("email")} />
        </div>
        <div>
          <label className="label">Origem</label>
          <input className="input" value={f.origem} onChange={set("origem")} />
        </div>
        <div>
          <label className="label">Interesse</label>
          <input className="input" value={f.interesse} onChange={set("interesse")} />
        </div>
        <div className="col-span-2">
          <label className="label">Observação</label>
          <textarea className="input" rows={2} value={f.observacao} onChange={set("observacao")} />
        </div>
        {err && <p className="col-span-2 text-sm text-rose-600">{err}</p>}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" className="btn" disabled={busy} onClick={(e) => submit(e, false)}>Salvar</button>
          <button type="submit" className="btn-primary" disabled={busy}>Salvar e atender ↵</button>
        </div>
      </form>
    </Modal>
  );
}
