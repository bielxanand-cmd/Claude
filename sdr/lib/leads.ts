import { prisma, type Tx } from "./db";
import { getSettings } from "./settings";
import { isWorkingTime, nextWorkStart } from "./time";

export type LeadInput = {
  nome: string;
  telefone?: string | null;
  email?: string | null;
  origem?: string | null;
  interesse?: string | null;
  observacao?: string | null;
  createdAt?: Date;
};

export async function createLead(
  input: LeadInput,
  opts: { now?: Date; forceSla?: boolean; db?: Tx } = {},
) {
  const db = opts.db ?? prisma;
  const cfg = await getSettings(db);
  const createdAt = input.createdAt ?? opts.now ?? new Date();
  const dentro = opts.forceSla || isWorkingTime(cfg, createdAt);
  return db.lead.create({
    data: {
      nome: input.nome.trim(),
      telefone: clean(input.telefone),
      email: clean(input.email)?.toLowerCase() ?? null,
      origem: clean(input.origem),
      interesse: clean(input.interesse),
      observacao: clean(input.observacao),
      createdAt,
      slaStartAt: dentro ? createdAt : nextWorkStart(cfg, createdAt),
      foraDoHorario: !dentro,
    },
  });
}

function clean(v: string | null | undefined) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// Aceita nomes de campo em português e inglês, como os formulários costumam mandar.
const ALIASES: Record<keyof Omit<LeadInput, "createdAt">, string[]> = {
  nome: ["nome", "name", "full_name", "fullname", "nome_completo", "your-name", "cliente"],
  telefone: ["telefone", "phone", "phone_number", "whatsapp", "celular", "tel", "fone", "mobile", "your-phone"],
  email: ["email", "e-mail", "e_mail", "mail", "your-email", "email_address"],
  origem: ["origem", "source", "utm_source", "fonte", "canal", "form", "form_name", "formulario"],
  interesse: ["interesse", "interest", "produto", "product", "servico", "service", "assunto", "subject"],
  observacao: ["observacao", "observação", "obs", "message", "mensagem", "notes", "nota", "comentario", "your-message"],
};

function flatten(obj: unknown, out: Record<string, string> = {}, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 3) return out;
  if (Array.isArray(obj)) {
    // Formato comum: [{ "name"|"key"|"field": "...", "value": "..." }]
    for (const it of obj) {
      if (it && typeof it === "object") {
        const o = it as Record<string, unknown>;
        const key = o.name ?? o.key ?? o.field ?? o.label ?? o.title;
        if (typeof key === "string" && (typeof o.value === "string" || typeof o.value === "number")) {
          out[key.toLowerCase()] ??= String(o.value);
        } else flatten(o, out, depth + 1);
      }
    }
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v == null) continue;
    if (typeof v === "object") flatten(v, out, depth + 1);
    else out[k.toLowerCase()] ??= String(v);
  }
  return out;
}

/** Converte um payload qualquer de formulário em LeadInput. */
export function normalizeLeadPayload(payload: unknown): LeadInput | null {
  const flat = flatten(payload);
  const pick = (keys: string[]) => {
    for (const k of keys) if (flat[k]?.trim()) return flat[k].trim();
    return null;
  };
  let nome = pick(ALIASES.nome);
  if (!nome) {
    const first = pick(["first_name", "firstname", "primeiro_nome"]);
    const last = pick(["last_name", "lastname", "sobrenome"]);
    nome = [first, last].filter(Boolean).join(" ") || null;
  }
  const telefone = pick(ALIASES.telefone);
  const email = pick(ALIASES.email);
  if (!nome) nome = email ?? telefone;
  if (!nome) return null;
  return {
    nome,
    telefone,
    email,
    origem: pick(ALIASES.origem),
    interesse: pick(ALIASES.interesse),
    observacao: pick(ALIASES.observacao),
  };
}
