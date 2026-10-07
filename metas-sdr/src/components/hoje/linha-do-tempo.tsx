"use client";

import Link from "next/link";
import { Pencil, Phone, Target, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Confirmar } from "@/components/comum/confirmar";
import { useRegistroRapido } from "@/components/registro/registro-rapido";
import { formatarDataHora, formatarHora } from "@/lib/datas";
import {
  rotuloOrigem,
  rotuloResultado,
  rotuloStatusAgendamento,
  type Origem,
  type Resultado,
  type StatusAgendamento,
} from "@/lib/rotulos";
import { excluirAgendamento, excluirLead, excluirLigacao } from "@/server/actions/registros";
import type { ItemLinhaDoTempo } from "@/server/queries/hoje";
import { cn } from "@/lib/utils";

const tomResultado: Record<Resultado, "ok" | "neutro" | "aviso" | "ruim"> = {
  ATENDEU: "ok",
  NAO_ATENDEU: "ruim",
  CAIXA_POSTAL: "neutro",
  RETORNAR: "aviso",
};
export const tomStatusAgendamento: Record<StatusAgendamento, "ok" | "neutro" | "aviso" | "ruim" | "primario"> = {
  MARCADO: "primario",
  REALIZADO: "ok",
  NO_SHOW: "aviso",
  CANCELADO: "ruim",
};

export function LinhaDoTempo({ itens }: { itens: ItemLinhaDoTempo[] }) {
  const { abrir } = useRegistroRapido();

  if (itens.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nada registrado hoje ainda. Use os botões <strong>+ Lead</strong>, <strong>+ Ligação</strong> e{" "}
        <strong>+ Agendamento</strong> (ou as teclas L, C e A).
      </p>
    );
  }

  return (
    <ol className="divide-y">
      {itens.map((item) => {
        let icone, titulo, detalhe, editar, excluir, rotuloTipo;
        if (item.tipo === "lead") {
          icone = <UserPlus className="text-accent-foreground" />;
          rotuloTipo = "Lead";
          titulo = <Link href={`/leads/${item.lead.id}`} className="hover:underline">{item.lead.nome}</Link>;
          detalhe = (
            <>
              <Badge>{rotuloOrigem[item.lead.origem as Origem]}</Badge>
              {item.lead.empresa && <span>{item.lead.empresa}</span>}
            </>
          );
          editar = () => abrir({ tipo: "lead", editar: { ...item.lead, entradaEm: item.em } });
          excluir = () => excluirLead(item.id);
        } else if (item.tipo === "ligacao") {
          icone = <Phone className="text-muted-foreground" />;
          rotuloTipo = "Ligação";
          titulo = item.lead ? <Link href={`/leads/${item.lead.id}`} className="hover:underline">{item.lead.nome}</Link> : "Ligação sem lead";
          detalhe = (
            <>
              <Badge tom={tomResultado[item.resultado as Resultado]}>{rotuloResultado[item.resultado as Resultado]}</Badge>
              {item.duracaoSeg != null && <span>{Math.round(item.duracaoSeg / 60)} min</span>}
              {item.observacao && <span className="truncate">{item.observacao}</span>}
            </>
          );
          editar = () =>
            abrir({
              tipo: "ligacao",
              editar: { id: item.id, leadId: item.lead?.id ?? null, resultado: item.resultado, duracaoSeg: item.duracaoSeg, observacao: item.observacao, realizadaEm: item.em },
            });
          excluir = () => excluirLigacao(item.id);
        } else {
          icone = <Target className="text-primary" />;
          rotuloTipo = "Agendamento";
          titulo = <Link href={`/leads/${item.lead.id}`} className="hover:underline">{item.lead.nome}</Link>;
          detalhe = (
            <>
              <Badge tom={tomStatusAgendamento[item.status as StatusAgendamento]}>
                {rotuloStatusAgendamento[item.status as StatusAgendamento]}
              </Badge>
              <span>Reunião {formatarDataHora(item.reuniaoEm)}</span>
            </>
          );
          editar = () =>
            abrir({
              tipo: "agendamento",
              editar: { id: item.id, leadId: item.lead.id, reuniaoEm: item.reuniaoEm, feitoEm: item.em, status: item.status, observacao: item.observacao },
            });
          excluir = () => excluirAgendamento(item.id);
        }
        const cancelado = item.tipo === "agendamento" && item.status === "CANCELADO";
        return (
          <li key={`${item.tipo}-${item.id}`} className="flex items-center gap-3 py-3">
            <span className="w-11 shrink-0 text-sm tabular-nums text-muted-foreground">{formatarHora(item.em)}</span>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted [&_svg]:size-4">{icone}</span>
            <div className="min-w-0 flex-1">
              <div className={cn("truncate font-medium", cancelado && "line-through opacity-60")}>
                <span className="sr-only">{rotuloTipo}: </span>
                {titulo}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{detalhe}</div>
            </div>
            <Button variant="ghost" size="icon" aria-label={`Editar ${rotuloTipo.toLowerCase()}`} onClick={editar}>
              <Pencil />
            </Button>
            <Confirmar
              titulo={`Excluir ${rotuloTipo.toLowerCase()}?`}
              descricao={
                item.tipo === "lead"
                  ? "O lead e os agendamentos dele serão excluídos. As ligações ficam sem lead."
                  : "Essa ação não pode ser desfeita."
              }
              acao={excluir}
              sucesso="Excluído"
            >
              {(abrirConfirmacao) => (
                <Button variant="ghost" size="icon" aria-label={`Excluir ${rotuloTipo.toLowerCase()}`} onClick={abrirConfirmacao}>
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
