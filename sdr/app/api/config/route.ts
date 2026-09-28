import { prisma } from "@/lib/db";
import { bad, json } from "@/lib/http";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const [settings, cadence, templates] = await Promise.all([
    getSettings(),
    prisma.cadenceStep.findMany({ orderBy: [{ dia: "asc" }, { ordem: "asc" }] }),
    prisma.template.findMany({ orderBy: { id: "asc" } }),
  ]);
  return json({ settings, cadence, templates });
}

const STR = ["produto", "nomeSdr", "empresa", "horaInicio", "horaFim", "diasUteis", "scriptAbertura", "pergunta1", "pergunta2", "pergunta3", "scriptFechamento", "webhookToken"];
const NUM = ["metaReunioes", "slaMinutos", "duracaoReuniao", "metaContato", "metaAgendamento", "metaNoShow"];

export async function PATCH(req: Request) {
  const b = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const k of STR) if (k in b) data[k] = b[k] === "" && k === "webhookToken" ? null : String(b[k] ?? "");
  for (const k of NUM) if (k in b) {
    const n = Number(b[k]);
    if (!isFinite(n) || n < 0) return bad(`Valor inválido em ${k}.`);
    data[k] = n;
  }
  for (const k of ["horaInicio", "horaFim"]) if (k in data && !/^\d{2}:\d{2}$/.test(String(data[k]))) return bad("Use o formato HH:MM.");
  await getSettings();
  return json(await prisma.settings.update({ where: { id: 1 }, data }));
}
