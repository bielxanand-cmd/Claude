"use client";
import { CANAL_ICON, CANAL_LABEL, MEETING_LABEL, STATUS_LABEL } from "@/lib/constants";

export function Score({ value }: { value: number }) {
  return (
    <span className="text-xs text-amber-500" title={`Qualificação ${value}/3`}>
      {"★".repeat(value)}<span className="text-slate-300">{"★".repeat(3 - value)}</span>
    </span>
  );
}

export function CanalTag({ canal }: { canal: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
      {CANAL_ICON[canal]} {CANAL_LABEL[canal] ?? canal}
    </span>
  );
}

const STATUS_COLOR: Record<string, string> = {
  NOVO: "bg-rose-100 text-rose-700",
  EM_CADENCIA: "bg-sky-100 text-sky-700",
  CONVERSANDO: "bg-violet-100 text-violet-700",
  AGENDADO: "bg-emerald-100 text-emerald-700",
  DESQUALIFICADO: "bg-slate-200 text-slate-600",
  INVALIDO: "bg-slate-200 text-slate-600",
  ENCERRADO: "bg-slate-200 text-slate-600",
  AGENDADA: "bg-sky-100 text-sky-700",
  CONFIRMADA: "bg-emerald-100 text-emerald-700",
  REALIZADA: "bg-emerald-600 text-white",
  NO_SHOW: "bg-rose-100 text-rose-700",
  CANCELADA: "bg-slate-200 text-slate-600",
};

export function StatusTag({ status, meeting }: { status: string; meeting?: boolean }) {
  const label = (meeting ? MEETING_LABEL : STATUS_LABEL)[status] ?? status;
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLOR[status] ?? "bg-slate-100"}`}>{label}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-400">{children}</p>;
}

export function pct(v: number | null | undefined, digits = 0) {
  return v == null ? "—" : `${(v * 100).toFixed(digits)}%`;
}
