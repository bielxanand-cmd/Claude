import type { Settings } from "@prisma/client";
import { prisma, type Tx } from "./db";
import { DEFAULT_SETTINGS } from "./defaults";

export async function getSettings(db: Tx = prisma): Promise<Settings> {
  const s = await db.settings.findUnique({ where: { id: 1 } });
  if (s) return s;
  return db.settings.create({ data: DEFAULT_SETTINGS });
}
