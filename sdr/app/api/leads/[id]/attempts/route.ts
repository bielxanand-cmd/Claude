import { AttemptError, registerAttempt } from "@/lib/attempts";
import { CANAIS, RESULTADOS, type Canal, type Resultado } from "@/lib/constants";
import { bad, json, toDate } from "@/lib/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const b = (await req.json()) as Record<string, unknown>;
  if (!CANAIS.includes(b.canal as Canal)) return bad("Canal inválido.");
  if (!RESULTADOS.includes(b.resultado as Resultado)) return bad("Resultado inválido.");
  try {
    const r = await registerAttempt(id, {
      canal: b.canal as Canal,
      resultado: b.resultado as Resultado,
      nota: (b.nota as string) ?? null,
      taskId: b.taskId ? Number(b.taskId) : null,
      scheduledAt: toDate(b.scheduledAt),
      retornoAt: toDate(b.retornoAt),
      score: b.score == null ? null : Number(b.score),
    });
    return json(r, 201);
  } catch (e) {
    if (e instanceof AttemptError) return bad(e.message);
    throw e;
  }
}
