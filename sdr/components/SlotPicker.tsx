"use client";
import { useState } from "react";
import type { Slots } from "./types";
import { usePoll } from "./usePoll";
import { addMinutes, fmtSlot, fmtTime, fromInputValue, toInputValue } from "@/lib/time";

/** Escolha do horário da reunião: sugestões de hoje / próximo dia útil ou data livre. */
export function SlotPicker({ onPick, cta = "Agendar" }: { onPick: (d: Date) => void; cta?: string }) {
  const { data } = usePoll<Slots>("/api/slots", 0);
  const [custom, setCustom] = useState(() => toInputValue(addMinutes(new Date(), 120)));

  const Chips = ({ title, list }: { title: string; list: string[] }) => (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase text-slate-500">{title}</h4>
      {list.length === 0 ? <p className="text-xs text-slate-400">Sem horários livres.</p> : (
        <div className="flex flex-wrap gap-1.5">
          {list.slice(0, 12).map((s) => (
            <button key={s} className="btn px-2 py-1 font-mono text-xs hover:border-indigo-400" onClick={() => onPick(new Date(s))}>{fmtTime(s)}</button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {!data ? <p className="text-sm text-slate-400">Carregando horários...</p> : (
        <>
          {data.horario1 && (
            <div className="flex flex-wrap gap-2">
              {[data.horario1, data.horario2].filter(Boolean).map((h, i) => (
                <button key={h} className="btn-primary" onClick={() => onPick(new Date(h!))} autoFocus={i === 0}>
                  {fmtSlot(h!)}
                </button>
              ))}
            </div>
          )}
          <Chips title="Hoje" list={data.hoje} />
          {data.amanha[0] && <Chips title={fmtSlot(data.amanha[0]).replace(/ às.*/, "")} list={data.amanha} />}
        </>
      )}
      <div className="flex items-end gap-2 border-t pt-3">
        <div className="flex-1">
          <label className="label">Outra data/hora</label>
          <input type="datetime-local" className="input" value={custom} onChange={(e) => setCustom(e.target.value)} />
        </div>
        <button className="btn" onClick={() => custom && onPick(fromInputValue(custom))}>{cta}</button>
      </div>
    </div>
  );
}
