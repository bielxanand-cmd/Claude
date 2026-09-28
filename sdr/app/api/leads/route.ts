import { prisma } from "@/lib/db";
import { bad, json, readBody } from "@/lib/http";
import { createLead, normalizeLeadPayload } from "@/lib/leads";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-webhook-token",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/** Webhook: POST /api/leads — JSON ou form-urlencoded, campos em PT ou EN. */
export async function POST(req: Request) {
  const cfg = await getSettings();
  const url = new URL(req.url);
  if (cfg.webhookToken) {
    const tok = req.headers.get("x-webhook-token") ?? url.searchParams.get("token");
    if (tok !== cfg.webhookToken) return withCors(bad("Token inválido.", 401));
  }
  let body: unknown;
  try {
    body = await readBody(req);
  } catch {
    return withCors(bad("Corpo inválido."));
  }
  const input = normalizeLeadPayload(body);
  if (!input) return withCors(bad("Informe ao menos nome, telefone ou e-mail."));
  if (!input.origem) input.origem = url.searchParams.get("origem") ?? "Webhook";
  const lead = await createLead(input);
  return withCors(json({ ok: true, id: lead.id, slaStartAt: lead.slaStartAt, foraDoHorario: lead.foraDoHorario }, 201));
}

function withCors(r: Response) {
  for (const [k, v] of Object.entries(CORS)) r.headers.set(k, v);
  return r;
}

/** Lista/busca de leads. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const leads = await prisma.lead.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ nome: { contains: q } }, { telefone: { contains: q } }, { email: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { _count: { select: { attempts: true } } },
  });
  return json(leads);
}
