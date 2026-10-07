"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/input";
import { hoje, paraInputDataHora } from "@/lib/datas";
import { plural, type TipoRegistro } from "@/lib/rotulos";
import { atualizarRegistro, criarRegistro } from "@/server/actions/registros";
import { cn } from "@/lib/utils";

export interface RegistroEdicao {
  id: string;
  tipo: TipoRegistro;
  quantidade: number;
  em: Date;
  dia: string;
}

type Pedido = { tipo: "ligacao" | "agendamento"; editar?: undefined } | { tipo?: undefined; editar: RegistroEdicao };

const Ctx = createContext<{ abrir: (p: Pedido) => void } | null>(null);

export function useRegistroRapido() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRegistroRapido fora do RegistroRapidoProvider");
  return c;
}

export function RegistroRapidoProvider({ children }: { children: React.ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [chave, setChave] = useState(0);

  const abrir = useCallback((p: Pedido) => {
    setPedido(p);
    setChave((k) => k + 1);
  }, []);

  // Atalhos: C = ligações, A = agendamentos (fora de campos de texto).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || pedido) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName))) return;
      const tipo = ({ c: "ligacao", a: "agendamento" } as const)[e.key.toLowerCase() as "c" | "a"];
      if (tipo) {
        e.preventDefault();
        abrir({ tipo });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abrir, pedido]);

  const fechar = () => setPedido(null);
  const inicial: TipoRegistro = pedido?.editar?.tipo ?? (pedido?.tipo === "ligacao" ? "LIGACAO" : "AGENDAMENTO");

  return (
    <Ctx.Provider value={{ abrir }}>
      {children}
      <Dialog open={!!pedido} onOpenChange={(o) => !o && fechar()}>
        {pedido && <FormRegistro key={chave} tipoInicial={inicial} editar={pedido.editar} onFim={fechar} />}
      </Dialog>
    </Ctx.Provider>
  );
}

const TITULOS: Record<TipoRegistro, string> = {
  LIGACAO: "Registrar ligações",
  AGENDAMENTO: "Registrar agendamentos",
  CANCELAMENTO: "Registrar cancelamento",
};

function rotuloEnviar(tipo: TipoRegistro, n: number) {
  if (tipo === "LIGACAO") return `Registrar ${plural(n, "ligação", "ligações")}`;
  if (tipo === "AGENDAMENTO") return `Registrar ${plural(n, "agendamento", "agendamentos")}`;
  return `Registrar ${plural(n, "cancelamento", "cancelamentos")}`;
}

/**
 * Quantidade (padrão 1) e confirmar. Em agendamentos, o alternador "Agendei / Cancelou":
 * um cancelamento desconta do dia em que o agendamento foi feito (padrão: hoje).
 */
function FormRegistro({
  tipoInicial,
  editar,
  onFim,
}: {
  tipoInicial: TipoRegistro;
  editar?: RegistroEdicao;
  onFim: () => void;
}) {
  const [tipo, setTipo] = useState<TipoRegistro>(tipoInicial);
  const [qtd, setQtd] = useState(String(editar?.quantidade ?? 1));
  const [diaAg, setDiaAg] = useState(editar?.tipo === "CANCELAMENTO" ? editar.dia : hoje());
  const [outroHorario, setOutroHorario] = useState(!!editar);
  const [em, setEm] = useState(paraInputDataHora(editar?.em ?? new Date()));
  const [pendente, iniciar] = useTransition();
  const n = Math.max(1, parseInt(qtd) || 1);
  const mudar = (d: number) => setQtd(String(Math.max(1, n + d)));

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const dados = {
      tipo,
      quantidade: parseInt(qtd),
      em: outroHorario ? em : undefined,
      diaAgendamento: tipo === "CANCELAMENTO" ? diaAg : undefined,
    };
    iniciar(async () => {
      const r = editar ? await atualizarRegistro(editar.id, dados) : await criarRegistro(dados);
      if (!r.ok) return void toast.error(r.erro);
      if (editar) toast.success("Lançamento atualizado");
      else if (tipo === "LIGACAO") toast.success(`+${plural(dados.quantidade, "ligação", "ligações")}`);
      else if (tipo === "AGENDAMENTO") toast.success(`+${plural(dados.quantidade, "agendamento", "agendamentos")} 🎯`);
      else toast.success(plural(dados.quantidade, "cancelamento registrado", "cancelamentos registrados"));
      onFim();
    });
  }

  return (
    <DialogContent titulo={editar ? "Editar lançamento" : TITULOS[tipo]}>
      <form className="grid gap-4" onSubmit={enviar}>
        {!editar && tipo !== "LIGACAO" && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="group" aria-label="Tipo">
            {(["AGENDAMENTO", "CANCELAMENTO"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tipo === t}
                onClick={() => setTipo(t)}
                className={cn(
                  "h-9 rounded-lg text-sm font-medium text-muted-foreground",
                  tipo === t && "bg-card text-foreground shadow-sm ring-1 ring-border",
                )}
              >
                {t === "AGENDAMENTO" ? "Agendei" : "Cancelou"}
              </button>
            ))}
          </div>
        )}

        <Campo label="Quantidade" grupo>
          <div className="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-2">
            <Button type="button" variant="outline" className="h-14 text-2xl" onClick={() => mudar(-1)} aria-label="Diminuir">
              <Minus className="size-5!" />
            </Button>
            <Input
              type="number"
              min={1}
              max={500}
              inputMode="numeric"
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              className="h-14 text-center text-3xl font-semibold"
              aria-label="Quantidade"
              required
            />
            <Button type="button" variant="outline" className="h-14 text-2xl" onClick={() => mudar(1)} aria-label="Aumentar">
              <Plus className="size-5!" />
            </Button>
          </div>
          {!editar && tipo === "LIGACAO" && (
            <div className="flex gap-2">
              {[5, 10, 20].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setQtd(String(v))}
                  className="rounded-full border border-input bg-card px-3.5 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </Campo>

        {tipo === "CANCELAMENTO" && (
          <Campo label="Agendamento feito em">
            <Input type="date" value={diaAg} max={hoje()} onChange={(e) => setDiaAg(e.target.value)} required />
            <span className="text-xs text-muted-foreground">O cancelamento desconta do dia em que o agendamento foi feito.</span>
          </Campo>
        )}

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setOutroHorario((v) => !v)}
            className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
            aria-expanded={outroHorario}
          >
            <ChevronDown className={cn("size-4 transition-transform", outroHorario && "rotate-180")} />
            {outroHorario ? "Usar o horário atual" : "Lançar em outro horário"}
          </button>
          {outroHorario && (
            <Campo label="Data/hora do lançamento">
              <Input type="datetime-local" value={em} onChange={(e) => setEm(e.target.value)} />
              {tipo !== "CANCELAMENTO" && (
                <span className="text-xs text-muted-foreground">A quantidade conta no dia desta data.</span>
              )}
            </Campo>
          )}
        </div>

        <Button type="submit" size="lg" disabled={pendente} className="w-full" autoFocus={!editar}>
          {pendente ? "Salvando..." : editar ? "Salvar" : rotuloEnviar(tipo, n)}
        </Button>
      </form>
    </DialogContent>
  );
}
