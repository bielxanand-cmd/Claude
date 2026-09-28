import { bad, json, toDate } from "@/lib/http";
import { createLead, normalizeLeadPayload } from "@/lib/leads";

export const dynamic = "force-dynamic";

/** Importação em lote: recebe { rows: [{...}] } (o CSV é lido no navegador). */
export async function POST(req: Request) {
  const body = (await req.json()) as { rows?: Record<string, string>[] };
  if (!Array.isArray(body.rows)) return bad("Envie { rows: [...] }.");
  let ok = 0;
  const erros: number[] = [];
  for (const [i, row] of body.rows.entries()) {
    const input = normalizeLeadPayload(row);
    if (!input) {
      erros.push(i + 2); // +2: cabeçalho e base 1, como na planilha
      continue;
    }
    const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
    const createdAt = toDate(lower["data"] ?? lower["created_at"] ?? lower["createdat"] ?? lower["data_inscricao"]);
    await createLead({ ...input, origem: input.origem ?? "Importação CSV", createdAt: createdAt ?? undefined });
    ok++;
  }
  return json({ importados: ok, linhasComErro: erros });
}
