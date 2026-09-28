"use client";
import Link from "next/link";
import { useState } from "react";
import { Countdown, slaColor } from "./Countdown";
import type { SlaData } from "./types";
import { useNow } from "./usePoll";
import { fmtTime } from "@/lib/time";

export function SlaBanner({ sla }: { sla: SlaData | null }) {
  const now = useNow();
  const [all, setAll] = useState(false);
  if (!sla || sla.leads.length === 0) return null;
  const list = all ? sla.leads : sla.leads.slice(0, 4);
  const anyRed = sla.leads.some((l) => new Date(l.deadline).getTime() <= now);
  return (
    <div className={`border-t ${anyRed ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
          🚨 {sla.leads.length} lead{sla.leads.length > 1 ? "s" : ""} aguardando 1º contato
        </span>
        {list.map((l) => {
          const c = slaColor(new Date(l.deadline).getTime() - now);
          const border = c === "green" ? "border-emerald-300" : c === "yellow" ? "border-amber-300" : "border-rose-400";
          return (
            <Link key={l.id} href={`/leads/${l.id}`}
              className={`flex items-center gap-2 rounded-lg border-2 ${border} bg-white px-2 py-1 shadow-sm hover:shadow`}>
              <Countdown deadline={l.deadline} className="text-sm" />
              <span className="text-sm">
                <b>{l.nome}</b>
                <span className="text-slate-500"> · {l.interesse ?? l.origem ?? "—"} · {fmtTime(l.createdAt)}</span>
              </span>
            </Link>
          );
        })}
        {sla.leads.length > 4 && (
          <button className="text-xs font-medium text-indigo-700 underline" onClick={() => setAll(!all)}>
            {all ? "mostrar menos" : `+${sla.leads.length - 4}`}
          </button>
        )}
      </div>
    </div>
  );
}
