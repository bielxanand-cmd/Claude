import { prisma } from "@/lib/db";
import { CANAIS, type Canal } from "@/lib/constants";
import { bad, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return json(await prisma.template.findMany({ orderBy: { id: "asc" } }));
}

export async function POST(req: Request) {
  const b = (await req.json()) as Record<string, string>;
  if (!CANAIS.includes(b.canal as Canal) || !b.nome?.trim() || !b.corpo?.trim()) return bad("Preencha canal, nome e texto.");
  return json(await prisma.template.create({ data: { canal: b.canal, nome: b.nome.trim(), assunto: b.assunto || null, corpo: b.corpo } }), 201);
}
