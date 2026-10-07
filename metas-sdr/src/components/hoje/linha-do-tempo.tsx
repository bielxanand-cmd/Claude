"use client";

import { Ban, Pencil, Phone, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confirmar } from "@/components/comum/confirmar";
import { useRegistroRapido } from "@/components/registro/registro-rapido";
import { diaDe, formatarDia, formatarHora } from "@/lib/datas";
import { plural, type TipoRegistro } from "@/lib/rotulos";
import { excluirRegistro } from "@/server/actions/registros";

export interface ItemLancamento {
  id: string;
  tipo: TipoRegistro;
  quantidade: number;
  em: Date;
  dia: string;
}

function descrever(l: ItemLancamento) {
  if (l.tipo === "LIGACAO") return { icone: <Phone className="text-muted-foreground" />, titulo: `+${plural(l.quantidade, "ligação", "ligações")}` };
  if (l.tipo === "AGENDAMENTO") return { icone: <Target className="text-primary" />, titulo: `+${plural(l.quantidade, "agendamento", "agendamentos")}` };
  return {
    icone: <Ban className="text-bad" />,
    titulo: plural(l.quantidade, "agendamento cancelado", "agendamentos cancelados"),
    detalhe: l.dia === diaDe(l.em) ? "desconta de hoje" : `desconta do dia ${formatarDia(l.dia)}`,
  };
}

export function LinhaDoTempo({ itens }: { itens: ItemLancamento[] }) {
  const { abrir } = useRegistroRapido();

  if (itens.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nada registrado hoje ainda. Use <strong>+ Ligações</strong> e <strong>+ Agendamentos</strong> (ou as teclas C e A).
      </p>
    );
  }

  return (
    <ol className="divide-y">
      {itens.map((l) => {
        const { icone, titulo, detalhe } = descrever(l);
        return (
          <li key={l.id} className="flex items-center gap-3 py-3">
            <span className="w-11 shrink-0 text-sm tabular-nums text-muted-foreground">{formatarHora(l.em)}</span>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted [&_svg]:size-4">{icone}</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{titulo}</div>
              {detalhe && <div className="text-xs text-muted-foreground">{detalhe}</div>}
            </div>
            <Button variant="ghost" size="icon" aria-label="Editar lançamento" onClick={() => abrir({ editar: l })}>
              <Pencil />
            </Button>
            <Confirmar
              titulo="Excluir lançamento?"
              descricao="Os totais do dia são recalculados."
              acao={() => excluirRegistro(l.id)}
              sucesso="Excluído"
            >
              {(abrirConfirmacao) => (
                <Button variant="ghost" size="icon" aria-label="Excluir lançamento" onClick={abrirConfirmacao}>
                  <Trash2 />
                </Button>
              )}
            </Confirmar>
          </li>
        );
      })}
    </ol>
  );
}
