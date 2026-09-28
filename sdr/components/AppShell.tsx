"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { enableAlerts, notificationsEnabled, notify, soundNewLead, soundWarning, unlockAudio } from "./alerts";
import { SlaBanner } from "./SlaBanner";
import { QuickLeadModal } from "./QuickLeadModal";
import { ShortcutsHelp } from "./ShortcutsHelp";
import type { SlaData } from "./types";
import { usePoll } from "./usePoll";

const SlaCtx = createContext<SlaData | null>(null);
export const useSla = () => useContext(SlaCtx);

/** true quando o foco está num campo de texto (atalhos ficam desligados). */
export function typing(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
}

const NAV = [
  { href: "/", label: "Plantão", key: "Q" },
  { href: "/leads", label: "Leads", key: "L" },
  { href: "/reunioes", label: "Reuniões", key: "R" },
  { href: "/dashboard", label: "Dashboard", key: "D" },
  { href: "/config", label: "Configurações", key: "" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: sla } = usePoll<SlaData>("/api/sla", 4000);
  const path = usePathname();
  const router = useRouter();
  const [novo, setNovo] = useState(false);
  const [help, setHelp] = useState(false);
  const [alertsOn, setAlertsOn] = useState(false);

  // --- Alertas: lead novo e "falta 1 minuto"
  const seen = useRef<Set<number> | null>(null);
  const warned = useRef<Set<number>>(new Set());
  useEffect(() => setAlertsOn(notificationsEnabled()), []);
  useEffect(() => {
    if (!sla) return;
    const ids = sla.leads.map((l) => l.id);
    if (seen.current === null) {
      seen.current = new Set(ids);
      return;
    }
    const novos = sla.leads.filter((l) => !seen.current!.has(l.id));
    for (const l of novos) {
      seen.current.add(l.id);
      notify("🚨 Lead novo!", `${l.nome}${l.interesse ? ` · ${l.interesse}` : ""} — você tem ${sla.slaMinutos} min`, `/leads/${l.id}`);
    }
    if (novos.length) soundNewLead();
  }, [sla]);
  useEffect(() => {
    const id = setInterval(() => {
      if (!sla) return;
      for (const l of sla.leads) {
        const left = new Date(l.deadline).getTime() - Date.now();
        if (left > 0 && left <= 60_000 && !warned.current.has(l.id)) {
          warned.current.add(l.id);
          soundWarning();
          notify("⏱️ Falta 1 minuto", `${l.nome} está quase estourando o SLA`, `/leads/${l.id}`);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [sla]);

  // --- Atalhos globais
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      unlockAudio();
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("[data-modal]")) return;
      const k = e.key.toLowerCase();
      if (k === "n") { e.preventDefault(); setNovo(true); }
      else if (e.key === "?") setHelp(true);
      else if (k === "q") router.push("/");
      else if (k === "l") router.push("/leads");
      else if (k === "r") router.push("/reunioes");
      else if (k === "d") router.push("/dashboard");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const p = sla?.progresso;
  const pct = p ? Math.min(100, (p.agendadasHoje / Math.max(1, p.meta)) * 100) : 0;

  return (
    <SlaCtx.Provider value={sla}>
      <div className="min-h-screen" onClick={unlockAudio}>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
            <Link href="/" className="text-base font-bold text-indigo-700">⚡ SDR Plantão</Link>
            <nav className="flex flex-wrap gap-1">
              {NAV.map((n) => {
                const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
                return (
                  <Link key={n.href} href={n.href}
                    className={`rounded-md px-2.5 py-1 text-sm ${active ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              {p && (
                <Link href="/dashboard" className="flex items-center gap-2 text-sm" title="Reuniões agendadas hoje">
                  <span className="font-semibold">{p.agendadasHoje}/{p.meta}</span>
                  <span className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                    <span className={`block h-full ${pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                  </span>
                </Link>
              )}
              {!alertsOn && (
                <button className="btn text-xs" onClick={async () => setAlertsOn(await enableAlerts())} title="Ativa som e notificações do navegador">
                  🔔 Ativar alertas
                </button>
              )}
              <button className="btn-primary text-xs" onClick={() => setNovo(true)}>+ Lead <span className="kbd bg-indigo-500 text-indigo-50">N</span></button>
              <button className="btn px-2 text-xs" onClick={() => setHelp(true)} title="Atalhos">?</button>
            </div>
          </div>
          <SlaBanner sla={sla} />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-4">{children}</main>
      </div>
      {novo && <QuickLeadModal onClose={() => setNovo(false)} />}
      {help && <ShortcutsHelp onClose={() => setHelp(false)} />}
    </SlaCtx.Provider>
  );
}
