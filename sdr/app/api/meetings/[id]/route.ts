import { bad, json, toDate } from "@/lib/http";
import { updateMeeting } from "@/lib/meetings";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const STATUS = ["AGENDADA", "CONFIRMADA", "REALIZADA", "NO_SHOW", "CANCELADA"];

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const b = (await req.json()) as Record<string, unknown>;
  if (b.status && !STATUS.includes(String(b.status))) return bad("Status inválido.");
  const m = await updateMeeting(id, {
    status: b.status ? String(b.status) : undefined,
    scheduledAt: toDate(b.scheduledAt) ?? undefined,
    nota: b.nota === undefined ? undefined : (b.nota as string | null),
  });
  return json(m);
}
