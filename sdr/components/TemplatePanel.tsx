"use client";
import { useEffect, useMemo, useState } from "react";
import { typing } from "./AppShell";
import type { LeadFull, Template } from "./types";
import { mailtoLink, render, waLink, type TemplateVars } from "@/lib/templates";

/** Templates de WhatsApp/e-mail com variáveis preenchidas, copiar, wa.me e mailto. */
export function TemplatePanel({ lead, templates, vars, preferId }: { lead: LeadFull; templates: Template[]; vars: TemplateVars; preferId?: number | null }) {
  const [id, setId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setId(preferId ?? templates.find((t) => t.canal === "WHATSAPP")?.id ?? templates[0]?.id ?? null);
  }, [preferId, templates]);

  const tpl = templates.find((t) => t.id === id) ?? null;
  const [texto, setTexto] = useState("");
  const assunto = tpl?.assunto ? render(tpl.assunto, vars) : "";
  const rendered = useMemo(() => (tpl ? render(tpl.corpo, vars) : ""), [tpl, vars]);
  useEffect(() => setTexto(rendered), [rendered]);

  const wa = waLink(lead.telefone, texto);
  const mail = mailtoLink(lead.email, assunto, texto);

  async function copy() {
    await navigator.clipboard.writeText(tpl?.canal === "EMAIL" && assunto ? `${assunto}\n\n${texto}` : texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || document.querySelector("[data-modal]")) return;
      const k = e.key.toLowerCase();
      if (k === "c") copy();
      else if (k === "w" && wa) window.open(wa, "_blank");
      else if (k === "e" && mail) window.location.href = mail;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="card space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="section-title mb-0">Mensagem</h3>
        <select className="input ml-auto w-auto py-1 text-xs" value={id ?? ""} onChange={(e) => setId(Number(e.target.value))}>
          {["WHATSAPP", "EMAIL"].map((c) => (
            <optgroup key={c} label={c === "WHATSAPP" ? "WhatsApp" : "E-mail"}>
              {templates.filter((t) => t.canal === c).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      {tpl?.canal === "EMAIL" && <div className="rounded bg-slate-50 px-2 py-1 text-xs"><b>Assunto:</b> {assunto}</div>}
      <textarea className="input min-h-40 text-sm" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={copy}>{copied ? "✔ Copiado" : "📋 Copiar"} <span className="kbd">C</span></button>
        {wa ? (
          <a className="btn-green" href={wa} target="_blank" rel="noreferrer">💬 Abrir WhatsApp <span className="kbd bg-emerald-500 text-emerald-50">W</span></a>
        ) : <span className="text-xs text-slate-400">Telefone inválido para WhatsApp</span>}
        {mail && <a className="btn" href={mail}>✉️ Abrir e-mail <span className="kbd">E</span></a>}
      </div>
    </div>
  );
}
