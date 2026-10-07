"use client";

import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface LeadOpcao {
  id: string;
  nome: string;
  empresa: string | null;
}

/**
 * Busca um lead existente pelo nome/empresa. Se `permitirNovo`, o texto digitado
 * sem selecionar ninguém vira o nome de um lead novo.
 */
export function LeadPicker({
  leads,
  leadId,
  onSelecionar,
  texto,
  onTexto,
  permitirNovo = false,
  autoFocus,
}: {
  leads: LeadOpcao[];
  leadId: string | null;
  onSelecionar: (id: string | null) => void;
  texto: string;
  onTexto: (t: string) => void;
  permitirNovo?: boolean;
  autoFocus?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const selecionado = leads.find((l) => l.id === leadId) ?? null;

  const sugestoes = useMemo(() => {
    const q = texto.trim().toLowerCase();
    const lista = q
      ? leads.filter((l) => l.nome.toLowerCase().includes(q) || l.empresa?.toLowerCase().includes(q))
      : leads;
    return lista.slice(0, 6);
  }, [leads, texto]);

  if (selecionado) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-accent px-3 py-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{selecionado.nome}</div>
          {selecionado.empresa && <div className="truncate text-xs text-muted-foreground">{selecionado.empresa}</div>}
        </div>
        <button
          type="button"
          className="text-sm text-accent-foreground underline-offset-2 hover:underline"
          onClick={() => {
            onSelecionar(null);
            onTexto("");
          }}
        >
          trocar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        value={texto}
        autoFocus={autoFocus}
        placeholder={permitirNovo ? "Buscar lead ou digitar nome de um novo" : "Buscar lead (opcional)"}
        onChange={(e) => {
          onTexto(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        aria-autocomplete="list"
      />
      {aberto && (sugestoes.length > 0 || (permitirNovo && texto.trim())) && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-card p-1 shadow-lg">
          {sugestoes.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                className="flex w-full items-center rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelecionar(l.id);
                  setAberto(false);
                }}
              >
                <span className="truncate">
                  {l.nome}
                  {l.empresa && <span className="text-muted-foreground"> · {l.empresa}</span>}
                </span>
              </button>
            </li>
          ))}
          {permitirNovo && texto.trim() && (
            <li className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
              <UserPlus className="size-4" /> Novo lead: <strong className="text-foreground">{texto.trim()}</strong>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
