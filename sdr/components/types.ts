// Formatos que a API devolve (datas chegam como string).
export type LeadLite = {
  id: number; nome: string; telefone: string | null; email: string | null; origem: string | null;
  interesse: string | null; score: number; status: string; createdAt: string; slaStartAt: string;
  foraDoHorario: boolean; firstContactAt?: string | null;
};
export type SlaLead = LeadLite & { deadline: string };
export type SlaData = {
  now: string; slaMinutos: number; leads: SlaLead[]; aguardandoExpediente: LeadLite[];
  progresso: { agendadasHoje: number; meta: number };
};
export type Meeting = {
  id: number; leadId: number; scheduledAt: string; bookedAt: string; attemptNumero: number; status: string; nota: string | null;
  lead?: { id: number; nome: string; telefone?: string | null; interesse?: string | null };
};
export type Task = {
  id: number; leadId: number; tipo: string; canal: string; titulo: string; dueAt: string; status: string;
  cadenceStepId: number | null; templateId: number | null; meetingId: number | null; doneAt: string | null;
};
export type QueueTask = Task & { lead: LeadLite; meeting: Meeting | null; disponivel: boolean };
export type QueueData = {
  now: string; bloco: "ABERTURA" | "FECHAMENTO" | null; horaInicio: string; horaFim: string;
  confirmacoes: QueueTask[]; atrasados: QueueTask[]; doDia: QueueTask[];
  foraDoHorario: LeadLite[]; reunioesHoje: Meeting[]; reunioesAmanha: Meeting[];
};
export type Attempt = { id: number; canal: string; resultado: string; nota: string | null; numero: number; createdAt: string };
export type LeadFull = LeadLite & {
  observacao: string | null; respostas: string | null; speedToLeadSec: number | null; firstContactAt: string | null;
  attempts: Attempt[]; tasks: Task[]; meetings: Meeting[];
};
export type Template = { id: number; chave: string | null; canal: string; nome: string; assunto: string | null; corpo: string };
export type CadenceStep = { id: number; ordem: number; dia: number; canal: string; titulo: string; templateId: number | null; ativo: boolean };
export type Settings = {
  produto: string; nomeSdr: string; empresa: string; horaInicio: string; horaFim: string; diasUteis: string;
  metaReunioes: number; slaMinutos: number; duracaoReuniao: number;
  scriptAbertura: string; pergunta1: string; pergunta2: string; pergunta3: string; scriptFechamento: string;
  metaContato: number; metaAgendamento: number; metaNoShow: number; webhookToken: string | null;
};
export type ConfigData = { settings: Settings; cadence: CadenceStep[]; templates: Template[] };
export type Slots = { hoje: string[]; amanha: string[]; horario1: string | null; horario2: string | null };
