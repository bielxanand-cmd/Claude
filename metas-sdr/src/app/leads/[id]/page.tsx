import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AcoesAgendamento, AcoesLead, AcoesLigacao } from "@/components/leads/acoes";
import { usuarioAtualId } from "@/server/usuario";
import { detalheLead } from "@/server/queries/leads";
import { formatarDataHora } from "@/lib/datas";
import {
  rotuloOrigem,
  rotuloResultado,
  rotuloStatusLead,
  type Origem,
  type Resultado,
  type StatusLead,
  tomStatusLead,
} from "@/lib/rotulos";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await usuarioAtualId();
  const lead = await detalheLead(userId, id);
  if (!lead) notFound();

  return (
    <div className="grid gap-6">
      <Link href="/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Leads
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{lead.nome}</h1>
            {lead.empresa && <p className="text-muted-foreground">{lead.empresa}</p>}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <Badge tom={tomStatusLead[lead.status as StatusLead]}>{rotuloStatusLead[lead.status as StatusLead]}</Badge>
              <Badge>{rotuloOrigem[lead.origem as Origem]}</Badge>
              <span className="text-muted-foreground">Entrou em {formatarDataHora(lead.entradaEm)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              {lead.telefone && (
                <a href={`tel:${lead.telefone}`} className="inline-flex items-center gap-1 hover:underline">
                  <Phone className="size-4" /> {lead.telefone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 hover:underline">
                  <Mail className="size-4" /> {lead.email}
                </a>
              )}
            </div>
            {lead.observacoes && <p className="mt-2 whitespace-pre-wrap text-sm">{lead.observacoes}</p>}
          </div>
        </div>
        <div className="mt-4">
          <AcoesLead lead={lead} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Target className="size-4" /> Agendamentos ({lead.agendamentos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lead.agendamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento.</p>
            ) : (
              <ul className="divide-y">
                {lead.agendamentos.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <div className="font-medium">Reunião {formatarDataHora(a.reuniaoEm)}</div>
                      <div className="text-xs text-muted-foreground">
                        Agendado em {formatarDataHora(a.feitoEm)}
                        {a.observacao && ` · ${a.observacao}`}
                      </div>
                    </div>
                    <AcoesAgendamento agendamento={a} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Phone className="size-4" /> Ligações ({lead.ligacoes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lead.ligacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ligação.</p>
            ) : (
              <ul className="divide-y">
                {lead.ligacoes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rotuloResultado[c.resultado as Resultado]}</span>
                        {c.duracaoSeg != null && (
                          <span className="text-xs text-muted-foreground">{Math.round(c.duracaoSeg / 60)} min</span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {formatarDataHora(c.realizadaEm)}
                        {c.observacao && ` · ${c.observacao}`}
                      </div>
                    </div>
                    <AcoesLigacao ligacao={c} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
