import { prisma } from "@/lib/db";
import { bad, json, toDate } from "@/lib/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Adiar ou pular uma tarefa sem registrar tentativa. */
export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const b = (await req.json()) as Record<string, unknown>;
  const data: { status?: string; dueAt?: Date; doneAt?: Date | null } = {};
  if (b.status) {
    if (!["PENDENTE", "FEITA", "CANCELADA"].includes(String(b.status))) return bad("Status inválido.");
    data.status = String(b.status);
    data.doneAt = data.status === "FEITA" ? new Date() : null;
  }
  const due = toDate(b.dueAt);
  if (due) data.dueAt = due;
  return json(await prisma.task.update({ where: { id }, data }));
}
