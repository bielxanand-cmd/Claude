import { prisma } from "@/lib/db";
import { json, toDate } from "@/lib/http";
import { addDays, startOfDay } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Reuniões de um intervalo (padrão: de hoje até +7 dias). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = toDate(url.searchParams.get("from")) ?? addDays(startOfDay(new Date()), -4);
  const to = toDate(url.searchParams.get("to")) ?? addDays(startOfDay(new Date()), 8);
  const meetings = await prisma.meeting.findMany({
    where: { scheduledAt: { gte: from, lt: to } },
    include: { lead: { select: { id: true, nome: true, telefone: true, interesse: true } } },
    orderBy: { scheduledAt: "asc" },
  });
  return json(meetings);
}
