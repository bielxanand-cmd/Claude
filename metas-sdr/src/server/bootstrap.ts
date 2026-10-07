import type { PrismaClient } from "@prisma/client";
import { hoje, mesDe } from "@/lib/datas";

export const USUARIO_PADRAO_ID = "usuario-padrao";
export const META_DIARIA_PADRAO = 4;

/**
 * Garante que o usuário padrão exista, com configuração e uma meta diária inicial.
 * Idempotente: pode ser chamado a cada inicialização.
 */
export async function garantirUsuarioPadrao(db: PrismaClient): Promise<string> {
  const id = USUARIO_PADRAO_ID;
  const existente = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (existente) return id;
  await db.user.create({
    data: {
      id,
      nome: "Eu",
      config: { create: {} },
      metas: {
        create: { tipo: "DIARIA", valor: META_DIARIA_PADRAO, vigenteDesde: `${mesDe(hoje())}-01` },
      },
    },
  });
  return id;
}
