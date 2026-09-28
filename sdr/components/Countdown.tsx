"use client";
import { useNow } from "./usePoll";

export function slaColor(leftMs: number) {
  if (leftMs <= 0) return "red";
  if (leftMs <= 120_000) return "yellow";
  return "green";
}

export function fmtClock(ms: number) {
  const s = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(s / 60);
  const txt = `${m}:${String(s % 60).padStart(2, "0")}`;
  return ms < 0 ? `+${txt}` : txt;
}

export function Countdown({ deadline, className = "" }: { deadline: string; className?: string }) {
  const now = useNow();
  const left = new Date(deadline).getTime() - now;
  const c = slaColor(left);
  const color = c === "green" ? "bg-emerald-500" : c === "yellow" ? "bg-amber-400 text-amber-950" : "bg-rose-600 animate-pulse";
  return (
    <span className={`rounded-md px-2 py-0.5 font-mono text-lg font-bold tabular-nums text-white ${color} ${className}`}>
      {fmtClock(left)}
    </span>
  );
}
