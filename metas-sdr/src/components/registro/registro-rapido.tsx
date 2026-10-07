"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Campo, Input, Select, Textarea } from "@/components/ui/input";
import { Chips } from "@/components/ui/chips";
import { LeadPicker, type LeadOpcao } from "./lead-picker";
import {
  ORIGENS,
  RESULTADOS,
  STATUS_AGENDAMENTO,
  STATUS_LEAD,
  rotuloOrigem,
  rotuloResultado,
  rotuloStatusAgendamento,
  rotuloStatusLead,
  type Origem,
  type Resultado as ResultadoLigacao,
} from "@/lib/rotulos";
import { paraInputDataHora, somarDias, hoje, instanteLocal, ehDiaValido } from "@/lib/datas";
import { ehDiaUtil } from "@/lib/metas/regras";
import {
  atualizarAgendamento,
  atualizarLead,
  atualizarLigacao,
  criarAgendamento,
  criarLead,
  criarLigacao,
  type Resultado,
} from "@/server/actions/registros";

// ---- Dados para edição ----

export interface LeadEdicao {
  id: string;
  nome: string;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  origem: string;
  status: string;
  observacoes: string | null;
  entradaEm: Date;
}
export interface LigacaoEdicao {
  id: string;
  leadId: string | null;
  resultado: string;
  duracaoSeg: number | null;
  observacao: string | null;
  realizadaEm: Date;
}
export interface AgendamentoEdicao {
  id: string;
  leadId: string;
  reuniaoEm: Date;
  feitoEm: Date;
  status: string;
  observacao: string | null;
}

type Pedido =
  | { tipo: "lead"; editar?: LeadEdicao }
  | { tipo: "ligacao"; editar?: LigacaoEdicao; leadId?: string }
  | { tipo: "agendamento"; editar?: AgendamentoEdicao; leadId?: string };

const Ctx = createContext<{ abrir: (p: Pedido) => void } | null>(null);

export function useRegistroRapido() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRegistroRapido fora do RegistroRapidoProvider");
  return c;
}

/** Lembra a última origem usada para agilizar o próximo cadastro. */
const ORIGEM_KEY = "metas-sdr:ultima-origem";
function ultimaOrigem(): Origem {
  try {
    const v = localStorage.getItem(ORIGEM_KEY);
    if (v && (ORIGENS as readonly string[]).includes(v)) return v as Origem;
  } catch {}
  return "OUTBOUND";
}
function guardarOrigem(o: string) {
  try {
    localStorage.setItem(ORIGEM_KEY, o);
  } catch {}
}

/** Próximo dia útil às 10:00 — sugestão padrão para a reunião. */
function sugestaoReuniao(): string {
  let d = somarDias(hoje(), 1);
  while (!ehDiaUtil(d)) d = somarDias(d, 1);
  return paraInputDataHora(instanteLocal(d, "10:00"));
}

const titulos = { lead: "Lead", ligacao: "Ligação", agendamento: "Agendamento" };

export function RegistroRapidoProvider({ leads, children }: { leads: LeadOpcao[]; children: React.ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [chave, setChave] = useState(0);

  const abrir = useCallback((p: Pedido) => {
    setPedido(p);
    setChave((k) => k + 1);
  }, []);

  // Atalhos: L = lead, C = ligação, A = agendamento (fora de campos de texto).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || pedido) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName))) return;
      const tipo = ({ l: "lead", c: "ligacao", a: "agendamento" } as const)[e.key.toLowerCase() as "l" | "c" | "a"];
      if (tipo) {
        e.preventDefault();
        abrir({ tipo });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abrir, pedido]);

  const fechar = () => setPedido(null);

  return (
    <Ctx.Provider value={{ abrir }}>
      {children}
      <Dialog open={!!pedido} onOpenChange={(o) => !o && fechar()}>
        {pedido && (
          <DialogContent
            key={chave}
            titulo={`${pedido.editar ? "Editar" : "Nova"} ${titulos[pedido.tipo].toLowerCase()}`.replace("Nova lead", "Novo lead")}
          >
            {pedido.tipo === "lead" && <FormLead editar={pedido.editar} onFim={fechar} />}
            {pedido.tipo === "ligacao" && (
              <FormLigacao leads={leads} editar={pedido.editar} leadInicial={pedido.leadId} onFim={fechar} />
            )}
            {pedido.tipo === "agendamento" && (
              <FormAgendamento leads={leads} editar={pedido.editar} leadInicial={pedido.leadId} onFim={fechar} />
            )}
          </DialogContent>
        )}
      </Dialog>
    </Ctx.Provider>
  );
}

// ---- Partes comuns ----

function MaisDetalhes({ aberto, onToggle, children }: { aberto: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
        aria-expanded={aberto}
      >
        <ChevronDown className={`size-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
        {aberto ? "Menos detalhes" : "Mais detalhes"}
      </button>
      {aberto && <div className="grid gap-3">{children}</div>}
    </div>
  );
}

function useEnvio(onFim: () => void, mensagem: string) {
  const [pendente, iniciar] = useTransition();
  const enviar = (acao: () => Promise<Resultado<unknown>>) =>
    iniciar(async () => {
      const r = await acao();
      if (r.ok) {
        toast.success(mensagem);
        onFim();
      } else {
        toast.error(r.erro);
      }
    });
  return { pendente, enviar };
}

function Rodape({ pendente, rotulo }: { pendente: boolean; rotulo: string }) {
  return (
    <Button type="submit" size="lg" disabled={pendente} className="w-full">
      {pendente ? "Salvando..." : rotulo}
    </Button>
  );
}

// ---- Formulários ----

function FormLead({ editar, onFim }: { editar?: LeadEdicao; onFim: () => void }) {
  const [nome, setNome] = useState(editar?.nome ?? "");
  const [origem, setOrigem] = useState<Origem>((editar?.origem as Origem) ?? ultimaOrigem());
  const [detalhes, setDetalhes] = useState(!!editar);
  const [extra, setExtra] = useState({
    empresa: editar?.empresa ?? "",
    telefone: editar?.telefone ?? "",
    email: editar?.email ?? "",
    observacoes: editar?.observacoes ?? "",
    status: editar?.status ?? "NOVO",
    entradaEm: paraInputDataHora(editar?.entradaEm ?? new Date()),
  });
  const { pendente, enviar } = useEnvio(onFim, editar ? "Lead atualizado" : "Lead registrado");
  const set = (k: keyof typeof extra) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setExtra((x) => ({ ...x, [k]: e.target.value }));

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        guardarOrigem(origem);
        const dados = { nome, origem, ...extra, entradaEm: detalhes ? extra.entradaEm : undefined };
        enviar(() => (editar ? atualizarLead(editar.id, dados) : criarLead({ ...dados, status: undefined })));
      }}
    >
      <Campo label="Nome">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus required placeholder="Nome do lead" />
      </Campo>
      <Campo label="Origem" grupo>
        <Chips opcoes={ORIGENS} valor={origem} onChange={setOrigem} rotulos={rotuloOrigem} />
      </Campo>
      <MaisDetalhes aberto={detalhes} onToggle={() => setDetalhes((d) => !d)}>
        <Campo label="Empresa">
          <Input value={extra.empresa} onChange={set("empresa")} />
        </Campo>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Telefone">
            <Input value={extra.telefone} onChange={set("telefone")} inputMode="tel" />
          </Campo>
          <Campo label="E-mail">
            <Input value={extra.email} onChange={set("email")} type="email" />
          </Campo>
        </div>
        {editar && (
          <Campo label="Status">
            <Select value={extra.status} onChange={set("status")}>
              {STATUS_LEAD.map((s) => (
                <option key={s} value={s}>{rotuloStatusLead[s]}</option>
              ))}
            </Select>
          </Campo>
        )}
        <Campo label="Data/hora de entrada">
          <Input type="datetime-local" value={extra.entradaEm} onChange={set("entradaEm")} />
        </Campo>
        <Campo label="Observações">
          <Textarea value={extra.observacoes} onChange={set("observacoes")} />
        </Campo>
      </MaisDetalhes>
      <Rodape pendente={pendente} rotulo={editar ? "Salvar" : "Registrar lead"} />
    </form>
  );
}

function FormLigacao({
  leads,
  editar,
  leadInicial,
  onFim,
}: {
  leads: LeadOpcao[];
  editar?: LigacaoEdicao;
  leadInicial?: string;
  onFim: () => void;
}) {
  const [resultado, setResultado] = useState<ResultadoLigacao>((editar?.resultado as ResultadoLigacao) ?? "ATENDEU");
  const [leadId, setLeadId] = useState<string | null>(editar?.leadId ?? leadInicial ?? null);
  const [busca, setBusca] = useState("");
  const [detalhes, setDetalhes] = useState(!!editar);
  const [duracao, setDuracao] = useState(editar?.duracaoSeg != null ? String(Math.round(editar.duracaoSeg / 60)) : "");
  const [observacao, setObservacao] = useState(editar?.observacao ?? "");
  const [quando, setQuando] = useState(paraInputDataHora(editar?.realizadaEm ?? new Date()));
  const { pendente, enviar } = useEnvio(onFim, editar ? "Ligação atualizada" : "Ligação registrada");

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const dados = { leadId, resultado, duracaoMin: duracao, observacao, realizadaEm: detalhes ? quando : undefined };
        enviar(() => (editar ? atualizarLigacao(editar.id, dados) : criarLigacao(dados)));
      }}
    >
      <Campo label="Resultado" grupo>
        <Chips opcoes={RESULTADOS} valor={resultado} onChange={setResultado} rotulos={rotuloResultado} />
      </Campo>
      <Campo label="Lead (opcional)" grupo>
        <LeadPicker leads={leads} leadId={leadId} onSelecionar={setLeadId} texto={busca} onTexto={setBusca} />
      </Campo>
      <MaisDetalhes aberto={detalhes} onToggle={() => setDetalhes((d) => !d)}>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Duração (min)">
            <Input type="number" min={0} step="0.5" inputMode="decimal" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
          </Campo>
          <Campo label="Data/hora">
            <Input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} />
          </Campo>
        </div>
        <Campo label="Observação">
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </Campo>
      </MaisDetalhes>
      <Rodape pendente={pendente} rotulo={editar ? "Salvar" : "Registrar ligação"} />
    </form>
  );
}

function FormAgendamento({
  leads,
  editar,
  leadInicial,
  onFim,
}: {
  leads: LeadOpcao[];
  editar?: AgendamentoEdicao;
  leadInicial?: string;
  onFim: () => void;
}) {
  const [leadId, setLeadId] = useState<string | null>(editar?.leadId ?? leadInicial ?? null);
  const [busca, setBusca] = useState("");
  const [reuniao, setReuniao] = useState(editar ? paraInputDataHora(editar.reuniaoEm) : sugestaoReuniao());
  const [detalhes, setDetalhes] = useState(!!editar);
  const [status, setStatus] = useState(editar?.status ?? "MARCADO");
  const [observacao, setObservacao] = useState(editar?.observacao ?? "");
  const [feitoEm, setFeitoEm] = useState(paraInputDataHora(editar?.feitoEm ?? new Date()));
  const { pendente, enviar } = useEnvio(onFim, editar ? "Agendamento atualizado" : "Agendamento registrado 🎯");

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const reuniaoValida = ehDiaValido(reuniao.slice(0, 10));
        if (!reuniaoValida) return toast.error("Informe a data e hora da reunião.");
        const dados = {
          leadId,
          novoLeadNome: leadId ? undefined : busca,
          novoLeadOrigem: ultimaOrigem(),
          reuniaoEm: reuniao,
          status,
          observacao,
          feitoEm: detalhes ? feitoEm : undefined,
        };
        enviar(() => (editar ? atualizarAgendamento(editar.id, dados) : criarAgendamento(dados)));
      }}
    >
      <Campo label="Lead" grupo>
        <LeadPicker
          leads={leads}
          leadId={leadId}
          onSelecionar={setLeadId}
          texto={busca}
          onTexto={setBusca}
          permitirNovo={!editar}
          autoFocus={!leadId}
        />
      </Campo>
      <Campo label="Reunião marcada para">
        <Input type="datetime-local" value={reuniao} onChange={(e) => setReuniao(e.target.value)} required />
      </Campo>
      <MaisDetalhes aberto={detalhes} onToggle={() => setDetalhes((d) => !d)}>
        <Campo label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_AGENDAMENTO.map((s) => (
              <option key={s} value={s}>{rotuloStatusAgendamento[s]}</option>
            ))}
          </Select>
        </Campo>
        <Campo label="Agendamento feito em">
          <Input type="datetime-local" value={feitoEm} onChange={(e) => setFeitoEm(e.target.value)} />
        </Campo>
        <Campo label="Observação">
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </Campo>
      </MaisDetalhes>
      <Rodape pendente={pendente} rotulo={editar ? "Salvar" : "Registrar agendamento"} />
    </form>
  );
}
