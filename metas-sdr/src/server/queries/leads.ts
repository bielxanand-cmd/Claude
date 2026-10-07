import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { ehDiaValido, inicioDoDia, somarDias } from "@/lib/datas";
import { ORIGENS, STATUS_LEAD, ehUm } from "@/lib/rotulos";

export interface FiltrosLeads {
  q?: string;
  status?: string;
  origem?: string;
  de?: string;
  ate?: string;
  pagina?: string;
}

export const POR_PAGINA = 50;

export async function listarLeads(userId: string, f: FiltrosLeads) {
  const where: Prisma.LeadWhereInput = { userId };
  const q = f.q?.trim();
  if (q) {
    where.OR = [{ nome: { contains: q } }, { empresa: { contains: q } }, { email: { contains: q } }, { telefone: { contains: q } }];
  }
  if (ehUm(STATUS_LEAD, f.status)) where.status = f.status;
  if (ehUm(ORIGENS, f.origem)) where.origem = f.origem;
  const entradaEm: Prisma.DateTimeFilter = {};
  if (f.de && ehDiaValido(f.de)) entradaEm.gte = inicioDoDia(f.de);
  if (f.ate && ehDiaValido(f.ate)) entradaEm.lt = inicioDoDia(somarDias(f.ate, 1));
  if (entradaEm.gte || entradaEm.lt) where.entradaEm = entradaEm;

  const pagina = Math.max(1, Number(f.pagina) || 1);
  const [total, leads] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      orderBy: { entradaEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { _count: { select: { ligacoes: true, agendamentos: true } } },
    }),
  ]);
  return { total, leads, pagina, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export async function detalheLead(userId: string, id: string) {
  return db.lead.findFirst({
    where: { id, userId },
    include: {
      ligacoes: { orderBy: { realizadaEm: "desc" } },
      agendamentos: { orderBy: { feitoEm: "desc" } },
    },
  });
}
