import { bad, json } from "@/lib/http";
import { createLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

/** Cadastro manual pela interface (não exige o token do webhook). */
export async function POST(req: Request) {
  const b = (await req.json()) as Record<string, string>;
  if (!b.nome?.trim()) return bad("Informe o nome.");
  const lead = await createLead({
    nome: b.nome, telefone: b.telefone, email: b.email, origem: b.origem || "Manual", interesse: b.interesse, observacao: b.observacao,
  });
  return json(lead, 201);
}
