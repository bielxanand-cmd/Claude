import { prisma } from "@/lib/db";
import { bad, json } from "@/lib/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      attempts: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { dueAt: "asc" } },
      meetings: { orderBy: { scheduledAt: "desc" } },
    },
  });
  if (!lead) return bad("Lead não encontrado.", 404);
  return json(lead);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const b = (await req.json()) as Record<string, unknown>;
  const fields = ["nome", "telefone", "email", "origem", "interesse", "observacao"] as const;
  const data: Record<string, unknown> = {};
  for (const f of fields) if (f in b) data[f] = b[f] === "" ? null : b[f];
  if ("score" in b) data.score = Math.max(0, Math.min(3, Number(b.score) || 0));
  if ("respostas" in b) data.respostas = b.respostas == null ? null : JSON.stringify(b.respostas);
  if (data.nome === null) return bad("Nome é obrigatório.");
  return json(await prisma.lead.update({ where: { id }, data }));
}

export async function DELETE(_: Request, { params }: Ctx) {
  const id = Number((await params).id);
  await prisma.lead.delete({ where: { id } });
  return json({ ok: true });
}
