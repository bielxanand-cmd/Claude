import { prisma } from "@/lib/db";
import { CANAIS, type Canal } from "@/lib/constants";
import { bad, json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Step = { dia: number; canal: string; titulo: string; templateId?: number | null; ativo?: boolean };

/**
 * Substitui a cadência inteira. Vale para os próximos leads que entrarem em cadência;
 * tarefas já geradas não mudam.
 */
export async function PUT(req: Request) {
  const b = (await req.json()) as { steps?: Step[] };
  if (!Array.isArray(b.steps) || b.steps.length === 0) return bad("A cadência precisa de ao menos um passo.");
  for (const s of b.steps) {
    if (!CANAIS.includes(s.canal as Canal)) return bad("Canal inválido.");
    if (!Number.isInteger(Number(s.dia)) || Number(s.dia) < 0) return bad("Dia inválido.");
    if (!s.titulo?.trim()) return bad("Todo passo precisa de um título.");
  }
  const steps = [...b.steps].sort((a, z) => Number(a.dia) - Number(z.dia));
  await prisma.$transaction(async (db) => {
    await db.task.updateMany({ where: { cadenceStepId: { not: null } }, data: { cadenceStepId: null } });
    await db.cadenceStep.deleteMany();
    for (const [i, s] of steps.entries()) {
      await db.cadenceStep.create({
        data: { ordem: i + 1, dia: Number(s.dia), canal: s.canal, titulo: s.titulo.trim(), templateId: s.templateId || null, ativo: s.ativo ?? true },
      });
    }
  });
  return json(await prisma.cadenceStep.findMany({ orderBy: [{ dia: "asc" }, { ordem: "asc" }] }));
}
