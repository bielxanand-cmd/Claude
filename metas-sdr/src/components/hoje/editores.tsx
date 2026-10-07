"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Clock, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/input";
import { salvarJornadaDoDia, salvarMetaDiaria } from "@/server/actions/config";
import type { Resultado } from "@/server/actions/registros";

function useSalvar(fechar: () => void) {
  const [pendente, iniciar] = useTransition();
  const salvar = (acao: () => Promise<Resultado>, msg: string) =>
    iniciar(async () => {
      const r = await acao();
      if (r.ok) {
        toast.success(msg);
        fechar();
      } else toast.error(r.erro);
    });
  return { pendente, salvar };
}

/** Edita a jornada de hoje (usada no indicador de ritmo). */
export function EditarJornadaHoje({ inicio, fim, personalizada }: { inicio: string; fim: string; personalizada: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [ini, setIni] = useState(inicio);
  const [fi, setFi] = useState(fim);
  const { pendente, salvar } = useSalvar(() => setAberto(false));
  return (
    <Dialog
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (o) {
          setIni(inicio);
          setFi(fim);
        }
      }}
    >
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          <Clock className="size-3.5" />
          Jornada hoje: {inicio}–{fim}
          {personalizada && " (ajustada)"}
        </button>
      </DialogTrigger>
      <DialogContent titulo="Jornada de hoje" descricao="Vale só para hoje. A jornada padrão fica em Configurações.">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            salvar(() => salvarJornadaDoDia({ inicio: ini, fim: fi }), "Jornada de hoje atualizada");
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Início">
              <Input type="time" value={ini} onChange={(e) => setIni(e.target.value)} required />
            </Campo>
            <Campo label="Fim">
              <Input type="time" value={fi} onChange={(e) => setFi(e.target.value)} required />
            </Campo>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {personalizada && (
              <Button
                type="button"
                variant="outline"
                disabled={pendente}
                onClick={() => salvar(() => salvarJornadaDoDia(null), "Voltou para a jornada padrão")}
              >
                Usar jornada padrão
              </Button>
            )}
            <Button type="submit" disabled={pendente}>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Altera a meta diária a partir de hoje (dias anteriores não mudam). */
export function EditarMetaDiaria({ atual }: { atual: number }) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(String(atual));
  const { pendente, salvar } = useSalvar(() => setAberto(false));
  return (
    <Dialog
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (o) setValor(String(atual));
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Alterar meta diária">
          <Pencil /> Meta
        </Button>
      </DialogTrigger>
      <DialogContent
        titulo="Meta diária"
        descricao="A nova meta vale a partir de hoje. Dias anteriores continuam com a meta da época."
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            salvar(() => salvarMetaDiaria(Number(valor)), "Meta atualizada");
          }}
        >
          <Campo label="Agendamentos por dia">
            <Input type="number" min={0} max={1000} inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} required autoFocus />
          </Campo>
          <Button type="submit" disabled={pendente}>
            Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
