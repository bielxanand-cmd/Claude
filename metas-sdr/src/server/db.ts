import { PrismaClient } from "@prisma/client";

// Reaproveita a instância em desenvolvimento (hot reload cria módulos novos).
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalParaPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = db;
