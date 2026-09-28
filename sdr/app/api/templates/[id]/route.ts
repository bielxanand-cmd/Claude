import { prisma } from "@/lib/db";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const b = (await req.json()) as Record<string, string>;
  const data: Record<string, string | null> = {};
  for (const k of ["canal", "nome", "assunto", "corpo"]) if (k in b) data[k] = b[k] || (k === "assunto" ? null : "");
  return json(await prisma.template.update({ where: { id }, data }));
}

export async function DELETE(_: Request, { params }: Ctx) {
  const id = Number((await params).id);
  await prisma.$transaction([
    prisma.cadenceStep.updateMany({ where: { templateId: id }, data: { templateId: null } }),
    prisma.task.updateMany({ where: { templateId: id }, data: { templateId: null } }),
    prisma.template.delete({ where: { id } }),
  ]);
  return json({ ok: true });
}
