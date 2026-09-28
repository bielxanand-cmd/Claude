"use client";
import { useState } from "react";
import { api } from "./api";
import { Modal } from "./Modal";
import { SlotPicker } from "./SlotPicker";
import type { Meeting } from "./types";
import { refreshAll } from "./usePoll";

/** Botões de status da reunião: confirmar, realizada, no-show, reagendar, cancelar. */
export function MeetingActions({ m, onDone, compact }: { m: Meeting; onDone?: () => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [reagendar, setReagendar] = useState(false);
  const past = new Date(m.scheduledAt).getTime() < Date.now();

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await api(`/api/meetings/${m.id}`, { method: "PATCH", body });
      refreshAll();
      onDone?.();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const cls = compact ? "btn px-2 py-1 text-xs" : "btn text-xs";
  const aberta = m.status === "AGENDADA" || m.status === "CONFIRMADA";
  return (
    <div className="flex flex-wrap gap-1">
      {m.status === "AGENDADA" && <button className={cls} disabled={busy} onClick={() => patch({ status: "CONFIRMADA" })}>✔ Confirmada</button>}
      {(aberta || m.status === "NO_SHOW") && (past || m.status === "NO_SHOW") && (
        <button className={`${cls} border-emerald-300 text-emerald-700`} disabled={busy} onClick={() => patch({ status: "REALIZADA" })}>🎯 Aconteceu</button>
      )}
      {aberta && past && <button className={`${cls} border-rose-300 text-rose-700`} disabled={busy} onClick={() => patch({ status: "NO_SHOW" })}>👻 No-show</button>}
      {m.status !== "REALIZADA" && <button className={cls} disabled={busy} onClick={() => setReagendar(true)}>↻ Reagendar</button>}
      {aberta && <button className={`${cls} text-slate-500`} disabled={busy} onClick={() => confirm("Cancelar esta reunião?") && patch({ status: "CANCELADA" })}>Cancelar</button>}
      {reagendar && (
        <Modal title="Reagendar reunião" onClose={() => setReagendar(false)}>
          <SlotPicker onPick={(d) => { setReagendar(false); patch({ scheduledAt: d.toISOString() }); }} />
        </Modal>
      )}
    </div>
  );
}
