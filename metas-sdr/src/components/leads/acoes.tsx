"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Phone, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Confirmar } from "@/components/comum/confirmar";
import { useRegistroRapido, type AgendamentoEdicao, type LeadEdicao, type LigacaoEdicao } from "@/components/registro/registro-rapido";
import { STATUS_AGENDAMENTO, rotuloStatusAgendamento } from "@/lib/rotulos";
import { excluirAgendamento, excluirLead, excluirLigacao, mudarStatusAgendamento } from "@/server/actions/registros";

export function AcoesLead({ lead }: { lead: LeadEdicao }) {
  const { abrir } = useRegistroRapido();
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => abrir({ tipo: "ligacao", leadId: lead.id })}>
        <Phone /> + Ligação
      </Button>
      <Button onClick={() => abrir({ tipo: "agendamento", leadId: lead.id })}>
        <Target /> + Agendamento
      </Button>
      <Button variant="outline" onClick={() => abrir({ tipo: "lead", editar: lead })}>
        <Pencil /> Editar
      </Button>
      <Confirmar
        titulo="Excluir lead?"
        descricao="Os agendamentos deste lead também serão excluídos; as ligações ficam sem lead."
        acao={async () => {
          const r = await excluirLead(lead.id);
          if (r.ok) router.push("/leads");
          return r;
        }}
        sucesso="Lead excluído"
      >
        {(abrirConfirmacao) => (
          <Button variant="ghost" onClick={abrirConfirmacao}>
            <Trash2 /> Excluir
          </Button>
        )}
      </Confirmar>
    </div>
  );
}

export function AcoesLigacao({ ligacao }: { ligacao: LigacaoEdicao }) {
  const { abrir } = useRegistroRapido();
  return (
    <div className="flex">
      <Button variant="ghost" size="icon" aria-label="Editar ligação" onClick={() => abrir({ tipo: "ligacao", editar: ligacao })}>
        <Pencil />
      </Button>
      <Confirmar titulo="Excluir ligação?" acao={() => excluirLigacao(ligacao.id)} sucesso="Ligação excluída">
        {(a) => (
          <Button variant="ghost" size="icon" aria-label="Excluir ligação" onClick={a}>
            <Trash2 />
          </Button>
        )}
      </Confirmar>
    </div>
  );
}

export function AcoesAgendamento({ agendamento }: { agendamento: AgendamentoEdicao }) {
  const { abrir } = useRegistroRapido();
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <Select
        aria-label="Status do agendamento"
        className="h-8 w-32 text-xs"
        value={agendamento.status}
        disabled={pendente}
        onChange={(e) => {
          const status = e.target.value;
          iniciar(async () => {
            const r = await mudarStatusAgendamento(agendamento.id, status);
            if (r.ok) toast.success(`Status: ${rotuloStatusAgendamento[status as keyof typeof rotuloStatusAgendamento]}`);
            else toast.error(r.erro);
          });
        }}
      >
        {STATUS_AGENDAMENTO.map((s) => (
          <option key={s} value={s}>{rotuloStatusAgendamento[s]}</option>
        ))}
      </Select>
      <Button variant="ghost" size="icon" aria-label="Editar agendamento" onClick={() => abrir({ tipo: "agendamento", editar: agendamento })}>
        <Pencil />
      </Button>
      <Confirmar titulo="Excluir agendamento?" acao={() => excluirAgendamento(agendamento.id)} sucesso="Agendamento excluído">
        {(a) => (
          <Button variant="ghost" size="icon" aria-label="Excluir agendamento" onClick={a}>
            <Trash2 />
          </Button>
        )}
      </Confirmar>
    </div>
  );
}
